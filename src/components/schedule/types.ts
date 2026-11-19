export type ShiftType = 'day' | 'night' | 'daily' | 'weekend' | 'vacation' | 'sick' | 'dayoff' | 'trip' | 'holiday' | 'holiday_weekend';

export type HolidayType = 'official' | 'custom' | 'transfer' | 'shortened';

export interface CompanyHoliday {
  id: string;
  company_id: string;
  name: string;
  date: string; // YYYY-MM-DD
  year: number;
  month: number;
  day: number;
  holiday_type: HolidayType;
  is_working: number; // 0 = нерабочий праздничный выходной, 1 = праздничная рабочая смена (x2)
  is_active: number;  // 1 = активен, 0 = выключен
  transfer_from?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ShiftConfig {
  dayHours: string;     // e.g. "09:00 - 18:00"
  lunchHours: string;   // e.g. "13:00 - 14:00"
  nightHours: string;   // e.g. "21:00 - 07:00"
  dailyHours: string;   // e.g. "08:30 - 08:30" (24h)
}

export interface ShiftItem {
  id?: string;
  day: number;
  month?: number;
  year?: number;
  shiftDate?: string;
  type: ShiftType;
  hours: string;
  isHoliday?: boolean;
  workHours?: number;
  workStart?: string;
  workEnd?: string;
  lunchStart?: string;
  lunchEnd?: string;
  lunch2Start?: string;
  lunch2End?: string;
}

export interface EmployeeSchedule {
  id: string;
  name: string;
  role: string;
  timezone: string; // e.g. "UTC+3 (MSK)"
  totalHoursMonth: number;
  patternType: '5/2' | '2/2' | '3/3' | '1/3' | '2/2/4' | '6/1' | 'custom' | 'custom_days';
  shiftConfig: ShiftConfig;
  shifts: ShiftItem[];
}

export interface CustomShiftTemplate {
  id: string;
  name: string;
  workStart: string;
  workEnd: string;
  lunchStart: string;
  lunchEnd: string;
  lunch2Start?: string;
  lunch2End?: string;
  patternType: '5/2' | '2/2' | '3/3' | '1/3' | '6/1' | 'custom_days';
  shiftCategory?: 'day' | 'night' | 'daily';
  selectedDays?: number[];
  crossMidnight?: boolean;
  isDefault?: boolean;
  description?: string;
}

export interface LookaheadDayItem {
  index: number;
  date: Date;
  dateStr: string;
  year: number;
  month: number;
  day: number;
  dow: number;
  isToday: boolean;
  isHoliday: boolean;
  type: ShiftType;
  hours: string;
  workStart: string;
  workEnd: string;
  lunch1Start: string;
  lunch1End: string;
  lunch2Start?: string;
  lunch2End?: string;
}

export const TIMEZONES_LIST = [
  { id: 'UTC+3 (MSK)', label: 'UTC+3 (MSK) — Москва, Санкт-Петербург' },
  { id: 'UTC+2 (EET)', label: 'UTC+2 (EET) — Калининград' },
  { id: 'UTC+4 (SAM)', label: 'UTC+4 (SAM) — Самара, Ижевск' },
  { id: 'UTC+5 (YEKT)', label: 'UTC+5 (YEKT) — Екатеринбург, Тюмень' },
  { id: 'UTC+6 (OMST)', label: 'UTC+6 (OMST) — Омск' },
  { id: 'UTC+7 (KRAT)', label: 'UTC+7 (KRAT) — Новосибирск, Красноярск' },
  { id: 'UTC+8 (IRKT)', label: 'UTC+8 (IRKT) — Иркутск' },
  { id: 'UTC+9 (YAKT)', label: 'UTC+9 (YAKT) — Якутск' },
  { id: 'UTC+10 (VLAT)', label: 'UTC+10 (VLAT) — Владивосток' },
  { id: 'UTC+0 (GMT)', label: 'UTC+0 (GMT) — Гринвич' }
];

export const SHIFT_TYPES_CONFIG: Record<ShiftType, { label: string; icon: string; bgLight: string; bgDark: string; badge: string }> = {
  day: { label: 'Дневная смена (Рабочий)', icon: '☀️', bgLight: 'bg-amber-100/90 text-amber-950 border-amber-300', bgDark: 'bg-amber-500/20 text-amber-200 border-amber-500/40', badge: 'bg-amber-500 text-slate-950' },
  night: { label: 'Ночная смена', icon: '🌙', bgLight: 'bg-amber-200/80 text-amber-950 border-amber-400', bgDark: 'bg-amber-900/40 text-amber-200 border-amber-500/40', badge: 'bg-amber-700 text-white' },
  daily: { label: 'Суточная смена (24 ч)', icon: '⏳', bgLight: 'bg-orange-100/90 text-amber-950 border-orange-300', bgDark: 'bg-orange-950/40 text-amber-200 border-orange-500/40', badge: 'bg-orange-600 text-white' },
  weekend: { label: 'Выходной день', icon: '🏖️', bgLight: 'bg-stone-100/90 text-stone-800 border-stone-300', bgDark: 'bg-stone-900/50 text-stone-300 border-stone-700/50', badge: 'bg-stone-600 text-white' },
  vacation: { label: 'Отпуск', icon: '🌴', bgLight: 'bg-yellow-100/90 text-amber-950 border-yellow-300', bgDark: 'bg-yellow-950/40 text-yellow-200 border-yellow-500/40', badge: 'bg-yellow-600 text-white' },
  sick: { label: 'Больничный', icon: '🩺', bgLight: 'bg-rose-100/90 text-rose-950 border-rose-300', bgDark: 'bg-rose-950/40 text-rose-200 border-rose-500/40', badge: 'bg-rose-600 text-white' },
  trip: { label: 'Командировка', icon: '💼', bgLight: 'bg-amber-200/90 text-amber-950 border-amber-400', bgDark: 'bg-amber-800/40 text-amber-200 border-amber-500/40', badge: 'bg-amber-600 text-white' },
  dayoff: { label: 'Отгул', icon: '💤', bgLight: 'bg-amber-50/90 text-amber-900 border-amber-200', bgDark: 'bg-amber-950/30 text-amber-200 border-amber-600/30', badge: 'bg-amber-500 text-black' },
  holiday: { label: 'Праздничная смена (x2)', icon: '🏛️', bgLight: 'bg-red-100/90 text-red-950 border-red-300', bgDark: 'bg-red-950/40 text-red-200 border-red-500/40', badge: 'bg-red-600 text-white' },
  holiday_weekend: { label: 'Праздничный выходной', icon: '🎉', bgLight: 'bg-red-50/90 text-red-950 border-red-200', bgDark: 'bg-red-950/30 text-red-200 border-red-600/30', badge: 'bg-red-500 text-white' }
};

export const MONTH_NAMES_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

export const MONTH_NAMES_RU_GEN = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
];

