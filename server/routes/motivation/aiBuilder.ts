import { callProTalkAi, safeParseAiJson } from '../../protalk';
import { buildCompanyAliases } from './calculatorEngine';
import {
  buildDefaultFixedConfig,
  MotivationFixedConfig,
  MotivationKpiRule,
  safeJsonParse
} from './schema';

export interface MissingFieldSuggestion {
  kind: 'missing_morning_template' | 'missing_evening_template' | 'missing_number_field';
  title: string;
  description: string;
  targetTemplateId?: string;
  targetTemplateTitle?: string;
  suggestedFieldLabel?: string;
  suggestedFieldHint?: string;
  kpiRuleIndex?: number;
}

export interface AiMotivationBuildResult {
  draftCalculator: {
    title: string;
    description: string;
    target_scope: 'company' | 'departments' | 'positions' | 'employees';
    morning_report_template_id: string | null;
    evening_report_template_id: string | null;
    require_morning_report: boolean;
    fixed_config: MotivationFixedConfig;
    kpi_rules: MotivationKpiRule[];
  };
  missingItems: MissingFieldSuggestion[];
  availableTemplates: Array<{ id: string; title: string; type: string; fields: any[] }>;
  aiAdvice: string;
}

export async function parseMotivationWithAi(
  db: any,
  {
    prompt,
    companyId,
    directorId,
    userId = '91827364501'
  }: {
    prompt: string;
    companyId?: string;
    directorId?: string;
    userId?: string;
  }
): Promise<AiMotivationBuildResult> {
  const aliases = buildCompanyAliases(companyId, directorId);
  const ph = aliases.length > 0 ? aliases.map(() => '?').join(',') : `'flagship-main'`;

  const templatesRaw =
    aliases.length > 0
      ? await db
          .all(
            `SELECT id, title, type, fields FROM report_templates WHERE company_id IN (${ph}) OR director_id IN (${ph})`,
            [...aliases, ...aliases]
          )
          .catch(() => [])
      : await db.all(`SELECT id, title, type, fields FROM report_templates`).catch(() => []);

  const templates = (templatesRaw || []).map((t: any) => ({
    id: String(t.id),
    title: String(t.title || 'Отчет'),
    type: String(t.type || 'FACT_DAY').toUpperCase(),
    fields: safeJsonParse<any[]>(t.fields, [])
  }));

  const morningTemplates = templates.filter((t) => t.type === 'PLAN_DAY');
  const eveningTemplates = templates.filter((t) => t.type !== 'PLAN_DAY');

  const templatesCatalogText =
    templates.length > 0
      ? templates
          .map((t) => {
            const numFields = (t.fields || [])
              .filter((f: any) => f.type === 'number')
              .map((f: any) => `${f.id} («${f.label}»)`)
              .join(', ');
            return `- ID: ${t.id} | Название: «${t.title}» | Тип: ${t.type} | Числовые поля: ${numFields || 'нет числовых полей'}`;
          })
          .join('\n')
      : 'Шаблоны отчетов пока не созданы.';

  const systemPrompt = `Ты — ИИ-архитектор систем мотивации платформы «ИИ Рапорт».
Преобразуй описание мотивации от руководителя в точный JSON-объект для калькулятора зарплаты.
Изучи список доступных шаблонов отчетов компании и их числовые поля, чтобы сразу привязать подходящие field_id.

Доступные шаблоны отчетов компании:
${templatesCatalogText}

Правила заполнения JSON:
{
  "title": "Краткое название схемы мотивации",
  "description": "Краткое описание условий",
  "target_scope": "employees",
  "morning_report_template_id": "ID найденного утреннего шаблона PLAN_DAY или null",
  "evening_report_template_id": "ID найденного вечернего шаблона FACT_DAY или null",
  "require_morning_report": true,
  "fixed_config": {
    "salary_mode": "monthly_divided" или "per_shift",
    "base_amount": число в рублях,
    "base_percent": 100,
    "verification_mode": "time" или "numeric_norm",
    "overtime_enabled": true/false,
    "overtime_unit": "fixed_hour" | "fixed_shift" | "percent_rate",
    "overtime_value": число,
    "undertime_enabled": true/false,
    "undertime_unit": "fixed_hour" | "fixed_shift" | "percent_rate",
    "undertime_value": число
  },
  "kpi_rules": [
    {
      "id": "kpi_1",
      "title": "Название показателя (например, Встречи или План продаж)",
      "field_id": "точное id числового поля из вечернего отчета или empty string если такого поля еще нет",
      "field_label": "Название нужного числового поля в отчете (например, Количество встреч)",
      "period": "day" | "week" | "month",
      "calc_mode": "volume_grades" | "plan_percent_grades",
      "plan_source": "fixed_target",
      "plan_target": число (цель плана для % или дня),
      "base_revenue_field_id": "id поля выручки если премия считается в % от выручки, иначе ''",
      "base_revenue_field_label": "Название поля выручки, если нужно",
      "grades": [
        { "id": "g1", "threshold": 1, "reward_type": "per_unit" | "flat_bundle" | "percent_of_base" | "fixed_bonus", "reward_value": 300, "label": "пояснение" }
      ]
    }
  ],
  "aiAdvice": "Краткий совет или комментарий (без капслока)"
}`;

  let parsed: any = {};
  try {
    const aiRes = await callProTalkAi({
      prompt: `Описание мотивации от пользователя:\n"${prompt}"\n\nВерни только чистый валидный JSON без markdown.`,
      systemPrompt,
      entityType: 'raport',
      userId: String(userId),
      jsonOutput: true,
      timeoutMs: 25000
    });
    parsed = safeParseAiJson(aiRes.reply || '{}', {}) || {};
  } catch (e: any) {
    console.warn('ProTalk parseMotivationWithAi fallback:', e?.message);
  }

  // Fallback heuristic if AI returned empty or partial structure
  const defaultFixed = buildDefaultFixedConfig();
  const fixedCfg: MotivationFixedConfig = {
    ...defaultFixed,
    ...(parsed.fixed_config || {})
  };

  if (!parsed.fixed_config) {
    const salMatch = prompt.match(/(\d[\d\s]{2,})\s*(?:₽|руб|р\b|тыс)/i);
    if (salMatch) {
      let num = Number(salMatch[1].replace(/\s+/g, ''));
      if (/тыс/i.test(salMatch[0]) && num < 1000) num *= 1000;
      fixedCfg.base_amount = num;
      fixedCfg.salary_mode = /смен/i.test(prompt) ? 'per_shift' : 'monthly_divided';
    }
  }

  const chosenMorning =
    templates.find((t) => t.id === parsed.morning_report_template_id) || morningTemplates[0] || null;
  const chosenEvening =
    templates.find((t) => t.id === parsed.evening_report_template_id) || eveningTemplates[0] || null;

  const kpiRules: MotivationKpiRule[] = Array.isArray(parsed.kpi_rules)
    ? parsed.kpi_rules.map((r: any, idx: number) => ({
        id: String(r.id || `kpi_${Date.now()}_${idx}`),
        title: String(r.title || r.field_label || `Показатель ${idx + 1}`),
        field_id: String(r.field_id || ''),
        field_label: String(r.field_label || r.title || `Показатель ${idx + 1}`),
        period: (['day', 'week', 'month'].includes(r.period) ? r.period : 'day') as any,
        calc_mode: r.calc_mode === 'plan_percent_grades' ? 'plan_percent_grades' : 'volume_grades',
        plan_source: 'fixed_target',
        plan_target: Number(r.plan_target || 0),
        base_revenue_field_id: r.base_revenue_field_id ? String(r.base_revenue_field_id) : '',
        base_revenue_field_label: r.base_revenue_field_label ? String(r.base_revenue_field_label) : '',
        grades: Array.isArray(r.grades)
          ? r.grades.map((g: any, gIdx: number) => ({
              id: String(g.id || `gr_${idx}_${gIdx}`),
              threshold: Number(g.threshold ?? 0),
              reward_type: (['per_unit', 'flat_bundle', 'percent_of_base', 'fixed_bonus'].includes(g.reward_type)
                ? g.reward_type
                : 'per_unit') as any,
              reward_value: Number(g.reward_value ?? 0),
              label: g.label ? String(g.label) : undefined
            }))
          : []
      }))
    : [];

  // Auto-match existing number fields in chosenEvening if AI left field_id blank or invalid
  const eveningNumberFields = (chosenEvening?.fields || []).filter((f: any) => f.type === 'number');
  const missingItems: MissingFieldSuggestion[] = [];

  const requireMorning = parsed.require_morning_report !== false && fixedCfg.verification_mode === 'time';

  if (requireMorning && !chosenMorning) {
    missingItems.push({
      kind: 'missing_morning_template',
      title: 'Не найден утренний отчет (План дня)',
      description:
        'Для привязки оклада и переработок ко времени работы нужен утренний отчет (тип «План на день»), по которому фиксируется старт смены.'
    });
  }

  if (!chosenEvening) {
    missingItems.push({
      kind: 'missing_evening_template',
      title: 'Не найден вечерний отчет (Факт дня)',
      description:
        'Для расчета оклада и KPI в конце смены требуется шаблон вечернего или дневного отчета.'
    });
  } else {
    kpiRules.forEach((rule, idx) => {
      const matchedMain = eveningNumberFields.find(
        (f: any) =>
          f.id === rule.field_id ||
          String(f.label || '').toLowerCase().includes(rule.field_label.toLowerCase()) ||
          rule.field_label.toLowerCase().includes(String(f.label || '').toLowerCase())
      );

      if (matchedMain) {
        rule.field_id = matchedMain.id;
        rule.field_label = matchedMain.label;
      } else {
        rule.field_id = '';
        missingItems.push({
          kind: 'missing_number_field',
          title: `Нет числового поля «${rule.field_label}» в отчете «${chosenEvening.title}»`,
          description: `Для расчета KPI «${rule.title}» нужно добавить числовое поле в вечерний отчет.`,
          targetTemplateId: chosenEvening.id,
          targetTemplateTitle: chosenEvening.title,
          suggestedFieldLabel: rule.field_label,
          suggestedFieldHint: 'Введите число за смену',
          kpiRuleIndex: idx
        });
      }

      if (rule.calc_mode === 'plan_percent_grades' && rule.grades.some((g) => g.reward_type === 'percent_of_base')) {
        const revLabel = rule.base_revenue_field_label || 'Выручка за смену';
        const matchedRev = eveningNumberFields.find(
          (f: any) =>
            f.id === rule.base_revenue_field_id ||
            String(f.label || '').toLowerCase().includes(revLabel.toLowerCase()) ||
            String(f.label || '').toLowerCase().includes('выруч')
        );
        if (matchedRev) {
          rule.base_revenue_field_id = matchedRev.id;
          rule.base_revenue_field_label = matchedRev.label;
        } else {
          rule.base_revenue_field_id = '';
          missingItems.push({
            kind: 'missing_number_field',
            title: `Нет числового поля базы («${revLabel}») в отчете «${chosenEvening.title}»`,
            description: `Для начисления процента от выручки по показателю «${rule.title}» добавьте числовое поле базы.`,
            targetTemplateId: chosenEvening.id,
            targetTemplateTitle: chosenEvening.title,
            suggestedFieldLabel: revLabel,
            suggestedFieldHint: 'Сумма выручки в ₽',
            kpiRuleIndex: idx
          });
        }
      }
    });
  }

  return {
    draftCalculator: {
      title: String(parsed.title || 'Мотивация (ИИ-конструктор)'),
      description: String(parsed.description || prompt.slice(0, 220)),
      target_scope: (['company', 'departments', 'positions', 'employees'].includes(parsed.target_scope)
        ? parsed.target_scope
        : 'employees') as any,
      morning_report_template_id: chosenMorning?.id || null,
      evening_report_template_id: chosenEvening?.id || null,
      require_morning_report: requireMorning,
      fixed_config: fixedCfg,
      kpi_rules: kpiRules
    },
    missingItems,
    availableTemplates: templates,
    aiAdvice: String(
      parsed.aiAdvice ||
        (missingItems.length > 0
          ? 'Я подготовил формулу мотивации. Перед сохранением рекомендую добавить недостающие поля в шаблоны отчетов одной кнопкой ниже.'
          : 'Все нужные отчеты и числовые поля найдены — калькулятор готов к сохранению!')
    )
  };
}
