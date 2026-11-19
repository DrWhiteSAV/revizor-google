import React from 'react';
import { Calendar as CalendarIcon, Check, CheckCheck, CheckSquare, X } from 'lucide-react';
import { SubmittedReport, UserProfile } from '../../../types';
import { getAcceptedPlansForCalendarDate } from '../../../utils/planMatching';
import { CalendarReportDetailPane } from './CalendarReportDetailPane';

interface CalendarDayModalProps {
  activeModalDate: string | null;
  currentDeviceDateStr: string;
  onClose: () => void;
  onSelectModalDate: (dateStr: string) => void;
  reports: SubmittedReport[];
  filteredSubmittedReports: SubmittedReport[];
  templates: any;
  currentUser: UserProfile | null;
  availableEmployeeNames: string[];
  modalEmployeeFilter: string;
  setModalEmployeeFilter: (val: string) => void;
  modalActiveTab: 'reports' | 'checklist';
  setModalActiveTab: (tab: 'reports' | 'checklist') => void;
  modalReportIdx: number;
  setModalReportIdx: (idx: number) => void;
  selectedReport: any | null;
  setSelectedReport: (rep: any | null) => void;
  managerComment: string;
  setManagerComment: (val: string) => void;
  managerTask: string;
  setManagerTask: (val: string) => void;
  fieldComments: Record<string, string>;
  setFieldComments: (val: Record<string, string>) => void;
  selectedReaction: string | null;
  setSelectedReaction: (val: string | null) => void;
  isRecording: boolean;
  recordTimer: number;
  reviewSavedToast: boolean;
  greenThreshold: number;
  yellowThreshold: number;
  isDark: boolean;
  getReportDateStr: (r: any) => string;
  handleTogglePlanItem: (reportId: string, itemId: string, completed: boolean) => void;
  handleAddReaction: (reaction: string) => void;
  toggleManagerVoice: () => void;
  handleSaveReview: () => void;
  handleAIBossFeedback: () => void;
  onNavigate?: (path: string) => void;
}

