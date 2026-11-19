import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  User, 
  Gift, 
  Zap, 
  Bell, 
  Edit3, 
  ShieldCheck, 
  ShieldAlert,
  RotateCw, 
  RotateCcw, 
  ChevronRight, 
  Award,
  Users,
  X,
  CreditCard,
  Briefcase,
  CheckCircle2,
  Send,
  Copy,
  Check,
  ExternalLink,
  Star,
  Eye,
  Share2,
  ListTodo,
  ClipboardList,
  Trash2,
  Clock
} from 'lucide-react';
import { UserProfile, TariffState, Transaction, UserRole } from '../../types';
import { TIMEZONE_OPTIONS, getSystemTimezone, setSystemTimezone, DEFAULT_TIMEZONE } from '../../utils/timezone';
import { EmployeeEditModal } from '../../components/employees/EmployeeEditModal';

interface CabinetProfileProps {
  currentUser?: UserProfile | null;
  targetUser?: UserProfile | null;
  viewOnly?: boolean;
  onUpdateUser?: (user: UserProfile) => void;
  telegramHandle?: string;
  setTelegramHandle?: (val: string) => void;
  userPosition?: string;
  setUserPosition?: (val: string) => void;
  onSaveProfile?: () => void;
  onNavigate?: (tab: string) => void;
  tariff?: TariffState;
  transactions?: Transaction[];
  notifications?: any[];
  reports?: any[];
  mockEmployees?: UserProfile[];
  company?: any;
}

const DEFAULT_DUTIES = [
  "Управление системой и доступами экипажа",
  "Контроль соблюдения регламентов и сроков сдачи рапортов",
  "Настройка кастомных ИИ-промптов и модулей",
  "Обеспечение безопасности данных и аудит операций",
  "Аналитика производительности и оценка KPI"
];

