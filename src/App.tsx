import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import Header from './components/Header';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import AcademyPage from './pages/AcademyPage';
import OfertaPage from './pages/OfertaPage';
import BlogPage from './pages/BlogPage';
import BlogPostEditorPage from './pages/BlogPostEditorPage';
import CabinetPage from './pages/CabinetPage';
import SystemAdminPage from './pages/SystemAdminPage';
import InvitePage from './pages/InvitePage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import PaymentFailPage from './pages/PaymentFailPage';
import AIAssistant from './components/AIAssistant';
import InteractiveNetworkBackground from './components/InteractiveNetworkBackground';
import AppPreloader from './components/AppPreloader';
import { SystemDiagnosticsModal } from './components/SystemDiagnosticsModal';
import GlobalCascadeWidget from './components/raport/GlobalCascadeWidget';
import { useCascadeCheckStore } from './store/useCascadeCheckStore';
import { UserRole, UserProfile } from './types';
import { Sparkles, Mail, Lock, UserCheck, Shield, User } from 'lucide-react';

export default function App() {
  // Preloader state
  const [isAppLoaded, setIsAppLoaded] = useState(false);

  // Simple browser routing state syncing with window.location.pathname
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  
  // Auth states - defaults to null so user MUST log in to access cabinet
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    // Check if there is a cached user in localstorage
    const saved = localStorage.getItem('rr_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.email) {
          if (parsed.email === 'shishkarnem@gmail.co') {
            parsed.email = 'shishkarnem@gmail.com';
            parsed.name = 'Тимошенко Денис';
            parsed.role = UserRole.SUPER_ADMIN;
            parsed.telegramHandle = '@shishkarnem';
          }
          return parsed;
        }
      } catch (e) { return null; }
    }
    return null;
  });

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('register');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState('');
  const [authError, setAuthError] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotStep, setForgotStep] = useState<'email' | 'code'>('email');
  const [resetCode, setResetCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [isForgotLoading, setIsForgotLoading] = useState(false);

  // System Diagnostics Modal Hotkey (Ctrl + [)
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);

  // Referral partner states
  const [referralPartnerId, setReferralPartnerId] = useState<string | null>(null);
  const [referrerInfo, setReferrerInfo] = useState<{ id: string; name: string; company?: string; role?: string } | null>(null);

  // Auth modal router sync handlers
  const handleOpenAuthModal = (mode: 'login' | 'register' | 'forgot' = 'register') => {
    setAuthMode(mode);
    setIsLoginModalOpen(true);
    if (currentPath !== '/auth') {
      window.history.pushState({}, '', '/auth');
      setCurrentPath('/auth');
    }
  };

  const handleCloseAuthModal = () => {
    setIsLoginModalOpen(false);
    setAuthError('');
    if (currentPath === '/auth') {
      window.history.pushState({}, '', '/');
      setCurrentPath('/');
    }
  };

  useEffect(() => {
    if (currentPath === '/auth') {
      setIsLoginModalOpen(true);
    }
  }, [currentPath]);

  // When navigating to another page while report check is running, forcibly send check to background
  useEffect(() => {
    const cascadeState = useCascadeCheckStore.getState();
    if (cascadeState.cascadeOverallStatus === 'running') {
      cascadeState.sendToBackground();
    }
  }, [currentPath]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '[') {
        e.preventDefault();
        setIsDiagnosticsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle path navigation across the applet
  const handleNavigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Sync back/forward browser buttons & capture referral query parameter vs invite
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);

    // Clean AI Studio preview authentication token from URL address bar
    try {
      if (window.location.search.includes('__aistudio_auth_token')) {
        const url = new URL(window.location.href);
        url.searchParams.delete('__aistudio_auth_token');
        const remainingQuery = url.searchParams.toString();
        const cleanUrl = url.pathname + (remainingQuery ? `?${remainingQuery}` : '') + url.hash;
        window.history.replaceState(window.history.state, '', cleanUrl);
      }
    } catch (e) {}

    // Save referral parameter vs invite parameter
    try {
      const search = window.location.search;
      const urlParams = new URLSearchParams(search);
      let ref = urlParams.get('ref') || urlParams.get('startapp') || urlParams.get('tgWebAppStartParam');
      const roleParam = urlParams.get('role');
      const isExplicitInvite = window.location.pathname.startsWith('/invite') || urlParams.has('company') || (roleParam && roleParam !== 'director');

      if (search.length > 1 && !ref) {
        const rawQuery = search.substring(1);
        const parts = rawQuery.split('&');
        for (const part of parts) {
          if (!part) continue;
          const cleanPart = part.trim();
          const eqIdx = cleanPart.indexOf('=');
          const k = (eqIdx >= 0 ? cleanPart.substring(0, eqIdx) : cleanPart).trim();
          const v = (eqIdx >= 0 ? cleanPart.substring(eqIdx + 1) : '').trim();
          if (k === 'ref' || k === 'startapp') ref = v;
          else if (/^\d{8,15}$/.test(k)) ref = k;
          else if (/^\d{8,15}$/.test(v)) ref = v;
        }
      }

      // Check Telegram WebApp initDataUnsafe.start_param
      const tgStartParam = (window as any).Telegram?.WebApp?.initDataUnsafe?.start_param;
      if (!ref && tgStartParam) {
        ref = String(tgStartParam);
      }

      if (ref && !isExplicitInvite) {
        // This is a PARTNER REFERRAL link (creates own company as Director)
        sessionStorage.removeItem('rr_ref_role');
        sessionStorage.removeItem('pending_invite_role');
        localStorage.removeItem('rr_ref_role');
        localStorage.removeItem('pending_invite_role');

        sessionStorage.setItem('rr_referral_partner', ref);
        localStorage.setItem('rr_referral_partner', ref);
        setReferralPartnerId(ref);

        fetch(`/api/referral/info/${ref}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.referrer) {
              setReferrerInfo(data.referrer);
            }
          })
          .catch(() => {});
      } else if (isExplicitInvite) {
        // Specialized company invite for employee / manager
        const inviteDir = urlParams.get('director_id') || urlParams.get('inviter') || ref;
        if (inviteDir) {
          sessionStorage.setItem('rr_ref_inviter', inviteDir);
          localStorage.setItem('pending_invite_inviter', inviteDir);
        }
        if (roleParam) {
          sessionStorage.setItem('rr_ref_role', roleParam);
          localStorage.setItem('pending_invite_role', roleParam);
        }
      } else {
        const savedRef = sessionStorage.getItem('rr_referral_partner') || localStorage.getItem('rr_referral_partner');
        if (savedRef) {
          setReferralPartnerId(savedRef);
          fetch(`/api/referral/info/${savedRef}`)
            .then(res => res.json())
            .then(data => {
              if (data.success && data.referrer) {
                setReferrerInfo(data.referrer);
              }
            })
            .catch(() => {});
        }
      }
    } catch {}

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update user state helper
  const handleUpdateUser = (updated: UserProfile) => {
    setCurrentUser(updated);
    localStorage.setItem('rr_user', JSON.stringify(updated));
  };

  const syncStateRef = useRef<{ inFlight: boolean; lastAt: number; rateLimitedUntil: number }>({
    inFlight: false,
    lastAt: 0,
    rateLimitedUntil: 0
  });

  // Sync currentUser with database user record
  const syncUserWithDb = (force = false) => {
    const now = Date.now();
    if (now < syncStateRef.current.rateLimitedUntil) return;
    if (syncStateRef.current.inFlight) return;
    if (!force && typeof document !== 'undefined' && document.hidden) return;
    if (!force && now - syncStateRef.current.lastAt < 2500) return;

    let targetUserId: string | null = null;
    try {
      const saved = localStorage.getItem('rr_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.id) targetUserId = String(parsed.id);
      }
    } catch {}
    if (!targetUserId) return;

    syncStateRef.current.inFlight = true;
    syncStateRef.current.lastAt = now;

    fetch(`/api/users/${encodeURIComponent(targetUserId)}`)
      .then(async res => {
        if (res.status === 429) {
          syncStateRef.current.rateLimitedUntil = Date.now() + 60000;
          return null;
        }
        const ct = res.headers.get('content-type') || '';
        if (!res.ok || !ct.toLowerCase().includes('application/json')) return null;
        return res.json().catch(() => null);
      })
      .then(data => {
        if (data?.success && data.user) {
          setCurrentUser(prevUser => {
            if (!prevUser) return null; // Require login: do not auto-login if null
            const dbUser = data.user;

            if (dbUser && (dbUser.id === prevUser.id || (dbUser.email && prevUser.email && dbUser.email.toLowerCase() === prevUser.email.toLowerCase()))) {
              const formatted: UserProfile = {
                ...prevUser,
                ...dbUser,
                id: dbUser.id || prevUser.id,
                name: dbUser.name || prevUser.name,
                email: dbUser.email || prevUser.email,
                role: (dbUser.role === 'SUPER_ADMIN' ? UserRole.SUPER_ADMIN : (dbUser.role || prevUser.role)) as UserRole,
                telegramHandle: dbUser.telegramHandle || (dbUser.username ? `@${dbUser.username}` : prevUser.telegramHandle),
                position: dbUser.position || prevUser.position,
                referralCode: dbUser.referralCode || prevUser.referralCode,
                bonusesEarned: Number(dbUser.bonusesEarned ?? prevUser.bonusesEarned ?? 0),
                invitedUsersCount: Number(dbUser.invitedUsersCount ?? prevUser.invitedUsersCount ?? 0),
                payment_balance: Number(dbUser.payment_balance ?? prevUser.payment_balance ?? 0),
                local_bonus: Number(dbUser.local_bonus ?? prevUser.local_bonus ?? 0),
                referral_bonus: Number(dbUser.referral_bonus ?? prevUser.referral_bonus ?? 0),
                welcome_bonus: Number(dbUser.welcome_bonus ?? prevUser.welcome_bonus ?? 0),
                referral_reward_balance: Number(dbUser.referral_reward_balance ?? prevUser.referral_reward_balance ?? 0),
                projects_limit: Number(dbUser.projects_limit ?? prevUser.projects_limit ?? 0),
                projects_used: Number(dbUser.projects_used ?? prevUser.projects_used ?? 0),
                tasks_limit: Number(dbUser.tasks_limit ?? prevUser.tasks_limit ?? 0),
                tasks_used: Number(dbUser.tasks_used ?? prevUser.tasks_used ?? 0),
                reports_limit: Number(dbUser.reports_limit ?? prevUser.reports_limit ?? 0),
                reports_used: Number(dbUser.reports_used ?? prevUser.reports_used ?? 0),
                extra_projects_balance: Number(dbUser.extra_projects_balance ?? prevUser.extra_projects_balance ?? 0),
                extra_tasks_balance: Number(dbUser.extra_tasks_balance ?? prevUser.extra_tasks_balance ?? 0),
                extra_reports_balance: Number(dbUser.extra_reports_balance ?? prevUser.extra_reports_balance ?? 0),
                telegram_id: dbUser.telegram_id || prevUser.telegram_id,
                first_name: dbUser.first_name || prevUser.first_name,
                last_name: dbUser.last_name || prevUser.last_name,
                username: dbUser.username || prevUser.username,
                photo_url: dbUser.photo_url || prevUser.photo_url,
                profile_link: `/cabinet/profile/${dbUser.id || prevUser.id}`,
                timezone: dbUser.timezone || prevUser.timezone || '+03:00',
                bio: dbUser.bio || prevUser.bio,
                language_code: dbUser.language_code || prevUser.language_code,
              };
              let hasChanged = false;
              for (const k of Object.keys(formatted)) {
                if ((prevUser as any)[k] !== (formatted as any)[k]) {
                  hasChanged = true;
                  break;
                }
              }
              if (!hasChanged) return prevUser;
              localStorage.setItem('rr_user', JSON.stringify(formatted));
              return formatted;
            }
            return prevUser;
          });
        }
      })
      .catch(() => {})
      .finally(() => {
        syncStateRef.current.inFlight = false;
      });
  };

  useEffect(() => {
    syncUserWithDb(true);
    if (!currentPath.startsWith('/cabinet') && !currentPath.startsWith('/system-admin')) {
      document.documentElement.classList.remove('theme-light');
      document.documentElement.classList.add('theme-dark');
    }
    const onEventSync = () => syncUserWithDb(false);
    const pollInterval = setInterval(() => {
      syncUserWithDb(false);
    }, 30000);
    window.addEventListener('db-users-updated', onEventSync);
    window.addEventListener('db-transactions-updated', onEventSync);
    window.addEventListener('db-updated', onEventSync);
    window.addEventListener('user-profile-updated', onEventSync);
    window.addEventListener('focus', onEventSync);
    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('db-users-updated', onEventSync);
      window.removeEventListener('db-transactions-updated', onEventSync);
      window.removeEventListener('db-updated', onEventSync);
      window.removeEventListener('user-profile-updated', onEventSync);
      window.removeEventListener('focus', onEventSync);
    };
  }, [currentPath]);

  // Logout trigger
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('rr_user');
    handleNavigate('/');
  };

  // Reset cached user when visiting main landing page so user enters credentials
  useEffect(() => {
    if (currentPath === '/') {
      setCurrentUser(null);
      localStorage.removeItem('rr_user');
    }
  }, [currentPath]);

  // Standard Email Authentication / Registration submit
  const handleEmailAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    const cleanEmail = loginEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setAuthError('Пожалуйста, введите ваш E-mail');
      return;
    }

    if (authMode === 'login') {
      if (!loginPassword) {
        setAuthError('Пожалуйста, введите пароль');
        return;
      }

      fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: loginPassword })
      })
      .then(res => res.json())
      .then(data => {
        if (!data.success) {
          setAuthError(data.error || 'Неверный E-mail или пароль');
          return;
        }
        handleUpdateUser(data.user);
        setIsLoginModalOpen(false);
        setLoginEmail('');
        setLoginPassword('');
        setAuthError('');
        handleNavigate('/cabinet');
      })
      .catch(() => {
        setAuthError('Ошибка соединения с сервером');
      });
      return;
    }

    if (authMode === 'register') {
      if (!loginName.trim()) {
        setAuthError('Пожалуйста, введите ваше ФИО');
        return;
      }
      if (!registerPhone.trim()) {
        setAuthError('Пожалуйста, введите ваш номер телефона');
        return;
      }
      if (!registerPassword) {
        setAuthError('Пожалуйста, введите пароль');
        return;
      }
      if (registerPassword !== registerPasswordConfirm) {
        setAuthError('Пароли не совпадают!');
        return;
      }

      const cleanName = loginName.trim() || 'Новый Пользователь';
      const search = window.location.search;
      const urlParams = new URLSearchParams(search);

      // Distinguish explicit company invite (/invite) from partner referral (?ref= or ?startapp=)
      const isExplicitInvite = currentPath.startsWith('/invite') || urlParams.has('company') || Boolean(sessionStorage.getItem('pending_invite_role') || localStorage.getItem('pending_invite_role'));
      
      let refParam = referralPartnerId || urlParams.get('ref') || urlParams.get('startapp') || sessionStorage.getItem('rr_referral_partner') || localStorage.getItem('rr_referral_partner') || null;

      // Default registration directly on website or via partner referral sets DIRECTOR role!
      // EMPLOYEE and MANAGER roles are ONLY set via explicit company invite links (/invite)
      let assignedRole = UserRole.DIRECTOR;

      if (isExplicitInvite) {
        const inviteRole = urlParams.get('role') || sessionStorage.getItem('rr_ref_role') || localStorage.getItem('pending_invite_role');
        if (inviteRole === 'employer' || inviteRole === 'employee') {
          assignedRole = UserRole.EMPLOYEE;
        } else if (inviteRole === 'manager' || inviteRole === 'leader') {
          assignedRole = UserRole.MANAGER;
        }
      }

      if (cleanEmail === 'shishkarnem@gmail.com' || cleanEmail === 'shishkarnem@gmail.co') {
        assignedRole = UserRole.SUPER_ADMIN;
      }

      const systemUserId = (cleanEmail === 'shishkarnem@gmail.com' || cleanEmail === 'shishkarnem@gmail.co')
        ? '91827364501'
        : (10000000000 + Math.floor(Math.random() * 90000000000)).toString();

      let assignedPosition = 'Генеральный директор / Руководитель';
      if (assignedRole === UserRole.SUPER_ADMIN) {
        assignedPosition = 'Генеральный директор / Супер-Админ';
      } else if (assignedRole === UserRole.MANAGER) {
        assignedPosition = 'Руководитель подразделения';
      } else if (assignedRole === UserRole.EMPLOYEE) {
        assignedPosition = 'Сотрудник отдела';
      }

      const isBoss = assignedRole === UserRole.DIRECTOR || assignedRole === UserRole.SUPER_ADMIN;
      const compId = `com-${systemUserId}`;
      const compName = `Компания ${cleanName}`;
      const inviteDirectorId = sessionStorage.getItem('rr_ref_inviter') || localStorage.getItem('pending_invite_inviter') || urlParams.get('director_id');
      const targetDirectorId = isBoss ? systemUserId : (inviteDirectorId || undefined);

      const newUser: UserProfile = {
        id: systemUserId,
        name: cleanName,
        email: cleanEmail,
        role: assignedRole,
        company: isBoss ? compName : undefined,
        company_id: isBoss ? compId : undefined,
        director_id: targetDirectorId,
        phone: registerPhone.trim() || '+7 (999) 000-00-00',
        telegramHandle: (cleanEmail === 'shishkarnem@gmail.com' || cleanEmail === 'shishkarnem@gmail.co') ? '@shishkarnem' : undefined,
        position: assignedPosition,
        referralCode: cleanName.toLowerCase().replace(/[^a-z]/g, '') || 'partner' + systemUserId.slice(-4),
        bonusesEarned: assignedRole === UserRole.SUPER_ADMIN ? 10000 : 0,
        invitedUsersCount: assignedRole === UserRole.SUPER_ADMIN ? 12 : 0,
        telegram_id: (cleanEmail === 'shishkarnem@gmail.com' || cleanEmail === 'shishkarnem@gmail.co') ? '169262990' : undefined
      };

      fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newUser,
          password: registerPassword,
          telegramHandle: (cleanEmail === 'shishkarnem@gmail.com' || cleanEmail === 'shishkarnem@gmail.co') ? '@shishkarnem' : null,
          username: (cleanEmail === 'shishkarnem@gmail.com' || cleanEmail === 'shishkarnem@gmail.co') ? 'shishkarnem' : null,
          ref: refParam,
          referred_by: refParam,
          director_id: targetDirectorId,
          role: assignedRole,
          registrationType: isExplicitInvite ? 'invite' : (refParam ? 'referral' : 'direct'),
          is_invite: isExplicitInvite
        })
      })
      .then(res => res.json())
      .then(data => {
        if (!data.success) {
          setAuthError(data.error || 'Ошибка регистрации');
          return;
        }
        const registeredUser = data.user || newUser;
        try {
          sessionStorage.setItem('rr_just_registered', String(registeredUser.id));
        } catch {}
        handleUpdateUser(registeredUser);
        setIsLoginModalOpen(false);
        setLoginEmail('');
        setLoginName('');
        setLoginPassword('');
        setRegisterPhone('');
        setRegisterPassword('');
        setRegisterPasswordConfirm('');
        setAuthError('');
        handleNavigate('/cabinet');
      })
      .catch(() => {
        setAuthError('Ошибка соединения с сервером');
      });
    }
  };

  // Global theme state for root background wrapper
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(() => {
    return !document.documentElement.classList.contains('theme-light');
  });

  useEffect(() => {
    const isCabinetOrAdmin = currentPath.startsWith('/cabinet') || currentPath.startsWith('/system-admin');
    
    if (!isCabinetOrAdmin) {
      if (document.documentElement.classList.contains('theme-light')) {
        document.documentElement.classList.remove('theme-light');
        document.documentElement.classList.add('theme-dark');
      }
      setIsDarkTheme(true);
    } else {
      setIsDarkTheme(!document.documentElement.classList.contains('theme-light'));
    }

    const handleThemeChange = () => {
      const isCabinetOrAdminNow = window.location.pathname.startsWith('/cabinet') || window.location.pathname.startsWith('/system-admin');
      if (!isCabinetOrAdminNow) {
        if (document.documentElement.classList.contains('theme-light')) {
          document.documentElement.classList.remove('theme-light');
          document.documentElement.classList.add('theme-dark');
        }
        setIsDarkTheme(true);
      } else {
        setIsDarkTheme(!document.documentElement.classList.contains('theme-light'));
      }
    };

    window.addEventListener('theme-changed', handleThemeChange);
    window.addEventListener('cabinet-theme-change', handleThemeChange);
    return () => {
      window.removeEventListener('theme-changed', handleThemeChange);
      window.removeEventListener('cabinet-theme-change', handleThemeChange);
    };
  }, [currentPath]);

  // Check URL query parameters for direct email password reset link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlCode = params.get('resetCode') || params.get('code');
    const urlEmail = params.get('resetEmail') || params.get('email');

    if (urlCode && urlEmail) {
      setLoginEmail(decodeURIComponent(urlEmail));
      setResetCode(urlCode);
      setForgotStep('code');
      setForgotSent(false);
      setAuthMode('forgot');
      setIsLoginModalOpen(true);

      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  // Reset password helper via SMTP mailer
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (forgotStep === 'email') {
      if (!loginEmail.trim()) {
        setAuthError('Пожалуйста, введите вашу электронную почту');
        return;
      }
      setIsForgotLoading(true);
      try {
        const res = await fetch('/api/auth/forgot-password/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: loginEmail.trim() })
        });
        const data = await res.json();
        setIsForgotLoading(false);

        if (data.success) {
          setForgotStep('code');
          setForgotSent(false);
        } else {
          setAuthError(data.error || 'Ошибка отправки кода сброса пароля');
        }
      } catch (err: any) {
        setIsForgotLoading(false);
        setAuthError('Сбой подключения к серверу отправки почты SMTP');
      }
    } else {
      if (!resetCode.trim()) {
        setAuthError('Введите 6-значный код подтверждения');
        return;
      }
      if (!resetNewPassword) {
        setAuthError('Введите новый пароль');
        return;
      }
      setIsForgotLoading(true);
      try {
        const res = await fetch('/api/auth/forgot-password/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: loginEmail.trim(),
            code: resetCode.trim(),
            newPassword: resetNewPassword
          })
        });
        const data = await res.json();
        setIsForgotLoading(false);

        if (data.success && data.user) {
          handleUpdateUser(data.user);
          setIsLoginModalOpen(false);
          setForgotStep('email');
          setForgotSent(false);
          setResetCode('');
          setResetNewPassword('');
          handleNavigate('/cabinet');
        } else {
          setAuthError(data.error || 'Неверный код или ошибка сброса');
        }
      } catch (err: any) {
        setIsForgotLoading(false);
        setAuthError('Ошибка проверки кода сброса');
      }
    }
  };

  return (
    <div className={`min-h-screen flex flex-col selection:bg-amber-200 selection:text-slate-900 overflow-x-hidden relative transition-colors duration-300 ${
      isDarkTheme ? 'bg-[#070707] text-white' : 'bg-[#FFFBF5] text-amber-950'
    }`}>
      {!isAppLoaded && (
        <AppPreloader 
          onComplete={() => setIsAppLoaded(true)} 
          onTelegramUserLoaded={(user) => {
            handleUpdateUser(user);
            handleNavigate('/cabinet');
          }}
        />
      )}
      <InteractiveNetworkBackground />
      
      {/* GLOBAL HEADER (Only on non-cabinet & non-invite pages) */}
      {!currentPath.startsWith('/cabinet') && !currentPath.startsWith('/invite') && (
        <Header 
          currentPath={currentPath}
          onNavigate={handleNavigate}
          currentUser={currentUser}
          onLogout={handleLogout}
          onOpenLoginModal={() => handleOpenAuthModal('login')}
        />
      )}

      {/* DYNAMIC CONTENT ROUTER */}
      <div className={`flex-1 w-full ${!currentPath.startsWith('/cabinet') ? 'pt-[72px]' : ''}`}>
        {currentPath.startsWith('/invite') && (
          <InvitePage 
            onLoginSuccess={(user) => {
              handleUpdateUser(user);
            }} 
            onNavigate={handleNavigate} 
          />
        )}
        {(currentPath === '/' || currentPath === '/auth') && (
          <LandingPage 
            onNavigate={handleNavigate}
            onOpenLoginModal={() => handleOpenAuthModal('register')}
            currentUser={currentUser}
          />
        )}
        {(currentPath === '/academy' || currentPath.startsWith('/academy/') || currentPath === '/wiki') && (
          <AcademyPage
            onNavigate={handleNavigate}
            activeSlug={currentPath.startsWith('/academy/') ? decodeURIComponent(currentPath.replace(/^\/academy\//, '').split('?')[0]) : undefined}
            theme={isDarkTheme ? 'dark' : 'light'}
          />
        )}
        {(currentPath === '/oferta' || currentPath === '/offer') && (
          <OfertaPage />
        )}
        {(currentPath === '/payment/success' || currentPath.startsWith('/payment/success')) && (
          <PaymentSuccessPage onNavigate={handleNavigate} />
        )}
        {(currentPath === '/payment/fail' || currentPath.startsWith('/payment/fail') || currentPath === '/payment/fall' || currentPath.startsWith('/payment/fall')) && (
          <PaymentFailPage onNavigate={handleNavigate} />
        )}
        {(currentPath === '/blog/editor' || currentPath.startsWith('/blog/editor/')) && (
          <BlogPostEditorPage 
            onNavigate={handleNavigate} 
            currentUser={currentUser} 
            editPostId={currentPath.replace('/blog/editor/', '').replace('/blog/editor', '')}
          />
        )}
        {currentPath.startsWith('/blog') && !currentPath.startsWith('/blog/editor') && (
          <BlogPage 
            onNavigate={handleNavigate} 
            activePostId={currentPath === '/blog' ? undefined : currentPath.replace(/^\/blog\/(?:post)?/, '')} 
            currentUser={currentUser}
          />
        )}
        {currentPath.startsWith('/system-admin') && (
          currentUser ? (
            <div className="pt-20 pb-12 min-h-screen">
              <SystemAdminPage currentPath={currentPath} onNavigate={handleNavigate} />
            </div>
          ) : (
            <div className="pt-24 pb-12 min-h-screen flex items-center justify-center p-4">
              <div className="max-w-md w-full border border-amber-500/30 bg-zinc-950/90 rounded-3xl p-8 text-center text-white shadow-2xl backdrop-blur-md">
                <Shield size={40} className="mx-auto text-[#E7C768] mb-4 animate-pulse" />
                <h2 className="text-xl font-extrabold text-[#F4EE8E] mb-2 font-sans">Требуется Авторизация</h2>
                <p className="text-sm text-slate-300 mb-6 font-sans">
                  Чтобы войти в панель Администрирования, необходимо авторизоваться в системе.
                </p>
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-[#F4EE8E] to-[#E7C768] text-amber-950 font-extrabold hover:opacity-95 transition-all shadow-lg cursor-pointer"
                >
                  Войти в аккаунт
                </button>
              </div>
            </div>
          )
        )}
        {currentPath.startsWith('/cabinet') && (
          (currentUser || currentPath.match(/\/cabinet\/profile\/[^\/]+$/)) ? (
            <CabinetPage 
              currentPath={currentPath}
              onNavigate={handleNavigate}
              currentUser={currentUser}
              onUpdateUser={handleUpdateUser}
              onLogout={handleLogout}
            />
          ) : (
            <div className="pt-24 pb-12 min-h-screen flex items-center justify-center p-4">
              <div className="max-w-md w-full border border-amber-500/30 bg-zinc-950/90 rounded-3xl p-8 text-center text-white shadow-2xl backdrop-blur-md">
                <User size={40} className="mx-auto text-[#E7C768] mb-4" />
                <h2 className="text-xl font-extrabold text-[#F4EE8E] mb-2 font-sans">Вход в Личный Кабинет</h2>
                <p className="text-sm text-slate-300 mb-6 font-sans">
                  Для доступа к функционалу ИИ Ревизора и личного кабинета, пожалуйста, войдите в систему.
                </p>
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-[#F4EE8E] to-[#E7C768] text-amber-950 font-extrabold hover:opacity-95 transition-all shadow-lg cursor-pointer"
                >
                  Войти в Личный Кабинет
                </button>
              </div>
            </div>
          )
        )}
      </div>

      {/* GLOBAL FOOTER (not shown on active cabinet subpages or /invite) */}
      {!currentPath.startsWith('/cabinet') && !currentPath.startsWith('/invite') && (
        <Footer onNavigate={handleNavigate} />
      )}

      {/* PUBLIC FLOATING AI ASSISTANT (Visible on landing, blog, academy, oferta; Cabinet uses role-specific CabinetCopilot) */}
      {!currentPath.startsWith('/cabinet') && !currentPath.startsWith('/invite') && (
        <AIAssistant onNavigate={handleNavigate} currentPath={currentPath} />
      )}

      {/* AUTH REGISTRATION & LOGIN MODAL */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent animate-fade-in pointer-events-auto" id="auth-modal-container">
          <div className="relative w-full max-w-md border-2 border-amber-400/60 liquid-glass-modal rounded-3xl p-6 sm:p-8 text-white max-h-[95vh] overflow-y-auto" id="auth-modal-box">
            
            {/* Modal Header */}
            <div className="text-center space-y-2 mb-5 relative z-10">
              <div className="w-12 h-12 rounded-full bg-amber-400/10 border border-amber-400/50 flex items-center justify-center mx-auto text-[#E7C768]">
                <Sparkles size={22} className="animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-[#F4EE8E] font-sans">
                {authMode === 'register' && 'Регистрация аккаунта'}
                {authMode === 'login' && 'Вход в систему'}
                {authMode === 'forgot' && 'Восстановление пароля'}
              </h3>
              <p className="text-sm text-zinc-300">
                {authMode === 'register' && 'Создайте учетную запись для управления ИИ Ревизором и ИИ Рапортом.'}
                {authMode === 'login' && 'Войдите в личный кабинет компании.'}
                {authMode === 'forgot' && 'Введите почту для получения кода сброса.'}
              </p>
            </div>

            {/* Tabs (Only if not in Forgot Password view) */}
            {authMode !== 'forgot' && (
              <div className="flex border-b border-amber-500/20 mb-5 relative z-10">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setAuthError('');
                  }}
                  className={`flex-1 pb-2.5 text-sm font-bold transition-all cursor-pointer ${
                    authMode === 'register'
                      ? 'border-b-2 border-[#E7C768] text-[#F4EE8E] font-extrabold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  📝 Регистрация
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError('');
                  }}
                  className={`flex-1 pb-2.5 text-sm font-bold transition-all cursor-pointer ${
                    authMode === 'login'
                      ? 'border-b-2 border-[#E7C768] text-[#F4EE8E] font-extrabold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  🔑 Вход по почте
                </button>
              </div>
            )}

            {/* Referral Partner Info Banner in Register Mode */}
            {authMode === 'register' && referralPartnerId && (
              <div className="p-3.5 mb-4 rounded-2xl border border-[#E7C768]/60 bg-amber-500/10 backdrop-blur-md space-y-1.5 text-left relative z-10 animate-fade-in shadow-[0_0_20px_rgba(244,238,142,0.15)]">
                <div className="flex items-center gap-2 text-[#F4EE8E] text-sm font-bold">
                  <Sparkles size={16} className="text-[#E7C768]" />
                  <span>Партнерская программа</span>
                </div>
                <div className="text-sm text-zinc-200 leading-snug">
                  Вас пригласил: <strong className="text-[#F4EE8E] font-semibold">{referrerInfo?.name || `Партнер ID ${referralPartnerId}`}</strong>
                  {referrerInfo?.company && (
                    <span className="text-amber-300/90 ml-1">({referrerInfo.company})</span>
                  )}
                </div>
                <div className="text-sm text-zinc-300/90 leading-snug">
                  Регистрация директора с созданием собственной компании и 7 днями бесплатного доступа.
                </div>
              </div>
            )}

            {/* Error Message */}
            {authError && (
              <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-300 relative z-10 animate-fade-in text-center font-semibold">
                ⚠️ {authError}
              </div>
            )}

            {/* FORGOT PASSWORD: SUCCESS STATE */}
            {authMode === 'forgot' && forgotSent ? (
              <div className="text-center py-6 space-y-4 relative z-10 animate-fade-in">
                <div className="w-12 h-12 rounded-full bg-amber-400/10 border border-amber-400/40 text-[#F4EE8E] flex items-center justify-center mx-auto text-xl">
                  ✓
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-white">Инструкция отправлена</h4>
                  <p className="text-sm text-zinc-300 leading-relaxed px-4">
                    Мы выслали ссылку для восстановления пароля на электронную почту <strong className="text-amber-200">{loginEmail}</strong>. Проверьте папку "Входящие" и "Спам".
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setForgotSent(false);
                    setAuthMode('login');
                    setAuthError('');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 border border-[#D4AF37]/40 text-sm font-semibold text-[#D4AF37] transition-all cursor-pointer"
                >
                  Вернуться к входу
                </button>
              </div>
            ) : authMode === 'forgot' ? (
              /* FORGOT PASSWORD FORM */
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4 relative z-10">
                {forgotStep === 'email' ? (
                  <div>
                    <label className="block text-sm text-zinc-300 font-semibold mb-1">Ваша электронная почта *</label>
                    <div className="relative">
                      <input 
                        type="email" 
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="info@arenda-ropa.com..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-transparent border border-[#E7C768] text-white placeholder-zinc-400 text-sm focus:outline-none focus:border-[#F4EE8E] focus:ring-1 focus:ring-[#F4EE8E] shadow-[0_0_10px_rgba(231,199,104,0.15)] transition-all"
                      />
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#E7C768]" />
                    </div>
                    <p className="text-sm text-amber-300/80 mt-1.5 font-mono">
                      Код восстановления будет отправлен на вашу электронную почту
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-sm text-amber-200">
                      На вашу почту <strong>{loginEmail}</strong> отправлен 6-значный код восстановления.
                    </div>
                    <div>
                      <label className="block text-sm text-zinc-300 font-semibold mb-1">Код из письма *</label>
                      <input 
                        type="text" 
                        required
                        maxLength={6}
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                        placeholder="123456"
                        className="w-full px-4 py-2.5 rounded-xl bg-transparent border border-[#E7C768] text-center font-mono text-lg tracking-widest text-amber-200 focus:outline-none focus:border-[#F4EE8E] shadow-[0_0_10px_rgba(231,199,104,0.15)]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-zinc-300 font-semibold mb-1">Новый пароль *</label>
                      <input 
                        type="password" 
                        required
                        value={resetNewPassword}
                        onChange={(e) => setResetNewPassword(e.target.value)}
                        placeholder="Укажите новый пароль..."
                        className="w-full px-4 py-2.5 rounded-xl bg-transparent border border-[#E7C768] text-white text-sm focus:outline-none focus:border-[#F4EE8E] shadow-[0_0_10px_rgba(231,199,104,0.15)]"
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="submit"
                    disabled={isForgotLoading}
                    className="flex-1 py-3 rounded-xl font-bold bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-zinc-950 text-sm tracking-wide hover:brightness-110 active:scale-95 transition-all cursor-pointer font-sans disabled:opacity-50 shadow-md"
                  >
                    {isForgotLoading ? 'Отправка...' : forgotStep === 'email' ? 'Отправить' : 'Подтвердить сброс пароля'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (forgotStep === 'code') {
                        setForgotStep('email');
                      } else {
                        setAuthMode('login');
                      }
                      setAuthError('');
                    }}
                    className="px-4 py-3 rounded-xl border border-amber-400/30 text-amber-200 hover:text-white text-sm font-semibold cursor-pointer"
                  >
                    {forgotStep === 'code' ? 'К почте' : 'Назад'}
                  </button>
                </div>

                {forgotStep === 'code' && (
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setForgotStep('email');
                        setAuthError('');
                      }}
                      className="text-sm text-amber-300/80 hover:text-amber-200 underline cursor-pointer"
                    >
                      ← Изменить почту или запросить код повторно
                    </button>
                  </div>
                )}
              </form>
            ) : (
              /* STANDARD REGISTER / LOGIN FORM */
              <form onSubmit={handleEmailAuth} className="space-y-3.5 relative z-10">
                
                {/* REGISTER FIELDS ONLY */}
                {authMode === 'register' && (
                  <>
                    <div>
                      <label className="block text-sm text-zinc-300 font-semibold mb-1">ФИО *</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          required
                          value={loginName}
                          onChange={(e) => setLoginName(e.target.value)}
                          placeholder="Иванов Иван Иванович"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-transparent border border-[#E7C768] text-white placeholder-zinc-400 text-sm focus:outline-none focus:border-[#F4EE8E] focus:ring-1 focus:ring-[#F4EE8E] shadow-[0_0_10px_rgba(231,199,104,0.15)] transition-all"
                        />
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#E7C768] text-sm">👤</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-zinc-300 font-semibold mb-1">Номер телефона *</label>
                      <div className="relative">
                        <input 
                          type="tel" 
                          required
                          value={registerPhone}
                          onChange={(e) => setRegisterPhone(e.target.value)}
                          placeholder="+7 (999) 000-00-00"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-transparent border border-[#E7C768] text-white placeholder-zinc-400 text-sm focus:outline-none focus:border-[#F4EE8E] focus:ring-1 focus:ring-[#F4EE8E] shadow-[0_0_10px_rgba(231,199,104,0.15)] transition-all"
                        />
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#E7C768] text-sm">📞</span>
                      </div>
                    </div>
                  </>
                )}

                {/* COMMON EMAIL FIELD */}
                <div>
                  <label className="block text-sm text-zinc-300 font-semibold mb-1">Электронная почта (Email) *</label>
                  <div className="relative">
                    <input 
                      type="email" 
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="info@company.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-transparent border border-[#E7C768] text-white placeholder-zinc-400 text-sm focus:outline-none focus:border-[#F4EE8E] focus:ring-1 focus:ring-[#F4EE8E] shadow-[0_0_10px_rgba(231,199,104,0.15)] transition-all"
                    />
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#E7C768]" />
                  </div>
                </div>

                {/* PASSWORD FIELDS */}
                {authMode === 'register' ? (
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-sm text-zinc-300 font-semibold mb-1">Пароль *</label>
                      <div className="relative">
                        <input 
                          type="password" 
                          required
                          value={registerPassword}
                          onChange={(e) => setRegisterPassword(e.target.value)}
                          placeholder="••••••"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-transparent border border-[#E7C768] text-white placeholder-zinc-400 text-sm focus:outline-none focus:border-[#F4EE8E] focus:ring-1 focus:ring-[#F4EE8E] shadow-[0_0_10px_rgba(231,199,104,0.15)] transition-all"
                        />
                        <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#E7C768]" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-zinc-300 font-semibold mb-1">Подтверждение *</label>
                      <div className="relative">
                        <input 
                          type="password" 
                          required
                          value={registerPasswordConfirm}
                          onChange={(e) => setRegisterPasswordConfirm(e.target.value)}
                          placeholder="••••••"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-transparent border border-[#E7C768] text-white placeholder-zinc-400 text-sm focus:outline-none focus:border-[#F4EE8E] focus:ring-1 focus:ring-[#F4EE8E] shadow-[0_0_10px_rgba(231,199,104,0.15)] transition-all"
                        />
                        <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#E7C768]" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm text-zinc-300 font-semibold">Пароль *</label>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('forgot');
                          setAuthError('');
                        }}
                        className="text-sm text-amber-300 hover:underline cursor-pointer"
                      >
                        Забыли пароль?
                      </button>
                    </div>
                    <div className="relative">
                      <input 
                        type="password" 
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-transparent border border-[#E7C768] text-white placeholder-zinc-400 text-sm focus:outline-none focus:border-[#F4EE8E] focus:ring-1 focus:ring-[#F4EE8E] shadow-[0_0_10px_rgba(231,199,104,0.15)] transition-all"
                      />
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#E7C768]" />
                    </div>
                  </div>
                )}

                {/* Form Actions */}
                <div className="flex gap-2.5 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl font-bold bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-zinc-950 text-sm tracking-wide hover:brightness-110 active:scale-95 transition-all cursor-pointer font-sans text-center shadow-md"
                  >
                    {authMode === 'register' ? 'Зарегистрироваться' : 'Войти в систему'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseAuthModal}
                    className="px-4 py-3 rounded-xl border border-amber-400/30 text-amber-200 hover:text-white text-sm font-semibold cursor-pointer font-sans"
                  >
                    Отмена
                  </button>
                </div>

                {authMode === 'register' && (
                  <div className="pt-3 border-t border-amber-400/20 text-center space-y-1.5 text-xs text-zinc-300">
                    <p className="leading-snug">
                      Нажимая кнопку «Зарегистрироваться», вы подтверждаете согласие со следующими документами:
                    </p>
                    <div className="flex flex-wrap gap-x-2 gap-y-1 justify-center text-amber-300 font-medium text-[11px]">
                      <a 
                        href="/oferta?tab=oferta" 
                        target="_blank" 
                        rel="noreferrer" 
                        className="hover:underline text-amber-200"
                      >
                        Публичная оферта с рекуррентными платежами
                      </a>
                      <span>·</span>
                      <a 
                        href="/oferta?tab=privacy" 
                        target="_blank" 
                        rel="noreferrer" 
                        className="hover:underline text-amber-200"
                      >
                        Политика конфиденциальности
                      </a>
                      <span>·</span>
                      <a 
                        href="/oferta?tab=terms" 
                        target="_blank" 
                        rel="noreferrer" 
                        className="hover:underline text-amber-200"
                      >
                        Пользовательское соглашение
                      </a>
                      <span>·</span>
                      <a 
                        href="/oferta?tab=personal-data" 
                        target="_blank" 
                        rel="noreferrer" 
                        className="hover:underline text-amber-200"
                      >
                        Обработка персональных данных
                      </a>
                    </div>
                  </div>
                )}
              </form>
            )}

          </div>
        </div>
      )}

      {/* SYSTEM DIAGNOSTICS MODAL (HOTKEY CTRL + [) */}
      <SystemDiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
      />

      {/* GLOBAL CASCADE VERIFICATION MODAL OVERLAY & PINNED FLOATING WIDGET */}
      <GlobalCascadeWidget
        isLightTheme={!isDarkTheme}
        onNavigateToVerdict={(reportId) => {
          handleNavigate(`/cabinet/raport/verdict/${encodeURIComponent(reportId)}`);
        }}
      />

    </div>
  );
}
