import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Bot, Check, AlertCircle, HelpCircle, RefreshCw, 
  ExternalLink, Trash2, Plus, MessageSquare, ChevronRight, X,
  Radio, Settings2, Layers, Edit3, UserCheck, ShieldAlert, FileText, Bell,
  Search, Shield, CheckCircle2, ChevronDown, ChevronUp, Filter,
  Archive, ArchiveRestore, User, Building, FolderCheck
} from 'lucide-react';
import { UserProfile } from '../../../types';

export interface TaskRoutingRule {
  id: string;
  company_id: string;
  title: string;
  project_ids: string; // JSON string or "all"
  department_ids: string; // JSON string or "all"
  destination_type: string;
  report_format?: 'brief' | 'full';
  target_user_id?: string | null;
  target_chat_id?: string | null;
  target_title?: string | null;
  review_target_user_id?: string | null;
  send_on_create: number;
  send_on_submit: number;
  send_reminder: number;
  notify_inapp?: number;
  send_telegram?: number;
  reminder_deadline_tg?: number;
  reminder_deadline_inapp?: number;
  overdue_tg?: number;
  review_request_tg?: number;
  review_request_inapp?: number;
  review_result_tg?: number;
  review_result_inapp?: number;
  min_score?: number | null;
  is_active: number;
  is_archived?: number;
  created_at?: string;
  updated_at?: string;
}

