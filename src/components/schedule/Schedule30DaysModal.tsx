import React, { useState, useMemo } from 'react';
import { 
  X, 
  Calendar, 
  Sparkles, 
  Clock, 
  Save, 
  Trash2, 
  Sliders,
  CheckCircle2
} from 'lucide-react';
import { 
  EmployeeSchedule, 
  ShiftType, 
  CustomShiftTemplate, 
  LookaheadDayItem,
  SHIFT_TYPES_CONFIG, 
  MONTH_NAMES_RU_GEN, 
  WEEK_DAY_NAMES_RU,
  TIMEZONES_LIST,
  parseShiftTimes,
  isPublicHoliday
} from './types';
import { AudioField } from '../voice/AudioField';
import { ScheduleTemplateWorkflowModal } from './ScheduleTemplateWorkflowModal';
import { ScheduleAiWorkflowModal } from './ScheduleAiWorkflowModal';

interface Schedule30DaysModalProps {
  isOpen: boolean;
  editingEmployeeSchedule: EmployeeSchedule | null;
  onClose: () => void;
  onSaveBatch: () => Promise<void>;
  onDeleteClick: (emp: EmployeeSchedule) => void;
  customShiftTemplates: CustomShiftTemplate[];
  deviceClock: Date;
  currentYear: number;
  currentMonth: number;
  isLightTheme: boolean;
  isSavingBatch: boolean;
  saveSuccessToast: string | null;
  setSaveSuccessToast: (msg: string | null) => void;
  onUpdate30DayShift: (
    dateStr: string,
    newType: ShiftType,
    workStart: string,
    workEnd: string,
    l1Start: string,
    l1End: string,
    l2Start?: string,
    l2End?: string
  ) => void;
  onApplyTemplateTo30Days: (templateIdOrPreset: string) => void;
  onApplyAnnualTemplate: (
    empId: string,
    pattern: '5/2' | '2/2' | '3/3' | '1/3' | '6/1',
    category?: 'day' | 'night' | 'daily',
    workStart?: string,
    workEnd?: string,
    lunchStart?: string,
    lunchEnd?: string
  ) => void;
  onUpdateEmployeeTimezone: (empId: string, tz: string) => void;
  // AI Formatter
  isAiProcessing: boolean;
  aiVoicePrompt: string;
  setAiVoicePrompt: (prompt: string) => void;
  aiVoiceAudioUrl: string | null;
  setAiVoiceAudioUrl: (url: string | null) => void;
  onAiFormatSubmit: () => void;
  onBatchUpdateSchedule?: (updatedSchedule: EmployeeSchedule) => void;
}

