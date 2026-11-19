export type RichButtonStyle = "primary" | "success" | "danger" | "link";

export interface RichMessageButton {
  text: string;
  style?: RichButtonStyle;
  url?: string;
  callback_data?: string;
  web_app?: { url: string };
  switch_inline_query?: string;
}

export interface RichBlockTableCell {
  text?: string;
  is_header?: boolean;
  colspan?: number;
  rowspan?: number;
  align?: "left" | "center" | "right";
  valign?: "top" | "middle" | "bottom";
}

export interface RichBlockCaption {
  text: string;
  credit?: string;
}

export interface InputRichBlockSectionHeading {
  type: "heading";
  text: string;
  size?: 1 | 2 | 3 | 4 | 5 | 6;
}

export interface InputRichBlockParagraph {
  type: "paragraph";
  text: string;
}

export interface InputRichBlockListItem {
  blocks: InputRichBlock[];
  has_checkbox?: boolean;
  is_checked?: boolean;
  value?: number;
  type?: "1" | "a" | "A" | "i" | "I";
  label?: string;
}

export interface InputRichBlockList {
  type: "list";
  items: InputRichBlockListItem[];
}

export interface InputRichBlockTable {
  type: "table";
  caption?: string;
  is_compact?: boolean;
  is_bordered?: boolean;
  is_striped?: boolean;
  cells: RichBlockTableCell[][];
}

export interface InputRichBlockExpandableBlockQuotation {
  type: "expandable_blockquote";
  text: string;
  credit?: string;
}

export interface InputRichBlockDetails {
  type: "details";
  summary: string;
  blocks: InputRichBlock[];
  is_open?: boolean;
}

export interface InputRichBlockButtons {
  type: "buttons";
  align?: "left" | "center" | "right";
  buttons: RichMessageButton[];
}

export interface InputRichBlockPhoto {
  type: "photo";
  photo: {
    type: "photo";
    media: string;
    has_spoiler?: boolean;
  };
  caption?: RichBlockCaption;
}

export interface InputRichBlockVideo {
  type: "video";
  video: {
    type: "video";
    media: string;
    supports_streaming?: boolean;
    has_spoiler?: boolean;
  };
  caption?: RichBlockCaption;
}

export interface InputRichBlockDocument {
  type: "document";
  document: {
    type: "document";
    media: string;
  };
  caption?: RichBlockCaption;
}

export interface InputRichBlockDivider {
  type: "divider";
}

export type InputRichBlock =
  | InputRichBlockSectionHeading
  | InputRichBlockParagraph
  | InputRichBlockList
  | InputRichBlockTable
  | InputRichBlockExpandableBlockQuotation
  | InputRichBlockDetails
  | InputRichBlockButtons
  | InputRichBlockPhoto
  | InputRichBlockVideo
  | InputRichBlockDocument
  | InputRichBlockDivider;

export interface InputRichMessage {
  markdown?: string;
  html?: string;
  blocks?: InputRichBlock[];
}

export const PUBLIC_APP_ORIGIN =
  "https://ais-dev-vutnpfgnpxkwwlfzhqppfc-146826516813.europe-west2.run.app";

export const RICH_MESSAGE_MAX_CHARS = 32000;

