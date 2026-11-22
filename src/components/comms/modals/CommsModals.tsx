import React from 'react';
import { X, Link2, Copy, Check, Video, Users } from 'lucide-react';
import type { CommsChat, CommsColleague } from '../../../types/comms';

interface CommsModalsProps {
  isLight: boolean;
  currentUserId: string;
  colleagues: CommsColleague[];
  selectedChat: CommsChat | null;
  // Create Group Chat Modal
  isGroupModalOpen: boolean;
  setIsGroupModalOpen: (v: boolean) => void;
  groupTitle: string;
  setGroupTitle: (v: string) => void;
  groupDesc: string;
  setGroupDesc: (v: string) => void;
  groupMemberIds: string[];
  setGroupMemberIds: React.Dispatch<React.SetStateAction<string[]>>;
  onCreateGroup: (e: React.FormEvent) => void;
  // Create Video Room by Link Modal
  isRoomModalOpen: boolean;
  onCloseRoomModal: () => void;
  roomTitleDraft: string;
  setRoomTitleDraft: (v: string) => void;
  roomInviteIds: string[];
  setRoomInviteIds: React.Dispatch<React.SetStateAction<string[]>>;
  roomPostToChat: boolean;
  setRoomPostToChat: (v: boolean) => void;
  createdRoomInfo: { roomId: string; title: string; joinUrl: string; chatId?: string | null } | null;
  roomCreating: boolean;
  roomCopied: boolean;
  onCreateLinkRoom: (e: React.FormEvent) => void;
  onCopyLink: (url: string) => void;
  onEnterCreatedRoom: () => void;
  // Chat Settings Modal
  isSettingsModalOpen: boolean;
  setIsSettingsModalOpen: (v: boolean) => void;
  editChatTitle: string;
  setEditChatTitle: (v: string) => void;
  editChatModeration: boolean;
  setEditChatModeration: (v: boolean) => void;
  editChatMembers: string[];
  setEditChatMembers: React.Dispatch<React.SetStateAction<string[]>>;
  onSaveChatSettings: (e: React.FormEvent) => void;
  // Delete Confirm Modal
  deleteConfirmId: string | null;
  setDeleteConfirmId: (v: string | null) => void;
  onConfirmDeleteMessage: () => void;
  // Image Lightbox
  lightboxUrl: string | null;
  setLightboxUrl: (v: string | null) => void;
}

