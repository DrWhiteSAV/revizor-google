import { getDb, type PgDbAdapter } from '../../db/initDb';
import { ensureCommsSchema } from './schema';

export const DEFAULT_COMMS_MODERATION_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1Wjtso1KaGm6pdaBtk6GYhsvmjjZ3Trh9asLmc95peg4/edit?usp=sharing';

export const DEFAULT_COMMS_MODERATION_INSTRUCTION = `Ты — строгий корпоративный ИИ-модератор делового мессенджера и видеовстреч.
Твоя задача — проверять сообщения и прикрепленные изображения сотрудников на соответствие законодательству РФ, деловой этике и политике безопасности компании.

Критерии нарушения (выбирай "Отказ"):
1. Нецензурная брань, грубые оскорбления коллег, травля, угрозы, дискриминация или разжигание вражды.
2. Нарушения законодательства РФ: призывы к насилию, экстремизм, наркотические средства, мошенничество, фишинг, распространение вредоносных ссылок.
3. Массовый посторонний спам, реклама сомнительных схем, нелегальных сервисов или казино.
4. Передача явно вредоносного или непристойного визуального контента на изображениях.

Важное правило для рабочих сообщений:
- Деловые отчеты, обсуждение задач, сроков, выручки, KPI, договоров, графиков смен, приглашения на видеозвонок, вопросы по проектам, вежливые приветствия и конструктивная критика рабочих процессов — РАЗРЕШЕНЫ ("Согласие").
- Изображения документов, скриншоты интерфейса, графики, фото объектов или выполненных работ сами по себе нарушением не являются.

Принятие решения:
- Если есть хотя бы одно нарушение выше -> выбери "Отказ".
- Если сообщение безопасно и допустимо для рабочей переписки -> выбери "Согласие".`;

export interface ChatModerationConfigRecord {
  id: string;
  function_id: number;
  functions_base_id: string;
  bot_id: string;
  instruction: string;
  options: string;
  decision_type: 'choice' | 'noul' | 'score';
  ai_model: string;
  log_url: string;
  enable_sheets_logging: number;
  user_prefix: string;
  is_active: number;
  reject_threshold: number;
  debug: number;
  updated_at?: string;
}

export interface ChatModerationResult {
  allowed: boolean;
  reason?: string;
  decision?: string;
  probabilities?: Record<string, number>;
  confidence?: number;
  tokens?: number;
  rub?: number;
  cached?: boolean;
  skipped?: boolean;
}

const SAFE_COMMON = new Set([
  'привет', 'здравствуйте', 'добрый день', 'доброе утро', 'добрый вечер',
  'ок', 'окей', 'хорошо', 'понял', 'поняла', 'принято', 'спасибо', 'благодарю',
  'да', 'нет', 'угу', 'ага', 'супер', 'отлично', 'договорились', 'готово',
  'на месте', 'созвонимся', 'подключаюсь', 'жду', '+'
]);

const modCache = new Map<string, { result: ChatModerationResult; expiresAt: number }>();

function formatJevChatId(userId: string | number, template: string = 'jev{id}'): string {
  const digitsOrClean = String(userId || '91827364501').replace(/[^a-zA-Z0-9_-]/g, '') || '91827364501';
  if (template && template.includes('{id}')) {
    return template.replace('{id}', digitsOrClean);
  }
  return `jev${digitsOrClean}`;
}

async function resolveCurrentBotCredentials(db: PgDbAdapter): Promise<{ botId: string; botToken: string }> {
  let botId = '69415';
  let botToken = 'ex7HN6J3qdiME3jBVbtCyBo4s8me3tvq';
  try {
    const botRow = await db.get(
      `SELECT bot_id, bot_token, token FROM protalk_bots WHERE is_active = '1' OR is_active = 1 ORDER BY updated_at DESC LIMIT 1`
    );
    if (botRow) {
      if (botRow.bot_id) botId = String(botRow.bot_id).trim();
      const rawTok = String(botRow.bot_token || botRow.token || '').trim();
      if (rawTok) {
        botToken = rawTok.includes('_') ? rawTok.split('_').slice(1).join('_') : rawTok;
      }
    }
    const cfgRow = await db.get(`SELECT bot_token FROM protalk_config WHERE id = 'default' LIMIT 1`);
    if (cfgRow?.bot_token) {
      const rawCfgTok = String(cfgRow.bot_token).trim();
      if (rawCfgTok) {
        botToken = rawCfgTok.includes('_') ? rawCfgTok.split('_').slice(1).join('_') : rawCfgTok;
      }
    }
  } catch (_) {}
  return { botId, botToken };
}

