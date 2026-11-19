import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, Shield, Mail, Phone, Send, Sparkles, Building, Check, X, 
  Trash2, BookOpen, Briefcase, Plus, ArrowRightLeft, 
  HelpCircle, RefreshCw, Cpu, Lock, Globe, KeyRound
} from 'lucide-react';
import { UserRole } from '../../types';
import { MiniAudioField } from '../voice/MiniAudioField';
import { AudioField } from '../voice/AudioField';
import { AiLoadingOverlay } from '../common/AiLoadingOverlay';
import { TIMEZONE_OPTIONS, DEFAULT_TIMEZONE } from '../../utils/timezone';

export interface EmployeeData {
  id: string;
  company_id?: string;
  department_id?: string | null;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  position?: string;
  telegram_handle?: string;
  telegramHandle?: string;
  telegram_id?: string;
  duties?: string[] | string;
  protalk_notes?: string;
  timezone?: string;
  password?: string;
  [key: string]: any;
}

interface EmployeeEditModalProps {
  isOpen: boolean;
  employee: EmployeeData | null;
  departments: { id: string; name: string; type?: string; parent_id?: string | null }[];
  companyName?: string;
  companyId?: string;
  currentUser?: any;
  isLight?: boolean;
  isProfileMode?: boolean;
  onClose: () => void;
  onSave: (savedData: EmployeeData) => Promise<void> | void;
  onDelete?: (employeeId: string) => Promise<void> | void;
  onCascadeDismiss?: (employee: EmployeeData) => void;
  onMoveDepartment?: (employeeId: string, targetDeptId: string | null) => Promise<void> | void;
  triggerAI?: (prompt: string, sys: string, cb: (text: string) => void) => void;
}

const DUTIES_PRESETS: Record<string, { title: string; duties: string[] }> = {
  sales: {
    title: 'Менеджер по продажам',
    duties: [
      'Обработка входящих заявок в CRM системе',
      'Проведение телефонных переговоров и демонстраций',
      'Выполнение персонального плана продаж',
      'Формирование ежедневных рапортов по сделкам'
    ]
  },
  dev: {
    title: 'Разработчик ПО',
    duties: [
      'Разработка модулей платформы и оптимизация логики БД',
      'Написание и поддержка автоматических тестов',
      'Проведение code review решений коллег',
      'Предоставление суточных отчетов по тикетам'
    ]
  },
  marketing: {
    title: 'Маркетолог / Трафик',
    duties: [
      'Запуск и ведение рекламных кампаний',
      'Мониторинг конверсий и стоимости лидов',
      'Создание рекламных материалов и офферов',
      'Подготовка еженедельного анализа воронки'
    ]
  },
  head: {
    title: 'Руководитель отдела',
    duties: [
      'Координация и распределение задач среди сотрудников',
      'Контроль сдачи ежедневных рапортов в Telegram',
      'Оценка эффективности и расчет KPI команды',
      'Проведение регулярных планерок и ретроспектив'
    ]
  }
};

