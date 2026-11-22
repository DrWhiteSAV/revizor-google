import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { PhoneIncoming, PhoneOff, Video } from 'lucide-react';
import { sharedCommsSocket } from '../../hooks/useCommsSocket';
import type { IncomingCallInvite } from '../../types/comms';

interface CommsGlobalOverlayProps {
  currentUserId: string;
  theme?: 'dark' | 'light';
  activeRoomId: string | null;
  onAcceptCall: (invite: IncomingCallInvite) => void;
}

export const CommsGlobalOverlay: React.FC<CommsGlobalOverlayProps> = ({
  currentUserId,
  theme = 'dark',
  activeRoomId,
  onAcceptCall
}) => {
  const [incomingCall, setIncomingCall] = useState<IncomingCallInvite | null>(null);
  const isLight = theme === 'light';

  useEffect(() => {
    const unsubInvite = sharedCommsSocket.subscribe('call:invite', (payload: IncomingCallInvite) => {
      if (!payload?.roomId || payload.callerId === currentUserId) return;
      if (activeRoomId === payload.roomId) return;
      setIncomingCall(payload);
    });
    const unsubEnded = sharedCommsSocket.subscribe('rtc:room_ended', (payload) => {
      setIncomingCall((cur) => (cur && cur.roomId === payload?.roomId ? null : cur));
    });
    return () => {
      unsubInvite();
      unsubEnded();
    };
  }, [currentUserId, activeRoomId]);

  if (!incomingCall) return null;

  const handleDecline = () => {
    sharedCommsSocket.send('call:decline', {
      roomId: incomingCall.roomId,
      callerId: incomingCall.callerId
    });
    setIncomingCall(null);
  };

  const handleAccept = () => {
    const target = incomingCall;
    setIncomingCall(null);
    onAcceptCall(target);
  };

  return createPortal(
    <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-[9980] animate-fade-in font-sans">
      <div
        className={`rounded-3xl border-2 p-4 shadow-2xl space-y-3 ${
          isLight
            ? 'bg-[#FFFBF5] border-amber-800/40 text-amber-950'
            : 'bg-[#1A0F02] border-[#E7C768] text-white shadow-[0_0_32px_rgba(244,238,142,0.3)]'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#F4EE8E] to-[#D99E41] text-amber-950 flex items-center justify-center shrink-0">
            <PhoneIncoming size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-[#E7C768]">
              Входящий видеозвонок
            </div>
            <div className="text-sm font-extrabold truncate">{incomingCall.callerName}</div>
            <div className="text-xs opacity-75 truncate">{incomingCall.title}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDecline}
            className="flex-1 py-2.5 px-3 rounded-xl border border-red-500/40 bg-red-500/15 hover:bg-red-500/25 text-red-400 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <PhoneOff size={15} />
            <span>Отклонить</span>
          </button>
          <button
            type="button"
            onClick={handleAccept}
            className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
          >
            <Video size={15} />
            <span>Принять</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
