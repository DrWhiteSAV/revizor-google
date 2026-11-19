import { InputRichBlock, RichBlockTableCell, RichMessageButton, richBlocksToFallbackText } from "./richApi10";

export interface BuiltRichPayload {
  blocks: InputRichBlock[];
  fallbackMarkdown: string;
  buttonsString: string;
}

export interface MediaAttachmentItem {
  name?: string;
  url: string;
  type?: string;
}

function cleanStr(val: any): string {
  if (val === undefined || val === null) return "";
  const s = String(val)
    .replace(/\\([_*[\]()~`>#+\-=|{}.!])/g, "$1")
    .trim();
  if (!s || s === "[object Object]" || s === "undefined" || s === "null") return "";
  return s;
}

function cell(text: string, isHeader = false): RichBlockTableCell {
  return {
    text,
    ...(isHeader ? { is_header: true } : {}),
    align: "left",
    valign: "middle"
  };
}

function toButtonsString(btns: RichMessageButton[]): string {
  return btns
    .filter((b) => b.text && b.url)
    .map((b) => `${b.text}|${b.url}`)
    .join(";");
}

function resolvePublicUrl(rawUrl: string, origin: string): string {
  const s = cleanStr(rawUrl);
  if (!s) return "";
  if (s.startsWith("tg://")) return s;
  const normalized = s.replace(/https?:\/\/file\.pro-talk\.ru\/tgf\//gi, "https://filestore.pro-talk.ru/");
  if (normalized.startsWith("/")) return `${origin.replace(/\/+$/, "")}${normalized}`;
  if (/https?:\/\/(?:localhost|127\.0\.0\.1)/i.test(normalized)) {
    return normalized.replace(/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/i, origin.replace(/\/+$/, ""));
  }
  return normalized;
}

function makeParagraphListItems(items: string[], ordered = true) {
  return items
    .map((x) => cleanStr(x))
    .filter(Boolean)
    .slice(0, 10)
    .map((text, idx) => ({
      blocks: [{ type: "paragraph" as const, text }],
      ...(ordered ? { value: idx + 1, type: "1" as const, label: `${idx + 1}.` } : {})
    }));
}

function appendMediaBlocks(
  blocks: InputRichBlock[],
  origin: string,
  media: {
    imageFiles?: MediaAttachmentItem[];
    videoFiles?: MediaAttachmentItem[];
    otherFiles?: MediaAttachmentItem[];
  }
) {
  for (const img of (media.imageFiles || []).slice(0, 5)) {
    const u = resolvePublicUrl(img.url, origin);
    if (u) {
      blocks.push({
        type: "photo",
        photo: { type: "photo", media: u },
        caption: { text: `🖼 ${cleanStr(img.name) || "Фотоотчет"}` }
      });
    }
  }

  for (const vid of (media.videoFiles || []).slice(0, 3)) {
    const u = resolvePublicUrl(vid.url, origin);
    if (u) {
      blocks.push({
        type: "video",
        video: { type: "video", media: u, supports_streaming: true },
        caption: { text: `🎥 ${cleanStr(vid.name) || "Видеоотчет"}` }
      });
    }
  }

  for (const doc of (media.otherFiles || []).slice(0, 5)) {
    const u = resolvePublicUrl(doc.url, origin);
    if (u) {
      blocks.push({
        type: "document",
        document: { type: "document", media: u },
        caption: { text: `📎 ${cleanStr(doc.name) || "Прикрепленный документ"}` }
      });
    }
  }
}

/**
 * Splits arbitrary file attachments into images, videos, and documents.
 */
export function classifyAttachmentFiles(files: MediaAttachmentItem[]): {
  imageFiles: MediaAttachmentItem[];
  videoFiles: MediaAttachmentItem[];
  otherFiles: MediaAttachmentItem[];
} {
  const imageFiles: MediaAttachmentItem[] = [];
  const videoFiles: MediaAttachmentItem[] = [];
  const otherFiles: MediaAttachmentItem[] = [];
  const seen = new Set<string>();

  for (const f of files || []) {
    if (!f || !f.url) continue;
    const rawUrl = String(f.url).trim();
    if (!rawUrl || seen.has(rawUrl)) continue;
    seen.add(rawUrl);

    const mime = String(f.type || "").toLowerCase();
    const nameOrUrl = `${f.name || ""} ${rawUrl}`;

    if (mime.startsWith("image/") || rawUrl.startsWith("tg://photo") || /\.(jpg|jpeg|png|webp|gif|bmp)(\?.*)?$/i.test(nameOrUrl)) {
      imageFiles.push(f);
    } else if (mime.startsWith("video/") || rawUrl.startsWith("tg://video") || /\.(mp4|mov|webm|mkv|avi|m4v)(\?.*)?$/i.test(nameOrUrl)) {
      videoFiles.push(f);
    } else {
      otherFiles.push(f);
    }
  }

  return { imageFiles, videoFiles, otherFiles };
}

/**
 * 1. Daily Reports (Brief & Full, Employee & Reviewer) using official Bot API 10.3 Rich Blocks:
 *    - Heading + compact native table (is_compact: true)
 *    - Expandable blockquotes / details for detailed answers & AI summary
 *    - Unified inline photo, video, and document blocks in ONE message
 *    - Styled inline URL buttons inside the message flow (no raw links in text)
 */
export function buildDailyReportRichPayload(opts: {
  mode: "brief" | "full";
  isReviewer: boolean;
  ruleNote?: string;
  templateTitle: string;
  employeeName: string;
  departmentName?: string;
  dateStr: string;
  score: number;
  statusIcon: string;
  answersText?: string;
  briefSummaryText?: string;
  aiSummary?: string;
  aiRecommendations?: string;
  aiMotivation?: string;
  aiPlanItems?: string[];
  imageFiles?: MediaAttachmentItem[];
  videoFiles?: MediaAttachmentItem[];
  otherFiles?: MediaAttachmentItem[];
  targetUrl: string;
  secondaryUrl?: string;
  origin: string;
  legacyMarkdown?: string;
}): BuiltRichPayload {
  const blocks: InputRichBlock[] = [];
  const buttonTitle = opts.isReviewer
    ? "🔍 Проверить отчет"
    : opts.mode === "brief"
      ? "📋 Открыть полный отчет"
      : "🌐 Открыть вердикт ИИ";

  if (opts.isReviewer) {
    blocks.push({
      type: "heading",
      size: 1,
      text: "📢 Новый отчет ожидает проверки руководителя"
    });
    if (opts.ruleNote) {
      blocks.push({
        type: "paragraph",
        text: `Правило маршрутизации: ${cleanStr(opts.ruleNote)}`
      });
    }
  } else {
    blocks.push({
      type: "heading",
      size: 1,
      text: opts.mode === "brief" ? "📋 Краткий отчет по рапорту" : `📋 Отчет: ${cleanStr(opts.templateTitle)}`
    });
  }

  blocks.push({
    type: "heading",
    size: 2,
    text: `${opts.statusIcon} Оценка эффективности ИИ: ${opts.score}/100`
  });

  const metaRows: RichBlockTableCell[][] = [
    [cell("Параметр", true), cell("Значение", true)],
    [cell("Сотрудник"), cell(cleanStr(opts.employeeName) || "Сотрудник")],
    [cell("Шаблон"), cell(cleanStr(opts.templateTitle) || "Рапорт")],
    [cell("Время сдачи"), cell(cleanStr(opts.dateStr))],
    [cell("Оценка качества"), cell(`${opts.score}/100 ${opts.statusIcon}`)]
  ];
  if (opts.departmentName) {
    metaRows.splice(2, 0, [cell("Отдел"), cell(cleanStr(opts.departmentName))]);
  }

  blocks.push({
    type: "table",
    is_compact: true,
    is_bordered: true,
    is_striped: true,
    cells: metaRows
  });

  if (opts.mode === "brief") {
    const briefBody = cleanStr(opts.briefSummaryText) || cleanStr(opts.aiSummary) || cleanStr(opts.aiRecommendations);
    if (briefBody) {
      blocks.push({
        type: "expandable_blockquote",
        text: briefBody.slice(0, 3500),
        credit: "📊 Краткая выжимка ИИ (нажмите, чтобы развернуть)"
      });
    }
    // In brief mode attach up to 1 photo preview if present
    appendMediaBlocks(blocks, opts.origin, {
      imageFiles: (opts.imageFiles || []).slice(0, 1)
    });
  } else {
    if (opts.answersText && cleanStr(opts.answersText)) {
      blocks.push({
        type: "expandable_blockquote",
        text: cleanStr(opts.answersText).slice(0, 14000),
        credit: "📝 Заполненные ответы по рапорту (раскрыть)"
      });
    }

    const aiBlocksText = [
      opts.aiSummary ? `Резюме: ${cleanStr(opts.aiSummary)}` : "",
      opts.aiRecommendations ? `Рекомендации: ${cleanStr(opts.aiRecommendations)}` : "",
      opts.aiMotivation ? `Мотивация: ${cleanStr(opts.aiMotivation)}` : ""
    ]
      .filter(Boolean)
      .join("\n\n");

    if (aiBlocksText) {
      blocks.push({
        type: "expandable_blockquote",
        text: aiBlocksText.slice(0, 4500),
        credit: "🤖 Аналитика и рекомендации ИИ-Рапорт"
      });
    }

    if (Array.isArray(opts.aiPlanItems) && opts.aiPlanItems.length > 0) {
      const listItems = makeParagraphListItems(opts.aiPlanItems, true);
      if (listItems.length > 0) {
        blocks.push({
          type: "heading",
          size: 3,
          text: "🎯 План действий на следующую смену"
        });
        blocks.push({
          type: "list",
          items: listItems
        });
      }
    }

    // Unified inline photos, videos, and documents inside ONE rich message
    appendMediaBlocks(blocks, opts.origin, {
      imageFiles: opts.imageFiles,
      videoFiles: opts.videoFiles,
      otherFiles: opts.otherFiles
    });
  }

  const btns: RichMessageButton[] = [
    {
      text: buttonTitle,
      url: opts.targetUrl,
      style: opts.isReviewer ? "success" : "primary"
    }
  ];
  if (opts.secondaryUrl) {
    btns.push({
      text: "📊 Аналитика смены",
      url: opts.secondaryUrl,
      style: "primary"
    });
  }
  blocks.push({ type: "buttons", align: "left", buttons: btns });

  const fallbackMarkdown = opts.legacyMarkdown
    ? opts.legacyMarkdown
    : richBlocksToFallbackText(blocks);

  return {
    blocks,
    fallbackMarkdown,
    buttonsString: toButtonsString(btns)
  };
}

/**
 * 2. Manager Review & Employee Edit Acceptance (Bot API 10.3 Rich Blocks)
 */
export function buildManagerReviewRichPayload(opts: {
  kind: "review" | "edits_accepted";
  reportTitle: string;
  personName: string;
  score?: number;
  reaction?: string;
  comment?: string;
  nextTasks?: string;
  url: string;
}): BuiltRichPayload {
  const isReview = opts.kind === "review";
  const blocks: InputRichBlock[] = [
    {
      type: "heading",
      size: 1,
      text: isReview ? "📋 Рецензия руководителя на ваш отчет" : "🤝 Сотрудник принял ваши правки"
    },
    {
      type: "table",
      is_compact: true,
      is_bordered: true,
      is_striped: true,
      cells: isReview
        ? [
            [cell("Параметр", true), cell("Значение", true)],
            [cell("Отчет"), cell(cleanStr(opts.reportTitle))],
            [cell("Проверил"), cell(cleanStr(opts.personName))],
            [cell("Оценка руководителя"), cell(`${opts.score ?? 0}/100`)],
            ...(opts.reaction ? [[cell("Реакция"), cell(cleanStr(opts.reaction))]] : [])
          ]
        : [
            [cell("Параметр", true), cell("Значение", true)],
            [cell("Сотрудник"), cell(cleanStr(opts.personName))],
            [cell("Отчет"), cell(cleanStr(opts.reportTitle))],
            [cell("Статус"), cell("Замечания и поручения приняты в работу")]
          ]
    }
  ];

  if (opts.comment) {
    blocks.push({
      type: "expandable_blockquote",
      text: cleanStr(opts.comment),
      credit: "💬 Комментарий руководителя"
    });
  }
  if (opts.nextTasks) {
    blocks.push({
      type: "expandable_blockquote",
      text: cleanStr(opts.nextTasks),
      credit: "🎯 Поручения на следующую смену"
    });
  }

  const btns: RichMessageButton[] = [
    {
      text: isReview ? "👁 Смотреть рецензию" : "🔍 Открыть отчет",
      url: opts.url,
      style: isReview ? "primary" : "success"
    }
  ];
  blocks.push({ type: "buttons", align: "left", buttons: btns });

  const fallbackMarkdown = richBlocksToFallbackText(blocks);
  return { blocks, fallbackMarkdown, buttonsString: toButtonsString(btns) };
}

/**
 * 3. AI Revisor Task Event Notifications (Bot API 10.3 Rich Blocks + Photo/Video/Doc)
 */
export function buildTaskEventRichPayload(opts: {
  eventType: string;
  format: "brief" | "full";
  projectTitle: string;
  taskTitle: string;
  authorName: string;
  executorName: string;
  submitterName?: string;
  deadline: string;
  score?: number;
  riskScore?: number;
  statusText: string;
  answeredCount?: number;
  totalFields?: number;
  answersText?: string;
  aiSummary?: string;
  aiRecommendations?: string;
  managerComment?: string;
  description?: string;
  reasonText?: string;
  upstreamTaskTitle?: string;
  newDeadline?: string;
  shiftDays?: number;
  progressPercent?: number;
  imageFiles?: MediaAttachmentItem[];
  videoFiles?: MediaAttachmentItem[];
  otherFiles?: MediaAttachmentItem[];
  origin?: string;
  taskLink: string;
  legacyMarkdown?: string;
}): BuiltRichPayload {
  const titleMap: Record<string, string> = {
    task_ai_verified: opts.format === "brief" ? "📋 Краткий отчет по задаче" : `📋 Отчет по задаче: ${cleanStr(opts.taskTitle)}`,
    task_submitted: "⏳ Задача передана на проверку",
    task_manager_reviewed: "👔 Рецензия руководителя на задачу",
    task_rescheduled: "🔄 Сдвиг дедлайна по задаче",
    task_reminder: "⏰ Напоминание о скором дедлайне",
    task_overdue: "🚨 Просрочена задача проекта",
    task_checkin_nudge: "🤝 Плановый чекин ИИ-Ревизора",
    task_upstream_risk: "⚠️ Риск по связанной задаче",
    task_shift_requested: "📅 Запрос на перенос срока",
    task_escalation: "🔺 Эскалация риска срыва задачи"
  };

  const rows: RichBlockTableCell[][] = [
    [cell("Параметр", true), cell("Значение", true)],
    [cell("Проект"), cell(cleanStr(opts.projectTitle))],
    [cell("Задача"), cell(cleanStr(opts.taskTitle))],
    [cell("Ответственный"), cell(cleanStr(opts.executorName))],
    [cell("Срок"), cell(cleanStr(opts.newDeadline || opts.deadline))]
  ];

  if (opts.authorName) rows.push([cell("Постановщик"), cell(cleanStr(opts.authorName))]);
  if (opts.submitterName) rows.push([cell("Фактически сдал(а)"), cell(cleanStr(opts.submitterName))]);
  if (typeof opts.score === "number" && ["task_ai_verified", "task_manager_reviewed"].includes(opts.eventType)) {
    rows.push([cell("Оценка"), cell(`${opts.score}/100`)]);
  }
  if (typeof opts.riskScore === "number") {
    rows.push([cell("Индекс риска"), cell(`${opts.riskScore}/100`)]);
  }
  if (typeof opts.progressPercent === "number" && opts.eventType === "task_checkin_nudge") {
    rows.push([cell("Прогресс"), cell(`${opts.progressPercent}%`)]);
  }
  if (opts.statusText) {
    rows.push([cell("Статус"), cell(cleanStr(opts.statusText))]);
  }

  const blocks: InputRichBlock[] = [
    { type: "heading", size: 1, text: titleMap[opts.eventType] || `📋 Задача: ${cleanStr(opts.taskTitle)}` },
    { type: "table", is_compact: true, is_bordered: true, is_striped: true, cells: rows }
  ];

  if (opts.upstreamTaskTitle) {
    blocks.push({
      type: "paragraph",
      text: `Предшествующий этап с задержкой: ${cleanStr(opts.upstreamTaskTitle)}`
    });
  }

  const noteBody = cleanStr(opts.reasonText || opts.managerComment || opts.aiSummary || opts.aiRecommendations);
  if (noteBody) {
    blocks.push({
      type: "expandable_blockquote",
      text: noteBody.slice(0, 3500),
      credit: opts.eventType === "task_manager_reviewed" ? "💬 Комментарий руководителя" : "💡 Вывод и рекомендации ИИ"
    });
  }

  if (opts.format === "full" && opts.answersText && cleanStr(opts.answersText)) {
    blocks.push({
      type: "expandable_blockquote",
      text: cleanStr(opts.answersText).slice(0, 10000),
      credit: "📝 Заполненные карточки подтверждения (раскрыть)"
    });
  }

  if (opts.format === "full" && opts.description && cleanStr(opts.description)) {
    blocks.push({
      type: "expandable_blockquote",
      text: cleanStr(opts.description).slice(0, 2500),
      credit: "📋 Регламент задачи"
    });
  }

  if (opts.format === "full") {
    appendMediaBlocks(blocks, opts.origin || "https://ii-rr.ru", {
      imageFiles: opts.imageFiles,
      videoFiles: opts.videoFiles,
      otherFiles: opts.otherFiles
    });
  }

  const btns: RichMessageButton[] = [];
  if (opts.eventType === "task_checkin_nudge") {
    btns.push({ text: "✅ Отметить прогресс", url: `${opts.taskLink}?action=checkin`, style: "primary" });
    btns.push({ text: "🤝 Помощь ИИ", url: `${opts.taskLink}?action=help`, style: "danger" });
  } else if (opts.eventType === "task_reminder") {
    btns.push({ text: "✨ Предпроверка черновика", url: `${opts.taskLink}?action=preflight`, style: "primary" });
    btns.push({ text: "📋 Открыть задачу", url: opts.taskLink, style: "success" });
  } else if (opts.eventType === "task_submitted") {
    btns.push({ text: "🔍 Проверить задачу", url: opts.taskLink, style: "success" });
  } else if (opts.eventType === "task_escalation" || opts.eventType === "task_overdue") {
    btns.push({ text: "🚨 Разобрать риск в кабинете", url: `${opts.taskLink}?action=help`, style: "danger" });
  } else if (opts.eventType === "task_shift_requested") {
    btns.push({ text: "📅 Согласовать перенос", url: `${opts.taskLink}?action=checkin`, style: "primary" });
  } else {
    btns.push({ text: "🌐 Открыть задачу в кабинете", url: opts.taskLink, style: "primary" });
  }

  blocks.push({ type: "buttons", align: "left", buttons: btns });

  return {
    blocks,
    fallbackMarkdown: opts.legacyMarkdown || richBlocksToFallbackText(blocks),
    buttonsString: toButtonsString(btns)
  };
}

/**
 * 4. Morning Focus Brief & Evening Director Risk Radar (Bot API 10.3 Rich Blocks)
 */
export function buildMorningBriefRichPayload(opts: {
  employeeName: string;
  totalActive: number;
  tasks: Array<{ title: string; deadline: string; riskScore: number }>;
  revisorUrl: string;
}): BuiltRichPayload {
  const tableRows: RichBlockTableCell[][] = [
    [cell("Задача", true), cell("Срок", true), cell("Риск", true)],
    ...opts.tasks.map((t) => [
      cell(cleanStr(t.title).slice(0, 60)),
      cell(cleanStr(t.deadline).slice(0, 10) || "—"),
      cell(t.riskScore >= 55 ? `⚠️ ${t.riskScore}` : `${t.riskScore}`)
    ])
  ];

  const blocks: InputRichBlock[] = [
    { type: "heading", size: 1, text: `☀️ Доброе утро, ${cleanStr(opts.employeeName) || "коллега"}!` },
    { type: "paragraph", text: `Фокус-план на смену. Всего активных задач: ${opts.totalActive}.` },
    { type: "table", is_compact: true, is_bordered: true, is_striped: true, cells: tableRows },
    {
      type: "expandable_blockquote",
      text: "В любой карточке задачи доступна черновая предпроверка без выставления оценки и кнопка «Помощь ИИ с затруднением».",
      credit: "💡 Совет ИИ-Ревизора"
    },
    {
      type: "buttons",
      align: "left",
      buttons: [{ text: "📋 Открыть задачи", url: opts.revisorUrl, style: "primary" }]
    }
  ];

  return {
    blocks,
    fallbackMarkdown: richBlocksToFallbackText(blocks),
    buttonsString: `📋 Открыть задачи|${opts.revisorUrl}`
  };
}

export function buildEveningRadarRichPayload(opts: {
  activeCount: number;
  highRiskCount: number;
  stuckCount: number;
  riskTasks: Array<{ title: string; executorName: string; riskScore: number; deadline: string }>;
  doctorUrl: string;
}): BuiltRichPayload {
  const blocks: InputRichBlock[] = [
    { type: "heading", size: 1, text: "🌙 Вечерний радар руководителя (ИИ-Ревизор)" },
    {
      type: "table",
      is_compact: true,
      is_bordered: true,
      is_striped: true,
      cells: [
        [cell("Активных", true), cell("В зоне риска", true), cell("Затруднения", true)],
        [cell(String(opts.activeCount)), cell(String(opts.highRiskCount)), cell(String(opts.stuckCount))]
      ]
    }
  ];

  if (opts.riskTasks.length > 0) {
    blocks.push({
      type: "table",
      caption: "Фокус внимания на завтра",
      is_compact: true,
      is_bordered: true,
      is_striped: true,
      cells: [
        [cell("Задача", true), cell("Исполнитель", true), cell("Риск", true), cell("Срок", true)],
        ...opts.riskTasks.slice(0, 5).map((t) => [
          cell(cleanStr(t.title).slice(0, 48)),
          cell(cleanStr(t.executorName).slice(0, 28)),
          cell(`${t.riskScore}/100`),
          cell(cleanStr(t.deadline).slice(0, 10) || "—")
        ])
      ]
    });
  } else {
    blocks.push({ type: "paragraph", text: "✅ Критических блокеров по проектам не выявлено." });
  }

  const btns: RichMessageButton[] = [
    {
      text: "🩺 ИИ-Доктор проектов",
      url: opts.doctorUrl,
      style: opts.highRiskCount > 0 ? "danger" : "primary"
    }
  ];
  blocks.push({ type: "buttons", align: "left", buttons: btns });

  return {
    blocks,
    fallbackMarkdown: richBlocksToFallbackText(blocks),
    buttonsString: toButtonsString(btns)
  };
}

/**
 * 5. Daily Report Cron Reminders (-15m / Deadline) & Overdue List (+15m)
 */
export function buildCronReportAlertRichPayload(opts: {
  kind: "reminder" | "deadline" | "overdue_list";
  templateTitle: string;
  deadlineTime: string;
  timezone: string;
  employeeName?: string;
  reminderMessage?: string;
  unsubmittedEmployees?: Array<{ name: string; profileUrl: string; tgLabel: string }>;
  actionUrl: string;
}): BuiltRichPayload {
  if (opts.kind === "overdue_list") {
    const emps = opts.unsubmittedEmployees || [];
    const blocks: InputRichBlock[] = [
      {
        type: "heading",
        size: 1,
        text: "⚠️ Сотрудники, не сдавшие отчет (+15 мин после дедлайна)"
      },
      {
        type: "table",
        is_compact: true,
        is_bordered: true,
        is_striped: true,
        cells: [
          [cell("Параметр", true), cell("Значение", true)],
          [cell("Отчет"), cell(cleanStr(opts.templateTitle))],
          [cell("Дедлайн"), cell(`${cleanStr(opts.deadlineTime)} (${cleanStr(opts.timezone)})`)],
          [cell("Не сдали"), cell(`${emps.length} чел.`)]
        ]
      }
    ];

    if (emps.length > 0) {
      blocks.push({
        type: "table",
        caption: `🔴 Список не сдавших (${emps.length} чел.)`,
        is_compact: true,
        is_bordered: true,
        is_striped: true,
        cells: [
          [cell("Сотрудник", true), cell("Telegram", true)],
          ...emps.slice(0, 15).map((e) => [cell(cleanStr(e.name)), cell(cleanStr(e.tgLabel))])
        ]
      });
    }

    const btns: RichMessageButton[] = [
      { text: "📊 Открыть сводку в кабинете", url: opts.actionUrl, style: "danger" }
    ];
    blocks.push({ type: "buttons", align: "left", buttons: btns });

    return {
      blocks,
      fallbackMarkdown: richBlocksToFallbackText(blocks),
      buttonsString: toButtonsString(btns)
    };
  }

  const isDeadline = opts.kind === "deadline";
  const blocks: InputRichBlock[] = [
    {
      type: "heading",
      size: 1,
      text: isDeadline ? "🔔 Дедлайн сдачи отчета!" : "🔔 Напоминание о рапорте (-15 минут)"
    },
    {
      type: "table",
      is_compact: true,
      is_bordered: true,
      is_striped: true,
      cells: [
        [cell("Отчет", true), cell(cleanStr(opts.templateTitle), true)],
        [cell("Сотрудник"), cell(cleanStr(opts.employeeName || "Сотрудник"))],
        [cell("Время сдачи"), cell(`${cleanStr(opts.deadlineTime)} (${cleanStr(opts.timezone)})`)]
      ]
    }
  ];
  if (opts.reminderMessage) {
    blocks.push({
      type: "expandable_blockquote",
      text: cleanStr(opts.reminderMessage),
      credit: "💡 Комментарий к сдаче"
    });
  }
  const btns: RichMessageButton[] = [
    {
      text: "📝 Заполнить отчет",
      url: opts.actionUrl,
      style: isDeadline ? "danger" : "primary"
    }
  ];
  blocks.push({ type: "buttons", align: "left", buttons: btns });

  return {
    blocks,
    fallbackMarkdown: richBlocksToFallbackText(blocks),
    buttonsString: toButtonsString(btns)
  };
}

/**
 * 6. Motivation Accrual DM Notification (Bot API 10.3 Rich Blocks + Inline Buttons)
 */
export function buildMotivationAccrualRichPayload(opts: {
  accrualDate: string;
  periodMonth: string;
  employeeName: string;
  calculatorTitle: string;
  shiftLabel: string;
  workedHours: number;
  plannedHours: number;
  workingShiftsInMonth: number;
  schedulePacePct: number;
  overtimeHours: number;
  undertimeHours: number;
  fixedBaseStr: string;
  overtimeBonusStr?: string;
  undertimePenaltyStr?: string;
  kpiTotalStr: string;
  totalEarnedStr: string;
  monthToDateTotalStr: string;
  kpiItems: Array<{
    title: string;
    deltaTodayStr: string;
    completionPct: number;
    matchedGradeLabel: string;
  }>;
  missingMorningReport?: boolean;
  morningWarning?: string | null;
  historyUrl: string;
  motivationUrl: string;
}): BuiltRichPayload {
  const safeEmp = cleanStr(opts.employeeName) || "Специалист";
  const safeCalc = cleanStr(opts.calculatorTitle) || "Схема мотивации";
  const safeShift = cleanStr(opts.shiftLabel) || "Основная смена";

  const headingText = opts.missingMorningReport
    ? `⚠️ Расчет заработка за ${cleanStr(opts.accrualDate)} (нужен утренний отчет)`
    : `🪙 Расчет заработка за ${cleanStr(opts.accrualDate)}`;

  const summaryHeading = `💰 Итого за смену: ${cleanStr(opts.totalEarnedStr)} · За ${cleanStr(opts.periodMonth)}: ${cleanStr(opts.monthToDateTotalStr)}`;

  const tableCells: RichBlockTableCell[][] = [
    [cell("Показатель", true), cell("Значение", true)],
    [cell("Специалист"), cell(safeEmp)],
    [cell("Схема"), cell(`«${safeCalc}» (${safeShift})`)],
    [
      cell("Отработано"),
      cell(`${opts.workedHours} ч из ${opts.plannedHours} ч (смен в мес.: ${opts.workingShiftsInMonth}, темп: ${opts.schedulePacePct}%)`)
    ],
    [cell("Оклад за смену"), cell(cleanStr(opts.fixedBaseStr))]
  ];

  if (opts.overtimeHours > 0 && opts.overtimeBonusStr) {
    tableCells.push([
      cell(`Переработка (+${opts.overtimeHours} ч)`),
      cell(`+${cleanStr(opts.overtimeBonusStr)}`)
    ]);
  }
  if (opts.undertimeHours > 0 && opts.undertimePenaltyStr) {
    tableCells.push([
      cell(`Недоработка (-${opts.undertimeHours} ч)`),
      cell(`-${cleanStr(opts.undertimePenaltyStr)}`)
    ]);
  }

  tableCells.push([cell("Переменная часть (KPI)"), cell(cleanStr(opts.kpiTotalStr))]);
  tableCells.push([cell("Итого за смену", true), cell(cleanStr(opts.totalEarnedStr), true)]);
  tableCells.push([cell(`Накоплено за ${cleanStr(opts.periodMonth)}`), cell(cleanStr(opts.monthToDateTotalStr))]);

  const kpiDetailLines =
    opts.kpiItems && opts.kpiItems.length > 0
      ? opts.kpiItems
          .map(
            (k) =>
              `• ${cleanStr(k.title)}: ${cleanStr(k.deltaTodayStr)} (выполнение ${k.completionPct}%, грейд: ${cleanStr(k.matchedGradeLabel) || "—"})`
          )
          .join("\n")
      : "• Переменная часть KPI по текущей схеме не настроена";

  const blocks: InputRichBlock[] = [
    {
      type: "heading",
      size: 1,
      text: headingText
    },
    {
      type: "heading",
      size: 2,
      text: summaryHeading
    },
    {
      type: "table",
      is_compact: true,
      is_bordered: true,
      is_striped: true,
      cells: tableCells
    },
    {
      type: "expandable_blockquote",
      text: kpiDetailLines,
      credit: "📈 Детализация KPI и грейдов (нажмите, чтобы развернуть)"
    }
  ];

  if (opts.morningWarning) {
    blocks.push({
      type: "paragraph",
      text: `⚠️ ${cleanStr(opts.morningWarning)}`
    });
  }

  const btns: RichMessageButton[] = [
    {
      text: "📊 История расчетов",
      url: opts.historyUrl,
      style: "primary"
    },
    {
      text: "🎯 Схема мотивации",
      url: opts.motivationUrl,
      style: "success"
    }
  ];

  blocks.push({
    type: "buttons",
    align: "left",
    buttons: btns
  });

  return {
    blocks,
    fallbackMarkdown: richBlocksToFallbackText(blocks),
    buttonsString: toButtonsString(btns)
  };
}