export function normalizeTelegramMediaUrl(rawUrl: string, origin: string = PUBLIC_APP_ORIGIN): string {
  const s = String(rawUrl || "").trim();
  if (!s) return "";
  if (s.startsWith("tg://")) return s;
  let normalized = s.replace(/https?:\/\/file\.pro-talk\.ru\/tgf\//gi, "https://filestore.pro-talk.ru/");
  if (normalized.startsWith("/")) {
    normalized = `${origin.replace(/\/+$/, "")}${normalized}`;
  } else if (/^https?:\/\/(?:localhost|127\.0\.0\.1)/i.test(normalized)) {
    normalized = normalized.replace(/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/i, origin.replace(/\/+$/, ""));
  }
  return normalized;
}

/**
 * Normalizes markdown for Telegram RichMessage fallback.
 */
export function prepareRichMarkdown(value: string): string {
  if (typeof value !== "string" || value.length === 0) return "";
  let md = value.trim();

  md = md.replace(/(?:!\[HeroCard\]|HeroCard)\s*\((https?:\/\/[^\s\)]+)\)/gi, "![alt]($1)");
  md = md.replace(/https?:\/\/file\.pro-talk\.ru\/tgf\//gi, "https://filestore.pro-talk.ru/");

  md = md.replace(/!\[(.*?)\]\(\/(?!\/)([^\s\)]+)\)/g, `![$1](${PUBLIC_APP_ORIGIN}/$2)`);
  md = md.replace(
    /!\[(.*?)\]\(https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/([^\s\)]+)\)/g,
    `![$1](${PUBLIC_APP_ORIGIN}/$2)`
  );

  md = md.replace(/([^\n])\n(#{1,4}\s+[^\n]+)/g, "$1\n\n$2");
  md = md.replace(/(#{1,4}\s+[^\n]+)\n([^\n#])/g, "$1\n\n$2");

  md = md.replace(/([^\n\-\*•\d])\n([0-9]+\.\s+)/g, "$1\n\n$2");
  md = md.replace(/([^\n\-\*•])\n([•\-\*]\s+)/g, "$1\n\n$2");
  md = md.replace(/([0-9]+\.\s+[^\n]+)\n([0-9]+\.\s+)/g, "$1\n\n$2");
  md = md.replace(/([•\-\*]\s+[^\n]+)\n([•\-\*]\s+)/g, "$1\n\n$2");
  md = md.replace(/([0-9]+\.\s+[^\n]+)\n([•\-\*]\s+)/g, "$1\n\n$2");
  md = md.replace(/([•\-\*]\s+[^\n]+)\n([0-9]+\.\s+)/g, "$1\n\n$2");

  return md;
}

/**
 * Normalizes Rich HTML for Bot API 10.3.
 */
export function prepareRichHtml(value: string): string {
  if (typeof value !== "string" || value.length === 0) return "";
  let html = value.trim();
  html = html.replace(/https?:\/\/file\.pro-talk\.ru\/tgf\//gi, "https://filestore.pro-talk.ru/");
  html = html.replace(/src=["']\/(?!\/)([^"']+)["']/gi, `src="${PUBLIC_APP_ORIGIN}/$1"`);
  html = html.replace(
    /href=["']https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/([^"']+)["']/gi,
    `href="${PUBLIC_APP_ORIGIN}/$1"`
  );
  return html;
}

/**
 * Sanitizes Rich Blocks according to official Telegram Bot API 10.3 schemas.
 */
export function sanitizeRichBlocks(blocks: InputRichBlock[]): InputRichBlock[] {
  if (!Array.isArray(blocks)) return [];
  return blocks
    .filter((b) => b && typeof b === "object" && typeof b.type === "string")
    .map((block): InputRichBlock => {
      if (block.type === "table") {
        return {
          ...block,
          is_compact: block.is_compact !== false,
          is_bordered: block.is_bordered !== false,
          cells: (block.cells || []).map((row) =>
            row.map((cell) => ({
              ...cell,
              align: cell.align || "left",
              valign: cell.valign || "middle"
            }))
          )
        };
      }
      if (block.type === "buttons") {
        return {
          type: "buttons",
          align: block.align || "left",
          buttons: (block.buttons || []).slice(0, 8).map((btn) => {
            const safeUrl = btn.url
              ? btn.url.replace(/^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/i, PUBLIC_APP_ORIGIN)
              : undefined;
            // Bot API 10.3 rule: style "link" is allowed only for callback_data buttons, never URL buttons
            const safeStyle = safeUrl && btn.style === "link" ? "primary" : btn.style;
            return {
              ...btn,
              ...(safeStyle ? { style: safeStyle } : {}),
              ...(safeUrl ? { url: safeUrl } : {})
            };
          })
        };
      }
      if (block.type === "photo") {
        return {
          ...block,
          photo: {
            ...block.photo,
            type: "photo",
            media: normalizeTelegramMediaUrl(block.photo.media)
          }
        };
      }
      if (block.type === "video") {
        return {
          ...block,
          video: {
            ...block.video,
            type: "video",
            media: normalizeTelegramMediaUrl(block.video.media),
            supports_streaming: block.video.supports_streaming !== false
          }
        };
      }
      if (block.type === "document") {
        return {
          ...block,
          document: {
            ...block.document,
            type: "document",
            media: normalizeTelegramMediaUrl(block.document.media)
          }
        };
      }
      if (block.type === "details") {
        return {
          ...block,
          blocks: sanitizeRichBlocks(block.blocks || [])
        };
      }
      return block;
    });
}

/**
 * Builds an official Bot API 10.3 InputRichMessage payload.
 * Sends strictly one mutually exclusive format (`blocks` > `html` > `markdown`)
 * while returning `fallbackMarkdown` and `logText` for gateway downgrade & DB logging.
 */
export function buildInputRichMessage(opts: {
  markdown?: string;
  html?: string;
  blocks?: InputRichBlock[];
}): { richMessage: InputRichMessage; logText: string; fallbackMarkdown: string } {
  const richMessage: InputRichMessage = {};
  let fallbackMarkdown = "";

  if (opts.markdown && opts.markdown.trim().length > 0) {
    let safeMd = prepareRichMarkdown(opts.markdown);
    if (safeMd.length > RICH_MESSAGE_MAX_CHARS) {
      safeMd =
        safeMd.slice(0, RICH_MESSAGE_MAX_CHARS - 120) +
        "\n\n... [текст рапорта сокращен по лимиту Telegram, полный отчет в кабинете]";
    }
    fallbackMarkdown = safeMd;
  }

  if (Array.isArray(opts.blocks) && opts.blocks.length > 0) {
    richMessage.blocks = sanitizeRichBlocks(opts.blocks);
    if (!fallbackMarkdown) {
      fallbackMarkdown = prepareRichMarkdown(richBlocksToFallbackText(richMessage.blocks));
    }
  } else if (opts.html && opts.html.trim().length > 0) {
    let safeHtml = prepareRichHtml(opts.html);
    if (safeHtml.length > RICH_MESSAGE_MAX_CHARS) {
      safeHtml =
        safeHtml.slice(0, RICH_MESSAGE_MAX_CHARS - 120) +
        "\n\n<i>... [отчет сокращен по лимиту Telegram, полная версия в кабинете]</i>";
    }
    richMessage.html = safeHtml;
    if (!fallbackMarkdown) fallbackMarkdown = richHtmlToFallbackText(safeHtml);
  } else {
    richMessage.markdown = fallbackMarkdown;
  }

  return { richMessage, logText: fallbackMarkdown, fallbackMarkdown };
}

/**
 * Converts InputRichBlock[] into clean Rich Markdown fallback text.
 */
export function richBlocksToFallbackText(blocks: InputRichBlock[]): string {
  if (!Array.isArray(blocks) || blocks.length === 0) return "";
  const lines: string[] = [];

  for (const b of blocks) {
    switch (b.type) {
      case "heading": {
        const hashes = "#".repeat(Math.min(4, Math.max(1, b.size || 2)));
        lines.push(`${hashes} ${b.text}`);
        break;
      }
      case "paragraph":
        lines.push(b.text);
        break;
      case "expandable_blockquote": {
        const prefix = b.credit ? `**${b.credit}**\n` : "";
        const body = String(b.text || "")
          .split("\n")
          .map((l) => `> ${l}`)
          .join("\n");
        lines.push(`${prefix}${body}`);
        break;
      }
      case "details": {
        const inner = richBlocksToFallbackText(b.blocks || []);
        lines.push(`**${b.summary}**\n${inner}`);
        break;
      }
      case "table": {
        const rows = b.cells || [];
        if (b.caption) lines.push(`### ${b.caption}`);
        if (rows.length > 0) {
          const tableLines: string[] = [];
          rows.forEach((row, rIdx) => {
            tableLines.push(
              "| " +
                row
                  .map((c) => (c.is_header ? `**${c.text || ""}**` : c.text || "").replace(/\|/g, "/"))
                  .join(" | ") +
                " |"
            );
            if (rIdx === 0) {
              tableLines.push("| " + row.map(() => ":---").join(" | ") + " |");
            }
          });
          lines.push(tableLines.join("\n"));
        }
        break;
      }
      case "list":
        (b.items || []).forEach((it, idx) => {
          const itemTxt = richBlocksToFallbackText(it.blocks || []).replace(/\n+/g, " ");
          const prefix = it.value ? `${it.value}.` : "•";
          lines.push(`${prefix} ${itemTxt || `Пункт ${idx + 1}`}`);
        });
        break;
      case "buttons": {
        const btns = (b.buttons || [])
          .map((btn) => (btn.url ? `[${btn.text}](${btn.url})` : btn.text))
          .filter(Boolean);
        if (btns.length > 0) lines.push(btns.join("  •  "));
        break;
      }
      case "photo":
        lines.push(`![${b.caption?.text || "Изображение"}](${b.photo.media})`);
        break;
      case "video":
        lines.push(`[🎥 ${b.caption?.text || "Видео"}](${b.video.media})`);
        break;
      case "document":
        lines.push(`[📎 ${b.caption?.text || "Документ"}](${b.document.media})`);
        break;
      case "divider":
        lines.push("---");
        break;
    }
  }

  return lines.join("\n\n");
}

/**
 * Converts Bot API 10.3 Rich HTML tags into clean standard Markdown/text fallback.
 */
export function richHtmlToFallbackText(html: string): string {
  if (!html) return "";
  return html
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_m, inner) => `> ${inner.trim()}`)
    .replace(/<tg-button[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/tg-button>/gi, "[$2]($1)")
    .replace(/<\/?(?:tg-button-row|table|tbody|thead|tr)[^>]*>/gi, "\n")
    .replace(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi, "$1 | ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|h[1-6]|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Checks whether a failure indicates unsupported Rich features or transient media fetch issues on a gateway.
 */
export function isRichMethodUnsupportedError(description?: string): boolean {
  if (!description || typeof description !== "string") return false;
  return /unknown method|not found|unsupported|can't parse InputRichBlock|rich_message|expandable|tg-button/i.test(
    description
  );
}

export function isRichMediaFetchError(description?: string): boolean {
  if (!description || typeof description !== "string") return false;
  return /failed to get HTTP URL content|WEBPAGE_CURL_FAILED|wrong file identifier|wrong type of the web page content|FILE_REFERENCE|Bad Request: media/i.test(
    description
  );
}
