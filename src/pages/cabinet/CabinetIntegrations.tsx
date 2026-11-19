import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Bot, Check, AlertCircle, HelpCircle, RefreshCw, 
  ExternalLink, Trash2, Plus, MessageSquare, ChevronRight, X,
  Radio, Settings2, Layers, Edit3, UserCheck, ShieldAlert, FileText, Bell
} from 'lucide-react';
import { ReportTemplate, UserProfile } from '../../types';
import { PushNotificationSettingsCard } from '../../components/pwa/controls/PushNotificationSettingsCard';

interface CabinetIntegrationsProps {
  reportTemplates: ReportTemplate[];
  onUpdateTemplate: (template: ReportTemplate) => void;
  currentUser: UserProfile | null;
  theme?: 'dark' | 'light';
  onNavigate?: (path: string) => void;
  currentPath?: string;
}

interface SavedChat {
  id: string;
  company_id: string;
  chat_id: string;
  title: string;
  type: string;
  username?: string;
  bot_present: number;
  bot_status: string;
  created_at: string;
}

interface RoutingRule {
  id: string;
  company_id: string;
  title: string;
  template_ids: string; // JSON string or "all"
  department_ids: string; // JSON string or "all"
  destination_type: string;
  report_format?: 'brief' | 'full';
  target_user_id?: string | null;
  target_chat_id?: string | null;
  target_title?: string | null;
  review_target_user_id?: string | null;
  send_on_submit: number;
  send_reminder: number;
  notify_inapp?: number;
  send_telegram?: number;
  reminder_15m_tg?: number;
  reminder_15m_inapp?: number;
  deadline_tg?: number;
  deadline_inapp?: number;
  overdue_15m_tg?: number;
  review_request_tg?: number;
  review_request_inapp?: number;
  review_result_tg?: number;
  review_result_inapp?: number;
  min_score?: number | null;
  is_active: number;
  created_at: string;
  updated_at?: string;
}

