import React, { useState } from 'react';
import { 
  TrendingUp, 
  CreditCard, 
  Landmark, 
  ArrowUpRight, 
  CheckCircle, 
  FileText, 
  Download, 
  Building, 
  ShieldCheck, 
  DollarSign,
  Users,
  Sparkles,
  Zap
} from 'lucide-react';
import { TariffState, Transaction, UserProfile } from '../../types';
import TariffCalculator from '../../components/TariffCalculator';

interface CabinetTariffProps {
  tariff: TariffState;
  topUpSeats: number;
  setTopUpSeats: (val: number) => void;
  handleTopUpTariff: () => void;
  setTariff: (val: TariffState) => void;
  saveStateToServer: (updated: any) => void;
  currentUser: UserProfile | null;
  setCashOutTab: (val: 'withdraw' | 'transfer' | 'refund' | 'bonus') => void;
  setWithdrawalAmount: (val: string | number) => void;
  setIsCashOutModalOpen: (val: boolean) => void;
  transactions: Transaction[];
  company: any;
  departments: any;
  templates: any;
  reports: any;
  notifications: any;
  crmCompanies: any;
  mockEmployees: any;
  onUpdateUser?: (val: UserProfile) => void;
}

export default function CabinetTariff({
  tariff,
  topUpSeats,
  setTopUpSeats,
  handleTopUpTariff,
  setTariff,
  saveStateToServer,
  currentUser,
  setCashOutTab,
  setWithdrawalAmount,
  setIsCashOutModalOpen,
  transactions,
  company,
  departments,
  templates,
  reports,
  notifications,
  crmCompanies,
  mockEmployees,
  onUpdateUser
}: CabinetTariffProps) {
  const [activeSubTab, setActiveSubTab] = useState<'calculator' | 'refill' | 'ledger'>('calculator');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('cabinet_theme') as 'dark' | 'light') || 'dark';
  });

  React.useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.theme) {
        setTheme(customEvent.detail.theme);
      }
    };
    window.addEventListener('cabinet-theme-change', handleThemeChange);
    return () => window.removeEventListener('cabinet-theme-change', handleThemeChange);
  }, []);
  const [topUpAmount, setTopUpAmount] = useState<string>('5000');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'invoice'>('card');
  const [isInvoiceGenerated, setIsInvoiceGenerated] = useState(false);
  const [isRecurringAgreed, setIsRecurringAgreed] = useState<boolean>(false);
  const [isRedirectingRobokassa, setIsRedirectingRobokassa] = useState<boolean>(false);

  // Extra Limit Purchase States
  const [buyExtraProjects, setBuyExtraProjects] = useState<number>(0);
  const [buyExtraTasks, setBuyExtraTasks] = useState<number>(0);
  const [buyExtraReports, setBuyExtraReports] = useState<number>(0);

  // Modal Confirmation State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    type: 'tariff' | 'extra_limits';
    title: string;
    details: string;
    costRR: number;
    payload?: any;
  }>({
    isOpen: false,
    type: 'tariff',
    title: '',
    details: '',
    costRR: 0
  });

  // Custom Translucent Info & Alert Modal State (replacing window.alert)
  const [infoNotice, setInfoNotice] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isError?: boolean;
  } | null>(null);

  const [dbLimits, setDbLimits] = useState<any>(null);

  const refreshLimits = React.useCallback(() => {
    if (!currentUser?.id) return;
    fetch(`/api/users/${currentUser.id}/limits`)
      .then(async (res) => {
        if (!res.ok) return null;
        const ct = res.headers.get('content-type') || '';
        if (!ct.toLowerCase().includes('application/json')) return null;
        return res.json();
      })
      .then(data => {
        if (data?.success) {
          setDbLimits(data);
        }
      })
      .catch(() => {});
  }, [currentUser?.id]);

  React.useEffect(() => {
    refreshLimits();
    window.addEventListener('db-transactions-updated', refreshLimits);
    window.addEventListener('db-users-updated', refreshLimits);
    window.addEventListener('db-updated', refreshLimits);
    return () => {
      window.removeEventListener('db-transactions-updated', refreshLimits);
      window.removeEventListener('db-users-updated', refreshLimits);
      window.removeEventListener('db-updated', refreshLimits);
    };
  }, [refreshLimits]);

  const usedEmployees = dbLimits?.activeEmployeesCount ?? dbLimits?.employeesCount ?? currentUser?.active_employees_count ?? tariff.activeEmployeesCount ?? 6;

  const isRevPaid = Boolean(
    (dbLimits?.subscription?.revizor?.paidUntil && new Date(dbLimits.subscription.revizor.paidUntil).getTime() > Date.now()) ||
    (currentUser?.revizor_paid_until && new Date(currentUser.revizor_paid_until).getTime() > Date.now())
  );
  const isRapPaid = Boolean(
    (dbLimits?.subscription?.recruiter?.paidUntil && new Date(dbLimits.subscription.recruiter.paidUntil).getTime() > Date.now()) ||
    (currentUser?.recruiter_paid_until && new Date(currentUser.recruiter_paid_until).getTime() > Date.now())
  );

  const revisorSeats = isRevPaid ? (dbLimits?.revisorEmployees ?? currentUser?.revizor_seats_current ?? 6) : 0;
  const recruiterSeats = isRapPaid ? (dbLimits?.raportEmployees ?? currentUser?.recruiter_seats_current ?? 6) : 0;

  const isTrialActive = Boolean(dbLimits?.trial?.active ?? false);

  const revisorExpires = isRevPaid 
    ? (dbLimits?.subscription?.revizor?.paidUntil || currentUser?.revizor_paid_until) 
    : (isTrialActive ? 'Триал' : 'Не оплачен');
  const raportExpires = isRapPaid 
    ? (dbLimits?.subscription?.recruiter?.paidUntil || currentUser?.recruiter_paid_until) 
    : (isTrialActive ? 'Триал' : 'Не оплачен');

  const extraProjects = dbLimits?.perpetualExtraLimits?.projects?.balance ?? currentUser?.extra_projects_balance ?? currentUser?.purchased_extra_projects ?? 0;
  const extraTasks = dbLimits?.perpetualExtraLimits?.tasks?.balance ?? currentUser?.extra_tasks_balance ?? currentUser?.purchased_extra_tasks ?? 0;
  const extraReports = dbLimits?.perpetualExtraLimits?.reports?.balance ?? currentUser?.extra_reports_balance ?? currentUser?.purchased_extra_reports ?? 0;

  const projectsUsed = dbLimits?.projects_used ?? dbLimits?.projects?.used ?? currentUser?.projects_used ?? 0;
  const projectsLimit = dbLimits?.projects_limit ?? dbLimits?.projects?.limit ?? (isRevPaid ? (revisorSeats * 20 + extraProjects) : extraProjects);

  const tasksUsed = dbLimits?.tasks_used ?? dbLimits?.tasks?.used ?? currentUser?.tasks_used ?? 0;
  const tasksLimit = dbLimits?.tasks_limit ?? dbLimits?.tasks?.limit ?? (isRevPaid ? (revisorSeats * 100 + extraTasks) : extraTasks);

  const reportsUsed = dbLimits?.reports_used ?? dbLimits?.reports?.used ?? currentUser?.reports_used ?? 0;
  const reportsLimit = dbLimits?.reports_limit ?? dbLimits?.reports?.limit ?? (isRapPaid ? (recruiterSeats * 60 + extraReports) : extraReports);

  const isTrial = isTrialActive;

  // Extra limit costs (10 RR per project, 5 RR per task, 5 RR per report)
  const extraCostRR = (buyExtraProjects * 10) + (buyExtraTasks * 5) + (buyExtraReports * 5);

  const handleConfirmPurchase = async () => {
    if (!currentUser?.id) return;
    const currentBalance = currentUser.payment_balance || tariff.balance || 0;

    if (modalConfig.costRR > currentBalance) {
      setModalConfig(prev => ({ ...prev, isOpen: false }));
      setInfoNotice({
        isOpen: true,
        title: 'Недостаточно средств RR',
        message: `Доступно на балансе: ${currentBalance.toLocaleString('ru-RU')} RR, требуется: ${modalConfig.costRR.toLocaleString('ru-RU')} RR. Пополните лицевой счет в форме ниже.`,
        isError: true
      });
      setActiveSubTab('refill');
      setTopUpAmount(String(modalConfig.costRR - currentBalance));
      return;
    }

    try {
      if (modalConfig.type === 'tariff') {
        const { selectedEmployees, selectedMonths, productType = 'revisor' } = modalConfig.payload;
        const res = await fetch(`/api/users/${currentUser.id}/activate-tariff`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productType,
            employeesCount: selectedEmployees,
            months: selectedMonths,
            totalCostRR: modalConfig.costRR
          })
        });
        const data = await res.json();
        if (data.success) {
          const nextBalance = currentBalance - modalConfig.costRR;
          const targetExpires = productType === 'raport' 
            ? (data.user?.recruiter_paid_until || data.user?.raport_expires_at)
            : (data.user?.revizor_paid_until || data.user?.revisor_expires_at);

          const nextTariff = {
            ...tariff,
            activeEmployeesCount: selectedEmployees,
            expiresAt: targetExpires || '2026-12-31',
            balance: nextBalance
          };
          setTariff(nextTariff);
          if (currentUser) {
            currentUser.payment_balance = nextBalance;
            if (productType === 'raport') {
              currentUser.raport_expires_at = targetExpires;
              currentUser.raport_employees_count = selectedEmployees;
            } else {
              currentUser.revisor_expires_at = targetExpires;
              currentUser.revisor_employees_count = selectedEmployees;
            }
          }

          const productLabel = productType === 'raport' ? 'ИИ Рапорт' : productType === 'revisor' ? 'ИИ Ревизор' : 'Корпоративный пакет';
          const newTx: Transaction = {
            id: 'tx-' + Date.now(),
            amount: -modalConfig.costRR,
            type: 'SPENT',
            date: new Date().toISOString().replace('T', ' ').slice(0, 16),
            description: `Активация подписки ${productLabel}: ${selectedEmployees} сотр. на ${selectedMonths} мес. (-${modalConfig.costRR} RR)`
          };
          saveStateToServer({
            company, departments, templates, reports,
            transactions: [newTx, ...transactions],
            notifications, tariff: nextTariff, crmCompanies, mockEmployees
          });

          setInfoNotice({
            isOpen: true,
            title: 'Подписка успешно активирована',
            message: `Подписка «${productLabel}» на ${selectedMonths} мес. (${selectedEmployees} сотр.) успешно оплачена. Списано ${modalConfig.costRR.toLocaleString('ru-RU')} RR. Новый срок действия: ${targetExpires}.`
          });
        } else {
          setInfoNotice({
            isOpen: true,
            title: 'Ошибка активации',
            message: data.error || 'Не удалось активировать подписку на сервере.',
            isError: true
          });
        }
      } else if (modalConfig.type === 'extra_limits') {
        const extraProjects = Number(modalConfig.payload?.extraProjects ?? buyExtraProjects);
        const extraTasks = Number(modalConfig.payload?.extraTasks ?? buyExtraTasks);
        const extraReports = Number(modalConfig.payload?.extraReports ?? buyExtraReports);
        const costRR = Number(modalConfig.costRR);

        const res = await fetch(`/api/users/${currentUser.id}/buy-extra-limits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            extraProjects,
            extraTasks,
            extraReports
          })
        });
        const data = await res.json();
        setModalConfig(prev => ({ ...prev, isOpen: false }));

        if (data.success) {
          const updatedUser = data.user;
          const nextBalance = updatedUser?.payment_balance ?? Math.max(0, currentBalance - costRR);
          const nextTariff = {
            ...tariff,
            balance: nextBalance
          };
          setTariff(nextTariff);
          if (currentUser) {
            currentUser.payment_balance = nextBalance;
            currentUser.extra_projects_balance = updatedUser?.extra_projects_balance ?? ((currentUser.extra_projects_balance || 0) + extraProjects);
            currentUser.extra_tasks_balance = updatedUser?.extra_tasks_balance ?? ((currentUser.extra_tasks_balance || 0) + extraTasks);
            currentUser.extra_reports_balance = updatedUser?.extra_reports_balance ?? ((currentUser.extra_reports_balance || 0) + extraReports);
            currentUser.purchased_extra_projects = updatedUser?.purchased_extra_projects ?? ((currentUser.purchased_extra_projects || 0) + extraProjects);
            currentUser.purchased_extra_tasks = updatedUser?.purchased_extra_tasks ?? ((currentUser.purchased_extra_tasks || 0) + extraTasks);
            currentUser.purchased_extra_reports = updatedUser?.purchased_extra_reports ?? ((currentUser.purchased_extra_reports || 0) + extraReports);
          }

          const newTx: Transaction = {
            id: 'tx-' + Date.now(),
            amount: -costRR,
            type: 'SPENT',
            date: new Date().toISOString().replace('T', ' ').slice(0, 16),
            description: `Докупка бессрочных лимитов: Проекты +${extraProjects}, Задачи +${extraTasks}, Отчеты +${extraReports} (-${costRR} RR)`
          };
          saveStateToServer({
            company, departments, templates, reports,
            transactions: [newTx, ...transactions],
            notifications, tariff: nextTariff, crmCompanies, mockEmployees
          });

          setBuyExtraProjects(0);
          setBuyExtraTasks(0);
          setBuyExtraReports(0);

          refreshLimits();

          window.dispatchEvent(new CustomEvent('db-transactions-updated'));
          window.dispatchEvent(new CustomEvent('db-users-updated'));
          window.dispatchEvent(new CustomEvent('db-updated'));
          if (updatedUser) {
            window.dispatchEvent(new CustomEvent('user-profile-updated', { detail: updatedUser }));
            onUpdateUser?.(updatedUser);
          }

          setInfoNotice({
            isOpen: true,
            title: 'Бессрочные лимиты зачислены',
            message: `Бессрочные лимиты успешно добавлены к вашему аккаунту и зафиксированы в базе данных: Проекты +${extraProjects}, Задачи +${extraTasks}, Отчеты +${extraReports}. Списано ${costRR.toLocaleString('ru-RU')} RR. Лимиты не сгорают со временем.`
          });
        } else {
          setInfoNotice({
            isOpen: true,
            title: 'Ошибка докупки лимитов',
            message: data.error || 'Не удалось завершить операцию.',
            isError: true
          });
        }
      }
    } catch (e: any) {
      setInfoNotice({
        isOpen: true,
        title: 'Ошибка выполнения транзакции',
        message: e.message,
        isError: true
      });
    } finally {
      setModalConfig(prev => ({ ...prev, isOpen: false }));
    }
  };

  // Juridical Person Form States
  const [inn, setInn] = useState('7714285910');
  const [legalName, setLegalName] = useState('ООО «МедиаТех»');
  const [legalAddress, setLegalAddress] = useState('г. Москва, Пресненская наб. 12, оф. 412');

  const handleQuickAmount = (amount: number) => {
    setTopUpAmount(String(amount));
  };

  const handlePayViaRobokassa = async (params: {
    amount: number;
    itemType: 'topup' | 'tariff';
    productName?: string;
    months?: number;
    employeesCount?: number;
  }) => {
    if (!currentUser?.id) {
      setInfoNotice({
        isOpen: true,
        title: 'Требуется авторизация',
        message: 'Пожалуйста, выполните вход для совершения оплаты.',
        isError: true
      });
      return;
    }

    setIsRedirectingRobokassa(true);

    try {
      // 1. Log user consent if agreed
      if (isRecurringAgreed) {
        fetch('/api/payments/robokassa/consent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.id,
            consentType: 'recurring_payments',
            domain: window.location.host,
            metadata: {
              amount: params.amount,
              itemType: params.itemType,
              productName: params.productName
            }
          })
        }).catch(() => {});
      }

      // 2. Request direct Robokassa link based strictly on current domain
      const res = await fetch('/api/payments/robokassa/create-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          amount: params.amount,
          itemType: params.itemType,
          productName: params.productName,
          months: params.months || 1,
          employeesCount: params.employeesCount || 10,
          domain: window.location.host,
          isRecurring: isRecurringAgreed,
          userEmail: currentUser.email
        })
      });

      const data = await res.json();
      if (data.success && data.paymentUrl) {
        // Direct redirect to Robokassa
        window.location.href = data.paymentUrl;
      } else {
        throw new Error(data.error || 'Не удалось сформировать ссылку на оплату в Робокассе');
      }
    } catch (err: any) {
      setIsRedirectingRobokassa(false);
      setInfoNotice({
        isOpen: true,
        title: 'Ошибка оплаты',
        message: err.message || 'Ошибка соединения с платежным шлюзом',
        isError: true
      });
    }
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount <= 0) {
      setInfoNotice({
        isOpen: true,
        title: 'Ошибка ввода суммы',
        message: 'Пожалуйста, введите корректную положительную сумму пополнения.',
        isError: true
      });
      return;
    }

    if (paymentMethod === 'card') {
      await handlePayViaRobokassa({
        amount,
        itemType: 'topup'
      });
    } else {
      setIsInvoiceGenerated(true);
    }
  };

  const downloadInvoiceMock = () => {
    const invoiceNum = Math.floor(Math.random() * 89999) + 10000;
    setInfoNotice({
      isOpen: true,
      title: 'Счет на оплату сформирован',
      message: `Счет на оплату № ${invoiceNum} на сумму ${Number(topUpAmount).toLocaleString('ru-RU')} RR успешно сформирован. Отправьте его в бухгалтерию для оплаты по безналичному расчету.`
    });
    setIsInvoiceGenerated(false);
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans" id="panel-tariff">
      
      {/* HEADER SECTION */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 dark:border-amber-500/20 pb-4">
        <div>
          <h3 className="text-xl font-black text-zinc-950 dark:text-[#F4EE8E] flex items-center gap-2">
            <TrendingUp className="text-amber-500 dark:text-[#F4EE8E]" size={22} />
            <span>Управление корпоративным тарифом и биллингом</span>
          </h3>
          <p className="text-xs text-zinc-800 dark:text-[#F4EE8E]/80 mt-1">
            Активация подписки, расчет ROI, пополнение баланса и счета для юридических лиц
          </p>
        </div>

        {/* SUB TAB SELECTOR */}
        <div className="flex items-center gap-1.5 bg-zinc-200/80 dark:bg-black/60 p-1 rounded-xl border border-zinc-300 dark:border-amber-500/30">
          <button
            onClick={() => setActiveSubTab('calculator')}
            className={`px-3.5 py-2 rounded-lg text-xs transition-all cursor-pointer ${
              activeSubTab === 'calculator' 
                ? 'bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 font-black shadow-md border border-amber-300/80' 
                : 'text-zinc-800 dark:text-[#F4EE8E]/80 hover:text-zinc-950 dark:hover:text-[#F4EE8E] font-bold hover:bg-zinc-300/50 dark:hover:bg-amber-400/10'
            }`}
          >
            Тариф & Калькулятор
          </button>

          <button
            onClick={() => setActiveSubTab('refill')}
            className={`px-3.5 py-2 rounded-lg text-xs transition-all cursor-pointer ${
              activeSubTab === 'refill' 
                ? 'bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 font-black shadow-md border border-amber-300/80' 
                : 'text-zinc-800 dark:text-[#F4EE8E]/80 hover:text-zinc-950 dark:hover:text-[#F4EE8E] font-bold hover:bg-zinc-300/50 dark:hover:bg-amber-400/10'
            }`}
          >
            Пополнение & Счета
          </button>

          <button
            onClick={() => setActiveSubTab('ledger')}
            className={`px-3.5 py-2 rounded-lg text-xs transition-all cursor-pointer ${
              activeSubTab === 'ledger' 
                ? 'bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 font-black shadow-md border border-amber-300/80' 
                : 'text-zinc-800 dark:text-[#F4EE8E]/80 hover:text-zinc-950 dark:hover:text-[#F4EE8E] font-bold hover:bg-zinc-300/50 dark:hover:bg-amber-400/10'
            }`}
          >
            История транзакций
          </button>
        </div>
      </div>

      {/* TOP METRICS SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div className="p-4 liquid-glass-card rounded-2xl border border-amber-400/40 dark:border-amber-400/30 backdrop-blur-md shadow-none">
          <span className="text-sm text-amber-950 dark:text-[#F4EE8E] font-bold tracking-normal block">ИИ Ревизор (Сотрудники)</span>
          <p className="text-sm font-black text-amber-950 dark:text-[#F4EE8E] mt-1 flex items-center justify-center gap-1 font-mono">
            {isTrialActive ? (
              <span className="text-amber-500 dark:text-[#F4EE8E] font-mono">∞ <span className="text-sm font-normal">(7 дней триал)</span></span>
            ) : (
              `${usedEmployees} / ${revisorSeats} сотр.`
            )}
          </p>
          <span className="text-sm font-mono text-amber-950 dark:text-[#F4EE8E]/80 mt-0.5 block">
            Срок: {revisorExpires}
          </span>
        </div>
        <div className="p-4 liquid-glass-card rounded-2xl border border-amber-400/40 dark:border-amber-400/30 backdrop-blur-md shadow-none">
          <span className="text-sm text-amber-950 dark:text-[#F4EE8E] font-bold tracking-normal block">ИИ Рапорт (Сотрудники)</span>
          <p className="text-sm font-black text-amber-950 dark:text-[#F4EE8E] mt-1 flex items-center justify-center gap-1 font-mono">
            {isTrialActive ? (
              <span className="text-amber-500 dark:text-[#F4EE8E] font-mono">∞ <span className="text-sm font-normal">(7 дней триал)</span></span>
            ) : (
              `${usedEmployees} / ${recruiterSeats} сотр.`
            )}
          </p>
          <span className="text-sm font-mono text-amber-950 dark:text-[#F4EE8E]/80 mt-0.5 block">
            Срок: {raportExpires}
          </span>
        </div>
        <div className="p-4 liquid-glass-card rounded-2xl border border-amber-400/40 dark:border-amber-400/30 backdrop-blur-md shadow-none">
          <span className="text-sm text-amber-950 dark:text-[#F4EE8E] font-bold tracking-normal block">Лимиты организации</span>
          <p className="text-sm font-bold text-amber-950 dark:text-[#F4EE8E] mt-1 font-mono">
            Пр: {projectsUsed}/{projectsLimit} | Зад: {tasksUsed}/{tasksLimit} | Отч: {reportsUsed}/{reportsLimit}
          </p>
          <span className="text-sm text-amber-950 dark:text-[#F4EE8E]/80 font-mono mt-0.5 block">Доп. не сгорают</span>
        </div>
        <div className="p-4 liquid-glass-card rounded-2xl border border-amber-400/40 dark:border-amber-400/30 backdrop-blur-md shadow-none">
          <span className="text-sm text-amber-950 dark:text-[#F4EE8E] font-bold tracking-normal block">Баланс RR</span>
          <p className="text-2xl font-black text-amber-950 dark:text-[#F4EE8E] mt-1 font-mono">
            {(currentUser?.payment_balance ?? tariff.balance ?? 0).toLocaleString('ru-RU')} RR
          </p>
        </div>
      </div>

      {/* DETAILED PACKAGE BREAKDOWN & TWO LIMIT TYPES */}
      <div className="p-5 liquid-glass-card rounded-2xl border border-amber-400/40 dark:border-amber-400/30 space-y-4 backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
          <h4 className="text-sm font-black text-amber-950 dark:text-[#F4EE8E] tracking-normal flex items-center gap-2">
            <ShieldCheck size={16} className="text-amber-500 dark:text-[#F4EE8E]" />
            <span>Разделение подписок по продуктам и ресурсам</span>
          </h4>
          <span className="text-sm text-amber-950 dark:text-[#F4EE8E]/80 font-mono">
            Ревизор: +20 проектов, +100 задач | Рапорт: +60 отчетов на сотрудника
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
          {/* TAB 1: EMPLOYEES & TARIFF LIMITS */}
          <div className="p-3.5 rounded-xl bg-transparent border border-amber-400/40 dark:border-amber-400/30 space-y-1.5 backdrop-blur-md">
            <span className="text-sm text-amber-950 dark:text-[#F4EE8E] font-bold block">1. Места по пакетам (исп. / куплено)</span>
            <div className="space-y-0.5 text-sm font-mono text-amber-950 dark:text-[#F4EE8E] font-bold">
              <div>ИИ Ревизор: {usedEmployees} / {revisorSeats} сотр.</div>
              <div>ИИ Рапорт: {usedEmployees} / {recruiterSeats} сотр.</div>
            </div>
            <p className="text-sm text-amber-950/80 dark:text-[#F4EE8E]/70">
              Активные сотрудники / Купленные места
            </p>
          </div>

          {/* TAB 2: INCLUDED TARIFF LIMITS (EXPIRABLE) */}
          <div className="p-3.5 rounded-xl bg-transparent border border-amber-400/40 dark:border-amber-400/30 space-y-1.5 backdrop-blur-md">
            <span className="text-sm text-amber-950 dark:text-[#F4EE8E] font-bold block">2. Включено в тариф</span>
            <div className="space-y-0.5 text-sm font-mono text-amber-950 dark:text-[#F4EE8E] font-bold">
              <div>Проекты: {revisorSeats * 20} шт</div>
              <div>Задачи: {revisorSeats * 100} шт / мес</div>
              <div>Отчеты: {recruiterSeats * 60} шт / мес</div>
            </div>
            <p className="text-sm text-amber-950/80 dark:text-[#F4EE8E]/70 font-semibold">
              * Ежемесячные (обновляются триггером)
            </p>
          </div>

          {/* TAB 3: PERPETUAL EXTRA LIMITS (NEVER EXPIRE) */}
          <div className="p-3.5 rounded-xl bg-transparent border border-amber-400/40 dark:border-amber-400/30 space-y-1.5 backdrop-blur-md">
            <div className="flex justify-between items-center">
              <span className="text-sm text-amber-950 dark:text-[#F4EE8E] font-bold">3. Бессрочные доп. лимиты</span>
              <span className="text-sm bg-amber-500/20 text-amber-950 dark:text-[#F4EE8E] px-1.5 py-0.5 rounded font-mono font-bold border border-amber-400/30">Не сгорают</span>
            </div>
            <div className="space-y-0.5 text-sm font-mono text-amber-950 dark:text-[#F4EE8E] font-bold">
              <div>Проекты: +{extraProjects}</div>
              <div>Задачи: +{extraTasks}</div>
              <div>Отчеты: +{extraReports}</div>
            </div>
            <p className="text-sm text-amber-950/80 dark:text-[#F4EE8E]/70 font-medium">
              Закреплены за Директором компании
            </p>
          </div>

          {/* TAB 4: SERVICE EXPIRATION DATES */}
          <div className="p-3.5 rounded-xl bg-transparent border border-amber-400/40 dark:border-amber-400/30 space-y-1.5 backdrop-blur-md">
            <span className="text-sm text-amber-950 dark:text-[#F4EE8E] font-bold block">4. Сроки пакетов</span>
            <div className="space-y-1 text-sm font-mono">
              <div className="flex justify-between border-b border-amber-500/10 pb-0.5">
                <span className="text-amber-950 dark:text-[#F4EE8E]/80">ИИ Ревизор:</span>
                <span className="font-bold text-amber-950 dark:text-[#F4EE8E]">{revisorExpires}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-950 dark:text-[#F4EE8E]/80">ИИ Рапорт:</span>
                <span className="font-bold text-amber-950 dark:text-[#F4EE8E]">{raportExpires}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TAB 1: TARIFF CALCULATOR & EXTRA LIMITS TOP-UP */}
      {activeSubTab === 'calculator' && (
        <div className="space-y-6 animate-fade-in">
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-zinc-900 dark:text-[#F4EE8E] uppercase tracking-wider">
              Расчет и активация подписки со счета RR
            </h4>
            <p className="text-xs text-zinc-600 dark:text-amber-200/80">
              Выберите количество рабочих мест и срок действия подписки. При активации средства списываются с вашего баланса RR.
            </p>
          </div>
          
          <TariffCalculator 
            initialEmployees={tariff.activeEmployeesCount || 10}
            actionButtonText="Активировать подписку"
            mode="cabinet"
            theme={theme}
            onAction={(selectedEmployees, selectedMonths, totalCost, chosenProduct = 'revisor') => {
              const currentBalance = currentUser?.payment_balance ?? tariff.balance ?? 0;
              const productLabel = chosenProduct === 'raport' ? 'ИИ Рапорт' : 'ИИ Ревизор';
              const quotasDesc = chosenProduct === 'raport'
                ? `Включено: ${selectedEmployees * 60} отчетов в месяц.`
                : `Включено: ${selectedEmployees * 10} проектов и ${selectedEmployees * 60} задач в месяц.`;
              setModalConfig({
                isOpen: true,
                type: 'tariff',
                title: `Активация подписки ${productLabel}`,
                details: `Подписка «${productLabel}» на ${selectedEmployees} сотрудников на срок ${selectedMonths} мес. ${quotasDesc} С вашего лицевого счета будет списано ${totalCost.toLocaleString('ru-RU')} RR.`,
                costRR: totalCost,
                payload: { selectedEmployees, selectedMonths, productType: chosenProduct }
              });
            }}
          />

          {/* DEDICATED PERPETUAL EXTRA LIMITS PURCHASE BLOCK */}
          <div className="p-5 rounded-2xl border border-amber-400/40 dark:border-amber-400/30 bg-transparent liquid-glass-card space-y-4 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/20 pb-3">
              <div>
                <h4 className="text-sm font-black text-amber-950 dark:text-[#F4EE8E] uppercase tracking-wider flex items-center gap-2">
                  <Zap size={18} className="text-amber-500 dark:text-[#F4EE8E]" />
                  <span>Докупка бессрочных лимитов сверх тарифа (Не сгорают)</span>
                </h4>
                <p className="text-xs text-amber-950/80 dark:text-[#F4EE8E]/70 mt-0.5">
                  Приобретенные лимиты хранятся на счете Директора и расходуются во вторую очередь после тарифных.
                </p>
              </div>
              <div className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-950 dark:text-[#F4EE8E] font-mono text-xs font-bold shrink-0">
                Баланс RR: {(currentUser?.payment_balance ?? tariff.balance).toLocaleString('ru-RU')} RR
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
              <span className="text-xs font-mono font-bold text-amber-950/80 dark:text-[#F4EE8E]/80">Готовые пакеты:</span>
              <button
                type="button"
                onClick={() => { setBuyExtraProjects(10); setBuyExtraTasks(50); setBuyExtraReports(50); }}
                className="px-2.5 py-1 rounded-lg border border-amber-400/40 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-mono font-bold text-amber-950 dark:text-[#F4EE8E] transition-all cursor-pointer active:scale-95"
              >
                +10 пр / +50 зад / +50 отч (600 RR)
              </button>
              <button
                type="button"
                onClick={() => { setBuyExtraProjects(25); setBuyExtraTasks(150); setBuyExtraReports(100); }}
                className="px-2.5 py-1 rounded-lg border border-amber-400/40 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-mono font-bold text-amber-950 dark:text-[#F4EE8E] transition-all cursor-pointer active:scale-95"
              >
                +25 пр / +150 зад / +100 отч (1 500 RR)
              </button>
              <button
                type="button"
                onClick={() => { setBuyExtraProjects(50); setBuyExtraTasks(500); setBuyExtraReports(200); }}
                className="px-2.5 py-1 rounded-lg border border-amber-400/40 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-mono font-bold text-amber-950 dark:text-[#F4EE8E] transition-all cursor-pointer active:scale-95"
              >
                +50 пр / +500 зад / +200 отч (4 000 RR)
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Extra Projects */}
              <div className="p-4 rounded-xl bg-transparent border border-amber-400/30 space-y-2 backdrop-blur-md">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-amber-950 dark:text-[#F4EE8E]">Доп. Проекты (+10 RR/шт)</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setBuyExtraProjects(prev => Math.max(0, prev - 5))}
                      className="w-6 h-6 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-950 dark:text-[#F4EE8E] font-bold text-xs flex items-center justify-center cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-xs font-mono font-black text-amber-950 dark:text-[#F4EE8E]">+{buyExtraProjects}</span>
                    <button
                      type="button"
                      onClick={() => setBuyExtraProjects(prev => Math.min(200, prev + 5))}
                      className="w-6 h-6 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-950 dark:text-[#F4EE8E] font-bold text-xs flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={buyExtraProjects}
                  onChange={(e) => setBuyExtraProjects(Number(e.target.value))}
                  className="w-full accent-[#D4AF37]"
                />
                <div className="text-[10px] text-amber-950/80 dark:text-[#F4EE8E]/70 font-mono flex justify-between">
                  <span>0</span>
                  <span>+50 шт (+500 RR)</span>
                  <span>+100 шт</span>
                </div>
              </div>

              {/* Extra Tasks */}
              <div className="p-4 rounded-xl bg-transparent border border-amber-400/30 space-y-2 backdrop-blur-md">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-amber-950 dark:text-[#F4EE8E]">Доп. Задачи (+5 RR/шт)</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setBuyExtraTasks(prev => Math.max(0, prev - 25))}
                      className="w-6 h-6 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-950 dark:text-[#F4EE8E] font-bold text-xs flex items-center justify-center cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-xs font-mono font-black text-amber-950 dark:text-[#F4EE8E]">+{buyExtraTasks}</span>
                    <button
                      type="button"
                      onClick={() => setBuyExtraTasks(prev => Math.min(1000, prev + 25))}
                      className="w-6 h-6 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-950 dark:text-[#F4EE8E] font-bold text-xs flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="500"
                  step="25"
                  value={buyExtraTasks}
                  onChange={(e) => setBuyExtraTasks(Number(e.target.value))}
                  className="w-full accent-[#D4AF37]"
                />
                <div className="text-[10px] text-amber-950/80 dark:text-[#F4EE8E]/70 font-mono flex justify-between">
                  <span>0</span>
                  <span>+250 шт (+1 250 RR)</span>
                  <span>+500 шт</span>
                </div>
              </div>

              {/* Extra Reports */}
              <div className="p-4 rounded-xl bg-transparent border border-amber-400/30 space-y-2 backdrop-blur-md">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-amber-950 dark:text-[#F4EE8E]">Доп. Отчеты (+5 RR/шт)</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setBuyExtraReports(prev => Math.max(0, prev - 25))}
                      className="w-6 h-6 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-950 dark:text-[#F4EE8E] font-bold text-xs flex items-center justify-center cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-xs font-mono font-black text-amber-950 dark:text-[#F4EE8E]">+{buyExtraReports}</span>
                    <button
                      type="button"
                      onClick={() => setBuyExtraReports(prev => Math.min(1000, prev + 25))}
                      className="w-6 h-6 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-950 dark:text-[#F4EE8E] font-bold text-xs flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="500"
                  step="25"
                  value={buyExtraReports}
                  onChange={(e) => setBuyExtraReports(Number(e.target.value))}
                  className="w-full accent-[#D4AF37]"
                />
                <div className="text-[10px] text-amber-950/80 dark:text-[#F4EE8E]/70 font-mono flex justify-between">
                  <span>0</span>
                  <span>+250 шт (+1 250 RR)</span>
                  <span>+500 шт</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-amber-500/20">
              <div className="text-xs text-amber-950 dark:text-[#F4EE8E] font-mono">
                Итого к списанию с баланса: <strong className="text-base text-amber-950 dark:text-[#F4EE8E] font-black">{extraCostRR.toLocaleString('ru-RU')} RR</strong>
              </div>

              <button
                type="button"
                onClick={() => {
                  let p = buyExtraProjects;
                  let t = buyExtraTasks;
                  let r = buyExtraReports;
                  if (p === 0 && t === 0 && r === 0) {
                    p = 10;
                    t = 50;
                    r = 50;
                    setBuyExtraProjects(p);
                    setBuyExtraTasks(t);
                    setBuyExtraReports(r);
                  }
                  const cost = (p * 10) + (t * 5) + (r * 5);
                  setModalConfig({
                    isOpen: true,
                    type: 'extra_limits',
                    title: 'Подтверждение докупки бессрочных лимитов',
                    details: `Вы докупаете бессрочные лимиты: Проекты +${p}, Задачи +${t}, Отчеты +${r}. Эти лимиты никогда не сгорают со временем, закреплены за Директором и суммируются с лимитами тарифа.`,
                    costRR: cost,
                    payload: {
                      extraProjects: p,
                      extraTasks: t,
                      extraReports: r
                    }
                  });
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm tracking-wide transition-all cursor-pointer border bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 border-amber-300/80 hover:brightness-110 shadow-md active:scale-95"
              >
                Купить бессрочные лимиты {extraCostRR > 0 ? `(${extraCostRR.toLocaleString('ru-RU')} RR)` : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REFILL BALANCE & INVOICES */}
      {activeSubTab === 'refill' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
          
          <div className="p-5 rounded-2xl border border-amber-400/40 dark:border-amber-400/30 bg-transparent liquid-glass-card space-y-5 lg:col-span-7 shadow-none backdrop-blur-md">
            <div>
              <h4 className="text-sm font-bold text-amber-950 dark:text-[#F4EE8E] flex items-center gap-1.5">
                <DollarSign size={16} className="text-amber-500" />
                <span>Пополнение лицевого счета организации</span>
              </h4>
              <div className="mt-2 p-3 rounded-xl border border-amber-400/40 bg-amber-500/10 text-sm text-amber-950 dark:text-[#F4EE8E] leading-relaxed">
                <strong className="font-bold">Курс валюты:</strong> 1 российский рубль = 1 RR. Для работы сервисов, подключения тарифов и докупки бессрочных лимитов приобретается внутренняя виртуальная валюта RR (RentRop Token). Без НДС (54-ФЗ).
              </div>
            </div>

            <form onSubmit={handleDepositSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-amber-950 dark:text-[#F4EE8E] font-bold mb-1.5">
                  Сумма пополнения (RR)
                </label>
                <div className="relative">
                  <input 
                    type="number"
                    required
                    min="500"
                    max="500000"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-transparent border border-amber-400/50 text-amber-950 dark:text-[#F4EE8E] font-mono text-sm focus:outline-none focus:border-[#D4AF37] dark:focus:border-[#F4EE8E]"
                    placeholder="5000"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs font-mono font-bold text-amber-950/70 dark:text-[#F4EE8E]/70">
                    RR (к оплате: {Number(topUpAmount || 0).toLocaleString('ru-RU')} RR)
                  </span>
                </div>
              </div>

              {/* Quick Amounts */}
              <div className="flex flex-wrap gap-1.5">
                {[3000, 5000, 15000, 50000, 100000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleQuickAmount(amt)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-mono transition-all border cursor-pointer ${
                      topUpAmount === String(amt)
                        ? 'bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 border-amber-300 font-bold shadow-sm'
                        : 'bg-transparent text-amber-950 dark:text-[#F4EE8E] border-amber-400/40 hover:border-amber-400'
                    }`}
                  >
                    {amt.toLocaleString('ru-RU')} RR
                  </button>
                ))}
              </div>

              {/* Recurring payments agreement checkbox (UNCHECKED by default) */}
              <div className="p-3.5 rounded-xl border border-amber-400/40 bg-amber-500/5 space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isRecurringAgreed}
                    onChange={(e) => setIsRecurringAgreed(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500 cursor-pointer accent-[#D4AF37]"
                  />
                  <span className="text-sm font-bold text-amber-950 dark:text-[#F4EE8E] leading-snug">
                    Я согласен на автоматические списания согласно условиям оферты
                  </span>
                </label>
                <div className="pl-6 space-y-1 text-xs text-amber-950/80 dark:text-[#F4EE8E]/80 leading-relaxed font-sans">
                  <p>• Списание происходит ежемесячно в 03:00 МСК по выбранному тарифу.</p>
                  <p>• Отмена подписки в 1 клик в любое время в личном кабинете или через обращение в службу заботы.</p>
                  <p>• Уведомление об изменении тарифов направляется не менее чем за 14 дней.</p>
                  <p className="font-semibold text-amber-900 dark:text-amber-300">
                    • Внимание: автоматические списания доступны только для карт банков РФ. Карты иностранных банков не поддерживаются.
                  </p>
                </div>
              </div>

              {/* Direct Robokassa Submit Button */}
              <button
                type="submit"
                disabled={isRedirectingRobokassa}
                className="w-full py-3.5 rounded-xl font-bold bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 text-sm tracking-wide border border-amber-300/80 hover:brightness-110 active:scale-98 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md mt-4"
              >
                {isRedirectingRobokassa ? (
                  <>
                    <Sparkles size={16} className="animate-spin text-amber-950" />
                    <span>Перенаправление в Робокассу...</span>
                  </>
                ) : (
                  <>
                    <CreditCard size={16} />
                    <span>Оплатить {Number(topUpAmount || 0).toLocaleString('ru-RU')} RR через Робокассу</span>
                  </>
                )}
              </button>

              {/* 4 Mandatory Legal Document Links */}
              <div className="pt-3 border-t border-amber-400/20 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-amber-950/90 dark:text-[#F4EE8E]/90 justify-center font-medium">
                <a 
                  href="/oferta?tab=oferta" 
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState({}, '', '/oferta?tab=oferta');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="hover:underline text-amber-900 dark:text-[#F4EE8E] flex items-center gap-1 cursor-pointer"
                >
                  <FileText size={12} className="text-amber-500" />
                  <span>Публичная оферта с рекуррентными платежами</span>
                </a>
                <a 
                  href="/oferta?tab=privacy" 
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState({}, '', '/oferta?tab=privacy');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="hover:underline text-amber-900 dark:text-[#F4EE8E] flex items-center gap-1 cursor-pointer"
                >
                  <FileText size={12} className="text-amber-500" />
                  <span>Политика конфиденциальности</span>
                </a>
                <a 
                  href="/oferta?tab=terms" 
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState({}, '', '/oferta?tab=terms');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="hover:underline text-amber-900 dark:text-[#F4EE8E] flex items-center gap-1 cursor-pointer"
                >
                  <FileText size={12} className="text-amber-500" />
                  <span>Пользовательское соглашение</span>
                </a>
                <a 
                  href="/oferta?tab=personal-data" 
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState({}, '', '/oferta?tab=personal-data');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="hover:underline text-amber-900 dark:text-[#F4EE8E] flex items-center gap-1 cursor-pointer"
                >
                  <FileText size={12} className="text-amber-500" />
                  <span>Согласие на обработку персональных данных</span>
                </a>
              </div>
            </form>
          </div>

          <div className="space-y-4 lg:col-span-5">
            <div className="p-5 rounded-2xl border border-amber-400/40 dark:border-amber-400/30 bg-transparent liquid-glass-card space-y-3 shadow-none backdrop-blur-md">
              <h4 className="text-sm font-bold text-amber-950 dark:text-[#F4EE8E] flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-amber-500" />
                <span>Безопасность платежей</span>
              </h4>
              <p className="text-sm text-amber-950/90 dark:text-[#F4EE8E]/80 leading-relaxed font-medium">
                Все карточные платежи осуществляются через лицензированный эквайринг Робокасса с фискализацией по 54-ФЗ. Передача информации идет по защищенному протоколу SSL с шифрованием 256 бит.
              </p>
              <p className="text-sm text-amber-950/90 dark:text-[#F4EE8E]/80 leading-relaxed font-medium">
                Для организаций закрывающие документы (акты сверки, электронные чеки) формируются автоматически.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-amber-400/50 bg-transparent liquid-glass-card text-sm text-amber-950 dark:text-[#F4EE8E] text-center font-mono font-bold shadow-sm backdrop-blur-md">
              По всем финансовым вопросам пишите на <strong className="text-amber-950 dark:text-[#F4EE8E] font-bold underline">info@arenda-ropa.com</strong>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TRANSACTION HISTORICAL LEDGER */}
      {activeSubTab === 'ledger' && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-amber-950 dark:text-[#F4EE8E]">Журнал финансовых операций (Баланс RR)</h4>
            <span className="text-xs font-mono text-amber-950/80 dark:text-[#F4EE8E]/80">Всего операций: {transactions.length}</span>
          </div>
          <div className="bg-transparent liquid-glass-card rounded-2xl border border-amber-400/40 dark:border-amber-400/30 overflow-hidden shadow-none backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="bg-transparent text-amber-950 dark:text-[#F4EE8E] font-bold border-b border-amber-400/30 font-sans">
                    <th className="p-3 text-amber-950 dark:text-[#F4EE8E]">ID транзакции</th>
                    <th className="p-3 text-amber-950 dark:text-[#F4EE8E]">Дата операции</th>
                    <th className="p-3 text-amber-950 dark:text-[#F4EE8E]">Назначение платежа</th>
                    <th className="p-3 text-amber-950 dark:text-[#F4EE8E]">Тип</th>
                    <th className="p-3 text-right text-amber-950 dark:text-[#F4EE8E]">Сумма (RR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-400/20">
                  {transactions.length > 0 ? (
                    transactions.map((t) => {
                      const amountVal = Number(t.amount_rr ?? t.amount ?? 0);
                      const isPositive = amountVal >= 0;
                      return (
                        <tr key={t.id} className="border border-transparent hover:border-amber-400/80 transition-all">
                          <td className="p-3 font-semibold text-amber-950 dark:text-[#F4EE8E]">{t.id}</td>
                          <td className="p-3 text-amber-950 dark:text-[#F4EE8E]">{t.date}</td>
                          <td className="p-3 font-sans text-amber-950 dark:text-[#F4EE8E]">{t.description}</td>
                          <td className="p-3 font-sans">
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-transparent text-amber-950 dark:text-[#F4EE8E] border border-amber-400/40">
                              {isPositive ? 'Зачисление' : 'Списание'}
                            </span>
                          </td>
                          <td className="p-3 text-right font-bold text-sm text-amber-950 dark:text-[#F4EE8E]">
                            {isPositive ? `+${amountVal.toLocaleString('ru-RU')}` : amountVal.toLocaleString('ru-RU')} RR
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-amber-950 dark:text-[#F4EE8E] font-sans">Платежные транзакции отсутствуют.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION MODAL FOR PURCHASES */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl liquid-glass-modal border border-amber-400/50 shadow-[0_0_30px_rgba(244,238,142,0.2)] text-amber-950 dark:text-[#F4EE8E] space-y-4">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
              <h3 className="text-sm font-black text-amber-950 dark:text-[#F4EE8E] uppercase tracking-wider flex items-center gap-2">
                <CreditCard size={18} className="text-amber-500 dark:text-[#F4EE8E]" />
                <span>{modalConfig.title}</span>
              </h3>
              <button 
                onClick={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                className="text-amber-950/60 dark:text-amber-400/60 hover:text-amber-950 dark:hover:text-amber-200 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-amber-950/90 dark:text-[#F4EE8E]/90 leading-relaxed font-sans">
              {modalConfig.details}
            </p>

            {modalConfig.type === 'extra_limits' && (
              <div className="p-3 rounded-xl border border-amber-400/40 bg-amber-500/10 space-y-1.5 font-mono text-xs text-amber-950 dark:text-[#F4EE8E]">
                <div className="font-bold text-amber-950 dark:text-[#F4EE8E] pb-1 border-b border-amber-500/20">
                  Состав бессрочного пакета лимитов:
                </div>
                <div className="flex justify-between">
                  <span>Доп. Проекты (10 RR/шт):</span>
                  <span className="font-bold">+{modalConfig.payload?.extraProjects ?? buyExtraProjects} шт ({(Number(modalConfig.payload?.extraProjects ?? buyExtraProjects) * 10).toLocaleString('ru-RU')} RR)</span>
                </div>
                <div className="flex justify-between">
                  <span>Доп. Задачи (5 RR/шт):</span>
                  <span className="font-bold">+{modalConfig.payload?.extraTasks ?? buyExtraTasks} шт ({(Number(modalConfig.payload?.extraTasks ?? buyExtraTasks) * 5).toLocaleString('ru-RU')} RR)</span>
                </div>
                <div className="flex justify-between">
                  <span>Доп. Отчеты (5 RR/шт):</span>
                  <span className="font-bold">+{modalConfig.payload?.extraReports ?? buyExtraReports} шт ({(Number(modalConfig.payload?.extraReports ?? buyExtraReports) * 5).toLocaleString('ru-RU')} RR)</span>
                </div>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-transparent border border-amber-500/30 space-y-2 font-mono text-xs">
              <div className="flex justify-between text-amber-950/80 dark:text-[#F4EE8E]/80">
                <span>Текущий баланс:</span>
                <span className="font-bold text-amber-950 dark:text-[#F4EE8E]">{(currentUser?.payment_balance ?? tariff.balance).toLocaleString('ru-RU')} RR</span>
              </div>
              <div className="flex justify-between text-amber-950 dark:text-[#F4EE8E] font-bold">
                <span>К оплате:</span>
                <span className="text-amber-950 dark:text-[#F4EE8E]">{modalConfig.costRR.toLocaleString('ru-RU')} RR</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-amber-500/20 text-amber-950 dark:text-[#F4EE8E] font-bold">
                <span>Остаток баланса при списании со счета:</span>
                <span>{Math.max(0, (currentUser?.payment_balance ?? tariff.balance) - modalConfig.costRR).toLocaleString('ru-RU')} RR</span>
              </div>
            </div>

            {/* Recurring payment option for Tariffs */}
            {modalConfig.type === 'tariff' && (
              <div className="p-3 rounded-xl border border-amber-400/40 bg-amber-500/5 space-y-2 text-xs">
                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isRecurringAgreed}
                    onChange={(e) => setIsRecurringAgreed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500 accent-[#D4AF37] cursor-pointer"
                  />
                  <span className="text-amber-950 dark:text-[#F4EE8E] font-bold leading-tight">
                    Я согласен на автоматические списания согласно условиям оферты
                  </span>
                </label>
                <p className="text-[11px] text-amber-950/80 dark:text-[#F4EE8E]/80 pl-6 leading-relaxed">
                  Списание раз в месяц в 03:00 МСК. Отмена в 1 клик в личном кабинете. Только карты банков РФ.
                </p>
                <div className="pt-1 pl-6 flex flex-wrap gap-2 text-[10px] text-amber-900 dark:text-[#F4EE8E] font-medium">
                  <a href="/oferta?tab=oferta" target="_blank" rel="noreferrer" className="underline hover:text-amber-500">Публичная оферта</a>
                  <span>·</span>
                  <a href="/oferta?tab=privacy" target="_blank" rel="noreferrer" className="underline hover:text-amber-500">Конфиденциальность</a>
                  <span>·</span>
                  <a href="/oferta?tab=terms" target="_blank" rel="noreferrer" className="underline hover:text-amber-500">Соглашение</a>
                  <span>·</span>
                  <a href="/oferta?tab=personal-data" target="_blank" rel="noreferrer" className="underline hover:text-amber-500">Персональные данные</a>
                </div>
              </div>
            )}

            <div className="space-y-2 pt-2">
              {/* Option A: Pay with RR Balance */}
              <button
                type="button"
                onClick={handleConfirmPurchase}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 font-bold text-sm tracking-wide hover:brightness-110 transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
              >
                <CreditCard size={16} />
                <span>Оплатить с баланса ({modalConfig.costRR.toLocaleString('ru-RU')} RR)</span>
              </button>

              {/* Option B: Direct Pay via Robokassa Card */}
              {modalConfig.type === 'tariff' && (
                <button
                  type="button"
                  disabled={isRedirectingRobokassa}
                  onClick={() => {
                    handlePayViaRobokassa({
                      amount: modalConfig.costRR,
                      itemType: 'tariff',
                      productName: modalConfig.payload?.planName || 'Тариф ИИ Ревизор',
                      months: Number(modalConfig.payload?.selectedMonths || 1),
                      employeesCount: Number(modalConfig.payload?.selectedEmployees || 10)
                    });
                  }}
                  className="w-full py-3 rounded-xl border-2 border-amber-400/80 bg-amber-400/10 hover:bg-amber-400/20 text-amber-950 dark:text-[#F4EE8E] font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isRedirectingRobokassa ? (
                    <>
                      <Sparkles size={16} className="animate-spin text-amber-500" />
                      <span>Перенаправление в Робокассу...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard size={16} className="text-amber-500" />
                      <span>Оплатить {modalConfig.costRR.toLocaleString('ru-RU')} RR картой через Робокассу</span>
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                className="w-full py-2 rounded-xl text-xs font-bold text-amber-950/70 dark:text-[#F4EE8E]/70 hover:text-amber-950 dark:hover:text-[#F4EE8E] transition-all cursor-pointer"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM TRANSLUCENT NOTIFICATION MODAL */}
      {infoNotice?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-3xl bg-[#FFFBF5]/95 dark:bg-[#1A0F02]/95 border-2 border-amber-400/60 shadow-[0_0_35px_rgba(244,238,142,0.25)] text-amber-950 dark:text-[#F4EE8E] space-y-4">
            <div className="flex items-center justify-between border-b border-amber-500/30 pb-3">
              <h3 className="text-sm font-bold text-amber-950 dark:text-[#F4EE8E] flex items-center gap-2">
                <Sparkles size={18} className="text-amber-500 dark:text-[#F4EE8E]" />
                <span>{infoNotice.title}</span>
              </h3>
              <button
                type="button"
                onClick={() => setInfoNotice(null)}
                className="text-amber-950/70 dark:text-amber-300/70 hover:text-amber-950 dark:hover:text-amber-200 text-base font-bold cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-amber-950 dark:text-amber-100 leading-relaxed font-sans font-medium">
              {infoNotice.message}
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setInfoNotice(null)}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 font-bold text-sm tracking-wide hover:brightness-110 transition-all cursor-pointer shadow-md"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
