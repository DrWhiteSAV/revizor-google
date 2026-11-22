import React from 'react';
import {
  Search,
  Plus,
  Video,
  Users,
  MessageSquare,
  Link2,
  Copy,
  Check,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { CommsChat, CommsColleague, CommsVideoRoom } from '../../../types/comms';

interface CommsSidebarProps {
  isLight: boolean;
  currentUserId: string;
  selectedChatId: string | null;
  setSelectedChatId: (id: string | null) => void;
  listMode: 'chats' | 'colleagues';
  setListMode: (mode: 'chats' | 'colleagues') => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  chats: CommsChat[];
  filteredChats: CommsChat[];
  colleagues: CommsColleague[];
  filteredColleagues: CommsColleague[];
  activeVideoRooms: CommsVideoRoom[];
  activeRoomsCollapsed: boolean;
  setActiveRoomsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  copiedRoomId: string | null;
  canManageGroups: boolean;
  loading: boolean;
  startingCall: boolean;
  isPeerOnline: (uid?: string) => boolean;
  onOpenRoomModal: () => void;
  onOpenGroupModal: () => void;
  onCopyRoomLink: (url: string, roomId: string) => void;
  onCloseActiveRoom: (roomId: string) => void;
  onStartOrJoinCall: (room: { roomId: string; title: string; chatId?: string | null }) => void;
  onOpenDirectWith: (peerId: string) => void;
  onCallColleagueDirect: (col: CommsColleague) => void;
  desktopWidthPx?: number;
}

export const CommsSidebar: React.FC<CommsSidebarProps> = ({
  isLight,
  currentUserId,
  selectedChatId,
  setSelectedChatId,
  listMode,
  setListMode,
  searchQuery,
  setSearchQuery,
  chats,
  filteredChats,
  colleagues,
  filteredColleagues,
  activeVideoRooms,
  activeRoomsCollapsed,
  setActiveRoomsCollapsed,
  copiedRoomId,
  canManageGroups,
  loading,
  startingCall,
  isPeerOnline,
  onOpenRoomModal,
  onOpenGroupModal,
  onCopyRoomLink,
  onCloseActiveRoom,
  onStartOrJoinCall,
  onOpenDirectWith,
  onCallColleagueDirect,
  desktopWidthPx
}) => {
  const [isDesktop, setIsDesktop] = React.useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );

  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = () => setIsDesktop(mq.matches);
    onChange();
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  return (
    <aside
      data-comms-sidebar="1"
      style={isDesktop && desktopWidthPx ? { width: `${desktopWidthPx}px` } : undefined}
      className={`${
        selectedChatId ? 'hidden md:flex' : 'flex'
      } w-full ${isDesktop && desktopWidthPx ? '' : 'md:w-80 lg:w-96'} border-r flex-col shrink-0 ${
        isLight ? 'bg-transparent border-amber-900/20' : 'bg-transparent border-amber-400/30'
      }`}
    >
      {/* Sidebar Header */}
      <div className={`p-3 border-b space-y-2.5 ${isLight ? 'border-amber-900/15' : 'border-amber-400/25'}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            <button
              type="button"
              onClick={() => setListMode('chats')}
              className={`px-3 py-1.5 rounded-xl text-[14px] font-extrabold flex items-center gap-1.5 cursor-pointer ${
                listMode === 'chats'
                  ? 'bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-amber-950'
                  : isLight
                    ? 'text-amber-950 hover:bg-amber-900/10'
                    : 'text-amber-100 hover:bg-amber-400/15'
              }`}
            >
              <MessageSquare size={15} />
              <span>Чаты ({chats.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setListMode('colleagues')}
              className={`px-3 py-1.5 rounded-xl text-[14px] font-extrabold flex items-center gap-1.5 cursor-pointer ${
                listMode === 'colleagues'
                  ? 'bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-amber-950'
                  : isLight
                    ? 'text-amber-950 hover:bg-amber-900/10'
                    : 'text-amber-100 hover:bg-amber-400/15'
              }`}
            >
              <Users size={15} />
              <span>Коллеги ({Math.max(0, colleagues.length - 1)})</span>
            </button>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onOpenRoomModal}
              className={`p-2 rounded-xl border cursor-pointer ${
                isLight
                  ? 'border-amber-900/35 text-amber-950 hover:bg-amber-900/10'
                  : 'border-amber-400/45 text-[#F4EE8E] hover:bg-amber-400/15'
              }`}
              title="Создать видеокомнату со ссылкой"
            >
              <Link2 size={16} />
            </button>
            <button
              type="button"
              onClick={onOpenGroupModal}
              className="p-2 rounded-xl bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-amber-950 font-black cursor-pointer shadow-md"
              title="Создать групповой чат"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={listMode === 'chats' ? 'Поиск по чатам...' : 'Поиск сотрудника...'}
            className={`w-full pl-9 pr-3 py-2 rounded-xl border text-[14px] focus:outline-none ${
              isLight
                ? 'bg-transparent border-amber-900/25 text-amber-950 placeholder-amber-900/50'
                : 'bg-transparent border-amber-400/35 text-white placeholder-amber-100/50'
            }`}
          />
        </div>
      </div>

      {/* Collapsible Active Video Meetings Panel */}
      {activeVideoRooms.length > 0 && (
        <div className={`px-3 py-2 border-b ${isLight ? 'border-amber-900/15' : 'border-amber-400/25'}`}>
          <button
            type="button"
            onClick={() => setActiveRoomsCollapsed((v) => !v)}
            className="w-full flex items-center justify-between gap-2 text-[14px] font-extrabold cursor-pointer py-1"
          >
            <span className={`truncate ${isLight ? 'text-amber-950' : 'text-[#F4EE8E]'}`}>
              Идут видеовстречи ({activeVideoRooms.length})
            </span>
            <span className="flex items-center gap-1 shrink-0 opacity-80">
              <span>{activeRoomsCollapsed ? 'Развернуть' : 'Свернуть'}</span>
              {activeRoomsCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
            </span>
          </button>

          {!activeRoomsCollapsed && (
            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto pr-0.5">
              {activeVideoRooms.map((room) => {
                const joinHref =
                  typeof window !== 'undefined'
                    ? `${window.location.origin}${room.joinPath || `/cabinet/comms?room=${encodeURIComponent(room.id)}`}`
                    : room.joinUrl || '';
                return (
                  <div
                    key={room.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                      isLight ? 'bg-transparent border-amber-900/25' : 'bg-transparent border-amber-400/40'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-bold truncate">{room.title}</div>
                      <div className="text-[14px] opacity-75">
                        Участников: {room.members?.length || 1}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onCopyRoomLink(joinHref, room.id)}
                        className={`p-1.5 rounded-lg border cursor-pointer ${
                          isLight ? 'border-amber-900/30 text-amber-950' : 'border-amber-400/40 text-[#F4EE8E]'
                        }`}
                        title="Скопировать ссылку на встречу"
                      >
                        {copiedRoomId === room.id ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                      {(room.hostId === currentUserId || canManageGroups) && (
                        <button
                          type="button"
                          onClick={() => onCloseActiveRoom(room.id)}
                          className={`p-1.5 rounded-lg border cursor-pointer ${
                            isLight ? 'border-amber-900/30 text-amber-950' : 'border-amber-400/40 text-amber-200'
                          }`}
                          title="Закрыть пустую встречу"
                        >
                          <X size={14} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          onStartOrJoinCall({ roomId: room.id, title: room.title, chatId: room.chatId })
                        }
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-amber-950 text-[14px] font-black cursor-pointer"
                      >
                        Войти
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Chat / Colleagues List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {loading ? (
          <div className="p-6 text-center text-[14px] opacity-70">Загрузка списка...</div>
        ) : listMode === 'chats' ? (
          filteredChats.length === 0 ? (
            <div className="p-6 text-center text-[14px] opacity-75 space-y-2">
              <p>Чаты не найдены</p>
              <button
                type="button"
                onClick={() => setListMode('colleagues')}
                className="px-3.5 py-2 rounded-xl border border-amber-400/45 text-[14px] font-bold cursor-pointer"
              >
                Выбрать коллегу
              </button>
            </div>
          ) : (
            filteredChats.map((chat) => {
              const isActive = chat.id === selectedChatId;
              const peerOnline = chat.chatType === 'direct' && isPeerOnline(chat.peer?.userId);
              return (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => setSelectedChatId(chat.id)}
                  className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                    isActive
                      ? isLight
                        ? 'bg-amber-900/10 border-amber-900/45 text-amber-950'
                        : 'bg-amber-400/15 border-[#E7C768] text-white'
                      : isLight
                        ? 'bg-transparent border-transparent hover:border-amber-900/25'
                        : 'bg-transparent border-transparent hover:border-amber-400/35'
                  }`}
                >
                  <div className="relative w-10 h-10 rounded-2xl border border-amber-400/45 flex items-center justify-center shrink-0 overflow-hidden font-black text-[14px] text-[#E7C768]">
                    {chat.peer?.avatarUrl ? (
                      <img src={chat.peer.avatarUrl} alt={chat.title} className="w-full h-full object-cover" />
                    ) : chat.chatType === 'direct' ? (
                      chat.title.slice(0, 2)
                    ) : (
                      <Users size={17} />
                    )}
                    {peerOnline && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#F4EE8E] ring-2 ring-[#140A01]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[14px] font-extrabold truncate">{chat.title}</span>
                      {chat.unreadCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-[#E7C768] text-amber-950 text-[14px] font-black tabular-nums shrink-0">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="text-[14px] opacity-75 truncate">
                      {chat.lastMessage?.transcript_text ||
                        chat.lastMessage?.message ||
                        (chat.lastMessage?.media_type === 'audio'
                          ? 'Голосовое сообщение'
                          : chat.lastMessage?.media_type === 'image'
                            ? 'Изображение'
                            : chat.lastMessage?.message_kind === 'video_invite'
                              ? 'Видеозвонок'
                              : `Участников: ${chat.members?.length || 1}`)}
                    </div>
                  </div>
                </button>
              );
            })
          )
        ) : filteredColleagues.length === 0 ? (
          <div className="p-6 text-center text-[14px] opacity-75">
            В вашей компании пока нет других добавленных сотрудников.
          </div>
        ) : (
          filteredColleagues.map((col) => {
            const online = isPeerOnline(col.id);
            return (
              <div
                key={col.id}
                className={`p-3 rounded-2xl border flex items-center justify-between gap-2 ${
                  isLight ? 'bg-transparent border-amber-900/20' : 'bg-transparent border-amber-400/30'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onOpenDirectWith(col.id)}
                  className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                >
                  <div className="relative w-10 h-10 rounded-2xl border border-amber-400/45 flex items-center justify-center shrink-0 overflow-hidden font-bold text-[14px] text-[#E7C768]">
                    {col.avatarUrl ? (
                      <img src={col.avatarUrl} alt={col.name} className="w-full h-full object-cover" />
                    ) : (
                      col.name.slice(0, 2)
                    )}
                    {online && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#F4EE8E] ring-2 ring-[#140A01]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[14px] font-extrabold truncate">{col.name}</div>
                    <div className="text-[14px] opacity-75 truncate">
                      {col.position || 'Сотрудник'} · {online ? 'В сети' : 'Не в сети'}
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  disabled={startingCall}
                  onClick={() => onCallColleagueDirect(col)}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-amber-950 cursor-pointer shrink-0 disabled:opacity-60"
                  title="Видеозвонок 1 на 1"
                >
                  <Video size={16} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
