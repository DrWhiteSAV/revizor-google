import { Router } from 'express';
import { getDb } from '../../db/initDb';
import { ensureOffboardingSchema } from './schema';
import { getOffboardingPreflight } from './preflight';
import {
  createInlineSuccessor,
  formatJobRow,
  processOffboardingJob,
  startOffboardingJob,
} from './runner';

const router = Router();

// 1. Pre-flight dependency & balance diagnostics for employee/manager/director
router.get('/preflight/:userId', async (req, res) => {
  try {
    const db = await getDb();
    const companyId = (req.query.company_id as string) || '';
    const data = await getOffboardingPreflight(db, req.params.userId, companyId);
    if (!data.found) {
      return res.status(404).json({ success: false, error: data.error });
    }
    res.json({ success: true, preflight: data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Quick-create replacement director/successor right inside modal
router.post('/create-successor', async (req, res) => {
  try {
    const db = await getDb();
    const result = await createInlineSuccessor(db, req.body || {});
    res.status(result.status).json(result.payload);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Start cascading dismissal job (runs async & persists in PostgreSQL)
router.post('/start', async (req, res) => {
  try {
    const db = await getDb();
    const result = await startOffboardingJob(db, req.body || {});
    res.status(result.status).json(result.payload);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. List offboarding jobs scoped by company_id
router.get('/jobs', async (req, res) => {
  try {
    const db = await getDb();
    await ensureOffboardingSchema(db);
    const companyId = String(req.query.company_id || '').trim();
    if (!companyId) {
      return res.json({ success: true, jobs: [] });
    }
    const cleanComp = companyId.replace(/^com-/, '');
    const aliases = Array.from(new Set([companyId, cleanComp, `com-${cleanComp}`].filter(Boolean)));
    const ph = aliases.map(() => '?').join(', ');

    const rows = await db.all(
      `SELECT * FROM offboarding_jobs WHERE company_id IN (${ph}) ORDER BY created_at DESC LIMIT 30`,
      aliases
    );
    res.json({ success: true, jobs: (rows || []).map(formatJobRow) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Poll single job progress + audit trail
router.get('/jobs/:jobId', async (req, res) => {
  try {
    const db = await getDb();
    await ensureOffboardingSchema(db);
    const row = await db.get(`SELECT * FROM offboarding_jobs WHERE id = ? LIMIT 1`, [req.params.jobId]);
    if (!row) {
      return res.status(404).json({ success: false, error: 'Задача увольнения не найдена' });
    }
    const logs = await db.all(
      `SELECT * FROM offboarding_audit_log WHERE job_id = ? ORDER BY created_at ASC`,
      [req.params.jobId]
    );
    res.json({ success: true, job: formatJobRow(row), audit_logs: logs || [] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Manual immediate retry for failed or partial_retry job
router.post('/jobs/:jobId/retry', async (req, res) => {
  try {
    const db = await getDb();
    await ensureOffboardingSchema(db);
    const row = await db.get(`SELECT * FROM offboarding_jobs WHERE id = ? LIMIT 1`, [req.params.jobId]);
    if (!row) {
      return res.status(404).json({ success: false, error: 'Задача увольнения не найдена' });
    }
    await db.run(
      `UPDATE offboarding_jobs SET status = 'pending', next_retry_at = NULL, max_attempts = GREATEST(COALESCE(max_attempts, 8), COALESCE(attempts, 0) + 2), updated_at = ? WHERE id = ?`,
      [new Date().toISOString(), req.params.jobId]
    );
    setImmediate(() => {
      processOffboardingJob(db, req.params.jobId).catch((err) =>
        console.error('[Offboarding Manual Retry Error]:', err?.message || err)
      );
    });
    const updated = await db.get(`SELECT * FROM offboarding_jobs WHERE id = ? LIMIT 1`, [req.params.jobId]);
    res.json({ success: true, job: formatJobRow(updated) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Handover audit summary for dismissed user card
router.get('/audit/:userId', async (req, res) => {
  try {
    const db = await getDb();
    await ensureOffboardingSchema(db);
    const jobs = await db.all(
      `SELECT * FROM offboarding_jobs WHERE target_user_id = ? ORDER BY created_at DESC LIMIT 5`,
      [req.params.userId]
    );
    const logs = await db.all(
      `SELECT * FROM offboarding_audit_log WHERE from_user_id = ? ORDER BY created_at ASC`,
      [req.params.userId]
    );
    res.json({
      success: true,
      jobs: (jobs || []).map(formatJobRow),
      audit_logs: logs || [],
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
