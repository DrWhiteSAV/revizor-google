import express from "express";
import { getDb } from "../../src/db/initDb";
import { callProTalkAi } from "../protalk";

const router = express.Router();

// Russian Public Holidays helper (Month is 1-indexed: 1 = Jan, 12 = Dec)
export function isRuPublicHoliday(year: number, month: number, day: number): boolean {
  if (month === 1 && day >= 1 && day <= 8) return true; // New Year & Christmas
  if (month === 2 && day === 23) return true; // Defender of the Fatherland Day
  if (month === 3 && day === 8) return true; // International Women's Day
  if (month === 5 && (day === 1 || day === 9)) return true; // Spring and Labor Day / Victory Day
  if (month === 6 && day === 12) return true; // Russia Day
  if (month === 11 && day === 4) return true; // Unity Day
  return false;
}

// Calculate Net Work Hours (deducting lunch)
export function calcDailyWorkHours(
  workStart?: string,
  workEnd?: string,
  lunchStart?: string,
  lunchEnd?: string,
  shiftType: string = 'day'
): number {
  if (['weekend', 'vacation', 'sick', 'dayoff', 'trip'].includes(shiftType)) return 0;
  if (!workStart || !workEnd) return 8;

  if (shiftType === 'daily') {
    return 22; // 24h minus two 1-hour meals
  }

  const [wStartH, wStartM] = (workStart || '09:00').split(':').map(Number);
  const [wEndH, wEndM] = (workEnd || '18:00').split(':').map(Number);

  let totalMinutes = (wEndH * 60 + wEndM) - (wStartH * 60 + wStartM);
  if (totalMinutes <= 0 || shiftType === 'night') {
    // Overnight / cross midnight shift (e.g. 21:00 to 07:00 next day)
    totalMinutes = (24 * 60 - (wStartH * 60 + wStartM)) + (wEndH * 60 + wEndM);
  }

  if (lunchStart && lunchEnd && lunchStart !== lunchEnd) {
    const [lStartH, lStartM] = lunchStart.split(':').map(Number);
    const [lEndH, lEndM] = lunchEnd.split(':').map(Number);
    let lunchMinutes = (lEndH * 60 + lEndM) - (lStartH * 60 + lStartM);
    if (lunchMinutes < 0) lunchMinutes += 24 * 60;
    if (lunchMinutes > 0 && lunchMinutes < totalMinutes) {
      totalMinutes -= lunchMinutes;
    }
  } else {
    totalMinutes -= 60; // Standard 1h lunch deduction
  }

  return Math.max(0, Math.round((totalMinutes / 60) * 10) / 10);
}

// Helper to compute a shift on any given date dynamically based on pattern or template
export function computeDynamicShiftForDate({
  employeeId,
  companyId = 'flagship-main',
  dateStr,
  patternType = '5/2',
  shiftConfig = {},
  selectedDays = null,
  cycleStartDate = '2026-01-01',
  calendarOverrides = {}
}: {
  employeeId: string;
  companyId?: string;
  dateStr: string;
  patternType?: string;
  shiftConfig?: any;
  selectedDays?: number[] | null;
  cycleStartDate?: string;
  calendarOverrides?: Record<string, any>;
}) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dow = dateObj.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
  const isHoliday = isRuPublicHoliday(y, m, d) ? 1 : 0;
  const todayStr = new Date().toISOString().slice(0, 10);
  const isLocked = dateStr < todayStr ? 1 : 0;

  // 1. Check if explicit override exists in calendarOverrides
  if (calendarOverrides && calendarOverrides[dateStr]) {
    const ov = calendarOverrides[dateStr];
    const sType = ov.shift_type || ov.type || 'day';
    const isNonWorking = ['weekend', 'vacation', 'sick', 'trip', 'dayoff'].includes(sType);
    const workStart = isNonWorking ? '' : (ov.work_start || ov.workStart || shiftConfig.work_start || '09:00');
    const workEnd = isNonWorking ? '' : (ov.work_end || ov.workEnd || shiftConfig.work_end || '18:00');
    const lunchStart = isNonWorking ? '' : (ov.lunch_start || ov.lunchStart || shiftConfig.lunch_start || '13:00');
    const lunchEnd = isNonWorking ? '' : (ov.lunch_end || ov.lunchEnd || shiftConfig.lunch_end || '14:00');
    const lunch2Start = sType === 'daily' ? (ov.lunch2_start || ov.lunch2Start || shiftConfig.lunch2_start || '20:00') : null;
    const lunch2End = sType === 'daily' ? (ov.lunch2_end || ov.lunch2End || shiftConfig.lunch2_end || '21:00') : null;

    let hoursText = ov.hours_text || ov.hours;
    if (!hoursText || isNonWorking || sType === 'holiday' || sType === 'night' || sType === 'daily') {
      if (sType === 'weekend') hoursText = 'Выходной';
      else if (sType === 'vacation') hoursText = 'Отпуск';
      else if (sType === 'sick') hoursText = 'Больничный';
      else if (sType === 'trip') hoursText = 'Командировка';
      else if (sType === 'dayoff') hoursText = 'Отгул';
      else if (sType === 'holiday') hoursText = `${workStart} - ${workEnd} (Праздник x2)`;
      else if (sType === 'night') hoursText = `${workStart} - ${workEnd} (ночная 🌙, +1 день)`;
      else if (sType === 'daily') hoursText = `${workStart} - ${workEnd} (суточная 24ч)`;
      else hoursText = `${workStart} - ${workEnd} (обед ${lunchStart}-${lunchEnd})`;
    }

    const workHours = ov.work_hours !== undefined ? Number(ov.work_hours) : calcDailyWorkHours(workStart, workEnd, lunchStart, lunchEnd, sType);

    return {
      id: `${employeeId}_${dateStr}`,
      employee_id: employeeId,
      company_id: companyId,
      shift_date: dateStr,
      year: y,
      month: m,
      day: d,
      day_of_week: dow,
      type: sType,
      shift_type: sType,
      hours: hoursText,
      hours_text: hoursText,
      work_hours: workHours,
      workHours: workHours,
      work_start: workStart,
      workStart: workStart,
      work_end: workEnd,
      workEnd: workEnd,
      lunch_start: lunchStart,
      lunchStart: lunchStart,
      lunch_end: lunchEnd,
      lunchEnd: lunchEnd,
      lunch2_start: lunch2Start,
      lunch2Start: lunch2Start,
      lunch2_end: lunch2End,
      lunch2End: lunch2End,
      is_holiday: isHoliday,
      isHoliday: Boolean(isHoliday),
      is_override: 1,
      is_locked: isLocked,
      isLocked: Boolean(isLocked),
      note: ov.note || null
    };
  }

  // 2. Derive working status based on cycle / pattern
  let isWorkingDay = true;
  const shiftCategory = shiftConfig.shift_category || (patternType === '1/3' ? 'daily' : (shiftConfig.work_start > shiftConfig.work_end ? 'night' : 'day'));

  if (selectedDays && Array.isArray(selectedDays) && selectedDays.length > 0) {
    isWorkingDay = selectedDays.includes(dow);
  } else if (patternType === '2/2') {
    const startMs = new Date(cycleStartDate || '2026-01-01').getTime();
    const curMs = dateObj.getTime();
    const diffDays = Math.floor((curMs - startMs) / (1000 * 60 * 60 * 24));
    const normalizedDays = ((diffDays % 4) + 4) % 4;
    isWorkingDay = (normalizedDays === 0 || normalizedDays === 1);
  } else if (patternType === '3/3') {
    const startMs = new Date(cycleStartDate || '2026-01-01').getTime();
    const curMs = dateObj.getTime();
    const diffDays = Math.floor((curMs - startMs) / (1000 * 60 * 60 * 24));
    const normalizedDays = ((diffDays % 6) + 6) % 6;
    isWorkingDay = (normalizedDays < 3);
  } else if (patternType === '1/3') {
    const startMs = new Date(cycleStartDate || '2026-01-01').getTime();
    const curMs = dateObj.getTime();
    const diffDays = Math.floor((curMs - startMs) / (1000 * 60 * 60 * 24));
    const normalizedDays = ((diffDays % 4) + 4) % 4;
    isWorkingDay = (normalizedDays === 0);
  } else if (patternType === '6/1') {
    isWorkingDay = (dow !== 0);
  } else {
    // 5/2 standard: Mon-Fri working, Sat-Sun off
    isWorkingDay = (dow !== 0 && dow !== 6);
  }

  let shiftType = 'day';
  if (!isWorkingDay) {
    shiftType = 'weekend';
  } else if (isHoliday) {
    shiftType = 'holiday';
  } else if (shiftCategory === 'night' || patternType === 'night') {
    shiftType = 'night';
  } else if (shiftCategory === 'daily' || patternType === '1/3') {
    shiftType = 'daily';
  } else {
    shiftType = 'day';
  }

  const isNonWorking = ['weekend', 'vacation', 'sick', 'dayoff'].includes(shiftType);
  const workStart = isNonWorking ? '' : (shiftConfig.work_start || (shiftType === 'night' ? '21:00' : shiftType === 'daily' ? '08:30' : '09:00'));
  const workEnd = isNonWorking ? '' : (shiftConfig.work_end || (shiftType === 'night' ? '07:00' : shiftType === 'daily' ? '08:30' : '18:00'));
  const lunchStart = isNonWorking ? '' : (shiftConfig.lunch_start || '13:00');
  const lunchEnd = isNonWorking ? '' : (shiftConfig.lunch_end || '14:00');
  const lunch2Start = shiftType === 'daily' ? (shiftConfig.lunch2_start || '20:00') : null;
  const lunch2End = shiftType === 'daily' ? (shiftConfig.lunch2_end || '21:00') : null;

  let hoursText = '';
  if (shiftType === 'holiday') {
    hoursText = `${workStart} - ${workEnd} (Праздник x2)`;
  } else if (isNonWorking) {
    hoursText = 'Выходной';
  } else if (shiftType === 'night') {
    hoursText = `${workStart} - ${workEnd} (ночная 🌙, +1 день)`;
  } else if (shiftType === 'daily') {
    hoursText = `${workStart} - ${workEnd} (суточная 24ч)`;
  } else {
    hoursText = `${workStart} - ${workEnd} (обед ${lunchStart}-${lunchEnd})`;
  }

  const workHours = calcDailyWorkHours(workStart, workEnd, lunchStart, lunchEnd, shiftType);

  return {
    id: `${employeeId}_${dateStr}`,
    employee_id: employeeId,
    company_id: companyId,
    shift_date: dateStr,
    year: y,
    month: m,
    day: d,
    day_of_week: dow,
    type: shiftType,
    shift_type: shiftType,
    hours: hoursText,
    hours_text: hoursText,
    work_hours: workHours,
    workHours: workHours,
    work_start: workStart,
    workStart: workStart,
    work_end: workEnd,
    workEnd: workEnd,
    lunch_start: lunchStart,
    lunchStart: lunchStart,
    lunch_end: lunchEnd,
    lunchEnd: lunchEnd,
    lunch2_start: lunch2Start,
    lunch2Start: lunch2Start,
    lunch2_end: lunch2End,
    lunch2End: lunch2End,
    is_holiday: isHoliday,
    isHoliday: Boolean(isHoliday),
    is_override: 0,
    is_locked: isLocked,
    isLocked: Boolean(isLocked),
    note: null
  };
}

