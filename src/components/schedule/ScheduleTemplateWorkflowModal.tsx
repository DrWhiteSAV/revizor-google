import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, CheckCircle2, X, RefreshCw, Layers, Calendar, Clock } from 'lucide-react';
import { EmployeeSchedule, ShiftType, CustomShiftTemplate, SHIFT_TYPES_CONFIG, isPublicHoliday, calcWorkHours } from './types';

interface ScheduleTemplateWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: EmployeeSchedule | null;
  templateKey: string;
  customShiftTemplates: CustomShiftTemplate[];
  deviceClock: Date;
  isLightTheme: boolean;
  onComplete: (updatedSchedule: EmployeeSchedule) => void;
}

export const ScheduleTemplateWorkflowModal: React.FC<ScheduleTemplateWorkflowModalProps> = ({
  isOpen,
  onClose,
  employee,
  templateKey,
  customShiftTemplates,
  deviceClock,
  isLightTheme,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [progressPct, setProgressPct] = useState<number>(0);
  const [stepLabel, setStepLabel] = useState<string>('Инициализация рабочего процесса...');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isCancelled, setIsCancelled] = useState<boolean>(false);
  const [generatedDaysCount, setGeneratedDaysCount] = useState<number>(0);

  const abortRef = useRef<boolean>(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen || !employee) {
      setCurrentStep(0);
      setProgressPct(0);
      setElapsedSeconds(0);
      setIsCompleted(false);
      setIsCancelled(false);
      setGeneratedDaysCount(0);
      abortRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    abortRef.current = false;
    setIsCancelled(false);
    setIsCompleted(false);
    setProgressPct(5);
    setCurrentStep(1);
    setElapsedSeconds(0);

    timerRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    const runWorkflow = async () => {
      try {
        // Step 1: Analyze Template
        setStepLabel('Шаг 1 из 4: Анализ параметров шаблона и цикличности...');
        setProgressPct(15);
        await new Promise(r => setTimeout(r, 400));
        if (abortRef.current) return;

        let patternType: '5/2' | '2/2' | '3/3' | '1/3' | '6/1' = '5/2';
        let shiftCat: 'day' | 'night' | 'daily' = 'day';
        let wStart = '09:00';
        let wEnd = '18:00';
        let lStart = '13:00';
        let lEnd = '14:00';
        let l2Start = '20:00';
        let l2End = '21:00';
        let customSelectedDays: number[] | null = null;
        let tplFriendlyName = '5/2 Стандартный (09:00 - 18:00)';

        if (templateKey === 'preset-5-2') {
          patternType = '5/2';
          shiftCat = 'day';
          wStart = '09:00';
          wEnd = '18:00';
          lStart = '13:00';
          lEnd = '14:00';
          tplFriendlyName = '5/2 Дневная (09:00 - 18:00)';
        } else if (templateKey === 'preset-2-2') {
          patternType = '2/2';
          shiftCat = 'day';
          wStart = '09:00';
          wEnd = '21:00';
          lStart = '13:00';
          lEnd = '14:00';
          tplFriendlyName = '2/2 Дневная (09:00 - 21:00)';
        } else if (templateKey === 'preset-3-3') {
          patternType = '3/3';
          shiftCat = 'day';
          wStart = '09:00';
          wEnd = '21:00';
          lStart = '13:00';
          lEnd = '14:00';
          tplFriendlyName = '3/3 Дневная (09:00 - 21:00)';
        } else if (templateKey === 'preset-1-3') {
          patternType = '1/3';
          shiftCat = 'daily';
          wStart = '08:30';
          wEnd = '08:30';
          lStart = '13:00';
          lEnd = '14:00';
          l2Start = '20:00';
          l2End = '21:00';
          tplFriendlyName = '1/3 Суточная 24ч (08:30 - 08:30)';
        } else if (templateKey === 'preset-6-1') {
          patternType = '6/1';
          shiftCat = 'day';
          wStart = '09:00';
          wEnd = '18:00';
          lStart = '13:00';
          lEnd = '14:00';
          tplFriendlyName = '6/1 Рабочая неделя (09:00 - 18:00)';
        } else if (templateKey === 'preset-night-2-2') {
          patternType = '2/2';
          shiftCat = 'night';
          wStart = '21:00';
          wEnd = '07:00';
          lStart = '01:00';
          lEnd = '02:00';
          tplFriendlyName = '2/2 Ночные смены (21:00 - 07:00)';
        } else {
          const cleanTplId = templateKey.startsWith('custom-') ? templateKey.replace('custom-', '') : templateKey;
          const customTpl = customShiftTemplates.find(t => t.id === cleanTplId || t.id === templateKey);
          if (customTpl) {
            patternType = (customTpl.patternType || '5/2') as any;
            shiftCat = customTpl.shiftCategory || 'day';
            wStart = customTpl.workStart || '09:00';
            wEnd = customTpl.workEnd || '18:00';
            lStart = customTpl.lunchStart || '13:00';
            lEnd = customTpl.lunchEnd || '14:00';
            l2Start = customTpl.lunch2Start || '20:00';
            l2End = customTpl.lunch2End || '21:00';
            customSelectedDays = customTpl.selectedDays || null;
            tplFriendlyName = customTpl.name;
          }
        }

        // Step 2: Generate 30 days
        setCurrentStep(2);
        const base = new Date(deviceClock);
        base.setHours(0, 0, 0, 0);
        const generatedShifts = [];
        const newShiftsMap = new Map();

        for (let i = 0; i < 30; i++) {
          if (abortRef.current) return;
          const d = new Date(base);
          d.setDate(base.getDate() + i);
          const y = d.getFullYear();
          const m = d.getMonth() + 1;
          const day = d.getDate();
          const dow = d.getDay();
          const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isHol = isPublicHoliday(y, m - 1, day);

          let isWorking = true;
          if (customSelectedDays && customSelectedDays.length > 0) {
            isWorking = customSelectedDays.includes(dow);
          } else if (patternType === '2/2') {
            isWorking = (i % 4 === 0 || i % 4 === 1);
          } else if (patternType === '3/3') {
            isWorking = (i % 6 < 3);
          } else if (patternType === '1/3') {
            isWorking = (i % 4 === 0);
          } else if (patternType === '6/1') {
            isWorking = (dow !== 0);
          } else {
            // 5/2
            isWorking = (dow !== 0 && dow !== 6);
          }

          let sType: ShiftType = 'day';
          if (!isWorking) {
            sType = 'weekend';
          } else if (isHol) {
            sType = 'holiday';
          } else if (shiftCat === 'night') {
            sType = 'night';
          } else if (shiftCat === 'daily') {
            sType = 'daily';
          } else {
            sType = 'day';
          }

          const isNonWorking = ['weekend', 'vacation', 'sick', 'trip', 'dayoff'].includes(sType);
          const actualWorkStart = isNonWorking ? '' : wStart;
          const actualWorkEnd = isNonWorking ? '' : wEnd;
          const actualLunchStart = isNonWorking ? '' : lStart;
          const actualLunchEnd = isNonWorking ? '' : lEnd;
          const actualLunch2Start = sType === 'daily' ? l2Start : undefined;
          const actualLunch2End = sType === 'daily' ? l2End : undefined;

          let hoursText = '';
          const sTypeStr = sType as string;
          if (sTypeStr === 'weekend') hoursText = 'Выходной';
          else if (sTypeStr === 'vacation') hoursText = 'Отпуск';
          else if (sTypeStr === 'sick') hoursText = 'Больничный';
          else if (sTypeStr === 'trip') hoursText = 'Командировка';
          else if (sTypeStr === 'dayoff') hoursText = 'Отгул';
          else if (sTypeStr === 'holiday') hoursText = `${actualWorkStart} - ${actualWorkEnd} (Праздник x2)`;
          else if (sTypeStr === 'night') hoursText = `${actualWorkStart} - ${actualWorkEnd} (ночная 🌙, +1 день)`;
          else if (sTypeStr === 'daily') hoursText = `${actualWorkStart} - ${actualWorkEnd} (суточная 24ч)`;
          else hoursText = `${actualWorkStart} - ${actualWorkEnd} (обед ${actualLunchStart}-${actualLunchEnd})`;

          const workH = calcWorkHours(actualWorkStart, actualWorkEnd, actualLunchStart, actualLunchEnd, sType);

          const shiftObj = {
            id: `${employee.id}_${dateStr}`,
            day,
            month: m,
            year: y,
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
            workStart: actualWorkStart,
            work_start: actualWorkStart,
            workEnd: actualWorkEnd,
            work_end: actualWorkEnd,
            lunchStart: actualLunchStart,
            lunch_start: actualLunchStart,
            lunchEnd: actualLunchEnd,
            lunch_end: actualLunchEnd,
            lunch2Start: actualLunch2Start,
            lunch2End: actualLunch2End
          };

          generatedShifts.push(shiftObj);
          newShiftsMap.set(dateStr, shiftObj);
          setGeneratedDaysCount(i + 1);

          if (i % 6 === 0) {
            setStepLabel(`Шаг 2 из 4: Генерация смен и перерывов (день ${i + 1}/30)...`);
            setProgressPct(20 + Math.floor((i / 30) * 45));
            await new Promise(r => setTimeout(r, 60));
          }
        }

        if (abortRef.current) return;

        // Step 3: PostgreSQL Batch Write
        setCurrentStep(3);
        setStepLabel('Шаг 3 из 4: Запись 30-дневного пакета в базу данных PostgreSQL BD ProTalk...');
        setProgressPct(75);

        const shiftsToSave = generatedShifts.map(sh => ({
          employee_id: employee.id,
          shift_date: sh.shiftDate,
          year: sh.year,
          month: sh.month,
          day: sh.day,
          shift_type: sh.type,
          work_start: sh.workStart,
          work_end: sh.workEnd,
          lunch_start: sh.lunchStart,
          lunch_end: sh.lunchEnd,
          lunch2_start: sh.lunch2Start || null,
          lunch2_end: sh.lunch2End || null,
          hours_text: sh.hours
        }));

        const res = await fetch('/api/schedules/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employee_id: employee.id,
            pattern_type: patternType,
            shift_config: {
              work_start: wStart,
              work_end: wEnd,
              lunch_start: lStart,
              lunch_end: lEnd,
              lunch2_start: l2Start,
              lunch2_end: l2End,
              dayHours: `${wStart} - ${wEnd}`,
              lunchHours: `${lStart} - ${lEnd}`,
              nightHours: shiftCat === 'night' ? `${wStart} - ${wEnd}` : '21:00 - 07:00',
              dailyHours: shiftCat === 'daily' ? `${wStart} - ${wEnd}` : '08:30 - 08:30'
            },
            shifts: shiftsToSave
          })
        });

        if (abortRef.current) return;

        // Step 4: Finalize local state & triggers
        setCurrentStep(4);
        setStepLabel('Шаг 4 из 4: Фиксация триггеров и синхронизация интерфейса...');
        setProgressPct(95);
        await new Promise(r => setTimeout(r, 300));

        if (abortRef.current) return;

        setProgressPct(100);
        setIsCompleted(true);
        setStepLabel(`Готово! График "${tplFriendlyName}" успешно применен на все 30 дней.`);

        // Build final updated employee schedule
        const remainingShifts = (employee.shifts || []).filter((sh: any) => {
          const dStr = sh.shiftDate || sh.shift_date || (sh.year && sh.month && sh.day ? `${sh.year}-${String(sh.month).padStart(2, '0')}-${String(sh.day).padStart(2, '0')}` : null);
          return dStr ? !newShiftsMap.has(dStr) : true;
        });

        const finalShifts = [...remainingShifts, ...generatedShifts];
        const totalH = finalShifts.reduce((acc: number, cur: any) => acc + (Number(cur.workHours) || 0), 0);

        const updatedEmp: EmployeeSchedule = {
          ...employee,
          patternType,
          shiftConfig: {
            dayHours: `${wStart} - ${wEnd}`,
            lunchHours: `${lStart} - ${lEnd}`,
            nightHours: shiftCat === 'night' ? `${wStart} - ${wEnd}` : '21:00 - 07:00',
            dailyHours: shiftCat === 'daily' ? `${wStart} - ${wEnd}` : '08:30 - 08:30'
          },
          shifts: finalShifts as any,
          totalHoursMonth: Math.round(totalH * 10) / 10
        };

        onComplete(updatedEmp);

        // Auto close after brief pause so user sees 100% checkmark
        setTimeout(() => {
          if (!abortRef.current) {
            onClose();
          }
        }, 1200);

      } catch (err) {
        console.error('Workflow execution error:', err);
        setStepLabel('Произошла ошибка при применении шаблона в базе данных.');
      } finally {
        if (timerRef.current) clearInterval(timerRef.current);
      }
    };

    runWorkflow();

    return () => {
      abortRef.current = true;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, employee, templateKey]);

  if (!isOpen) return null;

  const handleCancel = () => {
    abortRef.current = true;
    setIsCancelled(true);
    if (timerRef.current) clearInterval(timerRef.current);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden transition-all ${
        isLightTheme ? 'bg-[#FFFBF5] border-amber-400 text-zinc-900' : 'bg-[#1A0F02] border-amber-500/40 text-white'
      }`}>
        {/* Header */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${
          isLightTheme ? 'bg-amber-100/60 border-amber-300' : 'bg-amber-500/10 border-amber-500/30'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-black shadow-md">
              {isCompleted ? <CheckCircle2 size={20} /> : <RefreshCw size={20} className="animate-spin" />}
            </div>
            <div>
              <h3 className="text-base font-black">
                {isCompleted ? 'Шаблон успешно применен!' : 'Применение шаблона к 30 дням'}
              </h3>
              <p className="text-sm text-zinc-600 dark:text-amber-200/70 font-medium">
                {employee?.name} • Воркфлоу синхронизации с PostgreSQL BD ProTalk
              </p>
            </div>
          </div>

          {!isCompleted && (
            <button
              type="button"
              onClick={handleCancel}
              className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-xl cursor-pointer transition-colors text-zinc-600 dark:text-zinc-300"
              title="Отменить операцию"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Progress Bar & Percentage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-black">
              <span className="text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <Layers size={14} />
                <span>Прогресс выполнения</span>
              </span>
              <span className="font-mono text-sm font-black text-amber-600 dark:text-amber-400">
                {progressPct}%
              </span>
            </div>

            <div className="w-full h-3 rounded-full bg-amber-500/15 overflow-hidden p-0.5 border border-amber-500/30">
              <div
                style={{ width: `${progressPct}%` }}
                className="h-full rounded-full bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] transition-all duration-300 shadow-sm"
              />
            </div>
          </div>

          {/* Current Step Label & Meta */}
          <div className={`p-4 rounded-2xl border ${
            isLightTheme ? 'bg-amber-50/70 border-amber-200' : 'bg-amber-500/5 border-amber-500/20'
          } space-y-2.5`}>
            <div className="text-sm font-bold flex items-start gap-2.5">
              <Sparkles size={18} className="text-amber-500 shrink-0 mt-0.5" />
              <span className="leading-snug">{stepLabel}</span>
            </div>

            <div className="pt-2 border-t border-amber-500/10 flex items-center justify-between text-xs font-mono text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1">
                <Calendar size={13} className="text-amber-500" />
                <span>Обработано: {generatedDaysCount} из 30 дней</span>
              </span>
              <span className="flex items-center gap-1">
                <Clock size={13} className="text-amber-500" />
                <span>Время: {elapsedSeconds} сек</span>
              </span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className={`p-4 border-t flex items-center justify-between gap-3 ${
          isLightTheme ? 'bg-amber-50 border-amber-200' : 'bg-white/5 border-white/10'
        }`}>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {isCompleted ? '✓ База данных синхронизирована' : 'Операция выполняется на сервере'}
          </span>

          <div className="flex items-center gap-2">
            {!isCompleted ? (
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 rounded-xl bg-transparent border border-amber-500/30 text-xs font-bold hover:bg-amber-500/10 cursor-pointer"
              >
                Отмена
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 text-xs font-black cursor-pointer hover:brightness-105 shadow-md"
              >
                Продолжить
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
