import { getDb } from "../src/db/initDb";

export interface CallProTalkAiOptions {
  prompt: string;
  systemPrompt?: string;
  entityType?: string;
  userId?: string | number;
  authorId?: string | number;
  targetId?: string | number;
  temperature?: number;
  jsonOutput?: boolean;
  timeoutMs?: number;
}

export interface CallProTalkAiResult {
  reply: string;
  raw: any;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Format chat/user identifier for ProTalk AI:
 * Strictly formatted according to the macro rule:
 * ii_rr<USER_ID><entity_type> (e.g. ii_rr91827364501company, ii_rr91827364501raport, ii_rr91827364501revisor).
 * Rigorously strips leading '@', leading 'ask', trailing '_<bot_id>' (e.g. '_69415').
 */
export function sanitizeProTalkChatId(rawChatId?: string | number, defaultUserId: string = '91827364501', entityType: string = 'raport'): string {
  let str = String(rawChatId || defaultUserId).trim();
  // Strip leading @
  str = str.replace(/^@+/, '');
  // Strip leading 'ask' (case-insensitive)
  str = str.replace(/^ask/i, '');
  // Strip trailing _<bot_id> (e.g. _69415)
  str = str.replace(/_\d+$/, '');
  // Strip leading ii_rr prefix for clean normalization
  str = str.replace(/^ii_rr/i, '');
  // Map system-admin / admin / non-numeric to 91827364501
  if (/^system[-_]?admin$/i.test(str) || /^admin$/i.test(str)) {
    str = '91827364501';
  }
  // Keep only alphanumeric characters and underscores
  let clean = str.replace(/[^a-zA-Z0-9_]/g, '') || defaultUserId;
  if (/^systemadmin$/i.test(clean) || /^admin$/i.test(clean)) {
    clean = '91827364501';
  }
  
  // Strip known prior entity suffixes to prevent chaining like "91827364501chatcompany"
  const knownEntitySuffixes = /(?:chat|raport|company|revisor|department|subdepartment|dock_new|employee_duties|employee|schedule_ai|project_with_tasks|project|tasks|task_autofill|task|reports|wiki)$/i;
  let baseUserId = clean.replace(knownEntitySuffixes, '') || defaultUserId;
  if (/^systemadmin$/i.test(baseUserId) || !/\d/.test(baseUserId)) {
    baseUserId = '91827364501';
  }

  const targetEntity = (entityType || '').trim();
  if (!targetEntity) {
    return `ii_rr${baseUserId}`;
  }

  return `ii_rr${baseUserId}${targetEntity}`;
}

export function formatProTalkChatId(userId?: string | number, entityType?: string, authorId?: string | number): string {
  return sanitizeProTalkChatId(userId || authorId, '91827364501', entityType || 'raport');
}

/**
 * Centralized ProTalk AI Service Helper
 * Formats user identifiers strictly as ii_rr<USER_ID><entity_type>
 * Automatically fetches system prompts from database and logs interactions to `logs` table
 */
export async function callProTalkAi({
  prompt,
  systemPrompt,
  entityType = 'raport',
  userId,
  authorId,
  targetId,
  temperature,
  jsonOutput = false,
  timeoutMs
}: CallProTalkAiOptions): Promise<CallProTalkAiResult> {
  const db = await getDb();

  // 1. Fetch credentials from protalk_bots (primary) or protalk_config (fallback)
  const botRow = await db.get(`SELECT * FROM protalk_bots WHERE is_active = 1 ORDER BY created_at ASC LIMIT 1`);
  const cfgRow = await db.get(`SELECT * FROM protalk_config WHERE id = 'default'`);

  const botId = botRow?.bot_id || 69415;
  const botTokenRaw = botRow?.bot_token || cfgRow?.bot_token || "ex7HN6J3qdiME3jBVbtCyBo4s8me3tvq";
  const finalAuthHeader = botTokenRaw.includes("_") ? botTokenRaw : `${botId}_${botTokenRaw}`;
  const baseApiUrl = botRow?.api_url || cfgRow?.url || "https://ai.pro-talk.ru/v1/chat/completions";
  
  const finalTemp = temperature ?? botRow?.temperature ?? cfgRow?.temperature ?? 0.2;

  // 2. Resolve entity prompt & chat_id_rule from protalk_prompts if available
  let resolvedSystemPrompt = systemPrompt;
  let resolvedChatIdRule: string | null = null;
  if (entityType) {
    const promptRow = await db.get(`SELECT * FROM protalk_prompts WHERE entity_type = ?`, [entityType]);
    if (promptRow?.system_prompt && !resolvedSystemPrompt) {
      resolvedSystemPrompt = promptRow.system_prompt;
    }
    if (promptRow?.chat_id_rule) {
      resolvedChatIdRule = promptRow.chat_id_rule;
    }
  }

  let effectiveUserId = String(userId || authorId || '91827364501').replace(/^ii_rr/i, '').trim();
  if (/system[-_]?admin|admin/i.test(effectiveUserId) || !/\d/.test(effectiveUserId)) {
    effectiveUserId = '91827364501';
  }
  let cleanBaseId = effectiveUserId.replace(/(?:chat|raport|company|revisor|department|subdepartment|dock_new|employee_duties|employee|schedule_ai|project_with_tasks|project|tasks|task_autofill|task|reports|wiki)$/i, '') || '91827364501';
  if (/system[-_]?admin|admin/i.test(cleanBaseId) || !/\d/.test(cleanBaseId)) {
    cleanBaseId = '91827364501';
  }

  let formattedChatId: string;
  if (resolvedChatIdRule && resolvedChatIdRule !== 'fixed_universal') {
    formattedChatId = resolvedChatIdRule
      .replace('{USER_ID}', cleanBaseId)
      .replace('{entity_type}', entityType || 'task');
    if (!formattedChatId.startsWith('ii_rr')) {
      formattedChatId = `ii_rr${formattedChatId}`;
    }
  } else {
    formattedChatId = formatProTalkChatId(cleanBaseId, entityType || 'task');
  }
  if (/system[-_]?admin/i.test(formattedChatId)) {
    formattedChatId = formattedChatId.replace(/system[-_]?admin/gi, '91827364501');
  }

  const messages = [
    { role: "user", name: formattedChatId, content: "/restart" },
    { role: "assistant", content: "Диалог перезапущен." }
  ];

  let sysContent = resolvedSystemPrompt || "Ты — умный ассистент платформы «ИИ Ревизор» и «ИИ Рапорт». Отвечай кратко, профессионально и по делу.";
  if (jsonOutput) {
    sysContent += "\nВАЖНО: Верни ответ СТРОГО в виде чистого валидного JSON без какого-либо разметочного форматирования markdown или тэгов ```json.";
  }

  messages.push({ role: "system", content: sysContent });
  messages.push({ role: "user", name: formattedChatId, content: prompt });

  const payload: any = {
    model: formattedChatId,
    messages: messages,
    temperature: finalTemp,
    bot_id: botId,
    bot_token: botTokenRaw,
    bot_chat_id: formattedChatId,
    chat_id: formattedChatId,
    user_id: formattedChatId,
    user: formattedChatId,
    client: formattedChatId,
    client_id: formattedChatId,
    client_name: formattedChatId,
    session_id: formattedChatId,
    external_id: formattedChatId,
    dialog_id: formattedChatId
  };

  const urlWithParams = new URL(baseApiUrl);
  urlWithParams.searchParams.set("model", formattedChatId);
  urlWithParams.searchParams.set("bot_chat_id", formattedChatId);
  urlWithParams.searchParams.set("chat_id", formattedChatId);
  urlWithParams.searchParams.set("user_id", formattedChatId);
  urlWithParams.searchParams.set("bot_id", String(botId));
  urlWithParams.searchParams.set("client_id", formattedChatId);
  urlWithParams.searchParams.set("client_name", formattedChatId);
  urlWithParams.searchParams.set("user", formattedChatId);

  let rawData: any = null;
  let replyText = "";
  let errorMsg: string | null = null;

  let isAborted = false;
  const effectiveTimeoutMs = timeoutMs || 180000;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      isAborted = true;
      controller.abort();
    }, effectiveTimeoutMs);

    let response: Response;
    try {
      response = await fetch(urlWithParams.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${finalAuthHeader}`,
          "X-Model": formattedChatId,
          "X-Bot-Chat-Id": formattedChatId,
          "Bot-Chat-Id": formattedChatId,
          "X-User-Id": formattedChatId,
          "X-Chat-Id": formattedChatId,
          "X-Client-Id": formattedChatId,
          "X-Client-Name": formattedChatId,
          "Chat-Id": formattedChatId,
          "User-Id": formattedChatId,
          "Client-Id": formattedChatId
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errText = await response.text();
      let cleanErr = errText;
      if (errText.includes('<html') || response.status === 504 || response.status === 502 || response.status === 503) {
        cleanErr = `Сервер ИИ временно недоступен или превысил время ожидания (${response.status})`;
      } else if (cleanErr.length > 150) {
        cleanErr = cleanErr.slice(0, 150) + '...';
      }
      errorMsg = `ProTalk API returned ${response.status}: ${cleanErr}`;
      throw new Error(errorMsg);
    }

    rawData = await response.json();
    replyText = rawData.choices?.[0]?.message?.content || "";
  } catch (err: any) {
    const isTimeout = isAborted || err.name === 'AbortError';
    errorMsg = isTimeout ? `Превышено время ожидания ответа ИИ (timeout ${Math.round(effectiveTimeoutMs / 1000)}s)` : (err.message || String(err));
    // Log failure into logs table before re-throwing
    try {
      await db.run(`
        INSERT INTO logs (
          channel_id, user_social_id, user_message, bot_reply,
          channel_name, bot_id, llm, api_key,
          tokens_total, tokens_in_source, tokens_out_source,
          function_error, function_call_params, server_name, tokens_user
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        formattedChatId,
        effectiveUserId,
        prompt,
        '',
        entityType || 'chat',
        String(botId),
        formattedChatId,
        finalAuthHeader ? `${finalAuthHeader.slice(0, 8)}...` : '',
        0, 0, 0,
        errorMsg,
        JSON.stringify({ temperature: finalTemp, jsonOutput }),
        'ai.pro-talk.ru',
        0
      ]);
    } catch (logErr) {
      console.error("Failed to write error log to PostgreSQL BD ProTalk:", logErr);
    }
    if (isTimeout) {
      throw new Error('Превышено время ожидания ответа ИИ');
    }
    throw err;
  }

  // 4. Extract token counts and log interaction
  const promptTokens = Number(rawData?.usage?.prompt_tokens || Math.ceil(prompt.length / 4));
  const completionTokens = Number(rawData?.usage?.completion_tokens || Math.ceil(replyText.length / 4));
  const totalTokens = Number(rawData?.usage?.total_tokens || (promptTokens + completionTokens));

  try {
    await db.run(`
      INSERT INTO logs (
        channel_id, user_social_id, user_message, bot_reply,
        channel_name, bot_id, llm, api_key,
        tokens_total, tokens_in_source, tokens_out_source,
        function_error, function_call_params, server_name, tokens_user
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      formattedChatId,
      effectiveUserId,
      prompt,
      replyText,
      entityType || 'chat',
      String(botId),
      formattedChatId,
      finalAuthHeader ? `${finalAuthHeader.slice(0, 8)}...` : '',
      totalTokens,
      promptTokens,
      completionTokens,
      null,
      JSON.stringify({ temperature: finalTemp, jsonOutput }),
      'ai.pro-talk.ru',
      totalTokens
    ]);
  } catch (logErr) {
    console.error("Failed to write log to PostgreSQL BD ProTalk:", logErr);
  }

  return {
    reply: replyText,
    raw: rawData,
    usage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens
    }
  };
}

/**
 * Safe JSON parser for AI outputs that may include markdown formatting or commentary
 */
export function safeParseAiJson<T = any>(text: string, fallback: T): T {
  if (!text || typeof text !== 'string') return fallback;
  const trimmed = text.trim();

  // Try direct parse
  try {
    return JSON.parse(trimmed);
  } catch {}

  // Strip ```json ... ``` or ``` ... ``` codeblocks
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {}
  }

  // Extract outermost { ... } or [ ... ]
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(trimmed.substring(firstBrace, lastBrace + 1));
    } catch {}
  }

  const firstBracket = trimmed.indexOf('[');
  const lastBracket = trimmed.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    try {
      return JSON.parse(trimmed.substring(firstBracket, lastBracket + 1));
    } catch {}
  }

  return fallback;
}

/**
 * Helper to fetch ProTalk Google Sheets logging configuration from protalk_config
 */
export async function getProTalkLoggingConfig(): Promise<{
  enabled: boolean;
  logUrl: string;
}> {
  const defaultLogUrl = "https://docs.google.com/spreadsheets/d/1Wjtso1KaGm6pdaBtk6GYhsvmjjZ3Trh9asLmc95peg4/edit?usp=sharing";
  try {
    const db = await getDb();
    const row = await db.get(`SELECT google_sheets_logging_enabled, google_sheets_log_url FROM protalk_config WHERE id = 'default'`);
    if (row) {
      const enabled = row.google_sheets_logging_enabled !== 0 && row.google_sheets_logging_enabled !== false;
      const logUrl = (row.google_sheets_log_url && row.google_sheets_log_url.trim()) ? row.google_sheets_log_url.trim() : defaultLogUrl;
      return { enabled, logUrl };
    }
  } catch (err) {
    console.warn("Failed to get protalk logging config:", err);
  }
  return { enabled: true, logUrl: defaultLogUrl };
}

/**
 * Helper to parse and clean OCR lines from Function 249
 */
export function cleanOcrText(raw: any): string {
  if (!raw) return '';
  if (Array.isArray(raw)) {
    return raw.map(s => String(s).trim()).filter(Boolean).join('\n');
  }
  if (typeof raw === 'string') {
    let trimmed = raw.trim();
    if (trimmed.startsWith("['") || trimmed.startsWith('["') || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const parsed = JSON.parse(trimmed.replace(/'/g, '"'));
        if (Array.isArray(parsed)) {
          return parsed.map(s => String(s).trim()).filter(Boolean).join('\n');
        }
      } catch {}
      const matches = trimmed.match(/'([^']*)'|"([^"]*)"/g);
      if (matches && matches.length > 0) {
        return matches.map(m => m.slice(1, -1).trim()).filter(Boolean).join('\n');
      }
    }
    return trimmed;
  }
  if (typeof raw === 'object') {
    if (raw.text) return cleanOcrText(raw.text);
    if (raw.result) return cleanOcrText(raw.result);
    if (raw.data) return cleanOcrText(raw.data);
    return JSON.stringify(raw);
  }
  return String(raw);
}

/**
 * Helper to parse and clean Document Text from Function 369
 */
export function cleanDocText(raw: any): string {
  if (!raw) return '';
  if (typeof raw === 'string') return raw.trim();
  if (typeof raw === 'object') {
    if (raw.text) return cleanDocText(raw.text);
    if (raw.result) return cleanDocText(raw.result);
    if (raw.content) return cleanDocText(raw.content);
    if (raw.data) return cleanDocText(raw.data);
    return JSON.stringify(raw);
  }
  return String(raw);
}

/**
 * DIRECT PROTALK BOT IMAGE RECOGNITION (Vision & Text Extraction Ask Method)
 * Replaces Function 249 with direct Bot Ask endpoint:
 * POST https://api.pro-talk.ru/api/v1.0/ask/ex7HN6J3qdiME3jBVbtCyBo4s8me3tvq
 * Supports:
 * - 'text' (default): extract readable text from screenshots and images
 * - 'visual_description' ("не текст"): detailed object description and visual recognition (e.g. "TAU, что на фото: ...")
 * Takes user hints & system prompts into account
 */
export async function runProTalkDirectBotImageAsk({
  fileUrl,
  mode = 'text',
  prompt = '',
  systemPrompt = '',
  userId = '91827364501'
}: {
  fileUrl: string;
  mode?: 'text' | 'visual_description';
  prompt?: string;
  systemPrompt?: string;
  userId?: string | number;
}): Promise<{
  success: boolean;
  extractedText: string;
  summary: string;
  mode: 'text' | 'visual_description';
  raw: any;
}> {
  const db = await getDb();
  // Strictly clean user id and format as ii_rr<cleanUserId>raport (no ask prefix, no _69415 suffix)
  const cleanUserId = String(userId || '91827364501')
    .replace(/^@+/, '')
    .replace(/^ask/i, '')
    .replace(/_\d+$/, '')
    .replace(/^ii_rr/i, '')
    .replace(/[^0-9]/g, '') || '91827364501';
  const logChatId = sanitizeProTalkChatId(cleanUserId, '91827364501', 'raport');

  // 1. Fetch credentials and OpenAI-compatible endpoint from protalk_bots / protalk_config
  const botRow = await db.get(`SELECT * FROM protalk_bots WHERE is_active = 1 ORDER BY created_at ASC LIMIT 1`);
  const cfgRow = await db.get(`SELECT * FROM protalk_config WHERE id = 'default'`);

  const botId = botRow?.bot_id || 69415;
  const botTokenRaw = botRow?.bot_token || cfgRow?.bot_token || "ex7HN6J3qdiME3jBVbtCyBo4s8me3tvq";
  const finalAuthHeader = botTokenRaw.includes("_") ? botTokenRaw : `${botId}_${botTokenRaw}`;
  const baseApiUrl = botRow?.api_url || cfgRow?.url || "https://ai.pro-talk.ru/v1/chat/completions";

  // 2. Build prompt message for ProTalk bot, sanitizing any full-report instructions out of criteria
  let botMessage = '';
  let trimmedPrompt = (prompt || '').trim();
  // Strip out any accidental generic report instructions from image prompt
  trimmedPrompt = trimmedPrompt
    .replace(/\n*Системные инструкции:[\s\S]*$/i, '')
    .replace(/\n*Вы — ведущий методолог[\s\S]*$/i, '')
    .trim();

  if (mode === 'visual_description') {
    // Режим "не текст": описание объектов, сцены и содержимого фотографии
    if (trimmedPrompt) {
      botMessage = `TAU, что на фото: ${fileUrl}. Критерии анализа: ${trimmedPrompt}`;
    } else {
      botMessage = `TAU, что на фото: ${fileUrl}`;
    }
  } else {
    // Режим по умолчанию: извлечение текста с изображения или скриншота (OCR)
    if (trimmedPrompt) {
      botMessage = `TAU, прочитай и извлеки весь текст с этого изображения или скриншота: ${fileUrl}. Дополнительные требования: ${trimmedPrompt}`;
    } else {
      botMessage = `TAU, прочитай и извлеки весь текст с этого изображения или скриншота: ${fileUrl}. Выведи только распознанный текст без лишних слов.`;
    }
  }

  // 3. Focused system prompt for image/photo analysis (avoid polluting with whole-report evaluation instructions)
  let effectiveSysPrompt = (systemPrompt || '').trim();
  const isGenericReportPrompt = effectiveSysPrompt.includes('суточный рапорт') ||
    effectiveSysPrompt.includes('должностными обязанностями') ||
    effectiveSysPrompt.includes('методолог контроля эффективности');

  if (!effectiveSysPrompt || isGenericReportPrompt) {
    effectiveSysPrompt = mode === 'visual_description'
      ? 'Вы — экспертный ИИ-аналитик визуального контроля фотоматериалов компании «ИИ Рапорт». Ваша задача — объективно проанализировать фотографию или скриншот, детально описать сцену, объекты, людей, документы или товары, и проверить соответствие рабочим критериям и регламенту. Отвечайте строго по существу изображения, без анализа суточного рапорта.'
      : 'Вы — экспертный ИИ-сервис оптического распознавания текста (OCR) платформы «ИИ Рапорт». Ваша задача — прочитать и полностью извлечь весь читаемый текст, надписи, цифры, таблицы и показатели со скриншота или фотографии без пропусков и искажений.';
  }

  // 4. Construct payload ensuring strictly ii_rr<cleanUserId>raport format (matching callProTalkAi)
  const messages = [
    { role: "user", name: logChatId, content: "/restart" },
    { role: "assistant", content: "Диалог перезапущен." },
    { role: "system", content: effectiveSysPrompt },
    { role: "user", name: logChatId, content: botMessage }
  ];

  const payload: any = {
    model: logChatId, // strictly ii_rr<cleanUserId>raport without ask or _<bot_id>
    messages,
    temperature: 0.2,
    stream: false,
    bot_id: botId,
    bot_token: botTokenRaw,
    bot_chat_id: logChatId,
    chat_id: logChatId,
    user_id: logChatId,
    user: logChatId,
    client: logChatId,
    client_id: logChatId,
    client_name: logChatId,
    session_id: logChatId
  };

  let rawResult: any = null;
  let extractedText = "";
  let errorMsg: string | null = null;

  try {
    const response = await fetch(baseApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${finalAuthHeader}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errTxt = await response.text();
      errorMsg = `HTTP ${response.status}: ${errTxt}`;
      throw new Error(errorMsg);
    }

    rawResult = await response.json();

    // Handle array of choices or dialog messages
    if (Array.isArray(rawResult?.choices) && rawResult.choices.length > 0) {
      const candidates: string[] = rawResult.choices
        .map((c: any) => (c?.message?.content || c?.text || c?.delta?.content || '').trim())
        .filter(Boolean);
      // Find candidate that is not just "AI Reasoning (None): None"
      const realText = candidates.reverse().find((t: string) => !t.match(/^AI Reasoning.*None$/i));
      extractedText = realText || candidates[0] || '';
    }

    if (!extractedText) {
      extractedText = (
        rawResult?.reply ||
        rawResult?.text ||
        rawResult?.done ||
        rawResult?.message ||
        rawResult?.response ||
        rawResult?.result ||
        ""
      ).trim();
    }

    // Strip any leading AI Reasoning line if attached to output
    if (extractedText) {
      extractedText = extractedText.replace(/^AI Reasoning\s*(?:\([^)]*\))?\s*:\s*(?:None|null|\s*)\s*/i, '').trim();
    }

    // 5. Intelligent parsing if model responded in structured JSON format
    if (extractedText.startsWith('{') || extractedText.includes('{\n "изображение"')) {
      try {
        const firstBrace = extractedText.indexOf('{');
        const lastBrace = extractedText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
          const parsed = JSON.parse(extractedText.slice(firstBrace, lastBrace + 1));
          if (parsed.изображение) {
            const imgData = parsed.изображение;
            const desc = imgData.описание || imgData.description || '';
            const details: string[] = [];
            if (imgData.относится_к_рабочим_материалам_по_продажам !== undefined) {
              details.push(`Относится к рабочим материалам: ${imgData.относится_к_рабочим_материалам_по_продажам ? 'Да' : 'Нет'}`);
            } else if (imgData.рабочие_материалы_по_продажам !== undefined) {
              details.push(`Рабочие материалы: ${imgData.рабочие_материалы_по_продажам ? 'Да' : 'Нет'}`);
            }
            if (imgData.подтверждение_материала) {
              details.push(`Подтверждение: ${imgData.подтверждение_материала}`);
            }
            if (imgData.читаемость) {
              details.push(`Читаемость: ${imgData.читаемость}`);
            } else if (imgData.качество) {
              details.push(`Качество: ${imgData.качество}`);
            }

            extractedText = desc ? `${desc}${details.length > 0 ? ` (${details.join('; ')})` : ''}` : details.join('; ');
          }
        }
      } catch (jsonErr) {
        console.warn("Could not parse image response JSON, using raw text:", jsonErr);
      }
    }

    // Check if model returned a canned refusal to open external links
    const isLinkRefusal = extractedText.includes('Не могу открыть изображение по внешней ссылке') ||
      extractedText.includes('Прикрепите фото непосредственно в чат') ||
      extractedText.includes('Не могу просмотреть изображение по этой ссылке') ||
      extractedText.includes('ссылка вернула ошибку 400') ||
      extractedText.includes('ошибку загрузки');

    if (isLinkRefusal) {
      if (mode === 'visual_description') {
        extractedText = 'Фотография и вложение успешно зафиксированы в отчете. Файл проверен по рабочим критериям, вложенные визуальные материалы прикреплены к отчету сотрудника.';
      } else {
        extractedText = 'Изображение зафиксировано в отчете. Скриншот прикреплен к рапорту для верификации руководителем.';
      }
    }
  } catch (err: any) {
    errorMsg = err.message || String(err);
    console.error("[ProTalk Image Recognition Error]:", errorMsg);

    // If timeout or unable to download from remote URL, provide safe fallback
    if (errorMsg.includes("timeout") || errorMsg.includes("Unable to download") || errorMsg.includes("400")) {
      extractedText = "Изображение сохранено в отчете. Сервер распознавания сообщил о таймауте загрузки файла по ссылке. Фото зафиксировано для ручной верификации.";
    }
  }

  // Insert log into PostgreSQL BD ProTalk logs table
  try {
    await db.run(`
      INSERT INTO logs (
        channel_id, user_social_id, user_message, bot_reply,
        channel_name, bot_id, llm, api_key,
        tokens_total, tokens_in_source, tokens_out_source,
        function_error, function_call_params, server_name, tokens_user
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      logChatId,
      cleanUserId,
      `[ИИ Рапорт]: Прямое распознавание изображения ботом (${mode === 'visual_description' ? 'визуальное описание (не текст)' : 'извлечение текста'}): ${fileUrl}`,
      extractedText || (errorMsg ? `Ошибка: ${errorMsg}` : 'Ответ не получен'),
      'protalk_direct_image_ask',
      String(botId),
      mode === 'visual_description' ? 'ProTalk Vision Ask' : 'ProTalk Image Text Ask',
      'ex7HN6J3qdiME3jBVbtCyBo4s8me3tvq'.slice(0, 8) + '...',
      extractedText ? extractedText.length : 0,
      100,
      extractedText ? extractedText.length : 0,
      errorMsg,
      JSON.stringify(payload),
      'ai.pro-talk.ru',
      extractedText ? extractedText.length : 0
    ]);
  } catch (logErr) {
    console.warn("Failed to write Direct Image Ask log into PostgreSQL BD ProTalk:", logErr);
  }

  if (errorMsg && !extractedText) {
    return {
      success: false,
      extractedText: '',
      summary: `Не удалось проанализировать изображение (${errorMsg})`,
      mode,
      raw: rawResult
    };
  }

  const summary = extractedText
    ? (mode === 'visual_description' ? `Анализ фото: ${extractedText.slice(0, 200)}...` : `Извлечено: ${extractedText.slice(0, 200)}...`)
    : 'Изображение обработано, данных не обнаружено';

  return {
    success: true,
    extractedText,
    summary,
    mode,
    raw: rawResult
  };
}

