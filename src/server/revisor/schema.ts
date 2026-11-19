/**
 * PostgreSQL BD ProTalk additive schema migrations for Autonomous AI Revisor
 * Safe & idempotent: adds nullable / defaulted columns and audit tables without disturbing existing data.
 */

let schemaEnsured = false;
let schemaEnsurePromise: Promise<void> | null = null;

async function ensureColumns(db: any, tableName: string, columns: Array<{ name: string; ddl: string }>) {
  try {
    const existing = await db.all(`PRAGMA table_info("${tableName}")`);
    const existingNames = new Set((existing || []).map((c: any) => String(c.name || '').toLowerCase()));
    for (const col of columns) {
      if (!existingNames.has(col.name.toLowerCase())) {
        try {
          await db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${col.ddl}`);
        } catch (err: any) {
          const msg = String(err?.message || err);
          if (!/already exists|duplicate column/i.test(msg)) {
            console.warn(`[Revisor Schema] Could not add ${tableName}.${col.name}:`, msg);
          }
        }
      }
    }
  } catch (err: any) {
    console.warn(`[Revisor Schema] table_info failed for ${tableName}:`, err?.message || err);
  }
}

export async function ensureRevisorSchema(db: any): Promise<void> {
  if (schemaEnsured) return;
  if (schemaEnsurePromise) return schemaEnsurePromise;

  schemaEnsurePromise = (async () => {
    try {
      await ensureColumns(db, 'projects', [
        { name: 'autonomy_mode', ddl: "autonomy_mode TEXT DEFAULT 'controller'" },
        { name: 'check_cadence', ddl: "check_cadence TEXT DEFAULT 'daily'" },
        { name: 'quiet_hours_start', ddl: "quiet_hours_start TEXT DEFAULT '21:00'" },
        { name: 'quiet_hours_end', ddl: "quiet_hours_end TEXT DEFAULT '08:30'" },
        { name: 'max_auto_shift_days', ddl: 'max_auto_shift_days INTEGER DEFAULT 2' },
        { name: 'timezone', ddl: "timezone TEXT DEFAULT 'Europe/Moscow'" }
      ]);

      await ensureColumns(db, 'tasks', [
        { name: 'autonomy_mode', ddl: 'autonomy_mode TEXT' },
        { name: 'check_cadence', ddl: 'check_cadence TEXT' },
        { name: 'risk_score', ddl: 'risk_score INTEGER DEFAULT 0' },
        { name: 'risk_level', ddl: "risk_level TEXT DEFAULT 'low'" },
        { name: 'progress_percent', ddl: 'progress_percent INTEGER DEFAULT 0' },
        { name: 'blocker_status', ddl: "blocker_status TEXT DEFAULT 'none'" },
        { name: 'blocker_note', ddl: 'blocker_note TEXT' },
        { name: 'last_activity_at', ddl: 'last_activity_at TEXT' },
        { name: 'last_checkin_at', ddl: 'last_checkin_at TEXT' },
        { name: 'checkin_count', ddl: 'checkin_count INTEGER DEFAULT 0' },
        { name: 'escalation_level', ddl: 'escalation_level INTEGER DEFAULT 0' },
        { name: 'escalation_log', ddl: 'escalation_log TEXT' },
        { name: 'upstream_warned_at', ddl: 'upstream_warned_at TEXT' }
      ]);

      await db.exec(`
        CREATE TABLE IF NOT EXISTS task_ai_interactions (
          id TEXT PRIMARY KEY,
          task_id TEXT NOT NULL,
          project_id TEXT,
          company_id TEXT,
          user_id TEXT,
          user_name TEXT,
          kind TEXT NOT NULL,
          blocker_type TEXT,
          message TEXT,
          ai_advice TEXT,
          suggested_steps TEXT,
          risk_score INTEGER,
          helpful_vote INTEGER DEFAULT 0,
          created_at TEXT NOT NULL
        );
      `);

      await db.exec(`
        CREATE TABLE IF NOT EXISTS task_shift_requests (
          id TEXT PRIMARY KEY,
          task_id TEXT NOT NULL,
          project_id TEXT,
          company_id TEXT,
          requester_id TEXT,
          requester_name TEXT,
          current_deadline TEXT,
          proposed_deadline TEXT,
          shift_days INTEGER,
          reason TEXT,
          ai_workload_note TEXT,
          status TEXT DEFAULT 'pending',
          reviewed_by TEXT,
          created_at TEXT NOT NULL,
          resolved_at TEXT
        );
      `);

      await db.exec(`
        CREATE TABLE IF NOT EXISTS revisor_insights (
          id TEXT PRIMARY KEY,
          company_id TEXT,
          project_id TEXT,
          period_key TEXT,
          summary TEXT,
          top_blockers TEXT,
          workload_alerts TEXT,
          recommendations TEXT,
          created_at TEXT NOT NULL
        );
      `);

      await db.exec(`
        CREATE TABLE IF NOT EXISTS revisor_digest_logs (
          id TEXT PRIMARY KEY,
          company_id TEXT,
          user_id TEXT,
          digest_type TEXT NOT NULL,
          date_key TEXT NOT NULL,
          sent_at TEXT NOT NULL
        );
      `);

      schemaEnsured = true;
      console.log('✅ Autonomous AI Revisor schema verified on PostgreSQL BD ProTalk.');
    } catch (err: any) {
      console.error('❌ [Revisor Schema] Migration error:', err?.message || err);
    } finally {
      schemaEnsurePromise = null;
    }
  })();

  return schemaEnsurePromise;
}
