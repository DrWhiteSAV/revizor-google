import type { PgDbAdapter } from '../../db/initDb';

let commsSchemaReadyPromise: Promise<void> | null = null;

export async function ensureCommsSchema(db: PgDbAdapter): Promise<void> {
  if (!db) return;
  if (commsSchemaReadyPromise) return commsSchemaReadyPromise;

  commsSchemaReadyPromise = (async () => {
    try {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS company_chats (
          id TEXT PRIMARY KEY,
          company_id TEXT,
          chat_type TEXT NOT NULL DEFAULT 'group',
          department_id TEXT,
          title TEXT NOT NULL,
          description TEXT,
          avatar_url TEXT,
          creator_id TEXT NOT NULL,
          ai_moderation_enabled SMALLINT DEFAULT 1,
          moderation_prompt TEXT,
          is_archived SMALLINT DEFAULT 0,
          last_message_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS company_chat_members (
          id TEXT PRIMARY KEY,
          chat_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          role TEXT DEFAULT 'member',
          last_read_at TIMESTAMP,
          is_muted SMALLINT DEFAULT 0,
          joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS company_chat_messages (
          id TEXT PRIMARY KEY,
          chat_id TEXT NOT NULL,
          sender_id TEXT NOT NULL,
          sender_name TEXT,
          sender_avatar TEXT,
          message TEXT,
          message_kind TEXT DEFAULT 'text',
          reply_to_id TEXT,
          invite_payload_json TEXT,
          media_url TEXT,
          media_type TEXT,
          file_name TEXT,
          file_size BIGINT,
          moderation_status TEXT DEFAULT 'approved',
          is_edited SMALLINT DEFAULT 0,
          deleted_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS video_rooms (
          id TEXT PRIMARY KEY,
          company_id TEXT,
          chat_id TEXT,
          room_type TEXT DEFAULT 'group',
          title TEXT NOT NULL,
          host_id TEXT NOT NULL,
          is_active SMALLINT DEFAULT 1,
          transcription_enabled SMALLINT DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          ended_at TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS video_room_members (
          id TEXT PRIMARY KEY,
          room_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          display_name TEXT,
          avatar_url TEXT,
          is_camera_on SMALLINT DEFAULT 1,
          is_mic_on SMALLINT DEFAULT 1,
          is_screen_sharing SMALLINT DEFAULT 0,
          transport_mode TEXT DEFAULT 'p2p',
          joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_ping TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS video_signaling (
          id TEXT PRIMARY KEY,
          room_id TEXT NOT NULL,
          sender_id TEXT NOT NULL,
          target_id TEXT,
          type TEXT NOT NULL,
          payload_json TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS video_room_transcripts (
          id TEXT PRIMARY KEY,
          room_id TEXT NOT NULL,
          chat_id TEXT,
          user_id TEXT NOT NULL,
          speaker_name TEXT,
          text TEXT NOT NULL,
          audio_duration_sec REAL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS chat_moderation_config (
          id TEXT PRIMARY KEY,
          function_id INTEGER DEFAULT 763,
          functions_base_id TEXT DEFAULT 'appkq3HrzrxYxoAV8',
          bot_id TEXT DEFAULT '69415',
          instruction TEXT,
          options TEXT DEFAULT 'Отказ::no;;Согласие::yes',
          decision_type TEXT DEFAULT 'choice',
          ai_model TEXT DEFAULT '~typesafe/jev-latest',
          log_url TEXT DEFAULT 'https://docs.google.com/spreadsheets/d/1Wjtso1KaGm6pdaBtk6GYhsvmjjZ3Trh9asLmc95peg4/edit?usp=sharing',
          enable_sheets_logging SMALLINT DEFAULT 1,
          user_prefix TEXT DEFAULT 'jev{id}',
          is_active SMALLINT DEFAULT 1,
          reject_threshold REAL DEFAULT 0.5,
          debug SMALLINT DEFAULT 0,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS comms_user_preferences (
          user_id TEXT PRIMARY KEY,
          layout_json TEXT NOT NULL DEFAULT '{}',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        ALTER TABLE company_chat_messages ADD COLUMN IF NOT EXISTS transcript_text TEXT;
        ALTER TABLE company_chat_messages ADD COLUMN IF NOT EXISTS stt_status TEXT;
        ALTER TABLE video_room_transcripts ADD COLUMN IF NOT EXISTS audio_url TEXT;

        CREATE INDEX IF NOT EXISTS idx_ccm_chat_created ON company_chat_messages (chat_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_ccmemb_user ON company_chat_members (user_id);
        CREATE INDEX IF NOT EXISTS idx_ccmemb_chat ON company_chat_members (chat_id);
        CREATE INDEX IF NOT EXISTS idx_vroom_company ON video_rooms (company_id, is_active);
        CREATE INDEX IF NOT EXISTS idx_vrm_room ON video_room_members (room_id);
      `);
    } catch (err) {
      commsSchemaReadyPromise = null;
      throw err;
    }
  })();

  return commsSchemaReadyPromise;
}
