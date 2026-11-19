/**
 * Schedule, Shift Calendar, Cadence, Quiet Hours & Predictive Risk Scoring Utilities
 */

export type AutonomyMode = 'observer' | 'controller' | 'autopilot';
export type CheckCadence = 'every_2h' | 'every_4h' | 'twice_daily' | 'daily' | 'before_deadline' | 'custom_cron';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface LocalTimeParts {
  dateKey: string;
  hours: number;
  minutes: number;
  totalMinutes: number;
  dayOfWeek: number; // 0=Sun..6=Sat
}

export function normalizeTimezone(rawTz?: string | null): string {
  if (!rawTz) return 'Europe/Moscow';
  const s = String(rawTz).trim();
  if (/UTC\+?3|MSK/i.test(s)) return 'Europe/Moscow';
  if (/UTC\+?2/i.test(s)) return 'Europe/Kaliningrad';
  if (/UTC\+?4/i.test(s)) return 'Europe/Samara';
  if (/UTC\+?5/i.test(s)) return 'Asia/Yekaterinburg';
  if (/UTC\+?6/i.test(s)) return 'Asia/Omsk';
  if (/UTC\+?7/i.test(s)) return 'Asia/Krasnoyarsk';
  if (/UTC\+?8/i.test(s)) return 'Asia/Irkutsk';
  if (/UTC\+?9/i.test(s)) return 'Asia/Yakutsk';
  if (/UTC\+?10/i.test(s)) return 'Asia/Vladivostok';
  try {
    Intl.DateTimeFormat('en-US', { timeZone: s });
    return s;
  } catch {
    return 'Europe/Moscow';
  }
}

export function getLocalTimeParts(now: Date = new Date(), rawTz?: string | null): LocalTimeParts {
  const tz = normalizeTimezone(rawTz);
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
      hour12: false
    });
    const parts = formatter.formatToParts(now);
    const map: Record<string, string> = {};
    for (const p of parts) map[p.type] = p.value;
    let hours = parseInt(map.hour || '0', 10);
    if (hours === 24) hours = 0;
    const minutes = parseInt(map.minute || '0', 10);
    const wdMap: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
    const dayOfWeek = wdMap[(map.weekday || 'mon').toLowerCase().slice(0, 3)] ?? 1;
    const dateKey = `${map.year}-${String(map.month).padStart(2, '0')}-${String(map.day).padStart(2, '0')}`;
    return {
      dateKey,
      hours,
      minutes,
      totalMinutes: hours * 60 + minutes,
      dayOfWeek
    };
  } catch {
    const msk = new Date(now.getTime() + 3 * 3600 * 1000);
    const hours = msk.getUTCHours();
    const minutes = msk.getUTCMinutes();
    return {
      dateKey: msk.toISOString().slice(0, 10),
      hours,
      minutes,
      totalMinutes: hours * 60 + minutes,
      dayOfWeek: msk.getUTCDay()
    };
  }
}

export function parseTimeToMinutes(hhmm?: string | null, fallbackMinutes = 18 * 60): number {
  if (!hhmm || typeof hhmm !== 'string') return fallbackMinutes;
  const match = hhmm.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return fallbackMinutes;
  const h = Math.min(23, Math.max(0, parseInt(match[1], 10)));
  const m = Math.min(59, Math.max(0, parseInt(match[2], 10)));
  return h * 60 + m;
}

export function isWithinQuietHours(totalMinutes: number, quietStart = '21:00', quietEnd = '08:30'): boolean {
  const startM = parseTimeToMinutes(quietStart, 21 * 60);
  const endM = parseTimeToMinutes(quietEnd, 8 * 60 + 30);
  if (startM === endM) return false;
  if (startM > endM) {
    // Overnight quiet window e.g. 21:00 -> 08:30
    return totalMinutes >= startM || totalMinutes < endM;
  }
  return totalMinutes >= startM && totalMinutes < endM;
}

export async function isEmployeeWorkingToday(
  db: any,
  employeeId: string | undefined | null,
  dateKey: string,
  totalMinutes: number,
  dayOfWeek: number
): Promise<{ isWorkingDay: boolean; isWorkingHours: boolean; shiftStartMin: number; shiftEndMin: number }> {
  const defaultWorkingDay = dayOfWeek >= 1 && dayOfWeek <= 5;
  let isWorkingDay = defaultWorkingDay;
  let shiftStartMin = 9 * 60;
  let shiftEndMin = 18 * 60;

  if (employeeId) {
    try {
      const shiftRow = await db.get(
        `SELECT * FROM employee_shifts WHERE employee_id = ? AND shift_date = ? LIMIT 1`,
        [String(employeeId), dateKey]
      );
      if (shiftRow) {
        const sType = String(shiftRow.shift_type || shiftRow.type || '').toLowerCase();
        if (['off', 'day_off', 'выходной', 'vacation', 'отпуск', 'sick', 'больничный', 'holiday'].includes(sType) || Number(shiftRow.work_hours) === 0) {
          isWorkingDay = false;
        } else {
          isWorkingDay = true;
          if (shiftRow.work_start) shiftStartMin = parseTimeToMinutes(shiftRow.work_start, 9 * 60);
          if (shiftRow.work_end) shiftEndMin = parseTimeToMinutes(shiftRow.work_end, 18 * 60);
        }
      }
    } catch {
      // Fallback to Mon-Fri default
    }
  }

  const isWorkingHours = isWorkingDay && totalMinutes >= shiftStartMin && totalMinutes <= shiftEndMin;
  return { isWorkingDay, isWorkingHours, shiftStartMin, shiftEndMin };
}