export const EmployeeEditModal: React.FC<EmployeeEditModalProps> = ({
  isOpen,
  employee,
  departments,
  companyName = 'Моя Организация',
  companyId = 'flagship-main',
  currentUser,
  isLight = false,
  isProfileMode = false,
  onClose,
  onSave,
  onDelete,
  onCascadeDismiss,
  onMoveDepartment,
  triggerAI
}) => {
  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<string>(UserRole.EMPLOYEE);
  const [position, setPosition] = useState('');
  const [telegramHandle, setTelegramHandle] = useState('');
  const [telegramId, setTelegramId] = useState('');
  const [timezone, setTimezone] = useState<string>(DEFAULT_TIMEZONE);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // Multi-department state (array of department IDs)
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>(['flagship']);
  const [liveDepartments, setLiveDepartments] = useState<any[]>(departments || []);
  const [protalkNotes, setProtalkNotes] = useState('');
  const [dutiesList, setDutiesList] = useState<string[]>([]);
  const [newDuty, setNewDuty] = useState('');

  // Permission evaluation for role editor
  const effectiveCurrentUser = currentUser || (() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('rr_user') || localStorage.getItem('user');
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return null;
  })();

  const curRole = String(effectiveCurrentUser?.role || '').toUpperCase();
  const isSuperAdmin = curRole === 'SUPER_ADMIN' || curRole === 'СУПЕР-АДМИНИСТРАТОР' || curRole === 'СУПЕР-АДМИН' || effectiveCurrentUser?.email === 'shishkarnem@gmail.com';
  const isDirector = isSuperAdmin || curRole === 'DIRECTOR' || curRole === 'ГЕНЕРАЛЬНЫЙ ДИРЕКТОР' || curRole === 'ДИРЕКТОР';
  const canEditRole = isDirector;

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Fetch live departments from PostgreSQL BD ProTalk on modal open
  useEffect(() => {
    if (isOpen) {
      const dirId = effectiveCurrentUser?.director_id || effectiveCurrentUser?.id;
      const effectiveCompId = employee?.company_id || companyId || effectiveCurrentUser?.company_id || (dirId ? `com-${dirId}` : '');
      const query = effectiveCompId ? `?company_id=${encodeURIComponent(effectiveCompId)}` : '';
      fetch(`/api/departments${query}`)
        .then(r => r.json())
        .then(d => {
          if (d.success && Array.isArray(d.departments)) {
            setLiveDepartments(d.departments);
          }
        })
        .catch(err => console.warn('Failed to fetch departments for modal:', err));
    }
  }, [isOpen, employee?.company_id, companyId, effectiveCurrentUser?.company_id, effectiveCurrentUser?.id]);

  // Combine and flatten all available departments & subdepartments
  const allAvailableDepts = useMemo(() => {
    const map = new Map<string, any>();
    // 1. Ingest from props
    (departments || []).forEach(d => {
      if (d && d.id) {
        map.set(d.id, { ...d, type: d.type || 'department' });
        if (Array.isArray(d.subdepartments)) {
          d.subdepartments.forEach((sub: any) => {
            if (sub && sub.id) {
              map.set(sub.id, { ...sub, type: 'subdepartment', parent_id: d.id });
            }
          });
        }
      }
    });
    // 2. Ingest from live PostgreSQL BD ProTalk departments
    (liveDepartments || []).forEach(d => {
      if (d && d.id) {
        map.set(d.id, {
          ...d,
          type: d.type || (d.parent_id && d.parent_id !== companyId && d.parent_id !== 'flagship-main' ? 'subdepartment' : 'department')
        });
        if (Array.isArray(d.subdepartments)) {
          d.subdepartments.forEach((sub: any) => {
            if (sub && sub.id) {
              map.set(sub.id, { ...sub, type: 'subdepartment', parent_id: d.id });
            }
          });
        }
      }
    });
    return Array.from(map.values());
  }, [departments, liveDepartments, companyId]);

  // Group into hierarchical top-level departments and child subdepartments
  const { topLevelDepts, subDeptsByParent, orphanedSubDepts } = useMemo(() => {
    const top: any[] = [];
    const subsMap: Record<string, any[]> = {};
    const parentIds = new Set<string>();

    allAvailableDepts.forEach(d => {
      const isSub = d.type === 'subdepartment' || String(d.id).startsWith('sub-');
      if (!isSub) {
        top.push(d);
        parentIds.add(d.id);
      }
    });

    const orphans: any[] = [];
    allAvailableDepts.forEach(d => {
      const isSub = d.type === 'subdepartment' || String(d.id).startsWith('sub-');
      if (isSub) {
        const pId = d.parent_id;
        if (pId && parentIds.has(pId)) {
          if (!subsMap[pId]) subsMap[pId] = [];
          subsMap[pId].push(d);
        } else {
          orphans.push(d);
        }
      }
    });

    return { topLevelDepts: top, subDeptsByParent: subsMap, orphanedSubDepts: orphans };
  }, [allAvailableDepts]);

  const getDeptLabel = (dId: string) => {
    if (dId === 'flagship' || dId === 'flagship-main' || dId === companyId) {
      return `🛸 Флагман (${companyName})`;
    }
    const cleanId = dId.trim();
    const found = allAvailableDepts.find(d => 
      d.id === cleanId || 
      d.id === `dept-${cleanId}` || 
      d.id === `sub-${cleanId}` || 
      d.id.replace(/^(dept|sub)-/, '') === cleanId.replace(/^(dept|sub)-/, '') ||
      (d.name && d.name.toLowerCase() === cleanId.toLowerCase())
    );
    if (found) {
      const isSub = found.type === 'subdepartment' || String(found.id).startsWith('sub-');
      return `${isSub ? '↳ ' : '🚀 '}${found.name}`;
    }
    return cleanId;
  };

  const isDeptSelected = (deptId: string) => {
    if (deptId === 'flagship') {
      return selectedDeptIds.includes('flagship') || selectedDeptIds.includes('flagship-main') || selectedDeptIds.includes(companyId);
    }
    return selectedDeptIds.some(sid => 
      sid === deptId || 
      sid === `dept-${deptId}` || 
      sid === `sub-${deptId}` || 
      sid.replace(/^(dept|sub)-/, '') === deptId.replace(/^(dept|sub)-/, '')
    );
  };

  // Copy employee to another department
  const [copyTargetDeptId, setCopyTargetDeptId] = useState<string>('');
  const [isCopying, setIsCopying] = useState(false);

  // Custom styled confirmation modal for dismissal
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  // Initialize fields when employee changes
  useEffect(() => {
    if (employee) {
      setName(employee.name || '');
      setEmail(employee.email || '');
      setPhone(employee.phone || '');
      setRole(employee.role || UserRole.EMPLOYEE);
      setPosition(employee.position || 'Специалист');
      setTelegramHandle(employee.telegram_handle || employee.telegramHandle || '');
      setTelegramId(employee.telegram_id || '');
      setTimezone(employee.timezone || DEFAULT_TIMEZONE);
      setPassword('');
      setPasswordConfirm('');
      
      const rawDeptId = employee.department_id;
      if (!rawDeptId || rawDeptId === 'flagship-main' || rawDeptId === companyId) {
        setSelectedDeptIds(['flagship']);
      } else {
        const splitDepts = String(rawDeptId).split(',').map(d => d.trim()).filter(Boolean);
        setSelectedDeptIds(splitDepts.length > 0 ? splitDepts : ['flagship']);
      }

      setProtalkNotes(employee.protalk_notes || '');

      // Parse duties
      let parsedDuties: string[] = [];
      if (Array.isArray(employee.duties)) {
        parsedDuties = employee.duties;
      } else if (typeof employee.duties === 'string' && employee.duties.trim()) {
        try {
          const json = JSON.parse(employee.duties);
          if (Array.isArray(json)) parsedDuties = json;
          else parsedDuties = [employee.duties];
        } catch {
          parsedDuties = employee.duties.split('\n').map(s => s.trim()).filter(Boolean);
        }
      }
      setDutiesList(parsedDuties);
    }
  }, [employee, companyId]);

  if (!isOpen || !employee) return null;

  const toggleDepartmentSelection = (deptId: string) => {
    if (deptId === 'flagship') {
      const hasFlagship = selectedDeptIds.includes('flagship') || selectedDeptIds.includes('flagship-main') || selectedDeptIds.includes(companyId);
      if (hasFlagship) {
        if (selectedDeptIds.length > 1) {
          setSelectedDeptIds(selectedDeptIds.filter(id => id !== 'flagship' && id !== 'flagship-main' && id !== companyId));
        }
      } else {
        setSelectedDeptIds([...selectedDeptIds, 'flagship']);
      }
      return;
    }

    const isSelected = isDeptSelected(deptId);
    if (isSelected) {
      const remaining = selectedDeptIds.filter(id => 
        id !== deptId && 
        id !== `dept-${deptId}` && 
        id !== `sub-${deptId}` && 
        id.replace(/^(dept|sub)-/, '') !== deptId.replace(/^(dept|sub)-/, '')
      );
      setSelectedDeptIds(remaining.length > 0 ? remaining : ['flagship']);
    } else {
      const cleanList = selectedDeptIds.filter(id => id !== 'flagship' || selectedDeptIds.length === 1);
      setSelectedDeptIds([...cleanList, deptId]);
    }
  };

  // AI Duties Generator
  const handleAiGenerateDuties = async () => {
    if (!position.trim()) {
      setStatusMessage('Введите должность сотрудника для генерации обязанностей.');
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    setIsGeneratingAi(true);
    setStatusMessage('Генерация обязанностей через ИИ...');

    try {
      const userStr = typeof window !== 'undefined' ? localStorage.getItem('rr_user') : null;
      const currentUser = userStr ? JSON.parse(userStr) : null;
      const effectiveUserId = currentUser?.id || employee?.id || '91827364501';

      const selectedDeptObj = departments.find(d => selectedDeptIds.includes(d.id));
      const res = await fetch('/api/protalk/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'employee',
          prompt: `Сотрудник: ${name || 'Специалист'}. Должность: ${position}. Заметки/Обязанности: ${protalkNotes || 'Стандартные обязанности'}`,
          position: position,
          dutiesData: protalkNotes,
          companyId: companyId,
          departmentId: selectedDeptIds.join(', '),
          companyContext: `${companyName || 'Организация'}${selectedDeptObj ? `, Отдел: ${selectedDeptObj.name}` : ''}`,
          userId: effectiveUserId
        })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          if (json.data.position) setPosition(json.data.position);
          if (Array.isArray(json.data.duties) && json.data.duties.length > 0) {
            setDutiesList(prev => Array.from(new Set([...prev, ...json.data.duties])));
          }
          setStatusMessage('Обязанности успешно сгенерированы ИИ!');
        } else {
          fallbackLocalDutiesGen();
        }
      } else {
        fallbackLocalDutiesGen();
      }
    } catch {
      fallbackLocalDutiesGen();
    } finally {
      setIsGeneratingAi(false);
      setTimeout(() => setStatusMessage(null), 3500);
    }
  };

  const fallbackLocalDutiesGen = () => {
    const posLower = position.toLowerCase();
    let template = DUTIES_PRESETS.sales;
    if (posLower.includes('разработ') || posLower.includes('програм') || posLower.includes('it') || posLower.includes('dev')) {
      template = DUTIES_PRESETS.dev;
    } else if (posLower.includes('маркет') || posLower.includes('реклам') || posLower.includes('трафик')) {
      template = DUTIES_PRESETS.marketing;
    } else if (posLower.includes('руковод') || posLower.includes('директор') || posLower.includes('head') || posLower.includes('лид')) {
      template = DUTIES_PRESETS.head;
    }
    setDutiesList(prev => Array.from(new Set([...prev, ...template.duties])));
    setStatusMessage('Применен рекомендуемый шаблон обязанностей.');
  };

  const handleAddDuty = () => {
    if (!newDuty.trim()) return;
    if (!dutiesList.includes(newDuty.trim())) {
      setDutiesList([...dutiesList, newDuty.trim()]);
    }
    setNewDuty('');
  };

  const handleRemoveDuty = (idx: number) => {
    setDutiesList(dutiesList.filter((_, i) => i !== idx));
  };

  const handleApplyPreset = (key: string) => {
    const preset = DUTIES_PRESETS[key];
    if (preset) {
      setDutiesList(prev => Array.from(new Set([...prev, ...preset.duties])));
    }
  };

  // Save changes to database
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setStatusMessage('Пожалуйста, введите имя.');
      return;
    }

    if (password) {
      if (password.length < 6) {
        setStatusMessage('Пароль должен содержать не менее 6 символов.');
        return;
      }
      if (password !== passwordConfirm) {
        setStatusMessage('Пароли не совпадают. Проверьте подтверждение.');
        return;
      }
    }

    setIsSaving(true);
    setStatusMessage('Сохранение в базу данных PostgreSQL BD ProTalk...');

    const validDeptIds = selectedDeptIds.filter(id => id !== 'flagship');
    const targetDept = validDeptIds.length > 0 ? validDeptIds.join(', ') : null;
    const finalCompId = companyId || 'flagship-main';

    const payload: EmployeeData = {
      ...employee,
      company_id: finalCompId,
      department_id: targetDept,
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      role: role,
      position: position.trim() || 'Специалист',
      telegram_handle: telegramHandle.trim() || undefined,
      telegramHandle: telegramHandle.trim() || undefined,
      telegram_id: telegramId.trim() || undefined,
      duties: dutiesList,
      protalk_notes: protalkNotes.trim() || undefined,
      timezone: timezone,
      password: password ? password : (employee.password || undefined)
    };

    try {
      if (isProfileMode) {
        const userId = employee.id?.startsWith('emp-') ? employee.id.replace('emp-', '') : (employee.id || currentUser?.id);
        const userRes = await fetch(`/api/users/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim() || undefined,
            phone: phone.trim() || undefined,
            role: role,
            position: position.trim() || 'Специалист',
            telegram_handle: telegramHandle.trim() || undefined,
            telegram_id: telegramId.trim() || undefined,
            duties: dutiesList,
            timezone: timezone,
            password: password || undefined
          })
        });

        // Also update local storage if current user is edited
        if (typeof window !== 'undefined') {
          const storedUser = localStorage.getItem('rr_user') || localStorage.getItem('user');
          if (storedUser) {
            try {
              const parsed = JSON.parse(storedUser);
              const updated = {
                ...parsed,
                name: name.trim(),
                email: email.trim() || parsed.email,
                phone: phone.trim() || parsed.phone,
                role: role,
                position: position.trim(),
                telegram_handle: telegramHandle.trim(),
                telegramHandle: telegramHandle.trim(),
                telegram_id: telegramId.trim(),
                duties: dutiesList,
                timezone: timezone
              };
              localStorage.setItem('rr_user', JSON.stringify(updated));
              localStorage.setItem('user', JSON.stringify(updated));
              window.dispatchEvent(new CustomEvent('user-profile-updated', { detail: updated }));
              window.dispatchEvent(new CustomEvent('rr_user_updated', { detail: updated }));
            } catch {}
          }
        }
      }

      const isNew = !employee.id || employee.id.startsWith('new-');
      const url = isNew ? '/api/employees' : `/api/employees/${employee.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success || isProfileMode) {
        const savedEmp = data.employee || payload;
        await onSave(savedEmp);

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('db-employees-updated'));
          window.dispatchEvent(new CustomEvent('db-users-updated'));
          window.dispatchEvent(new CustomEvent('db-updated'));
        }

        setStatusMessage('Успешно сохранено!');
        setTimeout(() => {
          setIsSaving(false);
          onClose();
        }, 600);
      } else {
        setStatusMessage(data.error || 'Ошибка при сохранении');
        setIsSaving(false);
      }
    } catch (err: any) {
      console.error('Save employee error:', err);
      setStatusMessage('Ошибка сохранения: ' + err.message);
      setIsSaving(false);
    }
  };

  const handleCopyToDepartment = async () => {
    if (!copyTargetDeptId) {
      setStatusMessage('Выберите отдел для копирования сотрудника.');
      return;
    }

    setIsCopying(true);
    setStatusMessage('Копирование сотрудника в выбранный отдел...');

    try {
      const newEmpId = `emp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const targetDept = copyTargetDeptId === 'flagship' ? null : copyTargetDeptId;

      const copyPayload: EmployeeData = {
        ...employee,
        id: newEmpId,
        company_id: companyId || 'flagship-main',
        department_id: targetDept,
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        role: role,
        position: position.trim() || 'Специалист',
        telegram_handle: telegramHandle.trim() || undefined,
        telegramHandle: telegramHandle.trim() || undefined,
        telegram_id: telegramId.trim() || undefined,
        duties: dutiesList,
        protalk_notes: protalkNotes.trim() || undefined
      };

      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(copyPayload)
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage('Сотрудник успешно скопирован в новый отдел!');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('db-employees-updated'));
          window.dispatchEvent(new CustomEvent('db-updated'));
        }
        setTimeout(() => {
          setIsCopying(false);
          onClose();
        }, 800);
      } else {
        setStatusMessage(data.error || 'Ошибка при копировании');
        setIsCopying(false);
      }
    } catch (err: any) {
      console.error('Copy employee error:', err);
      setStatusMessage('Ошибка копирования: ' + err.message);
      setIsCopying(false);
    }
  };

  // Delete employee (Full Dismissal from Company)
  const isDirectorOrAdmin = role === 'DIRECTOR' || role === 'SUPER_ADMIN' || employee?.role === 'DIRECTOR' || employee?.role === 'SUPER_ADMIN';

  const handleDelete = async () => {
    if (!onDelete || !employee.id) return;
    if (isDirectorOrAdmin) {
      setStatusMessage('Директора компании нельзя уволить или удалить!');
      setIsConfirmDeleteOpen(false);
      return;
    }
    setIsDeleting(true);
    setStatusMessage('Полное увольнение и каскадное удаление из базы данных...');
    try {
      const res = await fetch(`/api/employees/${employee.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success !== false) {
        await onDelete(employee.id);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('db-employees-updated'));
          window.dispatchEvent(new CustomEvent('db-schedules-updated'));
          window.dispatchEvent(new CustomEvent('db-updated'));
        }
        setIsDeleting(false);
        onClose();
      } else {
        setStatusMessage(data?.error || 'Не удалось удалить сотрудника');
        setIsDeleting(false);
        setIsConfirmDeleteOpen(false);
      }
    } catch (err) {
      console.error('Delete employee error:', err);
      setIsDeleting(false);
      setStatusMessage('Ошибка при удалении');
    }
  };

  // Remove / Detach employee from selected department without deleting
  const handleRemoveFromDepartment = async () => {
    if (!employee.id) return;
    setIsSaving(true);
    setStatusMessage('Снятие сотрудника с текущих отделов...');
    try {
      const res = await fetch(`/api/employees/${employee.id}/remove-from-dept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department_id: selectedDeptIds[0] || 'flagship'
        })
      });
      if (res.ok) {
        setSelectedDeptIds(['flagship']);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('db-employees-updated'));
          window.dispatchEvent(new CustomEvent('db-updated'));
        }
        setStatusMessage('Сотрудник снят с отделов и перемещен на флагман!');
        setTimeout(() => {
          setIsSaving(false);
          onClose();
        }, 600);
      } else {
        setIsSaving(false);
      }
    } catch (e) {
      console.error('Failed to detach dept:', e);
      setIsSaving(false);
    }
  };

  const isNewEmployee = !employee.id || employee.id.startsWith('new-');

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 backdrop-blur-md animate-fade-in"
      style={{ backgroundColor: isLight ? 'rgba(255,251,245,0.85)' : 'rgba(20,10,1,0.85)' }}
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border overflow-hidden shadow-2xl transition-all duration-300"
        style={{
          backgroundColor: isLight ? 'rgba(255,255,255,0.95)' : 'rgba(26,15,2,0.95)',
          borderColor: isLight ? 'rgba(180,120,20,0.4)' : 'rgba(231,199,104,0.5)',
          boxShadow: isLight ? '0 10px 40px rgba(180,120,20,0.2)' : '0 0 30px rgba(244,238,142,0.2)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div 
          className="px-6 py-4 flex items-center justify-between border-b shrink-0"
          style={{
            borderColor: isLight ? 'rgba(180,120,20,0.25)' : 'rgba(231,199,104,0.3)',
            background: isLight ? 'rgba(250,246,236,0.8)' : 'rgba(20,10,1,0.6)'
          }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-inner"
              style={{
                backgroundColor: isLight ? '#FAF6EC' : '#140A01',
                borderColor: isLight ? '#D99E41' : '#E7C768',
                color: isLight ? '#92400E' : '#F4EE8E'
              }}
            >
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 
                className="text-base sm:text-lg font-black"
                style={{ color: isLight ? '#78350F' : '#F4EE8E' }}
              >
                {isProfileMode 
                  ? `Редактирование профиля: ${name || 'Пользователь'}` 
                  : (isNewEmployee ? 'Добавление нового сотрудника' : `Карточка сотрудника: ${name || 'Без имени'}`)}
              </h3>
              <p 
                className="text-sm font-medium"
                style={{ color: isLight ? '#92400E' : '#E7C768' }}
              >
                {isProfileMode 
                  ? 'Синхронизация профиля и карточки сотрудника в PostgreSQL BD ProTalk' 
                  : `Синхронизация с базой данных PostgreSQL BD ProTalk (${companyName})`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg border transition-colors hover:opacity-80"
            style={{
              borderColor: isLight ? 'rgba(180,120,20,0.3)' : 'rgba(231,199,104,0.4)',
              color: isLight ? '#78350F' : '#E7C768'
            }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* Status Message */}
          {statusMessage && (
            <div 
              className="p-3 rounded-xl border text-sm font-semibold flex items-center gap-2 animate-fade-in"
              style={{
                backgroundColor: isLight ? 'rgba(254,243,199,0.7)' : 'rgba(40,25,5,0.7)',
                borderColor: isLight ? '#D99E41' : '#E7C768',
                color: isLight ? '#78350F' : '#F4EE8E'
              }}
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Section 1: Core Profile */}
          <div className="space-y-4">
            <h4 
              className="text-sm font-black tracking-wide flex items-center gap-2"
              style={{ color: isLight ? '#92400E' : '#E7C768' }}
            >
              <Briefcase className="w-4 h-4" />
              <span>Основные данные сотрудника</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: isLight ? '#78350F' : '#F4EE8E' }}>
                  ФИО / Имя сотрудника *
                </label>
                <MiniAudioField
                  value={name}
                  onChange={setName}
                  placeholder="Например: Иван Иванов"
                  isLightTheme={isLight}
                />
              </div>

              {/* Position */}
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: isLight ? '#78350F' : '#F4EE8E' }}>
                  Должность / Специализация
                </label>
                {canEditRole ? (
                  <MiniAudioField
                    value={position}
                    onChange={setPosition}
                    placeholder="Например: Ведущий аналитик"
                    isLightTheme={isLight}
                  />
                ) : (
                  <div
                    className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium flex items-center justify-between select-none"
                    style={{
                      backgroundColor: isLight ? 'rgba(254,243,199,0.25)' : 'rgba(20,10,1,0.5)',
                      borderColor: isLight ? 'rgba(180,120,20,0.3)' : 'rgba(231,199,104,0.3)',
                      color: isLight ? '#451A03' : '#F4EE8E'
                    }}
                  >
                    <span>{position || 'Специалист'}</span>
                    <span className="text-sm opacity-70 ml-2">
                      (Только просмотр)
                    </span>
                  </div>
                )}
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: isLight ? '#78350F' : '#F4EE8E' }}>
                  Системная роль в компании
                </label>
                {canEditRole ? (
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all cursor-pointer font-medium"
                    style={{
                      backgroundColor: isLight ? 'rgba(255,253,248,0.7)' : 'rgba(20,10,1,0.7)',
                      borderColor: isLight ? 'rgba(180,120,20,0.4)' : 'rgba(231,199,104,0.4)',
                      color: isLight ? '#451A03' : '#FFFDF5'
                    }}
                  >
                    <option value={UserRole.EMPLOYEE}>Сотрудник</option>
                    <option value={UserRole.MANAGER}>Руководитель</option>
                    <option value={UserRole.DIRECTOR}>Директор</option>
                    {isSuperAdmin && (
                      <>
                        <option value={UserRole.ADMIN}>Администратор</option>
                        <option value={UserRole.SUPER_ADMIN}>Супер-Администратор</option>
                      </>
                    )}
                  </select>
                ) : (
                  <div
                    className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium flex items-center justify-between select-none"
                    style={{
                      backgroundColor: isLight ? 'rgba(254,243,199,0.25)' : 'rgba(20,10,1,0.5)',
                      borderColor: isLight ? 'rgba(180,120,20,0.3)' : 'rgba(231,199,104,0.3)',
                      color: isLight ? '#451A03' : '#F4EE8E'
                    }}
                  >
                    <span>
                      {role === UserRole.SUPER_ADMIN ? 'Супер-Администратор' :
                       role === UserRole.ADMIN ? 'Администратор' :
                       role === UserRole.DIRECTOR ? 'Директор' :
                       role === UserRole.MANAGER ? 'Руководитель' :
                       'Сотрудник'}
                    </span>
                    <span className="text-sm opacity-70 ml-2">
                      (Только просмотр)
                    </span>
                  </div>
                )}
              </div>

              {/* Department Multi-Selector */}
              <div>
                <label className="block text-sm font-bold mb-1.5 flex items-center justify-between" style={{ color: isLight ? '#78350F' : '#F4EE8E' }}>
                  <span>Привязка к отделам / Подотделам</span>
                  <span className="text-sm font-normal opacity-80">{canEditRole ? '(Можно выбрать несколько)' : '(Только просмотр)'}</span>
                </label>

                {/* Selected Departments Chips */}
                <div className="flex flex-wrap gap-1.5 mb-2.5 p-2 rounded-xl border min-h-[42px] items-center"
                  style={{
                    backgroundColor: isLight ? 'rgba(254,243,199,0.3)' : 'rgba(20,10,1,0.5)',
                    borderColor: isLight ? 'rgba(180,120,20,0.3)' : 'rgba(231,199,104,0.3)'
                  }}
                >
                  {selectedDeptIds.map(dId => {
                    const label = getDeptLabel(dId);
                    return (
                      <span 
                        key={dId}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold border transition-all shadow-sm"
                        style={{
                          backgroundColor: isLight ? '#FAF6EC' : 'rgba(231,199,104,0.15)',
                          borderColor: isLight ? '#D99E41' : '#E7C768',
                          color: isLight ? '#78350F' : '#F4EE8E'
                        }}
                      >
                        <span>{label}</span>
                        {selectedDeptIds.length > 1 && canEditRole && (
                          <button
                            type="button"
                            onClick={() => toggleDepartmentSelection(dId)}
                            className="hover:opacity-75 cursor-pointer ml-1"
                            title="Удалить привязку"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </span>
                    );
                  })}
                </div>

                {/* Available Departments Checkbox Hierarchical List (Only for Directors) */}
                {canEditRole && (
                <div className="max-h-56 overflow-y-auto space-y-1 p-2 rounded-xl border"
                  style={{
                    backgroundColor: isLight ? '#FFFDF8' : '#140A01',
                    borderColor: isLight ? 'rgba(180,120,20,0.3)' : 'rgba(231,199,104,0.3)'
                  }}
                >
                  {/* Flagship Option */}
                  <label 
                    className="flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors text-sm font-bold border border-transparent hover:border-amber-400/30"
                    style={{
                      backgroundColor: isDeptSelected('flagship') 
                        ? (isLight ? 'rgba(254,243,199,0.7)' : 'rgba(231,199,104,0.2)') 
                        : 'transparent',
                      color: isLight ? '#451A03' : '#F4EE8E'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isDeptSelected('flagship')}
                      onChange={() => toggleDepartmentSelection('flagship')}
                      className="rounded accent-amber-500 cursor-pointer w-4 h-4"
                    />
                    <span>🛸 Командный мостик / Флагман ({companyName})</span>
                  </label>

                  {/* Top-Level Departments and their child subdepartments */}
                  {topLevelDepts.map((dept) => {
                    const isChecked = isDeptSelected(dept.id);
                    const childSubs = subDeptsByParent[dept.id] || [];

                    return (
                      <div key={dept.id} className="space-y-1">
                        {/* Parent Department */}
                        <label 
                          className="flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors text-sm font-bold border border-transparent hover:border-amber-400/30"
                          style={{
                            backgroundColor: isChecked 
                              ? (isLight ? 'rgba(254,243,199,0.7)' : 'rgba(231,199,104,0.2)') 
                              : 'transparent',
                            color: isLight ? '#451A03' : (isChecked ? '#F4EE8E' : '#FFFDF5')
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleDepartmentSelection(dept.id)}
                            className="rounded accent-amber-500 cursor-pointer w-4 h-4"
                          />
                          <span>🚀 Отдел: {dept.name}</span>
                        </label>

                        {/* Indented Child Subdepartments */}
                        {childSubs.map((sub: any) => {
                          const isSubChecked = isDeptSelected(sub.id);
                          return (
                            <label 
                              key={sub.id} 
                              className="flex items-center gap-2.5 py-1.5 px-2 ml-4 rounded-lg cursor-pointer transition-colors text-sm font-medium border border-transparent hover:border-amber-400/30"
                              style={{
                                backgroundColor: isSubChecked 
                                  ? (isLight ? 'rgba(254,243,199,0.7)' : 'rgba(231,199,104,0.2)') 
                                  : 'transparent',
                                color: isLight ? '#78350F' : (isSubChecked ? '#F4EE8E' : '#FFFDF5')
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isSubChecked}
                                onChange={() => toggleDepartmentSelection(sub.id)}
                                className="rounded accent-amber-500 cursor-pointer w-4 h-4"
                              />
                              <span className="text-amber-500 font-bold">↳</span>
                              <span>{sub.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    );
                  })}

                  {/* Orphaned Subdepartments (if any) */}
                  {orphanedSubDepts.map((sub: any) => {
                    const isSubChecked = isDeptSelected(sub.id);
                    return (
                      <label 
                        key={sub.id} 
                        className="flex items-center gap-2.5 py-1.5 px-2 ml-2 rounded-lg cursor-pointer transition-colors text-sm font-medium border border-transparent hover:border-amber-400/30"
                        style={{
                          backgroundColor: isSubChecked 
                            ? (isLight ? 'rgba(254,243,199,0.7)' : 'rgba(231,199,104,0.2)') 
                            : 'transparent',
                          color: isLight ? '#78350F' : (isSubChecked ? '#F4EE8E' : '#FFFDF5')
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSubChecked}
                          onChange={() => toggleDepartmentSelection(sub.id)}
                          className="rounded accent-amber-500 cursor-pointer w-4 h-4"
                        />
                        <span className="text-amber-500 font-bold">↳</span>
                        <span>Подотдел: {sub.name}</span>
                      </label>
                    );
                  })}
                </div>
                )}
              </div>
            </div>

            {/* Copy Employee to Another Department Action Block (Only for Directors) */}
            {!isNewEmployee && departments.length > 0 && canEditRole && (
              <div 
                className="p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm"
                style={{
                  backgroundColor: isLight ? 'rgba(254,243,199,0.5)' : 'rgba(40,25,5,0.4)',
                  borderColor: isLight ? 'rgba(180,120,20,0.3)' : 'rgba(231,199,104,0.3)'
                }}
              >
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-amber-500 shrink-0" />
                  <div>
                    <p className="font-bold" style={{ color: isLight ? '#78350F' : '#F4EE8E' }}>Копировать в другой отдел</p>
                    <p className="opacity-80" style={{ color: isLight ? '#92400E' : '#E7C768' }}>Создаст дубликат сотрудника с сохранением всех данных</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={copyTargetDeptId}
                    onChange={(e) => setCopyTargetDeptId(e.target.value)}
                    className="flex-1 sm:flex-initial px-3 py-2 rounded-lg border text-sm outline-none cursor-pointer font-medium"
                    style={{
                      backgroundColor: isLight ? '#FFFDF8' : '#140A01',
                      borderColor: isLight ? 'rgba(180,120,20,0.4)' : 'rgba(231,199,104,0.4)',
                      color: isLight ? '#451A03' : '#F4EE8E'
                    }}
                  >
                    <option value="">Выберите отдел назначения...</option>
                    <option value="flagship">🛸 Командный мостик / Флагман</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.type === 'subdepartment' ? '↳ ' : '🚀 '} {dept.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={isCopying || !copyTargetDeptId}
                    onClick={handleCopyToDepartment}
                    className="px-3 py-2 rounded-lg border font-bold flex items-center gap-1 transition-all disabled:opacity-50 cursor-pointer hover:opacity-90 shrink-0 text-sm"
                    style={{
                      backgroundColor: isLight ? '#FAF6EC' : '#140A01',
                      borderColor: isLight ? '#D99E41' : '#E7C768',
                      color: isLight ? '#78350F' : '#F4EE8E'
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isCopying ? 'Копирование...' : 'Копировать'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Contact Info */}
          <div className="space-y-4 pt-3 border-t" style={{ borderColor: isLight ? 'rgba(180,120,20,0.2)' : 'rgba(231,199,104,0.2)' }}>
            <h4 
              className="text-sm font-black tracking-wide flex items-center gap-2"
              style={{ color: isLight ? '#92400E' : '#E7C768' }}
            >
              <Send className="w-4 h-4" />
              <span>Контакты, часовой пояс и Telegram интеграция</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Telegram Username */}
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: isLight ? '#78350F' : '#F4EE8E' }}>
                  Telegram Username
                </label>
                <MiniAudioField
                  value={telegramHandle}
                  onChange={(val) => setTelegramHandle(val.startsWith('@') ? val : (val ? '@' + val : ''))}
                  placeholder="@username"
                  isLightTheme={isLight}
                />
              </div>

              {/* Telegram ID */}
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: isLight ? '#78350F' : '#F4EE8E' }}>
                  Telegram ID (для отправки рапортов)
                </label>
                <MiniAudioField
                  value={telegramId}
                  onChange={setTelegramId}
                  placeholder="Например: 123456789"
                  isLightTheme={isLight}
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: isLight ? '#78350F' : '#F4EE8E' }}>
                  Рабочий Email
                </label>
                <MiniAudioField
                  value={email}
                  onChange={setEmail}
                  placeholder="employee@company.com"
                  isLightTheme={isLight}
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: isLight ? '#78350F' : '#F4EE8E' }}>
                  Номер телефона
                </label>
                <MiniAudioField
                  value={phone}
                  onChange={setPhone}
                  placeholder="+7 (999) 000-00-00"
                  isLightTheme={isLight}
                />
              </div>

              {/* Timezone */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-bold mb-1.5 flex items-center gap-1.5" style={{ color: isLight ? '#78350F' : '#F4EE8E' }}>
                  <Globe className="w-3.5 h-3.5" />
                  <span>Часовой пояс (Timezone)</span>
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all cursor-pointer font-medium"
                  style={{
                    backgroundColor: isLight ? '#FFFDF8' : '#140A01',
                    borderColor: isLight ? 'rgba(180,120,20,0.4)' : 'rgba(231,199,104,0.4)',
                    color: isLight ? '#451A03' : '#FFFDF5'
                  }}
                >
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section: Security & Password */}
          <div className="space-y-4 pt-3 border-t" style={{ borderColor: isLight ? 'rgba(180,120,20,0.2)' : 'rgba(231,199,104,0.2)' }}>
            <div className="flex items-center justify-between">
              <h4 
                className="text-sm font-black tracking-wide flex items-center gap-2"
                style={{ color: isLight ? '#92400E' : '#E7C768' }}
              >
                <Lock className="w-4 h-4" />
                <span>Безопасность и пароль для входа</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-sm font-bold underline opacity-80 hover:opacity-100 cursor-pointer"
                style={{ color: isLight ? '#78350F' : '#F4EE8E' }}
              >
                {showPassword ? 'Скрыть символы' : 'Показать символы'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: isLight ? '#78350F' : '#F4EE8E' }}>
                  {isNewEmployee ? 'Пароль для входа (мин. 6 симв.)' : 'Новый пароль (оставьте пустым, если не меняется)'}
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all font-medium"
                  style={{
                    backgroundColor: isLight ? '#FFFDF8' : '#140A01',
                    borderColor: isLight ? 'rgba(180,120,20,0.4)' : 'rgba(231,199,104,0.4)',
                    color: isLight ? '#451A03' : '#FFFDF5'
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: isLight ? '#78350F' : '#F4EE8E' }}>
                  Подтверждение пароля
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all font-medium"
                  style={{
                    backgroundColor: isLight ? '#FFFDF8' : '#140A01',
                    borderColor: isLight ? 'rgba(180,120,20,0.4)' : 'rgba(231,199,104,0.4)',
                    color: isLight ? '#451A03' : '#FFFDF5'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Duties & AI */}
          <div className="space-y-4 pt-3 border-t" style={{ borderColor: isLight ? 'rgba(180,120,20,0.2)' : 'rgba(231,199,104,0.2)' }}>
            <div className="flex items-center justify-between gap-2">
              <h4 
                className="text-sm font-black tracking-wide flex items-center gap-2"
                style={{ color: isLight ? '#92400E' : '#E7C768' }}
              >
                <BookOpen className="w-4 h-4" />
                <span>Должностные обязанности и задачи</span>
              </h4>
            </div>

            {/* Quick Templates */}
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-sm font-bold" style={{ color: isLight ? '#92400E' : '#E7C768' }}>
                Быстрые шаблоны:
              </span>
              <button
                type="button"
                onClick={() => handleApplyPreset('sales')}
                className="px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors hover:opacity-80 cursor-pointer"
                style={{ borderColor: isLight ? 'rgba(180,120,20,0.3)' : 'rgba(231,199,104,0.4)', color: isLight ? '#78350F' : '#E7C768' }}
              >
                + Продажи
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('dev')}
                className="px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors hover:opacity-80 cursor-pointer"
                style={{ borderColor: isLight ? 'rgba(180,120,20,0.3)' : 'rgba(231,199,104,0.4)', color: isLight ? '#78350F' : '#E7C768' }}
              >
                + Разработка
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('marketing')}
                className="px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors hover:opacity-80 cursor-pointer"
                style={{ borderColor: isLight ? 'rgba(180,120,20,0.3)' : 'rgba(231,199,104,0.4)', color: isLight ? '#78350F' : '#E7C768' }}
              >
                + Маркетинг
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('head')}
                className="px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors hover:opacity-80 cursor-pointer"
                style={{ borderColor: isLight ? 'rgba(180,120,20,0.3)' : 'rgba(231,199,104,0.4)', color: isLight ? '#78350F' : '#E7C768' }}
              >
                + Руководитель
              </button>
            </div>

            {/* Voice Dictation for Duties */}
            <div>
              <AudioField
                value={newDuty}
                onChange={setNewDuty}
                placeholder="Надиктуйте голосом обязанности или введите тезисы..."
                label="Голосовой ввод обязанностей (с распознаванием речи):"
                isLightTheme={isLight}
                minHeight="85px"
              />
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2.5">
                <button
                  type="button"
                  disabled={!newDuty.trim()}
                  onClick={handleAddDuty}
                  className="px-4 py-2.5 rounded-xl border text-sm font-bold flex items-center justify-center gap-1.5 transition-all hover:opacity-90 disabled:opacity-40 cursor-pointer shadow-sm"
                  style={{
                    backgroundColor: isLight ? '#FAF6EC' : '#140A01',
                    borderColor: isLight ? '#D99E41' : '#E7C768',
                    color: isLight ? '#78350F' : '#F4EE8E'
                  }}
                >
                  <Plus className="w-4 h-4" />
                  <span>Добавить в список обязанностей</span>
                </button>
              </div>

              {/* AI Generation button placed directly below Add to Duties button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={isGeneratingAi}
                  onClick={handleAiGenerateDuties}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border text-sm font-bold flex items-center justify-center gap-1.5 transition-all hover:opacity-90 shadow-sm disabled:opacity-50 cursor-pointer"
                  style={{
                    backgroundColor: isLight ? 'rgba(250, 246, 236, 0.9)' : 'rgba(20, 10, 1, 0.9)',
                    borderColor: isLight ? '#D99E41' : '#E7C768',
                    color: isLight ? '#78350F' : '#F4EE8E'
                  }}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Сгенерировать через ИИ</span>
                </button>
              </div>
            </div>

            {/* Duties List */}
            <div className="space-y-2">
              <label className="block text-sm font-bold" style={{ color: isLight ? '#78350F' : '#F4EE8E' }}>
                Текущий список должностных обязанностей ({dutiesList.length}):
              </label>
              {dutiesList.length > 0 ? (
                dutiesList.map((duty, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border text-sm"
                    style={{
                      backgroundColor: isLight ? '#FFFDF8' : 'rgba(20,10,1,0.6)',
                      borderColor: isLight ? 'rgba(180,120,20,0.25)' : 'rgba(231,199,104,0.3)',
                      color: isLight ? '#451A03' : '#FFFDF5'
                    }}
                  >
                    <span className="flex-1 font-medium text-sm">{duty}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDuty(idx)}
                      className="p-1 rounded text-red-500 hover:opacity-80 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-sm italic py-1" style={{ color: isLight ? '#92400E' : '#E7C768' }}>
                  Список обязанностей пока пуст. Добавьте вручную, надиктуйте голосом или нажмите генерацию через ИИ.
                </p>
              )}
            </div>
          </div>



          {/* Modal Footer Actions */}
          <div 
            className="pt-4 border-t flex flex-col-reverse sm:flex-row items-center justify-between gap-3"
            style={{ borderColor: isLight ? 'rgba(180,120,20,0.25)' : 'rgba(231,199,104,0.3)' }}
          >
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {!isNewEmployee && selectedDeptIds.some(id => id !== 'flagship') && (
                <button
                  type="button"
                  disabled={isSaving || isDeleting}
                  onClick={handleRemoveFromDepartment}
                  className="px-3.5 py-2.5 rounded-xl border border-amber-500/40 text-amber-800 dark:text-amber-300 text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-amber-500/10 transition-colors disabled:opacity-50 cursor-pointer"
                  title="Снять сотрудника с отделов и перевести на Флагман"
                >
                  <span>Снять с отдела</span>
                </button>
              )}

              {!isNewEmployee && onCascadeDismiss && employee && employee.id !== '91827364501' && (
                <button
                  type="button"
                  disabled={isDeleting || isSaving}
                  onClick={() => onCascadeDismiss(employee)}
                  className="px-4 py-2.5 rounded-xl border border-amber-500/50 text-amber-950 dark:text-[#F4EE8E] bg-amber-500/10 text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-amber-500/20 transition-colors disabled:opacity-50 cursor-pointer"
                  title="Каскадное увольнение с передачей дел, балансов и прав преемнику"
                >
                  <ArrowRightLeft className="w-4 h-4 text-[#E7C768]" />
                  <span>Уволить с передачей дел</span>
                </button>
              )}

              {!isNewEmployee && onDelete && !isDirectorOrAdmin && !onCascadeDismiss && (
                <button
                  type="button"
                  disabled={isDeleting || isSaving}
                  onClick={() => setIsConfirmDeleteOpen(true)}
                  className="px-4 py-2.5 rounded-xl border border-orange-500/50 text-orange-600 dark:text-orange-400 text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-orange-500/15 transition-colors disabled:opacity-50 cursor-pointer"
                  title="Полное увольнение и каскадное удаление из базы данных компании"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Уволить из компании</span>
                </button>
              )}
              {!isNewEmployee && isDirectorOrAdmin && (
                <span className="text-sm font-semibold px-2 py-1 text-amber-700 dark:text-amber-300/80 italic">
                  Руководитель компании
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border text-sm font-bold transition-colors hover:opacity-80 cursor-pointer"
                style={{
                  borderColor: isLight ? 'rgba(180,120,20,0.3)' : 'rgba(231,199,104,0.4)',
                  color: isLight ? '#78350F' : '#E7C768'
                }}
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl border text-sm font-black flex items-center justify-center gap-1.5 transition-all shadow-md hover:scale-[1.02] disabled:opacity-50 cursor-pointer"
                style={{
                  background: isLight 
                    ? 'linear-gradient(135deg, #D99E41, #F4EE8E)' 
                    : 'linear-gradient(135deg, #E7C768, #F4EE8E)',
                  borderColor: '#E7C768',
                  color: '#140A01',
                  boxShadow: '0 0 15px rgba(244,238,142,0.3)'
                }}
              >
                <Check className="w-4 h-4" />
                <span>{isSaving ? 'Сохранение...' : 'Сохранить изменения'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* AI RR Loading Overlay with Mascot IIRR5 and 120s timer */}
      <AiLoadingOverlay
        isOpen={isGeneratingAi}
        title="ИИ Ревизор RR генерирует обязанности"
        subtitle="Формирование должностных обязанностей и грейдов на основе контекста компании и заметок..."
        isLightTheme={isLight}
        maxSeconds={120}
        onCancel={() => setIsGeneratingAi(false)}
      />

      {/* Custom Dismissal Confirmation Modal */}
      {isConfirmDeleteOpen && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-lg animate-fade-in"
          style={{ backgroundColor: isLight ? 'rgba(255,251,245,0.85)' : 'rgba(20,10,1,0.88)' }}
          onClick={() => !isDeleting && setIsConfirmDeleteOpen(false)}
        >
          <div 
            className="w-full max-w-md p-6 rounded-2xl border shadow-2xl flex flex-col items-center text-center space-y-4"
            style={{
              backgroundColor: isLight ? 'rgba(255,255,255,0.98)' : 'rgba(26,15,2,0.98)',
              borderColor: isLight ? 'rgba(220,38,38,0.5)' : 'rgba(239,68,68,0.6)',
              boxShadow: isLight ? '0 15px 40px rgba(220,38,38,0.2)' : '0 0 35px rgba(239,68,68,0.25)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center border border-red-500/40 bg-red-500/10 text-red-500 shadow-inner">
              <Trash2 className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-black text-red-500 dark:text-red-400">
                Подтверждение увольнения
              </h3>
              <p className="text-sm text-amber-900/80 dark:text-amber-100/80 leading-relaxed">
                Вы действительно хотите полностью уволить сотрудника <strong className="text-amber-950 dark:text-amber-200">{name || 'Сотрудник'}</strong>?
              </p>
              <p className="text-sm text-amber-800/80 dark:text-amber-200/80">
                Все привязанные смены, графики и карточка сотрудника будут каскадно удалены из базы данных PostgreSQL BD ProTalk.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsConfirmDeleteOpen(false)}
                className="flex-1 py-2.5 rounded-xl border text-sm font-bold transition-colors hover:opacity-80 disabled:opacity-50 cursor-pointer"
                style={{
                  borderColor: isLight ? 'rgba(180,120,20,0.3)' : 'rgba(231,199,104,0.4)',
                  color: isLight ? '#78350F' : '#E7C768'
                }}
              >
                Отмена
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  await handleDelete();
                  setIsConfirmDeleteOpen(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-black shadow-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Увольнение...' : 'Да, уволить'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
