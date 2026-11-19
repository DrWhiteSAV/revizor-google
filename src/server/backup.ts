import { getDb } from "../db/initDb";
import { sendTelegramDocument, sendTelegramMessage, getTelegramBotConfig, isTelegramClientError } from "./telegram";

export interface DatabaseBackupResult {
  success: boolean;
  totalRows: number;
  tablesCount: number;
  filename: string;
  fileSizeBytes?: number;
  error?: string;
  usedFallback?: boolean;
}

export async function executeDatabaseBackup(reason = "Автоматический бэкап"): Promise<DatabaseBackupResult> {
  try {
    const db = await getDb();
    const now = new Date();
    const mskTime = new Date(now.getTime() + 3 * 3600 * 1000);
    const mskTimeStr = mskTime.toISOString().replace("T", " ").substring(0, 19) + " MSK";
    const fileTimestamp = mskTime.toISOString().replace(/[:.]/g, "-").substring(0, 19);
    const filename = `db_backup_${fileTimestamp}.json`;

    // Fetch all public base tables from PostgreSQL BD ProTalk
    const tableRows = await db.all(
      "SELECT table_name as name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name ASC"
    );
    const allowedTables = (tableRows || []).map((r: any) => r.name || r.table_name).filter(Boolean);

    let appVersion = "v.1.48";
    try {
      await db.run("CREATE TABLE IF NOT EXISTS system_settings (key TEXT PRIMARY KEY, value TEXT, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
      const vRow = await db.get("SELECT value FROM system_settings WHERE key = 'app_version'");
      if (vRow?.value) {
        appVersion = vRow.value;
      } else {
        await db.run("INSERT INTO system_settings (key, value) VALUES ('app_version', 'v.1.48') ON CONFLICT (key) DO NOTHING");
      }
    } catch (e) {
      // fallback to default
    }

    const backupData: Record<string, any> = {
      meta: {
        app: "ИИ Рапорт & ИИ Ревизор",
        version: appVersion,
        engine: "PostgreSQL BD ProTalk (raport)",
        exportedAt: now.getTime(),
        exportedAtMSK: mskTimeStr,
        reason
      },
      schemas: {},
      tables: {}
    };

    let totalRows = 0;
    let tablesWithData = 0;

    for (const table of allowedTables) {
      try {
        const rows = await db.all(`SELECT * FROM "${table}"`);
        const schema = await db.all(
          `SELECT column_name as name, data_type as type, is_nullable FROM information_schema.columns WHERE table_name = '${table}' ORDER BY ordinal_position`
        );
        backupData.tables[table] = rows || [];
        backupData.schemas[table] = schema || [];
        totalRows += (rows || []).length;
        if (rows && rows.length > 0) tablesWithData++;
      } catch (err) {
        backupData.tables[table] = [];
        backupData.schemas[table] = [];
      }
    }

    const fileBuffer = Buffer.from(JSON.stringify(backupData, null, 2), "utf-8");

    const caption =
      `📦 <b>Резервная копия базы данных PostgreSQL ProTalk («raport»)</b>\n\n` +
      `🏷 Версия: <b>${appVersion}</b>\n` +
      `📌 Причина: <i>${reason}</i>\n` +
      `🕒 Время (МСК): <code>${mskTimeStr}</code>\n` +
      `📑 Таблиц: <b>${allowedTables.length}</b> (с данными: <b>${tablesWithData}</b>)\n` +
      `📊 Всего записей: <b>${totalRows.toLocaleString("ru-RU")}</b>\n` +
      `💾 Размер файла: <b>${(fileBuffer.length / 1024).toFixed(1)} KB</b>`;

    const config = await getTelegramBotConfig();
    const adminId = config.adminTelegramId || "169262990";

    const result = await sendTelegramDocument({
      chatId: adminId,
      fileBuffer,
      filename,
      caption
    });

    // Log to triggers_log
    try {
      await db.run(
        "INSERT INTO triggers_log (triggerName, tableName, action, details) VALUES (?, ?, ?, ?)",
        [
          "telegram_json_backup",
          "database",
          result.ok ? "BACKUP_SUCCESS" : "BACKUP_ERROR",
          `Бэкап '${filename}' (${(fileBuffer.length / 1024).toFixed(1)} KB, строк: ${totalRows}). Статус: ${result.ok ? "Отправлен в TG" : result.error}`
        ]
      );
    } catch (e) {
      // ignore log error
    }

    if (!result.ok) {
      if (!isTelegramClientError(result.error)) {
        await sendTelegramMessage({
          chatId: adminId,
          text: `⚠️ <b>Ошибка отправки бэкапа базы данных!</b>\n\nПричина: <code>${result.error || "Неизвестная ошибка"}</code>\nФайл: <code>${filename}</code>\nСтрок: <b>${totalRows}</b>`
        });
      }
      return {
        success: false,
        totalRows,
        tablesCount: allowedTables.length,
        filename,
        fileSizeBytes: fileBuffer.length,
        error: result.error
      };
    }

    return {
      success: true,
      totalRows,
      tablesCount: allowedTables.length,
      filename,
      fileSizeBytes: fileBuffer.length,
      usedFallback: result.usedFallback
    };
  } catch (error: any) {
    console.error("[Database Backup] Fatal execution error:", error);
    return {
      success: false,
      totalRows: 0,
      tablesCount: 0,
      filename: "",
      error: error.message
    };
  }
}
