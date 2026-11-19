import { getDb } from "../db/initDb";
import {
  buildInputRichMessage,
  InputRichBlock,
  InputRichMessage,
  isRichMediaFetchError,
  isRichMethodUnsupportedError,
  prepareRichHtml,
  prepareRichMarkdown,
  richBlocksToFallbackText,
  richHtmlToFallbackText,
  RichButtonStyle,
  RichMessageButton
} from "./telegram/richApi10";
import {
  verifyTelegramInitData,
  parseTelegramInitData,
  getTelegramChat,
  checkTelegramBotInChat
} from "./telegram/miniAppAndChat";
import {
  buildDailyReportRichPayload,
  buildManagerReviewRichPayload,
  buildTaskEventRichPayload,
  buildMorningBriefRichPayload,
  buildEveningRadarRichPayload,
  buildCronReportAlertRichPayload,
  buildMotivationAccrualRichPayload,
  classifyAttachmentFiles
} from "./telegram/reportFormatters";

export {
  buildInputRichMessage,
  prepareRichHtml,
  prepareRichMarkdown,
  richBlocksToFallbackText,
  richHtmlToFallbackText,
  verifyTelegramInitData,
  parseTelegramInitData,
  getTelegramChat,
  checkTelegramBotInChat,
  buildDailyReportRichPayload,
  buildManagerReviewRichPayload,
  buildTaskEventRichPayload,
  buildMorningBriefRichPayload,
  buildEveningRadarRichPayload,
  buildCronReportAlertRichPayload,
  buildMotivationAccrualRichPayload,
  classifyAttachmentFiles
};
export type {
  InputRichBlock,
  InputRichMessage,
  RichButtonStyle,
  RichMessageButton
};

export interface TelegramBotConfig {
  botToken: string;
  botUsername: string;
  proxyType: "dialog_ai" | "custom_cloudflare" | "direct";
  apiBaseUrl: string;
  secondaryApiBaseUrl?: string;
  adminTelegramId: string;
  appUrl?: string;
  referralTemplate?: string;
}

export const PROXY_PRESETS = {
  dialog_ai: "https://eu1.account.dialog.ai.atiks.org",
  direct: "https://api.telegram.org"
};

/**
 * 1. Получение настроек бота и прокси из PostgreSQL BD ProTalk
 */
export async function getTelegramBotConfig(): Promise<TelegramBotConfig> {
  const defaultConfig: TelegramBotConfig = {
    botToken: process.env.TELEGRAM_BOT_TOKEN || "8598472380:AAEfgSiqsOJx4mA3Jk5DKYW8AUFgLGV4Sc8",
    botUsername: "@ii_rrbot",
    proxyType: "dialog_ai",
    apiBaseUrl: process.env.TELEGRAM_API_BASE || PROXY_PRESETS.dialog_ai,
    secondaryApiBaseUrl: PROXY_PRESETS.direct,
    adminTelegramId: process.env.ADMIN_TELEGRAM_ID || "169262990",
    appUrl: "https://t.me/ii_rrbot/app",
    referralTemplate: "https://t.me/ii_rrbot/app?startapp="
  };

  try {
    const db = await getDb();
    const row = await db.get("SELECT * FROM telegram_bot_config WHERE id = 'default'");
    if (!row) return defaultConfig;

    let parsedConfig: Partial<TelegramBotConfig> = {};
    if (row.config_json) {
      try {
        parsedConfig = typeof row.config_json === "string" ? JSON.parse(row.config_json) : row.config_json;
      } catch (e) {
        console.warn("[Telegram] Failed to parse config_json:", e);
      }
    }

    const botToken = (row.botToken && row.botToken.trim()) || parsedConfig.botToken || defaultConfig.botToken;
    const apiBaseUrl = (row.apiBaseUrl && row.apiBaseUrl.trim()) || parsedConfig.apiBaseUrl || defaultConfig.apiBaseUrl;
    const secondaryApiBaseUrl = (row.secondaryApiBaseUrl && row.secondaryApiBaseUrl.trim()) || parsedConfig.secondaryApiBaseUrl || defaultConfig.secondaryApiBaseUrl;
    const proxyType = (parsedConfig.proxyType as any) || (apiBaseUrl.includes("dialog.ai") ? "dialog_ai" : apiBaseUrl.includes("api.telegram.org") ? "direct" : "custom_cloudflare");
    const adminTelegramId = parsedConfig.adminTelegramId || defaultConfig.adminTelegramId;
    const botUsername = parsedConfig.botUsername || defaultConfig.botUsername;
    const appUrl = parsedConfig.appUrl || defaultConfig.appUrl;
    const referralTemplate = parsedConfig.referralTemplate || defaultConfig.referralTemplate;

    return {
      ...defaultConfig,
      botToken,
      botUsername,
      proxyType,
      apiBaseUrl,
      secondaryApiBaseUrl,
      adminTelegramId,
      appUrl,
      referralTemplate
    };
  } catch (err) {
    console.error("[Telegram] Error fetching bot config:", err);
    return defaultConfig;
  }
}

