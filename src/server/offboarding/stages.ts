import { sendTelegramRichMessage } from '../../utils/telegramProxy';
import { callProTalkAi } from '../../../server/protalk';
import {
  OffboardingOptions,
  OffboardingStageKey,
  SuccessorMap,
  safeJsonParse,
} from './schema';

export interface StageContext {
  db: any;
  job: any;
  targetUser: any;
  targetEmp: any;
  targetId: string;
  targetName: string;
  targetRole: string;
  companyId: string;
  successorMap: SuccessorMap;
  options: OffboardingOptions;
  initiatorUserId: string;
}

async function resolvePerson(db: any, personId?: string) {
  if (!personId) return null;
  const u = await db.get('SELECT * FROM users WHERE id = ? LIMIT 1', [personId]);
  const e = await db.get('SELECT * FROM employees WHERE id = ? LIMIT 1', [personId]);
  if (!u && !e) return null;
  return {
    id: String(u?.id || e?.id || personId),
    name: (u?.name || e?.name || 'Сотрудник').trim(),
    email: u?.email || e?.email || '',
    phone: u?.phone || e?.phone || '',
    role: String(u?.role || e?.role || 'EMPLOYEE').toUpperCase(),
    telegram_id: u?.telegram_id || e?.telegram_id || null,
    user: u,
    emp: e,
  };
}