export function getCadenceIntervalHours(cadence?: string | null): number | null {
  switch (cadence) {
    case 'every_2h':
      return 2;
    case 'every_4h':
      return 4;
    case 'twice_daily':
      return 5; // morning + afternoon pulses within working shift
    case 'daily':
      return 24;
    case 'before_deadline':
    case 'custom_cron':
    default:
      return null;
  }
}

/**
 * Basic 5-field cron matcher for custom_cron strings (supports numbers, asterisk, and step expressions).
 */
export function matchesSimpleCron(cronExpr: string | null | undefined, parts: LocalTimeParts): boolean {
  if (!cronExpr || typeof cronExpr !== 'string') return false;
  const tokens = cronExpr.trim().split(/\s+/);
  if (tokens.length < 5) return false;
  const [minTok, hourTok, , , dowTok] = tokens;

  const matchField = (tok: string, val: number): boolean => {
    if (tok === '*') return true;
    if (tok.startsWith('*/')) {
      const step = parseInt(tok.slice(2), 10);
      return step > 0 && val % step === 0;
    }
    return tok.split(',').some(item => {
      if (item.includes('-')) {
        const [a, b] = item.split('-').map(n => parseInt(n, 10));
        return !isNaN(a) && !isNaN(b) && val >= a && val <= b;
      }
      return parseInt(item, 10) === val;
    });
  };

  return matchField(minTok, parts.minutes) && matchField(hourTok, parts.hours) && matchField(dowTok, parts.dayOfWeek);
}

export function computeTaskProgress(task: any): number {
  if (typeof task.progress_percent === 'number' && task.progress_percent > 0) {
    return Math.min(100, Math.max(0, task.progress_percent));
  }

  let fields: any[] = [];
  let answers: Record<string, any> = {};
  let checklist: any[] = [];

  try { fields = typeof task.fields === 'string' ? JSON.parse(task.fields) : (task.fields || []); } catch {}
  try { answers = typeof task.answers === 'string' ? JSON.parse(task.answers) : (task.answers || {}); } catch {}
  try { checklist = typeof task.checklist === 'string' ? JSON.parse(task.checklist) : (task.checklist || []); } catch {}

  const fieldRatio = Array.isArray(fields) && fields.length > 0
    ? fields.filter(f => {
        const v = answers?.[f.id];
        return v !== undefined && v !== null && v !== '' && (Array.isArray(v) ? v.length > 0 : true);
      }).length / fields.length
    : 0;

  const checkRatio = Array.isArray(checklist) && checklist.length > 0
    ? checklist.filter(c => Boolean(c.done)).length / checklist.length
    : 0;

  if (fields.length > 0 && checklist.length > 0) {
    return Math.round(((fieldRatio + checkRatio) / 2) * 100);
  }
  return Math.round((fieldRatio || checkRatio || 0) * 100);
}

