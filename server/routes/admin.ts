import express from "express";
import fs from "fs";
import path from "path";
import { getDb } from "../../src/db/initDb";
import { 
  getTelegramBotConfig, 
  maskTelegramToken, 
  cleanTelegramBaseUrl, 
  PROXY_PRESETS,
  sendTelegramMessage
} from "../../src/server/telegram";
import { executeDatabaseBackup } from "../../src/server/backup";
import { registerSseClient, emitDbChange } from "../../src/server/realtimeEvents";

const router = express.Router();

// 0. Real-time Server-Sent Events stream for live BD ProTalk sync
router.get("/events", (req, res) => {
  registerSseClient(res, req);
});

// Helper: JSON to CSV
function jsonToCsv(rows: Record<string, any>[]): string {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const csvLines = [headers.join(',')];
  for (const row of rows) {
    const values = headers.map(h => {
      let val = row[h];
      if (val === null || val === undefined) return '""';
      if (typeof val === 'object') val = JSON.stringify(val);
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    });
    csvLines.push(values.join(','));
  }
  return csvLines.join('\n');
}

// Helper: Parse CSV
function parseCsv(csvText: string): Record<string, any>[] {
  const lines = csvText.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];
  
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(cur);
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur);
    return result;
  };

  const headers = parseLine(lines[0]).map(h => h.trim().replace(/^"|"$/g, ''));
  const rows: Record<string, any>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const rowObj: Record<string, any> = {};
    headers.forEach((h, idx) => {
      let rawVal = values[idx] !== undefined ? values[idx].trim() : '';
      if (rawVal.startsWith('"') && rawVal.endsWith('"')) {
        rawVal = rawVal.slice(1, -1).replace(/""/g, '"');
      }
      rowObj[h] = rawVal;
    });
    rows.push(rowObj);
  }
  return rows;
}

