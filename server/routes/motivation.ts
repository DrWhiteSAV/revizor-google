import express from 'express';
import { getDb, generateId } from '../../src/db/initDb';
import {
  ensureMotivationSchema,
  safeJsonParse,
  buildDefaultFixedConfig
} from './motivation/schema';
import {
  buildCompanyAliases,
  calculateMotivationForReport,
  findActiveCalculatorForEmployee,
  getMonthShiftStats,
  normalizeCalculatorRow
} from './motivation/calculatorEngine';
import { parseMotivationWithAi } from './motivation/aiBuilder';

const router = express.Router();

// GET /api/motivation/calculators — list company calculators/templates + assignments count
router.get('/calculators', async (req, res) => {
  try {
    const db = await getDb();
    await ensureMotivationSchema(db);
    const companyId = String(req.query.company_id || req.query.companyId || '');
    const directorId = String(req.query.director_id || req.query.directorId || '');
    const includeArchived = req.query.includeArchived === '1';

    const aliases = buildCompanyAliases(companyId, directorId);
    const ph = aliases.map(() => '?').join(',');

    const whereArchive = includeArchived ? '' : 'AND COALESCE(is_archived, 0) = 0';
    const rows =
      aliases.length > 0
        ? await db.all(
            `SELECT * FROM motivation_calculators WHERE (company_id IN (${ph}) OR director_id IN (${ph})) ${whereArchive} ORDER BY updated_at DESC`,
            [...aliases, ...aliases]
          )
        : await db.all(`SELECT * FROM motivation_calculators WHERE 1=1 ${whereArchive} ORDER BY updated_at DESC`);

    const assignments = await db.all(`SELECT * FROM motivation_assignments WHERE is_active = 1`).catch(() => []);
    const accrualCounts = await db
      .all(`SELECT calculator_id, COUNT(*) as cnt, COALESCE(SUM(total_earned_rub), 0) as sum_rub FROM motivation_accruals GROUP BY calculator_id`)
      .catch(() => []);

    const calculators = (rows || []).map((r: any) => {
      const calc = normalizeCalculatorRow(r);
      const calcAssigns = (assignments || []).filter((a: any) => String(a.calculator_id) === calc.id);
      const accStat = (accrualCounts || []).find((s: any) => String(s.calculator_id) === calc.id);
      return {
        ...calc,
        assigned_count: calcAssigns.length,
        accruals_count: Number(accStat?.cnt || 0),
        accruals_total_rub: Math.round(Number(accStat?.sum_rub || 0) * 100) / 100
      };
    });

    res.json({ success: true, calculators });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Ошибка загрузки калькуляторов' });
  }
});

