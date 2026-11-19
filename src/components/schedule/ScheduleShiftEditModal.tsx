import React, { useState, useEffect } from 'react';
import { X, Clock, Sun, Moon, Coffee } from 'lucide-react';
import { ShiftType, SHIFT_TYPES_CONFIG, parseShiftTimes, MONTH_NAMES_RU_GEN } from './types';

export interface ScheduleShiftEditModalProps {
  isOpen: boolean;
  employeeName: string;
  employeeTimezone: string;
  day: number;
  month: number;
  year: number;
  shift: {
    type: ShiftType;
    hours: string;
    workStart?: string;
    workEnd?: string;
    lunchStart?: string;
    lunchEnd?: string;
    lunch2Start?: string;
    lunch2End?: string;
  };
  isLightTheme: boolean;
  onClose: () => void;
  onSave: (
    newType: ShiftType,
    startStr: string,
    endStr: string,
    lunch1Start: string,
    lunch1End: string,
    lunch2Start?: string,
    lunch2End?: string
  ) => void;
}

export const ScheduleShiftEditModal: React.FC<ScheduleShiftEditModalProps> = ({
  isOpen,
  employeeName,
  employeeTimezone,
  day,
  month,
  year,
  shift,
  isLightTheme,
  onClose,
  onSave
}) => {
  if (!isOpen) return null;

  const [selectedType, setSelectedType] = useState<ShiftType>(shift.type || 'day');
  const [startStr, setStartStr] = useState<string>('09:00');
  const [endStr, setEndStr] = useState<string>('18:00');
  const [lunch1Start, setLunch1Start] = useState<string>('13:00');
  const [lunch1End, setLunch1End] = useState<string>('14:00');
  const [lunch2Start, setLunch2Start] = useState<string>('20:00');
  const [lunch2End, setLunch2End] = useState<string>('21:00');

  useEffect(() => {
    setSelectedType(shift.type || 'day');
    const parsed = parseShiftTimes(shift.hours, shift.type);
    
    if (shift.workStart && shift.workEnd) {
      setStartStr(shift.workStart);
      setEndStr(shift.workEnd);
    } else {
      setStartStr(parsed.startStr);
      setEndStr(parsed.endStr);
    }

    setLunch1Start(shift.lunchStart || parsed.lunch1Start || '13:00');
    setLunch1End(shift.lunchEnd || parsed.lunch1End || '14:00');
    setLunch2Start(shift.lunch2Start || parsed.lunch2Start || '20:00');
    setLunch2End(shift.lunch2End || parsed.lunch2End || '21:00');
  }, [shift, day, month, year]);

  const handleTypeChange = (newType: ShiftType) => {
    setSelectedType(newType);
    if (newType === 'night') {
      setStartStr('21:00');
      setEndStr('07:00');
      setLunch1Start('01:00');
      setLunch1End('02:00');
    } else if (newType === 'daily') {
      setStartStr('08:30');
      setEndStr('08:30');
      setLunch1Start('13:00');
      setLunch1End('14:00');
      setLunch2Start('20:00');
      setLunch2End('21:00');
    } else if (newType === 'day' || newType === 'holiday') {
      setStartStr('09:00');
      setEndStr('18:00');
      setLunch1Start('13:00');
      setLunch1End('14:00');
    }
  };

  const isNonWorking = ['weekend', 'vacation', 'sick', 'trip', 'dayoff'].includes(selectedType);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSave(
      selectedType,
      isNonWorking ? '' : startStr,
      isNonWorking ? '' : endStr,
      isNonWorking ? '' : lunch1Start,
      isNonWorking ? '' : lunch1End,
      isNonWorking ? '' : lunch2Start,
      isNonWorking ? '' : lunch2End
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div className={`w-full max-w-md rounded-3xl border shadow-2xl p-5 sm:p-6 space-y-4 ${
        isLightTheme ? 'bg-[#FFFBF5] border-amber-400 text-zinc-900 shadow-amber-900/10' : 'bg-[#1A0F02] border-amber-500/40 text-white shadow-2xl'
      }`}>
        <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
          <div>
            <h4 className="text-base font-black tracking-tight text-zinc-950 dark:text-white">
              {employeeName}
            </h4>
            <p className="text-xs text-amber-800 dark:text-amber-300 font-bold mt-0.5">
              {day} {MONTH_NAMES_RU_GEN[month]} {year} • {employeeTimezone}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-amber-500/20 text-zinc-500 dark:text-zinc-400 hover:text-amber-950 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-bold">
          <div>
            <label className="block text-xs font-extrabold text-zinc-800 dark:text-[#F4EE8E] mb-1.5">
              Тип смены:
            </label>
            <select
              value={selectedType}
              onChange={(e) => handleTypeChange(e.target.value as ShiftType)}
              className={`w-full px-3 py-2.5 rounded-xl border text-xs font-black cursor-pointer focus:outline-none transition-all ${
                isLightTheme ? 'bg-white border-amber-400 text-zinc-950 shadow-xs' : 'bg-[#261505] border-amber-500/40 text-white'
              }`}
            >
              {Object.entries(SHIFT_TYPES_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key} className={isLightTheme ? 'text-zinc-900' : 'bg-zinc-900 text-white'}>
                  {cfg.label}
                </option>
              ))}
            </select>
          </div>

          {!isNonWorking && (
            <div className="space-y-3 p-3 rounded-2xl border border-amber-500/20 bg-amber-500/5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-zinc-700 dark:text-[#F4EE8E] mb-1">
                    Начало работы:
                  </label>
                  <input
                    type="time"
                    value={startStr}
                    onChange={(e) => setStartStr(e.target.value)}
                    className={`w-full px-3 py-1.5 rounded-xl border font-mono font-black text-xs ${
                      isLightTheme ? 'bg-white border-amber-400 text-zinc-950' : 'bg-[#261505] border-amber-500/40 text-white'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-zinc-700 dark:text-[#F4EE8E] mb-1">
                    Окончание работы:
                  </label>
                  <input
                    type="time"
                    value={endStr}
                    onChange={(e) => setEndStr(e.target.value)}
                    className={`w-full px-3 py-1.5 rounded-xl border font-mono font-black text-xs ${
                      isLightTheme ? 'bg-white border-amber-400 text-zinc-950' : 'bg-[#261505] border-amber-500/40 text-white'
                    }`}
                  />
                </div>
              </div>

              {/* Lunch Break 1 */}
              <div>
                <label className="block text-[11px] font-extrabold text-zinc-700 dark:text-[#F4EE8E] mb-1">
                  Обеденный перерыв (1):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="time"
                    value={lunch1Start}
                    onChange={(e) => setLunch1Start(e.target.value)}
                    className={`w-full px-2.5 py-1 rounded-xl border font-mono font-black text-xs ${
                      isLightTheme ? 'bg-white border-amber-400 text-zinc-950' : 'bg-[#261505] border-amber-500/40 text-white'
                    }`}
                  />
                  <input
                    type="time"
                    value={lunch1End}
                    onChange={(e) => setLunch1End(e.target.value)}
                    className={`w-full px-2.5 py-1 rounded-xl border font-mono font-black text-xs ${
                      isLightTheme ? 'bg-white border-amber-400 text-zinc-950' : 'bg-[#261505] border-amber-500/40 text-white'
                    }`}
                  />
                </div>
              </div>

              {/* Lunch Break 2 for daily shifts */}
              {selectedType === 'daily' && (
                <div>
                  <label className="block text-[11px] font-extrabold text-zinc-700 dark:text-[#F4EE8E] mb-1">
                    Второй перерыв (2):
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="time"
                      value={lunch2Start}
                      onChange={(e) => setLunch2Start(e.target.value)}
                      className={`w-full px-2.5 py-1 rounded-xl border font-mono font-black text-xs ${
                        isLightTheme ? 'bg-white border-amber-400 text-zinc-950' : 'bg-[#261505] border-amber-500/40 text-white'
                      }`}
                    />
                    <input
                      type="time"
                      value={lunch2End}
                      onChange={(e) => setLunch2End(e.target.value)}
                      className={`w-full px-2.5 py-1 rounded-xl border font-mono font-black text-xs ${
                        isLightTheme ? 'bg-white border-amber-400 text-zinc-950' : 'bg-[#261505] border-amber-500/40 text-white'
                      }`}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {isNonWorking && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center font-extrabold text-xs text-amber-900 dark:text-amber-200">
              Рабочее время для данного типа дня отключено
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-amber-500/30 font-extrabold text-xs text-zinc-600 dark:text-zinc-300 hover:bg-amber-500/10 cursor-pointer transition-all"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-black text-xs shadow-md cursor-pointer hover:brightness-110 active:scale-95 transition-all"
            >
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
