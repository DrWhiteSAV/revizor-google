import express from "express";
import { getDb, generateId } from "../../src/db/initDb";
import { callProTalkAi } from "../protalk";
import { parseMotivationWithAi } from "./motivation/aiBuilder";

const router = express.Router();

let isTableInitialized = false;

function normalizeAcademyRole(rawRole: unknown): "director" | "manager" | "employee" | "guest" {
  const r = String(rawRole || "").trim().toLowerCase();
  if (r === "director" || r === "super_admin" || r === "superadmin" || r === "admin") {
    return "director";
  }
  if (r === "manager" || r === "head_of_department") {
    return "manager";
  }
  if (r === "employee") {
    return "employee";
  }
  return "guest";
}

async function ensureAcademyTable(): Promise<void> {
  if (isTableInitialized) return;
  try {
    const db = await getDb();
    await db.run(`
      CREATE TABLE IF NOT EXISTS academy_posts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        category TEXT NOT NULL,
        target_route TEXT NOT NULL,
        summary TEXT,
        content_markdown TEXT NOT NULL,
        cover_image TEXT,
        order_index INTEGER DEFAULT 0,
        is_published SMALLINT DEFAULT 1,
        target_role TEXT DEFAULT 'all',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    try {
      await db.run("ALTER TABLE academy_posts ADD COLUMN IF NOT EXISTS target_role TEXT DEFAULT 'all'");
    } catch {
      // column already exists
    }

    isTableInitialized = true;
  } catch (err: any) {
    console.error("❌ Failed to initialize academy_posts table in PostgreSQL:", err.message);
  }
}

// GET all posts
router.get("/posts", async (req, res) => {
  try {
    await ensureAcademyTable();
    const db = await getDb();
    const { q, category, role } = req.query;

    let sql = "SELECT * FROM academy_posts WHERE is_published = 1";
    const params: any[] = [];

    if (role && typeof role === "string" && role !== "all") {
      const normRole = normalizeAcademyRole(role);
      if (normRole === "director") {
        // Director has top-level access to everything
      } else if (normRole === "manager") {
        sql += ` AND (target_role IN ('manager', 'employee', 'all') OR target_role IS NULL)`;
      } else if (normRole === "employee") {
        sql += ` AND (target_role IN ('employee', 'all') OR target_role IS NULL)`;
      } else {
        params.push(role);
        sql += ` AND (target_role = $${params.length} OR target_role = 'all')`;
      }
    }

    if (category && typeof category === "string" && category !== "all") {
      params.push(category);
      sql += ` AND category = $${params.length}`;
    }

    if (typeof q === "string" && q.trim()) {
      params.push(`%${q.trim()}%`);
      sql += ` AND (title ILIKE $${params.length} OR summary ILIKE $${params.length} OR content_markdown ILIKE $${params.length})`;
    }

    sql += " ORDER BY order_index ASC, created_at ASC";

    const rows = await db.all(sql, params);
    res.json({ success: true, posts: rows || [] });
  } catch (err: any) {
    console.error("Error fetching academy posts:", err);
    res.status(500).json({ success: false, error: err.message, posts: [] });
  }
});

// GET post by route (Contextual Help in Cabinet with role priority)
router.get("/by-route", async (req, res) => {
  try {
    await ensureAcademyTable();
    const db = await getDb();
    const route = String(req.query.route || "").trim().toLowerCase();
    const normRole = normalizeAcademyRole(req.query.role);

    const allPosts = await db.all("SELECT * FROM academy_posts WHERE is_published = 1 ORDER BY order_index ASC");

    if (!route || !allPosts || allPosts.length === 0) {
      return res.json({ success: true, post: allPosts?.[0] || null });
    }

    // Role-prioritized matching
    let matched = allPosts.find((p: any) => {
      const target = (p.target_route || "").toLowerCase();
      const pRole = String(p.target_role || "all").toLowerCase();
      const roleMatch = normRole === "director" || pRole === normRole || pRole === "all";
      return (target === route || route.includes(target) || target.includes(route)) && roleMatch;
    });

    if (!matched) {
      matched = allPosts.find((p: any) => {
        const target = (p.target_route || "").toLowerCase();
        return target === route || route.includes(target) || target.includes(route);
      });
    }

    if (!matched) {
      if (route.includes("revisor") || route.includes("task")) {
        matched = allPosts.find((p: any) => p.id === "acad-revisor" || p.target_route === "revisor");
      } else if (route.includes("raport") || route.includes("report")) {
        matched = allPosts.find((p: any) => p.id === "acad-fill-report" || p.target_route === "fill_report");
      } else if (route.includes("ship")) {
        matched = allPosts.find((p: any) => p.id === "acad-ship");
      }
    }

    res.json({ success: true, post: matched || allPosts[0] });
  } catch (err: any) {
    console.error("Error finding academy post by route:", err);
    res.status(500).json({ success: false, error: err.message, post: null });
  }
});

// POST Cascade RAG: Grounded assistant & copilot query powered strictly by PostgreSQL BD ProTalk
router.post("/ask-assistant", async (req, res) => {
  try {
    await ensureAcademyTable();
    const db = await getDb();
    const query = req.body.query || req.body.question || req.body.userMessage;
    const rawRole = req.body.role || req.body.userRole || "guest";
    const normRole = normalizeAcademyRole(rawRole);
    const route = String(req.body.route || req.body.currentRoute || "").trim();
    const clientContext = typeof req.body.context === "string" ? req.body.context.trim() : "";
    const userId = req.body.userId || req.body.user_id || "91827364501";
    const history = Array.isArray(req.body.history) ? req.body.history : [];

    if (!query || typeof query !== "string") {
      return res.status(400).json({ success: false, error: "Укажите вопрос" });
    }

    const qLower = query.toLowerCase();
    const rawWords = qLower
      .split(/[\s,?.!;:()«»"']+/)
      .map((w) => w.trim())
      .filter((w) => w.length > 2);

    // Lightweight Russian stem prefixes (4-5 chars) so "стоит"/"стоимость", "тариф"/"тарифы" match cleanly
    const stemTokens = Array.from(
      new Set(
        rawWords.map((w) => (w.length >= 6 ? w.slice(0, 5) : w.length >= 4 ? w.slice(0, 4) : w))
      )
    );

    const wantsTariffs =
      normRole === "guest" ||
      /тариф|цен|стои|скольк|оплат|триал|бесплат|баланс|rr|лимит|подпис|рубл/i.test(query);
    const isExplicitPricingQuestion = /тариф|цен|стои|скольк|оплат|триал|рубл|подпис|roi|лимит/i.test(query);

    // STAGE 1: Load live knowledge indexes from PostgreSQL BD ProTalk (academy_posts, wiki_faq, tariff_pricing, blog_posts)
    const [indexRows, faqRows, tariffRows, blogRows] = await Promise.all([
      db.all(
        "SELECT id, title, category, target_route, target_role, summary FROM academy_posts WHERE is_published = 1 ORDER BY order_index ASC"
      ),
      db.all("SELECT id, category, question, answer, tags FROM wiki_faq").catch(() => []),
      db.all("SELECT id, product_name, price_per_unit, unit_name, trial_limit, description FROM tariff_pricing ORDER BY price_per_unit DESC").catch(() => []),
      db.all("SELECT id, slug, title, category, summary FROM blog_posts ORDER BY created_at DESC LIMIT 20").catch(() => [])
    ]);

    // Filter Academy posts accessible to current role (guest on landing sees general/product guides too for Q&A)
    const allowedRoles =
      normRole === "director"
        ? new Set(["director", "manager", "employee", "all"])
        : normRole === "manager"
        ? new Set(["manager", "employee", "all"])
        : normRole === "employee"
        ? new Set(["employee", "all"])
        : new Set(["director", "manager", "employee", "all"]);

    const candidatePosts = (indexRows || []).filter((p: any) =>
      allowedRoles.has(String(p.target_role || "all").toLowerCase())
    );
    const postsPool = candidatePosts.length > 0 ? candidatePosts : indexRows || [];

    // Score Academy posts by route, role, intent, and Russian stem matches
    const scoredPosts = postsPool
      .map((post: any) => {
        let score = 0;
        const tRoute = (post.target_route || "").toLowerCase();
        const pRole = (post.target_role || "all").toLowerCase();
        const pTitle = (post.title || "").toLowerCase();
        const pSummary = (post.summary || "").toLowerCase();
        const pCat = (post.category || "").toLowerCase();
        const routeLower = route.toLowerCase();

        if (routeLower && routeLower !== "/" && tRoute && (tRoute === routeLower || routeLower.includes(tRoute) || tRoute.includes(routeLower))) {
          score += 8;
        }
        if (normRole !== "guest" && (pRole === normRole || pRole === "all")) {
          score += 3;
        }
        if (isExplicitPricingQuestion && (post.id === "acad-tariffs" || tRoute === "tariffs")) {
          score += 12;
        }
        for (const stem of stemTokens) {
          if (pTitle.includes(stem)) score += 5;
          if (tRoute.includes(stem)) score += 6;
          if (pCat.includes(stem)) score += 3;
          if (pSummary.includes(stem)) score += 2;
        }
        return { post, score };
      })
      .sort((a, b) => b.score - a.score);

    const bestScore = scoredPosts[0]?.score ?? -1;
    let selectedPostId: string = scoredPosts[0]?.post?.id || "";

    // Optional fast neural reranking only when confidence is genuinely low
    if (bestScore < 4 && postsPool.length > 0) {
      const classifierPrompt = `Вам дан вопрос пользователя: "${query}".
Текущий раздел приложения: "${route || "не указан"}".
Роль пользователя: "${normRole}".
Вот список доступных статей Академии из БД (ID: Название [Роль] - Описание):
${postsPool.map((p: any) => `- ${p.id}: ${p.title} [${p.target_role}] - ${p.summary}`).join("\n")}

Определите ровно один самый релевантный ID статьи для ответа. Верните ответ в формате JSON:
{"selectedId": "ID_СТАТЬИ"}`;

      try {
        const classRes = await callProTalkAi({
          prompt: classifierPrompt,
          systemPrompt: "Вы — классификатор запросов к базе знаний. Выберите наиболее подходящую статью в формате JSON.",
          jsonOutput: true,
          userId: String(userId),
          timeoutMs: 4000
        });
        const parsed = JSON.parse(classRes.reply?.replace(/```json/gi, "").replace(/```/g, "").trim() || "{}");
        if (parsed.selectedId && postsPool.some((c: any) => c.id === parsed.selectedId)) {
          selectedPostId = parsed.selectedId;
        }
      } catch {
        // keep top scored post
      }
    }

    // Score matching Wiki FAQ rows from PostgreSQL
    const scoredFaqs = (faqRows || [])
      .map((f: any) => {
        const qText = (f.question || "").toLowerCase();
        const hay = `${f.category || ""} ${qText} ${f.answer || ""} ${f.tags || ""}`.toLowerCase();
        let score = 0;
        for (const stem of stemTokens) {
          if (qText.includes(stem)) score += 4;
          else if (hay.includes(stem)) score += 2;
        }
        return { faq: f, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((x) => x.faq);

    // Score matching Blog rows from PostgreSQL
    const scoredBlogs = (blogRows || [])
      .map((b: any) => {
        const hay = `${b.category || ""} ${b.title || ""} ${b.summary || ""}`.toLowerCase();
        let score = 0;
        for (const stem of stemTokens) {
          if ((b.title || "").toLowerCase().includes(stem)) score += 4;
          else if (hay.includes(stem)) score += 2;
        }
        return { blog: b, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map((x) => x.blog);

    // STAGE 2: Fetch full content_markdown for primary (and optionally secondary) Academy post from PostgreSQL
    const secondaryPostId = scoredPosts.find((x) => x.post?.id !== selectedPostId && x.score >= 5)?.post?.id;
    const selectedRows = selectedPostId
      ? await db.all("SELECT * FROM academy_posts WHERE id = $1 LIMIT 1", [selectedPostId])
      : [];
    const selectedPost = selectedRows[0] || postsPool[0] || null;

    const secondaryRows = secondaryPostId
      ? await db.all("SELECT id, title, summary, content_markdown FROM academy_posts WHERE id = $1 LIMIT 1", [secondaryPostId])
      : [];
    const secondaryPost = secondaryRows[0] || null;

    // Persona prompt strictly aligned with role
    let personaPrompt =
      "Вы — официальный ИИ-Ассистент платформы «ИИ Ревизор & ИИ Рапорт» на публичном сайте. Отвечайте доброжелательно, точно и по делу, опираясь исключительно на актуальные сведения из базы данных ниже.";
    if (normRole === "director") {
      personaPrompt =
        "Вы — ИИ-Копилот Генерального Директора. Отвечайте со стратегической точностью, акцентируя внимание на контроле процессов, оргструктуре, финансовых балансах RR, тарифах и регламентах из базы данных.";
    } else if (normRole === "manager") {
      personaPrompt =
        "Вы — ИИ-Копилот Руководителя подразделения. Отвечайте с упором на управление задачами, проверку рапортов сотрудников, составление сменных графиков и предотвращение срыва дедлайнов, опираясь на базу данных.";
    } else if (normRole === "employee") {
      personaPrompt =
        "Вы — ИИ-Копилот Линейного Сотрудника. Отвечайте понятно, доброжелательно и пошагово, объясняя работу с карточками задач, сдачей рапортов, фото и голосовыми отчетами по данным Академии из БД.";
    }

    // Detect action intent
    let suggestedAction: any = null;
    const isCabinetUser = normRole !== "guest" || route.startsWith("/cabinet");
    const asksAboutMotivation = /мотивац|калькулятор|зарплат|оклад|преми|грейд|переработ|недоработ|kpi|выручк|заработал|начисл/i.test(query);
    const wantsCreateMotivation = /(созда|настро|сдела|собери|добав|придума).*(мотивац|калькулятор|оклад|преми|kpi|грейд)/i.test(query);

    if (isCabinetUser) {
      if (wantsCreateMotivation && (normRole === "director" || normRole === "manager")) {
        suggestedAction = {
          type: "open_modal",
          modal: "motivation_ai_builder",
          label: "Открыть ИИ-калькулятор с этими условиями",
          fields: { prompt: query }
        };
      } else if (asksAboutMotivation && /истори|прошл|начислен|сколько заработал/i.test(query)) {
        suggestedAction = {
          type: "navigate",
          label: "Открыть историю расчетов",
          payload: { tab: "raport_motivation_history", path: "/cabinet/raport/motivation/history" }
        };
      } else if (asksAboutMotivation) {
        suggestedAction = {
          type: "navigate",
          label: "Открыть раздел «Мотивация и KPI»",
          payload: { tab: "raport_motivation", path: "/cabinet/raport/motivation" }
        };
      } else if (qLower.includes("скриншот") || qLower.includes("снимок экрана") || qLower.includes("посмотри на экран")) {
        suggestedAction = { type: "take_screenshot", label: "Сделать скриншот экрана" };
      } else if (qLower.includes("график") || qLower.includes("смен") || qLower.includes("расписани")) {
        suggestedAction = { type: "navigate", label: "Открыть график смен", payload: { tab: "schedule", path: "/cabinet/schedule" } };
      } else if (qLower.includes("тариф") || qLower.includes("оплат") || qLower.includes("баланс") || qLower.includes("стои")) {
        suggestedAction = { type: "navigate", label: "Открыть тарифы и биллинг", payload: { tab: "tariffs", path: "/cabinet/tariffs" } };
      } else if (qLower.includes("мостик") || qLower.includes("оргструктур") || qLower.includes("отдел")) {
        suggestedAction = { type: "navigate", label: "Открыть командный мостик", payload: { tab: "ship", path: "/cabinet/ship" } };
      } else if (qLower.includes("задач") || qLower.includes("ревизор")) {
        suggestedAction = { type: "navigate", label: "Открыть задачи Ревизора", payload: { tab: "revisor", path: "/cabinet/revisor" } };
      } else if (qLower.includes("рапорт") || qLower.includes("отчет")) {
        suggestedAction = { type: "navigate", label: "Подать сменный рапорт", payload: { tab: "fill_report", path: "/cabinet/raport" } };
      }
    }

    // Pull live motivation context from PostgreSQL BD ProTalk when relevant
    let liveMotivationContext = "";
    if (isCabinetUser && asksAboutMotivation) {
      try {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const [userCalcs, userAccruals] = await Promise.all([
          db.all(`SELECT id, title, target_scope, fixed_config, kpi_rules FROM motivation_calculators WHERE COALESCE(is_archived, 0) = 0 ORDER BY updated_at DESC LIMIT 8`).catch(() => []),
          db.all(`SELECT accrual_date, total_earned_rub, fixed_base_rub, kpi_total_rub, plan_completion_pct FROM motivation_accruals WHERE employee_id = ? AND period_month = ? ORDER BY accrual_date DESC LIMIT 10`, [String(userId), currentMonth]).catch(() => [])
        ]);
        const monthSum = (userAccruals || []).reduce((s: number, a: any) => s + Number(a.total_earned_rub || 0), 0);
        const calcsSummary = (userCalcs || []).map((c: any) => `- «${c.title}» (область: ${c.target_scope})`).join("\n");
        const accSummary = (userAccruals || []).map((a: any) => `- ${a.accrual_date}: ${a.total_earned_rub} ₽ (оклад ${a.fixed_base_rub} ₽, KPI ${a.kpi_total_rub} ₽, план ${a.plan_completion_pct}%)`).join("\n");
        liveMotivationContext = `\n### Данные системы мотивации из БД PostgreSQL:\nИтого начислено сотруднику (${userId}) за ${currentMonth}: ${Math.round(monthSum)} ₽.\nАктивные шаблоны калькуляторов:\n${calcsSummary || "пока нет сохраненных шаблонов"}\nПоследние начисления:\n${accSummary || "за текущий месяц начислений пока нет"}\n`;
      } catch {
        // tables might not be seeded yet
      }
    }

    // Assemble grounded DB context blocks
    const dbContextParts: string[] = [];

    if (liveMotivationContext) {
      dbContextParts.push(liveMotivationContext);
    }

    if (selectedPost) {
      dbContextParts.push(
        `### Официальная статья Академии («${selectedPost.title}», категория: ${selectedPost.category})\n${selectedPost.content_markdown}`
      );
    }
    if (secondaryPost) {
      dbContextParts.push(
        `### Дополнительная статья Академии («${secondaryPost.title}»)\n${secondaryPost.summary || ""}\n${String(secondaryPost.content_markdown || "").slice(0, 1500)}`
      );
    }
    if (Array.isArray(tariffRows) && tariffRows.length > 0 && wantsTariffs) {
      dbContextParts.push(
        `### Актуальные тарифы и лимиты из БД (tariff_pricing — приоритетный источник цен):\n${tariffRows
          .map(
            (t: any) =>
              `- **${t.product_name}**: ${t.unit_name || `${t.price_per_unit} RR`}. Пробный доступ: ${t.trial_limit || "предусмотрен"}. ${t.description || ""}`
          )
          .join("\n")}`
      );
    }
    if (scoredFaqs.length > 0) {
      dbContextParts.push(
        `### Частые вопросы и ответы (Вики из БД):\n${scoredFaqs
          .map((f: any) => `- **${f.question}** (${f.category}): ${f.answer}`)
          .join("\n")}`
      );
    }
    if (scoredBlogs.length > 0) {
      dbContextParts.push(
        `### Релевантные обзоры из Блога (blog_posts):\n${scoredBlogs
          .map((b: any) => `- **${b.title}** (/blog/${b.slug || b.id}): ${b.summary || ""}`)
          .join("\n")}`
      );
    }

    const recentHistoryText = history
      .slice(-4)
      .map((m: any) => `${m.sender === "user" ? "Пользователь" : "Ассистент"}: ${String(m.text || "").slice(0, 350)}`)
      .join("\n");

    const answerPrompt = `${personaPrompt}
Ответьте на вопрос пользователя, опираясь строго на актуальные сведения из базы данных PostgreSQL BD ProTalk ниже. При вопросах о ценах и тарифах приоритет имеют актуальные значения из таблицы tariff_pricing и статьи Академии «Тарифные планы, калькулятор ROI и баланс RR» (1 RR = 1 рубль; ИИ Рапорт — 290 RR, ИИ Ревизор — 690 RR). Не выдумывайте несуществующие цены, кнопки или функции.
Не используйте капслок. Пишите понятным человеческим языком, четко, доброжелательно и по делу. Если вопрос касается пошаговых действий, приведите краткий понятный алгоритм.
${clientContext ? `\nКонтекст текущего экрана:\n${clientContext}\n` : ""}
${recentHistoryText ? `\nНедавняя история диалога:\n${recentHistoryText}\n` : ""}
Актуальные данные из базы данных:
${dbContextParts.join("\n\n")}

Вопрос пользователя:
"${query}"`;

    let aiAnswer = "";
    if (wantsCreateMotivation && isCabinetUser && (normRole === "director" || normRole === "manager")) {
      try {
        const parsedBuild = await parseMotivationWithAi(db, {
          prompt: query,
          userId: String(userId)
        });
        const draft = parsedBuild.draftCalculator;
        const fixedText =
          draft.fixed_config.salary_mode === "per_shift"
            ? `${draft.fixed_config.base_amount} ₽ за смену`
            : `${draft.fixed_config.base_amount} ₽/мес (делится на рабочие смены графика)`;
        const kpiText =
          draft.kpi_rules.length > 0
            ? draft.kpi_rules.map((r) => `• ${r.title} (период: ${r.period}, грейдов: ${r.grades.length})`).join("\n")
            : "• Пока без переменной части KPI";
        const missingText =
          parsedBuild.missingItems.length > 0
            ? `\n\n**Проверка полей отчетов (требуется внимание):**\n` +
              parsedBuild.missingItems.map((m) => `• ${m.title}`).join("\n") +
              `\n\nНажмите кнопку ниже — откроется ИИ-калькулятор, где недостающие поля и утренний отчет можно добавить в один клик.`
            : `\n\nВсе нужные шаблоны и числовые поля в отчетах найдены — нажимайте кнопку ниже, чтобы проверить и сохранить калькулятор.`;
        aiAnswer = `Я подготовил черновик калькулятора мотивации **«${draft.title}»**:\n\n- **Фиксированная часть:** ${fixedText}\n- **KPI и грейды:**\n${kpiText}${missingText}`;
        if (suggestedAction && suggestedAction.type === "open_modal") {
          suggestedAction.fields = { prompt: query, aiBuildResult: parsedBuild };
        }
      } catch {
        // fallback to normal answer
      }
    }

    if (!aiAnswer) {
      try {
        const aiRes = await callProTalkAi({
          prompt: answerPrompt,
          systemPrompt: personaPrompt,
          userId: String(userId),
          timeoutMs: 25000
        });
        aiAnswer = aiRes.reply || "";
      } catch (e: any) {
        console.warn("ProTalk AI timeout or network error in Stage 2, using grounded fallback from DB:", e?.message);
      }
    }

    if (!aiAnswer) {
      if (isExplicitPricingQuestion && Array.isArray(tariffRows) && tariffRows.length > 0) {
        aiAnswer =
          `**Актуальные тарифы платформы (1 RR = 1 ₽):**\n\n` +
          tariffRows
            .map((t: any) => `- **${t.product_name}**: ${t.unit_name || `${t.price_per_unit} RR`} (триал: ${t.trial_limit || "7 дней"}) — ${t.description || ""}`)
            .join("\n");
      } else if (liveMotivationContext && asksAboutMotivation) {
        aiAnswer = `**Сводка по мотивации из базы данных:**\n${liveMotivationContext}`;
      } else if (selectedPost && bestScore >= 4) {
        const cleanExcerpt = String(selectedPost.content_markdown || "")
          .split("\n")
          .filter((l: string) => l.trim().length > 0)
          .slice(0, 8)
          .join("\n");
        aiAnswer = `**${selectedPost.title}**\n\n${selectedPost.summary}\n\n${cleanExcerpt}`;
      } else if (scoredFaqs.length > 0) {
        aiAnswer = `**${scoredFaqs[0].question}**\n\n${scoredFaqs[0].answer}`;
      } else if (selectedPost) {
        aiAnswer = `**${selectedPost.title}**\n\n${selectedPost.summary}`;
      } else {
        aiAnswer = "К сожалению, сейчас не удалось получить ответ от ИИ-помощника. Попробуйте уточнить вопрос или откройте раздел Академии.";
      }
    }

    const actions = [];
    if (suggestedAction) {
      if (suggestedAction.type === "navigate" && suggestedAction.payload?.tab) {
        actions.push({
          type: "navigate",
          tab: suggestedAction.payload.tab,
          target: suggestedAction.payload.path,
          label: suggestedAction.label
        });
      } else {
        actions.push(suggestedAction);
      }
    }

    res.json({
      success: true,
      answer: aiAnswer,
      reply: aiAnswer,
      matched_article_id: selectedPost?.id || null,
      matched_article_title: selectedPost?.title || null,
      matchedPost: selectedPost
        ? {
            id: selectedPost.id,
            title: selectedPost.title,
            category: selectedPost.category,
            target_route: selectedPost.target_route,
            target_role: selectedPost.target_role,
            cover_image: selectedPost.cover_image,
            summary: selectedPost.summary
          }
        : null,
      actions,
      suggestedAction
    });
  } catch (err: any) {
    console.error("Error in cascade ask-assistant:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single post by id or slug
router.get("/posts/:idOrSlug", async (req, res) => {
  try {
    await ensureAcademyTable();
    const db = await getDb();
    const param = req.params.idOrSlug;

    const rows = await db.all(
      "SELECT * FROM academy_posts WHERE id = $1 OR slug = $1 LIMIT 1",
      [param]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: "Статья не найдена" });
    }

    res.json({ success: true, post: rows[0] });
  } catch (err: any) {
    console.error("Error fetching academy post:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST new post (Admin)
router.post("/posts", async (req, res) => {
  try {
    await ensureAcademyTable();
    const db = await getDb();
    const {
      title,
      slug,
      category,
      target_route,
      target_role,
      summary,
      content_markdown,
      cover_image,
      order_index,
      is_published
    } = req.body;

    if (!title || !content_markdown) {
      return res.status(400).json({ success: false, error: "Укажите название и текст статьи" });
    }

    const id = generateId("acad");
    const postSlug = slug || "post-" + Date.now();

    await db.run(
      `INSERT INTO academy_posts (
        id, title, slug, category, target_route, target_role, summary, content_markdown, cover_image, order_index, is_published, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)`,
      [
        id,
        title,
        postSlug,
        category || "Общее",
        target_route || "cabinet",
        target_role || "all",
        summary || "",
        content_markdown,
        cover_image || "https://filestore.pro-talk.ru/GgMpJwQ9JCkYKglyGHQMTANjOUtxAw89Hw8sP1ohGyVPG2xXMAdDYAEUKggZEyJSNS0sKyM4MQMKDHQOAjgeSxJDAh84NRQmEV9uZlUAaA11VQJrCjgDAzkkAVczLRouDiMXfQxTNBdFGT8aIyw2ZyIcIQsIKjIuHhtsBXZSBGZ5T3FP.png",
        Number(order_index) || 0,
        is_published === undefined ? 1 : Number(is_published)
      ]
    );

    res.json({ success: true, id, message: "Статья академии создана" });
  } catch (err: any) {
    console.error("Error creating academy post:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update post (Admin)
router.put("/posts/:id", async (req, res) => {
  try {
    await ensureAcademyTable();
    const db = await getDb();
    const id = req.params.id;
    const {
      title,
      slug,
      category,
      target_route,
      target_role,
      summary,
      content_markdown,
      cover_image,
      order_index,
      is_published
    } = req.body;

    await db.run(
      `UPDATE academy_posts SET
        title = COALESCE($1, title),
        slug = COALESCE($2, slug),
        category = COALESCE($3, category),
        target_route = COALESCE($4, target_route),
        target_role = COALESCE($5, target_role),
        summary = COALESCE($6, summary),
        content_markdown = COALESCE($7, content_markdown),
        cover_image = COALESCE($8, cover_image),
        order_index = COALESCE($9, order_index),
        is_published = COALESCE($10, is_published),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11`,
      [
        title,
        slug,
        category,
        target_route,
        target_role,
        summary,
        content_markdown,
        cover_image,
        order_index !== undefined ? Number(order_index) : null,
        is_published !== undefined ? Number(is_published) : null,
        id
      ]
    );

    res.json({ success: true, message: "Статья академии обновлена" });
  } catch (err: any) {
    console.error("Error updating academy post:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE post (Admin)
router.delete("/posts/:id", async (req, res) => {
  try {
    await ensureAcademyTable();
    const db = await getDb();
    const id = req.params.id;

    await db.run("DELETE FROM academy_posts WHERE id = $1", [id]);
    res.json({ success: true, message: "Статья удалена" });
  } catch (err: any) {
    console.error("Error deleting academy post:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