export function calculateTaskRisk(options: {
  task: any;
  now: Date;
  progressPercent: number;
  concurrentActiveTasks: number;
  employeePastOverdueCount: number;
}): { riskScore: number; riskLevel: RiskLevel; elapsedRatio: number; hoursUntilDeadline: number; reasons: string[] } {
  const { task, now, progressPercent, concurrentActiveTasks, employeePastOverdueCount } = options;
  const reasons: string[] = [];

  const deadlineDateStr = String(task.deadLine || task.deadline || now.toISOString().slice(0, 10)).slice(0, 10);
  const deadlineTime = String(task.deadline_time || '18:00').slice(0, 5);
  const deadlineIso = `${deadlineDateStr}T${deadlineTime.length === 5 ? deadlineTime : '18:00'}:00`;
  const dlDate = new Date(deadlineIso);
  const validDl = !isNaN(dlDate.getTime()) ? dlDate : new Date(Date.now() + 24 * 3600 * 1000);

  const startStr = String(task.startDate || task.start_date || task.created_at || now.toISOString().slice(0, 10)).slice(0, 10);
  const startDate = new Date(`${startStr}T09:00:00`);
  const validStart = !isNaN(startDate.getTime()) && startDate < validDl
    ? startDate
    : new Date(validDl.getTime() - 3 * 24 * 3600 * 1000);

  const totalSpanMs = Math.max(3600 * 1000, validDl.getTime() - validStart.getTime());
  const elapsedMs = Math.max(0, now.getTime() - validStart.getTime());
  const elapsedRatio = Math.min(2, elapsedMs / totalSpanMs);
  const hoursUntilDeadline = (validDl.getTime() - now.getTime()) / (1000 * 60 * 60);

  let score = 0;

  if (hoursUntilDeadline < 0) {
    score += 65;
    reasons.push(`Дедлайн просрочен на ${Math.abs(Math.round(hoursUntilDeadline))} ч.`);
  } else if (hoursUntilDeadline <= 4) {
    score += 45;
    reasons.push(`До дедлайна осталось менее 4 ч.`);
  } else if (hoursUntilDeadline <= 24) {
    score += 25;
    reasons.push(`До дедлайна менее суток`);
  }

  // Lag between elapsed timeline and actual completion %
  const progressGap = Math.max(0, Math.round(elapsedRatio * 100) - progressPercent);
  if (elapsedRatio >= 0.45 && progressPercent < 15) {
    score += 30;
    reasons.push(`Пройдено ${Math.round(elapsedRatio * 100)}% срока при готовности ${progressPercent}%`);
  } else if (progressGap > 30) {
    score += 18;
    reasons.push(`Отставание прогресса от графика (${progressPercent}% готово)`);
  }

  // Blocker explicitly marked
  if (task.blocker_status && task.blocker_status !== 'none') {
    score += 25;
    reasons.push(`Зафиксировано затруднение (${task.blocker_status})`);
  }

  // Concurrent load on employee
  if (concurrentActiveTasks >= 5) {
    score += 15;
    reasons.push(`Высокая загрузка исполнителя (${concurrentActiveTasks} активных задач)`);
  } else if (concurrentActiveTasks >= 3) {
    score += 7;
  }

  // Historical slippage
  if (employeePastOverdueCount >= 2) {
    score += 10;
    reasons.push(`Повторяющиеся переносы сроков по предыдущим задачам`);
  }

  if (String(task.priority || '').toLowerCase() === 'high') {
    score += 5;
  }

  const riskScore = Math.min(100, Math.max(0, Math.round(score)));
  const riskLevel: RiskLevel =
    riskScore >= 80 ? 'critical' :
    riskScore >= 55 ? 'high' :
    riskScore >= 30 ? 'medium' : 'low';

  return { riskScore, riskLevel, elapsedRatio, hoursUntilDeadline, reasons };
}

/**
 * Smart deadline picker: finds the nearest upcoming working day with lower concurrent task load
 */
export async function findNextWorkingSlotWithLowLoad(
  db: any,
  employeeId: string | undefined | null,
  baseDateStr: string,
  minShiftDays = 1,
  maxShiftDays = 5
): Promise<{ proposedDeadline: string; shiftDays: number; workloadNote: string }> {
  const baseDate = new Date(`${String(baseDateStr).slice(0, 10)}T12:00:00Z`);
  const todayMid = new Date(`${new Date().toISOString().slice(0, 10)}T12:00:00Z`);
  const effectiveBase = isNaN(baseDate.getTime()) || baseDate < todayMid ? todayMid : baseDate;

  let activeTasks: any[] = [];
  if (employeeId) {
    activeTasks = await db.all(
      `SELECT id, deadLine FROM tasks WHERE (executorId = ? OR executor_id = ?) AND status NOT IN ('completed', 'cancelled')`,
      [String(employeeId), String(employeeId)]
    ).catch(() => []);
  }

  const countByDate = new Map<string, number>();
  for (const t of activeTasks) {
    const d = String(t.deadLine || t.deadline || '').slice(0, 10);
    if (d) countByDate.set(d, (countByDate.get(d) || 0) + 1);
  }

  let bestCandidate: { date: string; shift: number; load: number; working: boolean } | null = null;

  for (let shift = Math.max(1, minShiftDays); shift <= Math.max(minShiftDays, maxShiftDays); shift++) {
    const candDate = new Date(effectiveBase.getTime() + shift * 24 * 3600 * 1000);
    const candStr = candDate.toISOString().slice(0, 10);
    const dow = candDate.getUTCDay();
    const { isWorkingDay } = await isEmployeeWorkingToday(db, employeeId, candStr, 12 * 60, dow);
    const load = countByDate.get(candStr) || 0;

    if (isWorkingDay && (!bestCandidate || !bestCandidate.working || load < bestCandidate.load)) {
      bestCandidate = { date: candStr, shift, load, working: true };
      if (load === 0) break;
    } else if (!bestCandidate) {
      bestCandidate = { date: candStr, shift, load, working: isWorkingDay };
    }
  }

  const chosen = bestCandidate || {
    date: new Date(effectiveBase.getTime() + minShiftDays * 24 * 3600 * 1000).toISOString().slice(0, 10),
    shift: minShiftDays,
    load: 0,
    working: true
  };

  const workloadNote = chosen.working
    ? `Подобрана ближайшая рабочая смена (${chosen.date}), активных задач на эту дату у исполнителя: ${chosen.load}.`
    : `Предложена дата ${chosen.date} (+${chosen.shift} дн.), активных задач на эту дату: ${chosen.load}.`;

  return {
    proposedDeadline: chosen.date,
    shiftDays: chosen.shift,
    workloadNote
  };
}