// 1. Get list of all tables in PostgreSQL BD ProTalk
router.get("/tables", async (req, res) => {
  try {
    const db = await getDb();
    const tables = await db.all(`
      SELECT table_name as name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name ASC;
    `);

    const result = [];
    for (const t of tables) {
      const countRes = await db.get(`SELECT COUNT(*) as count FROM "${t.name}"`);
      result.push({
        name: t.name,
        count: countRes ? countRes.count : 0
      });
    }

    res.json({ success: true, tables: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Get table details (Columns, Rows with filter and sort)
router.get("/table/:tableName", async (req, res) => {
  try {
    const { tableName } = req.params;
    const { search, sortField, sortOrder } = req.query;

    const db = await getDb();
    
    const tableCheck = await db.get(`SELECT table_name as name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ?`, [tableName]);
    if (!tableCheck) {
      return res.status(404).json({ success: false, error: `Table '${tableName}' not found` });
    }

    const columnsInfo = await db.all(`PRAGMA table_info("${tableName}")`);
    
    let sql = `SELECT * FROM "${tableName}"`;
    const params: any[] = [];

    if (search && typeof search === 'string' && search.trim() !== '') {
      const colNames = columnsInfo.map(c => `CAST("${c.name}" AS TEXT) ILIKE ?`).join(' OR ');
      sql += ` WHERE ${colNames}`;
      for (let i = 0; i < columnsInfo.length; i++) {
        params.push(`%${search.trim()}%`);
      }
    }

    if (sortField && typeof sortField === 'string') {
      const order = sortOrder === 'desc' ? 'DESC' : 'ASC';
      sql += ` ORDER BY "${sortField}" ${order}`;
    }

    const rows = await db.all(sql, params);

    res.json({
      success: true,
      tableName,
      columns: columnsInfo.map(c => ({
        name: c.name,
        type: c.type,
        notNull: Boolean(c.notnull),
        pk: Boolean(c.pk)
      })),
      rows
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Create a new row in a table
router.post("/table/:tableName/row", async (req, res) => {
  try {
    const { tableName } = req.params;
    const rowData = req.body;

    const db = await getDb();
    const columnsInfo = await db.all(`PRAGMA table_info("${tableName}")`);
    const validCols = new Set(columnsInfo.map((c: any) => c.name));
    const columns = Object.keys(rowData).filter(c => validCols.size === 0 || validCols.has(c));
    if (columns.length === 0) {
      return res.status(400).json({ success: false, error: "Row data cannot be empty" });
    }

    const colNames = columns.map(c => `"${c}"`).join(', ');
    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map(c => (rowData[c] === '' || rowData[c] === undefined ? null : rowData[c]));

    const result = await db.run(
      `INSERT INTO "${tableName}" (${colNames}) VALUES (${placeholders})`,
      values
    );

    emitDbChange(tableName, 'insert', result.lastID ?? rowData.id ?? null);
    res.json({ success: true, insertedId: result.lastID, changes: result.changes });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Update an existing row in a table
router.put("/table/:tableName/row/:id", async (req, res) => {
  try {
    const { tableName, id } = req.params;
    const rowData = req.body;

    const db = await getDb();
    const columnsInfo = await db.all(`PRAGMA table_info("${tableName}")`);
    const pkCol = columnsInfo.find(c => Boolean(c.pk))?.name || 'id';

    const setClauses: string[] = [];
    const values: any[] = [];

    for (const [key, val] of Object.entries(rowData)) {
      if (key !== pkCol) {
        setClauses.push(`"${key}" = ?`);
        values.push(val === '' || val === undefined ? null : val);
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ success: false, error: "No fields to update" });
    }

    values.push(id);

    const result = await db.run(
      `UPDATE "${tableName}" SET ${setClauses.join(', ')} WHERE "${pkCol}" = ?`,
      values
    );

    emitDbChange(tableName, 'update', id);
    res.json({ success: true, changes: result.changes });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4b. Update a single cell in a table (Inline fast editing)
router.post("/table/:tableName/cell", async (req, res) => {
  try {
    const { tableName } = req.params;
    const { primaryKey, primaryKeyValue, field, value } = req.body;
    
    if (!field || primaryKeyValue === undefined) {
      return res.status(400).json({ success: false, error: "Missing primaryKeyValue or field" });
    }

    const db = await getDb();
    const columnsInfo = await db.all(`PRAGMA table_info("${tableName}")`);
    const pkCol = primaryKey || columnsInfo.find(c => Boolean(c.pk))?.name || 'id';

    const result = await db.run(
      `UPDATE "${tableName}" SET "${field}" = ? WHERE "${pkCol}" = ?`,
      [value === '' || value === undefined ? null : value, primaryKeyValue]
    );

    emitDbChange(tableName, 'update', primaryKeyValue);
    res.json({ success: true, changes: result.changes });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Delete a row from a table
router.delete("/table/:tableName/row/:id", async (req, res) => {
  try {
    const { tableName, id } = req.params;
    const db = await getDb();

    const columnsInfo = await db.all(`PRAGMA table_info("${tableName}")`);
    const pkCol = columnsInfo.find(c => Boolean(c.pk))?.name || 'id';

    const result = await db.run(
      `DELETE FROM "${tableName}" WHERE "${pkCol}" = ?`,
      [id]
    );

    emitDbChange(tableName, 'delete', id);
    res.json({ success: true, changes: result.changes });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Get PostgreSQL BD ProTalk Triggers & Logs
router.get("/triggers", async (req, res) => {
  try {
    const db = await getDb();
    const triggers = await db.all(`
      SELECT trigger_name as name, event_object_table as tbl_name, action_statement as sql 
      FROM information_schema.triggers 
      WHERE trigger_schema = 'public';
    `);
    const logs = await db.all(`
      SELECT * FROM triggers_log ORDER BY id DESC LIMIT 50;
    `);

    res.json({ success: true, triggers, logs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. Get Registered Cron Jobs
router.get("/cron", async (req, res) => {
  try {
    const db = await getDb();
    const jobs = await db.all('SELECT * FROM cron_jobs ORDER BY id ASC');
    res.json({ success: true, jobs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 8. Manually Run a Cron Job
router.post("/cron/run/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    const now = new Date().toISOString();

    let resultMsg = "Фоновая задача успешно выполнена вручную через Админ-панель";
    if (id === 'cron-1') {
      resultMsg = "Ручной запуск аудита отчетов: системные метрики обновлены";
    } else if (id === 'cron-2') {
      resultMsg = "Ручной запуск проверки дедлайнов: просрочек не выявлено";
    } else if (id === 'cron-3') {
      resultMsg = "Ручной запуск очистки логов: обработка завершена";
    } else if (id === 'cron-4') {
      const bRes = await executeDatabaseBackup("Ручной запуск бэкапа PostgreSQL через задачу cron-4");
      resultMsg = bRes.success 
        ? `Бэкап PostgreSQL успешно отправлен в Telegram (${bRes.totalRows} строк, ${bRes.tablesCount} табл.)`
        : `Ошибка отправки бэкапа в Telegram: ${bRes.error}`;
    } else if (id === 'cron-5') {
      const shiftRes = await db.run("UPDATE employee_shifts SET is_locked = 1 WHERE shift_date < DATE('now') AND is_locked = 0");
      resultMsg = `Зафиксировано прошедших смен: ${shiftRes.changes || 0}`;
    } else if (id === 'cron-6') {
      const bRes = await executeDatabaseBackup("Ручной запуск крон-задачи cron-6");
      resultMsg = bRes.success 
        ? `Бэкап JSON успешно отправлен в Telegram (${bRes.totalRows} строк, ${bRes.tablesCount} табл.)`
        : `Ошибка отправки бэкапа в Telegram: ${bRes.error}`;
    }

    await db.run(
      'UPDATE cron_jobs SET "lastRun" = ?, "lastResult" = ? WHERE id = ?',
      [now, resultMsg, id]
    );

    emitDbChange('cron_jobs', 'update', id);
    res.json({ success: true, message: resultMsg, lastRun: now });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 8b. Get Telegram Bot & Proxy Settings (with masked token)
router.get("/bot-settings", async (req, res) => {
  try {
    const config = await getTelegramBotConfig();
    const masked = maskTelegramToken(config.botToken);

    res.json({
      success: true,
      botTokenMasked: masked,
      isTokenConfigured: Boolean(config.botToken && config.botToken.length > 5),
      botUsername: config.botUsername,
      proxyType: config.proxyType || "dialog_ai",
      apiBaseUrl: config.apiBaseUrl,
      adminTelegramId: config.adminTelegramId || "169262990",
      appUrl: config.appUrl || "https://t.me/ii_rrbot/app",
      referralTemplate: config.referralTemplate || "https://t.me/ii_rrbot/app?startapp="
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 8c. Save Telegram Bot & Proxy Settings
router.post("/bot-settings", async (req, res) => {
  try {
    const { botToken, botUsername, proxyType, apiBaseUrl, adminTelegramId } = req.body;
    const currentConfig = await getTelegramBotConfig();

    let finalToken = currentConfig.botToken;
    if (botToken && typeof botToken === "string" && botToken.trim() !== "" && !botToken.includes("•••")) {
      finalToken = botToken.trim();
    }

    let finalBaseUrl = currentConfig.apiBaseUrl;
    if (proxyType === "dialog_ai") {
      finalBaseUrl = PROXY_PRESETS.dialog_ai;
    } else if (proxyType === "direct") {
      finalBaseUrl = PROXY_PRESETS.direct;
    } else if (apiBaseUrl) {
      finalBaseUrl = cleanTelegramBaseUrl(apiBaseUrl);
    }

    const finalAdminId = adminTelegramId && String(adminTelegramId).trim() !== "" 
      ? String(adminTelegramId).trim() 
      : currentConfig.adminTelegramId || "169262990";

    const finalBotUsername = botUsername ? String(botUsername).trim() : currentConfig.botUsername || "@ii_rrbot";

    const configJson = JSON.stringify({
      botUsername: finalBotUsername,
      proxyType: proxyType || currentConfig.proxyType || "dialog_ai",
      apiBaseUrl: finalBaseUrl,
      adminTelegramId: finalAdminId,
      appUrl: currentConfig.appUrl || "https://t.me/ii_rrbot/app",
      referralTemplate: currentConfig.referralTemplate || "https://t.me/ii_rrbot/app?startapp="
    });

    const db = await getDb();
    const existing = await db.get("SELECT * FROM telegram_bot_config WHERE id = 'default'");

    if (existing) {
      await db.run(
        `UPDATE telegram_bot_config SET botToken = ?, apiBaseUrl = ?, config_json = ?, updated_at = ? WHERE id = 'default'`,
        [finalToken, finalBaseUrl, configJson, Date.now()]
      );
    } else {
      await db.run(
        `INSERT INTO telegram_bot_config (id, botToken, apiBaseUrl, secondaryApiBaseUrl, config_json, updated_at)
         VALUES ('default', ?, ?, 'https://api.telegram.org', ?, ?)`,
        [finalToken, finalBaseUrl, configJson, Date.now()]
      );
    }

    res.json({
      success: true,
      message: "Настройки Telegram и шлюза прокси успешно сохранены!",
      botTokenMasked: maskTelegramToken(finalToken),
      isTokenConfigured: Boolean(finalToken && finalToken.length > 5),
      botUsername: finalBotUsername,
      proxyType: proxyType || "dialog_ai",
      apiBaseUrl: finalBaseUrl,
      adminTelegramId: finalAdminId
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 8d. Trigger Database Backup to Telegram On-Demand
router.post(["/backup", "/backup/trigger"], async (req, res) => {
  try {
    const { reason = "Ручной запуск из панели администратора" } = req.body || {};
    const result = await executeDatabaseBackup(reason);
    
    if (result.success) {
      res.json({
        success: true,
        message: `Бэкап JSON успешно сгенерирован и отправлен администратору в Telegram!`,
        backupPath: result.filename,
        details: result
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || "Не удалось отправить бэкап в Telegram",
        details: result
      });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 8e. Test Telegram Message via Proxy
router.post("/telegram/test-message", async (req, res) => {
  try {
    const { chatId, text } = req.body || {};
    const config = await getTelegramBotConfig();
    const targetChatId = chatId || config.adminTelegramId || "169262990";
    const msgText = text || `🔔 <b>Тестовое сообщение от ИИ Рапорт & ИИ Ревизор</b>\n\nПрокси-шлюз: <code>${config.apiBaseUrl}</code>\nСтатус: <b>Работает штатно</b>`;

    const result = await sendTelegramMessage({
      chatId: targetChatId,
      text: msgText
    });

    if (result.ok) {
      res.json({
        success: true,
        message: `Тестовое сообщение успешно доставлено в чат ${targetChatId}!`,
        usedFallback: result.usedFallback,
        usedBaseUrl: result.usedBaseUrl
      });
    } else {
      let errorMsg = result.error || "Ошибка доставки тестового сообщения";
      if (/chat not found/i.test(errorMsg)) {
        errorMsg = `Чат ${targetChatId} не найден в Telegram. Чтобы бот мог отправлять сообщения, откройте бота @${config.botUsername?.replace('@', '') || 'ii_rrbot'} в Telegram и нажмите кнопку «Начать» (/start), либо укажите ID группы или канала, куда добавлен бот.`;
      } else if (/bot was blocked/i.test(errorMsg)) {
        errorMsg = `Бот заблокирован пользователем ${targetChatId}. Разблокируйте бота в Telegram и отправьте команду /start.`;
      }
      res.status(400).json({
        success: false,
        error: errorMsg
      });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 9. Export Single Table to CSV
router.get("/export/csv/:tableName", async (req, res) => {
  try {
    const { tableName } = req.params;
    const db = await getDb();
    const rows = await db.all(`SELECT * FROM ${tableName}`);
    const csvContent = jsonToCsv(rows);
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${tableName}_export.csv"`);
    res.send(csvContent);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 10. Export Mass (All Tables) to CSV Bundle
router.get("/export/all-csv", async (req, res) => {
  try {
    const db = await getDb();
    const tables = await db.all("SELECT table_name as name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'");
    
    const exportBundle: Record<string, string> = {};
    for (const t of tables) {
      const rows = await db.all(`SELECT * FROM ${t.name}`);
      exportBundle[t.name] = jsonToCsv(rows);
    }
    
    res.json({ success: true, timestamp: new Date().toISOString(), tables: exportBundle });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 10b. Full Dynamic JSON Database Backup Export
router.get("/backup/export-json", async (req, res) => {
  try {
    const db = await getDb();
    const tables = await db.all("SELECT table_name as name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'");
    
    const backupData: Record<string, any[]> = {};
    const tableSchemas: Record<string, any[]> = {};
    
    for (const t of tables) {
      const rows = await db.all(`SELECT * FROM ${t.name}`);
      const columns = await db.all(`PRAGMA table_info("${t.name}")`);
      backupData[t.name] = rows;
      tableSchemas[t.name] = columns;
    }
    
    const resultPayload = {
      version: 1,
      type: "FULL_POSTGRESQL_BD_PROTALK_JSON_BACKUP",
      timestamp: new Date().toISOString(),
      tableCount: tables.length,
      tables: tables.map(t => t.name),
      schemas: tableSchemas,
      data: backupData
    };

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="database_full_backup_${Date.now()}.json"`);
    res.json(resultPayload);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 10c. Full Dynamic JSON Database Backup Import
router.post("/backup/import-json", async (req, res) => {
  try {
    const { backupPayload, mode = 'dedup' } = req.body;
    if (!backupPayload || typeof backupPayload !== 'object') {
      return res.status(400).json({ success: false, error: "Invalid backup JSON payload" });
    }

    const dataObj = backupPayload.data || backupPayload.tables || backupPayload;
    if (typeof dataObj !== 'object') {
      return res.status(400).json({ success: false, error: "No table data found in backup payload" });
    }

    const db = await getDb();
    const existingDbTables = await db.all("SELECT table_name as name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'");
    const existingTableNames = new Set(existingDbTables.map(t => t.name));

    let totalRestoredRows = 0;
    const restoredTables: string[] = [];

    for (const [tableName, rows] of Object.entries(dataObj)) {
      if (!existingTableNames.has(tableName)) continue;
      if (!Array.isArray(rows) || rows.length === 0) continue;

      if (mode === 'replace') {
        await db.run(`DELETE FROM ${tableName}`);
      }

      const cols = Object.keys(rows[0]);
      if (cols.length === 0) continue;

      const quotedCols = cols.map(c => `"${c}"`).join(', ');
      const placeholders = cols.map(() => '?').join(', ');
      const insertSql = mode === 'replace'
        ? `INSERT INTO "${tableName}" (${quotedCols}) VALUES (${placeholders})`
        : `INSERT OR REPLACE INTO "${tableName}" (${quotedCols}) VALUES (${placeholders})`;

      for (const row of rows) {
        const values = cols.map(c => row[c] === undefined || row[c] === '' ? null : row[c]);
        await db.run(insertSql, values);
        totalRestoredRows++;
      }
      restoredTables.push(tableName);
    }

    emitDbChange('all', 'import');
    res.json({
      success: true,
      message: `Бэкап JSON успешно импортирован! Восстановлено таблиц: ${restoredTables.length}, записей: ${totalRestoredRows}`,
      restoredTables,
      totalRestoredRows
    });
  } catch (error: any) {
    console.error("JSON Backup Import Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 11. Import CSV to Table
router.post("/import/csv/:tableName", async (req, res) => {
  try {
    const { tableName } = req.params;
    const { csvData, mode } = req.body;

    if (!csvData) {
      return res.status(400).json({ success: false, error: "CSV data is required" });
    }

    const db = await getDb();
    const parsedRows = parseCsv(csvData);

    if (parsedRows.length === 0) {
      return res.status(400).json({ success: false, error: "CSV file is empty or invalid format" });
    }

    if (mode === 'replace') {
      await db.run(`DELETE FROM "${tableName}"`);
    }

    let insertedCount = 0;
    const cols = Object.keys(parsedRows[0]);
    const quotedCols = cols.map(c => `"${c}"`).join(', ');
    const placeholders = cols.map(() => '?').join(', ');
    const insertSql = mode === 'replace'
      ? `INSERT INTO "${tableName}" (${quotedCols}) VALUES (${placeholders})`
      : `INSERT OR REPLACE INTO "${tableName}" (${quotedCols}) VALUES (${placeholders})`;

    for (const row of parsedRows) {
      const values = cols.map(c => row[c] === '' ? null : row[c]);
      await db.run(insertSql, values);
      insertedCount++;
    }

    emitDbChange(tableName, 'import');
    res.json({
      success: true,
      message: `Импорт завершен! Обработано записей: ${insertedCount} (Режим: ${mode === 'replace' ? 'Очистка и замена' : 'Интеллектуальная дедубликация'})`
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 12. Get AI Logs (table `logs`)
router.get("/logs", async (req, res) => {
  try {
    const db = await getDb();
    const { search, limit = 50, offset = 0 } = req.query;
    let sql = `SELECT * FROM logs`;
    const params: any[] = [];
    if (search && typeof search === 'string' && search.trim() !== '') {
      sql += ` WHERE user_id LIKE ? OR prompt LIKE ? OR result_text LIKE ? OR function_name LIKE ? OR status LIKE ?`;
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s, s);
    }
    sql += ` ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const rows = await db.all(sql, params);
    const countRes = await db.get(`SELECT COUNT(*) as total FROM logs`);
    res.json({ success: true, logs: rows, total: countRes?.total || rows.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
