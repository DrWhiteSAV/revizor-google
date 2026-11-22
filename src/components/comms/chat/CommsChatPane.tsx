import React from 'react';
import {
  Video,
  Send,
  Paperclip,
  Mic,
  Square,
  MessageSquare,
  ArrowLeft,
  ShieldCheck,
  Trash2,
  Settings,
  X,
  FileText,
  Download,
  PhoneCall,
  AudioWaveform
} from 'lucide-react';
import { CustomAudioPlayer } from '../../voice/CustomAudioPlayer';
import type { CommsChat, CommsMessage } from '../../../types/comms';

const isAudioMessage = (msg: CommsMessage): boolean => {
  if (!msg.mediaUrl) return false;
  if (msg.mediaType === 'audio') return true;
  const f = String(msg.fileName || msg.mediaUrl || '').toLowerCase();
  return /\.(mp3|wav|ogg|m4a|aac|opus)(\?.*)?$/i.test(f) || /^voice_.*\.webm$/i.test(f);
};

interface CommsChatPaneProps {
  isLight: boolean;
  currentUserId: string;
  selectedChatId: string | null;
  selectedChat: CommsChat | null;
  messages: CommsMessage[];
  loadingMessages: boolean;
  typingName: string | null;
  draft: string;
  setDraft: (v: string) => void;
  sending: boolean;
  startingCall: boolean;
  canManageGroups: boolean;
  errorBanner: string | null;
  setErrorBanner: (v: string | null) => void;
  isRecordingVoice: boolean;
  recordingSec: number;
  transcribingIds: Set<string>;
  onlinePeer: boolean;
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onBackToChats: () => void;
  onStartVideoCall: () => void;
  onOpenSettings: () => void;
  onStartOrJoinCall: (room: { roomId: string; title: string; chatId?: string | null }) => void;
  onDeleteConfirm: (id: string) => void;
  onOpenLightbox: (url: string) => void;
  onTranscribeMessage: (chatId: string, msgId: string) => void;
  onSendText: (e: React.FormEvent) => void;
  onFileUpload: (file: File) => void;
  onStartVoiceRecording: () => void;
  onStopVoiceRecording: () => void;
  onDraftChange: (v: string) => void;
}