/**
 * 2. Очистка и нормализация базового URL
 */
export function cleanTelegramBaseUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== "string") return PROXY_PRESETS.dialog_ai;
  let u = rawUrl.trim().replace(/\/+$/, "");
  // Если пользователь случайно скопировал адрес целиком с /bot<TOKEN>/...
  u = u.replace(/\/bot[^\/]+.*$/i, "");
  u = u.replace(/\/bot$/i, "");
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  return u.replace(/\/+$/, "");
}

/**
 * Helper to mask sensitive token for frontend transmission
 */
export function maskTelegramToken(token: string): string {
  if (!token) return "";
  const t = token.trim();
  if (t.length <= 10) return "••••••••••••";
  const start = t.substring(0, 6);
  const end = t.substring(t.length - 4);
  return `${start}••••••••${end}`;
}

/**
 * Определение клиентских ошибок Telegram API (несуществующий чат, блокировка бота, нехватка прав и т.п.)
 * При таких ошибках шлюз/прокси работает штатно, повторные попытки на direct Telegram бесполезны.
 */
export function isTelegramClientError(description?: string): boolean {
  if (!description || typeof description !== "string") return false;
  return /chat not found|bot was blocked|user is deactivated|chat_id is empty|bot is not a member|group chat was deactivated|have no rights|not enough rights|chat was deleted|user not found|can't initiate conversation|bot can't initiate conversation/i.test(description);
}

/**
 * Построение структуры инлайн-кнопок из строки формата "Текст|URL;Еще кнопка|URL"
 * В точном соответствии с алгоритмом функции buildInlineKeyboard из Google Таблиц
 */
export function buildInlineKeyboard(buttonsString: string): { inline_keyboard: Array<Array<{ text: string; url: string }>> } {
  const inlineKeyboard: Array<Array<{ text: string; url: string }>> = [];
  if (!buttonsString || typeof buttonsString !== 'string') {
    return { inline_keyboard: [] };
  }
  const buttonPairs = buttonsString.split(';');
  for (let i = 0; i < buttonPairs.length; i++) {
    const rawPair = buttonPairs[i].trim();
    if (!rawPair) continue;
    const pair = rawPair.split('|');
    if (pair.length >= 2) {
      const text = pair[0].trim();
      let url = pair.slice(1).join('|').trim();
      // Telegram Bot API отклоняет адреса localhost в inline кнопках
      if (url.includes('localhost') || url.includes('127.0.0.1')) {
        url = url.replace(/^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/i, 'https://ais-dev-vutnpfgnpxkwwlfzhqppfc-146826516813.europe-west2.run.app');
      }
      if (text && url) {
        inlineKeyboard.push([{ text, url }]);
      }
    }
  }
  return { inline_keyboard: inlineKeyboard };
}

/**
 * Для Rich Message экранирование спецсимволов не требуется,
 * возвращает очищенный строковый контент
 */
export function escapeRichText(val: any): string {
  if (val === undefined || val === null) return '';
  const s = String(val).trim();
  if (!s || s === '[object Object]' || s === 'undefined' || s === 'null') return '';
  return s;
}

export interface SendTelegramRichMessageOptions {
  chatId: string | number;
  markdown?: string;
  html?: string;
  blocks?: InputRichBlock[];
  buttons?: string; // Формат "Текст|URL;Кнопка2|URL"
  replyMarkup?: any;
  reply_markup?: any;
  messageThreadId?: number;
  protectContent?: boolean;
  disableNotification?: boolean;
  replyParameters?: any;
  botToken?: string;
  apiBaseUrl?: string;
  secondaryApiBaseUrl?: string;
  timeoutMs?: number;
  fallbackToSendMessage?: boolean;
}

/**
 * 2b. Отправка сообщений через Telegram /sendRichMessage по правилам Bot API 10.1–10.3:
 * - Поддержка markdown, html (<blockquote expandable>, <tg-button-row>) и blocks (InputRichBlock[])
 * - Поддержка tg://document?id=, is_compact таблиц и RichMessageButton
 * - Лимит до 32 768 символов (безопасный буфер 32 000)
 * - Автоматический fallback на прямой api.telegram.org (если прокси не поддерживает блоки/HTML) и далее на sendMessage
 */
