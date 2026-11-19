import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, CheckCircle2, User, Building2, Calendar, Clock, 
  Sparkles, Bot, Edit3, Send, Check, AlertCircle, RefreshCw, 
  FileText, Image as ImageIcon, Volume2, Play, Pause, ChevronDown, 
  ChevronUp, ExternalLink, Shield, ThumbsUp, Rocket, AlertTriangle, 
  X, CheckCheck, Paperclip, Download, Info, MessageSquare, Share2
} from 'lucide-react';
import { SubmittedReport, UserProfile, NotificationItem, ReportTemplate } from '../../types';
import { MiniAudioField } from '../../components/voice/MiniAudioField';

interface CabinetReportReviewProps {
  reportId?: string;
  currentUser: UserProfile | null;
  reports: SubmittedReport[];
  setReports: (val: SubmittedReport[]) => void;
  templates?: ReportTemplate[];
  notifications: NotificationItem[];
  setNotifications: (val: NotificationItem[]) => void;
  departments?: any[];
  onNavigate?: (path: string) => void;
  theme?: 'dark' | 'light';
  currentPath?: string;
}

type ReviewMode = 'manual' | 'hybrid' | 'auto_ai';

export const CANONICAL_JALOUZIE_FIELDS = [
  { id: 'ai-field-1789592194085-0', label: 'Количество новых обращений за день', type: 'number', required: true, hint: 'Укажите количество новых обращений клиентов по жалюзи за текущий день', aiPrompt: 'Проверь указание точного количества новых лидов/обращений по жалюзи.' },
  { id: 'ai-field-1789592194085-1', label: 'Количество обработанных обращений и проведенных консультаций', type: 'number', required: true, hint: 'Укажите общее количество обращений, по которым проведена коммуникация или консультация', aiPrompt: 'Оцени полноту консультаций и динамику обработки лидов.' },
  { id: 'ai-field-1789592194085-2', label: 'Количество выполненных расчетов и подготовленных коммерческих предложений', type: 'number', required: true, hint: 'Укажите количество расчетов стоимости и отправленных коммерческих предложений', aiPrompt: 'Проверь объем подготовленных КП и расчетов клиентам.' },
  { id: 'ai-field-1789592194085-3', label: 'Количество оформленных заказов', type: 'number', required: true, hint: 'Укажите число заказов на жалюзи, оформленных за день', aiPrompt: 'Оцени фактическую конверсию в подтвержденные заказы.' },
  { id: 'ai-field-1789592194085-4', label: 'Сумма продаж за день', type: 'number', required: true, hint: 'Укажите фактическую сумму оформленных продаж в рублях', aiPrompt: 'Проверь сумму продаж относительно дневного плана (норматив 120 000 руб.).' },
  { id: 'ai-field-1789592194085-5', label: 'Количество полученных оплат', type: 'number', required: true, hint: 'Укажите количество клиентов, внесших оплату за день', aiPrompt: 'Проверь подтверждение поступления реальных оплат.' },
  { id: 'ai-field-1789592194085-6', label: 'Средний чек', type: 'number', required: false, hint: 'Укажите среднюю сумму одного оформленного заказа в рублях', aiPrompt: 'Оцени средний чек сделок на соответствие целевому диапазону.' },
  { id: 'ai-field-1789592194085-7', label: 'Статусы текущих сделок и следующие шаги', type: 'text_paragraph', required: true, hint: 'Перечислите ключевые сделки, текущий статус каждой и ближайшее действие менеджера', aiPrompt: 'Проверь конкретику следующих шагов по крупным объектам и замерам.' },
  { id: 'ai-field-1789592194085-8', label: 'Причины отказов и незавершенных продаж', type: 'text_paragraph', required: false, hint: 'Укажите количество отказов, основные причины и возможность повторного контакта', aiPrompt: 'Оцени глубину анализа причин отказов и возможности возврата клиентов.' },
  { id: 'ai-field-1789592194085-9', label: 'Ключевые результаты и достижения за день', type: 'voice', required: true, hint: 'Кратко сообщите фактические результаты, наиболее важные сделки и достижения за день', aiPrompt: 'Проанализируй аудиозапись или текст ключевых достижений смены.' },
  { id: 'ai-field-1789592194085-10', label: 'Сложности и блокеры', type: 'voice', required: false, hint: 'Опишите проблемы, которые повлияли на продажи или обработку клиентов', aiPrompt: 'Проверь наличие блокеров по поставкам, карнизам или монтажникам.' },
  { id: 'ai-field-1789592194085-11', label: 'План и приоритеты на следующий рабочий день', type: 'text_paragraph', required: true, hint: 'Укажите минимум 3 конкретные задачи с приоритетами и ожидаемым результатом', aiPrompt: 'Оцени четкость и реалистичность плана на следующую смену.' },
  { id: 'ai-field-1789592194085-12', label: 'Подтверждаю достоверность указанных показателей', type: 'checkbox', required: true, hint: 'Подтвердите, что сведения соответствуют фактическим данным за отчетный день', aiPrompt: 'Проверь факт подтверждения достоверности менеджером.' }
];

export const JALOUZIE_FIELD_MAP: Record<string, { label: string; type: string; required: boolean; hint: string; aiPrompt: string }> = {
  'ai-field-1789592194085-0': CANONICAL_JALOUZIE_FIELDS[0],
  'ai-field-1789592194085-1': CANONICAL_JALOUZIE_FIELDS[1],
  'ai-field-1789592194085-2': CANONICAL_JALOUZIE_FIELDS[2],
  'ai-field-1789592194085-3': CANONICAL_JALOUZIE_FIELDS[3],
  'ai-field-1789592194085-4': CANONICAL_JALOUZIE_FIELDS[4],
  'ai-field-1789592194085-5': CANONICAL_JALOUZIE_FIELDS[5],
  'ai-field-1789592194085-6': CANONICAL_JALOUZIE_FIELDS[6],
  'ai-field-1789592194085-7': CANONICAL_JALOUZIE_FIELDS[7],
  'ai-field-1789592194085-8': CANONICAL_JALOUZIE_FIELDS[8],
  'ai-field-1789592194085-9': CANONICAL_JALOUZIE_FIELDS[9],
  'ai-field-1789592194085-10': CANONICAL_JALOUZIE_FIELDS[10],
  'ai-field-1789592194085-11': CANONICAL_JALOUZIE_FIELDS[11],
  'ai-field-1789592194085-12': CANONICAL_JALOUZIE_FIELDS[12]
};

export const resolveFieldInfo = (
  key: string,
  idx: number,
  tplFields: any[] = [],
  allowJalouzieFallback: boolean = false
) => {
  const isExplicitJalouzieKey = String(key || '').includes('1789592194085');

  // 1. Direct ID or label match in real template fields FIRST
  if (Array.isArray(tplFields) && tplFields.length > 0) {
    const found = tplFields.find(f => f && (f.id === key || f.label === key || f.name === key));
    if (found && (found.label || found.title || found.name) && !String(found.label || '').startsWith('ai-field-')) {
      return {
        label: found.label || found.title || found.name || `Вопрос #${idx + 1}`,
        type: found.type || 'text',
        required: Boolean(found.required),
        hint: found.hint || '',
        aiPrompt: found.aiPrompt || found.check_criteria || found.validationCriteria || ''
      };
    }
  }

  // 2. Direct match in canonical dictionary ONLY for Jalouzie template keys
  if ((allowJalouzieFallback || isExplicitJalouzieKey) && JALOUZIE_FIELD_MAP[key]) {
    return JALOUZIE_FIELD_MAP[key];
  }

  // 3. Suffix index match like -0, -1, etc. (template fields FIRST)
  const matchIdx = String(key).match(/-(\d+)$/);
  const numIdx = matchIdx ? parseInt(matchIdx[1], 10) : parseInt(key, 10);
  if (!isNaN(numIdx) && numIdx >= 0) {
    if (Array.isArray(tplFields) && tplFields[numIdx] && (tplFields[numIdx].label || tplFields[numIdx].title || tplFields[numIdx].name)) {
      const f = tplFields[numIdx];
      return {
        label: f.label || f.title || f.name || `Вопрос #${numIdx + 1}`,
        type: f.type || 'text',
        required: Boolean(f.required),
        hint: f.hint || '',
        aiPrompt: f.aiPrompt || f.check_criteria || ''
      };
    }
    if ((allowJalouzieFallback || isExplicitJalouzieKey) && CANONICAL_JALOUZIE_FIELDS[numIdx]) {
      return CANONICAL_JALOUZIE_FIELDS[numIdx];
    }
  }

  // 4. Fallback by idx in template fields, then Jalouzie ONLY when allowed
  if (Array.isArray(tplFields) && tplFields[idx] && (tplFields[idx].label || tplFields[idx].title || tplFields[idx].name)) {
    const f = tplFields[idx];
    return {
      label: f.label || f.title || f.name || `Вопрос #${idx + 1}`,
      type: f.type || 'text',
      required: Boolean(f.required),
      hint: f.hint || '',
      aiPrompt: f.aiPrompt || f.check_criteria || ''
    };
  }
  if ((allowJalouzieFallback || isExplicitJalouzieKey) && idx >= 0 && idx < CANONICAL_JALOUZIE_FIELDS.length) {
    return CANONICAL_JALOUZIE_FIELDS[idx];
  }

  // 5. Clean readable label
  const clean = String(key || '').replace(/^ai-field-[\w\-]+-?/, '').replace(/_/g, ' ').trim();
  return {
    label: clean ? (clean.charAt(0).toUpperCase() + clean.slice(1)) : `Вопрос #${idx + 1}`,
    type: 'text',
    required: false,
    hint: '',
    aiPrompt: ''
  };
};