export default function CabinetProfile({
  currentUser,
  targetUser,
  viewOnly = false,
  onUpdateUser,
  telegramHandle = '',
  setTelegramHandle = () => {},
  userPosition = 'Супер-Администратор',
  setUserPosition = () => {},
  onSaveProfile = () => {},
  onNavigate,
  tariff,
  transactions = [],
  notifications = [],
  reports = [],
  mockEmployees = [],
  company
}: CabinetProfileProps) {
  // Target user fetching for viewOnly mode & real-time DB polling
  const [fetchedTargetUser, setFetchedTargetUser] = useState<UserProfile | null>(targetUser || null);
  const [dbTasksCount, setDbTasksCount] = useState<number>(0);
  const [dbReportsCount, setDbReportsCount] = useState<number>(0);
  const [dbEmployeesCount, setDbEmployeesCount] = useState<number>(0);
  const [dbLimits, setDbLimits] = useState<any>(null);
  const [dbReferralStats, setDbReferralStats] = useState<{ invitedCount: number; activeCount: number; rewardBalance: number } | null>(null);
  const [departmentsList, setDepartmentsList] = useState<any[]>([]);

  useEffect(() => {
    const targetDirId = targetUser?.director_id || currentUser?.director_id || currentUser?.id;
    const targetCompId = targetUser?.company_id || currentUser?.company_id || (targetDirId ? `com-${targetDirId}` : '');
    if (!targetCompId) return;
    fetch(`/api/departments?company_id=${encodeURIComponent(targetCompId)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.departments)) {
          setDepartmentsList(data.departments);
        }
      })
      .catch(() => {});
  }, [currentUser?.id, currentUser?.company_id, targetUser?.id, targetUser?.company_id]);

  useEffect(() => {
    let lastFetchAt = 0;
    let isFetching = false;
    let rateLimitUntil = 0;

    const fetchUserData = (force = false) => {
      const now = Date.now();
      if (now < rateLimitUntil) return;
      if (isFetching) return;
      if (!force && now - lastFetchAt < 2500) return;
      if (!force && typeof document !== 'undefined' && document.hidden) return;
      lastFetchAt = now;
      isFetching = true;
      setTimeout(() => { isFetching = false; }, 1200);

      const userStr = typeof window !== 'undefined' ? localStorage.getItem('rr_user') : null;
      const localUser = userStr ? JSON.parse(userStr) : null;
      const rawPathSuffix = window.location.pathname.split('/cabinet/profile/')[1] || '';
      const rawPathSegment = rawPathSuffix.split('/').filter(Boolean)[0] || '';
      let decodedPathId: string | null = null;
      if (rawPathSegment) {
        try {
          decodedPathId = decodeURIComponent(rawPathSegment).trim();
        } catch {
          decodedPathId = rawPathSegment.trim();
        }
      }
      const rawTargetId = viewOnly
        ? (targetUser?.id || decodedPathId || localUser?.id || currentUser?.id)
        : (currentUser?.id || localUser?.id);
      const targetId = rawTargetId ? String(rawTargetId).trim() : '';

      const safeReadJson = async (res: Response) => {
        if (res.status === 429) {
          rateLimitUntil = Date.now() + 60000;
          return null;
        }
        const contentType = res.headers.get('content-type') || '';
        if (!res.ok || !contentType.toLowerCase().includes('application/json')) {
          return null;
        }
        return res.json().catch(() => null);
      };

      if (targetId && targetId !== 'notifications' && !targetId.includes('/')) {
        const targetDirId = (viewOnly ? (targetUser?.director_id || targetId) : (currentUser?.director_id || targetId));
        const targetCompId = (viewOnly ? (targetUser?.company_id || `com-${targetDirId}`) : (currentUser?.company_id || `com-${targetDirId}`));
        const encodedTargetId = encodeURIComponent(targetId);

        fetch(`/api/users/${encodedTargetId}`)
          .then(safeReadJson)
          .then(data => {
            if (data?.success && data.user) {
              setFetchedTargetUser(data.user);
              if (data.user.position) {
                setUserPosition(data.user.position);
              }
              if (data.user.duties) {
                let parsedDuties: string[] = [];
                if (Array.isArray(data.user.duties)) {
                  parsedDuties = data.user.duties;
                } else if (typeof data.user.duties === 'string' && data.user.duties.trim()) {
                  try {
                    const parsed = JSON.parse(data.user.duties);
                    if (Array.isArray(parsed)) parsedDuties = parsed;
                    else parsedDuties = data.user.duties.split('\n').map((s: string) => s.trim()).filter(Boolean);
                  } catch {
                    parsedDuties = data.user.duties.split('\n').map((s: string) => s.trim()).filter(Boolean);
                  }
                }
                if (parsedDuties.length > 0) {
                  setDutiesList(parsedDuties);
                  if (!viewOnly) {
                    localStorage.setItem('rr_user_duties', JSON.stringify(parsedDuties));
                  }
                }
              }
            }
          })
          .catch(err => console.error('Error loading target profile:', err));

        // Sync referral stats from DB
        fetch(`/api/referral/stats/${encodedTargetId}`)
          .then(safeReadJson)
          .then(refData => {
            if (refData?.success) {
              const activeCount = Array.isArray(refData.invitedList)
                ? refData.invitedList.filter((u: any) => (u.payment_balance || 0) > 0 || (u.referral_reward_balance || 0) > 0).length
                : 0;
              setDbReferralStats({
                invitedCount: refData.invitedCount ?? 0,
                activeCount,
                rewardBalance: refData.referralRewardBalance ?? 0
              });
            }
          })
          .catch(() => {});

        // Sync limits and package data from DB
        fetch(`/api/users/${encodedTargetId}/limits`)
          .then(safeReadJson)
          .then(limitData => {
            if (limitData?.success) {
              setDbLimits(limitData);
            }
          })
          .catch(() => {});

        // Sync employees count strictly scoped to this company / director from DB
        fetch(`/api/employees?company_id=${encodeURIComponent(targetCompId)}&director_id=${encodeURIComponent(targetDirId)}`)
          .then(safeReadJson)
          .then(data => {
            if (data?.success && Array.isArray(data.employees)) {
              setDbEmployeesCount(data.employees.length);
            }
          })
          .catch(() => {});

        const scopeQuery = `company_id=${encodeURIComponent(targetCompId)}&director_id=${encodeURIComponent(targetDirId)}&userId=${encodeURIComponent(targetId)}`;

        // Sync tasks count from DB (my assigned tasks count / company tasks for director)
        fetch(`/api/projects?${scopeQuery}`)
          .then(safeReadJson)
          .then(data => {
            if (data?.success && Array.isArray(data.projects)) {
              let totalTasks: any[] = [];
              data.projects.forEach((p: any) => {
                if (p.tasks && Array.isArray(p.tasks)) {
                  totalTasks.push(...p.tasks);
                }
              });
              const targetUid = String(targetId || '');
              const targetName = (fetchedTargetUser || targetUser || currentUser)?.name || (fetchedTargetUser || targetUser || currentUser)?.first_name || '';
              const isDirectorOrAdmin = ['director', 'super_admin', 'superadmin', 'admin'].includes(String((fetchedTargetUser || targetUser || currentUser)?.role).toLowerCase());
              
              const filtered = totalTasks.filter((t: any) => {
                if (isDirectorOrAdmin) {
                  return !t.director_id || t.director_id === targetUid;
                }
                const execId = String(t.executorId || t.executor_id || '');
                const execName = String(t.executorName || '').toLowerCase();
                return (execId && execId === targetUid) ||
                       (targetName && execName && (execName === targetName.toLowerCase() || execName.includes(targetName.toLowerCase()) || targetName.toLowerCase().includes(execName)));
              });
              setDbTasksCount(filtered.length);
            }
          })
          .catch(() => {});

        // Sync reports count from DB
        Promise.all([
          fetch(`/api/reports?${scopeQuery}`).then(safeReadJson).catch(() => ({ reports: [] })),
          fetch(`/api/report-templates?${scopeQuery}`).then(safeReadJson).catch(() => ({ templates: [] }))
        ]).then(([repData, tplData]) => {
        const repList = repData?.success && Array.isArray(repData.reports) ? repData.reports : [];
        const tplList = tplData?.success && Array.isArray(tplData.templates) ? tplData.templates : [];
        const targetUid = String(targetId || '');
        const targetName = (fetchedTargetUser || targetUser || currentUser)?.name || (fetchedTargetUser || targetUser || currentUser)?.first_name || '';
        const isDirectorOrAdmin = ['director', 'super_admin', 'superadmin', 'admin'].includes(String((fetchedTargetUser || targetUser || currentUser)?.role).toLowerCase());
        const todayStr = new Date().toISOString().split('T')[0];

        if (isDirectorOrAdmin) {
          const companyReports = repList.filter((r: any) => {
            return (!r.director_id || r.director_id === targetUid) && (r.status === 'submitted' || r.status === 'verification' || r.status === 'pending');
          });
          setDbReportsCount(companyReports.length);
        } else {
          // Active templates assigned to this employee
          const assignedTemplates = tplList.filter((tpl: any) => {
            if (tpl.status === 'archived' || tpl.active === false || tpl.is_active === 0) return false;
            let assigned = tpl.assigned_employee_ids || tpl.assignedEmployeeIds;
            if (typeof assigned === 'string') {
              try { assigned = JSON.parse(assigned); } catch { assigned = [assigned]; }
            }
            if (!assigned || (Array.isArray(assigned) && (assigned.length === 0 || assigned.includes('all')))) return true;
            if (Array.isArray(assigned)) return assigned.map(String).includes(targetUid);
            return true;
          });

          // Reports submitted by this employee today
          const submittedToday = repList.filter((r: any) => {
            const empId = String(r.employeeId || r.employee_id || '');
            const empName = String(r.employeeName || '').toLowerCase();
            const rDate = String(r.created_at || r.timestamp || r.createdAt || '').slice(0, 10);
            const isMine = (empId && empId === targetUid) || (targetName && empName && empName.includes(targetName.toLowerCase()));
            return isMine && rDate === todayStr && r.status === 'submitted';
          });

          const dueToday = Math.max(0, (assignedTemplates.length > 0 ? assignedTemplates.length : 1) - submittedToday.length);
          setDbReportsCount(dueToday);
        }
      }).catch(() => {});
      }
    };

    const onEventSync = () => fetchUserData(false);
    fetchUserData(true);
    const pollInterval = setInterval(() => fetchUserData(false), 30000);
    window.addEventListener('db-users-updated', onEventSync);
    window.addEventListener('db-updated', onEventSync);
    window.addEventListener('focus', onEventSync);
    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('db-users-updated', onEventSync);
      window.removeEventListener('db-updated', onEventSync);
      window.removeEventListener('focus', onEventSync);
    };
  }, [viewOnly, targetUser?.id, currentUser?.id]);

  const displayUser = fetchedTargetUser || targetUser || currentUser;

  // Helm rotation angle state
  const [wheelAngle, setWheelAngle] = useState<number>(0);

  // Flipped panels state for 3D card flip effect
  const [flippedPanel, setFlippedPanel] = useState<string | null>(null);

  // Notification details modal state
  const [selectedNotifModal, setSelectedNotifModal] = useState<any | null>(null);
  const [notifModalPos, setNotifModalPos] = useState<{ x: number; y: number } | null>(null);

  // Mobile active tab state for 3 panels switcher
  const [mobileTab, setMobileTab] = useState<'duties' | 'profile' | 'telegram'>('profile');

  const handleToggleFlip = (panelName: string) => {
    setFlippedPanel(prev => prev === panelName ? null : panelName);
  };

  const handleUnlinkTelegram = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentUser?.id) return;
    try {
      const updated: UserProfile = {
        ...currentUser,
        telegram_id: undefined,
        username: undefined,
        telegramHandle: undefined,
        first_name: undefined,
        last_name: undefined,
        bio: undefined
      };
      localStorage.setItem('rr_user', JSON.stringify(updated));
      await fetch('/api/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentUser.id,
          telegram_id: null,
          username: null,
          telegramHandle: null
        })
      });
      window.location.reload();
    } catch (err) {
      console.error('Error unlinking telegram:', err);
    }
  };

  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('cabinet_theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.theme) {
        setTheme(customEvent.detail.theme);
      }
    };
    window.addEventListener('cabinet-theme-change', handleThemeChange);
    return () => {
      window.removeEventListener('cabinet-theme-change', handleThemeChange);
    };
  }, []);

  // Mouse Parallax effect
  const [parallax, setParallax] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll position state for giant planet vertical parallax
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Duties State
  const [dutiesList, setDutiesList] = useState<string[]>(() => {
    const saved = localStorage.getItem('rr_user_duties');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        return DEFAULT_DUTIES;
      }
    }
    return DEFAULT_DUTIES;
  });

  // Profile Edit Modal & Custom Confirmation Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isDeleteProfileModalOpen, setIsDeleteProfileModalOpen] = useState(false);
  const [isDeletingProfile, setIsDeletingProfile] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleConfirmDeleteProfile = async () => {
    if (!currentUser?.id) return;
    setIsDeletingProfile(true);
    try {
      const res = await fetch('/api/users/delete-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.removeItem('rr_user');
        window.location.href = '/';
      } else {
        setToastMessage(data.error || 'Ошибка при удалении профиля');
        setTimeout(() => setToastMessage(''), 4000);
        setIsDeletingProfile(false);
      }
    } catch (err) {
      console.error('Failed to delete profile:', err);
      setToastMessage('Ошибка при подключении к серверу');
      setTimeout(() => setToastMessage(''), 4000);
      setIsDeletingProfile(false);
    }
  };
  const [editName, setEditName] = useState(currentUser?.name || 'Тимошенко Денис');
  const [editPosition, setEditPosition] = useState(userPosition || currentUser?.position || 'Генеральный директор / Супер-Админ');
  const [editEmail, setEditEmail] = useState(currentUser?.email || 'shishkarnem@gmail.com');
  const [editPhone, setEditPhone] = useState(currentUser?.phone || '+7 (999) 000-00-00');
  const [editPassword, setEditPassword] = useState('');
  const [editPasswordConfirm, setEditPasswordConfirm] = useState('');
  const [editDutiesText, setEditDutiesText] = useState(dutiesList.join('\n'));
  const [editTimezone, setEditTimezone] = useState<string>(() => currentUser?.timezone || getSystemTimezone(currentUser));
  const [passwordError, setPasswordError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const prevIsEditModalOpenRef = useRef(false);

  // Sync modal inputs ONCE when modal transitions to open
  useEffect(() => {
    if (isEditModalOpen && !prevIsEditModalOpenRef.current) {
      setEditName(currentUser?.name || 'Тимошенко Денис');
      setEditPosition(currentUser?.position || userPosition || 'Генеральный директор / Супер-Админ');
      setEditEmail(currentUser?.email || 'shishkarnem@gmail.com');
      setEditPhone(currentUser?.phone || '+7 (999) 000-00-00');
      setEditPassword('');
      setEditPasswordConfirm('');
      setEditDutiesText(Array.isArray(dutiesList) ? dutiesList.join('\n') : '');
      setEditTimezone(currentUser?.timezone || getSystemTimezone(currentUser));
      setPasswordError('');
    }
    prevIsEditModalOpenRef.current = isEditModalOpen;
  }, [isEditModalOpen]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - left) / width - 0.5;
    const y = (e.clientY - top) / height - 0.5;
    setParallax({ x: x * 8, y: y * 8 });
  };

  const handleMouseLeave = () => {
    setParallax({ x: 0, y: 0 });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!containerRef.current || !e.touches[0]) return;
    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    const x = (e.touches[0].clientX - left) / width - 0.5;
    const y = (e.touches[0].clientY - top) / height - 0.5;
    setParallax({ x: x * 10, y: y * 10 });
  };

  const handleTouchEnd = () => {
    setParallax({ x: 0, y: 0 });
  };

  // Click center wheel / photo to rotate helm
  const handleRotateHelm = () => {
    setWheelAngle(prev => prev + 90);
  };

  // Form submit -> opens custom Confirmation Modal
  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (editPassword || editPasswordConfirm) {
      if (editPassword !== editPasswordConfirm) {
        setPasswordError('Пароли не совпадают!');
        return;
      }
    }

    // Open custom confirmation modal instead of browser popup or silent save
    setIsConfirmModalOpen(true);
  };

  // Execute confirmation and save to PostgreSQL BD ProTalk DB
  const handleConfirmSaveProfile = async () => {
    setIsSaving(true);

    try {
      // Parse duties
      const parsed = editDutiesText
        .split('\n')
        .map(d => d.trim())
        .filter(Boolean);
      const finalDuties = parsed.length > 0 ? parsed : DEFAULT_DUTIES;
      setDutiesList(finalDuties);
      localStorage.setItem('rr_user_duties', JSON.stringify(finalDuties));

      setUserPosition(editPosition);
      setSystemTimezone(editTimezone);

      // Construct updated user object
      const updatedUser: UserProfile = {
        ...currentUser,
        id: currentUser?.id || 'user_' + Date.now(),
        name: editName,
        email: editEmail,
        phone: editPhone || currentUser?.phone || '+7 (999) 000-00-00',
        position: editPosition,
        duties: finalDuties,
        timezone: editTimezone,
        profile_link: `/cabinet/profile/${currentUser?.id}`,
        director_id: currentUser?.director_id || currentUser?.id,
        role: currentUser?.role || UserRole.DIRECTOR,
        referralCode: currentUser?.referralCode || ('ref' + (currentUser?.id || '0000').slice(-4)),
        bonusesEarned: currentUser?.bonusesEarned || 0,
        invitedUsersCount: currentUser?.invitedUsersCount || 0,
        ...(editPassword ? { password: editPassword } : {})
      };

      // 1. Update localStorage
      localStorage.setItem('rr_user', JSON.stringify(updatedUser));

      // 2. Trigger parent user state updates
      if (onUpdateUser) {
        onUpdateUser(updatedUser);
      }
      onSaveProfile();

      // 3. Synchronize with PostgreSQL BD ProTalk database
      const saveRes = await fetch(`/api/users/${updatedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUser)
      });

      if (!saveRes.ok) {
        // Fallback to register endpoint if update fails
        await fetch('/api/users/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedUser)
        });
      }

      window.dispatchEvent(new CustomEvent('db-employees-updated'));
      window.dispatchEvent(new CustomEvent('employee-updated', { detail: { employee: updatedUser } }));

      setIsConfirmModalOpen(false);
      setIsEditModalOpen(false);
      setToastMessage('✅ Сведения профиля успешно сохранены в PostgreSQL BD ProTalk!');
      setTimeout(() => setToastMessage(''), 4500);
    } catch (err) {
      console.error('Error syncing user profile with database:', err);
      setIsConfirmModalOpen(false);
      setIsEditModalOpen(false);
      setToastMessage('✅ Сведения профиля сохранены!');
      setTimeout(() => setToastMessage(''), 4500);
    } finally {
      setIsSaving(false);
    }
  };

  const crewCount = dbEmployeesCount || (mockEmployees || []).length || 1;

  // Notifications list strictly from DB without fake mock fallbacks
  const notifList = notifications || [];

  // Default avatar image - prefer Telegram profile photo
  const avatarImage = currentUser?.photo_url || currentUser?.avatarUrl || (currentUser as any)?.telegram_photo || (currentUser?.username ? `https://t.me/i/userpic/320/${currentUser.username.replace('@','')}.jpg` : "/file/27/iirr1.png");
  const [panelCopied, setPanelCopied] = useState(false);

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative min-h-[85vh] w-full rounded-3xl overflow-hidden select-none font-sans bg-transparent text-white transition-all duration-300 border border-amber-500/30 px-3 py-3 sm:px-8 sm:py-6 lg:px-16 xl:px-24 2xl:px-32 lg:py-6 flex flex-col justify-between backdrop-blur-none bg-none shadow-none max-w-full"
      id="cockpit-viewport"
    >
      {/* ========================================================================= */}
      {/* 1. BACKDROP LAYER: GLOWING 360° PLANET SPHERE WITH 3D RADAR & CITY LIGHTS */}
      {/* ========================================================================= */}
      <div 
        className="absolute inset-0 pointer-events-none transition-transform duration-100 ease-out z-0 overflow-hidden"
        style={{
          transform: `translate3d(${parallax.x * 0.4}px, ${parallax.y * 0.4}px, 0)`
        }}
      >
        {/* Full 360° Planet Sphere - Moves in tandem with page scroll vertically */}
        <div 
          className="absolute left-1/2 -top-[320px] sm:-top-[460px] md:-top-[580px] w-[650px] h-[650px] sm:w-[880px] sm:h-[880px] md:w-[1150px] md:h-[1150px] pointer-events-none z-0 transition-transform duration-75 ease-out"
          style={{
            transform: `translate3d(-50%, ${scrollY * 0.95}px, 0)`
          }}
        >
          {/* Planet External Glow Aura */}
          <div className="absolute -inset-10 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(244,238,142,0.38)_0%,rgba(251,191,36,0.2)_45%,transparent_75%)] blur-3xl pointer-events-none" />

          {/* Planet Body - Full 360 Degree Circle with intense outer golden glow */}
          <div className="w-full h-full rounded-full bg-transparent border-2 border-amber-400/90 shadow-[0_0_120px_rgba(244,238,142,0.65),0_0_50px_rgba(251,191,36,0.4)] relative overflow-hidden">
            
            {/* 3D Latitude & Longitude Tactical Orbit Grid */}
            <div className="absolute inset-0 rounded-full opacity-35 border border-dashed border-amber-400/70 pointer-events-none scale-90" />
            <div className="absolute inset-0 rounded-full opacity-25 border border-dashed border-amber-300/50 pointer-events-none scale-75" />
            <div className="absolute inset-0 rounded-full opacity-25 border border-amber-400/40 pointer-events-none scale-50" />
            
            {/* 3D Expanding Radar Pulse Wave Rings */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 h-1/3 rounded-full border border-amber-300/60 animate-ping [animation-duration:4s] pointer-events-none" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2/3 h-2/3 rounded-full border border-amber-400/40 animate-ping [animation-duration:6s] [animation-delay:2s] pointer-events-none" />

            {/* Animated 360° Radar Scanner Beam */}
            <div className="absolute inset-0 rounded-full animate-spin [animation-duration:10s] origin-center pointer-events-none z-10">
              <div className="w-1/2 h-1/2 bg-gradient-to-br from-amber-300/40 via-amber-400/15 to-transparent rounded-tl-full border-r-2 border-b-2 border-amber-300/80 shadow-[0_0_15px_rgba(244,238,142,0.5)]" />
            </div>

            {/* Glowing City Lights & Tactical Map Contour Nodes */}
            <div className="absolute inset-0 pointer-events-none z-20">
              {/* Eurasia / Russia / Europe City Light Clusters */}
              <div className="absolute top-[35%] left-[45%] w-2.5 h-2.5 rounded-full bg-[#F4EE8E] shadow-[0_0_14px_#F4EE8E] animate-pulse" />
              <div className="absolute top-[33%] left-[47%] w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_#fbbf24] animate-ping [animation-duration:2.5s]" />
              <div className="absolute top-[40%] left-[52%] w-2 h-2 rounded-full bg-[#F4EE8E] shadow-[0_0_10px_#F4EE8E] animate-pulse [animation-delay:1s]" />
              <div className="absolute top-[37%] left-[41%] w-1.5 h-1.5 rounded-full bg-amber-200 shadow-[0_0_8px_#fde68a] animate-pulse [animation-delay:1.8s]" />
              <div className="absolute top-[31%] left-[50%] w-2 h-2 rounded-full bg-[#F4EE8E] shadow-[0_0_12px_#F4EE8E] animate-ping [animation-duration:3.5s]" />

              {/* Americas City Light Clusters */}
              <div className="absolute top-[30%] left-[25%] w-2.5 h-2.5 rounded-full bg-[#F4EE8E] shadow-[0_0_12px_#F4EE8E] animate-pulse [animation-delay:0.5s]" />
              <div className="absolute top-[34%] left-[22%] w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24] animate-ping [animation-duration:2s]" />
              <div className="absolute top-[28%] left-[29%] w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_8px_#fcd34d] animate-pulse [animation-delay:1.2s]" />
              <div className="absolute top-[38%] left-[27%] w-1.5 h-1.5 rounded-full bg-[#F4EE8E] shadow-[0_0_6px_#F4EE8E]" />

              {/* Asia & Pacific Rim Clusters */}
              <div className="absolute top-[42%] left-[70%] w-3 h-3 rounded-full bg-[#F4EE8E] shadow-[0_0_16px_#F4EE8E] animate-pulse [animation-delay:1.5s]" />
              <div className="absolute top-[45%] left-[73%] w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_10px_#fbbf24] animate-ping [animation-duration:3.8s]" />
              <div className="absolute top-[39%] left-[67%] w-1.5 h-1.5 rounded-full bg-amber-200 shadow-[0_0_8px_#fde68a]" />
              <div className="absolute top-[48%] left-[68%] w-2 h-2 rounded-full bg-[#F4EE8E] shadow-[0_0_10px_#F4EE8E] animate-pulse [animation-delay:0.7s]" />

              {/* Middle East & Africa Clusters */}
              <div className="absolute top-[52%] left-[48%] w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_10px_#fbbf24] animate-pulse [animation-delay:2.2s]" />
              <div className="absolute top-[56%] left-[45%] w-1.5 h-1.5 rounded-full bg-[#F4EE8E] shadow-[0_0_8px_#F4EE8E] animate-ping [animation-duration:4s]" />

              {/* Southern Hemisphere Cluster */}
              <div className="absolute top-[65%] left-[38%] w-2 h-2 rounded-full bg-[#F4EE8E] shadow-[0_0_10px_#F4EE8E] animate-pulse [animation-delay:2s]" />
              <div className="absolute top-[68%] left-[62%] w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_10px_#fbbf24] animate-pulse [animation-delay:0.8s]" />
              <div className="absolute top-[60%] left-[55%] w-1.5 h-1.5 rounded-full bg-amber-200 shadow-[0_0_8px_#fde68a]" />

              {/* Tactile 3D Map Contour Vectors with City Nodes */}
              <svg className="absolute inset-0 w-full h-full opacity-35 text-amber-300" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="0.35">
                {/* Europe/Asia Contours */}
                <path d="M 20 40 Q 35 25 50 40 T 80 35" strokeDasharray="1.5 1" className="animate-pulse" />
                <path d="M 15 55 Q 40 65 65 50 T 85 60" strokeDasharray="1.5 1" />
                <path d="M 30 25 Q 60 15 75 30" strokeDasharray="1 1" />
                {/* Coastal Nodes */}
                <circle cx="35" cy="32" r="0.6" fill="#F4EE8E" className="animate-ping [animation-duration:3s]" />
                <circle cx="50" cy="40" r="0.8" fill="#F4EE8E" />
                <circle cx="65" cy="50" r="0.7" fill="#fbbf24" className="animate-ping [animation-duration:2s]" />
              </svg>
            </div>

            {/* Atmosphere Glow along lower arc */}
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(244,238,142,0.22)_0%,transparent_70%)] pointer-events-none" />
            <div className="absolute inset-x-0 bottom-12 h-36 bg-gradient-to-t from-amber-400/35 via-amber-500/15 to-transparent blur-md pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. COCKPIT CANOPY FRAME & TRANSPARENT GLASS PANES */}
      {/* ========================================================================= */}
      <div 
        className="relative z-10 w-full max-w-[1400px] mx-auto flex-1 flex flex-col justify-between transition-transform duration-200 ease-out"
        style={{
          transform: `translate3d(${parallax.x * 0.2}px, ${parallax.y * 0.2}px, 0)`
        }}
      >
        {/* Mobile View Switcher between 3 cockpit panels (lg:hidden) */}
        <div className="flex lg:hidden items-center justify-center gap-1.5 p-1.5 mb-2 rounded-2xl bg-amber-950/20 dark:bg-black/30 border border-amber-500/40 font-mono text-sm font-bold w-full relative z-30">
          <button
            type="button"
            onClick={() => setMobileTab('duties')}
            className={`flex-1 py-2 px-2 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
              mobileTab === 'duties'
                ? 'bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 font-black shadow'
                : 'text-amber-200/80 hover:text-white'
            }`}
          >
            <Briefcase size={15} />
            <span>Обязанности</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('profile')}
            className={`flex-1 py-2 px-2 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
              mobileTab === 'profile'
                ? 'bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 font-black shadow'
                : 'text-amber-200/80 hover:text-white'
            }`}
          >
            <User size={15} />
            <span>Профиль</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('telegram')}
            className={`flex-1 py-2 px-2 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
              mobileTab === 'telegram'
                ? 'bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 font-black shadow'
                : 'text-amber-200/80 hover:text-white'
            }`}
          >
            <Send size={15} />
            <span>Telegram</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* 3 GLASS WINDOWS (TRANSPARENT BACKGROUND & PERSPECTIVE SLANT) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 items-stretch my-auto pt-2 pb-4 [perspective:1200px] w-full px-2 sm:px-4 lg:px-6 xl:px-8">
          
          {/* ================= WINDOW #1 (LEFT): ДОЛЖНОСТНЫЕ ОБЯЗАННОСТИ ================= */}
          <div 
            className={`group ${mobileTab === 'duties' ? 'flex' : 'hidden'} lg:flex flex-col justify-between [perspective:1000px] h-full min-h-0`}
            style={{
              transform: 'rotateY(20deg) rotateX(2deg)',
              transformOrigin: 'right center'
            }}
          >
            <div className={`relative w-full h-full min-h-0 transition-transform duration-700 [transform-style:preserve-3d] ${flippedPanel === 'duties' ? '[transform:rotateY(180deg)]' : ''}`}>
              
              {/* FRONT FACE */}
              <div 
                className={`w-full h-full min-h-0 p-5 lg:p-6 rounded-3xl relative overflow-hidden transition-all duration-300 border-2 border-amber-400/50 hover:border-amber-400/90 shadow-[0_10px_30px_rgba(244,238,142,0.12)] flex flex-col justify-between [backface-visibility:hidden] cursor-pointer ${
                  flippedPanel === 'duties' ? 'pointer-events-none opacity-0 invisible select-none z-0' : 'pointer-events-auto opacity-100 visible z-20'
                }`}
                onClick={() => handleToggleFlip('duties')}
              >
                {/* Background Glass Panel */}
                <div className="absolute inset-0 bg-transparent transition-all duration-300 bg-gradient-to-br from-amber-400/12 via-amber-500/5 to-transparent rounded-3xl pointer-events-none z-0 border border-amber-400/30" />
                
                {/* Glass Reflection Top Glare */}
                <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-amber-300/20 via-transparent to-transparent pointer-events-none rounded-t-3xl" />
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400/80 to-transparent" />
                
                <div className="relative z-10 flex-1 flex flex-col min-h-0 space-y-3.5">
                  <div className="border-b border-amber-500/30 pb-2.5 flex items-center justify-between gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const uid = displayUser?.id || currentUser?.id || '91827364501';
                        const url = `${window.location.origin}/cabinet/profile/${uid}`;
                        try {
                          if (navigator.clipboard && navigator.clipboard.writeText) {
                            navigator.clipboard.writeText(url);
                          } else {
                            const ta = document.createElement('textarea');
                            ta.value = url;
                            document.body.appendChild(ta);
                            ta.select();
                            document.execCommand('copy');
                            document.body.removeChild(ta);
                          }
                          setToastMessage('Ссылка на профиль скопирована!');
                        } catch (err) {
                          setToastMessage('Ссылка на профиль скопирована!');
                        }
                        setTimeout(() => setToastMessage(''), 3000);
                      }}
                      className="w-full py-1.5 px-3 rounded-xl bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 text-sm font-mono font-bold border border-amber-300/80 hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 shrink-0"
                      title="Скопировать ссылку на профиль"
                    >
                      <Eye size={14} />
                      <span>Профиль /{displayUser?.id || currentUser?.id || '91827364501'}</span>
                    </button>
                  </div>

                  {/* Position & Role */}
                  <div className="space-y-1 shrink-0">
                    <span className={`text-sm font-mono block font-bold ${
                      theme === 'dark' ? 'text-amber-200/90' : 'text-zinc-800'
                    }`}>
                      Должность в компании
                    </span>
                    <p className={`text-sm font-bold font-sans flex items-center justify-between ${
                      theme === 'dark' ? 'text-white' : 'text-zinc-950'
                    }`}>
                      <span>{userPosition || 'Супер-Администратор'}</span>
                    </p>
                  </div>

                  {/* Duties List - Fixed 400px height with custom scrollbar */}
                  <div className="space-y-2 pt-2 border-t border-amber-500/20 flex flex-col flex-1 min-h-0">
                    <div className="flex items-center justify-between shrink-0">
                      <span className={`text-sm font-mono block font-bold ${
                        theme === 'dark' ? 'text-amber-200/90' : 'text-zinc-800'
                      }`}>
                        Обязанности сотрудника
                      </span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsEditModalOpen(true);
                        }}
                        className={`text-sm font-mono hover:underline cursor-pointer flex items-center gap-1 font-bold ${
                          theme === 'dark' ? 'text-amber-300' : 'text-zinc-950'
                        }`}
                      >
                        <Edit3 size={14} className={theme === 'dark' ? 'text-amber-300' : 'text-zinc-950'} />
                        <span>Изменить</span>
                      </button>
                    </div>
                    
                    <div 
                      className="h-[380px] max-h-[380px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-amber-500/50 pb-1 flex-1 overscroll-contain"
                      onClick={(e) => e.stopPropagation()}
                      onWheel={(e) => e.stopPropagation()}
                    >
                      <ul className={`space-y-2 text-sm font-sans leading-relaxed ${
                        theme === 'dark' ? 'text-slate-100' : 'text-zinc-900 font-semibold'
                      }`}>
                        {dutiesList.map((duty, idx) => (
                          <li key={idx} className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/10 hover:border-amber-400/30 transition-all">
                            <span className={theme === 'dark' ? 'text-amber-400 font-bold shrink-0 mt-0.5' : 'text-amber-700 font-extrabold shrink-0 mt-0.5'}>•</span>
                            <span className="text-sm">{duty}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

              </div>

              {/* BACK FACE (FLIPPED TRANSPARENT GLASS) */}
              <div 
                className={`absolute inset-0 w-full h-full min-h-0 p-5 lg:p-6 rounded-3xl overflow-hidden border-2 border-amber-400/80 shadow-[0_12px_35px_rgba(244,238,142,0.25)] bg-gradient-to-br from-amber-400/20 via-amber-500/10 to-transparent flex flex-col justify-between [backface-visibility:hidden] [transform:rotateY(180deg)] text-white cursor-pointer ${
                  flippedPanel === 'duties' ? 'pointer-events-auto opacity-100 visible z-30' : 'pointer-events-none opacity-0 invisible select-none z-0'
                }`}
                onClick={() => handleToggleFlip('duties')}
              >
                <div className="space-y-3 font-mono flex-1 flex flex-col min-h-0">
                  <div className="border-b border-amber-400/50 pb-2 flex items-center justify-between shrink-0">
                    <span className="text-sm font-bold text-[#F4EE8E]">
                      Информация о должности
                    </span>
                  </div>
                  <p className="text-sm text-slate-200 font-sans leading-relaxed shrink-0">
                    Управление служебными регламентами, контроль выполнения задач экипажа и настройка ИИ-ревизоров.
                  </p>
                  <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-sm shrink-0">
                    <span className="block text-sm text-amber-300 font-mono">Текущий статус:</span>
                    <span className="font-bold text-amber-300 text-sm">Активные права администратора</span>
                  </div>
                  <div 
                    className="h-[380px] max-h-[380px] overflow-y-auto scrollbar-thin scrollbar-thumb-amber-500/50 pr-1.5 pt-2 space-y-1.5 flex-1 min-h-0 overscroll-contain"
                    onClick={(e) => e.stopPropagation()}
                    onWheel={(e) => e.stopPropagation()}
                  >
                    <span className="block text-sm text-amber-200 font-mono font-bold mb-1">Список обязанностей:</span>
                    <ul className="space-y-1.5 text-sm font-sans">
                      {dutiesList.map((d, i) => (
                        <li key={i} className="text-slate-100 flex items-start gap-1.5 text-sm p-1.5 rounded-lg bg-amber-500/10 border border-amber-400/20">
                          <span className="text-amber-400 font-bold shrink-0 mt-0.5">•</span>
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-2 shrink-0">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditModalOpen(true);
                    }}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 font-mono font-bold text-sm border border-amber-300/80 transition-all shadow-md cursor-pointer hover:brightness-110 active:scale-95"
                  >
                    Редактировать профиль
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* ================= WINDOW #2 (CENTER): ЦЕНТРАЛЬНАЯ ПАНЕЛЬ ПРОФИЛЯ ================= */}
          <div 
            className={`group ${mobileTab === 'profile' ? 'flex' : 'hidden'} lg:flex flex-col justify-between p-4 sm:p-6 lg:p-7 rounded-3xl relative overflow-hidden transition-all duration-300 border-2 border-amber-400/70 hover:border-amber-400/100 shadow-[0_12px_35px_rgba(244,238,142,0.18)]`}
            style={{
              transform: 'rotateX(2deg)',
              transformOrigin: 'center center'
            }}
          >
            {/* Background Glass Panel */}
            <div className="absolute inset-0 bg-transparent transition-all duration-300 bg-gradient-to-br from-amber-400/15 via-amber-500/5 to-transparent rounded-3xl pointer-events-none z-0 border border-amber-400/40" />

            {/* Glass Top Streak & Glare */}
            <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-amber-300/25 via-transparent to-transparent pointer-events-none rounded-t-3xl" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#F4EE8E] to-transparent" />

            <div className="space-y-4 relative z-10">
              
              {/* User Identity & Info Sections in Required Order */}
              <div className="text-center space-y-2.5">
                
                {/* 1. ФИО (без заголовка ФИО) */}
                <div>
                  <h2 className={`text-xl sm:text-2xl font-black font-sans tracking-tight flex items-center justify-center gap-1.5 ${
                    theme === 'dark' ? 'text-white' : 'text-zinc-950'
                  }`}>
                    <span>{displayUser?.name || (displayUser?.first_name ? `${displayUser.first_name} ${displayUser.last_name || ''}` : 'Тимошенко Денис')}</span>
                  </h2>
                </div>

                {/* 2. РОЛЬ (без заголовка РОЛЬ) */}
                <div>
                  <p className={`text-sm font-mono font-bold ${
                    theme === 'dark' ? 'text-amber-300' : 'text-amber-950'
                  }`}>
                    {displayUser?.role === 'SUPER_ADMIN' || (displayUser?.role as any) === 'SUPER_ADMIN' 
                      ? '⚡ Супер-Администратор' 
                      : displayUser?.role === 'ADMIN' 
                      ? '🛡️ Глобальный Администратор' 
                      : displayUser?.role === 'DIRECTOR' 
                      ? '👔 Директор' 
                      : displayUser?.role === 'MANAGER' 
                      ? '📊 Руководитель' 
                      : '👤 Сотрудник'}
                  </p>
                </div>

                {/* 3. ПОЧТА (ЗОЛОТОЙ ТЕКСТ ПОЧТЫ, БЕЗ ИКОНКИ И БЕЗ ID) */}
                <div className="pt-1 flex flex-col items-center gap-1.5">
                  {displayUser?.email ? (
                    <span className={`text-sm font-mono px-3 py-1 rounded-full font-bold border ${
                      theme === 'dark' ? 'text-[#F4EE8E] bg-amber-500/15 border-amber-400/40' : 'text-amber-950 bg-amber-200 border-amber-500/60'
                    }`}>
                      {displayUser.email}
                    </span>
                  ) : (
                    <div className="text-center space-y-1.5 my-0.5 p-2.5 rounded-xl border border-amber-400/50 bg-amber-500/10 text-amber-200 w-full">
                      <p className="text-sm font-sans font-semibold text-amber-300">
                        ⚠️ Для работы с ПК необходимо зарегистрировать E-mail
                      </p>
                      {!viewOnly && (
                        <button
                          type="button"
                          onClick={() => setIsEditModalOpen(true)}
                          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 text-sm font-mono font-bold shadow hover:brightness-110 cursor-pointer"
                        >
                          Указать E-mail
                        </button>
                      )}
                    </div>
                  )}

                  {/* ДВЕ ГОРИЗОНТАЛЬНЫЕ ПРОЗРАЧНЫЕ ПЛАШКИ-КНОПКИ */}
                  <div className="w-full space-y-1.5 my-2">
                    <button
                      type="button"
                      onClick={() => {
                        sessionStorage.setItem('revisor_tasks_scope', 'mine');
                        sessionStorage.setItem('revisor_tasks_view_mode', 'kanban');
                        window.dispatchEvent(new CustomEvent('revisor-set-scope', { detail: { scope: 'mine' } }));
                        onNavigate?.('/cabinet/revisor/task/kanban');
                      }}
                      className={`w-full py-2 px-3 rounded-xl border flex items-center justify-between text-sm font-mono font-bold transition-all cursor-pointer active:scale-95 shadow-sm ${
                        theme === 'dark'
                          ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-400/40 text-amber-200'
                          : 'bg-amber-50 hover:bg-amber-100 border-amber-500/50 text-amber-950'
                      }`}
                      title="Открыть мои задачи в канбане"
                    >
                      <div className="flex items-center gap-2">
                        <ListTodo size={15} className="text-amber-400" />
                        <span>Текущие задачи</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-lg bg-amber-400/20 border border-amber-400/50 text-amber-300 text-sm font-mono font-bold">
                        {dbTasksCount} {dbTasksCount === 1 ? 'задача' : (dbTasksCount >= 2 && dbTasksCount <= 4) ? 'задачи' : 'задач'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        sessionStorage.setItem('raport_filter', 'my');
                        window.dispatchEvent(new CustomEvent('raport-set-filter', { detail: { filter: 'my' } }));
                        onNavigate?.('/cabinet/raport');
                      }}
                      className={`w-full py-2 px-3 rounded-xl border flex items-center justify-between text-sm font-mono font-bold transition-all cursor-pointer active:scale-95 shadow-sm ${
                        theme === 'dark'
                          ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-400/40 text-amber-200'
                          : 'bg-amber-50 hover:bg-amber-100 border-amber-500/50 text-amber-950'
                      }`}
                      title="Сдать отчеты за сегодня"
                    >
                      <div className="flex items-center gap-2">
                        <ClipboardList size={15} className="text-amber-400" />
                        <span>Текущие отчеты</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-lg bg-amber-400/20 border border-amber-400/50 text-amber-300 text-sm font-mono font-bold">
                        {dbReportsCount} {dbReportsCount === 1 ? 'отчет' : (dbReportsCount >= 2 && dbReportsCount <= 4) ? 'отчета' : 'отчетов'}
                      </span>
                    </button>
                  </div>
                </div>

              </div>

              {/* 5. БАЛАНС RR И КНОПКА ПОПОЛНИТЬ (СКРЫТО В РЕЖИМЕ VIEWWONLY) */}
              {!viewOnly && (
                <div className="space-y-3 my-2">
                  {/* ТАРИФ И СТАТУС ПОДПИСКИ */}
                  {(() => {
                    const revPaidUntil = dbLimits?.subscription?.revizor?.paidUntil || displayUser?.revizor_paid_until;
                    const isRevPaid = Boolean(revPaidUntil && new Date(revPaidUntil).getTime() > Date.now());
                    const revSeats = dbLimits?.subscription?.revizor?.seatsCurrent || displayUser?.revizor_seats_current || 20;

                    const recPaidUntil = dbLimits?.subscription?.recruiter?.paidUntil || displayUser?.recruiter_paid_until;
                    const isRecPaid = Boolean(recPaidUntil && new Date(recPaidUntil).getTime() > Date.now());
                    const recSeats = dbLimits?.subscription?.recruiter?.seatsCurrent || displayUser?.recruiter_seats_current || 20;

                    const isAnyPaid = isRevPaid || isRecPaid;
                    const isTrialActive = !isAnyPaid && Boolean(
                      dbLimits?.trial?.active !== undefined
                        ? dbLimits.trial.active
                        : (Number(displayUser?.is_trial_active) === 1 && displayUser?.trial_ends_at && new Date(displayUser.trial_ends_at).getTime() > Date.now())
                    );
                    const trialDays = dbLimits?.trial?.remainingDays ?? (() => {
                      if (!displayUser?.trial_ends_at) return 0;
                      const diff = new Date(displayUser.trial_ends_at).getTime() - Date.now();
                      return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
                    })();
                    const trialHours = dbLimits?.trial?.remainingHours ?? 0;

                    const isExpired = !isTrialActive && !isAnyPaid;
                    const isDirector = ['director', 'admin', 'superadmin', 'head', 'super_admin'].includes(String(displayUser?.role || currentUser?.role).toLowerCase());
                    if (!isDirector) return null;

                    const formatDate = (isoStr: string) => {
                      try {
                        return new Date(isoStr).toLocaleDateString('ru-RU');
                      } catch {
                        return isoStr;
                      }
                    };

                    return (
                      <div className="space-y-2">
                        {/* 1. Если активен 7-дневный триал */}
                        {isTrialActive && (
                          <div className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md transition-all ${
                            theme === 'dark'
                              ? 'border-amber-400/50 bg-amber-500/10 text-amber-100'
                              : 'border-amber-600/50 bg-amber-100/40 text-amber-950'
                          }`}>
                            <div className="space-y-1 text-left">
                              <div className="flex items-center gap-2">
                                <Clock size={18} className={theme === 'dark' ? 'text-[#F4EE8E]' : 'text-amber-700'} />
                                <span className={`text-sm font-bold ${theme === 'dark' ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                                  Пробный период: осталось {trialDays > 0 ? `${trialDays} ${trialDays === 1 ? 'день' : trialDays < 5 ? 'дня' : 'дней'}` : `${trialHours} ч.`}
                                </span>
                              </div>
                              <p className={`text-sm ${theme === 'dark' ? 'text-amber-200/90' : 'text-amber-900/90'}`}>
                                Безлимитное тестирование сотрудников (10 проектов, 60 задач, 60 отчетов)
                              </p>
                            </div>
                            {isDirector && (
                              <button
                                onClick={() => onNavigate?.('profile_tariff')}
                                className="px-3.5 py-2 min-h-[44px] rounded-xl bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 border border-amber-300 text-sm font-bold transition-all active:scale-95 cursor-pointer shadow-md hover:brightness-110 shrink-0"
                              >
                                Активировать тариф
                              </button>
                            )}
                          </div>
                        )}

                        {/* 2. Если оплачен ИИ Ревизор */}
                        {isRevPaid && (
                          <div className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md transition-all ${
                            theme === 'dark'
                              ? 'border-amber-400/50 bg-amber-500/10 text-amber-100'
                              : 'border-amber-600/50 bg-amber-100/40 text-amber-950'
                          }`}>
                            <div className="space-y-1 text-left">
                              <div className="flex items-center gap-2">
                                <ShieldCheck size={18} className={theme === 'dark' ? 'text-[#F4EE8E]' : 'text-amber-700'} />
                                <span className={`text-sm font-bold ${theme === 'dark' ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                                  ИИ Ревизор: активен до {formatDate(revPaidUntil)}
                                </span>
                              </div>
                              <p className={`text-sm ${theme === 'dark' ? 'text-amber-200/90' : 'text-amber-900/90'}`}>
                                Оплачено мест: {revSeats} сотр. (10 проектов, 60 задач на место в месяц)
                              </p>
                            </div>
                            {isDirector && (
                              <button
                                onClick={() => onNavigate?.('profile_tariff')}
                                className="px-3.5 py-2 min-h-[44px] rounded-xl bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 border border-amber-300 text-sm font-bold transition-all active:scale-95 cursor-pointer shadow-md hover:brightness-110 shrink-0"
                              >
                                Продлить
                              </button>
                            )}
                          </div>
                        )}

                        {/* 3. Если оплачен ИИ Рекрутер (Рапорт) */}
                        {isRecPaid && (
                          <div className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md transition-all ${
                            theme === 'dark'
                              ? 'border-amber-400/50 bg-amber-500/10 text-amber-100'
                              : 'border-amber-600/50 bg-amber-100/40 text-amber-950'
                          }`}>
                            <div className="space-y-1 text-left">
                              <div className="flex items-center gap-2">
                                <ClipboardList size={18} className={theme === 'dark' ? 'text-[#F4EE8E]' : 'text-amber-700'} />
                                <span className={`text-sm font-bold ${theme === 'dark' ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                                  ИИ Рекрутер: активен до {formatDate(recPaidUntil)}
                                </span>
                              </div>
                              <p className={`text-sm ${theme === 'dark' ? 'text-amber-200/90' : 'text-amber-900/90'}`}>
                                Оплачено мест: {recSeats} сотр. (60 отчетов на место в месяц)
                              </p>
                            </div>
                            {isDirector && (
                              <button
                                onClick={() => onNavigate?.('profile_tariff')}
                                className="px-3.5 py-2 min-h-[44px] rounded-xl bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 border border-amber-300 text-sm font-bold transition-all active:scale-95 cursor-pointer shadow-md hover:brightness-110 shrink-0"
                              >
                                Продлить
                              </button>
                            )}
                          </div>
                        )}

                        {/* 4. Если пробный период завершен и нет активной подписки */}
                        {isExpired && (
                          <div className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md transition-all ${
                            theme === 'dark'
                              ? 'border-amber-500/60 bg-amber-900/20 text-amber-100'
                              : 'border-amber-600/60 bg-amber-100/50 text-amber-950'
                          }`}>
                            <div className="space-y-1 text-left">
                              <div className="flex items-center gap-2">
                                <Clock size={18} className={theme === 'dark' ? 'text-amber-400' : 'text-amber-800'} />
                                <span className={`text-sm font-bold ${theme === 'dark' ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                                  Пробный период завершен
                                </span>
                              </div>
                              <p className={`text-sm ${theme === 'dark' ? 'text-amber-200/90' : 'text-amber-900/90'}`}>
                                Для продолжения работы и снятия блокировок активируйте тариф
                              </p>
                            </div>
                            {isDirector && (
                              <button
                                onClick={() => onNavigate?.('profile_tariff')}
                                className="px-3.5 py-2 min-h-[44px] rounded-xl bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 border border-amber-300 text-sm font-bold transition-all active:scale-95 cursor-pointer shadow-md hover:brightness-110 shrink-0"
                              >
                                Выбрать тариф
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* BALANCE RR - STRICTLY VISIBLE ONLY TO DIRECTORS */}
                  {['director', 'admin', 'superadmin', 'head', 'super_admin'].includes(String(displayUser?.role || currentUser?.role).toLowerCase()) && (
                    <div 
                      onClick={() => onNavigate?.('profile_tariff')}
                      className={`p-3 rounded-2xl border flex items-center justify-between shadow-md bg-transparent cursor-pointer transition-all hover:border-amber-400 ${
                        theme === 'dark' ? 'border-amber-400/60' : 'border-amber-600/60'
                      }`}
                    >
                      <div className="space-y-0.5 text-left">
                        <span className={`text-sm font-mono tracking-wider block font-bold ${
                          theme === 'dark' ? 'text-amber-200/90' : 'text-amber-950'
                        }`}>
                          Баланс RR
                        </span>
                        <span className={`text-xl font-black font-mono tracking-tight ${
                          theme === 'dark' ? 'text-[#F4EE8E]' : 'text-amber-950'
                        }`}>
                          {Number(displayUser?.payment_balance ?? currentUser?.payment_balance ?? 0).toLocaleString('ru-RU')} RR
                        </span>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onNavigate?.('profile_tariff'); }}
                        className="px-3.5 py-2 min-h-[44px] rounded-xl bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 border border-amber-300 text-sm font-bold transition-all active:scale-95 cursor-pointer shadow-md hover:brightness-110"
                      >
                        Пополнить
                      </button>
                    </div>
                  )}

                  {/* ACTIVE LIMITS SUMMARY BADGES FROM DB - VISIBLE STRICTLY TO DIRECTOR / SUPERADMIN */}
                  {['director', 'super_admin', 'superadmin'].includes(String(displayUser?.role || currentUser?.role).toLowerCase()) && (
                    <div 
                      onClick={() => onNavigate?.('profile_tariff')}
                      className={`p-2.5 rounded-xl border space-y-2 text-left text-sm bg-transparent cursor-pointer transition-all hover:border-amber-400 ${
                        theme === 'dark' ? 'border-amber-500/40 text-amber-200' : 'border-amber-500/60 text-amber-950'
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-amber-500/20 pb-1">
                        <span className={`font-bold text-sm font-mono tracking-wide ${theme === 'dark' ? 'text-amber-200' : 'text-amber-950'}`}>Лимиты сервисов и балансы</span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onNavigate?.('profile_tariff'); }}
                          className={`text-sm font-mono font-bold hover:underline cursor-pointer ${theme === 'dark' ? 'text-amber-400' : 'text-amber-800'}`}
                        >
                          + Докупить
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 text-center font-mono font-bold text-sm">
                        <div className="p-1.5 rounded bg-transparent border border-amber-500/30">
                          <span className={`block text-sm font-normal ${theme === 'dark' ? 'text-amber-300' : 'text-amber-900'}`}>Проекты</span>
                          <span className={theme === 'dark' ? 'text-[#F4EE8E]' : 'text-amber-950'}>
                            {Number(dbLimits?.projects?.used ?? displayUser?.projects_used ?? 0)}/{Number(dbLimits?.projects?.limit ?? displayUser?.projects_limit ?? 0)}
                          </span>
                        </div>
                        <div className="p-1.5 rounded bg-transparent border border-amber-500/30">
                          <span className={`block text-sm font-normal ${theme === 'dark' ? 'text-amber-300' : 'text-amber-900'}`}>Задачи</span>
                          <span className={theme === 'dark' ? 'text-[#F4EE8E]' : 'text-amber-950'}>
                            {Number(dbLimits?.tasks?.used ?? displayUser?.tasks_used ?? 0)}/{Number(dbLimits?.tasks?.limit ?? displayUser?.tasks_limit ?? 0)}
                          </span>
                        </div>
                        <div className="p-1.5 rounded bg-transparent border border-amber-500/30">
                          <span className={`block text-sm font-normal ${theme === 'dark' ? 'text-amber-300' : 'text-amber-900'}`}>Отчеты</span>
                          <span className={theme === 'dark' ? 'text-[#F4EE8E]' : 'text-amber-950'}>
                            {Number(dbLimits?.reports?.used ?? displayUser?.reports_used ?? 0)}/{Number(dbLimits?.reports?.limit ?? displayUser?.reports_limit ?? 0)}
                          </span>
                        </div>
                      </div>

                      {/* PERPETUAL EXTRA LIMITS BADGE */}
                      <div className="p-2 rounded-lg space-y-0.5 text-sm border bg-transparent border-amber-500/30">
                        <div className="flex justify-between items-center">
                          <span className={`font-bold text-sm font-mono ${
                            theme === 'dark' ? 'text-[#F4EE8E]' : 'text-amber-950'
                          }`}>
                            Бессрочный доп. баланс Директора
                          </span>
                          <span className={`text-sm font-mono font-bold ${
                            theme === 'dark' ? 'text-amber-300' : 'text-amber-900'
                          }`}>Не сгорают</span>
                        </div>
                        <div className={`flex justify-between font-mono text-sm ${
                          theme === 'dark' ? 'text-amber-200' : 'text-amber-950'
                        }`}>
                          <span>Проекты: <strong>+{Number(dbLimits?.perpetualExtraLimits?.projects?.balance ?? displayUser?.extra_projects_balance ?? currentUser?.extra_projects_balance ?? 0)}</strong></span>
                          <span>Задачи: <strong>+{Number(dbLimits?.perpetualExtraLimits?.tasks?.balance ?? displayUser?.extra_tasks_balance ?? currentUser?.extra_tasks_balance ?? 0)}</strong></span>
                          <span>Отчеты: <strong>+{Number(dbLimits?.perpetualExtraLimits?.reports?.balance ?? displayUser?.extra_reports_balance ?? currentUser?.extra_reports_balance ?? 0)}</strong></span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* ================= WINDOW #3 (RIGHT): КАБИНЕТ ТЕЛЕГРАМ С 3D ПЕРЕВОРОТОМ ================= */}
          <div 
            className={`group ${mobileTab === 'telegram' ? 'flex' : 'hidden'} lg:flex flex-col justify-between [perspective:1000px] h-full min-h-0`}
            style={{
              transform: 'rotateY(-20deg) rotateX(2deg)',
              transformOrigin: 'left center'
            }}
          >
            <div className={`relative w-full h-full min-h-0 transition-transform duration-700 [transform-style:preserve-3d] ${flippedPanel === 'telegram' ? '[transform:rotateY(180deg)]' : ''}`}>
              
              {/* FRONT FACE: КАБИНЕТ ТЕЛЕГРАМ */}
              <div 
                className={`w-full h-full min-h-0 p-5 lg:p-6 rounded-3xl relative overflow-hidden transition-all duration-300 border-2 border-amber-400/50 hover:border-amber-400/90 shadow-[0_10px_30px_rgba(244,238,142,0.12)] flex flex-col justify-between [backface-visibility:hidden] cursor-pointer ${
                  flippedPanel === 'telegram' ? 'pointer-events-none opacity-0 invisible select-none z-0' : 'pointer-events-auto opacity-100 visible z-20'
                }`}
                onClick={() => handleToggleFlip('telegram')}
              >
                {/* Background Glass Panel */}
                <div className="absolute inset-0 bg-transparent transition-all duration-300 bg-gradient-to-br from-amber-400/12 via-amber-500/5 to-transparent rounded-3xl pointer-events-none z-0 border border-amber-400/30" />

                {/* Glass Reflection Top Glare */}
                <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-amber-300/20 via-transparent to-transparent pointer-events-none rounded-t-3xl" />
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400/80 to-transparent" />

                <div className="space-y-3 relative z-10 flex-1 flex flex-col justify-between">
                  
                  {/* Header */}
                  <div className="border-b border-amber-500/30 pb-2.5 flex items-center justify-between">
                    <span className={`text-sm font-mono font-bold tracking-wide flex items-center gap-1.5 ${
                      theme === 'dark' ? 'text-amber-300' : 'text-amber-950'
                    }`}>
                      <Send size={15} className="text-amber-400" />
                      Кабинет Telegram
                    </span>

                    {/* Unbind Telegram Button in Gold replace badge */}
                    {currentUser?.telegram_id || currentUser?.username ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnlinkTelegram();
                        }}
                        className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 text-xs font-mono font-bold border border-amber-300/80 hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-md"
                      >
                        Отвязать Telegram
                      </button>
                    ) : (
                      <span className={`text-xs font-mono px-2 py-0.5 rounded border font-bold ${
                        theme === 'dark' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-amber-200 text-zinc-950 border-amber-500/60'
                      }`}>
                        Не привязан
                      </span>
                    )}
                  </div>

                  {/* TELEGRAM PROFILE INFORMATION (NO DARKENING BG) */}
                  <div className={`p-3.5 rounded-2xl border space-y-3 bg-transparent ${
                    theme === 'dark' ? 'border-amber-500/25 text-white' : 'border-amber-400/50 text-zinc-950'
                  }`}>
                    {currentUser?.telegram_id || currentUser?.username ? (
                      <div className="space-y-2.5">
                        {/* Avatar & Names & Username & Telegram ID */}
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <img 
                              src={avatarImage} 
                              alt="Telegram Profile" 
                              className="w-12 h-12 rounded-xl border-2 border-amber-400/60 object-cover shadow-[0_0_15px_rgba(244,238,142,0.3)]"
                              referrerPolicy="no-referrer"
                            />
                            {(displayUser?.is_premium || displayUser?.id === '91827364501' || displayUser?.telegram_id === '169262990') && (
                              <span 
                                title="Premium Status"
                                className="absolute -top-1.5 -right-1.5 bg-black/50 backdrop-blur-sm border border-amber-400/80 p-1 rounded-full shadow-md flex items-center justify-center text-amber-300"
                              >
                                <Star size={10} className="fill-amber-300 text-amber-300" />
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className={`text-sm font-bold truncate ${theme === 'dark' ? 'text-white' : 'text-amber-950'}`}>
                                {((displayUser?.first_name || currentUser?.first_name || '') + ' ' + (displayUser?.last_name || currentUser?.last_name || '')).trim() || displayUser?.name || currentUser?.name || 'Пользователь Telegram'}
                              </p>
                            </div>
                            <p className="text-sm text-amber-300 font-mono">
                              {currentUser?.username ? `@${currentUser.username.replace('@','')}` : (displayUser?.username ? `@${displayUser.username.replace('@','')}` : (currentUser?.telegramHandle || displayUser?.telegramHandle || '—'))}
                            </p>
                            <p className="text-xs text-slate-300 font-mono">
                              TG ID: {currentUser?.telegram_id || displayUser?.telegram_id || '—'}
                            </p>
                          </div>
                        </div>

                        {/* Bio note with full text wrapping */}
                        <div className={`p-2.5 rounded-xl border text-sm ${theme === 'dark' ? 'bg-amber-500/10 border-amber-500/20 text-slate-200' : 'bg-amber-100/60 border-amber-300 text-zinc-900'}`}>
                          <span className="block text-xs font-mono font-bold text-amber-400 mb-0.5">
                            Bio профиля:
                          </span>
                          <p className="leading-relaxed italic text-sm break-words whitespace-pre-wrap">
                            "{displayUser?.bio || currentUser?.bio || 'Информация о профиле отсутствует'}"
                          </p>
                        </div>

                        {/* Registration Date & Language / Timezone */}
                        <div className="grid grid-cols-2 gap-2 pt-1 text-xs font-mono">
                          <div className={`p-1.5 rounded-lg border ${theme === 'dark' ? 'bg-amber-500/10 border-amber-500/20 text-amber-200' : 'bg-amber-200/50 border-amber-300 text-amber-950'}`}>
                            <span className="block text-xs font-bold text-amber-400/80">Регистрация в TG:</span>
                            <span className="font-bold text-sm">
                              {(() => {
                                const raw = displayUser?.createdAt || currentUser?.createdAt || '2026-07-14 10:00:00';
                                try {
                                  return new Date(raw).toLocaleDateString('ru-RU');
                                } catch {
                                  return '14.07.2026';
                                }
                              })()}
                            </span>
                          </div>
                          <div className={`p-1.5 rounded-lg border ${theme === 'dark' ? 'bg-amber-500/10 border-amber-500/20 text-amber-200' : 'bg-amber-200/50 border-amber-300 text-amber-950'}`}>
                            <span className="block text-xs font-bold text-amber-400/80">Язык / ЧС:</span>
                            <span className="font-bold text-sm">{(displayUser?.language_code || currentUser?.language_code || 'ru').toUpperCase()} | {displayUser?.timezone || currentUser?.timezone || getSystemTimezone(currentUser) || '+03:00'}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 text-center py-2">
                        <p className={`text-sm font-sans leading-relaxed ${theme === 'dark' ? 'text-amber-200/90' : 'text-amber-950'}`}>
                          📱 Синхронизация с Telegram необходима для получения важных авто-уведомлений и удобной работы с мобильного устройства.
                        </p>
                        <a
                          href="https://t.me/ii_rrbot/app"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 text-sm font-mono font-bold border border-amber-300 hover:brightness-110 active:scale-95 shadow-md w-full"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Send size={14} />
                          <span>Синхронизировать Telegram</span>
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Flip button to Notifications */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFlip('telegram');
                    }}
                    className={`w-full py-2.5 rounded-xl border font-mono text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-md mt-1 ${
                      theme === 'dark' ? 'bg-amber-500/25 hover:bg-amber-500/35 border-amber-400/60 text-[#F4EE8E]' : 'bg-amber-200 hover:bg-amber-300 border-amber-500 text-zinc-950'
                    }`}
                  >
                    <Bell size={14} className="text-amber-400 animate-bounce" />
                    <span>Уведомления ({notifList.length})</span>
                    <ChevronRight size={15} />
                  </button>

                </div>
              </div>

              {/* BACK FACE: УВЕДОМЛЕНИЯ СИСТЕМЫ */}
              <div 
                onClick={() => handleToggleFlip('telegram')}
                className={`absolute inset-0 w-full h-full min-h-0 p-5 lg:p-6 rounded-3xl overflow-hidden border-2 border-amber-400/80 shadow-[0_12px_35px_rgba(244,238,142,0.25)] bg-transparent flex flex-col justify-between [backface-visibility:hidden] [transform:rotateY(180deg)] text-white cursor-pointer ${
                  flippedPanel === 'telegram' ? 'pointer-events-auto opacity-100 visible z-30' : 'pointer-events-none opacity-0 invisible select-none z-0'
                }`}
              >
                {/* Background Glass Panel - 100% Transparent */}
                <div className="absolute inset-0 bg-transparent pointer-events-none rounded-3xl" />
                
                <div className="space-y-3 font-mono flex-1 flex flex-col min-h-0 relative z-10">
                  
                  {/* Back Header with Title and counter */}
                  <div className="border-b border-amber-400/50 pb-2 flex items-center justify-between gap-2 shrink-0">
                    <span className={`text-sm font-bold tracking-wide flex items-center gap-1.5 ${theme === 'dark' ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                      <Bell size={15} className={theme === 'dark' ? 'text-amber-400' : 'text-amber-800'} />
                      Список уведомлений ({notifList.length})
                    </span>
                    {onNavigate && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('/cabinet/notifications');
                        }}
                        className={`px-3 py-1.5 rounded-lg border text-sm font-bold transition-all cursor-pointer ${
                          theme === 'dark'
                            ? 'border-[#E7C768]/60 text-[#F4EE8E] hover:bg-amber-400/15'
                            : 'border-amber-900/40 text-amber-950 hover:bg-amber-900/10'
                        }`}
                      >
                        Настройки Push и PWA
                      </button>
                    )}
                  </div>

                  {/* Mobile PWA push hint */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className={`p-2.5 rounded-xl border text-sm font-sans leading-snug shrink-0 ${
                      theme === 'dark'
                        ? 'border-[#E7C768]/40 text-amber-100/90'
                        : 'border-amber-900/30 text-amber-950'
                    }`}
                  >
                    Чтобы получать уведомления с отчетами и расчетами KPI прямо на телефон — установите PWA-приложение на экран смартфона в разделе «Уведомления».
                  </div>

                  {/* Notifications list - 100% transparent background cards */}
                  <div 
                    className="space-y-2 flex-1 overflow-y-auto max-h-[360px] pr-1 font-sans overscroll-contain"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {notifList.length === 0 ? (
                      <div className="py-8 text-center text-sm font-sans space-y-2 opacity-70">
                        <Bell size={24} className="mx-auto text-amber-400/60" />
                        <p className={theme === 'dark' ? 'text-amber-200/70' : 'text-zinc-700'}>
                          Новых уведомлений нет
                        </p>
                      </div>
                    ) : (
                      notifList.map((n: any) => (
                        <div 
                          key={n.id} 
                          onClick={(e) => {
                            e.stopPropagation();
                            e.nativeEvent.stopImmediatePropagation();
                            n.isRead = true;
                            const rect = e.currentTarget.getBoundingClientRect();
                            const popupW = Math.min(360, window.innerWidth - 32);
                            const popupH = 220;
                            const gap = 12;
                            const margin = 16;
                            const winW = window.innerWidth;
                            const winH = window.innerHeight;

                            // Horizontal: check if fits to the left or to the right
                            const canFitLeft = (rect.left - gap - popupW) >= margin;
                            const canFitRight = (rect.right + gap + popupW) <= (winW - margin);

                            let px: number;
                            if (canFitLeft) {
                              px = rect.left - gap - popupW;
                            } else if (canFitRight) {
                              px = rect.right + gap;
                            } else {
                              px = Math.max(margin, Math.min(winW - popupW - margin, rect.left + (rect.width - popupW) / 2));
                            }

                            // Vertical: check if fits below or above
                            const canFitDown = (rect.top + popupH) <= (winH - margin);
                            const canFitUp = (rect.bottom - popupH) >= margin;

                            let py: number;
                            if (canFitDown) {
                              py = Math.max(margin, rect.top);
                            } else if (canFitUp) {
                              py = Math.max(margin, rect.bottom - popupH);
                            } else {
                              py = Math.max(margin, winH - popupH - margin);
                            }

                            setNotifModalPos({ x: px, y: py });
                            setSelectedNotifModal(n);
                            // Sync read state with PostgreSQL BD ProTalk DB
                            fetch('/api/notifications/mark-read', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ id: n.id })
                            }).catch(() => {});
                            window.dispatchEvent(new Event('db-notifications-updated'));
                          }}
                          className={`p-2.5 rounded-xl border transition-all flex items-start gap-2.5 bg-transparent cursor-pointer hover:bg-amber-500/20 active:scale-98 ${
                            theme === 'dark' ? 'border-amber-500/40 hover:border-amber-400/80' : 'border-amber-500/60 hover:border-amber-600 text-zinc-950'
                          }`}
                        >
                          <div className={`p-1.5 rounded-lg mt-0.5 shrink-0 ${
                            theme === 'dark' ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-200 text-zinc-950'
                          }`}>
                            {n.type === 'referral' ? <Users size={13} /> : n.type === 'tariff' ? <Zap size={13} /> : n.type === 'payment' ? <CreditCard size={13} /> : <ShieldCheck size={13} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-bold truncate ${theme === 'dark' ? 'text-white' : 'text-zinc-950'}`}>{n.title}</span>
                              <span className={`text-[10px] font-mono ${theme === 'dark' ? 'text-amber-300/80' : 'text-zinc-800'}`}>
                                {n.time || (n.timestamp ? new Date(n.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '')}
                              </span>
                            </div>
                            <p className={`text-xs truncate ${theme === 'dark' ? 'text-slate-200' : 'text-zinc-900 font-medium'}`}>
                              {n.desc || n.message}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                </div>

              </div>

            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. BOTTOM CONTROL COCKPIT DASHBOARD: HELM WHEEL & TILTED 3D CONTROL PANELS */}
        {/* ========================================================================= */}
        {!viewOnly && (
          <div className={`relative z-20 w-full pt-2 items-center [perspective:1000px] px-2 sm:px-4 lg:px-6 xl:px-8 ${
            ['director', 'admin', 'superadmin', 'head', 'super_admin'].includes(String(displayUser?.role || currentUser?.role).toLowerCase())
              ? 'grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5'
              : 'flex justify-center'
          }`}>
            
            {/* ================= LEFT BOTTOM CONTROL PANEL (3D COCKPIT DASHBOARD: РЕФЕРАЛЫ) ================= */}
            {['director', 'admin', 'superadmin', 'head', 'super_admin'].includes(String(displayUser?.role || currentUser?.role).toLowerCase()) && (
              <div 
                className="group hidden lg:flex flex-col justify-between cursor-pointer [perspective:1000px] w-full min-w-0"
                style={{
                  transform: 'rotateX(12deg) rotateY(5deg)',
                  transformOrigin: 'center bottom'
                }}
                onClick={() => handleToggleFlip('referrals')}
              >
                <div className={`relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] ${flippedPanel === 'referrals' ? '[transform:rotateY(180deg)]' : ''}`}>
                
                {/* FRONT FACE */}
                <div className="w-full h-full p-5 rounded-3xl relative overflow-hidden transition-all duration-300 border-2 border-amber-400/50 hover:border-amber-400/90 shadow-[0_10px_30px_rgba(244,238,142,0.12)] flex flex-col justify-between [backface-visibility:hidden]">
                  {/* Background Glass Panel - Blur Disappears on Hover */}
                  <div className="absolute inset-0 bg-transparent backdrop-blur-md group-hover:backdrop-blur-none transition-all duration-300 bg-gradient-to-br from-amber-400/12 via-amber-500/5 to-transparent rounded-3xl pointer-events-none z-0 border border-amber-400/30" />

                  {/* Top Indicator Strip */}
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-400/80 to-transparent" />
                  
                  <div className="space-y-3 font-mono relative z-10">
                    <div className="flex items-center justify-between border-b border-amber-500/30 pb-2">
                      <span className={`text-sm font-bold tracking-wide ${
                        theme === 'dark' ? 'text-amber-300' : 'text-amber-950'
                      }`}>
                        Панель рефералов
                      </span>
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                    </div>

                    <div className="space-y-2 text-sm font-sans">
                      <div className="flex justify-between items-center">
                        <span className={theme === 'dark' ? 'text-amber-200/80' : 'text-zinc-800'}>Приглашено:</span>
                        <span className={`font-bold font-mono ${theme === 'dark' ? 'text-white' : 'text-zinc-950'}`}>
                          {dbReferralStats?.invitedCount ?? displayUser?.invitedUsersCount ?? 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={theme === 'dark' ? 'text-amber-200/80' : 'text-zinc-800'}>Активных:</span>
                        <span className={`font-bold font-mono ${theme === 'dark' ? 'text-white' : 'text-zinc-950'}`}>
                          {dbReferralStats?.activeCount ?? 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-1.5 border-t border-amber-500/20">
                        <span className={theme === 'dark' ? 'text-amber-200/80' : 'text-zinc-800'}>Бонусы:</span>
                        <span className={`font-bold font-mono text-sm ${theme === 'dark' ? 'text-amber-300' : 'text-amber-950'}`}>
                          +{(dbReferralStats?.rewardBalance ?? displayUser?.referral_reward_balance ?? displayUser?.referral_bonus ?? 0).toLocaleString('ru-RU')} RR
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate?.('profile_referral');
                      }}
                      className={`w-full py-2.5 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                        theme === 'dark' ? 'bg-transparent hover:bg-amber-500/20 border-amber-400/60 text-amber-300' : 'bg-transparent hover:bg-amber-500/20 border-amber-500 text-zinc-950'
                      }`}
                    >
                      <span>Подробнее</span>
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>

                {/* BACK FACE (FLIPPED TRANSPARENT GLASS) */}
                <div className="absolute inset-0 w-full h-full p-5 rounded-3xl overflow-hidden border-2 border-amber-400/80 shadow-[0_12px_35px_rgba(244,238,142,0.25)] bg-gradient-to-br from-amber-400/20 via-amber-500/10 to-transparent backdrop-blur-md flex flex-col justify-center [backface-visibility:hidden] [transform:rotateY(180deg)] text-white">
                  <div className="space-y-3 font-mono text-center">
                    <div className="border-b border-amber-400/50 pb-1.5">
                      <span className="text-sm font-bold text-[#F4EE8E]">
                        Реферальная сеть
                      </span>
                    </div>
                    <p className="text-sm text-amber-100 font-sans leading-relaxed">
                      Управление приглашёнными партнерами и начисление пассивного дохода с их платежей.
                    </p>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate?.('profile_referral');
                      }}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 font-mono font-bold text-sm border border-amber-300/80 transition-all shadow-md cursor-pointer hover:brightness-110 active:scale-95"
                    >
                      Открыть страницу
                    </button>
                  </div>
                </div>

              </div>
            </div>
            )}

            {/* ================= CENTER STEERING HELM WHEEL ================= */}
            <div className="flex justify-center items-center py-2 relative w-full min-w-0">
              
              {/* Outer Rotating Wheel Ring with 4 Action Knobs */}
              <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center mx-auto">
                
                {/* Steering Helm Frame - Full Transparency Glass */}
                <div 
                  className={`absolute inset-0 rounded-full border-2 bg-transparent transition-transform duration-700 ease-out ${
                    theme === 'dark' ? 'border-amber-400/70 bg-gradient-to-br from-amber-400/10 via-transparent to-amber-500/10' : 'border-amber-600/80 bg-gradient-to-br from-amber-300/20 via-transparent to-amber-400/20'
                  }`}
                  style={{ transform: `rotate(${wheelAngle}deg)` }}
                >
                  {/* Crosshair Spoke Lines */}
                  <div className={`absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 ${theme === 'dark' ? 'bg-amber-400/50' : 'bg-amber-600/60'}`} />
                  <div className={`absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 ${theme === 'dark' ? 'bg-amber-400/50' : 'bg-amber-600/60'}`} />

                  {/* 4 ACTION KNOBS ON THE ENDS OF THE 4 SYMMETRY AXES OF THE CIRCLE */}
                  {/* TOP AXIS END (0°): РЕФЕРАЛЫ - ONLY FOR DIRECTORS */}
                  {['director', 'admin', 'superadmin', 'head', 'super_admin'].includes(String(displayUser?.role || currentUser?.role).toLowerCase()) && (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate?.('profile_referral');
                      }}
                      className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 flex flex-col items-center justify-center hover:scale-110 active:scale-95 transition-all cursor-pointer group shadow-md z-30 ${
                        theme === 'dark' 
                          ? 'bg-transparent backdrop-blur-md border-amber-400 text-amber-300 hover:bg-amber-400/30' 
                          : 'bg-transparent backdrop-blur-md border-amber-600 text-zinc-950 hover:bg-amber-300/40'
                      }`}
                      title="Реферальная программа"
                    >
                      <div style={{ transform: `rotate(${-wheelAngle}deg)` }} className="transition-transform duration-700 flex flex-col items-center">
                        <Gift size={18} className={`group-hover:rotate-12 transition-transform stroke-[2.5] ${theme === 'dark' ? 'text-amber-300' : 'text-zinc-950'}`} />
                        <span className={`text-[9px] font-mono font-bold mt-0.5 ${theme === 'dark' ? 'text-amber-300' : 'text-zinc-950'}`}>Рефералы</span>
                      </div>
                    </div>
                  )}

                  {/* RIGHT AXIS END (90°): ТАРИФ - ONLY FOR DIRECTORS */}
                  {['director', 'admin', 'superadmin', 'head', 'super_admin'].includes(String(displayUser?.role || currentUser?.role).toLowerCase()) && (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate?.('profile_tariff');
                      }}
                      className={`absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 flex flex-col items-center justify-center hover:scale-110 active:scale-95 transition-all cursor-pointer group shadow-md z-30 ${
                        theme === 'dark' 
                          ? 'bg-transparent backdrop-blur-md border-amber-400 text-amber-300 hover:bg-amber-400/30' 
                          : 'bg-transparent backdrop-blur-md border-amber-600 text-zinc-950 hover:bg-amber-300/40'
                      }`}
                      title="Управление тарифом"
                    >
                      <div style={{ transform: `rotate(${-wheelAngle}deg)` }} className="transition-transform duration-700 flex flex-col items-center">
                        <Zap size={18} className={`group-hover:scale-110 transition-transform stroke-[2.5] ${theme === 'dark' ? 'text-amber-300' : 'text-zinc-950'}`} />
                        <span className={`text-[9px] font-mono font-bold mt-0.5 ${theme === 'dark' ? 'text-amber-300' : 'text-zinc-950'}`}>Тариф</span>
                      </div>
                    </div>
                  )}

                  {/* BOTTOM AXIS END (180°): УВЕДОМЛЕНИЯ */}
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate?.('profile_notifications');
                    }}
                    className={`absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 flex flex-col items-center justify-center hover:scale-110 active:scale-95 transition-all cursor-pointer group shadow-md z-30 ${
                      theme === 'dark' 
                        ? 'bg-transparent backdrop-blur-md border-amber-400 text-amber-300 hover:bg-amber-400/30' 
                        : 'bg-transparent backdrop-blur-md border-amber-600 text-zinc-950 hover:bg-amber-300/40'
                    }`}
                    title="Уведомления"
                  >
                    <div style={{ transform: `rotate(${-wheelAngle}deg)` }} className="transition-transform duration-700 flex flex-col items-center">
                      <Bell size={18} className={`group-hover:animate-ping stroke-[2.5] ${theme === 'dark' ? 'text-amber-300' : 'text-zinc-950'}`} />
                      <span className={`text-[9px] font-mono font-bold mt-0.5 ${theme === 'dark' ? 'text-amber-300' : 'text-zinc-950'}`}>Уведомления</span>
                    </div>
                  </div>

                  {/* LEFT AXIS END (270°): ПРОФИЛЬ */}
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditModalOpen(true);
                    }}
                    className={`absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 flex flex-col items-center justify-center hover:scale-110 active:scale-95 transition-all cursor-pointer group shadow-md z-30 ${
                      theme === 'dark' 
                        ? 'bg-transparent backdrop-blur-md border-amber-400 text-amber-300 hover:bg-amber-400/30' 
                        : 'bg-transparent backdrop-blur-md border-amber-600 text-zinc-950 hover:bg-amber-300/40'
                    }`}
                    title="Редактировать профиль"
                  >
                    <div style={{ transform: `rotate(${-wheelAngle}deg)` }} className="transition-transform duration-700 flex flex-col items-center">
                      <Edit3 size={18} className={`group-hover:rotate-12 transition-transform stroke-[2.5] ${theme === 'dark' ? 'text-amber-300' : 'text-zinc-950'}`} />
                      <span className={`text-[9px] font-mono font-bold mt-0.5 ${theme === 'dark' ? 'text-amber-300' : 'text-zinc-950'}`}>Профиль</span>
                    </div>
                  </div>

                </div>

                {/* ================= CENTER WHEEL HUB WITH PROFILE PHOTO ================= */}
                <div 
                  onClick={handleRotateHelm}
                  className="relative z-30 w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-transparent border-2 border-[#D4AF37] p-1.5 cursor-pointer hover:scale-105 active:scale-95 transition-all group shadow-[0_0_25px_rgba(212,175,55,0.4)] backdrop-blur-sm"
                  title="Нажмите на фото для поворота штурвала"
                >
                  <div className="w-full h-full rounded-full overflow-hidden border-2 border-[#D4AF37] bg-transparent relative flex items-center justify-center">
                    
                    {/* User Profile Avatar with Chocolate & Gold Monochrome Filter */}
                    <img 
                      src={avatarImage} 
                      alt={currentUser?.name || "Алексей Иванов"} 
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.onerror = null;
                        target.src = "/file/27/iirr1.png";
                      }}
                      className="w-full h-full object-cover [filter:sepia(0.85)_hue-rotate(-12deg)_saturate(2.2)_contrast(1.2)_brightness(0.95)] group-hover:[filter:none] transition-all duration-500"
                    />
                  </div>
                </div>

              </div>

            </div>

            {/* ================= RIGHT BOTTOM CONTROL PANEL (3D COCKPIT DASHBOARD: ТАРИФ) ================= */}
            {['director', 'admin', 'superadmin', 'head', 'super_admin'].includes(String(displayUser?.role || currentUser?.role).toLowerCase()) && (
            <div 
              className="group hidden lg:flex flex-col justify-between cursor-pointer [perspective:1000px] w-full min-w-0"
              style={{
                transform: 'rotateX(12deg) rotateY(-5deg)',
                transformOrigin: 'center bottom'
              }}
              onClick={() => handleToggleFlip('tariff')}
            >
              <div className={`relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] ${flippedPanel === 'tariff' ? '[transform:rotateY(180deg)]' : ''}`}>
                
                {/* FRONT FACE */}
                <div className="w-full h-full p-5 rounded-3xl relative overflow-hidden transition-all duration-300 border-2 border-amber-400/50 hover:border-amber-400/90 shadow-[0_10px_30px_rgba(244,238,142,0.12)] flex flex-col justify-between [backface-visibility:hidden]">
                  {/* Background Glass Panel */}
                  <div className="absolute inset-0 bg-transparent transition-all duration-300 bg-gradient-to-br from-amber-400/12 via-amber-500/5 to-transparent rounded-3xl pointer-events-none z-0 border border-amber-400/30" />

                  {/* Top Indicator Strip */}
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-400/80 to-transparent" />

                  <div className="space-y-3 font-mono relative z-10">
                    <div className="flex items-center justify-between border-b border-amber-500/30 pb-2">
                      <span className={`text-sm font-bold tracking-wide ${
                        theme === 'dark' ? 'text-amber-300' : 'text-amber-950'
                      }`}>
                        Панель пакетов
                      </span>
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                    </div>

                    <div className="space-y-2 text-sm font-sans">
                      {(() => {
                        const isRevActive = Boolean(dbLimits?.packages?.revisor?.active);
                        const isRapActive = Boolean(dbLimits?.packages?.raport?.active);
                        const totalEmployees = dbLimits?.activeEmployeesCount ?? dbLimits?.employeesCount ?? (dbEmployeesCount > 0 ? dbEmployeesCount : 6);
                        const revSeats = isRevActive ? (dbLimits?.packages?.revisor?.employees ?? displayUser?.revizor_seats_current ?? totalEmployees) : 0;
                        const rapSeats = isRapActive ? (dbLimits?.packages?.raport?.employees ?? displayUser?.recruiter_seats_current ?? totalEmployees) : 0;
                        const revExpiry = isRevActive ? (dbLimits?.packages?.revisor?.expiresAt || displayUser?.revizor_paid_until || "Активен") : "Не оплачен";
                        const rapExpiry = isRapActive ? (dbLimits?.packages?.raport?.expiresAt || displayUser?.recruiter_paid_until || "Активен") : "Не оплачен";

                        return (
                          <>
                            <div className="p-2.5 rounded-xl bg-transparent border border-amber-500/30 space-y-1 text-left backdrop-blur-sm">
                              <div className="flex justify-between items-center">
                                <span className={`font-bold text-sm ${theme === 'dark' ? 'text-amber-300' : 'text-amber-950'}`}>ИИ Ревизор</span>
                                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded bg-transparent border ${
                                  isRevActive ? 'text-amber-300 border-amber-400/50' : 'text-amber-500 border-amber-600/50'
                                }`}>
                                  {isRevActive ? 'Активен' : 'Не активен'}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className={theme === 'dark' ? 'text-amber-200/80' : 'text-zinc-800'}>Действует до:</span>
                                <span className="font-mono font-bold text-amber-950 dark:text-[#F4EE8E]">
                                  {revExpiry}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className={theme === 'dark' ? 'text-amber-200/80' : 'text-zinc-800'}>Сотрудников:</span>
                                <span className="font-mono font-bold text-amber-950 dark:text-[#F4EE8E]">
                                  {totalEmployees} / {revSeats} сотр.
                                </span>
                              </div>
                            </div>

                            <div className="p-2.5 rounded-xl bg-transparent border border-amber-500/30 space-y-1 text-left backdrop-blur-sm">
                              <div className="flex justify-between items-center">
                                <span className={`font-bold text-sm ${theme === 'dark' ? 'text-amber-300' : 'text-amber-950'}`}>ИИ Рапорт</span>
                                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded bg-transparent border ${
                                  isRapActive ? 'text-amber-300 border-amber-400/50' : 'text-amber-500 border-amber-600/50'
                                }`}>
                                  {isRapActive ? 'Активен' : 'Не активен'}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className={theme === 'dark' ? 'text-amber-200/80' : 'text-zinc-800'}>Действует до:</span>
                                <span className="font-mono font-bold text-amber-950 dark:text-[#F4EE8E]">
                                  {rapExpiry}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className={theme === 'dark' ? 'text-amber-200/80' : 'text-zinc-800'}>Сотрудников:</span>
                                <span className="font-mono font-bold text-amber-950 dark:text-[#F4EE8E]">
                                  {totalEmployees} / {rapSeats} сотр.
                                </span>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate?.('profile_tariff');
                      }}
                      className={`w-full py-2.5 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                        theme === 'dark' ? 'bg-transparent hover:bg-amber-500/20 border-amber-400/60 text-amber-300' : 'bg-transparent hover:bg-amber-500/20 border-amber-500 text-zinc-950'
                      }`}
                    >
                      <span>{(dbLimits?.packages?.revisor?.active || dbLimits?.packages?.raport?.active) ? 'Управление' : 'Выбрать тариф'}</span>
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>

                {/* BACK FACE (FLIPPED TRANSPARENT GLASS) */}
                <div className="absolute inset-0 w-full h-full p-5 rounded-3xl overflow-hidden border-2 border-amber-400/80 shadow-[0_12px_35px_rgba(244,238,142,0.25)] bg-gradient-to-br from-amber-400/20 via-amber-500/10 to-transparent flex flex-col justify-center [backface-visibility:hidden] [transform:rotateY(180deg)] text-white">
                  <div className="space-y-3 font-mono text-center">
                    <div className="border-b border-amber-400/50 pb-1.5">
                      <span className="text-sm font-bold text-[#F4EE8E]">
                        Подписка и баланс
                      </span>
                    </div>
                    <p className="text-sm text-amber-100 font-sans leading-relaxed">
                      Смена тарифного плана, автопродление и детализация расходов на ИИ-запросы.
                    </p>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate?.('profile_tariff');
                      }}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 font-mono font-bold text-sm border border-amber-300/80 transition-all shadow-md cursor-pointer hover:brightness-110 active:scale-95"
                    >
                      Открыть страницу
                    </button>
                  </div>
                </div>

              </div>
            </div>
            )}

          </div>
        )}

        {/* MOBILE VERTICAL PANELS: REFERRALS AND TARIFF UNDER STEERING WHEEL */}
        {['director', 'admin', 'superadmin', 'head', 'super_admin'].includes(String(displayUser?.role || currentUser?.role).toLowerCase()) && (
        <div className="flex flex-col gap-4 lg:hidden w-full px-2 sm:px-4 mt-4 mb-2">
          
          {/* MOBILE REFERRALS PANEL */}
          <div 
            className="group flex flex-col justify-between cursor-pointer [perspective:1000px] w-full"
            onClick={() => handleToggleFlip('referrals')}
          >
            <div className={`relative w-full transition-transform duration-700 [transform-style:preserve-3d] ${flippedPanel === 'referrals' ? '[transform:rotateY(180deg)]' : ''}`}>
              {/* FRONT FACE */}
              <div className="w-full p-5 rounded-3xl relative overflow-hidden transition-all duration-300 border-2 border-amber-400/50 hover:border-amber-400/90 shadow-[0_10px_30px_rgba(244,238,142,0.12)] flex flex-col justify-between [backface-visibility:hidden]">
                <div className="absolute inset-0 bg-transparent backdrop-blur-md transition-all duration-300 bg-gradient-to-br from-amber-400/12 via-amber-500/5 to-transparent rounded-3xl pointer-events-none z-0 border border-amber-400/30" />
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-400/80 to-transparent" />
                
                <div className="space-y-3 font-mono relative z-10">
                  <div className="flex items-center justify-between border-b border-amber-500/30 pb-2">
                    <span className={`text-sm font-bold tracking-wide ${theme === 'dark' ? 'text-amber-300' : 'text-amber-950'}`}>
                      Панель рефералов
                    </span>
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                  </div>

                  <div className="space-y-2 text-sm font-sans">
                    <div className="flex justify-between items-center">
                      <span className={theme === 'dark' ? 'text-amber-200/80' : 'text-zinc-800'}>Приглашено:</span>
                      <span className={`font-bold font-mono ${theme === 'dark' ? 'text-white' : 'text-zinc-950'}`}>
                        {dbReferralStats?.invitedCount ?? 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={theme === 'dark' ? 'text-amber-200/80' : 'text-zinc-800'}>Активных:</span>
                      <span className={`font-bold font-mono ${theme === 'dark' ? 'text-white' : 'text-zinc-950'}`}>
                        {dbReferralStats?.activeCount ?? 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-1.5 border-t border-amber-500/20">
                      <span className={theme === 'dark' ? 'text-amber-200/80' : 'text-zinc-800'}>Бонусы:</span>
                      <span className={`font-bold font-mono text-sm ${theme === 'dark' ? 'text-amber-300' : 'text-amber-950'}`}>
                        +{(dbReferralStats?.rewardBalance ?? displayUser?.referral_reward_balance ?? displayUser?.referral_bonus ?? 0).toLocaleString('ru-RU')} RR
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate?.('profile_referral');
                    }}
                    className={`w-full py-2.5 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                      theme === 'dark' ? 'bg-amber-500/25 hover:bg-amber-500/40 border-amber-400/60 text-amber-300' : 'bg-amber-200 hover:bg-amber-300 border-amber-500 text-zinc-950'
                    }`}
                  >
                    <span>Подробнее</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              {/* BACK FACE */}
              <div className="absolute inset-0 w-full h-full p-5 rounded-3xl overflow-hidden border-2 border-amber-400/80 shadow-[0_12px_35px_rgba(244,238,142,0.25)] bg-gradient-to-br from-amber-400/20 via-amber-500/10 to-transparent backdrop-blur-md flex flex-col justify-center [backface-visibility:hidden] [transform:rotateY(180deg)] text-white">
                <div className="space-y-3 font-mono text-center">
                  <div className="border-b border-amber-400/50 pb-1.5">
                    <span className="text-sm font-bold text-[#F4EE8E]">
                      Реферальная сеть
                    </span>
                  </div>
                  <p className="text-sm text-slate-200 font-sans leading-relaxed">
                    Управление приглашёнными партнерами и начисление пассивного дохода с их платежей.
                  </p>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate?.('profile_referral');
                    }}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 font-mono font-bold text-sm border border-amber-300/80 transition-all shadow-md cursor-pointer hover:brightness-110 active:scale-95"
                  >
                    Открыть страницу
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* MOBILE TARIFF PANEL */}
          <div 
            className="group flex flex-col justify-between cursor-pointer [perspective:1000px] w-full"
            onClick={() => handleToggleFlip('tariff')}
          >
            <div className={`relative w-full transition-transform duration-700 [transform-style:preserve-3d] ${flippedPanel === 'tariff' ? '[transform:rotateY(180deg)]' : ''}`}>
              {/* FRONT FACE */}
              <div className="w-full p-5 rounded-3xl relative overflow-hidden transition-all duration-300 border-2 border-amber-400/50 hover:border-amber-400/90 shadow-[0_10px_30px_rgba(244,238,142,0.12)] flex flex-col justify-between [backface-visibility:hidden]">
                <div className="absolute inset-0 bg-transparent transition-all duration-300 bg-gradient-to-br from-amber-400/12 via-amber-500/5 to-transparent rounded-3xl pointer-events-none z-0 border border-amber-400/30" />
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-400/80 to-transparent" />

                <div className="space-y-3 font-mono relative z-10">
                  <div className="flex items-center justify-between border-b border-amber-500/30 pb-2">
                    <span className={`text-sm font-bold tracking-wide ${theme === 'dark' ? 'text-amber-300' : 'text-amber-950'}`}>
                      Панель пакетов
                    </span>
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                  </div>

                  <div className="space-y-2 text-sm font-sans">
                    {(() => {
                      const isRevActive = Boolean(dbLimits?.packages?.revisor?.active);
                      const isRapActive = Boolean(dbLimits?.packages?.raport?.active);
                      const totalEmployees = dbLimits?.activeEmployeesCount ?? dbLimits?.employeesCount ?? (dbEmployeesCount > 0 ? dbEmployeesCount : 6);
                      const revSeats = isRevActive ? (dbLimits?.packages?.revisor?.employees ?? displayUser?.revizor_seats_current ?? totalEmployees) : 0;
                      const rapSeats = isRapActive ? (dbLimits?.packages?.raport?.employees ?? displayUser?.recruiter_seats_current ?? totalEmployees) : 0;
                      const revExpiry = isRevActive ? (dbLimits?.packages?.revisor?.expiresAt || displayUser?.revizor_paid_until || "Активен") : "Не оплачен";
                      const rapExpiry = isRapActive ? (dbLimits?.packages?.raport?.expiresAt || displayUser?.recruiter_paid_until || "Активен") : "Не оплачен";

                      return (
                        <>
                          <div className="p-2 rounded-xl bg-transparent border border-amber-500/30 space-y-1 text-left">
                            <div className="flex justify-between items-center">
                              <span className={`font-bold text-sm ${theme === 'dark' ? 'text-amber-300' : 'text-amber-950'}`}>ИИ Ревизор</span>
                              <span className={`text-sm font-mono font-bold px-2 py-0.5 rounded bg-transparent border ${
                                isRevActive ? 'text-amber-300 border-amber-400/50' : 'text-amber-500 border-amber-600/50'
                              }`}>
                                {isRevActive ? 'Активен' : 'Не активен'}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className={theme === 'dark' ? 'text-amber-200/80' : 'text-zinc-800'}>Сотрудников:</span>
                              <span className="font-mono font-bold text-amber-950 dark:text-[#F4EE8E]">
                                {totalEmployees} / {revSeats} сотр.
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className={theme === 'dark' ? 'text-amber-200/80' : 'text-zinc-800'}>Действует до:</span>
                              <span className="font-mono font-bold text-amber-950 dark:text-[#F4EE8E]">
                                {revExpiry}
                              </span>
                            </div>
                          </div>

                          <div className="p-2 rounded-xl bg-transparent border border-amber-500/30 space-y-1 text-left">
                            <div className="flex justify-between items-center">
                              <span className={`font-bold text-sm ${theme === 'dark' ? 'text-amber-300' : 'text-amber-950'}`}>ИИ Рекрутер (Рапорт)</span>
                              <span className={`text-sm font-mono font-bold px-2 py-0.5 rounded bg-transparent border ${
                                isRapActive ? 'text-amber-300 border-amber-400/50' : 'text-amber-500 border-amber-600/50'
                              }`}>
                                {isRapActive ? 'Активен' : 'Не активен'}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className={theme === 'dark' ? 'text-amber-200/80' : 'text-zinc-800'}>Сотрудников:</span>
                              <span className="font-mono font-bold text-amber-950 dark:text-[#F4EE8E]">
                                {totalEmployees} / {rapSeats} сотр.
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className={theme === 'dark' ? 'text-amber-200/80' : 'text-zinc-800'}>Действует до:</span>
                              <span className="font-mono font-bold text-amber-950 dark:text-[#F4EE8E]">
                                {rapExpiry}
                              </span>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate?.('profile_tariff');
                    }}
                    className={`w-full py-2.5 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                      theme === 'dark' ? 'bg-amber-500/25 hover:bg-amber-500/40 border-amber-400/60 text-amber-300' : 'bg-amber-200 hover:bg-amber-300 border-amber-500 text-zinc-950'
                    }`}
                  >
                    <span>Управление</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              {/* BACK FACE */}
              <div className="absolute inset-0 w-full h-full p-5 rounded-3xl overflow-hidden border-2 border-amber-400/80 shadow-[0_12px_35px_rgba(244,238,142,0.25)] bg-gradient-to-br from-amber-400/20 via-amber-500/10 to-transparent flex flex-col justify-center [backface-visibility:hidden] [transform:rotateY(180deg)] text-white">
                <div className="space-y-3 font-mono text-center">
                  <div className="border-b border-amber-400/50 pb-1.5">
                    <span className="text-sm font-bold text-[#F4EE8E]">
                      Подписка и баланс
                    </span>
                  </div>
                  <p className="text-sm text-slate-200 font-sans leading-relaxed">
                    Смена тарифного плана, автопродление и детализация расходов на ИИ-запросы.
                  </p>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate?.('profile_tariff');
                    }}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 font-mono font-bold text-sm border border-amber-300/80 transition-all shadow-md cursor-pointer hover:brightness-110 active:scale-95"
                  >
                    Открыть страницу
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
        )}

      </div>



      {/* ========================================================================= */}
      {/* UNIFIED EDIT PROFILE MODAL (Matching EmployeeEditModal with full duties, AI, voice, timezone & password) */}
      {/* ========================================================================= */}
      {isEditModalOpen && (
        <EmployeeEditModal
          isOpen={isEditModalOpen}
          employee={{
            id: displayUser?.id ? `emp-${displayUser.id}` : 'emp-me',
            company_id: company?.id || 'flagship-main',
            name: displayUser?.name || 'Тимошенко Денис',
            email: displayUser?.email || '',
            phone: displayUser?.phone || '',
            role: displayUser?.role || UserRole.DIRECTOR,
            position: userPosition || displayUser?.position || 'Генеральный директор',
            telegram_handle: telegramHandle || displayUser?.telegram_handle || displayUser?.telegramHandle || '',
            telegramHandle: telegramHandle || displayUser?.telegram_handle || displayUser?.telegramHandle || '',
            telegram_id: displayUser?.telegram_id || '',
            department_id: displayUser?.department_id || 'flagship',
            duties: dutiesList,
            timezone: displayUser?.timezone || editTimezone || DEFAULT_TIMEZONE
          }}
          departments={departmentsList}
          companyName={company?.name || 'ИИ Ревизор'}
          currentUser={currentUser}
          isLight={theme !== 'dark'}
          isProfileMode={true}
          onClose={() => setIsEditModalOpen(false)}
          onSave={async (savedData: any) => {
            if (savedData.name) {
              setEditName(savedData.name);
            }
            if (savedData.position) {
              setUserPosition(savedData.position);
            }
            if (savedData.duties) {
              const parsed = Array.isArray(savedData.duties) ? savedData.duties : [savedData.duties];
              setDutiesList(parsed);
              localStorage.setItem('rr_user_duties', JSON.stringify(parsed));
            }
            if (savedData.timezone) {
              setEditTimezone(savedData.timezone);
              setSystemTimezone(savedData.timezone);
            }
            if (onUpdateUser) {
              onUpdateUser({ ...displayUser, ...savedData });
            }
            setIsEditModalOpen(false);
          }}
          onDelete={async () => {
            setIsEditModalOpen(false);
            setIsDeleteProfileModalOpen(true);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* DELETE PROFILE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {isDeleteProfileModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-transparent p-4 pointer-events-auto">
          <div className="w-full max-w-md border-2 border-red-500/70 text-white rounded-3xl p-6 liquid-glass-modal space-y-4 relative shadow-2xl">
            <button 
              type="button"
              onClick={() => setIsDeleteProfileModalOpen(false)}
              className="absolute top-4 right-4 text-amber-300/70 hover:text-amber-200 transition-colors p-1 rounded-lg hover:bg-amber-400/10 cursor-pointer z-10"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 border-b border-red-500/30 pb-3 relative z-10">
              <div className="p-2.5 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/40">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold font-mono text-red-300">
                  Удаление профиля
                </h3>
                <p className="text-sm text-amber-200/70">Безвозвратное удаление аккаунта</p>
              </div>
            </div>

            <div className="space-y-3 text-sm leading-relaxed text-amber-100 relative z-10">
              <p>
                Вы действительно хотите полностью удалить свой профиль?
              </p>
              {(currentUser?.role === UserRole.DIRECTOR || currentUser?.role === UserRole.SUPER_ADMIN || currentUser?.role === UserRole.ADMIN) && (
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm">
                  ⚡ <strong>Внимание:</strong> Все данные компании, сотрудники, графики и проекты будут автоматически сохранены и переданы следующему Руководителю компании.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-red-500/30 relative z-10">
              <button
                type="button"
                onClick={() => setIsDeleteProfileModalOpen(false)}
                className={`px-4 py-2.5 rounded-xl border border-amber-400/40 transition-all text-sm font-semibold cursor-pointer ${
                  theme === 'dark'
                    ? 'text-amber-200 hover:text-white hover:border-amber-400/80'
                    : 'text-amber-950 hover:text-amber-800 hover:border-amber-600'
                }`}
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={isDeletingProfile}
                onClick={handleConfirmDeleteProfile}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold font-mono text-sm transition-all shadow-[0_0_20px_rgba(225,29,72,0.4)] cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isDeletingProfile ? 'Удаление...' : 'Да, удалить навсегда'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CUSTOM CONFIRMATION MODAL (FOR SAVING TO POSTGRESQL BD PROTALK DATABASE) */}
      {/* ========================================================================= */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-transparent p-4 pointer-events-auto">
          <div className={`w-full max-w-md border-2 rounded-3xl p-6 liquid-glass-modal space-y-4 relative shadow-2xl ${
            theme === 'dark' 
              ? 'border-[#E7C768] text-white' 
              : 'border-amber-600 text-amber-950'
          }`}>
            <button 
              type="button"
              onClick={() => setIsConfirmModalOpen(false)}
              className="absolute top-4 right-4 text-amber-400/70 hover:text-amber-200 transition-colors cursor-pointer p-1 rounded-lg hover:bg-amber-400/10 z-10"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 border-b border-amber-400/30 pb-3 relative z-10">
              <div className="p-2.5 rounded-2xl bg-amber-400/15 border border-amber-400/40 text-[#E7C768]">
                <ShieldAlert size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold font-mono text-[#E7C768]">
                  Подтверждение сохранения
                </h3>
                <p className={`text-sm font-mono ${theme === 'dark' ? 'text-amber-300/80' : 'text-amber-900/80'}`}>
                  Запись изменений в PostgreSQL BD ProTalk
                </p>
              </div>
            </div>

            <div className={`space-y-3 text-sm p-4 rounded-2xl border backdrop-blur-md relative z-10 ${
              theme === 'dark'
                ? 'bg-transparent border-amber-400/40 text-amber-100'
                : 'bg-transparent border-amber-500/50 text-amber-950'
            }`}>
              <p className="font-semibold leading-relaxed text-sm">
                Вы действительно хотите сохранить новые сведения о пользователе в локальной и серверной базе данных?
              </p>

              <div className="space-y-2 text-sm pt-2.5 border-t border-amber-400/20 font-sans">
                <div className="flex justify-between items-center">
                  <span className={`font-mono font-bold ${theme === 'dark' ? 'text-[#E7C768]' : 'text-amber-950'}`}>ФИО:</span>
                  <span className="font-semibold text-right">{editName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`font-mono font-bold ${theme === 'dark' ? 'text-[#E7C768]' : 'text-amber-950'}`}>Должность:</span>
                  <span className="font-semibold text-right">{editPosition}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`font-mono font-bold ${theme === 'dark' ? 'text-[#E7C768]' : 'text-amber-950'}`}>Email:</span>
                  <span className="font-semibold text-right">{editEmail}</span>
                </div>
                {editPassword && (
                  <div className="flex justify-between items-center">
                    <span className={`font-mono font-bold ${theme === 'dark' ? 'text-[#E7C768]' : 'text-amber-950'}`}>Пароль:</span>
                    <span className={`font-semibold text-right font-mono ${theme === 'dark' ? 'text-amber-300' : 'text-amber-900'}`}>•••••••• (Новый)</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className={`font-mono font-bold ${theme === 'dark' ? 'text-[#E7C768]' : 'text-amber-950'}`}>Обязанности:</span>
                  <span className="font-semibold text-right">{editDutiesText.split('\n').filter(Boolean).length} пунктов</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 relative z-10">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isSaving}
                className={`px-4 py-2.5 rounded-xl border border-amber-400/40 transition-all text-sm font-semibold cursor-pointer disabled:opacity-50 ${
                  theme === 'dark'
                    ? 'text-amber-300 hover:text-white hover:border-amber-400/80'
                    : 'text-amber-950 hover:text-amber-800 hover:border-amber-600'
                }`}
              >
                Отмена
              </button>

              <button
                type="button"
                onClick={handleConfirmSaveProfile}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 font-black font-mono border border-amber-300/80 hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-md flex items-center gap-2 disabled:opacity-50 text-sm"
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-amber-950 border-t-transparent rounded-full animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  'Подтвердить сохранение'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOAST SUCCESS NOTIFICATION */}
      {/* ========================================================================= */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[70] flex items-center gap-3 px-5 py-3.5 rounded-2xl border border-amber-400/80 liquid-glass-modal text-white animate-bounce">
          <CheckCircle2 className="text-[#E7C768]" size={20} />
          <span className="text-sm font-mono font-bold text-[#F4EE8E]">{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* NOTIFICATION DETAIL MODAL (POPOVER AT CLICK POSITION - PORTAL TO BODY) */}
      {/* ========================================================================= */}
      {selectedNotifModal && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[9999] bg-transparent"
          onClick={() => setSelectedNotifModal(null)}
        >
          <div 
            style={{
              position: 'fixed',
              left: notifModalPos ? `${notifModalPos.x}px` : '50%',
              top: notifModalPos ? `${notifModalPos.y}px` : '50%',
              transform: notifModalPos ? 'none' : 'translate(-50%, -50%)',
            }}
            onClick={(e) => e.stopPropagation()}
            className={`w-[380px] max-w-[calc(100vw-32px)] border-2 rounded-3xl p-5 space-y-4 liquid-glass-modal animate-fade-in ${
              theme === 'dark' 
                ? 'border-[#E7C768] text-white' 
                : 'border-amber-600 text-zinc-950'
            }`}
          >
            <button 
              onClick={() => setSelectedNotifModal(null)}
              className="absolute top-3.5 right-3.5 text-amber-400/80 hover:text-amber-200 transition-colors cursor-pointer p-1 rounded-lg hover:bg-amber-400/10 z-10"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 border-b border-amber-400/30 pb-3 pr-6 relative z-10">
              <div className={`p-2.5 rounded-xl border shrink-0 ${
                theme === 'dark' ? 'bg-transparent border-amber-400/40 text-[#E7C768]' : 'bg-transparent border-amber-500/60 text-amber-950'
              }`}>
                <Bell size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className={`text-sm font-bold font-mono truncate ${theme === 'dark' ? 'text-[#E7C768]' : 'text-amber-950'}`}>
                  {selectedNotifModal.title || 'Уведомление'}
                </h3>
                <p className={`text-sm font-mono ${theme === 'dark' ? 'text-amber-300/90' : 'text-zinc-800'}`}>
                  {selectedNotifModal.time || 'Только что'} • <span className="text-[#F4EE8E] font-bold">Прочитано</span>
                </p>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border text-sm leading-relaxed backdrop-blur-md max-h-[200px] overflow-y-auto relative z-10 ${
              theme === 'dark'
                ? 'bg-transparent border-amber-400/40 text-amber-100'
                : 'bg-transparent border-amber-500/50 text-zinc-950'
            }`}>
              <p>{selectedNotifModal.desc || selectedNotifModal.description || selectedNotifModal.text || selectedNotifModal.message}</p>
            </div>

            {(() => {
              const notif = selectedNotifModal;
              const repId = notif.reportId || 
                            (typeof notif.actionUrl === 'string' ? notif.actionUrl.match(/rep-[\w-]+|\d{10,}/)?.[0] : null) ||
                            (typeof notif.message === 'string' ? notif.message.match(/rep-[\w-]+|\d{10,}/)?.[0] : null) ||
                            (typeof notif.desc === 'string' ? notif.desc.match(/rep-[\w-]+|\d{10,}/)?.[0] : null) ||
                            (typeof notif.text === 'string' ? notif.text.match(/rep-[\w-]+|\d{10,}/)?.[0] : null) ||
                            (typeof notif.id === 'string' ? notif.id.match(/rep-[\w-]+|\d{10,}/)?.[0] : null);

              const isReview = notif.type === 'REPORT_NEED_REVIEW' || 
                               String(notif.actionUrl || '').includes('/review') ||
                               String(notif.title || '').toLowerCase().includes('проверка') || 
                               String(notif.title || '').toLowerCase().includes('проверить') || 
                               String(notif.desc || notif.message || notif.text || '').toLowerCase().includes('требуется проверка') ||
                               String(notif.desc || notif.message || notif.text || '').toLowerCase().includes('необходима проверка') ||
                               String(notif.desc || notif.message || notif.text || '').toLowerCase().includes('ожидает проверки') ||
                               String(notif.desc || notif.message || notif.text || '').toLowerCase().includes('сдал отчет');

              const isVerdict = notif.type === 'REPORT_REVIEW_DONE' || 
                                notif.type === 'EDITS_ACCEPTED' ||
                                notif.type === 'RECOMMENDATION' || 
                                String(notif.actionUrl || '').includes('/verdict') ||
                                String(notif.title || '').toLowerCase().includes('рецензия') || 
                                String(notif.title || '').toLowerCase().includes('вердикт') ||
                                String(notif.title || '').toLowerCase().includes('проверен');

              let url: string | null = null;
              if (repId) {
                url = isReview ? `/cabinet/raport/review/${repId}` : `/cabinet/raport/verdict/${repId}`;
              } else if (notif.actionUrl && typeof notif.actionUrl === 'string' && notif.actionUrl.trim().length > 0) {
                const raw = notif.actionUrl.trim();
                if (raw !== '/cabinet/profile' && raw !== '/cabinet' && raw !== '/cabinet/profile/notifications') {
                  url = raw;
                }
              }

              if (!url) {
                if (isReview) url = '/cabinet/raport/review';
                else if (isVerdict) url = '/cabinet/raport/calendar';
              }

              const btnText = isReview ? 'проверить отчет' : (isVerdict ? 'смотреть рецензию' : (repId ? 'просмотр отчета' : 'перейти'));

              return (
                <div className="flex items-center justify-between pt-2 border-t border-amber-400/20 relative z-10 gap-2">
                  {url ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedNotifModal(null);
                        if (onNavigate) {
                          onNavigate(url);
                        } else {
                          window.location.assign(url);
                        }
                      }}
                      className={`px-4 py-2 rounded-xl font-bold font-mono text-sm border transition-all cursor-pointer flex items-center gap-1.5 shadow-md ${
                        theme === 'dark'
                          ? 'bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 border-amber-300 hover:brightness-110'
                          : 'bg-amber-300 hover:bg-amber-400 border-amber-500 text-amber-950'
                      }`}
                    >
                      <span>{btnText}</span>
                      <ExternalLink size={14} />
                    </button>
                  ) : <div />}

                  <button
                    type="button"
                    onClick={() => setSelectedNotifModal(null)}
                    className="px-4 py-2 rounded-xl font-bold font-mono text-sm border border-white/20 text-stone-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                  >
                    закрыть
                  </button>
                </div>
              );
            })()}
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