export async function sendTelegramRichMessage(options: SendTelegramRichMessageOptions): Promise<{
  ok: boolean;
  result?: any;
  messageId?: number | string;
  data?: any;
  error?: string;
  usedFallback?: boolean;
  usedBaseUrl?: string;
  mode?: "rich_message" | "send_message";
}> {
  const config = await getTelegramBotConfig();
  const token = options.botToken || config.botToken;
  const rawBase = options.apiBaseUrl || config.apiBaseUrl || PROXY_PRESETS.dialog_ai;
  const primaryBase = cleanTelegramBaseUrl(rawBase);
  const secondaryBase = cleanTelegramBaseUrl(
    options.secondaryApiBaseUrl || config.secondaryApiBaseUrl || PROXY_PRESETS.direct
  );
  const timeoutMs = options.timeoutMs || 30000;

  if (!token) {
    console.warn("[Telegram Rich] Bot token is missing.");
    return { ok: false, error: "Bot token is missing" };
  }

  const rawChatId = options.chatId !== undefined && options.chatId !== null ? String(options.chatId).trim() : '';
  if (!rawChatId || rawChatId === '0' || rawChatId === 'null' || rawChatId === 'undefined') {
    return { ok: false, error: "Не указан ID чата Telegram (chat_id пуст или некорректен)" };
  }
  const chatIdStr = rawChatId;

  const { richMessage, logText } = buildInputRichMessage({
    markdown: options.markdown,
    html: options.html,
    blocks: options.blocks
  });
  const safeMarkdown = logText || richMessage.markdown || '';

  // 1. Формируем payload для /sendRichMessage по Bot API 10.3
  const payload: Record<string, any> = {
    chat_id: chatIdStr,
    rich_message: richMessage
  };
  if (options.messageThreadId) payload.message_thread_id = options.messageThreadId;
  if (typeof options.protectContent === 'boolean') payload.protect_content = options.protectContent;
  if (typeof options.disableNotification === 'boolean') payload.disable_notification = options.disableNotification;
  if (options.replyParameters) payload.reply_parameters = options.replyParameters;

  // 2. Кнопки: если в blocks уже встроен блок type: "buttons", не дублируем reply_markup; храним fallbackMarkup для markdown/sendMessage
  let fallbackMarkup: any = undefined;
  if (options.buttons && typeof options.buttons === 'string' && options.buttons.trim().length > 0) {
    fallbackMarkup = buildInlineKeyboard(options.buttons);
  } else if (options.replyMarkup || options.reply_markup) {
    fallbackMarkup = options.replyMarkup || options.reply_markup;
  }
  const blocksHasButtons = Array.isArray(richMessage.blocks) && richMessage.blocks.some((b) => b.type === "buttons");
  if (!blocksHasButtons && fallbackMarkup) {
    payload.reply_markup = fallbackMarkup;
  }

  const primaryUrl = `${primaryBase}/bot${token}/sendRichMessage`;
  const primaryTimeout = Math.max(timeoutMs, 32000);

  try {
    const res = await fetch(primaryUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(primaryTimeout)
    });

    let jsonResult: any = {};
    try {
      jsonResult = await res.json();
    } catch {
      jsonResult = { ok: false, description: "Ошибка парсинга ответа сервера" };
    }

    if (res.ok && jsonResult.ok) {
      await logTelegramMessageToDb({
        chatId: chatIdStr,
        text: safeMarkdown,
        status: "sent",
        rawPayload: jsonResult
      });
      return {
        ok: true,
        result: jsonResult.result,
        messageId: jsonResult.result?.message_id,
        data: jsonResult,
        usedFallback: false,
        usedBaseUrl: primaryBase,
        mode: "rich_message"
      };
    }

    if (isTelegramClientError(jsonResult.description)) {
      await logTelegramMessageToDb({
        chatId: chatIdStr,
        text: safeMarkdown,
        status: "failed",
        rawPayload: jsonResult
      });
      return { ok: false, error: jsonResult.description, data: jsonResult };
    }

    // If a media block URL could not be crawled by Telegram, retry Rich Blocks keeping headings/tables/expandables/buttons
    if (Array.isArray(richMessage.blocks) && isRichMediaFetchError(jsonResult.description)) {
      console.warn(`[Telegram Rich] Media fetch warning (${jsonResult.description}), retrying blocks with media summary fallback`);
      const textSafeBlocks: InputRichBlock[] = richMessage.blocks.map((blk) => {
        if (blk.type === "photo") {
          return { type: "paragraph", text: `🖼 Фото (недоступно по внешней ссылке): ${blk.caption?.text || blk.photo.media}` };
        }
        if (blk.type === "video") {
          return { type: "paragraph", text: `🎥 Видео (недоступно по внешней ссылке): ${blk.caption?.text || blk.video.media}` };
        }
        if (blk.type === "document") {
          return { type: "paragraph", text: `📎 Документ (недоступен по внешней ссылке): ${blk.caption?.text || blk.document.media}` };
        }
        return blk;
      });
      const safeMediaRes = await fetch(primaryUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, rich_message: { blocks: textSafeBlocks } }),
        signal: AbortSignal.timeout(primaryTimeout)
      }).catch(() => null);
      if (safeMediaRes) {
        const safeMediaJson = await safeMediaRes.json().catch(() => ({}));
        if (safeMediaRes.ok && safeMediaJson.ok) {
          await logTelegramMessageToDb({
            chatId: chatIdStr,
            text: safeMarkdown,
            status: "sent",
            rawPayload: safeMediaJson
          });
          return {
            ok: true,
            result: safeMediaJson.result,
            messageId: safeMediaJson.result?.message_id,
            data: safeMediaJson,
            usedFallback: true,
            usedBaseUrl: primaryBase,
            mode: "rich_message"
          };
        }
      }
    }

    // If proxy doesn't support new Bot API 10.3 fields (blocks/html) yet, try direct api.telegram.org,
    // and if that also rejects structured blocks, downgrade cleanly to rich_message.markdown
    if (richMessage.blocks || richMessage.html) {
      if (!primaryBase.includes("api.telegram.org") && (isRichMethodUnsupportedError(jsonResult.description) || res.status >= 400)) {
        const directRes = await fetch(`${secondaryBase}/bot${token}/sendRichMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(primaryTimeout)
        }).catch(() => null);
        if (directRes) {
          const directJson = await directRes.json().catch(() => ({}));
          if (directRes.ok && directJson.ok) {
            await logTelegramMessageToDb({
              chatId: chatIdStr,
              text: safeMarkdown,
              status: "sent",
              rawPayload: directJson
            });
            return {
              ok: true,
              result: directJson.result,
              messageId: directJson.result?.message_id,
              data: directJson,
              usedFallback: true,
              usedBaseUrl: secondaryBase,
              mode: "rich_message"
            };
          }
        }
      }

      if (safeMarkdown) {
        const mdPayload: Record<string, any> = {
          ...payload,
          rich_message: { markdown: prepareRichMarkdown(safeMarkdown) },
          ...(fallbackMarkup ? { reply_markup: fallbackMarkup } : {})
        };
        const mdRes = await fetch(primaryUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mdPayload),
          signal: AbortSignal.timeout(primaryTimeout)
        }).catch(() => null);
        if (mdRes) {
          const mdJson = await mdRes.json().catch(() => ({}));
          if (mdRes.ok && mdJson.ok) {
            await logTelegramMessageToDb({
              chatId: chatIdStr,
              text: safeMarkdown,
              status: "sent",
              rawPayload: mdJson
            });
            return {
              ok: true,
              result: mdJson.result,
              messageId: mdJson.result?.message_id,
              data: mdJson,
              usedFallback: true,
              usedBaseUrl: primaryBase,
              mode: "rich_message"
            };
          }
        }
      }
    }

    throw new Error(jsonResult.description || `HTTP ${res.status}`);
  } catch (primaryErr: any) {
    if (isTelegramClientError(primaryErr.message)) {
      return { ok: false, error: primaryErr.message };
    }
    console.warn(`[Telegram Rich] Primary /sendRichMessage network failure (${primaryUrl}):`, primaryErr.message);

    // Retry once with the exact same safeMarkdown (preserving inline image embeds ![alt](url))
    try {
      const retryRes = await fetch(primaryUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(primaryTimeout)
      });
      const retryJson = await retryRes.json().catch(() => ({}));
      if (retryRes.ok && retryJson.ok) {
        await logTelegramMessageToDb({
          chatId: chatIdStr,
          text: safeMarkdown,
          status: "sent",
          rawPayload: retryJson
        });
        return {
          ok: true,
          result: retryJson.result,
          messageId: retryJson.result?.message_id,
          data: retryJson,
          usedBaseUrl: primaryBase,
          mode: "rich_message"
        };
      }
    } catch (retryErr: any) {
      console.warn("[Telegram Rich] Retry photo markdown failed:", retryErr.message);
    }

    // Direct fallback to standard /sendMessage
    if (options.fallbackToSendMessage !== false) {
      console.info("[Telegram Rich] Falling back to standard /sendMessage endpoint");
      try {
        const cleanStandardText = safeMarkdown.replace(/!\[(.*?)\]\((.*?)\)/g, (_match, alt, url) => {
          const cleanAlt = (alt && alt !== 'alt' && alt !== 'HeroCard') ? alt.trim() : 'прикрепленное фото';
          return `[🖼 ${cleanAlt}](${url})`;
        });

        const maxChunk = 4000;
        if (cleanStandardText.length <= maxChunk) {
          const standardResult = await sendTelegramMessage({
            chatId: chatIdStr,
            text: cleanStandardText,
            parseMode: "Markdown",
            replyMarkup: payload.reply_markup,
            botToken: token,
            apiBaseUrl: primaryBase.includes("dialog.ai") ? primaryBase : "https://api.telegram.org",
            timeoutMs: 20000
          });
          if (standardResult.ok) {
            return {
              ...standardResult,
              messageId: standardResult.result?.message_id,
              data: standardResult.data,
              usedFallback: true,
              usedBaseUrl: primaryBase,
              mode: "send_message"
            };
          }
        } else {
          // Send long text in chunks of 4000 chars
          let lastRes: any = null;
          for (let offset = 0; offset < cleanStandardText.length; offset += maxChunk) {
            const chunk = cleanStandardText.slice(offset, offset + maxChunk);
            const isLast = offset + maxChunk >= cleanStandardText.length;
            lastRes = await sendTelegramMessage({
              chatId: chatIdStr,
              text: chunk,
              parseMode: "Markdown",
              replyMarkup: isLast ? payload.reply_markup : undefined,
              botToken: token,
              apiBaseUrl: primaryBase.includes("dialog.ai") ? primaryBase : "https://api.telegram.org",
              timeoutMs: 20000
            });
          }
          if (lastRes?.ok) {
            return {
              ...lastRes,
              messageId: lastRes.result?.message_id,
              data: lastRes.data,
              usedFallback: true,
              usedBaseUrl: primaryBase,
              mode: "send_message"
            };
          }
        }
      } catch (smErr: any) {
        console.warn("[Telegram Rich] Standard /sendMessage fallback also failed:", smErr.message);
      }
    }

    await logTelegramMessageToDb({
      chatId: chatIdStr,
      text: safeMarkdown,
      status: "failed",
      rawPayload: { error: primaryErr.message }
    });

    return { ok: false, error: primaryErr.message };
  }
}

/**
 * 3. Отправка текстовых сообщений (sendMessage) через прокси с failover
 */
export async function sendTelegramMessage(options: {
  chatId: string | number;
  text: string;
  parseMode?: "HTML" | "Markdown" | "MarkdownV2";
  buttons?: string;
  useRichMessage?: boolean;
  replyMarkup?: any;
  reply_markup?: any;
  botToken?: string;
  apiBaseUrl?: string;
  secondaryApiBaseUrl?: string;
  timeoutMs?: number;
}): Promise<{ ok: boolean; result?: any; data?: any; error?: string; usedFallback?: boolean; usedBaseUrl?: string }> {
  // Если явно запрошен rich message или переданы buttons в строковом формате
  if (options.useRichMessage || (options.buttons && typeof options.buttons === 'string')) {
    return sendTelegramRichMessage({
      chatId: options.chatId,
      markdown: options.text,
      buttons: options.buttons,
      replyMarkup: options.replyMarkup || options.reply_markup,
      botToken: options.botToken,
      apiBaseUrl: options.apiBaseUrl,
      secondaryApiBaseUrl: options.secondaryApiBaseUrl,
      timeoutMs: options.timeoutMs
    });
  }

  const config = await getTelegramBotConfig();
  const token = options.botToken || config.botToken;
  const rawBase = options.apiBaseUrl || config.apiBaseUrl || PROXY_PRESETS.dialog_ai;
  const primaryBase = cleanTelegramBaseUrl(rawBase);
  const timeoutMs = options.timeoutMs || 25000;
  const isProxy = !primaryBase.includes("api.telegram.org");
  const primaryTimeout = isProxy ? Math.min(timeoutMs, 14000) : timeoutMs;

  if (!token) {
    console.warn("[Telegram] Bot token is not configured.");
    return { ok: false, error: "Bot token is missing" };
  }

  const rawChatId = options.chatId !== undefined && options.chatId !== null ? String(options.chatId).trim() : '';
  if (!rawChatId || rawChatId === '0' || rawChatId === 'null' || rawChatId === 'undefined') {
    return { ok: false, error: "Не указан ID чата Telegram (chat_id пуст или некорректен)" };
  }

  // Telegram maximum message limit is 4096 characters
  let safeText = options.text || '';
  if (safeText.length > 4000) {
    safeText = safeText.slice(0, 3920) + "\n\n... [текст сокращен по лимиту Telegram, полный отчет в кабинете]";
  }

  const payload: Record<string, any> = {
    chat_id: rawChatId,
    text: safeText,
    parse_mode: options.parseMode || "HTML"
  };

  const markup = options.replyMarkup || options.reply_markup;
  if (markup) {
    payload.reply_markup = markup;
  }

  const primaryUrl = `${primaryBase}/bot${token}/sendMessage`;

  try {
    const res = await fetch(primaryUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(primaryTimeout)
    });
    const data = await res.json().catch(() => ({}));
    const isSuccess = res.ok && data.ok;

    // Log message to PostgreSQL BD ProTalk
    await logTelegramMessageToDb({
      chatId: rawChatId,
      text: options.text,
      status: isSuccess ? "sent" : "failed",
      rawPayload: data
    });

    if (isSuccess) {
      return { ok: true, result: data.result, data, usedBaseUrl: primaryBase };
    }

    // Если Telegram вернул клиентскую ошибку (чат не найден, бот заблокирован и т.п.)
    // Прокси работает штатно, повторные попытки на direct Telegram бессмысленны
    if (isTelegramClientError(data.description)) {
      console.info(`[Telegram] Telegram API rejected message: ${data.description} (chat: ${rawChatId})`);
      return { ok: false, error: data.description, data };
    }

    // Auto-retry without parse_mode if Markdown entities caused a formatting error
    if (data.description && /can't parse entities/i.test(data.description)) {
      try {
        const plainPayload = { ...payload };
        delete plainPayload.parse_mode;
        const retryRes = await fetch(primaryUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(plainPayload),
          signal: AbortSignal.timeout(timeoutMs)
        });
        const retryData = await retryRes.json().catch(() => ({}));
        if (retryRes.ok && retryData.ok) {
          await logTelegramMessageToDb({
            chatId: rawChatId,
            text: options.text,
            status: "sent",
            rawPayload: retryData
          });
          return { ok: true, result: retryData.result, data: retryData, usedBaseUrl: primaryBase };
        }
      } catch (retryErr) {
        console.warn("[Telegram] Entity parse retry failed:", retryErr);
      }
    }

    // Auto-retry with truncated text if Telegram reports message is too long
    if (data.description && /message is too long/i.test(data.description)) {
      try {
        const shortPayload = { ...payload, text: payload.text.slice(0, 3500) + "\n\n... [текст сокращен по лимиту Telegram]" };
        const retryRes = await fetch(primaryUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(shortPayload),
          signal: AbortSignal.timeout(timeoutMs)
        });
        const retryData = await retryRes.json().catch(() => ({}));
        if (retryRes.ok && retryData.ok) {
          await logTelegramMessageToDb({
            chatId: rawChatId,
            text: shortPayload.text,
            status: "sent",
            rawPayload: retryData
          });
          return { ok: true, result: retryData.result, data: retryData, usedBaseUrl: primaryBase };
        }
      } catch (retryErr) {
        console.warn("[Telegram] Truncate retry failed:", retryErr);
      }
    }

    throw new Error(data.description || `HTTP ${res.status}`);
  } catch (primaryErr: any) {
    if (isTelegramClientError(primaryErr.message)) {
      return { ok: false, error: primaryErr.message };
    }

    console.warn(`[Telegram] Primary endpoint network failure (${primaryUrl}):`, primaryErr.message);

    // Автоматический Fallback на api.telegram.org только при реальном сетевом сбое прокси
    if (!primaryBase.includes("api.telegram.org")) {
      const fallbackUrl = `https://api.telegram.org/bot${token}/sendMessage`;
      try {
        const resFb = await fetch(fallbackUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(timeoutMs)
        });
        const dataFb = await resFb.json().catch(() => ({}));
        const isSuccessFb = resFb.ok && dataFb.ok;

        if (isSuccessFb) {
          await logTelegramMessageToDb({
            chatId: rawChatId,
            text: options.text,
            status: "sent",
            rawPayload: dataFb
          });
          return { ok: true, result: dataFb.result, data: dataFb, usedFallback: true, usedBaseUrl: "https://api.telegram.org" };
        }

        if (isTelegramClientError(dataFb.description)) {
          return { ok: false, error: dataFb.description, data: dataFb };
        }

        // Retry fallback without parse_mode if entities failed
        if (dataFb.description && /can't parse entities/i.test(dataFb.description)) {
          const plainPayload = { ...payload };
          delete plainPayload.parse_mode;
          const retryFb = await fetch(fallbackUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(plainPayload),
            signal: AbortSignal.timeout(timeoutMs)
          });
          const retryDataFb = await retryFb.json().catch(() => ({}));
          if (retryFb.ok && retryDataFb.ok) {
            await logTelegramMessageToDb({
              chatId: String(options.chatId),
              text: options.text,
              status: "sent",
              rawPayload: retryDataFb
            });
            return { ok: true, result: retryDataFb.result, data: retryDataFb, usedFallback: true, usedBaseUrl: "https://api.telegram.org" };
          }
        }

        // Retry fallback with truncated text if message too long
        if (dataFb.description && /message is too long/i.test(dataFb.description)) {
          const shortPayload = { ...payload, text: payload.text.slice(0, 3500) + "\n\n... [текст сокращен по лимиту Telegram]" };
          const retryFb = await fetch(fallbackUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(shortPayload),
            signal: AbortSignal.timeout(timeoutMs)
          });
          const retryDataFb = await retryFb.json().catch(() => ({}));
          if (retryFb.ok && retryDataFb.ok) {
            await logTelegramMessageToDb({
              chatId: String(options.chatId),
              text: shortPayload.text,
              status: "sent",
              rawPayload: retryDataFb
            });
            return { ok: true, result: retryDataFb.result, data: retryDataFb, usedFallback: true, usedBaseUrl: "https://api.telegram.org" };
          }
        }

        return { ok: false, error: dataFb.description || `Fallback HTTP ${resFb.status}` };
      } catch (fbErr: any) {
        return { ok: false, error: `Fallback failed: ${fbErr.message}` };
      }
    }

    await logTelegramMessageToDb({
      chatId: String(options.chatId),
      text: options.text,
      status: "failed",
      rawPayload: { error: primaryErr.message }
    });

    return { ok: false, error: primaryErr.message };
  }
}

