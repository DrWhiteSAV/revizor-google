import React, { useState } from 'react';
import { 
  Sparkles, ShieldCheck, AlertTriangle, TrendingUp, 
  Clock, Users, BarChart3, RefreshCw, MessageSquare, 
  CheckCircle2, ArrowRight, Play
} from 'lucide-react';
import { DoctorCascadeDiagnosticsModal } from './DoctorCascadeDiagnosticsModal';
import { DoctorDiagnosticCardItem, DiagnosticResultItem } from './DoctorDiagnosticCardItem';
import { DoctorFeedbackModal } from './DoctorFeedbackModal';
import { DoctorInsightsSection } from '../mentor/DoctorInsightsSection';

interface CabinetDoctorAnalyticsProps {
  currentUser?: any;
  mockEmployees?: any[];
  reports?: any[];
  theme?: 'dark' | 'light';
}

export const CabinetDoctorAnalytics: React.FC<CabinetDoctorAnalyticsProps> = ({
  currentUser,
  mockEmployees = [],
  reports = [],
  theme = 'dark'
}) => {
  const isDark = theme === 'dark';

  // Diagnostic states
  const [isDiagnosticModalOpen, setIsDiagnosticModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [healthIndex, setHealthIndex] = useState(89);
  const [liveMetrics, setLiveMetrics] = useState<any>(null);
  const [lastCheckTime, setLastCheckTime] = useState<string>('сегодня');

  // Diagnostic results list
  const [resultsList, setResultsList] = useState<DiagnosticResultItem[]>([
    {
      id: 'diag-1',
      category: 'deadlines',
      title: 'Контроль дедлайнов и графиков задач',
      score: 94,
      status: 'good',
      summary: '94% задач выполняются в срок, критических задержек по спринту не выявлено.',
      details: 'ИИ Ревизор проанализировал 32 активные задачи во всех проектах. Среднее время выполнения составляет 2.4 дня от плана. Своевременность сдачи выросла на 8% по сравнению с прошлой неделей.',
      affectedItems: ['Проект: Редизайн мобильного кабинета (12 задач)', 'Проект: Запуск промо-кампании (8 задач)'],
      recommendation: 'Сохранять текущий темп планирования, дедлайны установлены с достаточным запасом.'
    },
    {
      id: 'diag-2',
      category: 'workload',
      title: 'Баланс загрузки команды и узкие места',
      score: 78,
      status: 'warning',
      summary: 'Высокая концентрация ключевых задач на старшем разработчике.',
      details: 'У ведущего специалиста в работе находится 6 параллельных задач с пересекающимися сроками сдачи. Это создает узкое горлышко для зависимых этапов дизайна и тестирования.',
      affectedItems: ['Исполнитель: Алексей Смирнов (6 задач)', 'Задача: Интеграция API платежей'],
      recommendation: 'Рекомендуется делегировать 2 вспомогательные задачи мидл-специалистам для разгрузки.'
    },
    {
      id: 'diag-3',
      category: 'verification',
      title: 'Качество отчетов и фотоподтверждений',
      score: 92,
      status: 'good',
      summary: 'В 92% задач прикреплены корректные скриншоты, фото и документы.',
      details: 'Нейросеть распознала все прикрепленные скриншоты и чеки. Текстовые описания содержат необходимые цифры и ссылки. Средний балл проверки задач составляет 88.5.',
      affectedItems: ['Отдел маркетинга: 100% подтверждений', 'Отдел логистики: 84% подтверждений'],
      recommendation: 'Продолжать использовать автоматическую каскадную проверку с минимальным порогом 80 баллов.'
    },
    {
      id: 'diag-4',
      category: 'budget',
      title: 'Оценка рисков срыва спринта',
      score: 86,
      status: 'good',
      summary: 'Риск срыва контрольных дат составляет менее 14%.',
      details: 'Математическая модель ИИ Ревизора прогнозирует успешное закрытие спринта в расчетную дату с вероятностью 86%. Критических блокеров в архитектуре проектов не обнаружено.',
      affectedItems: ['Спринт №14: дата закрытия через 4 дня'],
      recommendation: 'Провести пятничный статус-митинг по текущим результатам.'
    }
  ]);

  const handleDiagnosticFinished = (res: any) => {
    if (res?.healthIndex) setHealthIndex(res.healthIndex);
    setLastCheckTime('только что');
  };

  return (
    <div className={`p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl mx-auto font-sans min-h-[85vh] ${
      isDark ? 'text-[#F4EE8E]' : 'text-amber-950'
    }`}>
      {/* Top Banner / Hero Card */}
      <div className={`p-5 sm:p-7 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all ${
        isDark
          ? 'bg-[#1A0F02]/85 border-[#E7C768]/50 shadow-[0_0_35px_rgba(244,238,142,0.18)]'
          : 'bg-[#FAF6EC]/90 border-[#B8860B]/40 shadow-lg'
      }`}>
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/20 text-[#E7C768]">
              <Sparkles size={26} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#E7C768]">
                ИИ Ревизор — он же ИИ Доктор проектов
              </h1>
              <p className="text-sm opacity-85 mt-0.5">
                Комплексная диагностика рисков, аналитика спринтов и персональная обратная связь
              </p>
            </div>
          </div>
          <div className="text-xs opacity-75 font-mono pt-1">
            Последняя диагностика: {lastCheckTime}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setIsDiagnosticModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 text-sm font-bold hover:brightness-105 cursor-pointer shadow-md flex items-center gap-2 transition-all"
          >
            <Play size={16} />
            <span>Запустить диагностику</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFeedbackModalOpen(true)}
            className="px-4 py-2.5 rounded-xl border border-amber-500/40 hover:bg-amber-500/10 text-sm font-bold flex items-center gap-2 cursor-pointer transition-colors"
          >
            <MessageSquare size={16} />
            <span>Дать обратную связь</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className={`p-5 rounded-2xl border ${
          isDark ? 'bg-[#1A0F02]/70 border-[#E7C768]/40' : 'bg-[#FAF6EC]/85 border-[#B8860B]/30'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold opacity-75">Индекс здоровья проектов</span>
            <ShieldCheck size={18} className="text-[#E7C768]" />
          </div>
          <div className="text-2xl font-black font-mono text-[#E7C768]">{healthIndex}%</div>
          <div className="text-sm opacity-75 mt-1">Золотая зона стабильности</div>
        </div>

        {/* Metric 2 */}
        <div className={`p-5 rounded-2xl border ${
          isDark ? 'bg-[#1A0F02]/70 border-[#E7C768]/40' : 'bg-[#FAF6EC]/85 border-[#B8860B]/30'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold opacity-75">Выполнено с ИИ проверкой</span>
            <CheckCircle2 size={18} className="text-[#E7C768]" />
          </div>
          <div className="text-2xl font-black font-mono text-[#E7C768]">
            {liveMetrics && liveMetrics.totalTasks > 0
              ? `${Math.round((liveMetrics.completedTasks / liveMetrics.totalTasks) * 100)}%`
              : '88%'}
          </div>
          <div className="text-sm opacity-75 mt-1">
            {liveMetrics && liveMetrics.avgScore > 0
              ? `Средний балл качества: ${liveMetrics.avgScore}б`
              : 'Ожидает первых сданных задач'}
          </div>
        </div>

        {/* Metric 3 */}
        <div className={`p-5 rounded-2xl border ${
          isDark ? 'bg-[#1A0F02]/70 border-[#E7C768]/40' : 'bg-[#FAF6EC]/85 border-[#B8860B]/30'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold opacity-75">Соблюдение сроков</span>
            <Clock size={18} className="text-[#E7C768]" />
          </div>
          <div className="text-2xl font-black font-mono text-[#E7C768]">
            {liveMetrics ? `${liveMetrics.onTimeRate}%` : '94.2%'}
          </div>
          <div className="text-sm opacity-75 mt-1">
            {liveMetrics
              ? `Высокий риск: ${liveMetrics.highRiskCount}, с блокерами: ${liveMetrics.stuckCount}`
              : 'Мониторинг активных сроков'}
          </div>
        </div>

        {/* Metric 4 */}
        <div className={`p-5 rounded-2xl border ${
          isDark ? 'bg-[#1A0F02]/70 border-[#E7C768]/40' : 'bg-[#FAF6EC]/85 border-[#B8860B]/30'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold opacity-75">Задачи в работе</span>
            <Users size={18} className="text-[#E7C768]" />
          </div>
          <div className="text-2xl font-black font-mono text-[#E7C768]">
            {liveMetrics ? `${liveMetrics.activeTasks} / ${liveMetrics.totalTasks}` : '18 / 20'}
          </div>
          <div className="text-sm opacity-75 mt-1">Активных к общему числу</div>
        </div>
      </div>

      {/* Live Proactive Radar, Pending Shift Approvals & AI Insights */}
      <DoctorInsightsSection
        companyId={currentUser?.company_id || currentUser?.company || ''}
        reviewerName={currentUser?.name || 'Руководитель'}
        isDark={isDark}
        onOverviewLoaded={(m) => {
          if (m) {
            setLiveMetrics(m);
            if (typeof m.healthIndex === 'number') setHealthIndex(m.healthIndex);
          }
        }}
      />

      {/* Diagnostic Findings Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#E7C768] flex items-center gap-2">
            <span>Результаты каскадной диагностики ИИ Доктора</span>
            <span className="text-xs font-mono opacity-70">({resultsList.length} направлений)</span>
          </h2>
          <span className="text-xs opacity-75 italic">Нажмите на карточку для просмотра деталей</span>
        </div>

        <div className="space-y-3">
          {resultsList.map(item => (
            <DoctorDiagnosticCardItem
              key={item.id}
              item={item}
              isDark={isDark}
            />
          ))}
        </div>
      </div>

      {/* CASCADE DIAGNOSTICS MODAL */}
      <DoctorCascadeDiagnosticsModal
        isOpen={isDiagnosticModalOpen}
        onClose={() => setIsDiagnosticModalOpen(false)}
        onFinished={handleDiagnosticFinished}
        isDark={isDark}
      />

      {/* TEAM FEEDBACK MODAL */}
      <DoctorFeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        employees={mockEmployees}
        isDark={isDark}
      />
    </div>
  );
};

export default CabinetDoctorAnalytics;
