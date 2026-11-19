import crypto from "crypto";
import { cleanTelegramBaseUrl, getTelegramBotConfig, PROXY_PRESETS } from "../telegram";

export function verifyTelegramInitData(initData: string, botToken: string): boolean {
  if (!initData || !botToken) return false;
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get("hash");
    if (!hash) return false;

    urlParams.delete("hash");
    const params: string[] = [];
    for (const [key, value] of urlParams.entries()) {
      params.push(`${key}=${value}`);
    }
    params.sort();

    const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
    const calculatedHash = crypto.createHmac("sha256", secretKey).update(params.join("\n")).digest("hex");

    return calculatedHash === hash;
  } catch {
    return false;
  }
}

export function parseTelegramInitData(initData: string) {
  try {
    const urlParams = new URLSearchParams(initData);
    const userJson = urlParams.get("user");
    const user = userJson ? JSON.parse(userJson) : null;
    const startParam = urlParams.get("start_param") || "";

    let referredBy: string | null = null;
    let utmSource: string | null = null;
    let utmMedium: string | null = null;
    let utmCampaign: string | null = null;

    if (startParam) {
      if (/^\d+$/.test(startParam)) {
        referredBy = startParam;
      } else {
        const parts = startParam.split("_");
        for (let i = 0; i < parts.length; i++) {
          if ((parts[i] === "ref" || parts[i] === "start") && parts[i + 1]) {
            referredBy = parts[i + 1];
          }
          if (parts[i] === "utm" && parts[i + 1] === "source" && parts[i + 2]) {
            utmSource = parts[i + 2];
          }
          if (parts[i] === "utm" && parts[i + 1] === "medium" && parts[i + 2]) {
            utmMedium = parts[i + 2];
          }
          if (parts[i] === "utm" && parts[i + 1] === "campaign" && parts[i + 2]) {
            utmCampaign = parts[i + 2];
          }
        }
      }
    }

    return {
      user,
      startParam,
      referredBy,
      utmSource,
      utmMedium,
      utmCampaign,
      authDate: urlParams.get("auth_date")
    };
  } catch {
    return {
      user: null,
      startParam: "",
      referredBy: null,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      authDate: null
    };
  }
}

export async function getTelegramChat(
  chatId: string | number,
  botToken?: string
): Promise<{ ok: boolean; chat?: any; error?: string }> {
  const config = await getTelegramBotConfig();
  const token = botToken || config.botToken;
  const rawBase = config.apiBaseUrl || PROXY_PRESETS.dialog_ai;
  const primaryBase = cleanTelegramBaseUrl(rawBase);

  if (!token) return { ok: false, error: "Bot token is missing" };

  const sanitizedId = String(chatId).trim();
  const url = `${primaryBase}/bot${token}/getChat?chat_id=${encodeURIComponent(sanitizedId)}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) {
      return { ok: true, chat: data.result };
    }

    if (!primaryBase.includes("api.telegram.org")) {
      const fbUrl = `https://api.telegram.org/bot${token}/getChat?chat_id=${encodeURIComponent(sanitizedId)}`;
      const resFb = await fetch(fbUrl, { signal: AbortSignal.timeout(10000) });
      const dataFb = await resFb.json().catch(() => ({}));
      if (resFb.ok && dataFb.ok) {
        return { ok: true, chat: dataFb.result };
      }
      return { ok: false, error: dataFb.description || data.description || "Чат не найден" };
    }

    return { ok: false, error: data.description || "Чат не найден" };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export async function checkTelegramBotInChat(
  chatId: string | number,
  botToken?: string
): Promise<{
  ok: boolean;
  present: boolean;
  isAdmin: boolean;
  status: string;
  chat?: any;
  error?: string;
}> {
  const config = await getTelegramBotConfig();
  const token = botToken || config.botToken;
  const rawBase = config.apiBaseUrl || PROXY_PRESETS.dialog_ai;
  const primaryBase = cleanTelegramBaseUrl(rawBase);

  if (!token) {
    return { ok: false, present: false, isAdmin: false, status: "error", error: "Токен бота не настроен" };
  }

  const sanitizedId = String(chatId).trim();

  let botId: number | null = null;
  try {
    const meRes = await fetch(`${primaryBase}/bot${token}/getMe`, { signal: AbortSignal.timeout(8000) });
    const meData = await meRes.json().catch(() => ({}));
    if (meData.ok && meData.result?.id) {
      botId = meData.result.id;
    }
  } catch {}

  if (!botId) {
    const parsedId = parseInt(token.split(":")[0], 10);
    if (!isNaN(parsedId)) botId = parsedId;
  }

  const chatInfo = await getTelegramChat(sanitizedId, token);
  if (!chatInfo.ok) {
    return {
      ok: false,
      present: false,
      isAdmin: false,
      status: "not_found",
      error:
        chatInfo.error ||
        "Чат или канал не найден. Убедитесь, что ID или @username указаны верно и бот добавлен в чат."
    };
  }

  if (botId) {
    try {
      const memberUrl = `${primaryBase}/bot${token}/getChatMember?chat_id=${encodeURIComponent(sanitizedId)}&user_id=${botId}`;
      const res = await fetch(memberUrl, { signal: AbortSignal.timeout(8000) });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        const memStatus = data.result?.status;
        const isPresent = ["creator", "administrator", "member"].includes(memStatus);
        const isAdmin = ["creator", "administrator"].includes(memStatus);
        return {
          ok: true,
          present: isPresent,
          isAdmin,
          status: memStatus,
          chat: chatInfo.chat
        };
      }
    } catch {}
  }

  return {
    ok: true,
    present: true,
    isAdmin: true,
    status: "administrator",
    chat: chatInfo.chat
  };
}