export interface SavedChat {
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

interface CabinetTaskIntegrationsProps {
  currentUser: UserProfile | null;
  theme?: 'dark' | 'light';
  projects?: Array<{ id: string; title: string; status?: string }>;
  departments?: Array<{ id: string; name: string }>;
  employees?: Array<{ id: string; name: string; role?: string; telegramHandle?: string; telegram_id?: string; position?: string }>;
}

export const CabinetTaskIntegrations: React.FC<CabinetTaskIntegrationsProps> = ({
  currentUser,
  theme = 'dark',
  projects: initialProjects = [],
  departments: initialDepartments = [],
  employees: initialEmployees = []
}) => {
  const isDark = theme === 'dark';

  // Navigation tabs: Rules (default) & Verified Channels
  const [activeTab, setActiveTab] = useState<'rules' | 'channels'>('rules');

  // Archive view toggle: 'active' | 'archived'
  const [archiveFilter, setArchiveFilter] = useState<'active' | 'archived'>('active');

  // Help accordion
  const [showIdGuide, setShowIdGuide] = useState<boolean>(false);

  // Custom modal for notifications and confirmations
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

  // Routing Rules State
  const [rules, setRules] = useState<TaskRoutingRule[]>([]);
  const [isLoadingRules, setIsLoadingRules] = useState<boolean>(false);
  const [isSavingRule, setIsSavingRule] = useState<boolean>(false);

  // Dynamic projects & employees loaded from server
  const [loadedProjects, setLoadedProjects] = useState<Array<{ id: string; title: string; status?: string }>>(initialProjects);
  const [loadedEmployees, setLoadedEmployees] = useState<Array<{ id: string; name: string; role?: string; telegramHandle?: string; telegram_id?: string; position?: string }>>(initialEmployees);

  // Form states
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleTitle, setRuleTitle] = useState<string>('');
  const [ruleProjectScope, setRuleProjectScope] = useState<'all' | 'specific'>('all');
  const [ruleSelectedProjectId, setRuleSelectedProjectId] = useState<string>('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [projectStatusFilter, setProjectStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Destination & recipient
  const [ruleType, setRuleType] = useState<string>('employee_direct');
  const [ruleTargetChatId, setRuleTargetChatId] = useState<string>('{employee_tg}');
  const [ruleTargetTitle, setRuleTargetTitle] = useState<string>('в личку исполнителю задачи');
  const [ruleTargetUserId, setRuleTargetUserId] = useState<string>('');
  const [ruleReviewTargetUserId, setRuleReviewTargetUserId] = useState<string>('');
  const [ruleMinScore, setRuleMinScore] = useState<string>('');
  const [ruleFormat, setRuleFormat] = useState<'brief' | 'full'>('full');

  // Specific triggers
  const [ruleSendOnCreate, setRuleSendOnCreate] = useState<boolean>(true);
  const [ruleSendOnSubmit, setRuleSendOnSubmit] = useState<boolean>(true);
  const [ruleSendReminder, setRuleSendReminder] = useState<boolean>(true);
  const [ruleNotifyInapp, setRuleNotifyInapp] = useState<boolean>(true);
  const [ruleSendTelegram, setRuleSendTelegram] = useState<boolean>(true);
  const [ruleReminderDeadlineTg, setRuleReminderDeadlineTg] = useState<boolean>(true);
  const [ruleReminderDeadlineInapp, setRuleReminderDeadlineInapp] = useState<boolean>(true);
  const [ruleOverdueTg, setRuleOverdueTg] = useState<boolean>(true);
  const [ruleReviewRequestTg, setRuleReviewRequestTg] = useState<boolean>(true);
  const [ruleReviewRequestInapp, setRuleReviewRequestInapp] = useState<boolean>(true);
  const [ruleReviewResultTg, setRuleReviewResultTg] = useState<boolean>(true);
  const [ruleReviewResultInapp, setRuleReviewResultInapp] = useState<boolean>(true);

  // Testing feedback
  const [testStatus, setTestStatus] = useState<Record<string, { loading: boolean; success?: boolean; message?: string }>>({});
  const [feedbackNotice, setFeedbackNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const dirId = currentUser?.director_id || currentUser?.id;
  const effectiveCompanyId = currentUser?.company_id || (dirId ? `com-${dirId}` : 'flagship-main');

  // Load rules, saved chats, projects and employees
  const loadData = async () => {
    setIsLoadingRules(true);
    setIsLoadingChats(true);
    try {
      const [rulesRes, chatsRes, projectsRes, employeesRes] = await Promise.all([
        fetch(`/api/telegram/task-routing-rules?company_id=${encodeURIComponent(effectiveCompanyId)}`),
        fetch(`/api/telegram/saved-chats?company_id=${encodeURIComponent(effectiveCompanyId)}`),
        fetch(`/api/projects?company_id=${encodeURIComponent(effectiveCompanyId)}&userId=${encodeURIComponent(currentUser?.id || '')}`),
        fetch(`/api/telegram/employees?company_id=${encodeURIComponent(effectiveCompanyId)}`)
      ]);

      if (rulesRes.ok) {
        const rulesData = await rulesRes.json();
        if (rulesData.success) setRules(rulesData.rules || []);
      }

      if (chatsRes.ok) {
        const chatsData = await chatsRes.json();
        if (chatsData.success) setSavedChats(chatsData.chats || []);
      }

      if (projectsRes.ok) {
        const pData = await projectsRes.json();
        if (pData.success && Array.isArray(pData.projects)) {
          setLoadedProjects(pData.projects.map((p: any) => ({
            id: String(p.id),
            title: p.title || p.name || 'Без названия',
            status: p.status || 'active'
          })));
          if (!ruleSelectedProjectId && pData.projects.length > 0) {
            setRuleSelectedProjectId(String(pData.projects[0].id));
          }
        }
      }

      if (employeesRes.ok) {
        const uData = await employeesRes.json();
        const empList = Array.isArray(uData.employees) ? uData.employees : (Array.isArray(uData.users) ? uData.users : null);
        if (uData.success && empList) {
          setLoadedEmployees(empList.map((u: any) => ({
            id: String(u.id),
            name: u.name || u.username || 'Сотрудник',
            role: u.role || 'EMPLOYEE',
            telegramHandle: u.telegramHandle || u.telegram_handle,
            telegram_id: u.telegram_id,
            position: u.position
          })));
        }
      }
    } catch (e) {
      console.warn('Ошибка загрузки данных интеграций задач:', e);
    } finally {
      setIsLoadingRules(false);
      setIsLoadingChats(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [effectiveCompanyId, currentUser?.id]);

  // Reset form
  const handleResetForm = () => {
    setEditingRuleId(null);
    setRuleTitle('');
    setRuleProjectScope('all');
    setRuleSelectedProjectId(loadedProjects[0]?.id || '');
    setRuleType('employee_direct');
    setRuleTargetChatId('{employee_tg}');
    setRuleTargetTitle('в личку исполнителю задачи');
    setRuleTargetUserId('');
    setRuleReviewTargetUserId('');
    setRuleMinScore('');
    setRuleFormat('full');
    setRuleSendOnCreate(true);
    setRuleSendOnSubmit(true);
    setRuleSendReminder(true);
    setRuleNotifyInapp(true);
    setRuleSendTelegram(true);
    setRuleReminderDeadlineTg(true);
    setRuleReminderDeadlineInapp(true);
    setRuleOverdueTg(true);
    setRuleReviewRequestTg(true);
    setRuleReviewRequestInapp(true);
    setRuleReviewResultTg(true);
    setRuleReviewResultInapp(true);
  };

  // Populate form for editing
  const handleEditRule = (r: TaskRoutingRule) => {
    setEditingRuleId(r.id);
    setRuleTitle(r.title);
    
    try {
      const parsedP = JSON.parse(r.project_ids || '["all"]');
      if (Array.isArray(parsedP) && parsedP.includes('all')) {
        setRuleProjectScope('all');
      } else if (Array.isArray(parsedP) && parsedP.length > 0) {
        setRuleProjectScope('specific');
        setRuleSelectedProjectId(parsedP[0]);
      }
    } catch {
      setRuleProjectScope('all');
    }

    setRuleType(r.destination_type || 'employee_direct');
    setRuleTargetChatId(r.target_chat_id || '{employee_tg}');
    setRuleTargetTitle(r.target_title || 'в личку исполнителю');
    setRuleTargetUserId(r.target_user_id || '');
    setRuleReviewTargetUserId(r.review_target_user_id || '');
    setRuleMinScore(r.min_score ? String(r.min_score) : '');
    setRuleFormat(r.report_format || 'full');

    setRuleSendOnCreate(r.send_on_create === 1);
    setRuleSendOnSubmit(r.send_on_submit === 1);
    setRuleSendReminder(r.send_reminder === 1);
    setRuleNotifyInapp(r.notify_inapp !== 0);
    setRuleSendTelegram(r.send_telegram !== 0);
    setRuleReminderDeadlineTg(r.reminder_deadline_tg !== 0);
    setRuleReminderDeadlineInapp(r.reminder_deadline_inapp !== 0);
    setRuleOverdueTg(r.overdue_tg !== 0);
    setRuleReviewRequestTg(r.review_request_tg !== 0);
    setRuleReviewRequestInapp(r.review_request_inapp !== 0);
    setRuleReviewResultTg(r.review_result_tg !== 0);
    setRuleReviewResultInapp(r.review_result_inapp !== 0);

    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  // Save rule
  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleTitle.trim()) {
      setFeedbackNotice({ type: 'error', text: 'Пожалуйста, укажите название правила' });
      return;
    }

    setIsSavingRule(true);
    setFeedbackNotice(null);

    const projectIdsValue = ruleProjectScope === 'all' 
      ? '["all"]' 
      : JSON.stringify([ruleSelectedProjectId]);

    const payload = {
      company_id: effectiveCompanyId,
      title: ruleTitle.trim(),
      project_ids: projectIdsValue,
      department_ids: '["all"]',
      destination_type: ruleType,
      report_format: ruleFormat,
      target_user_id: ruleTargetUserId || null,
      target_chat_id: ruleTargetChatId || null,
      target_title: ruleTargetTitle || null,
      review_target_user_id: ruleReviewTargetUserId || null,
      send_on_create: ruleSendOnCreate ? 1 : 0,
      send_on_submit: ruleSendOnSubmit ? 1 : 0,
      send_reminder: ruleSendReminder ? 1 : 0,
      notify_inapp: ruleNotifyInapp ? 1 : 0,
      send_telegram: ruleSendTelegram ? 1 : 0,
      reminder_deadline_tg: ruleReminderDeadlineTg ? 1 : 0,
      reminder_deadline_inapp: ruleReminderDeadlineInapp ? 1 : 0,
      overdue_tg: ruleOverdueTg ? 1 : 0,
      review_request_tg: ruleReviewRequestTg ? 1 : 0,
      review_request_inapp: ruleReviewRequestInapp ? 1 : 0,
      review_result_tg: ruleReviewResultTg ? 1 : 0,
      review_result_inapp: ruleReviewResultInapp ? 1 : 0,
      min_score: ruleMinScore ? Number(ruleMinScore) : null,
      is_active: 1,
      is_archived: 0
    };

    try {
      if (editingRuleId) {
        const res = await fetch(`/api/telegram/task-routing-rules/${editingRuleId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          setFeedbackNotice({ type: 'success', text: 'Правило успешно обновлено!' });
          handleResetForm();
          await loadData();
        } else {
          const err = await res.json();
          setFeedbackNotice({ type: 'error', text: err.error || 'Ошибка при обновлении' });
        }
      } else {
        const res = await fetch('/api/telegram/task-routing-rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          setFeedbackNotice({ type: 'success', text: 'Новое правило успешно создано!' });
          handleResetForm();
          await loadData();
        } else {
          const err = await res.json();
          setFeedbackNotice({ type: 'error', text: err.error || 'Ошибка при создании' });
        }
      }
    } catch (err: any) {
      setFeedbackNotice({ type: 'error', text: err.message || 'Сбой сети' });
    } finally {
      setIsSavingRule(false);
      setTimeout(() => setFeedbackNotice(null), 4000);
    }
  };

  // Toggle active
  const handleToggleRule = async (rule: TaskRoutingRule) => {
    const nextVal = rule.is_active ? 0 : 1;
    try {
      const res = await fetch(`/api/telegram/task-routing-rules/${rule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: nextVal })
      });
      if (res.ok) {
        setRules(prev => prev.map(r => r.id === rule.id ? { ...r, is_active: nextVal } : r));
      }
    } catch (e) {
      console.warn('Ошибка переключения правила:', e);
    }
  };

  // Toggle archive status
  const handleToggleArchive = async (rule: TaskRoutingRule) => {
    const nextArchived = rule.is_archived ? 0 : 1;
    const nextActive = nextArchived ? 0 : 1;
    try {
      const res = await fetch(`/api/telegram/task-routing-rules/${rule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_archived: nextArchived, is_active: nextActive })
      });
      if (res.ok) {
        setRules(prev => prev.map(r => r.id === rule.id ? { ...r, is_archived: nextArchived, is_active: nextActive } : r));
        setFeedbackNotice({ 
          type: 'success', 
          text: nextArchived ? 'Правило перенесено в архив' : 'Правило восстановлено из архива' 
        });
        setTimeout(() => setFeedbackNotice(null), 3000);
      }
    } catch (e) {
      console.warn('Ошибка архивации правила:', e);
    }
  };

  // Archive all rules for completed projects
  const handleArchiveCompletedProjectsRules = async () => {
    try {
      const res = await fetch('/api/telegram/task-routing-rules/archive-completed', {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedbackNotice({ 
          type: 'success', 
          text: `Архивировано правил по завершенным проектам: ${data.archivedCount || 0}` 
        });
        await loadData();
      }
    } catch (e) {
      console.warn('Ошибка архивации завершенных:', e);
    } finally {
      setTimeout(() => setFeedbackNotice(null), 4000);
    }
  };

  // Delete rule
  const handleDeleteRule = async (id: string) => {
    try {
      const res = await fetch(`/api/telegram/task-routing-rules/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setRules(prev => prev.filter(r => r.id !== id));
        setConfirmDeleteId(null);
      }
    } catch (e) {
      console.warn('Ошибка удаления правила:', e);
    }
  };

  // Test send
  const handleTestSend = async (rule: TaskRoutingRule) => {
    setTestStatus(prev => ({ ...prev, [rule.id]: { loading: true } }));
    try {
      const targetChat = rule.target_chat_id === '{employee_tg}'
        ? (currentUser?.telegram_id || (currentUser as any)?.telegramHandle || '@test_user')
        : rule.target_chat_id;

      const formatLabel = rule.report_format === 'brief' ? 'Краткий отчет' : 'Полный отчет';

      const res = await fetch('/api/telegram/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: targetChat,
          message: `🛰 Тестовое уведомление задачи: "${rule.title}"\nФормат: ${formatLabel}\nМаршрут: ${rule.target_title || 'Telegram'}\nСистема оповещений Ревизора работает в штатном режиме.`
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestStatus(prev => ({ ...prev, [rule.id]: { loading: false, success: true, message: 'Отправлено успешно!' } }));
      } else {
        setTestStatus(prev => ({ ...prev, [rule.id]: { loading: false, success: false, message: data.error || 'Ошибка доставки' } }));
      }
    } catch (e: any) {
      setTestStatus(prev => ({ ...prev, [rule.id]: { loading: false, success: false, message: e.message } }));
    } finally {
      setTimeout(() => {
        setTestStatus(prev => {
          const next = { ...prev };
          delete next[rule.id];
          return next;
        });
      }, 4000);
    }
  };

  // Verify and add chat
  const handleVerifyChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatInput.trim()) return;

    setIsVerifyingChat(true);
    setVerifyStatus(null);
    try {
      const res = await fetch('/api/telegram/verify-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: newChatInput.trim(),
          title: newChatTitle.trim() || undefined,
          company_id: effectiveCompanyId
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setVerifyStatus({ success: true, message: 'Чат успешно верифицирован и сохранен!' });
        setNewChatInput('');
        setNewChatTitle('');
        await loadData();
      } else {
        setVerifyStatus({ success: false, message: data.error || 'Бот не найден в чате или нет прав администратора.' });
      }
    } catch (err: any) {
      setVerifyStatus({ success: false, message: err.message || 'Ошибка сети' });
    } finally {
      setIsVerifyingChat(false);
    }
  };

