import React from 'react';
import {
  AlertTriangle,
  Award,
  CheckCircle,
  ExternalLink,
  Eye,
  Mic,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { UserProfile, UserRole } from '../../../types';
import VoiceEqualizer from '../../VoiceEqualizer';

interface CalendarReportDetailPaneProps {
  selectedReport: any | null;
  templates: any;
  currentUser: UserProfile | null;
  managerComment: string;
  setManagerComment: (val: string) => void;
  managerTask: string;
  setManagerTask: (val: string) => void;
  fieldComments: Record<string, string>;
  setFieldComments: (val: Record<string, string>) => void;
  selectedReaction: string | null;
  isRecording: boolean;
  recordTimer: number;
  reviewSavedToast: boolean;
  greenThreshold: number;
  yellowThreshold: number;
  isDark: boolean;
  handleAddReaction: (reaction: string) => void;
  toggleManagerVoice: () => void;
  handleSaveReview: () => void;
  handleAIBossFeedback: () => void;
  onCloseModal: () => void;
  onNavigate?: (path: string) => void;
}

export const CalendarReportDetailPane: React.FC<CalendarReportDetailPaneProps> = ({
  selectedReport,
  templates,
  currentUser,
  managerComment,
  setManagerComment,
  managerTask,
  setManagerTask,
  fieldComments,
  setFieldComments,
  selectedReaction,
  isRecording,
  recordTimer,
  reviewSavedToast,
  greenThreshold,
  yellowThreshold,
  isDark,
  handleAddReaction,
  toggleManagerVoice,
  handleSaveReview,
  handleAIBossFeedback,
  onCloseModal,
  onNavigate,
}) => {
  const isLeader =
    currentUser?.role === UserRole.DIRECTOR ||
    currentUser?.role === UserRole.MANAGER ||
    currentUser?.role === UserRole.ADMIN;

  return (
    <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 space-y-5 text-sm">
      {reviewSavedToast && (
        <div
          className={`p-3.5 rounded-2xl border text-sm flex items-center gap-2.5 shadow-lg animate-fade-in ${
            isDark ? 'border-amber-400/60 bg-[#1A0F02] text-amber-200' : 'border-amber-500/50 bg-amber-50 text-amber-950'
          }`}
        >
          <CheckCircle size={18} className={isDark ? 'text-[#F4EE8E] shrink-0' : 'text-amber-600 shrink-0'} />
          <span>Рецензия руководителя и оценка успешно зафиксированы в базе данных PostgreSQL BD ProTalk.</span>
        </div>
      )}

      {selectedReport && (
        <>
          {/* Report Header Info */}
          <div
            className={`flex justify-between items-start border-b pb-4 flex-wrap gap-3 ${
              isDark ? 'border-amber-400/20' : 'border-amber-900/15'
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-sm px-2.5 py-0.5 rounded-full font-mono font-bold border ${
                    isDark
                      ? 'bg-[#1A0F02] text-amber-200 border-amber-400/30'
                      : 'bg-amber-100 text-amber-950 border-amber-300'
                  }`}
                >
                  {selectedReport.type}
                </span>
                <span className={`text-sm font-bold ${isDark ? 'text-[#E7C768]' : 'text-amber-950'}`}>
                  {selectedReport.departmentName}
                </span>
                <span
                  className={`text-sm px-2.5 py-0.5 rounded-md font-semibold border ${
                    selectedReport.isReviewedByManager
                      ? isDark
                        ? 'bg-amber-400/20 border-amber-400/40 text-[#F4EE8E]'
                        : 'bg-amber-100 border-amber-300 text-amber-950'
                      : isDark
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                        : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}
                >
                  {selectedReport.isReviewedByManager ? 'Проверен руководителем' : 'Сдан (ожидает проверки)'}
                </span>
              </div>
              <h5 className={`text-base font-bold mt-1.5 break-words ${isDark ? 'text-white' : 'text-amber-950'}`}>
                {selectedReport.templateTitle} — {selectedReport.employeeName}
              </h5>
              <p className={`text-sm font-mono mt-0.5 break-words ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>
                ID рапорта: #{selectedReport.id} | Сдано в {new Date(selectedReport.timestamp).toLocaleString('ru-RU')}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (onNavigate) {
                      onNavigate(`/cabinet/raport/review/${selectedReport.id}`);
                    } else {
                      window.location.assign(`/cabinet/raport/review/${selectedReport.id}`);
                    }
                  }}
                  className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                    isDark
                      ? 'bg-amber-400/20 border-amber-400/50 text-[#F4EE8E] hover:bg-amber-400/30'
                      : 'bg-amber-100 border-amber-400 text-amber-950 hover:bg-amber-200'
                  }`}
                >
                  <Eye size={16} />
                  <span>
                    {selectedReport.isReviewedByManager ? 'Смотреть / изменить рецензию' : 'Перейти к проверке отчета'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onCloseModal();
                    if (onNavigate) {
                      onNavigate(`/cabinet/raport/verdict/${selectedReport.id}`);
                    } else {
                      window.location.assign(`/cabinet/raport/verdict/${selectedReport.id}`);
                    }
                  }}
                  className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm ${
                    isDark
                      ? 'border-amber-400/50 bg-amber-400/15 hover:bg-amber-400/25 text-[#F4EE8E]'
                      : 'border-amber-500 bg-amber-400 hover:bg-amber-500 text-amber-950'
                  }`}
                >
                  <ExternalLink size={15} />
                  <span>Страница вердикта</span>
                </button>
              </div>
            </div>

            {/* Score Card */}
            {(() => {
              const sColor =
                selectedReport.statusColor ||
                (selectedReport.qualityScore >= greenThreshold
                  ? 'green'
                  : selectedReport.qualityScore >= yellowThreshold
                    ? 'yellow'
                    : 'red');
              let boxClass = isDark ? 'bg-amber-500/15 border-amber-400/40' : 'bg-amber-50 border-amber-400/60';
              let labelClass = isDark ? 'text-amber-200' : 'text-amber-900';
              let scoreValClass = isDark ? 'text-[#F4EE8E]' : 'text-amber-950';
              if (sColor === 'red') {
                boxClass = isDark ? 'bg-rose-500/15 border-rose-500/40' : 'bg-rose-50 border-rose-300';
                labelClass = isDark ? 'text-rose-200' : 'text-rose-900';
                scoreValClass = isDark ? 'text-rose-300' : 'text-rose-950';
              } else if (sColor === 'yellow') {
                boxClass = isDark ? 'bg-amber-500/15 border-amber-400/30' : 'bg-amber-50 border-amber-300';
                labelClass = isDark ? 'text-amber-200' : 'text-amber-900';
                scoreValClass = isDark ? 'text-amber-300' : 'text-amber-950';
              }

              return (
                <div className={`text-center border px-3.5 py-2 rounded-xl min-w-[110px] ${boxClass}`}>
                  <span className={`block text-sm font-semibold ${labelClass}`}>Оценка ИИ</span>
                  <span className={`text-base font-extrabold font-mono ${scoreValClass}`}>
                    {selectedReport.qualityScore}/100
                  </span>
                </div>
              );
            })()}
          </div>

          {/* AI Urgent Attention Warning */}
          {(() => {
            const sColor =
              selectedReport.statusColor ||
              (selectedReport.qualityScore >= greenThreshold
                ? 'green'
                : selectedReport.qualityScore >= yellowThreshold
                  ? 'yellow'
                  : 'red');
            if (sColor === 'red') {
              return (
                <div
                  className={`p-3.5 rounded-2xl border flex items-start gap-2.5 relative z-10 ${
                    isDark ? 'border-rose-500/40 bg-rose-950/40 text-rose-200' : 'border-rose-300 bg-rose-50 text-rose-950'
                  }`}
                >
                  <AlertTriangle
                    className={isDark ? 'text-rose-400 flex-shrink-0 mt-0.5' : 'text-rose-600 flex-shrink-0 mt-0.5'}
                    size={18}
                  />
                  <div className="space-y-0.5">
                    <span className={`block text-sm font-bold ${isDark ? 'text-rose-300' : 'text-rose-900'}`}>
                      Требует внимания
                    </span>
                    <p className={`text-sm leading-relaxed ${isDark ? 'text-rose-200/90' : 'text-rose-950'}`}>
                      Нейросеть отметила этот рапорт красным цветом. Требуется детальное рассмотрение показателей сотрудника или оперативная обратная связь от руководителя.
                    </p>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-4">
            {/* Answers Panel */}
            <div className="space-y-4">
              <div
                className={`p-4 rounded-2xl border space-y-1.5 ${
                  isDark ? 'bg-[#140A01]/80 border-amber-400/30' : 'bg-amber-50/70 border-amber-900/20'
                }`}
              >
                <h6 className={`text-sm font-bold flex items-center gap-1.5 ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                  🤖 Быстрый факт от ИИ:
                </h6>
                <p className={`leading-relaxed italic text-sm ${isDark ? 'text-amber-100' : 'text-stone-800'}`}>
                  "{selectedReport.aiSummary || 'Смена зафиксирована успешно. Инцидентов не зафиксировано, показатели соответствуют нормативам.'}"
                </p>
              </div>

              <div className="space-y-2">
                <h6 className={`text-sm font-bold ${isDark ? 'text-amber-200/90' : 'text-amber-950'}`}>
                  Ответы в анкете:
                </h6>
                <div
                  className={`p-4 rounded-2xl border space-y-4 ${
                    isDark
                      ? 'bg-[#140A01]/70 border-amber-400/30 text-amber-100'
                      : 'bg-white border-amber-900/20 text-stone-900 shadow-sm'
                  }`}
                >
                  {(() => {
                    const reportTemplate = templates?.find(
                      (t: any) =>
                        t.id === selectedReport.templateId || t.id === (selectedReport as any).template_id
                    );
                    const answersObj = selectedReport.answers || {};

                    if (Object.keys(answersObj).length === 0) {
                      return (
                        <p className={`text-sm italic ${isDark ? 'text-amber-200/70' : 'text-stone-600'}`}>
                          Ответы в анкете не указаны
                        </p>
                      );
                    }

                    return Object.entries(answersObj).map(([key, val]) => {
                      const fieldDef = reportTemplate?.fields?.find((f: any) => f.id === key);
                      const questionTitle =
                        fieldDef?.label ||
                        fieldDef?.hint ||
                        (key.startsWith('ai-') || key.startsWith('field-') ? 'Вопрос анкеты' : key);

                      let parsedVal = val;
                      if (typeof parsedVal === 'string') {
                        const trimmed = parsedVal.trim();
                        if (
                          (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
                          (trimmed.startsWith('[') && trimmed.endsWith(']'))
                        ) {
                          try {
                            parsedVal = JSON.parse(trimmed);
                          } catch {}
                        }
                      }

                      let displayNode: React.ReactNode = null;
                      if (parsedVal === null || parsedVal === undefined || parsedVal === '') {
                        displayNode = <span className="opacity-60 italic text-sm">Не заполнено</span>;
                      } else if (typeof parsedVal === 'boolean') {
                        displayNode = <span className="font-bold text-sm">{parsedVal ? 'Да' : 'Нет'}</span>;
                      } else if (typeof parsedVal === 'number') {
                        displayNode = <span className="font-mono font-bold text-sm">{parsedVal}</span>;
                      } else if (Array.isArray(parsedVal)) {
                        displayNode = (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {parsedVal.map((item: any, idx: number) => {
                              const itemText =
                                typeof item === 'object' && item !== null
                                  ? item.title || item.name || item.text || item.label || JSON.stringify(item)
                                  : String(item);
                              return (
                                <span
                                  key={idx}
                                  className={`px-2.5 py-1 rounded-xl border text-sm font-semibold ${
                                    isDark
                                      ? 'bg-amber-400/10 border-amber-400/30 text-amber-200'
                                      : 'bg-amber-100/70 border-amber-300 text-amber-950'
                                  }`}
                                >
                                  {itemText}
                                </span>
                              );
                            })}
                          </div>
                        );
                      } else if (typeof parsedVal === 'object' && parsedVal !== null) {
                        const objVal = parsedVal as Record<string, any>;
                        if (objVal.transcription || objVal.text) {
                          displayNode = (
                            <div className="space-y-1.5 mt-1">
                              <p className="text-sm leading-relaxed whitespace-pre-line font-medium">
                                {objVal.transcription || objVal.text}
                              </p>
                              {objVal.audioUrl && (
                                <div className="pt-1">
                                  <audio controls src={objVal.audioUrl} className="h-9 w-full max-w-xs rounded-lg" />
                                </div>
                              )}
                            </div>
                          );
                        } else if (objVal.latitude && objVal.longitude) {
                          displayNode = (
                            <div className="space-y-1 mt-1 text-sm">
                              <p className="font-bold">
                                📍 {objVal.latitude}, {objVal.longitude}
                                <span className="font-normal opacity-75 ml-2">(±{objVal.accuracy || 10}м)</span>
                              </p>
                              {objVal.timestamp && <p className="text-sm opacity-75">Время: {objVal.timestamp}</p>}
                              <a
                                href={`https://maps.google.com/?q=${objVal.latitude},${objVal.longitude}`}
                                target="_blank"
                                rel="noreferrer noopener"
                                className={`inline-flex items-center gap-1 font-bold text-sm pt-1 ${
                                  isDark ? 'text-[#F4EE8E] hover:underline' : 'text-amber-800 hover:text-amber-950 underline'
                                }`}
                              >
                                <ExternalLink size={14} />
                                <span>Открыть на карте</span>
                              </a>
                            </div>
                          );
                        } else if (objVal.url || objVal.fileUrl || objVal.data) {
                          const fileUrl = objVal.url || objVal.fileUrl || objVal.data;
                          const isVideo =
                            objVal.isVideo ||
                            /\.(mp4|webm|mov|ogg)$/i.test(objVal.name || '') ||
                            (typeof fileUrl === 'string' && fileUrl.includes('video'));
                          const isImg =
                            !isVideo &&
                            (objVal.isImage ||
                              /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(objVal.name || '') ||
                              (typeof fileUrl === 'string' && fileUrl.startsWith('data:image')));
                          displayNode = (
                            <div className="space-y-2 mt-1">
                              {isImg ? (
                                <a href={fileUrl} target="_blank" rel="noreferrer noopener" className="inline-block">
                                  <img
                                    src={fileUrl}
                                    alt={objVal.name || 'Фотография к отчету'}
                                    className="max-h-44 rounded-xl border border-amber-400/40 object-contain hover:opacity-90 transition-opacity"
                                  />
                                </a>
                              ) : isVideo ? (
                                <video controls src={fileUrl} className="max-h-48 w-full rounded-xl border border-amber-400/40" />
                              ) : (
                                <a
                                  href={fileUrl}
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  className={`inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-xl border text-sm font-bold ${
                                    isDark
                                      ? 'bg-amber-400/10 border-amber-400/40 text-[#F4EE8E] hover:bg-amber-400/20'
                                      : 'bg-amber-100 border-amber-400 text-amber-950 hover:bg-amber-200'
                                  }`}
                                >
                                  <ExternalLink size={14} />
                                  <span>{objVal.name || 'Прикрепленный файл'}</span>
                                </a>
                              )}
                            </div>
                          );
                        } else {
                          const formatted = Object.entries(objVal)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join('; ');
                          displayNode = <p className="text-sm leading-relaxed whitespace-pre-line">{formatted}</p>;
                        }
                      } else {
                        displayNode = <p className="text-sm leading-relaxed whitespace-pre-line">{String(parsedVal)}</p>;
                      }

                      return (
                        <div
                          key={key}
                          className={`border-b pb-3.5 last:border-none last:pb-0 ${
                            isDark ? 'border-amber-400/15' : 'border-amber-900/10'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${isDark ? 'bg-[#F4EE8E]' : 'bg-amber-600'}`}
                            />
                            <p className={`font-bold text-sm ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                              {questionTitle}
                            </p>
                          </div>
                          <div className={`pl-4 leading-relaxed ${isDark ? 'text-amber-100' : 'text-stone-800'}`}>
                            {displayNode}
                          </div>

                          {fieldComments[key] && (
                            <div
                              className={`mt-2 p-2.5 rounded-xl border-l-2 text-sm ${
                                isDark
                                  ? 'bg-amber-400/10 border-[#E7C768] text-amber-200'
                                  : 'bg-amber-50 border-amber-600 text-amber-950'
                              }`}
                            >
                              <strong>Заметка руководителя:</strong> {fieldComments[key]}
                            </div>
                          )}

                          {isLeader && (
                            <div className="flex gap-2 mt-2 pl-4">
                              <input
                                type="text"
                                placeholder="Прокомментировать этот пункт..."
                                value={fieldComments[key] || ''}
                                onChange={(e) => setFieldComments({ ...fieldComments, [key]: e.target.value })}
                                className={`flex-1 min-h-[42px] px-3 py-1.5 rounded-xl border text-sm outline-none ${
                                  isDark
                                    ? 'bg-[#140A01] border-amber-400/30 text-amber-100 focus:border-amber-300'
                                    : 'bg-stone-50 border-amber-900/20 text-amber-950 focus:border-amber-600'
                                }`}
                              />
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>

            {/* Recommendations & Manager Controls */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <h6 className={`text-sm font-bold flex items-center gap-1.5 ${isDark ? 'text-amber-200' : 'text-amber-950'}`}>
                  <Sparkles size={15} className={isDark ? 'text-[#E7C768]' : 'text-amber-800'} />
                  Персональные советы ИИ:
                </h6>
                <div
                  className={`p-4 rounded-2xl border leading-relaxed whitespace-pre-line text-sm ${
                    isDark
                      ? 'border-amber-400/20 bg-[#140A01]/70 text-amber-100'
                      : 'border-amber-900/15 bg-white text-stone-800 shadow-sm'
                  }`}
                >
                  {selectedReport.aiRecommendations}
                </div>
              </div>

              {(selectedReport.aiMotivation || selectedReport.ai_motivation) && (
                <div className="space-y-1.5">
                  <h6 className={`text-sm font-bold flex items-center gap-1.5 ${isDark ? 'text-amber-200' : 'text-amber-950'}`}>
                    <Award size={15} className={isDark ? 'text-[#E7C768]' : 'text-amber-800'} />
                    Мотивация сотрудника от ИИ:
                  </h6>
                  <div
                    className={`p-3.5 rounded-2xl border text-sm leading-relaxed whitespace-pre-line ${
                      isDark
                        ? 'border-amber-400/30 bg-amber-500/10 text-amber-100'
                        : 'border-amber-900/15 bg-amber-50 text-amber-950'
                    }`}
                  >
                    {selectedReport.aiMotivation || selectedReport.ai_motivation}
                  </div>
                </div>
              )}

              {(() => {
                const planList = selectedReport.aiPlan || selectedReport.ai_plan;
                const planStatus = selectedReport.aiPlanStatus || selectedReport.ai_plan_status;
                if (!planList || !Array.isArray(planList) || planList.length === 0) return null;

                return (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h6 className={`text-sm font-bold flex items-center gap-1.5 ${isDark ? 'text-[#E7C768]' : 'text-amber-950'}`}>
                        <TrendingUp size={15} className={isDark ? 'text-[#E7C768]' : 'text-amber-800'} />
                        План действий сотрудника:
                      </h6>
                      <span
                        className={`px-2.5 py-0.5 rounded text-sm font-bold border ${
                          planStatus === 'accepted'
                            ? isDark
                              ? 'bg-amber-400/20 text-[#F4EE8E] border-amber-400'
                              : 'bg-amber-100 text-amber-950 border-amber-400'
                            : planStatus === 'declined'
                              ? isDark
                                ? 'bg-amber-950/40 text-amber-300 border-amber-700/50'
                                : 'bg-amber-100 text-amber-900 border-amber-300'
                              : isDark
                                ? 'bg-amber-500/10 text-amber-300/80 border-amber-400/30'
                                : 'bg-stone-100 text-stone-700 border-stone-300'
                        }`}
                      >
                        {planStatus === 'accepted'
                          ? '✓ Принят в работу'
                          : planStatus === 'declined'
                            ? 'Отклонен'
                            : 'На рассмотрении'}
                      </span>
                    </div>

                    <div
                      className={`p-3.5 rounded-2xl border space-y-2 ${
                        isDark ? 'border-amber-400/30 bg-[#140A01]/70' : 'border-amber-900/15 bg-white shadow-sm'
                      }`}
                    >
                      {planList.map((item: any, pIdx: number) => (
                        <div
                          key={item.id || pIdx}
                          className={`flex items-start gap-2 border-b pb-1.5 last:border-none last:pb-0 ${
                            isDark ? 'border-amber-400/10' : 'border-amber-900/10'
                          }`}
                        >
                          <span className={`font-bold text-sm ${isDark ? 'text-[#E7C768]' : 'text-amber-900'}`}>
                            {pIdx + 1}.
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm leading-relaxed ${isDark ? 'text-amber-100' : 'text-stone-800'}`}>
                              {item.title}
                            </p>
                            <span className={`text-sm font-mono ${isDark ? 'text-amber-300/80' : 'text-stone-600'}`}>
                              {item.date}
                            </span>
                          </div>
                          <span
                            className={`text-sm px-2 py-0.5 rounded border shrink-0 ${
                              isDark ? 'border-amber-400/30 text-amber-200' : 'border-amber-900/20 text-stone-700'
                            }`}
                          >
                            {item.priority === 'high' ? 'Высокий' : item.priority === 'medium' ? 'Средний' : 'Обычный'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Review Action panel */}
              {isLeader && (
                <div
                  className={`p-4 sm:p-5 rounded-2xl border space-y-4 font-sans ${
                    isDark
                      ? 'border-amber-400/40 bg-[#140A01]/80 shadow-[0_0_20px_rgba(244,238,142,0.1)]'
                      : 'border-amber-900/20 bg-white shadow-sm'
                  }`}
                >
                  <h6 className={`text-sm font-bold ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                    ✍️ Оценка и обратная связь руководителя:
                  </h6>

                  <div className="space-y-1.5">
                    <span className={`block text-sm ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>
                      Поставить одобрительную реакцию:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {['🔥 Огонь', '👏 Класс', '❤️ Супер', '✅ Принято', '⚠️ Внимание'].map((react) => (
                        <button
                          key={react}
                          type="button"
                          onClick={() => handleAddReaction(react)}
                          className={`min-h-[40px] px-3 py-1.5 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                            selectedReaction === react
                              ? isDark
                                ? 'bg-[#E7C768] text-amber-950 border-[#E7C768]'
                                : 'bg-amber-400 text-amber-950 border-amber-500 font-bold'
                              : isDark
                                ? 'bg-[#1A0F02] text-amber-200 border-amber-400/30 hover:border-amber-300'
                                : 'bg-amber-50 text-amber-950 border-amber-900/20 hover:bg-amber-100'
                          }`}
                        >
                          {react}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className={`block text-sm font-bold ${isDark ? 'text-amber-200' : 'text-amber-950'}`}>
                      ⚡️ Быстрый вердикт в 1 клик (Шаблоны):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { text: 'Отлично! Отчет полностью принят без замечаний, великолепная работа.', rating: '🔥 Огонь' },
                        { text: 'Смена отработана отлично, все поставленные задачи выполнены.', rating: '👏 Класс' },
                        { text: 'Отчет принят. На следующей смене уделите больше внимания деталям.', rating: '⚠️ Внимание' },
                        { text: 'Недостаточно подробностей. Жду детальный разбор смены завтра утром!', rating: '⚠️ Внимание' },
                      ].map((item, tIdx) => (
                        <button
                          key={tIdx}
                          type="button"
                          onClick={() => {
                            setManagerComment(item.text);
                            handleAddReaction(item.rating);
                          }}
                          className={`min-h-[44px] p-3 rounded-xl text-left border transition-all cursor-pointer leading-tight ${
                            isDark
                              ? 'bg-[#1A0F02] text-amber-100 border-amber-400/30 hover:border-amber-300'
                              : 'bg-amber-50/60 text-amber-950 border-amber-900/20 hover:bg-white hover:border-amber-400'
                          }`}
                          title={item.text}
                        >
                          <span className={`font-bold block mb-1 text-sm ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                            {tIdx === 0 && '✨ Идеальный отчет'}
                            {tIdx === 1 && '⚡️ Все выполнено'}
                            {tIdx === 2 && '💬 Требует правок'}
                            {tIdx === 3 && '⚠️ Слишком кратко'}
                          </span>
                          <span className={`line-clamp-2 text-sm ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>
                            {item.text}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className={`block text-sm font-medium ${isDark ? 'text-amber-200' : 'text-amber-950'}`}>
                      Вердикт руководителя сотруднику:
                    </label>
                    <div className="relative flex items-center">
                      <textarea
                        rows={2}
                        value={managerComment}
                        onChange={(e) => setManagerComment(e.target.value)}
                        placeholder="Обратная связь руководителю или надиктуйте голосом..."
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none resize-none pr-12 ${
                          isDark
                            ? 'bg-[#140A01] border-amber-400/40 text-amber-100 placeholder-stone-400 focus:border-[#E7C768]'
                            : 'bg-amber-50/50 border-amber-900/30 text-amber-950 placeholder-stone-500 focus:border-amber-600'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={toggleManagerVoice}
                        className={`absolute right-2 bottom-2 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-full border cursor-pointer transition-colors ${
                          isRecording
                            ? 'bg-rose-500 border-rose-400 text-white animate-pulse'
                            : isDark
                              ? 'bg-[#1A0F02] border-amber-400/30 text-amber-200 hover:text-white'
                              : 'bg-white border-amber-900/20 text-amber-950 hover:bg-amber-100'
                        }`}
                        title={isRecording ? 'Завершить запись' : 'Наговорить голосом'}
                      >
                        <Mic size={16} />
                      </button>
                    </div>

                    {isRecording && (
                      <div className="mt-2 space-y-1">
                        <VoiceEqualizer isActive={true} />
                        <span className={`text-sm font-mono block ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>
                          Продолжительность записи: {recordTimer}s
                        </span>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleAIBossFeedback}
                        className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-sm font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                          isDark
                            ? 'bg-amber-400/10 hover:bg-amber-400/20 border-amber-400/40 text-[#F4EE8E]'
                            : 'bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-950'
                        }`}
                      >
                        <Sparkles size={16} />
                        <span>Написать отзыв нейросетью за меня</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className={`block text-sm font-medium ${isDark ? 'text-amber-200' : 'text-amber-950'}`}>
                      Делегировать задачу на основе рапорта:
                    </label>
                    <input
                      type="text"
                      value={managerTask}
                      onChange={(e) => setManagerTask(e.target.value)}
                      placeholder="Например: Усилить продажи до 15:00."
                      className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border text-sm outline-none ${
                        isDark
                          ? 'bg-[#140A01] border-amber-400/40 text-amber-100 placeholder-stone-400 focus:border-[#E7C768]'
                          : 'bg-amber-50/50 border-amber-900/30 text-amber-950 placeholder-stone-500 focus:border-amber-600'
                      }`}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveReview}
                    className={`w-full min-h-[44px] py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all shadow-[0_0_20px_rgba(244,238,142,0.25)] ${
                      isDark
                        ? 'bg-gradient-to-r from-[#F4EE8E] to-[#E7C768] text-amber-950 hover:brightness-105'
                        : 'bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 hover:brightness-105'
                    }`}
                  >
                    <CheckCircle size={18} />
                    <span>Сохранить рецензию и аудит</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