export const CalendarDayModal: React.FC<CalendarDayModalProps> = ({
  activeModalDate,
  currentDeviceDateStr,
  onClose,
  onSelectModalDate,
  reports,
  filteredSubmittedReports,
  templates,
  currentUser,
  availableEmployeeNames,
  modalEmployeeFilter,
  setModalEmployeeFilter,
  modalActiveTab,
  setModalActiveTab,
  modalReportIdx,
  setModalReportIdx,
  selectedReport,
  setSelectedReport,
  managerComment,
  setManagerComment,
  managerTask,
  setManagerTask,
  fieldComments,
  setFieldComments,
  selectedReaction,
  setSelectedReaction,
  isRecording,
  recordTimer,
  reviewSavedToast,
  greenThreshold,
  yellowThreshold,
  isDark,
  getReportDateStr,
  handleTogglePlanItem,
  handleAddReaction,
  toggleManagerVoice,
  handleSaveReview,
  handleAIBossFeedback,
  onNavigate,
}) => {
  if (!activeModalDate) return null;

  const dayReports = filteredSubmittedReports.filter((r) => getReportDateStr(r) === activeModalDate);
  const allDayPlansForDate = getAcceptedPlansForCalendarDate(reports, activeModalDate, 'All');
  const dayPlans = getAcceptedPlansForCalendarDate(reports, activeModalDate, modalEmployeeFilter);
  const totalPlanTasks = dayPlans.reduce((acc, g) => acc + g.totalCount, 0);
  const completedPlanTasks = dayPlans.reduce((acc, g) => acc + g.completedCount, 0);
  const hasPlanTasks = totalPlanTasks > 0 || dayPlans.length > 0;
  const isFutureDate = activeModalDate > currentDeviceDateStr;

  const formattedDate = new Date(activeModalDate + 'T12:00:00').toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const showChecklist = modalActiveTab === 'checklist';

  const selectReportItem = (rep: SubmittedReport, idx: number) => {
    setModalReportIdx(idx);
    setSelectedReport(rep);
    setManagerComment(rep.managerComment || '');
    setManagerTask(rep.managerTask || '');
    setFieldComments(rep.fieldComments || {});
    setSelectedReaction(rep.managerReaction || null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      id="calendar-date-modal"
    >
      <div
        className={`relative w-full max-w-5xl h-[92vh] sm:h-[86vh] border rounded-t-3xl sm:rounded-3xl p-4 sm:p-7 shadow-2xl flex flex-col overflow-hidden font-sans backdrop-blur-md ${
          isDark
            ? 'bg-[#1A0F02]/95 border-amber-400/40 text-amber-100 shadow-[0_0_30px_rgba(244,238,142,0.2)]'
            : 'bg-[#FFFBF5]/95 border-amber-900/30 text-amber-950 shadow-xl'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3.5 mb-3 gap-3 relative z-10 shrink-0 ${
            isDark ? 'border-amber-400/20' : 'border-amber-900/15'
          }`}
        >
          <div className="flex items-start sm:items-center justify-between gap-2.5 min-w-0">
            <div className="flex items-start sm:items-center gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                  isDark
                    ? 'bg-amber-400/10 border-amber-400/30 text-[#F4EE8E]'
                    : 'bg-amber-100 border-amber-300 text-amber-900'
                }`}
              >
                <CalendarIcon size={20} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className={`text-base font-bold break-words ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                    Аудит рапортов и чеклист на {formattedDate}
                  </h4>
                  {isFutureDate && (
                    <span
                      className={`text-sm font-bold px-2.5 py-0.5 rounded-full border ${
                        isDark
                          ? 'bg-amber-400/20 border-amber-400/50 text-[#F4EE8E]'
                          : 'bg-amber-100 border-amber-400 text-amber-950'
                      }`}
                    >
                      Планируемая дата
                    </span>
                  )}
                </div>
                <p className={`text-sm mt-0.5 ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>
                  {isFutureDate
                    ? 'Просмотр ожидаемых смен и задач по принятым планам действий ИИ'
                    : 'Просмотр сданных отчетов и исполнение задач по принятым планам ИИ'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть окно"
              className={`sm:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border transition-colors cursor-pointer shrink-0 ${
                isDark
                  ? 'border-amber-400/30 text-amber-200 hover:bg-amber-400/10'
                  : 'border-amber-900/20 text-amber-950 hover:bg-amber-100'
              }`}
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:self-center">
            <div className="flex items-center gap-2 flex-1 sm:flex-initial min-w-0">
              <span className={`text-sm font-bold shrink-0 ${isDark ? 'text-amber-200' : 'text-amber-950'}`}>
                Сотрудник:
              </span>
              <select
                value={modalEmployeeFilter}
                onChange={(e) => setModalEmployeeFilter(e.target.value)}
                className={`flex-1 sm:flex-initial min-w-0 min-h-[44px] px-3 py-1.5 rounded-xl border text-sm font-semibold outline-none cursor-pointer ${
                  isDark
                    ? 'bg-[#140A01] border-amber-400/40 text-amber-100 focus:border-amber-300'
                    : 'bg-amber-50 border-amber-900/30 text-amber-950 focus:border-amber-600'
                }`}
              >
                <option value="All">
                  Все сотрудники ({allDayPlansForDate.length}{' '}
                  {allDayPlansForDate.length === 1 ? 'план' : 'планов'})
                </option>
                {availableEmployeeNames.map((name) => {
                  const count = allDayPlansForDate.filter((p) =>
                    p.employeeName.toLowerCase().includes(name.toLowerCase())
                  ).length;
                  return (
                    <option key={name} value={name}>
                      {name} {count > 0 ? `(${count})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть окно"
              className={`hidden sm:flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border transition-colors cursor-pointer shrink-0 ${
                isDark
                  ? 'border-amber-400/30 text-amber-200 hover:bg-amber-400/10'
                  : 'border-amber-900/20 text-amber-950 hover:bg-amber-100'
              }`}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs (Wrapped bubble pills) */}
        <div className="flex flex-wrap items-center gap-2 mb-3 relative z-10 shrink-0">
          <button
            type="button"
            onClick={() => setModalActiveTab('reports')}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-bold border transition-all cursor-pointer flex items-center gap-2 ${
              modalActiveTab === 'reports'
                ? isDark
                  ? 'bg-gradient-to-r from-[#F4EE8E] to-[#E7C768] text-amber-950 border-amber-300 shadow-[0_0_15px_rgba(244,238,142,0.3)]'
                  : 'bg-amber-400 border-amber-500 text-amber-950 font-bold'
                : isDark
                  ? 'bg-[#140A01]/60 border-amber-400/30 text-amber-200 hover:bg-amber-400/10'
                  : 'bg-white border-amber-900/20 text-amber-950 hover:bg-amber-50'
            }`}
          >
            <CalendarIcon size={16} />
            <span>Рапорты за день ({dayReports.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setModalActiveTab('checklist')}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-bold border transition-all cursor-pointer flex items-center gap-2 ${
              modalActiveTab === 'checklist'
                ? isDark
                  ? 'bg-gradient-to-r from-[#F4EE8E] to-[#E7C768] text-amber-950 border-amber-300 shadow-[0_0_15px_rgba(244,238,142,0.3)]'
                  : 'bg-amber-400 border-amber-500 text-amber-950 font-bold'
                : isDark
                  ? 'bg-[#140A01]/60 border-amber-400/30 text-amber-200 hover:bg-amber-400/10'
                  : 'bg-white border-amber-900/20 text-amber-950 hover:bg-amber-50'
            }`}
          >
            <CheckSquare size={16} />
            <span>Чеклист плана ИИ ({completedPlanTasks}/{totalPlanTasks})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 flex flex-col overflow-hidden relative z-10">
          {modalActiveTab === 'reports' && dayReports.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 sm:p-6 space-y-4 overflow-y-auto">
              <div
                className={`w-16 h-16 rounded-2xl border flex items-center justify-center ${
                  isDark
                    ? 'bg-[#140A01] border-amber-400/30 text-amber-400'
                    : 'bg-amber-100 border-amber-300 text-amber-900'
                }`}
              >
                <CalendarIcon size={32} />
              </div>
              <div className="space-y-1.5">
                <p className={`text-base font-bold ${isDark ? 'text-amber-200' : 'text-amber-950'}`}>
                  {isFutureDate ? 'Планируемая дата • Ожидание смены и рапортов' : 'В этот день рапорты не сдавались'}
                </p>
                <p className={`text-sm max-w-md ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>
                  {isFutureDate
                    ? 'На эту дату еще нет сданных рапортов, так как дата находится в будущем. Сотрудники сдадут рапорты по завершению смены.'
                    : 'На выбранную дату сотрудники организации не отправляли рапорты.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 w-full sm:w-auto">
                {(hasPlanTasks || allDayPlansForDate.length > 0) && (
                  <button
                    type="button"
                    onClick={() => setModalActiveTab('checklist')}
                    className={`min-h-[44px] px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      isDark
                        ? 'bg-gradient-to-r from-[#F4EE8E] to-[#E7C768] text-amber-950'
                        : 'bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950'
                    }`}
                  >
                    <CheckSquare size={16} />
                    <span>Открыть задачи плана ИИ ({totalPlanTasks})</span>
                  </button>
                )}
                {isFutureDate && (
                  <button
                    type="button"
                    onClick={() => onSelectModalDate(currentDeviceDateStr)}
                    className={`min-h-[44px] px-5 py-2.5 rounded-xl font-bold text-sm border transition-all cursor-pointer ${
                      isDark
                        ? 'border-amber-400/40 text-amber-200 hover:bg-amber-400/10'
                        : 'border-amber-900/30 text-amber-950 hover:bg-amber-50'
                    }`}
                  >
                    К сегодняшнему дню
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className={`min-h-[44px] px-5 py-2.5 rounded-xl font-bold text-sm border transition-all cursor-pointer ${
                    isDark
                      ? 'border-amber-400/40 text-amber-200 hover:bg-amber-400/10'
                      : 'border-amber-900/30 text-amber-950 hover:bg-amber-50'
                  }`}
                >
                  Закрыть календарь
                </button>
              </div>
            </div>
          ) : showChecklist && !hasPlanTasks && allDayPlansForDate.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 sm:p-6 space-y-4 overflow-y-auto">
              <div
                className={`w-16 h-16 rounded-2xl border flex items-center justify-center ${
                  isDark
                    ? 'bg-[#140A01] border-amber-400/30 text-amber-400'
                    : 'bg-amber-100 border-amber-300 text-amber-900'
                }`}
              >
                <CheckSquare size={32} />
              </div>
              <div className="space-y-1.5">
                <p className={`text-base font-bold ${isDark ? 'text-amber-200' : 'text-amber-950'}`}>
                  {modalEmployeeFilter !== 'All'
                    ? `У сотрудника «${modalEmployeeFilter}» нет задач плана на эту дату`
                    : isFutureDate
                      ? 'Планы действий ИИ на эту будущую дату еще не сформированы'
                      : 'Принятых планов действий ИИ на эту дату не найдено'}
                </p>
                <p className={`text-sm max-w-md ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>
                  {modalEmployeeFilter !== 'All' && allDayPlansForDate.length > 0
                    ? `Найдено ${allDayPlansForDate.length} принятых планов у других сотрудников.`
                    : isFutureDate
                      ? 'Задачи формируются автоматически ИИ-нейросетью после верификации и принятия рапортов предшествующих смен.'
                      : 'В этот день не было запланированных задач по утвержденным планам.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {modalEmployeeFilter !== 'All' && allDayPlansForDate.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setModalEmployeeFilter('All')}
                    className={`min-h-[44px] px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer ${
                      isDark
                        ? 'bg-gradient-to-r from-[#F4EE8E] to-[#E7C768] text-amber-950'
                        : 'bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950'
                    }`}
                  >
                    Показать все принятые планы ({allDayPlansForDate.length})
                  </button>
                )}
                {dayReports.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setModalActiveTab('reports')}
                    className={`min-h-[44px] px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer ${
                      isDark
                        ? 'bg-gradient-to-r from-[#F4EE8E] to-[#E7C768] text-amber-950'
                        : 'bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950'
                    }`}
                  >
                    Смотреть рапорты за день ({dayReports.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className={`min-h-[44px] px-5 py-2.5 rounded-xl font-bold text-sm border transition-all cursor-pointer ${
                    isDark
                      ? 'border-amber-400/40 text-amber-200 hover:bg-amber-400/10'
                      : 'border-amber-900/30 text-amber-950 hover:bg-amber-50'
                  }`}
                >
                  Закрыть календарь
                </button>
              </div>
            </div>
          ) : showChecklist ? (
            <div className="flex-1 flex flex-col overflow-y-auto space-y-4 pr-1">
              <div
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 ${
                  isDark
                    ? 'bg-[#140A01]/80 border-amber-400/40 text-amber-100 shadow-[0_0_20px_rgba(244,238,142,0.15)]'
                    : 'bg-white border-amber-300 text-amber-950 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${
                      isDark
                        ? 'bg-amber-400/10 border-amber-400/30 text-[#F4EE8E]'
                        : 'bg-amber-100 border-amber-300 text-amber-900'
                    }`}
                  >
                    <CheckCheck size={24} />
                  </div>
                  <div>
                    <h4 className={`text-base font-bold ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                      Чеклист задач по принятому плану ИИ
                    </h4>
                    <p className={`text-sm ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>
                      Кликните по любой задаче, чтобы отметить статус выполнения
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <div className="text-right">
                    <div className={`text-sm font-bold ${isDark ? 'text-[#F4EE8E]' : 'text-amber-900'}`}>
                      {completedPlanTasks} из {totalPlanTasks} выполнено
                    </div>
                    <div className={`text-sm ${isDark ? 'text-stone-300' : 'text-stone-600'}`}>
                      {totalPlanTasks > 0 ? Math.round((completedPlanTasks / totalPlanTasks) * 100) : 0}% готовности
                    </div>
                  </div>
                  <div className="w-24 h-2.5 rounded-full bg-amber-950/30 overflow-hidden border border-amber-400/30">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-[#F4EE8E] transition-all duration-300"
                      style={{
                        width: `${totalPlanTasks > 0 ? Math.round((completedPlanTasks / totalPlanTasks) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pb-4">
                {dayPlans.map((group) => (
                  <div
                    key={group.reportId}
                    className={`p-4 sm:p-5 rounded-2xl border space-y-3 transition-all ${
                      isDark
                        ? 'bg-[#140A01]/70 border-amber-400/30 text-amber-100'
                        : 'bg-amber-50/70 border-amber-900/20 text-amber-950'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-amber-400/20">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-sm font-bold border ${
                              group.periodType === 'week'
                                ? isDark
                                  ? 'bg-amber-500/20 text-[#F4EE8E] border-amber-400/40'
                                  : 'bg-amber-100 text-amber-950 border-amber-400'
                                : group.periodType === 'month'
                                  ? isDark
                                    ? 'bg-amber-600/20 text-amber-300 border-amber-500/40'
                                    : 'bg-amber-100 text-amber-900 border-amber-400'
                                  : isDark
                                    ? 'bg-amber-400/15 text-amber-200 border-amber-400/30'
                                    : 'bg-amber-50 text-amber-950 border-amber-300'
                            }`}
                          >
                            {group.periodLabel}
                          </span>
                          <span className={`text-sm ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>
                            Срок: {group.targetDate}
                          </span>
                        </div>
                        <p className={`text-sm ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>
                          Источник: <span className="font-semibold">{group.sourceTemplateTitle}</span> ({group.employeeName},
                          сдан {group.sourceReportDate})
                        </p>
                      </div>

                      <div
                        className={`text-sm font-bold px-2.5 py-1 rounded-lg border shrink-0 self-start sm:self-center ${
                          group.completedCount === group.totalCount
                            ? isDark
                              ? 'bg-amber-400/20 text-[#F4EE8E] border-amber-400/40'
                              : 'bg-amber-100 text-amber-950 border-amber-300'
                            : isDark
                              ? 'bg-[#1A0F02] text-amber-300 border-amber-400/30'
                              : 'bg-white text-amber-950 border-amber-900/20'
                        }`}
                      >
                        {group.completedCount}/{group.totalCount} пунктов закрыто
                      </div>
                    </div>

                    <div className="space-y-2 pt-1">
                      {group.items.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleTogglePlanItem(group.reportId, item.id, !item.completed)}
                          className={`min-h-[44px] p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                            item.completed
                              ? isDark
                                ? 'bg-amber-400/10 border-amber-400/30 opacity-80'
                                : 'bg-amber-100/60 border-amber-400/40 opacity-85'
                              : isDark
                                ? 'bg-[#1A0F02] border-amber-400/40 hover:border-amber-300 shadow-[0_0_15px_rgba(244,238,142,0.1)]'
                                : 'bg-white border-amber-900/20 hover:border-amber-700 shadow-sm'
                          }`}
                        >
                          <button
                            type="button"
                            className={`mt-0.5 w-6 h-6 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                              item.completed
                                ? isDark
                                  ? 'bg-[#F4EE8E] border-[#E7C768] text-amber-950 font-bold'
                                  : 'bg-amber-500 border-amber-600 text-amber-950 font-bold'
                                : isDark
                                  ? 'border-amber-400/50 hover:border-amber-300 bg-transparent'
                                  : 'border-amber-900/40 hover:border-amber-900 bg-transparent'
                            }`}
                          >
                            {item.completed && <Check size={14} strokeWidth={3} />}
                          </button>

                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm leading-relaxed ${
                                item.completed
                                  ? 'line-through text-stone-400'
                                  : isDark
                                    ? 'text-amber-100 font-medium'
                                    : 'text-amber-950 font-medium'
                              }`}
                            >
                              {item.title}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-sm">
                              {item.priority && (
                                <span
                                  className={`px-2 py-0.5 rounded border text-sm font-semibold ${
                                    item.priority === 'high'
                                      ? isDark
                                        ? 'bg-amber-500/20 border-amber-400/50 text-[#F4EE8E]'
                                        : 'bg-amber-100 border-amber-400 text-amber-950'
                                      : item.priority === 'medium'
                                        ? isDark
                                          ? 'bg-amber-500/10 border-amber-400/30 text-amber-300'
                                          : 'bg-amber-50 border-amber-300 text-amber-900'
                                        : isDark
                                          ? 'bg-stone-500/10 border-stone-400/20 text-stone-300'
                                          : 'bg-stone-100 border-stone-300 text-stone-700'
                                  }`}
                                >
                                  {item.priority === 'high'
                                    ? 'Высокий приоритет'
                                    : item.priority === 'medium'
                                      ? 'Средний приоритет'
                                      : 'Обычный приоритет'}
                                </span>
                              )}
                              <span
                                className={
                                  item.completed
                                    ? isDark
                                      ? 'text-[#F4EE8E] font-medium'
                                      : 'text-amber-900 font-medium'
                                    : isDark
                                      ? 'text-stone-300'
                                      : 'text-stone-700'
                                }
                              >
                                {item.completed ? 'Выполнено' : 'К исполнению'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col md:flex-row gap-4 md:gap-6 overflow-hidden">
              {/* Mobile Wrapped Bubble Switcher */}
              <div className="md:hidden shrink-0 space-y-2 pb-2 border-b border-amber-400/20">
                <span className={`block text-sm font-bold ${isDark ? 'text-amber-200' : 'text-amber-950'}`}>
                  Рапорты за день ({dayReports.length}):
                </span>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {dayReports.map((rep, idx) => {
                    const isActive = idx === modalReportIdx;
                    return (
                      <button
                        key={rep.id}
                        type="button"
                        onClick={() => selectReportItem(rep, idx)}
                        className={`min-h-[44px] px-3 py-1.5 rounded-xl border text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                          isActive
                            ? isDark
                              ? 'bg-gradient-to-r from-[#F4EE8E] to-[#E7C768] text-amber-950 border-amber-300'
                              : 'bg-amber-400 text-amber-950 border-amber-600'
                            : isDark
                              ? 'bg-[#140A01]/70 border-amber-400/30 text-amber-100'
                              : 'bg-white border-amber-900/20 text-amber-950'
                        }`}
                      >
                        <span className="truncate max-w-[160px]">{rep.employeeName}</span>
                        <span className="font-mono">{rep.qualityScore}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Desktop Left Pane */}
              <div
                className={`hidden md:block w-1/4 border-r pr-4 overflow-y-auto space-y-2 ${
                  isDark ? 'border-amber-400/20' : 'border-amber-900/15'
                }`}
              >
                <span className={`block text-sm font-semibold tracking-wide mb-2 ${isDark ? 'text-amber-200' : 'text-amber-950'}`}>
                  Рапорты ({dayReports.length})
                </span>
                <div className="space-y-2">
                  {dayReports.map((rep, idx) => {
                    const isActive = idx === modalReportIdx;
                    let scoreColor = isDark
                      ? 'text-[#F4EE8E] border-amber-400/40 bg-amber-400/10'
                      : 'text-amber-950 border-amber-400 bg-amber-100';
                    const sColor =
                      rep.statusColor ||
                      (rep.qualityScore >= greenThreshold ? 'green' : rep.qualityScore >= yellowThreshold ? 'yellow' : 'red');
                    if (sColor === 'red') {
                      scoreColor = isDark ? 'text-rose-300 border-rose-500/40 bg-rose-500/10' : 'text-rose-900 border-rose-400 bg-rose-100';
                    } else if (sColor === 'yellow') {
                      scoreColor = isDark
                        ? 'text-amber-300 border-amber-400/30 bg-amber-500/10'
                        : 'text-amber-900 border-amber-300 bg-amber-100';
                    }

                    return (
                      <button
                        key={rep.id}
                        type="button"
                        onClick={() => selectReportItem(rep, idx)}
                        className={`w-full text-left p-3 rounded-2xl border text-sm transition-all flex flex-col gap-1 cursor-pointer ${
                          isActive
                            ? isDark
                              ? 'bg-[#1A0F02] border-[#E7C768] text-white shadow-lg ring-1 ring-[#E7C768]/40'
                              : 'bg-amber-100/90 border-amber-600 text-amber-950 shadow-md ring-2 ring-amber-500/40'
                            : isDark
                              ? 'bg-[#140A01]/70 border-amber-400/20 text-stone-300 hover:bg-[#140A01]'
                              : 'bg-white/60 border-amber-900/15 text-stone-800 hover:bg-amber-50/80 hover:border-amber-400'
                        }`}
                      >
                        <div className="flex justify-between items-center gap-1.5 w-full">
                          <span className={`font-bold truncate text-sm ${isActive && !isDark ? 'text-amber-950 font-extrabold' : ''}`}>
                            {rep.employeeName}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-sm border font-mono ${scoreColor}`}>
                            {rep.qualityScore}
                          </span>
                        </div>
                        <span
                          className={`text-sm truncate ${
                            isActive && !isDark ? 'text-amber-900 font-medium' : isDark ? 'text-stone-300' : 'text-stone-600'
                          }`}
                        >
                          {rep.templateTitle}
                        </span>
                        <div
                          className={`flex justify-between items-center text-sm font-mono mt-1 pt-1 border-t ${
                            isDark ? 'text-stone-400 border-amber-400/10' : 'text-stone-600 border-amber-900/10'
                          }`}
                        >
                          <span>
                            {new Date(rep.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {rep.isReviewedByManager ? (
                            <span className={isDark ? 'text-[#F4EE8E] font-semibold' : 'text-amber-900 font-semibold'}>
                              ● Проверен
                            </span>
                          ) : (
                            <span className={isDark ? 'text-amber-300 font-semibold' : 'text-amber-800 font-semibold'}>
                              ● Сдан
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <CalendarReportDetailPane
                selectedReport={selectedReport}
                templates={templates}
                currentUser={currentUser}
                managerComment={managerComment}
                setManagerComment={setManagerComment}
                managerTask={managerTask}
                setManagerTask={setManagerTask}
                fieldComments={fieldComments}
                setFieldComments={setFieldComments}
                selectedReaction={selectedReaction}
                isRecording={isRecording}
                recordTimer={recordTimer}
                reviewSavedToast={reviewSavedToast}
                greenThreshold={greenThreshold}
                yellowThreshold={yellowThreshold}
                isDark={isDark}
                handleAddReaction={handleAddReaction}
                toggleManagerVoice={toggleManagerVoice}
                handleSaveReview={handleSaveReview}
                handleAIBossFeedback={handleAIBossFeedback}
                onCloseModal={onClose}
                onNavigate={onNavigate}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