export async function getChatModerationConfig(dbArg?: PgDbAdapter): Promise<ChatModerationConfigRecord> {
  const db = dbArg || (await getDb());
  await ensureCommsSchema(db);

  const row = await db
    .get(`SELECT * FROM chat_moderation_config WHERE id = 'default' LIMIT 1`)
    .catch(() => null);

  let effectiveLogUrl = DEFAULT_COMMS_MODERATION_SHEET_URL;
  try {
    const sysCfg = await db.get(`SELECT google_sheets_log_url FROM protalk_config WHERE id = 'default' LIMIT 1`);
    if (sysCfg?.google_sheets_log_url && String(sysCfg.google_sheets_log_url).trim()) {
      effectiveLogUrl = String(sysCfg.google_sheets_log_url).trim();
    }
  } catch (_) {}

  if (!row) {
    const initial: ChatModerationConfigRecord = {
      id: 'default',
      function_id: 763,
      functions_base_id: 'appkq3HrzrxYxoAV8',
      bot_id: '69415',
      instruction: DEFAULT_COMMS_MODERATION_INSTRUCTION,
      options: 'Отказ::no;;Согласие::yes',
      decision_type: 'choice',
      ai_model: '~typesafe/jev-latest',
      log_url: effectiveLogUrl,
      enable_sheets_logging: 1,
      user_prefix: 'jev{id}',
      is_active: 1,
      reject_threshold: 0.5,
      debug: 0
    };
    await db
      .run(
        `INSERT INTO chat_moderation_config (
          id, function_id, functions_base_id, bot_id, instruction, options, decision_type,
          ai_model, log_url, enable_sheets_logging, user_prefix, is_active, reject_threshold, debug, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO NOTHING`,
        [
          initial.id,
          initial.function_id,
          initial.functions_base_id,
          initial.bot_id,
          initial.instruction,
          initial.options,
          initial.decision_type,
          initial.ai_model,
          initial.log_url,
          initial.enable_sheets_logging,
          initial.user_prefix,
          initial.is_active,
          initial.reject_threshold,
          initial.debug
        ]
      )
      .catch(() => {});
    return initial;
  }

  return {
    id: 'default',
    function_id: Number(row.function_id) || 763,
    functions_base_id: String(row.functions_base_id || 'appkq3HrzrxYxoAV8'),
    bot_id: String(row.bot_id || '69415'),
    instruction: String(row.instruction || DEFAULT_COMMS_MODERATION_INSTRUCTION),
    options: String(row.options || 'Отказ::no;;Согласие::yes'),
    decision_type: (row.decision_type as any) || 'choice',
    ai_model: String(row.ai_model || '~typesafe/jev-latest'),
    log_url: String(row.log_url || effectiveLogUrl),
    enable_sheets_logging: row.enable_sheets_logging !== undefined ? Number(row.enable_sheets_logging) : 1,
    user_prefix: String(row.user_prefix || 'jev{id}'),
    is_active: row.is_active !== undefined ? Number(row.is_active) : 1,
    reject_threshold: row.reject_threshold !== undefined ? Number(row.reject_threshold) : 0.5,
    debug: row.debug !== undefined ? Number(row.debug) : 0,
    updated_at: row.updated_at ? String(row.updated_at) : undefined
  };
}

