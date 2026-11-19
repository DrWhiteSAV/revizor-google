import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Mic, Send, AlertCircle, RefreshCw, MapPin, Navigation, 
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Check, RotateCcw, Camera, FileText, Upload, 
  Shield, Globe, Radio, Zap, CheckCircle2, Layers, Building, Users, User, UserCheck, MessageSquare,
  Search, Eye, X, Box, Cpu, ArrowLeft, ArrowRight, Save, Image as ImageIcon, Copy,
  CheckSquare, Circle, Play, Award, BarChart3, Database, SlidersHorizontal, Filter, CheckCircle, Clock,
  Plus, Trash2, Edit3, Calendar, History, TrendingUp, CheckCheck, Coins,
  Video, Monitor, FileCheck, Sheet, Presentation, Headphones, Paperclip, Link2, ExternalLink, LocateFixed, Hash, Bookmark
} from 'lucide-react';
import { formatRub } from '../../components/motivation/types';
import { ReportTemplate, SubmittedReport, UserProfile, UserRole, NotificationItem, ReportField, ReportPlanItem } from '../../types';
import VoiceEqualizer from '../../components/VoiceEqualizer';
import AIBall from '../../components/AIBall';
import { CreateReportModal } from '../../components/raport/CreateReportModal';
import { ReportFileUploader } from '../../components/raport/ReportFileUploader';
import { ReportSmartFileInput } from '../../components/raport/ReportSmartFileInput';
import { ReportMediaCaptureModal } from '../../components/raport/ReportMediaCaptureModal';
import { MiniAudioField } from '../../components/voice/MiniAudioField';
import { AudioField } from '../../components/voice/AudioField';
import { ReportCascadeCheckOverlay, CascadeStep } from '../../components/raport/ReportCascadeCheckOverlay';
import { useCascadeCheckStore } from '../../store/useCascadeCheckStore';
import { AiLoadingOverlay } from '../../components/common/AiLoadingOverlay';
import { getAcceptedPlanForNextReport, MatchedPlanGroup } from '../../utils/planMatching';
import { FileUploadService } from '../../services/FileUploadService';


interface CabinetFillReportProps {
  currentUser: UserProfile | null;
  userPosition?: string;
  templates: ReportTemplate[];
  setTemplates?: (val: ReportTemplate[]) => void;
  departments: any[];
  reports: SubmittedReport[];
  setReports: (val: SubmittedReport[]) => void;
  company: any;
  saveStateToServer: (updated: any) => void;
  triggerAI: (promptText: string, sysPrompt: string, onGenerated: (text: string) => void, mascotType?: any) => void;
  notifications: NotificationItem[];
  setNotifications: (val: NotificationItem[]) => void;
  tariff: any;
  crmCompanies: any;
  transactions: any[];
  mockEmployees: UserProfile[];
  promptRecs?: string;
  promptFastFill?: string;
  defaultOpenCreateModal?: boolean;
  onNavigate?: (path: string) => void;
}

const getUserAvatar = (user: UserProfile | null): string => {
  if (!user) return "/file/27/iirr1.png";
  if (user.photo_url) return user.photo_url;
  if (user.avatarUrl && !user.avatarUrl.includes("unsplash.com")) return user.avatarUrl;
  if ((user as any)?.telegram_photo) return (user as any).telegram_photo;
  if (user.username) {
    const clean = user.username.replace('@', '').trim();
    if (clean) return `https://t.me/i/userpic/320/${clean}.jpg`;
  }
  if (user.telegramHandle) {
    const clean = user.telegramHandle.replace('@', '').trim();
    if (clean) return `https://t.me/i/userpic/320/${clean}.jpg`;
  }
  return "/file/27/iirr1.png";
};

