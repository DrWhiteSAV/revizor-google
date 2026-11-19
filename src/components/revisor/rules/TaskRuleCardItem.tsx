import React from 'react';
import { 
  Send, Bot, Bell, Clock, Edit3, Trash2, CheckCircle2, Shield, AlertCircle
} from 'lucide-react';

export interface TaskRoutingRule {
  id: string;
  company_id: string;
  title: string;
  project_ids: string;
  department_ids: string;
  destination_type: string;
  report_format?: 'brief' | 'full';
  target_user_id?: string | null;
  target_chat_id?: string | null;
  target_title?: string | null;
  review_target_user_id?: string | null;
  send_on_create: number;
  send_on_submit: number;
  send_reminder: number;
  notify_inapp?: number;
  send_telegram?: number;
  reminder_deadline_tg?: number;
  reminder_deadline_inapp?: number;
  overdue_tg?: number;
  review_request_tg?: number;
  review_request_inapp?: number;
  review_result_tg?: number;
  review_result_inapp?: number;
  min_score?: number | null;
  is_active: number;
  created_at: string;
}

interface TaskRuleCardItemProps {
  rule: TaskRoutingRule;
  onEdit: (rule: TaskRoutingRule) => void;
  onDelete: (id: string) => void;
  onToggleActive: (rule: TaskRoutingRule) => void;
  isDark: boolean;
}

export const TaskRuleCardItem: React.FC<TaskRuleCardItemProps> = ({
  rule,
  onEdit,
  onDelete,
  onToggleActive,
  isDark
}) => {
  const getDestinationLabel = () => {
    switch (rule.destination_type) {
      case 'employee_direct':
        return 'Исполнителю в личные сообщения';
      case 'director':
        return 'Руководителю компании';
      case 'manager':
        return 'Менеджеру проекта';
      case 'group':
        return rule.target_title || 'Общая группа проекта';
      case 'custom_user':
        return rule.target_title || 'Выбранному сотруднику';
      default:
        return rule.target_title || 'Канал уведомлений';
    }
  };

  return (
    <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
      isDark
        ? 'bg-[#1A0F02]/80 border-[#E7C768]/40 shadow-[0_0_25px_rgba(244,238,142,0.12)] text-[#F4EE8E]'
        : 'bg-[#FAF6EC]/90 border-[#B8860B]/30 shadow-md text-amber-950'
    }`}>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3.5 border-amber-500/20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onToggleActive(rule)}
            className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
              rule.is_active ? 'bg-gradient-to-r from-[#F4EE8E] to-[#D99E41]' : 'bg-amber-900/40'
            }`}
            title={rule.is_active ? 'Правило активно (кликните для отключения)' : 'Правило отключено'}
          >
            <span className={`block w-4 h-4 rounded-full bg-amber-950 absolute top-1 transition-transform ${
              rule.is_active ? 'left-6' : 'left-1'
            }`} />
          </button>
          <div>
            <h4 className="text-base font-bold flex items-center gap-2">
              <span>{rule.title}</span>
              {!rule.is_active && (
                <span className="text-sm px-2 py-0.5 rounded-lg border border-amber-500/30 opacity-70">
                  отключено
                </span>
              )}
            </h4>
            <div className="text-sm opacity-80 flex flex-wrap items-center gap-2 mt-1">
              <span className="font-medium text-[#E7C768]">{getDestinationLabel()}</span>
              <span>•</span>
              <span>формат: {rule.report_format === 'full' ? 'подробный' : 'краткий'}</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => onEdit(rule)}
            className="px-3 py-1.5 rounded-xl border border-amber-500/30 hover:bg-amber-500/10 text-sm font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Edit3 size={15} />
            <span>Изменить</span>
          </button>
          <button
            onClick={() => onDelete(rule.id)}
            className="p-1.5 rounded-xl border border-amber-500/30 hover:bg-amber-500/10 text-amber-400 hover:text-amber-200 cursor-pointer transition-colors"
            title="Удалить правило"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Triggers and badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-3.5">
        <div className={`p-2.5 rounded-xl border text-sm flex items-center gap-2 ${
          rule.send_on_create
            ? 'bg-amber-500/15 border-amber-500/30 text-[#E7C768]'
            : 'border-amber-500/10 opacity-60'
        }`}>
          <Send size={15} />
          <span>При создании задачи</span>
        </div>

        <div className={`p-2.5 rounded-xl border text-sm flex items-center gap-2 ${
          rule.send_on_submit
            ? 'bg-amber-500/15 border-amber-500/30 text-[#E7C768]'
            : 'border-amber-500/10 opacity-60'
        }`}>
          <CheckCircle2 size={15} />
          <span>При сдаче на проверку</span>
        </div>

        <div className={`p-2.5 rounded-xl border text-sm flex items-center gap-2 ${
          rule.reminder_deadline_tg || rule.reminder_deadline_inapp
            ? 'bg-amber-500/15 border-amber-500/30 text-[#E7C768]'
            : 'border-amber-500/10 opacity-60'
        }`}>
          <Clock size={15} />
          <span>Напоминание о дедлайне</span>
        </div>

        <div className={`p-2.5 rounded-xl border text-sm flex items-center gap-2 ${
          rule.overdue_tg
            ? 'bg-amber-500/15 border-amber-500/30 text-[#E7C768]'
            : 'border-amber-500/10 opacity-60'
        }`}>
          <AlertCircle size={15} />
          <span>При просрочке задачи</span>
        </div>
      </div>

      {/* Delivery Channels */}
      <div className="flex flex-wrap items-center gap-3 pt-3 text-sm opacity-90 border-t mt-3 border-amber-500/15">
        <span className="font-semibold text-[#E7C768]">Каналы доставки:</span>
        <div className="flex items-center gap-1.5">
          <Bot size={15} className="text-[#E7C768]" />
          <span>Telegram: {rule.send_telegram ? 'включен' : 'выключен'}</span>
        </div>
        <span>•</span>
        <div className="flex items-center gap-1.5">
          <Bell size={15} className="text-[#E7C768]" />
          <span>В кабинете: {rule.notify_inapp ? 'включен' : 'выключен'}</span>
        </div>
      </div>
    </div>
  );
};
