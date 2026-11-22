export interface CommsColleague {
  id: string;
  name: string;
  role: string;
  position: string;
  avatarUrl: string;
  telegramId?: string;
  departmentId?: string;
  online: boolean;
}

export interface CommsChatMember {
  userId: string;
  role: string;
  name: string;
  position?: string;
  avatarUrl?: string;
  online?: boolean;
}

export interface CommsVideoInvitePayload {
  roomId: string;
  roomType?: 'direct' | 'group' | string;
  title: string;
  hostId: string;
  hostName: string;
}

export interface CommsMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  message: string;
  messageKind: 'text' | 'video_invite' | 'system' | string;
  replyToId?: string | null;
  invitePayload?: CommsVideoInvitePayload | null;
  mediaUrl?: string | null;
  mediaType?: 'image' | 'audio' | 'video' | 'file' | string | null;
  fileName?: string | null;
  fileSize?: number | null;
  transcriptText?: string | null;
  sttStatus?: 'processing' | 'done' | 'empty' | null;
  createdAt: string;
}

export interface CommsChat {
  id: string;
  companyId: string;
  chatType: 'direct' | 'group' | 'department' | string;
  departmentId?: string | null;
  title: string;
  description?: string;
  creatorId: string;
  aiModerationEnabled: boolean;
  moderationPrompt?: string;
  isMuted?: boolean;
  unreadCount: number;
  members: CommsChatMember[];
  peer?: CommsChatMember | null;
  lastMessage?: {
    id: string;
    sender_id: string;
    sender_name?: string;
    message?: string;
    message_kind?: string;
    media_type?: string;
    file_name?: string;
    transcript_text?: string;
    created_at?: string;
  } | null;
  lastMessageAt?: string;
}

export interface CommsVideoRoom {
  id: string;
  chatId?: string | null;
  roomType: 'direct' | 'group' | string;
  title: string;
  hostId: string;
  isActive?: boolean;
  transcriptionEnabled: boolean;
  joinPath?: string;
  joinUrl?: string;
  createdAt?: string;
  members?: Array<{
    user_id: string;
    display_name?: string;
    avatar_url?: string;
    is_camera_on?: number;
    is_mic_on?: number;
  }>;
}

export interface CommsTranscriptEntry {
  id: string;
  roomId: string;
  chatId?: string | null;
  userId: string;
  speakerName: string;
  text: string;
  audioUrl?: string | null;
  audioDurationSec?: number;
  createdAt: string;
}

export interface IncomingCallInvite {
  roomId: string;
  chatId?: string | null;
  roomType?: string;
  title: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
}

export interface CommsTileSizePref {
  widthPct?: number;
  aspect?: number;
}

export interface CommsModeLayoutPrefs {
  sidebarWidthPx?: number;
  callDrawerWidthPx?: number;
  callDrawerHeightPct?: number;
  tiles?: Record<string, CommsTileSizePref>;
}

export interface CommsUserLayoutPrefs {
  desktop: CommsModeLayoutPrefs;
  mobile: CommsModeLayoutPrefs;
}

