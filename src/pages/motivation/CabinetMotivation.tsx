import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Sparkles,
  Plus,
  Wand2,
  Edit3,
  Trash2,
  UserPlus,
  History,
  Coins,
  X,
  RefreshCw
} from 'lucide-react';
import { Department, ReportTemplate, UserProfile, UserRole } from '../../types';
import {
  MotivationAccrualItem,
  MotivationCalculator,
  createEmptyCalculator,
  formatRub
} from '../../components/motivation/types';
import { MotivationAiBuilderModal } from '../../components/motivation/MotivationAiBuilderModal';
import { MotivationCalculatorEditorModal } from '../../components/motivation/MotivationCalculatorEditorModal';
import { MotivationDeleteCascadeModal } from '../../components/motivation/MotivationDeleteCascadeModal';
import { MotivationPersonalSummary } from './MotivationPersonalSummary';
import { MotivationHistorySection } from './MotivationHistorySection';
import { MotivationApplyModal } from './MotivationApplyModal';

interface CabinetMotivationProps {
  activeSubpage: 'rules' | 'history';
  currentUser: UserProfile | null;
  templates: ReportTemplate[];
  setTemplates: (val: ReportTemplate[]) => void;
  departments: Department[];
  mockEmployees: UserProfile[];
  company: any;
  saveStateToServer?: (updated: any) => void;
  onNavigate?: (path: string) => void;
  theme?: 'dark' | 'light';
}