export default function CabinetIntegrations({
  reportTemplates,
  currentUser,
  theme = 'dark',
  onNavigate,
  currentPath
}: CabinetIntegrationsProps) {
  const isDark = theme === 'dark';

  // Navigation tabs: Rules (default) & Verified Channels
  const [activeTab, setActiveTab] = useState<'rules' | 'channels'>('rules');

  // Help accordion
  const [showIdGuide, setShowIdGuide] = useState<boolean>(false);

  // Custom modal for notifications and confirmations
  const [modalMessage, setModalMessage] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Saved Telegram Chats & Verification State
  const [savedChats, setSavedChats] = useState<SavedChat[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState<boolean>(false);
  const [newChatInput, setNewChatInput] = useState<string>('');
  const [newChatTitle, setNewChatTitle] = useState<string>('');
  const [isVerifyingChat, setIsVerifyingChat] = useState<boolean>(false);
  const [verifyStatus, setVerifyStatus] = useState<{
    success?: boolean;
    message?: string;
  } | null>(null);

  // Global Routing Rules State
  const [routingRules, setRoutingRules] = useState<RoutingRule[]>([]);
  const [isLoadingRules, setIsLoadingRules] = useState<boolean>(false);
  const [isSavingRule, setIsSavingRule] = useState<boolean>(false);

  // Create / Edit Rule Form State
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleTitle, setRuleTitle] = useState<string>('');
  const [ruleTplScope, setRuleTplScope] = useState<'all' | 'specific'>('all');
  const [ruleSelectedTplIds, setRuleSelectedTplIds] = useState<string[]>([]);
  const [ruleSelectedTplId, setRuleSelectedTplId] = useState<string>(reportTemplates[0]?.id || '');
  const [templateFilter, setTemplateFilter] = useState<string>('all');
  const [ruleType, setRuleType] = useState<string>('employee_direct');
  const [ruleTargetChatId, setRuleTargetChatId] = useState<string>('{employee_tg}');
  const [ruleTargetTitle, setRuleTargetTitle] = useState<string>('в личку автору отчета');
  const [ruleTargetUserId, setRuleTargetUserId] = useState<string>('');
  const [ruleSendOnSubmit, setRuleSendOnSubmit] = useState<boolean>(true);
  const [ruleSendReminder, setRuleSendReminder] = useState<boolean>(true);
  const [ruleMinScore, setRuleMinScore] = useState<string>('');
  const [ruleReportFormat, setRuleReportFormat] = useState<'brief' | 'full'>('full');

  // Specific notification & reminder toggles requested by user
  const [ruleNotifyInapp, setRuleNotifyInapp] = useState<boolean>(true);
  const [ruleSendTelegram, setRuleSendTelegram] = useState<boolean>(true);
  const [ruleReminder15mTg, setRuleReminder15mTg] = useState<boolean>(true);
  const [ruleReminder15mInapp, setRuleReminder15mInapp] = useState<boolean>(true);
  const [ruleDeadlineTg, setRuleDeadlineTg] = useState<boolean>(true);
  const [ruleDeadlineInapp, setRuleDeadlineInapp] = useState<boolean>(true);
  const [ruleOverdue15mTg, setRuleOverdue15mTg] = useState<boolean>(true);
  const [ruleReviewRequestTg, setRuleReviewRequestTg] = useState<boolean>(true);
  const [ruleReviewRequestInapp, setRuleReviewRequestInapp] = useState<boolean>(true);
  const [ruleReviewResultTg, setRuleReviewResultTg] = useState<boolean>(true);
  const [ruleReviewResultInapp, setRuleReviewResultInapp] = useState<boolean>(true);
  const [ruleReviewTargetUserId, setRuleReviewTargetUserId] = useState<string>('');

  const ruleFormRef = useRef<HTMLDivElement>(null);

  // Team employees with Telegram identifiers and roles
  const [teamEmployees, setTeamEmployees] = useState<Array<{ id: string; name: string; role?: string; roleTitle?: string; telegramHandle?: string; telegram_id?: string; position?: string }>>([]);
  const [ruleFeedback, setRuleFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Test sender state
  const [testChatId, setTestChatId] = useState<string>('');
  const [testStatus, setTestStatus] = useState<{
    loading: boolean;
    success?: boolean;
    message?: string;
  }>({ loading: false });

  // Effective company id
  const dirId = currentUser?.director_id || currentUser?.id;
  const effectiveCompanyId = currentUser?.company_id || (dirId ? `com-${dirId}` : 'flagship-main');

  // Load saved chats and routing rules from server on mount
  const loadSavedChats = async () => {
    setIsLoadingChats(true);
    try {
      const res = await fetch(`/api/telegram/saved-chats?company_id=${encodeURIComponent(effectiveCompanyId)}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setSavedChats(data.chats || []);
      }
    } catch (e) {
      console.warn('Error loading saved chats:', e);
    } finally {
      setIsLoadingChats(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const q = effectiveCompanyId ? `?company_id=${encodeURIComponent(effectiveCompanyId)}` : '';
      const res = await fetch(`/api/telegram/employees${q}`);
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.employees)) {
        setTeamEmployees(data.employees);
      }
    } catch (e) {
      console.warn('Error loading employees for Telegram:', e);
    }
  };

  const loadRoutingRules = async () => {
    setIsLoadingRules(true);
    try {
      const res = await fetch(`/api/telegram/routing-rules?company_id=${encodeURIComponent(effectiveCompanyId)}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setRoutingRules(data.rules || []);
      }
    } catch (e) {
      console.warn('Error loading routing rules:', e);
    } finally {
      setIsLoadingRules(false);
    }
  };

  useEffect(() => {
    loadSavedChats();
    loadRoutingRules();
    loadEmployees();
  }, [effectiveCompanyId]);

  // Reset form to default creation state
  const resetRuleForm = () => {
    setEditingRuleId(null);
    setRuleTitle('');
    setRuleTplScope('all');
    setRuleSelectedTplIds([]);
    setRuleSelectedTplId(reportTemplates[0]?.id || '');
    setRuleType('employee_direct');
    setRuleTargetChatId('{employee_tg}');
    setRuleTargetTitle('в личку автору отчета');
    setRuleTargetUserId('');
    setRuleSendOnSubmit(true);
    setRuleSendReminder(true);
    setRuleMinScore('');
    setRuleReportFormat('full');
    setRuleNotifyInapp(true);
    setRuleSendTelegram(true);
    setRuleReminder15mTg(true);
    setRuleReminder15mInapp(true);
    setRuleDeadlineTg(true);
    setRuleDeadlineInapp(true);
    setRuleOverdue15mTg(true);
    setRuleReviewRequestTg(true);
    setRuleReviewRequestInapp(true);
    setRuleReviewResultTg(true);
    setRuleReviewResultInapp(true);
    setRuleReviewTargetUserId('');
  };

  // Listen to navigation query params (e.g. ?openRule=1&templateId=...&scope=specific)
  useEffect(() => {
    try {
      const searchStr = typeof window !== 'undefined' ? window.location.search : '';
      const params = new URLSearchParams(searchStr || (currentPath?.includes('?') ? currentPath.split('?')[1] : ''));
      const openRule = params.get('openRule');
      const paramTplId = params.get('templateId');
      const paramScope = params.get('scope');

      if (openRule === '1' || paramTplId || paramScope === 'specific') {
        setEditingRuleId(null);
        setRuleTplScope('specific');
        setRuleReportFormat('full');
        if (paramTplId) {
          setRuleSelectedTplIds([paramTplId]);
          setRuleSelectedTplId(paramTplId);
          const foundTpl = reportTemplates?.find(t => t.id === paramTplId);
          if (foundTpl?.title) {
            setRuleTitle(`Отчет: ${foundTpl.title}`);
          }
        } else if (reportTemplates && reportTemplates.length > 0) {
          setRuleSelectedTplIds([reportTemplates[0].id]);
          setRuleSelectedTplId(reportTemplates[0].id);
        }

        // Clean query params so this does not fight with user interactions
        if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
          window.history.replaceState({}, '', window.location.pathname);
        }

        setTimeout(() => {
          if (ruleFormRef.current) {
            ruleFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 150);
      }
    } catch (e) {
      console.warn('Error reading integration query params:', e);
    }
  }, [currentPath, reportTemplates]);

  // Populate form with existing rule for editing
  const startEditRule = (rule: RoutingRule) => {
    setEditingRuleId(rule.id);
    setRuleTitle(rule.title);

    let isSpecific = false;
    let specificIds: string[] = [];
    try {
      if (rule.template_ids && rule.template_ids !== 'all' && rule.template_ids !== '["all"]') {
        let parsed: any = null;
        if (typeof rule.template_ids === 'string') {
          if (rule.template_ids.trim().startsWith('[') || rule.template_ids.trim().startsWith('{')) {
            try { parsed = JSON.parse(rule.template_ids); } catch {}
          } else {
            parsed = rule.template_ids.split(',').map(s => s.trim()).filter(Boolean);
          }
        } else if (Array.isArray(rule.template_ids)) {
          parsed = rule.template_ids;
        }
        if (Array.isArray(parsed) && parsed.length > 0 && !parsed.includes('all')) {
          isSpecific = true;
          specificIds = parsed;
        }
      }
    } catch (e) {}

    setRuleTplScope(isSpecific ? 'specific' : 'all');
    setRuleSelectedTplIds(specificIds);
    setRuleSelectedTplId(specificIds[0] || reportTemplates[0]?.id || '');
    setRuleType(rule.destination_type || 'employee_direct');
    setRuleTargetChatId(rule.target_chat_id || '{employee_tg}');
    setRuleTargetTitle(rule.target_title || '');
    setRuleTargetUserId(rule.target_user_id || '');
    setRuleSendOnSubmit(rule.send_on_submit === 1);
    setRuleSendReminder(rule.send_reminder === 1);
    setRuleMinScore(rule.min_score !== null && rule.min_score !== undefined ? String(rule.min_score) : '');
    setRuleReportFormat(rule.report_format === 'full' ? 'full' : 'brief');

    setRuleNotifyInapp(rule.notify_inapp !== undefined ? rule.notify_inapp !== 0 : true);
    setRuleSendTelegram(rule.send_telegram !== undefined ? rule.send_telegram !== 0 : true);
    setRuleReminder15mTg(rule.reminder_15m_tg !== undefined ? rule.reminder_15m_tg !== 0 : true);
    setRuleReminder15mInapp(rule.reminder_15m_inapp !== undefined ? rule.reminder_15m_inapp !== 0 : true);
    setRuleDeadlineTg(rule.deadline_tg !== undefined ? rule.deadline_tg !== 0 : true);
    setRuleDeadlineInapp(rule.deadline_inapp !== undefined ? rule.deadline_inapp !== 0 : true);
    setRuleOverdue15mTg(rule.overdue_15m_tg !== undefined ? rule.overdue_15m_tg !== 0 : true);
    setRuleReviewRequestTg(rule.review_request_tg !== undefined ? rule.review_request_tg !== 0 : true);
    setRuleReviewRequestInapp(rule.review_request_inapp !== undefined ? rule.review_request_inapp !== 0 : true);
    setRuleReviewResultTg(rule.review_result_tg !== undefined ? rule.review_result_tg !== 0 : true);
    setRuleReviewResultInapp(rule.review_result_inapp !== undefined ? rule.review_result_inapp !== 0 : true);
    setRuleReviewTargetUserId(rule.review_target_user_id || '');

    if (ruleFormRef.current) {
      ruleFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Toggle template in multi-selection list
  const toggleTemplateSelection = (templateId: string) => {
    setRuleSelectedTplIds(prev => 
      prev.includes(templateId) 
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  // Save rule (Create new or Update existing)
  const handleSaveRule = async () => {
    setRuleFeedback(null);
    let finalTitle = (ruleTitle || '').trim();
    if (!finalTitle) {
      if (ruleType === 'employee_direct') finalTitle = 'Отчет в личный чат автора';
      else if (ruleType === 'director') finalTitle = 'Отчет руководителю компании';
      else if (ruleType === 'direct') finalTitle = ruleTargetTitle ? `Отчет: ${ruleTargetTitle}` : 'Отчет сотруднику';
      else if (ruleType === 'channel') finalTitle = `Отчет в канал: ${ruleTargetTitle || ruleTargetChatId || 'Telegram'}`;
      else if (ruleType === 'group') finalTitle = `Отчет в группу: ${ruleTargetTitle || ruleTargetChatId || 'Telegram'}`;
      else finalTitle = 'Правило маршрутизации отчетов';
      setRuleTitle(finalTitle);
    }

    const safeTargetChatId = (ruleTargetChatId || '').trim();
    const safeTargetTitle = (ruleTargetTitle || '').trim();

    if (ruleType === 'direct' && !ruleTargetUserId && !safeTargetChatId) {
      const msg = 'выберите сотрудника или руководителя из списка получателей.';
      setRuleFeedback({ type: 'error', text: msg });
      setModalMessage(msg);
      return;
    }

    if ((ruleType === 'group' || ruleType === 'channel') && !safeTargetChatId) {
      const msg = 'укажите id или @юзернейм канала/группы.';
      setRuleFeedback({ type: 'error', text: msg });
      setModalMessage(msg);
      return;
    }

    setIsSavingRule(true);

    let templateIdsPayload: string[] = ['all'];
    if (ruleTplScope === 'specific') {
      if (ruleSelectedTplIds.length > 0) {
        templateIdsPayload = ruleSelectedTplIds;
      } else if (ruleSelectedTplId) {
        templateIdsPayload = [ruleSelectedTplId];
      } else if (reportTemplates && reportTemplates.length > 0) {
        templateIdsPayload = [reportTemplates[0].id];
      }
    }

    let targetChatIdPayload = safeTargetChatId || null;
    if (ruleType === 'employee_direct') {
      targetChatIdPayload = '{employee_tg}';
    } else if (ruleType === 'director') {
      targetChatIdPayload = safeTargetChatId || currentUser?.telegram_id || '169262990';
    } else if (ruleType === 'direct' && !targetChatIdPayload) {
      targetChatIdPayload = `{emp_${ruleTargetUserId}}`;
    }

    const payload = {
      title: finalTitle,
      company_id: effectiveCompanyId,
      destination_type: ruleType,
      report_format: ruleReportFormat || 'full',
      target_chat_id: targetChatIdPayload,
      target_title: safeTargetTitle || (ruleType === 'employee_direct' ? 'в личку автору' : ruleType === 'director' ? 'руководителю' : safeTargetChatId || 'получателю'),
      target_user_id: ruleTargetUserId || null,
      template_ids: templateIdsPayload,
      department_ids: ['all'],
      send_on_submit: ruleSendOnSubmit ? 1 : 0,
      send_reminder: ruleSendReminder ? 1 : 0,
      notify_inapp: ruleNotifyInapp ? 1 : 0,
      send_telegram: ruleSendTelegram ? 1 : 0,
      reminder_15m_tg: ruleReminder15mTg ? 1 : 0,
      reminder_15m_inapp: ruleReminder15mInapp ? 1 : 0,
      deadline_tg: ruleDeadlineTg ? 1 : 0,
      deadline_inapp: ruleDeadlineInapp ? 1 : 0,
      overdue_15m_tg: ruleOverdue15mTg ? 1 : 0,
      review_request_tg: ruleReviewRequestTg ? 1 : 0,
      review_request_inapp: ruleReviewRequestInapp ? 1 : 0,
      review_target_user_id: ruleReviewTargetUserId || null,
      review_result_tg: ruleReviewResultTg ? 1 : 0,
      review_result_inapp: ruleReviewResultInapp ? 1 : 0,
      min_score: (ruleMinScore || '').trim() ? Number((ruleMinScore || '').trim()) : null,
      is_active: 1
    };

    try {
      let res;
      if (editingRuleId) {
        res = await fetch(`/api/telegram/routing-rules/${editingRuleId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok && res.status === 404) {
          res = await fetch('/api/telegram/routing-rules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        }
      } else {
        res = await fetch('/api/telegram/routing-rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (res.ok && data.success) {
        if (data.rule) {
          setRoutingRules(prev => [data.rule, ...prev.filter(r => r.id !== data.rule.id)]);
        }
        resetRuleForm();
        await loadRoutingRules();
        const successMsg = editingRuleId ? 'правило маршрутизации успешно обновлено!' : 'правило успешно зафиксировано!';
        setRuleFeedback({ type: 'success', text: successMsg });
        setModalMessage(successMsg);
      } else {
        const errMsg = data.error || 'ошибка при сохранении правила';
        setRuleFeedback({ type: 'error', text: errMsg });
        setModalMessage(errMsg);
      }
    } catch (e: any) {
      const errMsg = e.message || 'ошибка соединения с сервером при сохранении правила.';
      setRuleFeedback({ type: 'error', text: errMsg });
      setModalMessage(errMsg);
    } finally {
      setIsSavingRule(false);
    }
  };

  // Toggle active status
  const handleToggleRuleActive = async (rule: RoutingRule) => {
    const nextVal = rule.is_active ? 0 : 1;
    try {
      const res = await fetch(`/api/telegram/routing-rules/${rule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: nextVal })
      });
      if (res.ok) {
        setRoutingRules(routingRules.map(r => r.id === rule.id ? { ...r, is_active: nextVal } : r));
      }
    } catch (e) {
      console.error('Ошибка обновления правила:', e);
    }
  };

  // Delete rule
  const handleDeleteRoutingRule = async (id: string) => {
    try {
      const res = await fetch(`/api/telegram/routing-rules/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setRoutingRules(routingRules.filter(r => r.id !== id));
        if (editingRuleId === id) resetRuleForm();
      }
    } catch (e) {
      console.error('Ошибка удаления правила:', e);
    } finally {
      setConfirmDeleteId(null);
    }
  };

  // Quick test send for a specific rule
  const handleTestRule = async (rule: RoutingRule) => {
    let target = rule.target_chat_id;
    if (rule.destination_type === 'employee_direct') {
      target = currentUser?.telegram_id || '169262990';
    } else if (rule.destination_type === 'director') {
      target = currentUser?.telegram_id || '169262990';
    }

    if (!target || target === '{employee_tg}') {
      setModalMessage('Для теста укажите в профиле Telegram ID или настройте чат.');
      return;
    }

    try {
      const res = await fetch('/api/telegram/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: target,
          text: `🔔 *Тестовая проверка правила «${rule.title}»*\n\nМаршрутизация настроена верно.\nВремя: ${new Date().toLocaleTimeString('ru-RU')}`
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setModalMessage(`Тестовое сообщение успешно отправлено адресату (${target})!`);
      } else {
        setModalMessage(data.error || 'Ошибка отправки тестового сообщения');
      }
    } catch (e) {
      setModalMessage('Ошибка соединения при отправке теста.');
    }
  };

  // Verify and save chat/channel
  const handleVerifyAndSaveChat = async () => {
    if (!newChatInput.trim()) {
      setModalMessage('Укажите ID чата или имя канала (например, -100123456789 или @channel_name)');
      return;
    }

    setIsVerifyingChat(true);
    setVerifyStatus(null);

    try {
      const res = await fetch('/api/telegram/verify-and-save-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: newChatInput.trim(),
          title: newChatTitle.trim() || undefined
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setVerifyStatus({
          success: true,
          message: data.message || 'Канал/чат подтвержден и сохранен в базе данных!'
        });
        setNewChatInput('');
        setNewChatTitle('');
        await loadSavedChats();
      } else {
        setVerifyStatus({
          success: false,
          message: data.error || 'Не удалось подтвердить присутствие бота в чате'
        });
      }
    } catch (e: any) {
      setVerifyStatus({
        success: false,
        message: 'Ошибка связи с сервером при проверке бота'
      });
    } finally {
      setIsVerifyingChat(false);
    }
  };

  // Delete saved chat
  const handleDeleteSavedChat = async (id: string) => {
    try {
      const res = await fetch(`/api/telegram/saved-chats/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setSavedChats(savedChats.filter(c => c.id !== id));
      }
    } catch (e) {
      console.error('Ошибка удаления чата:', e);
    }
  };

  // Test sending using the system Telegram bot
  const handleTestSend = async () => {
    if (!testChatId.trim()) {
      setModalMessage('Пожалуйста, укажите цифровой ID чата или имя пользователя для тестовой отправки.');
      return;
    }

    setTestStatus({ loading: true, message: undefined });

    try {
      const res = await fetch('/api/telegram/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: testChatId.trim(),
          text: `🔔 *Тестовое оповещение из системы «ИИ Рапорт»*\n\nСвязь с системным ботом платформы установлена успешно!\nВремя отправки: ${new Date().toLocaleTimeString('ru-RU')}`
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setTestStatus({
          loading: false,
          success: true,
          message: 'Тестовое сообщение успешно отправлено через системного бота!'
        });
      } else {
        setTestStatus({
          loading: false,
          success: false,
          message: data.error || 'Ошибка отправки: проверьте, что бот добавлен в чат и нажал Start'
        });
      }
    } catch (e) {
      setTestStatus({
        loading: false,
        success: false,
        message: 'Не удалось связаться с сервером отправки'
      });
    }
  };

  // Get template title helper
  const getTemplateScopeLabel = (rule: RoutingRule) => {
    if (!rule.template_ids || rule.template_ids === 'all' || rule.template_ids === '["all"]') {
      return 'все шаблоны отчетов';
    }
    try {
      const parsed = typeof rule.template_ids === 'string' ? JSON.parse(rule.template_ids) : rule.template_ids;
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (parsed.includes('all')) return 'все шаблоны отчетов';
        const titles = parsed.map(id => {
          const tpl = reportTemplates.find(t => t.id === id);
          return tpl ? tpl.title : id;
        });
        if (titles.length === 1) return `шаблон: «${titles[0]}»`;
        if (titles.length === 2) return `шаблоны: «${titles[0]}», «${titles[1]}»`;
        return `шаблоны (${titles.length}): «${titles[0]}», «${titles[1]}»...`;
      }
    } catch (e) {}
    return 'все шаблоны отчетов';
  };

  return (
    <div className={`space-y-6 text-sm pb-44 sm:pb-32 ${isDark ? 'text-amber-100' : 'text-stone-900'}`} id="cabinet-integrations-root">
      {/* Header */}
      <div className={`p-4 sm:p-6 rounded-2xl border backdrop-blur-md space-y-3 ${
        isDark 
          ? 'bg-[#1A0F02]/80 border-amber-400/40 shadow-[0_0_30px_rgba(244,238,142,0.15)]' 
          : 'bg-white/80 border-amber-900/20 shadow-sm'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${
            isDark 
              ? 'bg-amber-400/10 border-amber-400/40 text-[#F4EE8E]' 
              : 'bg-amber-100 border-amber-300 text-amber-900'
          }`}>
            <Send size={24} />
          </div>
          <div>
            <h2 className={`text-lg sm:text-xl font-bold ${
              isDark ? 'text-[#F4EE8E]' : 'text-amber-950'
            }`}>
              маршрутизация и отправка в telegram
            </h2>
            <p className={`text-sm ${
              isDark ? 'text-amber-200/80' : 'text-stone-700'
            }`}>
              единые правила отправки сданных рапортов и напоминаний в telegram
            </p>
          </div>
        </div>

        {/* Navigation tabs */}
        <div className="pt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'rules'
                ? isDark
                  ? 'bg-gradient-to-r from-[#F4EE8E] to-[#E7C768] text-stone-950 border-amber-300 shadow-[0_0_15px_rgba(244,238,142,0.3)]'
                  : 'bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 border-amber-500 shadow-sm'
                : isDark
                  ? 'bg-[#140A01]/70 border-amber-400/30 text-amber-200 hover:bg-amber-400/10'
                  : 'bg-white border-amber-900/20 text-stone-700 hover:bg-amber-50'
            }`}
          >
            <Settings2 size={16} />
            <span>правила отправки ({routingRules.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('channels')}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'channels'
                ? isDark
                  ? 'bg-gradient-to-r from-[#F4EE8E] to-[#E7C768] text-stone-950 border-amber-300 shadow-[0_0_15px_rgba(244,238,142,0.3)]'
                  : 'bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 border-amber-500 shadow-sm'
                : isDark
                  ? 'bg-[#140A01]/70 border-amber-400/30 text-amber-200 hover:bg-amber-400/10'
                  : 'bg-white border-amber-900/20 text-stone-700 hover:bg-amber-50'
            }`}
          >
            <Radio size={16} />
            <span>подтвержденные каналы и чаты ({savedChats.length})</span>
          </button>
        </div>
      </div>

      {/* Guide: How to find Telegram ID */}
      <div className={`rounded-2xl border overflow-hidden transition-all ${
        isDark 
          ? 'bg-[#1A0F02]/70 border-amber-400/30' 
          : 'bg-white/80 border-amber-900/20 shadow-sm'
      }`}>
        <button
          type="button"
          onClick={() => setShowIdGuide(!showIdGuide)}
          className={`w-full p-4 sm:p-5 flex items-center justify-between text-left transition-colors cursor-pointer ${
            isDark ? 'hover:bg-amber-400/5 text-amber-200' : 'hover:bg-amber-50/50 text-amber-950'
          }`}
        >
          <div className="flex items-center gap-3 font-semibold text-sm">
            <HelpCircle size={20} className={isDark ? 'text-amber-400' : 'text-amber-800'} />
            <span>инструкция: как узнать id чата, группы или канала в telegram</span>
          </div>
          <ChevronRight 
            size={20} 
            className={`transition-transform ${showIdGuide ? 'rotate-90' : ''} ${isDark ? 'text-amber-400' : 'text-amber-800'}`} 
          />
        </button>

        {showIdGuide && (
          <div className={`p-4 sm:p-6 border-t space-y-4 text-sm ${
            isDark 
              ? 'border-amber-400/20 bg-[#140A01] text-stone-300' 
              : 'border-amber-900/15 bg-amber-50/40 text-stone-800'
          }`}>
            <div className="space-y-1.5">
              <h4 className={`font-bold text-sm ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                1. личный id сотрудника или руководителя:
              </h4>
              <p className="leading-relaxed">
                откройте в telegram бота{' '}
                <span className={`font-mono px-2 py-0.5 rounded border text-sm ${
                  isDark ? 'bg-amber-950/50 border-amber-400/30 text-amber-200' : 'bg-white border-amber-900/20 text-amber-900'
                }`}>@userinfobot</span> или{' '}
                <span className={`font-mono px-2 py-0.5 rounded border text-sm ${
                  isDark ? 'bg-amber-950/50 border-amber-400/30 text-amber-200' : 'bg-white border-amber-900/20 text-amber-900'
                }`}>@getmyid_bot</span>, 
                нажмите старт — бот сразу пришлет цифровой id (например, <code className="font-bold">918273645</code>).
              </p>
            </div>

            <div className="space-y-1.5">
              <h4 className={`font-bold text-sm ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                2. id группы или супергруппы (отдела):
              </h4>
              <ul className="list-disc pl-5 space-y-1 leading-relaxed">
                <li>добавьте системного бота <span className="font-bold font-mono">@ii_rrbot</span> в нужную группу сотрудников.</li>
                <li>назначьте боту права администратора (или дайте разрешение на отправку сообщений).</li>
                <li>
                  перешлите сообщение из этой группы боту <span className="font-mono">@getmyid_bot</span>, 
                  он пришлет id группы (обычно начинается со знака минус, например, <code className="font-bold">-1001928374650</code>).
                </li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <h4 className={`font-bold text-sm ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                3. id публичного или приватного канала:
              </h4>
              <p className="leading-relaxed">
                для публичного канала можно указать его имя (например, <code className="font-bold">@company_raports</code>). 
                обязательно добавьте системного бота в администраторы канала с правом публикации сообщений.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* TAB 1: Unified Routing Rules */}
      {activeTab === 'rules' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Create or Edit Rule Form */}
          <div ref={ruleFormRef} className="lg:col-span-5 space-y-4">
            <div className={`p-4 sm:p-6 rounded-2xl border backdrop-blur-md space-y-4 ${
              isDark 
                ? 'bg-[#1A0F02]/80 border-amber-400/40 shadow-[0_0_25px_rgba(244,238,142,0.12)]' 
                : 'bg-white/80 border-amber-900/20 shadow-sm'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                    isDark ? 'bg-amber-400/10 border-amber-400/30 text-[#F4EE8E]' : 'bg-amber-100 border-amber-300 text-amber-900'
                  }`}>
                    {editingRuleId ? <Edit3 size={20} /> : <Settings2 size={20} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`text-base font-bold ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                        {editingRuleId ? 'редактировать правило' : 'создать правило отправки'}
                      </h3>
                      {editingRuleId ? (
                        <span className={`px-2 py-0.5 rounded-md font-mono text-sm border font-semibold ${
                          isDark ? 'bg-amber-400/20 border-amber-400/40 text-amber-200' : 'bg-amber-100 border-amber-300 text-amber-950'
                        }`}>
                          id: {editingRuleId}
                        </span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-md text-sm border ${
                          isDark ? 'border-amber-400/20 text-amber-300/60' : 'border-amber-900/10 text-stone-500'
                        }`}>
                          (id генерируется автоматически)
                        </span>
                      )}
                    </div>
                    <p className={`text-sm ${isDark ? 'text-amber-200/80' : 'text-stone-600'}`}>
                      настройка автоматической отправки отчетов
                    </p>
                  </div>
                </div>

                {editingRuleId && (
                  <button
                    type="button"
                    onClick={resetRuleForm}
                    className={`text-sm px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                      isDark ? 'border-amber-400/30 text-amber-200 hover:bg-amber-400/10' : 'border-amber-900/20 text-stone-700 hover:bg-amber-100'
                    }`}
                  >
                    отмена
                  </button>
                )}
              </div>

              <div className="space-y-3.5">
                {/* Rule Title */}
                <div>
                  <label className={`text-sm block mb-1 font-medium ${isDark ? 'text-amber-200' : 'text-amber-950'}`}>
                    Название правила
                  </label>
                  <input
                    type="text"
                    value={ruleTitle}
                    onChange={(e) => setRuleTitle(e.target.value)}
                    placeholder="Например: Рапорты продаж в канал дирекции"
                    className={`w-full border rounded-xl px-3.5 py-2.5 text-sm outline-none ${
                      isDark 
                        ? 'bg-[#140A01] border-amber-400/40 text-amber-100 focus:border-amber-300' 
                        : 'bg-amber-50/50 border-amber-900/30 text-amber-950 focus:border-amber-600'
                    }`}
                  />
                </div>

                {/* Templates Selector */}
                <div>
                  <label className={`text-sm block mb-1 font-medium ${isDark ? 'text-amber-200' : 'text-amber-950'}`}>
                    шаблоны отчетов
                  </label>

                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setRuleTplScope('all')}
                      className={`py-2 px-3 rounded-xl text-sm font-bold border transition-all cursor-pointer text-center ${
                        ruleTplScope === 'all'
                          ? isDark ? 'bg-amber-400/25 border-amber-400 text-[#F4EE8E]' : 'bg-amber-200 border-amber-500 text-amber-950'
                          : isDark ? 'border-amber-400/20 text-stone-300 hover:text-white' : 'border-amber-900/20 text-stone-700'
                      }`}
                    >
                      для всех шаблонов
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRuleTplScope('specific');
                        if (ruleSelectedTplIds.length === 0 && reportTemplates.length > 0) {
                          setRuleSelectedTplIds([reportTemplates[0].id]);
                        }
                      }}
                      className={`py-2 px-3 rounded-xl text-sm font-bold border transition-all cursor-pointer text-center ${
                        ruleTplScope === 'specific'
                          ? isDark ? 'bg-amber-400/25 border-amber-400 text-[#F4EE8E]' : 'bg-amber-200 border-amber-500 text-amber-950'
                          : isDark ? 'border-amber-400/20 text-stone-300 hover:text-white' : 'border-amber-900/20 text-stone-700'
                      }`}
                    >
                      выбрать определенные
                    </button>
                  </div>

                  {ruleTplScope === 'specific' && (
                    <div className="space-y-2 mt-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className={isDark ? 'text-amber-200/90' : 'text-amber-950 font-medium'}>
                          выберите шаблоны ({ruleSelectedTplIds.length} выбрано):
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setRuleSelectedTplIds(reportTemplates.map(t => t.id))}
                            className="text-sm underline cursor-pointer hover:opacity-80"
                            style={{ color: isDark ? '#F4EE8E' : '#92400E' }}
                          >
                            выбрать все
                          </button>
                          <span className="opacity-40">|</span>
                          <button
                            type="button"
                            onClick={() => setRuleSelectedTplIds([])}
                            className="text-sm underline cursor-pointer hover:opacity-80"
                            style={{ color: isDark ? '#F4EE8E' : '#92400E' }}
                          >
                            снять все
                          </button>
                        </div>
                      </div>

                      <div 
                        className={`max-h-44 overflow-y-auto rounded-xl border p-2 space-y-1.5 ${
                          isDark ? 'bg-[#140A01] border-amber-400/30' : 'bg-amber-50/50 border-amber-900/20'
                        }`}
                      >
                        {reportTemplates.map(tpl => {
                          const isChecked = ruleSelectedTplIds.includes(tpl.id);
                          return (
                            <div
                              key={tpl.id}
                              onClick={() => toggleTemplateSelection(tpl.id)}
                              className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors ${
                                isChecked
                                  ? isDark ? 'bg-amber-400/20 text-[#F4EE8E]' : 'bg-amber-100 text-amber-950 font-medium'
                                  : isDark ? 'hover:bg-amber-400/10 text-stone-300' : 'hover:bg-amber-50 text-stone-800'
                              }`}
                            >
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 ${
                                isChecked
                                  ? isDark ? 'bg-[#E7C768] border-[#F4EE8E] text-[#140A01]' : 'bg-amber-500 border-amber-600 text-stone-950'
                                  : isDark ? 'border-amber-400/40 bg-[#1A0F02]' : 'border-amber-900/30 bg-white'
                              }`}>
                                {isChecked && <Check size={12} strokeWidth={3} />}
                              </div>
                              <span className="text-sm truncate flex-1">{tpl.title}</span>
                              <span className={`text-sm px-1.5 py-0.5 rounded border shrink-0 ${
                                isDark ? 'bg-[#1A0F02] border-amber-400/25 text-amber-300/80' : 'bg-white border-amber-900/20 text-stone-600'
                              }`}>
                                {tpl.departmentName || 'общий'}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {ruleSelectedTplIds.length === 0 && (
                        <p className="text-sm text-amber-500">
                          внимание: не выбрано ни одного шаблона (будет применено ко всем)
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Target Type */}
                <div>
                  <label className={`text-sm block mb-1 font-medium ${isDark ? 'text-amber-200' : 'text-amber-950'}`}>
                    Куда направлять
                  </label>
                  <select
                    value={ruleType}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRuleType(val);
                      if (val === 'employee_direct') {
                        setRuleTargetTitle('В личку автору отчета');
                        setRuleTargetChatId('{employee_tg}');
                        setRuleTargetUserId('');
                      } else if (val === 'director') {
                        setRuleTargetTitle('Личный чат руководителя');
                        const defaultTg = currentUser?.telegram_id || '169262990';
                        setRuleTargetChatId(defaultTg);
                        setRuleTargetUserId(currentUser?.id || '');
                      } else if (val === 'direct') {
                        setRuleTargetTitle('');
                        setRuleTargetChatId('');
                        setRuleTargetUserId('');
                      } else if (val === 'group') {
                        setRuleTargetTitle('Группа отдела в Telegram');
                        setRuleTargetChatId('');
                        setRuleTargetUserId('');
                      } else if (val === 'channel') {
                        setRuleTargetTitle('Канал отчетов в Telegram');
                        setRuleTargetChatId('');
                        setRuleTargetUserId('');
                      }
                    }}
                    className={`w-full border rounded-xl px-3.5 py-2.5 text-sm outline-none cursor-pointer ${
                      isDark 
                        ? 'bg-[#140A01] border-amber-400/40 text-amber-100' 
                        : 'bg-amber-50/50 border-amber-900/30 text-amber-950'
                    }`}
                  >
                    <option value="employee_direct">Личный чат сотрудника (автора отчета)</option>
                    <option value="director">Личный чат руководителя компании</option>
                    <option value="direct">Конкретный сотрудник из команды</option>
                    <option value="group">Группа отдела в Telegram</option>
                    <option value="channel">Канал отчетов в Telegram</option>
                  </select>
                </div>

                {/* Info Card for Employee Direct */}
                {ruleType === 'employee_direct' && (
                  <div className={`p-3.5 rounded-xl border text-sm ${
                    isDark ? 'bg-[#140A01]/80 border-amber-400/30 text-amber-200' : 'bg-amber-50 border-amber-900/20 text-stone-800'
                  }`}>
                    <p className="font-semibold mb-1">Личный чат автора отчета</p>
                    <p className={`text-sm leading-relaxed ${isDark ? 'text-amber-100/80' : 'text-stone-600'}`}>
                      Каждый сданный рапорт будет отправляться в личные сообщения Telegram сотруднику, который заполнил и отправил отчет. Telegram ID автора берется динамически из базы данных при отправке.
                    </p>
                  </div>
                )}

                {/* Director Target Setup */}
                {ruleType === 'director' && (
                  <div className="space-y-3">
                    <div>
                      <label className={`text-sm block mb-1 font-medium ${isDark ? 'text-amber-200' : 'text-amber-950'}`}>
                        Telegram ID или @username руководителя
                      </label>
                      <input
                        type="text"
                        value={ruleTargetChatId === '{employee_tg}' ? (currentUser?.telegram_id || '169262990') : ruleTargetChatId}
                        onChange={(e) => setRuleTargetChatId(e.target.value)}
                        placeholder="Например: 169262990 или @shishkarnem"
                        className={`w-full border rounded-xl px-3.5 py-2.5 text-sm outline-none font-mono ${
                          isDark 
                            ? 'bg-[#140A01] border-amber-400/40 text-amber-100' 
                            : 'bg-amber-50/50 border-amber-900/30 text-amber-950'
                        }`}
                      />
                      <p className={`text-sm mt-1.5 ${isDark ? 'text-amber-300/80' : 'text-stone-600'}`}>
                        {ruleTargetChatId ? 'ID руководителя подставлен из базы данных. При необходимости вы можете изменить его.' : 'Укажите числовой Telegram ID или @username руководителя вручную.'}
                      </p>
                    </div>

                    <div>
                      <label className={`text-sm block mb-1 font-medium ${isDark ? 'text-amber-200' : 'text-amber-950'}`}>
                        Название адресата
                      </label>
                      <input
                        type="text"
                        value={ruleTargetTitle}
                        onChange={(e) => setRuleTargetTitle(e.target.value)}
                        placeholder="Личный чат руководителя"
                        className={`w-full border rounded-xl px-3.5 py-2.5 text-sm outline-none ${
                          isDark 
                            ? 'bg-[#140A01] border-amber-400/40 text-amber-100' 
                            : 'bg-amber-50/50 border-amber-900/30 text-amber-950'
                        }`}
                      />
                    </div>
                  </div>
                )}

                {/* Picker for Team Employee */}
                {ruleType === 'direct' && (
                  <div className="space-y-3">
                    <div>
                      <label className={`text-sm block mb-1 font-medium ${isDark ? 'text-amber-200' : 'text-amber-950'}`}>
                        Выберите сотрудника, руководителя или директора
                      </label>
                      <select
                        value={ruleTargetUserId}
                        onChange={(e) => {
                          const uid = e.target.value;
                          setRuleTargetUserId(uid);
                          const emp = teamEmployees.find(m => m.id === uid);
                          if (emp) {
                            const roleLabel = emp.roleTitle || emp.position || emp.role || 'Сотрудник';
                            setRuleTargetTitle(`${roleLabel}: ${emp.name}`);
                            // Auto-populate Telegram ID if present in DB
                            const tgVal = emp.telegram_id || (emp.telegramHandle ? emp.telegramHandle : '');
                            setRuleTargetChatId(tgVal);
                            if (!ruleTitle.trim() || ruleTitle.startsWith('Отчет:')) {
                              setRuleTitle(`Отчет: ${emp.name} (${roleLabel})`);
                            }
                          }
                        }}
                        className={`w-full border rounded-xl px-3.5 py-2.5 text-sm outline-none cursor-pointer ${
                          isDark 
                            ? 'bg-[#140A01] border-amber-400/40 text-amber-100' 
                            : 'bg-amber-50/50 border-amber-900/30 text-amber-950'
                        }`}
                      >
                        <option value="">Выберите получателя ({teamEmployees.length} сотрудников и руководителей)</option>
                        {teamEmployees.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} — {emp.roleTitle || emp.position || emp.role} {emp.telegram_id ? `(TG ID: ${emp.telegram_id})` : emp.telegramHandle ? `(${emp.telegramHandle})` : '(нет TG в базе)'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={`text-sm block mb-1 font-medium ${isDark ? 'text-amber-200' : 'text-amber-950'}`}>
                        Telegram ID или @username сотрудника
                      </label>
                      <input
                        type="text"
                        value={ruleTargetChatId}
                        onChange={(e) => setRuleTargetChatId(e.target.value)}
                        placeholder="Например: 169262990 или @username"
                        className={`w-full border rounded-xl px-3.5 py-2.5 text-sm outline-none font-mono ${
                          isDark 
                            ? 'bg-[#140A01] border-amber-400/40 text-amber-100' 
                            : 'bg-amber-50/50 border-amber-900/30 text-amber-950'
                        }`}
                      />
                      <p className={`text-sm mt-1.5 ${isDark ? 'text-amber-300/80' : 'text-stone-600'}`}>
                        {ruleTargetChatId 
                          ? 'ID подставлен автоматически из профиля сотрудника. Вы можете скорректировать его при необходимости.' 
                          : 'У этого сотрудника нет Telegram ID в базе — введите числовой ID или @username вручную.'}
                      </p>
                    </div>

                    <div>
                      <label className={`text-sm block mb-1 font-medium ${isDark ? 'text-amber-200' : 'text-amber-950'}`}>
                        Название адресата
                      </label>
                      <input
                        type="text"
                        value={ruleTargetTitle}
                        onChange={(e) => setRuleTargetTitle(e.target.value)}
                        placeholder="Например: Алексей Смирнов (Руководитель проектов)"
                        className={`w-full border rounded-xl px-3.5 py-2.5 text-sm outline-none ${
                          isDark 
                            ? 'bg-[#140A01] border-amber-400/40 text-amber-100' 
                            : 'bg-amber-50/50 border-amber-900/30 text-amber-950'
                        }`}
                      />
                    </div>
                  </div>
                )}

                {/* Pickers for Group / Channel */}
                {(ruleType === 'group' || ruleType === 'channel') && (
                  <>
                    {savedChats.length > 0 && (
                      <div>
                        <label className={`text-sm block mb-1 font-medium ${isDark ? 'text-amber-200/80' : 'text-stone-600'}`}>
                          Быстрый выбор из проверенных каналов:
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {savedChats.map(sc => (
                            <button
                              key={sc.id}
                              type="button"
                              onClick={() => {
                                setRuleTargetChatId(sc.chat_id);
                                setRuleTargetTitle(sc.title);
                              }}
                              className={`text-sm px-2.5 py-1 rounded-lg border transition-colors cursor-pointer truncate max-w-full ${
                                ruleTargetChatId === sc.chat_id
                                  ? isDark ? 'bg-amber-400/25 border-amber-400 text-[#F4EE8E]' : 'bg-amber-200 border-amber-500 text-amber-950 font-bold'
                                  : isDark ? 'border-amber-400/20 text-stone-300 hover:text-white' : 'border-amber-900/20 text-stone-700 hover:text-amber-950'
                              }`}
                            >
                              + {sc.title}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className={`text-sm block mb-1 font-medium ${isDark ? 'text-amber-200' : 'text-amber-950'}`}>
                        ID чата или канала
                      </label>
                      <input
                        type="text"
                        value={ruleTargetChatId}
                        onChange={(e) => setRuleTargetChatId(e.target.value)}
                        placeholder="-100123456789 или @канал"
                        className={`w-full border rounded-xl px-3.5 py-2.5 text-sm outline-none font-mono ${
                          isDark 
                            ? 'bg-[#140A01] border-amber-400/40 text-amber-100' 
                            : 'bg-amber-50/50 border-amber-900/30 text-amber-950'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`text-sm block mb-1 font-medium ${isDark ? 'text-amber-200' : 'text-amber-950'}`}>
                        Название адресата
                      </label>
                      <input
                        type="text"
                        value={ruleTargetTitle}
                        onChange={(e) => setRuleTargetTitle(e.target.value)}
                        placeholder="Например: Канал дирекции"
                        className={`w-full border rounded-xl px-3.5 py-2.5 text-sm outline-none ${
                          isDark 
                            ? 'bg-[#140A01] border-amber-400/40 text-amber-100' 
                            : 'bg-amber-50/50 border-amber-900/30 text-amber-950'
                        }`}
                      />
                    </div>
                  </>
                )}

                {/* Report Format Selection */}
                <div className="pt-2 border-t border-amber-400/20">
                  <label className={`text-sm block mb-1.5 font-medium ${isDark ? 'text-amber-200' : 'text-amber-950'}`}>
                    Вид отчета в сообщении
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRuleReportFormat('brief')}
                      className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                        ruleReportFormat === 'brief'
                          ? isDark 
                            ? 'bg-amber-400/25 border-amber-400 text-[#F4EE8E] shadow-[0_0_15px_rgba(244,238,142,0.15)]' 
                            : 'bg-amber-100 border-amber-500 text-amber-950 font-bold'
                          : isDark 
                            ? 'bg-[#140A01] border-amber-400/20 text-stone-300 hover:text-white' 
                            : 'bg-amber-50/40 border-amber-900/20 text-stone-700 hover:bg-amber-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <FileText size={16} className={isDark ? 'text-amber-300' : 'text-amber-700'} />
                        <span className="font-bold text-sm">Краткий отчет</span>
                      </div>
                      <p className={`text-sm ${isDark ? 'text-stone-300' : 'text-stone-600'}`}>
                        компактная таблица метрик, сворачиваемая выжимка ИИ и стилизованная кнопка перехода
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRuleReportFormat('full')}
                      className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                        ruleReportFormat === 'full'
                          ? isDark 
                            ? 'bg-amber-400/25 border-amber-400 text-[#F4EE8E] shadow-[0_0_15px_rgba(244,238,142,0.15)]' 
                            : 'bg-amber-100 border-amber-500 text-amber-950 font-bold'
                          : isDark 
                            ? 'bg-[#140A01] border-amber-400/20 text-stone-300 hover:text-white' 
                            : 'bg-amber-50/40 border-amber-900/20 text-stone-700 hover:bg-amber-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Layers size={16} className={isDark ? 'text-amber-300' : 'text-amber-700'} />
                        <span className="font-bold text-sm">Полный отчет</span>
                      </div>
                      <p className={`text-sm ${isDark ? 'text-stone-300' : 'text-stone-600'}`}>
                        таблица параметров, раскрывающиеся блоки ответов и ИИ-анализа, фото и документы
                      </p>
                    </button>
                  </div>
                </div>

                {/* Trigger & Notification Toggles Section */}
                <div className="pt-3 border-t space-y-4 border-amber-400/20">
                  <div className="space-y-1">
                    <h4 className={`text-sm font-bold flex items-center gap-1.5 ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                      <Bell size={16} className={isDark ? 'text-amber-400' : 'text-amber-700'} />
                      <span>Каналы и правила доставки отчетов</span>
                    </h4>
                    <p className={`text-sm ${isDark ? 'text-stone-300' : 'text-stone-600'}`}>
                      настройте каналы уведомлений, напоминания и ручную проверку руководителем
                    </p>
                  </div>

                  {/* 1. Global delivery channels */}
                  <div className={`p-3 rounded-xl border space-y-2.5 ${
                    isDark ? 'bg-[#140A01]/70 border-amber-400/30' : 'bg-amber-50/40 border-amber-900/20'
                  }`}>
                    <span className={`text-sm font-bold block ${isDark ? 'text-amber-300' : 'text-amber-900'}`}>
                      Основные каналы отправки
                    </span>
                    <div className="space-y-2">
                      <div 
                        onClick={() => setRuleSendTelegram(!ruleSendTelegram)}
                        className="flex items-start gap-2.5 cursor-pointer select-none"
                      >
                        <div className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center transition-all shrink-0 ${
                          ruleSendTelegram
                            ? isDark ? 'bg-[#E7C768] border-[#F4EE8E] text-[#140A01]' : 'bg-amber-500 border-amber-600 text-stone-950'
                            : isDark ? 'border-amber-400/50 bg-[#1A0F02]' : 'border-amber-900/30 bg-white'
                        }`}>
                          {ruleSendTelegram && <Check size={12} strokeWidth={3} />}
                        </div>
                        <div>
                          <span className={`text-sm font-medium block ${isDark ? 'text-amber-100' : 'text-amber-950'}`}>
                            Включение отправки в Telegram
                          </span>
                          <span className={`text-sm block ${isDark ? 'text-stone-300' : 'text-stone-600'}`}>
                            пересылать сданные рапорты и сообщения через Telegram-бота
                          </span>
                        </div>
                      </div>

                      <div 
                        onClick={() => setRuleNotifyInapp(!ruleNotifyInapp)}
                        className="flex items-start gap-2.5 cursor-pointer select-none"
                      >
                        <div className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center transition-all shrink-0 ${
                          ruleNotifyInapp
                            ? isDark ? 'bg-[#E7C768] border-[#F4EE8E] text-[#140A01]' : 'bg-amber-500 border-amber-600 text-stone-950'
                            : isDark ? 'border-amber-400/50 bg-[#1A0F02]' : 'border-amber-900/30 bg-white'
                        }`}>
                          {ruleNotifyInapp && <Check size={12} strokeWidth={3} />}
                        </div>
                        <div>
                          <span className={`text-sm font-medium block ${isDark ? 'text-amber-100' : 'text-amber-950'}`}>
                            Включение уведомлений в кабинете
                          </span>
                          <span className={`text-sm block ${isDark ? 'text-stone-300' : 'text-stone-600'}`}>
                            отображать системные пуш-уведомления и колокольчик в личном кабинете
                          </span>
                        </div>
                      </div>

                      <div 
                        onClick={() => setRuleSendOnSubmit(!ruleSendOnSubmit)}
                        className="flex items-start gap-2.5 cursor-pointer select-none pt-1 border-t border-amber-400/15"
                      >
                        <div className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center transition-all shrink-0 ${
                          ruleSendOnSubmit
                            ? isDark ? 'bg-[#E7C768] border-[#F4EE8E] text-[#140A01]' : 'bg-amber-500 border-amber-600 text-stone-950'
                            : isDark ? 'border-amber-400/50 bg-[#1A0F02]' : 'border-amber-900/30 bg-white'
                        }`}>
                          {ruleSendOnSubmit && <Check size={12} strokeWidth={3} />}
                        </div>
                        <div>
                          <span className={`text-sm font-medium block ${isDark ? 'text-amber-100' : 'text-amber-950'}`}>
                            Отправлять сданный рапорт (RichMessage в Markdown)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 1b. Mobile PWA Push Notification Settings */}
                  <PushNotificationSettingsCard userId={currentUser?.id} theme={isDark ? 'dark' : 'light'} compact />

                  {/* 2. Reminders: 15m before and deadline */}
                  <div className={`p-3 rounded-xl border space-y-2.5 ${
                    isDark ? 'bg-[#140A01]/70 border-amber-400/30' : 'bg-amber-50/40 border-amber-900/20'
                  }`}>
                    <span className={`text-sm font-bold block ${isDark ? 'text-amber-300' : 'text-amber-900'}`}>
                      Напоминания до и во время отчета
                    </span>

                    <div className="space-y-2">
                      <div 
                        onClick={() => setRuleReminder15mTg(!ruleReminder15mTg)}
                        className="flex items-start gap-2.5 cursor-pointer select-none"
                      >
                        <div className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center transition-all shrink-0 ${
                          ruleReminder15mTg
                            ? isDark ? 'bg-[#E7C768] border-[#F4EE8E] text-[#140A01]' : 'bg-amber-500 border-amber-600 text-stone-950'
                            : isDark ? 'border-amber-400/50 bg-[#1A0F02]' : 'border-amber-900/30 bg-white'
                        }`}>
                          {ruleReminder15mTg && <Check size={12} strokeWidth={3} />}
                        </div>
                        <div>
                          <span className={`text-sm font-medium block ${isDark ? 'text-amber-100' : 'text-amber-950'}`}>
                            Отправка напоминания в Telegram за 15 минут до отчета
                          </span>
                        </div>
                      </div>

                      <div 
                        onClick={() => setRuleReminder15mInapp(!ruleReminder15mInapp)}
                        className="flex items-start gap-2.5 cursor-pointer select-none"
                      >
                        <div className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center transition-all shrink-0 ${
                          ruleReminder15mInapp
                            ? isDark ? 'bg-[#E7C768] border-[#F4EE8E] text-[#140A01]' : 'bg-amber-500 border-amber-600 text-stone-950'
                            : isDark ? 'border-amber-400/50 bg-[#1A0F02]' : 'border-amber-900/30 bg-white'
                        }`}>
                          {ruleReminder15mInapp && <Check size={12} strokeWidth={3} />}
                        </div>
                        <div>
                          <span className={`text-sm font-medium block ${isDark ? 'text-amber-100' : 'text-amber-950'}`}>
                            Отправка напоминания в уведомления кабинета за 15 минут до отчета
                          </span>
                        </div>
                      </div>

                      <div 
                        onClick={() => setRuleDeadlineTg(!ruleDeadlineTg)}
                        className="flex items-start gap-2.5 cursor-pointer select-none pt-1 border-t border-amber-400/15"
                      >
                        <div className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center transition-all shrink-0 ${
                          ruleDeadlineTg
                            ? isDark ? 'bg-[#E7C768] border-[#F4EE8E] text-[#140A01]' : 'bg-amber-500 border-amber-600 text-stone-950'
                            : isDark ? 'border-amber-400/50 bg-[#1A0F02]' : 'border-amber-900/30 bg-white'
                        }`}>
                          {ruleDeadlineTg && <Check size={12} strokeWidth={3} />}
                        </div>
                        <div>
                          <span className={`text-sm font-medium block ${isDark ? 'text-amber-100' : 'text-amber-950'}`}>
                            Напоминание в Telegram во время отчета о дедлайне
                          </span>
                        </div>
                      </div>

                      <div 
                        onClick={() => setRuleDeadlineInapp(!ruleDeadlineInapp)}
                        className="flex items-start gap-2.5 cursor-pointer select-none"
                      >
                        <div className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center transition-all shrink-0 ${
                          ruleDeadlineInapp
                            ? isDark ? 'bg-[#E7C768] border-[#F4EE8E] text-[#140A01]' : 'bg-amber-500 border-amber-600 text-stone-950'
                            : isDark ? 'border-amber-400/50 bg-[#1A0F02]' : 'border-amber-900/30 bg-white'
                        }`}>
                          {ruleDeadlineInapp && <Check size={12} strokeWidth={3} />}
                        </div>
                        <div>
                          <span className={`text-sm font-medium block ${isDark ? 'text-amber-100' : 'text-amber-950'}`}>
                            Напоминание в уведомления кабинета во время отчета о дедлайне
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. Overdue list (+15 min) */}
                  <div className={`p-3 rounded-xl border space-y-2.5 ${
                    isDark ? 'bg-[#140A01]/70 border-amber-400/30' : 'bg-amber-50/40 border-amber-900/20'
                  }`}>
                    <span className={`text-sm font-bold block ${isDark ? 'text-amber-300' : 'text-amber-900'}`}>
                      Контроль несданных отчетов
                    </span>

                    <div 
                      onClick={() => setRuleOverdue15mTg(!ruleOverdue15mTg)}
                      className="flex items-start gap-2.5 cursor-pointer select-none"
                    >
                      <div className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center transition-all shrink-0 ${
                        ruleOverdue15mTg
                          ? isDark ? 'bg-[#E7C768] border-[#F4EE8E] text-[#140A01]' : 'bg-amber-500 border-amber-600 text-stone-950'
                          : isDark ? 'border-amber-400/50 bg-[#1A0F02]' : 'border-amber-900/30 bg-white'
                      }`}>
                        {ruleOverdue15mTg && <Check size={12} strokeWidth={3} />}
                      </div>
                      <div>
                        <span className={`text-sm font-medium block ${isDark ? 'text-amber-100' : 'text-amber-950'}`}>
                          Отправка списка в Telegram всех тех, кто не сдал отчет через 15 минут после дедлайна
                        </span>
                        <span className={`text-sm block ${isDark ? 'text-stone-300' : 'text-stone-600'}`}>
                          содержит имена сотрудников, типы отчетов и кликабельные ссылки на профили Telegram и профили в системе (домен ii-rr.ru)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 4. Manager Manual Review Settings */}
                  {(() => {
                    // Check if selected report template(s) require manager/director review
                    let requiresManagerReview = false;
                    if (ruleTplScope === 'all') {
                      requiresManagerReview = reportTemplates.some(t => 
                        t.checker_type === 'director' || 
                        t.checker_type === 'manager' || 
                        t.checker_type === 'manual' || 
                        t.checker_type === 'hybrid' || 
                        Boolean(t.reviewer_id)
                      );
                    } else {
                      const activeIds = ruleSelectedTplIds.length > 0 ? ruleSelectedTplIds : (ruleSelectedTplId ? [ruleSelectedTplId] : []);
                      const selectedTemplates = reportTemplates.filter(t => activeIds.includes(t.id));
                      requiresManagerReview = selectedTemplates.some(t => 
                        t.checker_type === 'director' || 
                        t.checker_type === 'manager' || 
                        t.checker_type === 'manual' || 
                        t.checker_type === 'hybrid' || 
                        Boolean(t.reviewer_id)
                      );
                    }

                    // Build list of company directors and managers
                    const supervisorsList = teamEmployees.filter(emp => {
                      const r = (emp.role || '').toUpperCase();
                      const pos = (emp.position || '').toLowerCase();
                      const title = (emp.roleTitle || '').toLowerCase();
                      return r === 'DIRECTOR' || r === 'SUPER_ADMIN' || r === 'ADMIN' || r === 'MANAGER' ||
                        pos.includes('директор') || pos.includes('руковод') || pos.includes('начальн') ||
                        title.includes('директор') || title.includes('руковод') || title.includes('начальн');
                    });
                    const effectiveSupervisors = supervisorsList.length > 0 ? supervisorsList : teamEmployees;
                    const defaultSupervisorId = effectiveSupervisors[0]?.id || currentUser?.id || '91827364501';

                    return (
                      <div className={`p-3 rounded-xl border space-y-2.5 ${
                        isDark ? 'bg-[#140A01]/70 border-amber-400/30' : 'bg-amber-50/40 border-amber-900/20'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-bold block ${isDark ? 'text-amber-300' : 'text-amber-900'}`}>
                            Ручная проверка отчета руководителем
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${
                            isDark ? 'bg-amber-400/10 border-amber-400/30 text-amber-200' : 'bg-amber-100 border-amber-300 text-amber-950 font-medium'
                          }`}>
                            {requiresManagerReview ? 'включена в типе отчета' : 'дополнительное уведомление'}
                          </span>
                        </div>

                        <div className="space-y-2.5">
                          <div 
                            onClick={() => setRuleReviewRequestTg(!ruleReviewRequestTg)}
                            className="flex items-start gap-2.5 cursor-pointer select-none"
                          >
                            <div className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center transition-all shrink-0 ${
                              ruleReviewRequestTg
                                ? isDark ? 'bg-[#E7C768] border-[#F4EE8E] text-[#140A01]' : 'bg-amber-500 border-amber-600 text-stone-950'
                                : isDark ? 'border-amber-400/50 bg-[#1A0F02]' : 'border-amber-900/30 bg-white'
                            }`}>
                              {ruleReviewRequestTg && <Check size={12} strokeWidth={3} />}
                            </div>
                            <div>
                              <span className={`text-sm font-medium block ${isDark ? 'text-amber-100' : 'text-amber-950'}`}>
                                Отправка в Telegram краткого отчета для проверки руководителем
                              </span>
                              <span className={`text-sm block ${isDark ? 'text-stone-300' : 'text-stone-600'}`}>
                                руководитель получает отдельный краткий рапорт с кнопкой «Проверить отчет»
                              </span>
                            </div>
                          </div>

                          {/* Supervisor picker directly under/beside the checkbox */}
                          {ruleReviewRequestTg && (
                            <div className={`p-3 rounded-xl border space-y-1.5 ${
                              isDark ? 'bg-[#1A0F02]/90 border-amber-400/30' : 'bg-white border-amber-900/20'
                            }`}>
                              <label className={`text-sm block font-medium ${isDark ? 'text-amber-200' : 'text-amber-950'}`}>
                                Кому из руководителей отправлять на проверку:
                              </label>
                              <select
                                value={ruleReviewTargetUserId || defaultSupervisorId}
                                onChange={(e) => setRuleReviewTargetUserId(e.target.value)}
                                className={`w-full border rounded-xl px-3.5 py-2.5 text-sm outline-none cursor-pointer ${
                                  isDark 
                                    ? 'bg-[#140A01] border-amber-400/40 text-amber-100' 
                                    : 'bg-amber-50/50 border-amber-900/30 text-amber-950'
                                }`}
                              >
                                {effectiveSupervisors.map((sup, idx) => (
                                  <option key={sup.id} value={sup.id}>
                                    {sup.name} — {sup.roleTitle || sup.position || sup.role || 'Руководитель'}{idx === 0 ? ' (по умолчанию)' : ''} {sup.telegram_id ? `[TG ID: ${sup.telegram_id}]` : (sup.telegramHandle ? `[${sup.telegramHandle}]` : '')}
                                  </option>
                                ))}
                              </select>
                              <p className={`text-xs ${isDark ? 'text-stone-300' : 'text-stone-600'}`}>
                                Руководитель получит дополнительное сообщение в Telegram с краткой сводкой и инлайн-кнопкой для проверки, а также уведомление в кабинете.
                              </p>
                            </div>
                          )}

                          <div 
                            onClick={() => setRuleReviewRequestInapp(!ruleReviewRequestInapp)}
                            className="flex items-start gap-2.5 cursor-pointer select-none"
                          >
                            <div className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center transition-all shrink-0 ${
                              ruleReviewRequestInapp
                                ? isDark ? 'bg-[#E7C768] border-[#F4EE8E] text-[#140A01]' : 'bg-amber-500 border-amber-600 text-stone-950'
                                : isDark ? 'border-amber-400/50 bg-[#1A0F02]' : 'border-amber-900/30 bg-white'
                            }`}>
                              {ruleReviewRequestInapp && <Check size={12} strokeWidth={3} />}
                            </div>
                            <div>
                              <span className={`text-sm font-medium block ${isDark ? 'text-amber-100' : 'text-amber-950'}`}>
                                Включение уведомлений в кабинете с типом «Требуется проверка отчета»
                              </span>
                            </div>
                          </div>

                          <div 
                            onClick={() => setRuleReviewResultTg(!ruleReviewResultTg)}
                            className="flex items-start gap-2.5 cursor-pointer select-none pt-1 border-t border-amber-400/15"
                          >
                            <div className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center transition-all shrink-0 ${
                              ruleReviewResultTg
                                ? isDark ? 'bg-[#E7C768] border-[#F4EE8E] text-[#140A01]' : 'bg-amber-500 border-amber-600 text-stone-950'
                                : isDark ? 'border-amber-400/50 bg-[#1A0F02]' : 'border-amber-900/30 bg-white'
                            }`}>
                              {ruleReviewResultTg && <Check size={12} strokeWidth={3} />}
                            </div>
                            <div>
                              <span className={`text-sm font-medium block ${isDark ? 'text-amber-100' : 'text-amber-950'}`}>
                                Отправка в Telegram сотруднику результата проверки руководителем
                              </span>
                              <span className={`text-sm block ${isDark ? 'text-stone-300' : 'text-stone-600'}`}>
                                содержит оценку, комментарий, поручения и ссылку на карточку вердикта
                              </span>
                            </div>
                          </div>

                          <div 
                            onClick={() => setRuleReviewResultInapp(!ruleReviewResultInapp)}
                            className="flex items-start gap-2.5 cursor-pointer select-none"
                          >
                            <div className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center transition-all shrink-0 ${
                              ruleReviewResultInapp
                                ? isDark ? 'bg-[#E7C768] border-[#F4EE8E] text-[#140A01]' : 'bg-amber-500 border-amber-600 text-stone-950'
                                : isDark ? 'border-amber-400/50 bg-[#1A0F02]' : 'border-amber-900/30 bg-white'
                            }`}>
                              {ruleReviewResultInapp && <Check size={12} strokeWidth={3} />}
                            </div>
                            <div>
                              <span className={`text-sm font-medium block ${isDark ? 'text-amber-100' : 'text-amber-950'}`}>
                                Включение уведомлений в кабинете сотруднику о результате проверки
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Inline Rule Feedback */}
                {ruleFeedback && (
                  <div className={`p-3 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all ${
                    ruleFeedback.type === 'success'
                      ? isDark ? 'bg-amber-400/20 text-[#F4EE8E] border border-amber-400/40' : 'bg-amber-100 text-amber-950 border border-amber-300'
                      : 'bg-red-500/20 text-red-200 border border-red-500/40'
                  }`}>
                    {ruleFeedback.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
                    <span>{ruleFeedback.text}</span>
                  </div>
                )}

                {/* Submit button */}
                <div className="pt-4 pb-2 flex flex-col sm:flex-row gap-3 relative z-50 pointer-events-auto">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveRule();
                    }}
                    disabled={isSavingRule}
                    className={`w-full flex-1 min-h-[52px] py-3.5 px-6 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 select-none relative z-50 pointer-events-auto touch-manipulation active:scale-[0.98] ${
                      isDark 
                        ? 'bg-gradient-to-r from-[#F4EE8E] to-[#E7C768] text-stone-950 hover:brightness-105' 
                        : 'bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 hover:brightness-105'
                    }`}
                  >
                    <span className="flex items-center justify-center gap-2 pointer-events-none">
                      {isSavingRule ? <RefreshCw size={16} className="animate-spin" /> : editingRuleId ? <Check size={16} /> : <Plus size={16} />}
                      <span>{editingRuleId ? 'обновить правило' : 'зафиксировать правило'}</span>
                    </span>
                  </button>

                  {editingRuleId && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        resetRuleForm();
                      }}
                      className={`min-h-[52px] py-3.5 px-6 rounded-xl font-bold text-sm border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none relative z-50 pointer-events-auto touch-manipulation active:scale-[0.98] ${
                        isDark 
                          ? 'border-amber-400/40 text-amber-200 hover:text-white hover:bg-amber-400/10' 
                          : 'border-amber-900/30 text-amber-950 hover:bg-amber-100/60'
                      }`}
                    >
                      <span className="flex items-center justify-center gap-1.5 pointer-events-none">
                        <X size={16} />
                        <span>отмена</span>
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Active Rules List and Diagnostics */}
          <div className="lg:col-span-7 space-y-5">
            {/* Rules list */}
            <div className={`p-4 sm:p-6 rounded-2xl border backdrop-blur-md space-y-4 ${
              isDark 
                ? 'bg-[#1A0F02]/80 border-amber-400/40 shadow-[0_0_25px_rgba(244,238,142,0.12)]' 
                : 'bg-white/80 border-amber-900/20 shadow-sm'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                  <Layers size={18} className={isDark ? 'text-amber-400' : 'text-amber-800'} />
                  <span>действующие правила маршрутизации ({routingRules.length})</span>
                </h3>
                
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      resetRuleForm();
                      if (ruleFormRef.current) {
                        ruleFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl border text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isDark 
                        ? 'bg-amber-400/20 border-amber-400/50 text-[#F4EE8E] hover:bg-amber-400/30 shadow-sm' 
                        : 'bg-amber-100 border-amber-400 text-amber-950 hover:bg-amber-200 shadow-sm'
                    }`}
                  >
                    <Plus size={16} />
                    <span>новое правило</span>
                  </button>

                  {/* Template Filter */}
                  <select
                    value={templateFilter}
                    onChange={(e) => setTemplateFilter(e.target.value)}
                    className={`px-3 py-1.5 rounded-xl border text-sm outline-none cursor-pointer ${
                      isDark 
                        ? 'bg-[#140A01] border-amber-400/30 text-amber-200' 
                        : 'bg-amber-50/60 border-amber-900/20 text-stone-800'
                    }`}
                  >
                    <option value="all">все шаблоны</option>
                    {reportTemplates.map(tpl => (
                      <option key={tpl.id} value={tpl.id}>
                        шаблон: {tpl.title}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={loadRoutingRules}
                    disabled={isLoadingRules}
                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                      isDark ? 'border-amber-400/30 text-amber-200 hover:bg-amber-400/10' : 'border-amber-900/20 text-stone-700 hover:bg-amber-100'
                    }`}
                    title="обновить правила из базы данных"
                  >
                    <RefreshCw size={16} className={isLoadingRules ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>

              {(() => {
                const filteredRules = routingRules.filter(rule => {
                  if (templateFilter === 'all') return true;
                  if (!rule.template_ids || rule.template_ids === 'all' || rule.template_ids === '["all"]') return true;
                  try {
                    const parsed = typeof rule.template_ids === 'string' ? JSON.parse(rule.template_ids) : rule.template_ids;
                    if (Array.isArray(parsed)) {
                      return parsed.includes('all') || parsed.includes(templateFilter);
                    }
                  } catch (e) {}
                  return false;
                });

                if (filteredRules.length === 0) {
                  return (
                    <div className={`p-6 rounded-xl border text-center space-y-2 ${
                      isDark ? 'bg-[#140A01] border-amber-400/20 text-stone-300' : 'bg-amber-50/40 border-amber-900/15 text-stone-700'
                    }`}>
                      <p className="font-semibold text-sm">
                        {routingRules.length === 0 ? 'правил маршрутизации пока нет' : 'нет правил для выбранного шаблона'}
                      </p>
                      <p className="text-sm">
                        все сданные отчеты сотрудников пересылаются в telegram на основе активных правил маршрутизации.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {filteredRules.map((rule) => (
                      <div 
                        key={rule.id}
                        className={`p-4 rounded-xl border space-y-2.5 transition-all ${
                          editingRuleId === rule.id
                            ? isDark ? 'border-amber-400 bg-amber-950/30 shadow-[0_0_15px_rgba(244,238,142,0.15)]' : 'border-amber-500 bg-amber-50 shadow-sm'
                            : isDark ? 'bg-[#140A01] border-amber-400/30' : 'bg-white border-amber-900/20 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <button
                              type="button"
                              onClick={() => handleToggleRuleActive(rule)}
                              className={`w-3.5 h-3.5 rounded-full shrink-0 cursor-pointer ${
                                rule.is_active ? 'bg-amber-400 shadow-[0_0_8px_#F4EE8E]' : 'bg-stone-500'
                              }`}
                              title={rule.is_active ? "активно (кликните для отключения)" : "отключено (кликните для включения)"}
                            />
                            <span className={`font-bold text-sm truncate ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                              {rule.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleTestRule(rule)}
                              className={`text-sm px-2.5 py-1 rounded-lg border font-semibold transition-colors cursor-pointer ${
                                isDark ? 'bg-amber-400/20 text-[#F4EE8E] border-amber-400/40 hover:bg-amber-400/30' : 'bg-amber-100 text-amber-950 border-amber-300 hover:bg-amber-200'
                              }`}
                              title="отправить тестовое сообщение по этому правилу"
                            >
                              тест
                            </button>

                            <button
                              type="button"
                              onClick={() => startEditRule(rule)}
                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                isDark ? 'border-amber-400/30 text-amber-200 hover:bg-amber-400/10' : 'border-amber-900/20 text-stone-700 hover:bg-amber-100'
                              }`}
                              title="редактировать правило"
                            >
                              <Edit3 size={16} />
                            </button>

                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(rule.id)}
                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                isDark ? 'border-amber-400/40 text-amber-300 hover:bg-amber-400/10' : 'border-amber-900/20 text-amber-900 hover:bg-amber-100'
                              }`}
                              title="удалить правило"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className={`px-2 py-0.5 rounded-md font-mono text-sm border font-semibold ${
                            isDark ? 'bg-amber-400/10 border-amber-400/30 text-amber-200' : 'bg-amber-50 border-amber-900/20 text-amber-900'
                          }`}>
                            id: {rule.id}
                          </span>

                          <span className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 font-medium ${
                            isDark ? 'bg-amber-400/15 border-amber-400/40 text-[#F4EE8E]' : 'bg-amber-100 border-amber-300 text-amber-950 font-semibold'
                          }`}>
                            <FileText size={14} />
                            <span>{rule.report_format === 'full' ? 'полный отчет' : 'краткий отчет'}</span>
                          </span>

                          <span className={`px-2.5 py-1 rounded-lg border font-medium ${
                            isDark ? 'bg-[#1A0F02] border-amber-400/30 text-amber-200' : 'bg-amber-50 border-amber-900/20 text-amber-950'
                          }`}>
                            {getTemplateScopeLabel(rule)}
                          </span>

                          <span className={`px-2.5 py-1 rounded-lg border ${
                            isDark ? 'bg-[#1A0F02] border-amber-400/20 text-stone-300' : 'bg-stone-50 border-stone-200 text-stone-700'
                          }`}>
                            адресат: {rule.target_title || rule.target_chat_id || 'личка автора'}
                          </span>

                          {rule.target_chat_id && rule.target_chat_id !== '{employee_tg}' && (
                            <span className="font-mono text-stone-400 text-sm">
                              чат: {rule.target_chat_id}
                            </span>
                          )}

                          {rule.send_telegram !== 0 && (
                            <span className={`px-2 py-0.5 rounded-md text-sm border font-medium ${
                              isDark ? 'bg-amber-400/10 border-amber-400/30 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-900'
                            }`}>
                              Telegram
                            </span>
                          )}

                          {rule.notify_inapp !== 0 && (
                            <span className={`px-2 py-0.5 rounded-md text-sm border font-medium ${
                              isDark ? 'bg-amber-400/10 border-amber-400/30 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-900'
                            }`}>
                              Уведомления
                            </span>
                          )}

                          {rule.reminder_15m_tg !== 0 && (
                            <span className={`px-2 py-0.5 rounded-md text-sm border font-medium ${
                              isDark ? 'bg-amber-400/10 border-amber-400/30 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-900'
                            }`}>
                              -15м TG
                            </span>
                          )}

                          {rule.deadline_tg !== 0 && (
                            <span className={`px-2 py-0.5 rounded-md text-sm border font-medium ${
                              isDark ? 'bg-amber-400/10 border-amber-400/30 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-900'
                            }`}>
                              Дедлайн TG
                            </span>
                          )}

                          {rule.overdue_15m_tg !== 0 && (
                            <span className={`px-2 py-0.5 rounded-md text-sm border font-medium ${
                              isDark ? 'bg-amber-400/15 border-amber-400/40 text-[#F4EE8E]' : 'bg-amber-100 border-amber-400 text-amber-950 font-semibold'
                            }`}>
                              Должники +15м
                            </span>
                          )}

                          {rule.review_request_tg !== 0 && (() => {
                            const revEmp = rule.review_target_user_id ? teamEmployees.find(e => e.id === rule.review_target_user_id) : null;
                            const revLabel = revEmp ? revEmp.name.split(' ')[0] : 'руководителю';
                            return (
                              <span className={`px-2 py-0.5 rounded-md text-sm border font-medium ${
                                isDark ? 'bg-amber-400/10 border-amber-400/30 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-900'
                              }`}>
                                На проверку TG ({revLabel})
                              </span>
                            );
                          })()}

                          {rule.review_result_tg !== 0 && (
                            <span className={`px-2 py-0.5 rounded-md text-sm border font-medium ${
                              isDark ? 'bg-amber-400/10 border-amber-400/30 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-900'
                            }`}>
                              Результат проверки TG
                            </span>
                          )}

                          <span className={`px-2.5 py-1 rounded-lg font-semibold text-sm ${
                            rule.is_active ? 'text-amber-400' : 'text-stone-500'
                          }`}>
                            {rule.is_active ? 'активно' : 'отключено'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Platform Bot Info & Quick Test Panel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Bot Info */}
              <div className={`p-4 rounded-2xl border backdrop-blur-md space-y-3 ${
                isDark 
                  ? 'bg-[#1A0F02]/80 border-amber-400/40 shadow-sm' 
                  : 'bg-white/80 border-amber-900/20 shadow-sm'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
                    isDark ? 'bg-amber-400/10 border-amber-400/30 text-[#F4EE8E]' : 'bg-amber-100 border-amber-300 text-amber-900'
                  }`}>
                    <Bot size={18} />
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                      системный бот платформы
                    </h4>
                    <span className="text-sm font-mono font-bold text-amber-400">@ii_rrbot</span>
                  </div>
                </div>

                <p className={`text-sm leading-relaxed ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>
                  все отчеты передаются в markdown richmessage с интерактивной ссылкой на карточку вердикта ии.
                </p>

                <a
                  href="https://t.me/ii_rrbot"
                  target="_blank"
                  rel="noreferrer"
                  className={`w-full py-2.5 px-3 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    isDark 
                      ? 'bg-amber-400/10 hover:bg-amber-400/20 text-[#F4EE8E] border-amber-400/40' 
                      : 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300'
                  }`}
                >
                  <ExternalLink size={16} />
                  <span>открыть @ii_rrbot в telegram</span>
                </a>
              </div>

              {/* Quick Test Sender */}
              <div className={`p-4 rounded-2xl border backdrop-blur-md space-y-3 ${
                isDark 
                  ? 'bg-[#1A0F02]/80 border-amber-400/40 shadow-sm' 
                  : 'bg-white/80 border-amber-900/20 shadow-sm'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
                    isDark ? 'bg-amber-400/10 border-amber-400/30 text-[#F4EE8E]' : 'bg-amber-100 border-amber-300 text-amber-900'
                  }`}>
                    <MessageSquare size={18} />
                  </div>
                  <h4 className={`text-sm font-bold ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                    тест связи с любым id
                  </h4>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testChatId}
                    onChange={(e) => setTestChatId(e.target.value)}
                    placeholder="id чата или пользователя"
                    className={`w-full border rounded-xl px-3 py-2 text-sm outline-none font-mono ${
                      isDark 
                        ? 'bg-[#140A01] border-amber-400/40 text-amber-100' 
                        : 'bg-amber-50/50 border-amber-900/30 text-amber-950'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleTestSend}
                    disabled={testStatus.loading}
                    className={`py-2 px-3.5 rounded-xl font-bold text-sm transition-all shrink-0 cursor-pointer ${
                      isDark 
                        ? 'bg-amber-400/20 hover:bg-amber-400/30 text-[#F4EE8E] border border-amber-400/40' 
                        : 'bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300'
                    }`}
                  >
                    {testStatus.loading ? <RefreshCw size={14} className="animate-spin" /> : 'тест'}
                  </button>
                </div>

                {testStatus.message && (
                  <p className={`text-sm ${testStatus.success ? 'text-amber-400' : 'text-red-400'}`}>
                    {testStatus.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Verified Telegram Channels and Groups */}
      {activeTab === 'channels' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Add & Verify Channel Form */}
          <div className="lg:col-span-5 space-y-4">
            <div className={`p-4 sm:p-6 rounded-2xl border backdrop-blur-md space-y-4 ${
              isDark 
                ? 'bg-[#1A0F02]/80 border-amber-400/40 shadow-[0_0_25px_rgba(244,238,142,0.12)]' 
                : 'bg-white/80 border-amber-900/20 shadow-sm'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                  isDark ? 'bg-amber-400/10 border-amber-400/30 text-[#F4EE8E]' : 'bg-amber-100 border-amber-300 text-amber-900'
                }`}>
                  <Radio size={20} />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                    добавить канал или группу
                  </h3>
                  <p className={`text-sm ${isDark ? 'text-amber-200/80' : 'text-stone-600'}`}>
                    проверка присутствия бота в группе и фиксация в базе данных
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className={`text-sm block mb-1 font-medium ${isDark ? 'text-amber-200' : 'text-amber-950'}`}>
                    id чата или @username канала
                  </label>
                  <input
                    type="text"
                    value={newChatInput}
                    onChange={(e) => setNewChatInput(e.target.value)}
                    placeholder="-1001234567890 или @my_channel"
                    className={`w-full border rounded-xl px-3.5 py-2.5 text-sm outline-none font-mono ${
                      isDark 
                        ? 'bg-[#140A01] border-amber-400/40 text-amber-100 focus:border-amber-300' 
                        : 'bg-amber-50/50 border-amber-900/30 text-amber-950 focus:border-amber-600'
                    }`}
                  />
                </div>

                <div>
                  <label className={`text-sm block mb-1 font-medium ${isDark ? 'text-amber-200' : 'text-amber-950'}`}>
                    понятное название (для правил)
                  </label>
                  <input
                    type="text"
                    value={newChatTitle}
                    onChange={(e) => setNewChatTitle(e.target.value)}
                    placeholder="например: канал ропов и руководства"
                    className={`w-full border rounded-xl px-3.5 py-2.5 text-sm outline-none ${
                      isDark 
                        ? 'bg-[#140A01] border-amber-400/40 text-amber-100 focus:border-amber-300' 
                        : 'bg-amber-50/50 border-amber-900/30 text-amber-950 focus:border-amber-600'
                    }`}
                  />
                </div>

                {verifyStatus && (
                  <div className={`p-3 rounded-xl border text-sm flex items-center gap-2 ${
                    verifyStatus.success
                      ? isDark ? 'bg-amber-950/40 border-amber-400/40 text-[#F4EE8E]' : 'bg-amber-50 border-amber-400 text-amber-950'
                      : isDark ? 'bg-red-950/40 border-red-500/40 text-red-200' : 'bg-red-50 border-red-300 text-red-900'
                  }`}>
                    {verifyStatus.success ? <Check size={16} /> : <AlertCircle size={16} />}
                    <span>{verifyStatus.message}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleVerifyAndSaveChat}
                  disabled={isVerifyingChat}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 ${
                    isDark 
                      ? 'bg-gradient-to-r from-[#F4EE8E] to-[#E7C768] text-stone-950 hover:brightness-105' 
                      : 'bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 hover:brightness-105'
                  }`}
                >
                  {isVerifyingChat ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}
                  <span>проверить и сохранить чат</span>
                </button>
              </div>
            </div>
          </div>

          {/* Saved Channels List */}
          <div className="lg:col-span-7 space-y-4">
            <div className={`p-4 sm:p-6 rounded-2xl border backdrop-blur-md space-y-4 ${
              isDark 
                ? 'bg-[#1A0F02]/80 border-amber-400/40 shadow-[0_0_25px_rgba(244,238,142,0.12)]' 
                : 'bg-white/80 border-amber-900/20 shadow-sm'
            }`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                  <Radio size={18} className={isDark ? 'text-amber-400' : 'text-amber-800'} />
                  <span>сохраненные каналы и группы ({savedChats.length})</span>
                </h3>
                <button
                  type="button"
                  onClick={loadSavedChats}
                  disabled={isLoadingChats}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    isDark ? 'border-amber-400/30 text-amber-200 hover:bg-amber-400/10' : 'border-amber-900/20 text-stone-700 hover:bg-amber-100'
                  }`}
                  title="обновить список"
                >
                  <RefreshCw size={16} className={isLoadingChats ? 'animate-spin' : ''} />
                </button>
              </div>

              {savedChats.length === 0 ? (
                <div className={`p-6 rounded-xl border text-center space-y-2 ${
                  isDark ? 'bg-[#140A01] border-amber-400/20 text-stone-300' : 'bg-amber-50/40 border-amber-900/15 text-stone-700'
                }`}>
                  <p className="font-semibold text-sm">нет сохраненных чатов</p>
                  <p className="text-sm">
                    добавьте системного бота <span className="font-mono text-amber-400">@ii_rrbot</span> в группу или канал и подтвердите его в форме слева.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedChats.map((sc) => (
                    <div 
                      key={sc.id}
                      className={`p-4 rounded-xl border space-y-2 flex items-center justify-between gap-3 ${
                        isDark ? 'bg-[#140A01] border-amber-400/30' : 'bg-white border-amber-900/20 shadow-sm'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-sm truncate ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                            {sc.title}
                          </span>
                          <span className={`text-sm px-2 py-0.5 rounded border ${
                            isDark ? 'bg-amber-950/40 border-amber-400/30 text-amber-200' : 'bg-amber-100 border-amber-300 text-amber-950'
                          }`}>
                            {sc.type}
                          </span>
                        </div>
                        <p className="text-sm font-mono text-stone-400 truncate mt-0.5">
                          id: {sc.chat_id}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setTestChatId(sc.chat_id);
                            setActiveTab('rules');
                          }}
                          className={`text-sm px-2.5 py-1 rounded-lg border font-semibold transition-colors cursor-pointer ${
                            isDark 
                              ? 'bg-amber-400/20 hover:bg-amber-400/30 text-[#F4EE8E] border-amber-400/40' 
                              : 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300'
                          }`}
                        >
                          тест
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSavedChat(sc.id)}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            isDark ? 'border-amber-400/40 text-amber-300 hover:bg-amber-400/10' : 'border-amber-900/20 text-amber-900 hover:bg-amber-100'
                          }`}
                          title="удалить из сохраненных"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Rule Deletion */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl space-y-4 ${
            isDark 
              ? 'bg-[#1A0F02] border-amber-400/50 text-amber-100 shadow-[0_0_30px_rgba(244,238,142,0.2)]' 
              : 'bg-white border-amber-900/30 text-stone-900'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
                isDark ? 'bg-amber-400/10 border-amber-400/40 text-[#F4EE8E]' : 'bg-amber-100 border-amber-300 text-amber-900'
              }`}>
                <ShieldAlert size={22} />
              </div>
              <h4 className={`text-base font-bold ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                удалить правило маршрутизации?
              </h4>
            </div>

            <p className="text-sm leading-relaxed">
              вы уверены, что хотите безвозвратно удалить это правило маршрутизации из базы данных PostgreSQL BD ProTalk? отправка отчетов по этому правилу прекратится.
            </p>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className={`py-2 px-4 rounded-xl font-bold text-sm border transition-all cursor-pointer ${
                  isDark ? 'border-amber-400/30 text-stone-300 hover:text-white' : 'border-amber-900/20 text-stone-700 hover:bg-amber-50'
                }`}
              >
                отмена
              </button>
              <button
                type="button"
                onClick={() => handleDeleteRoutingRule(confirmDeleteId)}
                className="py-2 px-5 rounded-xl font-bold text-sm bg-red-600 hover:bg-red-700 text-white transition-all cursor-pointer shadow-md"
              >
                удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom styled modal notification */}
      {modalMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl space-y-4 ${
            isDark 
              ? 'bg-[#1A0F02] border-amber-400/50 text-amber-100 shadow-[0_0_30px_rgba(244,238,142,0.2)]' 
              : 'bg-white border-amber-900/30 text-stone-900'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
                isDark 
                  ? 'bg-amber-400/10 border-amber-400/40 text-[#F4EE8E]' 
                  : 'bg-amber-100 border-amber-300 text-amber-900'
              }`}>
                <AlertCircle size={22} />
              </div>
              <h4 className={`text-base font-bold ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                сообщение системы
              </h4>
            </div>

            <p className="text-sm leading-relaxed">
              {modalMessage}
            </p>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setModalMessage(null)}
                className={`py-2 px-5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                  isDark 
                    ? 'bg-gradient-to-r from-[#F4EE8E] to-[#E7C768] text-stone-950 hover:brightness-105' 
                    : 'bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 hover:brightness-105'
                }`}
              >
                понятно
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
