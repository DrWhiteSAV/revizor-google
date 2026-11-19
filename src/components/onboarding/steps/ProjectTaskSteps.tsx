import React, { useState, useEffect } from 'react';
import { Sparkles, FolderKanban, ListChecks, ShieldAlert, Check, Loader2 } from 'lucide-react';
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

export const ProjectTaskSteps: React.FC<StepProps> = ({ step, data, isLightTheme }) => {
  const { runAiAction, isProcessingAi } = useOnboardingStore();
  const userId = data.user_id;
  const projects = data.context.projects || [];
  const tasks = data.context.tasks || [];
  const taskRules = data.context.taskRules || [];
  const employees = data.context.employees || [];

  const [projectTitle, setProjectTitle] = useState('');
  const [projectPrompt, setProjectPrompt] = useState('');

  const [selectedProjId, setSelectedProjId] = useState(projects[0]?.id || '');
  const [selectedExecId, setSelectedExecId] = useState(employees[0]?.id || userId);
  const [tasksPrompt, setTasksPrompt] = useState('');

  const [ruleTitle, setRuleTitle] = useState('Контроль сроков и проверка задач ИИ');
  const [destType, setDestType] = useState('director_direct');

  useEffect(() => {
    if (!selectedProjId && projects.length > 0) setSelectedProjId(projects[0].id);
  }, [projects, selectedProjId]);

  const cardClass = isLightTheme
    ? 'rounded-2xl border border-amber-700/35 bg-[#FFFBF5]/85 p-4 text-amber-950'
    : 'rounded-2xl border border-[#E7C768]/35 bg-[#1A0F02]/55 p-4 text-amber-100';

  const inputClass = isLightTheme
    ? 'w-full rounded-xl border border-amber-700/40 bg-[#FFFBF5]/90 px-3.5 py-2.5 text-sm text-amber-950 placeholder-amber-900/45 focus:outline-none focus:border-amber-800'
    : 'w-full rounded-xl border border-[#E7C768]/35 bg-[#140A01]/65 px-3.5 py-2.5 text-sm text-white placeholder-amber-200/35 focus:outline-none focus:border-[#F4EE8E]';

  // STEP: PROJECTS
  if (step.id === 'projects') {
    return (
      <div className="space-y-4 w-full min-w-0">
        <div className={cardClass}>
          <div className="mb-4">
            <MiniAudioField
              label="Краткое название проекта (до 20 символов, или оставьте пустым для ИИ)"
              value={projectTitle}
              onChange={(val) => setProjectTitle(val.slice(0, 20))}
              placeholder="Например: Запуск продаж"
              isLightTheme={isLightTheme}
              showPlayer={false}
            />
          </div>

          <AudioField
            label="Расскажите о проекте голосом или текстом — ИИ сформулирует цели и паспорт"
            value={projectPrompt}
            onChange={setProjectPrompt}
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
                runAiAction(userId, 'projects', {
                  action: 'ai_generate',
                  input: projectPrompt,
                  payload: { title: projectTitle, description: projectPrompt },
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
            <FolderKanban size={16} />
            <span>Проекты компании ({projects.length})</span>
          </div>
          {projects.length === 0 ? (
            <p className="text-sm opacity-80">Пока нет созданных проектов.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {projects.map((p: any) => (
                <div key={p.id} className={`rounded-xl border p-3 text-sm ${isLightTheme ? 'border-amber-700/30 bg-amber-100/40' : 'border-[#E7C768]/25 bg-[#140A01]/40'}`}>
                  <div className="font-bold break-words">{p.title}</div>
                  <div className="text-sm opacity-80 mt-0.5 break-words">{p.startDate} — {p.endDate}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // STEP: TASKS
  if (step.id === 'tasks') {
    const selectedExec = employees.find((e: any) => String(e.id) === String(selectedExecId));
    return (
      <div className="space-y-4 w-full min-w-0">
        <div className={cardClass}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-bold mb-1.5">Проект для задач</label>
              <select value={selectedProjId} onChange={(e) => setSelectedProjId(e.target.value)} className={inputClass}>
                {projects.length === 0 ? (
                  <option value="" className={isLightTheme ? 'bg-[#FFFBF5] text-amber-950' : 'bg-[#140A01] text-white'}>Общая задача (без проекта)</option>
                ) : (
                  projects.map((p: any) => (
                    <option key={p.id} value={p.id} className={isLightTheme ? 'bg-[#FFFBF5] text-amber-950' : 'bg-[#140A01] text-white'}>
                      {p.title}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-1.5">Исполнитель</label>
              <select value={selectedExecId} onChange={(e) => setSelectedExecId(e.target.value)} className={inputClass}>
                {employees.length === 0 ? (
                  <option value={userId} className={isLightTheme ? 'bg-[#FFFBF5] text-amber-950' : 'bg-[#140A01] text-white'}>Я сам</option>
                ) : (
                  employees.map((emp: any) => (
                    <option key={emp.id} value={emp.id} className={isLightTheme ? 'bg-[#FFFBF5] text-amber-950' : 'bg-[#140A01] text-white'}>
                      {emp.name} ({emp.position || emp.role})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <AudioField
            label="Продиктуйте цели или список задач — нейросеть создаст задачи с чек-листами"
            value={tasksPrompt}
            onChange={setTasksPrompt}
            placeholder={step.voicePlaceholder}
            isLightTheme={isLightTheme}
            compactVoiceButton={true}
            minHeight="120px"
          />

          <div className="mt-3">
            <button
              type="button"
              disabled={isProcessingAi}
              onClick={() =>
                runAiAction(userId, 'tasks', {
                  action: 'ai_generate',
                  input: tasksPrompt,
                  payload: {
                    project_id: selectedProjId || null,
                    executorId: selectedExecId,
                    executorName: selectedExec?.name || data.context.user?.name || 'Сотрудник',
                  },
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
            <ListChecks size={16} />
            <span>Созданные задачи ({tasks.length})</span>
          </div>
          {tasks.length === 0 ? (
            <p className="text-sm opacity-80">Задач пока нет. Нажмите кнопку выше для генерации через ИИ.</p>
          ) : (
            <div className="space-y-2">
              {tasks.slice(0, 6).map((t: any) => (
                <div key={t.id} className={`rounded-xl border p-3 text-sm break-words ${isLightTheme ? 'border-amber-700/30 bg-amber-100/40' : 'border-[#E7C768]/25 bg-[#140A01]/40'}`}>
                  <span className="font-bold">{t.title}</span> — дедлайн: {t.deadLine || '—'}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // STEP: PROJECT RULES
  return (
    <div className="space-y-4 w-full min-w-0">
      <div className={cardClass}>
        <div className="space-y-4">
          <MiniAudioField
            label="Название правила по проектам и задачам"
            value={ruleTitle}
            onChange={setRuleTitle}
            placeholder="Уведомления о постановке, просрочке и ИИ-проверке задач"
            isLightTheme={isLightTheme}
            showPlayer={false}
          />
          <div>
            <label className="block text-sm font-bold mb-1.5">Канал уведомлений</label>
            <select value={destType} onChange={(e) => setDestType(e.target.value)} className={inputClass}>
              <option value="director_direct" className={isLightTheme ? 'bg-[#FFFBF5] text-amber-950' : 'bg-[#140A01] text-white'}>Личные сообщения директора + в кабинете</option>
              <option value="department_chat" className={isLightTheme ? 'bg-[#FFFBF5] text-amber-950' : 'bg-[#140A01] text-white'}>Чат ответственного отдела</option>
              <option value="executor_direct" className={isLightTheme ? 'bg-[#FFFBF5] text-amber-950' : 'bg-[#140A01] text-white'}>Лично исполнителю задачи</option>
            </select>
          </div>
          <button
            type="button"
            disabled={isProcessingAi || !ruleTitle.trim()}
            onClick={() =>
              runAiAction(userId, 'project_rules', {
                action: 'save',
                payload: { title: ruleTitle, destination_type: destType },
              })
            }
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-bold text-sm shadow-md hover:brightness-105 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isProcessingAi ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            <span>Активировать правило задач</span>
          </button>
        </div>
      </div>

      <div className={cardClass}>
        <div className="text-sm font-bold flex items-center gap-2 mb-2">
          <ShieldAlert size={16} />
          <span>Настроенные правила ИИ Ревизора ({taskRules.length})</span>
        </div>
        {taskRules.length === 0 ? (
          <p className="text-sm opacity-80">Правила задач еще не добавлены.</p>
        ) : (
          <div className="space-y-2">
            {taskRules.map((r: any) => (
              <div key={r.id} className={`rounded-xl border p-3 text-sm break-words ${isLightTheme ? 'border-amber-700/30 bg-amber-100/40' : 'border-[#E7C768]/25 bg-[#140A01]/40'}`}>
                <span className="font-bold">{r.title}</span> — {r.destination_type}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