export const Schedule30DaysModal: React.FC<Schedule30DaysModalProps> = ({
  isOpen,
  editingEmployeeSchedule,
  onClose,
  onSaveBatch,
  onDeleteClick,
  customShiftTemplates,
  deviceClock,
  currentYear,
  currentMonth,
  isLightTheme,
  isSavingBatch,
  saveSuccessToast,
  setSaveSuccessToast,
  onUpdate30DayShift,
  onApplyTemplateTo30Days,
  onApplyAnnualTemplate,
  onUpdateEmployeeTimezone,
  isAiProcessing,
  aiVoicePrompt,
  setAiVoicePrompt,
  aiVoiceAudioUrl,
  setAiVoiceAudioUrl,
  onAiFormatSubmit,
  onBatchUpdateSchedule
}) => {
  const [editorTab, setEditorTab] = useState<'month' | 'template'>('month');
  const [selectedTemplateFor30Days, setSelectedTemplateFor30Days] = useState<string>('preset-5-2');
  const [isWorkflowOpen, setIsWorkflowOpen] = useState<boolean>(false);
  const [isAiWorkflowOpen, setIsAiWorkflowOpen] = useState<boolean>(false);

  // Compute 30 consecutive days lookahead starting from current device date
  const lookahead30Days: LookaheadDayItem[] = useMemo(() => {
    if (!editingEmployeeSchedule) return [];
    const list: LookaheadDayItem[] = [];
    const base = new Date(deviceClock);
    base.setHours(0, 0, 0, 0);

    for (let i = 0; i < 30; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const y = d.getFullYear();
      const m = d.getMonth(); // 0-11
      const day = d.getDate();
      const dow = d.getDay();
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = i === 0;
      const isHoliday = isPublicHoliday(y, m, day);

      const existingShift = editingEmployeeSchedule?.shifts?.find((sh: any) => {
        const dStr = sh.shiftDate || sh.shift_date || (sh.year && sh.month && sh.day ? `${sh.year}-${String(sh.month).padStart(2, '0')}-${String(sh.day).padStart(2, '0')}` : null);
        if (dStr && dStr === dateStr) return true;
        const shYear = Number(sh.year) || y;
        const shMonth = Number(sh.month);
        const shDay = Number(sh.day);
        if (shMonth && shDay && shYear === y && shMonth === (m + 1) && shDay === day) {
          return true;
        }
        return false;
      });

      const shiftType: ShiftType = (existingShift?.type as ShiftType) || (existingShift?.shift_type as ShiftType) || (isHoliday ? 'holiday' : (dow === 0 || dow === 6 ? 'weekend' : 'day'));
      const defaultHours = shiftType === 'weekend'
        ? 'Выходной'
        : shiftType === 'holiday'
        ? '09:00 - 18:00 (Праздник x2)'
        : shiftType === 'night'
        ? '21:00 - 07:00 (ночная 🌙, +1 день)'
        : shiftType === 'daily'
        ? '08:30 - 08:30 (суточная 24ч)'
        : (editingEmployeeSchedule?.shiftConfig?.dayHours ? `${editingEmployeeSchedule.shiftConfig.dayHours} (обед ${editingEmployeeSchedule.shiftConfig.lunchHours || '13:00-14:00'})` : '09:00 - 18:00 (обед 13:00-14:00)');
      const hours = existingShift?.hours || (existingShift as any)?.hours_text || defaultHours;
      const parsed = parseShiftTimes(hours, shiftType);

      list.push({
        index: i,
        date: d,
        dateStr,
        year: y,
        month: m,
        day,
        dow,
        isToday,
        isHoliday,
        type: shiftType,
        hours,
        workStart: (existingShift as any)?.workStart || (existingShift as any)?.work_start || parsed.startStr,
        workEnd: (existingShift as any)?.workEnd || (existingShift as any)?.work_end || parsed.endStr,
        lunch1Start: (existingShift as any)?.lunchStart || (existingShift as any)?.lunch_start || parsed.lunch1Start,
        lunch1End: (existingShift as any)?.lunchEnd || (existingShift as any)?.lunch_end || parsed.lunch1End,
        lunch2Start: (existingShift as any)?.lunch2Start || (existingShift as any)?.lunch2_start || parsed.lunch2Start,
        lunch2End: (existingShift as any)?.lunch2End || (existingShift as any)?.lunch2_end || parsed.lunch2End,
      });
    }
    return list;
  }, [deviceClock, editingEmployeeSchedule, currentMonth, currentYear]);

  if (!isOpen || !editingEmployeeSchedule) return null;

  const todayYear = deviceClock.getFullYear();
  const todayMonth = deviceClock.getMonth();
  const todayDay = deviceClock.getDate();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md p-0 sm:p-4 animate-fadeIn">
      <div className={`w-full max-w-4xl max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-3xl border shadow-2xl overflow-hidden transition-all backdrop-blur-md ${
        isLightTheme
          ? 'bg-[#FFFBF5]/95 border-amber-400 text-amber-950'
          : 'bg-[#1A0F02]/95 border-amber-400/50 text-white shadow-[0_0_30px_rgba(244,238,142,0.2)]'
      }`}>
        {/* Modal Header */}
        <div className={`p-4 sm:p-5 border-b flex items-start sm:items-center justify-between gap-3 ${
          isLightTheme ? 'bg-amber-100/60 border-amber-300' : 'bg-amber-500/10 border-amber-400/30'
        }`}>
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <span className="p-2.5 rounded-2xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-black shadow-md shrink-0">
              <Calendar size={20} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg font-black break-words">
                  Индивидуальный график: {editingEmployeeSchedule.name}
                </h3>
                <span className={`px-2 py-0.5 rounded-lg text-sm font-mono font-bold border ${
                  isLightTheme
                    ? 'bg-amber-200/70 text-amber-950 border-amber-400/60'
                    : 'bg-amber-500/20 text-[#F4EE8E] border-amber-400/40'
                }`}>
                  {editingEmployeeSchedule.timezone}
                </span>
              </div>
              <p className={`text-sm font-medium mt-0.5 ${isLightTheme ? 'text-stone-700' : 'text-amber-200/80'}`}>
                {editingEmployeeSchedule.role} • Базовый режим: {editingEmployeeSchedule.patternType}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть окно"
            className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border cursor-pointer transition-colors shrink-0 ${
              isLightTheme
                ? 'border-amber-900/20 text-amber-950 hover:bg-amber-200/60'
                : 'border-amber-400/30 text-amber-200 hover:bg-amber-400/15'
            }`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Navigation Tabs: 30 дней vs Годовой шаблон */}
        <div className="px-4 sm:px-5 py-2.5 border-b border-amber-500/20 flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setEditorTab('month')}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-black transition-all cursor-pointer flex items-center gap-2 border ${
              editorTab === 'month'
                ? isLightTheme
                  ? 'border-amber-500 text-amber-950 bg-amber-300/60 shadow-xs'
                  : 'border-amber-400 text-amber-950 bg-gradient-to-r from-[#F4EE8E] to-[#E7C768] shadow-[0_0_15px_rgba(244,238,142,0.25)]'
                : isLightTheme
                  ? 'border-amber-900/20 text-amber-950/80 bg-white/60 hover:bg-amber-100/60'
                  : 'border-amber-400/30 text-amber-200 bg-[#140A01]/60 hover:bg-amber-400/10'
            }`}
          >
            <Calendar size={16} />
            <span>Индивидуальный график (30 дней)</span>
          </button>
          <button
            type="button"
            onClick={() => setEditorTab('template')}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-black transition-all cursor-pointer flex items-center gap-2 border ${
              editorTab === 'template'
                ? isLightTheme
                  ? 'border-amber-500 text-amber-950 bg-amber-300/60 shadow-xs'
                  : 'border-amber-400 text-amber-950 bg-gradient-to-r from-[#F4EE8E] to-[#E7C768] shadow-[0_0_15px_rgba(244,238,142,0.25)]'
                : isLightTheme
                  ? 'border-amber-900/20 text-amber-950/80 bg-white/60 hover:bg-amber-100/60'
                  : 'border-amber-400/30 text-amber-200 bg-[#140A01]/60 hover:bg-amber-400/10'
            }`}
          >
            <Sliders size={16} />
            <span>Годовой шаблон и параметры смен</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 scrollbar-thin scrollbar-thumb-amber-500/40">

          {/* AI Voice and Auto-Fill Box */}
          <div className={`p-4 rounded-2xl border space-y-3 ${
            isLightTheme ? 'bg-amber-50/80 border-amber-300' : 'bg-[#140A01]/60 border-amber-400/30'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                <span className="p-2 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 shrink-0">
                  <Sparkles size={16} />
                </span>
                <div className="min-w-0">
                  <h4 className="text-sm font-black">
                    ИИ-Оформление и голосовое управление графиком
                  </h4>
                  <p className={`text-sm font-medium ${isLightTheme ? 'text-stone-700' : 'text-amber-200/80'}`}>
                    Продиктуйте или введите режим (например: «Поставь график 2/2 с 10 до 20» или «28 августа отпуск»)
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isAiProcessing || !aiVoicePrompt.trim()}
                onClick={() => {
                  if (!aiVoicePrompt.trim()) return;
                  setIsAiWorkflowOpen(true);
                }}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 text-sm font-bold shadow-md hover:brightness-110 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Sparkles size={16} />
                <span>ИИ-Оформить</span>
              </button>
            </div>

            <AudioField
              value={aiVoicePrompt}
              onChange={(text) => setAiVoicePrompt(text)}
              audioUrl={aiVoiceAudioUrl}
              onAudioChange={(url) => setAiVoiceAudioUrl(url)}
              placeholder="Голосовой ввод или текст: «Установи график 2/2 с 9 до 21» или «Сделай 5/2»..."
              minHeight="65px"
              isLightTheme={isLightTheme}
            />
          </div>

          {editorTab === 'month' && (
            <div className="space-y-3">
              <div className={`p-3.5 rounded-2xl border text-sm font-bold flex flex-wrap items-center justify-between gap-2 ${
                isLightTheme ? 'bg-amber-100/70 border-amber-300 text-amber-950' : 'bg-amber-500/10 border-amber-400/30 text-[#F4EE8E]'
              }`}>
                <div className="flex items-center gap-2">
                  <Calendar size={16} className={isLightTheme ? 'text-amber-800 shrink-0' : 'text-[#E7C768] shrink-0'} />
                  <span>
                    Период: 30 дней вперед с сегодня ({todayDay} {MONTH_NAMES_RU_GEN[todayMonth]} {todayYear})
                  </span>
                </div>
              </div>

              {/* Template Selector for 30 Days */}
              <div className={`p-3.5 rounded-2xl border space-y-2.5 ${
                isLightTheme ? 'bg-white/80 border-amber-300 shadow-2xs' : 'bg-[#140A01]/60 border-amber-400/30'
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className={`text-sm font-bold flex items-center gap-1.5 ${
                    isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'
                  }`}>
                    <Sparkles size={15} className={isLightTheme ? 'text-amber-800' : 'text-[#E7C768]'} />
                    <span>Применить шаблон к графику на 30 дней:</span>
                  </label>
                  <span className={`text-sm font-bold ${isLightTheme ? 'text-stone-600' : 'text-amber-200/80'}`}>
                    {customShiftTemplates.length} сохраненных шаблонов
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
                  <select
                    value={selectedTemplateFor30Days}
                    onChange={(e) => setSelectedTemplateFor30Days(e.target.value)}
                    className={`flex-1 min-w-0 sm:min-w-[220px] min-h-[44px] px-3 py-2 rounded-xl text-sm font-bold border focus:outline-none cursor-pointer ${
                      isLightTheme ? 'bg-amber-50/70 border-amber-300 text-amber-950' : 'bg-[#140A01] border-amber-400/40 text-amber-100'
                    }`}
                  >
                    <optgroup label="Стандартные шаблоны">
                      <option value="preset-5-2">5/2 (09:00 - 18:00, обед 13:00-14:00)</option>
                      <option value="preset-2-2">2/2 (09:00 - 21:00, обед 13:00-14:00)</option>
                      <option value="preset-3-3">3/3 (09:00 - 21:00, обед 13:00-14:00)</option>
                      <option value="preset-1-3">1/3 Суточная 24ч (08:30 - 08:30)</option>
                      <option value="preset-6-1">6/1 (09:00 - 18:00)</option>
                      <option value="preset-night-2-2">2/2 Ночная смена (21:00 - 07:00)</option>
                    </optgroup>

                    {customShiftTemplates.length > 0 && (
                      <optgroup label="Сохраненные шаблоны в базе данных">
                        {customShiftTemplates.map(tpl => (
                          <option key={`opt-tpl-${tpl.id}`} value={tpl.id}>
                            {tpl.name} ({tpl.workStart}-{tpl.workEnd}, {tpl.patternType})
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>

                  <button
                    type="button"
                    disabled={isSavingBatch}
                    onClick={() => setIsWorkflowOpen(true)}
                    className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 text-sm font-bold border border-amber-400 shadow-md cursor-pointer hover:brightness-110 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <Sparkles size={15} />
                    <span>Применить шаблон</span>
                  </button>
                </div>
              </div>

              {/* 30-Day Lookahead List with DROPDOWN SELECTORS, WORK TIME & LUNCH EDITORS */}
              <div className="space-y-2.5">
                {lookahead30Days.map(ld => {
                  const isNonWorking = ['weekend', 'vacation', 'sick', 'trip', 'dayoff'].includes(ld.type);

                  return (
                    <div
                      key={`lookahead-day-${ld.dateStr}`}
                      className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-3 transition-colors ${
                        ld.isToday
                          ? (isLightTheme ? 'bg-amber-100/90 border-2 border-amber-500 shadow-sm' : 'bg-amber-500/20 border-2 border-amber-400')
                          : (isLightTheme ? 'bg-amber-50/40 border-amber-200 hover:bg-amber-50' : 'bg-[#140A01]/50 border-amber-400/25 hover:bg-amber-500/10')
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 sm:min-w-[150px]">
                        <span className={`w-9 h-9 rounded-xl font-mono font-black text-sm flex items-center justify-center shrink-0 border ${
                          ld.isToday
                            ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 border-amber-400 shadow-xs'
                            : isLightTheme ? 'bg-amber-200/80 text-amber-950 border-amber-300' : 'bg-amber-500/20 text-[#F4EE8E] border-amber-400/40'
                        }`}>
                          {ld.day}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={`text-sm font-black ${
                              isLightTheme ? 'text-amber-950' : 'text-white'
                            }`}>
                              {ld.day} {MONTH_NAMES_RU_GEN[ld.month]}
                            </span>
                            <span className={`text-sm font-bold px-1.5 py-0.5 rounded border ${
                              ld.dow === 0 || ld.dow === 6
                                ? isLightTheme
                                  ? 'bg-rose-100 text-rose-900 border-rose-300'
                                  : 'bg-rose-500/15 text-rose-300 border-rose-400/30'
                                : isLightTheme
                                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                                  : 'bg-amber-500/15 text-amber-300 border-amber-400/30'
                            }`}>
                              {WEEK_DAY_NAMES_RU[ld.dow]}
                            </span>
                          </div>
                          {ld.isToday && (
                            <span className={`text-sm font-black ${isLightTheme ? 'text-amber-800' : 'text-[#F4EE8E]'}`}>
                              ★ Сегодня
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Dropdown Selector for Day Status */}
                      <div className="w-full sm:flex-1 sm:min-w-[190px]">
                        <select
                          value={ld.type}
                          onChange={(e) => {
                            const newType = e.target.value as ShiftType;
                            const isNowNonWorking = ['weekend', 'vacation', 'sick', 'trip', 'dayoff'].includes(newType);
                            let startToPass = '';
                            let endToPass = '';
                            let l1StartToPass = '';
                            let l1EndToPass = '';
                            let l2StartToPass = '20:00';
                            let l2EndToPass = '21:00';

                            if (!isNowNonWorking) {
                              if (newType === 'night') {
                                startToPass = '21:00';
                                endToPass = '07:00';
                                l1StartToPass = '01:00';
                                l1EndToPass = '02:00';
                              } else if (newType === 'daily') {
                                startToPass = '08:30';
                                endToPass = '08:30';
                                l1StartToPass = '13:00';
                                l1EndToPass = '14:00';
                                l2StartToPass = '20:00';
                                l2EndToPass = '21:00';
                              } else {
                                // Day or holiday
                                const isLongDay = editingEmployeeSchedule?.patternType === '2/2' || editingEmployeeSchedule?.patternType === '3/3';
                                startToPass = isLongDay ? '09:00' : (ld.workStart && ld.workStart !== '21:00' && ld.workStart !== '08:30' ? ld.workStart : '09:00');
                                endToPass = isLongDay ? '21:00' : (ld.workEnd && ld.workEnd !== '07:00' && ld.workEnd !== '08:30' ? ld.workEnd : '18:00');
                                l1StartToPass = '13:00';
                                l1EndToPass = '14:00';
                              }
                            }

                            onUpdate30DayShift(
                              ld.dateStr,
                              newType,
                              startToPass,
                              endToPass,
                              l1StartToPass,
                              l1EndToPass,
                              l2StartToPass,
                              l2EndToPass
                            );
                          }}
                          className={`w-full min-h-[44px] px-3 py-2 rounded-xl text-sm font-bold border focus:outline-none cursor-pointer ${
                            isLightTheme ? 'bg-white border-amber-400 text-amber-950' : 'bg-[#140A01] border-amber-400/40 text-amber-100'
                          }`}
                        >
                          {Object.entries(SHIFT_TYPES_CONFIG).map(([key, config]) => (
                            <option key={key} value={key}>
                              {config.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Time & Lunch Inputs OR Non-working label */}
                      {isNonWorking ? (
                        <div className={`w-full sm:w-auto text-sm font-bold italic shrink-0 py-2.5 px-3.5 rounded-xl border ${
                          isLightTheme ? 'bg-amber-100/90 border-amber-300 text-amber-950 font-extrabold shadow-2xs' : 'bg-[#140A01]/60 border-amber-400/30 text-amber-200/80'
                        }`}>
                          Нерабочий день (без часов работы)
                        </div>
                      ) : (
                        <div className="w-full sm:w-auto flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 shrink-0">
                          {/* Work Hours */}
                          <div className={`flex flex-wrap items-center gap-1.5 px-3 py-2 rounded-xl border shadow-xs min-h-[44px] ${
                            isLightTheme ? 'bg-amber-100/70 border-amber-300 text-amber-950' : 'bg-[#140A01]/70 border-amber-400/30 text-amber-100'
                          }`}>
                            <Clock size={14} className={`shrink-0 ${isLightTheme ? 'text-amber-700' : 'text-[#F4EE8E]'}`} />
                            <span className={`text-sm font-bold ${isLightTheme ? 'text-amber-950' : 'text-amber-200'}`}>С:</span>
                            <input
                              type="time"
                              value={ld.workStart || (ld.type === 'night' ? '21:00' : ld.type === 'daily' ? '08:30' : '09:00')}
                              onChange={(e) => onUpdate30DayShift(ld.dateStr, ld.type, e.target.value, ld.workEnd || '18:00', ld.lunch1Start || '13:00', ld.lunch1End || '14:00', ld.lunch2Start || '20:00', ld.lunch2End || '21:00')}
                              className={`min-h-[36px] px-2 py-1 rounded border text-sm font-mono font-bold focus:outline-none ${
                                isLightTheme ? 'bg-white border-amber-400 text-amber-950' : 'bg-[#140A01] border-amber-400/40 text-[#F4EE8E]'
                              }`}
                            />
                            <span className={`text-sm font-bold ${isLightTheme ? 'text-amber-950' : 'text-amber-200'}`}>До:</span>
                            <input
                              type="time"
                              value={ld.workEnd || (ld.type === 'night' ? '07:00' : ld.type === 'daily' ? '08:30' : '18:00')}
                              onChange={(e) => onUpdate30DayShift(ld.dateStr, ld.type, ld.workStart || '09:00', e.target.value, ld.lunch1Start || '13:00', ld.lunch1End || '14:00', ld.lunch2Start || '20:00', ld.lunch2End || '21:00')}
                              className={`min-h-[36px] px-2 py-1 rounded border text-sm font-mono font-bold focus:outline-none ${
                                isLightTheme ? 'bg-white border-amber-400 text-amber-950' : 'bg-[#140A01] border-amber-400/40 text-[#F4EE8E]'
                              }`}
                            />
                          </div>

                          {/* Lunch 1 */}
                          <div className={`flex flex-wrap items-center gap-1.5 px-3 py-2 rounded-xl border min-h-[44px] ${
                            isLightTheme ? 'bg-amber-50 border-amber-200 text-amber-950' : 'bg-[#140A01]/70 border-amber-400/30 text-amber-100'
                          }`}>
                            <span className={`text-sm font-bold ${isLightTheme ? 'text-amber-800' : 'text-[#F4EE8E]'}`}>
                              {ld.type === 'daily' ? 'Обед 1:' : 'Обед:'}
                            </span>
                            <input
                              type="time"
                              value={ld.lunch1Start || (ld.type === 'night' ? '01:00' : '13:00')}
                              onChange={(e) => onUpdate30DayShift(ld.dateStr, ld.type, ld.workStart || '09:00', ld.workEnd || '18:00', e.target.value, ld.lunch1End || '14:00', ld.lunch2Start || '20:00', ld.lunch2End || '21:00')}
                              className={`min-h-[36px] px-1.5 py-0.5 rounded border text-sm font-mono font-bold focus:outline-none ${
                                isLightTheme ? 'bg-white border-amber-300 text-amber-950' : 'bg-[#140A01] border-amber-400/40 text-amber-100'
                              }`}
                            />
                            <span className="text-sm font-bold">-</span>
                            <input
                              type="time"
                              value={ld.lunch1End || (ld.type === 'night' ? '02:00' : '14:00')}
                              onChange={(e) => onUpdate30DayShift(ld.dateStr, ld.type, ld.workStart || '09:00', ld.workEnd || '18:00', ld.lunch1Start || '13:00', e.target.value, ld.lunch2Start || '20:00', ld.lunch2End || '21:00')}
                              className={`min-h-[36px] px-1.5 py-0.5 rounded border text-sm font-mono font-bold focus:outline-none ${
                                isLightTheme ? 'bg-white border-amber-300 text-amber-950' : 'bg-[#140A01] border-amber-400/40 text-amber-100'
                              }`}
                            />
                          </div>

                          {/* Lunch 2 for Daily 24h Shift */}
                          {ld.type === 'daily' && (
                            <div className={`flex flex-wrap items-center gap-1.5 px-3 py-2 rounded-xl border min-h-[44px] ${
                              isLightTheme ? 'bg-orange-50 border-orange-300 text-amber-950' : 'bg-orange-950/30 border-orange-500/40 text-amber-200'
                            }`}>
                              <span className={`text-sm font-bold ${isLightTheme ? 'text-orange-700' : 'text-orange-300'}`}>Обед 2:</span>
                              <input
                                type="time"
                                value={ld.lunch2Start || '20:00'}
                                onChange={(e) => onUpdate30DayShift(ld.dateStr, ld.type, ld.workStart || '08:30', ld.workEnd || '08:30', ld.lunch1Start || '13:00', ld.lunch1End || '14:00', e.target.value, ld.lunch2End || '21:00')}
                                className={`min-h-[36px] px-1.5 py-0.5 rounded border text-sm font-mono font-bold focus:outline-none ${
                                  isLightTheme ? 'bg-white border-orange-300 text-amber-950' : 'bg-[#140A01] border-orange-500/40 text-amber-100'
                                }`}
                              />
                              <span className="text-sm font-bold">-</span>
                              <input
                                type="time"
                                value={ld.lunch2End || '21:00'}
                                onChange={(e) => onUpdate30DayShift(ld.dateStr, ld.type, ld.workStart || '08:30', ld.workEnd || '08:30', ld.lunch1Start || '13:00', ld.lunch1End || '14:00', ld.lunch2Start || '20:00', e.target.value)}
                                className={`min-h-[36px] px-1.5 py-0.5 rounded border text-sm font-mono font-bold focus:outline-none ${
                                  isLightTheme ? 'bg-white border-orange-300 text-amber-950' : 'bg-[#140A01] border-orange-500/40 text-amber-100'
                                }`}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {editorTab === 'template' && (
            <div className="space-y-4">
              <div className={`p-4 rounded-2xl border space-y-3 ${
                isLightTheme ? 'bg-white/80 border-amber-300' : 'bg-[#140A01]/60 border-amber-400/30'
              }`}>
                <h4 className="text-sm font-black">
                  Быстрое применение стандартного режима
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => onApplyAnnualTemplate(editingEmployeeSchedule.id, '5/2', 'day')}
                    className="min-h-[44px] p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-left cursor-pointer transition-all"
                  >
                    <div className="font-black text-sm">5/2 (Дневная)</div>
                    <div className={`text-sm mt-0.5 ${isLightTheme ? 'text-stone-700' : 'text-amber-200/80'}`}>09:00 - 18:00, обед 13:00-14:00</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onApplyAnnualTemplate(editingEmployeeSchedule.id, '2/2', 'day')}
                    className="min-h-[44px] p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-left cursor-pointer transition-all"
                  >
                    <div className="font-black text-sm">2/2 (Дневная)</div>
                    <div className={`text-sm mt-0.5 ${isLightTheme ? 'text-stone-700' : 'text-amber-200/80'}`}>09:00 - 21:00, обед 13:00-14:00</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onApplyAnnualTemplate(editingEmployeeSchedule.id, '1/3', 'daily')}
                    className="min-h-[44px] p-3.5 rounded-2xl border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 text-left cursor-pointer transition-all"
                  >
                    <div className="font-black text-sm">1/3 (Суточная 24ч)</div>
                    <div className={`text-sm mt-0.5 ${isLightTheme ? 'text-stone-700' : 'text-amber-200/80'}`}>08:30 - 08:30, 2 обеда</div>
                  </button>
                </div>
              </div>

              {/* Timezone Selector for Employee */}
              <div className={`p-4 rounded-2xl border space-y-2 ${
                isLightTheme ? 'bg-amber-50/70 border-amber-200' : 'bg-[#140A01]/60 border-amber-400/30'
              }`}>
                <label className={`text-sm font-bold block ${
                  isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'
                }`}>
                  Часовой пояс сотрудника:
                </label>
                <select
                  value={editingEmployeeSchedule.timezone}
                  onChange={(e) => onUpdateEmployeeTimezone(editingEmployeeSchedule.id, e.target.value)}
                  className={`w-full min-h-[44px] px-3 py-2 rounded-xl text-sm font-bold border focus:outline-none cursor-pointer ${
                    isLightTheme ? 'bg-white border-amber-300 text-amber-950' : 'bg-[#140A01] border-amber-400/40 text-amber-100'
                  }`}
                >
                  {TIMEZONES_LIST.map(tz => (
                    <option key={tz.id} value={tz.id}>{tz.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

        </div>

        {/* Modal Toast Notification */}
        {saveSuccessToast && (
          <div className="px-5 py-2.5 bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 text-sm font-bold border-t border-b border-amber-400 flex items-center justify-between gap-2 animate-fadeIn">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles size={16} className="shrink-0" />
              <span className="break-words">{saveSuccessToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setSaveSuccessToast(null)}
              className="min-h-[36px] min-w-[36px] flex items-center justify-center hover:bg-black/10 rounded cursor-pointer shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Modal Footer */}
        <div className={`p-4 border-t flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 ${
          isLightTheme ? 'bg-amber-100/50 border-amber-300' : 'bg-amber-500/5 border-amber-400/30'
        }`}>
          <button
            type="button"
            onClick={() => onDeleteClick(editingEmployeeSchedule)}
            className={`w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-2xl font-bold text-sm border cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
              isLightTheme
                ? 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-400'
                : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-400/30'
            }`}
          >
            <Trash2 size={16} />
            <span>Сбросить график</span>
          </button>

          <button
            type="button"
            disabled={isSavingBatch}
            onClick={async () => {
              await onSaveBatch();
              onClose();
            }}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-black text-sm shadow-md cursor-pointer hover:brightness-105 active:scale-95 flex items-center justify-center gap-1.5"
          >
            <Save size={16} />
            <span>{isSavingBatch ? 'Сохранение...' : 'Сохранить и закрыть'}</span>
          </button>
        </div>
      </div>

      {/* 30-Day Sequential Template Application Workflow Modal */}
      {isWorkflowOpen && (
        <ScheduleTemplateWorkflowModal
          isOpen={isWorkflowOpen}
          onClose={() => setIsWorkflowOpen(false)}
          employee={editingEmployeeSchedule}
          templateKey={selectedTemplateFor30Days}
          customShiftTemplates={customShiftTemplates}
          deviceClock={deviceClock}
          isLightTheme={isLightTheme}
          onComplete={(updatedSchedule) => {
            if (onBatchUpdateSchedule) {
              onBatchUpdateSchedule(updatedSchedule);
            }
            setSaveSuccessToast('Шаблон успешно применен ко всем 30 дням графика!');
            setTimeout(() => setSaveSuccessToast(null), 4000);
          }}
        />
      )}

      {/* AI Voice and Text Schedule Workflow Modal */}
      {isAiWorkflowOpen && (
        <ScheduleAiWorkflowModal
          isOpen={isAiWorkflowOpen}
          onClose={() => setIsAiWorkflowOpen(false)}
          employee={editingEmployeeSchedule}
          promptText={aiVoicePrompt}
          customShiftTemplates={customShiftTemplates}
          deviceClock={deviceClock}
          isLightTheme={isLightTheme}
          onComplete={(updatedSchedule, summaryMsg) => {
            if (onBatchUpdateSchedule) {
              onBatchUpdateSchedule(updatedSchedule);
            }
            setSaveSuccessToast(summaryMsg || 'График успешно обновлен нейросетью!');
            setTimeout(() => setSaveSuccessToast(null), 5000);
            setAiVoicePrompt('');
            setAiVoiceAudioUrl(null);
          }}
        />
      )}
    </div>
  );
};