export const WEEK_DAY_NAMES_RU = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];

// List of Official Russian Public Holidays in Month with dynamic company holidays support
export function isPublicHoliday(year: number, month: number, day: number, companyHolidays?: CompanyHoliday[]) {
  if (companyHolidays && companyHolidays.length > 0) {
    const targetDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const found = companyHolidays.find(h => h.date === targetDateStr && (h.is_active === 1 || h.is_active === undefined));
    if (found) return true;
  }
  if (month === 0 && day <= 8) return true; // New Year
  if (month === 1 && day === 23) return true; // Defender of Motherland
  if (month === 2 && day === 8) return true; // Woman's Day
  if (month === 4 && (day === 1 || day === 9)) return true; // May 1 & May 9
  if (month === 5 && day === 12) return true; // Russia Day
  if (month === 7 && day === 12) return true; // Company Anniversary
  if (month === 10 && day === 4) return true; // Unity Day
  if (month === 11 && day === 31) return true; // New Year Eve
  return false;
}

// Helper to parse shift hours string into start/end minutes, strings, and lunch breaks
export function parseShiftTimes(hoursStr: string, shiftType: ShiftType) {
  let startMins = 9 * 60;
  let endMins = 18 * 60;
  let startStr = '09:00';
  let endStr = '18:00';

  const match = hoursStr?.match(/(\d{1,2}):(\d{2})\s*[-—–]\s*(\d{1,2}):(\d{2})/);
  if (match) {
    const rawS = parseInt(match[1], 10);
    const rawSm = parseInt(match[2], 10);
    const rawE = parseInt(match[3], 10);
    const rawEm = parseInt(match[4], 10);
    startMins = rawS * 60 + rawSm;
    endMins = rawE * 60 + rawEm;
    if (endMins <= startMins && shiftType === 'night') {
      endMins += 24 * 60;
    }
    startStr = `${String(Math.floor((startMins % 1440) / 60)).padStart(2, '0')}:${String((startMins % 1440) % 60).padStart(2, '0')}`;
    endStr = `${String(Math.floor((endMins % 1440) / 60)).padStart(2, '0')}:${String((endMins % 1440) % 60).padStart(2, '0')}`;
  } else if (shiftType === 'night') {
    startMins = 21 * 60; endMins = 31 * 60; startStr = '21:00'; endStr = '07:00';
  } else if (shiftType === 'daily') {
    startMins = 8 * 60 + 30; endMins = 24 * 60; startStr = '08:30'; endStr = '08:30';
  }

  // Parse Lunch 1
  let lunch1Start = '13:00';
  let lunch1End = '14:00';
  const l1Match = hoursStr?.match(/Обед(?: 1)?:?\s*(\d{1,2}):(\d{2})\s*[-—–]\s*(\d{1,2}):(\d{2})/i) ||
                  hoursStr?.match(/Обед(?: 1)?:?\s*с?\s*(\d{1,2}):(\d{2})\s*до?\s*(\d{1,2}):(\d{2})/i);
  if (l1Match) {
    let sH = parseInt(l1Match[1], 10);
    let eH = parseInt(l1Match[3], 10);
    if (sH === 3) sH = 13;
    if (eH === 3 || eH === 4) eH = 14;
    lunch1Start = `${String(sH).padStart(2, '0')}:${l1Match[2]}`;
    lunch1End = `${String(eH).padStart(2, '0')}:${l1Match[4]}`;
  }

  // Parse Lunch 2 (for 24h daily shift)
  let lunch2Start = '20:00';
  let lunch2End = '21:00';
  const l2Match = hoursStr?.match(/Обед 2:?\s*(\d{1,2}):(\d{2})\s*[-—–]\s*(\d{1,2}):(\d{2})/i) ||
                  hoursStr?.match(/Обед 2:?\s*с?\s*(\d{1,2}):(\d{2})\s*до?\s*(\d{1,2}):(\d{2})/i);
  if (l2Match) {
    lunch2Start = `${String(parseInt(l2Match[1], 10)).padStart(2, '0')}:${l2Match[2]}`;
    lunch2End = `${String(parseInt(l2Match[3], 10)).padStart(2, '0')}:${l2Match[4]}`;
  }

  return { startMins, endMins, startStr, endStr, lunch1Start, lunch1End, lunch2Start, lunch2End };
}

export function calcWorkHours(wStart: string, wEnd: string, lStart: string, lEnd: string, sType: ShiftType): number {
  if (['weekend', 'vacation', 'sick', 'dayoff', 'trip'].includes(sType)) return 0;
  if (sType === 'daily') return 22;
  if (!wStart || !wEnd) return 8;
  const [sH, sM] = wStart.split(':').map(Number);
  const [eH, eM] = wEnd.split(':').map(Number);
  let total = (eH * 60 + eM) - (sH * 60 + sM);
  if (total <= 0 || sType === 'night') {
    total = (24 * 60 - (sH * 60 + sM)) + (eH * 60 + eM);
  }
  if (lStart && lEnd && lStart !== lEnd) {
    const [lsH, lsM] = lStart.split(':').map(Number);
    const [leH, leM] = lEnd.split(':').map(Number);
    let lunch = (leH * 60 + leM) - (lsH * 60 + lsM);
    if (lunch < 0) lunch += 24 * 60;
    if (lunch > 0 && lunch < total) total -= lunch;
  } else {
    total -= 60;
  }
  return Math.max(0, Math.round((total / 60) * 10) / 10);
}
