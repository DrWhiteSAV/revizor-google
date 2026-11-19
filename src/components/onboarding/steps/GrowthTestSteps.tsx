import React, { useState } from 'react';
import { Sparkles, CreditCard, Share2, Copy, Check, Trash2, Loader2, Award } from 'lucide-react';
import { OnboardingPayload, StepDefinition } from '../types';
import { AudioField } from '../../voice/AudioField';
import { useOnboardingStore } from '../../../store/useOnboardingStore';

interface StepProps {
  step: StepDefinition;
  data: OnboardingPayload;
  isLightTheme: boolean;
  onJumpToTab: (tabId: string) => void;
}

export const GrowthTestSteps: React.FC<StepProps> = ({ step, data, isLightTheme, onJumpToTab }) => {
  const { runAiAction, cleanupTests, isProcessingAi, lastActionData } = useOnboardingStore();
  const userId = data.user_id;
  const userCtx = data.context.user || {};
  const hasArtifacts = Boolean(
    data.test_artifacts?.test_report_id ||
      data.test_artifacts?.test_project_id ||
      data.test_artifacts?.test_task_id
  );

  const [testReportText, setTestReportText] = useState('');
  const [testProjText, setTestProjText] = useState('');
  const [testTaskText, setTestTaskText] = useState('');
  const [copiedRef, setCopiedRef] = useState(false);

  const cardClass = isLightTheme
    ? 'rounded-2xl border border-amber-700/35 bg-[#FFFBF5]/85 p-4 text-amber-950'
    : 'rounded-2xl border border-[#E7C768]/35 bg-[#1A0F02]/55 p-4 text-amber-100';

  // STEP: TARIFFS (DIRECTOR)
  if (step.id === 'tariffs') {
    const trialEnds = userCtx.trial_ends_at ? String(userCtx.trial_ends_at).slice(0, 10) : '7 дней бесплатно';
    return (
      <div className="space-y-4 w-full min-w-0">
        <div className={cardClass}>
          <div className="flex items-center gap-2 text-sm font-bold mb-3">
            <CreditCard size={16} />
            <span>Ваш баланс и стартовые лимиты компании</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className={`rounded-xl border p-3.5 ${isLightTheme ? 'border-amber-700/30 bg-amber-100/40' : 'border-[#E7C768]/25 bg-[#140A01]/45'}`}>
              <div className="text-sm opacity-80">Баланс RR</div>
              <div className="text-lg font-black mt-1">{Number(userCtx.payment_balance || 0)} RR</div>
              <div className="text-sm opacity-75">Бонусов: {Number(userCtx.local_bonus || 0) + Number(userCtx.welcome_bonus || 0)} RR</div>
            </div>
            <div className={`rounded-xl border p-3.5 ${isLightTheme ? 'border-amber-700/30 bg-amber-100/40' : 'border-[#E7C768]/25 bg-[#140A01]/45'}`}>
              <div className="text-sm opacity-80">Триал-период</div>
              <div className="text-lg font-black mt-1">до {trialEnds}</div>
              <div className="text-sm opacity-75">ИИ Ревизор + ИИ Рапорт</div>
            </div>
            <div className={`rounded-xl border p-3.5 ${isLightTheme ? 'border-amber-700/30 bg-amber-100/40' : 'border-[#E7C768]/25 bg-[#140A01]/45'}`}>
              <div className="text-sm opacity-80">Доступные лимиты</div>
              <div className="text-sm font-bold mt-1">
                Проектов: {userCtx.projects_limit || 10}, задач: {userCtx.tasks_limit || 50}, отчетов: {userCtx.reports_limit || 50}
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onJumpToTab('tariff')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-bold text-sm shadow-md hover:brightness-105 cursor-pointer"
            >
              Открыть раздел «Тарифы и Оплата»
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STEP: REFERRAL (DIRECTOR)
  if (step.id === 'referral') {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const refLink = `${origin}/?ref=${userId}`;
    const tgRefLink = `https://t.me/ii_rr_bot/app?startapp=${userCtx.telegram_id || userId}`;

    const copyLink = (url: string) => {
      navigator.clipboard.writeText(url);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    };

    return (
      <div className="space-y-4 w-full min-w-0">
        <div className={cardClass}>
          <div className="flex items-center gap-2 text-sm font-bold mb-2">
            <Share2 size={16} />
            <span>Партнерская программа: +1000 RR за каждого нового директора</span>
          </div>
          <p className="text-sm opacity-90 mb-4 break-words">
            Делитесь ссылкой с коллегами-предпринимателями. После регистрации нового руководителя по вашей ссылке система автоматически начислит +1000 RR на реферальный баланс (доступны для оплаты тарифов и вывода).
          </p>

          <div className="space-y-3">
            <div className={`rounded-xl border p-3 ${isLightTheme ? 'border-amber-700/30 bg-amber-100/40' : 'border-[#E7C768]/25 bg-[#140A01]/45'}`}>
              <div className="text-sm font-bold mb-1">Веб-ссылка партнера</div>
              <div className="text-sm break-all opacity-85 mb-2">{refLink}</div>
              <button
                type="button"
                onClick={() => copyLink(refLink)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-bold text-sm inline-flex items-center gap-1.5 cursor-pointer"
              >
                {copiedRef ? <Check size={15} /> : <Copy size={15} />}
                <span>{copiedRef ? 'Скопировано!' : 'Копировать партнерскую ссылку'}</span>
              </button>
            </div>

            <div className={`rounded-xl border p-3 ${isLightTheme ? 'border-amber-700/30 bg-amber-100/40' : 'border-[#E7C768]/25 bg-[#140A01]/45'}`}>
              <div className="text-sm font-bold mb-1">Ссылка Telegram MiniApp</div>
              <div className="text-sm break-all opacity-85">{tgRefLink}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TEAM INTERACTIVE AI TESTS: test_report, test_project, test_tasks
  const activeValue =
    step.id === 'test_report' ? testReportText : step.id === 'test_project' ? testProjText : testTaskText;
  const setActiveValue =
    step.id === 'test_report' ? setTestReportText : step.id === 'test_project' ? setTestProjText : setTestTaskText;

  return (
    <div className="space-y-4 w-full min-w-0">
      <div className={cardClass}>
        <AudioField
          label={
            step.id === 'test_report'
              ? 'Надиктуйте или напишите пробный рапорт (ИИ выставит оценку от 0 до 100)'
              : step.id === 'test_project'
              ? 'Надиктуйте тему проекта или вопрос по текущему проекту'
              : 'Опишите результат пробной задачи — ИИ Ревизор сразу проверит выполнение'
          }
          value={activeValue}
          onChange={setActiveValue}
          placeholder={step.voicePlaceholder}
          isLightTheme={isLightTheme}
          compactVoiceButton={true}
          minHeight="135px"
        />

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={isProcessingAi}
            onClick={() =>
              runAiAction(userId, step.id, {
                action: 'ai_generate',
                input: activeValue,
                payload: { voiceInputUsed: Boolean(activeValue) },
              })
            }
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-bold text-sm shadow-md hover:brightness-105 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isProcessingAi ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            <span>{step.aiButtonLabel || 'Запустить тест с ИИ'}</span>
          </button>

          {hasArtifacts && (
            <button
              type="button"
              disabled={isProcessingAi}
              onClick={() => cleanupTests(userId)}
              className={`px-4 py-2.5 rounded-xl border text-sm font-bold flex items-center gap-1.5 cursor-pointer ${
                isLightTheme
                  ? 'border-amber-800/50 text-amber-950 hover:bg-amber-200/60'
                  : 'border-[#E7C768]/45 text-amber-200 hover:bg-white/5'
              }`}
            >
              <Trash2 size={15} />
              <span>Очистить учебные тесты</span>
            </button>
          )}
        </div>
      </div>

      {lastActionData && (lastActionData.score !== undefined || lastActionData.summary) && (
        <div className={cardClass}>
          <div className="flex items-center gap-2 text-sm font-bold mb-2">
            <Award size={16} />
            <span>
              Результат ИИ-теста
              {lastActionData.score !== undefined ? ` — оценка ${lastActionData.score}/100` : ''}
            </span>
          </div>
          {lastActionData.summary && <p className="text-sm mb-2 break-words">{lastActionData.summary}</p>}
          {lastActionData.recommendations && (
            <p className="text-sm opacity-90 break-words">Рекомендации ИИ: {String(lastActionData.recommendations)}</p>
          )}
        </div>
      )}
    </div>
  );
};