export default function CabinetMotivation({
  activeSubpage,
  currentUser,
  templates,
  setTemplates,
  departments,
  mockEmployees,
  company,
  saveStateToServer,
  onNavigate,
  theme = 'dark'
}: CabinetMotivationProps) {
  const isDark = theme === 'dark';
  const companyId = String(currentUser?.company_id || company?.id || 'flagship-main');
  const directorId = String(currentUser?.director_id || '91827364501');

  const canManage = Boolean(
    currentUser?.role &&
      [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DIRECTOR, UserRole.MANAGER].includes(
        currentUser.role
      )
  );

  const [subpage, setSubpage] = useState<'rules' | 'history'>(activeSubpage);
  useEffect(() => {
    setSubpage(activeSubpage);
  }, [activeSubpage]);

  const [calculators, setCalculators] = useState<MotivationCalculator[]>([]);
  const [selectedViewEmployeeId, setSelectedViewEmployeeId] = useState<string>(
    String(currentUser?.id || '')
  );
  const [summaryData, setSummaryData] = useState<any>(null);
  const [historyItems, setHistoryItems] = useState<MotivationAccrualItem[]>([]);
  const [historyPeriods, setHistoryPeriods] = useState<string[]>([]);
  const [historySummary, setHistorySummary] = useState<any>(null);
  const [periodFilter, setPeriodFilter] = useState<string>(new Date().toISOString().slice(0, 7));
  const [historyEmpFilter, setHistoryEmpFilter] = useState<string>(
    canManage ? 'all' : String(currentUser?.id || '')
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<string>('');

  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [editingCalc, setEditingCalc] = useState<MotivationCalculator | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [aiInitialPrompt, setAiInitialPrompt] = useState<string>('');
  const [aiInitialResult, setAiInitialResult] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<MotivationCalculator | null>(null);
  const [applyTarget, setApplyTarget] = useState<MotivationCalculator | null>(null);
  const [applyEmpIds, setApplyEmpIds] = useState<string[]>([]);
  const [applyPositions, setApplyPositions] = useState<string[]>([]);
  const [isApplying, setIsApplying] = useState<boolean>(false);

  const allEmployees = useMemo(() => {
    const map = new Map<string, UserProfile>();
    if (currentUser?.id) map.set(String(currentUser.id), currentUser);
    (mockEmployees || []).forEach((e) => {
      if (e?.id) map.set(String(e.id), e);
    });
    return Array.from(map.values());
  }, [currentUser, mockEmployees]);

  const uniquePositions = useMemo(() => {
    const s = new Set<string>();
    allEmployees.forEach((e) => {
      if (e.position?.trim()) s.add(e.position.trim());
    });
    return Array.from(s);
  }, [allEmployees]);

  const loadMotivationData = useCallback(async () => {
    if (!currentUser?.id) return;
    setIsLoading(true);
    try {
      const targetEmp = selectedViewEmployeeId || String(currentUser.id);
      const histEmp = canManage ? historyEmpFilter : String(currentUser.id);

      const [calcRes, sumRes, histRes] = await Promise.all([
        fetch(
          `/api/motivation/calculators?company_id=${encodeURIComponent(companyId)}&director_id=${encodeURIComponent(directorId)}`
        ),
        fetch(
          `/api/motivation/my-summary?employeeId=${encodeURIComponent(targetEmp)}&company_id=${encodeURIComponent(companyId)}&director_id=${encodeURIComponent(directorId)}`
        ),
        fetch(
          `/api/motivation/history?company_id=${encodeURIComponent(companyId)}&director_id=${encodeURIComponent(directorId)}&employeeId=${encodeURIComponent(histEmp)}&period=${encodeURIComponent(periodFilter)}`
        )
      ]);

      const [calcData, sumData, histData] = await Promise.all([
        calcRes.json(),
        sumRes.json(),
        histRes.json()
      ]);

      if (calcData?.success) setCalculators(calcData.calculators || []);
      if (sumData?.success) setSummaryData(sumData);
      if (histData?.success) {
        setHistoryItems(histData.items || []);
        setHistoryPeriods(histData.periods || []);
        setHistorySummary(histData.summary || null);
      }
    } catch (e) {
      console.warn('Error loading motivation data:', e);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id, companyId, directorId, selectedViewEmployeeId, canManage, historyEmpFilter, periodFilter]);

  useEffect(() => {
    loadMotivationData();
  }, [loadMotivationData]);

  useEffect(() => {
    const consumePending = () => {
      try {
        const raw = sessionStorage.getItem('pending_motivation_ai_payload');
        if (raw) {
          sessionStorage.removeItem('pending_motivation_ai_payload');
          const parsed = JSON.parse(raw);
          setAiInitialPrompt(parsed?.prompt || '');
          setAiInitialResult(parsed?.aiBuildResult || null);
          setIsAiModalOpen(true);
        }
      } catch {}
    };
    consumePending();

    const onCopilotModal = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail?.modalName === 'motivation_ai_builder') {
        const payload = detail?.payload || {};
        setAiInitialPrompt(payload.prompt || '');
        setAiInitialResult(payload.aiBuildResult || null);
        setIsAiModalOpen(true);
      }
    };
    window.addEventListener('cabinet-copilot-open-modal', onCopilotModal);
    return () => window.removeEventListener('cabinet-copilot-open-modal', onCopilotModal);
  }, []);

  const handleTemplatesUpdated = (nextTemplates: ReportTemplate[]) => {
    setTemplates(nextTemplates);
    if (saveStateToServer) {
      saveStateToServer({ templates: nextTemplates });
    }
  };

  const handleSwitchSubpage = (target: 'rules' | 'history') => {
    setSubpage(target);
    if (onNavigate) {
      onNavigate(
        target === 'history'
          ? '/cabinet/raport/motivation/history'
          : '/cabinet/raport/motivation'
      );
    }
  };

  const handleApplyTemplateSubmit = async () => {
    if (!applyTarget) return;
    setIsApplying(true);
    try {
      const res = await fetch(
        `/api/motivation/calculators/${encodeURIComponent(applyTarget.id)}/apply`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeIds: applyEmpIds,
            positions: applyPositions
          })
        }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusBanner(`Шаблон «${applyTarget.title}» успешно применен к выбранным сотрудникам и должностям.`);
        setApplyTarget(null);
        await loadMotivationData();
      }
    } catch {} finally {
      setIsApplying(false);
    }
  };

  const cardSurface = isDark
    ? 'bg-[#1A0F02]/70 border-amber-400/40 text-amber-50 shadow-[0_0_25px_rgba(244,238,142,0.14)] backdrop-blur-xl'
    : 'bg-[#FFFBF5]/90 border-amber-900/35 text-amber-950 shadow-md backdrop-blur-xl';

  const goldAccentText = isDark ? 'text-[#F4EE8E]' : 'text-amber-950';
  const mutedText = isDark ? 'text-amber-200/80' : 'text-amber-900/80';

  return (
    <div className="space-y-5 w-full max-w-full overflow-x-hidden">
      <div className={`p-4 sm:p-6 rounded-3xl border space-y-4 ${cardSurface}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <h2 className={`text-xl sm:text-2xl font-extrabold flex items-center gap-2.5 flex-wrap ${goldAccentText}`}>
              <Coins size={24} className={isDark ? 'text-[#E7C768] shrink-0' : 'text-amber-800 shrink-0'} />
              <span>Система мотивации и KPI</span>
            </h2>
            <p className={`text-sm leading-relaxed ${mutedText}`}>
              Ежедневный расчет заработка по вечерним отчетам с учетом графика смен, утренней отметки времени и многоступенчатых грейдов KPI.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={loadMotivationData}
              className={`px-3.5 py-2 rounded-2xl border text-sm font-semibold flex items-center gap-1.5 cursor-pointer ${
                isDark ? 'border-amber-400/35 text-[#F4EE8E]' : 'border-amber-900/35 text-amber-950'
              }`}
              title="Обновить расчеты"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              <span>Обновить</span>
            </button>

            {canManage && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setAiInitialPrompt('');
                    setAiInitialResult(null);
                    setIsAiModalOpen(true);
                  }}
                  className={`px-4 py-2 rounded-2xl border text-sm font-bold flex items-center gap-1.5 cursor-pointer ${
                    isDark
                      ? 'border-[#F4EE8E]/60 text-[#F4EE8E] hover:bg-amber-400/15'
                      : 'border-amber-900/45 text-amber-950 bg-amber-100/70 hover:bg-amber-200/70'
                  }`}
                >
                  <Wand2 size={16} />
                  <span>ИИ-калькулятор (голосом)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingCalc(createEmptyCalculator(companyId, directorId));
                    setIsEditorOpen(true);
                  }}
                  className="px-4 py-2 rounded-2xl bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 font-bold text-sm border border-amber-300 flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Plus size={16} />
                  <span>Создать калькулятор</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => handleSwitchSubpage('rules')}
            className={`w-full sm:w-auto px-4 py-2.5 rounded-2xl border text-sm font-bold flex items-center justify-center sm:justify-start gap-2 cursor-pointer transition-all ${
              subpage === 'rules'
                ? 'bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 border-amber-300 shadow-sm'
                : isDark
                ? 'border-amber-400/35 text-amber-100 hover:border-[#F4EE8E]'
                : 'border-amber-900/30 text-amber-950 hover:bg-amber-100/60'
            }`}
          >
            <Sparkles size={16} />
            <span>Правила мотивации и расчеты</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchSubpage('history')}
            className={`w-full sm:w-auto px-4 py-2.5 rounded-2xl border text-sm font-bold flex items-center justify-center sm:justify-start gap-2 cursor-pointer transition-all ${
              subpage === 'history'
                ? 'bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 border-amber-300 shadow-sm'
                : isDark
                ? 'border-amber-400/35 text-amber-100 hover:border-[#F4EE8E]'
                : 'border-amber-900/30 text-amber-950 hover:bg-amber-100/60'
            }`}
          >
            <History size={16} />
            <span>История начислений за периоды</span>
          </button>
        </div>

        {statusBanner && (
          <div className={`p-3 rounded-2xl border flex items-center justify-between gap-2 text-sm font-semibold ${isDark ? 'border-[#F4EE8E]/60 text-[#F4EE8E]' : 'border-amber-900/45 text-amber-950 bg-amber-100/50'}`}>
            <span>{statusBanner}</span>
            <button type="button" onClick={() => setStatusBanner('')} className="p-1 cursor-pointer">
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      {subpage === 'rules' && (
        <div className="space-y-5">
          <MotivationPersonalSummary
            canManage={canManage}
            allEmployees={allEmployees}
            selectedViewEmployeeId={selectedViewEmployeeId}
            setSelectedViewEmployeeId={setSelectedViewEmployeeId}
            summaryData={summaryData}
            isDark={isDark}
            cardSurface={cardSurface}
            goldAccentText={goldAccentText}
            mutedText={mutedText}
            onNavigate={onNavigate}
          />

          <div className={`p-4 sm:p-6 rounded-3xl border space-y-4 ${cardSurface}`}>
            <div>
              <h3 className={`text-lg font-bold ${goldAccentText}`}>
                Все калькуляторы и шаблоны мотивации ({calculators.length})
              </h3>
              <p className={`text-sm ${mutedText}`}>
                {canManage
                  ? 'Плитки схем мотивации: редактируйте правила, применяйте шаблон к новым сотрудникам или удаляйте с каскадным выбором.'
                  : 'Открытые регламенты расчета зарплаты и премий вашей компании.'}
              </p>
            </div>

            {calculators.length === 0 ? (
              <div className={`p-6 rounded-2xl border text-center space-y-3 text-sm ${isDark ? 'border-amber-400/30' : 'border-amber-900/30'}`}>
                <div>Пока нет ни одного сохраненного калькулятора мотивации.</div>
                {canManage && (
                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAiModalOpen(true)}
                      className="px-4 py-2 rounded-xl border border-amber-400/50 font-bold text-sm cursor-pointer"
                    >
                      Создать голосом через ИИ
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCalc(createEmptyCalculator(companyId, directorId));
                        setIsEditorOpen(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 font-bold text-sm cursor-pointer"
                    >
                      Создать вручную
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {calculators.map((calc) => {
                  const scopeLabel =
                    calc.target_scope === 'company'
                      ? 'Вся компания'
                      : calc.target_scope === 'departments'
                      ? `Отделы (${calc.target_department_ids.length})`
                      : calc.target_scope === 'positions'
                      ? `Должности (${calc.target_positions.length})`
                      : `Сотрудники (${calc.target_employee_ids.length})`;

                  return (
                    <div
                      key={calc.id}
                      className={`p-4 rounded-2xl border flex flex-col justify-between gap-4 transition-all ${
                        isDark
                          ? 'border-amber-400/40 bg-transparent hover:border-[#F4EE8E] hover:shadow-[0_0_25px_rgba(244,238,142,0.18)]'
                          : 'border-amber-900/35 bg-transparent hover:border-amber-950'
                      }`}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`text-base font-bold break-words ${goldAccentText}`}>
                            {calc.title}
                          </h4>
                          {calc.is_template && (
                            <span className={`px-2.5 py-0.5 rounded-full border text-sm font-semibold shrink-0 ${
                              isDark ? 'border-amber-400/45 text-[#E7C768]' : 'border-amber-900/40 text-amber-950'
                            }`}>
                              Шаблон
                            </span>
                          )}
                        </div>

                        {calc.description && (
                          <p className={`text-sm line-clamp-2 ${mutedText}`}>{calc.description}</p>
                        )}

                        <div className="space-y-1 text-sm">
                          <div>
                            <strong>Оклад:</strong>{' '}
                            {calc.fixed_config.salary_mode === 'per_shift'
                              ? `${formatRub(calc.fixed_config.base_amount)} за смену`
                              : `${formatRub(calc.fixed_config.base_amount)} / месяц`}
                          </div>
                          <div>
                            <strong>Проверка:</strong>{' '}
                            {calc.fixed_config.verification_mode === 'time'
                              ? 'Время (утро + вечер)'
                              : 'Числовая норма'}
                          </div>
                          <div>
                            <strong>KPI правил:</strong> {calc.kpi_rules.length} · <strong>Охват:</strong> {scopeLabel}
                          </div>
                          <div className={mutedText}>
                            Начислений: {calc.accruals_count || 0} ({formatRub(calc.accruals_total_rub || 0)})
                          </div>
                        </div>
                      </div>

                      {canManage && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-amber-500/20">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCalc(calc);
                              setIsEditorOpen(true);
                            }}
                            className={`flex-1 min-w-[120px] px-3 py-2 rounded-xl border text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                              isDark ? 'border-amber-400/45 text-[#F4EE8E] hover:bg-amber-400/15' : 'border-amber-900/40 text-amber-950 hover:bg-amber-100/70'
                            }`}
                          >
                            <Edit3 size={15} />
                            <span>Редактировать</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setApplyTarget(calc);
                              setApplyEmpIds([]);
                              setApplyPositions([]);
                            }}
                            className={`px-3 py-2 rounded-xl border text-sm font-semibold flex items-center gap-1 cursor-pointer ${
                              isDark ? 'border-amber-400/35 text-amber-100' : 'border-amber-900/35 text-amber-950'
                            }`}
                            title="Применить шаблон к сотрудникам"
                          >
                            <UserPlus size={15} />
                            <span>Назначить</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(calc)}
                            className="px-3 py-2 rounded-xl border border-rose-400/45 text-rose-400 hover:bg-rose-500/10 text-sm font-semibold cursor-pointer"
                            title="Каскадное удаление"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {subpage === 'history' && (
        <MotivationHistorySection
          historyItems={historyItems}
          historyPeriods={historyPeriods}
          historySummary={historySummary}
          periodFilter={periodFilter}
          setPeriodFilter={setPeriodFilter}
          historyEmpFilter={historyEmpFilter}
          setHistoryEmpFilter={setHistoryEmpFilter}
          canManage={canManage}
          allEmployees={allEmployees}
          isDark={isDark}
          cardSurface={cardSurface}
          goldAccentText={goldAccentText}
          mutedText={mutedText}
        />
      )}

      <MotivationApplyModal
        applyTarget={applyTarget}
        onClose={() => setApplyTarget(null)}
        allEmployees={allEmployees}
        uniquePositions={uniquePositions}
        applyEmpIds={applyEmpIds}
        setApplyEmpIds={setApplyEmpIds}
        applyPositions={applyPositions}
        setApplyPositions={setApplyPositions}
        isApplying={isApplying}
        onSubmit={handleApplyTemplateSubmit}
        isDark={isDark}
        mutedText={mutedText}
      />

      <MotivationAiBuilderModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        initialPrompt={aiInitialPrompt}
        initialBuildResult={aiInitialResult}
        companyId={companyId}
        directorId={directorId}
        userId={String(currentUser?.id || directorId)}
        templates={templates}
        onTemplatesUpdated={handleTemplatesUpdated}
        onApplyDraft={(draft) => {
          setEditingCalc(draft);
          setIsEditorOpen(true);
        }}
        theme={theme}
      />

      <MotivationCalculatorEditorModal
        isOpen={isEditorOpen}
        initialCalculator={editingCalc}
        templates={templates}
        departments={departments}
        employees={allEmployees}
        companyId={companyId}
        directorId={directorId}
        onTemplatesUpdated={handleTemplatesUpdated}
        onSaved={async (saved) => {
          setStatusBanner(`Калькулятор «${saved.title}» сохранен в базе данных PostgreSQL.`);
          await loadMotivationData();
        }}
        onClose={() => setIsEditorOpen(false)}
        theme={theme}
      />

      <MotivationDeleteCascadeModal
        isOpen={Boolean(deleteTarget)}
        calculator={deleteTarget}
        allCalculators={calculators}
        onClose={() => setDeleteTarget(null)}
        onDeleted={async (msg) => {
          setStatusBanner(msg);
          await loadMotivationData();
        }}
        theme={theme}
      />
    </div>
  );
}
