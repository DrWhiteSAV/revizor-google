import { getDb } from '../../db/initDb';

export interface RobokassaConfig {
  id: string;
  domain: string;
  merchant_login: string;
  password_1: string;
  password_2: string;
  result_url: string;
  success_url: string;
  fail_url: string;
  hash_algo: string;
  is_active: number;
}

/**
 * Ensures system_configs, payments, and user_consents tables exist in PostgreSQL BD ProTalk
 * and seeds the two required Robokassa configurations for ii-rr.online and ii-rr.ru.
 */
export async function initRobokassaDatabase(): Promise<void> {
  const db = await getDb();

  // 1. Table system_configs (two dedicated rows for two domains)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS system_configs (
      id TEXT PRIMARY KEY,
      domain TEXT NOT NULL UNIQUE,
      merchant_login TEXT NOT NULL,
      password_1 TEXT NOT NULL,
      password_2 TEXT NOT NULL,
      result_url TEXT NOT NULL,
      success_url TEXT NOT NULL,
      fail_url TEXT NOT NULL,
      hash_algo TEXT NOT NULL DEFAULT 'MD5',
      is_active INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Table payments (tracking all payment attempts, invoices, and statuses)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      inv_id INTEGER UNIQUE,
      user_id TEXT NOT NULL,
      domain TEXT NOT NULL,
      merchant_login TEXT NOT NULL,
      amount NUMERIC(12,2) NOT NULL,
      item_type TEXT NOT NULL,
      product_label TEXT,
      months INTEGER DEFAULT 1,
      employees_count INTEGER DEFAULT 10,
      status TEXT NOT NULL DEFAULT 'PENDING',
      receipt_json TEXT,
      recurring_enabled INTEGER DEFAULT 0,
      robokassa_op_id TEXT,
      payment_url TEXT,
      paid_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 3. Table user_consents (persistent history of user agreements to recurring charges & oferta)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS user_consents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      consent_type TEXT NOT NULL,
      domain TEXT,
      agreed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ip_address TEXT,
      user_agent TEXT,
      metadata TEXT
    );
  `);

  // Seed Row 1: ii-rr.online
  await db.run(
    `INSERT INTO system_configs (
      id, domain, merchant_login, password_1, password_2, result_url, success_url, fail_url, hash_algo, is_active
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, 1
    ) ON CONFLICT (domain) DO UPDATE SET
      merchant_login = EXCLUDED.merchant_login,
      password_1 = EXCLUDED.password_1,
      password_2 = EXCLUDED.password_2,
      result_url = EXCLUDED.result_url,
      success_url = EXCLUDED.success_url,
      fail_url = EXCLUDED.fail_url,
      hash_algo = EXCLUDED.hash_algo,
      updated_at = CURRENT_TIMESTAMP`,
    [
      'robokassa_ii-rr.online',
      'ii-rr.online',
      'ii-rr.online',
      'iirrPass1_2026',
      'iirrPass2_2026',
      'https://ii-rr.online/api/payments/robokassa/result',
      'https://ii-rr.online/payment/success',
      'https://ii-rr.online/payment/fail',
      'MD5'
    ]
  );

  // Seed Row 2: ii-rr.ru
  await db.run(
    `INSERT INTO system_configs (
      id, domain, merchant_login, password_1, password_2, result_url, success_url, fail_url, hash_algo, is_active
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, 1
    ) ON CONFLICT (domain) DO UPDATE SET
      merchant_login = EXCLUDED.merchant_login,
      password_1 = EXCLUDED.password_1,
      password_2 = EXCLUDED.password_2,
      result_url = EXCLUDED.result_url,
      success_url = EXCLUDED.success_url,
      fail_url = EXCLUDED.fail_url,
      hash_algo = EXCLUDED.hash_algo,
      updated_at = CURRENT_TIMESTAMP`,
    [
      'robokassa_ii-rr.ru',
      'ii-rr.ru',
      'ii-rr.ru',
      'iirrPass1_2026',
      'iirrPass2_2026',
      'https://ii-rr.ru/api/payments/robokassa/result',
      'https://ii-rr.ru/payment/success',
      'https://ii-rr.ru/payment/fail',
      'MD5'
    ]
  );

  console.log('✅ PostgreSQL BD ProTalk: system_configs initialized with 2 dedicated Robokassa domain rows.');
}

/**
 * Normalizes host/domain string (removes port, protocol, query)
 */
export function cleanDomain(rawHost?: string): string {
  if (!rawHost) return 'ii-rr.ru';
  let clean = rawHost.trim().toLowerCase();
  clean = clean.replace(/^https?:\/\//, '');
  clean = clean.split('/')[0];
  clean = clean.split(':')[0];
  clean = clean.replace(/^www\./, '');
  return clean;
}

/**
 * Retrieves the exact Robokassa configuration from PostgreSQL BD ProTalk system_configs table
 * strictly based on the domain.
 */
export async function getRobokassaConfigForDomain(rawDomain?: string): Promise<RobokassaConfig> {
  const db = await getDb();
  const domain = cleanDomain(rawDomain);

  let targetDomain = 'ii-rr.ru';
  if (domain.includes('ii-rr.online')) {
    targetDomain = 'ii-rr.online';
  } else if (domain.includes('ii-rr.ru')) {
    targetDomain = 'ii-rr.ru';
  }

  // Read strictly from database
  let row = await db.get(
    'SELECT * FROM system_configs WHERE domain = $1 AND is_active = 1',
    [targetDomain]
  );

  if (!row) {
    // If not found yet, ensure db is initialized and retry
    await initRobokassaDatabase();
    row = await db.get(
      'SELECT * FROM system_configs WHERE domain = $1 AND is_active = 1',
      [targetDomain]
    );
  }

  if (!row) {
    // Fallback to first available row from database
    row = await db.get('SELECT * FROM system_configs WHERE is_active = 1 LIMIT 1');
  }

  if (!row) {
    throw new Error(`Robokassa configuration for domain "${targetDomain}" was not found in system_configs.`);
  }

  return row as RobokassaConfig;
}

/**
 * Generates the next sequential invoice number (InvId)
 */
export async function getNextInvoiceId(): Promise<number> {
  const db = await getDb();
  try {
    const row = await db.get('SELECT MAX(inv_id) as max_id FROM payments');
    const max = row && row.max_id ? Number(row.max_id) : 1000;
    return max + 1;
  } catch {
    return Math.floor(Date.now() / 1000) % 1000000;
  }
}