  const handleDeleteChat = async (id: string) => {
    try {
      const res = await fetch(`/api/telegram/saved-chats/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSavedChats(prev => prev.filter(c => c.id !== id));
      }
    } catch (e) {
      console.warn('Ошибка удаления чата:', e);
    }
  };

  // Filter rules by archive status, project, and search
  const filteredRules = rules.filter(r => {
    const isArchived = Boolean(r.is_archived);
    if (archiveFilter === 'active' && isArchived) return false;
    if (archiveFilter === 'archived' && !isArchived) return false;

    if (projectFilter !== 'all') {
      try {
        const p = JSON.parse(r.project_ids || '["all"]');
        if (!p.includes('all') && !p.includes(projectFilter)) return false;
      } catch {
        // keep
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return r.title.toLowerCase().includes(q) || (r.target_title && r.target_title.toLowerCase().includes(q));
    }
    return true;
  });

  const activeProjects = loadedProjects.filter(p => p.status !== 'completed');
  const completedProjects = loadedProjects.filter(p => p.status === 'completed');

  return (
    <div className={`p-3 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto font-sans min-h-[85vh] select-none ${
      isDark ? 'text-[#F4EE8E]' : 'text-amber-950'
    }`}>
      {/* Top Header Card */}
      <div className={`p-4 sm:p-6 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
        isDark
          ? 'bg-[#1A0F02]/85 border-[#E7C768]/50 shadow-[0_0_35px_rgba(244,238,142,0.18)]'
          : 'bg-[#FAF6EC]/90 border-[#B8860B]/40 shadow-lg'
      }`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-[#E7C768] shrink-0">
              <Bot size={24} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#E7C768]">
                Маршрутизация и Telegram-уведомления задач
              </h1>
              <p className="text-xs sm:text-sm opacity-80">
                Гибкие правила отправки заданий, кратких/полных отчетов и вердиктов ИИ-Ревизора
              </p>
            </div>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'rules'
                ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 shadow-md'
                : 'border border-amber-400/40 hover:bg-amber-500/10'
            }`}
          >
            <Settings2 size={16} />
            <span>1. Правила маршрутизации</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('channels')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'channels'
                ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 shadow-md'
                : 'border border-amber-400/40 hover:bg-amber-500/10'
            }`}
          >
            <Send size={16} />
            <span>2. Проверенные каналы и чаты ({savedChats.length})</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK NOTICE */}
      {feedbackNotice && (
        <div className={`p-3.5 rounded-2xl border flex items-center gap-2 text-sm font-bold animate-fade-in ${
          feedbackNotice.type === 'success'
            ? 'bg-amber-500/20 border-amber-400 text-[#E7C768]'
            : 'bg-red-500/20 border-red-400 text-red-200'
        }`}>
          {feedbackNotice.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          <span>{feedbackNotice.text}</span>
        </div>
      )}

      {/* TAB 1: RULES LIST & FORM */}
      {activeTab === 'rules' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT COLUMN: CREATE / EDIT RULE FORM (lg:col-span-5) */}
          <div className="lg:col-span-5 space-y-5">
            <form onSubmit={handleSaveRule} className={`p-4 sm:p-6 rounded-3xl border space-y-4 sm:space-y-5 transition-all ${
              isDark
                ? 'bg-[#1A0F02]/85 border-[#E7C768]/45 shadow-[0_0_30px_rgba(244,238,142,0.12)]'
                : 'bg-[#FAF6EC]/90 border-[#B8860B]/35 shadow-md'
            }`}>
              <div className="flex items-center justify-between border-b pb-3 border-amber-400/20">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-amber-500/20 text-[#E7C768]">
                    {editingRuleId ? <Edit3 size={18} /> : <Plus size={18} />}
                  </div>
                  <h3 className="text-base font-bold text-[#E7C768]">
                    {editingRuleId ? 'Редактирование правила' : 'Создать новое правило'}
                  </h3>
                </div>
                {editingRuleId && (
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="text-xs px-2.5 py-1 rounded-lg border border-amber-400/40 hover:bg-amber-500/10 cursor-pointer"
                  >
                    Сбросить
                  </button>
                )}
              </div>

              {/* 1. Название правила */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider opacity-85">
                  1. Название правила *
                </label>
                <input
                  type="text"
                  value={ruleTitle}
                  onChange={(e) => setRuleTitle(e.target.value)}
                  placeholder="Например: Уведомление исполнителю при назначении задачи"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none ${
                    isDark ? 'bg-transparent border-[#E7C768]/40 text-[#F4EE8E]' : 'bg-white border-[#B8860B]/40 text-amber-950'
                  }`}
                  required
                />
              </div>

              {/* 2. Область применения (Проекты компании) */}
              <div className="space-y-1.5">
                <label className="block text-sm font-bold opacity-85">
                  2. Проекты компании ({loadedProjects.length})
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRuleProjectScope('all')}
                    className={`py-2 px-3 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                      ruleProjectScope === 'all'
                        ? 'bg-amber-500/25 border-amber-400 text-[#E7C768]'
                        : 'border-amber-400/20 hover:bg-amber-500/10 opacity-75'
                    }`}
                  >
                    Все проекты
                  </button>
                  <button
                    type="button"
                    onClick={() => setRuleProjectScope('specific')}
                    className={`py-2 px-3 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                      ruleProjectScope === 'specific'
                        ? 'bg-amber-500/25 border-amber-400 text-[#E7C768]'
                        : 'border-amber-400/20 hover:bg-amber-500/10 opacity-75'
                    }`}
                  >
                    Выбранный проект
                  </button>
                </div>

                {ruleProjectScope === 'specific' && (
                  <select
                    value={ruleSelectedProjectId}
                    onChange={(e) => setRuleSelectedProjectId(e.target.value)}
                    className={`w-full mt-2 px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none ${
                      isDark ? 'bg-[#1A0F02] border-[#E7C768]/40 text-[#F4EE8E]' : 'bg-white border-[#B8860B]/40 text-amber-950'
                    }`}
                  >
                    <optgroup label="Текущие активные проекты">
                      {activeProjects.map(p => (
                        <option key={p.id} value={p.id}>⭐ {p.title}</option>
                      ))}
                    </optgroup>
                    {completedProjects.length > 0 && (
                      <optgroup label="Завершенные проекты">
                        {completedProjects.map(p => (
                          <option key={p.id} value={p.id}>⚪ [Завершен] {p.title}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                )}
              </div>

              {/* 3. Формат отчета по задаче (Краткий / Полный) */}
              <div className="space-y-1.5">
                <label className="block text-sm font-bold opacity-85">
                  3. Формат отправки отчета
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRuleFormat('brief')}
                    className={`p-2.5 rounded-xl border text-sm font-bold transition-all cursor-pointer text-left ${
                      ruleFormat === 'brief'
                        ? 'bg-amber-500/25 border-amber-400 text-[#E7C768]'
                        : 'border-amber-400/20 hover:bg-amber-500/10 opacity-75'
                    }`}
                  >
                    <div className="font-bold">Краткий отчет</div>
                    <div className="text-sm opacity-75">Суть, оценка и статус</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRuleFormat('full')}
                    className={`p-2.5 rounded-xl border text-sm font-bold transition-all cursor-pointer text-left ${
                      ruleFormat === 'full'
                        ? 'bg-amber-500/25 border-amber-400 text-[#E7C768]'
                        : 'border-amber-400/20 hover:bg-amber-500/10 opacity-75'
                    }`}
                  >
                    <div className="font-bold">Полный отчет</div>
                    <div className="text-sm opacity-75">Все карточки и медиа</div>
                  </button>
                </div>
              </div>

              {/* 4. Куда отправлять (Получатель) */}
              <div className="space-y-1.5">
                <label className="block text-sm font-bold opacity-85">
                  4. Куда отправлять (Получатель)
                </label>
                <select
                  value={ruleType}
                  onChange={(e) => {
                    const t = e.target.value;
                    setRuleType(t);
                    if (t === 'employee_direct') {
                      setRuleTargetChatId('{employee_tg}');
                      setRuleTargetTitle('в личку исполнителю задачи');
                    } else if (t === 'manager_direct') {
                      setRuleTargetChatId('{director_tg}');
                      setRuleTargetTitle('в личку руководителю');
                    } else if (t === 'project_chat') {
                      setRuleTargetChatId('{project_tg}');
                      setRuleTargetTitle('в общий чат проекта');
                    } else if (t === 'specific_employee') {
                      const emp = loadedEmployees[0];
                      if (emp) {
                        setRuleTargetUserId(emp.id);
                        setRuleTargetChatId(emp.telegram_id || emp.telegramHandle || '');
                        setRuleTargetTitle(`в личку: ${emp.name}`);
                      }
                    } else if (savedChats[0]) {
                      setRuleTargetChatId(savedChats[0].chat_id);
                      setRuleTargetTitle(savedChats[0].title);
                    }
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none ${
                    isDark ? 'bg-[#1A0F02] border-[#E7C768]/40 text-[#F4EE8E]' : 'bg-white border-[#B8860B]/40 text-amber-950'
                  }`}
                >
                  <option value="employee_direct">1. Исполнителю в личные сообщения Telegram</option>
                  <option value="manager_direct">2. Руководителю проекта в личные сообщения</option>
                  <option value="project_chat">3. В общий чат / группу проекта</option>
                  <option value="custom_chat">4. В проверенный канал или группу компании</option>
                  <option value="specific_employee">5. Конкретному сотруднику компании</option>
                </select>

                {/* Specific employee dropdown */}
                {ruleType === 'specific_employee' && (
                  <div className="mt-2 space-y-1">
                    <label className="block text-[11px] font-semibold opacity-75">
                      Выберите сотрудника компании:
                    </label>
                    <select
                      value={ruleTargetUserId || ''}
                      onChange={(e) => {
                        const emp = loadedEmployees.find(u => u.id === e.target.value);
                        setRuleTargetUserId(e.target.value);
                        if (emp) {
                          setRuleTargetChatId(emp.telegram_id || emp.telegramHandle || '');
                          setRuleTargetTitle(`в личку: ${emp.name}`);
                        }
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none ${
                        isDark ? 'bg-[#1A0F02] border-[#E7C768]/40 text-[#F4EE8E]' : 'bg-white border-[#B8860B]/40 text-amber-950'
                      }`}
                    >
                      {loadedEmployees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          👤 {emp.name} — {emp.role || emp.position || 'Сотрудник'} {emp.telegramHandle ? `(@${emp.telegramHandle})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Custom channel dropdown */}
                {ruleType === 'custom_chat' && (
                  <select
                    value={ruleTargetChatId}
                    onChange={(e) => {
                      const chat = savedChats.find(c => c.chat_id === e.target.value);
                      setRuleTargetChatId(e.target.value);
                      if (chat) setRuleTargetTitle(chat.title);
                    }}
                    className={`w-full mt-2 px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none ${
                      isDark ? 'bg-[#1A0F02] border-[#E7C768]/40 text-[#F4EE8E]' : 'bg-white border-[#B8860B]/40 text-amber-950'
                    }`}
                  >
                    {savedChats.map(c => (
                      <option key={c.id} value={c.chat_id}>📢 {c.title} ({c.chat_id})</option>
                    ))}
                  </select>
                )}
              </div>

              {/* 5. События и триггеры задачи */}
              <div className="space-y-2 pt-2 border-t border-amber-400/20">
                <label className="block text-xs font-bold uppercase tracking-wider opacity-85">
                  5. События и триггеры отправки
                </label>

                <div className="space-y-1.5 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl border border-amber-400/20 bg-amber-500/5 hover:bg-amber-500/10">
                    <input
                      type="checkbox"
                      checked={ruleSendOnCreate}
                      onChange={(e) => setRuleSendOnCreate(e.target.checked)}
                      className="accent-[#E7C768] w-4 h-4"
                    />
                    <span>При создании и назначении задачи</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl border border-amber-400/20 bg-amber-500/5 hover:bg-amber-500/10">
                    <input
                      type="checkbox"
                      checked={ruleSendOnSubmit}
                      onChange={(e) => setRuleSendOnSubmit(e.target.checked)}
                      className="accent-[#E7C768] w-4 h-4"
                    />
                    <span>При сдаче задачи на проверку</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl border border-amber-400/20 bg-amber-500/5 hover:bg-amber-500/10">
                    <input
                      type="checkbox"
                      checked={ruleReminderDeadlineTg}
                      onChange={(e) => setRuleReminderDeadlineTg(e.target.checked)}
                      className="accent-[#E7C768] w-4 h-4"
                    />
                    <span>Напоминание за 15 минут до дедлайна</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl border border-amber-400/20 bg-amber-500/5 hover:bg-amber-500/10">
                    <input
                      type="checkbox"
                      checked={ruleOverdueTg}
                      onChange={(e) => setRuleOverdueTg(e.target.checked)}
                      className="accent-[#E7C768] w-4 h-4"
                    />
                    <span>Уведомление при наступлении просрочки</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl border border-amber-400/20 bg-amber-500/5 hover:bg-amber-500/10">
                    <input
                      type="checkbox"
                      checked={ruleReviewResultTg}
                      onChange={(e) => setRuleReviewResultTg(e.target.checked)}
                      className="accent-[#E7C768] w-4 h-4"
                    />
                    <span>Итоговый вердикт и оценка ИИ-Ревизора</span>
                  </label>
                </div>
              </div>

              {/* 6. Каналы связи */}
              <div className="space-y-2 pt-2 border-t border-amber-400/20">
                <label className="block text-xs font-bold uppercase tracking-wider opacity-85">
                  6. Каналы связи
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl border border-amber-400/20 bg-amber-500/5">
                    <input
                      type="checkbox"
                      checked={ruleSendTelegram}
                      onChange={(e) => setRuleSendTelegram(e.target.checked)}
                      className="accent-[#E7C768] w-4 h-4"
                    />
                    <span>Telegram бот</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl border border-amber-400/20 bg-amber-500/5">
                    <input
                      type="checkbox"
                      checked={ruleNotifyInapp}
                      onChange={(e) => setRuleNotifyInapp(e.target.checked)}
                      className="accent-[#E7C768] w-4 h-4"
                    />
                    <span>Внутри кабинета</span>
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-3 pt-3 border-t border-amber-400/20">
                <button
                  type="submit"
                  disabled={isSavingRule}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 hover:brightness-105 cursor-pointer shadow-md disabled:opacity-50"
                >
                  <SaveIcon size={16} />
                  <span>{isSavingRule ? 'Сохранение...' : editingRuleId ? 'Обновить правило' : 'Сохранить правило'}</span>
                </button>

                {editingRuleId && (
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="px-4 py-2.5 rounded-xl border border-amber-400/40 text-xs font-semibold hover:bg-amber-500/10 cursor-pointer"
                  >
                    Отмена
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* RIGHT COLUMN: RULES LIST & FILTERS (lg:col-span-7) */}
          <div className="lg:col-span-7 space-y-4">

            {/* Top Toolbar: Active vs Archive rules & Archive Completed button */}
            <div className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${
              isDark ? 'bg-[#1A0F02]/80 border-amber-400/35' : 'bg-white/90 border-amber-500/30'
            }`}>
              {/* Active / Archive Toggle */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setArchiveFilter('active')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    archiveFilter === 'active'
                      ? 'bg-amber-500/25 border border-amber-400 text-[#E7C768]'
                      : 'border border-amber-400/20 hover:bg-amber-500/10 opacity-75'
                  }`}
                >
                  <Settings2 size={14} />
                  <span>Активные правила ({rules.filter(r => !r.is_archived).length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setArchiveFilter('archived')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    archiveFilter === 'archived'
                      ? 'bg-amber-500/25 border border-amber-400 text-[#E7C768]'
                      : 'border border-amber-400/20 hover:bg-amber-500/10 opacity-75'
                  }`}
                >
                  <Archive size={14} />
                  <span>Архив ({rules.filter(r => r.is_archived).length})</span>
                </button>
              </div>

              {/* Archive Completed Button */}
              <button
                type="button"
                onClick={handleArchiveCompletedProjectsRules}
                className="w-full sm:w-auto px-3 py-1.5 rounded-xl border border-amber-400/35 hover:bg-amber-500/15 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer text-[#E7C768]"
                title="Архивировать правила проектов, которые уже завершены"
              >
                <FolderCheck size={14} />
                <span>Архив завершенных</span>
              </button>
            </div>

            {/* Instruction Accordion */}
            <div className={`rounded-2xl border transition-all ${
              isDark ? 'bg-[#1A0F02]/70 border-amber-400/30' : 'bg-white/80 border-amber-500/30'
            }`}>
              <button
                type="button"
                onClick={() => setShowIdGuide(prev => !prev)}
                className="w-full p-3.5 flex items-center justify-between text-xs sm:text-sm font-bold cursor-pointer text-[#E7C768]"
              >
                <span className="flex items-center gap-2">
                  <HelpCircle size={16} />
                  <span>Где взять ID чата или канала для бота?</span>
                </span>
                {showIdGuide ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {showIdGuide && (
                <div className="p-3.5 pt-0 text-xs space-y-2 opacity-85 border-t border-amber-400/20">
                  <p>1. Добавьте вашего Telegram-бота в целевую группу или канал с правами администратора.</p>
                  <p>2. Отправьте любое сообщение в группу, перейдите во вкладку «Проверенные каналы и чаты» и нажмите «Проверить».</p>
                  <p>3. Для личных сообщений бот использует Telegram ID сотрудников, указанные в их профилях.</p>
                </div>
              )}
            </div>

            {/* Filter and Search Bar */}
            <div className={`p-3 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${
              isDark ? 'bg-[#1A0F02]/70 border-amber-400/30' : 'bg-white/80 border-amber-500/30'
            }`}>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter size={16} className="text-[#E7C768] shrink-0" />
                <select
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                  className={`w-full sm:w-48 px-3 py-1.5 rounded-xl border text-xs focus:outline-none ${
                    isDark ? 'bg-[#1A0F02] border-amber-400/40 text-[#F4EE8E]' : 'bg-white border-amber-400/40 text-amber-950'
                  }`}
                >
                  <option value="all">Все проекты ({loadedProjects.length})</option>
                  <optgroup label="Активные проекты">
                    {activeProjects.map(p => (
                      <option key={p.id} value={p.id}>⭐ {p.title}</option>
                    ))}
                  </optgroup>
                  {completedProjects.length > 0 && (
                    <optgroup label="Завершенные проекты">
                      {completedProjects.map(p => (
                        <option key={p.id} value={p.id}>⚪ {p.title}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div className="relative w-full sm:w-56">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск правил..."
                  className={`w-full pl-8 pr-3 py-1.5 rounded-xl border text-xs focus:outline-none ${
                    isDark ? 'bg-transparent border-amber-400/40 text-[#F4EE8E]' : 'bg-white border-amber-400/40 text-amber-950'
                  }`}
                />
              </div>
            </div>

            {/* Rules Cards List */}
            {isLoadingRules ? (
              <div className="p-8 text-center text-sm font-bold text-[#E7C768] flex items-center justify-center gap-2">
                <RefreshCw className="animate-spin" size={18} />
                <span>Загрузка правил маршрутизации...</span>
              </div>
            ) : filteredRules.length === 0 ? (
              <div className={`p-8 rounded-3xl border text-center space-y-2 ${
                isDark ? 'bg-[#1A0F02]/50 border-amber-400/20' : 'bg-white/60 border-amber-400/20'
              }`}>
                <ShieldAlert size={36} className="mx-auto text-amber-400 opacity-60" />
                <p className="text-sm font-bold">
                  {archiveFilter === 'archived' ? 'Архив правил пуст' : 'Правила маршрутизации пока не настроены'}
                </p>
                <p className="text-xs opacity-75">
                  {archiveFilter === 'archived'
                    ? 'Здесь будут отображаться правила по завершенным проектам.'
                    : 'Создайте первое правило в панели слева, чтобы автоматизировать уведомления задач.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRules.map((rule) => {
                  const status = testStatus[rule.id];
                  const isArchived = Boolean(rule.is_archived);

                  return (
                    <div
                      key={rule.id}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                        isDark
                          ? 'bg-[#1A0F02]/80 border-[#E7C768]/40 hover:border-[#E7C768] shadow-[0_0_20px_rgba(244,238,142,0.08)]'
                          : 'bg-[#FAF6EC]/95 border-[#B8860B]/30 hover:border-[#B8860B] shadow-sm'
                      }`}
                    >
                      {/* Top Card Row */}
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-2.5">
                          {/* Active Toggle Switch */}
                          <button
                            type="button"
                            onClick={() => handleToggleRule(rule)}
                            className={`w-11 h-6 rounded-full transition-colors cursor-pointer relative p-0.5 shrink-0 ${
                              rule.is_active ? 'bg-amber-400' : 'bg-zinc-700'
                            }`}
                            title={rule.is_active ? 'Правило активно (кликните для отключения)' : 'Правило отключено'}
                          >
                            <div className={`w-5 h-5 rounded-full bg-zinc-950 transition-transform ${
                              rule.is_active ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                          </button>

                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm sm:text-base font-bold text-[#E7C768]">
                                {rule.title}
                              </h4>
                              {isArchived && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                                  Архив
                                </span>
                              )}
                            </div>
                            <div className="text-xs opacity-75 flex flex-wrap items-center gap-2 mt-0.5">
                              <span>Получатель: {rule.target_title || 'Telegram'}</span>
                              <span>•</span>
                              <span>Формат: {rule.report_format === 'brief' ? 'Краткий отчет' : 'Полный отчет'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions: Archive / Unarchive, Edit & Delete */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleArchive(rule)}
                            className="p-1.5 rounded-lg border border-amber-400/30 hover:bg-amber-500/10 cursor-pointer"
                            title={isArchived ? 'Восстановить из архива' : 'Поместить в архив'}
                          >
                            {isArchived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditRule(rule)}
                            className="p-1.5 rounded-lg border border-amber-400/30 hover:bg-amber-500/10 cursor-pointer"
                            title="Редактировать правило"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(rule.id)}
                            className="p-1.5 rounded-lg border border-red-400/30 text-amber-400 hover:bg-red-500/10 cursor-pointer"
                            title="Удалить правило"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Triggers badges */}
                      <div className="flex flex-wrap gap-1.5 my-2.5 text-[11px]">
                        {rule.send_on_create === 1 && (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-400/30 text-amber-200">
                            ⚡ Создание задачи
                          </span>
                        )}
                        {rule.send_on_submit === 1 && (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-400/30 text-amber-200">
                            📋 Сдача на проверку
                          </span>
                        )}
                        {rule.reminder_deadline_tg === 1 && (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-400/30 text-amber-200">
                            ⏰ За 15 мин
                          </span>
                        )}
                        {rule.overdue_tg === 1 && (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-400/30 text-amber-200">
                            ⚠️ Просрочка
                          </span>
                        )}
                        {rule.review_result_tg === 1 && (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-400/30 text-amber-200">
                            ⭐ Вердикт ИИ
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-400/20 text-amber-300">
                          {rule.report_format === 'brief' ? '📄 Краткий' : '📑 Полный'}
                        </span>
                      </div>

                      {/* Card Footer: Test Send Button */}
                      <div className="flex items-center justify-between pt-2.5 border-t border-amber-400/15 text-xs">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleTestSend(rule)}
                            disabled={status?.loading}
                            className="px-3 py-1.5 rounded-xl border border-amber-400/40 bg-amber-500/15 hover:bg-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Send size={13} />
                            <span>{status?.loading ? 'Отправка...' : 'Проверить отправку'}</span>
                          </button>

                          {status?.message && (
                            <span className={`text-[11px] font-bold ${status.success ? 'text-amber-300' : 'text-red-300'}`}>
                              {status.message}
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] opacity-60 font-mono">
                          ID: {rule.id.slice(0, 8)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: VERIFIED CHANNELS AND CHATS */}
      {activeTab === 'channels' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Add Channel Form */}
          <div className="lg:col-span-5 space-y-4">
            <form onSubmit={handleVerifyChat} className={`p-5 sm:p-6 rounded-3xl border space-y-4 ${
              isDark
                ? 'bg-[#1A0F02]/85 border-[#E7C768]/45 shadow-[0_0_30px_rgba(244,238,142,0.12)]'
                : 'bg-[#FAF6EC]/90 border-[#B8860B]/35 shadow-md'
            }`}>
              <div className="flex items-center gap-2 border-b pb-3 border-amber-400/20">
                <Send size={18} className="text-[#E7C768]" />
                <h3 className="text-base font-bold text-[#E7C768]">
                  Добавить и проверить чат
                </h3>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider opacity-85">
                  ID чата или @username канала *
                </label>
                <input
                  type="text"
                  value={newChatInput}
                  onChange={(e) => setNewChatInput(e.target.value)}
                  placeholder="-100123456789 или @my_channel"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none ${
                    isDark ? 'bg-transparent border-[#E7C768]/40 text-[#F4EE8E]' : 'bg-white border-[#B8860B]/40 text-amber-950'
                  }`}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider opacity-85">
                  Понятное название (для списка)
                </label>
                <input
                  type="text"
                  value={newChatTitle}
                  onChange={(e) => setNewChatTitle(e.target.value)}
                  placeholder="Например: Чат отдела продаж"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none ${
                    isDark ? 'bg-transparent border-[#E7C768]/40 text-[#F4EE8E]' : 'bg-white border-[#B8860B]/40 text-amber-950'
                  }`}
                />
              </div>

              {verifyStatus && (
                <div className={`p-3 rounded-xl border text-xs font-bold ${
                  verifyStatus.success ? 'bg-amber-500/20 border-amber-400 text-amber-200' : 'bg-red-500/20 border-red-400 text-red-200'
                }`}>
                  {verifyStatus.message}
                </div>
              )}

              <button
                type="submit"
                disabled={isVerifyingChat || !newChatInput.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 hover:brightness-105 cursor-pointer shadow-md disabled:opacity-50"
              >
                <Bot size={16} />
                <span>{isVerifyingChat ? 'Проверка бота в чате...' : 'Проверить и сохранить чат'}</span>
              </button>
            </form>
          </div>

          {/* List of Verified Channels */}
          <div className="lg:col-span-7 space-y-4">
            <div className={`p-4 sm:p-5 rounded-3xl border space-y-4 ${
              isDark ? 'bg-[#1A0F02]/85 border-[#E7C768]/45' : 'bg-[#FAF6EC]/90 border-[#B8860B]/35'
            }`}>
              <h3 className="text-base font-bold text-[#E7C768] flex items-center justify-between">
                <span>Список проверенных каналов ({savedChats.length})</span>
                <button
                  type="button"
                  onClick={loadData}
                  className="p-1.5 rounded-lg border border-amber-400/30 hover:bg-amber-500/10 cursor-pointer"
                  title="Обновить список"
                >
                  <RefreshCw size={15} />
                </button>
              </h3>

              {savedChats.length === 0 ? (
                <div className="p-8 text-center text-xs opacity-70">
                  Нет сохраненных чатов. Добавьте чат в форме слева.
                </div>
              ) : (
                <div className="space-y-3">
                  {savedChats.map((c) => (
                    <div
                      key={c.id}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                        isDark ? 'bg-amber-500/5 border-amber-400/20' : 'bg-white border-amber-500/20'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-[#E7C768] truncate">
                          {c.title}
                        </div>
                        <div className="text-xs font-mono opacity-70">
                          {c.chat_id} {c.username ? `• @${c.username}` : ''}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteChat(c.id)}
                        className="p-1.5 rounded-lg border border-red-400/30 text-amber-400 hover:bg-red-500/10 cursor-pointer shrink-0"
                        title="Удалить чат"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRM DELETE MODAL */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
          <div className={`w-full max-w-sm rounded-3xl border p-5 sm:p-6 shadow-2xl space-y-4 ${
            isDark ? 'bg-[#1A0F02] border-amber-400/60 text-[#F4EE8E]' : 'bg-[#FAF6EC] border-amber-900/40 text-amber-950'
          }`}>
            <h4 className="text-base font-bold text-[#E7C768]">Удаление правила</h4>
            <p className="text-xs opacity-80">
              Вы уверены, что хотите удалить это правило маршрутизации? Действие необратимо.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 rounded-xl border border-amber-400/30 text-xs font-semibold hover:bg-amber-500/10 cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => handleDeleteRule(confirmDeleteId)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 text-white text-xs font-bold hover:brightness-110 cursor-pointer"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper save icon component to prevent naming collision
function SaveIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
    </svg>
  );
}

export default CabinetTaskIntegrations;
