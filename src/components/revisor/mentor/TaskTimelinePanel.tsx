import React from 'react';
import { Bot, ThumbsUp, ThumbsDown, Clock, Calendar } from 'lucide-react';

export interface TaskTimelineItem {
  id: string;
  kind: string;
  blocker_type?: string;
  message?: string;
  ai_advice?: string;
  helpful_vote?: number;
  user_name?: string;
  created_at: string;
}

export interface TaskShiftRequestItem {
  id: string;
  current_deadline: string;
  proposed_deadline: string;
  shift_days: number;
  reason?: string;
  ai_workload_note?: string;
  status: string;
  created_at: string;
}

interface TaskTimelinePanelProps {
  interactions: TaskTimelineItem[];
  shiftRequests: TaskShiftRequestItem[];
  onVote?: (interactionId: string, vote: 1 | -1) => void;
  isDark?: boolean;
}

const KIND_LABELS: Record<string, string> = {
  checkin_auto: 'Авточекин ИИ-Ревизора',
  employee_update: 'Обновление прогресса',
  stuck_help: 'Помощь ИИ с затруднением',
  preflight_check: 'Черновая предпроверка',
  ai_decomposition: 'Разбивка на микро-шаги',
  escalation: 'Эскалация риска',
  upstream_warning: 'Риск связанной задачи',
  report_link: 'Связь с ежедневным отчетом'
};

export const TaskTimelinePanel: React.FC<TaskTimelinePanelProps> = ({
  interactions = [],
  shiftRequests = [],
  onVote,
  isDark = true
}) => {
  const cardCls = `p-3.5 rounded-2xl border space-y-2 ${
    isDark
      ? 'bg-[#1A0F02]/55 border-[#E7C768]/30 text-[#F4EE8E]'
      : 'bg-[#FAF6EC]/80 border-[#B8860B]/30 text-amber-950'
  }`;

  return (
    <div className="space-y-4">
      {shiftRequests.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-bold flex items-center gap-2">
            <Calendar size={16} className={isDark ? 'text-[#E7C768]' : 'text-[#B8860B]'} />
            <span>Запросы на перенос срока</span>
          </h4>
          {shiftRequests.map((req) => (
            <div key={req.id} className={cardCls}>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold">
                <span className="tabular-nums">
                  {req.current_deadline?.slice(0, 10) || '—'} → {req.proposed_deadline?.slice(0, 10) || '—'} (+{req.shift_days} дн.)
                </span>
                <span className="opacity-85">
                  {req.status === 'approved' ? 'Согласовано' : req.status === 'rejected' ? 'Отклонено' : 'Ожидает решения'}
                </span>
              </div>
              {req.reason && <p className="text-sm opacity-90">{req.reason}</p>}
              {req.ai_workload_note && <p className="text-sm opacity-75">{req.ai_workload_note}</p>}
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2.5">
        <h4 className="text-sm font-bold flex items-center gap-2">
          <Clock size={16} className={isDark ? 'text-[#E7C768]' : 'text-[#B8860B]'} />
          <span>Лента контроля и рекомендаций ИИ</span>
        </h4>

        {interactions.length === 0 ? (
          <div className={`${cardCls} text-sm opacity-80`}>
            История чекинов и советов ИИ пока пуста. Вы можете запросить помощь, проверить черновик или обновить прогресс.
          </div>
        ) : (
          interactions.map((item) => {
            const dateStr = item.created_at ? new Date(item.created_at).toLocaleString('ru-RU', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            }) : '';
            return (
              <div key={item.id} className={cardCls}>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-bold flex items-center gap-1.5">
                    <Bot size={15} className={isDark ? 'text-[#E7C768]' : 'text-[#B8860B]'} />
                    <span>{KIND_LABELS[item.kind] || 'Событие Ревизора'}</span>
                  </span>
                  <span className="text-sm opacity-75 tabular-nums">{dateStr}</span>
                </div>

                {item.message && (
                  <p className="text-sm opacity-90 leading-relaxed">{item.message}</p>
                )}

                {item.ai_advice && (
                  <p className={`text-sm leading-relaxed pt-1 border-t ${
                    isDark ? 'border-[#E7C768]/20 text-white/95' : 'border-[#B8860B]/20 text-zinc-900'
                  }`}>
                    {item.ai_advice}
                  </p>
                )}

                {onVote && ['stuck_help', 'preflight_check', 'ai_decomposition', 'checkin_auto'].includes(item.kind) && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-sm opacity-75">Помогла подсказка?</span>
                    <button
                      type="button"
                      onClick={() => onVote(item.id, 1)}
                      className={`px-2.5 py-1 rounded-lg border text-sm font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                        item.helpful_vote === 1
                          ? 'bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-amber-950 border-transparent'
                          : (isDark ? 'border-[#E7C768]/30 hover:bg-[#E7C768]/15' : 'border-[#B8860B]/30 hover:bg-[#B8860B]/15')
                      }`}
                    >
                      <ThumbsUp size={14} />
                      <span>Да</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onVote(item.id, -1)}
                      className={`px-2.5 py-1 rounded-lg border text-sm font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                        item.helpful_vote === -1
                          ? 'bg-amber-900/20 border-amber-600'
                          : (isDark ? 'border-[#E7C768]/30 hover:bg-[#E7C768]/15' : 'border-[#B8860B]/30 hover:bg-[#B8860B]/15')
                      }`}
                    >
                      <ThumbsDown size={14} />
                      <span>Не очень</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
