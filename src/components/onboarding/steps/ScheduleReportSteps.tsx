import React, { useState } from 'react';
import { Sparkles, Calendar, FileText, BellRing, Check, Loader2 } from 'lucide-react';
import { OnboardingPayload, StepDefinition } from '../types';
import { AudioField } from '../../voice/AudioField';
import { MiniAudioField } from '../../voice/MiniAudioField';
import { useOnboardingStore } from '../../../store/useOnboardingStore';

interface StepProps {
  step: StepDefinition;
  data: OnboardingPayload;
  isLightTheme: boolean;
  onJumpToTab: (tabId: string) => void;
}

export const ScheduleReportSteps: React.FC<StepProps> = ({ step, data, isLightTheme }) => {
  const { runAiAction, isProcessingAi } = useOnboardingStore();
  const userId = data.user_id;
  const mySched = data.context.mySchedule || {};
  const reportTemplates = data.context.reportTemplates || [];
  const reportRules = data.context.reportRules || [];
  const savedChats = data.context.savedChats || [];

  const [schedPrompt, setSchedPrompt] = useState('');
  const [pattern, setPattern] = useState<string>(mySched.pattern_type || '5/2');
  const [workStart, setWorkStart] = useState<string>(mySched.default_work_start || '09:00');
  const [workEnd, setWorkEnd] = useState<string>(mySched.default_work_end || '18:00');

  const [reportPrompt, setReportPrompt] = useState('');
  const [reportTitle, setReportTitle] = useState('Ежедневный рапорт смены');
  const [deadlineTime, setDeadlineTime] = useState('18:00');

  const [ruleTitle, setRuleTitle] = useState('Авто-доставка рапортов руководителю');
  const [destType, setDestType] = useState<'director_direct' | 'department_chat' | 'custom_chat'>('director_direct');
  const [targetChatId, setTargetChatId] = useState(savedChats[0]?.chat_id || '');

  const cardClass = isLightTheme
    ? 'rounded-2xl border border-amber-700/35 bg-[#FFFBF5]/85 p-4 text-amber-950'
    : 'rounded-2xl border border-[#E7C768]/35 bg-[#1A0F02]/55 p-4 text-amber-100';

  const inputClass = isLightTheme
    ? 'w-full rounded-xl border border-amber-700/40 bg-[#FFFBF5]/90 px-3.5 py-2.5 text-sm text-amber-950 placeholder-amber-900/45 focus:outline-none focus:border-amber-800'
    : 'w-full rounded-xl border border-[#E7C768]/35 bg-[#140A01]/65 px-3.5 py-2.5 text-sm text-white placeholder-amber-200/35 focus:outline-none focus:border-[#F4EE8E]';

  // STEP: SCHEDULES / SCHEDULE
  if (step.id === 'schedules' || step.id === 'schedule') {
    return (
      <div className="space-y-4 w-full min-w-0">
        <div className={cardClass}>
          <div className="flex flex-wrap gap-2 mb-4">
            {['5/2', '2/2', '3/3', '6/1'].map((pat) => (
              <button
                key={pat}
                type="button"
                onClick={() => setPattern(pat)}
                className={`px-4 py-2 rounded-xl border text-sm font-bold cursor-pointer transition-all ${
                  pattern === pat
                    ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 border-amber-400 shadow'
                    : isLightTheme
                    ? 'border-amber-700/40 text-amber-950 hover:bg-amber-100'
                    : 'border-[#E7C768]/35 text-amber-100 hover:bg-amber-400/10'
                }`}
              >
                Режим {pat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-bold mb-1.5">Начало смены</label>
              <input type="time" value={workStart} onChange={(e) => setWorkStart(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1.5">Окончание смены</label>
              <input type="time" value={workEnd} onChange={(e) => setWorkEnd(e.target.value)} className={inputClass} />
            </div>
          </div>

          <AudioField
            label="Или продиктуйте график голосом для ИИ-диспетчера"
            value={schedPrompt}
            onChange={setSchedPrompt}
            placeholder={step.voicePlaceholder}
            isLightTheme={isLightTheme}
            compactVoiceButton={true}
            minHeight="120px"
          />

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={isProcessingAi}
              onClick={() =>
                runAiAction(userId, step.id, {
                  action: schedPrompt.trim() ? 'ai_generate' : 'save',
                  input: schedPrompt,
                  payload: { pattern_type: pattern, work_start: workStart, work_end: workEnd },
                })
              }
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-bold text-sm shadow-md hover:brightness-105 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isProcessingAi ? <Loader2 size={16} className="animate-spin" /> : schedPrompt.trim() ? <Sparkles size={16} /> : <Calendar size={16} />}
              <span>{schedPrompt.trim() ? (step.aiButtonLabel || 'Применить через ИИ') : 'Сохранить график смен'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STEP: REPORTS (DIRECTOR)
  if (step.id === 'reports') {
    return (
      <div className="space-y-4 w-full min-w-0">
        <div className={cardClass}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <MiniAudioField
              label="Название шаблона отчета"
              value={reportTitle}
              onChange={setReportTitle}
              placeholder="Ежедневный рапорт"
              isLightTheme={isLightTheme}
              showPlayer={false}
            />
            <div>
              <label className="block text-sm font-bold mb-1.5">Дедлайн сдачи</label>
              <input type="time" value={deadlineTime} onChange={(e) => setDeadlineTime(e.target.value)} className={inputClass} />
            </div>
          </div>

          <AudioField
            label="Надиктуйте голосом, что сотрудники должны писать в рапорте — ИИ создаст поля"
            value={reportPrompt}
            onChange={setReportPrompt}
            placeholder={step.voicePlaceholder}
            isLightTheme={isLightTheme}
            compactVoiceButton={true}
            minHeight="130px"
          />

          <div className="mt-3">
            <button
              type="button"
              disabled={isProcessingAi}
              onClick={() =>
                runAiAction(userId, 'reports', {
                  action: 'ai_generate',
                  input: reportPrompt,
                  payload: { title: reportTitle, deadline_time: deadlineTime },
                })
              }
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-bold text-sm shadow-md hover:brightness-105 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isProcessingAi ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              <span>{step.aiButtonLabel}</span>
            </button>
          </div>
        </div>

        <div className={cardClass}>
          <div className="text-sm font-bold flex items-center gap-2 mb-2.5">
            <FileText size={16} />
            <span>Активные шаблоны отчетов ({reportTemplates.length})</span>
          </div>
          {reportTemplates.length === 0 ? (
            <p className="text-sm opacity-80">Шаблоны еще не созданы.</p>
          ) : (
            <div className="space-y-2">
              {reportTemplates.map((t: any) => (
                <div key={t.id} className={`rounded-xl border p-3 text-sm ${isLightTheme ? 'border-amber-700/30 bg-amber-100/40' : 'border-[#E7C768]/25 bg-[#140A01]/40'}`}>
                  <div className="font-bold break-words">{t.title}</div>
                  <div className="text-sm opacity-80 mt-0.5">Дедлайн: {t.deadline_time || '18:00'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // STEP: REPORT RULES
  return (
    <div className="space-y-4 w-full min-w-0">
      <div className={cardClass}>
        <div className="space-y-4">
          <MiniAudioField
            label="Название правила уведомлений"
            value={ruleTitle}
            onChange={setRuleTitle}
            placeholder="Отправка рапортов директору и в чат отдела"
            isLightTheme={isLightTheme}
            showPlayer={false}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1.5">Куда отправлять сданные рапорты</label>
              <select
                value={destType}
                onChange={(e) => setDestType(e.target.value as any)}
                className={inputClass}
              >
                <option value="director_direct" className={isLightTheme ? 'bg-[#FFFBF5] text-amber-950' : 'bg-[#140A01] text-white'}>Лично директору в Telegram</option>
                <option value="department_chat" className={isLightTheme ? 'bg-[#FFFBF5] text-amber-950' : 'bg-[#140A01] text-white'}>В чат подразделения</option>
                <option value="custom_chat" className={isLightTheme ? 'bg-[#FFFBF5] text-amber-950' : 'bg-[#140A01] text-white'}>В выбранный Telegram-чат</option>
              </select>
            </div>

            {destType !== 'director_direct' && (
              <div>
                <label className="block text-sm font-bold mb-1.5">Chat ID получателя</label>
                <input
                  type="text"
                  value={targetChatId}
                  onChange={(e) => setTargetChatId(e.target.value)}
                  placeholder="-100..."
                  className={inputClass}
                />
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={isProcessingAi || !ruleTitle.trim()}
            onClick={() =>
              runAiAction(userId, 'report_rules', {
                action: 'save',
                payload: { title: ruleTitle, destination_type: destType, target_chat_id: targetChatId || null, send_telegram: true },
              })
            }
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-bold text-sm shadow-md hover:brightness-105 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isProcessingAi ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            <span>Создать правило маршрутизации</span>
          </button>
        </div>
      </div>

      <div className={cardClass}>
        <div className="text-sm font-bold flex items-center gap-2 mb-2">
          <BellRing size={16} />
          <span>Активные правила рапортов ({reportRules.length})</span>
        </div>
        {reportRules.length === 0 ? (
          <p className="text-sm opacity-80">Правил маршрутизации пока нет.</p>
        ) : (
          <div className="space-y-2">
            {reportRules.map((r: any) => (
              <div key={r.id} className={`rounded-xl border p-3 text-sm break-words ${isLightTheme ? 'border-amber-700/30 bg-amber-100/40' : 'border-[#E7C768]/25 bg-[#140A01]/40'}`}>
                <span className="font-bold">{r.title}</span> — режим: {r.destination_type}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
