import React, { useState, useEffect } from 'react';
import { Sparkles, Building, Users, Copy, Check, Plus, Loader2, Briefcase } from 'lucide-react';
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

export const CompanyTeamSteps: React.FC<StepProps> = ({ step, data, isLightTheme }) => {
  const { runAiAction, isProcessingAi } = useOnboardingStore();
  const userId = data.user_id;
  const userCtx = data.context.user || {};
  const companyCtx = data.context.company || {};
  const departments = data.context.departments || [];
  const employees = data.context.employees || [];

  const [dutiesVoiceText, setDutiesVoiceText] = useState('');
  const [dutiesListText, setDutiesListText] = useState(() =>
    Array.isArray(userCtx.duties) ? userCtx.duties.join('\n') : ''
  );

  const [compName, setCompName] = useState<string>(companyCtx.name || '');
  const [compPrompt, setCompPrompt] = useState<string>(companyCtx.description || '');
  const [compProducts, setCompProducts] = useState<string>(companyCtx.products || '');

  const [empName, setEmpName] = useState('');
  const [empPosition, setEmpPosition] = useState('Менеджер');
  const [empRole, setEmpRole] = useState<'EMPLOYEE' | 'MANAGER'>('EMPLOYEE');
  const [empEmail, setEmpEmail] = useState('');
  const [empDeptId, setEmpDeptId] = useState(departments[0]?.id || '');
  const [copiedRole, setCopiedRole] = useState<string | null>(null);

  useEffect(() => {
    setDutiesListText(Array.isArray(userCtx.duties) ? userCtx.duties.join('\n') : '');
  }, [userCtx.duties]);

  useEffect(() => {
    setCompName(companyCtx.name || '');
    setCompPrompt(companyCtx.description || '');
    setCompProducts(companyCtx.products || '');
  }, [companyCtx.name, companyCtx.description, companyCtx.products]);

  useEffect(() => {
    if (!empDeptId && departments.length > 0) {
      setEmpDeptId(departments[0].id);
    }
  }, [departments, empDeptId]);

  const cardClass = isLightTheme
    ? 'rounded-2xl border border-amber-700/35 bg-[#FFFBF5]/85 p-4 text-amber-950'
    : 'rounded-2xl border border-[#E7C768]/35 bg-[#1A0F02]/55 p-4 text-amber-100';

  const inputClass = isLightTheme
    ? 'w-full rounded-xl border border-amber-700/40 bg-[#FFFBF5]/90 px-3.5 py-2.5 text-sm text-amber-950 placeholder-amber-900/45 focus:outline-none focus:border-amber-800'
    : 'w-full rounded-xl border border-[#E7C768]/35 bg-[#140A01]/65 px-3.5 py-2.5 text-sm text-white placeholder-amber-200/35 focus:outline-none focus:border-[#F4EE8E]';

  // STEP: DUTIES
  if (step.id === 'duties') {
    const parsedDuties = dutiesListText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    return (
      <div className="space-y-4 w-full min-w-0">
        <div className={cardClass}>
          <AudioField
            label="Надиктуйте голосом или опишите ваши задачи и обязанности — ИИ структурирует их"
            value={dutiesVoiceText}
            onChange={setDutiesVoiceText}
            placeholder={step.voicePlaceholder}
            isLightTheme={isLightTheme}
            compactVoiceButton={true}
            minHeight="130px"
          />

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={isProcessingAi}
              onClick={() =>
                runAiAction(userId, 'duties', {
                  action: 'ai_generate',
                  input: dutiesVoiceText,
                })
              }
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-bold text-sm shadow-md hover:brightness-105 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isProcessingAi ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              <span>{step.aiButtonLabel || 'Сгенерировать обязанности через ИИ'}</span>
            </button>
          </div>
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <span className={`text-sm font-bold flex items-center gap-2 ${isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'}`}>
              <Briefcase size={16} />
              <span>Текущий список обязанностей (каждый пункт с новой строки): {parsedDuties.length}</span>
            </span>
          </div>
          <textarea
            rows={5}
            value={dutiesListText}
            onChange={(e) => setDutiesListText(e.target.value)}
            placeholder="По одному пункту на строке..."
            className={inputClass}
          />
          <div className="mt-3">
            <button
              type="button"
              disabled={isProcessingAi || parsedDuties.length === 0}
              onClick={() =>
                runAiAction(userId, 'duties', {
                  action: 'save',
                  payload: { duties: parsedDuties },
                })
              }
              className={`px-4 py-2 rounded-xl border text-sm font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 ${
                isLightTheme
                  ? 'border-amber-800/50 text-amber-950 hover:bg-amber-200/60'
                  : 'border-[#E7C768]/50 text-[#F4EE8E] hover:bg-amber-400/10'
              }`}
            >
              <Check size={16} />
              <span>Сохранить отредактированный список</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STEP: COMPANY & DEPARTMENTS
  if (step.id === 'company') {
    return (
      <div className="space-y-4 w-full min-w-0">
        <div className={cardClass}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="min-w-0">
              <MiniAudioField
                label="Название компании (до 20 символов)"
                value={compName}
                onChange={(val) => setCompName(val.slice(0, 20))}
                placeholder="Например: Альфа Строй"
                isLightTheme={isLightTheme}
                showPlayer={false}
              />
            </div>
            <div className="min-w-0">
              <MiniAudioField
                label="Ключевые продукты / услуги"
                value={compProducts}
                onChange={setCompProducts}
                placeholder="Что продаете или производите..."
                isLightTheme={isLightTheme}
                showPlayer={false}
              />
            </div>
          </div>

          <AudioField
            label="Опишите компанию и отделы голосом — ИИ создаст оргструктуру"
            value={compPrompt}
            onChange={setCompPrompt}
            placeholder={step.voicePlaceholder}
            isLightTheme={isLightTheme}
            compactVoiceButton={true}
            minHeight="130px"
          />

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={isProcessingAi}
              onClick={() =>
                runAiAction(userId, 'company', {
                  action: 'ai_generate',
                  input: compPrompt,
                  payload: { name: compName, description: compPrompt, products: compProducts },
                })
              }
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-bold text-sm shadow-md hover:brightness-105 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isProcessingAi ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              <span>{step.aiButtonLabel}</span>
            </button>

            <button
              type="button"
              disabled={isProcessingAi || !compName.trim()}
              onClick={() =>
                runAiAction(userId, 'company', {
                  action: 'save',
                  payload: { name: compName, description: compPrompt, products: compProducts },
                })
              }
              className={`px-4 py-2.5 rounded-xl border text-sm font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 ${
                isLightTheme
                  ? 'border-amber-800/50 text-amber-950 hover:bg-amber-200/60'
                  : 'border-[#E7C768]/50 text-[#F4EE8E] hover:bg-amber-400/10'
              }`}
            >
              <Check size={16} />
              <span>Сохранить без генерации</span>
            </button>
          </div>
        </div>

        <div className={cardClass}>
          <div className="flex items-center gap-2 font-bold text-sm mb-3">
            <Building size={16} />
            <span>Созданные отделы ({departments.length})</span>
          </div>
          {departments.length === 0 ? (
            <p className="text-sm opacity-80">Пока нет отделов. Опишите компанию выше и нажмите «Сформировать компанию и отделы через ИИ».</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {departments.map((d: any) => (
                <div
                  key={d.id}
                  className={`rounded-xl border p-3 text-sm ${
                    isLightTheme ? 'border-amber-700/30 bg-amber-100/40' : 'border-[#E7C768]/25 bg-[#140A01]/40'
                  }`}
                >
                  <div className="font-bold break-words">{d.name}</div>
                  {d.description && <div className="text-sm opacity-80 mt-1 break-words">{d.description}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // STEP: EMPLOYEES & INVITES
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const empInviteLink = `${origin}/invite?ref=${userId}&role=employer`;
  const mgrInviteLink = `${origin}/invite?ref=${userId}&role=manager`;

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRole(key);
    setTimeout(() => setCopiedRole(null), 2000);
  };

  return (
    <div className="space-y-4 w-full min-w-0">
      <div className={cardClass}>
        <div className="text-sm font-bold mb-3 flex items-center gap-2">
          <Users size={16} />
          <span>Инвайт-ссылки для быстрой регистрации команды</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className={`rounded-xl border p-3 space-y-2 ${isLightTheme ? 'border-amber-700/30 bg-amber-100/40' : 'border-[#E7C768]/30 bg-[#140A01]/45'}`}>
            <div className="text-sm font-bold">Ссылка для Сотрудника</div>
            <div className="text-sm break-all opacity-80">{empInviteLink}</div>
            <button
              type="button"
              onClick={() => handleCopy('emp', empInviteLink)}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {copiedRole === 'emp' ? <Check size={15} /> : <Copy size={15} />}
              <span>{copiedRole === 'emp' ? 'Ссылка скопирована' : 'Копировать инвайт сотрудника'}</span>
            </button>
          </div>

          <div className={`rounded-xl border p-3 space-y-2 ${isLightTheme ? 'border-amber-700/30 bg-amber-100/40' : 'border-[#E7C768]/30 bg-[#140A01]/45'}`}>
            <div className="text-sm font-bold">Ссылка для Руководителя отдела</div>
            <div className="text-sm break-all opacity-80">{mgrInviteLink}</div>
            <button
              type="button"
              onClick={() => handleCopy('mgr', mgrInviteLink)}
              className={`w-full py-2 px-3 rounded-xl border font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer ${
                isLightTheme ? 'border-amber-800/50 text-amber-950 hover:bg-amber-200/60' : 'border-[#E7C768]/50 text-[#F4EE8E] hover:bg-amber-400/10'
              }`}
            >
              {copiedRole === 'mgr' ? <Check size={15} /> : <Copy size={15} />}
              <span>{copiedRole === 'mgr' ? 'Ссылка скопирована' : 'Копировать инвайт руководителя'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className={cardClass}>
        <div className="text-sm font-bold mb-3">Или добавьте сотрудника в структуру вручную</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <MiniAudioField
            label="ФИО сотрудника *"
            value={empName}
            onChange={setEmpName}
            placeholder="Петрова Анна Сергеевна"
            isLightTheme={isLightTheme}
            showPlayer={false}
          />
          <MiniAudioField
            label="Должность"
            value={empPosition}
            onChange={setEmpPosition}
            placeholder="Менеджер по продажам"
            isLightTheme={isLightTheme}
            showPlayer={false}
          />
          <div>
            <label className="block text-sm font-bold mb-1.5">Роль в системе</label>
            <select
              value={empRole}
              onChange={(e) => setEmpRole(e.target.value as 'EMPLOYEE' | 'MANAGER')}
              className={inputClass}
            >
              <option value="EMPLOYEE" className={isLightTheme ? 'bg-[#FFFBF5] text-amber-950' : 'bg-[#140A01] text-white'}>Сотрудник</option>
              <option value="MANAGER" className={isLightTheme ? 'bg-[#FFFBF5] text-amber-950' : 'bg-[#140A01] text-white'}>Руководитель отдела</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold mb-1.5">Отдел</label>
            <select
              value={empDeptId}
              onChange={(e) => setEmpDeptId(e.target.value)}
              className={inputClass}
            >
              <option value="" className={isLightTheme ? 'bg-[#FFFBF5] text-amber-950' : 'bg-[#140A01] text-white'}>Без привязки к отделу</option>
              {departments.map((d: any) => (
                <option key={d.id} value={d.id} className={isLightTheme ? 'bg-[#FFFBF5] text-amber-950' : 'bg-[#140A01] text-white'}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            disabled={isProcessingAi || !empName.trim()}
            onClick={async () => {
              const res = await runAiAction(userId, 'employees', {
                action: 'save',
                payload: { name: empName, position: empPosition, role: empRole, email: empEmail, department_id: empDeptId },
              });
              if (res.success) {
                setEmpName('');
                setEmpEmail('');
              }
            }}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-bold text-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isProcessingAi ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            <span>Добавить сотрудника</span>
          </button>

          <span className="text-sm font-bold opacity-85">Всего в компании: {employees.length} чел.</span>
        </div>
      </div>
    </div>
  );
};
