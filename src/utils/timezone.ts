import { UserProfile } from '../types';

export interface TimezoneOption {
  value: string; // e.g. "+03:00"
  label: string; // e.g. "+03:00 (МСК) — Москва, Санкт-Петербург, Минск"
  offsetMinutes: number; // e.g. 180
}

export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  { value: '+02:00', label: '+02:00 (EET) — Калининград', offsetMinutes: 120 },
  { value: '+03:00', label: '+03:00 (МСК) — Москва, Санкт-Петербург, Минск', offsetMinutes: 180 },
  { value: '+04:00', label: '+04:00 (SAMT) — Самара, Ижевск, Баку, Ереван', offsetMinutes: 240 },
  { value: '+05:00', label: '+05:00 (YEKT) — Екатеринбург, Тюмень, Ташкент', offsetMinutes: 300 },
  { value: '+06:00', label: '+06:00 (OMST) — Омск, Астана, Алматы', offsetMinutes: 360 },
  { value: '+07:00', label: '+07:00 (KRAT) — Красноярск, Новосибирск', offsetMinutes: 420 },
  { value: '+08:00', label: '+08:00 (IRKT) — Иркутск, Пекин, Сингапур', offsetMinutes: 480 },
  { value: '+09:00', label: '+09:00 (YAKT) — Якутск, Токио, Сеул', offsetMinutes: 540 },
  { value: '+10:00', label: '+10:00 (VLAT) — Владивосток, Хабаровск', offsetMinutes: 600 },
  { value: '+11:00', label: '+11:00 (MAGT) — Магадан, Южно-Сахалинск', offsetMinutes: 660 },
  { value: '+12:00', label: '+12:00 (PETT) — Камчатка, Анадырь', offsetMinutes: 720 },
  { value: '+00:00', label: '+00:00 (GMT) — Лондон, Дублин', offsetMinutes: 0 },
  { value: '+01:00', label: '+01:00 (CET) — Берлин, Париж, Рим', offsetMinutes: 60 },
  { value: '-05:00', label: '-05:00 (EST) — Нью-Йорк, Торонто', offsetMinutes: -300 },
  { value: '-08:00', label: '-08:00 (PST) — Лос-Анджелес, Ванкувер', offsetMinutes: -480 },
];

export const DEFAULT_TIMEZONE = '+03:00';

/**
 * Gets the active system timezone string (e.g. "+03:00").
 * Logic:
 * 1. Checks user.timezone if explicitly set
 * 2. Checks localStorage('rr_timezone')
 * 3. Checks Telegram timezone/language (defaults to +03:00 for Telegram users)
 * 4. Fallback to +03:00 (MSK)
 */
export function getSystemTimezone(user?: UserProfile | null): string {
  if (user?.timezone) {
    return user.timezone;
  }
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('rr_timezone') : null;
  if (stored) {
    return stored;
  }
  if (user?.telegram_id || user?.username || user?.telegramHandle) {
    return DEFAULT_TIMEZONE;
  }
  return DEFAULT_TIMEZONE;
}

export function setSystemTimezone(tz: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('rr_timezone', tz);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('rr-timezone-changed', { detail: tz }));
  }
}

/**
 * Formats date or timestamp adjusting for system timezone
 */
export function formatDateInTimezone(
  dateInput: Date | string | number,
  timezoneStr?: string,
  includeTime: boolean = true
): string {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);

    const tz = timezoneStr || getSystemTimezone();
    const match = tz.match(/([+-])(\d{2}):?(\d{2})/);
    let offsetMinutes = 180; // Default MSK
    if (match) {
      const sign = match[1] === '-' ? -1 : 1;
      const hours = parseInt(match[2], 10);
      const mins = parseInt(match[3], 10);
      offsetMinutes = sign * (hours * 60 + mins);
    }

    const utcMs = d.getTime() + (d.getTimezoneOffset() * 60000);
    const targetDate = new Date(utcMs + (offsetMinutes * 60000));

    const day = String(targetDate.getDate()).padStart(2, '0');
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const year = targetDate.getFullYear();

    if (!includeTime) {
      return `${day}.${month}.${year}`;
    }

    const hours = String(targetDate.getHours()).padStart(2, '0');
    const minutes = String(targetDate.getMinutes()).padStart(2, '0');

    return `${day}.${month}.${year} ${hours}:${minutes}`;
  } catch {
    return String(dateInput);
  }
}