export const CommsModals: React.FC<CommsModalsProps> = ({
  isLight,
  currentUserId,
  colleagues,
  selectedChat,
  isGroupModalOpen,
  setIsGroupModalOpen,
  groupTitle,
  setGroupTitle,
  groupDesc,
  setGroupDesc,
  groupMemberIds,
  setGroupMemberIds,
  onCreateGroup,
  isRoomModalOpen,
  onCloseRoomModal,
  roomTitleDraft,
  setRoomTitleDraft,
  roomInviteIds,
  setRoomInviteIds,
  roomPostToChat,
  setRoomPostToChat,
  createdRoomInfo,
  roomCreating,
  roomCopied,
  onCreateLinkRoom,
  onCopyLink,
  onEnterCreatedRoom,
  isSettingsModalOpen,
  setIsSettingsModalOpen,
  editChatTitle,
  setEditChatTitle,
  editChatModeration,
  setEditChatModeration,
  editChatMembers,
  setEditChatMembers,
  onSaveChatSettings,
  deleteConfirmId,
  setDeleteConfirmId,
  onConfirmDeleteMessage,
  lightboxUrl,
  setLightboxUrl
}) => {
  const modalCardClass = `w-full max-w-md rounded-3xl border p-6 space-y-4 shadow-2xl backdrop-blur-xl ${
    isLight
      ? 'bg-[#FFFBF5]/95 border-amber-900/30 text-amber-950'
      : 'bg-[#1A0F02]/85 border-amber-400/45 text-white shadow-[0_0_30px_rgba(244,238,142,0.18)]'
  }`;

  const inputClass = `w-full p-2.5 rounded-xl border text-[14px] focus:outline-none ${
    isLight
      ? 'bg-white border-amber-900/25 text-amber-950 placeholder-amber-800/50'
      : 'bg-transparent border-amber-400/35 text-white placeholder-amber-200/45'
  }`;

  const others = colleagues.filter((c) => c.id !== currentUserId);

  return (
    <>
      {/* 1. Create Group Chat Modal */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 bg-transparent backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={onCreateGroup} className={modalCardClass}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold flex items-center gap-2">
                <Users size={18} className="text-[#E7C768]" />
                <span>Новый групповой чат</span>
              </h3>
              <button type="button" onClick={() => setIsGroupModalOpen(false)} className="p-1 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3 text-[14px]">
              <div>
                <label className="block font-bold mb-1">Название группы</label>
                <input
                  type="text"
                  required
                  value={groupTitle}
                  onChange={(e) => setGroupTitle(e.target.value)}
                  placeholder="Например: Проектный отдел"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Описание (необязательно)</label>
                <input
                  type="text"
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  placeholder="Цель или тема рабочего чата"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block font-bold mb-1.5">Выберите участников из компании</label>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {others.map((col) => {
                    const checked = groupMemberIds.includes(col.id);
                    return (
                      <label
                        key={col.id}
                        className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer ${
                          isLight ? 'bg-white border-amber-900/15' : 'bg-transparent border-amber-400/25'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setGroupMemberIds((prev) =>
                              e.target.checked ? [...prev, col.id] : prev.filter((id) => id !== col.id)
                            );
                          }}
                          className="accent-[#E7C768] w-4 h-4"
                        />
                        <span className="truncate font-medium">{col.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsGroupModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-amber-400/35 text-[14px] font-bold cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-amber-950 text-[14px] font-black cursor-pointer"
              >
                Создать чат
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. Create Shareable Video Conference Room Modal */}
      {isRoomModalOpen && (
        <div className="fixed inset-0 z-50 bg-transparent backdrop-blur-md flex items-center justify-center p-4">
          {!createdRoomInfo ? (
            <form onSubmit={onCreateLinkRoom} className={modalCardClass}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-extrabold flex items-center gap-2">
                  <Link2 size={18} className="text-[#E7C768]" />
                  <span>Видеокомната со ссылкой</span>
                </h3>
                <button type="button" onClick={onCloseRoomModal} className="p-1 cursor-pointer">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-3 text-[14px]">
                <div>
                  <label className="block font-bold mb-1">Название видеовстречи</label>
                  <input
                    type="text"
                    value={roomTitleDraft}
                    onChange={(e) => setRoomTitleDraft(e.target.value)}
                    placeholder="Например: Утренняя планерка"
                    className={inputClass}
                  />
                </div>
                {selectedChat && (
                  <label className="flex items-center gap-2.5 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={roomPostToChat}
                      onChange={(e) => setRoomPostToChat(e.target.checked)}
                      className="accent-[#E7C768] w-4 h-4"
                    />
                    <span>Отправить приглашение в чат «{selectedChat.title}»</span>
                  </label>
                )}
                <div>
                  <label className="block font-bold mb-1.5">Позвать коллег уведомлением (необязательно)</label>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    {others.map((col) => {
                      const checked = roomInviteIds.includes(col.id);
                      return (
                        <label
                          key={col.id}
                          className={`p-2 rounded-xl border flex items-center gap-2.5 cursor-pointer ${
                            isLight ? 'bg-white border-amber-900/15' : 'bg-transparent border-amber-400/25'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setRoomInviteIds((prev) =>
                                e.target.checked ? [...prev, col.id] : prev.filter((id) => id !== col.id)
                              );
                            }}
                            className="accent-[#E7C768] w-4 h-4"
                          />
                          <span className="truncate font-medium">{col.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onCloseRoomModal}
                  className="px-4 py-2.5 rounded-xl border border-amber-400/35 text-[14px] font-bold cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={roomCreating}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-amber-950 text-[14px] font-black cursor-pointer disabled:opacity-60"
                >
                  {roomCreating ? 'Создание...' : 'Создать ссылку'}
                </button>
              </div>
            </form>
          ) : (
            <div className={modalCardClass}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-extrabold flex items-center gap-2">
                  <Video size={18} className="text-[#E7C768]" />
                  <span>Комната готова</span>
                </h3>
                <button type="button" onClick={onCloseRoomModal} className="p-1 cursor-pointer">
                  <X size={18} />
                </button>
              </div>
              <p className="text-[14px] opacity-85">
                Скопируйте ссылку и отправьте коллегам. Любой сотрудник вашей компании сможет подключиться по ней в один клик.
              </p>
              <div
                className={`p-3 rounded-2xl border space-y-2.5 ${
                  isLight ? 'bg-white border-amber-900/20' : 'bg-transparent border-amber-400/40'
                }`}
              >
                <div className="text-[14px] font-bold truncate">{createdRoomInfo.title}</div>
                <input
                  type="text"
                  readOnly
                  value={createdRoomInfo.joinUrl}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => onCopyLink(createdRoomInfo.joinUrl)}
                  className={`w-full py-2.5 px-3 rounded-xl border text-[14px] font-bold flex items-center justify-center gap-2 cursor-pointer ${
                    isLight
                      ? 'border-amber-900/30 hover:bg-amber-100 text-amber-950'
                      : 'border-amber-400/45 hover:bg-amber-400/15 text-[#F4EE8E]'
                  }`}
                >
                  {roomCopied ? <Check size={16} /> : <Copy size={16} />}
                  <span>{roomCopied ? 'Ссылка скопирована' : 'Скопировать ссылку'}</span>
                </button>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={onCloseRoomModal}
                  className="px-4 py-2.5 rounded-xl border border-amber-400/35 text-[14px] font-bold cursor-pointer"
                >
                  Закрыть
                </button>
                <button
                  type="button"
                  onClick={onEnterCreatedRoom}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-amber-950 text-[14px] font-black cursor-pointer flex items-center gap-1.5"
                >
                  <Video size={16} />
                  <span>Войти в комнату</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Group Settings Modal */}
      {isSettingsModalOpen && selectedChat && (
        <div className="fixed inset-0 z-50 bg-transparent backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={onSaveChatSettings} className={modalCardClass}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold">Настройки чата</h3>
              <button type="button" onClick={() => setIsSettingsModalOpen(false)} className="cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3 text-[14px]">
              <div>
                <label className="block font-bold mb-1">Название</label>
                <input
                  type="text"
                  value={editChatTitle}
                  onChange={(e) => setEditChatTitle(e.target.value)}
                  className={inputClass}
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={editChatModeration}
                  onChange={(e) => setEditChatModeration(e.target.checked)}
                  className="accent-[#E7C768] w-4 h-4"
                />
                <span>Автоматическая проверка безопасности сообщений</span>
              </label>
              {selectedChat.chatType === 'group' && (
                <div>
                  <label className="block font-bold mb-1.5">Состав участников</label>
                  <div className="max-h-44 overflow-y-auto space-y-1.5">
                    {others.map((col) => (
                      <label
                        key={col.id}
                        className={`p-2 rounded-xl border flex items-center gap-2.5 cursor-pointer ${
                          isLight ? 'bg-white border-amber-900/15' : 'bg-transparent border-amber-400/25'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={editChatMembers.includes(col.id)}
                          onChange={(e) =>
                            setEditChatMembers((prev) =>
                              e.target.checked ? [...prev, col.id] : prev.filter((id) => id !== col.id)
                            )
                          }
                          className="accent-[#E7C768] w-4 h-4"
                        />
                        <span className="truncate">{col.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-amber-950 text-[14px] font-black cursor-pointer"
              >
                Сохранить
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. Custom Delete Message Confirm Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-transparent backdrop-blur-md flex items-center justify-center p-4">
          <div className={modalCardClass}>
            <h3 className="text-base font-extrabold">Удалить сообщение?</h3>
            <p className="text-[14px] opacity-80">Сообщение будет удалено для всех участников этого чата.</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2.5 rounded-xl border border-amber-400/35 text-[14px] font-bold cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={onConfirmDeleteMessage}
                className="px-4 py-2.5 rounded-xl bg-red-600 text-white text-[14px] font-bold cursor-pointer"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Image Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[9995] bg-transparent backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 p-2 rounded-full border border-amber-400/40 text-white cursor-pointer"
          >
            <X size={20} />
          </button>
          <img src={lightboxUrl} alt="Просмотр" className="max-w-full max-h-[90vh] rounded-2xl object-contain" />
        </div>
      )}
    </>
  );
};