export const CommsChatPane: React.FC<CommsChatPaneProps> = ({
  isLight,
  currentUserId,
  selectedChatId,
  selectedChat,
  messages,
  loadingMessages,
  typingName,
  draft,
  sending,
  startingCall,
  canManageGroups,
  errorBanner,
  setErrorBanner,
  isRecordingVoice,
  recordingSec,
  transcribingIds,
  onlinePeer,
  messagesContainerRef,
  fileInputRef,
  onBackToChats,
  onStartVideoCall,
  onOpenSettings,
  onStartOrJoinCall,
  onDeleteConfirm,
  onOpenLightbox,
  onTranscribeMessage,
  onSendText,
  onFileUpload,
  onStartVoiceRecording,
  onStopVoiceRecording,
  onDraftChange
}) => {
  return (
    <section className={`${selectedChatId ? 'flex' : 'hidden md:flex'} flex-1 min-w-0 flex-col`}>
      {!selectedChat ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 opacity-80">
          <MessageSquare size={36} className="text-[#E7C768]" />
          <h3 className="text-base font-extrabold">Рабочие чаты и видеозвонки</h3>
          <p className="text-[14px] max-w-sm">
            Выберите переписку слева, создайте комнату со ссылкой или нажмите на коллегу для звонка.
          </p>
        </div>
      ) : (
        <>
          <header
            className={`px-3 sm:px-5 py-3 border-b flex items-center justify-between gap-2 sm:gap-3 shrink-0 ${
              isLight ? 'border-amber-900/15' : 'border-amber-400/25'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <button
                type="button"
                onClick={onBackToChats}
                className="md:hidden p-1.5 rounded-xl hover:bg-amber-400/10 cursor-pointer shrink-0"
                aria-label="Назад к списку чатов"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="min-w-0 flex-1">
                <h3 className={`text-[15px] font-extrabold truncate leading-tight ${isLight ? 'text-amber-950' : 'text-[#F4EE8E]'}`}>
                  {selectedChat.title}
                </h3>
                <div className="flex items-center gap-2 text-[14px] opacity-80 truncate mt-0.5">
                  <span className="truncate">
                    {typingName
                      ? `${typingName} печатает...`
                      : selectedChat.chatType === 'direct'
                        ? onlinePeer
                          ? 'В сети'
                          : 'Не в сети'
                        : `Участников: ${selectedChat.members?.length || 1}`}
                  </span>
                  {selectedChat.aiModerationEnabled && (
                    <span className={`inline-flex items-center gap-1 shrink-0 ${isLight ? 'text-amber-900' : 'text-[#E7C768]'}`}>
                      <ShieldCheck size={14} />
                      <span className="hidden sm:inline">Защита сообщений</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                disabled={startingCall}
                onClick={onStartVideoCall}
                className="px-3 sm:px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 text-[14px] font-black flex items-center gap-1.5 cursor-pointer shadow-md whitespace-nowrap disabled:opacity-60"
              >
                <Video size={16} />
                <span className="sm:hidden">Звонок</span>
                <span className="hidden sm:inline">Видеозвонок</span>
              </button>

              {selectedChat.chatType !== 'direct' &&
                (canManageGroups || selectedChat.creatorId === currentUserId) && (
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className={`p-2 rounded-xl border cursor-pointer shrink-0 ${
                      isLight
                        ? 'bg-transparent border-amber-900/30 text-amber-950'
                        : 'bg-transparent border-amber-400/35 text-[#F4EE8E]'
                    }`}
                    title="Настройки чата"
                  >
                    <Settings size={16} />
                  </button>
                )}
            </div>
          </header>

          {/* Messages Feed */}
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3">
            {loadingMessages ? (
              <div className="text-center py-8 text-[14px] opacity-70">Загрузка сообщений...</div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12 text-[14px] opacity-75">
                Пока нет сообщений. Напишите первым или запустите видеовстречу.
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.senderId === currentUserId;
                const canDelete = isMine || canManageGroups;
                const isAudio = isAudioMessage(msg);
                const isRecognizing = msg.sttStatus === 'processing' || transcribingIds.has(msg.id);

                if (msg.messageKind === 'video_invite' && msg.invitePayload) {
                  return (
                    <div key={msg.id} className="flex justify-center">
                      <div
                        className={`w-full max-w-md p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                          isLight
                            ? 'bg-transparent border-amber-900/35 text-amber-950'
                            : 'bg-transparent border-[#E7C768]/60 text-white'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F4EE8E] to-[#D99E41] text-amber-950 flex items-center justify-center shrink-0">
                            <PhoneCall size={18} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[14px] font-extrabold truncate">{msg.invitePayload.title}</div>
                            <div className="text-[14px] opacity-75 truncate">Пригласил: {msg.senderName}</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            onStartOrJoinCall({
                              roomId: msg.invitePayload!.roomId,
                              title: msg.invitePayload!.title,
                              chatId: msg.chatId
                            })
                          }
                          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-amber-950 text-[14px] font-black cursor-pointer shrink-0"
                        >
                          Подключиться
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`group max-w-[90%] sm:max-w-[75%] p-3 rounded-2xl border text-[14px] space-y-2 relative ${
                        isMine
                          ? isLight
                            ? 'bg-amber-900/10 border-amber-900/35 text-amber-950'
                            : 'bg-amber-400/10 border-amber-400/50 text-white'
                          : isLight
                            ? 'bg-transparent border-amber-900/25 text-amber-950'
                            : 'bg-transparent border-amber-400/30 text-amber-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <span className={`font-extrabold text-[14px] ${isLight ? 'text-amber-950' : 'text-[#F4EE8E]'}`}>
                          {msg.senderName}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] opacity-65 tabular-nums">
                            {new Date(msg.createdAt).toLocaleTimeString('ru-RU', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => onDeleteConfirm(msg.id)}
                              className="opacity-70 sm:opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-300 transition-opacity cursor-pointer"
                              title="Удалить сообщение"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      {msg.mediaUrl && msg.mediaType === 'image' && (
                        <button
                          type="button"
                          onClick={() => onOpenLightbox(msg.mediaUrl!)}
                          className="block rounded-xl overflow-hidden border border-amber-400/35 cursor-pointer"
                        >
                          <img
                            src={msg.mediaUrl}
                            alt={msg.fileName || 'Изображение'}
                            className="max-h-64 w-auto object-contain"
                          />
                        </button>
                      )}

                      {msg.mediaUrl && isAudio && (
                        <div className="space-y-1.5 min-w-[230px] sm:min-w-[280px]">
                          <CustomAudioPlayer audioUrl={msg.mediaUrl} isLightTheme={isLight} />
                          {isRecognizing && (
                            <div
                              className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-[14px] ${
                                isLight
                                  ? 'border-amber-900/25 text-amber-900 bg-amber-900/5'
                                  : 'border-amber-400/35 text-[#F4EE8E] bg-amber-400/10'
                              }`}
                            >
                              <AudioWaveform size={16} className="animate-pulse shrink-0 text-[#E7C768]" />
                              <span className="animate-pulse font-semibold">Распознавание речи...</span>
                            </div>
                          )}
                          {msg.transcriptText && (
                            <p
                              className={`px-3 py-2 rounded-xl border text-[14px] leading-relaxed whitespace-pre-wrap break-words ${
                                isLight
                                  ? 'border-amber-900/20 text-amber-950'
                                  : 'border-amber-400/25 text-amber-50/95'
                              }`}
                            >
                              {msg.transcriptText}
                            </p>
                          )}
                          {!isRecognizing && !msg.transcriptText && msg.sttStatus !== 'failed' && (
                            <button
                              type="button"
                              onClick={() => onTranscribeMessage(msg.chatId, msg.id)}
                              className={`text-[14px] font-bold underline decoration-amber-400/60 cursor-pointer ${
                                isLight ? 'text-amber-900' : 'text-[#F4EE8E]'
                              }`}
                            >
                              Расшифровать голос в текст
                            </button>
                          )}
                        </div>
                      )}

                      {msg.mediaUrl && msg.mediaType !== 'image' && !isAudio && (
                        <a
                          href={msg.mediaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2.5 rounded-xl border border-amber-400/35 hover:bg-amber-400/10"
                        >
                          <FileText size={16} className="text-[#E7C768]" />
                          <span className="truncate flex-1 text-[14px]">{msg.fileName || 'Документ'}</span>
                          <Download size={15} />
                        </a>
                      )}

                      {msg.message && msg.message.trim() !== (msg.transcriptText || '').trim() && (
                        <p className="whitespace-pre-wrap break-words leading-relaxed text-[14px]">{msg.message}</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {errorBanner && (
            <div className="mx-3 mb-2 p-2.5 rounded-xl border border-rose-400/50 text-rose-300 text-[14px] flex items-center justify-between gap-2">
              <span>{errorBanner}</span>
              <button type="button" onClick={() => setErrorBanner(null)} className="cursor-pointer">
                <X size={15} />
              </button>
            </div>
          )}

          {/* Message Composer */}
          <form
            onSubmit={onSendText}
            className={`p-3 border-t flex items-center gap-2 shrink-0 ${
              isLight ? 'border-amber-900/15' : 'border-amber-400/25'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFileUpload(f);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
              className={`h-11 w-11 rounded-xl border flex items-center justify-center shrink-0 cursor-pointer ${
                isLight ? 'border-amber-900/25 text-amber-950' : 'border-amber-400/35 text-[#F4EE8E]'
              }`}
              title="Прикрепить фото, аудио или документ"
            >
              <Paperclip size={18} />
            </button>

            {isRecordingVoice ? (
              <button
                type="button"
                onClick={onStopVoiceRecording}
                className="h-11 px-3.5 rounded-xl bg-rose-600 text-white text-[14px] font-bold flex items-center gap-1.5 cursor-pointer shrink-0 tabular-nums"
              >
                <Square size={14} />
                <span>Стоп ({recordingSec}с)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onStartVoiceRecording}
                disabled={sending}
                className={`h-11 w-11 rounded-xl border flex items-center justify-center shrink-0 cursor-pointer ${
                  isLight ? 'border-amber-900/25 text-amber-950' : 'border-amber-400/35 text-[#F4EE8E]'
                }`}
                title="Записать голосовое сообщение"
              >
                <Mic size={18} />
              </button>
            )}

            <input
              type="text"
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              placeholder="Написать сообщение..."
              className={`flex-1 min-w-0 h-11 px-3.5 rounded-xl border text-[14px] focus:outline-none ${
                isLight
                  ? 'bg-transparent border-amber-900/25 text-amber-950'
                  : 'bg-transparent border-amber-400/35 text-white'
              }`}
            />

            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className="h-11 px-4 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-black text-[14px] flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
            >
              <Send size={16} />
              <span className="hidden sm:inline">Отправить</span>
            </button>
          </form>
        </>
      )}
    </section>
  );
};