/**
 * Backward compatibility alias for sendTelegramApiMessage
 */
export const sendTelegramApiMessage = sendTelegramMessage;

/**
 * 4. Отправка файлов / бэкапов (sendDocument)
 */
export async function sendTelegramDocument(options: {
  chatId: string | number;
  fileBuffer: Buffer | Uint8Array;
  filename: string;
  caption?: string;
  parseMode?: "HTML" | "Markdown" | "MarkdownV2";
  botToken?: string;
  apiBaseUrl?: string;
  secondaryApiBaseUrl?: string;
  timeoutMs?: number;
}): Promise<{ ok: boolean; result?: any; data?: any; error?: string; usedFallback?: boolean }> {
  const config = await getTelegramBotConfig();
  const token = options.botToken || config.botToken;
  const rawBase = options.apiBaseUrl || config.apiBaseUrl || PROXY_PRESETS.dialog_ai;
  const primaryBase = cleanTelegramBaseUrl(rawBase);
  const timeoutMs = options.timeoutMs || 35000;

  if (!token) return { ok: false, error: "Bot token is missing" };

  const rawChatId = options.chatId !== undefined && options.chatId !== null ? String(options.chatId).trim() : '';
  if (!rawChatId || rawChatId === '0' || rawChatId === 'null' || rawChatId === 'undefined') {
    return { ok: false, error: "Не указан ID чата Telegram (chat_id пуст или некорректен)" };
  }

  const formData = new FormData();
  formData.append("chat_id", rawChatId);
  if (options.caption) {
    formData.append("caption", options.caption);
    formData.append("parse_mode", options.parseMode || "HTML");
  }
  
  const blob = new Blob([options.fileBuffer], { type: "application/json" });
  formData.append("document", blob, options.filename);

  const primaryUrl = `${primaryBase}/bot${token}/sendDocument`;

  try {
    const res = await fetch(primaryUrl, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(timeoutMs)
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) {
      return { ok: true, result: data.result, data };
    }

    // Если Telegram отклонил из-за клиентской ошибки (чат не найден, бот заблокирован и т.п.)
    if (isTelegramClientError(data.description)) {
      console.info(`[Telegram Document] Telegram API rejected document: ${data.description} (chat: ${rawChatId})`);
      return { ok: false, error: data.description, data };
    }

    throw new Error(data.description || `HTTP ${res.status}`);
  } catch (err: any) {
    if (isTelegramClientError(err.message)) {
      return { ok: false, error: err.message };
    }

    console.warn(`[Telegram Document] Primary endpoint network failure (${primaryUrl}):`, err.message);

    // Fallback to direct api.telegram.org только при реальном сетевом сбое
    if (!primaryBase.includes("api.telegram.org")) {
      const fbUrl = `https://api.telegram.org/bot${token}/sendDocument`;
      try {
        const formDataFb = new FormData();
        formDataFb.append("chat_id", rawChatId);
        if (options.caption) {
          formDataFb.append("caption", options.caption);
          formDataFb.append("parse_mode", options.parseMode || "HTML");
        }
        formDataFb.append("document", new Blob([options.fileBuffer], { type: "application/json" }), options.filename);

        const resFb = await fetch(fbUrl, {
          method: "POST",
          body: formDataFb,
          signal: AbortSignal.timeout(timeoutMs)
        });
        const dataFb = await resFb.json().catch(() => ({}));
        if (resFb.ok && dataFb.ok) {
          return { ok: true, result: dataFb.result, data: dataFb, usedFallback: true };
        }
        if (isTelegramClientError(dataFb.description)) {
          return { ok: false, error: dataFb.description, data: dataFb };
        }
        return { ok: false, error: dataFb.description || `Fallback HTTP ${resFb.status}` };
      } catch (fbErr: any) {
        return { ok: false, error: `Fallback failed: ${fbErr.message}` };
      }
    }
    return { ok: false, error: err.message };
  }
}

