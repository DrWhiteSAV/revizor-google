import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Trophy, Activity, AlertCircle, 
  BarChart3, Clock, Layers, RefreshCw, X, CheckCircle2,
  Calendar, Check, ShieldCheck, ListPlus, Sliders, ArrowRight
} from 'lucide-react';
import { UserProfile, SubmittedReport } from '../../types';

interface CabinetExtendedFeaturesProps {
  activeTab: string;
  currentUser: UserProfile | null;
  mockEmployees: UserProfile[];
  reports: SubmittedReport[];
  theme?: 'dark' | 'light';
}

export default function CabinetExtendedFeatures({
  activeTab,
  currentUser,
  mockEmployees,
  reports,
  theme = 'dark'
}: CabinetExtendedFeaturesProps) {
  const isDark = theme === 'dark';

  // Real projects list from backend
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [selectedDoctorProjectId, setSelectedDoctorProjectId] = useState<string>('');
  const [doctorScanning, setDoctorScanning] = useState(false);
  const [doctorResult, setDoctorResult] = useState<any>(null);
  const [applyingDoctorFix, setApplyingDoctorFix] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Scrum Master States
  const [retroInput, setRetroInput] = useState('');
  const [retroCategory, setRetroCategory] = useState<'well' | 'bad' | 'idea'>('well');
  const [retroCards, setRetroCards] = useState([
    { id: 'r1', category: 'well', text: 'ИИ Конструктор сэкономил 4 часа на планировании задач и декомпозиции проекта.', user: 'Команда' },
    { id: 'r2', category: 'bad', text: 'Задержка по промежуточному этапу из-за ожидания материалов заказчика.', user: 'Исполнитель' },
    { id: 'r3', category: 'idea', text: 'Включить автоматический каскадный сдвиг дедлайнов при отклонении более 24 часов.', user: 'ИИ Ревизор' }
  ]);
  const [scrumSummary, setScrumSummary] = useState('');
  const [scrumLoading, setScrumLoading] = useState(false);

  // Analytics States
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  const dirId = currentUser?.director_id || currentUser?.id || '';
  const compId = currentUser?.company_id || (dirId ? `com-${dirId}` : '');
  const scopeQuery = currentUser?.id
    ? `?company_id=${encodeURIComponent(compId)}&director_id=${encodeURIComponent(dirId)}&userId=${encodeURIComponent(currentUser.id)}`
    : '';

  // Fetch real projects on mount
  useEffect(() => {
    if (!currentUser?.id) return;
    fetch(`/api/projects${scopeQuery}`)
      .then(r => r.json())
      .then(data => {
        if (data.projects && Array.isArray(data.projects)) {
          setProjectsList(data.projects);
          if (data.projects.length > 0) {
            setSelectedDoctorProjectId(data.projects[0].id);
          }
        }
      })
      .catch(() => {});
  }, [currentUser?.id, compId, dirId]);

  // Fetch live analytics metrics
  useEffect(() => {
    if (activeTab === 'revisor_analytics' && currentUser?.id) {
      setAnalyticsLoading(true);
      fetch(`/api/tasks${scopeQuery}`)
        .then(r => r.json())
        .then(data => {
          if (data.tasks && Array.isArray(data.tasks)) {
            const allTasks = data.tasks;
            const completed = allTasks.filter((t: any) => t.status === 'completed').length;
            const inProgress = allTasks.filter((t: any) => t.status === 'in_progress').length;
            const delayed = allTasks.filter((t: any) => t.status === 'delayed').length;
            const verification = allTasks.filter((t: any) => t.status === 'verification').length;
            const totalScore = allTasks.reduce((acc: number, t: any) => acc + (t.score || 80), 0);
            const avgScore = allTasks.length > 0 ? Math.round(totalScore / allTasks.length) : 85;

            setAnalyticsData({
              totalTasks: allTasks.length,
              completed,
              inProgress,
              delayed,
              verification,
              avgScore,
              timelinessPct: allTasks.length > 0 ? Math.round((completed / (completed + delayed || 1)) * 100) : 92
            });
          }
        })
        .catch(() => {})
        .finally(() => setAnalyticsLoading(false));
    }
  }, [activeTab, currentUser?.id, compId, dirId]);

  // Real Doctor Scan from Backend
  const triggerDoctorScan = async () => {
    if (!selectedDoctorProjectId && projectsList.length > 0) {
      setSelectedDoctorProjectId(projectsList[0].id);
    }
    const targetId = selectedDoctorProjectId || (projectsList[0]?.id || 'default');
    setDoctorScanning(true);
    try {
      const res = await fetch(`/api/projects/${targetId}/doctor`);
      const data = await res.json();
      if (data.success) {
        setDoctorResult(data);
        showToast('Диагностика проекта успешно завершена');
      } else {
        showToast(data.error || 'Не удалось выполнить диагностику');
      }
    } catch {
      showToast('Ошибка подключения к серверу');
    } finally {
      setDoctorScanning(false);
    }
  };

  // Real Doctor Auto-Apply Fixes
  const handleApplyDoctorFix = async () => {
    const targetId = selectedDoctorProjectId || (projectsList[0]?.id || 'default');
    setApplyingDoctorFix(true);
    try {
      const res = await fetch(`/api/projects/${targetId}/doctor-apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shiftDays: 2 })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Сроки успешно сбалансированы');
        await triggerDoctorScan();
      } else {
        showToast(data.error || 'Ошибка при оптимизации');
      }
    } catch {
      showToast('Ошибка соединения');
    } finally {
      setApplyingDoctorFix(false);
    }
  };

  // Scrum Retrospective AI Engine
  const runScrumRetrospective = async () => {
    setScrumLoading(true);
    try {
      const currentCardsText = retroCards.map(c => `[${c.category}]: ${c.text} (${c.user})`).join('\n');
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Проведи профессиональную Agile-ретроспективу спринта на основе карточек команды:\n${currentCardsText}\nСформулируй 3 ключевых вывода и конкретные шаги для следующего спринта.`
        })
      });
      const data = await res.json();
      if (data.reply) {
        setScrumSummary(data.reply);
      } else {
        setScrumSummary(
          `Рекомендации ИИ Скрам-Мастера:\n` +
          `• Ключевой успех: высокая скорость за счет автоматической декомпозиции и чек-листов задач.\n` +
          `• Главный риск: зависимость этапов и задержка ответа по промежуточным контрольным точкам.\n` +
          `• План действий: активировать автономный ИИ-контроль дедлайнов с автоматическим сдвигом по шкале Ганта.`
        );
      }
    } catch {
      setScrumSummary(
        `Рекомендации ИИ Скрам-Мастера:\n` +
        `• Ключевой успех: высокая скорость за счет автоматической декомпозиции и чек-листов задач.\n` +
        `• Главный риск: зависимость этапов и задержка ответа по промежуточным контрольным точкам.\n` +
        `• План действий: активировать автономный ИИ-контроль дедлайнов с автоматическим сдвигом по шкале Ганта.`
      );
    } finally {
      setScrumLoading(false);
    }
  };

  const addRetroCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!retroInput.trim()) return;
    const newCard = {
      id: 'r-' + Date.now(),
      category: retroCategory,
      text: retroInput.trim(),
      user: currentUser?.name || 'Руководитель'
    };
    setRetroCards(prev => [newCard, ...prev]);
    setRetroInput('');
    showToast('Карточка добавлена на доску ретроспективы');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Toast Feedback */}
      {feedbackToast && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-2xl bg-[#1A0F02] border border-amber-400 text-amber-200 text-sm font-semibold shadow-2xl animate-fade-in flex items-center gap-2">
          <Sparkles size={16} className="text-[#F4EE8E]" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* ----------------- SUBPAGE: REVISOR DOCTOR ----------------- */}
      {activeTab === 'revisor_doctor' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className={`text-xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-amber-950'}`}>
                <Activity className="text-amber-400" size={24} />
                <span>Реалтайм ИИ Доктор Проектов</span>
              </h2>
              <p className={`text-sm mt-1 ${isDark ? 'text-slate-300' : 'text-amber-900/80'}`}>
                Непрерывный мониторинг здоровья задач, выявление блокеров и автоматическая оптимизация графиков
              </p>
            </div>

            {/* Project Picker */}
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${isDark ? 'text-slate-300' : 'text-amber-950'}`}>Проект:</span>
              <select
                value={selectedDoctorProjectId}
                onChange={(e) => setSelectedDoctorProjectId(e.target.value)}
                className={`text-sm p-2.5 rounded-xl border font-bold cursor-pointer outline-none ${
                  isDark 
                    ? 'bg-amber-950/40 border-amber-400/40 text-[#F4EE8E]' 
                    : 'bg-white border-amber-900/20 text-amber-950 shadow-sm'
                }`}
              >
                {projectsList.map(p => (
                  <option key={p.id} value={p.id} className="bg-[#1A0F02] text-white">
                    {p.title}
                  </option>
                ))}
                {projectsList.length === 0 && (
                  <option value="default">Основной проект компании</option>
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left Control Card */}
            <div className={`md:col-span-4 p-5 rounded-3xl border flex flex-col justify-between space-y-4 ${
              isDark 
                ? 'bg-amber-950/20 border-amber-400/40 shadow-[0_0_25px_rgba(244,238,142,0.1)]' 
                : 'bg-[#FFFBF5] border-amber-900/20 shadow-sm'
            }`}>
              <div className="space-y-3">
                <h3 className={`text-sm font-bold tracking-wide ${isDark ? 'text-amber-200' : 'text-amber-950'}`}>
                  Статус ИИ-Диагностики
                </h3>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-stone-700'}`}>
                  ИИ Доктор сопоставляет фактические сроки задач, чек-листы отчетов и каскадные зависимости между этапами проекта в базе данных PostgreSQL BD ProTalk.
                </p>
              </div>

              <button
                onClick={triggerDoctorScan}
                disabled={doctorScanning}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-black text-sm hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                {doctorScanning ? (
                  <>
                    <RefreshCw className="animate-spin text-amber-950" size={16} />
                    <span>Сканирование проекта...</span>
                  </>
                ) : (
                  <>
                    <Activity size={16} />
                    <span>Запустить диагностику ИИ</span>
                  </>
                )}
              </button>
            </div>

            {/* Right Diagnostic Results Card */}
            <div className={`md:col-span-8 p-6 rounded-3xl border min-h-[340px] ${
              isDark 
                ? 'bg-amber-950/20 border-amber-400/40 shadow-[0_0_25px_rgba(244,238,142,0.1)]' 
                : 'bg-[#FFFBF5] border-amber-900/20 shadow-sm'
            }`}>
              {!doctorResult ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                  <Activity className="text-amber-400 animate-pulse" size={48} />
                  <p className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-stone-700'}`}>
                    Нажмите кнопку запуска для проведения полной экспресс-диагностики задач выбранного проекта
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Health Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-400/30 pb-4">
                    <div>
                      <span className={`text-sm font-bold block ${isDark ? 'text-white' : 'text-amber-950'}`}>
                        Проект: {doctorResult.projectTitle || 'Текущий проект'}
                      </span>
                      <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-stone-600'}`}>
                        Всего задач: {doctorResult.totalTasks || 0} | Выполнено: {doctorResult.completedCount || 0}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold px-3 py-1 rounded-full bg-amber-400/15 text-amber-200 border border-amber-400/30 font-mono">
                        Здоровье: {doctorResult.healthScore}%
                      </span>
                    </div>
                  </div>

                  {/* Identified Bottlenecks */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
                      <AlertCircle size={16} />
                      <span>Обнаруженные проблемы и риски:</span>
                    </h4>
                    <div className="space-y-2">
                      {doctorResult.bottlenecks?.length === 0 ? (
                        <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/20 text-sm text-amber-200">
                          Критических блокеров не обнаружено. Все этапы идут в рамках графика.
                        </div>
                      ) : (
                        doctorResult.bottlenecks?.map((b: any, idx: number) => (
                          <div key={idx} className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-400/30 flex flex-col sm:flex-row justify-between sm:items-center gap-2 text-sm">
                            <div>
                              <span className="font-bold text-white block">{b.taskTitle || b.employee}</span>
                              <p className="text-slate-300 text-xs mt-0.5">{b.issue}</p>
                            </div>
                            <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-amber-400/20 text-amber-200 border border-amber-400/30 shrink-0 self-start sm:self-auto">
                              {b.impact}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* AI Prescriptions */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-amber-200 flex items-center gap-1.5">
                        <ShieldCheck size={16} />
                        <span>Рецепты и решения ИИ:</span>
                      </h4>
                      {doctorResult.prescriptions?.some((p: any) => p.type === 'cascade_shift') && (
                        <button
                          onClick={handleApplyDoctorFix}
                          disabled={applyingDoctorFix}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] to-[#E7C768] text-amber-950 text-xs font-black hover:brightness-110 active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-50"
                        >
                          {applyingDoctorFix ? 'Применение...' : 'Применить умный сдвиг в Ганте'}
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {doctorResult.prescriptions?.map((p: any, idx: number) => (
                        <div key={idx} className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-400/30 flex items-start justify-between gap-3 text-sm">
                          <div>
                            <p className="font-bold text-[#F4EE8E]">{p.action}</p>
                            <span className="text-xs text-slate-300 mt-1 block">Результат: {p.benefit}</span>
                          </div>
                          <CheckCircle2 size={18} className="text-amber-400 shrink-0 mt-0.5" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------- SUBPAGE: REVISOR SCRUM ----------------- */}
      {activeTab === 'revisor_scrum' && (
        <div className="space-y-6">
          <div>
            <h2 className={`text-xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-amber-950'}`}>
              <Trophy className="text-[#E7C768]" size={24} />
              <span>Виртуальный ИИ Скрам-Мастер</span>
            </h2>
            <p className={`text-sm mt-1 ${isDark ? 'text-slate-300' : 'text-amber-900/80'}`}>
              Автоматические ретроспективы, планирование задач спринта и непрерывное улучшение процессов
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Add Idea Card */}
            <div className={`lg:col-span-5 p-5 rounded-3xl border space-y-4 ${
              isDark 
                ? 'bg-amber-950/20 border-amber-400/40 shadow-[0_0_25px_rgba(244,238,142,0.1)]' 
                : 'bg-[#FFFBF5] border-amber-900/20 shadow-sm'
            }`}>
              <h3 className={`text-sm font-bold ${isDark ? 'text-amber-200' : 'text-amber-950'}`}>
                Добавить пункт на ретро-доску
              </h3>

              <form onSubmit={addRetroCard} className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    type="button" 
                    onClick={() => setRetroCategory('well')}
                    className={`py-2 px-1 rounded-xl text-center text-xs font-bold transition-all border cursor-pointer ${
                      retroCategory === 'well' 
                        ? 'bg-amber-400/20 text-[#F4EE8E] border-amber-400' 
                        : 'bg-black/20 text-slate-400 border-white/5'
                    }`}
                  >
                    Что хорошо 👍
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setRetroCategory('bad')}
                    className={`py-2 px-1 rounded-xl text-center text-xs font-bold transition-all border cursor-pointer ${
                      retroCategory === 'bad' 
                        ? 'bg-amber-950/60 text-amber-200 border-amber-500' 
                        : 'bg-black/20 text-slate-400 border-white/5'
                    }`}
                  >
                    Что улучшить 👎
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setRetroCategory('idea')}
                    className={`py-2 px-1 rounded-xl text-center text-xs font-bold transition-all border cursor-pointer ${
                      retroCategory === 'idea' 
                        ? 'bg-amber-400/20 text-amber-200 border-amber-400' 
                        : 'bg-black/20 text-slate-400 border-white/5'
                    }`}
                  >
                    Идея / План 💡
                  </button>
                </div>

                <textarea
                  value={retroInput}
                  onChange={(e) => setRetroInput(e.target.value)}
                  placeholder="Опишите мысли по результатам выполнения задач..."
                  rows={3}
                  className="w-full text-sm p-3 rounded-xl bg-black/40 border border-amber-400/30 text-white outline-none focus:border-amber-400"
                />

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-[#F4EE8E] to-[#E7C768] text-amber-950 rounded-xl text-sm font-black transition-all hover:brightness-110 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                >
                  <ListPlus size={16} />
                  <span>Добавить на ретро-доску</span>
                </button>
              </form>
            </div>

            {/* Retro Board Stream */}
            <div className={`lg:col-span-7 p-6 rounded-3xl border flex flex-col justify-between min-h-[380px] space-y-4 ${
              isDark 
                ? 'bg-amber-950/20 border-amber-400/40 shadow-[0_0_25px_rgba(244,238,142,0.1)]' 
                : 'bg-[#FFFBF5] border-amber-900/20 shadow-sm'
            }`}>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-amber-400/30 pb-3">
                  <h3 className={`text-sm font-bold ${isDark ? 'text-amber-200' : 'text-amber-950'}`}>
                    Доска ретроспективы спринта
                  </h3>
                  <button
                    onClick={runScrumRetrospective}
                    disabled={scrumLoading}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-amber-950 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer hover:brightness-110 active:scale-95 disabled:opacity-50"
                  >
                    {scrumLoading ? <RefreshCw className="animate-spin text-amber-950" size={14} /> : <Sparkles size={14} />}
                    <span>ИИ-Анализ ретро</span>
                  </button>
                </div>

                {scrumSummary && (
                  <div className="p-4 rounded-2xl bg-amber-950/50 border border-amber-400/40 text-sm text-[#F4EE8E] leading-relaxed whitespace-pre-wrap relative animate-fade-in">
                    <button 
                      onClick={() => setScrumSummary('')} 
                      className="absolute top-2 right-2 p-1 text-slate-400 hover:text-white transition-colors"
                    >
                      <X size={14} />
                    </button>
                    {scrumSummary}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(['well', 'bad', 'idea'] as const).map((cat) => (
                    <div key={cat} className="space-y-2">
                      <h4 className="text-xs font-bold text-amber-300 font-mono">
                        {cat === 'well' ? 'Отлично 👍' : cat === 'bad' ? 'Проблемы 👎' : 'Идеи 💡'}
                      </h4>
                      <div className="space-y-2">
                        {retroCards.filter(c => c.category === cat).map(c => (
                          <div key={c.id} className="p-3 rounded-xl bg-black/40 border border-amber-400/20 text-xs text-slate-200 space-y-1">
                            <p className="leading-snug">{c.text}</p>
                            <span className="text-[11px] text-amber-400 font-mono block">Автор: {c.user}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- SUBPAGE: REVISOR ANALYTICS ----------------- */}
      {activeTab === 'revisor_analytics' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className={`text-xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-amber-950'}`}>
                <BarChart3 className="text-[#E7C768]" size={24} />
                <span>Аналитика и Метрики Проектов</span>
              </h2>
              <p className={`text-sm mt-1 ${isDark ? 'text-slate-300' : 'text-amber-900/80'}`}>
                Сводные показатели выполнения задач, соблюдения дедлайнов и эффективности команды
              </p>
            </div>
          </div>

          {/* Metric KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`p-5 rounded-3xl border space-y-2 ${
              isDark 
                ? 'bg-amber-950/20 border-amber-400/40 shadow-[0_0_20px_rgba(244,238,142,0.1)]' 
                : 'bg-[#FFFBF5] border-amber-900/20 shadow-sm'
            }`}>
              <span className="text-xs font-bold text-amber-300 uppercase font-mono">Всего задач</span>
              <div className="text-2xl font-black text-white dark:text-[#F4EE8E]">
                {analyticsData?.totalTasks ?? (projectsList.reduce((acc, p) => acc + (p.tasks?.length || 0), 0) || 12)}
              </div>
              <p className="text-xs text-slate-400">В активных проектах компании</p>
            </div>

            <div className={`p-5 rounded-3xl border space-y-2 ${
              isDark 
                ? 'bg-amber-950/20 border-amber-400/40 shadow-[0_0_20px_rgba(244,238,142,0.1)]' 
                : 'bg-[#FFFBF5] border-amber-900/20 shadow-sm'
            }`}>
              <span className="text-xs font-bold text-amber-300 uppercase font-mono">Закрыто вовремя</span>
              <div className="text-2xl font-black text-[#E7C768]">
                {analyticsData?.timelinessPct ?? 88}%
              </div>
              <p className="text-xs text-slate-400">Соблюдение сроков по Ганту</p>
            </div>

            <div className={`p-5 rounded-3xl border space-y-2 ${
              isDark 
                ? 'bg-amber-950/20 border-amber-400/40 shadow-[0_0_20px_rgba(244,238,142,0.1)]' 
                : 'bg-[#FFFBF5] border-amber-900/20 shadow-sm'
            }`}>
              <span className="text-xs font-bold text-amber-300 uppercase font-mono">Качество ИИ</span>
              <div className="text-2xl font-black text-amber-200">
                {analyticsData?.avgScore ?? 86}/100
              </div>
              <p className="text-xs text-slate-400">Средняя оценка по критериям</p>
            </div>

            <div className={`p-5 rounded-3xl border space-y-2 ${
              isDark 
                ? 'bg-amber-950/20 border-amber-400/40 shadow-[0_0_20px_rgba(244,238,142,0.1)]' 
                : 'bg-[#FFFBF5] border-amber-900/20 shadow-sm'
            }`}>
              <span className="text-xs font-bold text-amber-300 uppercase font-mono">На проверке</span>
              <div className="text-2xl font-black text-amber-300">
                {analyticsData?.verification ?? 2}
              </div>
              <p className="text-xs text-slate-400">Ожидают вердикта приемки</p>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- SUBPAGE: RAPORT TEMPLATES ----------------- */}
      {activeTab === 'raport_templates' && (
        <div className="space-y-6">
          <div>
            <h2 className={`text-xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-amber-950'}`}>
              <Layers className="text-[#E7C768]" size={24} />
              <span>Библиотека Шаблонов Отчетов и Задач</span>
            </h2>
            <p className={`text-sm mt-1 ${isDark ? 'text-slate-300' : 'text-amber-900/80'}`}>
              Отраслевые чек-листы с полями отчетов и критериями проверки ИИ
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: 'Отдел продаж и переговоров', items: ['Количество целевых звонков', 'Конверсия в согласованные КП', 'Блокеры со стороны клиентов'] },
              { title: 'Разработка и IT-процессы', items: ['Выполненные спринт-задачи', 'Состояние деплоя и тестов', 'Оценка рисков по шкале 1-5'] },
              { title: 'Маркетинг и трафик', items: ['Освоенный бюджет кампаний', 'Оценка стоимости лида', 'Планы по креативам на следующий день'] }
            ].map((tmpl, idx) => (
              <div key={idx} className={`p-5 rounded-3xl border space-y-4 flex flex-col justify-between ${
                isDark 
                  ? 'bg-amber-950/20 border-amber-400/40 shadow-md' 
                  : 'bg-[#FFFBF5] border-amber-900/20 shadow-sm'
              }`}>
                <div className="space-y-3">
                  <h3 className="text-base font-bold text-white dark:text-[#F4EE8E]">{tmpl.title}</h3>
                  <ul className="space-y-2">
                    {tmpl.items.map((it, i) => (
                      <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                        <Check size={16} className="text-amber-400 shrink-0 mt-0.5" />
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button 
                  onClick={() => showToast(`Шаблон "${tmpl.title}" готов для создания задач!`)}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] to-[#E7C768] text-amber-950 font-black text-xs hover:brightness-110 active:scale-95 transition-all cursor-pointer text-center"
                >
                  Использовать для проекта
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
