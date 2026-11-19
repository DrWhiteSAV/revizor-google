import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, CheckCircle2, X, AlertTriangle, User, Calendar, Clock } from 'lucide-react';
import { EmployeeSchedule, ShiftType, CustomShiftTemplate, isPublicHoliday, calcWorkHours } from './types';

interface ScheduleAiWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: EmployeeSchedule | null;
  promptText: string;
  customShiftTemplates?: CustomShiftTemplate[];
  deviceClock: Date;
  isLightTheme: boolean;
  onComplete: (updatedSchedule: EmployeeSchedule, summaryMessage: string) => void;
}

const WAITING_PHRASES = [
  "Нейросеть расшифровывает ваш запрос и определяет цикличность...",
  "Анализирую параметры рабочих смен и индивидуальные замены...",
  "Рассчитываю перерывы на обед и продолжительность смен...",
  "Строю индивидуальное 30-дневное расписание сотрудника...",
  "Сверяю с производственным календарем и праздничными днями...",
  "Применяю триггеры пересчета балансов и рабочих часов...",
  "Финализирую диаграмму для сотрудника..."
];

export const ScheduleAiWorkflowModal: React.FC<ScheduleAiWorkflowModalProps> = ({
  isOpen,
  onClose,
  employee,
  promptText,
  customShiftTemplates = [],
  deviceClock,
  isLightTheme,
  onComplete
}) => {
  const [progressPct, setProgressPct] = useState<number>(15);
  const [stepLabel, setStepLabel] = useState<string>('Шаг 1 из 4: Анализ параметров сотрудника и контекста графика...');
  const [phraseIndex, setPhraseIndex] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [parsedSummary, setParsedSummary] = useState<any>(null);
  const [summaryMessage, setSummaryMessage] = useState<string>('');
  const [completedSchedule, setCompletedSchedule] = useState<EmployeeSchedule | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef<number>(0);

  useEffect(() => {
    if (!isOpen || !employee) {
      // Cleanup when modal closes
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setProgressPct(15);
      setElapsedSeconds(0);
      setIsCompleted(false);
      setErrorMessage(null);
      setParsedSummary(null);
      setSummaryMessage('');
      setCompletedSchedule(null);
      return;
    }

    // New workflow run on open
    const currentRequestId = ++requestIdRef.current;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setProgressPct(15);
    setElapsedSeconds(0);
    setIsCompleted(false);
    setErrorMessage(null);
    setParsedSummary(null);
    setSummaryMessage('');
    setCompletedSchedule(null);
    setStepLabel('Шаг 1 из 4: Анализ параметров сотрудника и контекста графика...');

    const startTime = Date.now();

    // Timer & Progress ticker
    const timerInterval = setInterval(() => {
      if (requestIdRef.current !== currentRequestId) return;
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(elapsed);

      // Smooth progress curve while waiting for AI response (approaches 85% smoothly)
      setProgressPct(prev => {
        if (prev >= 90) return prev;
        if (elapsed < 2) return 25;
        if (elapsed < 5) return 40;
        if (elapsed < 8) return 55;
        if (elapsed < 12) return 70;
        if (elapsed < 16) return 80;
        return Math.min(88, prev + 1);
      });
    }, 1000);

    const phraseInterval = setInterval(() => {
      if (requestIdRef.current !== currentRequestId) return;
      setPhraseIndex(prev => (prev + 1) % WAITING_PHRASES.length);
    }, 3000);

    const executeWorkflow = async () => {
      try {
        setStepLabel('Шаг 1 из 4: Анализ параметров сотрудника и контекста графика...');
        await new Promise(r => setTimeout(r, 400));
        if (controller.signal.aborted || requestIdRef.current !== currentRequestId) return;

        setStepLabel('Шаг 2 из 4: Распознавание цикличности и смен...');

        const base = new Date(deviceClock);
        const todayStr = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;

        const userStr = typeof window !== 'undefined' ? localStorage.getItem('rr_user') : null;
        const currentUser = userStr ? JSON.parse(userStr) : null;
        const loggedInUserId = currentUser?.id || '91827364501';
        const userUid = (employee as any)?.user_id || (employee as any)?.userId || employee.id || '18209345914';

        const res = await fetch('/api/schedules/ai-format', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            prompt: promptText,
            author_id: loggedInUserId,
            employee_id: employee.id,
            employee_name: employee.name,
            company_id: (employee as any)?.company_id || 'flagship-main',
            base_date: todayStr,
            user_id: userUid,
            custom_templates: customShiftTemplates || [],
            existing_shifts_30_days: (employee as any)?.shifts || []
          })
        });

        if (!res.ok) {
          throw new Error(`Ошибка сервера ИИ (${res.status})`);
        }

        const data = await res.json();
        if (controller.signal.aborted || requestIdRef.current !== currentRequestId) return;

        if (!data.success) {
          throw new Error(data.error || 'Не удалось распознать параметры графика');
        }

        setStepLabel('Шаг 3 из 4: Запись смен и производственного календаря в базу данных...');
        setProgressPct(92);
        await new Promise(r => setTimeout(r, 300));
        if (controller.signal.aborted || requestIdRef.current !== currentRequestId) return;

        const parsed = data.parsedData || {};
        setParsedSummary(parsed);
        const finalSummaryMsg = data.summaryMessage || `ИИ диспетчер: для ${employee.name} успешно оформлен график!`;
        setSummaryMessage(finalSummaryMsg);

        setStepLabel('Шаг 4 из 4: Синхронизация диаграммы смен...');
        setProgressPct(98);
        await new Promise(r => setTimeout(r, 200));
        if (controller.signal.aborted || requestIdRef.current !== currentRequestId) return;

        // Build updated schedule entity for frontend state and cascade to all shifts
        const updatedOverrides = { ...(employee.calendar_overrides || {}) };
        const newShiftsMap = new Map<string, any>();

        const formattedGeneratedShifts = (data.generatedShifts || []).map((sh: any) => {
          const dateStr = sh.dateStr;
          const sType = (sh.type || 'day') as ShiftType;
          const isHol = isPublicHoliday(sh.year, sh.month - 1, sh.day);

          let hoursText = '';
          const sTypeStr = sType as string;
          if (sTypeStr === 'weekend') hoursText = 'Выходной';
          else if (sTypeStr === 'vacation') hoursText = 'Отпуск';
          else if (sTypeStr === 'sick') hoursText = 'Больничный';
          else if (sTypeStr === 'trip') hoursText = 'Командировка';
          else if (sTypeStr === 'dayoff') hoursText = 'Отгул';
          else if (sTypeStr === 'holiday') hoursText = `${sh.workStart || '09:00'} - ${sh.workEnd || '18:00'} (Праздник x2)`;
          else if (sTypeStr === 'night') hoursText = `${sh.workStart || '21:00'} - ${sh.workEnd || '07:00'} (ночная 🌙, +1 день)`;
          else if (sTypeStr === 'daily') hoursText = `${sh.workStart || '08:30'} - ${sh.workEnd || '08:30'} (суточная 24ч)`;
          else hoursText = `${sh.workStart || '09:00'} - ${sh.workEnd || '18:00'} (обед ${sh.lunchStart || '13:00'}-${sh.lunchEnd || '14:00'})`;

          const workH = typeof sh.hours === 'number' ? sh.hours : calcWorkHours(sh.workStart, sh.workEnd, sh.lunchStart, sh.lunchEnd, sType);

          updatedOverrides[dateStr] = {
            type: sType,
            workStart: sh.workStart,
            workEnd: sh.workEnd,
            lunchStart: sh.lunchStart,
            lunchEnd: sh.lunchEnd,
            lunch2Start: sh.lunch2Start,
            lunch2End: sh.lunch2End,
            hours: workH,
            hours_text: hoursText
          };

          const shiftItem = {
            id: `${employee.id}_${dateStr}`,
            employee_id: employee.id,
            day: sh.day,
            month: sh.month,
            year: sh.year,
            shiftDate: dateStr,
            shift_date: dateStr,
            type: sType,
            shift_type: sType,
            hours: hoursText,
            hours_text: hoursText,
            isHoliday: isHol,
            is_holiday: isHol ? 1 : 0,
            workHours: workH,
            work_hours: workH,
            workStart: sh.workStart,
            work_start: sh.workStart,
            workEnd: sh.workEnd,
            work_end: sh.workEnd,
            lunchStart: sh.lunchStart,
            lunch_start: sh.lunchStart,
            lunchEnd: sh.lunchEnd,
            lunch_end: sh.lunchEnd,
            lunch2Start: sh.lunch2Start,
            lunch2_start: sh.lunch2Start,
            lunch2End: sh.lunch2End,
            lunch2_end: sh.lunch2End
          };

          newShiftsMap.set(dateStr, shiftItem);
          return shiftItem;
        });

        const remainingShifts = (employee.shifts || []).filter((sh: any) => {
          const dStr = sh.shiftDate || sh.shift_date || (sh.year && sh.month && sh.day ? `${sh.year}-${String(sh.month).padStart(2, '0')}-${String(sh.day).padStart(2, '0')}` : null);
          return dStr ? !newShiftsMap.has(dStr) : true;
        });

        const finalShifts = [...remainingShifts, ...formattedGeneratedShifts];
        const totalH = finalShifts.reduce((acc: number, cur: any) => acc + (Number(cur.workHours || cur.work_hours) || 0), 0);

        const isSpecOnly = Boolean(parsed.specificDatesOnly);
        const finalPat = isSpecOnly ? employee.patternType : (parsed.patternType || employee.patternType || '5/2');
        const finalWStart = isSpecOnly ? (employee.default_work_start || '09:00') : (parsed.workStart || employee.default_work_start || '09:00');
        const finalWEnd = isSpecOnly ? (employee.default_work_end || '18:00') : (parsed.workEnd || employee.default_work_end || '18:00');
        const finalLStart = isSpecOnly ? (employee.default_lunch_start || '13:00') : (parsed.lunchStart || employee.default_lunch_start || '13:00');
        const finalLEnd = isSpecOnly ? (employee.default_lunch_end || '14:00') : (parsed.lunchEnd || employee.default_lunch_end || '14:00');

        const updatedEmployeeSchedule: EmployeeSchedule = {
          ...employee,
          patternType: finalPat,
          pattern_type: finalPat,
          default_work_start: finalWStart,
          default_work_end: finalWEnd,
          default_lunch_start: finalLStart,
          default_lunch_end: finalLEnd,
          calendar_overrides: updatedOverrides,
          shifts: finalShifts as any,
          totalHoursMonth: Math.round(totalH * 10) / 10,
          shiftConfig: {
            dayHours: `${finalWStart} - ${finalWEnd}`,
            lunchHours: `${finalLStart} - ${finalLEnd}`,
            nightHours: (parsed.shiftCategory === 'night') ? `${finalWStart} - ${finalWEnd}` : '21:00 - 07:00',
            dailyHours: (parsed.shiftCategory === 'daily') ? `${finalWStart} - ${finalWEnd}` : '08:30 - 08:30'
          },
          shift_config: {
            pattern_type: finalPat,
            shift_category: isSpecOnly ? (employee.shift_config?.shift_category || 'day') : (parsed.shiftCategory || 'day'),
            work_start: finalWStart,
            work_end: finalWEnd,
            lunch_start: finalLStart,
            lunch_end: finalLEnd,
            lunch2_start: isSpecOnly ? (employee.shift_config?.lunch2_start || '') : (parsed.lunch2Start || ''),
            lunch2_end: isSpecOnly ? (employee.shift_config?.lunch2_end || '') : (parsed.lunch2End || ''),
            selected_days: isSpecOnly ? (employee.shift_config?.selected_days || [1, 2, 3, 4, 5]) : (parsed.selectedDays || [1, 2, 3, 4, 5])
          }
        };

        setCompletedSchedule(updatedEmployeeSchedule);
        setProgressPct(100);
        setIsCompleted(true);
        setStepLabel('График успешно сформирован нейросетью и зафиксирован!');
      } catch (err: any) {
        if (controller.signal.aborted || requestIdRef.current !== currentRequestId) return;
        console.error('Schedule AI Workflow error:', err);
        setErrorMessage(err.message || 'Ошибка обработки нейросетью');
      } finally {
        clearInterval(timerInterval);
        clearInterval(phraseInterval);
      }
    };

    executeWorkflow();

    return () => {
      controller.abort();
      clearInterval(timerInterval);
      clearInterval(phraseInterval);
    };
  }, [isOpen, employee?.id]);

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    onClose();
  };

  const handleApplyAndFinish = () => {
    if (completedSchedule) {
      onComplete(completedSchedule, summaryMessage);
    }
    onClose();
  };

  if (!isOpen || !employee) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans pointer-events-auto">
      <div 
        className={`relative w-full max-w-xl border-2 rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-col space-y-5 transition-all overflow-hidden ${
          isLightTheme 
            ? 'bg-[#FFFBF5]/95 border-amber-400/80 text-amber-950 shadow-[0_10px_40px_rgba(217,158,65,0.25)]' 
            : 'bg-[#1A0F02]/95 border-amber-400/60 text-white shadow-[0_0_50px_rgba(244,238,142,0.25)]'
        }`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b pb-3 border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 shadow-md">
              <Sparkles size={22} className="animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2">
                <span>ИИ-Оформление расписания</span>
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium flex items-center gap-1.5 mt-0.5">
                <User size={15} className="text-amber-500 shrink-0" />
                <span>Сотрудник: <strong>{employee.name}</strong></span>
                <span className="opacity-40">•</span>
                <span>{employee.role || 'Специалист'}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={isCompleted ? handleApplyAndFinish : handleCancel}
            className="p-2 rounded-xl text-zinc-500 hover:text-amber-500 transition-colors hover:bg-amber-400/10 cursor-pointer"
          >
            <X size={22} />
          </button>
        </div>

        {/* User Prompt Preview */}
        <div className={`p-4 rounded-2xl border text-sm font-medium leading-relaxed ${
          isLightTheme ? 'bg-amber-50/90 border-amber-200 text-amber-950' : 'bg-amber-950/30 border-amber-500/30 text-amber-200'
        }`}>
          <div className="flex items-center gap-2 text-sm font-bold text-amber-500 mb-1">
            <Sparkles size={15} />
            <span>Запрос руководителя:</span>
          </div>
          <p className="italic">«{promptText}»</p>
        </div>

        {/* Mascot & Animated Progress Card */}
        <div className={`p-5 sm:p-6 rounded-2xl border flex flex-col items-center text-center relative overflow-hidden ${
          isLightTheme ? 'bg-amber-50/50 border-amber-200/80' : 'bg-amber-950/20 border-amber-500/30'
        }`}>
          {/* Mascot Image */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 mb-3 flex items-center justify-center">
            <img
              src={errorMessage ? '/file/30/iirr4.png' : isCompleted ? '/file/28/iirr2.png' : '/file/27/iirr1.png'}
              alt="ИИ Ревизор"
              className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(231,199,104,0.4)] animate-pulse-slow"
              referrerPolicy="no-referrer"
            />
            {!isCompleted && !errorMessage && (
              <div 
                className="absolute inset-0 border-2 border-amber-400/40 rounded-full animate-ping pointer-events-none" 
                style={{ animationDuration: '2.5s' }} 
              />
            )}
          </div>

          {/* Cycling Status Label */}
          {!errorMessage ? (
            <div className="space-y-1.5 max-w-md w-full">
              <h4 className="text-sm sm:text-base font-bold text-amber-900 dark:text-[#F4EE8E]">
                {stepLabel}
              </h4>
              {!isCompleted && (
                <p className="text-sm text-zinc-600 dark:text-zinc-300 font-medium italic min-h-[36px] flex items-center justify-center animate-fade-in">
                  «{WAITING_PHRASES[phraseIndex]}»
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2 text-center text-amber-700 dark:text-amber-300">
              <div className="flex items-center justify-center gap-1.5 font-bold text-sm">
                <AlertTriangle size={18} />
                <span>Произошла ошибка при обработке</span>
              </div>
              <p className="text-sm opacity-90">{errorMessage}</p>
            </div>
          )}

          {/* Progress Bar & Percentage */}
          <div className="w-full mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm font-mono font-bold">
              <span className="text-zinc-500">Прогресс заполнения:</span>
              <span className="text-amber-500">{progressPct}%</span>
            </div>
            <div className="w-full h-3 rounded-full bg-black/30 overflow-hidden p-0.5 border border-amber-500/30">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] transition-all duration-300 shadow-[0_0_10px_rgba(231,199,104,0.8)]"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-sm text-zinc-500">
              <span>Прошло времени: {elapsedSeconds} сек</span>
              <span>{isCompleted ? 'Готово' : errorMessage ? 'Остановлено' : 'Обработка...'}</span>
            </div>
          </div>
        </div>

        {/* Success Parsed Summary Box */}
        {isCompleted && parsedSummary && (
          <div className={`p-4 rounded-2xl border space-y-2.5 animate-fade-in ${
            isLightTheme ? 'bg-amber-100/70 border-amber-300 text-amber-950' : 'bg-amber-500/10 border-amber-500/30 text-amber-100'
          }`}>
            <div className="flex items-center gap-2 text-sm font-bold text-amber-500">
              <CheckCircle2 size={18} className="text-amber-400" />
              <span>Результат анализа нейросети:</span>
            </div>
            
            {parsedSummary.specificDatesOnly && parsedSummary.specificDates?.length > 0 ? (
              <div className="p-3 rounded-xl bg-black/10 dark:bg-black/30 border border-amber-500/20 space-y-1.5">
                <span className="text-zinc-500 block text-sm font-semibold">Замена для конкретных дат:</span>
                {parsedSummary.specificDates.map((sd: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-sm font-medium">
                    <span className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-amber-500" />
                      <strong>{sd.date}</strong>
                    </span>
                    <span>
                      {sd.type === 'vacation' ? 'Отпуск' : sd.type === 'sick' ? 'Больничный' : sd.type === 'dayoff' ? 'Отгул' : sd.type === 'weekend' ? 'Выходной' : `${sd.workStart || '09:00'} - ${sd.workEnd || '18:00'}`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-sm">
                <div className="p-2.5 rounded-xl bg-black/10 dark:bg-black/30 border border-amber-500/20">
                  <span className="text-zinc-500 block text-sm font-semibold">Тип режима:</span>
                  <strong className="text-sm font-bold">{parsedSummary.patternType || '5/2'}</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-black/10 dark:bg-black/30 border border-amber-500/20">
                  <span className="text-zinc-500 block text-sm font-semibold">Рабочие часы:</span>
                  <strong className="text-sm font-bold">{parsedSummary.workStart || '09:00'} - {parsedSummary.workEnd || '18:00'}</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-black/10 dark:bg-black/30 border border-amber-500/20 col-span-2 sm:col-span-1">
                  <span className="text-zinc-500 block text-sm font-semibold">Обед:</span>
                  <strong className="text-sm font-bold">{parsedSummary.lunchStart || '13:00'} - {parsedSummary.lunchEnd || '14:00'}</strong>
                </div>
              </div>
            )}

            {summaryMessage && (
              <p className="text-sm text-zinc-600 dark:text-zinc-300 font-medium">
                {summaryMessage}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {!isCompleted ? (
            <button
              type="button"
              onClick={handleCancel}
              className={`px-4 py-2.5 rounded-xl border text-sm font-bold cursor-pointer transition-all ${
                isLightTheme ? 'border-zinc-300 text-zinc-700 hover:bg-zinc-100' : 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              Отменить операцию
            </button>
          ) : (
            <button
              type="button"
              onClick={handleApplyAndFinish}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-bold text-sm shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 size={18} />
              <span>Применить и закрыть</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