/**
 * 4b. Отправка фото (sendPhoto)
 */
export async function sendTelegramPhoto(options: {
  chatId: string | number;
  photoUrl: string;
  caption?: string;
  parseMode?: "HTML" | "Markdown" | "MarkdownV2";
  botToken?: string;
  timeoutMs?: number;
}): Promise<{ ok: boolean; result?: any; data?: any; error?: string }> {
  const config = await getTelegramBotConfig();
  const token = options.botToken || config.botToken;
  const timeoutMs = options.timeoutMs || 25000;
  const primaryBase = cleanTelegramBaseUrl(config.apiBaseUrl || "https://eu1.account.dialog.ai.atiks.org");

  if (!token) return { ok: false, error: "Bot token is missing" };

  const payload: Record<string, any> = {
    chat_id: String(options.chatId),
    photo: options.photoUrl
  };
  if (options.caption) {
    payload.caption = options.caption;
    payload.parse_mode = options.parseMode || "Markdown";
  }

  // Primary attempt via configured base URL
  const primaryUrl = `${primaryBase}/bot${token}/sendPhoto`;
  try {
    const res = await fetch(primaryUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs)
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) {
      return { ok: true, result: data.result, data };
    }
  } catch (err: any) {
    console.warn(`[Telegram Photo] Primary ${primaryUrl} failed:`, err.message);
  }

  // Fallback to direct api.telegram.org if primary proxy failed
  const fallbackUrl = `https://api.telegram.org/bot${token}/sendPhoto`;
  try {
    const resFb = await fetch(fallbackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs)
    });
    const dataFb = await resFb.json().catch(() => ({}));
    if (resFb.ok && dataFb.ok) {
      return { ok: true, result: dataFb.result, data: dataFb };
    }
    return { ok: false, error: dataFb.description || `HTTP ${resFb.status}` };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

// MiniApp initData helpers live in ./telegram/miniAppAndChat.ts

/**
 * Helper to log telegram message to PostgreSQL BD ProTalk
 */
export async function logTelegramMessageToDb(opts: {
  chatId: string;
  text: string;
  status: "sent" | "failed";
  rawPayload: any;
}) {
  try {
    const db = await getDb();
    await db.run(
      `INSERT INTO telegram_messages_log (id, chat_id, username, direction, message_type, message_text, status, raw_payload, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "tgmsg_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
        opts.chatId,
        null,
        "outgoing",
        "text",
        opts.text || "",
        opts.status,
        JSON.stringify(opts.rawPayload || {}),
        Date.now()
      ]
    );
  } catch (dbErr) {
    // Non-fatal logging error
  }
}

// Chat diagnostics (getTelegramChat, checkTelegramBotInChat) live in ./telegram/miniAppAndChat.ts

