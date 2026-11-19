import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  User, Shield, Check, X, Mail, Sparkles, UserCheck, Plus, Trash2, 
  BookOpen, Briefcase, Info, RefreshCw, Send, ArrowRightLeft, Users, Building 
} from 'lucide-react';
import { UserProfile, UserRole } from '../../types';
import { CompanyHeaderNav } from '../../components/ship/CompanyHeaderNav';
import { EmployeeEditModal, EmployeeData } from '../../components/employees/EmployeeEditModal';
import { CascadeDismissModal } from '../../components/employees/offboarding/CascadeDismissModal';
import { OffboardingJobsPanel } from '../../components/employees/OffboardingJobsPanel';

interface CabinetEmployeesProps {
  currentUser: UserProfile | null;
  mockEmployees: UserProfile[];
  setMockEmployees: (val: UserProfile[]) => void;
  departments: any[];
  saveStateToServer: (updated: any) => void;
  // State elements
  company: any;
  templates: any;
  reports: any;
  transactions: any;
  notifications: any;
  tariff: any;
  crmCompanies: any;
  triggerAI?: (prompt: string, sys: string, cb: (text: string) => void, mascot?: any) => void;
  onNavigate?: (path: string) => void;
}

// Role translation helper
export function translateRole(role: string): string {
  if (role === 'SUPER_ADMIN') return 'Супер-Администратор';
  if (role === 'DIRECTOR') return 'Директор';
  if (role === 'ADMIN') return 'Администратор';
  if (role === 'MANAGER') return 'Руководитель';
  if (role === 'EMPLOYEE') return 'Сотрудник';
  return role || 'Сотрудник';
}

