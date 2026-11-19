import crypto from 'crypto';

export const generateId = (prefix: string = 'id') => `${prefix}_${crypto.randomBytes(8).toString('hex')}`;

const PROXY_URL = 'https://db.pro-talk.ru/api/proxy/query';
const USER_ID = 'recTWyxN1GrSPlSxc';

export class PgDbAdapter {
  private proxyUrl: string;
  private userId: string;

  constructor(proxyUrl: string = PROXY_URL, userId: string = USER_ID) {
    this.proxyUrl = proxyUrl;
    this.userId = userId;
  }

  private sanitizeParams(params: any[] = []): any[] {
    if (!Array.isArray(params)) return [];
    return params.map(p => {
      if (p === undefined) return null;
      if (typeof p === 'object' && p !== null && !(p instanceof Date)) {
        return JSON.stringify(p);
      }
      return p;
    });
  }

  /**
   * Transforms SQL dialect queries to PostgreSQL BD ProTalk syntax:
   * - Converts '?' placeholders to '$1, $2, $3...'
   * - Maps PRAGMA table_info("table") to information_schema.columns
   * - Maps metadata queries to PostgreSQL information_schema
   * - Converts INSERT OR IGNORE INTO to INSERT INTO ... ON CONFLICT DO NOTHING
   * - Converts INSERT OR REPLACE INTO to INSERT INTO ... ON CONFLICT (...) DO UPDATE SET ...
   * - Adds OVERRIDING SYSTEM VALUE for IDENTITY tables when 'id' is supplied
   */
  public transformSql(sql: string, originalParams: any[] = []): { sql: string; params: any[] } {
    let s = sql.trim();
    let params = [...originalParams];

    // 1. PRAGMA table_info("tableName")
    const pragmaMatch = s.match(/^PRAGMA\s+table_info\([\"']?([a-zA-Z0-9_]+)[\"']?\)/i);
    if (pragmaMatch) {
      return {
        sql: `SELECT column_name as name, data_type as type, 
                     CASE WHEN is_nullable = 'NO' THEN 1 ELSE 0 END as notnull, 
                     CASE WHEN column_name = 'id' THEN 1 ELSE 0 END as pk 
              FROM information_schema.columns 
              WHERE table_name = $1 
              ORDER BY ordinal_position`,
        params: [pragmaMatch[1].toLowerCase()]
      };
    }

    // 2. PostgreSQL schema metadata normalizer
    if (/pg_tables_legacy/i.test(s)) {
      s = s.replace(/pg_tables_legacy/gi, 'information_schema.tables');
    }

    // 3. INSERT OR IGNORE INTO
    if (/INSERT\s+OR\s+IGNORE\s+INTO/i.test(s)) {
      s = s.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT INTO');
      if (!/ON\s+CONFLICT/i.test(s)) {
        s += ' ON CONFLICT DO NOTHING';
      }
    }

    // 4. INSERT OR REPLACE INTO
    if (/INSERT\s+OR\s+REPLACE\s+INTO/i.test(s)) {
      s = s.replace(/INSERT\s+OR\s+REPLACE\s+INTO/gi, 'INSERT INTO');
      const colsMatch = s.match(/INSERT\s+INTO\s+([\"\w]+)\s*\(([^)]+)\)/i);
      if (colsMatch && !/ON\s+CONFLICT/i.test(s)) {
        const tbl = colsMatch[1].replace(/[\"']/g, '');
        const cols = colsMatch[2].split(',').map(c => c.trim().replace(/[\"']/g, ''));
        const pkCol = tbl === 'protalk_prompts' ? 'entity_type' : (cols.includes('id') ? 'id' : cols[0]);
        const updateCols = cols.filter(c => c !== pkCol).map(c => `"${c}" = EXCLUDED."${c}"`).join(', ');
        s += ` ON CONFLICT ("${pkCol}") DO UPDATE SET ${updateCols || `"${pkCol}" = EXCLUDED."${pkCol}"`}`;
      }
    }

    // 5. Identity tables handling for file_folders, file_storage, triggers_log, logs
    const identityMatch = s.match(/INSERT\s+INTO\s+([\"\w]+)\s*\(([^)]+)\)/i);
    if (identityMatch && !/OVERRIDING\s+SYSTEM\s+VALUE/i.test(s)) {
      const tbl = identityMatch[1].replace(/[\"']/g, '').toLowerCase();
      const cols = identityMatch[2].split(',').map(c => c.trim().replace(/[\"']/g, '').toLowerCase());
      if (['file_folders', 'file_storage', 'triggers_log', 'logs'].includes(tbl) && cols.includes('id')) {
        s = s.replace(/INSERT\s+INTO\s+([\"\w]+)\s*\(([^)]+)\)/i, `INSERT INTO $1 ($2) OVERRIDING SYSTEM VALUE`);
      }
    }

    // 6. Date & datetime function mappings for PostgreSQL BD ProTalk
    s = s.replace(/DATE\(['"]now['"]\)/gi, "TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD')");
    s = s.replace(/datetime\(([^,]+),\s*['"]\+(\d+)\s+days['"]\)/gi, "($1 + INTERVAL '$2 days')");

    // 7. Convert ? placeholders to $1, $2, $3...
    let paramIndex = 1;
    s = s.replace(/\?/g, () => `$${paramIndex++}`);

    return { sql: s, params };
  }

  private async executeQuery(sql: string, params: any[] = [], safeMode = false, suppressLog = false): Promise<any> {
    const transformed = this.transformSql(sql, this.sanitizeParams(params));
    let lastError: any = null;

    // Retry up to 3 times on transient network failures
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const res = await fetch(this.proxyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': this.userId
          },
          body: JSON.stringify({
            database: 'raport',
            query: transformed.sql,
            params: transformed.params,
            safeMode
          }),
          signal: controller.signal
        });

        clearTimeout(timeout);
        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || `HTTP ${res.status}: ${res.statusText}`);
        }
        return data;
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || err);
        // Only retry on transient fetch/proxy failures or timeouts
        if (
          msg.includes('fetch failed') ||
          msg.includes('aborted') ||
          msg.includes('ECONNRESET') ||
          msg.includes('ETIMEDOUT') ||
          msg.includes('EAI_AGAIN') ||
          msg.includes('UND_ERR') ||
          msg.includes('HTTP 502') ||
          msg.includes('HTTP 503') ||
          msg.includes('HTTP 504')
        ) {
          await new Promise(r => setTimeout(r, attempt * 350));
          continue;
        }
        break;
      }
    }

    if (!suppressLog) {
      console.error('[PostgreSQL Proxy Error]:', lastError?.message || lastError, 'Query:', transformed.sql.slice(0, 150), 'Params:', transformed.params);
    }
    throw lastError;
  }

  async exec(sql: string): Promise<void> {
    await this.executeQuery(sql, [], false);
  }

  async run(sql: string, params: any[] = []): Promise<{ lastID?: any; changes?: any }> {
    const cleanSql = sql.trim().replace(/;+$/, '');
    const match = cleanSql.match(/^\s*INSERT\s+(?:OR\s+(?:REPLACE|IGNORE)\s+)?INTO\s+([\"\w]+)/i);
    const tbl = match ? match[1].replace(/[\"']/g, '').toLowerCase() : '';
    const tablesWithoutId = ['system_settings', 'protalk_prompts'];

    const transformedBase = this.transformSql(cleanSql, params);
    const shouldAddReturning = Boolean(match && !/RETURNING/i.test(transformedBase.sql) && !tablesWithoutId.includes(tbl));
    const finalQueryToExecute = shouldAddReturning ? `${transformedBase.sql} RETURNING id` : transformedBase.sql;

    try {
      const res = await this.executeQueryRaw(finalQueryToExecute, this.sanitizeParams(transformedBase.params), false, shouldAddReturning);
      let lastID = null;
      if (res.rows && res.rows.length > 0) {
        lastID = res.rows[0].id || null;
      }
      return { lastID, changes: res.rowCount || (res.rows ? res.rows.length : 0) };
    } catch (err) {
      if (shouldAddReturning) {
        const res = await this.executeQueryRaw(transformedBase.sql, this.sanitizeParams(transformedBase.params), false, false);
        return { lastID: null, changes: res.rowCount || 0 };
      }
      throw err;
    }
  }

  private async executeQueryRaw(sql: string, params: any[] = [], safeMode = false, suppressLog = false): Promise<any> {
    let lastError: any = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        const res = await fetch(this.proxyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': this.userId
          },
          body: JSON.stringify({
            database: 'raport',
            query: sql,
            params,
            safeMode
          }),
          signal: controller.signal
        });
        clearTimeout(timeout);
        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || `HTTP ${res.status}: ${res.statusText}`);
        }
        return data;
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || err);
        if (
          msg.includes('fetch failed') ||
          msg.includes('aborted') ||
          msg.includes('ECONNRESET') ||
          msg.includes('ETIMEDOUT') ||
          msg.includes('EAI_AGAIN') ||
          msg.includes('UND_ERR') ||
          msg.includes('HTTP 502') ||
          msg.includes('HTTP 503') ||
          msg.includes('HTTP 504')
        ) {
          await new Promise(r => setTimeout(r, attempt * 350));
          continue;
        }
        break;
      }
    }
    if (!suppressLog) {
      console.error('[PostgreSQL Proxy Error]:', lastError?.message || lastError, 'Query:', sql.slice(0, 150), 'Params:', params);
    }
    throw lastError;
  }

  async get(sql: string, params: any[] = []): Promise<any> {
    try {
      const data = await this.executeQuery(sql, params, true);
      if (data.rows && data.rows.length > 0) {
        return data.rows[0];
      }
      return undefined;
    } catch (err) {
      console.error('[PostgreSQL get error]:', err);
      return undefined;
    }
  }

  async all(sql: string, params: any[] = []): Promise<any[]> {
    try {
      const data = await this.executeQuery(sql, params, true);
      return data.rows || [];
    } catch (err) {
      console.error('[PostgreSQL all error]:', err);
      return [];
    }
  }
}

let dbInstance: PgDbAdapter | null = null;

export async function getDb(): Promise<PgDbAdapter> {
  if (!dbInstance) {
    dbInstance = new PgDbAdapter();
    console.log('✅ PostgreSQL ProTalk Adapter initialized (database: raport).');
  }
  return dbInstance;
}

export async function handleCorruptionAndReset(): Promise<PgDbAdapter> {
  console.log('ℹ️ PostgreSQL is cloud-managed; resetting connection adapter.');
  dbInstance = new PgDbAdapter();
  return dbInstance;
}

export async function recalculateUserBalancesFromTransactions(userId: string): Promise<number> {
  try {
    const db = await getDb();
    const txRows = await db.all(
      "SELECT amount_rr, amount_rub FROM transactions WHERE user_id = $1 AND status = 'completed'",
      [userId]
    );

    let totalRR = 0;
    let earnedRR = 0;
    for (const tx of txRows) {
      const val = Number(tx.amount_rr) || Number(tx.amount_rub) || 0;
      totalRR += val;
      if (val > 0) earnedRR += val;
    }

    await db.run(
      `UPDATE users SET 
        payment_balance = $1, 
        "bonusesEarned" = GREATEST("bonusesEarned", $2)
       WHERE id = $3`,
      [totalRR, earnedRR, userId]
    );

    return totalRR;
  } catch (err: any) {
    console.error(`[recalculateUserBalancesFromTransactions Error for ${userId}]:`, err.message);
    return 0;
  }
}

export async function performDailyDatabaseBackup() {
  console.log('📦 Daily database backup initiated...');
  try {
    const { executeDatabaseBackup } = await import('../server/backup');
    return await executeDatabaseBackup('Регламентный ежедневный бэкап в 03:00 МСК');
  } catch (err: any) {
    console.error('Failed to run daily database backup:', err.message);
  }
}
