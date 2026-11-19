import {
  OFFBOARDING_STAGE_ORDER,
  OffboardingOptions,
  OffboardingStageKey,
  StageStateEntry,
  SuccessorMap,
  ensureOffboardingSchema,
  safeJsonParse,
} from './schema';
import { executeOffboardingStage } from './stages';
import { resolveTargetRecord } from './preflight';

const activeLocks = new Set<string>();

function buildInitialStagesState(): Record<OffboardingStageKey, StageStateEntry> {
  const state: any = {};
  for (const key of OFFBOARDING_STAGE_ORDER) {
    state[key] = { status: 'pending' };
  }
  return state;
}

export function formatJobRow(row: any) {
  if (!row) return null;
  return {
    ...row,
    successor_map: safeJsonParse<SuccessorMap>(row.successor_map_json, {}),
    options: safeJsonParse<OffboardingOptions>(row.options_json, {}),
    stages_state: safeJsonParse<Record<OffboardingStageKey, StageStateEntry>>(row.stages_state_json, buildInitialStagesState()),
  };
}

export async function startOffboardingJob(
  db: any,
  params: {
    targetUserId: string;
    initiatorUserId?: string;
    companyId?: string;
    transferMode?: 'full_successor' | 'split_by_domain' | 'archive_only';
    successorMap?: SuccessorMap;
    options?: OffboardingOptions;
    runAsync?: boolean;
  }
) {
  await ensureOffboardingSchema(db);
  const targetUserId = String(params.targetUserId || '').trim();
  if (!targetUserId) {
    return { status: 400, payload: { success: false, error: 'Не указан идентификатор увольняемого сотрудника' } };
  }

  const { user, emp } = await resolveTargetRecord(db, targetUserId);
  if (!user && !emp) {
    return { status: 404, payload: { success: false, error: 'Сотрудник не найден' } };
  }

  const targetName = user?.name || emp?.name || 'Сотрудник';
  const targetRole = String(user?.role || emp?.role || 'EMPLOYEE').toUpperCase();
  const targetEmail = String(user?.email || '').toLowerCase();

  // Protect main platform owner account from accidental dismissal by anyone
  if (targetUserId === '91827364501' || targetEmail === 'shishkarnem@gmail.com') {
    return {
      status: 403,
      payload: {
        success: false,
        error: 'Главный владелец платформы (SUPER_ADMIN) защищен от каскадного увольнения.',
      },
    };
  }

  const successorMap: SuccessorMap = params.successorMap || {};
  const transferMode = params.transferMode || 'full_successor';
  const candidateSuccIds = Array.from(
    new Set(
      [
        successorMap.primary,
        successorMap.tasks,
        successorMap.management,
        successorMap.directorFinance,
        successorMap.referrals,
      ]
        .filter(Boolean)
        .map(String)
    )
  );

  // Prevent self-transfer
  if (candidateSuccIds.includes(targetUserId)) {
    return {
      status: 400,
      payload: {
        success: false,
        error: 'Нельзя назначить преемником самого увольняемого сотрудника.',
      },
    };
  }

  // Validate no dismissed successor selected
  for (const sId of candidateSuccIds) {
    const sUsr = await db.get(`SELECT id, status FROM users WHERE id = ? LIMIT 1`, [sId]);
    const sEmp = await db.get(`SELECT id, status FROM employees WHERE id = ? LIMIT 1`, [sId]);
    if (!sUsr && !sEmp) {
      return { status: 400, payload: { success: false, error: `Преемник ${sId} не найден в базе.` } };
    }
    const st = String(sUsr?.status || sEmp?.status || 'active').toLowerCase();
    if (st === 'dismissed' || st === 'dismissing') {
      return {
        status: 400,
        payload: { success: false, error: `Преемник ${sUsr?.name || sEmp?.name || sId} уже уволен.` },
      };
    }
  }

  const isBoss = targetRole === 'DIRECTOR' || targetRole === 'SUPER_ADMIN';
  const options: OffboardingOptions = {
    transferOpenTasks: transferMode !== 'archive_only',
    transferCompletedTasks: false,
    transferProjectsAndDepts: transferMode !== 'archive_only',
    transferTemplatesAndPendingReports: transferMode !== 'archive_only',
    transferSchedulesAndFiles: transferMode !== 'archive_only',
    transferRoutingRules: transferMode !== 'archive_only',
    transferReferrals: isBoss ? true : Boolean(params.options?.transferReferrals),
    transferBalancesAndTariffs: isBoss ? true : Boolean(params.options?.transferBalancesAndTariffs),
    replaceDirectorInCompany: isBoss ? true : Boolean(params.options?.replaceDirectorInCompany),
    syncCompanyContactFromSuccessor: Boolean(params.options?.syncCompanyContactFromSuccessor),
    generateAiHandoverBrief: params.options?.generateAiHandoverBrief !== false,
    notifyTelegram: params.options?.notifyTelegram !== false,
    ...params.options,
  };

  if (options.replaceDirectorInCompany && !successorMap.directorFinance && !successorMap.primary) {
    return {
      status: 400,
      payload: {
        success: false,
        error: 'Для увольнения директора необходимо выбрать или создать преемника (нового директора компании).',
      },
    };
  }

  const companyId = String(
    params.companyId ||
      user?.company_id ||
      emp?.company_id ||
      (user?.director_id ? `com-${user.director_id}` : `com-${targetUserId}`)
  );

  // Immediately lock target account access while cascade executes
  const nowIso = new Date().toISOString();
  await db.run(`UPDATE employees SET status = 'dismissing', updated_at = ? WHERE id = ?`, [nowIso, targetUserId]).catch(() => {});
  await db.run(`UPDATE users SET status = 'dismissing' WHERE id = ?`, [targetUserId]).catch(() => {});

  const jobId = `off_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const initialStages = buildInitialStagesState();

  await db.run(
    `INSERT INTO offboarding_jobs (
      id, company_id, target_user_id, target_name, target_role, initiator_user_id,
      transfer_mode, successor_map_json, options_json, status, current_stage,
      stages_state_json, attempts, max_attempts, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'tasks', ?, 0, 8, ?, ?)`,
    [
      jobId,
      companyId,
      targetUserId,
      targetName,
      targetRole,
      params.initiatorUserId || targetUserId,
      transferMode,
      JSON.stringify(successorMap),
      JSON.stringify(options),
      JSON.stringify(initialStages),
      nowIso,
      nowIso,
    ]
  );

  if (params.runAsync !== false) {
    setImmediate(() => {
      processOffboardingJob(db, jobId).catch((err) =>
        console.error(`[Offboarding] Background runner error for ${jobId}:`, err?.message || err)
      );
    });
  } else {
    await processOffboardingJob(db, jobId);
  }

  const createdJob = await db.get(`SELECT * FROM offboarding_jobs WHERE id = ? LIMIT 1`, [jobId]);
  return {
    status: 200,
    payload: {
      success: true,
      job: formatJobRow(createdJob),
    },
  };
}

export async function processOffboardingJob(db: any, jobId: string) {
  if (activeLocks.has(jobId)) return;
  activeLocks.add(jobId);

  try {
    await ensureOffboardingSchema(db);
    const jobRow = await db.get(`SELECT * FROM offboarding_jobs WHERE id = ? LIMIT 1`, [jobId]);
    if (!jobRow) return;
    if (jobRow.status === 'completed') return;

    const attempts = Number(jobRow.attempts || 0) + 1;
    const maxAttempts = Number(jobRow.max_attempts || 8);
    const nowStart = new Date().toISOString();

    await db.run(
      `UPDATE offboarding_jobs SET status = 'running', attempts = ?, updated_at = ? WHERE id = ?`,
      [attempts, nowStart, jobId]
    );
    jobRow.attempts = attempts;

    const { user: targetUser, emp: targetEmp } = await resolveTargetRecord(db, jobRow.target_user_id);
    const stagesState = safeJsonParse<Record<OffboardingStageKey, StageStateEntry>>(
      jobRow.stages_state_json,
      buildInitialStagesState()
    );
    const successorMap = safeJsonParse<SuccessorMap>(jobRow.successor_map_json, {});
    const options = safeJsonParse<OffboardingOptions>(jobRow.options_json, {});

    for (const stageKey of OFFBOARDING_STAGE_ORDER) {
      if (stagesState[stageKey]?.status === 'completed' || stagesState[stageKey]?.status === 'skipped') {
        continue;
      }

      const stageStartIso = new Date().toISOString();
      stagesState[stageKey] = { status: 'running', updated_at: stageStartIso };
      await db.run(
        `UPDATE offboarding_jobs SET current_stage = ?, stages_state_json = ?, updated_at = ? WHERE id = ?`,
        [stageKey, JSON.stringify(stagesState), stageStartIso, jobId]
      );

      try {
        const res = await executeOffboardingStage(stageKey, {
          db,
          job: jobRow,
          targetUser,
          targetEmp,
          targetId: String(jobRow.target_user_id),
          targetName: jobRow.target_name || targetUser?.name || targetEmp?.name || 'Сотрудник',
          targetRole: String(jobRow.target_role || targetUser?.role || targetEmp?.role || 'EMPLOYEE').toUpperCase(),
          companyId: String(jobRow.company_id || ''),
          successorMap,
          options,
          initiatorUserId: String(jobRow.initiator_user_id || ''),
        });

        stagesState[stageKey] = {
          status: res.status,
          details: res.details,
          transferred_count: res.transferredCount,
          updated_at: new Date().toISOString(),
        };

        await db.run(
          `UPDATE offboarding_jobs SET stages_state_json = ?, last_error = NULL, updated_at = ? WHERE id = ?`,
          [JSON.stringify(stagesState), new Date().toISOString(), jobId]
        );
      } catch (stageErr: any) {
        const errMsg = String(stageErr?.message || stageErr || 'Ошибка этапа');
        const errIso = new Date().toISOString();
        stagesState[stageKey] = {
          status: 'failed',
          error: errMsg,
          updated_at: errIso,
        };

        const isFinalFail = attempts >= maxAttempts;
        const delayMs = Math.min(300000, 15000 * Math.pow(2, Math.max(0, attempts - 1)));
        const nextRetryIso = new Date(Date.now() + delayMs).toISOString();

        await db.run(
          `UPDATE offboarding_jobs SET status = ?, current_stage = ?, stages_state_json = ?, last_error = ?, next_retry_at = ?, updated_at = ? WHERE id = ?`,
          [
            isFinalFail ? 'failed' : 'partial_retry',
            stageKey,
            JSON.stringify(stagesState),
            errMsg,
            isFinalFail ? null : nextRetryIso,
            errIso,
            jobId,
          ]
        );
        console.warn(`[Offboarding] Job ${jobId} stage "${stageKey}" error (attempt ${attempts}/${maxAttempts}): ${errMsg}`);
        return;
      }
    }

    const doneIso = new Date().toISOString();
    await db.run(
      `UPDATE offboarding_jobs SET status = 'completed', current_stage = 'finalize_notify', next_retry_at = NULL, last_error = NULL, completed_at = ?, updated_at = ? WHERE id = ?`,
      [doneIso, doneIso, jobId]
    );
  } finally {
    activeLocks.delete(jobId);
  }
}

export async function processPendingOffboardingJobs(db: any) {
  try {
    await ensureOffboardingSchema(db);
    const nowIso = new Date().toISOString();
    const staleRunningCutoff = new Date(Date.now() - 3 * 60 * 1000).toISOString();

    const rows = await db.all(
      `SELECT id FROM offboarding_jobs
       WHERE (status IN ('pending', 'partial_retry') AND (next_retry_at IS NULL OR next_retry_at <= ?))
          OR (status = 'running' AND updated_at < ?)
       ORDER BY created_at ASC
       LIMIT 10`,
      [nowIso, staleRunningCutoff]
    );

    for (const r of rows || []) {
      await processOffboardingJob(db, r.id);
    }
  } catch (err: any) {
    console.error('[Offboarding Cron Worker Error]:', err?.message || err);
  }
}

export async function createInlineSuccessor(
  db: any,
  body: {
    name: string;
    email: string;
    phone?: string;
    telegram_id?: string;
    telegram_handle?: string;
    position?: string;
    role?: string;
    company_id: string;
    director_id?: string;
  }
) {
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  if (!name || !email) {
    return { status: 400, payload: { success: false, error: 'Укажите ФИО и E-mail преемника' } };
  }

  const existing = await db.get(`SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1`, [email]);
  if (existing) {
    return {
      status: 200,
      payload: {
        success: true,
        successor: {
          id: String(existing.id),
          name: existing.name,
          email: existing.email,
          role: existing.role,
          position: existing.position,
        },
        reused: true,
      },
    };
  }

  const newId = (10000000000 + Math.floor(Math.random() * 89999999999)).toString();
  const nowIso = new Date().toISOString();
  const role = String(body.role || 'DIRECTOR').toUpperCase();
  const position = body.position || (role === 'DIRECTOR' ? 'Генеральный директор' : 'Руководитель');
  const compId = body.company_id || `com-${newId}`;
  const dirId = role === 'DIRECTOR' ? newId : body.director_id || compId.replace(/^com-/, '');
  const refCode = `ref${newId.slice(-4)}`;

  await db.run(
    `INSERT INTO users (
      id, name, email, password, role, phone, telegramHandle, position, referralCode,
      telegram_id, profile_link, timezone, director_id, company_id, status,
      projects_limit, projects_used, tasks_limit, tasks_used, reports_limit, reports_used,
      payment_balance, local_bonus, referral_bonus, welcome_bonus, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '+03:00', ?, ?, 'active', 10, 0, 50, 0, 50, 0, 0, 0, 0, 0, ?)`,
    [
      newId,
      name,
      email,
      `Pass${newId.slice(-4)}!`,
      role,
      body.phone || '+7 (999) 000-00-00',
      body.telegram_handle || null,
      position,
      refCode,
      body.telegram_id || null,
      `/cabinet/profile/${newId}`,
      dirId,
      compId,
      nowIso,
    ]
  );

  await db.run(
    `INSERT INTO employees (
      id, company_id, department_id, name, email, phone, role, position,
      telegram_handle, telegram_id, director_id, status, created_at, updated_at
    ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
    [
      newId,
      compId,
      name,
      email,
      body.phone || null,
      role,
      position,
      body.telegram_handle || null,
      body.telegram_id || null,
      dirId,
      nowIso,
      nowIso,
    ]
  );

  return {
    status: 200,
    payload: {
      success: true,
      successor: {
        id: newId,
        name,
        email,
        role,
        position,
      },
    },
  };
}
