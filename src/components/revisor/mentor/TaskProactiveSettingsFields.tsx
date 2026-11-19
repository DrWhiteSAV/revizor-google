import React from 'react';
import { Clock, ShieldCheck, Sliders } from 'lucide-react';

export interface ProactiveSettingsValue {
  autonomyMode: 'observer' | 'controller' | 'autopilot';
  checkCadence: 'every_2h' | 'every_4h' | 'twice_daily' | 'daily' | 'before_deadline' | 'custom_cron';
  deadlineTime?: string;
  reminderDaysBefore?: number;
  reminderMinutes?: number;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  maxAutoShiftDays?: number;
}

interface TaskProactiveSettingsFieldsProps {
  value: ProactiveSettingsValue;
  onChange: (next: ProactiveSettingsValue) => void;
  showQuietHours?: boolean;
  isDark?: boolean;
}

const AUTONOMY_OPTIONS: Array<{ id: 'observer' | 'controller' | 'autopilot'; label: string; desc: string }> = [
  { id: 'observer', label: 'Наблюдатель', desc: 'Только чекины, советы ИИ и прогнозы без автосдвигов' },
  { id: 'controller', label: 'Контролер', desc: 'Чекины, лестница напоминаний и эскалация риска' },
  { id: 'autopilot', label: 'Автопилот', desc: 'Полный контроль + умный подбор даты сдвига при задержке' }
];

const CADENCE_OPTIONS: Array<{ id: ProactiveSettingsValue['checkCadence']; label: string }> = [
  { id: 'every_2h', label: 'Каждые 2 часа' },
  { id: 'every_4h', label: 'Каждые 4 часа' },
  { id: 'twice_daily', label: 'Утром и вечером' },
  { id: 'daily', label: 'Ежедневно' },
  { id: 'before_deadline', label: 'Перед дедлайном' }
];

export const TaskProactiveSettingsFields: React.FC<TaskProactiveSettingsFieldsProps> = ({
  value,
  onChange,
  showQuietHours = false,
  isDark = true
}) => {
  const inputCls = `w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none transition-colors ${
    isDark
      ? 'bg-transparent border-[#E7C768]/40 text-[#F4EE8E] focus:border-[#F4EE8E]'
      : 'bg-[#FFFBF5]/85 border-[#B8860B]/40 text-amber-950 focus:border-[#B8860B]'
  }`;

  return (
    <div className={`p-4 rounded-2xl border space-y-4 transition-colors ${
      isDark
        ? 'bg-[#1A0F02]/55 border-[#E7C768]/35 text-[#F4EE8E]'
        : 'bg-[#FAF6EC]/75 border-[#B8860B]/35 text-amber-950'
    }`}>
      <div className="flex items-center gap-2 text-sm font-bold">
        <Sliders size={16} className={isDark ? 'text-[#E7C768]' : 'text-[#B8860B]'} />
        <span>Автономный контроль и периодичность ИИ-Ревизора</span>
      </div>

      {/* Autonomy Level Selector (wraps cleanly into vertical stack on mobile) */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold opacity-90">Режим работы ИИ-Ревизора</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {AUTONOMY_OPTIONS.map((opt) => {
            const active = value.autonomyMode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange({ ...value, autonomyMode: opt.id })}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  active
                    ? (isDark
                        ? 'bg-[#E7C768]/20 border-[#F4EE8E] text-[#F4EE8E]'
                        : 'bg-[#B8860B]/15 border-[#B8860B] text-amber-950')
                    : (isDark
                        ? 'border-[#E7C768]/25 hover:bg-[#E7C768]/10 opacity-85'
                        : 'border-[#B8860B]/25 hover:bg-[#B8860B]/10 opacity-85')
                }`}
              >
                <div className="text-sm font-bold flex items-center gap-1.5">
                  <ShieldCheck size={15} />
                  <span>{opt.label}</span>
                </div>
                <div className="text-sm opacity-80 mt-1 leading-snug">{opt.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Check-in Cadence Bubbles (wrapping flex, no horizontal scrollbar on mobile) */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold opacity-90">Периодичность чекинов (с учетом графика смен)</label>
        <div className="flex flex-wrap gap-2">
          {CADENCE_OPTIONS.map((cad) => {
            const active = value.checkCadence === cad.id;
            return (
              <button
                key={cad.id}
                type="button"
                onClick={() => onChange({ ...value, checkCadence: cad.id })}
                className={`px-3.5 py-2 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                  active
                    ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 border-transparent'
                    : (isDark
                        ? 'border-[#E7C768]/30 text-[#F4EE8E] hover:bg-[#E7C768]/10'
                        : 'border-[#B8860B]/35 text-amber-950 hover:bg-[#B8860B]/10')
                }`}
              >
                {cad.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Timing & Reminder Escalation */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-semibold mb-1 flex items-center gap-1.5">
            <Clock size={14} />
            <span>Время дедлайна</span>
          </label>
          <input
            type="time"
            value={value.deadlineTime || '18:00'}
            onChange={(e) => onChange({ ...value, deadlineTime: e.target.value })}
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Напомнить за (дн.)</label>
          <input
            type="number"
            min={0}
            max={14}
            value={value.reminderDaysBefore ?? 1}
            onChange={(e) => onChange({ ...value, reminderDaysBefore: Math.max(0, Number(e.target.value) || 0) })}
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Контроль за (мин.)</label>
          <input
            type="number"
            min={15}
            max={360}
            step={15}
            value={value.reminderMinutes ?? 60}
            onChange={(e) => onChange({ ...value, reminderMinutes: Math.max(15, Number(e.target.value) || 60) })}
            className={inputCls}
          />
        </div>
      </div>

      {showQuietHours && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div>
            <label className="block text-sm font-semibold mb-1">Тихие часы с</label>
            <input
              type="time"
              value={value.quietHoursStart || '21:00'}
              onChange={(e) => onChange({ ...value, quietHoursStart: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Тихие часы до</label>
            <input
              type="time"
              value={value.quietHoursEnd || '08:30'}
              onChange={(e) => onChange({ ...value, quietHoursEnd: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Лимит автосдвига (дн.)</label>
            <input
              type="number"
              min={1}
              max={5}
              value={value.maxAutoShiftDays ?? 2}
              onChange={(e) => onChange({ ...value, maxAutoShiftDays: Math.min(5, Math.max(1, Number(e.target.value) || 2)) })}
              className={inputCls}
            />
          </div>
        </div>
      )}
    </div>
  );
};