// 1. GET /api/schedules: Get schedules list with dynamic calculation and overrides
router.get("/", async (req, res) => {
  try {
    const db = await getDb();
    const now = new Date();
    const year = parseInt(req.query.year as string) || now.getFullYear();
    const month = parseInt(req.query.month as string) || (now.getMonth() + 1);
    const companyId = (req.query.company_id as string) || '';
    const directorId = (req.query.director_id as string || req.query.user_id as string) || '';
    const startDateQuery = req.query.start_date as string;
    const daysCountQuery = parseInt(req.query.days_count as string);

    // Fetch active employees scoped strictly to this company / director
    let employeesFromDb: any[] = [];
    let usersFromDb: any[] = [];

    if (companyId || directorId) {
      employeesFromDb = await db.all(
        `SELECT id, name, role, position, department_id, email, COALESCE(timezone, '+03:00') as timezone 
         FROM employees 
         WHERE (company_id = ? OR (? != '' AND company_id = ('com-' || ?)) OR director_id = ? OR id = ?) 
         ORDER BY name ASC`,
        [companyId || '', directorId || '', directorId || '', directorId || '', directorId || '']
      );

      usersFromDb = await db.all(
        `SELECT id, name, role, position, email, COALESCE(timezone, '+03:00') as timezone 
         FROM users 
         WHERE (company_id = ? OR (? != '' AND company_id = ('com-' || ?)) OR director_id = ? OR id = ?) 
         ORDER BY name ASC`,
        [companyId || '', directorId || '', directorId || '', directorId || '', directorId || '']
      );
    } else {
      employeesFromDb = await db.all(
        `SELECT id, name, role, position, department_id, email, COALESCE(timezone, '+03:00') as timezone 
         FROM employees 
         ORDER BY name ASC LIMIT 20`
      );
      usersFromDb = [];
    }

    const empMap = new Map();
    for (const u of usersFromDb) {
      empMap.set(u.id, { id: u.id, name: u.name, role: u.role, position: u.position, department_id: null, email: u.email, timezone: u.timezone });
    }
    for (const e of employeesFromDb) {
      empMap.set(e.id, e);
    }
    const employees = Array.from(empMap.values());

    const employeeIds = employees.map(e => e.id);

    // Fetch saved configurations from employee_schedules for scoped employees or company
    let savedSchedules: any[] = [];
    if (employeeIds.length > 0) {
      const placeholders = employeeIds.map(() => '?').join(',');
      savedSchedules = await db.all(
        `SELECT * FROM employee_schedules 
         WHERE user_id IN (${placeholders}) OR id IN (${placeholders}) OR company_id = ?`,
        [...employeeIds, ...employeeIds, companyId || '']
      );
    } else {
      savedSchedules = [];
    }
    const scheduleMap = new Map(savedSchedules.map(s => [s.user_id || s.id, s]));

    // Fetch custom templates for company or global defaults
    const templates = await db.all(
      `SELECT * FROM schedule_templates WHERE company_id = ? OR is_default = 1 OR company_id = 'default'`,
      [companyId || '']
    );
    const templateMap = new Map(templates.map(t => [t.id, t]));

    // Determine date range
    let targetDates: string[] = [];
    if (startDateQuery && daysCountQuery) {
      const [sy, sm, sd] = startDateQuery.split('-').map(Number);
      const bDate = new Date(sy, sm - 1, sd);
      for (let i = 0; i < daysCountQuery; i++) {
        const cur = new Date(bDate);
        cur.setDate(bDate.getDate() + i);
        const y = cur.getFullYear();
        const m = cur.getMonth() + 1;
        const d = cur.getDate();
        targetDates.push(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
      }
    } else {
      const daysInM = new Date(year, month, 0).getDate();
      for (let d = 1; d <= daysInM; d++) {
        targetDates.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
      }
    }

    const minDateStr = targetDates[0];
    const maxDateStr = targetDates[targetDates.length - 1];

    // Fetch custom overrides
    const dbOverridesList = await db.all(
      `SELECT * FROM calendar_overrides WHERE (company_id = ? OR company_id = 'flagship-main') AND date >= ? AND date <= ?`,
      [companyId, minDateStr, maxDateStr]
    );

    // Fetch persisted shifts
    const dbShifts = await db.all(
      `SELECT * FROM employee_shifts WHERE (company_id = ? OR company_id = 'flagship-main') AND shift_date >= ? AND shift_date <= ?`,
      [companyId, minDateStr, maxDateStr]
    );
    const dbShiftsLookup = new Map(dbShifts.map(s => [`${s.employee_id}_${s.shift_date}`, s]));

    const totalDays = new Date(year, month, 0).getDate();
    const todayStr = new Date().toISOString().slice(0, 10);

    const schedulesList = employees.map(emp => {
      const savedConfig = scheduleMap.get(emp.id);
      const patternType = savedConfig?.pattern_type || '5/2';
      const timezone = savedConfig?.timezone || 'UTC+3 (MSK)';
      const cycleStartDate = savedConfig?.cycle_start_date || '2026-01-01';

      let parsedShiftConfig: any = {
        work_start: '09:00',
        work_end: '18:00',
        lunch_start: '13:00',
        lunch_end: '14:00',
        shift_category: 'day'
      };

      if (savedConfig?.shift_config) {
        try {
          parsedShiftConfig = typeof savedConfig.shift_config === 'string' ? JSON.parse(savedConfig.shift_config) : savedConfig.shift_config;
        } catch (_) {}
      }

      let selectedDays: number[] | null = null;
      if (savedConfig?.template_id && templateMap.has(savedConfig.template_id)) {
        const tpl = templateMap.get(savedConfig.template_id);
        if (tpl.selected_days) {
          try {
            selectedDays = typeof tpl.selected_days === 'string' ? JSON.parse(tpl.selected_days) : tpl.selected_days;
          } catch (_) {}
        }
      } else if (parsedShiftConfig?.selected_days) {
        selectedDays = parsedShiftConfig.selected_days;
      }

      let calendarOverrides: Record<string, any> = {};
      if (savedConfig?.calendar_overrides) {
        try {
          calendarOverrides = typeof savedConfig.calendar_overrides === 'string' ? JSON.parse(savedConfig.calendar_overrides) : savedConfig.calendar_overrides;
        } catch (_) {}
      }

      // Merge overrides from table
      dbOverridesList.filter(ov => ov.employee_id === emp.id).forEach(ov => {
        calendarOverrides[ov.date] = {
          shift_type: ov.shift_type,
          type: ov.shift_type,
          hours_text: ov.hours_text,
          hours: ov.hours_text,
          work_hours: ov.work_hours,
          workHours: ov.work_hours,
          work_start: ov.work_start,
          workStart: ov.work_start,
          work_end: ov.work_end,
          workEnd: ov.work_end,
          lunch_start: ov.lunch_start,
          lunchStart: ov.lunch_start,
          lunch_end: ov.lunch_end,
          lunchEnd: ov.lunch_end,
          lunch2_start: ov.lunch2_start,
          lunch2Start: ov.lunch2_start,
          lunch2_end: ov.lunch2_end,
          lunch2End: ov.lunch2_end,
          note: ov.note
        };
      });

      const computedShifts = targetDates.map(dStr => {
        const [y, m, d] = dStr.split('-').map(Number);
        const shiftDbKey = `${emp.id}_${dStr}`;
        const existingDbShift = dbShiftsLookup.get(shiftDbKey);

        if (existingDbShift) {
          const sType = existingDbShift.shift_type || 'day';
          const isNonWorking = ['weekend', 'vacation', 'sick', 'trip', 'dayoff'].includes(sType);
          const wStart = isNonWorking ? '' : (existingDbShift.work_start || '09:00');
          const wEnd = isNonWorking ? '' : (existingDbShift.work_end || '18:00');
          const lStart = isNonWorking ? '' : (existingDbShift.lunch_start || '13:00');
          const lEnd = isNonWorking ? '' : (existingDbShift.lunch_end || '14:00');
          const l2Start = sType === 'daily' ? (existingDbShift.lunch2_start || '20:00') : undefined;
          const l2End = sType === 'daily' ? (existingDbShift.lunch2_end || '21:00') : undefined;

          let hoursText = existingDbShift.hours_text;
          if (!hoursText) {
            if (sType === 'weekend') hoursText = 'Выходной';
            else if (sType === 'vacation') hoursText = 'Отпуск';
            else if (sType === 'sick') hoursText = 'Больничный';
            else if (sType === 'trip') hoursText = 'Командировка';
            else if (sType === 'dayoff') hoursText = 'Отгул';
            else if (sType === 'holiday') hoursText = `${wStart} - ${wEnd} (Праздник x2)`;
            else if (sType === 'night') hoursText = `${wStart} - ${wEnd} (ночная 🌙, +1 день)`;
            else if (sType === 'daily') hoursText = `${wStart} - ${wEnd} (суточная 24ч)`;
            else hoursText = `${wStart} - ${wEnd} (обед ${lStart}-${lEnd})`;
          }

          const wHours = existingDbShift.work_hours !== null && existingDbShift.work_hours !== undefined 
            ? Number(existingDbShift.work_hours) 
            : calcDailyWorkHours(wStart, wEnd, lStart, lEnd, sType);

          return {
            id: existingDbShift.id || `${emp.id}_${dStr}`,
            day: d,
            month: m,
            year: y,
            shiftDate: dStr,
            shift_date: dStr,
            type: sType,
            shift_type: sType,
            hours: hoursText,
            hours_text: hoursText,
            isHoliday: Boolean(existingDbShift.is_holiday),
            is_holiday: existingDbShift.is_holiday ? 1 : 0,
            isLocked: Boolean(existingDbShift.is_locked || dStr < todayStr),
            is_locked: existingDbShift.is_locked ? 1 : (dStr < todayStr ? 1 : 0),
            workHours: wHours,
            work_hours: wHours,
            workStart: wStart,
            work_start: wStart,
            workEnd: wEnd,
            work_end: wEnd,
            lunchStart: lStart,
            lunch_start: lStart,
            lunchEnd: lEnd,
            lunch_end: lEnd,
            lunch2Start: l2Start,
            lunch2_start: l2Start,
            lunch2End: l2End,
            lunch2_end: l2End,
            note: existingDbShift.note
          };
        }

        return computeDynamicShiftForDate({
          employeeId: emp.id,
          companyId,
          dateStr: dStr,
          patternType,
          shiftConfig: parsedShiftConfig,
          selectedDays,
          cycleStartDate,
          calendarOverrides
        });
      });

      const totalHoursMonth = computedShifts.reduce((acc, sh) => acc + (Number(sh.workHours || sh.work_hours) || 0), 0);

      const shiftCfgDisplay = {
        dayHours: `${parsedShiftConfig.work_start || '09:00'} - ${parsedShiftConfig.work_end || '18:00'}`,
        lunchHours: `${parsedShiftConfig.lunch_start || '13:00'} - ${parsedShiftConfig.lunch_end || '14:00'}`,
        nightHours: '21:00 - 07:00',
        dailyHours: '08:30 - 08:30'
      };

      return {
        id: emp.id,
        employee_id: emp.id,
        name: emp.name,
        employee_name: emp.name,
        role: emp.position || emp.role || 'Специалист',
        position: emp.position || emp.role || 'Специалист',
        department_id: emp.department_id,
        timezone,
        totalHoursMonth: Math.round(totalHoursMonth * 10) / 10,
        total_hours_month: Math.round(totalHoursMonth * 10) / 10,
        patternType,
        pattern_type: patternType,
        template_id: savedConfig?.template_id || null,
        shiftConfig: shiftCfgDisplay,
        work_start: parsedShiftConfig.work_start || '09:00',
        work_end: parsedShiftConfig.work_end || '18:00',
        lunch_start: parsedShiftConfig.lunch_start || '13:00',
        lunch_end: parsedShiftConfig.lunch_end || '14:00',
        calendarOverrides,
        shifts: computedShifts
      };
    });

    res.json({ success: true, year, month, totalDays, schedules: schedulesList });
  } catch (error: any) {
    console.error("GET /api/schedules error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/schedules/company/timezone: Update and persist company & employee timezone in PostgreSQL BD ProTalk
router.post("/company/timezone", async (req, res) => {
  try {
    const db = await getDb();
    const { companyId = 'flagship-main', timezone, userId } = req.body;
    if (!timezone) {
      return res.status(400).json({ success: false, error: "timezone is required" });
    }

    // 1. Update company if table exists
    try {
      await db.run(
        `UPDATE companies SET timezone = ? WHERE id = ?`,
        [timezone, companyId]
      );
    } catch (_) {}

    // 2. Update users timezone
    if (userId) {
      await db.run(
        `UPDATE users SET timezone = ? WHERE id = ? OR company = ?`,
        [timezone, userId, companyId]
      );
    } else {
      await db.run(
        `UPDATE users SET timezone = ? WHERE company = ? OR id = '91827364501'`,
        [timezone, companyId]
      );
    }

    // 3. Update employees table
    try {
      await db.run(
        `UPDATE employees SET timezone = ? WHERE company_id = ? OR company_id = 'flagship-main'`,
        [timezone, companyId]
      );
    } catch (_) {}

    // 4. Update employee_schedules table
    try {
      await db.run(
        `UPDATE employee_schedules SET timezone = ? WHERE company_id = ? OR company_id = 'flagship-main'`,
        [timezone, companyId]
      );
    } catch (_) {}

    res.json({ success: true, timezone, message: "Часовой пояс успешно сохранен в базе данных" });
  } catch (error: any) {
    console.error("POST /api/schedules/company/timezone error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. POST /api/schedules/batch: Save 30-day individual schedule batch into DB
router.post("/batch", async (req, res) => {
  try {
    const db = await getDb();
    const {
      employee_id,
      company_id = 'flagship-main',
      pattern_type,
      timezone = 'UTC+3 (MSK)',
      shift_config,
      shifts = []
    } = req.body;

    if (!employee_id) {
      return res.status(400).json({ success: false, error: "employee_id is required" });
    }

    const scheduleId = `sched-${employee_id}`;
    const existing = await db.get(`SELECT * FROM employee_schedules WHERE id = ? OR user_id = ?`, [scheduleId, employee_id]);
    const emp = (await db.get(`SELECT * FROM employees WHERE id = ?`, [employee_id])) || (await db.get(`SELECT * FROM users WHERE id = ?`, [employee_id]));
    const name = emp?.name || existing?.name || 'Сотрудник';
    const role = emp?.position || emp?.role || existing?.role || 'Сотрудник';

    const cfgStr = typeof shift_config === 'object' ? JSON.stringify(shift_config) : (shift_config || existing?.shift_config || null);

    let currentOverrides: Record<string, any> = {};
    if (existing?.calendar_overrides) {
      try {
        currentOverrides = typeof existing.calendar_overrides === 'string' ? JSON.parse(existing.calendar_overrides) : existing.calendar_overrides;
      } catch (_) {}
    }

    let savedCount = 0;
    for (const sh of shifts) {
      const dateStr = sh.shift_date || sh.shiftDate || (sh.year && sh.month && sh.day ? `${sh.year}-${String(sh.month).padStart(2, '0')}-${String(sh.day).padStart(2, '0')}` : null);
      if (!dateStr) continue;

      const [y, m, d] = dateStr.split('-').map(Number);
      const dow = new Date(y, m - 1, d).getDay();
      const shiftType = sh.shift_type || sh.type || 'day';
      const isHoliday = isRuPublicHoliday(y, m, d) ? 1 : (sh.isHoliday || sh.is_holiday ? 1 : 0);
      const isNonWorking = ['weekend', 'vacation', 'sick', 'trip', 'dayoff'].includes(shiftType);

      const workStart = isNonWorking ? '' : (sh.work_start || sh.workStart || '09:00');
      const workEnd = isNonWorking ? '' : (sh.work_end || sh.workEnd || '18:00');
      const lunchStart = isNonWorking ? '' : (sh.lunch_start || sh.lunchStart || '13:00');
      const lunchEnd = isNonWorking ? '' : (sh.lunch_end || sh.lunchEnd || '14:00');
      const lunch2Start = shiftType === 'daily' ? (sh.lunch2_start || sh.lunch2Start || '20:00') : null;
      const lunch2End = shiftType === 'daily' ? (sh.lunch2_end || sh.lunch2End || '21:00') : null;

      let hoursText = sh.hours_text || sh.hours;
      if (!hoursText || isNonWorking || shiftType === 'holiday' || shiftType === 'night' || shiftType === 'daily' || hoursText.includes('03:00') || hoursText.includes('111') || hoursText.includes('113:00')) {
        if (shiftType === 'weekend') hoursText = 'Выходной';
        else if (shiftType === 'vacation') hoursText = 'Отпуск';
        else if (shiftType === 'sick') hoursText = 'Больничный';
        else if (shiftType === 'trip') hoursText = 'Командировка';
        else if (shiftType === 'dayoff') hoursText = 'Отгул';
        else if (shiftType === 'holiday') hoursText = `${workStart} - ${workEnd} (Праздник x2)`;
        else if (shiftType === 'night') hoursText = `${workStart} - ${workEnd} (ночная 🌙, +1 день)`;
        else if (shiftType === 'daily') hoursText = `${workStart} - ${workEnd} (суточная 24ч)`;
        else hoursText = `${workStart} - ${workEnd} (обед ${lunchStart}-${lunchEnd})`;
      }

      const workHours = calcDailyWorkHours(workStart, workEnd, lunchStart, lunchEnd, shiftType);
      const shiftId = `${employee_id}_${dateStr}`;
      const overrideId = `ovr_${employee_id}_${dateStr}`;

      currentOverrides[dateStr] = {
        shift_type: shiftType,
        type: shiftType,
        hours_text: hoursText,
        hours: hoursText,
        work_hours: workHours,
        workHours: workHours,
        work_start: workStart,
        workStart: workStart,
        work_end: workEnd,
        workEnd: workEnd,
        lunch_start: lunchStart,
        lunchStart: lunchStart,
        lunch_end: lunchEnd,
        lunchEnd: lunchEnd,
        lunch2_start: lunch2Start,
        lunch2Start: lunch2Start,
        lunch2_end: lunch2End,
        lunch2End: lunch2End,
        note: sh.note || null
      };

      await db.run(
        `INSERT INTO calendar_overrides
         (id, employee_id, company_id, date, shift_type, hours_text, work_hours, work_start, work_end, lunch_start, lunch_end, lunch2_start, lunch2_end, note, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(employee_id, date) DO UPDATE SET
           shift_type = excluded.shift_type,
           hours_text = excluded.hours_text,
           work_hours = excluded.work_hours,
           work_start = excluded.work_start,
           work_end = excluded.work_end,
           lunch_start = excluded.lunch_start,
           lunch_end = excluded.lunch_end,
           lunch2_start = excluded.lunch2_start,
           lunch2_end = excluded.lunch2_end,
           note = excluded.note,
           updated_at = CURRENT_TIMESTAMP`,
        [
          overrideId,
          employee_id,
          company_id,
          dateStr,
          shiftType,
          hoursText,
          workHours,
          workStart,
          workEnd,
          lunchStart,
          lunchEnd,
          lunch2Start,
          lunch2End,
          sh.note || null
        ]
      );

      await db.run(
        `INSERT INTO employee_shifts 
         (id, employee_id, company_id, shift_date, year, month, day, day_of_week, shift_type, hours_text, work_hours, work_start, work_end, lunch_start, lunch_end, lunch2_start, lunch2_end, is_holiday, is_override, is_locked, note, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(employee_id, shift_date) DO UPDATE SET
           shift_type = excluded.shift_type,
           hours_text = excluded.hours_text,
           work_hours = excluded.work_hours,
           work_start = excluded.work_start,
           work_end = excluded.work_end,
           lunch_start = excluded.lunch_start,
           lunch_end = excluded.lunch_end,
           lunch2_start = excluded.lunch2_start,
           lunch2_end = excluded.lunch2_end,
           is_holiday = excluded.is_holiday,
           is_override = 1,
           note = excluded.note,
           updated_at = CURRENT_TIMESTAMP`,
        [
          shiftId,
          employee_id,
          company_id,
          dateStr,
          y,
          m,
          d,
          dow,
          shiftType,
          hoursText,
          workHours,
          workStart,
          workEnd,
          lunchStart,
          lunchEnd,
          lunch2Start,
          lunch2End,
          isHoliday,
          sh.note || null
        ]
      );
      savedCount++;
    }

    await db.run(
      `INSERT INTO employee_schedules (id, user_id, company_id, name, role, timezone, pattern_type, shift_config, calendar_overrides, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(id) DO UPDATE SET
         timezone = COALESCE(excluded.timezone, employee_schedules.timezone),
         pattern_type = COALESCE(excluded.pattern_type, employee_schedules.pattern_type),
         shift_config = COALESCE(excluded.shift_config, employee_schedules.shift_config),
         calendar_overrides = excluded.calendar_overrides,
         updated_at = CURRENT_TIMESTAMP`,
      [
        scheduleId,
        employee_id,
        company_id,
        name,
        role,
        timezone || existing?.timezone || 'UTC+3 (MSK)',
        pattern_type || existing?.pattern_type || '5/2',
        cfgStr,
        JSON.stringify(currentOverrides)
      ]
    );

    res.json({ success: true, message: `Успешно сохранено ${savedCount} смен графика сотрудника в базу данных` });
  } catch (error: any) {
    console.error("POST /api/schedules/batch error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Save single shift
const handleSaveShift = async (req: express.Request, res: express.Response) => {
  try {
    const db = await getDb();
    const {
      employee_id,
      company_id = 'flagship-main',
      year,
      month,
      day,
      shift_date,
      shift_type = 'day',
      work_start,
      work_end,
      lunch_start,
      lunch_end,
      lunch2_start,
      lunch2_end,
      hours_text,
      note,
      template_name,
      template_id
    } = req.body;

    let dateStr = shift_date;
    let y = Number(year);
    let m = Number(month);
    let d = Number(day);

    if (dateStr) {
      const parts = dateStr.split('-').map(Number);
      y = parts[0];
      m = parts[1];
      d = parts[2];
    } else if (y && m && d) {
      dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    } else {
      return res.status(400).json({ success: false, error: "shift_date or year/month/day are required" });
    }

    // Notice: past-date locking restriction removed for schedule manager/admin manual corrections
    const dateObj = new Date(y, m - 1, d);
    const dayOfWeek = dateObj.getDay();
    const isHoliday = isRuPublicHoliday(y, m, d) ? 1 : 0;
    const shiftId = `${employee_id}_${dateStr}`;
    const overrideId = `ovr_${employee_id}_${dateStr}`;

    const isNonWorking = ['weekend', 'vacation', 'sick', 'dayoff', 'trip'].includes(shift_type);
    
    const actualWorkStart = isNonWorking ? '' : (work_start || (shift_type === 'night' ? '21:00' : (shift_type === 'daily' ? '08:30' : '09:00')));
    const actualWorkEnd = isNonWorking ? '' : (work_end || (shift_type === 'night' ? '07:00' : (shift_type === 'daily' ? '08:30' : '18:00')));
    const actualLunchStart = isNonWorking ? '' : (lunch_start || '13:00');
    const actualLunchEnd = isNonWorking ? '' : (lunch_end || '14:00');

    const calculatedWorkHours = calcDailyWorkHours(actualWorkStart, actualWorkEnd, actualLunchStart, actualLunchEnd, shift_type);

    let finalHoursText = hours_text;
    if (template_name && !isNonWorking) {
      finalHoursText = `${template_name} (${actualWorkStart} - ${actualWorkEnd})`;
    } else if (!finalHoursText || isNonWorking || shift_type === 'holiday' || shift_type === 'night' || shift_type === 'daily' || finalHoursText.includes('03:00') || finalHoursText.includes('111') || finalHoursText.includes('113:00')) {
      if (shift_type === 'weekend') finalHoursText = 'Выходной';
      else if (shift_type === 'vacation') finalHoursText = 'Отпуск';
      else if (shift_type === 'sick') finalHoursText = 'Больничный';
      else if (shift_type === 'trip') finalHoursText = 'Командировка';
      else if (shift_type === 'dayoff') finalHoursText = 'Отгул';
      else if (shift_type === 'holiday') finalHoursText = `${actualWorkStart} - ${actualWorkEnd} (Праздник x2)`;
      else if (shift_type === 'night') finalHoursText = `${actualWorkStart} - ${actualWorkEnd} (ночная 🌙, +1 день)`;
      else if (shift_type === 'daily') finalHoursText = `${actualWorkStart} - ${actualWorkEnd} (суточная 24ч)`;
      else finalHoursText = `${actualWorkStart} - ${actualWorkEnd} (обед ${actualLunchStart}-${actualLunchEnd})`;
    }

    await db.run(
      `INSERT INTO calendar_overrides
       (id, employee_id, company_id, date, shift_type, hours_text, work_hours, work_start, work_end, lunch_start, lunch_end, lunch2_start, lunch2_end, note, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(employee_id, date) DO UPDATE SET
         shift_type = excluded.shift_type,
         hours_text = excluded.hours_text,
         work_hours = excluded.work_hours,
         work_start = excluded.work_start,
         work_end = excluded.work_end,
         lunch_start = excluded.lunch_start,
         lunch_end = excluded.lunch_end,
         lunch2_start = excluded.lunch2_start,
         lunch2_end = excluded.lunch2_end,
         note = excluded.note,
         updated_at = CURRENT_TIMESTAMP`,
      [
        overrideId,
        employee_id,
        company_id,
        dateStr,
        shift_type,
        finalHoursText,
        calculatedWorkHours,
        actualWorkStart,
        actualWorkEnd,
        actualLunchStart,
        actualLunchEnd,
        lunch2_start || null,
        lunch2_end || null,
        note || null
      ]
    );

    await db.run(
      `INSERT INTO employee_shifts 
       (id, employee_id, company_id, shift_date, year, month, day, day_of_week, shift_type, hours_text, work_hours, work_start, work_end, lunch_start, lunch_end, lunch2_start, lunch2_end, is_holiday, is_override, is_locked, note, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(employee_id, shift_date) DO UPDATE SET
         shift_type = excluded.shift_type,
         hours_text = excluded.hours_text,
         work_hours = excluded.work_hours,
         work_start = excluded.work_start,
         work_end = excluded.work_end,
         lunch_start = excluded.lunch_start,
         lunch_end = excluded.lunch_end,
         lunch2_start = excluded.lunch2_start,
         lunch2_end = excluded.lunch2_end,
         is_holiday = excluded.is_holiday,
         is_override = 1,
         note = excluded.note,
         updated_at = CURRENT_TIMESTAMP`,
      [shiftId, employee_id, company_id, dateStr, y, m, d, dayOfWeek, shift_type, finalHoursText, calculatedWorkHours, actualWorkStart, actualWorkEnd, actualLunchStart, actualLunchEnd, lunch2_start || null, lunch2_end || null, isHoliday, note || null]
    );

    try {
      const currentSched = await db.get(`SELECT calendar_overrides FROM employee_schedules WHERE user_id = ? OR id = ?`, [employee_id, `sched-${employee_id}`]);
      let overrides: Record<string, any> = {};
      if (currentSched && currentSched.calendar_overrides) {
        try {
          overrides = typeof currentSched.calendar_overrides === 'string' ? JSON.parse(currentSched.calendar_overrides) : currentSched.calendar_overrides;
        } catch (_) {}
      }
      overrides[dateStr] = {
        shift_type,
        type: shift_type,
        hours_text: finalHoursText,
        hours: finalHoursText,
        work_hours: calculatedWorkHours,
        workHours: calculatedWorkHours,
        work_start: actualWorkStart,
        workStart: actualWorkStart,
        work_end: actualWorkEnd,
        workEnd: actualWorkEnd,
        lunch_start: actualLunchStart,
        lunchStart: actualLunchStart,
        lunch_end: actualLunchEnd,
        lunchEnd: actualLunchEnd,
        lunch2_start: lunch2_start || null,
        lunch2Start: lunch2_start || null,
        lunch2_end: lunch2_end || null,
        lunch2End: lunch2_end || null,
        template_name: isNonWorking ? null : (template_name || null),
        template_id: isNonWorking ? null : (template_id || null),
        note: note || null
      };
      await db.run(
        `UPDATE employee_schedules SET calendar_overrides = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? OR id = ?`,
        [JSON.stringify(overrides), employee_id, `sched-${employee_id}`]
      );
    } catch (_) {}

    res.json({
      success: true,
      message: `Смена за ${dateStr} успешно сохранена`,
      shift: {
        id: shiftId,
        date: dateStr,
        type: shift_type,
        hours: finalHoursText,
        workHours: calculatedWorkHours,
        workStart: actualWorkStart,
        workEnd: actualWorkEnd,
        lunchStart: actualLunchStart,
        lunchEnd: actualLunchEnd,
        template_name: isNonWorking ? null : (template_name || null),
        template_id: isNonWorking ? null : (template_id || null),
        isHoliday: Boolean(isHoliday)
      }
    });
  } catch (error: any) {
    console.error("Save shift error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

router.post("/shift", handleSaveShift);
router.put("/shift", handleSaveShift);

// 4. Apply formula pattern
router.post("/generate", async (req, res) => {
  try {
    const db = await getDb();
    const {
      employee_id,
      company_id = 'flagship-main',
      year = 2026,
      month = 8,
      pattern_type = '5/2',
      template_id = null,
      shift_category = 'day',
      selected_days = null,
      cross_midnight = 0,
      work_start,
      work_end,
      lunch_start = '13:00',
      lunch_end = '14:00',
      lunch2_start = '20:00',
      lunch2_end = '21:00',
      timezone = 'UTC+3 (MSK)',
      start_date,
      clear_overrides = false
    } = req.body;

    if (!employee_id) {
      return res.status(400).json({ success: false, error: "employee_id is required" });
    }

    const emp = await db.get(`SELECT * FROM employees WHERE id = ?`, [employee_id]);
    if (!emp) {
      return res.status(404).json({ success: false, error: "Сотрудник не найден" });
    }

    let actualWorkStart = work_start || '09:00';
    let actualWorkEnd = work_end || '18:00';
    if (!work_start || !work_end) {
      if (shift_category === 'night' || pattern_type === 'night') {
        actualWorkStart = '21:00';
        actualWorkEnd = '07:00';
      } else if (shift_category === 'daily' || pattern_type === '1/3') {
        actualWorkStart = '08:30';
        actualWorkEnd = '08:30';
      } else if (pattern_type === '2/2') {
        actualWorkStart = '09:00';
        actualWorkEnd = '21:00';
      }
    }

    let parsedDaysOfWeek: number[] | null = null;
    if (selected_days) {
      if (Array.isArray(selected_days)) {
        parsedDaysOfWeek = selected_days;
      } else if (typeof selected_days === 'string') {
        try { parsedDaysOfWeek = JSON.parse(selected_days); } catch (_) {}
      }
    }

    const shiftConfigObj = { 
      work_start: actualWorkStart, 
      work_end: actualWorkEnd, 
      lunch_start, 
      lunch_end,
      lunch2_start,
      lunch2_end,
      shift_category,
      selected_days: parsedDaysOfWeek,
      cross_midnight: cross_midnight ? 1 : (shift_category === 'night' ? 1 : 0)
    };

    const cycleStartDate = start_date || `${year}-${String(month).padStart(2, '0')}-01`;
    const scheduleId = `sched-${employee_id}`;
    const existing = await db.get(`SELECT * FROM employee_schedules WHERE id = ? OR user_id = ?`, [scheduleId, employee_id]);
    
    let overridesJson = existing?.calendar_overrides || '{}';
    if (clear_overrides) {
      overridesJson = '{}';
      try {
        await db.run(`DELETE FROM calendar_overrides WHERE employee_id = ?`, [employee_id]);
      } catch (_) {}
    }

    await db.run(
      `INSERT INTO employee_schedules
       (id, user_id, company_id, name, role, timezone, pattern_type, template_id, shift_config, cycle_start_date, calendar_overrides, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(id) DO UPDATE SET
         timezone = COALESCE(excluded.timezone, employee_schedules.timezone),
         pattern_type = excluded.pattern_type,
         template_id = excluded.template_id,
         shift_config = excluded.shift_config,
         cycle_start_date = excluded.cycle_start_date,
         calendar_overrides = excluded.calendar_overrides,
         updated_at = CURRENT_TIMESTAMP`,
      [
        scheduleId,
        employee_id,
        company_id,
        emp.name,
        emp.position || emp.role || 'Сотрудник',
        timezone,
        pattern_type,
        template_id,
        JSON.stringify(shiftConfigObj),
        cycleStartDate,
        overridesJson
      ]
    );

    res.json({ 
      success: true, 
      message: `График ${pattern_type} (${actualWorkStart}-${actualWorkEnd}, тип: ${shift_category}) успешно применен по гибридной формуле с ${cycleStartDate}` 
    });
  } catch (error: any) {
    console.error("Schedule generation error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Custom templates CRUD
router.get("/templates", async (req, res) => {
  try {
    const db = await getDb();
    const rawCompanyId = ((req.query.company_id || req.query.companyId) as string || '').trim();
    const directorId = ((req.query.director_id || req.query.directorId) as string || '').trim();
    if (!rawCompanyId && !directorId) {
      return res.json({ success: true, templates: [] });
    }
    const cleanId = rawCompanyId.replace(/^com-/, '');
    const isFlagship = !rawCompanyId ? directorId === '91827364501' : (rawCompanyId === 'flagship-main' || rawCompanyId === 'com-91827364501' || rawCompanyId === '91827364501');
    let templates: any[] = [];
    if (isFlagship) {
      templates = await db.all(
        `SELECT * FROM schedule_templates WHERE company_id IN ('flagship-main', 'com-91827364501', '91827364501') OR company_id IS NULL ORDER BY created_at DESC`
      );
    } else if (rawCompanyId) {
      const aliases = Array.from(new Set([rawCompanyId, cleanId, `com-${cleanId}`]));
      const ph = aliases.map(() => '?').join(', ');
      templates = await db.all(
        `SELECT * FROM schedule_templates WHERE company_id IN (${ph}) ORDER BY created_at DESC`,
        aliases
      );
    } else {
      const aliases = Array.from(new Set([directorId, `com-${directorId}`]));
      const ph = aliases.map(() => '?').join(', ');
      templates = await db.all(
        `SELECT * FROM schedule_templates WHERE company_id IN (${ph}) OR created_by = ? ORDER BY created_at DESC`,
        [...aliases, directorId]
      );
    }
    res.json({ success: true, templates });
  } catch (error: any) {
    console.error("GET /api/schedules/templates error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/templates", async (req, res) => {
  try {
    const db = await getDb();
    const {
      id,
      name,
      pattern_type = '5/2',
      shift_category = 'day',
      selected_days = null,
      cross_midnight = 0,
      work_start = '09:00',
      work_end = '18:00',
      lunch_start = '13:00',
      lunch_end = '14:00',
      lunch2_start = '20:00',
      lunch2_end = '21:00',
      is_default = 0,
      description = '',
      company_id = 'flagship-main'
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: "Название шаблона обязательно" });
    }

    const templateId = id || `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const selDaysStr = selected_days ? (typeof selected_days === 'string' ? selected_days : JSON.stringify(selected_days)) : null;

    if (is_default) {
      await db.run(
        `UPDATE schedule_templates SET is_default = 0 WHERE company_id = ? OR company_id = 'flagship-main'`,
        [company_id]
      );
    }

    await db.run(
      `INSERT INTO schedule_templates 
       (id, company_id, name, pattern_type, shift_category, selected_days, cross_midnight, work_start, work_end, lunch_start, lunch_end, lunch2_start, lunch2_end, is_default, description, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        templateId,
        company_id,
        name,
        pattern_type,
        shift_category,
        selDaysStr,
        cross_midnight ? 1 : 0,
        work_start,
        work_end,
        lunch_start,
        lunch_end,
        lunch2_start,
        lunch2_end,
        is_default ? 1 : 0,
        description
      ]
    );

    const saved = await db.get(`SELECT * FROM schedule_templates WHERE id = ?`, [templateId]);
    res.json({ success: true, template: saved });
  } catch (error: any) {
    console.error("POST /api/schedules/templates error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put("/templates/:id", async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const {
      name,
      pattern_type,
      shift_category,
      selected_days,
      cross_midnight,
      work_start,
      work_end,
      lunch_start,
      lunch_end,
      lunch2_start,
      lunch2_end,
      is_default,
      description,
      company_id = 'flagship-main'
    } = req.body;

    const existing = await db.get(`SELECT * FROM schedule_templates WHERE id = ?`, [id]);
    if (!existing) {
      return res.status(404).json({ success: false, error: "Шаблон не найден" });
    }

    let isDefVal = existing.is_default || 0;
    if (is_default !== undefined) {
      isDefVal = (is_default === 1 || is_default === true) ? 1 : 0;
      if (isDefVal === 1) {
        await db.run(
          `UPDATE schedule_templates SET is_default = 0 WHERE (company_id = ? OR company_id = 'flagship-main') AND id != ?`,
          [company_id, id]
        );
      }
    }

    const selDaysStr = selected_days ? (typeof selected_days === 'string' ? selected_days : JSON.stringify(selected_days)) : existing.selected_days;

    await db.run(
      `UPDATE schedule_templates SET
         name = COALESCE(?, name),
         pattern_type = COALESCE(?, pattern_type),
         shift_category = COALESCE(?, shift_category),
         selected_days = COALESCE(?, selected_days),
         cross_midnight = COALESCE(?, cross_midnight),
         work_start = COALESCE(?, work_start),
         work_end = COALESCE(?, work_end),
         lunch_start = COALESCE(?, lunch_start),
         lunch_end = COALESCE(?, lunch_end),
         lunch2_start = COALESCE(?, lunch2_start),
         lunch2_end = COALESCE(?, lunch2_end),
         is_default = ?,
         description = COALESCE(?, description),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        name,
        pattern_type,
        shift_category,
        selDaysStr,
        cross_midnight !== undefined ? (cross_midnight ? 1 : 0) : existing.cross_midnight,
        work_start,
        work_end,
        lunch_start,
        lunch_end,
        lunch2_start,
        lunch2_end,
        isDefVal,
        description,
        id
      ]
    );

    const updated = await db.get(`SELECT * FROM schedule_templates WHERE id = ?`, [id]);
    res.json({ success: true, template: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete("/templates/:id", async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    await db.run(`DELETE FROM schedule_templates WHERE id = ?`, [id]);
    res.json({ success: true, message: "Шаблон удален" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Delete/Reset schedule for employee
router.delete("/:employeeId", async (req, res) => {
  try {
    const db = await getDb();
    const { employeeId } = req.params;
    await db.run(`DELETE FROM employee_schedules WHERE user_id = ? OR id = ?`, [employeeId, `sched-${employeeId}`]);
    await db.run(`DELETE FROM calendar_overrides WHERE employee_id = ?`, [employeeId]);
    await db.run(`DELETE FROM employee_shifts WHERE employee_id = ?`, [employeeId]);
    res.json({ success: true, message: `График сотрудника ${employeeId} сброшен к стандартному` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. POST /api/schedules/ai-format: AI Voice & Text Dispatcher for Schedule Generation
router.post("/ai-format", async (req, res) => {
  try {
    const {
      prompt,
      author_id,
      user_id = '91827364501',
      employee_id = '18209345914',
      employee_name,
      company_id = 'flagship-main',
      base_date,
      custom_templates = [],
      existing_shifts_30_days = []
    } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ success: false, error: "Текст запроса для нейросети обязателен" });
    }

    const trimmedPrompt = prompt.trim();
    const db = await getDb();

    // Ensure all required columns exist in employee_schedules
    try {
      const sCols = await db.all('PRAGMA table_info("employee_schedules")');
      const sColNames = sCols.map((c: any) => c.name);
      if (!sColNames.includes('default_work_start')) await db.exec('ALTER TABLE employee_schedules ADD COLUMN default_work_start TEXT DEFAULT "09:00";');
      if (!sColNames.includes('default_work_end')) await db.exec('ALTER TABLE employee_schedules ADD COLUMN default_work_end TEXT DEFAULT "18:00";');
      if (!sColNames.includes('default_lunch_start')) await db.exec('ALTER TABLE employee_schedules ADD COLUMN default_lunch_start TEXT DEFAULT "13:00";');
      if (!sColNames.includes('default_lunch_end')) await db.exec('ALTER TABLE employee_schedules ADD COLUMN default_lunch_end TEXT DEFAULT "14:00";');
      if (!sColNames.includes('calendar_overrides')) await db.exec('ALTER TABLE employee_schedules ADD COLUMN calendar_overrides TEXT DEFAULT "{}";');
      if (!sColNames.includes('cycle_start_date')) await db.exec('ALTER TABLE employee_schedules ADD COLUMN cycle_start_date TEXT DEFAULT "2026-01-01";');
    } catch (_) {}

    // 1. Prepare base date
    const today = base_date ? new Date(base_date) : new Date();
    const baseYear = today.getFullYear();
    const baseMonth = today.getMonth(); // 0-indexed
    const baseDay = today.getDate();
    const todayIso = `${baseYear}-${String(baseMonth + 1).padStart(2, '0')}-${String(baseDay).padStart(2, '0')}`;

    // 2. Fetch existing employee schedule and shifts if available
    let existingSchedule: any = null;
    let existingOverrides: Record<string, any> = {};
    if (employee_id) {
      existingSchedule = await db.get(`SELECT * FROM employee_schedules WHERE id = ? OR user_id = ?`, [`sched-${employee_id}`, employee_id]);
      if (existingSchedule?.calendar_overrides) {
        try {
          existingOverrides = typeof existingSchedule.calendar_overrides === 'string'
            ? JSON.parse(existingSchedule.calendar_overrides)
            : existingSchedule.calendar_overrides;
        } catch (e) {
          existingOverrides = {};
        }
      }
    }

    // 3. Fetch custom shift templates from DB or request
    let allCustomTemplates = Array.isArray(custom_templates) && custom_templates.length > 0 ? custom_templates : [];
    if (allCustomTemplates.length === 0) {
      try {
        const dbTemplates = await db.all(
          `SELECT * FROM custom_shift_templates WHERE company_id = ? OR company_id = 'flagship-main' ORDER BY name ASC`,
          [company_id]
        );
        if (dbTemplates && dbTemplates.length > 0) {
          allCustomTemplates = dbTemplates.map((t: any) => ({
            id: t.id,
            name: t.name,
            workStart: t.work_start,
            workEnd: t.work_end,
            lunchStart: t.lunch_start,
            lunchEnd: t.lunch_end,
            lunch2Start: t.lunch2_start,
            lunch2End: t.lunch2_end,
            patternType: t.pattern_type,
            shiftCategory: t.shift_category
          }));
        }
      } catch (_) {}
    }

    // 4. Fetch 30-day prefilled shifts for employee
    let prefilledShifts = Array.isArray(existing_shifts_30_days) && existing_shifts_30_days.length > 0
      ? existing_shifts_30_days
      : [];

    if (prefilledShifts.length === 0 && employee_id) {
      try {
        const dbShifts = await db.all(
          `SELECT * FROM employee_shifts 
           WHERE employee_id = ? AND shift_date >= ?
           ORDER BY shift_date ASC LIMIT 30`,
          [employee_id, todayIso]
        );
        if (dbShifts && dbShifts.length > 0) {
          prefilledShifts = dbShifts.map((s: any) => ({
            dateStr: s.shift_date,
            type: s.shift_type,
            hours: s.hours_text || (s.work_start && s.work_end ? `${s.work_start} - ${s.work_end}` : s.shift_type),
            workStart: s.work_start,
            workEnd: s.work_end,
            lunchStart: s.lunch_start,
            lunchEnd: s.lunch_end,
            note: s.note
          }));
        }
      } catch (_) {}
    }

    // 5. Fetch system prompt from protalk_prompts table in PostgreSQL BD ProTalk
    const promptRow = await db.get(`SELECT * FROM protalk_prompts WHERE entity_type = 'schedule_ai'`);
    const systemPrompt = promptRow?.system_prompt || `Вы — ведущий ИИ-диспетчер и эксперт по трудовому графику, планированию рабочих смен и производственному календарю платформы «ИИ Рапорт».
Ваша задача — проанализировать запрос руководителя (текстовый или голосовой), учесть текущие заполненные данные сотрудника на ближайшие 30 дней, а также список доступных пользовательских и стандартных шаблонов компании, и сформировать точный JSON-объект параметров графика.`;

    const exampleResponse = promptRow?.example_response || JSON.stringify({
      patternType: "5/2",
      shiftCategory: "day",
      workStart: "09:00",
      workEnd: "18:00",
      lunchStart: "13:00",
      lunchEnd: "14:00",
      lunch2Start: "",
      lunch2End: "",
      selectedDays: [1, 2, 3, 4, 5],
      templateId: null,
      templateName: null,
      specificDatesOnly: false,
      specificDates: [],
      friendlyDescription: "Установлен график 5/2 (09:00 - 18:00, обед 13:00-14:00)"
    });

    const contextData: string[] = [
      `Сотрудник: ${employee_name || existingSchedule?.name || 'Сотрудник'} (ID: ${employee_id || '18209345914'})`,
      `Кто вносит изменения (Автор/Руководитель): ID ${author_id || user_id || '91827364501'}`,
      `Текущая дата: ${todayIso} (Год: ${baseYear}, Месяц: ${baseMonth + 1}, День: ${baseDay})`
    ];

    if (existingSchedule) {
      contextData.push(`Текущий установленный режим: ${existingSchedule.pattern_type || '5/2'}, рабочие часы: ${existingSchedule.default_work_start || '09:00'} - ${existingSchedule.default_work_end || '18:00'}, обед: ${existingSchedule.default_lunch_start || '13:00'} - ${existingSchedule.default_lunch_end || '14:00'}`);
    }

    if (allCustomTemplates.length > 0) {
      contextData.push(`\nДоступные пользовательские шаблоны компании:`);
      allCustomTemplates.forEach((tpl: any) => {
        contextData.push(`- "${tpl.name}" (ID: ${tpl.id}, Режим: ${tpl.patternType || '5/2'}, Часы: ${tpl.workStart || '09:00'}-${tpl.workEnd || '18:00'}, Обед: ${tpl.lunchStart || '13:00'}-${tpl.lunchEnd || '14:00'}, Категория: ${tpl.shiftCategory || 'day'})`);
      });
    }

    if (prefilledShifts.length > 0) {
      contextData.push(`\nТекущие заполненные смены сотрудника на ближайшие 30 дней:`);
      prefilledShifts.slice(0, 30).forEach((s: any) => {
        contextData.push(`- ${s.dateStr || s.shiftDate}: ${s.hours || s.type}${s.note ? ` (Заметка: ${s.note})` : ''}`);
      });
    }

    const userMessage = `Вводный запрос руководителя:\n«${trimmedPrompt}»\n\nКонтекст данных графика:\n${contextData.join('\n')}\n\nСгенерируй строго валидный JSON без markdown-обёрток, строго соответствующий схеме примера:\n${exampleResponse}`;

    // 6. Call ProTalk AI with user UID in format ii_rr<AUTHOR_ID>-<TARGET_ID>
    let parsedData: any = null;
    let aiRawReply = "";

    const effectiveAuthorId = author_id || user_id || '91827364501';
    const effectiveTargetId = employee_id || '18209345914';

    try {
      const aiRes = await callProTalkAi({
        prompt: userMessage,
        systemPrompt,
        authorId: effectiveAuthorId,
        targetId: effectiveTargetId,
        jsonOutput: true
      });

      aiRawReply = aiRes.reply || "";
      const clean = aiRawReply.replace(/```json/gi, '').replace(/```/g, '').trim();
      const firstBrace = clean.indexOf('{');
      const lastBrace = clean.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        parsedData = JSON.parse(clean.substring(firstBrace, lastBrace + 1));
      }
    } catch (aiErr: any) {
      console.warn("ProTalk AI call failed or timed out, using fallback parser:", aiErr.message);
    }

    // Check if custom template is explicitly requested in prompt
    const lower = trimmedPrompt.toLowerCase();
    const matchedCustomTpl = allCustomTemplates.find((t: any) => 
      (parsedData?.templateId && t.id === parsedData.templateId) ||
      (parsedData?.templateName && t.name.toLowerCase() === parsedData.templateName.toLowerCase()) ||
      lower.includes(t.name.toLowerCase())
    );

    // 5. Fallback Parser if AI returned empty or unparseable JSON
    if (!parsedData || (!parsedData.patternType && !parsedData.specificDates?.length)) {
      let pat: '5/2' | '2/2' | '3/3' | '1/3' | '6/1' | 'custom' = (existingSchedule?.pattern_type as any) || '5/2';
      let cat: 'day' | 'night' | 'daily' = 'day';

      if (matchedCustomTpl) {
        pat = (matchedCustomTpl.patternType || '5/2') as any;
        cat = matchedCustomTpl.shiftCategory || 'day';
      } else if (lower.includes('1/3') || lower.includes('сутки') || lower.includes('суточн') || lower.includes('один через три')) {
        pat = '1/3';
        cat = 'daily';
      } else if (lower.includes('2/2') || lower.includes('2 на 2') || lower.includes('два через два') || lower.includes('сменн')) {
        pat = '2/2';
        if (lower.includes('ноч')) cat = 'night';
      } else if (lower.includes('3/3') || lower.includes('3 на 3') || lower.includes('три через три')) {
        pat = '3/3';
        if (lower.includes('ноч')) cat = 'night';
      } else if (lower.includes('6/1') || lower.includes('шестиднев')) {
        pat = '6/1';
      } else if (lower.includes('5/2') || lower.includes('пятиднев')) {
        pat = '5/2';
      }

      let wStart = matchedCustomTpl?.workStart || existingSchedule?.default_work_start || (cat === 'daily' ? '08:30' : cat === 'night' ? '21:00' : pat === '2/2' || pat === '3/3' ? '09:00' : '09:00');
      let wEnd = matchedCustomTpl?.workEnd || existingSchedule?.default_work_end || (cat === 'daily' ? '08:30' : cat === 'night' ? '07:00' : pat === '2/2' || pat === '3/3' ? '21:00' : '18:00');
      let lStart = matchedCustomTpl?.lunchStart || existingSchedule?.default_lunch_start || '13:00';
      let lEnd = matchedCustomTpl?.lunchEnd || existingSchedule?.default_lunch_end || '14:00';

      const timeRangeMatch = lower.match(/(?:с|c)\s*(\d{1,2}(?::\d{2})?)\s*(?:до|по|-)\s*(\d{1,2}(?::\d{2})?)/);
      if (timeRangeMatch && !matchedCustomTpl) {
        const rawS = timeRangeMatch[1].includes(':') ? timeRangeMatch[1] : `${timeRangeMatch[1].padStart(2, '0')}:00`;
        const rawE = timeRangeMatch[2].includes(':') ? timeRangeMatch[2] : `${timeRangeMatch[2].padStart(2, '0')}:00`;
        wStart = rawS.padStart(5, '0');
        wEnd = rawE.padStart(5, '0');
      }

      const lunchMatch = lower.match(/обед(?:\s*(?:с|c))?\s*(\d{1,2}(?::\d{2})?)\s*(?:до|по|-)\s*(\d{1,2}(?::\d{2})?)/);
      if (lunchMatch && !matchedCustomTpl) {
        const rawLS = lunchMatch[1].includes(':') ? lunchMatch[1] : `${lunchMatch[1].padStart(2, '0')}:00`;
        const rawLE = lunchMatch[2].includes(':') ? lunchMatch[2] : `${lunchMatch[2].padStart(2, '0')}:00`;
        lStart = rawLS.padStart(5, '0');
        lEnd = rawLE.padStart(5, '0');
      }

      // Check single date mentions (e.g. "28 августа отпуск", "1 сентября командировка")
      const fallbackSpecificDates: any[] = [];
      let isSpecOnly = false;
      const monthNamesRu: Record<string, number> = {
        'январ': 1, 'феврал': 2, 'март': 3, 'апрел': 4, 'ма': 5, 'июн': 6,
        'июл': 7, 'август': 8, 'сентябр': 9, 'октябр': 10, 'ноябр': 11, 'декабр': 12
      };
      for (const [mPrefix, mNum] of Object.entries(monthNamesRu)) {
        const dateRegex = new RegExp(`(\\d{1,2})\\s*${mPrefix}[а-я]*`, 'i');
        const match = lower.match(dateRegex);
        if (match) {
          const dayVal = parseInt(match[1], 10);
          const formattedDate = `${baseYear}-${String(mNum).padStart(2, '0')}-${String(dayVal).padStart(2, '0')}`;
          let sType = 'day';
          let noteStr = 'Замена по запросу';
          if (lower.includes('отпуск')) { sType = 'vacation'; noteStr = 'Отпуск'; }
          else if (lower.includes('больничн')) { sType = 'sick'; noteStr = 'Больничный'; }
          else if (lower.includes('командировк') || lower.includes('коммандировк')) { sType = 'trip'; noteStr = 'Командировка'; }
          else if (lower.includes('отгул') || lower.includes('выходн')) { sType = 'dayoff'; noteStr = 'Отгул'; }
          else if (lower.includes('ноч')) { sType = 'night'; noteStr = 'Ночная смена'; }
          else if (lower.includes('суточ') || lower.includes('сутки')) { sType = 'daily'; noteStr = 'Суточное дежурство'; }

          const isOff = ['vacation', 'sick', 'dayoff', 'trip', 'weekend'].includes(sType);

          fallbackSpecificDates.push({
            date: formattedDate,
            type: sType,
            workStart: isOff ? '' : wStart,
            workEnd: isOff ? '' : wEnd,
            lunchStart: isOff ? '' : lStart,
            lunchEnd: isOff ? '' : lEnd,
            lunch2Start: sType === 'daily' ? '20:00' : '',
            lunch2End: sType === 'daily' ? '21:00' : '',
            note: noteStr
          });
          if (!lower.includes('5/2') && !lower.includes('2/2') && !lower.includes('3/3') && !lower.includes('1/3')) {
            isSpecOnly = true;
          }
        }
      }

      parsedData = {
        patternType: pat,
        shiftCategory: cat,
        workStart: wStart,
        workEnd: wEnd,
        lunchStart: lStart,
        lunchEnd: lEnd,
        lunch2Start: cat === 'daily' ? '20:00' : '',
        lunch2End: cat === 'daily' ? '21:00' : '',
        selectedDays: pat === '6/1' ? [1,2,3,4,5,6] : [1,2,3,4,5],
        templateId: matchedCustomTpl?.id || null,
        templateName: matchedCustomTpl?.name || null,
        specificDatesOnly: isSpecOnly,
        specificDates: fallbackSpecificDates,
        friendlyDescription: matchedCustomTpl
          ? `Применен пользовательский шаблон «${matchedCustomTpl.name}» (${wStart} - ${wEnd})`
          : isSpecOnly && fallbackSpecificDates.length > 0
          ? `Установлен статус «${fallbackSpecificDates[0].note || fallbackSpecificDates[0].type}» на ${fallbackSpecificDates[0].date}`
          : `График ${pat} (${cat === 'night' ? 'ночные смены' : cat === 'daily' ? 'суточные дежурства' : 'дневные смены'}, ${wStart} - ${wEnd}, обед ${lStart} - ${lEnd})`
      };
    } else if (matchedCustomTpl && !parsedData.specificDatesOnly) {
      parsedData.templateId = matchedCustomTpl.id;
      parsedData.templateName = matchedCustomTpl.name;
      parsedData.patternType = matchedCustomTpl.patternType || parsedData.patternType;
      parsedData.shiftCategory = matchedCustomTpl.shiftCategory || parsedData.shiftCategory;
      parsedData.workStart = matchedCustomTpl.workStart || parsedData.workStart;
      parsedData.workEnd = matchedCustomTpl.workEnd || parsedData.workEnd;
      parsedData.lunchStart = matchedCustomTpl.lunchStart || parsedData.lunchStart;
      parsedData.lunchEnd = matchedCustomTpl.lunchEnd || parsedData.lunchEnd;
      parsedData.friendlyDescription = `Применен пользовательский шаблон «${matchedCustomTpl.name}» (${parsedData.workStart} - ${parsedData.workEnd})`;
    }

    // 6. Normalize parsed data
    const isSpecificOnly = Boolean(parsedData.specificDatesOnly) || (Array.isArray(parsedData.specificDates) && parsedData.specificDates.length > 0 && !lower.includes('5/2') && !lower.includes('2/2') && !lower.includes('3/3') && !lower.includes('1/3'));
    const finalPattern = isSpecificOnly && existingSchedule?.pattern_type
      ? existingSchedule.pattern_type
      : (parsedData.patternType || '5/2');

    const finalCategory = parsedData.shiftCategory || (finalPattern === '1/3' ? 'daily' : 'day');
    const finalWStart = parsedData.workStart || existingSchedule?.default_work_start || '09:00';
    const finalWEnd = parsedData.workEnd || existingSchedule?.default_work_end || (finalPattern === '2/2' ? '21:00' : finalPattern === '1/3' ? '08:30' : '18:00');
    const finalLStart = parsedData.lunchStart || existingSchedule?.default_lunch_start || '13:00';
    const finalLEnd = parsedData.lunchEnd || existingSchedule?.default_lunch_end || '14:00';
    const finalL2Start = parsedData.lunch2Start || (finalCategory === 'daily' ? '20:00' : '');
    const finalL2End = parsedData.lunch2End || (finalCategory === 'daily' ? '21:00' : '');
    const finalSelectedDays = Array.isArray(parsedData.selectedDays) && parsedData.selectedDays.length > 0
      ? parsedData.selectedDays
      : (finalPattern === '6/1' ? [1,2,3,4,5,6] : [1,2,3,4,5]);

    // Build index of prefilled shifts for non-destructive partial updates
    const existingShiftsByDate = new Map<string, any>();
    if (Array.isArray(prefilledShifts)) {
      for (const s of prefilledShifts) {
        const dStr = s.dateStr || s.shiftDate || s.shift_date;
        if (dStr) existingShiftsByDate.set(dStr, s);
      }
    }

    // 7. Generate 30-day shift list starting from base date
    const generatedShifts: any[] = [];
    const specificDatesMap = new Map<string, any>();
    if (Array.isArray(parsedData.specificDates)) {
      for (const sd of parsedData.specificDates) {
        if (sd.date) specificDatesMap.set(sd.date, sd);
      }
    }

    for (let i = 0; i < 30; i++) {
      const d = new Date(baseYear, baseMonth, baseDay + i);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const dayNum = d.getDate();
      const dow = d.getDay(); // 0 = Sun
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

      // Check if there is a specific date replacement from AI
      if (specificDatesMap.has(dateStr)) {
        const spec = specificDatesMap.get(dateStr);
        let sType = spec.type || 'day';
        if (spec.note && (spec.note.toLowerCase().includes('командировк') || spec.note.toLowerCase().includes('коммандировк'))) {
          sType = 'trip';
        }
        const isOff = ['weekend', 'vacation', 'sick', 'dayoff', 'trip'].includes(sType);
        const hours = isOff ? 0 : calcDailyWorkHours(spec.workStart || finalWStart, spec.workEnd || finalWEnd, spec.lunchStart || finalLStart, spec.lunchEnd || finalLEnd, sType);
        generatedShifts.push({
          dateStr,
          year: y,
          month: m,
          day: dayNum,
          dow,
          type: sType,
          workStart: isOff ? '' : (spec.workStart || finalWStart),
          workEnd: isOff ? '' : (spec.workEnd || finalWEnd),
          lunchStart: isOff ? '' : (spec.lunchStart || finalLStart),
          lunchEnd: isOff ? '' : (spec.lunchEnd || finalLEnd),
          lunch2Start: sType === 'daily' ? (spec.lunch2Start || finalL2Start) : '',
          lunch2End: sType === 'daily' ? (spec.lunch2End || finalL2End) : '',
          hours,
          note: spec.note || (sType === 'trip' ? 'Командировка' : sType === 'vacation' ? 'Отпуск' : sType === 'sick' ? 'Больничный' : 'Индивидуальная замена')
        });
        continue;
      }

      // If specific date replacement only, preserve existing shift for this date
      if (isSpecificOnly && existingShiftsByDate.has(dateStr)) {
        const prev = existingShiftsByDate.get(dateStr);
        const prevType = prev.type || prev.shift_type || 'day';
        const isOff = ['weekend', 'vacation', 'sick', 'dayoff', 'trip'].includes(prevType);
        generatedShifts.push({
          dateStr,
          year: y,
          month: m,
          day: dayNum,
          dow,
          type: prevType,
          workStart: isOff ? '' : (prev.workStart || prev.work_start || ''),
          workEnd: isOff ? '' : (prev.workEnd || prev.work_end || ''),
          lunchStart: isOff ? '' : (prev.lunchStart || prev.lunch_start || ''),
          lunchEnd: isOff ? '' : (prev.lunchEnd || prev.lunch_end || ''),
          lunch2Start: prevType === 'daily' ? (prev.lunch2Start || prev.lunch2_start || '') : '',
          lunch2End: prevType === 'daily' ? (prev.lunch2End || prev.lunch2_end || '') : '',
          hours: prev.hours ?? prev.work_hours ?? (isOff ? 0 : 8),
          note: prev.note || ''
        });
        continue;
      }

      // If specific date replacement only, and we have existing override in JSON, preserve it
      if (isSpecificOnly && existingOverrides[dateStr]) {
        const prev = existingOverrides[dateStr];
        const prevType = prev.type || prev.shift_type || 'day';
        const isOff = ['weekend', 'vacation', 'sick', 'dayoff', 'trip'].includes(prevType);
        generatedShifts.push({
          dateStr,
          year: y,
          month: m,
          day: dayNum,
          dow,
          type: prevType,
          workStart: isOff ? '' : (prev.workStart || ''),
          workEnd: isOff ? '' : (prev.workEnd || ''),
          lunchStart: isOff ? '' : (prev.lunchStart || ''),
          lunchEnd: isOff ? '' : (prev.lunchEnd || ''),
          lunch2Start: prevType === 'daily' ? (prev.lunch2Start || '') : '',
          lunch2End: prevType === 'daily' ? (prev.lunch2End || '') : '',
          hours: prev.hours ?? (isOff ? 0 : 8),
          note: prev.note || ''
        });
        continue;
      }

      // Standard Pattern calculation
      let isWorkDay = false;
      let currentShiftType = finalCategory;

      if (finalPattern === '5/2') {
        isWorkDay = finalSelectedDays.includes(dow);
      } else if (finalPattern === '6/1') {
        isWorkDay = dow !== 0;
      } else if (finalPattern === '2/2') {
        isWorkDay = (i % 4 === 0 || i % 4 === 1);
      } else if (finalPattern === '3/3') {
        isWorkDay = (i % 6 === 0 || i % 6 === 1 || i % 6 === 2);
      } else if (finalPattern === '1/3') {
        isWorkDay = (i % 4 === 0);
        currentShiftType = 'daily';
      } else {
        isWorkDay = finalSelectedDays.includes(dow);
      }

      const sType = isWorkDay ? currentShiftType : 'weekend';
      const hours = isWorkDay ? calcDailyWorkHours(finalWStart, finalWEnd, finalLStart, finalLEnd, sType) : 0;

      generatedShifts.push({
        dateStr,
        year: y,
        month: m,
        day: dayNum,
        dow,
        type: sType,
        workStart: isWorkDay ? finalWStart : '',
        workEnd: isWorkDay ? finalWEnd : '',
        lunchStart: isWorkDay ? finalLStart : '',
        lunchEnd: isWorkDay ? finalLEnd : '',
        lunch2Start: sType === 'daily' ? finalL2Start : '',
        lunch2End: sType === 'daily' ? finalL2End : '',
        hours
      });
    }

    // 8. Write to PostgreSQL BD ProTalk if employee_id provided
    let updatedScheduleRow: any = null;
    if (employee_id) {
      const scheduleId = `sched-${employee_id}`;
      const emp = (await db.get(`SELECT * FROM employees WHERE id = ?`, [employee_id])) || (await db.get(`SELECT * FROM users WHERE id = ?`, [employee_id]));
      const name = emp?.name || existingSchedule?.name || employee_name || 'Сотрудник';
      const role = emp?.position || emp?.role || existingSchedule?.role || 'Сотрудник';

      const shiftConfigObj = {
        pattern_type: finalPattern,
        shift_category: finalCategory,
        work_start: finalWStart,
        work_end: finalWEnd,
        lunch_start: finalLStart,
        lunch_end: finalLEnd,
        lunch2_start: finalL2Start,
        lunch2_end: finalL2End,
        selected_days: finalSelectedDays
      };

      const overridesObj: Record<string, any> = isSpecificOnly ? { ...existingOverrides } : {};
      for (const sh of generatedShifts) {
        overridesObj[sh.dateStr] = {
          type: sh.type,
          workStart: sh.workStart,
          workEnd: sh.workEnd,
          lunchStart: sh.lunchStart,
          lunchEnd: sh.lunchEnd,
          lunch2Start: sh.lunch2Start,
          lunch2End: sh.lunch2End,
          hours: sh.hours,
          note: sh.note || ''
        };

        const hoursText = ['weekend', 'vacation', 'sick', 'dayoff', 'trip'].includes(sh.type)
          ? (sh.type === 'weekend' ? 'Выходной' : sh.type === 'vacation' ? 'Отпуск' : sh.type === 'sick' ? 'Больничный' : sh.type === 'trip' ? 'Командировка' : 'Отгул')
          : (sh.workStart && sh.workEnd ? `${sh.workStart} - ${sh.workEnd}` : '09:00 - 18:00');
        const isHol = isRuPublicHoliday(sh.year, sh.month, sh.day) ? 1 : 0;

        // Insert or update individual shift row
        await db.run(
          `INSERT INTO employee_shifts
           (id, employee_id, company_id, shift_date, year, month, day, day_of_week, shift_type, hours_text, work_hours, work_start, work_end, lunch_start, lunch_end, lunch2_start, lunch2_end, is_holiday, is_override, is_locked, note, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(employee_id, shift_date) DO UPDATE SET
             shift_type = excluded.shift_type,
             hours_text = excluded.hours_text,
             work_hours = excluded.work_hours,
             work_start = excluded.work_start,
             work_end = excluded.work_end,
             lunch_start = excluded.lunch_start,
             lunch_end = excluded.lunch_end,
             lunch2_start = excluded.lunch2_start,
             lunch2_end = excluded.lunch2_end,
             is_holiday = excluded.is_holiday,
             is_override = 1,
             note = excluded.note,
             updated_at = CURRENT_TIMESTAMP`,
          [
            `shift-${employee_id}-${sh.dateStr}`,
            employee_id,
            company_id,
            sh.dateStr,
            sh.year,
            sh.month,
            sh.day,
            sh.dow,
            sh.type,
            hoursText,
            sh.hours,
            sh.workStart,
            sh.workEnd,
            sh.lunchStart,
            sh.lunchEnd,
            sh.lunch2Start || null,
            sh.lunch2End || null,
            isHol,
            sh.note || 'ИИ-Оформление расписания'
          ]
        );
      }

      await db.run(
        `INSERT OR REPLACE INTO employee_schedules
         (id, user_id, company_id, name, role, pattern_type, timezone, default_work_start, default_work_end, default_lunch_start, default_lunch_end, shift_config, calendar_overrides, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          scheduleId,
          employee_id,
          company_id,
          name,
          role,
          finalPattern,
          existingSchedule?.timezone || 'UTC+3 (MSK)',
          finalWStart,
          finalWEnd,
          finalLStart,
          finalLEnd,
          JSON.stringify(shiftConfigObj),
          JSON.stringify(overridesObj)
        ]
      );

      updatedScheduleRow = await db.get(`SELECT * FROM employee_schedules WHERE id = ?`, [scheduleId]);
    }

    const summaryMessage = parsedData.friendlyDescription || (isSpecificOnly && parsedData.specificDates?.length
      ? `ИИ диспетчер: обновлена дата ${parsedData.specificDates[0].date} для ${employee_name || 'сотрудника'}!`
      : `ИИ диспетчер: для ${employee_name || 'сотрудника'} применен режим ${finalPattern} (${finalCategory === 'daily' ? 'сутки 24ч' : finalCategory === 'night' ? 'ночная смена' : 'дневная смена'}, ${finalWStart}-${finalWEnd})!`);

    res.json({
      success: true,
      parsedData,
      generatedShifts,
      updatedSchedule: updatedScheduleRow,
      summaryMessage,
      aiReply: aiRawReply
    });
  } catch (error: any) {
    console.error("POST /api/schedules/ai-format error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// Company Holidays & Transfers Endpoints
// ==========================================

// 1. GET /api/schedules/holidays - List holidays for company & optional year
router.get("/holidays", async (req, res) => {
  try {
    const db = await getDb();
    const companyId = req.query.company_id || 'flagship-main';
    const year = req.query.year ? parseInt(req.query.year as string, 10) : null;

    let query = `SELECT * FROM company_holidays WHERE (company_id = ? OR company_id = 'default' OR company_id = 'flagship-main')`;
    const params: any[] = [companyId];

    if (year) {
      query += ` AND (year = ? OR year = 0)`;
      params.push(year);
    }

    query += ` ORDER BY date ASC`;

    const holidays = await db.all(query, params);
    res.json({ success: true, holidays });
  } catch (error: any) {
    console.error("GET /api/schedules/holidays error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. POST /api/schedules/holidays - Add new holiday or transfer (supports single date and date range / period)
router.post("/holidays", async (req, res) => {
  try {
    const db = await getDb();
    const {
      company_id = 'flagship-main',
      name,
      date,
      start_date,
      end_date,
      holiday_type = 'custom',
      is_working = 0,
      is_active = 1,
      transfer_from = null,
      description = ''
    } = req.body;

    const effectiveStart = start_date || date;
    const effectiveEnd = end_date || date || start_date;

    if (!name || !effectiveStart) {
      return res.status(400).json({ success: false, error: 'Название и дата (или период) праздника обязательны' });
    }

    // Determine all dates in range
    const datesToInsert: string[] = [];
    const [sy, sm, sd] = effectiveStart.split('-').map(Number);
    const [ey, em, ed] = effectiveEnd.split('-').map(Number);
    const startDateObj = new Date(sy, sm - 1, sd);
    const endDateObj = new Date(ey, em - 1, ed);

    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime()) || startDateObj > endDateObj) {
      datesToInsert.push(effectiveStart);
    } else {
      const cur = new Date(startDateObj);
      while (cur <= endDateObj) {
        const curY = cur.getFullYear();
        const curM = String(cur.getMonth() + 1).padStart(2, '0');
        const curD = String(cur.getDate()).padStart(2, '0');
        datesToInsert.push(`${curY}-${curM}-${curD}`);
        cur.setDate(cur.getDate() + 1);
      }
    }

    const insertedRows: any[] = [];

    for (const curDate of datesToInsert) {
      const [y, m, d] = curDate.split('-').map(Number);
      const holId = `hol_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

      await db.run(
        `INSERT INTO company_holidays
         (id, company_id, name, date, year, month, day, holiday_type, is_working, is_active, transfer_from, description, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(company_id, date) DO UPDATE SET
           name = excluded.name,
           holiday_type = excluded.holiday_type,
           is_working = excluded.is_working,
           is_active = excluded.is_active,
           transfer_from = excluded.transfer_from,
           description = excluded.description,
           updated_at = CURRENT_TIMESTAMP`,
        [holId, company_id, name, curDate, y, m, d, holiday_type, is_working ? 1 : 0, is_active ? 1 : 0, transfer_from, description]
      );

      const row = await db.get(`SELECT * FROM company_holidays WHERE (id = ? OR (company_id = ? AND date = ?))`, [holId, company_id, curDate]);
      if (row) insertedRows.push(row);
    }

    res.json({ success: true, count: datesToInsert.length, holidays: insertedRows });
  } catch (error: any) {
    console.error("POST /api/schedules/holidays error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. PUT /api/schedules/holidays/:id - Update holiday (supports date change or period expansion)
router.put("/holidays/:id", async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const {
      company_id = 'flagship-main',
      name,
      date,
      start_date,
      end_date,
      holiday_type = 'custom',
      is_working = 0,
      is_active = 1,
      transfer_from = null,
      description = ''
    } = req.body;

    const effectiveStart = start_date || date;
    const effectiveEnd = end_date || date || start_date;

    if (start_date && end_date && start_date !== end_date) {
      // Period update: update current record, then insert any additional dates in range
      const [sy, sm, sd] = start_date.split('-').map(Number);
      const [ey, em, ed] = end_date.split('-').map(Number);
      const startObj = new Date(sy, sm - 1, sd);
      const endObj = new Date(ey, em - 1, ed);

      const cur = new Date(startObj);
      let isFirst = true;
      while (cur <= endObj) {
        const curY = cur.getFullYear();
        const curM = String(cur.getMonth() + 1).padStart(2, '0');
        const curD = String(cur.getDate()).padStart(2, '0');
        const curDate = `${curY}-${curM}-${curD}`;

        if (isFirst) {
          await db.run(
            `UPDATE company_holidays SET
               name = COALESCE(?, name),
               date = ?,
               year = ?,
               month = ?,
               day = ?,
               holiday_type = COALESCE(?, holiday_type),
               is_working = COALESCE(?, is_working),
               is_active = COALESCE(?, is_active),
               transfer_from = COALESCE(?, transfer_from),
               description = COALESCE(?, description),
               updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [name, curDate, curY, curM, curD, holiday_type, is_working ? 1 : 0, is_active ? 1 : 0, transfer_from, description, id]
          );
          isFirst = false;
        } else {
          const holId = `hol_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
          await db.run(
            `INSERT INTO company_holidays
             (id, company_id, name, date, year, month, day, holiday_type, is_working, is_active, transfer_from, description, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT(company_id, date) DO UPDATE SET
               name = excluded.name,
               holiday_type = excluded.holiday_type,
               is_working = excluded.is_working,
               is_active = excluded.is_active,
               transfer_from = excluded.transfer_from,
               description = excluded.description,
               updated_at = CURRENT_TIMESTAMP`,
            [holId, company_id, name, curDate, curY, curM, curD, holiday_type, is_working ? 1 : 0, is_active ? 1 : 0, transfer_from, description]
          );
        }
        cur.setDate(cur.getDate() + 1);
      }
    } else {
      const [y, m, d] = (date || effectiveStart) ? (date || effectiveStart).split('-').map(Number) : [null, null, null];

      await db.run(
        `UPDATE company_holidays SET
           name = COALESCE(?, name),
           date = COALESCE(?, date),
           year = COALESCE(?, year),
           month = COALESCE(?, month),
           day = COALESCE(?, day),
           holiday_type = COALESCE(?, holiday_type),
           is_working = COALESCE(?, is_working),
           is_active = COALESCE(?, is_active),
           transfer_from = COALESCE(?, transfer_from),
           description = COALESCE(?, description),
           updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name, date || effectiveStart, y, m, d, holiday_type, is_working !== undefined ? (is_working ? 1 : 0) : null, is_active !== undefined ? (is_active ? 1 : 0) : null, transfer_from, description, id]
      );
    }

    const updated = await db.get(`SELECT * FROM company_holidays WHERE id = ?`, [id]);
    res.json({ success: true, holiday: updated });
  } catch (error: any) {
    console.error("PUT /api/schedules/holidays/:id error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. POST /api/schedules/holidays/toggle/:id - Toggle active status
router.post("/holidays/toggle/:id", async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const current = await db.get(`SELECT is_active FROM company_holidays WHERE id = ?`, [id]);
    if (!current) {
      return res.status(404).json({ success: false, error: 'Праздник не найден' });
    }
    const nextVal = current.is_active ? 0 : 1;
    await db.run(`UPDATE company_holidays SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [nextVal, id]);
    res.json({ success: true, is_active: nextVal });
  } catch (error: any) {
    console.error("POST /api/schedules/holidays/toggle/:id error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. DELETE /api/schedules/holidays/:id - Delete holiday
router.delete("/holidays/:id", async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    await db.run(`DELETE FROM company_holidays WHERE id = ?`, [id]);
    res.json({ success: true, message: 'Праздник удален' });
  } catch (error: any) {
    console.error("DELETE /api/schedules/holidays/:id error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. POST /api/schedules/holidays/reset - Reset to default RF holidays for a year
router.post("/holidays/reset", async (req, res) => {
  try {
    const db = await getDb();
    const companyId = req.body.company_id || 'flagship-main';
    const targetYear = req.body.year || 2026;

    const defaultHolidays = [
      { name: 'Новогодние каникулы', date: `${targetYear}-01-01`, type: 'official', is_working: 0, desc: 'Официальный нерабочий праздничный день РФ' },
      { name: 'Новогодние каникулы', date: `${targetYear}-01-02`, type: 'official', is_working: 0, desc: 'Официальный нерабочий праздничный день РФ' },
      { name: 'Новогодние каникулы', date: `${targetYear}-01-03`, type: 'official', is_working: 0, desc: 'Официальный нерабочий праздничный день РФ' },
      { name: 'Новогодние каникулы', date: `${targetYear}-01-04`, type: 'official', is_working: 0, desc: 'Официальный нерабочий праздничный день РФ' },
      { name: 'Новогодние каникулы', date: `${targetYear}-01-05`, type: 'official', is_working: 0, desc: 'Официальный нерабочий праздничный день РФ' },
      { name: 'Новогодние каникулы', date: `${targetYear}-01-06`, type: 'official', is_working: 0, desc: 'Официальный нерабочий праздничный день РФ' },
      { name: 'Рождество Христово', date: `${targetYear}-01-07`, type: 'official', is_working: 0, desc: 'Официальный нерабочий праздничный день РФ' },
      { name: 'Новогодние каникулы', date: `${targetYear}-01-08`, type: 'official', is_working: 0, desc: 'Официальный нерабочий праздничный день РФ' },
      { name: 'День защитника Отечества', date: `${targetYear}-02-23`, type: 'official', is_working: 0, desc: 'Официальный нерабочий праздничный день РФ' },
      { name: 'Международный женский день', date: `${targetYear}-03-08`, type: 'official', is_working: 0, desc: 'Официальный нерабочий праздничный день РФ' },
      { name: 'Праздник Весны и Труда', date: `${targetYear}-05-01`, type: 'official', is_working: 0, desc: 'Официальный нерабочий праздничный день РФ' },
      { name: 'День Победы', date: `${targetYear}-05-09`, type: 'official', is_working: 0, desc: 'Официальный нерабочий праздничный день РФ' },
      { name: 'День России', date: `${targetYear}-06-12`, type: 'official', is_working: 0, desc: 'Официальный нерабочий праздничный день РФ' },
      { name: 'День основания компании', date: `${targetYear}-08-12`, type: 'custom', is_working: 0, desc: 'Корпоративный праздник компании' },
      { name: 'День народного единства', date: `${targetYear}-11-04`, type: 'official', is_working: 0, desc: 'Официальный нерабочий праздничный день РФ' },
      { name: 'Предновогодний праздничный день', date: `${targetYear}-12-31`, type: 'official', is_working: 0, desc: 'Нерабочий праздничный день' }
    ];

    for (const h of defaultHolidays) {
      const [y, m, d] = h.date.split('-').map(Number);
      const holId = `hol_${y}_${String(m).padStart(2, '0')}_${String(d).padStart(2, '0')}`;
      await db.run(
        `INSERT INTO company_holidays 
         (id, company_id, name, date, year, month, day, holiday_type, is_working, is_active, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
         ON CONFLICT(company_id, date) DO UPDATE SET
           name = excluded.name,
           holiday_type = excluded.holiday_type,
           is_working = excluded.is_working,
           is_active = 1,
           description = excluded.description,
           updated_at = CURRENT_TIMESTAMP`,
        [holId, companyId, h.name, h.date, y, m, d, h.type, h.is_working, h.desc]
      );
    }

    const holidays = await db.all(`SELECT * FROM company_holidays WHERE (company_id = ? OR company_id = 'flagship-main') AND year = ? ORDER BY date ASC`, [companyId, targetYear]);
    res.json({ success: true, holidays });
  } catch (error: any) {
    console.error("POST /api/schedules/holidays/reset error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