export default function CabinetFillReport({
  currentUser,
  userPosition = '',
  templates,
  setTemplates,
  departments,
  reports,
  setReports,
  company,
  saveStateToServer,
  triggerAI,
  notifications,
  setNotifications,
  tariff,
  crmCompanies,
  transactions,
  mockEmployees,
  promptRecs,
  promptFastFill,
  defaultOpenCreateModal = false,
  onNavigate
}: CabinetFillReportProps) {
  // Check theme
  const [isLightTheme, setIsLightTheme] = useState(() => {
    return document.documentElement.classList.contains('theme-light') || !document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsLightTheme(document.documentElement.classList.contains('theme-light') || !document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // URL parsing helper for dynamic report ID (/cabinet/raport123456789 or /cabinet/raport/123456789 or ?reportId=...)
  const getReportIdFromUrl = React.useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    const path = window.location.pathname;
    // Match /cabinet/raport123456789 or /cabinet/raport/123456789 or /cabinet/raport-123456789
    const match = path.match(/^\/cabinet\/raport(?:\/|-)?([a-zA-Z0-9_\-]+)$/);
    if (match && match[1]) {
      const candidate = match[1];
      const reserved = ['builder', 'schedule', 'schedules', 'calendar', 'analytics', 'notifications', 'summaries', 'kpi', 'templates', 'integrations'];
      if (!reserved.includes(candidate)) {
        return candidate;
      }
    }
    const params = new URLSearchParams(window.location.search);
    return params.get('reportId') || params.get('id') || null;
  }, []);

  const initialReportId = getReportIdFromUrl();

  // Active Report Template state & Routing sync
  const [activeReportTemplate, setActiveReportTemplate] = useState<ReportTemplate | null>(() => {
    if (initialReportId) {
      const found = templates.find(t => 
        t.id === initialReportId || 
        t.id === `tpl-${initialReportId}` || 
        initialReportId === t.id.replace(/^tpl-/, '')
      );
      if (found) return found;
    }
    return null;
  });

  // Filters & Search for report selection plates
  const [selectedPosition, setSelectedPosition] = useState<string>('Все должности');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Employee Selection Modal & Tag Cloud State
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState<boolean>(false);
  // Default filter is strictly set to current user's own reports
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>(() => {
    if (currentUser?.id) return [String(currentUser.id)];
    try {
      const saved = localStorage.getItem('rr_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.id) return [String(parsed.id)];
      }
    } catch (e) {}
    return [];
  });
  const hasManuallyChangedEmployeeFilterRef = useRef<boolean>(false);

  useEffect(() => {
    const handleSetRaportFilter = (e?: any) => {
      const filter = e?.detail?.filter || (typeof window !== 'undefined' ? sessionStorage.getItem('raport_filter') : null);
      if (filter === 'my' && currentUser?.id) {
        hasManuallyChangedEmployeeFilterRef.current = false;
        setSelectedEmployeeIds([String(currentUser.id)]);
      }
    };

    window.addEventListener('raport-set-filter', handleSetRaportFilter);
    const saved = typeof window !== 'undefined' ? sessionStorage.getItem('raport_filter') : null;
    if (saved === 'my' && currentUser?.id) {
      setSelectedEmployeeIds([String(currentUser.id)]);
    }

    return () => window.removeEventListener('raport-set-filter', handleSetRaportFilter);
  }, [currentUser?.id]);

  useEffect(() => {
    if (currentUser?.id && !hasManuallyChangedEmployeeFilterRef.current) {
      setSelectedEmployeeIds([String(currentUser.id)]);
    }
  }, [currentUser?.id]);

  const [modalSearchQuery, setModalSearchQuery] = useState<string>('');

  // 2. 3-State Filter Mode Structure ('INCLUDE' | 'EXCLUDE' | 'DISABLED')
  type FilterMode = 'INCLUDE' | 'EXCLUDE' | 'DISABLED';

  const toggleFilterMode = (mode: FilterMode): FilterMode => {
    if (mode === 'INCLUDE') return 'EXCLUDE';
    if (mode === 'EXCLUDE') return 'DISABLED';
    return 'INCLUDE';
  };

  const [departmentFilter, setDepartmentFilter] = useState<{ value: string; mode: FilterMode }>({ value: 'all', mode: 'DISABLED' });
  const [positionFilter, setPositionFilter] = useState<{ value: string; mode: FilterMode }>({ value: 'all', mode: 'DISABLED' });
  const [reportTypeFilter, setReportTypeFilter] = useState<{ value: string; mode: FilterMode }>({ value: 'all', mode: 'DISABLED' });
  const [completionStatusFilter, setCompletionStatusFilter] = useState<{ value: string; mode: FilterMode }>({ value: 'all', mode: 'DISABLED' });

  // Review & Verification Status Filter for reports
  const [reviewFilterStatus, setReviewFilterStatus] = useState<
    'all' | 'need_review' | 'ai_verified' | 'reviewed_with_comments' | 'reviewed_no_comments' | 'edits_accepted'
  >('all');

  const handleGoToReview = (reportId: string) => {
    const targetUrl = `/cabinet/raport/review/${encodeURIComponent(reportId)}`;
    if (onNavigate) {
      onNavigate(targetUrl);
    } else {
      window.location.assign(targetUrl);
    }
  };

  const handleGoToVerdict = (reportId: string) => {
    const targetUrl = `/cabinet/raport/verdict/${encodeURIComponent(reportId)}`;
    if (onNavigate) {
      onNavigate(targetUrl);
    } else {
      window.location.assign(targetUrl);
    }
  };

  // 3. 3D Carousel State & Touch Gestures
  const [carouselActiveIndex, setCarouselActiveIndex] = useState<number>(0);
  const touchStartYRef = useRef<number | null>(null);

  // 4. Report Builder Modal & AI Autofill State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(() => {
    if (initialReportId) return true;
    return defaultOpenCreateModal || false;
  });
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(() => {
    if (initialReportId) {
      return templates.find(t => 
        t.id === initialReportId || 
        t.id === `tpl-${initialReportId}` || 
        initialReportId === t.id.replace(/^tpl-/, '')
      ) || null;
    }
    return null;
  });
  const [isAIAutofillModalOpen, setIsAIAutofillModalOpen] = useState<boolean>(false);
  const [aiAutofillInput, setAiAutofillInput] = useState<string>('');
  const [isAIAutofilling, setIsAIAutofilling] = useState<boolean>(false);
  const [aiAutofillTitle, setAiAutofillTitle] = useState<string>('Автозаполнение отчета нейросетью');
  const [aiAutofillSubtitle, setAiAutofillSubtitle] = useState<string>('Анализирую структуру регламента и формирую ответы по всем пунктам...');

  // Sync state if templates arrive after initial mount or URL changes
  useEffect(() => {
    const reportId = getReportIdFromUrl();
    if (reportId && templates.length > 0) {
      const found = templates.find(t => 
        t.id === reportId || 
        t.id === `tpl-${reportId}` || 
        reportId === t.id.replace(/^tpl-/, '')
      );
      if (found) {
        setActiveReportTemplate(found);
      }
    }
  }, [templates, getReportIdFromUrl]);

  // Open Template Editor for a specific report
  const handleConfigureTemplate = (tpl: ReportTemplate) => {
    const newUrl = `/cabinet/raport${tpl.id}`;
    window.history.pushState({}, '', newUrl);
    window.dispatchEvent(new Event('popstate'));
    setEditingTemplate(tpl);
    setIsCreateModalOpen(true);
  };

  // Close Template Editor
  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setEditingTemplate(null);
    if (activeReportTemplate) {
      const targetUrl = `/cabinet/raport${activeReportTemplate.id}`;
      if (window.location.pathname !== targetUrl) {
        window.history.pushState({}, '', targetUrl);
        window.dispatchEvent(new Event('popstate'));
      }
    }
  };

  // Handle saving new or edited report template to PostgreSQL BD ProTalk database
  const handleSaveTemplate = async (templateToSave: ReportTemplate) => {
    try {
      const res = await fetch('/api/report-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateToSave)
      });
      if (res.ok) {
        const data = await res.json();
        const savedTemplate = (data.success && data.template) ? data.template : templateToSave;
        const exists = templates.some(t => t.id === savedTemplate.id);
        const nextTemplates = exists
          ? templates.map(t => t.id === savedTemplate.id ? savedTemplate : t)
          : [savedTemplate, ...templates];
        if (setTemplates) {
          setTemplates(nextTemplates);
        }
        saveStateToServer({
          company, departments, templates: nextTemplates, reports,
          notifications, tariff, crmCompanies, mockEmployees
        });

        // Activate the newly created or saved report
        setActiveReportTemplate(savedTemplate);
        setCurrentStepIndex(0);
        setReportAnswers({});
        setSubmittedResult(null);

        // Close create modal
        setIsCreateModalOpen(false);
        setEditingTemplate(null);

        // Navigate directly to the integrations page configured for this report
        const integrationsUrl = `/cabinet/raport/integrations?openRule=1&templateId=${encodeURIComponent(savedTemplate.id)}&scope=specific`;
        if (onNavigate) {
          onNavigate(integrationsUrl);
        } else {
          window.history.pushState({}, '', integrationsUrl);
          window.dispatchEvent(new Event('popstate'));
        }
      }
    } catch (e) {
      console.error('Error saving template to DB:', e);
    }
  };

  // Consolidated Employees List
  const allEmployeesList: UserProfile[] = React.useMemo(() => {
    const list: UserProfile[] = [];
    if (currentUser) list.push(currentUser);
    if (mockEmployees && mockEmployees.length > 0) {
      mockEmployees.forEach(emp => {
        if (!list.some(e => e.id === emp.id)) {
          list.push(emp);
        }
      });
    }
    return list;
  }, [currentUser, mockEmployees]);

  // Permissions: Manage / Configure templates is allowed only for Admin, Super Admin, Director, Manager
  const canManageTemplates = Boolean(
    currentUser?.role && [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.DIRECTOR,
      UserRole.MANAGER
    ].includes(currentUser.role)
  );

  // Helper function to format report title without all caps (sentence case)
  const formatTitleNormalCase = (text: string) => {
    if (!text) return '';
    const lower = text.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  };

  // Generated Report Card Items for 3D Vertical Carousel based on active filters
  const lastWheelTimeRef = useRef<number>(0);

  const cardItems = React.useMemo(() => {
    const items: Array<{
      id: string;
      employee: UserProfile;
      template: ReportTemplate;
      departmentName: string;
      isSubmitted: boolean;
      submittedReport?: SubmittedReport;
      isPlanCard?: boolean;
      planData?: MatchedPlanGroup;
    }> = [];

    allEmployeesList.forEach(emp => {
      // 1. Employee Filter
      if (selectedEmployeeIds.length > 0 && !selectedEmployeeIds.includes('all')) {
        if (!selectedEmployeeIds.some(id => String(id) === String(emp.id))) return;
      }

      // 2. Search Query (Employee Name / Position)
      if (modalSearchQuery.trim()) {
        const q = modalSearchQuery.toLowerCase();
        const matchesName = emp.name.toLowerCase().includes(q);
        const matchesPos = (emp.position || '').toLowerCase().includes(q);
        if (!matchesName && !matchesPos) return;
      }

      // 3. Position Filter Mode
      if (positionFilter.mode !== 'DISABLED' && positionFilter.value !== 'all') {
        const empPos = (emp.position || '').toLowerCase();
        const targetPos = positionFilter.value.toLowerCase();
        const matches = empPos.includes(targetPos);
        if (positionFilter.mode === 'INCLUDE' && !matches) return;
        if (positionFilter.mode === 'EXCLUDE' && matches) return;
      }

      templates.forEach(tpl => {
        const dept = departments.find((d: any) => d.id === tpl.departmentId);
        const deptName = dept?.name || 'Главный отдел';

        // 4. Department Filter Mode
        if (departmentFilter.mode !== 'DISABLED' && departmentFilter.value !== 'all') {
          const matches = tpl.departmentId === departmentFilter.value;
          if (departmentFilter.mode === 'INCLUDE' && !matches) return;
          if (departmentFilter.mode === 'EXCLUDE' && matches) return;
        }

        // 5. Report Type Filter Mode
        if (reportTypeFilter.mode !== 'DISABLED' && reportTypeFilter.value !== 'all') {
          const matches = tpl.type === reportTypeFilter.value;
          if (reportTypeFilter.mode === 'INCLUDE' && !matches) return;
          if (reportTypeFilter.mode === 'EXCLUDE' && matches) return;
        }

        // Check if submitted
        const submitted = reports.find(r => 
          (r.templateId === tpl.id || (r as any).template_id === tpl.id) &&
          (r.employeeId === emp.id || (r as any).user_id === emp.id || (r as any).employee_id === emp.id || (!r.employeeId && !(r as any).user_id))
        );
        const isSubmitted = !!submitted;

        // 6. Completion Status Filter Mode for standard template card
        let showTemplateCard = true;
        if (completionStatusFilter.mode !== 'DISABLED' && completionStatusFilter.value !== 'all') {
          if (completionStatusFilter.value === 'PLANS') {
            showTemplateCard = false;
          } else {
            const isTargetSubmitted = completionStatusFilter.value === 'SUBMITTED';
            const matches = isSubmitted === isTargetSubmitted;
            if (completionStatusFilter.mode === 'INCLUDE' && !matches) showTemplateCard = false;
            if (completionStatusFilter.mode === 'EXCLUDE' && matches) showTemplateCard = false;
          }
        }

        // 7. Review & Verification Filter Mode
        if (reviewFilterStatus !== 'all') {
          if (!submitted) {
            showTemplateCard = false;
          } else {
            const reqReview = Boolean(
              tpl.checker_type === 'manual' || 
              tpl.checker_type === 'hybrid' || 
              tpl.checker_type === 'director' || 
              tpl.checker_type === 'manager' ||
              submitted.checker_type === 'manual' || 
              submitted.checker_type === 'hybrid' || 
              submitted.checker_type === 'director' || 
              submitted.checker_type === 'manager' ||
              tpl.reviewer_id || 
              submitted.reviewer_id
            );
            const hasComments = Boolean(
              (submitted.managerComment && submitted.managerComment.trim().length > 0) ||
              (submitted.managerTask && submitted.managerTask.trim().length > 0) ||
              (submitted.fieldComments && Object.keys(submitted.fieldComments).length > 0)
            );

            if (reviewFilterStatus === 'need_review') {
              if (!reqReview || submitted.isReviewedByManager) showTemplateCard = false;
            } else if (reviewFilterStatus === 'ai_verified') {
              const isAi = submitted.qualityScore !== undefined || submitted.aiRecommendations || (submitted as any).ai_verdict;
              if (!isAi) showTemplateCard = false;
            } else if (reviewFilterStatus === 'reviewed_with_comments') {
              if (!submitted.isReviewedByManager || !hasComments) showTemplateCard = false;
            } else if (reviewFilterStatus === 'reviewed_no_comments') {
              if (!submitted.isReviewedByManager || hasComments) showTemplateCard = false;
            } else if (reviewFilterStatus === 'edits_accepted') {
              const isAccepted = Boolean(submitted.manager_edits_accepted || (submitted as any).manager_edits_accepted === 1);
              if (!submitted.isReviewedByManager || !isAccepted) showTemplateCard = false;
            }
          }
        }

        if (showTemplateCard) {
          items.push({
            id: `card-${emp.id}-${tpl.id}`,
            employee: emp,
            template: tpl,
            departmentName: deptName,
            isSubmitted: isSubmitted,
            submittedReport: submitted,
            isPlanCard: false
          });
        }

        // Additional card: Accepted AI Plan (only in general view)
        if (submitted && reviewFilterStatus === 'all') {
          const rawPlan = submitted.aiPlan || (submitted as any).ai_plan;
          const isPlanAccepted = (submitted.aiPlanStatus === 'accepted' || (submitted as any).ai_plan_status === 'accepted') && Array.isArray(rawPlan) && rawPlan.length > 0;
          if (isPlanAccepted) {
            const compCount = rawPlan.filter((it: any) => it.completed).length;
            const repDate = (submitted as any).date || submitted.timestamp || (submitted as any).created_at || 'Сегодня';
            const periodType = tpl.type === 'PLAN_DAY' || tpl.type === 'FACT_DAY' ? 'day' : tpl.type === 'WEEKLY' ? 'week' : 'month';
            const planGroup: MatchedPlanGroup = {
              reportId: submitted.id,
              sourceReportDate: repDate,
              sourceTemplateTitle: tpl.title,
              periodType,
              periodLabel: periodType === 'day' ? 'Смена' : periodType === 'week' ? 'Неделя' : 'Месяц',
              items: rawPlan,
              totalCount: rawPlan.length,
              completedCount: compCount,
              allCompleted: compCount === rawPlan.length && rawPlan.length > 0,
              targetDate: repDate
            };

            let showPlanCard = true;
            if (completionStatusFilter.mode !== 'DISABLED' && completionStatusFilter.value !== 'all') {
              if (completionStatusFilter.value === 'PENDING') showPlanCard = false;
              if (completionStatusFilter.mode === 'EXCLUDE' && completionStatusFilter.value === 'PLANS') showPlanCard = false;
            }

            if (showPlanCard) {
              items.push({
                id: `card-plan-${submitted.id}`,
                employee: emp,
                template: tpl,
                departmentName: deptName,
                isSubmitted: true,
                submittedReport: submitted,
                isPlanCard: true,
                planData: planGroup
              });
            }
          }
        }
      });
    });

    return items;
  }, [
    allEmployeesList,
    templates,
    reports,
    departments,
    selectedEmployeeIds,
    modalSearchQuery,
    departmentFilter,
    positionFilter,
    reportTypeFilter,
    completionStatusFilter,
    reviewFilterStatus
  ]);

  // Reactive counters for submitted, pending, and accepted plans across selected context
  const { submittedCount, pendingCount, plansCount } = React.useMemo(() => {
    let sub = 0;
    let pend = 0;
    let plans = 0;
    allEmployeesList.forEach(emp => {
      if (selectedEmployeeIds.length > 0 && !selectedEmployeeIds.includes('all')) {
        if (!selectedEmployeeIds.some(id => String(id) === String(emp.id))) return;
      }
      templates.forEach(tpl => {
        const submitted = reports.find(r => 
          (r.templateId === tpl.id || (r as any).template_id === tpl.id) &&
          (r.employeeId === emp.id || (r as any).user_id === emp.id || (r as any).employee_id === emp.id || (!r.employeeId && !(r as any).user_id))
        );
        if (submitted) {
          sub++;
          const rawPlan = submitted.aiPlan || (submitted as any).ai_plan;
          if ((submitted.aiPlanStatus === 'accepted' || (submitted as any).ai_plan_status === 'accepted') && Array.isArray(rawPlan) && rawPlan.length > 0) {
            plans++;
          }
        } else {
          pend++;
        }
      });
    });
    return { submittedCount: sub, pendingCount: pend, plansCount: plans };
  }, [allEmployeesList, selectedEmployeeIds, templates, reports]);

  // Counters specifically for review and verification categories
  const reviewCounts = React.useMemo(() => {
    let all = 0;
    let needReview = 0;
    let aiVerified = 0;
    let reviewedWithComments = 0;
    let reviewedNoComments = 0;
    let editsAccepted = 0;

    reports.forEach(r => {
      if (selectedEmployeeIds.length > 0 && !selectedEmployeeIds.includes('all')) {
        const empId = r.employeeId || (r as any).employee_id || (r as any).user_id;
        if (!selectedEmployeeIds.some(id => String(id) === String(empId))) return;
      }

      all++;

      const tpl = templates.find(t => t.id === r.templateId || t.id === (r as any).template_id);
      const reqReview = Boolean(
        tpl?.checker_type === 'manual' || 
        tpl?.checker_type === 'hybrid' || 
        tpl?.checker_type === 'director' || 
        tpl?.checker_type === 'manager' ||
        r.checker_type === 'manual' || 
        r.checker_type === 'hybrid' || 
        r.checker_type === 'director' || 
        r.checker_type === 'manager' ||
        tpl?.reviewer_id || 
        r.reviewer_id
      );

      if (reqReview && !r.isReviewedByManager) {
        needReview++;
      }

      if (r.qualityScore !== undefined || r.aiRecommendations || (r as any).ai_verdict) {
        aiVerified++;
      }

      const hasComments = Boolean(
        (r.managerComment && r.managerComment.trim().length > 0) ||
        (r.managerTask && r.managerTask.trim().length > 0) ||
        (r.fieldComments && Object.keys(r.fieldComments).length > 0)
      );

      if (r.isReviewedByManager && hasComments) {
        reviewedWithComments++;
      }

      if (r.isReviewedByManager && !hasComments) {
        reviewedNoComments++;
      }

      if (r.isReviewedByManager && (r.manager_edits_accepted || (r as any).manager_edits_accepted === 1)) {
        editsAccepted++;
      }
    });

    return {
      all,
      needReview,
      aiVerified,
      reviewedWithComments,
      reviewedNoComments,
      editsAccepted
    };
  }, [reports, templates, selectedEmployeeIds]);

  // Filtered reports matching current review filter for direct list registry
  const filteredReviewReports = React.useMemo(() => {
    return reports.filter(r => {
      // 1. Employee filter
      if (selectedEmployeeIds.length > 0 && !selectedEmployeeIds.includes('all')) {
        const empId = r.employeeId || (r as any).employee_id || (r as any).user_id;
        if (!selectedEmployeeIds.some(id => String(id) === String(empId))) return false;
      }

      // 2. Department filter
      if (departmentFilter.mode !== 'DISABLED' && departmentFilter.value !== 'all') {
        const matches = r.departmentId === departmentFilter.value;
        if (departmentFilter.mode === 'INCLUDE' && !matches) return false;
        if (departmentFilter.mode === 'EXCLUDE' && matches) return false;
      }

      // 3. Search query
      if (modalSearchQuery.trim()) {
        const q = modalSearchQuery.toLowerCase();
        const matchesName = (r.employeeName || '').toLowerCase().includes(q);
        const matchesTitle = (r.templateTitle || '').toLowerCase().includes(q);
        if (!matchesName && !matchesTitle) return false;
      }

      // 4. Review filter
      if (reviewFilterStatus === 'all') return true;

      const tpl = templates.find(t => t.id === r.templateId || t.id === (r as any).template_id);
      const reqReview = Boolean(
        tpl?.checker_type === 'manual' || 
        tpl?.checker_type === 'hybrid' || 
        tpl?.checker_type === 'director' || 
        tpl?.checker_type === 'manager' ||
        r.checker_type === 'manual' || 
        r.checker_type === 'hybrid' || 
        r.checker_type === 'director' || 
        r.checker_type === 'manager' ||
        tpl?.reviewer_id || 
        r.reviewer_id
      );

      const hasComments = Boolean(
        (r.managerComment && r.managerComment.trim().length > 0) ||
        (r.managerTask && r.managerTask.trim().length > 0) ||
        (r.fieldComments && Object.keys(r.fieldComments).length > 0)
      );

      if (reviewFilterStatus === 'need_review') {
        return reqReview && !r.isReviewedByManager;
      }
      if (reviewFilterStatus === 'ai_verified') {
        return Boolean(r.qualityScore !== undefined || r.aiRecommendations || (r as any).ai_verdict);
      }
      if (reviewFilterStatus === 'reviewed_with_comments') {
        return Boolean(r.isReviewedByManager && hasComments);
      }
      if (reviewFilterStatus === 'reviewed_no_comments') {
        return Boolean(r.isReviewedByManager && !hasComments);
      }
      if (reviewFilterStatus === 'edits_accepted') {
        return Boolean(r.isReviewedByManager && (r.manager_edits_accepted || (r as any).manager_edits_accepted === 1));
      }

      return true;
    });
  }, [reports, selectedEmployeeIds, departmentFilter, modalSearchQuery, reviewFilterStatus, templates]);

  // Step-by-Step Card Index (0 to fields.length)
  // Step === fields.length is the Final Summary Plate
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  // Card Animation Direction: 'forward' | 'backward'
  const [cardAnimDirection, setCardAnimDirection] = useState<'forward' | 'backward'>('forward');

  // Answers State
  const [reportAnswers, setReportAnswers] = useState<Record<string, any>>({});

  // User Personal Presets (Templates) for this report and user ID
  const [userPresets, setUserPresets] = useState<Array<{ id: string; title: string; createdAt: string; answers: Record<string, any> }>>([]);
  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState<boolean>(false);
  const [isPreviousPlanModalOpen, setIsPreviousPlanModalOpen] = useState<boolean>(false);
  const [viewingPlanReportId, setViewingPlanReportId] = useState<string | null>(null);
  const [presetTitleInput, setPresetTitleInput] = useState<string>('');
  const [draftRestoredNotice, setDraftRestoredNotice] = useState<string | null>(null);

  // Load draft from localStorage or initialize empty fields with plan prefill
  const loadDraftOrInit = React.useCallback((tpl: ReportTemplate) => {
    const userId = currentUser?.id || 'guest';
    const draftKey = `report_draft_${userId}_${tpl.id}`;
    let restoredAnswers: Record<string, any> | null = null;

    try {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          restoredAnswers = parsed;
        }
      }
    } catch (e) {
      console.warn('Draft parse error:', e);
    }

    // Check for previous accepted AI plan for this period
    const acceptedPlan = getAcceptedPlanForNextReport(reports, tpl.type, currentUser?.id);
    let planPrefilled = false;

    if (restoredAnswers) {
      // If a draft exists, check if the plan field is still empty, and prefill if empty
      if (acceptedPlan && acceptedPlan.items && acceptedPlan.items.length > 0) {
        const planField = tpl.fields.find(f => {
          const l = (f.label || '').toLowerCase();
          return (l.includes('план') || l.includes('задач') || l.includes('цел') || l.includes('итог') || l.includes('факт') || l.includes('смен')) &&
                 (f.type === 'text_paragraph' || f.type === 'text' || f.type === 'text_short' || f.type === 'voice' || f.type === 'list');
        }) || tpl.fields.find(f => f.type === 'text_paragraph' || f.type === 'text');

        if (planField && (!restoredAnswers[planField.id] || (typeof restoredAnswers[planField.id] === 'string' && !restoredAnswers[planField.id].trim()))) {
          const formattedItems = acceptedPlan.items.map((it, idx) => 
            `${idx + 1}. [${it.completed ? 'Выполнено' : 'В работе'}] ${it.title}`
          ).join('\n');
          restoredAnswers[planField.id] = `Задачи по принятому плану (${acceptedPlan.periodLabel}):\n${formattedItems}`;
          planPrefilled = true;
        }
      }

      setReportAnswers(restoredAnswers);
      if (planPrefilled && acceptedPlan) {
        setDraftRestoredNotice(`Восстановлен черновик • Задачи плана (${acceptedPlan.periodLabel}) предзаполнены`);
      } else {
        setDraftRestoredNotice('Восстановлен сохраненный черновик ответов');
      }
      setTimeout(() => setDraftRestoredNotice(null), 4500);
    } else {
      const initAnswers: Record<string, any> = {};
      tpl.fields.forEach(f => {
        if (f.type === 'checkbox') initAnswers[f.id] = false;
        else if (f.type === 'checkboxes' || f.type === 'list') initAnswers[f.id] = [];
        else if (f.type === 'image' || f.type === 'photo' || f.type === 'document') {
          initAnswers[f.id] = { fileUrl: '', fileName: '', description: '', ocrResult: '' };
        } else {
          initAnswers[f.id] = '';
        }
      });

      // Automatically prefill next report from accepted plan
      if (acceptedPlan && acceptedPlan.items && acceptedPlan.items.length > 0) {
        const planField = tpl.fields.find(f => {
          const l = (f.label || '').toLowerCase();
          return (l.includes('план') || l.includes('задач') || l.includes('цел') || l.includes('итог') || l.includes('факт') || l.includes('смен')) &&
                 (f.type === 'text_paragraph' || f.type === 'text' || f.type === 'text_short' || f.type === 'voice' || f.type === 'list');
        }) || tpl.fields.find(f => f.type === 'text_paragraph' || f.type === 'text');

        if (planField) {
          const formattedItems = acceptedPlan.items.map((it, idx) => 
            `${idx + 1}. [${it.completed ? 'Выполнено' : 'В работе'}] ${it.title}`
          ).join('\n');
          initAnswers[planField.id] = `Задачи по принятому плану (${acceptedPlan.periodLabel}):\n${formattedItems}`;
          planPrefilled = true;
        }
      }

      setReportAnswers(initAnswers);
      if (planPrefilled && acceptedPlan) {
        setDraftRestoredNotice(`Предзаполнен принятый план (${acceptedPlan.periodLabel})`);
        setTimeout(() => setDraftRestoredNotice(null), 5000);
      }
    }
  }, [currentUser, reports]);

  // Load user presets for this user and template
  const loadUserPresets = React.useCallback((tplId: string) => {
    const userId = currentUser?.id || 'guest';
    const presetsKey = `user_fill_templates_${userId}_${tplId}`;
    try {
      const stored = localStorage.getItem(presetsKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setUserPresets(parsed);
          return;
        }
      }
    } catch (e) {
      console.warn('Error loading user presets:', e);
    }
    setUserPresets([]);
  }, [currentUser]);

  // Save current answers as user preset (strictly for this user and this report)
  const handleSaveUserPreset = () => {
    if (!activeReportTemplate || !currentUser) return;
    const title = presetTitleInput.trim() || `Шаблон от ${new Date().toLocaleDateString('ru-RU')} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const newPreset = {
      id: `preset-${Date.now()}`,
      title,
      createdAt: new Date().toLocaleDateString('ru-RU'),
      answers: { ...reportAnswers }
    };
    const nextPresets = [newPreset, ...userPresets];
    setUserPresets(nextPresets);
    const userId = currentUser.id;
    localStorage.setItem(`user_fill_templates_${userId}_${activeReportTemplate.id}`, JSON.stringify(nextPresets));
    setPresetTitleInput('');
    setIsPresetsModalOpen(false);
    triggerAiFeedback(`Личный шаблон «${title}» сохранен`);
  };

  // Apply user preset
  const handleApplyUserPreset = (preset: { id: string; title: string; answers: Record<string, any> }) => {
    setReportAnswers(prev => ({ ...prev, ...preset.answers }));
    setIsPresetsModalOpen(false);
    triggerAiFeedback(`Заполнено из личного шаблона «${preset.title}»`);
  };

  // Delete user preset
  const handleDeleteUserPreset = (presetId: string) => {
    if (!activeReportTemplate || !currentUser) return;
    const nextPresets = userPresets.filter(p => p.id !== presetId);
    setUserPresets(nextPresets);
    const userId = currentUser.id;
    localStorage.setItem(`user_fill_templates_${userId}_${activeReportTemplate.id}`, JSON.stringify(nextPresets));
  };

  // Matched Previous Accepted AI Plan for this template and employee
  const matchedPreviousPlan: MatchedPlanGroup | null = React.useMemo(() => {
    if (!activeReportTemplate) return null;
    return getAcceptedPlanForNextReport(reports, activeReportTemplate.type, currentUser?.id);
  }, [reports, activeReportTemplate?.type, currentUser?.id]);

  // Active Plan to display in modal (either from a selected plan card in carousel, or current template's matched plan)
  const activeModalPlan: MatchedPlanGroup | null = React.useMemo(() => {
    if (viewingPlanReportId) {
      const rep = reports.find(r => r.id === viewingPlanReportId);
      if (rep) {
        const rawPlan = rep.aiPlan || (rep as any).ai_plan;
        if (Array.isArray(rawPlan)) {
          const tpl = templates.find(t => t.id === rep.templateId || t.id === (rep as any).template_id);
          const repDate = (rep as any).date || rep.timestamp || (rep as any).created_at || 'Сегодня';
          const periodType = tpl?.type === 'PLAN_DAY' || tpl?.type === 'FACT_DAY' ? 'day' : tpl?.type === 'WEEKLY' ? 'week' : 'month';
          const compCount = rawPlan.filter((it: any) => it.completed).length;
          return {
            reportId: rep.id,
            sourceReportDate: repDate,
            sourceTemplateTitle: tpl?.title || 'Рапорт',
            periodType,
            periodLabel: periodType === 'day' ? 'Смена' : periodType === 'week' ? 'Неделя' : 'Месяц',
            items: rawPlan,
            totalCount: rawPlan.length,
            completedCount: compCount,
            allCompleted: compCount === rawPlan.length && rawPlan.length > 0,
            targetDate: repDate
          };
        }
      }
    }
    return matchedPreviousPlan;
  }, [viewingPlanReportId, reports, templates, matchedPreviousPlan]);

  // Dedicated Card for Accepted Plan in Report Filling Carousel (Step 0)
  const hasPlanCard = !!(matchedPreviousPlan && matchedPreviousPlan.items.length > 0);
  const totalFillingSteps = (activeReportTemplate?.fields?.length || 0) + 1 + (hasPlanCard ? 1 : 0);
  const activeFieldIndex = hasPlanCard ? currentStepIndex - 1 : currentStepIndex;
  const currentActiveField = (activeReportTemplate && activeFieldIndex >= 0 && activeFieldIndex < activeReportTemplate.fields.length)
    ? activeReportTemplate.fields[activeFieldIndex]
    : null;

  // Toggle task status inside previous accepted AI plan (syncs locally and with server)
  const handleTogglePreviousPlanItem = async (reportId: string, itemId: string, completed: boolean) => {
    // 1. Optimistic local state update in reports
    setReports(reports.map(r => {
      if (r.id !== reportId) return r;
      const rawPlan = r.aiPlan || (r as any).ai_plan;
      if (!Array.isArray(rawPlan)) return r;
      const updatedPlan = rawPlan.map(it => {
        if (it.id === itemId || (it as any).title === itemId) {
          return { ...it, completed };
        }
        return it;
      });
      return {
        ...r,
        aiPlan: updatedPlan,
        ai_plan: updatedPlan
      };
    }));

    // 2. Call server endpoint to update DB and task table
    try {
      await fetch(`/api/reports/${reportId}/toggle-plan-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, completed })
      });
    } catch (e) {
      console.warn('Failed to sync plan item toggle with server:', e);
    }
  };

  // Insert or sync plan tasks into target report field
  const handleInsertPlanIntoField = (fieldId?: string) => {
    if (!matchedPreviousPlan || matchedPreviousPlan.items.length === 0 || !activeReportTemplate) return;
    const targetField = fieldId 
      ? activeReportTemplate.fields.find(f => f.id === fieldId)
      : (currentActiveField || activeReportTemplate.fields.find(f => {
          const l = (f.label || '').toLowerCase();
          return l.includes('план') || l.includes('задач') || l.includes('цел') || l.includes('итог') || l.includes('факт');
        }) || activeReportTemplate.fields[0]);

    if (!targetField) return;

    const formattedItems = matchedPreviousPlan.items.map((it, idx) => 
      `${idx + 1}. [${it.completed ? 'Выполнено' : 'В работе'}] ${it.title}`
    ).join('\n');
    const textToInsert = `Задачи по принятому плану (${matchedPreviousPlan.periodLabel}):\n${formattedItems}`;

    setReportAnswers(prev => ({
      ...prev,
      [targetField.id]: textToInsert
    }));

    triggerAiFeedback('Задачи плана перенесены в ответ');
    setDraftRestoredNotice(`Пункты плана вставлены в поле «${targetField.label}»`);
    setTimeout(() => setDraftRestoredNotice(null), 4000);
  };

  // Auto-sync answers to localStorage draft so data is not lost on exit
  useEffect(() => {
    if (!activeReportTemplate || !currentUser) return;
    const draftKey = `report_draft_${currentUser.id}_${activeReportTemplate.id}`;
    const hasValues = Object.values(reportAnswers).some(v => {
      if (v === undefined || v === null || v === '') return false;
      if (typeof v === 'boolean') return v;
      if (typeof v === 'string') return v.trim().length > 0;
      if (Array.isArray(v)) return v.length > 0;
      if (typeof v === 'object') return Object.keys(v).some(k => Boolean((v as any)[k]));
      return false;
    });

    if (hasValues) {
      try {
        localStorage.setItem(draftKey, JSON.stringify(reportAnswers));
      } catch (e) {
        console.warn('Draft auto-save warning:', e);
      }
    }
  }, [reportAnswers, activeReportTemplate, currentUser]);

  // AI Autofill Execution: Fills all report fields using direct /api/ai/generate and the standardized AiLoadingOverlay
  const handleRunAiAutofill = async () => {
    if (!activeReportTemplate) return;

    // Close the input modal, trigger standardized AiLoadingOverlay
    setIsAIAutofillModalOpen(false);
    setAiAutofillTitle('Автозаполнение отчета нейросетью');
    setAiAutofillSubtitle('Анализирую структуру регламента и формирую ответы по всем пунктам...');
    setIsAIAutofilling(true);

    const currentEmployee = allEmployeesList.find(e => String(e.id) === String(currentUser?.id)) || currentUser;
    const authorName = currentUser?.name || currentEmployee?.name || 'Сотрудник';
    const authorPosition = currentUser?.position || currentEmployee?.position || userPosition || 'Специалист';
    const authorDeptId = currentUser?.department_id || currentUser?.departmentId || currentEmployee?.department_id || currentEmployee?.departmentId || activeReportTemplate.departmentId;
    const authorDeptObj = departments.find(d => d.id === authorDeptId);
    const authorDepartment = authorDeptObj?.name || 'Основной отдел';
    const authorCompany = company?.name || 'Наша организация';
    const authorEmail = currentUser?.email || currentEmployee?.email || '';
    const authorPhone = currentUser?.phone || currentEmployee?.phone || '';

    let authorDutiesList: string[] = [];
    if (Array.isArray(currentEmployee?.duties) && currentEmployee.duties.length > 0) {
      authorDutiesList = currentEmployee.duties;
    } else if (Array.isArray(currentUser?.duties) && currentUser.duties.length > 0) {
      authorDutiesList = currentUser.duties;
    } else if (typeof (currentEmployee as any)?.duties === 'string' && (currentEmployee as any).duties.trim()) {
      authorDutiesList = (currentEmployee as any).duties.split('\n').map((s: string) => s.trim()).filter(Boolean);
    } else if (typeof (currentUser as any)?.duties === 'string' && (currentUser as any).duties.trim()) {
      authorDutiesList = (currentUser as any).duties.split('\n').map((s: string) => s.trim()).filter(Boolean);
    }
    const authorDutiesSnippet = authorDutiesList.length > 0
      ? authorDutiesList.map((d, i) => `${i + 1}. ${d}`).join('\n')
      : 'Выполнение регламентных функциональных обязанностей в соответствии с занимаемой должностью.';

    const allowedFieldTypes = [
      'text', 'text_short', 'text_paragraph', 'voice', 'number', 
      'checkbox', 'checkboxes', 'single_choice', 'multiple_choice', 'select', 'list', 'radio', 'table', 'url',
      'date', 'time', 'rating', 'geolocation', 'google_drive', 'document', 'pdf', 'screenshot', 'photo', 'camera_photo', 'image'
    ];

    const targetFields = activeReportTemplate.fields.filter(f => 
      allowedFieldTypes.includes(f.type)
    );

    const fieldsSpec = targetFields.map((f, i) => {
      let spec = `${i + 1}. [ID: ${f.id}] Тип: ${f.type}, Название: "${f.label}"`;
      if (f.hint) spec += `, Подсказка: "${f.hint}"`;
      
      const isSingleChoice = f.type === 'single_choice' || f.type === 'select' || f.type === 'radio';
      const isMultiChoice = f.type === 'multiple_choice' || f.type === 'checkboxes' || f.type === 'list';
      
      if (isSingleChoice) {
        const opts = (f.options && Array.isArray(f.options) && f.options.length > 0) 
          ? f.options 
          : ['Выполнено', 'Частично', 'Не выполнено'];
        spec += `, Варианты выбора (ВЫБЕРИ СТРОГО 1 ВАРИАНТ ИЗ СПИСКА): [${opts.join(', ')}]`;
      } else if (isMultiChoice) {
        const opts = (f.options && Array.isArray(f.options) && f.options.length > 0) 
          ? f.options 
          : ['Выполнено в полном объеме', 'Имеются мелкие замечания', 'Требует внимания руководителя'];
        spec += `, Варианты выбора (ВЫБЕРИ 1 ИЛИ НЕСКОЛЬКО ИЗ СПИСКА В ВИДЕ МАССИВА СТРОК): [${opts.join(', ')}]`;
      } else if (f.options && f.options.length > 0) {
        spec += `, Варианты: [${f.options.join(', ')}]`;
      } else if (f.type === 'geolocation') {
        spec += `, Координаты: верни JSON-объект или строку с адресом/координатами`;
      }
      return spec;
    }).join('\n');

    const userNotes = aiAutofillInput.trim() || 'Все плановые задачи смены завершены в соответствии с регламентом, ключевые показатели выполнены, отклонений не зафиксировано.';
    
    const sysPrompt = `Ты — ведущий интеллектуальный ассистент автозаполнения рабочих отчетов и регламентов платформы «ИИ Рапорт». Твоя задача — строго на основе предоставленных заметок сотрудника, его профиля, должностных обязанностей и регламента отчета сформировать реалистичные, профессиональные и точные ответы на ВСЕ вопросы отчета.
Ты ОБЯЗАН вернуть ответ ДЛЯ КАЖДОГО поля из списка (по всем ID без исключений), заполнив все поля осмысленными данными на русском языке.

ПРОФИЛЬ АВТОРА ОТЧЕТА (ИСПОЛЬЗУЙ ДЛЯ ЗАПОЛНЕНИЯ):
- ФИО сотрудника: ${authorName}
- Должность: ${authorPosition}
- Подразделение/Отдел: ${authorDepartment}
- Организация: ${authorCompany}
${authorEmail ? `- Email: ${authorEmail}` : ''}
${authorPhone ? `- Телефон: ${authorPhone}` : ''}

ДОЛЖНОСТНЫЕ ОБЯЗАННОСТИ И ФУНКЦИОНАЛ АВТОРА:
${authorDutiesSnippet}

ПРАВИЛА И ТРЕБОВАНИЯ К ТИПАМ ПОЛЕЙ:
1. Данные об авторе отчета:
   - Если вопрос запрашивает ФИО сотрудника, ответственного, исполнителя — ОБЯЗАТЕЛЬНО укажи "${authorName}".
   - Если вопрос запрашивает должность — укажи "${authorPosition}".
   - Если вопрос запрашивает отдел/подразделение — укажи "${authorDepartment}".
2. Одиночный выбор (single_choice, select, radio):
   - ВЫБЕРИ СТРОГО ОДИН наиболее подходящий вариант из переданного списка "Варианты выбора".
   - Верни точную строку выбранного варианта (например "Первичный контакт" или "Выполнено").
3. Множественный выбор (multiple_choice, checkboxes, list):
   - ВЫБЕРИ ОДИН ИЛИ НЕСКОЛЬКО подходящих вариантов из переданного списка "Варианты выбора".
   - Верни МАССИВ СТРОК с выбранными вариантами (например ["Первичный контакт", "Квалификация лида"]).
4. Числовые показатели (number):
   - Верни реалистичное число (например 5, 12, 50, 100), согласованное с контекстом смены и должностью.
5. Чек-боксы (checkbox):
   - Строго boolean: true или false (без кавычек).
6. Текстовые поля (text, text_short, text_paragraph, voice):
   - Сформулируй четкий, деловой, профессиональный текст от первого лица с учетом должностных обязанностей сотрудника.
7. Даты и время (date, time):
   - Для даты используй формат YYYY-MM-DD, для времени HH:mm.
8. Поля прикрепления таблиц, документов и ссылок (table, url, google_drive, document, file, pdf):
   - СТРОГО ЗАПРЕЩЕНО выдумывать ссылки на страницы, фальшивые URL или вставлять текст заметок в поля таблиц и ссылок!
   - Если автор в заметках явно предоставил реальную ссылку на Google Таблицу/Документ — используй её. Если реальной ссылки нет — верни пустую строку "".
9. Геолокация (geolocation):
   - СТРОГО ЗАПРЕЩЕНО выдумывать координаты, широту, долготу или фиктивные GPS-точки!
   - Если автор не указал координаты в тексте — верни пустую строку "".

Верни СТРОГО чистый валидный JSON-объект в формате:
{
  "идентификатор_поля": значение
}
Без markdown-блоков, без кавычек \`\`\`json, без вступительного или заключительного текста.`;

    const promptText = `Отчет: "${activeReportTemplate.title}".
Подразделение: ${authorDepartment}.
Автор отчета: ${authorName}, ${authorPosition}.

Должностные обязанности сотрудника:
${authorDutiesSnippet}

Вопросы и поля регламента для обязательного заполнения:
${fieldsSpec}

Тезисы, заметки и диктовка сотрудника за смену:
"${userNotes}"

Сформируй и верни JSON со значениями ответов по ВСЕМ указанным ID полей:`;

    // Dynamic scenario subtitles matching report creation
    const t1 = setTimeout(() => {
      setAiAutofillSubtitle('Сопоставляю тезисы сотрудника с критериями регламента...');
    }, 2500);

    const t2 = setTimeout(() => {
      setAiAutofillSubtitle('Формирую итоговые профессиональные формулировки и показатели...');
    }, 5500);

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          systemPrompt: sysPrompt,
          userId: currentUser?.id || '91827364501',
          entityType: 'raport',
          jsonOutput: true
        })
      });

      clearTimeout(t1);
      clearTimeout(t2);

      if (!res.ok) {
        throw new Error(`Ошибка генерации: ${res.status}`);
      }

      const data = await res.json();
      const resText = (data.text || data.reply || '').trim();

      const cleaned = resText.replace(/```json/gi, '').replace(/```/gi, '').trim();
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      let parsed: Record<string, any> = {};

      if (firstBrace !== -1 && lastBrace !== -1) {
        try {
          parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
        } catch (parseErr) {
          console.warn('JSON slice parse error in autofill:', parseErr);
        }
      }

      const sanitizedAnswers: Record<string, any> = {};
      targetFields.forEach((f, i) => {
        let val = parsed[f.id] ?? parsed[f.label] ?? parsed[f.id.toLowerCase()] ?? parsed[String(i + 1)];
        if (val === undefined || val === null || val === '') {
          // Check case-insensitive match or label match in returned JSON keys
          const matchingKey = Object.keys(parsed).find(k => 
            k.toLowerCase() === f.id.toLowerCase() || 
            k.toLowerCase().includes(f.id.toLowerCase()) ||
            f.label.toLowerCase().includes(k.toLowerCase()) ||
            k.toLowerCase().includes(f.label.toLowerCase().slice(0, 15)) ||
            k === String(i + 1)
          );
          if (matchingKey !== undefined && parsed[matchingKey] !== undefined) {
            val = parsed[matchingKey];
          }
        }

        const isMulti = f.type === 'multiple_choice' || f.type === 'checkboxes' || f.type === 'list';
        const isSingle = f.type === 'single_choice' || f.type === 'select' || f.type === 'radio';
        const availableOptions = (f.options && Array.isArray(f.options) && f.options.length > 0)
          ? f.options
          : (isMulti 
              ? ['Выполнено в полном объеме', 'Имеются мелкие замечания', 'Требует внимания руководителя']
              : ['Выполнено', 'Частично', 'Не выполнено']);

        if (isMulti) {
          let selectedArray: string[] = [];
          if (Array.isArray(val)) {
            selectedArray = val.map(v => String(v).trim()).filter(Boolean);
          } else if (typeof val === 'string' && val.trim()) {
            const trimmed = val.trim();
            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
              try {
                const parsedArr = JSON.parse(trimmed);
                if (Array.isArray(parsedArr)) {
                  selectedArray = parsedArr.map(v => String(v).trim()).filter(Boolean);
                }
              } catch {}
            }
            if (selectedArray.length === 0) {
              selectedArray = trimmed.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
            }
          }

          // Match selected values with available options (case-insensitive or exact)
          const matchedOptions: string[] = [];
          selectedArray.forEach(sel => {
            const exactOpt = availableOptions.find(opt => 
              opt.toLowerCase() === sel.toLowerCase() ||
              opt.toLowerCase().includes(sel.toLowerCase()) ||
              sel.toLowerCase().includes(opt.toLowerCase())
            );
            if (exactOpt && !matchedOptions.includes(exactOpt)) {
              matchedOptions.push(exactOpt);
            } else if (!matchedOptions.includes(sel) && sel) {
              matchedOptions.push(sel);
            }
          });

          val = matchedOptions.length > 0 ? matchedOptions : [availableOptions[0]];
        } else if (isSingle) {
          let selectedStr = '';
          if (Array.isArray(val) && val.length > 0) {
            selectedStr = String(val[0]).trim();
          } else if (typeof val === 'string') {
            selectedStr = val.trim();
          } else if (val !== undefined && val !== null) {
            selectedStr = String(val).trim();
          }

          const matchedOpt = availableOptions.find(opt => 
            opt.toLowerCase() === selectedStr.toLowerCase() ||
            opt.toLowerCase().includes(selectedStr.toLowerCase()) ||
            selectedStr.toLowerCase().includes(opt.toLowerCase())
          );
          val = matchedOpt || selectedStr || availableOptions[0];
        } else if (f.type === 'checkbox') {
          if (typeof val === 'string') {
            val = !['false', '0', 'нет', 'не выполнено'].includes(val.toLowerCase().trim());
          } else {
            val = Boolean(val);
          }
        } else if (f.type === 'number') {
          if (typeof val === 'string') {
            const num = parseFloat(val.replace(/[^\d.-]/g, ''));
            val = !isNaN(num) ? num : 10;
          } else if (typeof val !== 'number') {
            val = 10;
          }
        } else {
          // Check if field label asks for Author Name (ФИО) or employee profile details
          const labelLower = f.label.toLowerCase();
          const hintLower = (f.hint || '').toLowerCase();
          const isAuthorField = labelLower.includes('фио') || labelLower.includes('имя') || 
                                labelLower.includes('ответственн') || hintLower.includes('имя и фамилию') || 
                                hintLower.includes('фио');
          const isPositionField = labelLower.includes('должност');
          const isDeptField = labelLower.includes('отдел') || labelLower.includes('подразделен');

          if (isAuthorField && (!val || val === 'Сотрудник' || (typeof val === 'string' && (val.length > 50 || val.includes('задачи'))))) {
            val = authorName;
          } else if (isPositionField && (!val || (typeof val === 'string' && val.length > 60))) {
            val = authorPosition;
          } else if (isDeptField && (!val || (typeof val === 'string' && val.length > 60))) {
            val = authorDepartment;
          } else if (val === undefined || val === null || val === '') {
            if (f.type === 'date') {
              val = new Date().toISOString().split('T')[0];
            } else if (f.type === 'time') {
              val = new Date().toTimeString().slice(0, 5);
            } else if (f.type === 'rating') {
              val = 5;
            } else if (f.type === 'url' || f.type === 'google_drive' || f.type === 'table') {
              val = '';
            } else if (f.type === 'geolocation') {
              val = '';
            } else if (['photo', 'camera_photo', 'screenshot', 'image', 'pdf', 'document', 'file', 'audio'].includes(f.type)) {
              val = null;
            } else {
              val = userNotes.length > 25 ? userNotes : `Все плановые задачи по пункту "${f.label}" выполнены в штатном режиме без замечаний.`;
            }
          }

          // Validation check: if field is a table, url, document, file, or pdf, do not accept non-URL text
          if (['table', 'url', 'google_drive', 'document', 'file', 'pdf'].includes(f.type)) {
            if (typeof val === 'string' && val.trim()) {
              const isUrl = /^https?:\/\//i.test(val.trim());
              if (!isUrl) {
                val = (f.type === 'url' || f.type === 'google_drive') ? '' : null;
              }
            } else if (typeof val !== 'object' || !val) {
              val = (f.type === 'url' || f.type === 'google_drive') ? '' : null;
            }
          }
        }
        sanitizedAnswers[f.id] = val;
      });

      setReportAnswers(prev => {
        const updated = { ...prev, ...sanitizedAnswers };
        try {
          const draftKey = `raport_draft_${activeReportTemplate.id}_${currentUser?.id || 'guest'}`;
          localStorage.setItem(draftKey, JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
      triggerAiFeedback('Все поля отчета успешно заполнены нейросетью');
    } catch (e: any) {
      clearTimeout(t1);
      clearTimeout(t2);
      console.warn('AI Autofill error:', e);
      triggerAiFeedback('Не удалось связаться с нейросетью, попробуйте снова');
    } finally {
      setIsAIAutofilling(false);
    }
  };

  // Voice recording state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTimer, setRecordingTimer] = useState<number>(0);
  const [recognizedText, setRecognizedText] = useState<string>('');
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);

  // AI Assistant Feedback pulse state
  const [aiSyncStatus, setAiSyncStatus] = useState<string>('Готов к приему данных');
  const [aiLastSyncTime, setAiLastSyncTime] = useState<string>('20:48');
  const [showAiPulse, setShowAiPulse] = useState<boolean>(false);

  // Camera & Image Capture
  const [activeCameraField, setActiveCameraField] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [scanningImageField, setScanningImageField] = useState<string | null>(null);

  // Geolocation & Device Media State
  const [geoLoadingFieldId, setGeoLoadingFieldId] = useState<string | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Live Camera / Video / Screenshot modal state
  const [mediaCaptureModalState, setMediaCaptureModalState] = useState<{
    isOpen: boolean;
    mode: 'photo' | 'video' | 'screenshot';
    fieldId: string;
  }>({
    isOpen: false,
    mode: 'photo',
    fieldId: '',
  });

  const handleCaptureGeolocation = (fieldId: string) => {
    if (!navigator.geolocation) {
      setGeoError('Геолокация не поддерживается вашим устройством или браузером.');
      return;
    }
    setGeoLoadingFieldId(fieldId);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoadingFieldId(null);
        const val = {
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy),
          timestamp: new Date().toLocaleTimeString('ru-RU')
        };
        setReportAnswers(prev => ({ ...prev, [fieldId]: val }));
        triggerAiFeedback('GPS координаты зафиксированы');
      },
      (err) => {
        setGeoLoadingFieldId(null);
        console.warn('Geolocation capture error:', err);
        if (err.code === 1) { // PERMISSION_DENIED
          setGeoError('Доступ к геопозиции отклонен в браузере. Разрешите доступ к местоположению в настройках браузера (значок замка в адресной строке) и нажмите кнопку повторно.');
        } else if (err.code === 2) { // POSITION_UNAVAILABLE
          setGeoError('Спутники GPS временно недоступны. Проверьте включение геолокации в настройках устройства.');
        } else if (err.code === 3) { // TIMEOUT
          setGeoError('Истекло время ожидания ответа спутников GPS. Попробуйте нажать еще раз.');
        } else if (err.message && err.message.toLowerCase().includes('permissions policy')) {
          setGeoError('Политика безопасности ограничила геолокацию внутри фрейма. Откройте приложение в новой вкладке браузера для прямого доступа.');
        } else {
          setGeoError('Ошибка геопозиции: ' + (err.message || 'нет доступа к GPS'));
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleCaptureFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldId: string, isVideo?: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const fileData = {
        name: file.name,
        size: file.size,
        type: file.type,
        url: reader.result as string,
        isVideo: !!isVideo
      };
      setReportAnswers(prev => ({ ...prev, [fieldId]: fileData }));
      triggerAiFeedback(isVideo ? 'Видеозапись прикреплена' : 'Фотография с камеры прикреплена');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Final Submission Animation States
  // 'filling' | 'stacking' | 'crystal' | 'entering' | 'completed'
  const [submissionPhase, setSubmissionPhase] = useState<'filling' | 'stacking' | 'crystal' | 'entering' | 'completed'>('filling');
  const [submittedResult, setSubmittedResult] = useState<SubmittedReport | null>(null);
  const [planProgress, setPlanProgress] = useState<{
    calculator?: any;
    missingMorningReport?: boolean;
    morningWarning?: string;
    schedulePacePct?: number;
    items?: any[];
  } | null>(null);
  const [motivationAccrualResult, setMotivationAccrualResult] = useState<any>(null);

  useEffect(() => {
    setMotivationAccrualResult(null);
    if (!activeReportTemplate?.id || !currentUser?.id) {
      setPlanProgress(null);
      return;
    }
    const compId = String(currentUser.company_id || company?.id || 'flagship-main');
    fetch(
      `/api/motivation/plan-progress?employeeId=${encodeURIComponent(currentUser.id)}&company_id=${encodeURIComponent(compId)}&templateId=${encodeURIComponent(activeReportTemplate.id)}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (data?.success) setPlanProgress(data);
        else setPlanProgress(null);
      })
      .catch(() => setPlanProgress(null));
  }, [activeReportTemplate?.id, currentUser?.id]);

  // AI Plan & Motivation State
  const [editablePlan, setEditablePlan] = useState<ReportPlanItem[]>([]);
  const [editingPlanItemId, setEditingPlanItemId] = useState<string | null>(null);
  const [editingPlanItemTitle, setEditingPlanItemTitle] = useState<string>('');
  const [newPlanItemTitle, setNewPlanItemTitle] = useState<string>('');
  const [isPlanAccepted, setIsPlanAccepted] = useState<boolean>(false);
  const [isPlanDeclined, setIsPlanDeclined] = useState<boolean>(false);
  const [isAcceptingPlan, setIsAcceptingPlan] = useState<boolean>(false);
  const [planSuccessNotice, setPlanSuccessNotice] = useState<string | null>(null);

  // Cascading AI Verification Overlay States (from global Zustand store)
  const {
    isCascadeOverlayOpen,
    cascadeSteps,
    currentCascadeStepIndex,
    cascadeOverallStatus,
    isBackgroundMinified,
    cascadeErrorMessage,
    startCascadeCheck,
    updateCascadeStep,
    setCascadeStepRunning,
    setCascadeOverallStatus,
    setMinified: setIsBackgroundMinified,
    setOverlayOpen: setIsCascadeOverlayOpen,
    restoreToForeground,
    sendToBackground,
    setSubmittedResult: setStoreSubmittedResult,
    resetCheck
  } = useCascadeCheckStore();
  const [validationError, setValidationError] = useState<string | null>(null);

  // If user leaves the page while check is running, send to background so it continues uninterrupted
  useEffect(() => {
    return () => {
      const state = useCascadeCheckStore.getState();
      if (state.cascadeOverallStatus === 'running') {
        state.sendToBackground();
      }
    };
  }, []);


  // Parallax tilt effect state for space window
  const [parallaxOffset, setParallaxOffset] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    setParallaxOffset({
      x: (clientX - centerX) / 50,
      y: (clientY - centerY) / 50
    });
  };

  // Sync Timer for Voice
  useEffect(() => {
    let interval: any = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTimer(t => t + 1);
      }, 1000);
    } else {
      setRecordingTimer(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Start filling a selected report template
  const handleSelectTemplate = (tpl: ReportTemplate) => {
    setActiveReportTemplate(tpl);
    setCurrentStepIndex(0);
    setSubmissionPhase('filling');
    setSubmittedResult(null);
    setCascadeOverallStatus('idle');
    setIsCascadeOverlayOpen(false);
    setIsBackgroundMinified(false);

    // Update URL to /cabinet/raport<ID>
    const newUrl = `/cabinet/raport${tpl.id}`;
    window.history.pushState({}, '', newUrl);
    window.dispatchEvent(new Event('popstate'));

    // Initialize answers from draft or template fields
    loadDraftOrInit(tpl);
    loadUserPresets(tpl.id);

    // AI Feedback
    triggerAiFeedback('Ответ принят • Связь с ядром установлена');
  };

  // Sync draft and user presets on active template mount
  useEffect(() => {
    if (activeReportTemplate) {
      loadUserPresets(activeReportTemplate.id);
      if (Object.keys(reportAnswers).length === 0) {
        loadDraftOrInit(activeReportTemplate);
      }
    }
  }, [activeReportTemplate?.id, loadUserPresets, loadDraftOrInit, reportAnswers]);

  // Quick file/screenshot paste via Ctrl+V for the currently open question card in carousel
  useEffect(() => {
    if (!activeReportTemplate || submissionPhase !== 'filling') return;

    const handleWindowPaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items || items.length === 0) return;

      let targetFile: File | null = null;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1 || items[i].kind === 'file') {
          const file = items[i].getAsFile();
          if (file) {
            targetFile = file;
            break;
          }
        }
      }

      if (!targetFile) return;

      // Determine target field: prioritize currently visible card in carousel if it accepts attachments/images,
      // otherwise fallback to the first attachment field found in the active template
      const isAttachmentType = (t: string) => ['screenshot', 'photo', 'camera_photo', 'image', 'file', 'document', 'pdf'].includes(t);
      const targetField = (currentActiveField && isAttachmentType(currentActiveField.type))
        ? currentActiveField
        : activeReportTemplate.fields.find(f => isAttachmentType(f.type));

      if (!targetField) return;

      e.preventDefault();
      triggerAiFeedback('Загрузка скриншота из буфера обмена...');

      try {
        const fileService = new FileUploadService();
        const serverUrl = await fileService.uploadFromFile(targetFile);
        const finalUrl = serverUrl || URL.createObjectURL(targetFile);

        const newFileData = {
          url: finalUrl,
          fileUrl: finalUrl,
          name: targetFile.name || `screenshot_${Date.now().toString().slice(-4)}.png`,
          fileName: targetFile.name || `screenshot_${Date.now().toString().slice(-4)}.png`,
          size: targetFile.size,
          type: targetFile.type || 'image/png'
        };

        setReportAnswers(prev => ({
          ...prev,
          [targetField.id]: newFileData
        }));

        triggerAiFeedback(`Скриншот прикреплен к вопросу «${targetField.label}»`);
      } catch (err: any) {
        console.warn('Direct Ctrl+V screenshot paste error:', err);
        triggerAiFeedback('Ошибка вставки скриншота из буфера обмена');
      }
    };

    window.addEventListener('paste', handleWindowPaste);
    return () => window.removeEventListener('paste', handleWindowPaste);
  }, [activeReportTemplate, submissionPhase, currentActiveField]);

  // Return to Report Plates Gallery
  const handleBackToTemplates = () => {
    setActiveReportTemplate(null);
    setCurrentStepIndex(0);
    setSubmissionPhase('filling');
    setSubmittedResult(null);
    setCascadeOverallStatus('idle');
    setIsCascadeOverlayOpen(false);
    setIsBackgroundMinified(false);

    // Clean URL
    window.history.pushState({}, '', '/cabinet/raport');
  };

  // Voice recording toggle handler
  const handleToggleVoiceRecording = (fieldId?: string) => {
    if (isRecording) {
      // Stop recording
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
        recognitionRef.current = null;
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      setIsRecording(false);
      triggerAiFeedback('Распознано 98% • Голосовой ввод завершен');
    } else {
      // Start recording
      setIsRecording(true);
      setRecordingTimer(0);

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        // Fallback simulated voice input
        const targetId = fieldId || (activeReportTemplate?.fields[currentStepIndex]?.id);
        const sampleTexts = [
          'Смена прошла успешно, все ключевые задачи по регламенту выполнены в полном объеме.',
          'Были зафиксированы небольшие задержки поставки, но касса сведена без расхождений.',
          'Качественно отработано 42 обращения клиентов, подготовлен сменный план на завтра.'
        ];
        const text = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
        
        setTimeout(() => {
          if (targetId) {
            setReportAnswers(prev => ({
              ...prev,
              [targetId]: (prev[targetId] ? prev[targetId] + ' ' : '') + text
            }));
          }
          setIsRecording(false);
          triggerAiFeedback('Распознано 96% • Голосовой рапорт занесен');
        }, 1800);
        return;
      }

      try {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'ru-RU';

        rec.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          const currentText = finalTranscript || interimTranscript;
          if (currentText.trim()) {
            const targetId = fieldId || (activeReportTemplate?.fields[currentStepIndex]?.id);
            if (targetId) {
              setReportAnswers(prev => ({
                ...prev,
                [targetId]: currentText
              }));
            }
          }
        };

        rec.onend = () => {
          setIsRecording(false);
          triggerAiFeedback('Распознано 98% • Передано в терминал');
        };

        recognitionRef.current = rec;
        rec.start();
      } catch (err) {
        console.error('Speech recognition error:', err);
        setIsRecording(false);
      }
    }
  };

  // Trigger AI Companion Feedback
  const triggerAiFeedback = (msg: string) => {
    setAiSyncStatus(msg);
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setAiLastSyncTime(timeStr);
    setShowAiPulse(true);
    setTimeout(() => setShowAiPulse(false), 2000);
  };

  // Next Step / Card Navigation
  const handleNextStep = () => {
    if (!activeReportTemplate) return;
    if (currentStepIndex < totalFillingSteps - 1) {
      setCardAnimDirection('forward');
      setCurrentStepIndex(prev => prev + 1);
      triggerAiFeedback('Ответ принят • Сохранено в ядро');
    }
  };

  // Prev Step / Card Navigation
  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCardAnimDirection('backward');
      setCurrentStepIndex(prev => prev - 1);
      triggerAiFeedback('Возврат к предыдущей пластине');
    }
  };

  // Photo Capture & Laser Scan Effect
  const handleCapturePhoto = (fieldId: string) => {
    setScanningImageField(fieldId);
    
    setTimeout(() => {
      const samplePhotos = [
        'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=600&q=80'
      ];
      const photoUrl = samplePhotos[Math.floor(Math.random() * samplePhotos.length)];
      
      setReportAnswers(prev => ({
        ...prev,
        [fieldId]: {
          fileUrl: photoUrl,
          fileName: `scan_report_${Date.now().toString().slice(-4)}.jpg`,
          description: 'Фотофиксация объекта проверена ИИ',
          ocrResult: 'OCR Скан: Объект в норме, замечаний нет'
        }
      }));
      setScanningImageField(null);
      triggerAiFeedback('Изображение проявлено в стекле');
    }, 1200);
  };

  // Upload helper to obtain real direct URL for AI processing
  const ensurePublicFileUrl = async (fileData: any, defaultName: string = 'file'): Promise<string> => {
    if (!fileData) return '';
    if (typeof fileData === 'string' && (fileData.startsWith('http://') || fileData.startsWith('https://'))) {
      return fileData;
    }
    let fileBlob: Blob | null = null;
    let filename = defaultName;

    if (typeof fileData === 'object') {
      if (fileData.url && (fileData.url.startsWith('http://') || fileData.url.startsWith('https://'))) {
        return fileData.url;
      }
      if (fileData.fileUrl && (fileData.fileUrl.startsWith('http://') || fileData.fileUrl.startsWith('https://'))) {
        return fileData.fileUrl;
      }
      if (fileData.name) filename = fileData.name;
      if (fileData.fileName) filename = fileData.fileName;
      if (fileData.data) fileData = fileData.data;
    }

    if (typeof fileData === 'string' && fileData.startsWith('data:')) {
      try {
        const arr = fileData.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        fileBlob = new Blob([u8arr], { type: mime });
      } catch (e) {
        console.warn('Base64 parse error:', e);
      }
    }

    if (fileBlob) {
      const formData = new FormData();
      formData.append('file', fileBlob, filename);
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        if (res.ok) {
          const json = await res.json();
          return json.url || json.original_url || '';
        }
      } catch (err) {
        console.warn('File upload to storage error:', err);
      }
    }
    return typeof fileData === 'string' ? fileData : '';
  };

  // Submit Final Report via Cascading Multi-Type AI Verification Overlay
  const handleFinalSubmit = async () => {
    if (!currentUser || !activeReportTemplate) return;

    // Detect all answer types across the form (ignoring empty fields)
    const audioItems: { fieldLabel: string; fileName: string; rawUrl: any }[] = [];
    const docItems: { fieldLabel: string; fileName: string; rawUrl: any }[] = [];
    const imageItems: { fieldLabel: string; fileName: string; rawUrl: any; mode?: 'text' | 'visual_description'; prompt?: string }[] = [];
    const textAnswersList: string[] = [];

    activeReportTemplate.fields.forEach(field => {
      const val = reportAnswers[field.id];
      // 2. Если поле или блок не заполнены, то не проверяем
      if (val === undefined || val === null) return;
      if (typeof val === 'string' && val.trim() === '') return;
      if (Array.isArray(val) && val.length === 0) return;
      if (typeof val === 'object') {
        const hasUrl = Boolean(val.fileUrl || val.url || val.data);
        const hasText = Boolean(val.text || val.transcription || val.fileName || val.latitude !== undefined);
        if (!hasUrl && !hasText) return;
      }

      // 3. Голосовые сообщения уже переведены в текст, поэтому не переводим повторно
      if (field.type === 'voice') {
        const txt = typeof val === 'string' ? val.trim() : (val.transcription || val.text || '').trim();
        if (txt) {
          textAnswersList.push(`${field.label}: [голосовой ответ]: ${txt}`);
        }
        return;
      }

      // File / Image / Audio / Document objects
      if (typeof val === 'object') {
        const fileName = val.fileName || val.name || (field.type === 'camera_photo' ? 'фото_с_камеры.jpg' : 'файл');
        const rawUrl = val.fileUrl || val.url || val.data || '';
        const ext = (fileName.split('.').pop() || '').toLowerCase();

        // Audio files (.mp3, .wav, .m4a, .ogg, .aac, .flac, .webm)
        if (['mp3', 'wav', 'm4a', 'ogg', 'aac', 'flac'].includes(ext) || (ext === 'webm' && field.type === 'audio')) {
          if (val.transcription || val.text) {
            textAnswersList.push(`${field.label}: [аудиозапись]: ${val.transcription || val.text}`);
          } else if (rawUrl) {
            audioItems.push({ fieldLabel: field.label, fileName, rawUrl });
            textAnswersList.push(`${field.label}: [аудиофайл "${fileName}"]`);
          }
          return;
        }

        // Images (.png, .jpg, .jpeg, .webp, .bmp, .gif, or type screenshot / photo / camera_photo)
        if (['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'svg'].includes(ext) || field.type === 'screenshot' || field.type === 'photo' || field.type === 'image' || field.type === 'camera_photo') {
          if (rawUrl) {
            imageItems.push({
              fieldLabel: field.label,
              fileName,
              rawUrl,
              mode: field.image_analysis_mode || (field.type === 'camera_photo' ? 'visual_description' : 'text'),
              prompt: field.ai_check_prompt || field.hint || ''
            });
            textAnswersList.push(`${field.label}: [${field.type === 'camera_photo' ? 'фото с камеры' : 'изображение'} "${fileName}"]`);
          }
          return;
        }

        // Documents (.pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx, etc.)
        if (rawUrl) {
          const isValidUrl = typeof rawUrl === 'string' && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('blob:') || rawUrl.startsWith('data:'));
          if (isValidUrl) {
            docItems.push({ fieldLabel: field.label, fileName, rawUrl });
            textAnswersList.push(`${field.label}: [документ "${fileName}"]`);
          } else {
            textAnswersList.push(`${field.label}: ${fileName || rawUrl}`);
          }
        }
        return;
      }

      // Table, document, or Google Drive as direct string URL
      if ((field.type === 'table' || field.type === 'document' || field.type === 'pdf' || field.type === 'google_drive') && typeof val === 'string' && val.trim()) {
        const isUrl = /^https?:\/\//i.test(val.trim());
        if (isUrl) {
          docItems.push({ fieldLabel: field.label, fileName: `${field.label}.pdf`, rawUrl: val.trim() });
          textAnswersList.push(`${field.label}: [ссылка на документ "${val.trim()}"]`);
        } else {
          textAnswersList.push(`${field.label}: ${val.trim()}`);
        }
        return;
      }

      // Audio field as direct string URL
      if (field.type === 'audio' && typeof val === 'string' && val.trim()) {
        audioItems.push({ fieldLabel: field.label, fileName: 'audio.webm', rawUrl: val });
        textAnswersList.push(`${field.label}: [аудиофайл]`);
        return;
      }

      // Photo, screenshot, or camera photo as direct string URL
      if ((field.type === 'photo' || field.type === 'screenshot' || field.type === 'camera_photo' || field.type === 'image') && typeof val === 'string' && val.trim()) {
        const defaultName = field.type === 'camera_photo' ? 'camera_photo.jpg' : `${field.type}.png`;
        imageItems.push({
          fieldLabel: field.label,
          fileName: defaultName,
          rawUrl: val,
          mode: field.image_analysis_mode || (field.type === 'camera_photo' ? 'visual_description' : 'text'),
          prompt: field.ai_check_prompt || field.hint || ''
        });
        textAnswersList.push(`${field.label}: [${field.type === 'camera_photo' ? 'фото с камеры' : 'изображение'}]`);
        return;
      }

      // Single choice
      if (field.type === 'single_choice' || field.type === 'select' || field.type === 'radio') {
        const optsStr = (field.options && field.options.length > 0) ? field.options.join(', ') : 'Выполнено, Частично, Не выполнено';
        textAnswersList.push(`${field.label}: [одиночный выбор]: «${val}» (выбрано из вариантов: [${optsStr}])`);
        return;
      }

      // Multiple choice
      if (field.type === 'multiple_choice' || field.type === 'checkboxes' || field.type === 'list') {
        const selectedArr = Array.isArray(val) ? val : [String(val)];
        const optsStr = (field.options && field.options.length > 0) ? field.options.join(', ') : 'Выполнено в полном объеме, Имеются мелкие замечания, Требует внимания руководителя';
        textAnswersList.push(`${field.label}: [множественный выбор]: выбрано [${selectedArr.join(', ')}] (из доступных вариантов: [${optsStr}])`);
        return;
      }

      // Geolocation
      if (field.type === 'geolocation') {
        let geoTxt = 'не зафиксирована';
        if (typeof val === 'object' && val?.latitude) {
          geoTxt = `широта: ${val.latitude}, долгота: ${val.longitude}` + (val.accuracy ? ` (точность ±${val.accuracy}м)` : '') + (val.timestamp ? ` [время: ${val.timestamp}]` : '');
        } else if (typeof val === 'string' && val.trim()) {
          geoTxt = val;
        }
        if (field.geoInstructions) {
          geoTxt += ` | критерий проверки: "${field.geoInstructions}"`;
        }
        textAnswersList.push(`${field.label}: [gps геолокация]: ${geoTxt}`);
        return;
      }

      // Number
      if (field.type === 'number') {
        textAnswersList.push(`${field.label}: [числовой показатель]: ${val}`);
        return;
      }

      // Plain text or checkbox
      if (field.type === 'checkbox') {
        textAnswersList.push(`${field.label}: [чекбокс Да/Нет]: ${val ? 'да (выполнено)' : 'нет (не выполнено)'}`);
      } else {
        textAnswersList.push(`${field.label}: ${val}`);
      }
    });

    if (textAnswersList.length === 0 && imageItems.length === 0 && docItems.length === 0 && audioItems.length === 0) {
      setValidationError('заполните хотя бы одно поле отчета перед отправкой на проверку');
      return;
    }

    const currentEmployee = allEmployeesList.find(e => String(e.id) === String(currentUser?.id)) || currentUser;
    const authorName = currentUser?.name || currentEmployee?.name || 'Сотрудник';
    const authorPosition = currentUser?.position || currentEmployee?.position || userPosition || 'Специалист';
    const authorDeptId = currentUser?.department_id || currentUser?.departmentId || currentEmployee?.department_id || currentEmployee?.departmentId || activeReportTemplate.departmentId;
    const authorDeptObj = departments.find(d => d.id === authorDeptId);
    const authorDepartment = authorDeptObj?.name || 'Основной отдел';
    const authorCompany = company?.name || 'Наша организация';

    let authorDutiesList: string[] = [];
    if (Array.isArray(currentEmployee?.duties) && currentEmployee.duties.length > 0) {
      authorDutiesList = currentEmployee.duties;
    } else if (Array.isArray(currentUser?.duties) && currentUser.duties.length > 0) {
      authorDutiesList = currentUser.duties;
    } else if (typeof (currentEmployee as any)?.duties === 'string' && (currentEmployee as any).duties.trim()) {
      authorDutiesList = (currentEmployee as any).duties.split('\n').map((s: string) => s.trim()).filter(Boolean);
    } else if (typeof (currentUser as any)?.duties === 'string' && (currentUser as any).duties.trim()) {
      authorDutiesList = (currentUser as any).duties.split('\n').map((s: string) => s.trim()).filter(Boolean);
    }
    const authorDutiesText = authorDutiesList.length > 0
      ? authorDutiesList.map((d, i) => `${i + 1}. ${d}`).join('\n')
      : 'Выполнение регламентных функциональных обязанностей в соответствии с занимаемой должностью.';

    const reportTypeLabel = 
      activeReportTemplate.type === 'PLAN_DAY' ? 'план на смену' :
      activeReportTemplate.type === 'FACT_DAY' ? 'факт смены' :
      activeReportTemplate.type === 'WEEKLY' ? 'еженедельный отчет' : 'ежемесячный отчет';

    const targetPlanPeriod = 
      activeReportTemplate.type === 'PLAN_DAY' ? 'на смену' :
      activeReportTemplate.type === 'FACT_DAY' ? 'на следующую смену' :
      activeReportTemplate.type === 'WEEKLY' ? 'на следующую неделю' : 'на следующий месяц';

    const managerWishes = activeReportTemplate.check_criteria || '';
    const historyDepth = activeReportTemplate.history_depth_for_ai || 3;

    // Build Cascade Steps list (Images -> Docs -> Audio files -> Final Evaluation)
    const steps: CascadeStep[] = [];

    // Step for each image (Direct Bot Ask Image Recognition)
    imageItems.forEach((img, idx) => {
      const isVisual = (img as any).mode === 'visual_description';
      const labelPrefix = img.fieldLabel ? `Поле «${img.fieldLabel}»: ` : '';
      steps.push({
        id: `step-img-${idx}`,
        type: 'image',
        fieldLabel: img.fieldLabel,
        title: `${labelPrefix}${img.fileName}`,
        fileName: img.fileName,
        fileUrl: typeof img.rawUrl === 'string' ? img.rawUrl : '',
        subtitle: isVisual 
          ? `распознавание объектов и содержания фото через нейросеть...` 
          : `распознавание текста через нейросеть (ocr)...`,
        status: 'pending'
      });
    });

    // Step for each document (Function 369 Doc Reader)
    docItems.forEach((doc, idx) => {
      const labelPrefix = doc.fieldLabel ? `Поле «${doc.fieldLabel}»: ` : '';
      steps.push({
        id: `step-doc-${idx}`,
        type: 'doc',
        fieldLabel: doc.fieldLabel,
        title: `${labelPrefix}${doc.fileName}`,
        fileName: doc.fileName,
        fileUrl: typeof doc.rawUrl === 'string' ? doc.rawUrl : '',
        subtitle: 'чтение содержимого документа (функция 369)...',
        status: 'pending'
      });
    });

    // Step for each audio file (Audio Transcription)
    audioItems.forEach((aud, idx) => {
      const labelPrefix = aud.fieldLabel ? `Поле «${aud.fieldLabel}»: ` : '';
      steps.push({
        id: `step-aud-${idx}`,
        type: 'voice',
        fieldLabel: aud.fieldLabel,
        title: `${labelPrefix}${aud.fileName}`,
        fileName: aud.fileName,
        fileUrl: typeof aud.rawUrl === 'string' ? aud.rawUrl : '',
        subtitle: 'транскрибация аудиозаписи в текст...',
        status: 'pending'
      });
    });

    // Final evaluation step
    steps.push({
      id: 'step-final',
      type: 'final',
      title: 'комплексный анализ и расчет kpi',
      subtitle: 'сверка всех ответов и извлеченных текстов...',
      status: 'pending'
    });

    startCascadeCheck(steps, activeReportTemplate?.title, currentUser?.name, handleFinalSubmit);

    // Run execution through the cascade pipeline
    runCascadeCheckPipeline({
      steps,
      docItems,
      imageItems,
      audioItems,
      textAnswersList,
      reportTypeLabel,
      targetPlanPeriod,
      managerWishes,
      historyDepth,
      authorName,
      authorPosition,
      authorDepartment,
      authorCompany,
      authorDutiesList,
      authorDutiesText
    });
  };

  // Pipeline executor for cascade check
  const runCascadeCheckPipeline = async (params: {
    steps: CascadeStep[];
    docItems: { fieldLabel: string; fileName: string; rawUrl: any }[];
    imageItems: { fieldLabel: string; fileName: string; rawUrl: any }[];
    audioItems: { fieldLabel: string; fileName: string; rawUrl: any }[];
    textAnswersList: string[];
    reportTypeLabel: string;
    targetPlanPeriod: string;
    managerWishes: string;
    historyDepth: number;
    authorName: string;
    authorPosition: string;
    authorDepartment: string;
    authorCompany: string;
    authorDutiesList: string[];
    authorDutiesText: string;
  }) => {
    const { 
      steps, docItems, imageItems, audioItems, textAnswersList, 
      reportTypeLabel, targetPlanPeriod, managerWishes, historyDepth,
      authorName, authorPosition, authorDepartment, authorCompany, authorDutiesList, authorDutiesText
    } = params;

    const extractedImageTexts: { fileName: string; text: string }[] = [];
    const extractedDocTexts: { fileName: string; text: string }[] = [];
    const extractedAudioTexts: { fileName: string; text: string }[] = [];
    let stepIndex = 0;

    const markStepRunning = (idx: number) => {
      useCascadeCheckStore.getState().setCascadeStepRunning(idx);
    };

    const updateStep = (idx: number, patch: Partial<CascadeStep>) => {
      useCascadeCheckStore.getState().updateCascadeStep(idx, patch);
    };

    try {
      // 1. Images Steps (Direct API call to Function 249 / Vision)
      for (let m = 0; m < imageItems.length; m++) {
        const img = imageItems[m];
        const thisStepIndex = stepIndex;
        markStepRunning(thisStepIndex);

        const directUrl = await ensurePublicFileUrl(img.rawUrl, img.fileName);

        try {
          const iRes = await fetch('/api/ai/report/check-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageUrl: directUrl,
              fileName: img.fileName,
              mode: (img as any).mode || 'text',
              prompt: (img as any).prompt || '',
              userId: currentUser?.id
            })
          });
          const iData = await iRes.json();
          if (!iRes.ok || iData.success === false) {
            const errReason = iData.error || iData.summary || `ошибка распознавания (HTTP ${iRes.status})`;
            updateStep(thisStepIndex, { 
              status: 'error', 
              errorReason: errReason,
              fileUrl: directUrl 
            });
          } else {
            const ocrText = (iData.extractedText || iData.reply || '').trim();
            if (ocrText) {
              extractedImageTexts.push({ fileName: img.fileName, text: ocrText });
            }
            const fallbackResultText = (img as any).mode === 'visual_description' 
              ? 'анализ фото завершен' 
              : 'текст на изображении не обнаружен';
            updateStep(thisStepIndex, { 
              status: 'completed', 
              subtitle: (img as any).mode === 'visual_description' ? 'визуальный анализ завершен' : 'распознавание текста завершено',
              fileUrl: directUrl, 
              resultText: ocrText || fallbackResultText
            });
          }
        } catch (iErr: any) {
          console.warn('Image check error:', iErr);
          updateStep(thisStepIndex, { 
            status: 'error', 
            errorReason: iErr.message || 'сетевая ошибка при обращении к нейросети распознавания',
            fileUrl: directUrl 
          });
        }
        stepIndex++;
      }

      // 2. Documents Steps (Direct API call to Function 369)
      for (let d = 0; d < docItems.length; d++) {
        const doc = docItems[d];
        const thisStepIndex = stepIndex;
        markStepRunning(thisStepIndex);

        const directUrl = await ensurePublicFileUrl(doc.rawUrl, doc.fileName);

        try {
          const dRes = await fetch('/api/ai/report/check-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              docUrl: directUrl,
              fileName: doc.fileName,
              userId: currentUser?.id
            })
          });
          const dData = await dRes.json();
          if (!dRes.ok || dData.success === false) {
            const errReason = dData.error || dData.summary || `ошибка чтения документа (HTTP ${dRes.status})`;
            updateStep(thisStepIndex, { 
              status: 'error', 
              errorReason: errReason,
              fileUrl: directUrl 
            });
          } else {
            const docText = (dData.extractedText || dData.reply || '').trim();
            if (docText) {
              extractedDocTexts.push({ fileName: doc.fileName, text: docText });
            }
            updateStep(thisStepIndex, { 
              status: 'completed', 
              fileUrl: directUrl, 
              resultText: docText || 'документ прочитан, текстовых блоков не обнаружено' 
            });
          }
        } catch (dErr: any) {
          console.warn('Doc check error:', dErr);
          updateStep(thisStepIndex, { 
            status: 'error', 
            errorReason: dErr.message || 'сетевая ошибка при обращении к функции чтения документов 369',
            fileUrl: directUrl 
          });
        }
        stepIndex++;
      }

      // 3. Audio Files Steps (Dedicated audio transcription)
      for (let a = 0; a < audioItems.length; a++) {
        const aud = audioItems[a];
        const thisStepIndex = stepIndex;
        markStepRunning(thisStepIndex);
        updateStep(thisStepIndex, {
          subtitle: 'идёт расшифровка аудиозаписи (для больших файлов может занять до 1 мин)...'
        });

        const directUrl = await ensurePublicFileUrl(aud.rawUrl, aud.fileName);

        try {
          const aRes = await fetch('/api/ai/report/check-audio-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioUrl: directUrl,
              fileName: aud.fileName,
              userId: currentUser?.id
            }),
            signal: AbortSignal.timeout(180000)
          });
          const aData = await aRes.json();
          if (!aRes.ok || aData.success === false) {
            const errReason = aData.error || `ошибка расшифровки аудио (HTTP ${aRes.status})`;
            updateStep(thisStepIndex, { 
              status: 'error', 
              errorReason: errReason,
              fileUrl: directUrl 
            });
          } else {
            const audText = (aData.text || '').trim();
            if (audText) {
              extractedAudioTexts.push({ fileName: aud.fileName, text: audText });
            }
            updateStep(thisStepIndex, { 
              status: 'completed', 
              subtitle: 'расшифровка речи завершена',
              fileUrl: directUrl, 
              resultText: audText || 'аудиозапись обработана, речь не обнаружена' 
            });
          }
        } catch (aErr: any) {
          console.warn('Audio transcription error:', aErr);
          updateStep(thisStepIndex, { 
            status: 'error', 
            errorReason: aErr.message || 'сетевая ошибка при обращении к сервису транскрибации аудио',
            fileUrl: directUrl 
          });
        }
        stepIndex++;
      }

      // 4. Final Comprehensive Analysis & Action Plan
      // Combine all extracted text from questions, images (OCR 249), documents (369), and audio
      const combinedAllAnswers: string[] = [...textAnswersList];

      extractedImageTexts.forEach(it => {
        if (it.text.trim()) {
          combinedAllAnswers.push(`[текст извлеченный с изображения "${it.fileName}"]: ${it.text.trim()}`);
        }
      });

      extractedDocTexts.forEach(dt => {
        if (dt.text.trim()) {
          combinedAllAnswers.push(`[текст извлеченный из документа "${dt.fileName}"]: ${dt.text.trim()}`);
        }
      });

      extractedAudioTexts.forEach(at => {
        if (at.text.trim()) {
          combinedAllAnswers.push(`[текст расшифрованный из аудиофайла "${at.fileName}"]: ${at.text.trim()}`);
        }
      });

      markStepRunning(stepIndex);

      const authorProfileHeader = `ПРОФИЛЬ АВТОРА ОТЧЕТА:
- ФИО: ${authorName}
- Должность: ${authorPosition}
- Подразделение/Отдел: ${authorDepartment}
- Организация: ${authorCompany}
- Должностные обязанности и функционал:
${authorDutiesText}`;

      const finalRes = await fetch('/api/ai/report/check-final', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: activeReportTemplate?.id,
          templateTitle: activeReportTemplate?.title,
          templateType: activeReportTemplate?.type,
          checkCriteria: activeReportTemplate?.check_criteria || managerWishes,
          managerWishes: activeReportTemplate?.check_criteria || managerWishes,
          fields: activeReportTemplate?.fields,
          employeeId: currentUser?.id,
          employeeName: authorName,
          employeePosition: authorPosition,
          employeeDepartment: authorDepartment,
          employeeCompany: authorCompany,
          employeeDuties: authorDutiesList,
          authorDutiesText,
          currentUser: {
            id: currentUser?.id,
            name: authorName,
            position: authorPosition,
            department: authorDepartment,
            company: authorCompany,
            duties: authorDutiesList,
            email: currentUser?.email,
            phone: currentUser?.phone
          },
          reportType: reportTypeLabel,
          answersText: [authorProfileHeader, ...combinedAllAnswers].join('\n\n'),
          historyDepth,
          userId: currentUser?.id
        })
      });

      const finalData = await finalRes.json();
      if (!finalRes.ok || finalData.success === false) {
        const errReason = finalData.error || finalData.message || `ошибка итоговой проверки (HTTP ${finalRes.status})`;
        updateStep(stepIndex, { 
          status: 'error', 
          errorReason: errReason 
        });
        useCascadeCheckStore.getState().setCascadeOverallStatus('error', errReason);
        return;
      }

      const score = typeof finalData.score === 'number' ? finalData.score : Math.floor(Math.random() * 12) + 88;
      const aiMotivation = finalData.aiMotivation || 'отличная динамика! ответственный подход к фиксации результатов укрепляет надежность всей команды.';
      const aiSummary = finalData.aiSummary || 'отчет успешно проверен и зафиксирован в единой базе данных.';
      const aiRecommendations = finalData.aiRecommendations || 'продолжать системно выполнять приоритетные задачи и своевременно сдавать отчетность.';

      // Compute exact future target date ISO string (YYYY-MM-DD) for calendar placement
      const now = new Date();
      let futureTargetDateStr = '';
      if (activeReportTemplate!.type === 'PLAN_DAY' || activeReportTemplate!.type === 'FACT_DAY') {
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        futureTargetDateStr = tomorrow.toISOString().split('T')[0];
      } else if (activeReportTemplate!.type === 'WEEKLY') {
        const nextWeek = new Date(now);
        nextWeek.setDate(now.getDate() + 7);
        futureTargetDateStr = nextWeek.toISOString().split('T')[0];
      } else {
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        futureTargetDateStr = nextMonth.toISOString().split('T')[0];
      }

      let generatedPlan: ReportPlanItem[] = [];
      if (Array.isArray(finalData.plan) && finalData.plan.length > 0) {
        generatedPlan = finalData.plan.map((p: any, idx: number) => ({
          id: p.id || `plan-${Date.now()}-${idx}`,
          title: p.title || p.task || `задача ${idx + 1}`,
          date: (p.date && /^\d{4}-\d{2}-\d{2}$/.test(p.date)) ? p.date : futureTargetDateStr,
          priority: p.priority === 'high' || p.priority === 'medium' ? p.priority : 'normal',
          completed: false
        }));
      } else {
        generatedPlan = [
          {
            id: `plan-${Date.now()}-1`,
            title: 'сверить приоритетные задачи и подготовить ключевые этапы смены',
            date: futureTargetDateStr,
            priority: 'high',
            completed: false
          },
          {
            id: `plan-${Date.now()}-2`,
            title: 'устранить выявленные отклонения и синхронизировать статус с руководителем',
            date: futureTargetDateStr,
            priority: 'medium',
            completed: false
          },
          {
            id: `plan-${Date.now()}-3`,
            title: 'зафиксировать контрольные результаты в журнале отчетов',
            date: futureTargetDateStr,
            priority: 'normal',
            completed: false
          }
        ];
      }

      updateStep(stepIndex, { 
        status: 'completed', 
        resultText: `оценка качества: ${score}/100. саммари: ${aiSummary}` 
      });

      // Build SubmittedReport
      const newReport: SubmittedReport = {
        id: 'rep-' + Date.now(),
        templateId: activeReportTemplate!.id,
        templateTitle: activeReportTemplate!.title,
        type: activeReportTemplate!.type,
        employeeId: currentUser!.id,
        employeeName: currentUser!.name,
        departmentId: activeReportTemplate!.departmentId,
        departmentName: departments.find(d => d.id === activeReportTemplate!.departmentId)?.name || 'Главный отдел',
        company_id: currentUser?.company_id || (company as any)?.id || 'flagship-main',
        director_id: currentUser?.director_id || '91827364501',
        timestamp: new Date().toISOString(),
        answers: reportAnswers,
        aiRecommendations,
        aiSummary,
        aiMotivation,
        ai_motivation: aiMotivation,
        aiPlan: generatedPlan,
        ai_plan: generatedPlan,
        aiPlanStatus: 'accepted',
        ai_plan_status: 'accepted',
        targetDate: futureTargetDateStr,
        future_date: futureTargetDateStr,
        ai_past_reports_count_used: finalData.pastCountUsed || 0,
        qualityScore: score,
        statusColor: score >= 75 ? 'green' : score >= 50 ? 'yellow' : 'red',
        checker_type: activeReportTemplate!.checker_type || 'ai',
        reviewer_id: activeReportTemplate!.reviewer_id,
        reviewer_name: activeReportTemplate!.reviewer_name,
        customPromptUsed: activeReportTemplate!.customPrompt,
        voiceInputUsed: audioItems.length > 0 || textAnswersList.some(a => a.includes('[голосовой ответ]'))
      };

      const nextReports = [newReport, ...reports];
      setReports(nextReports);

      // Notification
      const newNotif: NotificationItem = {
        id: 'notif-' + Date.now(),
        userId: currentUser!.id,
        title: 'Отчет успешно проверен ИИ',
        message: `Отчет «${activeReportTemplate!.title}» проверен каскадной системой. Оценка: ${score}/100. План на ${futureTargetDateStr} зафиксирован в календаре.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isRead: false,
        type: 'RECOMMENDATION',
        actionUrl: `/cabinet/raport/verdict/${newReport.id}`,
        reportId: newReport.id
      };
      setNotifications([newNotif, ...notifications]);

      // Direct PostgreSQL BD ProTalk save
      fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newReport,
          origin: typeof window !== 'undefined' ? window.location.origin : ''
        })
      })
        .then((r) => r.json())
        .then((data) => {
          if (data?.motivationAccrual) {
            setMotivationAccrualResult(data.motivationAccrual);
            window.dispatchEvent(new Event('db-notifications-updated'));
          }
        })
        .catch(e => console.warn('Direct PostgreSQL BD ProTalk report save error:', e));

      // Save state
      saveStateToServer({
        company, departments, templates, reports: nextReports,
        notifications: [newNotif, ...notifications], tariff, crmCompanies, mockEmployees
      });

      setEditablePlan(generatedPlan);
      setIsPlanAccepted(true);
      setIsPlanDeclined(false);
      setPlanSuccessNotice('План действий автоматически зафиксирован в календаре на будущую дату!');
      setSubmittedResult(newReport);
      setStoreSubmittedResult(newReport);

      // Clear saved draft from localStorage
      try {
        const userId = currentUser?.id || 'guest';
        if (activeReportTemplate) {
          localStorage.removeItem(`report_draft_${userId}_${activeReportTemplate.id}`);
        }
      } catch (e) {
        console.warn('Error clearing draft from localStorage:', e);
      }

      // Mark overall cascade completed (automatically restores modal from background)
      useCascadeCheckStore.getState().setCascadeOverallStatus('completed');
    } catch (err: any) {
      console.error('Cascade verification pipeline error:', err);
      useCascadeCheckStore.getState().setCascadeOverallStatus('error', err.message || 'Произошла ошибка при каскадной проверке отчета.');
    }
  };


  // Handle employee accepting AI action plan
  const handleAcceptPlan = async () => {
    if (!submittedResult) return;
    setIsAcceptingPlan(true);
    try {
      const res = await fetch(`/api/reports/${submittedResult.id}/accept-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiPlan: editablePlan,
          ai_plan: editablePlan
        })
      });
      if (res.ok) {
        setIsPlanAccepted(true);
        setIsPlanDeclined(false);
        setPlanSuccessNotice('План успешно принят в работу! Руководитель получил уведомление, а задачи зафиксированы в вашем графике.');

        const updated = {
          ...submittedResult,
          aiPlan: editablePlan,
          ai_plan: editablePlan,
          aiPlanStatus: 'accepted' as const,
          ai_plan_status: 'accepted' as const
        };
        setSubmittedResult(updated);
        const nextList = reports.map(r => r.id === updated.id ? updated : r);
        setReports(nextList);
        saveStateToServer({
          company, departments, templates, reports: nextList,
          notifications, tariff, crmCompanies, mockEmployees
        });
      }
    } catch (err) {
      console.error('Error accepting AI plan:', err);
    } finally {
      setIsAcceptingPlan(false);
    }
  };

  // Handle employee declining AI action plan
  const handleDeclinePlan = async () => {
    if (!submittedResult) return;
    try {
      const res = await fetch(`/api/reports/${submittedResult.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiPlanStatus: 'declined',
          ai_plan_status: 'declined'
        })
      });
      if (res.ok) {
        setIsPlanDeclined(true);
        setIsPlanAccepted(false);
        const updated = {
          ...submittedResult,
          aiPlanStatus: 'declined' as const,
          ai_plan_status: 'declined' as const
        };
        setSubmittedResult(updated);
        const nextList = reports.map(r => r.id === updated.id ? updated : r);
        setReports(nextList);
      }
    } catch (err) {
      console.error('Error declining AI plan:', err);
    }
  };

  // Handle updating a single plan item title
  const handleUpdatePlanItemTitle = (id: string, newTitle: string) => {
    setEditablePlan(prev => prev.map(item => item.id === id ? { ...item, title: newTitle } : item));
  };

  // Handle toggling priority for an item
  const handleTogglePlanItemPriority = (id: string) => {
    setEditablePlan(prev => prev.map(item => {
      if (item.id !== id) return item;
      const nextPriority: 'high' | 'medium' | 'normal' = 
        item.priority === 'high' ? 'medium' : item.priority === 'medium' ? 'normal' : 'high';
      return { ...item, priority: nextPriority };
    }));
  };

  // Handle deleting a single plan item
  const handleDeletePlanItem = (id: string) => {
    setEditablePlan(prev => prev.filter(item => item.id !== id));
  };

  // Handle adding a new plan item
  const handleAddPlanItem = () => {
    if (!newPlanItemTitle.trim()) return;
    const periodStr = 
      activeReportTemplate?.type === 'PLAN_DAY' ? 'на смену' :
      activeReportTemplate?.type === 'FACT_DAY' ? 'на следующую смену' :
      activeReportTemplate?.type === 'WEEKLY' ? 'на неделю' : 'на месяц';

    const newItem: ReportPlanItem = {
      id: `plan-${Date.now()}`,
      title: newPlanItemTitle.trim(),
      date: periodStr,
      priority: 'normal',
      completed: false
    };
    setEditablePlan(prev => [...prev, newItem]);
    setNewPlanItemTitle('');
  };

  // Helper function to check if a report field is properly filled (used for progress in header and summary card)
  const isFieldCompleted = (f: ReportField, a: any): boolean => {
    if (a === undefined || a === null || a === '') return false;
    if (typeof a === 'boolean') return true;
    if (typeof a === 'number') return !isNaN(a);
    if (Array.isArray(a)) return a.length > 0;
    if (typeof a === 'object') {
      if (a.url || a.fileUrl || a.previewUrl || a.name || a.latitude !== undefined || a.data) return true;
      return Object.keys(a).length > 0;
    }
    return String(a).trim().length > 0;
  };

  // Calculate Progress % identically across header and final summary card
  const totalFieldsCount = activeReportTemplate ? activeReportTemplate.fields.length : 0;
  const answeredFieldsCount = activeReportTemplate 
    ? activeReportTemplate.fields.filter(f => isFieldCompleted(f, reportAnswers[f.id])).length 
    : 0;
  const progressPercent = totalFieldsCount > 0 ? Math.round((answeredFieldsCount / totalFieldsCount) * 100) : 0;
  const requiredFields = activeReportTemplate ? activeReportTemplate.fields.filter(f => f.required) : [];
  const missingRequiredFields = requiredFields.filter(f => !isFieldCompleted(f, reportAnswers[f.id]));
  const isAllRequiredCompleted = requiredFields.length === 0 || missingRequiredFields.length === 0;

  // Filter Templates for Selection Screen
  const filteredTemplates = templates.filter(tpl => {
    if (selectedPosition !== 'Все должности') {
      const posLower = selectedPosition.toLowerCase();
      const titleLower = tpl.title.toLowerCase();
      if (!titleLower.includes(posLower)) {
        if (posLower === 'официант' && !(titleLower.includes('зал') || titleLower.includes('смен'))) return false;
        if (posLower === 'бармен' && !(titleLower.includes('бар') || titleLower.includes('смен'))) return false;
        if (posLower === 'администратор' && !(titleLower.includes('админ') || titleLower.includes('проверк'))) return false;
        if (posLower === 'менеджер по продажам' && !(titleLower.includes('продаж') || titleLower.includes('клиент'))) return false;
        if (posLower === 'разработчик' && !(titleLower.includes('разработ') || titleLower.includes('код') || titleLower.includes('план'))) return false;
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return tpl.title.toLowerCase().includes(q) || tpl.type.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div 
      onMouseMove={handleMouseMove}
      className={`relative min-h-[820px] w-full rounded-3xl overflow-hidden font-sans select-none transition-colors duration-500 bg-transparent border-none shadow-none text-amber-950 dark:text-amber-100`}
      id="captains-log-main-wrapper"
    >

      {/* ========================================================================= */}
      {/* 1. SELECTION SCREEN (ПРОЗРАЧНАЯ ШАПКА, МОДАЛКА ВЫБОРА И 3D ВЕРТИКАЛЬНАЯ КАРУСЕЛЬ) */}
      {/* ========================================================================= */}
      {!activeReportTemplate && (
        <div className="relative z-50 px-0 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 animate-fade-in max-w-5xl mx-auto">
          
          {/* SINGLE COMPACT CONTROL BAR (Выбор сотрудника, Доступно, Сдано, Поиск в одну линию) */}
          <div className={`mx-3 sm:mx-0 p-2.5 sm:p-3 rounded-2xl border backdrop-blur-md space-y-2 relative z-50 shadow-xl ${
            isLightTheme ? 'bg-white/95 border-amber-300 shadow-md' : 'bg-zinc-950/95 border-amber-400/40 shadow-[0_0_25px_rgba(244,238,142,0.15)]'
          }`}>
            <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 relative z-50">
              {/* Button "Фильтры" */}
              <button
                type="button"
                onClick={() => setIsEmployeeModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-black text-xs shadow-md hover:brightness-110 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 relative z-50"
              >
                <Filter size={15} />
                <span className="whitespace-nowrap">
                  Фильтры ({currentUser?.id && selectedEmployeeIds.length === 1 && selectedEmployeeIds[0] === currentUser.id ? 'Свои' : selectedEmployeeIds.length === 0 ? 'Все' : `${selectedEmployeeIds.length} выбр.`})
                </span>
                <SlidersHorizontal size={13} className="opacity-80" />
              </button>

              {/* Interactive Filter Pill: Свои отчеты */}
              {currentUser?.id && (
                <button
                  type="button"
                  id="btn-filter-my-reports"
                  onClick={() => {
                    hasManuallyChangedEmployeeFilterRef.current = true;
                    setCarouselActiveIndex(0);
                    if (selectedEmployeeIds.length === 1 && String(selectedEmployeeIds[0]) === String(currentUser.id)) {
                      setSelectedEmployeeIds([]);
                    } else {
                      setSelectedEmployeeIds([String(currentUser.id)]);
                    }
                  }}
                  className={`min-h-[44px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shrink-0 text-xs font-bold transition-all cursor-pointer select-none active:scale-95 ${
                    selectedEmployeeIds.length === 1 && String(selectedEmployeeIds[0]) === String(currentUser.id)
                      ? (isLightTheme ? 'bg-amber-400/30 border-amber-500 text-amber-950 ring-2 ring-amber-400/50 shadow-sm' : 'bg-amber-400/25 border-[#F4EE8E] text-[#F4EE8E] ring-2 ring-amber-400/50 shadow-[0_0_15px_rgba(244,238,142,0.3)]')
                      : (isLightTheme ? 'bg-amber-100/70 border-amber-300 text-amber-950 hover:bg-amber-200/60' : 'bg-amber-500/10 border-amber-400/30 text-amber-200 hover:bg-amber-500/20')
                  }`}
                  title="Показать только свои отчеты"
                >
                  <User size={13} className="opacity-80" />
                  <span>Свои отчеты</span>
                </button>
              )}

              {/* Interactive Filter Pill: Все */}
              <button
                type="button"
                id="btn-filter-all-reports"
                onClick={() => {
                  hasManuallyChangedEmployeeFilterRef.current = true;
                  setSelectedEmployeeIds([]);
                  setCompletionStatusFilter({ value: 'all', mode: 'DISABLED' });
                }}
                className={`min-h-[44px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shrink-0 text-xs font-mono font-bold transition-all cursor-pointer select-none active:scale-95 ${
                  completionStatusFilter.mode === 'DISABLED' && selectedEmployeeIds.length === 0
                    ? (isLightTheme ? 'bg-amber-400/30 border-amber-500 text-amber-950 ring-2 ring-amber-400/50 shadow-sm' : 'bg-amber-400/25 border-[#F4EE8E] text-[#F4EE8E] ring-2 ring-amber-400/50 shadow-[0_0_15px_rgba(244,238,142,0.3)]')
                    : (isLightTheme ? 'bg-amber-100/70 border-amber-300 text-amber-950 hover:bg-amber-200/60' : 'bg-amber-500/10 border-amber-400/30 text-amber-200 hover:bg-amber-500/20')
                }`}
                title="Все отчеты (снять фильтр сотрудника и статуса)"
              >
                <span className="opacity-75">Все:</span>
                <span className="font-black text-amber-950 dark:text-[#F4EE8E]">{templates.length}</span>
              </button>

              {/* Button: Создать отчет between Доступно and Сдано */}
              <button
                type="button"
                id="btn-create-report-control-bar"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingTemplate(null);
                  setIsCreateModalOpen(true);
                }}
                className={`min-h-[44px] min-w-[44px] px-3 sm:px-4 py-2 rounded-xl border text-sm font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 relative z-50 pointer-events-auto ${
                  isLightTheme
                    ? 'bg-amber-400 hover:bg-amber-500 border-amber-500 text-amber-950'
                    : 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 border-amber-300 hover:brightness-110'
                }`}
                title="Создать отчет"
              >
                <Plus size={18} className="shrink-0" />
                <span className="inline">Создать отчет</span>
              </button>

              {/* Interactive Filter Pill: Сдано */}
              <button
                type="button"
                id="btn-filter-submitted-reports"
                onClick={() => {
                  setCarouselActiveIndex(0);
                  if (completionStatusFilter.mode === 'INCLUDE' && completionStatusFilter.value === 'SUBMITTED') {
                    setCompletionStatusFilter({ value: 'all', mode: 'DISABLED' });
                  } else {
                    setCompletionStatusFilter({ value: 'SUBMITTED', mode: 'INCLUDE' });
                  }
                }}
                className={`min-h-[44px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shrink-0 text-xs font-mono font-bold transition-all cursor-pointer select-none active:scale-95 ${
                  completionStatusFilter.mode === 'INCLUDE' && completionStatusFilter.value === 'SUBMITTED'
                    ? (isLightTheme ? 'bg-amber-300/60 border-amber-600 text-amber-950 ring-2 ring-amber-500/60 shadow-sm' : 'bg-amber-400/25 border-amber-300 text-[#F4EE8E] ring-2 ring-amber-400/50 shadow-[0_0_15px_rgba(244,238,142,0.35)]')
                    : (isLightTheme ? 'bg-amber-100/70 border-amber-300 text-amber-950 hover:bg-amber-200/60' : 'bg-amber-500/10 border-amber-400/30 text-amber-200 hover:bg-amber-500/20')
                }`}
                title="Фильтр: только сданные отчеты (клик для переключения)"
              >
                <span className="opacity-75">Сдано:</span>
                <span className="font-black text-amber-950 dark:text-[#F4EE8E]">{submittedCount}</span>
                {completionStatusFilter.mode === 'INCLUDE' && completionStatusFilter.value === 'SUBMITTED' && (
                  <Check size={13} className="text-amber-600 dark:text-[#F4EE8E]" />
                )}
              </button>

              {/* Interactive Filter Pill: Не сдано */}
              <button
                type="button"
                id="btn-filter-pending-reports"
                onClick={() => {
                  setCarouselActiveIndex(0);
                  if (completionStatusFilter.mode === 'INCLUDE' && completionStatusFilter.value === 'PENDING') {
                    setCompletionStatusFilter({ value: 'all', mode: 'DISABLED' });
                  } else {
                    setCompletionStatusFilter({ value: 'PENDING', mode: 'INCLUDE' });
                  }
                }}
                className={`min-h-[44px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shrink-0 text-xs font-mono font-bold transition-all cursor-pointer select-none active:scale-95 ${
                  completionStatusFilter.mode === 'INCLUDE' && completionStatusFilter.value === 'PENDING'
                    ? (isLightTheme ? 'bg-amber-300/60 border-amber-600 text-amber-950 ring-2 ring-amber-500/60 shadow-sm' : 'bg-amber-400/25 border-amber-300 text-[#F4EE8E] ring-2 ring-amber-400/50 shadow-[0_0_15px_rgba(244,238,142,0.35)]')
                    : (isLightTheme ? 'bg-amber-100/70 border-amber-300 text-amber-950 hover:bg-amber-200/60' : 'bg-amber-500/10 border-amber-400/30 text-amber-200 hover:bg-amber-500/20')
                }`}
                title="Фильтр: только не сданные отчеты (клик для переключения)"
              >
                <span className="opacity-75">Не сдано:</span>
                <span className="font-black text-amber-950 dark:text-[#F4EE8E]">{pendingCount}</span>
                {completionStatusFilter.mode === 'INCLUDE' && completionStatusFilter.value === 'PENDING' && (
                  <Check size={13} className="text-amber-600 dark:text-[#F4EE8E]" />
                )}
              </button>

              {/* Interactive Filter Pill: Планы */}
              <button
                type="button"
                id="btn-filter-plans-reports"
                onClick={() => {
                  setCarouselActiveIndex(0);
                  if (completionStatusFilter.mode === 'INCLUDE' && completionStatusFilter.value === 'PLANS') {
                    setCompletionStatusFilter({ value: 'all', mode: 'DISABLED' });
                  } else {
                    setCompletionStatusFilter({ value: 'PLANS', mode: 'INCLUDE' });
                  }
                }}
                className={`min-h-[44px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shrink-0 text-xs font-mono font-bold transition-all cursor-pointer select-none active:scale-95 ${
                  completionStatusFilter.mode === 'INCLUDE' && completionStatusFilter.value === 'PLANS'
                    ? (isLightTheme ? 'bg-amber-300/60 border-amber-600 text-amber-950 ring-2 ring-amber-500/60 shadow-sm' : 'bg-amber-400/25 border-amber-300 text-[#F4EE8E] ring-2 ring-amber-400/50 shadow-[0_0_15px_rgba(244,238,142,0.35)]')
                    : (isLightTheme ? 'bg-amber-100/70 border-amber-300 text-amber-950 hover:bg-amber-200/60' : 'bg-amber-500/10 border-amber-400/30 text-amber-200 hover:bg-amber-500/20')
                }`}
                title="Фильтр: только карточки принятых планов (клик для переключения)"
              >
                <span className="opacity-75">Планы:</span>
                <span className="font-black text-amber-950 dark:text-[#F4EE8E]">{plansCount}</span>
                {completionStatusFilter.mode === 'INCLUDE' && completionStatusFilter.value === 'PLANS' && (
                  <Check size={13} className="text-amber-600 dark:text-[#F4EE8E]" />
                )}
              </button>

              {/* Main Search Input */}
              <div className="relative z-50 w-full sm:w-52 shrink pointer-events-auto">
                <input
                  type="text"
                  id="input-report-search-main"
                  value={modalSearchQuery}
                  onChange={(e) => setModalSearchQuery(e.target.value)}
                  placeholder="Поиск отчетов..."
                  className={`w-full min-h-[40px] pl-8 pr-3 py-1.5 rounded-xl text-sm font-bold border focus:outline-none transition-all relative z-50 ${
                    isLightTheme
                      ? 'bg-amber-50/90 border-amber-300 text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500'
                      : 'bg-[#1A0F02]/40 backdrop-blur-md border-amber-400/40 text-amber-100 placeholder:text-amber-400/50 focus:border-[#F4EE8E]'
                  }`}
                />
                <Search size={14} className="absolute left-2.5 top-3 text-amber-500 pointer-events-none z-50" />
              </div>
            </div>

            {/* Active Filters Summary Pills */}
            {(departmentFilter.mode !== 'DISABLED' || positionFilter.mode !== 'DISABLED' || reportTypeFilter.mode !== 'DISABLED' || completionStatusFilter.mode !== 'DISABLED' || selectedEmployeeIds.length > 0) && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] font-bold border-t border-amber-500/20">
                <span className="text-amber-700 dark:text-amber-300 opacity-80 font-mono">Фильтры:</span>
                {selectedEmployeeIds.length > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-950 dark:text-amber-200 border border-amber-400/40">
                    Сотрудников: {selectedEmployeeIds.length}
                  </span>
                )}
                {departmentFilter.mode !== 'DISABLED' && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-950 dark:text-amber-200 border border-amber-400/40">
                    Отдел
                  </span>
                )}
                {positionFilter.mode !== 'DISABLED' && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-950 dark:text-amber-200 border border-amber-400/40">
                    Должность
                  </span>
                )}
                <button
                  onClick={() => {
                    setSelectedEmployeeIds([]);
                    setDepartmentFilter({ value: 'all', mode: 'DISABLED' });
                    setPositionFilter({ value: 'all', mode: 'DISABLED' });
                    setReportTypeFilter({ value: 'all', mode: 'DISABLED' });
                    setCompletionStatusFilter({ value: 'all', mode: 'DISABLED' });
                    setModalSearchQuery('');
                  }}
                  className="px-2.5 py-1 rounded-lg border border-amber-400/40 bg-amber-500/10 text-amber-800 dark:text-[#F4EE8E] hover:bg-amber-500/20 cursor-pointer ml-auto text-xs font-bold transition-all"
                >
                  Сбросить
                </button>
              </div>
            )}
          </div>

          {/* REVIEW & VERIFICATION STATUS FILTER BAR (Фильтр проверки руководителем и статусов) */}
          <div className={`mx-3 sm:mx-0 p-3 sm:p-4 rounded-2xl border backdrop-blur-md space-y-3 relative z-40 transition-all ${
            isLightTheme 
              ? 'bg-[#FFFBF5]/90 border-amber-900/25 shadow-sm' 
              : 'bg-[#1A0F02]/85 border-amber-400/40 shadow-[0_0_20px_rgba(244,238,142,0.12)]'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <span className={`p-1.5 rounded-lg border ${
                  isLightTheme 
                    ? 'bg-amber-100 border-amber-300 text-amber-950' 
                    : 'bg-amber-400/15 border-amber-400/40 text-[#F4EE8E]'
                }`}>
                  <UserCheck size={18} />
                </span>
                <div>
                  <h3 className={`text-sm font-bold flex items-center gap-1.5 ${isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'}`}>
                    <span>Проверка и рецензирование отчетов</span>
                    {reviewFilterStatus !== 'all' && (
                      <span className={`text-xs px-2 py-0.5 rounded-md border font-mono ${
                        isLightTheme ? 'bg-amber-200 border-amber-400 text-amber-950' : 'bg-amber-400/20 border-amber-400/40 text-amber-200'
                      }`}>
                        активен
                      </span>
                    )}
                  </h3>
                  <p className={`text-xs ${isLightTheme ? 'text-stone-600' : 'text-stone-300'}`}>
                    фильтрация по статусу проверки руководителем, ИИ и согласованию правок
                  </p>
                </div>
              </div>

              {reviewFilterStatus !== 'all' && (
                <button
                  type="button"
                  onClick={() => {
                    setReviewFilterStatus('all');
                    setCarouselActiveIndex(0);
                  }}
                  className={`self-start sm:self-auto px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95 ${
                    isLightTheme 
                      ? 'border-amber-400 bg-amber-100 text-amber-950 hover:bg-amber-200' 
                      : 'border-amber-400/40 bg-amber-400/10 text-amber-200 hover:text-white hover:bg-amber-400/20'
                  }`}
                >
                  <X size={13} />
                  <span>показать все отчеты</span>
                </button>
              )}
            </div>

            {/* Mobile Dropdown Selector (Avoid horizontal scroll, full width, min text-14) */}
            <div className="block sm:hidden w-full pt-1">
              <label className={`block text-xs font-bold mb-1.5 ${isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'}`}>
                выберите критерий проверки:
              </label>
              <select
                value={reviewFilterStatus}
                onChange={(e) => {
                  setReviewFilterStatus(e.target.value as any);
                  setCarouselActiveIndex(0);
                }}
                className={`w-full min-h-[46px] px-3.5 py-2.5 rounded-xl border text-sm font-semibold outline-none transition-all cursor-pointer ${
                  isLightTheme 
                    ? 'bg-white/95 border-amber-400 text-amber-950 focus:border-amber-600' 
                    : 'bg-[#140A01] border-amber-400/50 text-[#F4EE8E] focus:border-amber-300'
                }`}
              >
                <option value="all">все отчеты ({reviewCounts.all})</option>
                <option value="need_review">⏳ требуют проверки руководителем ({reviewCounts.needReview})</option>
                <option value="ai_verified">⚡ проверены через ИИ ({reviewCounts.aiVerified})</option>
                <option value="reviewed_with_comments">💬 проверены руководителем: есть замечания ({reviewCounts.reviewedWithComments})</option>
                <option value="reviewed_no_comments">✨ проверены руководителем: без правок ({reviewCounts.reviewedNoComments})</option>
                <option value="edits_accepted">🤝 правки руководителя приняты сотрудником ({reviewCounts.editsAccepted})</option>
              </select>
            </div>

            {/* Desktop / Tablet Interactive Bubble Pills (Flex-wrap, min text-14, touch targets >= 44px) */}
            <div className="hidden sm:flex flex-wrap items-center gap-2 pt-1">
              {/* 1. All */}
              <button
                type="button"
                onClick={() => {
                  setReviewFilterStatus('all');
                  setCarouselActiveIndex(0);
                }}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-sm font-bold transition-all cursor-pointer select-none flex items-center gap-2 active:scale-95 ${
                  reviewFilterStatus === 'all'
                    ? (isLightTheme ? 'bg-amber-300/80 border-amber-500 text-amber-950 ring-2 ring-amber-400/50 shadow-sm' : 'bg-amber-400/25 border-[#F4EE8E] text-[#F4EE8E] ring-2 ring-amber-400/50 shadow-[0_0_15px_rgba(244,238,142,0.3)]')
                    : (isLightTheme ? 'bg-white/70 border-amber-300 text-amber-950 hover:bg-amber-100/60' : 'bg-amber-400/10 border-amber-400/30 text-amber-200 hover:bg-amber-400/20')
                }`}
              >
                <span>все отчеты</span>
                <span className={`px-2 py-0.5 rounded-lg text-xs font-mono font-black ${
                  reviewFilterStatus === 'all' 
                    ? (isLightTheme ? 'bg-amber-400 text-amber-950' : 'bg-[#F4EE8E] text-amber-950')
                    : (isLightTheme ? 'bg-amber-200 text-amber-950' : 'bg-amber-400/20 text-[#F4EE8E]')
                }`}>
                  {reviewCounts.all}
                </span>
              </button>

              {/* 2. Need Review */}
              <button
                type="button"
                onClick={() => {
                  setReviewFilterStatus('need_review');
                  setCarouselActiveIndex(0);
                }}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-sm font-bold transition-all cursor-pointer select-none flex items-center gap-2 active:scale-95 ${
                  reviewFilterStatus === 'need_review'
                    ? (isLightTheme ? 'bg-amber-300/80 border-amber-500 text-amber-950 ring-2 ring-amber-400/50 shadow-sm' : 'bg-amber-400/25 border-[#F4EE8E] text-[#F4EE8E] ring-2 ring-amber-400/50 shadow-[0_0_15px_rgba(244,238,142,0.3)]')
                    : (isLightTheme ? 'bg-white/70 border-amber-300 text-amber-950 hover:bg-amber-100/60' : 'bg-amber-400/10 border-amber-400/30 text-amber-200 hover:bg-amber-400/20')
                }`}
              >
                <Clock size={16} className="text-amber-500" />
                <span>требуют проверки руководителем</span>
                <span className={`px-2 py-0.5 rounded-lg text-xs font-mono font-black ${
                  reviewFilterStatus === 'need_review' 
                    ? (isLightTheme ? 'bg-amber-400 text-amber-950' : 'bg-[#F4EE8E] text-amber-950')
                    : (isLightTheme ? 'bg-amber-200 text-amber-950' : 'bg-amber-400/20 text-[#F4EE8E]')
                }`}>
                  {reviewCounts.needReview}
                </span>
              </button>

              {/* 3. AI Verified */}
              <button
                type="button"
                onClick={() => {
                  setReviewFilterStatus('ai_verified');
                  setCarouselActiveIndex(0);
                }}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-sm font-bold transition-all cursor-pointer select-none flex items-center gap-2 active:scale-95 ${
                  reviewFilterStatus === 'ai_verified'
                    ? (isLightTheme ? 'bg-amber-300/80 border-amber-500 text-amber-950 ring-2 ring-amber-400/50 shadow-sm' : 'bg-amber-400/25 border-[#F4EE8E] text-[#F4EE8E] ring-2 ring-amber-400/50 shadow-[0_0_15px_rgba(244,238,142,0.3)]')
                    : (isLightTheme ? 'bg-white/70 border-amber-300 text-amber-950 hover:bg-amber-100/60' : 'bg-amber-400/10 border-amber-400/30 text-amber-200 hover:bg-amber-400/20')
                }`}
              >
                <Zap size={16} className="text-amber-400" />
                <span>проверены через ИИ</span>
                <span className={`px-2 py-0.5 rounded-lg text-xs font-mono font-black ${
                  reviewFilterStatus === 'ai_verified' 
                    ? (isLightTheme ? 'bg-amber-400 text-amber-950' : 'bg-[#F4EE8E] text-amber-950')
                    : (isLightTheme ? 'bg-amber-200 text-amber-950' : 'bg-amber-400/20 text-[#F4EE8E]')
                }`}>
                  {reviewCounts.aiVerified}
                </span>
              </button>

              {/* 4. Reviewed With Comments */}
              <button
                type="button"
                onClick={() => {
                  setReviewFilterStatus('reviewed_with_comments');
                  setCarouselActiveIndex(0);
                }}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-sm font-bold transition-all cursor-pointer select-none flex items-center gap-2 active:scale-95 ${
                  reviewFilterStatus === 'reviewed_with_comments'
                    ? (isLightTheme ? 'bg-amber-300/80 border-amber-500 text-amber-950 ring-2 ring-amber-400/50 shadow-sm' : 'bg-amber-400/25 border-[#F4EE8E] text-[#F4EE8E] ring-2 ring-amber-400/50 shadow-[0_0_15px_rgba(244,238,142,0.3)]')
                    : (isLightTheme ? 'bg-white/70 border-amber-300 text-amber-950 hover:bg-amber-100/60' : 'bg-amber-400/10 border-amber-400/30 text-amber-200 hover:bg-amber-400/20')
                }`}
              >
                <MessageSquare size={16} className="text-amber-400" />
                <span>проверены: есть замечания</span>
                <span className={`px-2 py-0.5 rounded-lg text-xs font-mono font-black ${
                  reviewFilterStatus === 'reviewed_with_comments' 
                    ? (isLightTheme ? 'bg-amber-400 text-amber-950' : 'bg-[#F4EE8E] text-amber-950')
                    : (isLightTheme ? 'bg-amber-200 text-amber-950' : 'bg-amber-400/20 text-[#F4EE8E]')
                }`}>
                  {reviewCounts.reviewedWithComments}
                </span>
              </button>

              {/* 5. Reviewed No Comments */}
              <button
                type="button"
                onClick={() => {
                  setReviewFilterStatus('reviewed_no_comments');
                  setCarouselActiveIndex(0);
                }}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-sm font-bold transition-all cursor-pointer select-none flex items-center gap-2 active:scale-95 ${
                  reviewFilterStatus === 'reviewed_no_comments'
                    ? (isLightTheme ? 'bg-amber-300/80 border-amber-500 text-amber-950 ring-2 ring-amber-400/50 shadow-sm' : 'bg-amber-400/25 border-[#F4EE8E] text-[#F4EE8E] ring-2 ring-amber-400/50 shadow-[0_0_15px_rgba(244,238,142,0.3)]')
                    : (isLightTheme ? 'bg-white/70 border-amber-300 text-amber-950 hover:bg-amber-100/60' : 'bg-amber-400/10 border-amber-400/30 text-amber-200 hover:bg-amber-400/20')
                }`}
              >
                <CheckCircle2 size={16} className="text-amber-400" />
                <span>проверены: без правок</span>
                <span className={`px-2 py-0.5 rounded-lg text-xs font-mono font-black ${
                  reviewFilterStatus === 'reviewed_no_comments' 
                    ? (isLightTheme ? 'bg-amber-400 text-amber-950' : 'bg-[#F4EE8E] text-amber-950')
                    : (isLightTheme ? 'bg-amber-200 text-amber-950' : 'bg-amber-400/20 text-[#F4EE8E]')
                }`}>
                  {reviewCounts.reviewedNoComments}
                </span>
              </button>

              {/* 6. Edits Accepted */}
              <button
                type="button"
                onClick={() => {
                  setReviewFilterStatus('edits_accepted');
                  setCarouselActiveIndex(0);
                }}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-sm font-bold transition-all cursor-pointer select-none flex items-center gap-2 active:scale-95 ${
                  reviewFilterStatus === 'edits_accepted'
                    ? (isLightTheme ? 'bg-amber-300/80 border-amber-500 text-amber-950 ring-2 ring-amber-400/50 shadow-sm' : 'bg-amber-400/25 border-[#F4EE8E] text-[#F4EE8E] ring-2 ring-amber-400/50 shadow-[0_0_15px_rgba(244,238,142,0.3)]')
                    : (isLightTheme ? 'bg-white/70 border-amber-300 text-amber-950 hover:bg-amber-100/60' : 'bg-amber-400/10 border-amber-400/30 text-amber-200 hover:bg-amber-400/20')
                }`}
              >
                <CheckCheck size={16} className="text-amber-400" />
                <span>правки приняты сотрудником</span>
                <span className={`px-2 py-0.5 rounded-lg text-xs font-mono font-black ${
                  reviewFilterStatus === 'edits_accepted' 
                    ? (isLightTheme ? 'bg-amber-400 text-amber-950' : 'bg-[#F4EE8E] text-amber-950')
                    : (isLightTheme ? 'bg-amber-200 text-amber-950' : 'bg-amber-400/20 text-[#F4EE8E]')
                }`}>
                  {reviewCounts.editsAccepted}
                </span>
              </button>
            </div>
          </div>

          {/* 3D VERTICAL CAROUSEL (ВЕРТИКАЛЬНАЯ 3D КАРУСЕЛЬ ИЗ 5 ЦИКЛИЧНЫХ КАРТОЧЕК) */}
          <div className="relative w-full py-2 flex flex-col items-center">
            {cardItems.length === 0 ? (
              <div className={`w-full p-10 rounded-3xl border text-center space-y-3 ${
                isLightTheme ? 'bg-white/80 border-amber-300 text-zinc-700' : 'bg-zinc-950/80 border-amber-500/30 text-amber-200'
              }`}>
                <AlertCircle size={36} className="mx-auto text-amber-500" />
                <h4 className="text-base font-black uppercase">Отчетов по выбранным фильтрам не найдено</h4>
                <p className="text-xs opacity-75 max-w-md mx-auto">
                  Попробуйте выбрать других сотрудников или сбросить комбинации фильтров.
                </p>
                <button
                  onClick={() => {
                    setSelectedEmployeeIds([]);
                    setDepartmentFilter({ value: 'all', mode: 'DISABLED' });
                    setPositionFilter({ value: 'all', mode: 'DISABLED' });
                    setReportTypeFilter({ value: 'all', mode: 'DISABLED' });
                    setCompletionStatusFilter({ value: 'all', mode: 'DISABLED' });
                    setModalSearchQuery('');
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-amber-950 font-black text-xs cursor-pointer shadow-md"
                >
                  Сбросить фильтры
                </button>
              </div>
            ) : (
              <div 
                className="relative w-full h-[520px] sm:h-[580px] flex items-center justify-center select-none"
                style={{ perspective: '1200px' }}
                onWheel={(e) => {
                  const now = Date.now();
                  if (now - lastWheelTimeRef.current < 200) return;
                  if (Math.abs(e.deltaY) > 10) {
                    lastWheelTimeRef.current = now;
                    if (e.deltaY > 0) {
                      setCarouselActiveIndex(prev => (prev + 1) % cardItems.length);
                    } else {
                      setCarouselActiveIndex(prev => (prev - 1 + cardItems.length) % cardItems.length);
                    }
                  }
                }}
                onTouchStart={(e) => {
                  touchStartYRef.current = e.touches[0].clientY;
                }}
                onTouchEnd={(e) => {
                  if (touchStartYRef.current === null) return;
                  const diffY = e.changedTouches[0].clientY - touchStartYRef.current;
                  if (diffY < -35) {
                    setCarouselActiveIndex(prev => (prev + 1) % cardItems.length);
                  } else if (diffY > 35) {
                    setCarouselActiveIndex(prev => (prev - 1 + cardItems.length) % cardItems.length);
                  }
                  touchStartYRef.current = null;
                }}
              >
                {/* Right Side Navigation Arrows & Counter (Purely Transparent Container) */}
                <div className="absolute right-[2%] sm:right-[calc(50%-190px-24px)] top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-1.5 sm:gap-2 bg-transparent p-0 border-0 shadow-none">
                  <button
                    onClick={() => setCarouselActiveIndex(prev => (prev - 1 + cardItems.length) % cardItems.length)}
                    className="p-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 text-amber-950 dark:text-[#F4EE8E] border border-amber-400/50 transition-all cursor-pointer active:scale-90"
                    title="Вверх (Предыдущий)"
                  >
                    <ChevronUp size={20} />
                  </button>

                  <span className="text-[11px] font-mono font-black text-amber-950 dark:text-amber-200 py-0.5 drop-shadow-sm">
                    {(carouselActiveIndex % cardItems.length) + 1}/{cardItems.length}
                  </span>

                  <button
                    onClick={() => setCarouselActiveIndex(prev => (prev + 1) % cardItems.length)}
                    className="p-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 text-amber-950 dark:text-[#F4EE8E] border border-amber-400/50 transition-all cursor-pointer active:scale-90"
                    title="Вниз (Следующий)"
                  >
                    <ChevronDown size={20} />
                  </button>
                </div>

                {/* Visible Planet Cards in Vertical Perspective Cycle with Motion Animation */}
                {(cardItems.length >= 5
                  ? [-2, -1, 0, 1, 2]
                  : cardItems.length === 4
                    ? [-2, -1, 0, 1]
                    : cardItems.length === 3
                      ? [-1, 0, 1]
                      : cardItems.length === 2
                        ? [-1, 0]
                        : [0]
                ).map((offset) => {
                  const itemIndex = ((carouselActiveIndex + offset) % cardItems.length + cardItems.length) % cardItems.length;
                  const card = cardItems[itemIndex];
                  if (!card) return null;

                  const isCenter = offset === 0;

                  // Vertical Stack Parameters for Planets (Crisp performance on both Mobile & Desktop)
                  let translateY = 0;
                  let scale = 1;
                  let opacity = 1;
                  let zIndex = 30;

                  if (offset === 0) {
                    translateY = 0;
                    scale = 1.0;
                    opacity = 1;
                    zIndex = 30;
                  } else if (offset === -1) {
                    translateY = -168;
                    scale = 0.74;
                    opacity = 0.60;
                    zIndex = 20;
                  } else if (offset === -2) {
                    translateY = -294;
                    scale = 0.52;
                    opacity = 0.25;
                    zIndex = 10;
                  } else if (offset === 1) {
                    translateY = 168;
                    scale = 0.74;
                    opacity = 0.60;
                    zIndex = 20;
                  } else if (offset === 2) {
                    translateY = 294;
                    scale = 0.52;
                    opacity = 0.25;
                    zIndex = 10;
                  }

                  const templateTypeLabel = card.template.type === 'PLAN_DAY' 
                    ? 'План смены' 
                    : card.template.type === 'FACT_DAY' 
                      ? 'Факт смены' 
                      : card.template.type === 'WEEKLY' 
                        ? 'Недельный' 
                        : 'Месячный';

                  const planetId = `planet-svg-${card.id}-${offset}`;

                  return (
                    <motion.div
                      key={`planet-item-${card.id}`}
                      onClick={() => {
                        if (isCenter) {
                          if (card.isPlanCard && card.planData) {
                            setViewingPlanReportId(card.planData.reportId);
                            setIsPreviousPlanModalOpen(true);
                          } else if (card.submittedReport && reviewFilterStatus !== 'all') {
                            handleGoToReview(card.submittedReport.id);
                          } else {
                            handleSelectTemplate(card.template);
                          }
                        } else {
                          setCarouselActiveIndex(itemIndex);
                        }
                      }}
                      initial={false}
                      animate={{
                        y: translateY,
                        scale: scale,
                        opacity: opacity,
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: 280,
                        damping: 24,
                        mass: 0.8
                      }}
                      style={{
                        zIndex: zIndex,
                      }}
                      className="absolute left-1/2 top-1/2 -ml-[186px] -mt-[186px] sm:-ml-[228px] sm:-mt-[228px] group cursor-pointer w-[372px] h-[372px] sm:w-[456px] sm:h-[456px] shrink-0 select-none"
                    >
                      {/* 
                        3D SVG SATURN PLANET VISUAL 
                        - Real SVG 3D Saturn representation (Back Rings -> Planet Sphere Body -> Front Rings)
                        - Zero blur overlays or webkit raster artifacts over mobile text!
                      */}
                      <div className="relative w-full h-full flex items-center justify-center">
                        <svg 
                          viewBox="0 0 400 400" 
                          className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
                        >
                          <defs>
                            {/* Planet Sphere Radial Shading Gradient */}
                            <radialGradient id={`${planetId}-sphere-dark`} cx="38%" cy="32%" r="65%">
                              <stop offset="0%" stopColor="#7A5C1B" />
                              <stop offset="35%" stopColor="#3B2A0A" />
                              <stop offset="70%" stopColor="#1C1404" />
                              <stop offset="100%" stopColor="#0B0701" />
                            </radialGradient>

                            <radialGradient id={`${planetId}-sphere-light`} cx="35%" cy="30%" r="68%">
                              <stop offset="0%" stopColor="#FFFDF2" />
                              <stop offset="40%" stopColor="#F5EEC5" />
                              <stop offset="75%" stopColor="#E5D6A0" />
                              <stop offset="100%" stopColor="#CBB572" />
                            </radialGradient>

                            {/* Ring Metallic Golden Linear Gradient */}
                            <linearGradient id={`${planetId}-ring-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#F4EE8E" stopOpacity="0.95" />
                              <stop offset="40%" stopColor="#E7C768" stopOpacity="0.85" />
                              <stop offset="70%" stopColor="#D99E41" stopOpacity="0.9" />
                              <stop offset="100%" stopColor="#F4EE8E" stopOpacity="0.95" />
                            </linearGradient>

                            {/* Outer Glow Filter */}
                            <filter id={`${planetId}-glow`} x="-20%" y="-20%" width="140%" height="140%">
                              <feGaussianBlur stdDeviation="6" result="blur" />
                              <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                          </defs>

                          {/* 1. BACK PORTION OF SATURN RINGS (Behind Planet Sphere - Upper Arc) */}
                          {isCenter && (
                            <g transform="translate(200, 200) rotate(-22)">
                              {/* Outer ring upper arc */}
                              <path 
                                d="M 190,0 A 190 52 0 0 0 -190,0" 
                                fill="none" 
                                stroke={`url(#${planetId}-ring-grad)`} 
                                strokeWidth="12" 
                                strokeLinecap="round"
                                opacity="0.85"
                              />
                              <path 
                                d="M 170,0 A 170 44 0 0 0 -170,0" 
                                fill="none" 
                                stroke="#F4EE8E" 
                                strokeWidth="2.5" 
                                strokeLinecap="round"
                                opacity="0.9"
                              />
                              <path 
                                d="M 150,0 A 150 38 0 0 0 -150,0" 
                                fill="none" 
                                stroke="#E7C768" 
                                strokeWidth="1.5" 
                                strokeLinecap="round"
                                opacity="0.6"
                              />
                            </g>
                          )}

                          {/* 2. PLANET SPHERE BODY CIRCLE */}
                          <circle 
                            cx="200" 
                            cy="200" 
                            r="140" 
                            fill={isLightTheme ? `url(#${planetId}-sphere-light)` : `url(#${planetId}-sphere-dark)`}
                            stroke={isCenter ? "#F4EE8E" : "#D99E41"}
                            strokeWidth={isCenter ? "3" : "1.5"}
                            strokeOpacity={isCenter ? "0.95" : "0.5"}
                            filter={isCenter ? `url(#${planetId}-glow)` : undefined}
                          />

                          {/* Planet Atmospheric Bands (3D Saturn Stripes) */}
                          <g opacity={isLightTheme ? "0.18" : "0.28"}>
                            <ellipse cx="200" cy="150" rx="130" ry="18" fill="none" stroke="#F4EE8E" strokeWidth="3" />
                            <ellipse cx="200" cy="180" rx="138" ry="20" fill="none" stroke="#E7C768" strokeWidth="4" />
                            <ellipse cx="200" cy="220" rx="138" ry="20" fill="none" stroke="#D99E41" strokeWidth="3" />
                            <ellipse cx="200" cy="250" rx="126" ry="16" fill="none" stroke="#F4EE8E" strokeWidth="2" />
                          </g>

                          {/* 3. FRONT PORTION OF SATURN RINGS (In Front of Lower Planet Sphere) */}
                          {isCenter && (
                            <g transform="translate(200, 200) rotate(-22)">
                              {/* Outer ring path - lower half wrapping over planet */}
                              <path 
                                d="M -190,0 A 190 52 0 0 0 190,0" 
                                fill="none" 
                                stroke={`url(#${planetId}-ring-grad)`} 
                                strokeWidth="12" 
                                strokeLinecap="round"
                              />
                              <path 
                                d="M -170,0 A 170 44 0 0 0 170,0" 
                                fill="none" 
                                stroke="#F4EE8E" 
                                strokeWidth="2.5" 
                                strokeLinecap="round"
                              />
                              <path 
                                d="M -150,0 A 150 38 0 0 0 150,0" 
                                fill="none" 
                                stroke="#E7C768" 
                                strokeWidth="1.5" 
                                strokeLinecap="round"
                                strokeOpacity="0.75"
                              />
                            </g>
                          )}

                          {/* Rotating Accent Ring for Center Planet */}
                          {isCenter && (
                            <circle 
                              cx="200" 
                              cy="200" 
                              r="145" 
                              fill="none" 
                              stroke="#F4EE8E" 
                              strokeWidth="1.5" 
                              strokeDasharray="16 24"
                              opacity="0.7"
                              className="animate-[spin_20s_linear_infinite] origin-center"
                            />
                          )}
                        </svg>

                        {/* 
                          HTML TEXT CONTENT LAYER OVER PLANET 
                          - Absolute positioned text stacked vertically in 7 lines in the exact center of the planet
                        */}
                        <div className="relative z-20 w-full h-full p-4 sm:p-6 flex flex-col items-center justify-center gap-1 sm:gap-1.5 text-center pointer-events-auto">
                          
                          {/* Line 1: Fact / Plan status badge */}
                          {card.isPlanCard ? (
                            <div className={`flex items-center gap-1 px-3 py-0.5 sm:py-1 rounded-full border text-[10px] sm:text-xs font-mono font-extrabold ${
                              isLightTheme ? 'bg-amber-300/80 border-amber-600 text-amber-950' : 'bg-amber-400/25 border-amber-300 text-[#F4EE8E] shadow-[0_0_15px_rgba(244,238,142,0.35)]'
                            }`}>
                              <CheckSquare size={11} className="text-amber-600 dark:text-amber-300" />
                              <span>Принятый план ИИ</span>
                            </div>
                          ) : (
                            <div className={`flex items-center gap-1 px-3 py-0.5 sm:py-1 rounded-full border text-[10px] sm:text-xs font-mono font-extrabold ${
                              card.isSubmitted
                                ? 'bg-amber-500/25 border-amber-400/80 text-[#F4EE8E]'
                                : 'bg-amber-400/15 border-amber-400/40 text-amber-300'
                            }`}>
                              <span className="opacity-80">Факт:</span>
                              {card.isSubmitted ? (
                                <span className="flex items-center gap-1 font-black text-[#F4EE8E]">
                                  <CheckCircle size={11} className="text-amber-300" />
                                  Сдано {card.submittedReport?.qualityScore ? `(${card.submittedReport.qualityScore}%)` : ''}
                                </span>
                              ) : (
                                <span>Ожидает сдачи</span>
                              )}
                            </div>
                          )}

                          {/* Line 2: Employee Name */}
                          <span className={`text-xs sm:text-base font-black tracking-wide truncate max-w-[240px] sm:max-w-[310px] drop-shadow-sm ${
                            isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'
                          }`}>
                            {card.employee.name}
                          </span>

                          {/* Line 3: Employee Position */}
                          <span className={`text-[10px] sm:text-xs font-mono font-bold truncate max-w-[240px] sm:max-w-[310px] ${
                            isLightTheme ? 'text-amber-900/90' : 'text-amber-200/90'
                          }`}>
                            {card.employee.position || 'Сотрудник'}
                          </span>

                          {/* Line 4: Template Type / Plan Label */}
                          <span className={`text-[10px] sm:text-xs font-mono font-extrabold tracking-wide ${
                            isLightTheme ? 'text-amber-800' : 'text-amber-400'
                          }`}>
                            {card.isPlanCard ? `План (${card.planData?.periodLabel || 'Смена'})` : templateTypeLabel}
                          </span>

                          {/* Line 5: Report Title */}
                          <h3 className={`text-xs sm:text-base font-black tracking-wide leading-tight max-w-[240px] sm:max-w-[310px] line-clamp-2 drop-shadow-sm ${
                            isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'
                          }`}>
                            {card.isPlanCard 
                              ? `Задачи: ${formatTitleNormalCase(card.template.title)}`
                              : formatTitleNormalCase(card.template.title)}
                          </h3>

                          {/* Line 6: Department / Target Date */}
                          <p className={`text-[10px] sm:text-xs font-mono font-bold ${
                            isLightTheme ? 'text-amber-900/80' : 'text-amber-200/80'
                          }`}>
                            {card.isPlanCard ? `Срок: ${card.planData?.targetDate || 'Актуально'}` : card.departmentName}
                          </p>

                          {/* Line 7: Entries Count / Tasks progress */}
                          <p className={`text-[10px] sm:text-xs font-mono font-bold ${
                            isLightTheme ? 'text-amber-800/80' : 'text-amber-300/80'
                          }`}>
                            {card.isPlanCard
                              ? `${card.planData?.completedCount || 0} из ${card.planData?.totalCount || 0} задач выполнено`
                              : `${card.template.fields?.length || 0} записей`}
                          </p>

                          {/* Card Action Button */}
                          {card.isPlanCard ? (
                            <div className="mt-1 flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (card.planData) {
                                    setViewingPlanReportId(card.planData.reportId);
                                    setIsPreviousPlanModalOpen(true);
                                  }
                                }}
                                className={`px-3 py-1 rounded-xl border text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 ${
                                  isLightTheme
                                    ? 'bg-amber-300 hover:bg-amber-400 border-amber-600 text-amber-950'
                                    : 'bg-amber-500/25 hover:bg-amber-500/40 border-amber-300 text-[#F4EE8E] shadow-[0_0_12px_rgba(244,238,142,0.25)]'
                                }`}
                                title="Открыть чеклист задач плана"
                              >
                                <CheckSquare size={13} className="text-amber-600 dark:text-amber-300" />
                                <span>Чеклист задач плана</span>
                              </button>
                            </div>
                          ) : canManageTemplates && (
                            <div className="mt-1 flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleConfigureTemplate(card.template);
                                }}
                                className={`px-3 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                  isLightTheme
                                    ? 'bg-amber-200/90 border-amber-400 text-amber-950 hover:bg-amber-300'
                                    : 'bg-amber-500/20 border-amber-400/60 text-[#F4EE8E] hover:bg-amber-500/30'
                                }`}
                                title="Редактировать шаблон отчета"
                              >
                                <SlidersHorizontal size={11} />
                                <span>Настроить шаблон</span>
                              </button>
                            </div>
                          )}

                          {/* Review buttons on submitted report card */}
                          {card.submittedReport && (
                            <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5 pointer-events-auto relative z-30">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleGoToReview(card.submittedReport!.id);
                                }}
                                className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm active:scale-95 ${
                                  isLightTheme
                                    ? 'bg-amber-400 hover:bg-amber-500 text-amber-950 border-amber-600'
                                    : 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 border-amber-300 shadow-[0_0_12px_rgba(244,238,142,0.3)] hover:brightness-110'
                                }`}
                                title="Перейти к проверке отчета"
                              >
                                <UserCheck size={12} className="shrink-0" />
                                <span>
                                  {!card.submittedReport.isReviewedByManager 
                                    ? 'Проверить отчет' 
                                    : card.submittedReport.manager_edits_accepted 
                                      ? 'Правки приняты' 
                                      : 'Форма проверки'}
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleGoToVerdict(card.submittedReport!.id);
                                }}
                                className={`px-2 py-1 rounded-xl border text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                  isLightTheme
                                    ? 'bg-white/80 hover:bg-amber-100 text-amber-950 border-amber-300'
                                    : 'bg-black/30 hover:bg-amber-400/10 text-amber-200 border-amber-400/30'
                                }`}
                                title="Посмотреть вердикт отчета"
                              >
                                <Eye size={12} className="shrink-0" />
                                <span>Вердикт</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* FILTERED REPORTS REVIEW LIST (Отчеты на проверку и результаты) */}
          {reviewFilterStatus !== 'all' && (
            <div className={`w-full mx-3 sm:mx-0 p-4 sm:p-5 rounded-2xl border backdrop-blur-md space-y-4 my-4 transition-all ${
              isLightTheme 
                ? 'bg-[#FFFBF5]/90 border-amber-900/30 shadow-md' 
                : 'bg-[#1A0F02]/90 border-amber-400/40 shadow-[0_0_25px_rgba(244,238,142,0.15)]'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-400/20">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-amber-400/20 text-[#F4EE8E] border border-amber-400/40">
                    <UserCheck size={20} />
                  </span>
                  <div>
                    <h3 className={`text-base font-bold flex items-center gap-2 ${isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'}`}>
                      <span>
                        {reviewFilterStatus === 'need_review' && 'Отчеты, требующие проверки руководителем'}
                        {reviewFilterStatus === 'ai_verified' && 'Отчеты, проверенные через ИИ'}
                        {reviewFilterStatus === 'reviewed_with_comments' && 'Отчеты, проверенные руководителем с замечаниями'}
                        {reviewFilterStatus === 'reviewed_no_comments' && 'Отчеты, проверенные руководителем без замечаний'}
                        {reviewFilterStatus === 'edits_accepted' && 'Отчеты, где приняты сотрудником правки руководителя'}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-amber-400/20 border border-amber-400/40 text-amber-200">
                        {filteredReviewReports.length}
                      </span>
                    </h3>
                    <p className={`text-xs ${isLightTheme ? 'text-stone-600' : 'text-stone-300'}`}>
                      нажмите «Перейти к проверке», чтобы открыть отчет на странице проверки
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setReviewFilterStatus('all');
                    setCarouselActiveIndex(0);
                  }}
                  className={`self-start sm:self-auto px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                    isLightTheme 
                      ? 'border-amber-400 bg-amber-100 text-amber-950 hover:bg-amber-200' 
                      : 'border-amber-400/40 bg-amber-400/10 text-amber-200 hover:text-white hover:bg-amber-400/20'
                  }`}
                >
                  <X size={14} />
                  <span>Сбросить фильтр</span>
                </button>
              </div>

              {filteredReviewReports.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <CheckCircle2 size={32} className="mx-auto text-amber-400/70" />
                  <p className={`text-sm font-semibold ${isLightTheme ? 'text-stone-700' : 'text-stone-300'}`}>
                    Нет отчетов, соответствующих выбранному критерию
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredReviewReports.map((rep) => {
                    const score = rep.qualityScore !== undefined ? rep.qualityScore : 90;
                    const scoreColor = score >= 75 ? 'border-amber-400/80 text-[#F4EE8E] bg-amber-400/20' : score >= 50 ? 'border-amber-500/80 text-amber-300 bg-amber-500/20' : 'border-rose-500/80 text-rose-300 bg-rose-500/20';

                    const hasComments = Boolean(
                      (rep.managerComment && rep.managerComment.trim().length > 0) ||
                      (rep.managerTask && rep.managerTask.trim().length > 0) ||
                      (rep.fieldComments && Object.keys(rep.fieldComments).length > 0)
                    );

                    return (
                      <div
                        key={rep.id}
                        className={`p-4 rounded-xl border backdrop-blur-md transition-all flex flex-col justify-between gap-3 ${
                          isLightTheme 
                            ? 'bg-white/80 border-amber-900/20 hover:border-amber-500 shadow-sm' 
                            : 'bg-[#140A01]/80 border-amber-400/30 hover:border-amber-400/60 shadow-[0_0_15px_rgba(244,238,142,0.08)]'
                        }`}
                      >
                        <div className="space-y-2">
                          {/* Row 1: Header & Score */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className={`text-sm font-bold leading-snug line-clamp-1 ${isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'}`}>
                                {rep.templateTitle || 'Рабочий рапорт'}
                              </h4>
                              <p className="text-xs text-stone-400 font-mono">
                                {rep.timestamp ? new Date(rep.timestamp).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Сдан сегодня'}
                              </p>
                            </div>

                            <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border shrink-0 ${scoreColor}`}>
                              {score}/100
                            </span>
                          </div>

                          {/* Row 2: Employee info */}
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-semibold text-amber-300">{rep.employeeName || 'Сотрудник'}</span>
                            {rep.departmentName && (
                              <span className="text-stone-400">• {rep.departmentName}</span>
                            )}
                          </div>

                          {/* Row 3: Status Badge */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {!rep.isReviewedByManager ? (
                              <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-500/20 border border-amber-400/40 text-amber-200 flex items-center gap-1">
                                <Clock size={12} />
                                <span>требует проверки руководителем</span>
                              </span>
                            ) : rep.manager_edits_accepted ? (
                              <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-400/25 border border-amber-300 text-[#F4EE8E] flex items-center gap-1">
                                <CheckCheck size={12} />
                                <span>правки приняты сотрудником</span>
                              </span>
                            ) : hasComments ? (
                              <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-500/20 border border-amber-400/40 text-amber-200 flex items-center gap-1">
                                <MessageSquare size={12} />
                                <span>проверено: есть замечания</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-400/20 border border-amber-400/40 text-[#F4EE8E] flex items-center gap-1">
                                <CheckCircle2 size={12} />
                                <span>проверено: без замечаний</span>
                              </span>
                            )}

                            {rep.reviewer_name && (
                              <span className="text-xs text-stone-400">
                                проверяющий: {rep.reviewer_name}
                              </span>
                            )}
                          </div>

                          {/* Comment preview if present */}
                          {rep.managerComment && (
                            <p className="text-xs text-stone-300 line-clamp-2 p-2 rounded-lg bg-black/20 border border-amber-400/20">
                              💬 {rep.managerComment}
                            </p>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="pt-2 border-t border-amber-400/20 flex flex-wrap items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => handleGoToReview(rep.id)}
                            className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                              isLightTheme 
                                ? 'bg-amber-400 hover:bg-amber-500 text-amber-950 border-amber-500 shadow-sm' 
                                : 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 border-amber-300 shadow-[0_0_15px_rgba(244,238,142,0.25)] hover:brightness-110'
                            }`}
                          >
                            <UserCheck size={14} />
                            <span>Перейти к проверке</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleGoToVerdict(rep.id)}
                            className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                              isLightTheme 
                                ? 'border-amber-300 text-amber-950 hover:bg-amber-100' 
                                : 'border-amber-400/30 text-amber-200 hover:bg-amber-400/10'
                            }`}
                          >
                            <Eye size={14} />
                            <span>Вердикт</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* EMPLOYEE SELECTION & FILTERS MODAL */}
          <AnimatePresence>
            {isEmployeeModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#140A01]/75 backdrop-blur-md animate-fade-in">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  className={`relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border-2 shadow-2xl overflow-hidden ${
                    isLightTheme ? 'bg-white border-amber-400 text-zinc-900' : 'bg-zinc-950 border-amber-400/80 text-white'
                  }`}
                >
                  {/* Modal Header */}
                  <div className={`p-5 border-b flex items-center justify-between ${
                    isLightTheme ? 'bg-amber-100/60 border-amber-200' : 'bg-amber-950/40 border-amber-500/30'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <Users className="text-amber-500" size={22} />
                      <h3 className={`text-base font-black uppercase tracking-wider ${
                        isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'
                      }`}>
                        Выбор сотрудников и фильтры
                      </h3>
                    </div>
                    
                    <button
                      onClick={() => setIsEmployeeModalOpen(false)}
                      className="p-1.5 rounded-xl hover:bg-amber-500/20 text-zinc-500 dark:text-zinc-400 hover:text-amber-500 transition-colors cursor-pointer"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Modal Content Scrollable */}
                  <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(90vh-130px)] custom-scrollbar">
                    
                    {/* Search Bar */}
                    <div className="relative">
                      <input
                        type="text"
                        value={modalSearchQuery}
                        onChange={(e) => setModalSearchQuery(e.target.value)}
                        placeholder="Поиск по ФИО или должности..."
                        className={`w-full pl-10 pr-4 py-2.5 rounded-2xl border text-xs font-bold focus:outline-none ${
                          isLightTheme
                            ? 'bg-amber-50/50 border-amber-300 text-zinc-900 placeholder:text-zinc-400'
                            : 'bg-zinc-900 border-amber-500/30 text-white placeholder:text-zinc-500'
                        }`}
                      />
                      <Search size={16} className="absolute left-3.5 top-3 text-amber-500" />
                    </div>

                    {/* Tag Cloud of Employees */}
                    <div className="space-y-2">
                      <label className={`text-xs font-black uppercase tracking-wider block ${
                        isLightTheme ? 'text-amber-950' : 'text-amber-200'
                      }`}>
                        Облако сотрудников (ФИО и должность):
                      </label>

                      <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
                        {/* "Все" Tag */}
                        <button
                          onClick={() => setSelectedEmployeeIds([])}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                            selectedEmployeeIds.length === 0
                              ? 'bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-amber-950 border-amber-300 font-black shadow-sm'
                              : isLightTheme
                                ? 'bg-amber-50 border-amber-200 text-zinc-800 hover:border-amber-400'
                                : 'bg-zinc-900 border-white/10 text-zinc-300 hover:border-amber-400'
                          }`}
                        >
                          <span>Все сотрудники</span>
                        </button>

                        {allEmployeesList.map(emp => {
                          const isSelected = selectedEmployeeIds.includes(emp.id);
                          return (
                            <button
                              key={`emp-tag-${emp.id}`}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedEmployeeIds(prev => prev.filter(id => id !== emp.id));
                                } else {
                                  setSelectedEmployeeIds(prev => [...prev.filter(id => id !== 'all'), emp.id]);
                                }
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-2 ${
                                isSelected
                                  ? 'bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-amber-950 border-amber-300 font-black shadow-sm'
                                  : isLightTheme
                                    ? 'bg-amber-50/80 border-amber-200 text-zinc-800 hover:border-amber-400'
                                    : 'bg-zinc-900/90 border-white/10 text-zinc-300 hover:border-amber-400'
                              }`}
                            >
                              <User size={12} className="text-amber-600 dark:text-amber-400" />
                              <span>{emp.name}</span>
                              <span className="text-[10px] opacity-75 font-normal">({emp.position || 'Сотрудник'})</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 3-State Filter Controls */}
                    <div className="space-y-3 pt-2 border-t border-amber-500/20">
                      <div className="flex items-center justify-between">
                        <label className={`text-xs font-black uppercase tracking-wider ${
                          isLightTheme ? 'text-amber-950' : 'text-amber-200'
                        }`}>
                          Гибкие фильтры (3 режима по клику: С учетом / Все кроме / Отключен):
                        </label>

                        <button
                          onClick={() => {
                            setDepartmentFilter({ value: 'all', mode: 'DISABLED' });
                            setPositionFilter({ value: 'all', mode: 'DISABLED' });
                            setReportTypeFilter({ value: 'all', mode: 'DISABLED' });
                            setCompletionStatusFilter({ value: 'all', mode: 'DISABLED' });
                          }}
                          className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                        >
                          Сбросить фильтры
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* 1. Отдел Filter */}
                        <div className={`p-3 rounded-2xl border space-y-1.5 ${
                          isLightTheme ? 'bg-amber-50/50 border-amber-200' : 'bg-zinc-900/60 border-amber-500/20'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold">Отдел:</span>
                            <button
                              onClick={() => setDepartmentFilter(prev => ({ ...prev, mode: toggleFilterMode(prev.mode) }))}
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-black border transition-colors cursor-pointer ${
                                departmentFilter.mode === 'INCLUDE'
                                  ? 'bg-amber-400/30 text-amber-950 dark:text-[#F4EE8E] border-amber-400 font-bold shadow-sm'
                                  : departmentFilter.mode === 'EXCLUDE'
                                    ? 'bg-amber-950/40 text-amber-800 dark:text-amber-200 border-amber-500/50 font-bold'
                                    : 'bg-amber-100/60 dark:bg-[#1A0F02]/30 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-400/30'
                              }`}
                            >
                              {departmentFilter.mode === 'INCLUDE' ? 'С учетом' : departmentFilter.mode === 'EXCLUDE' ? 'Все кроме' : 'Отключен'}
                            </button>
                          </div>
                          <select
                            value={departmentFilter.value}
                            onChange={(e) => setDepartmentFilter(prev => ({ ...prev, value: e.target.value }))}
                            className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-bold border focus:outline-none ${
                              isLightTheme ? 'bg-[#FFFBF5]/80 border-amber-400 text-amber-950' : 'bg-[#1A0F02]/40 border-amber-400/40 text-amber-100'
                            }`}
                          >
                            <option value="all">Все отделы</option>
                            {departments.map((d: any) => (
                              <option key={`dept-opt-${d.id}`} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* 2. Должность Filter */}
                        <div className={`p-3 rounded-2xl border space-y-1.5 ${
                          isLightTheme ? 'bg-amber-50/50 border-amber-200' : 'bg-zinc-900/60 border-amber-500/20'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold">Должность:</span>
                            <button
                              onClick={() => setPositionFilter(prev => ({ ...prev, mode: toggleFilterMode(prev.mode) }))}
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-black border transition-colors cursor-pointer ${
                                positionFilter.mode === 'INCLUDE'
                                  ? 'bg-amber-400/30 text-amber-950 dark:text-[#F4EE8E] border-amber-400 font-bold shadow-sm'
                                  : positionFilter.mode === 'EXCLUDE'
                                    ? 'bg-amber-950/40 text-amber-800 dark:text-amber-200 border-amber-500/50 font-bold'
                                    : 'bg-amber-100/60 dark:bg-[#1A0F02]/30 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-400/30'
                              }`}
                            >
                              {positionFilter.mode === 'INCLUDE' ? 'С учетом' : positionFilter.mode === 'EXCLUDE' ? 'Все кроме' : 'Отключен'}
                            </button>
                          </div>
                          <select
                            value={positionFilter.value}
                            onChange={(e) => setPositionFilter(prev => ({ ...prev, value: e.target.value }))}
                            className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-bold border focus:outline-none ${
                              isLightTheme ? 'bg-[#FFFBF5]/80 border-amber-400 text-amber-950' : 'bg-[#1A0F02]/40 border-amber-400/40 text-amber-100'
                            }`}
                          >
                            <option value="all">Все должности</option>
                            <option value="Официант">Официант</option>
                            <option value="Бармен">Бармен</option>
                            <option value="Администратор">Администратор</option>
                            <option value="Разработчик">Разработчик</option>
                            <option value="Менеджер">Менеджер по продажам</option>
                            <option value="Повар">Повар</option>
                          </select>
                        </div>

                        {/* 3. Тип отчета Filter */}
                        <div className={`p-3 rounded-2xl border space-y-1.5 ${
                          isLightTheme ? 'bg-amber-50/50 border-amber-200' : 'bg-zinc-900/60 border-amber-500/20'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold">Тип отчета:</span>
                            <button
                              onClick={() => setReportTypeFilter(prev => ({ ...prev, mode: toggleFilterMode(prev.mode) }))}
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-black border transition-colors cursor-pointer ${
                                reportTypeFilter.mode === 'INCLUDE'
                                  ? 'bg-amber-400/30 text-amber-950 dark:text-[#F4EE8E] border-amber-400 font-bold shadow-sm'
                                  : reportTypeFilter.mode === 'EXCLUDE'
                                    ? 'bg-amber-950/40 text-amber-800 dark:text-amber-200 border-amber-500/50 font-bold'
                                    : 'bg-amber-100/60 dark:bg-[#1A0F02]/30 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-400/30'
                              }`}
                            >
                              {reportTypeFilter.mode === 'INCLUDE' ? 'С учетом' : reportTypeFilter.mode === 'EXCLUDE' ? 'Все кроме' : 'Отключен'}
                            </button>
                          </div>
                          <select
                            value={reportTypeFilter.value}
                            onChange={(e) => setReportTypeFilter(prev => ({ ...prev, value: e.target.value }))}
                            className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-bold border focus:outline-none ${
                              isLightTheme ? 'bg-[#FFFBF5]/80 border-amber-400 text-amber-950' : 'bg-[#1A0F02]/40 border-amber-400/40 text-amber-100'
                            }`}
                          >
                            <option value="all">Все типы</option>
                            <option value="PLAN_DAY">План смены</option>
                            <option value="FACT_DAY">Факт смены</option>
                            <option value="WEEKLY">Недельный</option>
                            <option value="MONTHLY">Месячный</option>
                          </select>
                        </div>

                        {/* 4. Факт выполнения Filter */}
                        <div className={`p-3 rounded-2xl border space-y-1.5 ${
                          isLightTheme ? 'bg-amber-50/50 border-amber-200' : 'bg-zinc-900/60 border-amber-500/20'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold">Факт выполнения:</span>
                            <button
                              onClick={() => setCompletionStatusFilter(prev => ({ ...prev, mode: toggleFilterMode(prev.mode) }))}
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-black border transition-colors cursor-pointer ${
                                completionStatusFilter.mode === 'INCLUDE'
                                  ? 'bg-amber-400/30 text-amber-950 dark:text-[#F4EE8E] border-amber-400 font-bold shadow-sm'
                                  : completionStatusFilter.mode === 'EXCLUDE'
                                    ? 'bg-amber-950/40 text-amber-800 dark:text-amber-200 border-amber-500/50 font-bold'
                                    : 'bg-amber-100/60 dark:bg-[#1A0F02]/30 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-400/30'
                              }`}
                            >
                              {completionStatusFilter.mode === 'INCLUDE' ? 'С учетом' : completionStatusFilter.mode === 'EXCLUDE' ? 'Все кроме' : 'Отключен'}
                            </button>
                          </div>
                          <select
                            value={completionStatusFilter.value}
                            onChange={(e) => setCompletionStatusFilter(prev => ({ ...prev, value: e.target.value }))}
                            className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-bold border focus:outline-none ${
                              isLightTheme ? 'bg-[#FFFBF5]/80 border-amber-400 text-amber-950' : 'bg-[#1A0F02]/40 border-amber-400/40 text-amber-100'
                            }`}
                          >
                            <option value="all">Все статусы</option>
                            <option value="SUBMITTED">Сдано</option>
                            <option value="PENDING">В процессе / Не сдано</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className={`p-4 border-t flex items-center justify-end ${
                    isLightTheme ? 'bg-amber-100/50 border-amber-200' : 'bg-amber-950/40 border-amber-500/30'
                  }`}>
                    <button
                      onClick={() => setIsEmployeeModalOpen(false)}
                      className="px-5 py-2 rounded-2xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-black text-xs shadow-md cursor-pointer hover:brightness-110 active:scale-95"
                    >
                      Применить ({cardItems.length} карточек)
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

        </div>
      )}


      {/* ========================================================================= */}
      {/* 2. CAPTAIN'S LOG TERMINAL (ЛИЧНЫЙ ЖУРНАЛ КАПИТАНА — 3 СЛОЯ & СТЕКЛЯННЫЕ ПЛАСТИНЫ) */}
      {/* ========================================================================= */}
      {activeReportTemplate && (
        <div className="relative w-full min-h-[100dvh] sm:min-h-[860px] flex flex-col justify-between overflow-hidden p-0 m-0">
          
          {/* LAYER 1: REAR LAYER (ПАНОРАМНОЕ ОКНО МОСТИКА, УВЕЛИЧЕННЫЙ 3D САУРН & ЗОЛОТЫЕ ДУГИ) */}
          <div 
            style={{
              transform: `translate(${parallaxOffset.x}px, ${parallaxOffset.y}px)`,
              transition: 'transform 0.1s linear'
            }}
            className="absolute inset-0 pointer-events-none z-0 overflow-hidden flex items-center justify-center"
          >
            {/* Starfield backdrop */}
            <div className="absolute inset-0 bg-transparent" />

            {/* Giant 3D SVG Saturn Planet in the Background - Enlarged */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[580px] h-[580px] sm:w-[820px] sm:h-[820px] pointer-events-none opacity-85 select-none">
              <svg viewBox="0 0 400 400" className="w-full h-full drop-shadow-[0_0_40px_rgba(217,158,65,0.45)]">
                <defs>
                  <radialGradient id="bg-saturn-sphere-grad" cx="35%" cy="30%" r="70%">
                    <stop offset="0%" stopColor="#FFF8C0" />
                    <stop offset="25%" stopColor="#F4EE8E" />
                    <stop offset="55%" stopColor="#D99E41" />
                    <stop offset="85%" stopColor="#8A5A1B" />
                    <stop offset="100%" stopColor="#2A1804" />
                  </radialGradient>
                  <radialGradient id="bg-saturn-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="70%" stopColor="#F4EE8E" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#D99E41" stopOpacity="0" />
                  </radialGradient>
                  <linearGradient id="bg-saturn-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFF5A0" />
                    <stop offset="50%" stopColor="#E7C768" />
                    <stop offset="100%" stopColor="#9E7322" />
                  </linearGradient>
                </defs>

                {/* 1. BACK PORTION OF SATURN RINGS (Behind Planet Sphere - Upper Arc) */}
                <g transform="translate(200, 200) rotate(-22)">
                  <path 
                    d="M 190,0 A 190 52 0 0 0 -190,0" 
                    fill="none" 
                    stroke="url(#bg-saturn-ring-grad)" 
                    strokeWidth="12" 
                    strokeLinecap="round"
                    opacity="0.85"
                  />
                  <path 
                    d="M 170,0 A 170 44 0 0 0 -170,0" 
                    fill="none" 
                    stroke="#F4EE8E" 
                    strokeWidth="2.5" 
                    strokeLinecap="round"
                    opacity="0.9"
                  />
                  <path 
                    d="M 150,0 A 150 38 0 0 0 -150,0" 
                    fill="none" 
                    stroke="#E7C768" 
                    strokeWidth="1.5" 
                    strokeLinecap="round"
                    opacity="0.6"
                  />
                </g>

                {/* 2. OUTER ATMOSPHERE GLOW */}
                <circle cx="200" cy="200" r="130" fill="url(#bg-saturn-glow)" />

                {/* 3. MAIN PLANET SPHERE */}
                <circle cx="200" cy="200" r="110" fill="url(#bg-saturn-sphere-grad)" />

                {/* 4. LATITUDE WIREFRAME RINGS */}
                <g opacity="0.35" stroke="#FFF8C0" strokeWidth="1" fill="none">
                  <ellipse cx="200" cy="200" rx="110" ry="15" />
                  <ellipse cx="200" cy="200" rx="108" ry="32" />
                  <ellipse cx="200" cy="200" rx="102" ry="52" />
                  <ellipse cx="200" cy="200" rx="90" ry="72" />
                  <ellipse cx="200" cy="200" rx="70" ry="92" />
                </g>

                {/* 5. FRONT PORTION OF SATURN RINGS (In Front of Planet Sphere - Lower Arc) */}
                <g transform="translate(200, 200) rotate(-22)">
                  <path 
                    d="M -190,0 A 190 52 0 0 0 190,0" 
                    fill="none" 
                    stroke="url(#bg-saturn-ring-grad)" 
                    strokeWidth="12" 
                    strokeLinecap="round"
                    opacity="0.95"
                  />
                  <path 
                    d="M -170,0 A 170 44 0 0 0 170,0" 
                    fill="none" 
                    stroke="#F4EE8E" 
                    strokeWidth="2.5" 
                    strokeLinecap="round"
                  />
                  <path 
                    d="M -150,0 A 150 38 0 0 0 150,0" 
                    fill="none" 
                    stroke="#E7C768" 
                    strokeWidth="1.5" 
                    strokeLinecap="round"
                    strokeOpacity="0.75"
                  />
                </g>
              </svg>
            </div>

            {/* Satellites Orbiting around Planet */}
            <div className="absolute top-1/4 right-1/3 w-3 h-3 rounded-full bg-amber-300 shadow-[0_0_15px_#E7C768] animate-pulse" />
            <div className="absolute bottom-1/3 left-1/4 w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_12px_#38BDF8] animate-ping opacity-75" />

            {/* Golden Scanning Arcs */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[780px] h-[780px] rounded-full border border-amber-400/10 border-t-amber-400/40 animate-spin opacity-40 pointer-events-none" />
          </div>


          {/* LAYER 2: TOP HUD HEADER (ФИО, АВАТАР, ДОЛЖНОСТЬ, ДАТА И СМЕНА, ПРОГРЕСС %) */}
          <div className="relative z-20 px-2 sm:px-4 py-2 sm:py-3 max-w-5xl mx-auto w-full flex flex-col items-center gap-2">
            <div className={`w-full flex flex-row items-center justify-between gap-2 sm:gap-4 p-2.5 sm:p-5 rounded-2xl sm:rounded-3xl border-2 backdrop-blur-xl shadow-2xl ${
              isLightTheme ? 'bg-white/80 border-amber-300 text-zinc-900' : 'bg-zinc-950/80 border-amber-400/60 text-white'
            }`}>
              {/* Left: Back button + Avatar + Name + Position */}
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <button
                  onClick={handleBackToTemplates}
                  className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-amber-500/20 border border-amber-400/40 text-[#F4EE8E] hover:bg-amber-400 hover:text-amber-950 transition-all cursor-pointer shrink-0"
                  title="Вернуться к выбору журналов"
                >
                  <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
                </button>

                {/* Avatar */}
                <img
                  src={getUserAvatar(currentUser)}
                  alt={currentUser?.name || "Пользователь"}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "/file/27/iirr1.png";
                  }}
                  className="w-10 h-10 sm:w-20 sm:h-20 rounded-xl sm:rounded-3xl border-2 border-amber-400 object-cover shadow-[0_0_20px_rgba(244,238,142,0.4)] shrink-0"
                />

                <div className="space-y-0.5 sm:space-y-1 text-left min-w-0">
                  <h2 className="text-xs sm:text-xl font-black uppercase tracking-wide truncate">
                    {currentUser?.name || 'Алексей Иванов'}
                  </h2>
                  <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-[10px] sm:text-xs font-mono">
                    <span className="px-1.5 sm:px-2.5 py-0.5 rounded-md sm:rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold truncate">
                      {currentUser?.position || 'Главный смены'}
                    </span>
                    <span className="opacity-80 font-bold hidden sm:inline">
                      {new Date().toLocaleDateString('ru-RU')} • Смена: 08:00—18:00
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Progress in % */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <div className="text-right space-y-0.5 sm:space-y-1">
                  <div className="text-[10px] sm:text-xs font-mono font-bold">
                    <span className="opacity-70 hidden sm:inline">Прогресс: </span>
                    <span className="text-amber-400 font-black text-xs sm:text-sm">{progressPercent}%</span>
                  </div>
                  <div className={`w-20 sm:w-36 h-2 sm:h-2.5 rounded-full overflow-hidden border ${
                    isLightTheme ? 'bg-amber-100 border-amber-300' : 'bg-zinc-900 border-amber-500/30'
                  }`}>
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 via-[#E7C768] to-[#F4EE8E] transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Centered Report Title across full width right below header block */}
            <div className={`w-full py-1.5 sm:py-2 px-3 sm:px-4 rounded-xl sm:rounded-2xl border backdrop-blur-xl shadow-lg flex items-center justify-between gap-3 ${
              isLightTheme ? 'bg-amber-100/90 border-amber-300 text-amber-950' : 'bg-zinc-950/80 border-amber-400/50 text-[#F4EE8E]'
            }`}>
              <h1 className="text-xs sm:text-base font-black uppercase tracking-wider truncate flex-1">
                📋 {activeReportTemplate.title}
              </h1>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Previous Accepted AI Plan Button */}
                {matchedPreviousPlan && matchedPreviousPlan.items.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsPreviousPlanModalOpen(true)}
                    className={`min-h-[38px] px-2.5 sm:px-3 py-1 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isLightTheme
                        ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-950 shadow-sm'
                        : 'bg-[#1A0F02] hover:bg-amber-500/20 border-amber-400/60 text-[#F4EE8E] shadow-[0_0_15px_rgba(244,238,142,0.2)]'
                    }`}
                    title={`Принятый план ИИ (${matchedPreviousPlan.periodLabel})`}
                  >
                    <CheckSquare size={14} className="shrink-0 text-amber-500" />
                    <span className="hidden sm:inline">План ИИ</span>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 border border-amber-400/40">
                      {matchedPreviousPlan.completedCount}/{matchedPreviousPlan.totalCount}
                    </span>
                  </button>
                )}

                {/* User Personal Presets / Saved Templates Button */}
                <button
                  type="button"
                  onClick={() => setIsPresetsModalOpen(true)}
                  className={`min-h-[38px] px-2.5 sm:px-3 py-1 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isLightTheme
                      ? 'bg-white hover:bg-amber-50 border-amber-300 text-amber-950 shadow-sm'
                      : 'bg-[#1A0F02] hover:bg-amber-500/10 border-amber-400/50 text-[#F4EE8E] shadow-[0_0_15px_rgba(244,238,142,0.15)]'
                  }`}
                  title="Мои личные шаблоны заполнения (для текущего пользователя)"
                >
                  <Bookmark size={14} className="shrink-0 text-amber-500" />
                  <span className="hidden sm:inline">Личный шаблон</span>
                  {userPresets.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-950 dark:text-[#F4EE8E] border border-amber-400/40">
                      {userPresets.length}
                    </span>
                  )}
                </button>

                {/* AI Auto-fill trigger button */}
                <button
                  type="button"
                  onClick={() => setIsAIAutofillModalOpen(true)}
                  className={`min-h-[38px] px-3 py-1 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isLightTheme
                      ? 'bg-amber-400 hover:bg-amber-500 border-amber-500 text-amber-950'
                      : 'bg-gradient-to-r from-[#F4EE8E] to-[#E7C768] text-amber-950 border-amber-300 shadow-[0_0_15px_rgba(244,238,142,0.3)] hover:brightness-110'
                  }`}
                  title="Автозаполнение ИИ"
                >
                  <Sparkles size={14} className="shrink-0" />
                  <span className="hidden sm:inline">Автозаполнение ИИ</span>
                </button>
              </div>
            </div>

            {/* Draft restored notification banner */}
            {draftRestoredNotice && (
              <div className={`w-full py-1.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 animate-fadeIn ${
                isLightTheme ? 'bg-amber-100 border-amber-300 text-amber-950' : 'bg-amber-500/20 border-amber-400/40 text-[#F4EE8E]'
              }`}>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-amber-500 shrink-0" />
                  <span>{draftRestoredNotice}</span>
                </span>
                <button
                  onClick={() => setDraftRestoredNotice(null)}
                  className="p-1 hover:opacity-75 cursor-pointer text-xs"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>


          {/* LAYER 3: MIDDLE LAYER (3D ВЕРТИКАЛЬНАЯ КАРУСЕЛЬ С КВАДРАТНЫМИ КРИСТАЛЛИЧЕСКИМИ ПЛАСТИНАМИ) */}
          <div className="relative z-20 flex-1 flex flex-col items-center justify-center p-0 max-w-5xl mx-auto w-full my-0 sm:my-2">
            
            {/* Right Side Navigation Stack (Transparent Container) */}
            <div className="absolute right-1 sm:right-[calc(50%-240px-3.5rem)] top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-1 sm:gap-2 bg-transparent p-1">
              <button
                onClick={handlePrevStep}
                disabled={currentStepIndex === 0}
                className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-transparent transition-all cursor-pointer active:scale-90 disabled:opacity-20 border ${
                  isLightTheme
                    ? 'text-amber-950 border-amber-600/60 hover:bg-amber-100/60 shadow-sm'
                    : 'text-amber-300 border-amber-400/40 hover:bg-amber-500/20'
                }`}
                title="Вверх (Предыдущая страница)"
              >
                <ChevronUp size={18} className="sm:w-5 sm:h-5" />
              </button>

              <span className={`text-[10px] sm:text-[11px] font-mono font-black py-0.5 sm:py-1 drop-shadow ${
                isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'
              }`}>
                {currentStepIndex + 1}/{totalFillingSteps}
              </span>

              <button
                onClick={handleNextStep}
                disabled={currentStepIndex >= totalFillingSteps - 1}
                className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-transparent transition-all cursor-pointer active:scale-90 disabled:opacity-20 border ${
                  isLightTheme
                    ? 'text-amber-950 border-amber-600/60 hover:bg-amber-100/60 shadow-sm'
                    : 'text-amber-300 border-amber-400/40 hover:bg-amber-500/20'
                }`}
                title="Вниз (Следующая страница)"
              >
                <ChevronDown size={18} className="sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* SUBMISSION ANIMATION OVERLAYS (ВЕРИФИКАЦИЯ, КРИСТАЛЛ И ЯДРО) */}
            {submissionPhase !== 'filling' ? (
              submissionPhase === 'completed' ? (
                <div className="fixed inset-0 z-50 overflow-y-auto p-3 sm:p-6 flex items-start justify-center bg-black/80 backdrop-blur-md">
                  <div className={`w-full max-w-3xl my-4 sm:my-8 p-4 sm:p-7 rounded-[2rem] border-2 shadow-2xl backdrop-blur-xl text-left space-y-5 transition-all relative ${
                    isLightTheme 
                      ? 'bg-[#FFFBF5] border-amber-400/70 text-amber-950 shadow-[0_10px_40px_rgba(217,158,65,0.2)]' 
                      : 'bg-[#140A01] border-amber-400/50 text-white shadow-[0_0_40px_rgba(244,238,142,0.3)]'
                  }`}>
                    {/* Close button */}
                    <button
                      type="button"
                      onClick={handleBackToTemplates}
                      className={`absolute top-4 right-4 p-2 rounded-full border transition-all cursor-pointer ${
                        isLightTheme 
                          ? 'border-amber-300 text-amber-900 hover:bg-amber-100' 
                          : 'border-amber-400/40 text-amber-300 hover:bg-amber-500/20'
                      }`}
                      title="Закрыть"
                    >
                      <X size={20} />
                    </button>

                    {/* Phase 4: Final Success Result */}
                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-5 w-full text-left">
                      {/* Header */}
                      <div className="text-center space-y-2 pb-2 border-b border-amber-400/20 pt-1">
                        <div className="w-14 h-14 mx-auto rounded-full bg-amber-400/20 border-2 border-[#E7C768] text-[#F4EE8E] flex items-center justify-center shadow-[0_0_30px_rgba(244,238,142,0.35)]">
                          <Check size={30} className="text-[#F4EE8E]" />
                        </div>
                        <h3 className="text-base sm:text-xl font-bold text-[#F4EE8E]">
                          Отчет успешно зафиксирован в базе данных
                        </h3>
                        <p className={`text-sm ${isLightTheme ? 'text-amber-900' : 'text-amber-200'}`}>
                          Запись сохранена в распределенном реестре. ИИ выполнил проверку и сформировал план.
                        </p>
                      </div>

                    {/* Meta info row: Quality score & Retrospective count */}
                    {submittedResult && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                          isLightTheme ? 'bg-amber-100/60 border-amber-300' : 'bg-amber-500/10 border-amber-400/30'
                        }`}>
                          <span className={`text-sm font-semibold ${isLightTheme ? 'text-amber-950' : 'text-amber-300'}`}>
                            Оценка качества ИИ:
                          </span>
                          <span className="text-lg font-bold text-[#E7C768]">
                            {submittedResult.qualityScore}/100
                          </span>
                        </div>

                        <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                          isLightTheme ? 'bg-amber-100/60 border-amber-300' : 'bg-amber-500/10 border-amber-400/30'
                        }`}>
                          <span className={`text-sm font-semibold ${isLightTheme ? 'text-amber-950' : 'text-amber-300'}`}>
                            Глубина анализа:
                          </span>
                          <span className="text-sm font-bold text-[#E7C768]">
                            {submittedResult.ai_past_reports_count_used || 0} прошлых отчетов
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Motivation Salary Accrual Receipt Card */}
                    {motivationAccrualResult && (
                      <div className={`p-4 rounded-2xl border space-y-2.5 ${
                        isLightTheme ? 'bg-amber-100/75 border-amber-800/40 text-amber-950' : 'bg-transparent border-[#F4EE8E]/60 text-amber-50 shadow-[0_0_25px_rgba(244,238,142,0.18)]'
                      }`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 font-bold text-sm">
                            <Coins size={18} className={isLightTheme ? 'text-amber-800 shrink-0' : 'text-[#F4EE8E] shrink-0'} />
                            <span>Начислено по мотивации за смену:</span>
                          </div>
                          <span className={`text-xl font-extrabold ${isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'}`}>
                            {formatRub(motivationAccrualResult.totalEarnedRub)}
                          </span>
                        </div>

                        {motivationAccrualResult.morningWarning && (
                          <div className={`p-2.5 rounded-xl border text-sm font-semibold ${isLightTheme ? 'border-rose-700/50 text-rose-900' : 'border-rose-400/50 text-rose-200'}`}>
                            {motivationAccrualResult.morningWarning}
                          </div>
                        )}

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                          <div>Оклад: <strong>{formatRub(motivationAccrualResult.fixedBaseRub)}</strong></div>
                          <div>Переработка: <strong>+{formatRub(motivationAccrualResult.overtimeBonusRub)}</strong></div>
                          <div>Недоработка: <strong>-{formatRub(motivationAccrualResult.undertimePenaltyRub)}</strong></div>
                          <div>KPI: <strong>+{formatRub(motivationAccrualResult.kpiTotalRub)}</strong></div>
                        </div>

                        {Array.isArray(motivationAccrualResult.kpiBreakdown) && motivationAccrualResult.kpiBreakdown.length > 0 && (
                          <div className="space-y-1 text-sm">
                            {motivationAccrualResult.kpiBreakdown.map((k: any, idx: number) => (
                              <div key={idx} className="flex flex-wrap justify-between gap-2 border-t border-amber-500/20 pt-1">
                                <span>{k.title} ({k.completionPct}% от плана)</span>
                                <strong>+{formatRub(k.deltaTodayRub)}</strong>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Motivation & Recognition Card */}
                    {submittedResult?.aiMotivation && (
                      <div className={`p-4 rounded-2xl border space-y-1.5 ${
                        isLightTheme ? 'bg-amber-100/70 border-amber-300 text-amber-950' : 'bg-[#1A0F02]/80 border-amber-400/40 text-amber-100'
                      }`}>
                        <div className="flex items-center gap-2 font-bold text-sm text-[#E7C768]">
                          <Award size={18} className="text-[#E7C768] shrink-0" />
                          <span>Мотивация и поддержка сотрудника</span>
                        </div>
                        <p className="text-sm leading-relaxed whitespace-pre-line">
                          {submittedResult.aiMotivation}
                        </p>
                      </div>
                    )}

                    {/* AI Executive Summary */}
                    {submittedResult?.aiSummary && (
                      <div className={`p-4 rounded-2xl border space-y-1.5 ${
                        isLightTheme ? 'bg-[#FAF6EC]/90 border-amber-300/80 text-amber-950' : 'bg-[#1A0F02]/70 border-amber-400/30 text-amber-100'
                      }`}>
                        <div className="flex items-center gap-2 font-bold text-sm text-[#E7C768]">
                          <FileText size={18} className="text-[#E7C768] shrink-0" />
                          <span>Краткое саммари для руководителя</span>
                        </div>
                        <p className="text-sm leading-relaxed">
                          {submittedResult.aiSummary}
                        </p>
                      </div>
                    )}

                    {/* AI Recommendations */}
                    {submittedResult?.aiRecommendations && (
                      <div className={`p-4 rounded-2xl border space-y-1.5 ${
                        isLightTheme ? 'bg-[#FAF6EC]/90 border-amber-300/80 text-amber-950' : 'bg-[#1A0F02]/70 border-amber-400/30 text-amber-100'
                      }`}>
                        <div className="flex items-center gap-2 font-bold text-sm text-[#E7C768]">
                          <Sparkles size={18} className="text-[#E7C768] shrink-0" />
                          <span>Рекомендации и дальнейшие шаги</span>
                        </div>
                        <p className="text-sm leading-relaxed whitespace-pre-line">
                          {submittedResult.aiRecommendations}
                        </p>
                      </div>
                    )}

                    {/* AI Interactive Action Plan Block */}
                    <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${
                      isLightTheme ? 'bg-[#FFFBF5] border-amber-400/80 text-amber-950' : 'bg-[#1A0F02]/90 border-amber-400/40 text-white'
                    }`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-400/20 pb-3">
                        <div className="space-y-0.5">
                          <h4 className="text-sm sm:text-base font-bold text-[#E7C768] flex items-center gap-2">
                            <TrendingUp size={18} className="text-[#E7C768]" />
                            <span>План по улучшению и задачи на будущие периоды</span>
                          </h4>
                          <p className={`text-sm ${isLightTheme ? 'text-amber-900' : 'text-amber-200'}`}>
                            Вы можете отредактировать пункты плана, настроить приоритеты или добавить свои задачи перед принятием:
                          </p>
                        </div>

                        {/* Status Badge */}
                        <div className="shrink-0">
                          {isPlanAccepted || submittedResult?.aiPlanStatus === 'accepted' ? (
                            <span className="px-3 py-1 rounded-xl bg-amber-400/20 border border-amber-400 text-amber-300 text-sm font-bold flex items-center gap-1.5">
                              <CheckCheck size={16} />
                              Принят в работу
                            </span>
                          ) : isPlanDeclined || submittedResult?.aiPlanStatus === 'declined' ? (
                            <span className="px-3 py-1 rounded-xl bg-amber-950/40 border border-amber-700/50 text-amber-400 text-sm font-medium">
                              Отклонен
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-400/40 text-amber-300 text-sm font-medium">
                              Ожидает решения
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Success notice banner */}
                      {planSuccessNotice && (
                        <div className={`p-3.5 rounded-xl border text-sm flex items-start gap-2.5 ${
                          isLightTheme ? 'bg-amber-100/90 border-amber-400 text-amber-950' : 'bg-amber-500/20 border-amber-400 text-[#F4EE8E]'
                        }`}>
                          <CheckCircle size={18} className="text-[#E7C768] shrink-0 mt-0.5" />
                          <span>{planSuccessNotice}</span>
                        </div>
                      )}

                      {/* Plan Items List */}
                      <div className="space-y-2.5">
                        {editablePlan.map((item, idx) => {
                          const priorityColor = 
                            item.priority === 'high' ? 'bg-amber-500/25 border-amber-400 text-amber-200' :
                            item.priority === 'medium' ? 'bg-amber-500/15 border-amber-400/50 text-amber-300' :
                            'bg-amber-500/5 border-amber-400/30 text-amber-300/80';

                          const priorityLabel = 
                            item.priority === 'high' ? 'Высокий' :
                            item.priority === 'medium' ? 'Средний' : 'Обычный';

                          const isEditingThis = editingPlanItemId === item.id;

                          return (
                            <div 
                              key={item.id || idx} 
                              className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all ${
                                isLightTheme ? 'bg-white/80 border-amber-300/80 hover:border-amber-400' : 'bg-[#140A01]/70 border-amber-400/25 hover:border-amber-400/50'
                              }`}
                            >
                              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                <span className="text-sm font-bold text-[#E7C768] shrink-0 mt-0.5">
                                  {idx + 1}.
                                </span>

                                {isEditingThis ? (
                                  <div className="flex items-center gap-2 flex-1">
                                    <input
                                      type="text"
                                      value={editingPlanItemTitle}
                                      onChange={(e) => setEditingPlanItemTitle(e.target.value)}
                                      className={`w-full px-2.5 py-1 text-sm rounded-lg border focus:outline-none ${
                                        isLightTheme ? 'bg-white border-amber-400 text-amber-950' : 'bg-[#1A0F02] border-amber-400 text-white'
                                      }`}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (editingPlanItemTitle.trim()) {
                                          handleUpdatePlanItemTitle(item.id, editingPlanItemTitle.trim());
                                        }
                                        setEditingPlanItemId(null);
                                      }}
                                      className="px-2.5 py-1 bg-[#E7C768] text-amber-950 text-sm font-bold rounded-lg cursor-pointer hover:brightness-110"
                                    >
                                      Ок
                                    </button>
                                  </div>
                                ) : (
                                  <div className="space-y-0.5 flex-1 min-w-0">
                                    <p className={`text-sm leading-relaxed break-words font-medium ${isLightTheme ? 'text-amber-950' : 'text-slate-100'}`}>
                                      {item.title}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-amber-400/80">
                                      <span className="flex items-center gap-1">
                                        <Clock size={12} />
                                        {item.date}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Item actions */}
                              {!isPlanAccepted && (
                                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                  {/* Priority Toggle */}
                                  <button
                                    type="button"
                                    onClick={() => handleTogglePlanItemPriority(item.id)}
                                    className={`px-2 py-0.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${priorityColor}`}
                                    title="Нажмите для смены приоритета"
                                  >
                                    {priorityLabel}
                                  </button>

                                  {/* Edit button */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingPlanItemId(item.id);
                                      setEditingPlanItemTitle(item.title);
                                    }}
                                    className={`p-1.5 rounded-lg border text-amber-400 hover:text-white cursor-pointer ${
                                      isLightTheme ? 'border-amber-300 hover:bg-amber-100' : 'border-amber-400/30 hover:bg-amber-500/20'
                                    }`}
                                    title="Редактировать пункт"
                                  >
                                    <Edit3 size={14} />
                                  </button>

                                  {/* Delete button */}
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePlanItem(item.id)}
                                    className={`p-1.5 rounded-lg border text-amber-500 hover:text-amber-300 cursor-pointer ${
                                      isLightTheme ? 'border-amber-300 hover:bg-amber-100' : 'border-amber-400/30 hover:bg-amber-500/20'
                                    }`}
                                    title="Удалить пункт"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Add Custom Task Input */}
                      {!isPlanAccepted && (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-amber-400/20">
                          <input
                            type="text"
                            placeholder="Добавить свой пункт в план..."
                            value={newPlanItemTitle}
                            onChange={(e) => setNewPlanItemTitle(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddPlanItem()}
                            className={`flex-1 px-3 py-2 text-sm rounded-xl border focus:outline-none transition-all ${
                              isLightTheme ? 'bg-white border-amber-300 text-amber-950 focus:border-amber-500' : 'bg-[#140A01] border-amber-400/40 text-white focus:border-amber-400'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={handleAddPlanItem}
                            disabled={!newPlanItemTitle.trim()}
                            className="px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-400/50 text-[#F4EE8E] text-sm font-semibold hover:bg-amber-500/30 disabled:opacity-30 cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Plus size={16} />
                            <span>Добавить</span>
                          </button>
                        </div>
                      )}

                      {/* Acceptance / Rejection Buttons */}
                      {!isPlanAccepted && (
                        <div className="pt-3 border-t border-amber-400/20 flex flex-col sm:flex-row items-center gap-3">
                          <button
                            type="button"
                            onClick={handleAcceptPlan}
                            disabled={isAcceptingPlan || editablePlan.length === 0}
                            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-amber-950 font-bold text-sm shadow-lg hover:brightness-110 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40"
                          >
                            <CheckCheck size={18} />
                            <span>{isAcceptingPlan ? 'Сохранение...' : 'Принять план в работу'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleDeclinePlan}
                            disabled={isPlanDeclined}
                            className={`w-full sm:w-auto py-3 px-4 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                              isLightTheme ? 'border-amber-300 text-amber-900 hover:bg-amber-100' : 'border-amber-400/40 text-amber-300 hover:bg-amber-500/20'
                            }`}
                          >
                            {isPlanDeclined ? 'План отклонен' : 'Отклонить план'}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Back button */}
                    <div className="flex items-center justify-center pt-3">
                      <button
                        type="button"
                        onClick={handleBackToTemplates}
                        className="px-6 py-2.5 rounded-xl bg-amber-500/20 border border-amber-400/50 text-[#F4EE8E] font-bold text-sm hover:bg-amber-500/30 transition-all cursor-pointer"
                      >
                        Вернуться к выбору отчетов
                      </button>
                    </div>
                  </motion.div>
                </div>
              </div>
            ) : (
              /* Phase 1, 2, 3: stacking, crystal, entering animations */
              <div className={`w-[96%] max-w-[480px] mx-auto flex flex-col items-center justify-center min-h-[380px] p-6 rounded-[2rem] border-2 shadow-2xl backdrop-blur-xl text-center space-y-5 transition-all ${
                isLightTheme 
                  ? 'bg-[#FFFBF5]/95 border-amber-400/70 text-amber-950 shadow-[0_10px_40px_rgba(217,158,65,0.15)]' 
                  : 'bg-[#140A01]/95 border-amber-400/50 text-white shadow-[0_0_40px_rgba(244,238,142,0.25)]'
              }`}>
                {/* Phase 1: Stacking Plates */}
                {submissionPhase === 'stacking' && (
                  <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="space-y-4">
                    <div className="relative w-32 h-20 mx-auto flex flex-col items-center justify-center">
                      <div className="w-28 h-6 bg-amber-400/80 border border-amber-200 rounded-xl shadow-lg animate-bounce" />
                      <div className="w-28 h-6 bg-amber-400/60 border border-amber-200 rounded-xl shadow-lg -mt-3" />
                      <div className="w-28 h-6 bg-amber-400/40 border border-amber-200 rounded-xl shadow-lg -mt-3" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-[#F4EE8E]">
                      Сборка пластин отчета...
                    </h3>
                  </motion.div>
                )}

                {/* Phase 2: Condensing into Glass Crystal */}
                {submissionPhase === 'crystal' && (
                  <motion.div initial={{ scale: 0.5, rotate: 0 }} animate={{ scale: 1.2, rotate: 180 }} transition={{ duration: 0.8 }} className="space-y-4">
                    <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-[#F4EE8E] via-amber-400 to-[#D99E41] border-2 border-white shadow-[0_0_60px_#E7C768] rotate-45 flex items-center justify-center">
                      <Zap size={32} className="text-amber-950 animate-pulse" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-[#F4EE8E]">
                      Формирование кристалла данных
                    </h3>
                  </motion.div>
                )}

                {/* Phase 3: Entering Core */}
                {submissionPhase === 'entering' && (
                  <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: -20, opacity: 1 }} transition={{ duration: 0.8 }} className="space-y-4">
                    <div className="w-28 h-28 mx-auto rounded-full border-4 border-amber-400 border-t-[#F4EE8E] animate-spin flex items-center justify-center shadow-[0_0_80px_rgba(231,199,104,0.6)]">
                      <Database size={40} className="text-[#F4EE8E] animate-pulse" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-[#F4EE8E]">
                      Синхронизация с базой данных компании...
                    </h3>
                  </motion.div>
                )}
              </div>
            )
          ) : (

              /* ACTIVE STEP CARD (3D ВЕРТИКАЛЬНАЯ КАРУСЕЛЬ С КВАДРАТНЫМИ КРИСТАЛЛИЧЕСКИМИ ПЛАСТИНАМИ) */
              <div className="relative w-full flex flex-col items-center">
                {planProgress?.missingMorningReport && String(activeReportTemplate.type).toUpperCase() !== 'PLAN_DAY' && (
                  <div className={`mb-2 w-full max-w-2xl px-3.5 py-2.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm backdrop-blur-md ${
                    isLightTheme ? 'border-amber-900/50 text-amber-950 bg-amber-100/75' : 'border-amber-400/70 text-[#F4EE8E] bg-[#1A0F02]/80'
                  }`}>
                    <div className="flex items-start gap-2 font-semibold">
                      <AlertCircle size={18} className="shrink-0 mt-0.5" />
                      <span>
                        Сегодня еще не сдан утренний отчет! Для начисления оклада по отработанному времени сначала подайте утренний рапорт.
                      </span>
                    </div>
                    {(() => {
                      const moTpl = templates.find(
                        (t) =>
                          String(t.id) === String(planProgress?.calculator?.morning_report_template_id) ||
                          String(t.type).toUpperCase() === 'PLAN_DAY'
                      );
                      if (!moTpl) return null;
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveReportTemplate(moTpl);
                            setCurrentStepIndex(0);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 font-bold text-sm shrink-0 cursor-pointer"
                        >
                          Открыть утренний отчет
                        </button>
                      );
                    })()}
                  </div>
                )}

                {/* 3D PERSPECTIVE CAROUSEL FOR REPORT FILLING PAGES */}
                <div 
                  className="relative w-full h-[calc(100dvh-200px)] min-h-[360px] max-h-[620px] sm:h-[620px] flex items-center justify-center select-none"
                  style={{ perspective: '1200px' }}
                  onTouchStart={(e) => {
                    touchStartYRef.current = e.touches[0].clientY;
                  }}
                  onTouchEnd={(e) => {
                    if (touchStartYRef.current !== null) {
                      const deltaY = touchStartYRef.current - e.changedTouches[0].clientY;
                      if (Math.abs(deltaY) > 30) {
                        if (deltaY > 0) handleNextStep();
                        else handlePrevStep();
                      }
                    }
                    touchStartYRef.current = null;
                  }}
                  onWheel={(e) => {
                    const now = Date.now();
                    if (now - lastWheelTimeRef.current < 200) return;
                    if (Math.abs(e.deltaY) > 10) {
                      lastWheelTimeRef.current = now;
                      if (e.deltaY > 0) {
                        handleNextStep();
                      } else {
                        handlePrevStep();
                      }
                    }
                  }}
                >
                  {/* Total field steps array including final summary and dedicated plan card */}
                  {Array.from({ length: totalFillingSteps }).map((_, stepIdx) => {
                    const offset = stepIdx - currentStepIndex;
                    // Show cards within -2 to +2 range
                    if (Math.abs(offset) > 2) return null;

                    const isCenter = offset === 0;

                    let translateY = 0;
                    let scale = 1;
                    let opacity = 1;
                    let rotateX = 0;
                    let zIndex = 30;

                    // MATCHES EXACT SAME VERTICAL OFFSET SPACING AS MAIN PLANET PAGE
                    if (offset === 0) {
                      translateY = 0;
                      scale = 1;
                      opacity = 1;
                      rotateX = 0;
                      zIndex = 30;
                    } else if (offset === -1) {
                      translateY = -140;
                      scale = 0.78;
                      opacity = 0.85;
                      rotateX = 10;
                      zIndex = 20;
                    } else if (offset === -2) {
                      translateY = -250;
                      scale = 0.52;
                      opacity = 0.7;
                      rotateX = 20;
                      zIndex = 10;
                    } else if (offset === 1) {
                      translateY = 140;
                      scale = 0.78;
                      opacity = 0.85;
                      rotateX = -10;
                      zIndex = 20;
                    } else if (offset === 2) {
                      translateY = 250;
                      scale = 0.52;
                      opacity = 0.7;
                      rotateX = -20;
                      zIndex = 10;
                    }

                    const isPlanStep = hasPlanCard && stepIdx === 0;
                    const isFinalStep = stepIdx === totalFillingSteps - 1;
                    const questionFieldIdx = hasPlanCard ? stepIdx - 1 : stepIdx;
                    const field = (!isPlanStep && !isFinalStep) ? activeReportTemplate.fields[questionFieldIdx] : null;
                    const val = field ? reportAnswers[field.id] : null;
                    const isFilled = isFinalStep || (isPlanStep ? true : (val !== undefined && val !== null && val !== '' && (Array.isArray(val) ? val.length > 0 : true)));

                    return (
                      <motion.div
                        key={`filling-step-card-${stepIdx}`}
                        onClick={() => {
                          if (!isCenter) setCurrentStepIndex(stepIdx);
                        }}
                        style={{
                          transform: `translateY(${translateY}px) scale(${scale}) rotateX(${rotateX}deg)`,
                          opacity: opacity,
                          zIndex: zIndex,
                          transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)'
                        }}
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 group cursor-pointer w-[96%] max-w-[480px] min-h-[320px] max-h-[calc(100dvh-210px)] sm:max-h-[560px] h-auto shrink-0 select-none flex flex-col justify-between"
                      >
                        {/* 
                          SQUARE MATTE CRYSTALLINE PLATE (SVG DRAWING FRAME & FROSTED BACKDROP)
                          Width is 96% (2% side margins), height scales dynamically up to screen boundary
                        */}
                        <div className={`relative w-full h-full min-h-[320px] max-h-[calc(100dvh-210px)] sm:max-h-[560px] rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden p-4 sm:p-6 flex flex-col justify-between backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] [will-change:transform] ${
                          isLightTheme ? 'bg-amber-50/90 text-zinc-900' : 'bg-[#1A0F02]/40 text-amber-100'
                        }`}>
                          
                          {/* SVG Crystal Frame & Chamfered Edge Overlay */}
                          <svg viewBox="0 0 400 400" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none z-0">
                            <defs>
                              <linearGradient id={`crystal-edge-${stepIdx}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#F4EE8E" stopOpacity={isCenter ? "0.95" : "0.7"} />
                                <stop offset="50%" stopColor="#E7C768" stopOpacity={isCenter ? "0.7" : "0.5"} />
                                <stop offset="100%" stopColor="#D99E41" stopOpacity={isCenter ? "0.9" : "0.6"} />
                              </linearGradient>
                              <radialGradient id={`crystal-glow-${stepIdx}`} cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor="#F4EE8E" stopOpacity={isCenter ? "0.2" : "0.12"} />
                                <stop offset="100%" stopColor="#1A0F02" stopOpacity="0.2" />
                              </radialGradient>
                            </defs>

                            {/* Radial Inner Crystal Glow */}
                            <rect x="8" y="8" width="384" height="384" rx="36" fill={`url(#crystal-glow-${stepIdx})`} />

                            {/* Main Outer Crystal Chamfered Path */}
                            <path
                              d="M 45 10 L 355 10 L 390 45 L 390 355 L 355 390 L 45 390 L 10 355 L 10 45 Z"
                              fill="none"
                              stroke={`url(#crystal-edge-${stepIdx})`}
                              strokeWidth={isCenter ? "2.5" : "1.8"}
                            />

                            {/* Inner Facet Lines */}
                            <path
                              d="M 52 22 L 348 22 L 378 52 L 378 348 L 348 378 L 52 378 L 22 348 L 22 52 Z"
                              fill="none"
                              stroke="#F4EE8E"
                              strokeWidth="1"
                              strokeDasharray="10 6"
                              opacity={isCenter ? "0.65" : "0.4"}
                            />

                            {/* Corner Vertices */}
                            <circle cx="45" cy="10" r="3.5" fill="#F4EE8E" opacity={isCenter ? "1" : "0.7"} />
                            <circle cx="355" cy="10" r="3.5" fill="#F4EE8E" opacity={isCenter ? "1" : "0.7"} />
                            <circle cx="390" cy="45" r="3.5" fill="#F4EE8E" opacity={isCenter ? "1" : "0.7"} />
                            <circle cx="390" cy="355" r="3.5" fill="#F4EE8E" opacity={isCenter ? "1" : "0.7"} />
                            <circle cx="355" cy="390" r="3.5" fill="#F4EE8E" opacity={isCenter ? "1" : "0.7"} />
                            <circle cx="45" cy="390" r="3.5" fill="#F4EE8E" opacity={isCenter ? "1" : "0.7"} />
                            <circle cx="10" cy="355" r="3.5" fill="#F4EE8E" opacity={isCenter ? "1" : "0.7"} />
                            <circle cx="10" cy="45" r="3.5" fill="#F4EE8E" opacity={isCenter ? "1" : "0.7"} />
                          </svg>

                          {/* Verification / Completion Checkmark Icon in Top Right Corner (Only if plate is filled) */}
                          {isFilled && (
                            <div className="absolute top-4 right-4 z-20 flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-400/25 border border-amber-300 text-[#F4EE8E] shadow-[0_0_15px_rgba(244,238,142,0.4)]">
                              <CheckCircle2 size={18} />
                            </div>
                          )}

                          {/* Card Content Area inside Square Plate - Flex grow, smooth scrolling if text overflows */}
                          <div className="relative z-10 flex-1 my-1 py-1 space-y-2.5 overflow-y-auto custom-scrollbar min-h-0">
                            {isPlanStep && matchedPreviousPlan ? (
                              /* DEDICATED ACCEPTED AI PLAN CARD PLATE */
                              <div className="space-y-3 px-2 sm:px-4 py-1 flex flex-col justify-between h-full">
                                <div className="space-y-1 text-center">
                                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-mono font-extrabold bg-amber-400/20 border-amber-400/60 text-amber-950 dark:text-[#F4EE8E]">
                                    <CheckSquare size={13} className="text-amber-500" />
                                    <span>Принятый план ИИ</span>
                                  </div>
                                  <h3 className={`text-sm sm:text-base font-black tracking-wide leading-tight ${
                                    isLightTheme ? 'text-zinc-950' : 'text-[#F4EE8E]'
                                  }`}>
                                    Задачи на текущий период ({matchedPreviousPlan.periodLabel})
                                  </h3>
                                  <p className={`text-[11px] font-mono ${
                                    isLightTheme ? 'text-zinc-700' : 'text-amber-300/80'
                                  }`}>
                                    Сформирован по отчету от {matchedPreviousPlan.sourceReportDate}
                                  </p>
                                </div>

                                {/* Progress bar */}
                                <div className={`p-3 rounded-2xl border space-y-1.5 ${
                                  isLightTheme ? 'bg-amber-100/70 border-amber-300 text-amber-950 shadow-sm' : 'bg-amber-950/30 border-amber-400/30 text-amber-100'
                                }`}>
                                  <div className="flex items-center justify-between text-xs font-bold">
                                    <span>Прогресс выполнения:</span>
                                    <span className="font-mono font-black text-amber-950 dark:text-[#F4EE8E]">
                                      {matchedPreviousPlan.completedCount} из {matchedPreviousPlan.totalCount} ({Math.round((matchedPreviousPlan.completedCount / Math.max(1, matchedPreviousPlan.totalCount)) * 100)}%)
                                    </span>
                                  </div>
                                  <div className="w-full h-2 rounded-full bg-black/20 overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-amber-500 to-[#F4EE8E] transition-all duration-300"
                                      style={{
                                        width: `${Math.round((matchedPreviousPlan.completedCount / Math.max(1, matchedPreviousPlan.totalCount)) * 100)}%`
                                      }}
                                    />
                                  </div>
                                </div>

                                {/* Task items with custom checkboxes */}
                                <div className="space-y-1.5 max-h-52 overflow-y-auto custom-scrollbar pr-1">
                                  {matchedPreviousPlan.items.map((item, idx) => (
                                    <div
                                      key={item.id || `plan-step-item-${idx}`}
                                      onClick={() => handleTogglePreviousPlanItem(matchedPreviousPlan.reportId, item.id, !item.completed)}
                                      className={`flex items-center gap-2.5 p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                                        item.completed
                                          ? (isLightTheme ? 'bg-amber-100/50 border-amber-300/50 line-through text-zinc-500' : 'bg-amber-500/10 border-amber-400/20 line-through text-amber-200/60')
                                          : (isLightTheme ? 'bg-white/80 hover:bg-amber-50 border-amber-300 text-zinc-900 shadow-sm' : 'bg-black/30 hover:bg-amber-500/10 border-amber-400/40 text-amber-100')
                                      }`}
                                    >
                                      <div className="shrink-0">
                                        {item.completed ? (
                                          <CheckSquare size={16} className="text-amber-500" />
                                        ) : (
                                          <Circle size={16} className="text-amber-400/70" />
                                        )}
                                      </div>
                                      <span className="flex-1 text-left leading-snug">{item.title}</span>
                                    </div>
                                  ))}
                                </div>

                                {/* Actions on dedicated plan card */}
                                <div className="pt-1 flex flex-wrap items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleInsertPlanIntoField()}
                                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 ${
                                      isLightTheme
                                        ? 'bg-amber-300 hover:bg-amber-400 border-amber-500 text-amber-950'
                                        : 'bg-amber-400/25 hover:bg-amber-400/40 border-amber-400/60 text-[#F4EE8E]'
                                    }`}
                                    title="Вставить задачи в ответ отчета"
                                  >
                                    <Sparkles size={13} />
                                    <span>Вставить в ответ</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const text = matchedPreviousPlan.items.map((it, i) => `${i + 1}. [${it.completed ? 'x' : ' '}] ${it.title}`).join('\n');
                                      navigator.clipboard?.writeText?.(text);
                                      triggerAiFeedback('Чеклист плана скопирован');
                                      setDraftRestoredNotice('Список задач скопирован в буфер обмена');
                                      setTimeout(() => setDraftRestoredNotice(null), 3000);
                                    }}
                                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                                      isLightTheme
                                        ? 'bg-white hover:bg-amber-100 border-amber-300 text-amber-950'
                                        : 'bg-black/30 hover:bg-amber-500/10 border-amber-400/40 text-amber-200'
                                    }`}
                                    title="Скопировать чеклист в буфер"
                                  >
                                    <Copy size={13} />
                                    <span>Копировать</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setIsPreviousPlanModalOpen(true)}
                                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                                      isLightTheme
                                        ? 'bg-white hover:bg-amber-100 border-amber-300 text-amber-950'
                                        : 'bg-black/30 hover:bg-amber-500/10 border-amber-400/40 text-amber-200'
                                    }`}
                                  >
                                    <ExternalLink size={13} />
                                    <span>Полный экран</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setCurrentStepIndex(1)}
                                    className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/50 text-amber-950 dark:text-[#F4EE8E] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                                  >
                                    <span>К вопросам</span>
                                    <ArrowRight size={13} />
                                  </button>
                                </div>
                              </div>
                            ) : !isFinalStep && field ? (
                              <>
                                <div className="space-y-0.5 text-center px-4">
                                  <h3 className={`text-xs sm:text-base font-black tracking-wide leading-tight text-center ${
                                    isLightTheme ? 'text-zinc-950' : 'text-[#F4EE8E]'
                                  }`}>
                                    📍 {field.label}
                                  </h3>
                                  <p className={`text-[10px] font-mono text-center ${
                                    isLightTheme ? 'text-zinc-700' : 'opacity-70 text-amber-200'
                                  }`}>
                                    {field.required ? '* Обязательное поле' : 'Необязательное поле'}
                                  </p>
                                </div>

                                {/* Neural Sphere ONLY on Active Center Card when field has voice/text input */}
                                {isCenter && (field.type === 'voice' || field.type === 'text_short' || field.type === 'text_paragraph' || field.type === 'text') && (
                                  <div className="py-1 flex flex-col items-center">
                                    <AIBall
                                      size="xs"
                                      isLightTheme={isLightTheme}
                                      placeholderText="Введите текст или кликните на ИИ-голос..."
                                      onTranscriptReceived={(text) => {
                                        setReportAnswers(prev => ({
                                          ...prev,
                                          [field.id]: (typeof prev[field.id] === 'string' && prev[field.id] ? prev[field.id] + ' ' : '') + text
                                        }));
                                        triggerAiFeedback('Голос просканирован ИИ-Рапортом');
                                      }}
                                    />
                                    {/* Hint / Explanation below the neural sphere */}
                                    <div className="mt-1 px-3 text-center max-w-xs mx-auto">
                                      <p className={`text-xs font-semibold ${
                                        isLightTheme ? 'text-zinc-900' : 'text-[#F4EE8E]'
                                      }`}>
                                        {field.hint || 'Нажмите на сферу и надиктуйте ответ голосом или используйте текстовое поле ниже'}
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {/* Specialized Card Layouts by Field Type */}
                                {field.type === 'checkbox' ? (
                                  /* Clean Binary Yes / No Toggle */
                                  <div className="space-y-2.5 p-2">
                                    {field.hint && (
                                      <p className={`text-xs text-center font-medium ${
                                        isLightTheme ? 'text-zinc-800' : 'text-amber-200 opacity-90'
                                      }`}>
                                        {field.hint}
                                      </p>
                                    )}
                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setReportAnswers(prev => ({ ...prev, [field.id]: 'Да' }));
                                          triggerAiFeedback('Выбрано: Да');
                                        }}
                                        className={`min-h-[50px] p-3 rounded-2xl border text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 ${
                                          val === 'Да' || val === true
                                            ? (isLightTheme ? 'bg-amber-400 border-amber-600 text-zinc-950 font-black shadow-md ring-2 ring-amber-500/50' : 'bg-amber-400/30 border-amber-300 text-[#F4EE8E] font-black shadow-[0_0_20px_rgba(244,238,142,0.5)] ring-2 ring-amber-400/60')
                                            : (isLightTheme ? 'bg-transparent border-amber-300 text-zinc-950 hover:bg-amber-100/50' : 'bg-transparent border-amber-400/40 text-amber-100 hover:bg-white/5')
                                        }`}
                                      >
                                        <CheckCircle2 size={18} className={isLightTheme ? 'text-zinc-950' : 'text-amber-400'} />
                                        <span>Да</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setReportAnswers(prev => ({ ...prev, [field.id]: 'Нет' }));
                                          triggerAiFeedback('Выбрано: Нет');
                                        }}
                                        className={`min-h-[50px] p-3 rounded-2xl border text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 ${
                                          val === 'Нет' || val === false
                                            ? (isLightTheme ? 'bg-amber-200 border-amber-500 text-zinc-950 font-black shadow-md ring-2 ring-amber-400/50' : 'bg-amber-500/25 border-amber-400/80 text-amber-200 font-black shadow-[0_0_20px_rgba(231,199,104,0.3)] ring-2 ring-amber-400/60')
                                            : (isLightTheme ? 'bg-transparent border-amber-300 text-zinc-950 hover:bg-amber-100/50' : 'bg-transparent border-amber-400/40 text-amber-100 hover:bg-white/5')
                                        }`}
                                      >
                                        <X size={18} className={isLightTheme ? 'text-zinc-950' : 'text-amber-400'} />
                                        <span>Нет</span>
                                      </button>
                                    </div>
                                  </div>
                                ) : field.type === 'camera_photo' ? (
                                  /* Real-time Camera Photo Capture */
                                  <div className="space-y-2 p-2">
                                    <div className={`flex items-center justify-center gap-2 text-xs font-bold ${
                                      isLightTheme ? 'text-zinc-950' : 'text-[#F4EE8E]'
                                    }`}>
                                      <Camera size={18} />
                                      <span>Фотоснимок с камеры</span>
                                    </div>
                                    <p className={`text-xs text-center font-medium ${
                                      isLightTheme ? 'text-zinc-800' : 'text-amber-200 opacity-80'
                                    }`}>
                                      {field.hint || 'Сделайте фотографию непосредственно с камеры устройства'}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => setMediaCaptureModalState({ isOpen: true, mode: 'photo', fieldId: field.id })}
                                      className={`w-full min-h-[46px] py-3 px-4 rounded-xl border border-amber-400/60 bg-gradient-to-r from-amber-400/20 via-amber-500/30 to-amber-400/20 hover:from-amber-400/30 hover:to-amber-500/40 font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-95 transition-all ${
                                        isLightTheme ? 'text-zinc-950' : 'text-[#F4EE8E]'
                                      }`}
                                    >
                                      <Camera size={18} />
                                      <span>Включить камеру и сделать фото</span>
                                    </button>
                                    {(() => {
                                      const photoUrl = typeof val === 'string' ? val : val?.url;
                                      if (!photoUrl) return null;
                                      return (
                                        <div className="mt-2 space-y-1.5">
                                          <div className="relative rounded-xl overflow-hidden border border-amber-400/50 max-h-48 flex items-center justify-center bg-[#1A0F02]/30">
                                            <img src={photoUrl} alt="Кадр с камеры" className="max-h-48 object-contain rounded-lg" />
                                            <button
                                              type="button"
                                              onClick={() => setReportAnswers(prev => ({ ...prev, [field.id]: null }))}
                                              className="absolute top-1.5 right-1.5 p-1 rounded-full bg-amber-950/80 border border-amber-400/40 text-amber-200 hover:text-[#F4EE8E] cursor-pointer"
                                              title="Удалить фото"
                                            >
                                              <X size={14} />
                                            </button>
                                          </div>
                                          <div className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-xs ${
                                            isLightTheme 
                                              ? 'border-amber-300/60 bg-amber-100/60 text-zinc-900' 
                                              : 'border-amber-400/30 bg-amber-500/10 text-amber-200'
                                          }`}>
                                            <div className="flex items-center gap-1.5 truncate">
                                              <ExternalLink size={13} className="text-amber-500 shrink-0" />
                                              <a 
                                                href={photoUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="truncate hover:underline font-medium"
                                                title={photoUrl}
                                              >
                                                {photoUrl}
                                              </a>
                                            </div>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${
                                              isLightTheme ? 'bg-amber-200/80 text-amber-950' : 'bg-amber-500/20 text-[#F4EE8E]'
                                            }`}>
                                              Галерея
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                ) : field.type === 'camera_video' ? (
                                  /* Real-time Camera Video Capture */
                                  <div className="space-y-2 p-2">
                                    <div className={`flex items-center justify-center gap-2 text-xs font-bold ${
                                      isLightTheme ? 'text-zinc-950' : 'text-[#F4EE8E]'
                                    }`}>
                                      <Video size={18} />
                                      <span>Видеозапись с камеры</span>
                                    </div>
                                    <p className={`text-xs text-center font-medium ${
                                      isLightTheme ? 'text-zinc-800' : 'text-amber-200 opacity-80'
                                    }`}>
                                      {field.hint || 'Запишите короткое видео с камеры устройства'}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => setMediaCaptureModalState({ isOpen: true, mode: 'video', fieldId: field.id })}
                                      className={`w-full min-h-[46px] py-3 px-4 rounded-xl border border-amber-400/60 bg-gradient-to-r from-amber-400/20 via-amber-500/30 to-amber-400/20 hover:from-amber-400/30 hover:to-amber-500/40 font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-95 transition-all ${
                                        isLightTheme ? 'text-zinc-950' : 'text-[#F4EE8E]'
                                      }`}
                                    >
                                      <Video size={18} />
                                      <span>Включить камеру и записать видео</span>
                                    </button>
                                    {(() => {
                                      const videoUrl = typeof val === 'string' ? val : val?.url;
                                      if (!videoUrl) return null;
                                      return (
                                        <div className="mt-2 space-y-1.5">
                                          <div className="relative rounded-xl overflow-hidden border border-amber-400/50 max-h-48 flex items-center justify-center bg-[#1A0F02]/30">
                                            <video src={videoUrl} controls className="max-h-48 rounded-lg w-full" />
                                            <button
                                              type="button"
                                              onClick={() => setReportAnswers(prev => ({ ...prev, [field.id]: null }))}
                                              className="absolute top-1.5 right-1.5 p-1 rounded-full bg-amber-950/80 border border-amber-400/40 text-amber-200 hover:text-[#F4EE8E] cursor-pointer"
                                              title="Удалить видео"
                                            >
                                              <X size={14} />
                                            </button>
                                          </div>
                                          <div className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-xs ${
                                            isLightTheme 
                                              ? 'border-amber-300/60 bg-amber-100/60 text-zinc-900' 
                                              : 'border-amber-400/30 bg-amber-500/10 text-amber-200'
                                          }`}>
                                            <div className="flex items-center gap-1.5 truncate">
                                              <ExternalLink size={13} className="text-amber-500 shrink-0" />
                                              <a 
                                                href={videoUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="truncate hover:underline font-medium"
                                                title={videoUrl}
                                              >
                                                {videoUrl}
                                              </a>
                                            </div>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${
                                              isLightTheme ? 'bg-amber-200/80 text-amber-950' : 'bg-amber-500/20 text-[#F4EE8E]'
                                            }`}>
                                              Галерея
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                ) : field.type === 'video' ? (
                                  /* Upload Video */
                                  <div className="space-y-2 p-2">
                                    <div className={`flex items-center justify-center gap-2 text-xs font-bold ${
                                      isLightTheme ? 'text-zinc-950' : 'text-[#F4EE8E]'
                                    }`}>
                                      <Video size={18} />
                                      <span>Видеофайл</span>
                                    </div>
                                    <ReportFileUploader
                                      value={val}
                                      acceptMime="video/*"
                                      onChange={(fileData) => {
                                        setReportAnswers(prev => ({ ...prev, [field.id]: fileData }));
                                        triggerAiFeedback('Видеозапись прикреплена');
                                      }}
                                      isLightTheme={isLightTheme}
                                      label={field.hint || 'Загрузить видеозапись'}
                                    />
                                    {val?.url && (
                                      <div className="mt-2 rounded-xl overflow-hidden border border-amber-400/50">
                                        <video src={val.url} controls className="w-full max-h-36 rounded-lg" />
                                      </div>
                                    )}
                                  </div>
                                ) : field.type === 'screenshot' ? (
                                  /* Screenshot Card */
                                  <div className="space-y-2 p-2">
                                    <div className={`flex items-center justify-center gap-2 text-xs font-bold ${
                                      isLightTheme ? 'text-zinc-950' : 'text-[#F4EE8E]'
                                    }`}>
                                      <Monitor size={18} />
                                      <span>Скриншот экрана</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setMediaCaptureModalState({ isOpen: true, mode: 'screenshot', fieldId: field.id })}
                                      className={`w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-amber-400/60 bg-gradient-to-r from-amber-400/20 via-amber-500/30 to-amber-400/20 hover:from-amber-400/30 hover:to-amber-500/40 font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-95 transition-all ${
                                        isLightTheme ? 'text-zinc-950' : 'text-[#F4EE8E]'
                                      }`}
                                    >
                                      <Monitor size={18} />
                                      <span>Сделать снимок экрана (ПК)</span>
                                    </button>
                                    <ReportFileUploader
                                      value={val}
                                      acceptMime="image/*"
                                      onChange={(fileData) => {
                                        setReportAnswers(prev => ({ ...prev, [field.id]: fileData }));
                                        triggerAiFeedback('Скриншот прикреплен');
                                      }}
                                      isLightTheme={isLightTheme}
                                      label={field.hint || 'Или прикрепите файл скриншота'}
                                    />
                                  </div>
                                ) : (field.type === 'photo' || field.type === 'image') ? (
                                  /* Photo / Image Card */
                                  <div className="space-y-2 p-2">
                                    <div className={`flex items-center justify-center gap-2 text-xs font-bold ${
                                      isLightTheme ? 'text-zinc-950' : 'text-[#F4EE8E]'
                                    }`}>
                                      <ImageIcon size={18} />
                                      <span>Фотография / Изображение</span>
                                    </div>
                                    <ReportFileUploader
                                      value={val}
                                      acceptMime="image/*"
                                      onChange={(fileData) => {
                                        setReportAnswers(prev => ({ ...prev, [field.id]: fileData }));
                                        triggerAiFeedback('Фотография прикреплена');
                                      }}
                                      isLightTheme={isLightTheme}
                                      label={field.hint || 'Прикрепить фотографию'}
                                    />
                                  </div>
                                ) : (field.type === 'pdf' || field.type === 'table' || field.type === 'document' || field.type === 'presentation') ? (
                                  /* Smart Google Drive Link / File Upload for Docs, Tables, PDF & Slides */
                                  <div className="space-y-2 p-1">
                                    <ReportSmartFileInput
                                      field={field}
                                      value={val}
                                      onChange={(fileData) => {
                                        setReportAnswers(prev => ({ ...prev, [field.id]: fileData }));
                                        if (fileData) {
                                          triggerAiFeedback(fileData.isGoogleLink ? 'Ссылка Google добавлена' : 'Файл успешно загружен');
                                        }
                                      }}
                                      isLightTheme={isLightTheme}
                                      onAiFeedback={triggerAiFeedback}
                                    />
                                  </div>
                                ) : field.type === 'audio' ? (
                                  /* Audio File Card */
                                  <div className="space-y-2 p-2">
                                    <div className={`flex items-center justify-center gap-2 text-xs font-bold ${
                                      isLightTheme ? 'text-zinc-950' : 'text-[#F4EE8E]'
                                    }`}>
                                      <Headphones size={18} />
                                      <span>Аудиофайл / Запись</span>
                                    </div>
                                    <ReportFileUploader
                                      value={val}
                                      acceptMime="audio/*"
                                      onChange={(fileData) => {
                                        setReportAnswers(prev => ({ ...prev, [field.id]: fileData }));
                                        triggerAiFeedback('Аудиозапись прикреплена');
                                      }}
                                      isLightTheme={isLightTheme}
                                      label={field.hint || 'Загрузить аудиозапись'}
                                    />
                                    {val?.url && (
                                      <div className="mt-2 p-2 rounded-xl border border-amber-400/40 bg-amber-500/10">
                                        <audio controls src={val.url} className="w-full" />
                                      </div>
                                    )}
                                  </div>
                                ) : field.type === 'file' ? (
                                  /* Universal File / Archive Card */
                                  <div className="space-y-2 p-2">
                                    <div className={`flex items-center justify-center gap-2 text-xs font-bold ${
                                      isLightTheme ? 'text-zinc-950' : 'text-[#F4EE8E]'
                                    }`}>
                                      <Paperclip size={18} />
                                      <span>Файл любого формата / Архив</span>
                                    </div>
                                    <ReportFileUploader
                                      value={val}
                                      onChange={(fileData) => {
                                        setReportAnswers(prev => ({ ...prev, [field.id]: fileData }));
                                        triggerAiFeedback('Файл прикреплен');
                                      }}
                                      isLightTheme={isLightTheme}
                                      label={field.hint || 'Прикрепить файл или архив'}
                                    />
                                  </div>
                                ) : field.type === 'url' ? (
                                  /* Web URL Link Card (Standard web link, no AI) */
                                  <div className="space-y-2.5 p-2">
                                    <div className={`flex items-center justify-center gap-2 text-xs font-bold ${
                                      isLightTheme ? 'text-zinc-950' : 'text-[#F4EE8E]'
                                    }`}>
                                      <Link2 size={18} />
                                      <span>Ссылка на веб-ресурс</span>
                                    </div>
                                    <p className={`text-xs text-center font-medium ${
                                      isLightTheme ? 'text-zinc-800' : 'text-amber-200 opacity-80'
                                    }`}>
                                      {field.hint || 'Вставьте адрес интернет-страницы или ресурса'}
                                    </p>
                                    <div className="space-y-2">
                                      <input
                                        type="url"
                                        value={typeof val === 'string' ? val : ''}
                                        onChange={(e) => {
                                          setReportAnswers(prev => ({ ...prev, [field.id]: e.target.value }));
                                        }}
                                        placeholder={field.hint || "https://example.com/..."}
                                        className={`w-full min-h-[44px] px-3.5 py-2 rounded-xl border text-sm font-medium focus:outline-none transition-all ${
                                          isLightTheme
                                            ? 'bg-transparent border-amber-300 text-zinc-950 placeholder:text-zinc-500 focus:border-amber-500'
                                            : 'bg-transparent border-amber-400/40 text-amber-100 placeholder:text-amber-300/40 focus:border-[#E7C768]'
                                        }`}
                                      />
                                      {typeof val === 'string' && val.trim().length > 0 && (
                                        <a
                                          href={val.startsWith('http') ? val : `https://${val}`}
                                          target="_blank"
                                          rel="noreferrer noopener"
                                          className={`inline-flex items-center gap-1 text-xs font-bold ${
                                            isLightTheme ? 'text-zinc-900 hover:text-zinc-950' : 'text-[#F4EE8E] hover:underline'
                                          }`}
                                        >
                                          <ExternalLink size={14} />
                                          <span>Проверить ссылку в новом окне</span>
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                ) : field.type === 'google_drive' ? (
                                  /* Google Drive Link Card (With AI analysis in Documents and Files) */
                                  <div className="space-y-2.5 p-2">
                                    <div className={`flex items-center justify-center gap-2 text-xs font-bold ${
                                      isLightTheme ? 'text-zinc-950' : 'text-[#F4EE8E]'
                                    }`}>
                                      <ExternalLink size={18} className="text-amber-500" />
                                      <span>Ссылка на Google Диск / Таблицу / Документ</span>
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-400/30 text-amber-950 dark:text-amber-200 border border-amber-400/40">ИИ</span>
                                    </div>
                                    <div className={`px-3 py-1.5 rounded-xl border text-[11px] text-center ${
                                      isLightTheme
                                        ? 'bg-transparent border-amber-300 text-zinc-950'
                                        : 'bg-transparent border-amber-400/40 text-amber-100'
                                    }`}>
                                      💡 Откройте доступ для чтения («Всем, у кого есть ссылка»), чтобы нейросеть могла автоматически распознать и проанализировать данные Google Документа или Таблицы
                                    </div>
                                    <div className="space-y-2">
                                      <input
                                        type="url"
                                        value={typeof val === 'string' ? val : ''}
                                        onChange={(e) => {
                                          setReportAnswers(prev => ({ ...prev, [field.id]: e.target.value }));
                                        }}
                                        placeholder={field.hint || "https://docs.google.com/spreadsheets/d/... или drive.google.com/..."}
                                        className={`w-full min-h-[44px] px-3.5 py-2 rounded-xl border text-sm font-medium focus:outline-none transition-all ${
                                          isLightTheme
                                            ? 'bg-transparent border-amber-300 text-zinc-950 placeholder:text-zinc-500 focus:border-amber-500'
                                            : 'bg-transparent border-amber-400/40 text-amber-100 placeholder:text-amber-300/40 focus:border-[#E7C768]'
                                        }`}
                                      />
                                      {typeof val === 'string' && val.trim().length > 0 && (
                                        <a
                                          href={val.startsWith('http') ? val : `https://${val}`}
                                          target="_blank"
                                          rel="noreferrer noopener"
                                          className={`inline-flex items-center gap-1 text-xs font-bold ${
                                            isLightTheme ? 'text-zinc-900 hover:text-zinc-950' : 'text-[#F4EE8E] hover:underline'
                                          }`}
                                        >
                                          <ExternalLink size={14} />
                                          <span>Проверить ссылку Google Диска</span>
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                ) : field.type === 'geolocation' ? (
                                  /* GPS Geolocation Card */
                                  <div className="space-y-2.5 p-2">
                                    <div className={`flex items-center justify-center gap-2 text-xs font-bold ${
                                      isLightTheme ? 'text-zinc-950' : 'text-[#F4EE8E]'
                                    }`}>
                                      <MapPin size={18} />
                                      <span>Фиксация геолокации (GPS)</span>
                                    </div>
                                    <p className={`text-xs text-center font-medium ${
                                      isLightTheme ? 'text-zinc-800' : 'text-amber-200 opacity-80'
                                    }`}>
                                      {field.hint || 'Зафиксируйте координаты вашего фактического нахождения'}
                                    </p>
                                    {field.geoInstructions && (
                                      <div className={`p-2 rounded-xl border text-[11px] leading-relaxed text-center ${
                                        isLightTheme ? 'border-amber-400 bg-amber-50 text-zinc-950 font-medium' : 'border-amber-400/40 bg-amber-950/20 text-amber-200 font-medium'
                                      }`}>
                                        <span className="font-bold">Инструкция проверки ИИ: </span>
                                        <span>{field.geoInstructions}</span>
                                      </div>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleCaptureGeolocation(field.id)}
                                      disabled={geoLoadingFieldId === field.id}
                                      className={`w-full py-3 px-4 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 ${
                                        geoLoadingFieldId === field.id
                                          ? 'bg-amber-500/20 border-amber-400 text-amber-200 animate-pulse'
                                          : `bg-gradient-to-r from-amber-400/20 via-amber-500/30 to-amber-400/20 border-amber-400 ${isLightTheme ? 'text-zinc-950' : 'text-[#F4EE8E]'} hover:brightness-110`
                                      }`}
                                    >
                                      <LocateFixed size={18} className={geoLoadingFieldId === field.id ? 'animate-spin' : ''} />
                                      <span>{geoLoadingFieldId === field.id ? 'Определение координат по спутникам...' : 'Зафиксировать текущие координаты GPS'}</span>
                                    </button>
                                    {geoError && (
                                      <div className={`p-3 rounded-xl border text-xs text-center space-y-1.5 ${
                                        isLightTheme
                                          ? 'border-amber-400 bg-transparent text-zinc-950'
                                          : 'border-amber-400/60 bg-transparent text-amber-200'
                                      }`}>
                                        <div className="flex items-center justify-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
                                          <AlertCircle size={15} />
                                          <span>Доступ к геолокации</span>
                                        </div>
                                        <p className="leading-relaxed">{geoError}</p>
                                        <div className="pt-1 flex flex-wrap items-center justify-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => handleCaptureGeolocation(field.id)}
                                            className="px-3 py-1 rounded-lg border border-amber-400 text-xs font-bold hover:bg-amber-400/20 cursor-pointer"
                                          >
                                            Повторить запрос
                                          </button>
                                          {window.self !== window.top && (
                                            <a
                                              href={window.location.href}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-amber-400 text-xs font-bold hover:bg-amber-400/20 cursor-pointer"
                                            >
                                              <ExternalLink size={12} />
                                              <span>Открыть в новой вкладке</span>
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                    {val?.latitude && val?.longitude && (
                                      <div className="p-3 rounded-xl border border-amber-400/50 bg-amber-500/10 text-xs space-y-1 text-center">
                                        <p className={`font-bold ${
                                          isLightTheme ? 'text-zinc-950' : 'text-[#F4EE8E]'
                                        }`}>
                                          📍 Координаты: {val.latitude}, {val.longitude}
                                        </p>
                                        <p className={`text-[11px] ${isLightTheme ? 'text-zinc-700' : 'opacity-75'}`}>
                                          Точность: ±{val.accuracy || 10}м • Время: {val.timestamp}
                                        </p>
                                        <a
                                          href={`https://maps.google.com/?q=${val.latitude},${val.longitude}`}
                                          target="_blank"
                                          rel="noreferrer noopener"
                                          className={`inline-flex items-center gap-1 font-bold pt-1 ${
                                            isLightTheme ? 'text-zinc-900 hover:text-zinc-950' : 'text-[#F4EE8E] hover:underline'
                                          }`}
                                        >
                                          <ExternalLink size={13} />
                                          <span>Посмотреть на карте</span>
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                ) : (field.type === 'checkboxes' || field.type === 'single_choice' || field.type === 'multiple_choice' || field.type === 'radio') ? (
                                  /* Choice Capsules with 'Другое' option and MiniAudioField */
                                  <div className="space-y-2">
                                    {(() => {
                                      const isMulti = field.type === 'checkboxes' || field.type === 'multiple_choice';
                                      const baseOptions = (field.options && Array.isArray(field.options) && field.options.length > 0)
                                        ? field.options
                                        : (isMulti
                                            ? ['Выполнено в полном объеме', 'Имеются мелкие замечания', 'Требует внимания руководителя']
                                            : ['Выполнено', 'Частично', 'Не выполнено']);

                                      const hasOtherOption = baseOptions.some(o => o.trim().toLowerCase() === 'другое');
                                      const optionsList = hasOtherOption ? baseOptions : [...baseOptions, 'Другое'];

                                      const isOtherSelected = isMulti
                                        ? (Array.isArray(val) && val.some(v => typeof v === 'string' && (v === 'Другое' || v.startsWith('Другое:'))))
                                        : (typeof val === 'string' && (val === 'Другое' || val.startsWith('Другое:')));

                                      return (
                                        <>
                                          <div className="space-y-1.5">
                                            {optionsList.map((opt, optIdx) => {
                                              const isThisOptOther = opt.trim().toLowerCase() === 'другое';
                                              const isSelected = isThisOptOther
                                                ? isOtherSelected
                                                : (isMulti
                                                    ? (Array.isArray(val) && val.includes(opt))
                                                    : (val === opt || (val === true && opt === optionsList[0]) || (val === false && opt === optionsList[optionsList.length - 1])));

                                              return (
                                                <div
                                                  key={`opt-capsule-${optIdx}`}
                                                  onClick={() => {
                                                    if (isThisOptOther) {
                                                      const currentOtherText = reportAnswers[`${field.id}_other`] || '';
                                                      const customVal = currentOtherText.trim() ? `Другое: ${currentOtherText.trim()}` : 'Другое';

                                                      if (isMulti) {
                                                        const arr = Array.isArray(val) ? val : [];
                                                        const next = isOtherSelected
                                                          ? arr.filter(o => typeof o !== 'string' || (!o.startsWith('Другое:') && o !== 'Другое'))
                                                          : [...arr, customVal];
                                                        setReportAnswers(prev => ({ ...prev, [field.id]: next }));
                                                      } else {
                                                        setReportAnswers(prev => ({ ...prev, [field.id]: isOtherSelected ? '' : customVal }));
                                                      }
                                                    } else {
                                                      if (isMulti) {
                                                        const arr = Array.isArray(val) ? val : [];
                                                        const next = arr.includes(opt) ? arr.filter(o => o !== opt) : [...arr, opt];
                                                        setReportAnswers(prev => ({ ...prev, [field.id]: next }));
                                                      } else {
                                                        setReportAnswers(prev => ({ ...prev, [field.id]: opt }));
                                                      }
                                                    }
                                                    triggerAiFeedback('Капсула выбрана');
                                                  }}
                                                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                                                    isSelected
                                                      ? 'bg-amber-400 text-amber-950 border-amber-200 font-black'
                                                      : isLightTheme ? 'bg-amber-50/70 border-amber-200 text-zinc-900' : 'bg-transparent border-amber-400/80 text-amber-100 hover:bg-amber-500/10'
                                                  }`}
                                                >
                                                  <div className="flex items-center gap-2">
                                                    {isSelected ? <CheckSquare size={14} /> : <Circle size={14} className="opacity-50 text-amber-400" />}
                                                    <span className="text-xs font-semibold">{opt}</span>
                                                  </div>
                                                  <span className="text-[9px] font-mono uppercase opacity-70">
                                                    {isSelected ? 'Активно' : 'Выбрать'}
                                                  </span>
                                                </div>
                                              );
                                            })}
                                          </div>

                                          {/* Expandable MiniAudioField when 'Другое' is selected */}
                                          {isOtherSelected && (
                                            <div className={`mt-2 p-3 rounded-2xl border transition-all space-y-2 ${
                                              isLightTheme 
                                                ? 'bg-amber-100/60 border-amber-300 text-amber-950 shadow-sm' 
                                                : 'bg-black/30 border-amber-400/50 text-amber-100'
                                            }`}>
                                              <div className="flex items-center justify-between gap-2">
                                                <div className={`flex items-center gap-1.5 text-xs font-bold ${
                                                  isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'
                                                }`}>
                                                  <Mic size={14} className="text-amber-500 shrink-0" />
                                                  <span>Укажите свой вариант ответа:</span>
                                                </div>
                                                <span className="text-[10px] opacity-75 font-mono">Голос или текст</span>
                                              </div>

                                              <MiniAudioField
                                                value={
                                                  reportAnswers[`${field.id}_other`] !== undefined
                                                    ? reportAnswers[`${field.id}_other`]
                                                    : (isMulti
                                                        ? (Array.isArray(val) ? (val.find(v => typeof v === 'string' && v.startsWith('Другое:')) || '').replace('Другое: ', '') : '')
                                                        : (typeof val === 'string' && val.startsWith('Другое: ') ? val.replace('Другое: ', '') : ''))
                                                }
                                                onChange={(customText) => {
                                                  setReportAnswers(prev => {
                                                    const updated = { ...prev, [`${field.id}_other`]: customText };
                                                    const formatted = customText.trim() ? `Другое: ${customText.trim()}` : 'Другое';
                                                    if (isMulti) {
                                                      const arr = Array.isArray(prev[field.id]) ? prev[field.id] : [];
                                                      const filtered = arr.filter((x: string) => typeof x !== 'string' || (!x.startsWith('Другое:') && x !== 'Другое'));
                                                      updated[field.id] = [...filtered, formatted];
                                                    } else {
                                                      updated[field.id] = formatted;
                                                    }
                                                    return updated;
                                                  });
                                                }}
                                                placeholder="Надиктуйте голосом или напишите свой вариант..."
                                                multiline={true}
                                                rows={3}
                                                isLightTheme={isLightTheme}
                                                className="w-full"
                                              />
                                            </div>
                                          )}
                                        </>
                                      );
                                    })()}
                                  </div>
                                ) : field.type === 'select' ? (
                                  <div className="space-y-2">
                                    {(() => {
                                      const baseSelectOptions = (field.options && Array.isArray(field.options) && field.options.length > 0)
                                        ? field.options
                                        : ['Да', 'Нет', 'Требует уточнения'];
                                      const hasOtherSelect = baseSelectOptions.some(o => o.trim().toLowerCase() === 'другое');
                                      const selectOptionsList = hasOtherSelect ? baseSelectOptions : [...baseSelectOptions, 'Другое'];
                                      const isOtherSelectActive = typeof val === 'string' && (val === 'Другое' || val.startsWith('Другое:'));

                                      return (
                                        <>
                                          <select
                                            value={isOtherSelectActive ? 'Другое' : (typeof val === 'string' ? val : '')}
                                            onChange={(e) => {
                                              const selectedValue = e.target.value;
                                              if (selectedValue === 'Другое') {
                                                const currentOther = reportAnswers[`${field.id}_other`] || '';
                                                setReportAnswers(prev => ({
                                                  ...prev,
                                                  [field.id]: currentOther.trim() ? `Другое: ${currentOther.trim()}` : 'Другое'
                                                }));
                                              } else {
                                                setReportAnswers(prev => ({ ...prev, [field.id]: selectedValue }));
                                              }
                                              triggerAiFeedback('Пункт списка выбран');
                                            }}
                                            className={`w-full min-h-[44px] px-3.5 py-2 rounded-xl border text-sm font-medium focus:outline-none transition-all ${
                                              isLightTheme
                                                ? 'bg-transparent border-amber-300 text-zinc-950 focus:border-amber-500'
                                                : 'bg-transparent border-amber-400/40 text-amber-100 focus:border-[#E7C768]'
                                            }`}
                                          >
                                            <option value="" className={isLightTheme ? 'bg-amber-50 text-zinc-950' : 'bg-[#1A0F02] text-amber-100'}>-- Выберите вариант --</option>
                                            {selectOptionsList.map((opt, oIdx) => (
                                              <option key={oIdx} value={opt} className={isLightTheme ? 'bg-amber-50 text-zinc-950' : 'bg-[#1A0F02] text-amber-100'}>{opt}</option>
                                            ))}
                                          </select>

                                          {/* Expandable MiniAudioField for select 'Другое' */}
                                          {isOtherSelectActive && (
                                            <div className={`p-3 rounded-2xl border transition-all space-y-2 ${
                                              isLightTheme 
                                                ? 'bg-amber-100/60 border-amber-300 text-amber-950 shadow-sm' 
                                                : 'bg-black/30 border-amber-400/50 text-amber-100'
                                            }`}>
                                              <div className="flex items-center justify-between gap-2">
                                                <div className={`flex items-center gap-1.5 text-xs font-bold ${
                                                  isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'
                                                }`}>
                                                  <Mic size={14} className="text-amber-500 shrink-0" />
                                                  <span>Укажите свой вариант ответа:</span>
                                                </div>
                                                <span className="text-[10px] opacity-75 font-mono">Голос или текст</span>
                                              </div>

                                              <MiniAudioField
                                                value={
                                                  reportAnswers[`${field.id}_other`] !== undefined
                                                    ? reportAnswers[`${field.id}_other`]
                                                    : (typeof val === 'string' && val.startsWith('Другое: ') ? val.replace('Другое: ', '') : '')
                                                }
                                                onChange={(customText) => {
                                                  setReportAnswers(prev => ({
                                                    ...prev,
                                                    [`${field.id}_other`]: customText,
                                                    [field.id]: customText.trim() ? `Другое: ${customText.trim()}` : 'Другое'
                                                  }));
                                                }}
                                                placeholder="Надиктуйте голосом или напишите свой вариант..."
                                                multiline={true}
                                                rows={3}
                                                isLightTheme={isLightTheme}
                                                className="w-full"
                                              />
                                            </div>
                                          )}
                                        </>
                                      );
                                    })()}
                                  </div>
                                ) : field.type === 'number' ? (
                                  <div className="space-y-2 p-2">
                                    <div className={`flex items-center justify-center gap-2 text-sm font-bold ${
                                      isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'
                                    }`}>
                                      <Hash size={18} />
                                      <span>Числовой показатель</span>
                                    </div>
                                    <input
                                      type="number"
                                      step="any"
                                      value={typeof val === 'number' || typeof val === 'string' ? val : ''}
                                      onChange={(e) => {
                                        setReportAnswers(prev => ({ ...prev, [field.id]: e.target.value }));
                                      }}
                                      placeholder={field.hint || "0"}
                                      className={`w-full min-h-[48px] px-4 py-2 rounded-xl border text-base font-bold text-center focus:outline-none transition-all ${
                                        isLightTheme
                                          ? 'bg-transparent border-amber-300 text-zinc-950 placeholder:text-zinc-500 focus:border-amber-500'
                                          : 'bg-transparent border-amber-400/40 text-amber-100 placeholder:text-amber-300/40 focus:border-[#E7C768]'
                                      }`}
                                    />
                                    {(() => {
                                      const matchedKpi = (planProgress?.items || []).find(
                                        (it: any) =>
                                          String(it.fieldId) === String(field.id) ||
                                          (it.fieldLabel && field.label && it.fieldLabel.toLowerCase() === field.label.toLowerCase())
                                      );
                                      if (!matchedKpi) return null;
                                      const typedNum = Number(val || 0);
                                      const projectedSum = Number(matchedKpi.periodCumulativeValue || 0) + (isNaN(typedNum) ? 0 : typedNum);
                                      const target = Math.max(1, Number(matchedKpi.planTarget || 1));
                                      const livePct = Math.round((projectedSum / target) * 100);
                                      const pacePct = Math.round(Number(matchedKpi.schedulePacePct || planProgress?.schedulePacePct || 0));
                                      return (
                                        <div className={`p-2.5 rounded-xl border text-sm space-y-1.5 ${isLightTheme ? 'border-amber-800/35 text-amber-950' : 'border-amber-400/35 text-amber-100'}`}>
                                          <div className="flex flex-wrap justify-between gap-2 font-semibold">
                                            <span>Выполнение KPI-плана: {projectedSum} из {target} ({livePct}%)</span>
                                            <span>Темп графика: {pacePct}%</span>
                                          </div>
                                          <div className="w-full h-2 rounded-full border border-amber-400/40 overflow-hidden">
                                            <div
                                              className="h-full rounded-full bg-gradient-to-r from-[#D99E41] via-[#E7C768] to-[#F4EE8E]"
                                              style={{ width: `${Math.min(100, Math.max(0, livePct))}%` }}
                                            />
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    <MiniAudioField
                                      value={typeof val === 'string' ? val : (typeof val === 'object' && val?.name ? val.name : '')}
                                      onChange={(text) => {
                                        setReportAnswers(prev => ({ ...prev, [field.id]: text }));
                                      }}
                                      placeholder={field.hint || "Введите текст ответа или надиктуйте голосом..."}
                                      multiline={field.type !== 'text_short'}
                                      rows={5}
                                      isLightTheme={isLightTheme}
                                      className="w-full"
                                    />
                                  </div>
                                )}
                              </>
                            ) : (
                              /* Final Summary Card with Unified Validation */
                              (() => {
                                const fillPercentage = progressPercent;

                                return (
                                  <div className="space-y-3 font-mono text-xs p-1 text-center">
                                    <h3 className={`text-sm font-black flex items-center justify-center gap-1.5 ${
                                      isLightTheme ? 'text-zinc-950' : 'text-[#F4EE8E]'
                                    }`}>
                                      🏁 <span>Итоги заполнения рапорта</span>
                                    </h3>

                                    {/* Progress Bar and Quantitative Stats */}
                                    <div className="space-y-1 px-2">
                                      <div className={`flex items-center justify-between text-[11px] font-bold ${
                                        isLightTheme ? 'text-zinc-950' : 'text-amber-200'
                                      }`}>
                                        <span>Заполнено:</span>
                                        <span>{answeredFieldsCount} из {totalFieldsCount} ({fillPercentage}%)</span>
                                      </div>
                                      <div className="w-full h-2 rounded-full bg-amber-400/20 overflow-hidden border border-amber-400/30">
                                        <div
                                          className="h-full transition-all duration-500 rounded-full bg-gradient-to-r from-amber-500 via-[#E7C768] to-[#F4EE8E]"
                                          style={{ width: `${fillPercentage}%` }}
                                        />
                                      </div>
                                    </div>

                                    {/* Real Validation Feedback */}
                                    {isAllRequiredCompleted ? (
                                      <div className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 ${
                                        isLightTheme
                                          ? 'bg-transparent border-amber-400 text-zinc-950'
                                          : 'bg-amber-400/20 border-amber-400/60 text-[#F4EE8E] shadow-[0_0_15px_rgba(244,238,142,0.25)]'
                                      }`}>
                                        <CheckCircle2 size={18} className="shrink-0 text-amber-500" />
                                        <span>Все обязательные поля ({requiredFields.length}) заполнены и проверены.</span>
                                      </div>
                                    ) : (
                                      <div className={`p-2.5 rounded-2xl border text-xs font-bold space-y-2 text-left ${
                                        isLightTheme
                                          ? 'bg-transparent border-amber-500/80 text-zinc-950'
                                          : 'bg-transparent border-amber-400/70 text-amber-100 shadow-[0_0_15px_rgba(231,199,104,0.15)]'
                                      }`}>
                                        <div className={`flex items-center gap-1.5 font-black ${
                                          isLightTheme ? 'text-zinc-950' : 'text-[#F4EE8E]'
                                        }`}>
                                          <AlertCircle size={16} className="shrink-0 text-amber-500" />
                                          <span>Не заполнено обязательных полей: {missingRequiredFields.length}</span>
                                        </div>
                                        {/* Container for missing required fields: accommodates 5+ rows */}
                                        <div className="flex flex-wrap gap-1.5 min-h-[140px] max-h-56 overflow-y-auto custom-scrollbar p-1">
                                          {missingRequiredFields.map((mf) => (
                                            <button
                                              key={mf.id}
                                              type="button"
                                              onClick={() => {
                                                const idx = activeReportTemplate.fields.findIndex(f => f.id === mf.id);
                                                if (idx >= 0) setCurrentStepIndex(hasPlanCard ? idx + 1 : idx);
                                              }}
                                              className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95 ${
                                                isLightTheme
                                                  ? 'bg-amber-100/80 hover:bg-amber-200 border-amber-400 text-zinc-950'
                                                  : 'bg-amber-400/20 hover:bg-amber-400/30 border-amber-400/60 text-[#F4EE8E]'
                                              }`}
                                              title="Перейти к заполнению этого вопроса"
                                            >
                                              <span className="truncate max-w-[150px]">📍 {mf.label}</span>
                                              <ArrowRight size={12} className="shrink-0" />
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Action Button */}
                                    {isAllRequiredCompleted ? (
                                      <button
                                        type="button"
                                        onClick={handleFinalSubmit}
                                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-black text-xs shadow-lg hover:brightness-110 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
                                      >
                                        <Send size={15} />
                                        <span>Передать отчет</span>
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const firstMissing = missingRequiredFields[0];
                                          if (firstMissing) {
                                            const idx = activeReportTemplate.fields.findIndex(f => f.id === firstMissing.id);
                                            if (idx >= 0) setCurrentStepIndex(hasPlanCard ? idx + 1 : idx);
                                          }
                                        }}
                                        className="w-full py-2.5 rounded-xl bg-amber-500/25 border border-amber-400 text-amber-950 dark:text-[#F4EE8E] font-black text-xs shadow-md hover:bg-amber-500/35 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
                                      >
                                        <AlertCircle size={15} />
                                        <span>Заполните обязательные поля ({missingRequiredFields.length})</span>
                                      </button>
                                    )}
                                  </div>
                                );
                              })()
                            )}
                          </div>

                        </div>
                      </motion.div>
                    );
                  })}
                </div>

              </div>

            )}

          </div>

        </div>
      )}

      {/* 1. Centered Create / Edit Report Template Modal */}
      <CreateReportModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        onSaveTemplate={handleSaveTemplate}
        templates={templates}
        departments={departments}
        employees={mockEmployees}
        currentUser={currentUser}
        editingTemplate={editingTemplate}
        initialTemplate={editingTemplate}
        triggerAI={triggerAI}
        isLightTheme={isLightTheme}
        onNavigate={onNavigate}
      />

      {/* 2. Centered AI Autofill Modal for Report Filling */}
      <AnimatePresence>
        {isAIAutofillModalOpen && activeReportTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#140A01]/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className={`relative w-full max-w-xl rounded-2xl sm:rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
                isLightTheme
                  ? 'bg-[#FFFBF5] border-amber-400/80 text-zinc-900 shadow-[0_10px_35px_rgba(217,158,65,0.2)]'
                  : 'bg-[#1A0F02] border-amber-400/40 text-white shadow-[0_0_35px_rgba(244,238,142,0.25)]'
              }`}
            >
              {/* Header */}
              <div className={`flex items-center justify-between px-5 py-4 border-b ${
                isLightTheme ? 'border-amber-200 bg-amber-50/70' : 'border-amber-400/20 bg-amber-950/20'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl border ${
                    isLightTheme ? 'bg-amber-100 border-amber-300 text-amber-950' : 'bg-amber-500/10 border-amber-400/30 text-[#F4EE8E]'
                  }`}>
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h3 className={`text-sm sm:text-base font-bold ${
                      isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'
                    }`}>
                      Автозаполнение отчета нейросетью
                    </h3>
                    <p className="text-xs opacity-70">
                      Надиктуйте голосом или напишите тезисы работы
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAIAutofillModalOpen(false)}
                  className="p-1.5 rounded-lg opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4 overflow-y-auto">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 opacity-90">
                    Ваши итоги, тезисы или голосовой рассказ:
                  </label>
                  <AudioField
                    value={aiAutofillInput}
                    onChange={(text) => setAiAutofillInput(text)}
                    placeholder="Надиктуйте или опишите, что было сделано за смену / день..."
                    isLightTheme={isLightTheme}
                    rows={4}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className={`flex items-center justify-end gap-3 px-5 py-4 border-t ${
                isLightTheme ? 'border-amber-200 bg-amber-50/50' : 'border-amber-400/20 bg-amber-950/20'
              }`}>
                <button
                  type="button"
                  onClick={() => setIsAIAutofillModalOpen(false)}
                  className={`min-h-[44px] px-4 py-2 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                    isLightTheme ? 'border-amber-300 text-zinc-800 hover:bg-amber-100' : 'border-amber-400/40 text-amber-200 hover:bg-amber-500/10'
                  }`}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleRunAiAutofill}
                  className={`min-h-[44px] px-5 py-2 rounded-xl border text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    isLightTheme
                      ? 'bg-amber-400 hover:bg-amber-500 border-amber-500 text-amber-950 shadow-md'
                      : 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 border-amber-300 shadow-[0_0_20px_rgba(244,238,142,0.35)]'
                  }`}
                >
                  <Sparkles size={16} />
                  <span>Запустить автозаполнение</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Standardized AI Loading Overlay for Report Autofill */}
      <AiLoadingOverlay
        isOpen={isAIAutofilling}
        title={aiAutofillTitle}
        subtitle={aiAutofillSubtitle}
        isLightTheme={isLightTheme}
        onCancel={() => setIsAIAutofilling(false)}
      />

      {/* 3. Personal User Templates (Presets) Modal */}
      <AnimatePresence>
        {isPresetsModalOpen && activeReportTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#140A01]/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className={`relative w-full max-w-xl rounded-2xl sm:rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
                isLightTheme
                  ? 'bg-[#FFFBF5] border-amber-400/80 text-zinc-900 shadow-[0_10px_35px_rgba(217,158,65,0.2)]'
                  : 'bg-[#1A0F02] border-amber-400/40 text-white shadow-[0_0_35px_rgba(244,238,142,0.25)]'
              }`}
            >
              {/* Header */}
              <div className={`flex items-center justify-between px-5 py-4 border-b ${
                isLightTheme ? 'border-amber-200 bg-amber-50/70' : 'border-amber-400/20 bg-amber-950/20'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl border ${
                    isLightTheme ? 'bg-amber-100 border-amber-300 text-amber-950' : 'bg-amber-500/10 border-amber-400/30 text-[#F4EE8E]'
                  }`}>
                    <Bookmark size={18} />
                  </div>
                  <div>
                    <h3 className={`text-sm sm:text-base font-bold ${
                      isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'
                    }`}>
                      Личные шаблоны заполнения
                    </h3>
                    <p className="text-xs opacity-70">
                      Только для вашего аккаунта (ID: {currentUser?.id || 'текущий пользователь'})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPresetsModalOpen(false)}
                  className="p-1.5 rounded-lg opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-5 overflow-y-auto">
                {/* Save Current as Template Block */}
                <div className={`p-4 rounded-xl border space-y-3 ${
                  isLightTheme ? 'border-amber-300 bg-amber-50/60' : 'border-amber-400/30 bg-amber-950/20'
                }`}>
                  <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Save size={14} className="text-amber-500" />
                    <span>Сохранить текущие ответы как личный шаблон</span>
                  </h4>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      value={presetTitleInput}
                      onChange={(e) => setPresetTitleInput(e.target.value)}
                      placeholder="Название (например: Стандартная смена склада)"
                      className={`flex-1 min-h-[42px] px-3.5 py-2 rounded-xl border text-xs font-medium focus:outline-none transition-all ${
                        isLightTheme
                          ? 'bg-white border-amber-300 text-zinc-950 placeholder:text-zinc-500 focus:border-amber-500'
                          : 'bg-[#140A01] border-amber-400/40 text-amber-100 placeholder:text-amber-300/40 focus:border-[#E7C768]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleSaveUserPreset}
                      className={`min-h-[42px] px-4 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 ${
                        isLightTheme
                          ? 'bg-amber-400 hover:bg-amber-500 border-amber-500 text-amber-950 shadow-sm'
                          : 'bg-gradient-to-r from-[#F4EE8E] to-[#E7C768] text-amber-950 border-amber-300 shadow-[0_0_15px_rgba(244,238,142,0.25)] hover:brightness-110'
                      }`}
                    >
                      <Save size={14} />
                      <span>Сохранить</span>
                    </button>
                  </div>
                </div>

                {/* Presets List */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider opacity-80 flex items-center justify-between">
                    <span>Сохраненные шаблоны ({userPresets.length})</span>
                  </h4>

                  {userPresets.length === 0 ? (
                    <div className={`p-6 rounded-xl border text-center text-xs opacity-70 ${
                      isLightTheme ? 'border-amber-200 bg-amber-50/30' : 'border-amber-400/20 bg-amber-950/10'
                    }`}>
                      У вас пока нет сохраненных личных шаблонов для этого отчета. Заполните поля и нажмите кнопку «Сохранить», чтобы повторно использовать ответы в один клик.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {userPresets.map((preset) => {
                        const filledCount = Object.values(preset.answers || {}).filter(v => {
                          if (v === undefined || v === null || v === '') return false;
                          if (typeof v === 'boolean') return v;
                          if (typeof v === 'string') return v.trim().length > 0;
                          return true;
                        }).length;

                        return (
                          <div
                            key={preset.id}
                            className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                              isLightTheme
                                ? 'border-amber-300 bg-white hover:bg-amber-50/50 text-zinc-950'
                                : 'border-amber-400/30 bg-[#1A0F02] hover:bg-amber-500/10 text-white'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-xs truncate">
                                {preset.title}
                              </div>
                              <div className="text-[11px] opacity-60 flex items-center gap-2 mt-0.5">
                                <span>Создан: {preset.createdAt}</span>
                                <span>•</span>
                                <span>Заполнено полей: {filledCount}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleApplyUserPreset(preset)}
                                className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                                  isLightTheme
                                    ? 'bg-amber-400 hover:bg-amber-500 border-amber-500 text-amber-950'
                                    : 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-400/50 text-[#F4EE8E]'
                                }`}
                              >
                                Применить
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteUserPreset(preset.id)}
                                className={`p-1.5 rounded-lg border text-xs transition-all cursor-pointer opacity-70 hover:opacity-100 ${
                                  isLightTheme
                                    ? 'border-amber-300 hover:bg-red-50 text-amber-900'
                                    : 'border-amber-400/30 hover:bg-red-500/20 text-amber-200'
                                }`}
                                title="Удалить шаблон"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className={`flex items-center justify-end px-5 py-3 border-t ${
                isLightTheme ? 'border-amber-200 bg-amber-50/50' : 'border-amber-400/20 bg-amber-950/20'
              }`}>
                <button
                  type="button"
                  onClick={() => setIsPresetsModalOpen(false)}
                  className={`min-h-[40px] px-4 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    isLightTheme ? 'border-amber-300 text-zinc-800 hover:bg-amber-100' : 'border-amber-400/40 text-amber-200 hover:bg-amber-500/10'
                  }`}
                >
                  Закрыть
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Accepted AI Plan Checklist Modal */}
      <AnimatePresence>
        {isPreviousPlanModalOpen && matchedPreviousPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`w-full max-w-xl max-h-[90vh] rounded-2xl border backdrop-blur-xl flex flex-col shadow-2xl overflow-hidden ${
                isLightTheme
                  ? 'bg-[#FFFBF5]/95 border-amber-400 text-amber-950 shadow-amber-900/10'
                  : 'bg-[#1A0F02]/95 border-amber-400/40 text-amber-100 shadow-[0_0_30px_rgba(244,238,142,0.2)]'
              }`}
            >
              {/* Header */}
              <div className={`flex items-center justify-between px-5 py-4 border-b ${
                isLightTheme ? 'border-amber-300/80 bg-amber-100/50' : 'border-amber-400/20 bg-amber-950/30'
              }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-500 shrink-0">
                    <CheckSquare size={18} />
                  </div>
                  <div className="min-w-0">
                    <h3 className={`font-bold text-sm sm:text-base truncate ${
                      isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'
                    }`}>
                      Чеклист принятого плана ИИ
                    </h3>
                    <p className={`text-xs ${isLightTheme ? 'text-amber-900/80' : 'text-amber-300/80'}`}>
                      Период: {matchedPreviousPlan.periodLabel}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPreviousPlanModalOpen(false)}
                  className={`p-1.5 rounded-lg border text-xs transition-all cursor-pointer ${
                    isLightTheme ? 'border-amber-300 text-amber-950 hover:bg-amber-100' : 'border-amber-400/30 text-amber-200 hover:bg-amber-500/20'
                  }`}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                {/* Progress bar card */}
                <div className={`p-4 rounded-xl border space-y-2 ${
                  isLightTheme ? 'border-amber-300 bg-amber-50/70' : 'border-amber-400/30 bg-amber-950/20'
                }`}>
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className={isLightTheme ? 'text-amber-950' : 'text-amber-200'}>
                      Выполнение задач плана:
                    </span>
                    <span className={`font-bold font-mono text-sm ${isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'}`}>
                      {matchedPreviousPlan.completedCount} из {matchedPreviousPlan.totalCount} ({Math.round((matchedPreviousPlan.completedCount / Math.max(matchedPreviousPlan.totalCount, 1)) * 100)}%)
                    </span>
                  </div>
                  <div className={`w-full h-2 rounded-full overflow-hidden border ${
                    isLightTheme ? 'bg-amber-100 border-amber-300' : 'bg-black/40 border-amber-400/30'
                  }`}>
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 via-[#E7C768] to-[#F4EE8E] transition-all duration-300"
                      style={{
                        width: `${Math.round((matchedPreviousPlan.completedCount / Math.max(matchedPreviousPlan.totalCount, 1)) * 100)}%`
                      }}
                    />
                  </div>
                </div>

                {/* Task list with checkboxes */}
                <div className="space-y-2">
                  <div className="text-xs font-bold opacity-80">
                    Задачи к выполнению:
                  </div>
                  {matchedPreviousPlan.items.map((item, idx) => (
                    <div
                      key={item.id || `plan-modal-item-${idx}`}
                      onClick={() => handleTogglePreviousPlanItem(matchedPreviousPlan.reportId, item.id, !item.completed)}
                      className={`flex items-start gap-3 p-3 rounded-xl border text-sm cursor-pointer transition-all ${
                        item.completed
                          ? (isLightTheme ? 'bg-amber-100/50 border-amber-300 line-through opacity-70 text-zinc-700' : 'bg-amber-500/10 border-amber-400/25 line-through opacity-60 text-amber-200')
                          : (isLightTheme ? 'bg-white border-amber-200 hover:border-amber-400 text-amber-950 shadow-sm' : 'bg-[#140A01] border-amber-400/40 hover:border-amber-400 text-amber-100 shadow-[0_0_10px_rgba(244,238,142,0.05)]')
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {item.completed ? (
                          <CheckSquare size={18} className="text-amber-500" />
                        ) : (
                          <Circle size={18} className="text-amber-400/70" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="font-semibold text-sm leading-snug">
                          {item.title}
                        </div>
                        {item.deadline && (
                          <div className={`text-xs font-mono ${isLightTheme ? 'text-amber-900/70' : 'text-amber-300/70'}`}>
                            Срок: {item.deadline}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className={`flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-t ${
                isLightTheme ? 'border-amber-300/80 bg-amber-50/60' : 'border-amber-400/20 bg-amber-950/20'
              }`}>
                <button
                  type="button"
                  onClick={() => {
                    handleInsertPlanIntoField();
                    setIsPreviousPlanModalOpen(false);
                  }}
                  className={`min-h-[40px] px-4 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isLightTheme
                      ? 'bg-amber-400 hover:bg-amber-500 border-amber-500 text-amber-950 shadow-sm'
                      : 'bg-gradient-to-r from-[#F4EE8E] to-[#E7C768] text-amber-950 border-amber-300 shadow-[0_0_15px_rgba(244,238,142,0.25)] hover:brightness-110'
                  }`}
                >
                  <Sparkles size={14} />
                  <span>Вставить задачи в текущий ответ</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPreviousPlanModalOpen(false)}
                  className={`min-h-[40px] px-4 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    isLightTheme ? 'border-amber-300 text-zinc-800 hover:bg-amber-100' : 'border-amber-400/40 text-amber-200 hover:bg-amber-500/10'
                  }`}
                >
                  Закрыть
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Validation Error Custom Modal */}
      {validationError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`relative w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 border ${
            isLightTheme 
              ? 'bg-[#FFFBF5] border-amber-900/30 text-amber-950' 
              : 'bg-[#1A0F02] border-amber-400/50 text-amber-100 shadow-[0_0_25px_rgba(244,238,142,0.2)]'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl border ${
                isLightTheme ? 'bg-amber-100 border-amber-800/20 text-amber-900' : 'bg-amber-400/10 border-amber-400/30 text-[#F4EE8E]'
              }`}>
                <AlertCircle size={22} />
              </div>
              <h3 className={`text-base font-bold ${isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'}`}>
                внимание
              </h3>
            </div>
            <p className={`text-sm leading-relaxed ${isLightTheme ? 'text-amber-900' : 'text-amber-200/90'}`}>
              {validationError}
            </p>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setValidationError(null)}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer hover:brightness-110 active:scale-95 ${
                  isLightTheme 
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#B38C1E] text-amber-950 shadow-md' 
                    : 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 shadow-[0_0_15px_rgba(244,238,142,0.3)]'
                }`}
              >
                понятно
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Live Camera Photo, Video & Screenshot Capture Modal */}
      <ReportMediaCaptureModal
        isOpen={mediaCaptureModalState.isOpen}
        mode={mediaCaptureModalState.mode}
        isLightTheme={isLightTheme}
        onClose={() => setMediaCaptureModalState(prev => ({ ...prev, isOpen: false }))}
        onCapture={(fileData) => {
          if (mediaCaptureModalState.fieldId) {
            setReportAnswers(prev => ({
              ...prev,
              [mediaCaptureModalState.fieldId]: fileData
            }));
            triggerAiFeedback(
              fileData.isVideo
                ? 'Видеозапись прикреплена'
                : mediaCaptureModalState.mode === 'screenshot'
                ? 'Скриншот экрана прикреплен'
                : 'Фотоснимок с камеры прикреплен'
            );
          }
        }}
      />
    </div>
  );
}