export default function CabinetEmployees({
  currentUser,
  mockEmployees,
  setMockEmployees,
  departments,
  saveStateToServer,
  company,
  templates,
  reports,
  transactions,
  notifications,
  tariff,
  crmCompanies,
  triggerAI,
  onNavigate
}: CabinetEmployeesProps) {
  const [selectedEmpForModal, setSelectedEmpForModal] = useState<EmployeeData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dbEmployeesList, setDbEmployeesList] = useState<EmployeeData[]>([]);
  const [dbDepartments, setDbDepartments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Status Action Modal State (Pause, Resume, Dismiss, Restore)
  const [statusActionModal, setStatusActionModal] = useState<{
    isOpen: boolean;
    emp: any;
    action: 'pause' | 'resume' | 'dismiss' | 'restore';
    title: string;
    description: string;
    warningNote?: string;
  } | null>(null);
  const [isProcessingStatus, setIsProcessingStatus] = useState(false);
  const [cascadeDismissEmp, setCascadeDismissEmp] = useState<any | null>(null);
  const [offboardRefreshSignal, setOffboardRefreshSignal] = useState(0);

  // Dynamic origin-aware invite links for current domain
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://ii-rr.ru';
  const directorRefId = currentUser?.id || '91827364501';

  const [empInviteUrl, setEmpInviteUrl] = useState<string>(`${currentOrigin}/invite?${directorRefId}&role=employer`);
  const [mgrInviteUrl, setMgrInviteUrl] = useState<string>(`${currentOrigin}/invite?${directorRefId}&role=manager`);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      const id = currentUser?.id || '91827364501';
      setEmpInviteUrl(`${origin}/invite?${id}&role=employer`);
      setMgrInviteUrl(`${origin}/invite?${id}&role=manager`);
    }
  }, [currentUser?.id]);

  const isLight = typeof window !== 'undefined' && document.documentElement.classList.contains('light');

  const [statusActionError, setStatusActionError] = useState<string | null>(null);

  // Load departments from PostgreSQL BD ProTalk
  const loadDepartmentsFromDb = async () => {
    try {
      const compId = currentUser?.company_id || (currentUser?.director_id ? `com-${currentUser.director_id}` : (currentUser?.id ? `com-${currentUser.id}` : ''));
      if (!compId) {
        setDbDepartments([]);
        return;
      }
      const res = await fetch(`/api/departments?company_id=${encodeURIComponent(compId)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.departments)) {
          setDbDepartments(json.departments);
        }
      }
    } catch (e) {
      console.warn('Failed to load departments in employees view:', e);
    }
  };

  // Load real employees from PostgreSQL BD ProTalk
  const loadEmployeesFromDb = async () => {
    try {
      setIsLoading(true);
      const compId = currentUser?.company_id || (currentUser?.id ? `com-${currentUser.id}` : 'flagship-main');
      const dirId = currentUser?.director_id || currentUser?.id || '';
      const uId = currentUser?.id || '';
      const queryParams = new URLSearchParams({
        company_id: compId,
        director_id: dirId,
        user_id: uId
      });
      const res = await fetch(`/api/employees?${queryParams.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.employees)) {
          setDbEmployeesList(json.employees);
          // Sync with mockEmployees store if needed
          const mapped: UserProfile[] = json.employees.map((e: any) => ({
            id: e.id,
            name: e.name || 'Сотрудник',
            email: e.email || `${e.id}@company.local`,
            role: (e.role as UserRole) || UserRole.EMPLOYEE,
            position: e.position || 'Специалист',
            telegramHandle: e.telegram_handle || '',
            duties: typeof e.duties === 'string' ? JSON.parse(e.duties || '[]') : (e.duties || []),
            referralCode: e.id,
            bonusesEarned: 0,
            invitedUsersCount: 0,
            department_id: e.department_id
          }));
          setMockEmployees(mapped);
        }
      }
    } catch (e) {
      console.error('Failed to load employees:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEmployeesFromDb();
    loadDepartmentsFromDb();

    const handleDbUpdated = () => {
      loadEmployeesFromDb();
      loadDepartmentsFromDb();
    };

    window.addEventListener('db-employees-updated', handleDbUpdated);
    window.addEventListener('db-departments-updated', handleDbUpdated);
    window.addEventListener('db-updated', handleDbUpdated);
    return () => {
      window.removeEventListener('db-employees-updated', handleDbUpdated);
      window.removeEventListener('db-departments-updated', handleDbUpdated);
      window.removeEventListener('db-updated', handleDbUpdated);
    };
  }, [currentUser?.id, currentUser?.company_id]);

  const getEmployeeDepartmentNames = (deptIdStr?: string | null) => {
    if (!deptIdStr || deptIdStr === 'flagship' || deptIdStr === 'flagship-main') {
      return '🛸 Флагман (Штаб)';
    }
    const allDepts = dbDepartments.length > 0 ? dbDepartments : departments;
    const ids = String(deptIdStr).split(',').map(s => s.trim()).filter(Boolean);
    const names = ids.map(id => {
      if (id === 'flagship' || id === 'flagship-main') return '🛸 Флагман';
      const found = allDepts.find(d => 
        d.id === id || 
        d.id === `dept-${id}` || 
        d.id === `sub-${id}` || 
        d.id.replace(/^(dept|sub)-/, '') === id.replace(/^(dept|sub)-/, '')
      );
      if (found) {
        const isSub = found.type === 'subdepartment' || String(found.id).startsWith('sub-');
        return `${isSub ? '↳ ' : '🚀 '}${found.name}`;
      }
      return id;
    });
    return names.length > 0 ? names.join(', ') : '🛸 Флагман (Штаб)';
  };

  const handleOpenEdit = (emp: any) => {
    setSelectedEmpForModal({
      id: emp.id,
      company_id: emp.company_id || (company?.id || 'flagship-main'),
      department_id: emp.department_id || null,
      name: emp.name || '',
      email: emp.email || '',
      phone: emp.phone || '',
      role: emp.role || UserRole.EMPLOYEE,
      position: emp.position || '',
      telegram_handle: emp.telegramHandle || emp.telegram_handle || '',
      telegramHandle: emp.telegramHandle || emp.telegram_handle || '',
      telegram_id: emp.telegram_id || '',
      duties: emp.duties || [],
      protalk_notes: emp.protalk_notes || ''
    });
    setIsModalOpen(true);
  };

  const handleCreateNewEmp = () => {
    const newId = `emp-${Date.now().toString(36)}`;
    setSelectedEmpForModal({
      id: newId,
      company_id: company?.id || 'flagship-main',
      department_id: null,
      name: '',
      email: '',
      phone: '',
      role: UserRole.EMPLOYEE,
      position: '',
      telegram_handle: '',
      telegramHandle: '',
      telegram_id: '',
      duties: [],
      protalk_notes: ''
    });
    setIsModalOpen(true);
  };

  const handleSaveFromModal = async (saved: EmployeeData) => {
    await loadEmployeesFromDb();
    setIsModalOpen(false);
  };

  const handleDeleteFromModal = async (empId: string) => {
    await loadEmployeesFromDb();
    setIsModalOpen(false);
  };

  const handleCopyLink = (url: string, label: string) => {
    navigator.clipboard.writeText(url);
    setCopyFeedback(`${label} скопирована в буфер!`);
    setTimeout(() => setCopyFeedback(null), 3000);
  };

  const handleExecuteStatusAction = async () => {
    if (!statusActionModal?.emp?.id) return;
    setIsProcessingStatus(true);
    setStatusActionError(null);
    const { emp, action } = statusActionModal;
    try {
      const res = await fetch(`/api/employees/${emp.id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        await loadEmployeesFromDb();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('db-employees-updated'));
          window.dispatchEvent(new CustomEvent('db-updated'));
        }
        setStatusActionModal(null);
      } else {
        setStatusActionError(data.error || 'Ошибка при изменении статуса сотрудника');
      }
    } catch (e: any) {
      setStatusActionError('Ошибка соединения: ' + e.message);
    } finally {
      setIsProcessingStatus(false);
    }
  };

  const openStatusModal = (emp: any, action: 'pause' | 'resume' | 'dismiss' | 'restore') => {
    setStatusActionError(null);
    const empName = emp.name || 'Сотрудник';
    if (action === 'pause') {
      setStatusActionModal({
        isOpen: true,
        emp,
        action: 'pause',
        title: 'Поставить сотрудника на паузу?',
        description: `Сотрудник ${empName} будет временно переведен в статус «На паузе». Он не сможет сдавать рапорты и получать задачи в боте.`,
        warningNote: 'Рабочее место будет исключено из расчета тарифа на следующий период, абонентская плата за него списываться не будет.'
      });
    } else if (action === 'resume') {
      setStatusActionModal({
        isOpen: true,
        emp,
        action: 'resume',
        title: 'Снять сотрудника с паузы?',
        description: `Сотрудник ${empName} вернется к активной работе, получит доступ к чек-листам и сдаче отчетов в боте.`,
        warningNote: 'Сотрудник снова будет учитываться как активное рабочее место в тарифе компании.'
      });
    } else if (action === 'dismiss') {
      setCascadeDismissEmp(emp);
    } else if (action === 'restore') {
      setStatusActionModal({
        isOpen: true,
        emp,
        action: 'restore',
        title: 'Восстановить сотрудника в штат?',
        description: `Сотрудник ${empName} будет восстановлен в активном штате компании с сохранением прежней истории.`,
        warningNote: 'Сотрудник снова займет рабочее место в корпоративном тарифе.'
      });
    }
  };

  // Combine display list
  const displayEmployees = dbEmployeesList.length > 0 ? dbEmployeesList : (mockEmployees as any[]);

  return (
    <div className="space-y-6 text-sm">
      {/* Header Nav */}
      <CompanyHeaderNav activeView="employees" onNavigate={onNavigate} />

      {/* Main Title Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2 text-amber-950 dark:text-white">
            <UserCheck className="w-6 h-6 text-[#E7C768]" />
            <span>Сотрудники, роли и должностные обязанности</span>
          </h2>
          <p className="text-sm text-amber-900/80 dark:text-amber-200/70 mt-1">
            Управляйте персоналом, перемещайте между отделами, ставьте на паузу для экономии тарифа и синхронизируйте задачи с Telegram ботом.
          </p>
        </div>
      </div>

      {/* Copy Feedback Banner */}
      {copyFeedback && (
        <div className="p-3.5 rounded-xl border border-amber-400/40 bg-amber-500/10 text-amber-950 dark:text-amber-200 text-sm font-semibold flex items-center gap-2 animate-fade-in shadow">
          <Sparkles className="w-4 h-4 text-[#E7C768] dark:text-[#F4EE8E] shrink-0" />
          <span>{copyFeedback}</span>
        </div>
      )}

      {/* Invite Links Container */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Employee Invite */}
        <div 
          className="p-4 rounded-2xl border transition-all bg-amber-500/5 dark:bg-[#1A0F02]/60 border-amber-400/30"
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-bold text-amber-900 dark:text-[#F4EE8E]">
              Ссылка для сотрудников
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold border border-amber-400/30 text-amber-800 dark:text-amber-300 bg-amber-500/10">
              Сотрудник
            </span>
          </div>
          <p className="text-xs text-amber-900/70 dark:text-amber-100/70 mb-3">
            Передайте эту персональную ссылку сотруднику для вступления в оргструктуру вашей компании.
          </p>
          <div className="flex items-center gap-2">
            <input
              value={empInviteUrl}
              onChange={(e) => setEmpInviteUrl(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl text-xs font-mono outline-none border border-amber-400/30 bg-white/60 dark:bg-black/40 text-amber-950 dark:text-[#F4EE8E] truncate focus:border-amber-400"
            />
            <button
              type="button"
              onClick={() => handleCopyLink(empInviteUrl, 'Ссылка сотрудника')}
              className="px-3.5 py-2 rounded-xl font-bold text-xs bg-[#E7C768] hover:bg-[#F4EE8E] text-[#140A01] transition-colors shrink-0 cursor-pointer"
            >
              Скопировать
            </button>
          </div>
        </div>

        {/* Leader Invite */}
        <div 
          className="p-4 rounded-2xl border transition-all bg-amber-500/5 dark:bg-[#1A0F02]/60 border-amber-400/30"
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-bold text-amber-900 dark:text-[#F4EE8E]">
              Ссылка для руководителей
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold border border-amber-400/30 text-amber-800 dark:text-amber-300 bg-amber-500/10">
              Руководитель
            </span>
          </div>
          <p className="text-xs text-amber-900/70 dark:text-amber-100/70 mb-3">
            Приглашение для начальников отделов с расширенным доступом к верификации и контролю рапортов.
          </p>
          <div className="flex items-center gap-2">
            <input
              value={mgrInviteUrl}
              onChange={(e) => setMgrInviteUrl(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl text-xs font-mono outline-none border border-amber-400/30 bg-white/60 dark:bg-black/40 text-amber-950 dark:text-[#F4EE8E] truncate focus:border-amber-400"
            />
            <button
              type="button"
              onClick={() => handleCopyLink(mgrInviteUrl, 'Ссылка руководителя')}
              className="px-3.5 py-2 rounded-xl font-bold text-xs bg-[#E7C768] hover:bg-[#F4EE8E] text-[#140A01] transition-colors shrink-0 cursor-pointer"
            >
              Скопировать
            </button>
          </div>
        </div>
      </div>

      {/* Employees Table / Cards */}
      <div 
        className="p-5 rounded-2xl border overflow-hidden shadow-xl space-y-4 bg-amber-500/5 dark:bg-[#1A0F02]/70 border-amber-400/40"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-amber-950 dark:text-[#F4EE8E]">Реестр сотрудников компании</h3>
            <p className="text-xs text-amber-900/70 dark:text-amber-200/70">Кликните на любую строку для редактирования или воспользуйтесь кнопками управления статусом</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCreateNewEmp}
              className="px-4 py-2 rounded-xl font-bold text-sm tracking-wide bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 border border-amber-300 hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить сотрудника</span>
            </button>
            <button
              type="button"
              onClick={loadEmployeesFromDb}
              className="p-2 rounded-xl border border-amber-400/30 text-amber-700 dark:text-amber-300 hover:text-amber-950 dark:hover:text-white transition-colors cursor-pointer"
              title="Обновить список"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Table representation */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-amber-500/30 text-xs font-bold text-amber-900 dark:text-amber-300/80">
                <th className="py-3 px-3">ФИО сотрудника</th>
                <th className="py-3 px-3">Статус</th>
                <th className="py-3 px-3">Должность</th>
                <th className="py-3 px-3">Системная роль</th>
                <th className="py-3 px-3">Текущий отдел</th>
                <th className="py-3 px-3">Telegram</th>
                <th className="py-3 px-3 text-center">Обязанности</th>
                <th className="py-3 px-3 text-right">Управление</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-500/20 text-sm">
              {displayEmployees.map((emp) => {
                const deptName = getEmployeeDepartmentNames(emp.department_id);

                let dutiesCount = 0;
                if (Array.isArray(emp.duties)) {
                  dutiesCount = emp.duties.length;
                } else if (typeof emp.duties === 'string' && emp.duties.trim()) {
                  try {
                    const parsed = JSON.parse(emp.duties);
                    dutiesCount = Array.isArray(parsed) ? parsed.length : 1;
                  } catch {
                    dutiesCount = emp.duties.split('\n').filter(Boolean).length;
                  }
                }

                const empStatus = emp.status || 'active';
                const isPaused = empStatus === 'paused';
                const isDismissed = empStatus === 'dismissed';

                return (
                  <tr 
                    key={emp.id}
                    onClick={() => handleOpenEdit(emp)}
                    className="hover:bg-amber-500/10 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-3 font-bold text-amber-950 dark:text-white group-hover:text-[#E7C768] dark:group-hover:text-[#F4EE8E] transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center font-bold text-xs shrink-0 ${
                          isDismissed 
                            ? 'border-zinc-500/40 bg-zinc-500/20 text-zinc-400' 
                            : isPaused
                              ? 'border-amber-500/50 bg-amber-500/20 text-amber-500'
                              : 'border-amber-400/40 bg-amber-500/20 dark:bg-amber-950/60 text-[#E7C768] dark:text-[#F4EE8E]'
                        }`}>
                          {emp.name ? emp.name.charAt(0).toUpperCase() : 'С'}
                        </div>
                        <div className="flex flex-col">
                          <span className={`font-semibold ${isDismissed ? 'line-through text-zinc-400' : ''}`}>
                            {emp.name || 'Без имени'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-3">
                      {isPaused ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold border border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/15">
                          На паузе
                        </span>
                      ) : isDismissed ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold border border-zinc-500/40 text-zinc-600 dark:text-zinc-400 bg-zinc-500/10">
                          Уволен
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold border border-amber-400/40 text-amber-800 dark:text-[#F4EE8E] bg-amber-500/10">
                          Активен
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-amber-900 dark:text-amber-100 font-medium">{emp.position || 'Специалист'}</td>
                    <td className="py-3.5 px-3">
                      <span className="px-2.5 py-1 rounded-lg border border-amber-400/30 text-xs font-bold text-amber-900 dark:text-[#F4EE8E] bg-amber-500/10">
                        {translateRole(emp.role)}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-amber-900 dark:text-amber-200/90 font-medium">
                      <span className="px-2.5 py-1 rounded-lg border border-amber-400/20 bg-amber-500/5 dark:bg-black/30">
                        {deptName}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-amber-900 dark:text-[#F4EE8E] font-mono">{emp.telegram_handle || emp.telegramHandle || '—'}</td>
                    <td className="py-3.5 px-3 text-center text-amber-900 dark:text-amber-200/80 font-bold">{dutiesCount}</td>
                    
                    {/* Actions */}
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {isPaused ? (
                          <button
                            type="button"
                            onClick={() => openStatusModal(emp, 'resume')}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/15 hover:bg-amber-500/30 text-amber-800 dark:text-amber-300 border border-amber-400/30 transition-colors cursor-pointer"
                            title="Снять сотрудника с паузы и вернуть в работу"
                          >
                            Возобновить
                          </button>
                        ) : isDismissed ? (
                          <button
                            type="button"
                            onClick={() => openStatusModal(emp, 'restore')}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/15 hover:bg-amber-500/30 text-amber-800 dark:text-amber-300 border border-amber-400/30 transition-colors cursor-pointer"
                            title="Восстановить уволенного сотрудника"
                          >
                            Восстановить
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => openStatusModal(emp, 'pause')}
                              className="px-2 py-1 rounded-lg text-xs font-semibold bg-transparent hover:bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-400/30 transition-colors cursor-pointer"
                              title="Поставить на паузу (не оплачивать тариф)"
                            >
                              Пауза
                            </button>
                            <button
                              type="button"
                              onClick={() => openStatusModal(emp, 'dismiss')}
                              className="px-2 py-1 rounded-lg text-xs font-semibold bg-transparent hover:bg-red-500/10 text-amber-900 dark:text-amber-200 border border-amber-400/20 hover:border-amber-400/40 transition-colors cursor-pointer"
                              title="Уволить сотрудника и освободить рабочее место"
                            >
                              Уволить
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(emp)}
                          className="text-[#E7C768] font-bold text-xs hover:underline pl-1 cursor-pointer"
                        >
                          Редакт. →
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live & Completed Background Cascade Offboarding Jobs */}
      <OffboardingJobsPanel
        companyId={currentUser?.company_id || company?.id || (currentUser?.id ? `com-${currentUser.id}` : '')}
        refreshSignal={offboardRefreshSignal}
        onJobUpdated={() => {
          loadEmployeesFromDb();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('db-employees-updated'));
            window.dispatchEvent(new CustomEvent('db-updated'));
          }
        }}
      />

      {/* Custom Translucent Modal for Employee Status Action (Pause / Dismiss / Resume / Restore) */}
      {statusActionModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9995] flex items-center justify-center p-4 bg-[#140A01]/65 dark:bg-[#140A01]/70 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md p-6 rounded-3xl border border-amber-400/50 shadow-2xl bg-[#FFFBF5]/90 dark:bg-[#1A0F02]/85 backdrop-blur-xl text-amber-950 dark:text-[#F4EE8E] space-y-4">
            <div className="flex justify-between items-start border-b border-amber-500/20 pb-3">
              <h3 className="text-base font-black text-amber-950 dark:text-[#F4EE8E] flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#E7C768]" />
                <span>{statusActionModal.title}</span>
              </h3>
              <button 
                type="button"
                onClick={() => setStatusActionModal(null)}
                className="p-1 rounded-lg text-amber-700 dark:text-amber-400/70 hover:text-amber-950 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-amber-950 dark:text-amber-100/90 leading-relaxed">
              {statusActionModal.description}
            </p>

            {statusActionModal.warningNote && (
              <div className="p-3.5 rounded-xl border border-amber-400/30 bg-amber-500/10 text-sm text-amber-950 dark:text-[#F4EE8E] font-medium leading-relaxed">
                💡 <strong>Экономия тарифа:</strong> {statusActionModal.warningNote}
              </div>
            )}

            {statusActionError && (
              <div className="p-3 rounded-xl border border-amber-500/50 bg-amber-500/15 text-sm font-semibold text-amber-950 dark:text-[#F4EE8E]">
                {statusActionError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStatusActionModal(null)}
                disabled={isProcessingStatus}
                className="px-4 py-2.5 rounded-xl text-sm font-bold border border-amber-400/40 text-amber-950 dark:text-amber-300 hover:bg-amber-500/10 transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleExecuteStatusAction}
                disabled={isProcessingStatus}
                className="px-5 py-2.5 rounded-xl text-sm font-black tracking-wide bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 border border-amber-300 hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-md disabled:opacity-50"
              >
                {isProcessingStatus ? 'Обработка...' : 'Подтвердить'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Unified Employee Edit Modal */}
      <EmployeeEditModal
        isOpen={isModalOpen}
        employee={selectedEmpForModal}
        departments={dbDepartments.length > 0 ? dbDepartments : departments}
        companyName={company?.name || 'Моя Организация'}
        companyId={company?.id || 'flagship-main'}
        currentUser={currentUser}
        isLight={isLight}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveFromModal}
        onDelete={handleDeleteFromModal}
        onCascadeDismiss={(emp) => {
          setIsModalOpen(false);
          setCascadeDismissEmp(emp);
        }}
        triggerAI={triggerAI}
      />

      {/* Cascading Dismissal & Handover Wizard Modal */}
      <CascadeDismissModal
        isOpen={Boolean(cascadeDismissEmp)}
        employee={cascadeDismissEmp}
        currentUser={currentUser}
        companyId={currentUser?.company_id || company?.id || (currentUser?.id ? `com-${currentUser.id}` : '')}
        onClose={() => setCascadeDismissEmp(null)}
        onCompleted={() => {
          setOffboardRefreshSignal((n) => n + 1);
          loadEmployeesFromDb();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('db-employees-updated'));
            window.dispatchEvent(new CustomEvent('db-updated'));
          }
        }}
      />
    </div>
  );
}
