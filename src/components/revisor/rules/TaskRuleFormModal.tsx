import React, { useState } from 'react';
import { X, Check, Bot, Bell, Clock, Send, CheckCircle2, AlertCircle, Shield } from 'lucide-react';
import { TaskRoutingRule } from './TaskRuleCardItem';
import { SavedChat } from './TaskSavedChatsCard';

interface TaskRuleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (ruleData: Partial<TaskRoutingRule>) => Promise<void>;
  editingRule: TaskRoutingRule | null;
  savedChats: SavedChat[];
  projects: Array<{ id: string; title: string }>;
  departments: Array<{ id: string; name: string }>;
  employees: Array<{ id: string; name: string; role?: string; telegramHandle?: string }>;
  isDark: boolean;
}

export const TaskRuleFormModal: React.FC<TaskRuleFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingRule,
  savedChats,
  projects,
  departments,
  employees,
  isDark
}) => {
  if (!isOpen) return null;

  const [title, setTitle] = useState(editingRule?.title || '');
  const [projectScope, setProjectScope] = useState<'all' | 'specific'>(() => {
    if (!editingRule) return 'all';
    return editingRule.project_ids === '["all"]' || editingRule.project_ids === 'all' ? 'all' : 'specific';
  });
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(() => {
    if (!editingRule || !editingRule.project_ids) return [];
    try {
      const parsed = JSON.parse(editingRule.project_ids);
      return Array.isArray(parsed) && parsed[0] !== 'all' ? parsed : [];
    } catch {
      return [];
    }
  });

  const [destinationType, setDestinationType] = useState<string>(editingRule?.destination_type || 'employee_direct');
  const [reportFormat, setReportFormat] = useState<'brief' | 'full'>(editingRule?.report_format || 'full');
  const [targetChatId, setTargetChatId] = useState(editingRule?.target_chat_id || '{employee_tg}');
  const [targetTitle, setTargetTitle] = useState(editingRule?.target_title || 'в личку автору задачи');
  const [targetUserId, setTargetUserId] = useState(editingRule?.target_user_id || '');
  const [reviewTargetUserId, setReviewTargetUserId] = useState(editingRule?.review_target_user_id || '');

  // Triggers
  const [sendOnCreate, setSendOnCreate] = useState(editingRule ? Boolean(editingRule.send_on_create) : true);
  const [sendOnSubmit, setSendOnSubmit] = useState(editingRule ? Boolean(editingRule.send_on_submit) : true);
  const [sendReminder, setSendReminder] = useState(editingRule ? Boolean(editingRule.send_reminder) : true);
  const [notifyInapp, setNotifyInapp] = useState(editingRule ? Boolean(editingRule.notify_inapp) : true);
  const [sendTelegram, setSendTelegram] = useState(editingRule ? Boolean(editingRule.send_telegram) : true);
  const [reminderDeadlineTg, setReminderDeadlineTg] = useState(editingRule ? Boolean(editingRule.reminder_deadline_tg) : true);
  const [overdueTg, setOverdueTg] = useState(editingRule ? Boolean(editingRule.overdue_tg) : true);
  const [reviewRequestTg, setReviewRequestTg] = useState(editingRule ? Boolean(editingRule.review_request_tg) : true);
  const [reviewResultTg, setReviewResultTg] = useState(editingRule ? Boolean(editingRule.review_result_tg) : true);
  const [minScore, setMinScore] = useState<string>(editingRule?.min_score != null ? String(editingRule.min_score) : '');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const payload: Partial<TaskRoutingRule> = {
        title: title.trim(),
        project_ids: projectScope === 'all' ? '["all"]' : JSON.stringify(selectedProjectIds),
        department_ids: '["all"]',
        destination_type: destinationType,
        report_format: reportFormat,
        target_chat_id: targetChatId,
        target_title: targetTitle,
        target_user_id: targetUserId || null,
        review_target_user_id: reviewTargetUserId || null,
        send_on_create: sendOnCreate ? 1 : 0,
        send_on_submit: sendOnSubmit ? 1 : 0,
        send_reminder: sendReminder ? 1 : 0,
        notify_inapp: notifyInapp ? 1 : 0,
        send_telegram: sendTelegram ? 1 : 0,
        reminder_deadline_tg: reminderDeadlineTg ? 1 : 0,
        overdue_tg: overdueTg ? 1 : 0,
        review_request_tg: reviewRequestTg ? 1 : 0,
        review_result_tg: reviewResultTg ? 1 : 0,
        min_score: minScore ? Number(minScore) : null,
        is_active: editingRule ? editingRule.is_active : 1
      };
      await onSave(payload);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border p-5 sm:p-6 shadow-2xl transition-all ${
        isDark
          ? 'bg-[#1A0F02]/95 border-[#E7C768]/50 text-[#F4EE8E] shadow-[0_0_40px_rgba(244,238,142,0.2)]'
          : 'bg-[#FAF6EC]/95 border-[#B8860B]/40 text-amber-950 shadow-2xl'
      }`}>
        <div className="flex items-center justify-between border-b pb-4 mb-5 border-amber-500/20">
          <h3 className="text-lg font-bold text-[#E7C768]">
            {editingRule ? 'Редактировать правило задачи' : 'Создать правило для задач'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl border border-amber-500/30 hover:bg-amber-500/10 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Название правила</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Уведомление исполнителя о назначении и дедлайне"
              required
              className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none transition-colors ${
                isDark
                  ? 'bg-transparent border-[#E7C768]/40 text-[#F4EE8E] placeholder-amber-400/40 focus:border-[#F4EE8E]'
                  : 'bg-white/80 border-[#B8860B]/40 text-amber-950 placeholder-amber-900/40 focus:border-[#B8860B]'
              }`}
            />
          </div>

          {/* Project scope */}
          <div>
            <label className="block text-sm font-semibold mb-1.5">Для каких проектов действует</label>
            <div className="flex items-center gap-3 mb-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  name="projectScope"
                  checked={projectScope === 'all'}
                  onChange={() => setProjectScope('all')}
                  className="accent-[#E7C768]"
                />
                <span>Все проекты компании</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  name="projectScope"
                  checked={projectScope === 'specific'}
                  onChange={() => setProjectScope('specific')}
                  className="accent-[#E7C768]"
                />
                <span>Выбранные проекты</span>
              </label>
            </div>

            {projectScope === 'specific' && (
              <div className="p-3 rounded-xl border border-amber-500/20 max-h-36 overflow-y-auto space-y-1.5">
                {projects.map((proj) => (
                  <label key={proj.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedProjectIds.includes(proj.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProjectIds([...selectedProjectIds, proj.id]);
                        } else {
                          setSelectedProjectIds(selectedProjectIds.filter(id => id !== proj.id));
                        }
                      }}
                      className="accent-[#E7C768]"
                    />
                    <span>{proj.title}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Destination Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-1">Кому направлять</label>
              <select
                value={destinationType}
                onChange={(e) => {
                  setDestinationType(e.target.value);
                  if (e.target.value === 'employee_direct') {
                    setTargetChatId('{employee_tg}');
                    setTargetTitle('в личку исполнителю задачи');
                  } else if (e.target.value === 'director') {
                    setTargetChatId('169262990');
                    setTargetTitle('руководителю компании');
                  }
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none transition-colors ${
                  isDark
                    ? 'bg-[#1A0F02] border-[#E7C768]/40 text-[#F4EE8E]'
                    : 'bg-white border-[#B8860B]/40 text-amber-950'
                }`}
              >
                <option value="employee_direct">Исполнителю задачи (в личные сообщения)</option>
                <option value="director">Руководителю компании</option>
                <option value="group">В группу / канал Telegram</option>
                <option value="custom_user">Конкретному сотруднику</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Формат сообщения</label>
              <select
                value={reportFormat}
                onChange={(e) => setReportFormat(e.target.value as 'brief' | 'full')}
                className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none transition-colors ${
                  isDark
                    ? 'bg-[#1A0F02] border-[#E7C768]/40 text-[#F4EE8E]'
                    : 'bg-white border-[#B8860B]/40 text-amber-950'
                }`}
              >
                <option value="full">Подробный (таблица, раскрывающиеся карточки, вложения и ИИ-оценка)</option>
                <option value="brief">Краткий (компактная таблица, выжимка ИИ и кнопка действия)</option>
              </select>
            </div>
          </div>

          {destinationType === 'group' && (
            <div>
              <label className="block text-sm font-semibold mb-1">Выберите Telegram чат</label>
              <select
                value={targetChatId}
                onChange={(e) => {
                  const ch = savedChats.find(c => c.chat_id === e.target.value);
                  setTargetChatId(e.target.value);
                  if (ch) setTargetTitle(ch.title);
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none ${
                  isDark ? 'bg-[#1A0F02] border-[#E7C768]/40 text-[#F4EE8E]' : 'bg-white border-[#B8860B]/40 text-amber-950'
                }`}
              >
                <option value="">Выберите чат из списка...</option>
                {savedChats.map((c) => (
                  <option key={c.id} value={c.chat_id}>{c.title} ({c.chat_id})</option>
                ))}
              </select>
            </div>
          )}

          {destinationType === 'custom_user' && (
            <div>
              <label className="block text-sm font-semibold mb-1">Выберите сотрудника</label>
              <select
                value={targetUserId}
                onChange={(e) => {
                  const emp = employees.find(em => em.id === e.target.value);
                  setTargetUserId(e.target.value);
                  if (emp) {
                    setTargetTitle(emp.name);
                    if (emp.telegramHandle) setTargetChatId(emp.telegramHandle);
                  }
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none ${
                  isDark ? 'bg-[#1A0F02] border-[#E7C768]/40 text-[#F4EE8E]' : 'bg-white border-[#B8860B]/40 text-amber-950'
                }`}
              >
                <option value="">Выберите получателя...</option>
                {employees.map((em) => (
                  <option key={em.id} value={em.id}>{em.name} ({em.role || 'сотрудник'})</option>
                ))}
              </select>
            </div>
          )}

          {/* Trigger checkboxes */}
          <div className="pt-2 border-t border-amber-500/20">
            <h4 className="text-sm font-bold text-[#E7C768] mb-2.5">События и триггеры отправки:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendOnCreate}
                  onChange={(e) => setSendOnCreate(e.target.checked)}
                  className="accent-[#E7C768]"
                />
                <span>При постановке новой задачи</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendOnSubmit}
                  onChange={(e) => setSendOnSubmit(e.target.checked)}
                  className="accent-[#E7C768]"
                />
                <span>При сдаче задачи на проверку</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminderDeadlineTg}
                  onChange={(e) => setReminderDeadlineTg(e.target.checked)}
                  className="accent-[#E7C768]"
                />
                <span>Напоминание о дедлайне</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={overdueTg}
                  onChange={(e) => setOverdueTg(e.target.checked)}
                  className="accent-[#E7C768]"
                />
                <span>При просрочке дедлайна</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reviewRequestTg}
                  onChange={(e) => setReviewRequestTg(e.target.checked)}
                  className="accent-[#E7C768]"
                />
                <span>Запрос инспектору на ревью</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reviewResultTg}
                  onChange={(e) => setReviewResultTg(e.target.checked)}
                  className="accent-[#E7C768]"
                />
                <span>Результат оценки и вердикт ИИ</span>
              </label>
            </div>
          </div>

          {/* Delivery Channels */}
          <div className="pt-2 border-t border-amber-500/20">
            <h4 className="text-sm font-bold text-[#E7C768] mb-2.5">Каналы отправки:</h4>
            <div className="flex items-center gap-6 text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendTelegram}
                  onChange={(e) => setSendTelegram(e.target.checked)}
                  className="accent-[#E7C768]"
                />
                <span>Бот в Telegram</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyInapp}
                  onChange={(e) => setNotifyInapp(e.target.checked)}
                  className="accent-[#E7C768]"
                />
                <span>Уведомления в кабинете</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-amber-500/20">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-amber-500/30 text-sm font-semibold hover:bg-amber-500/10 cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 text-sm font-bold hover:brightness-105 disabled:opacity-50 cursor-pointer transition-all flex items-center gap-2"
            >
              <Check size={16} />
              <span>{isSubmitting ? 'Сохранение...' : 'Сохранить правило'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