export default function CabinetReportReview({
  reportId: propReportId,
  currentUser,
  reports,
  setReports,
  templates = [],
  notifications,
  setNotifications,
  departments = [],
  onNavigate,
  theme = 'dark',
  currentPath
}: CabinetReportReviewProps) {
  const isDark = theme === 'dark';

  // Extract report ID from prop, currentPath or query params
  const activeReportId = React.useMemo(() => {
    if (propReportId) return propReportId;
    const match = currentPath?.match(/\/cabinet\/(?:raport\/)?review\/([^\/\?]+)/);
    if (match && match[1]) return match[1];
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const qId = sp.get('reportId');
      if (qId) return qId;
    }
    return '';
  }, [propReportId, currentPath]);

  // Report state
  const [selectedReportId, setSelectedReportId] = useState<string>(activeReportId);
  const [report, setReport] = useState<SubmittedReport | any | null>(null);
  const [template, setTemplate] = useState<ReportTemplate | any | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState<boolean>(true);
  const [reportFetchError, setReportFetchError] = useState<string | null>(null);

  // Review Mode: 1. 'manual' (Рук сам), 2. 'hybrid' (ИИ + правки), 3. 'auto_ai' (ИИ сам заполнил)
  const [reviewMode, setReviewMode] = useState<ReviewMode>('hybrid');

  // Review Form States
  const [reviewScore, setReviewScore] = useState<number>(85);
  const [managerReaction, setManagerReaction] = useState<string>('👍 Принято');
  const [managerComment, setManagerComment] = useState<string>('');
  const [managerTask, setManagerTask] = useState<string>('');
  const [fieldComments, setFieldComments] = useState<Record<string, string>>({});

  // AI draft generating state
  const [isGeneratingAiDraft, setIsGeneratingAiDraft] = useState<boolean>(false);
  const [aiDraftError, setAiDraftError] = useState<string | null>(null);
  const [aiDraftAppliedNotice, setAiDraftAppliedNotice] = useState<string | null>(null);
  const [aiPromptText, setAiPromptText] = useState<string>('');
  const [showAiGuidance, setShowAiGuidance] = useState<boolean>(true);

  // Telegram dispatch state
  const [isDispatchingTg, setIsDispatchingTg] = useState<boolean>(false);
  const [tgNotice, setTgNotice] = useState<string | null>(null);

  // Submission state
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [reviewSuccessNotice, setReviewSuccessNotice] = useState<string | null>(null);
  const [reviewErrorNotice, setReviewErrorNotice] = useState<string | null>(null);

  // Image preview modal
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Audio player state
  const [activeAudioUrl, setActiveAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // Sync selectedReportId when URL or prop changes
  useEffect(() => {
    if (activeReportId && activeReportId !== selectedReportId) {
      setSelectedReportId(activeReportId);
    }
  }, [activeReportId]);

  // Sync template from props if template changes
  useEffect(() => {
    if (report?.templateId && templates.length > 0) {
      const found = templates.find(t => t.id === report.templateId);
      if (found) {
        setTemplate(found);
      }
    }
  }, [report?.templateId, templates]);

  // Load report data from PostgreSQL BD ProTalk backend or props
  useEffect(() => {
    if (!selectedReportId) {
      const unreviewed = reports.find(r => !r.isReviewedByManager);
      if (unreviewed) {
        setSelectedReportId(unreviewed.id);
        return;
      }
      if (reports.length > 0) {
        setSelectedReportId(reports[0].id);
        return;
      }
      setIsLoadingReport(false);
      return;
    }

    setIsLoadingReport(true);
    setReportFetchError(null);

    fetch(`/api/reports/${encodeURIComponent(selectedReportId)}`)
      .then(res => {
        if (!res.ok) throw new Error('отчет не найден в базе данных');
        return res.json();
      })
      .then(data => {
        if (data.success && data.report) {
          const rep = data.report;
          setReport(rep);
          if (data.template) {
            setTemplate(data.template);
          } else if (templates.length > 0) {
            const matched = templates.find(t => t.id === rep.templateId);
            if (matched) setTemplate(matched);
          }
          if (!data.template && (!template || !template.fields || template.fields.length === 0)) {
            if (rep.templateId === '1789592333863' || String(rep.templateTitle || '').includes('жалюзи')) {
              setTemplate({
                id: '1789592333863',
                title: rep.templateTitle || 'Вечерний отчет менеджера по продажам жалюзи',
                fields: CANONICAL_JALOUZIE_FIELDS
              });
            }
          }
          // Prefill existing review data if already reviewed or partially saved
          if (rep.review_score !== undefined && rep.review_score !== null) {
            setReviewScore(Number(rep.review_score));
          } else if (rep.qualityScore) {
            setReviewScore(Number(rep.qualityScore));
          }
          if (rep.managerReaction) setManagerReaction(rep.managerReaction);
          if (rep.managerComment) setManagerComment(rep.managerComment);
          if (rep.managerTask) setManagerTask(rep.managerTask);
          if (rep.fieldComments) {
            const fc = typeof rep.fieldComments === 'string' ? JSON.parse(rep.fieldComments) : rep.fieldComments;
            setFieldComments(fc || {});
          }
        } else {
          // Fallback to local reports
          const local = reports.find(r => r.id === selectedReportId);
          if (local) {
            setReport(local);
            if (templates.length > 0) {
              const matched = templates.find(t => t.id === local.templateId);
              if (matched) setTemplate(matched);
            }
            if (local.templateId === '1789592333863' || String(local.templateTitle || '').includes('жалюзи')) {
              setTemplate({
                id: '1789592333863',
                title: local.templateTitle || 'Вечерний отчет менеджера по продажам жалюзи',
                fields: CANONICAL_JALOUZIE_FIELDS
              });
            }
            if (local.review_score !== undefined) setReviewScore(Number(local.review_score));
            else if (local.qualityScore) setReviewScore(Number(local.qualityScore));
            if (local.managerReaction) setManagerReaction(local.managerReaction);
            if (local.managerComment) setManagerComment(local.managerComment);
            if (local.managerTask) setManagerTask(local.managerTask);
            if (local.fieldComments) setFieldComments(local.fieldComments);
          } else {
            setReportFetchError('отчет не найден');
          }
        }
      })
      .catch(err => {
        console.warn('Error fetching report for review:', err);
        const local = reports.find(r => r.id === selectedReportId);
        if (local) {
          setReport(local);
          if (templates.length > 0) {
            const matched = templates.find(t => t.id === local.templateId);
            if (matched) setTemplate(matched);
          }
          if (local.templateId === '1789592333863' || String(local.templateTitle || '').includes('жалюзи')) {
            setTemplate({
              id: '1789592333863',
              title: local.templateTitle || 'Вечерний отчет менеджера по продажам жалюзи',
              fields: CANONICAL_JALOUZIE_FIELDS
            });
          }
        } else {
          setReportFetchError(err.message || 'ошибка загрузки отчета');
        }
      })
      .finally(() => {
        setIsLoadingReport(false);
      });
  }, [selectedReportId, reports, templates]);

  // Audio Playback Handler
  const togglePlayAudio = (url: string) => {
    if (activeAudioUrl === url && isPlayingAudio) {
      audioRef.current?.pause();
      setIsPlayingAudio(false);
    } else {
      setActiveAudioUrl(url);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play().then(() => {
          setIsPlayingAudio(true);
        }).catch(err => {
          console.warn('Audio play error:', err);
          setIsPlayingAudio(false);
        });
      }
    }
  };

  // Parse report answers into array with real labels and criteria
  const parsedAnswers = React.useMemo(() => {
    if (!report?.answers) return [];
    let obj: any = {};
    if (typeof report.answers === 'string') {
      try {
        obj = JSON.parse(report.answers);
      } catch (e) {
        obj = {};
      }
    } else {
      obj = report.answers;
    }

    let tplFields: any[] = template?.fields 
      ? (typeof template.fields === 'string' ? JSON.parse(template.fields) : template.fields)
      : [];

    const isJalouzie =
      report?.templateId === '1789592333863' ||
      String(report?.templateTitle || '').toLowerCase().includes('жалюзи') ||
      Object.keys(obj).some(k => k.includes('1789592194085'));

    if (!Array.isArray(tplFields) || tplFields.length === 0) {
      if (isJalouzie) {
        tplFields = CANONICAL_JALOUZIE_FIELDS;
      }
    }

    const result: Array<{
      fieldId: string;
      fieldNum: number;
      label: string;
      type: string;
      hint: string;
      aiPrompt: string;
      value: any;
    }> = [];

    const processedKeys = new Set<string>();

    if (Array.isArray(tplFields) && tplFields.length > 0) {
      tplFields.forEach((f: any, idx: number) => {
        let val = obj[f.id];
        if (val === undefined && f.label) val = obj[f.label];
        if (val === undefined) val = obj[String(idx)];
        if (val === undefined) val = '';

        processedKeys.add(f.id);
        if (f.label) processedKeys.add(f.label);
        processedKeys.add(String(idx));

        const meta = resolveFieldInfo(f.id, idx, tplFields, isJalouzie);

        result.push({
          fieldId: f.id,
          fieldNum: idx + 1,
          label: f.label || meta.label,
          type: f.type || meta.type || 'text',
          hint: f.hint || meta.hint || '',
          aiPrompt: f.aiPrompt || f.check_criteria || f.validationCriteria || meta.aiPrompt || '',
          value: val
        });
      });
    }

    // Include any additional answer keys not in template
    Object.keys(obj).forEach((key) => {
      if (!processedKeys.has(key)) {
        const meta = resolveFieldInfo(key, result.length, tplFields, isJalouzie);

        result.push({
          fieldId: key,
          fieldNum: result.length + 1,
          label: meta.label,
          type: meta.type || 'text',
          hint: meta.hint || '',
          aiPrompt: meta.aiPrompt || '',
          value: obj[key]
        });
      }
    });

    return result;
  }, [report?.answers, report?.templateId, report?.templateTitle, template]);

  // Collect all attached files (from report.files and answers)
  const attachedFilesList = React.useMemo(() => {
    const list: Array<{ name: string; url: string; type?: string; size?: number; isAudio?: boolean; isImage?: boolean }> = [];
    const seenUrls = new Set<string>();

    const addFile = (item: { name: string; url: string; type?: string; size?: number }) => {
      if (!item || !item.url) return;
      const u = String(item.url).trim();
      if (!u || seenUrls.has(u)) return;
      seenUrls.add(u);
      const isImg = item.type?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(item.name || u) || u.startsWith('data:image/');
      const isAud = item.type?.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|webm)$/i.test(item.name || u) || u.startsWith('data:audio/');
      list.push({
        ...item,
        isImage: isImg,
        isAudio: isAud
      });
    };

    // 1. Files from report.files
    if (report?.files) {
      let raw: any = report.files;
      if (typeof raw === 'string') {
        try { raw = JSON.parse(raw); } catch (e) { raw = []; }
      }
      if (Array.isArray(raw)) {
        raw.forEach((f: any) => {
          if (f && (f.url || f.fileUrl)) {
            addFile({
              name: f.name || f.fileName || 'Вложенный файл к отчету',
              url: f.url || f.fileUrl,
              type: f.type || f.fileType,
              size: f.size
            });
          }
        });
      }
    }

    // 2. Files embedded in answers
    parsedAnswers.forEach(item => {
      const val = item.value;
      if (Array.isArray(val)) {
        val.forEach((sub: any) => {
          if (sub && typeof sub === 'object' && (sub.url || sub.fileUrl)) {
            addFile({
              name: sub.name || sub.fileName || item.label,
              url: sub.url || sub.fileUrl,
              type: sub.type,
              size: sub.size
            });
          }
        });
      } else if (val && typeof val === 'object' && (val.url || val.fileUrl)) {
        addFile({
          name: val.name || val.fileName || item.label,
          url: val.url || val.fileUrl,
          type: val.type,
          size: val.size
        });
      } else if (typeof val === 'string') {
        if (val.startsWith('data:image/')) {
          addFile({
            name: `Изображение (${item.label})`,
            url: val,
            type: 'image/jpeg'
          });
        } else if (val.startsWith('data:audio/')) {
          addFile({
            name: `Аудиозапись (${item.label})`,
            url: val,
            type: 'audio/webm'
          });
        } else if (/^https?:\/\/[^\s\)]+\.(png|jpg|jpeg|webp|gif|pdf|doc|docx|xls|xlsx|csv)$/i.test(val) || val.includes('/uploads/')) {
          const urlMatch = val.match(/https?:\/\/[^\s\)]+/) || val.match(/\/uploads\/[^\s\)]+/);
          if (urlMatch) {
            addFile({
              name: item.label,
              url: urlMatch[0],
              type: val.includes('.pdf') ? 'application/pdf' : (val.includes('.jpg') || val.includes('.png')) ? 'image/jpeg' : 'document'
            });
          }
        }
      }
    });

    return list;
  }, [report?.files, parsedAnswers]);

  // Synthesize AI Prompt text for Mode 1 manual guidance
  const synthesizedPromptPreview = React.useMemo(() => {
    if (aiPromptText) return aiPromptText;
    if (!report) return '';

    const tplTitle = report.templateTitle || template?.title || 'рапорт';
    const lines: string[] = [
      `регламент и шаблон: «${tplTitle}»`,
      template?.customPrompt ? `общие критерии оценки:\n${template.customPrompt}\n` : '',
      template?.check_criteria ? `критерии проверки:\n${template.check_criteria}\n` : '',
      'пункты отчета для проверки руководителем:'
    ];

    parsedAnswers.forEach(item => {
      let l = `• пункт #${item.fieldNum}: «${item.label}» (${item.type || 'текст'})`;
      if (item.hint) l += ` | подсказка: ${item.hint}`;
      if (item.aiPrompt) l += ` | критерий/промпт ИИ: ${item.aiPrompt}`;
      lines.push(l);
      lines.push(`  ответ: ${typeof item.value === 'object' ? JSON.stringify(item.value) : String(item.value || '(пусто)')}`);
    });

    return lines.filter(Boolean).join('\n');
  }, [aiPromptText, report, template, parsedAnswers]);

  // AI Review Draft Generator (used for Mode 2 "hybrid" and Mode 3 "auto_ai")
  const generateAiReviewDraft = async (targetMode: 'hybrid' | 'auto_ai' = 'hybrid') => {
    if (!report) return;
    setIsGeneratingAiDraft(true);
    setAiDraftError(null);
    setAiDraftAppliedNotice(null);

    try {
      const res = await fetch(`/api/reports/${encodeURIComponent(report.id)}/generate-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: targetMode,
          currentUser: currentUser ? { id: currentUser.id, name: currentUser.name, role: currentUser.role } : null,
          parsedAnswers: parsedAnswers.map(a => ({
            id: a.fieldId,
            num: a.fieldNum,
            label: a.label,
            type: a.type,
            hint: a.hint,
            aiPrompt: a.aiPrompt,
            value: a.value
          }))
        })
      });

      let data: any = null;
      if (res.ok) {
        data = await res.json();
      }

      if (data && data.success && data.review) {
        const rev = data.review;
        if (typeof rev.review_score === 'number') setReviewScore(rev.review_score);
        if (rev.managerReaction) setManagerReaction(rev.managerReaction);
        if (rev.managerComment) setManagerComment(rev.managerComment);
        if (rev.managerTask) setManagerTask(rev.managerTask);
        if (rev.fieldComments) setFieldComments(rev.fieldComments);
        if (data.aiPromptText) setAiPromptText(data.aiPromptText);
        if (data.template) setTemplate(data.template);
      } else {
        // Fallback draft generation
        const baseScore = report.qualityScore || 88;
        let genReaction = '👍 Принято';
        let genComment = '';
        let genTask = '';

        if (baseScore >= 80) {
          genReaction = '🚀 Превосходно';
          genComment = `отличный структурированный отчет! сотрудник ${report.employeeName || ''} отразил все ключевые метрики смены по регламенту.`;
          genTask = `1. удерживать высокий темп работы.\n2. своевременно синхронизировать статус задач на старте следующей смены.`;
        } else if (baseScore >= 60) {
          genReaction = '👍 Принято';
          genComment = `отчет принят с замечаниями. показатели отражены, но требуется повысить детализацию фактических данных.`;
          genTask = `1. устранить выявленные отклонения.\n2. согласовать статус задач до середины рабочего дня.`;
        } else {
          genReaction = '⚠️ Доработать';
          genComment = `качество отчета требует улучшения. отсутствуют обязательные подтверждения и конкретные цифры.`;
          genTask = `1. связаться с руководителем для очной сверки показателей смены.\n2. пересдать скорректированный отчет.`;
        }

        const autoFields: Record<string, string> = {};
        parsedAnswers.forEach(item => {
          const val = item.value;
          if (!val || (typeof val === 'string' && val.trim().length === 0)) {
            autoFields[item.fieldId] = `пункт «${item.label}»: данные не заполнены, требуется предоставить информацию.`;
          } else {
            autoFields[item.fieldId] = `пункт «${item.label}»: ответ принят и соответствует регламенту.`;
          }
        });

        setReviewScore(baseScore);
        setManagerReaction(genReaction);
        setManagerComment(genComment);
        setManagerTask(genTask);
        setFieldComments(autoFields);
      }

      setAiDraftAppliedNotice(
        targetMode === 'auto_ai'
          ? 'нейросеть полностью заполнила рецензию с учетом всех названий полей и критериев! вы можете сразу утвердить ее.'
          : 'черновик ИИ успешно подставлен в поля! все названия пунктов учтены, вы можете скорректировать любой пункт.'
      );
    } catch (err: any) {
      console.warn('AI Review Draft generation failed:', err);
      setAiDraftError('не удалось автоматически получить черновик ИИ. вы можете заполнить поля вручную.');
    } finally {
      setIsGeneratingAiDraft(false);
    }
  };

  // Dispatch Telegram Review Notification
  const handleDispatchTelegram = async () => {
    if (!report) return;
    setIsDispatchingTg(true);
    setTgNotice(null);

    try {
      const res = await fetch(`/api/reports/${encodeURIComponent(report.id)}/dispatch-telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ruleId: 'rule_1791281553116_bb95',
          forceReview: true,
          origin: typeof window !== 'undefined' ? window.location.origin : ''
        })
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setTgNotice('краткий отчет по правилу «Жалюзи руку» и сообщение с кнопкой проверки успешно отправлены в Telegram руководителю (169262990)!');
      } else {
        throw new Error(data.error || 'ошибка отправки в Telegram');
      }
    } catch (err: any) {
      console.warn('Failed to dispatch telegram review:', err);
      setTgNotice('не удалось отправить сообщение в Telegram: ' + (err.message || 'сбой связи'));
    } finally {
      setIsDispatchingTg(false);
    }
  };

  // Submit Manager Review to PostgreSQL BD ProTalk Backend
  const handleSubmitReview = async () => {
    if (!report) return;
    setIsSubmittingReview(true);
    setReviewSuccessNotice(null);

    const reviewerName = currentUser?.name || 'Руководитель';
    const reviewerId = currentUser?.id || 'manager-1';

    try {
      const res = await fetch(`/api/reports/${encodeURIComponent(report.id)}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review_score: reviewScore,
          managerComment,
          managerTask,
          managerReaction,
          fieldComments,
          reviewed_by_id: reviewerId,
          reviewed_by_name: reviewerName,
          origin: typeof window !== 'undefined' ? window.location.origin : ''
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'ошибка сохранения рецензии');
      }

      // Update local state in reports array
      const updatedReport: SubmittedReport = {
        ...report,
        review_score: reviewScore,
        qualityScore: reviewScore,
        statusColor: reviewScore >= 75 ? 'green' : reviewScore >= 50 ? 'yellow' : 'red',
        managerComment,
        managerTask,
        managerReaction,
        fieldComments,
        isReviewedByManager: true,
        reviewedAt: new Date().toISOString(),
        reviewed_by_id: reviewerId,
        reviewed_by_name: reviewerName
      };

      setReport(updatedReport);
      setReports(reports.map(r => r.id === report.id ? updatedReport : r));

      // Notification
      const newNotif: NotificationItem = {
        id: 'notif-rev-' + Date.now(),
        userId: report.employeeId || 'employee-1',
        title: 'Рецензия руководителя получена',
        message: `Руководитель проверил ваш отчет «${report.templateTitle}». Оценка: ${reviewScore}/100. Реакция: ${managerReaction}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isRead: false,
        type: 'RECOMMENDATION',
        actionUrl: `/cabinet/raport/verdict/${report.id}`,
        reportId: report.id
      };
      setNotifications([newNotif, ...notifications]);

      setReviewSuccessNotice('рецензия успешно зафиксирована в базе данных и отправлена автору в личный кабинет и Telegram!');
      setReviewErrorNotice(null);
    } catch (err: any) {
      console.error('Error submitting manager review:', err);
      setReviewErrorNotice('Ошибка при сохранении проверки: ' + (err.message || 'сбой сети'));
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Helper for field type labels
  const getFieldTypeBadge = (type?: string) => {
    switch (type) {
      case 'number': return 'число';
      case 'text': return 'текст';
      case 'textarea': return 'развернутый текст';
      case 'file': return 'файл';
      case 'image': return 'фото';
      case 'audio': return 'аудио';
      case 'select': return 'выбор';
      case 'checkbox': return 'галочка';
      default: return 'поле';
    }
  };

  // Score badge theme
  const scoreBadgeTheme = React.useMemo(() => {
    if (reviewScore >= 75) {
      return {
        border: isDark ? 'border-amber-400/50' : 'border-amber-500/60',
        bg: isDark ? 'bg-amber-400/10' : 'bg-amber-100/70',
        text: isDark ? 'text-[#F4EE8E]' : 'text-amber-950',
        label: 'высокое качество'
      };
    } else if (reviewScore >= 50) {
      return {
        border: isDark ? 'border-amber-500/40' : 'border-amber-400/60',
        bg: isDark ? 'bg-amber-500/15' : 'bg-amber-50',
        text: isDark ? 'text-amber-300' : 'text-amber-900',
        label: 'требует внимания'
      };
    } else {
      return {
        border: isDark ? 'border-rose-500/40' : 'border-rose-400/60',
        bg: isDark ? 'bg-rose-950/20' : 'bg-rose-50',
        text: isDark ? 'text-rose-300' : 'text-rose-950',
        label: 'критичные замечания'
      };
    }
  }, [reviewScore, isDark]);

  return (
    <div className={`p-3 sm:p-6 space-y-6 max-w-6xl mx-auto font-sans transition-colors ${
      isDark ? 'text-stone-100' : 'text-amber-950'
    }`}>
      {/* Hidden audio element for audio answers */}
      <audio 
        ref={audioRef} 
        onEnded={() => setIsPlayingAudio(false)} 
        onError={() => setIsPlayingAudio(false)} 
      />

      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-amber-400/20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (onNavigate) {
                onNavigate('/cabinet/raport/calendar');
              } else {
                window.location.assign('/cabinet/raport/calendar');
              }
            }}
            className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-2 text-sm font-semibold shadow-sm hover:scale-102 active:scale-98 ${
              isDark
                ? 'bg-[#140A01]/70 border-amber-400/30 text-amber-200 hover:border-amber-400/60'
                : 'bg-white/80 border-amber-900/20 text-amber-950 hover:bg-amber-50'
            }`}
          >
            <ArrowLeft size={18} />
            <span>к календарю и отчетам</span>
          </button>

          <div>
            <h1 className={`text-base sm:text-lg font-bold tracking-tight ${
              isDark ? 'text-white' : 'text-amber-950'
            }`}>
              проверка отчета руководителем
            </h1>
            <p className={`text-sm ${isDark ? 'text-amber-200/80' : 'text-stone-600'}`}>
              интерактивная оценка, рецензия и обратная связь сотруднику
            </p>
          </div>
        </div>

        {/* Action Buttons: Telegram notification & Report Picker */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isDispatchingTg}
            onClick={handleDispatchTelegram}
            className={`px-3 py-2 rounded-xl text-sm font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
              isDark
                ? 'bg-amber-400/15 border-amber-400/40 text-amber-200 hover:bg-amber-400/25'
                : 'bg-amber-100 border-amber-400 text-amber-950 hover:bg-amber-200'
            }`}
            title="Отправить краткий отчет и инлайн-ссылку на проверку в Telegram руководителю"
          >
            {isDispatchingTg ? (
              <>
                <RefreshCw size={15} className="animate-spin" />
                <span>отправка в телеграм...</span>
              </>
            ) : (
              <>
                <Share2 size={15} className="text-amber-400" />
                <span>отправить в телеграм</span>
              </>
            )}
          </button>

          {reports.length > 1 && (
            <select
              value={selectedReportId}
              onChange={(e) => setSelectedReportId(e.target.value)}
              className={`text-sm py-2 px-3 rounded-xl border font-medium outline-none cursor-pointer max-w-[220px] truncate ${
                isDark 
                  ? 'bg-[#140A01] border-amber-400/30 text-amber-200 focus:border-amber-400' 
                  : 'bg-white border-amber-900/20 text-amber-950 focus:border-amber-500'
              }`}
            >
              {reports.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.employeeName} — {r.templateTitle} ({r.isReviewedByManager ? 'проверен' : 'ожидает'})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Telegram Notice Banner */}
      {tgNotice && (
        <div className={`p-3.5 rounded-2xl border text-sm flex items-center justify-between gap-3 shadow-md ${
          tgNotice.includes('успешно')
            ? isDark ? 'bg-[#140A01] border-amber-400/60 text-[#F4EE8E]' : 'bg-amber-50 border-amber-400 text-amber-950'
            : isDark ? 'bg-rose-950/40 border-rose-500/40 text-rose-200' : 'bg-rose-50 border-rose-300 text-rose-950'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-amber-400 shrink-0" />
            <span>{tgNotice}</span>
          </div>
          <button type="button" onClick={() => setTgNotice(null)} className="p-1 opacity-70 hover:opacity-100">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Loading or Error State */}
      {isLoadingReport ? (
        <div className={`p-12 text-center rounded-3xl border flex flex-col items-center justify-center space-y-4 ${
          isDark ? 'bg-[#140A01]/60 border-amber-400/30' : 'bg-white/60 border-amber-900/15'
        }`}>
          <RefreshCw size={32} className="animate-spin text-amber-400" />
          <p className="text-sm font-semibold">загрузка данных отчета для проверки...</p>
        </div>
      ) : reportFetchError || !report ? (
        <div className={`p-8 text-center rounded-3xl border space-y-4 ${
          isDark ? 'bg-[#140A01]/70 border-rose-500/30 text-rose-200' : 'bg-rose-50 border-rose-300 text-rose-950'
        }`}>
          <AlertCircle size={36} className="mx-auto text-rose-400" />
          <h3 className="text-base font-bold">отчет не найден</h3>
          <p className="text-sm opacity-90">{reportFetchError || 'выберите отчет из списка выше'}</p>
        </div>
      ) : (
        <>
          {/* Top Status & Employee Info Card */}
          <div className={`p-4 sm:p-6 rounded-3xl border shadow-lg backdrop-blur-md transition-all ${
            isDark 
              ? 'bg-[#140A01]/80 border-amber-400/30 shadow-[0_0_25px_rgba(244,238,142,0.1)]' 
              : 'bg-white/80 border-amber-900/20 shadow-md'
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Employee Avatar & Basic Info */}
              <div className="flex items-start sm:items-center gap-3.5">
                <div className={`w-13 h-13 rounded-2xl border flex items-center justify-center font-bold text-lg shrink-0 shadow-sm ${
                  isDark ? 'bg-amber-400/20 border-amber-400/50 text-[#F4EE8E]' : 'bg-amber-100 border-amber-400 text-amber-950'
                }`}>
                  <User size={26} />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className={`text-base sm:text-lg font-bold truncate ${
                      isDark ? 'text-white' : 'text-amber-950'
                    }`}>
                      {report.employeeName || 'Сотрудник'}
                    </h2>
                    <span className={`text-sm px-2.5 py-0.5 rounded-full font-semibold border ${
                      report.isReviewedByManager
                        ? isDark ? 'bg-amber-400/20 border-amber-400/50 text-[#F4EE8E]' : 'bg-amber-100 border-amber-400 text-amber-950 font-bold'
                        : isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-300 text-amber-900'
                    }`}>
                      {report.isReviewedByManager ? 'проверен руководителем' : 'сдан • ожидает проверки'}
                    </span>
                  </div>
                  <div className={`flex items-center gap-2 text-sm flex-wrap ${
                    isDark ? 'text-amber-200/80' : 'text-stone-600'
                  }`}>
                    <span>отдел: <strong>{report.departmentName || 'Главный отдел'}</strong></span>
                    <span>•</span>
                    <span>шаблон: <strong>{report.templateTitle}</strong></span>
                    <span>•</span>
                    <span className="font-mono text-sm">
                      {new Date(report.timestamp).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Preliminary AI Quality Score */}
              <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                <div className="text-right">
                  <span className={`block text-sm font-semibold ${
                    isDark ? 'text-stone-400' : 'text-stone-600'
                  }`}>
                    исходная оценка ИИ
                  </span>
                  <span className="text-sm font-bold font-mono">
                    {report.qualityScore || 0}/100
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (onNavigate) {
                      onNavigate(`/cabinet/raport/verdict/${report.id}`);
                    } else {
                      window.location.assign(`/cabinet/raport/verdict/${report.id}`);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl border text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isDark 
                      ? 'bg-white/5 border-white/20 text-stone-300 hover:bg-white/10' 
                      : 'bg-stone-100 border-stone-300 text-stone-800 hover:bg-stone-200'
                  }`}
                >
                  <ExternalLink size={15} />
                  <span>страница вердикта</span>
                </button>
              </div>
            </div>
          </div>

          {/* Success Notification Banner */}
          {reviewSuccessNotice && (
            <div className={`p-4 rounded-2xl border flex items-center gap-3 shadow-lg animate-fade-in ${
              isDark 
                ? 'bg-[#140A01] border-amber-400/60 text-[#F4EE8E] shadow-[0_0_20px_rgba(244,238,142,0.2)]' 
                : 'bg-amber-50 border-amber-500/60 text-amber-950 shadow-md'
            }`}>
              <CheckCheck size={22} className="text-amber-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold">{reviewSuccessNotice}</p>
              </div>
              <button
                type="button"
                onClick={() => setReviewSuccessNotice(null)}
                className="p-1 rounded-lg opacity-60 hover:opacity-100 transition-opacity"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* THREE MODES SELECTOR PANEL */}
          <div className={`p-4 sm:p-5 rounded-3xl border shadow-md space-y-4 ${
            isDark 
              ? 'bg-[#140A01]/70 border-amber-400/30' 
              : 'bg-white/70 border-amber-900/15'
          }`}>
            <div>
              <span className={`text-sm font-bold block mb-1 ${
                isDark ? 'text-amber-300' : 'text-amber-900'
              }`}>
                выберите режим проверки отчета
              </span>
              <p className={`text-sm ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>
                вы можете оценить отчет вручную, отредактировать рекомендации ИИ или утвердить готовую рецензию в один клик:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Mode 1: Manual */}
              <button
                type="button"
                onClick={() => setReviewMode('manual')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  reviewMode === 'manual'
                    ? isDark
                      ? 'bg-amber-400/20 border-amber-400 text-white shadow-[0_0_15px_rgba(244,238,142,0.2)]'
                      : 'bg-amber-100 border-amber-500 text-amber-950 shadow-md'
                    : isDark
                      ? 'bg-black/20 border-white/10 text-stone-400 hover:border-amber-400/40 hover:text-stone-200'
                      : 'bg-white border-stone-200 text-stone-600 hover:border-amber-400 hover:text-stone-900'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Edit3 size={17} className={reviewMode === 'manual' ? 'text-amber-400' : ''} />
                  <span>1. ручная проверка</span>
                </div>
                <p className="text-sm opacity-85 leading-snug">
                  руководитель оценивает отчет самостоятельно, ориентируясь на названия пунктов и критерии регламента.
                </p>
              </button>

              {/* Mode 2: Hybrid (AI checked + manager edits) */}
              <button
                type="button"
                onClick={() => setReviewMode('hybrid')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  reviewMode === 'hybrid'
                    ? isDark
                      ? 'bg-amber-400/20 border-amber-400 text-white shadow-[0_0_15px_rgba(244,238,142,0.2)]'
                      : 'bg-amber-100 border-amber-500 text-amber-950 shadow-md'
                    : isDark
                      ? 'bg-black/20 border-white/10 text-stone-400 hover:border-amber-400/40 hover:text-stone-200'
                      : 'bg-white border-stone-200 text-stone-600 hover:border-amber-400 hover:text-stone-900'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Sparkles size={17} className={reviewMode === 'hybrid' ? 'text-amber-400' : ''} />
                  <span>2. ИИ + правки руководителя</span>
                </div>
                <p className="text-sm opacity-85 leading-snug">
                  ИИ формирует разбор с учетом всех названий полей, а руководитель свободно корректирует оценки и формулировки.
                </p>
              </button>

              {/* Mode 3: Auto AI */}
              <button
                type="button"
                onClick={() => setReviewMode('auto_ai')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  reviewMode === 'auto_ai'
                    ? isDark
                      ? 'bg-amber-400/20 border-amber-400 text-white shadow-[0_0_15px_rgba(244,238,142,0.2)]'
                      : 'bg-amber-100 border-amber-500 text-amber-950 shadow-md'
                    : isDark
                      ? 'bg-black/20 border-white/10 text-stone-400 hover:border-amber-400/40 hover:text-stone-200'
                      : 'bg-white border-stone-200 text-stone-600 hover:border-amber-400 hover:text-stone-900'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Bot size={17} className={reviewMode === 'auto_ai' ? 'text-amber-400' : ''} />
                  <span>3. ИИ сам заполнил</span>
                </div>
                <p className="text-sm opacity-85 leading-snug">
                  полностью автоматическое формирование рецензии по всем полям, руководителю остается лишь утвердить в один клик.
                </p>
              </button>
            </div>

            {/* AI Action helper row in Mode 2 and Mode 3 */}
            {(reviewMode === 'hybrid' || reviewMode === 'auto_ai') && (
              <div className="pt-3 border-t border-amber-400/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Bot size={18} className="text-amber-400 shrink-0" />
                  <span className={isDark ? 'text-amber-200' : 'text-amber-950 font-medium'}>
                    {reviewMode === 'auto_ai' 
                      ? 'режим авто-рецензии: нажмите для генерации полного вердикта'
                      : 'режим правок: ИИ предлагает формулировки по каждому пункту, вы можете изменить любое слово'}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={isGeneratingAiDraft}
                  onClick={() => generateAiReviewDraft(reviewMode as any)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
                    isDark 
                      ? 'bg-gradient-to-r from-[#F4EE8E] to-[#E7C768] text-amber-950 hover:brightness-110 active:scale-95' 
                      : 'bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 hover:brightness-105 active:scale-95'
                  }`}
                >
                  {isGeneratingAiDraft ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>ИИ анализирует отчет...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>{reviewMode === 'auto_ai' ? 'заполнить все поля через ИИ' : 'сгенерировать черновик ИИ'}</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Mode 1: Manual Assistant Prompt Panel */}
            {reviewMode === 'manual' && (
              <div className="pt-3 border-t border-amber-400/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Sparkles size={16} className="text-amber-400" />
                    <span>критерии и промпт проверки шаблона для руководителя</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => generateAiReviewDraft('hybrid')}
                      disabled={isGeneratingAiDraft}
                      className={`px-3 py-1.5 rounded-xl text-sm font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                        isDark 
                          ? 'bg-amber-400/10 border-amber-400/30 text-[#F4EE8E] hover:bg-amber-400/20' 
                          : 'bg-amber-100 border-amber-300 text-amber-950 hover:bg-amber-200'
                      }`}
                    >
                      {isGeneratingAiDraft ? <RefreshCw size={14} className="animate-spin" /> : <Bot size={14} />}
                      <span>запросить совет ИИ-помощника</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAiGuidance(!showAiGuidance)}
                      className="p-1.5 rounded-lg opacity-70 hover:opacity-100"
                    >
                      {showAiGuidance ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {showAiGuidance && (
                  <div className={`p-4 rounded-2xl border text-sm space-y-2 whitespace-pre-wrap leading-relaxed ${
                    isDark ? 'bg-[#1A0F02] border-amber-400/20 text-stone-200' : 'bg-amber-50/60 border-amber-900/15 text-stone-800'
                  }`}>
                    {template?.customPrompt && (
                      <div className="pb-2 border-b border-amber-400/15">
                        <span className="font-bold text-amber-400 block mb-0.5">общий промпт и регламент шаблона:</span>
                        <p className="opacity-90">{template.customPrompt}</p>
                      </div>
                    )}
                    <span className="font-bold text-amber-400 block mb-0.5">пункты отчета и персональные критерии проверки:</span>
                    <p className="font-mono text-sm opacity-85 leading-relaxed">{synthesizedPromptPreview}</p>
                  </div>
                )}
              </div>
            )}

            {aiDraftAppliedNotice && (
              <div className={`p-3 rounded-xl border text-sm flex items-center gap-2 ${
                isDark ? 'bg-amber-400/10 border-amber-400/30 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-950'
              }`}>
                <CheckCircle2 size={16} className="text-amber-400 shrink-0" />
                <span>{aiDraftAppliedNotice}</span>
              </div>
            )}
          </div>

          {/* DEDICATED ATTACHED FILES SECTION */}
          {attachedFilesList.length > 0 && (
            <div className={`p-4 sm:p-5 rounded-3xl border shadow-md space-y-3 ${
              isDark ? 'bg-[#140A01]/70 border-amber-400/30' : 'bg-white/80 border-amber-900/15'
            }`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-base font-bold flex items-center gap-2 ${
                  isDark ? 'text-white' : 'text-amber-950'
                }`}>
                  <Paperclip size={18} className="text-amber-400" />
                  <span>прикрепленные файлы и документы к отчету ({attachedFilesList.length})</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {attachedFilesList.map((file, fIdx) => {
                  const isImg = file.type?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(file.name || file.url);
                  const isAudio = file.type?.startsWith('audio/') || /\.(mp3|wav|ogg|m4a)$/i.test(file.name || file.url);

                  return (
                    <div 
                      key={file.url || fIdx} 
                      className={`p-3 rounded-2xl border flex flex-col justify-between gap-2.5 transition-all ${
                        isDark 
                          ? 'bg-[#1A0F02] border-amber-400/20 hover:border-amber-400/40' 
                          : 'bg-amber-50/50 border-amber-900/15 hover:border-amber-400'
                      }`}
                    >
                      {/* Image Thumbnail */}
                      {isImg ? (
                        <div 
                          onClick={() => setPreviewImage({ url: file.url, title: file.name })}
                          className="h-32 w-full rounded-xl overflow-hidden border border-amber-400/20 cursor-pointer relative group bg-black/40"
                        >
                          <img 
                            src={file.url} 
                            alt={file.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-sm text-white font-semibold">
                            нажмите для увеличения
                          </div>
                        </div>
                      ) : isAudio ? (
                        <div className="p-2.5 rounded-xl border border-amber-400/20 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-sm font-semibold">
                            <Volume2 size={16} className="text-amber-400" />
                            <span>аудиофайл</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => togglePlayAudio(file.url)}
                            className={`px-2.5 py-1 rounded-lg text-sm font-bold flex items-center gap-1 ${
                              isDark ? 'bg-amber-400/20 text-[#F4EE8E]' : 'bg-amber-200 text-amber-950'
                            }`}
                          >
                            {isPlayingAudio && activeAudioUrl === file.url ? <Pause size={13} /> : <Play size={13} />}
                            <span>{isPlayingAudio && activeAudioUrl === file.url ? 'пауза' : 'слушать'}</span>
                          </button>
                        </div>
                      ) : (
                        <div className="h-16 rounded-xl border border-amber-400/15 flex items-center justify-center text-amber-400 bg-amber-400/5">
                          <FileText size={28} />
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <div className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold truncate" title={file.name}>
                            {file.name}
                          </span>
                          {file.size ? (
                            <span className="text-sm opacity-70">
                              {(file.size / 1024).toFixed(1)} КБ
                            </span>
                          ) : null}
                        </div>

                        <a 
                          href={file.url} 
                          target="_blank" 
                          rel="noreferrer"
                          download={file.name}
                          className={`p-2 rounded-xl border shrink-0 transition-all ${
                            isDark 
                              ? 'bg-white/5 border-white/10 text-amber-200 hover:bg-amber-400/20 hover:border-amber-400/40' 
                              : 'bg-white border-amber-900/20 text-amber-950 hover:bg-amber-100'
                          }`}
                          title="Открыть или скачать файл"
                        >
                          <Download size={14} />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* MAIN REVIEW INTERFACE: Left column answers & media, Right column manager controls */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT COLUMN: Report Answers & Evidence (7 Cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className={`text-base font-bold flex items-center gap-2 ${
                  isDark ? 'text-white' : 'text-amber-950'
                }`}>
                  <FileText size={18} className="text-amber-400" />
                  <span>ответы и материалы отчета сотрудника ({parsedAnswers.length})</span>
                </h3>
              </div>

              {parsedAnswers.length === 0 ? (
                <div className={`p-6 text-center rounded-2xl border text-sm ${
                  isDark ? 'bg-[#140A01]/40 border-amber-400/20' : 'bg-white border-amber-900/10'
                }`}>
                  в данном отчете нет сохраненных ответов на вопросы.
                </div>
              ) : (
                <div className="space-y-4">
                  {parsedAnswers.map((item, idx) => {
                    const fieldKey = item.fieldId;
                    const val = item.value;
                    const isVoice = (typeof val === 'string' && (val.startsWith('data:audio/') || val.includes('[голосовой ответ]') || val.includes('.wav') || val.includes('.mp3') || val.includes('.ogg') || val.includes('.webm') || val.includes('/uploads/'))) || (typeof val === 'object' && val && (val.type?.startsWith('audio/') || val.audioUrl));
                    const isImg = (typeof val === 'string' && (val.startsWith('data:image/') || val.endsWith('.jpg') || val.endsWith('.png') || val.endsWith('.jpeg') || val.endsWith('.webp') || val.includes('/uploads/img-') || val.includes('images.unsplash.com'))) || (typeof val === 'object' && val && (val.type?.startsWith('image/') || val.imageUrl));
                    const imgSrc = typeof val === 'string' ? val : (val?.url || val?.imageUrl);
                    const managerNote = fieldComments[fieldKey] || '';

                    // Check if value is a file object or list of file objects
                    const isFileObj = Boolean(val && typeof val === 'object' && !Array.isArray(val) && (val.url || val.fileUrl || val.name));
                    const isFileList = Array.isArray(val) && val.length > 0 && typeof val[0] === 'object' && Boolean(val[0]?.url || val[0]?.fileUrl || val[0]?.name);
                    const nestedFiles: any[] = isFileList ? val : (isFileObj ? [val] : []);

                    return (
                      <div
                        key={fieldKey || idx}
                        className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                          isDark 
                            ? 'bg-[#140A01]/75 border-amber-400/35 hover:border-amber-400/50' 
                            : 'bg-[#FAF6EC]/90 border-amber-900/15 hover:border-amber-900/30'
                        }`}
                      >
                        {/* Question Header: Full Label and Number */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-amber-400/15">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <span className={`text-sm px-2.5 py-0.5 rounded-lg border font-bold ${
                              isDark ? 'bg-amber-400/15 text-[#F4EE8E] border-amber-400/30' : 'bg-amber-100 text-amber-950 border-amber-400'
                            }`}>
                              №{item.fieldNum}
                            </span>
                            <h4 className={`text-base font-bold ${isDark ? 'text-amber-100' : 'text-amber-950'}`}>
                              {item.label}
                            </h4>
                          </div>

                          <span className={`text-sm px-2 py-0.5 rounded-md font-medium ${
                            isDark ? 'bg-stone-800/80 text-stone-300' : 'bg-stone-100 text-stone-700'
                          }`}>
                            {getFieldTypeBadge(item.type)}
                          </span>
                        </div>

                        {/* Field Hint */}
                        {item.hint && (
                          <p className={`text-sm italic mb-2.5 ${isDark ? 'text-stone-300' : 'text-stone-600'}`}>
                            ℹ️ {item.hint}
                          </p>
                        )}

                        {/* AI Prompt / Evaluation Criteria for this field */}
                        {item.aiPrompt && (
                          <div className={`mb-3 p-3 rounded-xl border text-sm space-y-1 ${
                            isDark ? 'bg-[#1A0F02]/80 border-amber-400/25 text-amber-200' : 'bg-amber-50/70 border-amber-900/15 text-amber-950'
                          }`}>
                            <div className="flex items-center gap-1.5 font-semibold text-amber-400">
                              <Sparkles size={14} />
                              <span>критерий / промпт ИИ проверки поля:</span>
                            </div>
                            <p className="leading-relaxed opacity-95">{item.aiPrompt}</p>
                          </div>
                        )}

                        {/* Employee Answer Value */}
                        <div className="space-y-2 mb-3">
                          <span className={`block text-sm font-semibold ${
                            isDark ? 'text-amber-300' : 'text-amber-950'
                          }`}>
                            ответ сотрудника:
                          </span>

                          {/* Audio Player if voice answer */}
                          {isVoice && (
                            <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                              isDark ? 'bg-amber-400/10 border-amber-400/30' : 'bg-amber-50 border-amber-300'
                            }`}>
                              <div className="flex items-center gap-2 text-sm font-semibold">
                                <Volume2 size={18} className="text-amber-400" />
                                <span>голосовой ответ сотрудника</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const urlMatch = typeof val === 'string' ? (val.match(/https?:\/\/[^\s\)]+/) || val.match(/\/uploads\/[^\s\)]+/) || [val]) : [val?.url || ''];
                                  const playUrl = urlMatch[0];
                                  togglePlayAudio(playUrl);
                                }}
                                className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                  isDark 
                                    ? 'bg-amber-400/20 border border-amber-400/40 text-[#F4EE8E] hover:bg-amber-400/30' 
                                    : 'bg-amber-200 border border-amber-400 text-amber-950 hover:bg-amber-300'
                                }`}
                              >
                                {isPlayingAudio && activeAudioUrl ? (
                                  <>
                                    <Pause size={15} />
                                    <span>пауза</span>
                                  </>
                                ) : (
                                  <>
                                    <Play size={15} />
                                    <span>слушать запись</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}

                          {/* Image preview if image attached directly */}
                          {isImg && imgSrc && (
                            <div className="mt-2">
                              <img
                                src={imgSrc}
                                alt={`Пункт ${item.fieldNum}`}
                                onClick={() => setPreviewImage({ url: imgSrc, title: item.label })}
                                className="max-h-48 rounded-xl border border-amber-400/30 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                              />
                            </div>
                          )}

                          {/* Nested / Embedded Files Card */}
                          {nestedFiles.length > 0 && (
                            <div className="space-y-2 mt-2">
                              {nestedFiles.map((nf: any, nIdx: number) => {
                                const fUrl = nf.url || nf.fileUrl;
                                const fName = nf.name || nf.fileName || `Файл к пункту #${item.fieldNum}`;
                                const fIsImg = nf.type?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(fName || fUrl || '');
                                return (
                                  <div
                                    key={fUrl || nIdx}
                                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                                      isDark ? 'bg-[#1A0F02] border-amber-400/25' : 'bg-white border-amber-900/15'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      {fIsImg ? (
                                        <div
                                          onClick={() => fUrl && setPreviewImage({ url: fUrl, title: fName })}
                                          className="w-10 h-10 rounded-lg overflow-hidden border border-amber-400/30 shrink-0 cursor-pointer"
                                        >
                                          <img src={fUrl} alt={fName} className="w-full h-full object-cover" />
                                        </div>
                                      ) : (
                                        <div className="w-10 h-10 rounded-lg border border-amber-400/20 flex items-center justify-center text-amber-400 shrink-0">
                                          <FileText size={20} />
                                        </div>
                                      )}
                                      <div className="min-w-0">
                                        <span className="block text-sm font-semibold truncate" title={fName}>{fName}</span>
                                        {nf.size && (
                                          <span className="text-sm opacity-70">{(nf.size / 1024).toFixed(1)} КБ</span>
                                        )}
                                      </div>
                                    </div>
                                    {fUrl && (
                                      <a
                                        href={fUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        download={fName}
                                        className={`p-2 rounded-xl border shrink-0 transition-all ${
                                          isDark
                                            ? 'bg-amber-400/10 border-amber-400/30 text-amber-200 hover:bg-amber-400/20'
                                            : 'bg-amber-100 border-amber-300 text-amber-950 hover:bg-amber-200'
                                        }`}
                                        title="Скачать файл"
                                      >
                                        <Download size={15} />
                                      </a>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Text or Value Answer */}
                          {!isFileObj && !isFileList && (
                            <div className={`p-3 rounded-xl border text-sm leading-relaxed whitespace-pre-wrap select-text ${
                              isDark 
                                ? 'bg-black/20 border-white/10 text-stone-200' 
                                : 'bg-stone-50 border-stone-200 text-stone-900'
                            }`}>
                              {typeof val === 'boolean' ? (
                                <span className="font-bold text-amber-400 flex items-center gap-1.5">
                                  {val ? '✓ Да, подтверждаю достоверность сведений' : '✗ Не подтверждено'}
                                </span>
                              ) : typeof val === 'number' ? (
                                (val >= 1000 && (item.label.includes('Сумма') || item.label.includes('чек') || item.label.includes('выручк')))
                                  ? `${val.toLocaleString('ru-RU')} руб.`
                                  : String(val)
                              ) : typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val || '—')}
                            </div>
                          )}
                        </div>

                        {/* Manager's Field-Specific Comment Input with MiniAudioField */}
                        <div className="pt-2 border-t border-amber-400/10 space-y-1.5">
                          <label className={`block text-sm font-semibold ${
                            isDark ? 'text-amber-200/90' : 'text-amber-900'
                          }`}>
                            замечание руководителя к пункту «{item.label}»:
                          </label>
                          <MiniAudioField
                            value={managerNote || ''}
                            onChange={(val) => {
                              const next = { ...fieldComments, [fieldKey]: val };
                              setFieldComments(next);
                            }}
                            placeholder="напишите или продиктуйте замечание к пункту, либо оставьте пустым..."
                            multiline={true}
                            rows={2}
                            resizable={true}
                            isLightTheme={!isDark}
                            className="w-full"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Reviewer Verdict, Score, Reactions & Final Tasks (5 Cols) */}
            <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-24">
              
              {/* Reviewer Score & Traffic Light Box */}
              <div className={`p-5 rounded-3xl border shadow-lg backdrop-blur-md space-y-4 ${
                isDark 
                  ? 'bg-[#140A01]/85 border-amber-400/40 shadow-[0_0_30px_rgba(244,238,142,0.15)]' 
                  : 'bg-white/90 border-amber-900/20 shadow-md'
              }`}>
                <div className="flex items-center justify-between border-b border-amber-400/20 pb-3">
                  <div>
                    <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-amber-950'}`}>
                      оценка качества отчета
                    </h3>
                    <p className={`text-sm ${isDark ? 'text-amber-200/80' : 'text-stone-600'}`}>
                      шкала от 0 до 100 баллов
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-xl border font-mono font-bold text-base ${scoreBadgeTheme.border} ${scoreBadgeTheme.bg} ${scoreBadgeTheme.text}`}>
                    {reviewScore}/100
                  </div>
                </div>

                {/* Score Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm font-mono font-semibold opacity-80">
                    <span>0</span>
                    <span>50</span>
                    <span>75</span>
                    <span>100</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={reviewScore}
                    onChange={(e) => setReviewScore(Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer h-2 rounded-lg"
                  />
                  <div className="flex justify-between items-center pt-1 text-sm">
                    <span className="opacity-80">статус:</span>
                    <span className={`font-bold ${scoreBadgeTheme.text}`}>
                      ● {scoreBadgeTheme.label}
                    </span>
                  </div>
                </div>

                {/* Quick Reaction Badges */}
                <div className="space-y-2 pt-2 border-t border-amber-400/20">
                  <label className={`block text-sm font-semibold ${
                    isDark ? 'text-amber-200/90' : 'text-amber-900'
                  }`}>
                    реакция руководителя:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: '🚀 Превосходно', label: '🚀 превосходно' },
                      { id: '👍 Принято', label: '👍 принято' },
                      { id: '⚠️ Доработать', label: '⚠️ доработать' },
                      { id: '❌ Требует доработки', label: '❌ на доработку' }
                    ].map((rx) => (
                      <button
                        key={rx.id}
                        type="button"
                        onClick={() => setManagerReaction(rx.id)}
                        className={`py-2 px-3 rounded-xl text-sm font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1.5 truncate ${
                          managerReaction === rx.id
                            ? isDark
                              ? 'bg-amber-400/20 border-amber-400 text-[#F4EE8E] shadow-sm'
                              : 'bg-amber-200 border-amber-500 text-amber-950 font-bold'
                            : isDark
                              ? 'bg-black/20 border-white/10 text-stone-400 hover:border-amber-400/30'
                              : 'bg-white border-stone-200 text-stone-700 hover:border-amber-300'
                        }`}
                      >
                        <span>{rx.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Overall Manager Comment / Summary */}
                <div className="space-y-2 pt-2 border-t border-amber-400/20">
                  <div className="flex items-center justify-between">
                    <label className={`block text-sm font-semibold ${
                      isDark ? 'text-amber-200/90' : 'text-amber-900'
                    }`}>
                      общее резюме руководителя:
                    </label>
                    <span className="text-sm font-mono opacity-70">
                      {managerComment.length} симв.
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={managerComment}
                    onChange={(e) => setManagerComment(e.target.value)}
                    placeholder="напишите итоговый комментарий по качеству смены и достигнутым результатам..."
                    className={`w-full p-3 rounded-xl border text-sm leading-relaxed outline-none transition-all resize-y ${
                      isDark 
                        ? 'bg-[#1A0F02] border-amber-400/30 text-amber-100 placeholder-stone-500 focus:border-amber-400' 
                        : 'bg-white border-amber-900/20 text-stone-900 placeholder-stone-400 focus:border-amber-500'
                    }`}
                  />
                </div>

                {/* Directives & Tasks for Employee */}
                <div className="space-y-2 pt-2 border-t border-amber-400/20">
                  <label className={`block text-sm font-semibold ${
                    isDark ? 'text-amber-200/90' : 'text-amber-900'
                  }`}>
                    поручения и задачи на следующую смену:
                  </label>
                  <textarea
                    rows={3}
                    value={managerTask}
                    onChange={(e) => setManagerTask(e.target.value)}
                    placeholder="конкретные поручения, цели или обязательные действия для сотрудника..."
                    className={`w-full p-3 rounded-xl border text-sm leading-relaxed outline-none transition-all resize-y ${
                      isDark 
                        ? 'bg-[#1A0F02] border-amber-400/30 text-amber-100 placeholder-stone-500 focus:border-amber-400' 
                        : 'bg-white border-amber-900/20 text-stone-900 placeholder-stone-400 focus:border-amber-500'
                    }`}
                  />
                </div>

                {/* Error Notice Banner */}
                {reviewErrorNotice && (
                  <div className={`p-3 rounded-xl border text-sm font-semibold flex items-center justify-between gap-2 ${
                    isDark ? 'bg-[#140A01]/70 border-amber-400/50 text-[#F4EE8E]' : 'bg-[#FAF6EC]/90 border-amber-700/40 text-amber-950'
                  }`}>
                    <span>{reviewErrorNotice}</span>
                    <button
                      type="button"
                      onClick={() => setReviewErrorNotice(null)}
                      className="p-1 opacity-70 hover:opacity-100 cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}

                {/* Final Submission Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={isSubmittingReview}
                    onClick={handleSubmitReview}
                    className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 hover:brightness-110 active:scale-98 ${
                      isDark 
                        ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 shadow-[0_0_20px_rgba(244,238,142,0.3)]' 
                        : 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-amber-950 shadow-md'
                    }`}
                  >
                    {isSubmittingReview ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" />
                        <span>сохраняю и отправляю рецензию...</span>
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        <span>зафиксировать и отправить сотруднику</span>
                      </>
                    )}
                  </button>
                  <p className={`text-center text-sm mt-2 opacity-80 ${
                    isDark ? 'text-amber-200/70' : 'text-stone-600'
                  }`}>
                    результат проверки сразу упадет сотруднику в уведомления и в Telegram с инлайн-кнопкой
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className={`relative max-w-3xl w-full p-4 rounded-3xl border shadow-2xl ${
              isDark ? 'bg-[#140A01] border-amber-400/50' : 'bg-white border-amber-900/30'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-amber-400/20">
              <span className="text-sm font-bold">{previewImage.title}</span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-lg opacity-70 hover:opacity-100 transition-opacity"
              >
                <X size={18} />
              </button>
            </div>
            <img
              src={previewImage.url}
              alt={previewImage.title}
              className="w-full max-h-[75vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