export async function updateChatModerationConfig(
  patch: Partial<ChatModerationConfigRecord>,
  dbArg?: PgDbAdapter
): Promise<ChatModerationConfigRecord> {
  const db = dbArg || (await getDb());
  const current = await getChatModerationConfig(db);
  const next: ChatModerationConfigRecord = {
    ...current,
    ...patch,
    id: 'default',
    function_id: Number(patch.function_id ?? current.function_id) || 763,
    reject_threshold:
      patch.reject_threshold !== undefined
        ? Math.min(0.95, Math.max(0.1, Number(patch.reject_threshold) || 0.5))
        : current.reject_threshold,
    is_active: patch.is_active !== undefined ? (Number(patch.is_active) ? 1 : 0) : current.is_active,
    enable_sheets_logging:
      patch.enable_sheets_logging !== undefined
        ? Number(patch.enable_sheets_logging)
          ? 1
          : 0
        : current.enable_sheets_logging,
    debug: patch.debug !== undefined ? (Number(patch.debug) ? 1 : 0) : current.debug
  };

  await db.run(
    `INSERT INTO chat_moderation_config (
      id, function_id, functions_base_id, bot_id, instruction, options, decision_type,
      ai_model, log_url, enable_sheets_logging, user_prefix, is_active, reject_threshold, debug, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO UPDATE SET
      function_id = EXCLUDED.function_id,
      functions_base_id = EXCLUDED.functions_base_id,
      bot_id = EXCLUDED.bot_id,
      instruction = EXCLUDED.instruction,
      options = EXCLUDED.options,
      decision_type = EXCLUDED.decision_type,
      ai_model = EXCLUDED.ai_model,
      log_url = EXCLUDED.log_url,
      enable_sheets_logging = EXCLUDED.enable_sheets_logging,
      user_prefix = EXCLUDED.user_prefix,
      is_active = EXCLUDED.is_active,
      reject_threshold = EXCLUDED.reject_threshold,
      debug = EXCLUDED.debug,
      updated_at = CURRENT_TIMESTAMP`,
    [
      next.id,
      next.function_id,
      next.functions_base_id,
      next.bot_id,
      next.instruction,
      next.options,
      next.decision_type,
      next.ai_model,
      next.log_url,
      next.enable_sheets_logging,
      next.user_prefix,
      next.is_active,
      next.reject_threshold,
      next.debug
    ]
  );

  modCache.clear();
  return next;
}

