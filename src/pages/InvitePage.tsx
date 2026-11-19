import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, Mail, Phone, Lock, Sparkles, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { UserRole, UserProfile } from '../types';
import { MobileScreenSwitcher, MobileScreenOption } from '../components/common/MobileScreenSwitcher';

interface InvitePageProps {
  onLoginSuccess: (user: UserProfile) => void;
  onNavigate: (path: string) => void;
}

export default function InvitePage({ onLoginSuccess, onNavigate }: InvitePageProps) {
  const [inviterId, setInviterId] = useState<string>('');
  const [inviteRole, setInviteRole] = useState<string>('employer');
  const [inviterName, setInviterName] = useState<string>('');
  const [inviterCompany, setInviterCompany] = useState<string>('');
  const [inviterCompanyId, setInviterCompanyId] = useState<string>('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mobileScreen, setMobileScreen] = useState<string>('info');
  const [isMobile, setIsMobile] = useState<boolean>(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const inviteScreens: MobileScreenOption[] = [
    { id: 'info', label: 'Приглашение', icon: <Sparkles size={14} className="text-[#E7C768]" /> },
    { id: 'register', label: 'Регистрация', icon: <User size={14} className="text-[#E7C768]" /> }
  ];

  useEffect(() => {
    // Parse URL query params
    const search = window.location.search;
    const urlParams = new URLSearchParams(search);

    let foundInviter = '';
    let foundRole = '';

    // 1. Check standard URLSearchParams
    const stdInviter = urlParams.get('ref') || urlParams.get('inviter') || urlParams.get('director_id') || urlParams.get('org');
    if (stdInviter && /^\d+$/.test(stdInviter)) {
      foundInviter = stdInviter;
    }
    const stdRole = urlParams.get('role');
    if (stdRole) {
      foundRole = stdRole;
    }

    // 2. Comprehensive parsing for formats like:
    // ?54376911121=&role=employer, ?54376911121&role=employer, ?role=employer&54376911121=
    if (search.length > 1) {
      const rawQuery = search.substring(1);
      const parts = rawQuery.split('&');
      for (const part of parts) {
        if (!part) continue;
        const cleanPart = part.trim();
        const eqIdx = cleanPart.indexOf('=');
        const k = (eqIdx >= 0 ? cleanPart.substring(0, eqIdx) : cleanPart).trim();
        const v = (eqIdx >= 0 ? cleanPart.substring(eqIdx + 1) : '').trim();

        if (k === 'role' && v) {
          foundRole = v;
        } else if ((k === 'ref' || k === 'director_id' || k === 'inviter' || k === 'org') && v) {
          foundInviter = v;
        } else if (/^\d{8,15}$/.test(k)) {
          foundInviter = k;
        } else if (/^\d{8,15}$/.test(v)) {
          foundInviter = v;
        }
      }
    }

    if (!foundRole) {
      foundRole = 'employer';
    }

    // Only fallback to storage if no inviter was found in the URL
    if (foundInviter) {
      localStorage.setItem('pending_invite_inviter', foundInviter);
      localStorage.setItem('pending_invite_role', foundRole);
      sessionStorage.setItem('rr_ref_inviter', foundInviter);
      sessionStorage.setItem('rr_ref_role', foundRole);
    } else {
      foundInviter = localStorage.getItem('pending_invite_inviter') || sessionStorage.getItem('rr_ref_inviter') || '91827364501';
    }

    setInviterId(foundInviter);
    setInviteRole(foundRole);

    // Fetch inviter info if available
    fetch(`/api/users/${foundInviter}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.user) {
          setInviterName(data.user.name || 'Руководитель компании');
          setInviterCompany(data.user.company || `Компания ${data.user.name || ''}`.trim());
          setInviterCompanyId(data.user.company_id || (data.user.id ? `com-${data.user.id}` : ''));
        }
      })
      .catch(() => {});
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Введите ваше полное имя (ФИО)');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Введите корректный рабочий E-mail');
      return;
    }
    if (!password) {
      setError('Введите пароль');
      return;
    }
    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    setLoading(true);

    let assignedRole = UserRole.EMPLOYEE;
    if (inviteRole === 'manager' || inviteRole === 'leader') {
      assignedRole = UserRole.MANAGER;
    } else if (inviteRole === 'director' || inviteRole === 'admin') {
      assignedRole = UserRole.DIRECTOR;
    }

    const systemUserId = (10000000000 + Math.floor(Math.random() * 90000000000)).toString();
    const cleanEmail = email.trim().toLowerCase();

    let assignedPosition = 'Сотрудник отдела';
    if (assignedRole === UserRole.MANAGER) {
      assignedPosition = 'Руководитель подразделения';
    } else if (assignedRole === UserRole.DIRECTOR) {
      assignedPosition = 'Директор';
    }

    const targetCompanyId = inviterCompanyId || (inviterId ? (inviterId.startsWith('com-') ? inviterId : `com-${inviterId}`) : undefined);
    const targetCompany = inviterCompany || (inviterName ? `Компания ${inviterName}` : undefined);

    const newUser: UserProfile = {
      id: systemUserId,
      name: name.trim(),
      email: cleanEmail,
      role: assignedRole,
      phone: phone.trim() || '+7 (999) 000-00-00',
      telegramHandle: undefined,
      position: assignedPosition,
      referralCode: 'emp' + systemUserId.slice(-4),
      bonusesEarned: 0,
      invitedUsersCount: 0,
      director_id: inviterId,
      company_id: targetCompanyId,
      company: targetCompany
    };

    try {
      const res = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newUser,
          password,
          telegramHandle: null,
          ref: inviterId,
          director_id: inviterId,
          company_id: targetCompanyId,
          company: targetCompany,
          role: assignedRole,
          is_invite: true,
          registrationType: 'invite'
        })
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Ошибка при регистрации');
        setLoading(false);
        return;
      }

      // Clear pending invite
      localStorage.removeItem('pending_invite_inviter');
      localStorage.removeItem('pending_invite_role');

      const savedUser = data.user || newUser;
      try {
        sessionStorage.setItem('rr_just_registered', String(savedUser.id));
      } catch {}
      onLoginSuccess(savedUser);
      onNavigate('/cabinet');
    } catch (err: any) {
      setError('Ошибка соединения с сервером');
      setLoading(false);
    }
  };

  const roleLabel = inviteRole === 'manager' ? 'Руководитель' : inviteRole === 'director' ? 'Директор' : 'Сотрудник';

  return (
    <div className="relative min-h-screen w-full bg-[#0B0703] text-white flex items-center justify-center p-4 font-sans overflow-hidden select-none">
      
      {/* 3D SATURN GIANT PLANET BACKGROUND ANIMATION */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center opacity-75">
        <svg viewBox="0 0 400 400" className="w-[1000px] h-[1000px] sm:w-[1300px] sm:h-[1300px] animate-pulse transition-all duration-1000 scale-110">
          <defs>
            <radialGradient id="invite-saturn-sphere" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#FFF2A1" />
              <stop offset="30%" stopColor="#E7C768" />
              <stop offset="70%" stopColor="#8A5A12" />
              <stop offset="100%" stopColor="#1C0E02" />
            </radialGradient>
            <radialGradient id="invite-saturn-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#F4EE8E" stopOpacity="0.6" />
              <stop offset="60%" stopColor="#D99E41" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="invite-saturn-ring" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F4EE8E" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#E7C768" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#8A5A12" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* Back Rings */}
          <ellipse 
            cx="200" cy="200" rx="190" ry="45" 
            fill="none" 
            stroke="url(#invite-saturn-ring)" 
            strokeWidth="18" 
            transform="rotate(-15 200 200)" 
          />

          {/* Saturn Glow & Sphere */}
          <circle cx="200" cy="200" r="130" fill="url(#invite-saturn-glow)" />
          <circle cx="200" cy="200" r="110" fill="url(#invite-saturn-sphere)" />

          {/* Front Rings */}
          <path 
            d="M 12 200 A 190 45 0 0 0 388 200" 
            fill="none" 
            stroke="url(#invite-saturn-ring)" 
            strokeWidth="18" 
            transform="rotate(-15 200 200)" 
          />
        </svg>
      </div>

      {/* REGISTRATION CARD IN CENTER WITH TRANSPARENT BG AND BACKDROP BLUR */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-md bg-[#160E06]/75 backdrop-blur-2xl border border-amber-400/50 rounded-3xl p-5 sm:p-8 shadow-[0_0_60px_rgba(231,199,104,0.3)] font-sans space-y-5"
      >
        {/* Mobile Screen Switcher Bar */}
        {isMobile && (
          <div className="mb-2">
            <MobileScreenSwitcher
              screens={inviteScreens}
              activeScreen={mobileScreen}
              onSelectScreen={setMobileScreen}
              showBottomPager={false}
            />
          </div>
        )}

        {/* Screen 1: Info (or always shown on desktop) */}
        {(!isMobile || mobileScreen === 'info') && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-[#F4EE8E] text-xs font-bold font-mono">
                <Sparkles size={13} className="text-amber-400" />
                <span>Приглашение в оргструктуру</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Присоединиться к команде
              </h1>
              <p className="text-sm text-amber-200/80 leading-relaxed">
                {inviterName ? `Вас приглашает: ${inviterName}${inviterCompany ? ` (${inviterCompany})` : ''}` : 'Регистрация по индивидуальной ссылке'}
              </p>
              <div className="inline-block mt-1 px-3 py-1 rounded-xl bg-amber-400/15 border border-amber-400/40 text-[#F4EE8E] text-sm font-bold">
                Роль в системе: {roleLabel}
              </div>
            </div>

            {/* Quick Benefits on Mobile Screen 1 */}
            {isMobile && (
              <div className="space-y-2 pt-2 border-t border-amber-400/20 text-sm text-stone-200">
                <div className="flex items-center gap-2 text-xs text-amber-200/90">
                  <CheckCircle2 size={15} className="text-[#E7C768] shrink-0" />
                  <span>Автоматическое добавление в отдел организации</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-amber-200/90">
                  <CheckCircle2 size={15} className="text-[#E7C768] shrink-0" />
                  <span>Умная сдача рапортов и проверка задач через ИИ</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-amber-200/90">
                  <CheckCircle2 size={15} className="text-[#E7C768] shrink-0" />
                  <span>Доступ к корпоративной Академии и Базе знаний</span>
                </div>

                <button
                  type="button"
                  onClick={() => setMobileScreen('register')}
                  className="w-full mt-4 py-3 px-4 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] hover:brightness-110 text-amber-950 font-black text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Перейти к созданию аккаунта</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Screen 2: Registration Form (or always shown on desktop) */}
        {(!isMobile || mobileScreen === 'register') && (
          <div className="space-y-4">
            {error && (
              <div className="p-3 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-200 text-sm flex items-center gap-2.5 animate-shake">
                <AlertCircle size={16} className="text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-3.5 text-sm">
              <div>
                <label className="block text-sm text-amber-200/90 font-bold mb-1">
                  ФИО сотрудника *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Иванов Иван Иванович"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-amber-400/40 text-white placeholder-amber-200/30 text-sm focus:outline-none focus:border-[#F4EE8E] transition-all font-sans"
                  />
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm text-amber-200/90 font-bold mb-1">
                  Рабочий e-mail *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="employee@company.ru"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-amber-400/40 text-white placeholder-amber-200/30 text-sm focus:outline-none focus:border-[#F4EE8E] transition-all font-sans"
                  />
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm text-amber-200/90 font-bold mb-1">
                  Телефон (WhatsApp / Telegram)
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+7 (999) 000-00-00"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-amber-400/40 text-white placeholder-amber-200/30 text-sm focus:outline-none focus:border-[#F4EE8E] transition-all font-sans"
                  />
                  <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-amber-200/90 font-bold mb-1">
                    Пароль *
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-black/50 border border-amber-400/40 text-white placeholder-amber-200/30 text-sm focus:outline-none focus:border-[#F4EE8E] transition-all font-sans"
                    />
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-amber-200/90 font-bold mb-1">
                    Подтверждение *
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-black/50 border border-amber-400/40 text-white placeholder-amber-200/30 text-sm focus:outline-none focus:border-[#F4EE8E] transition-all font-sans"
                    />
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400" />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] hover:brightness-110 text-amber-950 font-black text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <span>Регистрация...</span>
                ) : (
                  <>
                    <span>Зарегистрироваться и войти</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <div className="pt-3 border-t border-amber-400/20 text-center space-y-1.5 text-xs text-amber-100/90 font-sans">
                <p className="leading-snug">
                  Регистрируясь в сервисе, вы безоговорочно принимаете условия:
                </p>
                <div className="flex flex-wrap gap-x-2 gap-y-1 justify-center text-amber-300 font-medium text-[11px]">
                  <a href="/oferta?tab=oferta" target="_blank" rel="noreferrer" className="hover:underline text-amber-200">
                    Публичная оферта с рекуррентными платежами
                  </a>
                  <span>·</span>
                  <a href="/oferta?tab=privacy" target="_blank" rel="noreferrer" className="hover:underline text-amber-200">
                    Политика конфиденциальности
                  </a>
                  <span>·</span>
                  <a href="/oferta?tab=terms" target="_blank" rel="noreferrer" className="hover:underline text-amber-200">
                    Пользовательское соглашение
                  </a>
                  <span>·</span>
                  <a href="/oferta?tab=personal-data" target="_blank" rel="noreferrer" className="hover:underline text-amber-200">
                    Обработка персональных данных
                  </a>
                </div>
              </div>
            </form>
          </div>
        )}
      </motion.div>

    </div>
  );
}