// GET /api/motivation/my-summary — visible to every user (active calculator, % completion, schedule pace, month totals)
router.get('/my-summary', async (req, res) => {
  try {
    const db = await getDb();
    await ensureMotivationSchema(db);
    const employeeId = String(req.query.employeeId || req.query.userId || '');
    const companyId = String(req.query.company_id || req.query.companyId || 'flagship-main');
    const directorId = String(req.query.director_id || req.query.directorId || '');
    const dateStr = String(req.query.date || new Date().toISOString().slice(0, 10));
    const periodMonth = dateStr.slice(0, 7);

    if (!employeeId) {
      return res.status(400).json({ success: false, error: 'Не указан employeeId' });
    }

    const userRow = await db
      .get(`SELECT id, name, position, department_id, company_id, director_id FROM users WHERE id = ? LIMIT 1`, [employeeId])
      .catch(() => null);
    const empRow = await db
      .get(`SELECT id, name, position, department_id, company_id, director_id FROM employees WHERE id = ? OR telegram_id = ? LIMIT 1`, [employeeId, employeeId])
      .catch(() => null);

    const empName = userRow?.name || empRow?.name || 'Специалист';
    const effCompany = userRow?.company_id || empRow?.company_id || companyId;
    const effDirector = userRow?.director_id || empRow?.director_id || directorId;
    const positionName = userRow?.position || empRow?.position || '';
    const departmentId = userRow?.department_id || empRow?.department_id || '';

    const calculator = await findActiveCalculatorForEmployee(
      db,
      employeeId,
      effCompany,
      effDirector,
      positionName,
      departmentId
    );

    const shiftStats = await getMonthShiftStats(db, employeeId, effCompany, dateStr);

    // Check morning report for today (PostgreSQL TIMESTAMPTZ compatible)
    const allEmpReports = await db
      .all(
        `SELECT id, templateId, templateTitle, type, timestamp, answers FROM reports WHERE (employeeId = ? OR employee_id = ?) ORDER BY timestamp ASC`,
        [employeeId, employeeId]
      )
      .catch(() => []);

    const toDatePrefix = (ts: any) => {
      if (!ts) return '';
      if (ts instanceof Date) return ts.toISOString().slice(0, 10);
      const s = String(ts).trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
      const d = new Date(s);
      return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
    };

    const todayReports = (allEmpReports || []).filter((r: any) => toDatePrefix(r.timestamp) === dateStr);

    const morningReport = todayReports.find((r: any) =>
      calculator?.morning_report_template_id
        ? String(r.templateId || r.templateid || '') === String(calculator.morning_report_template_id)
        : String(r.type || '').toUpperCase() === 'PLAN_DAY'
    ) || todayReports.find((r: any) => String(r.type || '').toUpperCase() === 'PLAN_DAY') || null;

    const eveningReport = todayReports.find((r: any) => String(r.type || '').toUpperCase() !== 'PLAN_DAY') || null;

    let liveCalculation = null;
    if (calculator) {
      liveCalculation = await calculateMotivationForReport(db, {
        calculator,
        employeeId,
        employeeName: empName,
        eveningReport: eveningReport || undefined,
        morningReport: morningReport || undefined,
        dateStrOverride: dateStr
      });
    }

    const monthAccruals = await db
      .all(
        `SELECT * FROM motivation_accruals WHERE employee_id = ? AND period_month = ? ORDER BY accrual_date DESC`,
        [employeeId, periodMonth]
      )
      .catch(() => []);

    const monthEarnedRub = (monthAccruals || []).reduce(
      (sum: number, a: any) => sum + Number(a.total_earned_rub || 0),
      0
    );

    res.json({
      success: true,
      employee: { id: employeeId, name: empName, position: positionName, departmentId },
      calculator,
      shiftStats,
      hasMorningReportToday: Boolean(morningReport),
      morningReport,
      hasEveningReportToday: Boolean(eveningReport),
      liveCalculation,
      monthEarnedRub: Math.round(monthEarnedRub * 100) / 100,
      recentAccruals: (monthAccruals || []).map((a: any) => ({
        ...a,
        kpi_breakdown: safeJsonParse(a.kpi_breakdown_json, [])
      }))
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Ошибка расчета сводки мотивации' });
  }
});

// GET /api/motivation/plan-progress — live KPI progress for report filling screen
router.get('/plan-progress', async (req, res) => {
  try {
    const db = await getDb();
    await ensureMotivationSchema(db);
    const employeeId = String(req.query.employeeId || req.query.userId || '');
    const companyId = String(req.query.company_id || req.query.companyId || 'flagship-main');
    const templateId = String(req.query.templateId || '');
    const dateStr = String(req.query.date || new Date().toISOString().slice(0, 10));

    if (!employeeId) {
      return res.json({ success: true, calculator: null, items: [], missingMorningReport: false });
    }

    const userRow = await db
      .get(`SELECT position, department_id, company_id, director_id, name FROM users WHERE id = ? LIMIT 1`, [employeeId])
      .catch(() => null);

    const calculator = await findActiveCalculatorForEmployee(
      db,
      employeeId,
      userRow?.company_id || companyId,
      userRow?.director_id || '',
      userRow?.position || '',
      userRow?.department_id || '',
      templateId || undefined
    );

    if (!calculator) {
      return res.json({ success: true, calculator: null, items: [], missingMorningReport: false });
    }

    const calcResult = await calculateMotivationForReport(db, {
      calculator,
      employeeId,
      employeeName: userRow?.name || 'Специалист',
      dateStrOverride: dateStr,
      overrideAnswers: {}
    });

    res.json({
      success: true,
      calculator: {
        id: calculator.id,
        title: calculator.title,
        verification_mode: calculator.fixed_config.verification_mode,
        morning_report_template_id: calculator.morning_report_template_id,
        evening_report_template_id: calculator.evening_report_template_id
      },
      missingMorningReport: calcResult.missingMorningReport,
      morningWarning: calcResult.morningWarning,
      schedulePacePct: calcResult.schedulePacePct,
      workingShiftsInMonth: calcResult.workingShiftsInMonth,
      workedShiftsInMonthSoFar: calcResult.workedShiftsInMonthSoFar,
      items: calcResult.kpiBreakdown
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Ошибка прогресса планов' });
  }
});

// Helper to sync motivation_assignments
async function syncAssignments(
  db: any,
  calculatorId: string,
  companyId: string,
  employeeIds: string[],
  positions: string[],
  departmentIds: string[]
) {
  await db.run(`UPDATE motivation_assignments SET is_active = 0, unassigned_at = CURRENT_TIMESTAMP WHERE calculator_id = ? AND is_active = 1`, [calculatorId]);

  for (const empId of employeeIds) {
    if (!empId) continue;
    await db.run(
      `INSERT INTO motivation_assignments (id, calculator_id, company_id, employee_id, is_active) VALUES (?, ?, ?, ?, 1)`,
      [generateId('massign'), calculatorId, companyId, String(empId)]
    );
  }
  for (const pos of positions) {
    if (!pos) continue;
    await db.run(
      `INSERT INTO motivation_assignments (id, calculator_id, company_id, position_name, is_active) VALUES (?, ?, ?, ?, 1)`,
      [generateId('massign'), calculatorId, companyId, String(pos)]
    );
  }
  for (const deptId of departmentIds) {
    if (!deptId) continue;
    await db.run(
      `INSERT INTO motivation_assignments (id, calculator_id, company_id, department_id, is_active) VALUES (?, ?, ?, ?, 1)`,
      [generateId('massign'), calculatorId, companyId, String(deptId)]
    );
  }
}

// POST /api/motivation/calculators — create new calculator/template
router.post('/calculators', async (req, res) => {
  try {
    const db = await getDb();
    await ensureMotivationSchema(db);
    const body = req.body || {};

    const fixedCfg = { ...buildDefaultFixedConfig(), ...(body.fixed_config || {}) };
    const requireMorning = body.require_morning_report !== false;

    if (fixedCfg.verification_mode === 'time' && !body.morning_report_template_id) {
      return res.status(400).json({
        success: false,
        code: 'MORNING_REPORT_REQUIRED',
        error:
          'Для привязки расчета ко времени работы необходимо выбрать утренний отчет («План на день»). Создайте утренний шаблон или переключите проверку на числовые нормы.'
      });
    }

    const id = body.id || generateId('mcalc');
    const companyId = String(body.company_id || 'flagship-main');
    const directorId = body.director_id ? String(body.director_id) : '91827364501';
    const empIds = Array.isArray(body.target_employee_ids) ? body.target_employee_ids.map(String) : [];
    const positions = Array.isArray(body.target_positions) ? body.target_positions.map(String) : [];
    const deptIds = Array.isArray(body.target_department_ids) ? body.target_department_ids.map(String) : [];

    await db.run(
      `
      INSERT INTO motivation_calculators (
        id, company_id, director_id, title, description,
        target_scope, target_department_ids, target_positions, target_employee_ids,
        is_template, morning_report_template_id, evening_report_template_id,
        require_morning_report, schedule_link_mode, fixed_config, kpi_rules,
        is_archived, created_by, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, CURRENT_TIMESTAMP)
      `,
      [
        id,
        companyId,
        directorId,
        String(body.title || 'Новый калькулятор мотивации').trim(),
        String(body.description || ''),
        String(body.target_scope || 'employees'),
        JSON.stringify(deptIds),
        JSON.stringify(positions),
        JSON.stringify(empIds),
        body.is_template === false ? 0 : 1,
        body.morning_report_template_id || null,
        body.evening_report_template_id || null,
        requireMorning ? 1 : 0,
        String(body.schedule_link_mode || 'employee_schedule'),
        JSON.stringify(fixedCfg),
        JSON.stringify(Array.isArray(body.kpi_rules) ? body.kpi_rules : []),
        body.created_by ? String(body.created_by) : directorId
      ]
    );

    await syncAssignments(db, id, companyId, empIds, positions, deptIds);

    const created = await db.get(`SELECT * FROM motivation_calculators WHERE id = ?`, [id]);
    res.json({ success: true, calculator: normalizeCalculatorRow(created) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Ошибка сохранения калькулятора' });
  }
});

// PUT /api/motivation/calculators/:id — update calculator/template
router.put('/calculators/:id', async (req, res) => {
  try {
    const db = await getDb();
    await ensureMotivationSchema(db);
    const { id } = req.params;
    const body = req.body || {};

    const existing = await db.get(`SELECT * FROM motivation_calculators WHERE id = ?`, [id]);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Калькулятор не найден' });
    }

    const fixedCfg = {
      ...buildDefaultFixedConfig(),
      ...safeJsonParse(existing.fixed_config, {}),
      ...(body.fixed_config || {})
    };
    const morningTpl =
      body.morning_report_template_id !== undefined
        ? body.morning_report_template_id
        : existing.morning_report_template_id;

    if (fixedCfg.verification_mode === 'time' && !morningTpl) {
      return res.status(400).json({
        success: false,
        code: 'MORNING_REPORT_REQUIRED',
        error:
          'Для привязки ко времени работы выберите утренний отчет («План на день») или создайте его предварительно.'
      });
    }

    const empIds = Array.isArray(body.target_employee_ids)
      ? body.target_employee_ids.map(String)
      : safeJsonParse<string[]>(existing.target_employee_ids, []);
    const positions = Array.isArray(body.target_positions)
      ? body.target_positions.map(String)
      : safeJsonParse<string[]>(existing.target_positions, []);
    const deptIds = Array.isArray(body.target_department_ids)
      ? body.target_department_ids.map(String)
      : safeJsonParse<string[]>(existing.target_department_ids, []);

    await db.run(
      `
      UPDATE motivation_calculators SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        target_scope = COALESCE(?, target_scope),
        target_department_ids = ?,
        target_positions = ?,
        target_employee_ids = ?,
        is_template = COALESCE(?, is_template),
        morning_report_template_id = ?,
        evening_report_template_id = COALESCE(?, evening_report_template_id),
        require_morning_report = COALESCE(?, require_morning_report),
        schedule_link_mode = COALESCE(?, schedule_link_mode),
        fixed_config = ?,
        kpi_rules = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [
        body.title ?? null,
        body.description ?? null,
        body.target_scope ?? null,
        JSON.stringify(deptIds),
        JSON.stringify(positions),
        JSON.stringify(empIds),
        body.is_template !== undefined ? (body.is_template ? 1 : 0) : null,
        morningTpl || null,
        body.evening_report_template_id ?? null,
        body.require_morning_report !== undefined ? (body.require_morning_report ? 1 : 0) : null,
        body.schedule_link_mode ?? null,
        JSON.stringify(fixedCfg),
        JSON.stringify(Array.isArray(body.kpi_rules) ? body.kpi_rules : safeJsonParse(existing.kpi_rules, [])),
        id
      ]
    );

    await syncAssignments(db, id, String(existing.company_id), empIds, positions, deptIds);

    const updated = await db.get(`SELECT * FROM motivation_calculators WHERE id = ?`, [id]);
    res.json({ success: true, calculator: normalizeCalculatorRow(updated) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Ошибка обновления калькулятора' });
  }
});

// POST /api/motivation/calculators/:id/apply — apply existing template to additional employees/positions
router.post('/calculators/:id/apply', async (req, res) => {
  try {
    const db = await getDb();
    await ensureMotivationSchema(db);
    const { id } = req.params;
    const { employeeIds = [], positions = [], departmentIds = [] } = req.body || {};

    const existing = await db.get(`SELECT * FROM motivation_calculators WHERE id = ?`, [id]);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Шаблон калькулятора не найден' });
    }

    const nextEmployees = Array.from(new Set([...safeJsonParse<string[]>(existing.target_employee_ids, []), ...employeeIds.map(String)]));
    const nextPositions = Array.from(new Set([...safeJsonParse<string[]>(existing.target_positions, []), ...positions.map(String)]));
    const nextDepts = Array.from(new Set([...safeJsonParse<string[]>(existing.target_department_ids, []), ...departmentIds.map(String)]));

    await db.run(
      `UPDATE motivation_calculators SET target_employee_ids = ?, target_positions = ?, target_department_ids = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [JSON.stringify(nextEmployees), JSON.stringify(nextPositions), JSON.stringify(nextDepts), id]
    );

    await syncAssignments(db, id, String(existing.company_id), nextEmployees, nextPositions, nextDepts);

    const updated = await db.get(`SELECT * FROM motivation_calculators WHERE id = ?`, [id]);
    res.json({ success: true, calculator: normalizeCalculatorRow(updated) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Ошибка применения шаблона' });
  }
});

// GET /api/motivation/calculators/:id/dependencies — cascade inspection before deletion
router.get('/calculators/:id/dependencies', async (req, res) => {
  try {
    const db = await getDb();
    await ensureMotivationSchema(db);
    const { id } = req.params;

    const calc = await db.get(`SELECT * FROM motivation_calculators WHERE id = ?`, [id]);
    if (!calc) {
      return res.status(404).json({ success: false, error: 'Калькулятор не найден' });
    }

    const normalized = normalizeCalculatorRow(calc);
    const assignments = await db.all(`SELECT * FROM motivation_assignments WHERE calculator_id = ? AND is_active = 1`, [id]).catch(() => []);
    const accrualStat = await db
      .get(`SELECT COUNT(*) as cnt, COALESCE(SUM(total_earned_rub), 0) as total_rub FROM motivation_accruals WHERE calculator_id = ?`, [id])
      .catch(() => ({ cnt: 0, total_rub: 0 }));

    res.json({
      success: true,
      calculatorId: id,
      title: normalized.title,
      activeEmployeesCount: normalized.target_employee_ids.length,
      activePositionsCount: normalized.target_positions.length,
      activeDepartmentsCount: normalized.target_department_ids.length,
      activeAssignmentsCount: (assignments || []).length,
      accrualsCount: Number(accrualStat?.cnt || 0),
      accrualsTotalRub: Math.round(Number(accrualStat?.total_rub || 0) * 100) / 100
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Ошибка проверки зависимостей' });
  }
});

// DELETE /api/motivation/calculators/:id — cascade delete with 3 safe modes: archive | reassign | cascade_full
router.delete('/calculators/:id', async (req, res) => {
  try {
    const db = await getDb();
    await ensureMotivationSchema(db);
    const { id } = req.params;
    const mode = String(req.body?.mode || req.query.mode || 'archive'); // archive | reassign | cascade_full
    const replacementId = String(req.body?.replacementCalculatorId || req.query.replacementCalculatorId || '');
    const deleteAccruals = req.body?.deleteAccruals === true || req.query.deleteAccruals === '1';

    const existing = await db.get(`SELECT * FROM motivation_calculators WHERE id = ?`, [id]);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Калькулятор не найден' });
    }

    const normalized = normalizeCalculatorRow(existing);

    if (mode === 'reassign') {
      if (!replacementId || replacementId === id) {
        return res.status(400).json({ success: false, error: 'Выберите другой шаблон калькулятора для переноса сотрудников' });
      }
      const target = await db.get(`SELECT * FROM motivation_calculators WHERE id = ? AND COALESCE(is_archived, 0) = 0`, [replacementId]);
      if (!target) {
        return res.status(404).json({ success: false, error: 'Замещающий калькулятор не найден' });
      }
      const targetNorm = normalizeCalculatorRow(target);
      const mergedEmps = Array.from(new Set([...targetNorm.target_employee_ids, ...normalized.target_employee_ids]));
      const mergedPos = Array.from(new Set([...targetNorm.target_positions, ...normalized.target_positions]));
      const mergedDepts = Array.from(new Set([...targetNorm.target_department_ids, ...normalized.target_department_ids]));

      await db.run(
        `UPDATE motivation_calculators SET target_employee_ids = ?, target_positions = ?, target_department_ids = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [JSON.stringify(mergedEmps), JSON.stringify(mergedPos), JSON.stringify(mergedDepts), replacementId]
      );
      await syncAssignments(db, replacementId, String(target.company_id), mergedEmps, mergedPos, mergedDepts);
      await db.run(`UPDATE motivation_assignments SET is_active = 0, unassigned_at = CURRENT_TIMESTAMP WHERE calculator_id = ?`, [id]);
      await db.run(`DELETE FROM motivation_calculators WHERE id = ?`, [id]);

      return res.json({
        success: true,
        mode: 'reassign',
        message: `Сотрудники переведены на «${targetNorm.title}», старый калькулятор удален. История расчетов сохранена.`
      });
    }

    if (mode === 'cascade_full') {
      await db.run(`DELETE FROM motivation_assignments WHERE calculator_id = ?`, [id]);
      if (deleteAccruals) {
        await db.run(`DELETE FROM motivation_accruals WHERE calculator_id = ?`, [id]);
      }
      await db.run(`DELETE FROM motivation_calculators WHERE id = ?`, [id]);
      return res.json({
        success: true,
        mode: 'cascade_full',
        message: deleteAccruals
          ? 'Калькулятор, все привязки и связанные начисления каскадно удалены.'
          : 'Калькулятор и его привязки удалены. Прошлые начисления сохранены со снапшотом правил.'
      });
    }

    // Default: archive (soft delete preserving full historical snapshots)
    await db.run(`UPDATE motivation_assignments SET is_active = 0, unassigned_at = CURRENT_TIMESTAMP WHERE calculator_id = ?`, [id]);
    await db.run(
      `UPDATE motivation_calculators SET is_archived = 1, target_employee_ids = '[]', target_positions = '[]', target_department_ids = '[]', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    );

    res.json({
      success: true,
      mode: 'archive',
      message: 'Калькулятор отправлен в архив и отвязан от сотрудников. История расчетов сохранена.'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Ошибка удаления калькулятора' });
  }
});

// POST /api/motivation/preview — interactive simulator preview inside editor
router.post('/preview', async (req, res) => {
  try {
    const db = await getDb();
    await ensureMotivationSchema(db);
    const {
      calculator,
      employeeId = 'preview-emp',
      employeeName = 'Тестовый сотрудник',
      workedHours = 8,
      answers = {},
      dateStr = new Date().toISOString().slice(0, 10),
      hasMorningReport = true
    } = req.body || {};

    if (!calculator) {
      return res.status(400).json({ success: false, error: 'Не передана конфигурация калькулятора' });
    }

    const fakeMorning = hasMorningReport
      ? { id: 'preview-morning', type: 'PLAN_DAY', timestamp: `${dateStr}T09:00:00.000Z`, answers }
      : null;
    const fakeEvening = {
      id: 'preview-evening',
      type: 'FACT_DAY',
      timestamp: `${dateStr}T18:00:00.000Z`,
      answers
    };

    const result = await calculateMotivationForReport(db, {
      calculator: {
        ...calculator,
        fixed_config: { ...buildDefaultFixedConfig(), ...(calculator.fixed_config || {}) },
        kpi_rules: Array.isArray(calculator.kpi_rules) ? calculator.kpi_rules : []
      },
      employeeId: String(employeeId),
      employeeName: String(employeeName),
      eveningReport: fakeEvening,
      morningReport: fakeMorning,
      dateStrOverride: dateStr,
      overrideWorkedHours: Number(workedHours),
      overrideAnswers: answers
    });

    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Ошибка симуляции расчета' });
  }
});

// GET /api/motivation/history — calculation history across current and past periods
router.get('/history', async (req, res) => {
  try {
    const db = await getDb();
    await ensureMotivationSchema(db);
    const companyId = String(req.query.company_id || req.query.companyId || '');
    const directorId = String(req.query.director_id || req.query.directorId || '');
    const employeeId = req.query.employeeId ? String(req.query.employeeId) : '';
    const periodMonth = req.query.period ? String(req.query.period) : '';

    const aliases = buildCompanyAliases(companyId, directorId);
    const conditions: string[] = [];
    const params: any[] = [];

    if (aliases.length > 0) {
      const ph = aliases.map(() => '?').join(',');
      conditions.push(`(company_id IN (${ph}) OR director_id IN (${ph}))`);
      params.push(...aliases, ...aliases);
    }
    if (employeeId && employeeId !== 'all') {
      conditions.push(`employee_id = ?`);
      params.push(employeeId);
    }
    if (periodMonth && periodMonth !== 'all') {
      conditions.push(`period_month = ?`);
      params.push(periodMonth);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await db.all(
      `SELECT * FROM motivation_accruals ${whereClause} ORDER BY accrual_date DESC, updated_at DESC LIMIT 500`,
      params
    );

    const periodsRows = await db
      .all(
        `SELECT DISTINCT period_month FROM motivation_accruals ${
          aliases.length > 0 ? `WHERE (company_id IN (${aliases.map(() => '?').join(',')}) OR director_id IN (${aliases.map(() => '?').join(',')}))` : ''
        } ORDER BY period_month DESC`,
        aliases.length > 0 ? [...aliases, ...aliases] : []
      )
      .catch(() => []);

    const items = (rows || []).map((r: any) => ({
      ...r,
      kpi_breakdown: safeJsonParse(r.kpi_breakdown_json, []),
      calculator_snapshot: safeJsonParse(r.calculator_snapshot_json, null)
    }));

    const summary = items.reduce(
      (acc: any, it: any) => {
        acc.totalRub += Number(it.total_earned_rub || 0);
        acc.fixedRub += Number(it.fixed_base_rub || 0);
        acc.overtimeRub += Number(it.overtime_bonus_rub || 0);
        acc.penaltyRub += Number(it.undertime_penalty_rub || 0);
        acc.kpiRub += Number(it.kpi_total_rub || 0);
        return acc;
      },
      { totalRub: 0, fixedRub: 0, overtimeRub: 0, penaltyRub: 0, kpiRub: 0, count: items.length }
    );

    res.json({
      success: true,
      items,
      periods: (periodsRows || []).map((p: any) => p.period_month).filter(Boolean),
      summary: {
        totalRub: Math.round(summary.totalRub * 100) / 100,
        fixedRub: Math.round(summary.fixedRub * 100) / 100,
        overtimeRub: Math.round(summary.overtimeRub * 100) / 100,
        penaltyRub: Math.round(summary.penaltyRub * 100) / 100,
        kpiRub: Math.round(summary.kpiRub * 100) / 100,
        count: summary.count
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Ошибка загрузки истории начислений' });
  }
});

// POST /api/motivation/ai-parse — Voice/Text AI builder + missing fields checker
router.post('/ai-parse', async (req, res) => {
  try {
    const db = await getDb();
    await ensureMotivationSchema(db);
    const { prompt, companyId, company_id, directorId, director_id, userId } = req.body || {};

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ success: false, error: 'Опишите условия мотивации текстом или голосом' });
    }

    const result = await parseMotivationWithAi(db, {
      prompt: prompt.trim(),
      companyId: companyId || company_id || 'flagship-main',
      directorId: directorId || director_id || '91827364501',
      userId: userId || '91827364501'
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Ошибка разбора мотивации ИИ' });
  }
});

// POST /api/motivation/fix-missing-fields — auto-create missing morning template or append numeric fields to report templates
router.post('/fix-missing-fields', async (req, res) => {
  try {
    const db = await getDb();
    const {
      company_id = 'flagship-main',
      director_id = '91827364501',
      createMorningTemplate = false,
      addFields = [] // [{ templateId, label, hint }]
    } = req.body || {};

    let createdMorningTemplate: any = null;
    const updatedTemplates: any[] = [];
    const createdFieldMap: Array<{ label: string; fieldId: string; templateId: string }> = [];

    if (createMorningTemplate) {
      const mId = generateId('tpl');
      const morningFields = [
        {
          id: 'fld_morning_plan',
          label: 'Главные задачи и планы на смену',
          type: 'text_paragraph',
          required: true,
          hint: 'Какие цели и показатели вы планируете выполнить за текущую смену?'
        },
        {
          id: 'fld_morning_target_num',
          label: 'Плановое числовое значение на смену',
          type: 'number',
          required: false,
          hint: 'Например, количество встреч или продаж по плану'
        }
      ];
      await db.run(
        `
        INSERT INTO report_templates (
          id, company_id, director_id, title, description, type, fields,
          schedule_mode, deadline_time, is_active, created_at
        )
        VALUES (?, ?, ?, 'Утренний рапорт (План на смену)', 'Фиксирует время начала смены и план на день для калькулятора мотивации', 'PLAN_DAY', ?, 'work_schedule', '09:30', 1, CURRENT_TIMESTAMP)
        `,
        [mId, String(company_id), String(director_id), JSON.stringify(morningFields)]
      );
      createdMorningTemplate = { id: mId, title: 'Утренний рапорт (План на смену)', type: 'PLAN_DAY', fields: morningFields };
    }

    // Group addFields by templateId
    const byTpl = new Map<string, Array<{ label: string; hint?: string }>>();
    for (const item of Array.isArray(addFields) ? addFields : []) {
      if (!item?.templateId || !item?.label) continue;
      const list = byTpl.get(String(item.templateId)) || [];
      list.push({ label: String(item.label), hint: item.hint ? String(item.hint) : undefined });
      byTpl.set(String(item.templateId), list);
    }

    for (const [tplId, fieldsToAdd] of byTpl.entries()) {
      const tpl = await db.get(`SELECT * FROM report_templates WHERE id = ? LIMIT 1`, [tplId]);
      if (!tpl) continue;
      const existingFields = safeJsonParse<any[]>(tpl.fields, []);

      for (const nf of fieldsToAdd) {
        const already = existingFields.find(
          (f: any) => f.type === 'number' && String(f.label || '').toLowerCase() === nf.label.toLowerCase()
        );
        if (already) {
          createdFieldMap.push({ label: nf.label, fieldId: already.id, templateId: tplId });
          continue;
        }
        const newFieldId = `fld_num_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
        existingFields.push({
          id: newFieldId,
          label: nf.label,
          type: 'number',
          required: true,
          hint: nf.hint || 'Числовое значение для расчета KPI'
        });
        createdFieldMap.push({ label: nf.label, fieldId: newFieldId, templateId: tplId });
      }

      await db.run(`UPDATE report_templates SET fields = ? WHERE id = ?`, [JSON.stringify(existingFields), tplId]);
      updatedTemplates.push({ id: tplId, title: tpl.title, fields: existingFields });
    }

    res.json({
      success: true,
      createdMorningTemplate,
      updatedTemplates,
      createdFieldMap
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Ошибка добавления недостающих полей' });
  }
});

export default router;
