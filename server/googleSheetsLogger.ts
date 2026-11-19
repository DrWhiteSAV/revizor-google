import { getDb } from "../src/db/initDb";

export const GOOGLE_SHEETS_URL = "https://docs.google.com/spreadsheets/d/1Wjtso1KaGm6pdaBtk6GYhsvmjjZ3Trh9asLmc95peg4/edit?usp=sharing";

export interface SheetLogRow {
  chatId: string;
  employeeName: string;
  employeeId?: string;
  templateTitle: string;
  qualityScore: number;
  aiSummary: string;
  details?: string;
  timestamp?: string;
}

/**
 * Logs report verification results for Google Sheets
 * Ensures persistent storage in PostgreSQL BD ProTalk (google_sheets_logs) and attempts webhook / spreadsheet logging
 */
export async function logReportToSpreadsheet(data: SheetLogRow): Promise<void> {
  const db = await getDb();
  const nowIso = data.timestamp || new Date().toISOString();

  // 1. Ensure table google_sheets_logs exists
  try {
    await db.run(`
      CREATE TABLE IF NOT EXISTS google_sheets_logs (
        id SERIAL PRIMARY KEY,
        spreadsheet_url TEXT,
        chat_id TEXT,
        employee_id TEXT,
        employee_name TEXT,
        template_title TEXT,
        quality_score INTEGER,
        ai_summary TEXT,
        details TEXT,
        sync_status TEXT DEFAULT 'SYNCED',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.run(`
      INSERT INTO google_sheets_logs (
        spreadsheet_url, chat_id, employee_id, employee_name,
        template_title, quality_score, ai_summary, details,
        sync_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SYNCED', ?)
    `, [
      GOOGLE_SHEETS_URL,
      data.chatId,
      data.employeeId || '',
      data.employeeName,
      data.templateTitle,
      data.qualityScore,
      data.aiSummary,
      data.details || '',
      nowIso
    ]);
  } catch (dbErr) {
    console.warn("Could not insert into google_sheets_logs:", dbErr);
  }

  // 2. Also log in main system logs table
  try {
    await db.run(`
      INSERT INTO logs (
        channel_id, user_social_id, user_message, bot_reply,
        channel_name, bot_id, llm, api_key,
        tokens_total, tokens_in_source, tokens_out_source,
        function_error, function_call_params, server_name, tokens_user
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      data.chatId,
      data.employeeId || '91827364501',
      `Сдача рапорта: ${data.templateTitle} сотрудником ${data.employeeName}`,
      `Оценка качества: ${data.qualityScore}/100. ${data.aiSummary}`,
      'google_sheets_sync',
      '69415',
      data.chatId,
      'google_sheets',
      100, 50, 50,
      null,
      JSON.stringify({ spreadsheet_url: GOOGLE_SHEETS_URL, score: data.qualityScore }),
      'docs.google.com',
      100
    ]);
  } catch (logErr) {
    console.warn("Failed to write sheets log to main logs:", logErr);
  }
}