export async function moderateCompanyMessage(options: {
  text: string;
  chatId: string;
  senderId: string;
  imageUrls?: string[];
  customInstruction?: string | null;
  chatType?: 'direct' | 'group' | 'department' | 'video';
  bypassCache?: boolean;
}): Promise<ChatModerationResult> {
  const {
    text: rawText,
    chatId,
    senderId,
    imageUrls = [],
    customInstruction,
    chatType = 'group',
    bypassCache = false
  } = options;

  const cleanText = String(rawText || '').trim();
  const validImages = (imageUrls || [])
    .map((u) => String(u || '').trim())
    .filter((u) => /^https?:\/\//i.test(u))
    .slice(0, 4);

  if (!cleanText && validImages.length === 0) {
    return { allowed: true, confidence: 1, skipped: true };
  }

  if (validImages.length === 0 && SAFE_COMMON.has(cleanText.toLowerCase())) {
    return { allowed: true, confidence: 1, skipped: true };
  }

  const db = await getDb();
  const config = await getChatModerationConfig(db);
  if (!config.is_active) {
    return { allowed: true, skipped: true };
  }

  const cacheKey = `${chatType}:${chatId}:${senderId}:${validImages.join('|')}:::${cleanText}`;
  if (!bypassCache) {
    const cached = modCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return { ...cached.result, cached: true };
    }
  }

  const { botId: activeBotId, botToken } = await resolveCurrentBotCredentials(db);
  const botIdNum = Number(config.bot_id || activeBotId) || 69415;
  const logChatId = formatJevChatId(senderId, config.user_prefix);
  const finalInstruction =
    (customInstruction && customInstruction.trim()) ||
    config.instruction ||
    DEFAULT_COMMS_MODERATION_INSTRUCTION;

  const args: Record<string, any> = {
    text: cleanText || 'Проверка прикрепленного изображения в рабочем чате.',
    instruction: finalInstruction,
    options: config.options || 'Отказ::no;;Согласие::yes',
    decision_type: config.decision_type || 'choice',
    ai_model: config.ai_model || '~typesafe/jev-latest',
    debug: Boolean(config.debug),
    log_chat_id: logChatId
  };

  if (validImages.length > 0) {
    args.images_urls = validImages.join(';;');
  }

  if (config.enable_sheets_logging && config.log_url && String(config.log_url).trim()) {
    args.log_url = String(config.log_url).trim();
  }

  const payload = {
    function_id: config.function_id || 763,
    functions_base_id: config.functions_base_id || 'appkq3HrzrxYxoAV8',
    bot_id: botIdNum,
    bot_token: botToken,
    arguments: args
  };

  const safeLogPayload = {
    function_id: payload.function_id,
    functions_base_id: payload.functions_base_id,
    bot_id: payload.bot_id,
    chat_id: chatId,
    chat_type: chatType,
    log_chat_id: logChatId,
    images_count: validImages.length
  };

  let responseData: any = null;
  let errorMsg: string | null = null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 18000);
    const res = await fetch('https://api.pro-talk.ru/api/v1.0/run_function', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timer);

    if (res.ok) {
      responseData = await res.json().catch(() => null);
    } else {
      const errTxt = await res.text().catch(() => '');
      errorMsg = `HTTP ${res.status}: ${errTxt.slice(0, 200)}`;
    }
  } catch (err: any) {
    errorMsg = err?.name === 'AbortError' ? 'Таймаут проверки безопасности сообщения' : err?.message || 'Ошибка сети';
  }

  if (!responseData) {
    try {
      await db.run(
        `INSERT INTO logs (
          channel_id, user_social_id, user_message, bot_reply,
          channel_name, bot_id, llm, tokens_total, tokens_in_source,
          tokens_out_source, rub, function_error, function_call_params,
          server_name, tokens_user
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          logChatId,
          String(senderId),
          cleanText || `[Изображения: ${validImages.length}]`,
          'Fail-open пропуск при таймауте проверки',
          'chat_moderation',
          String(botIdNum),
          args.ai_model,
          0,
          0,
          0,
          0,
          errorMsg,
          JSON.stringify(safeLogPayload),
          'api.pro-talk.ru',
          0
        ]
      );
    } catch (_) {}
    return { allowed: true };
  }

  const usageTokens = responseData?.usage?.total_tokens;
  const rawTokens = typeof usageTokens === 'number' ? usageTokens : Math.ceil((cleanText.length || 60) / 3) + 60;
  const tokensTotal = rawTokens * 2;
  const rubCost = (tokensTotal / 10_000_000) * 300;

  const resultObj = responseData?.result || {};
  const rawDecision = resultObj?.raw_decision || {};
  const selectedDecision = String(resultObj?.selected || rawDecision?.choice || '').trim();
  const probabilities = resultObj?.probabilities || rawDecision?.probabilities || {};
  const confidence = typeof rawDecision?.confidence === 'number' ? rawDecision.confidence : 1;

  const rejectProb =
    typeof probabilities['Отказ'] === 'number'
      ? probabilities['Отказ']
      : typeof probabilities['no'] === 'number'
        ? probabilities['no']
        : selectedDecision.toLowerCase() === 'отказ' || selectedDecision.toLowerCase() === 'no'
          ? 1
          : 0;

  const isRejected =
    selectedDecision.toLowerCase() === 'отказ' ||
    selectedDecision.toLowerCase() === 'no' ||
    rejectProb >= config.reject_threshold;

  const verdictString = isRejected
    ? `Отказ (${Math.round(rejectProb * 100)}%)`
    : `Согласие (${Math.round((probabilities['Согласие'] ?? probabilities['yes'] ?? 1) * 100)}%)`;

  try {
    const tokensIn = Math.round(tokensTotal * 0.8);
    const tokensOut = Math.max(1, tokensTotal - tokensIn);
    await db.run(
      `INSERT INTO logs (
        channel_id, user_social_id, user_message, bot_reply,
        channel_name, bot_id, llm, tokens_total, tokens_in_source,
        tokens_out_source, rub, function_error, function_call_params,
        server_name, tokens_user
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        logChatId,
        String(senderId),
        cleanText || `[Изображения: ${validImages.length}]`,
        verdictString,
        'chat_moderation',
        String(botIdNum),
        args.ai_model,
        tokensTotal,
        tokensIn,
        tokensOut,
        rubCost,
        null,
        JSON.stringify(safeLogPayload),
        'api.pro-talk.ru',
        tokensTotal
      ]
    );
  } catch (_) {}

  const finalResult: ChatModerationResult = {
    allowed: !isRejected,
    reason: isRejected
      ? 'Сообщение отклонено системой безопасности: обнаружена ненормативная лексика, оскорбления, спам или недопустимый контент.'
      : undefined,
    decision: selectedDecision,
    probabilities,
    confidence,
    tokens: tokensTotal,
    rub: rubCost
  };

  modCache.set(cacheKey, { result: finalResult, expiresAt: Date.now() + 45_000 });
  return finalResult;
}
