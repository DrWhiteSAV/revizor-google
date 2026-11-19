import React, { useState } from 'react';
import { Bot, Check, AlertCircle, RefreshCw, Trash2, Plus, MessageSquare } from 'lucide-react';

export interface SavedChat {
  id: string;
  company_id: string;
  chat_id: string;
  title: string;
  type: string;
  username?: string;
  bot_present: number;
  bot_status: string;
  created_at: string;
}

interface TaskSavedChatsCardProps {
  savedChats: SavedChat[];
  isLoadingChats: boolean;
  onRefresh: () => void;
  isDark: boolean;
}

export const TaskSavedChatsCard: React.FC<TaskSavedChatsCardProps> = ({
  savedChats,
  isLoadingChats,
  onRefresh,
  isDark
}) => {
  const [newChatInput, setNewChatInput] = useState('');
  const [newChatTitle, setNewChatTitle] = useState('');
  const [isVerifyingChat, setIsVerifyingChat] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  const handleVerifyAndAddChat = async () => {
    if (!newChatInput.trim()) return;
    setIsVerifyingChat(true);
    setVerifyStatus(null);
    try {
      const res = await fetch('/api/telegram/verify-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: newChatInput.trim(),
          title: newChatTitle.trim() || 'канал задач проекта'
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setVerifyStatus({ success: true, message: data.message || 'чат успешно подключен' });
        setNewChatInput('');
        setNewChatTitle('');
        onRefresh();
      } else {
        setVerifyStatus({ success: false, message: data.error || 'не удалось подтвердить чат' });
      }
    } catch (e: any) {
      setVerifyStatus({ success: false, message: e.message || 'ошибка сети' });
    } finally {
      setIsVerifyingChat(false);
    }
  };

  const handleDeleteChat = async (id: string) => {
    try {
      const res = await fetch(`/api/telegram/saved-chats/${id}`, { method: 'DELETE' });
      if (res.ok) {
        onRefresh();
      }
    } catch (e) {
      console.warn('Ошибка при удалении чата:', e);
    }
  };

  return (
    <div className={`p-4 sm:p-6 rounded-3xl border transition-all ${
      isDark
        ? 'bg-[#1A0F02]/70 border-[#E7C768]/40 shadow-[0_0_30px_rgba(244,238,142,0.15)] text-[#F4EE8E]'
        : 'bg-[#FAF6EC]/85 border-[#B8860B]/30 shadow-md text-amber-950'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b pb-4 border-amber-500/20">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/20 text-[#E7C768]">
            <Bot size={22} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold">
              Подключенные каналы и группы Telegram
            </h3>
            <p className="text-sm opacity-80">
              Каналы и чаты команд для отправки уведомлений по задачам
            </p>
          </div>
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoadingChats}
          className="self-start sm:self-auto px-3 py-2 rounded-xl border border-amber-500/30 text-sm font-semibold flex items-center gap-2 hover:bg-amber-500/10 cursor-pointer"
        >
          <RefreshCw size={15} className={isLoadingChats ? 'animate-spin' : ''} />
          <span>Обновить</span>
        </button>
      </div>

      {/* Add new chat form */}
      <div className={`p-4 rounded-2xl border mb-6 ${
        isDark ? 'bg-[#140A01]/60 border-amber-500/30' : 'bg-white/60 border-amber-500/20'
      }`}>
        <h4 className="text-sm font-bold mb-3 flex items-center gap-2 text-[#E7C768]">
          <Plus size={16} />
          <span>Подключить новый чат или группу</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-sm font-medium mb-1">ID чата или канала</label>
            <input
              type="text"
              value={newChatInput}
              onChange={(e) => setNewChatInput(e.target.value)}
              placeholder="-1001234567890 или @channel_name"
              className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none transition-colors ${
                isDark
                  ? 'bg-transparent border-[#E7C768]/40 text-[#F4EE8E] placeholder-amber-400/40 focus:border-[#F4EE8E]'
                  : 'bg-white/80 border-[#B8860B]/40 text-amber-950 placeholder-amber-900/40 focus:border-[#B8860B]'
              }`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Понятное название (для правил)</label>
            <input
              type="text"
              value={newChatTitle}
              onChange={(e) => setNewChatTitle(e.target.value)}
              placeholder="Чат проектного отдела"
              className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none transition-colors ${
                isDark
                  ? 'bg-transparent border-[#E7C768]/40 text-[#F4EE8E] placeholder-amber-400/40 focus:border-[#F4EE8E]'
                  : 'bg-white/80 border-[#B8860B]/40 text-amber-950 placeholder-amber-900/40 focus:border-[#B8860B]'
              }`}
            />
          </div>
        </div>

        {verifyStatus && (
          <div className={`p-3 rounded-xl mb-3 text-sm flex items-center gap-2 border ${
            verifyStatus.success
              ? 'bg-amber-500/15 border-amber-500/30 text-[#E7C768]'
              : 'bg-amber-900/20 border-amber-600/40 text-amber-300'
          }`}>
            {verifyStatus.success ? <Check size={16} /> : <AlertCircle size={16} />}
            <span>{verifyStatus.message}</span>
          </div>
        )}

        <button
          onClick={handleVerifyAndAddChat}
          disabled={isVerifyingChat || !newChatInput.trim()}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 text-sm font-bold hover:brightness-105 disabled:opacity-50 cursor-pointer transition-all flex items-center gap-2"
        >
          {isVerifyingChat ? (
            <>
              <RefreshCw size={15} className="animate-spin" />
              <span>Проверка бота...</span>
            </>
          ) : (
            <>
              <Check size={16} />
              <span>Проверить и сохранить</span>
            </>
          )}
        </button>
      </div>

      {/* List of saved chats */}
      <div className="space-y-3">
        {savedChats.length === 0 ? (
          <div className="py-8 text-center text-sm opacity-70">
            Пока нет сохраненных чатов. Добавьте ID группы выше, предварительно пригласив туда бота.
          </div>
        ) : (
          savedChats.map((chat) => (
            <div
              key={chat.id}
              className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isDark ? 'bg-[#140A01]/50 border-amber-500/20' : 'bg-white/70 border-amber-500/20'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/15 text-[#E7C768]">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <div className="font-bold text-sm">{chat.title}</div>
                  <div className="text-sm opacity-75 font-mono">{chat.chat_id}</div>
                </div>
              </div>
              <button
                onClick={() => handleDeleteChat(chat.id)}
                className="self-end sm:self-auto p-2 rounded-xl border border-amber-500/30 hover:bg-amber-500/10 text-amber-400 hover:text-amber-200 cursor-pointer transition-colors"
                title="Удалить чат"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
