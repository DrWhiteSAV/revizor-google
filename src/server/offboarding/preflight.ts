import { ensureOffboardingSchema, safeJsonParse } from './schema';

export async function resolveTargetRecord(db: any, userId: string) {
  const user = await db.get('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
  const emp = await db.get('SELECT * FROM employees WHERE id = ? LIMIT 1', [userId]);
  return { user, emp };
}

export async function getOffboardingPreflight(db: any, targetUserId: string, requestedCompanyId?: string) {
  await ensureOffboardingSchema(db);
  const { user, emp } = await resolveTargetRecord(db, targetUserId);
  if (!user && !emp) {
    return { found: false, error: 'Сотрудник или пользователь не найден в базе данных' };
  }

  const targetRole = String(user?.role || emp?.role || 'EMPLOYEE').toUpperCase();
  const targetName = user?.name || emp?.name || 'Сотрудник';
  const directorId = String(
    user?.director_id ||
      emp?.director_id ||
      (targetRole === 'DIRECTOR' || targetRole === 'SUPER_ADMIN' ? targetUserId : '')
  );

  let companyId = String(
    requestedCompanyId ||
      user?.company_id ||
      emp?.company_id ||
      (directorId ? `com-${directorId}` : '')
  ).trim();

  if (!companyId || companyId === 'all') {
    companyId = directorId ? `com-${directorId}` : 'flagship-main';
  }

  const cleanComp = companyId.replace(/^com-/, '');
  const isFlagship =
    companyId === 'flagship-main' ||
    companyId === 'com-91827364501' ||
    cleanComp === '91827364501';
  const companyAliases = Array.from(
    new Set(
      [
        companyId,
        cleanComp,
        cleanComp ? `com-${cleanComp}` : '',
        directorId ? `com-${directorId}` : '',
        ...(isFlagship ? ['flagship-main', 'com-91827364501', '91827364501'] : []),
      ].filter(Boolean)
    )
  );
  const compPh = companyAliases.map(() => '?').join(', ');

  // 1. Tasks counts
  const openTasksRow = await db.get(
    `SELECT COUNT(*) as cnt FROM tasks WHERE ("executorId" = ? OR executorid = ? OR reviewer_id = ?) AND status != 'completed'`,
    [targetUserId, targetUserId, targetUserId]
  );
  const completedTasksRow = await db.get(
    `SELECT COUNT(*) as cnt FROM tasks WHERE ("executorId" = ? OR executorid = ?) AND status = 'completed'`,
    [targetUserId, targetUserId]
  );
  const authoredTasksRow = await db.get(
    `SELECT COUNT(*) as cnt FROM tasks WHERE author_id = ? OR director_id = ?`,
    [targetUserId, targetUserId]
  );

  // 2. Projects & Departments
  const projectsRow = await db.get(
    `SELECT COUNT(*) as cnt FROM projects WHERE (author_id = ? OR director_id = ? OR LOWER(COALESCE(manager, '')) = LOWER(?))`,
    [targetUserId, targetUserId, targetName]
  );
  const allDepts = await db.all(
    `SELECT id, name, manager_id, lead_name, employee_ids, director_id FROM departments WHERE company_id IN (${compPh})`,
    companyAliases
  );
  let managedDeptsCount = 0;
  let memberDeptsCount = 0;
  for (const d of allDepts || []) {
    if (String(d.manager_id || '') === targetUserId || (d.lead_name && d.lead_name.toLowerCase() === targetName.toLowerCase())) {
      managedDeptsCount++;
    }
    const empIds = safeJsonParse<string[]>(d.employee_ids, []);
    if (Array.isArray(empIds) && empIds.map(String).includes(targetUserId)) {
      memberDeptsCount++;
    }
  }

  // 3. Reports & Templates
  const pendingReportsRow = await db.get(
    `SELECT COUNT(*) as cnt FROM reports WHERE (reviewer_id = ? OR director_id = ?) AND COALESCE("isReviewedByManager", 0) = 0 AND COALESCE(isreviewedbymanager, 0) = 0`,
    [targetUserId, targetUserId]
  );
  const historyReportsRow = await db.get(
    `SELECT COUNT(*) as cnt FROM reports WHERE "employeeId" = ? OR employee_id = ? OR employeeid = ?`,
    [targetUserId, targetUserId, targetUserId]
  );
  const allTemplates = await db.all(
    `SELECT id, reviewer_id, director_id, target_employees, "employeeIds", employeeids FROM report_templates WHERE company_id IN (${compPh})`,
    companyAliases
  );
  let templatesCount = 0;
  for (const t of allTemplates || []) {
    const tEmps = safeJsonParse<string[]>(t.target_employees || t.employeeIds || t.employeeids, []);
    if (
      String(t.reviewer_id || '') === targetUserId ||
      String(t.director_id || '') === targetUserId ||
      (Array.isArray(tEmps) && tEmps.map(String).includes(targetUserId))
    ) {
      templatesCount++;
    }
  }

  // 4. Schedules, Shifts & Files
  const todayStr = new Date().toISOString().slice(0, 10);
  const futureShiftsRow = await db.get(
    `SELECT COUNT(*) as cnt FROM employee_shifts WHERE employee_id = ? AND shift_date >= ?`,
    [targetUserId, todayStr]
  ).catch(() => ({ cnt: 0 }));
  const schedulesRow = await db.get(
    `SELECT COUNT(*) as cnt FROM employee_schedules WHERE employee_id = ? OR user_id = ?`,
    [targetUserId, targetUserId]
  ).catch(() => ({ cnt: 0 }));
  const filesRow = await db.get(
    `SELECT COUNT(*) as cnt FROM file_storage WHERE owner_id = ?`,
    [targetUserId]
  ).catch(() => ({ cnt: 0 }));

  // 5. Telegram routing rules
  const tgReportRulesRow = await db.get(
    `SELECT COUNT(*) as cnt FROM telegram_routing_rules WHERE target_user_id = ? OR review_target_user_id = ? OR director_id = ?`,
    [targetUserId, targetUserId, targetUserId]
  ).catch(() => ({ cnt: 0 }));
  const tgTaskRulesRow = await db.get(
    `SELECT COUNT(*) as cnt FROM task_routing_rules WHERE target_user_id = ? OR review_target_user_id = ? OR director_id = ?`,
    [targetUserId, targetUserId, targetUserId]
  ).catch(() => ({ cnt: 0 }));

  // 6. Referrals & Subordinate Staff
  const referralsRow = await db.get(
    `SELECT COUNT(*) as cnt FROM users WHERE referred_by = ?`,
    [targetUserId]
  );
  const subordinatesRow = await db.get(
    `SELECT COUNT(*) as cnt FROM users WHERE director_id = ? AND id != ?`,
    [targetUserId, targetUserId]
  );
  const ownedCompaniesRow = await db.get(
    `SELECT COUNT(*) as cnt FROM companies WHERE director_id = ?`,
    [targetUserId]
  );

  // 7. Eligible active successors in same company (exclude target & dismissed)
  const rawUsers = await db.all(
    `SELECT id, name, email, role, position, department_id, telegram_id, status, company_id, director_id FROM users WHERE company_id IN (${compPh}) OR director_id = ?`,
    [...companyAliases, directorId || cleanComp]
  );
  const rawEmps = await db.all(
    `SELECT id, name, email, role, position, department_id, telegram_id, status, company_id, director_id FROM employees WHERE company_id IN (${compPh}) OR director_id = ?`,
    [...companyAliases, directorId || cleanComp]
  );

  const succMap = new Map<string, any>();
  for (const r of [...(rawUsers || []), ...(rawEmps || [])]) {
    const rId = String(r.id);
    if (rId === targetUserId) continue;
    const st = String(r.status || 'active').toLowerCase();
    if (st === 'dismissed' || st === 'dismissing') continue;
    const existing = succMap.get(rId);
    succMap.set(rId, {
      id: rId,
      name: r.name && r.name !== 'Сотрудник' ? r.name : existing?.name || r.email || 'Сотрудник',
      email: r.email || existing?.email || '',
      role: String(r.role || existing?.role || 'EMPLOYEE').toUpperCase(),
      position: r.position || existing?.position || 'Специалист',
      department_id: r.department_id || existing?.department_id || null,
      status: st,
    });
  }

  const isMainOwner =
    targetUserId === '91827364501' ||
    String(user?.email || '').toLowerCase() === 'shishkarnem@gmail.com';
  const isBoss = targetRole === 'DIRECTOR' || targetRole === 'SUPER_ADMIN';

  return {
    found: true,
    target: {
      id: targetUserId,
      name: targetName,
      email: user?.email || emp?.email || '',
      phone: user?.phone || emp?.phone || '',
      role: targetRole,
      position: user?.position || emp?.position || '',
      status: user?.status || emp?.status || 'active',
      company_id: companyId,
      director_id: directorId,
      is_boss: isBoss,
      is_main_platform_owner: isMainOwner,
    },
    counts: {
      open_tasks: Number(openTasksRow?.cnt || 0),
      completed_tasks: Number(completedTasksRow?.cnt || 0),
      authored_tasks: Number(authoredTasksRow?.cnt || 0),
      projects: Number(projectsRow?.cnt || 0),
      managed_departments: managedDeptsCount,
      member_departments: memberDeptsCount,
      pending_reports: Number(pendingReportsRow?.cnt || 0),
      history_reports: Number(historyReportsRow?.cnt || 0),
      report_templates: templatesCount,
      future_shifts: Number(futureShiftsRow?.cnt || 0),
      schedules: Number(schedulesRow?.cnt || 0),
      files: Number(filesRow?.cnt || 0),
      routing_rules: Number(tgReportRulesRow?.cnt || 0) + Number(tgTaskRulesRow?.cnt || 0),
      referrals: Number(referralsRow?.cnt || 0),
      subordinates: Number(subordinatesRow?.cnt || 0),
      owned_companies: Number(ownedCompaniesRow?.cnt || 0),
    },
    balances: {
      payment_balance: Number(user?.payment_balance || 0),
      local_bonus: Number(user?.local_bonus || 0),
      referral_bonus: Number(user?.referral_bonus || 0),
      welcome_bonus: Number(user?.welcome_bonus || 0),
      referral_reward_balance: Number(user?.referral_reward_balance || 0),
      extra_projects_balance: Number(user?.extra_projects_balance || 0),
      extra_tasks_balance: Number(user?.extra_tasks_balance || 0),
      extra_reports_balance: Number(user?.extra_reports_balance || 0),
      revizor_paid_until: user?.revizor_paid_until || user?.revisor_expires_at || null,
      recruiter_paid_until: user?.recruiter_paid_until || user?.raport_expires_at || null,
    },
    eligible_successors: Array.from(succMap.values()),
  };
}