export async function recordAuditLog(
  db: any,
  params: {
    jobId: string;
    companyId: string;
    stage: OffboardingStageKey;
    entityTable: string;
    fromUserId: string;
    toUserId?: string | null;
    affectedCount: number;
    referenceId?: string;
    details: string;
  }
) {
  const auditId = `aud_${params.jobId}_${params.stage}_${params.entityTable}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 6)}`;
  const nowIso = new Date().toISOString();
  await db.run(
    `INSERT INTO offboarding_audit_log (
      id, job_id, company_id, stage, entity_table, from_user_id, to_user_id,
      affected_count, reference_id, details, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      auditId,
      params.jobId,
      params.companyId,
      params.stage,
      params.entityTable,
      params.fromUserId,
      params.toUserId || null,
      params.affectedCount,
      params.referenceId || null,
      params.details,
      nowIso,
    ]
  );
}

export async function executeOffboardingStage(
  stage: OffboardingStageKey,
  ctx: StageContext
): Promise<{ status: 'completed' | 'skipped'; details: string; transferredCount: number }> {
  const { db, job, targetId, targetName, targetRole, companyId, successorMap, options } = ctx;
  const nowIso = new Date().toISOString();
  const todayStr = nowIso.slice(0, 10);

  // Test hook for verifying background retry resilience
  if (options.simulateFailureStage === stage && Number(job.attempts || 0) <= 1) {
    throw new Error(`Имитация временного сбоя на этапе «${stage}» для проверки фонового допрохождения`);
  }

  const primarySuccId = successorMap.primary || successorMap.directorFinance || successorMap.tasks || '';
  const tasksSucc = await resolvePerson(db, successorMap.tasks || primarySuccId);
  const mgmtSucc = await resolvePerson(db, successorMap.management || primarySuccId);
  const dirSucc = await resolvePerson(db, successorMap.directorFinance || primarySuccId);
  const refSucc = await resolvePerson(db, successorMap.referrals || successorMap.directorFinance || primarySuccId);

  // 1. TASKS
  if (stage === 'tasks') {
    if (options.transferOpenTasks === false || !tasksSucc) {
      return { status: 'skipped', details: 'Передача задач отключена или преемник не указан', transferredCount: 0 };
    }

    let movedCount = 0;
    const statusFilter = options.transferCompletedTasks ? '' : ` AND status != 'completed'`;
    const execRes = await db.run(
      `UPDATE tasks SET "executorId" = ?, executorid = ?, "executorName" = ?, executorname = ?, "executorRole" = ?, executorrole = ?, "updatedAt" = ?, updatedat = ? WHERE ("executorId" = ? OR executorid = ?)${statusFilter}`,
      [tasksSucc.id, tasksSucc.id, tasksSucc.name, tasksSucc.name, tasksSucc.role, tasksSucc.role, nowIso, nowIso, targetId, targetId]
    );
    movedCount += Number(execRes?.changes || 0);

    const revTarget = mgmtSucc || tasksSucc;
    const revRes = await db.run(
      `UPDATE tasks SET reviewer_id = ?, reviewer_name = ?, "updatedAt" = ?, updatedat = ? WHERE reviewer_id = ?${statusFilter}`,
      [revTarget.id, revTarget.name, nowIso, nowIso, targetId]
    );
    movedCount += Number(revRes?.changes || 0);

    const authTarget = dirSucc || revTarget;
    const authRes = await db.run(
      `UPDATE tasks SET author_id = ? WHERE author_id = ?`,
      [authTarget.id, targetId]
    );
    movedCount += Number(authRes?.changes || 0);

    if (options.replaceDirectorInCompany && dirSucc) {
      await db.run(`UPDATE tasks SET director_id = ? WHERE director_id = ?`, [dirSucc.id, targetId]);
    }

    await recordAuditLog(db, {
      jobId: job.id,
      companyId,
      stage,
      entityTable: 'tasks',
      fromUserId: targetId,
      toUserId: tasksSucc.id,
      affectedCount: movedCount,
      details: `Задачи переданы сотруднику ${tasksSucc.name}`,
    });

    return {
      status: 'completed',
      details: `Задачи (${movedCount}) переданы → ${tasksSucc.name}`,
      transferredCount: movedCount,
    };
  }

  // 2. PROJECTS & DEPARTMENTS
  if (stage === 'projects_departments') {
    if (options.transferProjectsAndDepts === false) {
      return { status: 'skipped', details: 'Передача проектов и отделов отключена', transferredCount: 0 };
    }
    let count = 0;
    const projTarget = mgmtSucc || tasksSucc || dirSucc;
    if (projTarget) {
      const pAuthorRes = await db.run(
        `UPDATE projects SET author_id = ?, "updatedAt" = ?, updatedat = ? WHERE author_id = ?`,
        [projTarget.id, nowIso, nowIso, targetId]
      );
      count += Number(pAuthorRes?.changes || 0);

      const pMgrRes = await db.run(
        `UPDATE projects SET manager = ?, "updatedAt" = ?, updatedat = ? WHERE LOWER(COALESCE(manager, '')) = LOWER(?) AND company_id = ?`,
        [projTarget.name, nowIso, nowIso, targetName, companyId]
      );
      count += Number(pMgrRes?.changes || 0);

      if (options.replaceDirectorInCompany && dirSucc) {
        await db.run(`UPDATE projects SET director_id = ? WHERE director_id = ?`, [dirSucc.id, targetId]);
      }
    }

    const depts = await db.all(`SELECT * FROM departments WHERE company_id = ? OR director_id = ?`, [companyId, targetId]);
    for (const d of depts || []) {
      let changed = false;
      let nextManagerId = d.manager_id;
      let nextLeadName = d.lead_name;
      let nextDirId = d.director_id;
      const empIds = safeJsonParse<string[]>(d.employee_ids, []).map(String);
      let nextEmpIds = empIds.filter((id) => id !== targetId);

      if (nextEmpIds.length !== empIds.length) {
        changed = true;
      }
      if (mgmtSucc && (String(d.manager_id || '') === targetId || (d.lead_name && d.lead_name.toLowerCase() === targetName.toLowerCase()))) {
        nextManagerId = mgmtSucc.id;
        nextLeadName = mgmtSucc.name;
        if (!nextEmpIds.includes(mgmtSucc.id)) nextEmpIds.push(mgmtSucc.id);
        changed = true;
      }
      if (options.replaceDirectorInCompany && dirSucc && String(d.director_id || '') === targetId) {
        nextDirId = dirSucc.id;
        changed = true;
      }

      if (changed) {
        await db.run(
          `UPDATE departments SET manager_id = ?, lead_name = ?, employee_ids = ?, director_id = ?, updated_at = ? WHERE id = ?`,
          [nextManagerId || null, nextLeadName || null, JSON.stringify(nextEmpIds), nextDirId || null, nowIso, d.id]
        );
        count++;
      }
    }

    await recordAuditLog(db, {
      jobId: job.id,
      companyId,
      stage,
      entityTable: 'projects_departments',
      fromUserId: targetId,
      toUserId: projTarget?.id || null,
      affectedCount: count,
      details: `Обновлено проектов и отделов: ${count}`,
    });

    return {
      status: 'completed',
      details: `Проекты и отделы (${count}) переназначены`,
      transferredCount: count,
    };
  }

  // 3. REPORTS & TEMPLATES
  if (stage === 'reports_templates') {
    if (options.transferTemplatesAndPendingReports === false) {
      return { status: 'skipped', details: 'Перенос шаблонов и отчетов отключен', transferredCount: 0 };
    }
    const revTarget = mgmtSucc || dirSucc || tasksSucc;
    if (!revTarget) {
      return { status: 'skipped', details: 'Нет выбранного преемника для проверки отчетов', transferredCount: 0 };
    }

    let count = 0;
    const repRevRes = await db.run(
      `UPDATE reports SET reviewer_id = ?, reviewer_name = ? WHERE reviewer_id = ? AND COALESCE("isReviewedByManager", 0) = 0 AND COALESCE(isreviewedbymanager, 0) = 0`,
      [revTarget.id, revTarget.name, targetId]
    );
    count += Number(repRevRes?.changes || 0);

    if (options.replaceDirectorInCompany && dirSucc) {
      const repDirRes = await db.run(`UPDATE reports SET director_id = ? WHERE director_id = ?`, [dirSucc.id, targetId]);
      count += Number(repDirRes?.changes || 0);
      await db.run(`UPDATE report_summaries SET director_id = ? WHERE director_id = ?`, [dirSucc.id, targetId]).catch(() => {});
      await db.run(`UPDATE google_sheets_logs SET employee_id = ?, employee_name = ? WHERE employee_id = ?`, [dirSucc.id, dirSucc.name, targetId]).catch(() => {});
    }

    const tpls = await db.all(`SELECT * FROM report_templates WHERE company_id = ? OR director_id = ?`, [companyId, targetId]);
    for (const tpl of tpls || []) {
      let changed = false;
      let nextRevId = tpl.reviewer_id;
      let nextRevName = tpl.reviewer_name;
      let nextDirId = tpl.director_id;
      const targetEmps = safeJsonParse<string[]>(tpl.target_employees || tpl.employeeIds || tpl.employeeids, []);
      let nextTargetEmps = targetEmps;

      if (String(tpl.reviewer_id || '') === targetId) {
        nextRevId = revTarget.id;
        nextRevName = revTarget.name;
        changed = true;
      }
      if (options.replaceDirectorInCompany && dirSucc && String(tpl.director_id || '') === targetId) {
        nextDirId = dirSucc.id;
        changed = true;
      }
      if (Array.isArray(targetEmps) && targetEmps.map(String).includes(targetId)) {
        nextTargetEmps = targetEmps.map((id) => (String(id) === targetId ? (tasksSucc?.id || revTarget.id) : String(id)));
        nextTargetEmps = Array.from(new Set(nextTargetEmps));
        changed = true;
      }

      if (changed) {
        const nextJson = JSON.stringify(nextTargetEmps);
        await db.run(
          `UPDATE report_templates SET reviewer_id = ?, reviewer_name = ?, director_id = ?, target_employees = ?, "employeeIds" = ?, employeeids = ?, updated_at = ? WHERE id = ?`,
          [nextRevId || null, nextRevName || null, nextDirId || null, nextJson, nextJson, nextJson, nowIso, tpl.id]
        );
        count++;
      }
    }

    if (dirSucc || tasksSucc) {
      const presetTargetId = (dirSucc || tasksSucc)!.id;
      await db.run(`UPDATE task_user_presets SET user_id = ? WHERE user_id = ?`, [presetTargetId, targetId]).catch(() => {});
    }

    await recordAuditLog(db, {
      jobId: job.id,
      companyId,
      stage,
      entityTable: 'reports_templates',
      fromUserId: targetId,
      toUserId: revTarget.id,
      affectedCount: count,
      details: `Отчетов, шаблонов и сводок передано: ${count}`,
    });

    return {
      status: 'completed',
      details: `Отчеты и шаблоны (${count}) обновлены`,
      transferredCount: count,
    };
  }

  // 4. SCHEDULES & FILES
  if (stage === 'schedules_files') {
    if (options.transferSchedulesAndFiles === false) {
      return { status: 'skipped', details: 'Перенос графиков и файлов отключен', transferredCount: 0 };
    }
    const targetSucc = tasksSucc || mgmtSucc || dirSucc;
    let count = 0;

    if (targetSucc) {
      const shiftRes = await db
        .run(
          `UPDATE employee_shifts SET employee_id = ?, updated_at = ? WHERE employee_id = ? AND shift_date >= ?`,
          [targetSucc.id, nowIso, targetId, todayStr]
        )
        .catch(() => ({ changes: 0 }));
      count += Number(shiftRes?.changes || 0);

      const ovrRes = await db
        .run(
          `UPDATE calendar_overrides SET employee_id = ?, updated_at = ? WHERE employee_id = ? AND override_date >= ?`,
          [targetSucc.id, nowIso, targetId, todayStr]
        )
        .catch(() => ({ changes: 0 }));
      count += Number(ovrRes?.changes || 0);

      const schRes = await db
        .run(
          `UPDATE employee_schedules SET employee_id = ?, user_id = ?, name = ?, updated_at = ? WHERE employee_id = ? OR user_id = ?`,
          [targetSucc.id, targetSucc.id, targetSucc.name, nowIso, targetId, targetId]
        )
        .catch(() => ({ changes: 0 }));
      count += Number(schRes?.changes || 0);

      const filesRes = await db
        .run(`UPDATE file_storage SET owner_id = ? WHERE owner_id = ?`, [targetSucc.id, targetId])
        .catch(() => ({ changes: 0 }));
      count += Number(filesRes?.changes || 0);

      await db.run(`UPDATE schedule_templates SET user_id = ?, updated_at = ? WHERE user_id = ?`, [targetSucc.id, nowIso, targetId]).catch(() => {});
      await db.run(`UPDATE ai_voice_logs SET user_id = ? WHERE user_id = ?`, [targetSucc.id, targetId]).catch(() => {});
    }

    await recordAuditLog(db, {
      jobId: job.id,
      companyId,
      stage,
      entityTable: 'schedules_files',
      fromUserId: targetId,
      toUserId: targetSucc?.id || null,
      affectedCount: count,
      details: `Будущих смен, графиков и файлов перенесено: ${count}`,
    });

    return {
      status: 'completed',
      details: `Графики и файлы (${count}) переданы`,
      transferredCount: count,
    };
  }

  // 5. ROUTING RULES, TELEGRAM & COMPANY OWNERSHIP
  if (stage === 'routing_telegram') {
    if (options.transferRoutingRules === false && !options.replaceDirectorInCompany) {
      return { status: 'skipped', details: 'Обновление маршрутизации и компании отключено', transferredCount: 0 };
    }
    let count = 0;
    const ruleTarget = mgmtSucc || dirSucc || tasksSucc;

    if (ruleTarget) {
      const r1 = await db
        .run(
          `UPDATE telegram_routing_rules SET target_user_id = ?, target_title = ?, updated_at = ? WHERE target_user_id = ?`,
          [ruleTarget.id, ruleTarget.name, nowIso, targetId]
        )
        .catch(() => ({ changes: 0 }));
      const r2 = await db
        .run(
          `UPDATE telegram_routing_rules SET review_target_user_id = ?, updated_at = ? WHERE review_target_user_id = ?`,
          [ruleTarget.id, nowIso, targetId]
        )
        .catch(() => ({ changes: 0 }));
      const t1 = await db
        .run(
          `UPDATE task_routing_rules SET target_user_id = ?, target_title = ?, updated_at = ? WHERE target_user_id = ?`,
          [ruleTarget.id, ruleTarget.name, nowIso, targetId]
        )
        .catch(() => ({ changes: 0 }));
      const t2 = await db
        .run(
          `UPDATE task_routing_rules SET review_target_user_id = ?, updated_at = ? WHERE review_target_user_id = ?`,
          [ruleTarget.id, nowIso, targetId]
        )
        .catch(() => ({ changes: 0 }));

      count += Number(r1?.changes || 0) + Number(r2?.changes || 0) + Number(t1?.changes || 0) + Number(t2?.changes || 0);
    }

    if (options.replaceDirectorInCompany && dirSucc) {
      // Transfer director ownership on routing rules & saved chats
      await db.run(`UPDATE telegram_routing_rules SET director_id = ? WHERE director_id = ?`, [dirSucc.id, targetId]).catch(() => {});
      await db.run(`UPDATE task_routing_rules SET director_id = ? WHERE director_id = ?`, [dirSucc.id, targetId]).catch(() => {});
      await db.run(`UPDATE telegram_saved_chats SET director_id = ? WHERE director_id = ?`, [dirSucc.id, targetId]).catch(() => {});

      // Transfer company leadership
      if (options.syncCompanyContactFromSuccessor) {
        await db.run(
          `UPDATE companies SET director_id = ?, manager = ?, contact = ?, phone = COALESCE(NULLIF(?, ''), phone), email = COALESCE(NULLIF(?, ''), email), updated_at = ? WHERE id = ? OR director_id = ?`,
          [dirSucc.id, dirSucc.name, dirSucc.name, dirSucc.phone || '', dirSucc.email || '', nowIso, companyId, targetId]
        );
      } else {
        await db.run(
          `UPDATE companies SET director_id = ?, manager = ?, updated_at = ? WHERE id = ? OR director_id = ?`,
          [dirSucc.id, dirSucc.name, nowIso, companyId, targetId]
        );
      }

      // Elevate successor role to DIRECTOR (unless already SUPER_ADMIN) & point team director_id to successor
      const nextRole = dirSucc.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'DIRECTOR';
      await db.run(
        `UPDATE users SET role = ?, director_id = ?, company_id = ? WHERE id = ?`,
        [nextRole, dirSucc.id, companyId, dirSucc.id]
      );
      await db.run(
        `UPDATE employees SET role = ?, director_id = ?, company_id = ?, updated_at = ? WHERE id = ?`,
        [nextRole, dirSucc.id, companyId, nowIso, dirSucc.id]
      );
      await db.run(
        `UPDATE users SET director_id = ? WHERE (director_id = ? OR company_id = ?) AND id != ?`,
        [dirSucc.id, targetId, companyId, targetId]
      );
      await db.run(
        `UPDATE employees SET director_id = ?, updated_at = ? WHERE (director_id = ? OR company_id = ?) AND id != ?`,
        [dirSucc.id, nowIso, targetId, companyId, targetId]
      );
      count++;
    }

    await recordAuditLog(db, {
      jobId: job.id,
      companyId,
      stage,
      entityTable: 'routing_telegram',
      fromUserId: targetId,
      toUserId: (options.replaceDirectorInCompany ? dirSucc?.id : ruleTarget?.id) || null,
      affectedCount: count,
      details: options.replaceDirectorInCompany && dirSucc
        ? `Права директора компании и правила Telegram переданы → ${dirSucc.name}`
        : `Правила маршрутизации Telegram (${count}) обновлены`,
    });

    return {
      status: 'completed',
      details: options.replaceDirectorInCompany && dirSucc
        ? `Владение компанией и Telegram-правила → ${dirSucc.name}`
        : `Правила маршрутизации (${count}) обновлены`,
      transferredCount: count,
    };
  }

  // 6. REFERRALS
  if (stage === 'referrals') {
    if (!options.transferReferrals || !refSucc) {
      return { status: 'skipped', details: 'Перенос рефералов не требуется или не выбран преемник', transferredCount: 0 };
    }

    const refRes = await db.run(
      `UPDATE users SET referred_by = ? WHERE referred_by = ? AND id != ?`,
      [refSucc.id, targetId, refSucc.id]
    );
    await db
      .run(`UPDATE employees SET referred_by = ? WHERE referred_by = ? AND id != ?`, [refSucc.id, targetId, refSucc.id])
      .catch(() => {});

    const movedCount = Number(refRes?.changes || 0);
    const prevInvited = Number(ctx.targetUser?.invitedUsersCount || ctx.targetUser?.inviteduserscount || 0);
    const prevClicks = Number(ctx.targetUser?.referral_clicks || 0);

    // Guard idempotency via offboarding_audit_log
    const alreadyRefAudit = await db.get(
      `SELECT id FROM offboarding_audit_log WHERE job_id = ? AND stage = 'referrals' AND entity_table = 'users_referral_counters' LIMIT 1`,
      [job.id]
    );
    if (!alreadyRefAudit && (prevInvited > 0 || prevClicks > 0)) {
      await db.run(
        `UPDATE users SET "invitedUsersCount" = COALESCE("invitedUsersCount", 0) + ?, inviteduserscount = COALESCE(inviteduserscount, 0) + ?, referral_clicks = COALESCE(referral_clicks, 0) + ? WHERE id = ?`,
        [prevInvited, prevInvited, prevClicks, refSucc.id]
      );
      await db.run(
        `UPDATE users SET "invitedUsersCount" = 0, inviteduserscount = 0, referral_clicks = 0 WHERE id = ?`,
        [targetId]
      );
      await recordAuditLog(db, {
        jobId: job.id,
        companyId,
        stage,
        entityTable: 'users_referral_counters',
        fromUserId: targetId,
        toUserId: refSucc.id,
        affectedCount: prevInvited,
        details: `Перенесено рефералов: ${movedCount}, счетчик приглашений: ${prevInvited}`,
      });
    }

    return {
      status: 'completed',
      details: `Реферальная сеть (${movedCount} пользователей) → ${refSucc.name}`,
      transferredCount: movedCount,
    };
  }

  // 7. FINANCE, BALANCES, PAYMENTS & TARIFFS (strict idempotent separate-column transfer)
  if (stage === 'finance_tariffs') {
    if (!options.transferBalancesAndTariffs || !dirSucc) {
      return { status: 'skipped', details: 'Перенос финансов и тарифов отключен', transferredCount: 0 };
    }

    const fromUser = await db.get(`SELECT * FROM users WHERE id = ? LIMIT 1`, [targetId]);
    const toUser = await db.get(`SELECT * FROM users WHERE id = ? LIMIT 1`, [dirSucc.id]);
    if (!fromUser || !toUser) {
      return { status: 'skipped', details: 'Учетная запись для переноса баланса не найдена', transferredCount: 0 };
    }

    const balanceColumns: Array<{ col: string; label: string; currency: string; isLedger: boolean }> = [
      { col: 'payment_balance', label: 'Платный баланс (RR)', currency: 'RR', isLedger: true },
      { col: 'local_bonus', label: 'Локальные бонусы (RR)', currency: 'RR', isLedger: false },
      { col: 'referral_bonus', label: 'Реферальный баланс (RR)', currency: 'RR', isLedger: false },
      { col: 'welcome_bonus', label: 'Приветственные бонусы (RR)', currency: 'RR', isLedger: false },
      { col: 'referral_reward_balance', label: 'Реферальное вознаграждение', currency: 'RUB', isLedger: false },
    ];

    let transferredOps = 0;
    for (const bc of balanceColumns) {
      const amount = Number(fromUser[bc.col] || 0);
      const debitRef = `offboard_${job.id}_${bc.col}_debit`;
      const creditRef = `offboard_${job.id}_${bc.col}_credit`;

      const existingTx = await db.get(`SELECT id FROM transactions WHERE reference_id = ? LIMIT 1`, [creditRef]);
      if (existingTx || amount <= 0) continue;

      const tsMs = Date.now();
      const txDebitType = bc.isLedger ? 'debit' : 'offboard_bonus_debit';
      const txCreditType = bc.isLedger ? 'replenishment' : 'offboard_bonus_credit';
      const txDebitRr = bc.isLedger ? -amount : 0;
      const txCreditRr = bc.isLedger ? amount : 0;

      await db.run(
        `INSERT INTO transactions (id, user_id, amount, amount_rub, amount_rr, currency, type, description, status, timestamp, created_at, reference_id)
         VALUES (?, ?, ?, 0, ?, ?, ?, ?, 'completed', ?, ?, ?)`,
        [
          `tx_${debitRef}`,
          targetId,
          -amount,
          txDebitRr,
          bc.currency,
          txDebitType,
          `Передача остатка «${bc.label}» преемнику ${dirSucc.name} при увольнении (задача ${job.id})`,
          tsMs,
          nowIso,
          debitRef,
        ]
      );

      await db.run(
        `INSERT INTO transactions (id, user_id, amount, amount_rub, amount_rr, currency, type, description, status, timestamp, created_at, reference_id)
         VALUES (?, ?, ?, 0, ?, ?, ?, ?, 'completed', ?, ?, ?)`,
        [
          `tx_${creditRef}`,
          dirSucc.id,
          amount,
          txCreditRr,
          bc.currency,
          txCreditType,
          `Принятие остатка «${bc.label}» от ${targetName} при передаче дел (задача ${job.id})`,
          tsMs + 1,
          nowIso,
          creditRef,
        ]
      );

      // For ledger balance (payment_balance), PostgreSQL trigger fn_trg_transactions_sync_user_balances
      // already adjusts users.payment_balance atomically on INSERT INTO transactions when amount_rr != 0.
      // Only separate bonus columns need direct UPDATE users.
      if (!bc.isLedger) {
        await db.run(
          `UPDATE users SET ${bc.col} = COALESCE(${bc.col}, 0) + ? WHERE id = ?`,
          [amount, dirSucc.id]
        );
        await db.run(`UPDATE users SET ${bc.col} = 0 WHERE id = ?`, [targetId]);
      }

      await recordAuditLog(db, {
        jobId: job.id,
        companyId,
        stage,
        entityTable: `users.${bc.col}`,
        fromUserId: targetId,
        toUserId: dirSucc.id,
        affectedCount: amount,
        referenceId: creditRef,
        details: `${bc.label}: перенесено ${amount}`,
      });
      transferredOps++;
    }

    // Transfer extra limits & active subscription dates once per job
    const quotaAudit = await db.get(
      `SELECT id FROM offboarding_audit_log WHERE job_id = ? AND stage = 'finance_tariffs' AND entity_table = 'users_tariffs_quotas' LIMIT 1`,
      [job.id]
    );
    if (!quotaAudit) {
      const pickLaterDate = (a?: string | null, b?: string | null) => {
        if (!a) return b || null;
        if (!b) return a || null;
        return String(a) >= String(b) ? a : b;
      };

      const nextRevPaidUntil = pickLaterDate(fromUser.revizor_paid_until, toUser.revizor_paid_until);
      const nextRecPaidUntil = pickLaterDate(fromUser.recruiter_paid_until, toUser.recruiter_paid_until);
      const nextRevExpires = pickLaterDate(fromUser.revisor_expires_at, toUser.revisor_expires_at);
      const nextRapExpires = pickLaterDate(fromUser.raport_expires_at, toUser.raport_expires_at);
      const nextTrialEnds = pickLaterDate(fromUser.trial_ends_at, toUser.trial_ends_at);

      await db.run(
        `UPDATE users SET
          extra_projects_balance = COALESCE(extra_projects_balance, 0) + ?,
          extra_tasks_balance = COALESCE(extra_tasks_balance, 0) + ?,
          extra_reports_balance = COALESCE(extra_reports_balance, 0) + ?,
          purchased_extra_projects = COALESCE(purchased_extra_projects, 0) + ?,
          purchased_extra_tasks = COALESCE(purchased_extra_tasks, 0) + ?,
          purchased_extra_reports = COALESCE(purchased_extra_reports, 0) + ?,
          projects_limit = GREATEST(COALESCE(projects_limit, 10), ?),
          tasks_limit = GREATEST(COALESCE(tasks_limit, 50), ?),
          reports_limit = GREATEST(COALESCE(reports_limit, 50), ?),
          revisor_active = GREATEST(COALESCE(revisor_active, 0), ?),
          raport_active = GREATEST(COALESCE(raport_active, 0), ?),
          revisor_expires_at = ?,
          raport_expires_at = ?,
          revizor_paid_until = ?,
          recruiter_paid_until = ?,
          trial_ends_at = ?
         WHERE id = ?`,
        [
          Number(fromUser.extra_projects_balance || 0),
          Number(fromUser.extra_tasks_balance || 0),
          Number(fromUser.extra_reports_balance || 0),
          Number(fromUser.purchased_extra_projects || 0),
          Number(fromUser.purchased_extra_tasks || 0),
          Number(fromUser.purchased_extra_reports || 0),
          Number(fromUser.projects_limit || 10),
          Number(fromUser.tasks_limit || 50),
          Number(fromUser.reports_limit || 50),
          Number(fromUser.revisor_active || 0),
          Number(fromUser.raport_active || 0),
          nextRevExpires,
          nextRapExpires,
          nextRevPaidUntil,
          nextRecPaidUntil,
          nextTrialEnds,
          dirSucc.id,
        ]
      );

      await db.run(
        `UPDATE users SET
          extra_projects_balance = 0,
          extra_tasks_balance = 0,
          extra_reports_balance = 0,
          revisor_active = 0,
          raport_active = 0
         WHERE id = ?`,
        [targetId]
      );

      // Rebind payment history to new director when replacing company owner
      if (options.replaceDirectorInCompany) {
        const payRes = await db
          .run(`UPDATE payments SET user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`, [dirSucc.id, targetId])
          .catch(() => ({ changes: 0 }));
        transferredOps += Number(payRes?.changes || 0);
      }

      await recordAuditLog(db, {
        jobId: job.id,
        companyId,
        stage,
        entityTable: 'users_tariffs_quotas',
        fromUserId: targetId,
        toUserId: dirSucc.id,
        affectedCount: 1,
        details: `Тарифы, лимиты и пакеты компании перенесены → ${dirSucc.name}`,
      });
      transferredOps++;
    }

    return {
      status: 'completed',
      details: `Балансы, тарифы и оплаты (${transferredOps} операций) → ${dirSucc.name}`,
      transferredCount: transferredOps,
    };
  }

  // 8. FINALIZE ACCESS REVOCATION, SEATS RECALC, AI BRIEF & TELEGRAM NOTIFY
  if (stage === 'finalize_notify') {
    await db.run(`UPDATE employees SET status = 'dismissed', department_id = NULL, updated_at = ? WHERE id = ?`, [nowIso, targetId]);
    await db.run(`UPDATE users SET status = 'dismissed', department_id = NULL WHERE id = ?`, [targetId]);

    // Remove target from any remaining departments.employee_ids
    const depts = await db.all(`SELECT id, employee_ids FROM departments WHERE company_id = ?`, [companyId]);
    for (const d of depts || []) {
      const ids = safeJsonParse<string[]>(d.employee_ids, []).map(String);
      if (ids.includes(targetId)) {
        await db.run(`UPDATE departments SET employee_ids = ?, updated_at = ? WHERE id = ?`, [
          JSON.stringify(ids.filter((x) => x !== targetId)),
          nowIso,
          d.id,
        ]);
      }
    }

    // Recalculate active seats for active director
    const activeDirectorId = options.replaceDirectorInCompany && dirSucc ? dirSucc.id : (ctx.targetUser?.director_id || companyId.replace(/^com-/, ''));
    if (activeDirectorId) {
      const activeCountRow = await db.get(
        `SELECT COUNT(DISTINCT id) as cnt FROM employees WHERE (director_id = ? OR company_id = ?) AND (status = 'active' OR status IS NULL OR status = '')`,
        [activeDirectorId, companyId]
      );
      const activeCount = Math.max(1, Number(activeCountRow?.cnt || 1));
      await db
        .run(
          `UPDATE users SET active_employees_count = ?, revisor_seats_next_period = ?, recruiter_seats_next_period = ? WHERE id = ?`,
          [activeCount, activeCount, activeCount, activeDirectorId]
        )
        .catch(() => {});
    }

    // Build handover summary (from audit logs + optional AI enhancement)
    const logs = await db.all(
      `SELECT stage, entity_table, to_user_id, affected_count, details FROM offboarding_audit_log WHERE job_id = ? ORDER BY created_at ASC`,
      [job.id]
    );
    const bulletSummary =
      (logs || [])
        .map((l: any) => `• ${l.details}`)
        .join('\n') || '• Доступ закрыт, история сохранена в архиве компании.';

    let handoverBrief = `Пакет передачи дел от «${targetName}» (${targetRole}):\n${bulletSummary}`;
    if (options.generateAiHandoverBrief && logs && logs.length > 0) {
      try {
        const aiRes = await callProTalkAi({
          prompt: `Сформируй короткую деловую памятку (4-6 предложений) для преемника о передаче дел при увольнении сотрудника «${targetName}» (${targetRole}).\nФактические операции передачи:\n${bulletSummary}`,
          systemPrompt: 'Ты — системный ассистент управления командой. Отвечай кратко, структурированно и на русском языке, без капслока.',
          userId: activeDirectorId || ctx.initiatorUserId || '91827364501',
          entityType: 'raport',
          timeoutMs: 20000,
        });
        if (aiRes?.reply && aiRes.reply.trim().length > 20) {
          handoverBrief = `${aiRes.reply.trim()}\n\nСводка операций:\n${bulletSummary}`;
        }
      } catch {
        // Fallback to deterministic brief silently
      }
    }

    await db.run(`UPDATE offboarding_jobs SET handover_brief = ?, updated_at = ? WHERE id = ?`, [
      handoverBrief,
      nowIso,
      job.id,
    ]);

    // In-app + Telegram notifications (best effort)
    const recipients = Array.from(
      new Set([tasksSucc?.id, mgmtSucc?.id, dirSucc?.id, refSucc?.id, ctx.initiatorUserId].filter(Boolean) as string[])
    );
    for (const rId of recipients) {
      if (rId === targetId) continue;
      const notifId = `notif_offboard_${job.id}_${rId}`;
      const existingNotif = await db.get(`SELECT id FROM notifications WHERE id = ? LIMIT 1`, [notifId]);
      if (!existingNotif) {
        await db
          .run(
            `INSERT INTO notifications (id, user_id, "userId", title, message, type, is_read, "isRead", timestamp, created_at, "actionUrl")
             VALUES (?, ?, ?, ?, ?, 'offboarding', 0, 0, ?, ?, '/cabinet/employees')`,
            [
              notifId,
              rId,
              rId,
              `Передача дел завершена: ${targetName}`,
              handoverBrief.slice(0, 1000),
              nowIso,
              nowIso,
            ]
          )
          .catch(() => {});
      }
    }

    if (options.notifyTelegram !== false) {
      const cfgRow = await db
        .get(
          `SELECT * FROM telegram_bot_config WHERE id = ? OR id = 'default' ORDER BY CASE WHEN id = ? THEN 0 ELSE 1 END LIMIT 1`,
          [`company_${companyId}`, `company_${companyId}`]
        )
        .catch(() => null);
      const botToken = cfgRow?.botToken || cfgRow?.bottoken || undefined;
      const tgChatTargets = Array.from(
        new Set(
          [tasksSucc?.telegram_id, mgmtSucc?.telegram_id, dirSucc?.telegram_id]
            .filter((x) => x && String(x).trim().length > 0)
            .map((x) => String(x).trim())
        )
      );

      for (const chatId of tgChatTargets) {
        await sendTelegramRichMessage({
          chatId,
          markdown: `📋 *Каскадное увольнение и передача дел завершены*\n\nСотрудник: *${targetName}*\n\n${handoverBrief.slice(0, 2800)}`,
          botToken,
        }).catch(() => {});
      }
    }

    return {
      status: 'completed',
      details: `Доступ ${targetName} закрыт, уведомления и пакет передачи дел сформированы`,
      transferredCount: 1,
    };
  }

  return { status: 'skipped', details: 'Неизвестный этап', transferredCount: 0 };
}