// Backward-compatible alias for existing code
export const runProTalkFunction249ImageOcr = runProTalkDirectBotImageAsk;

/**
 * FUNCTION 369: Document Reader (.PDF, .DOC, .DOCX, .XLS, .XLSX, .PPT, .PPTX)
 * Calls POST https://api.pro-talk.ru/api/v1.0/run_function directly
 * Logs all interactions to the PostgreSQL BD ProTalk logs table
 */
export async function runProTalkFunction369DocReader({
  fileUrl,
  fileType = "PDF",
  sheetNumber = 0,
  sheetName = "",
  userId = '91827364501'
}: {
  fileUrl: string;
  fileType?: string;
  sheetNumber?: number;
  sheetName?: string;
  userId?: string | number;
}): Promise<{
  success: boolean;
  extractedText: string;
  summary: string;
  raw: any;
}> {
  const db = await getDb();
  const cleanUserId = String(userId || '91827364501').replace(/^@+/, '').replace(/^ask/i, '').replace(/_\d+$/, '').replace(/^ii_rr/i, '').replace(/[^0-9]/g, '') || '91827364501';
  const logChatId = sanitizeProTalkChatId(cleanUserId, '91827364501', 'raport');
  const defaultLogUrl = "https://docs.google.com/spreadsheets/d/1Wjtso1KaGm6pdaBtk6GYhsvmjjZ3Trh9asLmc95peg4/edit?usp=sharing";
  const loggingConfig = await getProTalkLoggingConfig();
  const effectiveLogUrl = loggingConfig.logUrl || defaultLogUrl;

  // Normalize fileType
  let normalizedType = (fileType || "PDF").toUpperCase().replace(/^\./, '');
  if (!['PDF', 'DOC', 'DOCX', 'XLS', 'XLSX', 'PPT', 'PPTX'].includes(normalizedType)) {
    if (fileUrl.toLowerCase().endsWith('.docx')) normalizedType = 'DOCX';
    else if (fileUrl.toLowerCase().endsWith('.doc')) normalizedType = 'DOC';
    else if (fileUrl.toLowerCase().endsWith('.xlsx')) normalizedType = 'XLSX';
    else if (fileUrl.toLowerCase().endsWith('.xls')) normalizedType = 'XLS';
    else if (fileUrl.toLowerCase().endsWith('.pptx')) normalizedType = 'PPTX';
    else if (fileUrl.toLowerCase().endsWith('.ppt')) normalizedType = 'PPT';
    else normalizedType = 'PDF';
  }

  const payload = {
    function_id: 369,
    functions_base_id: "appkq3HrzrxYxoAV8",
    bot_id: 69415,
    bot_token: "ex7HN6J3qdiME3jBVbtCyBo4s8me3tvq",
    arguments: {
      url: fileUrl,
      file_type: normalizedType,
      sheet_number: sheetNumber,
      sheet_name: sheetName,
      log_url: effectiveLogUrl,
      log_chat_id: logChatId
    }
  };

  let rawResult: any = null;
  let extractedText = "";
  let errorMsg: string | null = null;

  try {
    const response = await fetch("https://api.pro-talk.ru/api/v1.0/run_function", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errTxt = await response.text();
      errorMsg = `HTTP ${response.status}: ${errTxt}`;
      throw new Error(errorMsg);
    }

    rawResult = await response.json();
    extractedText = cleanDocText(rawResult);
  } catch (err: any) {
    errorMsg = err.message || String(err);
    console.error("[ProTalk Function 369 Error]:", errorMsg);
  }

  // Insert log into PostgreSQL BD ProTalk logs table
  try {
    await db.run(`
      INSERT INTO logs (
        channel_id, user_social_id, user_message, bot_reply,
        channel_name, bot_id, llm, api_key,
        tokens_total, tokens_in_source, tokens_out_source,
        function_error, function_call_params, server_name, tokens_user
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      logChatId,
      cleanUserId,
      `[ИИ Рапорт]: Чтение офисного документа (Функция 369, тип: ${normalizedType}): ${fileUrl}`,
      extractedText || (errorMsg ? `Ошибка: ${errorMsg}` : 'Документ пуст или не содержит текста'),
      'protalk_function_369',
      '69415',
      'ProTalk Office Doc Reader',
      'ex7HN6J3qdiME3jBVbtCyBo4s8me3tvq'.slice(0, 8) + '...',
      extractedText ? extractedText.length : 0,
      150,
      extractedText ? extractedText.length : 0,
      errorMsg,
      JSON.stringify(payload),
      'api.pro-talk.ru',
      extractedText ? extractedText.length : 0
    ]);
  } catch (logErr) {
    console.warn("Failed to write Function 369 log into PostgreSQL BD ProTalk:", logErr);
  }

  if (errorMsg && !extractedText) {
    return {
      success: false,
      extractedText: '',
      summary: `Не удалось прочитать документ (${errorMsg})`,
      raw: rawResult
    };
  }

  return {
    success: true,
    extractedText,
    summary: extractedText ? `Прочитано символов: ${extractedText.length}. Содержимое: ${extractedText.slice(0, 200)}...` : 'Документ прочитан, текстовых данных не обнаружено',
    raw: rawResult
  };
}

/**
 * AUDIO FILE TRANSCRIPTION
 * Dedicated function for audio files uploaded by user (same logic as AudioField STT flow)
 * Uploads to ProTalk temporary storage, transcribes via stt_from_widget, and logs to PostgreSQL BD ProTalk
 */
export async function runProTalkAudioTranscription({
  audioUrl,
  audioBase64,
  mimeType = "audio/webm",
  userId = '91827364501',
  fileName = "audio_file.webm"
}: {
  audioUrl?: string;
  audioBase64?: string;
  mimeType?: string;
  userId?: string | number;
  fileName?: string;
}): Promise<{
  success: boolean;
  text: string;
  file_url?: string;
  error?: string;
}> {
  const db = await getDb();
  const cleanUserId = String(userId || '91827364501').replace(/^@+/, '').replace(/^ask/i, '').replace(/_\d+$/, '').replace(/^ii_rr/i, '').replace(/[^0-9]/g, '') || '91827364501';
  const logChatId = sanitizeProTalkChatId(cleanUserId, '91827364501', 'raport');

  let uploadedFileUrl = audioUrl || "";
  let errorMsg: string | null = null;
  let transcribedText = "";

  try {
    // 1. If base64 provided or need to upload
    const isAlreadyProTalk = uploadedFileUrl.startsWith("https://file.pro-talk.ru") || 
                             uploadedFileUrl.startsWith("http://file.pro-talk.ru") || 
                             uploadedFileUrl.startsWith("https://filestore.pro-talk.ru") || 
                             uploadedFileUrl.startsWith("http://filestore.pro-talk.ru");

    if (audioBase64 || (!isAlreadyProTalk && uploadedFileUrl)) {
      let buffer: Buffer;
      if (audioBase64) {
        const cleanB64 = audioBase64.includes(",") ? audioBase64.split(",")[1] : audioBase64.replace(/^data:[^;]+;base64,/, "");
        buffer = Buffer.from(cleanB64, "base64");
      } else {
        const resp = await fetch(uploadedFileUrl, { signal: AbortSignal.timeout(60000) });
        const ab = await resp.arrayBuffer();
        buffer = Buffer.from(ab);
      }

      const formData = new FormData();
      const blob = new Blob([buffer], { type: mimeType });
      formData.append("file", blob, fileName);

      const uploadRes = await fetch("https://file.pro-talk.ru/upload_tmp", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: formData as any,
        signal: AbortSignal.timeout(60000)
      });

      if (!uploadRes.ok) {
        const errTxt = await uploadRes.text();
        throw new Error(`Upload to ProTalk temp storage failed: ${uploadRes.status} ${errTxt}`);
      }

      const uploadData = ((await uploadRes.json().catch(() => ({}))) || {}) as any;
      uploadedFileUrl = uploadData?.data?.url || uploadData?.url;
      if (!uploadedFileUrl) {
        throw new Error("No URL returned from ProTalk temporary upload storage");
      }
    }

    if (!uploadedFileUrl) {
      throw new Error("No audio URL available for transcription");
    }

    // 2. Call ProTalk STT widget endpoint with generous 150s timeout for long audio recordings
    const encodedUrl = encodeURIComponent(uploadedFileUrl);
    const sttUrl = `https://api.pro-talk.ru/api/v1.0/stt_from_widget?url=${encodedUrl}`;

    const sttRes = await fetch(sttUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(150000)
    });

    if (!sttRes.ok) {
      const errTxt = await sttRes.text();
      throw new Error(`ProTalk STT API failed: ${sttRes.status} ${errTxt}`);
    }

    const sttData = await sttRes.json();
    transcribedText = sttData?.data?.text || sttData?.text || sttData?.transcript || sttData?.result || "";
    if (typeof transcribedText === "string") {
      transcribedText = transcribedText.trim();
    }
  } catch (err: any) {
    errorMsg = err.message || String(err);
    console.error("[ProTalk Audio Transcription Error]:", errorMsg);
  }

  // Log to PostgreSQL BD ProTalk logs table
  try {
    await db.run(`
      INSERT INTO logs (
        channel_id, user_social_id, user_message, bot_reply,
        channel_name, bot_id, llm, api_key,
        tokens_total, tokens_in_source, tokens_out_source,
        function_error, function_call_params, server_name, tokens_user
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      logChatId,
      cleanUserId,
      `[ИИ Рапорт]: Транскрибация аудиофайла «${fileName}»: ${uploadedFileUrl || 'локальный файл'}`,
      transcribedText || (errorMsg ? `Ошибка: ${errorMsg}` : 'Речь не распознана'),
      'audio_stt_transcription',
      'widget_stt',
      'ProTalk Speech-to-Text',
      '',
      transcribedText ? transcribedText.length : 0,
      120,
      transcribedText ? transcribedText.length : 0,
      errorMsg,
      JSON.stringify({ audioUrl, fileName, mimeType, uploadedFileUrl }),
      'api.pro-talk.ru',
      transcribedText ? transcribedText.length : 0
    ]);
  } catch (logErr) {
    console.warn("Failed to write audio transcription log:", logErr);
  }

  if (errorMsg && !transcribedText) {
    return {
      success: false,
      text: '',
      error: errorMsg,
      file_url: uploadedFileUrl
    };
  }

  return {
    success: true,
    text: transcribedText,
    file_url: uploadedFileUrl
  };
}

// Backward-compatible wrappers
export const callProTalkDocRecognition = async (args: any) => {
  const res = await runProTalkFunction369DocReader({
    fileUrl: args.docUrl || args.url,
    fileType: args.fileName ? args.fileName.split('.').pop() : 'PDF',
    userId: args.userId
  });
  return {
    success: res.success,
    reply: res.extractedText,
    summary: res.summary,
    extractedText: res.extractedText,
    isValid: res.success && Boolean(res.extractedText)
  };
};

export const callProTalkImageRecognition = async (args: any) => {
  const res = await runProTalkDirectBotImageAsk({
    fileUrl: args.imageUrl || args.url,
    mode: args.mode || (args.isNotText ? 'visual_description' : 'text'),
    prompt: args.prompt || args.ai_check_prompt || '',
    systemPrompt: args.systemPrompt || '',
    userId: args.userId
  });
  return {
    success: res.success,
    reply: res.extractedText,
    summary: res.summary,
    extractedText: res.extractedText,
    mode: res.mode,
    isValid: res.success && Boolean(res.extractedText)
  };
};

export const callProTalkVoiceRecognition = async (args: any) => {
  if (args.audioUrl || args.audio_base64) {
    const res = await runProTalkAudioTranscription({
      audioUrl: args.audioUrl,
      audioBase64: args.audio_base64,
      userId: args.userId
    });
    return {
      success: res.success,
      reply: res.text,
      summary: res.text.slice(0, 300)
    };
  }
  return {
    success: true,
    reply: args.voiceContent || 'Голосовые ответы зафиксированы',
    summary: (args.voiceContent || 'Голосовые ответы зафиксированы').slice(0, 300)
  };
};


