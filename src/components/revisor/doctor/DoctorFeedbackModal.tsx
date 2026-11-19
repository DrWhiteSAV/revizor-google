import React, { useState } from 'react';
import { 
  X, Send, Sparkles, Bot, Bell, Check, 
  UserCheck, AlertCircle, MessageSquare
} from 'lucide-react';

interface DoctorFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Array<{ id: string; name: string; role?: string }>;
  isDark?: boolean;
}

export const DoctorFeedbackModal: React.FC<DoctorFeedbackModalProps> = ({
  isOpen,
  onClose,
  employees = [],
  isDark = true
}) => {
  if (!isOpen) return null;

  const [recipientScope, setRecipientScope] = useState<'all' | 'specific'>('all');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(employees[0]?.id || '');
  const [feedbackType, setFeedbackType] = useState<'praise' | 'warning' | 'recommendation' | 'urgent'>('recommendation');
  const [messageText, setMessageText] = useState(
    'По результатам диагностики ИИ Ревизора: темп выполнения задач высокий, однако просим уделить особое внимание своевременной загрузке подтверждающих скриншотов до дедлайна.'
  );
  const [sendTelegram, setSendTelegram] = useState(true);
  const [sendInapp, setSendInapp] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const handleGenerateAiMessage = async () => {
    setIsAiGenerating(true);
    try {
      const empName = recipientScope === 'all' ? 'команде проекта' : (employees.find(e => e.id === selectedEmployeeId)?.name || 'исполнителю');
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Напиши короткую обратную связь от ИИ Ревизора участнику "${empName}".
Тип сообщения: ${feedbackType === 'praise' ? 'похвала за высокий балл и соблюдение сроков' : feedbackType === 'warning' ? 'замечание о нарушении регламента' : 'рекомендация по улучшению качества работы'}.
Тон: деловой, мотивирующий, конструктивный, без капслока.`
        })
      });
      const data = await res.json();
      if (data.text) {
        setMessageText(data.text.trim());
      }
    } catch (e) {
      console.warn('Ошибка генерации обратной связи:', e);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!messageText.trim()) return;
    setIsSending(true);
    try {
      // Send notification via API
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Обратная связь от ИИ Ревизора проектов',
          message: messageText.trim(),
          type: feedbackType === 'praise' ? 'success' : feedbackType === 'warning' ? 'warning' : 'info',
          userId: recipientScope === 'all' ? null : selectedEmployeeId
        })
      });

      setSentSuccess(true);
      setTimeout(() => {
        setSentSuccess(false);
        onClose();
      }, 1500);
    } catch (e) {
      console.warn('Ошибка отправки уведомления:', e);
      onClose();
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
      <div className={`w-full max-w-lg rounded-3xl border p-5 sm:p-7 shadow-2xl space-y-4 transition-all ${
        isDark
          ? 'bg-[#1A0F02]/95 border-[#E7C768]/50 text-[#F4EE8E] shadow-[0_0_40px_rgba(244,238,142,0.2)]'
          : 'bg-[#FAF6EC]/95 border-[#B8860B]/40 text-amber-950 shadow-2xl'
      }`}>
        {/* Top header */}
        <div className="flex items-center justify-between border-b pb-3.5 border-amber-500/20">
          <div className="flex items-center gap-2">
            <MessageSquare size={20} className="text-[#E7C768]" />
            <div>
              <h3 className="text-lg font-bold text-[#E7C768]">
                Обратная связь участникам проекта
              </h3>
              <p className="text-xs opacity-75">
                Адресное уведомление по текущей оценке и здоровью задач
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl border border-amber-500/30 hover:bg-amber-500/10 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {sentSuccess ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/20 text-[#E7C768] flex items-center justify-center">
              <Check size={24} />
            </div>
            <div className="text-base font-bold text-[#E7C768]">Обратная связь успешно отправлена!</div>
            <div className="text-sm opacity-80">Участники получат уведомление в Telegram и в кабинете.</div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Recipient Selector */}
            <div>
              <label className="block text-sm font-semibold mb-1.5">Кому отправить:</label>
              <div className="flex items-center gap-3 mb-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="scope"
                    checked={recipientScope === 'all'}
                    onChange={() => setRecipientScope('all')}
                    className="accent-[#E7C768]"
                  />
                  <span>Всей команде проекта</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="scope"
                    checked={recipientScope === 'specific'}
                    onChange={() => setRecipientScope('specific')}
                    className="accent-[#E7C768]"
                  />
                  <span>Конкретному участнику</span>
                </label>
              </div>

              {recipientScope === 'specific' && (
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl text-sm border focus:outline-none ${
                    isDark ? 'bg-[#1A0F02] border-[#E7C768]/40 text-[#F4EE8E]' : 'bg-white border-[#B8860B]/40 text-amber-950'
                  }`}
                >
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.role || 'сотрудник'})</option>
                  ))}
                </select>
              )}
            </div>

            {/* Feedback tone */}
            <div>
              <label className="block text-sm font-semibold mb-1">Тип обратной связи:</label>
              <select
                value={feedbackType}
                onChange={(e) => setFeedbackType(e.target.value as any)}
                className={`w-full px-3.5 py-2 rounded-xl text-sm border focus:outline-none ${
                  isDark ? 'bg-[#1A0F02] border-[#E7C768]/40 text-[#F4EE8E]' : 'bg-white border-[#B8860B]/40 text-amber-950'
                }`}
              >
                <option value="recommendation">Конструктивная рекомендация Ревизора</option>
                <option value="praise">Похвала и высокая оценка результатов</option>
                <option value="warning">Замечание по задержке сроков</option>
                <option value="urgent">Срочное предупреждение о критическом риске</option>
              </select>
            </div>

            {/* Message with AI Generator */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-semibold">Текст сообщения:</label>
                <button
                  type="button"
                  onClick={handleGenerateAiMessage}
                  disabled={isAiGenerating}
                  className="text-xs font-bold text-[#E7C768] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles size={12} />
                  <span>{isAiGenerating ? 'Генерация...' : 'Сгенерировать ИИ'}</span>
                </button>
              </div>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={4}
                className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none transition-colors ${
                  isDark
                    ? 'bg-transparent border-[#E7C768]/40 text-[#F4EE8E] placeholder-amber-400/40 focus:border-[#F4EE8E]'
                    : 'bg-white/80 border-[#B8860B]/40 text-amber-950 placeholder-amber-900/40 focus:border-[#B8860B]'
                }`}
              />
            </div>

            {/* Channels */}
            <div className="flex items-center gap-6 text-sm border-t pt-3 border-amber-500/20">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendTelegram}
                  onChange={(e) => setSendTelegram(e.target.checked)}
                  className="accent-[#E7C768]"
                />
                <span>В Telegram бот</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendInapp}
                  onChange={(e) => setSendInapp(e.target.checked)}
                  className="accent-[#E7C768]"
                />
                <span>В кабинете (In-App)</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-amber-500/20">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-amber-500/30 text-sm font-semibold hover:bg-amber-500/10 cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={isSending || !messageText.trim()}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-bold text-sm hover:brightness-105 disabled:opacity-50 cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <Send size={15} />
                <span>{isSending ? 'Отправка...' : 'Отправить'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
