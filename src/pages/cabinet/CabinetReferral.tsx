import React, { useState, useEffect } from 'react';
import { Landmark, Copy, CheckCircle, Users, Percent, Gift, Award, HelpCircle, Send, Sparkles, Building2, UserCheck, ShieldCheck } from 'lucide-react';
import { UserProfile, UserRole } from '../../types';

interface CabinetReferralProps {
  currentUser: UserProfile | null;
  setCashOutTab: (val: 'bonus' | 'refund') => void;
  setWithdrawalAmount: (val: string) => void;
  setIsCashOutModalOpen: (val: boolean) => void;
}

export default function CabinetReferral({
  currentUser,
  setCashOutTab,
  setWithdrawalAmount,
  setIsCashOutModalOpen
}: CabinetReferralProps) {
  const [copied, setCopied] = useState(false);
  const [copiedTg, setCopiedTg] = useState(false);
  const [copiedPost, setCopiedPost] = useState(false);
  const [apiStats, setApiStats] = useState<any>(null);

  // Exchange Modal States
  const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false);
  const [isConfirmExchangeOpen, setIsConfirmExchangeOpen] = useState(false);
  const [exchangeAmountRub, setExchangeAmountRub] = useState<number>(1000);
  const [targetType, setTargetType] = useState<'balance' | 'limits'>('balance');
  const [exchangeExtraProjects, setExchangeExtraProjects] = useState<number>(0);
  const [exchangeExtraTasks, setExchangeExtraTasks] = useState<number>(0);
  const [exchangeExtraReports, setExchangeExtraReports] = useState<number>(0);
  const [isExchanging, setIsExchanging] = useState(false);
  const [referralNotice, setReferralNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isEmployee = currentUser?.role === UserRole.EMPLOYEE;

  // Construct referral links using User Profile ID (e.g. 91827364501)
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://ii-rr.ru';
  const currentHost = typeof window !== 'undefined' ? window.location.host : 'ii-rr.ru';
  const refUserId = currentUser?.id || '91827364501';

  const [refLink, setRefLink] = useState<string>(`${currentOrigin}/?ref=${refUserId}`);
  const [tgRefLink, setTgRefLink] = useState<string>(`https://t.me/ii_rr_bot/app?startapp=${refUserId}`);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      const uid = currentUser?.id || '91827364501';
      setRefLink(`${origin}/?ref=${uid}`);
      setTgRefLink(`https://t.me/ii_rr_bot/app?startapp=${uid}`);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (currentUser?.id) {
      fetch(`/api/referral/stats/${currentUser.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setApiStats(data);
          }
        })
        .catch(err => console.warn('Referral stats error:', err));
    }
  }, [currentUser]);

  const copyToClipboard = (text: string, isTg: boolean) => {
    navigator.clipboard.writeText(text);
    if (isTg) {
      setCopiedTg(true);
      setTimeout(() => setCopiedTg(false), 2000);
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const referralStats = {
    invited: apiStats?.invitedCount ?? (currentUser?.invitedUsersCount || 0),
    clicks: apiStats?.referralClicks ?? (currentUser?.referral_clicks || 0),
    active: apiStats?.invitedList ? apiStats.invitedList.filter((u: any) => (u.payment_balance || 0) > 0 || (u.referral_reward_balance || 0) > 0).length : 0,
    bonusesEarnedRR: apiStats?.referralRewardBalance ?? (currentUser?.referral_reward_balance || currentUser?.referral_bonus || 0),
  };

  const invitedListFromDb = apiStats?.invitedList || [];

  const inviter = apiStats?.inviter || {
    name: "Главный Директорат RentRop",
    company: "RentRop Ecosystem",
    email: "support@rentrop.ru",
    role: "Системный Директор"
  };

  const promoPostText = `🚀 Как автоматизировать контроль задач и отчетов в вашей компании с помощью ИИ?

Мы внедрили «ИИ Ревизор & ИИ Рапорт» (${currentHost}) — сервис для руководителей и предпринимателей!

🔥 Основные возможности платформы:
• Автоматический анализ отчетов сотрудников через нейросети
• Контроль выработки, сроков и KPI по всем отделам
• Готовые рекомендации руководителю по каждому сотруднику

🎁 Регистрируйтесь по моей партнерской ссылке и получите бонус на баланс RR:
👉 ${refLink}
(или в Telegram MiniApp: ${tgRefLink})

Попробуйте прямо сейчас и автоматизируйте управление командой!`;

  const handleExecuteExchange = async () => {
    if (!currentUser?.id) return;
    setIsExchanging(true);
    try {
      const res = await fetch('/api/referral/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          amountRub: exchangeAmountRub,
          targetType,
          extraProjects: targetType === 'limits' ? exchangeExtraProjects : 0,
          extraTasks: targetType === 'limits' ? exchangeExtraTasks : 0,
          extraReports: targetType === 'limits' ? exchangeExtraReports : 0,
        })
      });
      const data = await res.json();
      if (data.success) {
        setReferralNotice({
          type: 'success',
          text: `🎉 Обмен успешно выполнен! Списано ${exchangeAmountRub.toLocaleString('ru-RU')} ₽ партнерских бонусов, зачислено +${exchangeAmountRub.toLocaleString('ru-RU')} RR.`
        });
        setIsConfirmExchangeOpen(false);
        setIsExchangeModalOpen(false);
        window.dispatchEvent(new Event('db-users-updated'));
        window.dispatchEvent(new Event('db-updated'));
        fetch(`/api/referral/stats/${currentUser.id}`)
          .then(r => r.json())
          .then(d => d.success && setApiStats(d))
          .catch(() => {});
      } else {
        setReferralNotice({ type: 'error', text: `Ошибка обмена: ${data.error}` });
      }
    } catch (err: any) {
      setReferralNotice({ type: 'error', text: `Сбой при обмене: ${err.message}` });
    } finally {
      setIsExchanging(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans" id="panel-referral">
      
      {referralNotice && (
        <div className="p-3.5 rounded-2xl border border-amber-400/50 bg-amber-500/15 backdrop-blur-md text-amber-950 dark:text-[#F4EE8E] text-sm font-semibold flex items-center justify-between gap-3">
          <span>{referralNotice.text}</span>
          <button
            type="button"
            onClick={() => setReferralNotice(null)}
            className="px-2.5 py-1 rounded-lg border border-amber-500/30 text-sm cursor-pointer hover:bg-amber-500/15"
          >
            Закрыть
          </button>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-white/5 pb-4">
        <div>
          <h3 className="text-xl font-bold bg-gradient-to-r from-zinc-800 to-zinc-500 dark:from-white dark:to-slate-200 bg-clip-text text-transparent flex items-center gap-2">
            <Award className="text-[#E7C768]" size={22} />
            <span>Партнерская программа & Рефералы</span>
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Приглашайте партнеров и получайте пассивный доход на баланс RR</p>
        </div>
        
        {!isEmployee && (
          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            <button 
              onClick={() => {
                const maxBonus = referralStats.bonusesEarnedRR || 0;
                setExchangeAmountRub(maxBonus > 0 ? maxBonus : 1000);
                setIsExchangeModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 font-black text-sm border border-amber-300/80 shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles size={15} />
              Обменять бонусы на RR
            </button>

            <button 
              onClick={() => {
                setCashOutTab('bonus');
                setWithdrawalAmount(String(referralStats.bonusesEarnedRR));
                setIsCashOutModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-transparent text-[#F4EE8E] dark:text-[#F4EE8E] font-bold text-sm border border-amber-500/50 hover:border-amber-400 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Landmark size={14} />
              Вывести на карту / счет
            </button>
          </div>
        )}
      </div>

      {/* KPI METRICS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-transparent backdrop-blur-md rounded-2xl border border-amber-500/30 dark:border-amber-400/30 text-center shadow-sm relative overflow-hidden">
          <div className="absolute top-2 right-2 text-amber-500/60"><Users size={16} /></div>
          <span className="text-sm text-amber-950 dark:text-[#F4EE8E]/90 font-bold block">Приглашено</span>
          <p className="text-2xl font-black text-amber-950 dark:text-[#F4EE8E] mt-1">{referralStats.invited} комп.</p>
          <span className="text-sm text-amber-950 dark:text-[#F4EE8E]/80 block mt-1 font-mono font-bold">всего переходов: {referralStats.clicks}</span>
        </div>
        <div className="p-4 bg-transparent backdrop-blur-md rounded-2xl border border-amber-500/30 dark:border-amber-400/30 text-center shadow-sm relative overflow-hidden">
          <div className="absolute top-2 right-2 text-amber-500/60"><CheckCircle size={16} /></div>
          <span className="text-sm text-amber-950 dark:text-[#F4EE8E]/90 font-bold block">Активные клиенты</span>
          <p className="text-2xl font-black text-amber-950 dark:text-[#F4EE8E] mt-1">{referralStats.active} оплат</p>
          <span className="text-sm text-amber-950 dark:text-[#F4EE8E]/80 block mt-1 font-mono">конверсия: {referralStats.invited > 0 ? Math.round((referralStats.active / referralStats.invited) * 100) : 0}%</span>
        </div>
        <div className="p-4 bg-transparent backdrop-blur-md rounded-2xl border border-amber-500/30 dark:border-amber-400/30 text-center shadow-sm relative overflow-hidden">
          <div className="absolute top-2 right-2 text-[#E7C768]"><Percent size={16} /></div>
          <span className="text-sm text-amber-950 dark:text-[#F4EE8E]/90 font-bold block">Ставка бонуса</span>
          <p className="text-2xl font-black text-amber-950 dark:text-[#F4EE8E] mt-1">15%</p>
          <span className="text-sm text-amber-950 dark:text-[#F4EE8E]/80 block mt-1">пожизненное начисление</span>
        </div>
        <div className="p-4 bg-transparent backdrop-blur-md rounded-2xl border border-amber-500/30 dark:border-amber-400/30 text-center shadow-sm relative overflow-hidden">
          <div className="absolute top-2 right-2 text-[#E7C768]"><Gift size={16} /></div>
          <span className="text-sm text-amber-950 dark:text-[#F4EE8E]/90 font-bold block">Бонусы на балансе</span>
          <p className="text-2xl font-black text-amber-950 dark:text-[#F4EE8E] mt-1">{referralStats.bonusesEarnedRR.toLocaleString('ru-RU')} RR</p>
          <span className="text-sm text-amber-950 dark:text-[#F4EE8E]/80 block mt-1 font-mono">1 RR = 1 ₽ (доступно к выводу)</span>
        </div>
      </div>

      {/* WHO INVITED YOU (REFERRER INFO BLOCK FOR DIRECTOR) */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
            <UserCheck size={20} />
          </div>
          <div>
            <span className="text-sm font-mono font-bold text-amber-950 dark:text-[#F4EE8E] block">
              Кто вас пригласил в экосистему (Ваш Реферер)
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm font-black text-amber-950 dark:text-white">{inviter.name}</span>
              <span className="text-sm text-amber-900 dark:text-amber-200/80">({inviter.company || "RentRop Partner"})</span>
            </div>
            <p className="text-sm font-mono text-amber-950 dark:text-amber-200/70">{inviter.email} · Роль: {inviter.role || "Директор"}</p>
          </div>
        </div>
        <span className="hidden sm:inline-block px-3 py-1 rounded-lg bg-amber-500/20 text-amber-950 dark:text-[#F4EE8E] text-sm font-mono font-bold border border-amber-400/40">
          Привязан
        </span>
      </div>

      {/* REFERRAL LINK CARD */}
      <div className="p-5 rounded-2xl border border-amber-500/30 bg-transparent backdrop-blur-md flex flex-col md:flex-row items-center gap-6 justify-between" id="referral-link-card">
        <div className="space-y-4 flex-1">
          <h4 className="text-sm font-bold text-amber-950 dark:text-[#F4EE8E] flex items-center gap-1.5">
            <span>🔗 Ваша персональная реферальная ссылка</span>
          </h4>
          <p className="text-sm text-amber-950 dark:text-slate-200 leading-relaxed max-w-2xl">
            Используйте её в блогах, социальных сетях, личной переписке или делитесь с коллегами-предпринимателями. Каждая покупка ИИ Ревизора или ИИ Рапорта по этой ссылке гарантирует вам пассивные выплаты на баланс RR.
          </p>
          
          <div className="space-y-3 max-w-xl">
            {/* WEB LINK */}
            <div className="space-y-1">
              <span className="text-sm text-amber-950 dark:text-[#F4EE8E]/90 font-mono font-bold block">1. Веб-ссылка (для браузеров):</span>
              <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
                <input
                  value={refLink}
                  onChange={(e) => setRefLink(e.target.value)}
                  className="flex-1 bg-white/60 dark:bg-black/40 backdrop-blur-md p-3 rounded-xl border border-amber-400/40 font-mono text-sm select-all text-amber-950 dark:text-[#F4EE8E] overflow-hidden truncate outline-none focus:border-amber-400"
                />
                <button 
                  type="button"
                  onClick={() => copyToClipboard(refLink, false)}
                  className={`px-4 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 ${
                    copied 
                      ? 'bg-[#F4EE8E] text-[#140A01] shadow-md' 
                      : 'bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 border border-amber-300/80 shadow-md hover:brightness-110 active:scale-95'
                  }`}
                >
                  {copied ? (
                    <>
                      <CheckCircle size={14} />
                      <span>Скопировано!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Копировать</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* TELEGRAM MINI APP LINK */}
            <div className="space-y-1">
              <span className="text-sm text-amber-950 dark:text-[#F4EE8E]/90 font-mono font-bold block flex items-center gap-1">
                <Send size={14} /> 2. Ссылка для Telegram MiniApp (startapp):
              </span>
              <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
                <input
                  value={tgRefLink}
                  onChange={(e) => setTgRefLink(e.target.value)}
                  className="flex-1 bg-white/60 dark:bg-black/40 backdrop-blur-md p-3 rounded-xl border border-amber-400/40 font-mono text-sm select-all text-amber-950 dark:text-[#F4EE8E] overflow-hidden truncate outline-none focus:border-amber-400"
                />
                <button 
                  type="button"
                  onClick={() => copyToClipboard(tgRefLink, true)}
                  className={`px-4 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 ${
                    copiedTg 
                      ? 'bg-[#F4EE8E] text-[#140A01] shadow-md' 
                      : 'bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 border border-amber-300/80 shadow-md hover:brightness-110 active:scale-95'
                  }`}
                >
                  {copiedTg ? (
                    <>
                      <CheckCircle size={14} />
                      <span>Скопировано!</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>TG Ссылка</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mascot */}
        <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 flex items-center justify-center relative select-none">
          <img 
            src="/file/33/iirr7.png" 
            alt="Mascot RR Loud" 
            className="w-full h-full object-contain animate-bounce-slow"
          />
        </div>
      </div>

      {/* DETAILED LIST OF INVITED REFS FROM DB */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-amber-950 dark:text-[#F4EE8E] flex items-center gap-2">
          <Users size={16} className="text-amber-400" />
          <span>Список приглашенных рефералов (Директоров) из базы данных</span>
        </h4>
        <div className="bg-transparent backdrop-blur-md rounded-2xl border border-amber-500/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-transparent text-amber-950 dark:text-[#F4EE8E] font-bold border-b border-amber-500/30">
                  <th className="p-3">Директор / ФИО</th>
                  <th className="p-3">Контакты (Email / TG)</th>
                  <th className="p-3">Дата регистрации</th>
                  <th className="p-3">Статус</th>
                  <th className="p-3">Всего оплачено</th>
                  <th className="p-3 text-right">Начисленный бонус (15%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-500/20 font-sans">
                {invitedListFromDb.length > 0 ? (
                  invitedListFromDb.map((u: any, i: number) => {
                    const name = (u.first_name || u.last_name) 
                      ? `${u.first_name || ''} ${u.last_name || ''}`.trim() 
                      : (u.name || `Директор ID: ${u.id}`);
                    const hasTgAccount = Boolean(u.telegram_id || (u.username && (!u.email || !u.email.toLowerCase().startsWith(u.username.toLowerCase()))));
                    const rawTg = u.username || u.telegramHandle;
                    const tgHandle = (hasTgAccount && rawTg) ? `@${rawTg.replace('@','')}` : null;
                    const isActive = (u.payment_balance || 0) > 0 || (u.referral_reward_balance || 0) > 0;
                    return (
                      <tr key={u.id || i} className="hover:border-amber-400 border border-transparent transition-all">
                        <td className="p-3 font-semibold text-amber-950 dark:text-white">
                          <div>{name}</div>
                          {u.company && <span className="block text-sm text-amber-600 dark:text-amber-300 font-normal">{u.company}</span>}
                        </td>
                        <td className="p-3 text-amber-900 dark:text-slate-300 font-mono text-sm">
                          {u.email ? (
                            <div className="space-y-0.5">
                              <span className="text-amber-950 dark:text-slate-200">{u.email}</span>
                              {tgHandle && (
                                <span className="block text-xs text-amber-500 font-bold">{tgHandle}</span>
                              )}
                            </div>
                          ) : (
                            tgHandle ? <span className="text-amber-500 font-bold">{tgHandle}</span> : '—'
                          )}
                        </td>
                        <td className="p-3 text-amber-950 dark:text-slate-400 font-mono text-sm">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString('ru-RU') : '—'}
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded text-sm font-bold border ${
                            isActive
                              ? 'bg-amber-500/10 text-amber-950 dark:text-[#F4EE8E] border-amber-500/40'
                              : 'bg-amber-500/10 text-amber-950 dark:text-amber-300 border-amber-500/20'
                          }`}>
                            {isActive ? 'Активен' : 'Зарегистрирован'}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-amber-950 dark:text-slate-300 text-sm">
                          {((u.payment_balance || 0) + (u.referral_reward_balance || 0) * 6.66).toLocaleString('ru-RU')} RR
                        </td>
                        <td className="p-3 text-right font-bold text-amber-950 dark:text-amber-200 font-mono text-sm">
                          {(u.referral_reward_balance || 0).toLocaleString('ru-RU')} RR
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-amber-950 dark:text-slate-400 space-y-2">
                      <p className="font-bold text-sm text-amber-950 dark:text-[#F4EE8E]">
                        У вас пока нет зарегистрированных рефералов из базы данных
                      </p>
                      <p className="text-sm max-w-md mx-auto text-amber-950/80 dark:text-slate-300">
                        Отправьте вашу реферальную ссылку директорам и коллегам. При регистрации по вашей ссылке их ID сохранится в вашей партнерской сети, и вы будете получать 15% с каждой оплаты!
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* TELEGRAM PROMO POST TEMPLATE */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-amber-950 dark:text-[#F4EE8E] flex items-center gap-1.5">
          <Send size={16} className="text-amber-500" />
          <span>Шаблон рекламного поста для Telegram</span>
        </h4>
        <div className="p-5 rounded-2xl border border-amber-500/30 bg-transparent backdrop-blur-md space-y-4">
          <p className="text-xs text-amber-950 dark:text-slate-300">
            Готовый текст поста для отправки в Telegram-каналы, чаты предпринимателей, коллегам или клиентам. Ваша реферальная ссылка уже встроена в текст:
          </p>
          <div className="p-4 rounded-xl bg-transparent backdrop-blur-md border border-amber-400/40 font-sans text-xs sm:text-sm text-amber-950 dark:text-slate-200 whitespace-pre-line leading-relaxed relative select-all">
            {promoPostText}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(promoPostText);
                setCopiedPost(true);
                setTimeout(() => setCopiedPost(false), 2000);
              }}
              className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-2 shadow-md ${
                copiedPost
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 border border-amber-300/80 hover:brightness-110 active:scale-95'
              }`}
            >
              {copiedPost ? (
                <>
                  <CheckCircle size={15} />
                  <span>Текст поста скопирован!</span>
                </>
              ) : (
                <>
                  <Copy size={15} />
                  <span>Копировать текст поста</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 1: REFERRAL EXCHANGE CALCULATOR */}
      {isExchangeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg liquid-glass-modal rounded-2xl p-6 shadow-2xl space-y-5 text-amber-950 dark:text-amber-100 relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setIsExchangeModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-amber-500 hover:text-amber-700 dark:hover:text-white hover:bg-amber-500/20 transition-all cursor-pointer"
            >
              ✕
            </button>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-amber-950 dark:text-[#F4EE8E] flex items-center gap-2">
                <Sparkles size={20} className="text-amber-400" />
                <span>Калькулятор обмена бонусов на RR</span>
              </h3>
              <p className="text-xs text-amber-900 dark:text-amber-200/80">
                Конвертируйте начисленные партнерские вознаграждения в виртуальную валюту RR (1 ₽ = 1 RR) для оплаты услуг.
              </p>
            </div>

            {/* BALANCE INFO BOX */}
            <div className="p-3.5 rounded-xl bg-transparent border border-amber-500/40 flex items-center justify-between">
              <span className="text-xs text-amber-950 dark:text-amber-200">Доступно к обмену:</span>
              <span className="text-base font-black text-amber-950 dark:text-[#F4EE8E] font-mono">
                {(referralStats.bonusesEarnedRR || 0).toLocaleString('ru-RU')} ₽
              </span>
            </div>

            {/* AMOUNT INPUT & SLIDER */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-amber-950 dark:text-amber-300">Сумма для обмена:</span>
                <span className="text-amber-950 dark:text-[#F4EE8E] font-mono text-sm">{exchangeAmountRub.toLocaleString('ru-RU')} ₽</span>
              </div>
              <input 
                type="range"
                min="100"
                max={Math.max(100, referralStats.bonusesEarnedRR || 5000)}
                step="100"
                value={exchangeAmountRub}
                onChange={(e) => setExchangeAmountRub(parseInt(e.target.value) || 100)}
                className="w-full h-2 bg-black/20 dark:bg-black/60 rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
              />
              <div className="flex justify-between text-[10px] text-amber-900 dark:text-amber-300/70 font-mono">
                <span>100 ₽</span>
                <span>{(referralStats.bonusesEarnedRR || 0).toLocaleString('ru-RU')} ₽ (макс)</span>
              </div>
            </div>

            {/* TARGET SELECTION */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-amber-950 dark:text-amber-300 block">Направление зачисления:</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetType('balance')}
                  className={`p-3 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                    targetType === 'balance'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-950 dark:text-[#F4EE8E] shadow-lg'
                      : 'bg-transparent border-amber-500/20 text-amber-900 dark:text-amber-200/60 hover:border-amber-500/40'
                  }`}
                >
                  <span className="block font-black text-xs">Основной баланс</span>
                  <span className="text-[10px] text-amber-900 dark:text-amber-300/80 font-normal">+{exchangeAmountRub.toLocaleString()} RR на счет</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetType('limits')}
                  className={`p-3 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                    targetType === 'limits'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-950 dark:text-[#F4EE8E] shadow-lg'
                      : 'bg-transparent border-amber-500/20 text-amber-900 dark:text-amber-200/60 hover:border-amber-500/40'
                  }`}
                >
                  <span className="block font-black text-xs">Бессрочные лимиты</span>
                  <span className="text-[10px] text-amber-900 dark:text-amber-300/80 font-normal">Прямая покупка ресурсов</span>
                </button>
              </div>
            </div>

            {/* RESULT SUMMARY BOX */}
            <div className="p-4 rounded-xl bg-transparent border border-amber-500/30 space-y-1">
              <span className="text-[10px] text-amber-950 dark:text-amber-400 uppercase tracking-wider block font-bold">Итоговый расчет:</span>
              <div className="flex justify-between items-center">
                <span className="text-xs text-amber-950 dark:text-amber-100">Зачисление на баланс:</span>
                <span className="text-base font-black text-amber-950 dark:text-[#F4EE8E] font-mono">+{exchangeAmountRub.toLocaleString()} RR</span>
              </div>
              <p className="text-[10px] text-amber-900 dark:text-amber-300/70">
                Зачисление производится мгновенно без комиссий через триггер базы данных.
              </p>
            </div>

            {/* MODAL ACTIONS */}
            <div className="flex justify-end gap-3 pt-2 border-t border-amber-500/20">
              <button
                type="button"
                onClick={() => setIsExchangeModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-transparent text-amber-950 dark:text-amber-300 text-xs font-bold border border-amber-500/20 hover:bg-amber-500/10 cursor-pointer"
              >
                Отмена
              </button>

              <button
                type="button"
                onClick={() => {
                  if (exchangeAmountRub > (referralStats.bonusesEarnedRR || 0)) {
                    setReferralNotice({
                      type: 'error',
                      text: 'Запрошенная сумма обмена превышает ваш доступный партнерский баланс.'
                    });
                    return;
                  }
                  setReferralNotice(null);
                  setIsConfirmExchangeOpen(true);
                }}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 font-black text-sm border border-amber-300/80 hover:brightness-110 active:scale-95 cursor-pointer shadow-md"
              >
                Далее к подтверждению
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRMATION DIALOG */}
      {isConfirmExchangeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md liquid-glass-modal rounded-2xl p-6 shadow-2xl space-y-4 text-amber-950 dark:text-amber-100 text-center max-h-[90vh] overflow-y-auto">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-[#F4EE8E] border border-amber-500/40 flex items-center justify-center mx-auto">
              <Sparkles size={24} />
            </div>

            <h3 className="text-base font-black text-amber-950 dark:text-[#F4EE8E]">
              Подтвердите обмен партнерских бонусов
            </h3>

            <p className="text-xs text-amber-900 dark:text-amber-200/90 leading-relaxed">
              Вы уверены, что хотите списать <strong>{exchangeAmountRub.toLocaleString('ru-RU')} ₽</strong> с партнерского баланса и зачислить <strong>+{exchangeAmountRub.toLocaleString('ru-RU')} RR</strong> на основной счет организации?
            </p>

            <div className="p-3 rounded-xl bg-transparent border border-amber-500/30 text-left text-[11px] space-y-1 font-mono text-amber-950 dark:text-amber-300">
              <div className="flex justify-between">
                <span>Списание с бонусов:</span>
                <span className="text-amber-950 dark:text-amber-200 font-bold">-{exchangeAmountRub.toLocaleString('ru-RU')} ₽</span>
              </div>
              <div className="flex justify-between">
                <span>Зачисление на баланс RR:</span>
                <span className="text-amber-950 dark:text-[#F4EE8E] font-bold">+{exchangeAmountRub.toLocaleString('ru-RU')} RR</span>
              </div>
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmExchangeOpen(false)}
                disabled={isExchanging}
                className="px-4 py-2.5 rounded-xl bg-transparent text-amber-950 dark:text-amber-300 text-xs font-bold border border-amber-500/20 hover:bg-amber-500/10 cursor-pointer"
              >
                Отмена
              </button>

              <button
                type="button"
                onClick={handleExecuteExchange}
                disabled={isExchanging}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 font-black text-xs tracking-wider border border-amber-300/80 hover:brightness-110 active:scale-95 cursor-pointer shadow-md disabled:opacity-50"
              >
                {isExchanging ? 'Выполняется...' : 'Подтвердить обмен'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
