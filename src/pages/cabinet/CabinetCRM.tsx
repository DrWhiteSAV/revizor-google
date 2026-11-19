import React, { useState, useMemo } from 'react';
import { 
  Landmark, 
  Plus, 
  Building, 
  X, 
  Check, 
  Search, 
  Filter, 
  ArrowUpDown, 
  TableProperties, 
  BarChart3, 
  Package, 
  Trash2, 
  Edit3, 
  Settings2, 
  UserCheck, 
  ShieldAlert, 
  Coins, 
  Layers, 
  Sliders, 
  TrendingUp, 
  AlertCircle 
} from 'lucide-react';

interface CabinetCRMProps {
  crmCompanies?: any[];
  setCrmCompanies?: (val: any[]) => void;
  editingCrmCompany?: any | null;
  setEditingCrmCompany?: (val: any | null) => void;
  saveStateToServer?: (updated: any) => void;
  company?: any;
  departments?: any;
  templates?: any;
  reports?: any;
  transactions?: any;
  notifications?: any;
  tariff?: any;
  mockEmployees?: any;
  forcedSubTab?: 'board' | 'table' | 'products' | 'funnel';
  hideSubTabs?: boolean;
  onNavigateSubTab?: (tab: 'board' | 'table' | 'products' | 'funnel') => void;
}

interface Product {
  id: string;
  name: string;
  code: 'revisor' | 'raport';
  trialDays: number;
  freeProjectsLimit: number;
  pricePerUserMonth: number;
  minUsers: number;
  features: string[];
}

export default function CabinetCRM({
  crmCompanies: externalCompanies,
  setCrmCompanies: externalSetCompanies,
  editingCrmCompany: externalEditing,
  setEditingCrmCompany: externalSetEditing,
  saveStateToServer,
  company,
  departments,
  templates,
  reports,
  transactions,
  notifications,
  tariff,
  mockEmployees,
  forcedSubTab,
  hideSubTabs,
  onNavigateSubTab
}: CabinetCRMProps) {
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(() => {
    return !document.documentElement.classList.contains('theme-light');
  });

  React.useEffect(() => {
    const checkTheme = () => {
      setIsDarkTheme(!document.documentElement.classList.contains('theme-light'));
    };
    checkTheme();
    window.addEventListener('theme-changed', checkTheme);
    window.addEventListener('cabinet-theme-change', checkTheme);
    return () => {
      window.removeEventListener('theme-changed', checkTheme);
      window.removeEventListener('cabinet-theme-change', checkTheme);
    };
  }, []);

  const [internalCompanies, setInternalCompanies] = useState<any[]>([]);
  const [internalEditing, setInternalEditing] = useState<any | null>(null);

  const crmCompanies = externalCompanies && externalCompanies.length > 0 ? externalCompanies : internalCompanies;
  const setCrmCompanies = externalSetCompanies || setInternalCompanies;
  const editingCrmCompany = externalEditing !== undefined ? externalEditing : internalEditing;
  const setEditingCrmCompany = externalSetEditing || setInternalEditing;

  // Fetch real database-backed companies from PostgreSQL BD ProTalk on mount
  React.useEffect(() => {
    const loadRealCompanies = async () => {
      try {
        let localUser: any = null;
        try {
          const raw = typeof window !== 'undefined' ? localStorage.getItem('rr_user') : null;
          if (raw) localUser = JSON.parse(raw);
        } catch {}
        const uId = localUser?.id ? String(localUser.id) : '';
        const dirId = localUser?.director_id ? String(localUser.director_id) : uId;
        const compId = company?.id || localUser?.company_id || (dirId ? `com-${dirId}` : '');
        const role = localUser?.role ? String(localUser.role) : '';
        const params = new URLSearchParams();
        if (compId) params.set('company_id', compId);
        if (dirId) params.set('director_id', dirId);
        if (uId) params.set('user_id', uId);
        if (role) params.set('role', role);

        const res = await fetch(`/api/crm/companies?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.companies)) {
            setCrmCompanies(data.companies);
          }
        }
      } catch (err) {
        console.error('Ошибка загрузки компаний из PostgreSQL BD ProTalk:', err);
      }
    };
    loadRealCompanies();
  }, [company?.id]);

  // Focused cell edit modal for single cell editing
  const [crmCellEdit, setCrmCellEdit] = useState<{
    companyId: string;
    companyName: string;
    field: string;
    label: string;
    value: any;
    type: 'text' | 'number' | 'status';
  } | null>(null);

  // Custom styled deletion modal
  const [deleteConfirmCompany, setDeleteConfirmCompany] = useState<any | null>(null);
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState<Product | null>(null);

  // Navigation tabs within CRM
  const [activeSubTab, setActiveSubTab] = useState<'board' | 'table' | 'products' | 'funnel'>(forcedSubTab || 'board');

  React.useEffect(() => {
    if (forcedSubTab) {
      setActiveSubTab(forcedSubTab);
    }
  }, [forcedSubTab]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [balanceFilter, setBalanceFilter] = useState<string>('all'); // all, positive, zero
  const [sortBy, setSortBy] = useState<string>('name'); // name, balance, employees, departments
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Balance adjustment state for CRM company modal
  const [adjustCrmDelta, setAdjustCrmDelta] = useState<number>(0);
  const [adjustCrmComment, setAdjustCrmComment] = useState<string>('Корректировка администратором');

  // Interactive Product Catalog State (Admin can manage system products)
  const [products, setProducts] = useState<Product[]>([
    {
      id: 'prod-1',
      name: 'ИИ Ревизор (Проектный менеджер)',
      code: 'revisor',
      trialDays: 14,
      freeProjectsLimit: 10,
      pricePerUserMonth: 690,
      minUsers: 3,
      features: [
        'Интерактивные Канбан-доски с ИИ',
        'ИИ Конструктор проектов & задач по аудио',
        'Автопилот распределения по чек-листам',
        'Контроль дедлайнов с реалтайм оповещением',
        'Верификация качества работы нейросетью'
      ]
    },
    {
      id: 'prod-2',
      name: 'ИИ Рапорт (Периодическая отчетность)',
      code: 'raport',
      trialDays: 5,
      freeProjectsLimit: 0,
      pricePerUserMonth: 290,
      minUsers: 5,
      features: [
        'ИИ Конструктор регламентов отчетов',
        'Интеллектуальный календарь сдач',
        'AI-Сводки, тренды и Quality Scores',
        'Голосовой ввод с мгновенным суммаризатором',
        'Авто-уведомления и интеграция с Telegram'
      ]
    }
  ]);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Statistics for Funnel representation
  const funnelStats = useMemo(() => {
    const total = crmCompanies.length;
    const trial = crmCompanies.filter(c => c.status.toLowerCase().includes('триал')).length;
    const active = crmCompanies.filter(c => c.status.toLowerCase().includes('активен')).length;
    const archived = crmCompanies.filter(c => !c.status.toLowerCase().includes('триал') && !c.status.toLowerCase().includes('активен')).length;

    const conversionRate = total > 0 ? Math.round((active / total) * 100) : 0;
    const trialConversion = trial > 0 ? Math.round((active / (trial + active)) * 100) : 0;

    return {
      total,
      trial,
      active,
      archived,
      conversionRate,
      trialConversion
    };
  }, [crmCompanies]);

  // Filtering & Sorting Companies
  const filteredAndSortedCompanies = useMemo(() => {
    let result = [...crmCompanies];

    // 1. Search Query (FIO/Name, email, INN, address)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c => 
        (c.name && c.name.toLowerCase().includes(query)) ||
        (c.email && c.email.toLowerCase().includes(query)) ||
        (c.inn && c.inn.includes(query)) ||
        (c.address && c.address.toLowerCase().includes(query)) ||
        (c.id && c.id.toLowerCase().includes(query))
      );
    }

    // 2. Status Filter
    if (statusFilter !== 'all') {
      result = result.filter(c => {
        if (statusFilter === 'trial') return c.status.toLowerCase().includes('триал');
        if (statusFilter === 'active') return c.status.toLowerCase().includes('активен');
        if (statusFilter === 'archived') return !c.status.toLowerCase().includes('триал') && !c.status.toLowerCase().includes('активен');
        return true;
      });
    }

    // 3. Balance Filter
    if (balanceFilter !== 'all') {
      result = result.filter(c => {
        if (balanceFilter === 'positive') return (c.balance || 0) > 0;
        if (balanceFilter === 'zero') return (c.balance || 0) === 0;
        if (balanceFilter === 'debt') return (c.balance || 0) < 0;
        return true;
      });
    }

    // 4. Sort
    result.sort((a, b) => {
      let valA: any = a[sortBy];
      let valB: any = b[sortBy];

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [crmCompanies, searchQuery, statusFilter, balanceFilter, sortBy, sortOrder]);

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Handle cell edit save for CRM table
  const handleSaveCrmCell = async () => {
    if (!crmCellEdit) return;
    const { companyId, field, value, type } = crmCellEdit;
    let parsedValue = value;
    if (type === 'number') {
      parsedValue = Number(value) || 0;
    }
    const next = crmCompanies.map(c => c.id === companyId ? { ...c, [field]: parsedValue } : c);
    setCrmCompanies(next);

    try {
      await fetch(`/api/crm/companies/${encodeURIComponent(companyId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: parsedValue })
      });
    } catch (e) {
      console.warn('Ошибка сохранения ячейки компании:', e);
    }

    saveStateToServer?.({ company, departments, templates, reports, transactions, notifications, tariff, crmCompanies: next, mockEmployees });
    setCrmCellEdit(null);
  };

  // Handle delete company confirmation
  const handleConfirmDeleteCompany = async () => {
    if (!deleteConfirmCompany) return;
    const companyId = deleteConfirmCompany.id;
    const next = crmCompanies.filter(c => c.id !== companyId);
    setCrmCompanies(next);

    try {
      await fetch(`/api/crm/companies/${encodeURIComponent(companyId)}`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.warn('Ошибка удаления компании с сервера:', e);
    }

    saveStateToServer?.({ company, departments, templates, reports, transactions, notifications, tariff, crmCompanies: next, mockEmployees });
    setDeleteConfirmCompany(null);
  };

  // Handle delete product confirmation
  const handleConfirmDeleteProduct = () => {
    if (!deleteConfirmProduct) return;
    setProducts(products.filter(p => p.id !== deleteConfirmProduct.id));
    setDeleteConfirmProduct(null);
  };

  // Move company cleanly between Kanban stages
  const moveCompanyToStage = async (companyId: string, nextStatus: string, nextStage: string) => {
    const next = crmCompanies.map(c => c.id === companyId ? { ...c, status: nextStatus, stage: nextStage } : c);
    setCrmCompanies(next);

    try {
      await fetch(`/api/crm/companies/${encodeURIComponent(companyId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, stage: nextStage })
      });
    } catch (e) {
      console.warn('Ошибка изменения статуса в CRM:', e);
    }

    saveStateToServer?.({ company, departments, templates, reports, transactions, notifications, tariff, crmCompanies: next, mockEmployees });
  };

  // Helper to place companies into 4 canonical Kanban columns
  const getCompanyColumnKey = (comp: any) => {
    const s = ((comp.status || '') + ' ' + (comp.stage || '')).toLowerCase();
    if (s.includes('архив') || s.includes('отказ') || s.includes('завершен') || s.includes('lost') || s.includes('стоп')) {
      return 'archive';
    }
    if (s.includes('бизнес') || s.includes('клиент') || s.includes('оплачен') || s.includes('won') || s.includes('успех')) {
      return 'client';
    }
    if (s.includes('переговор') || s.includes('в работе') || s.includes('work') || s.includes('актив')) {
      return 'work';
    }
    return 'lead';
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans" id="panel-crm">
      
      {/* HEADER SECTION */}
      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-5 ${isDarkTheme ? 'border-white/10' : 'border-amber-900/20'}`}>
        <div>
          <h3 className={`text-xl font-black flex items-center gap-2 ${isDarkTheme ? 'text-white' : 'text-amber-950'}`}>
            <Landmark className={isDarkTheme ? "text-amber-200" : "text-amber-700"} size={22} />
            <span>Панель управления CRM & Лидогенерация</span>
          </h3>
          <p className={`text-sm mt-1 leading-relaxed ${isDarkTheme ? 'text-slate-400' : 'text-amber-900/70'}`}>
            Управление организациями, распределение по стадиям сделок, настройка тарифов и контроль балансов.
          </p>
        </div>
        
        <button
          type="button"
          onClick={() => {
            const newId = 'crm-c' + Date.now().toString().slice(-4);
            const newComp = {
              id: newId,
              name: 'Новый клиент (Организация)',
              departmentsCount: 1,
              employeesCount: 5,
              status: 'Триал (7 дней)',
              stage: 'Первичный контакт',
              referrals: 0,
              balance: 0,
              inn: '7700' + Math.floor(100000 + Math.random() * 900000),
              address: 'г. Москва',
              email: 'partner@rr-systems.ru'
            };
            const next = [...crmCompanies, newComp];
            setCrmCompanies(next);
            saveStateToServer?.({ company, departments, templates, reports, transactions, notifications, tariff, crmCompanies: next, mockEmployees });
            setEditingCrmCompany(newComp);
          }}
          className="px-4 py-2.5 bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] hover:from-[#f6f2aa] hover:to-[#e2b15b] text-amber-950 font-extrabold rounded-xl text-sm shadow-lg transition-all cursor-pointer flex items-center gap-2 self-stretch md:self-auto justify-center"
        >
          <Plus size={16} />
          Регистрация B2B-клиента
        </button>
      </div>

      {/* CRM SUB-NAVIGATION TABS */}
      {!hideSubTabs && (
        <div className={`flex flex-wrap gap-2 border-b pb-1 ${isDarkTheme ? 'border-white/5' : 'border-amber-900/15'}`}>
          {[
            { id: 'board', label: 'Канбан клиентов', icon: Layers },
            { id: 'table', label: 'Таблица & Редактор', icon: TableProperties },
            { id: 'funnel', label: 'Воронка продаж & Конверсия', icon: BarChart3 },
            { id: 'products', label: `Каталог ИИ-Продуктов (${products.length})`, icon: Package },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? isDarkTheme
                      ? 'bg-[#1A1A1A] text-[#F4EE8E] border border-[#E7C768]/30 shadow-md'
                      : 'bg-[#D4AF37] text-amber-950 font-black border border-amber-800/40 shadow-md'
                    : isDarkTheme
                      ? 'text-slate-300 hover:bg-white/5 hover:text-white'
                      : 'text-amber-950/70 hover:bg-amber-100/80 hover:text-amber-950'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* FILTER PANEL (FOR KANBAN AND TABLE VIEWS) */}
      {(activeSubTab === 'board' || activeSubTab === 'table') && (
        <div className={`p-4 rounded-2xl border grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 ${
          isDarkTheme ? 'border-white/5 bg-slate-900/40' : 'border-amber-900/20 bg-[#FFFBF5] shadow-sm'
        }`}>
          {/* Search bar */}
          <div className="relative">
            <Search className={`absolute left-3 top-3 ${isDarkTheme ? 'text-slate-400' : 'text-amber-800'}`} size={16} />
            <input
              type="text"
              placeholder="Поиск по ФИО, email, ИНН..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-3 py-2 rounded-xl text-sm focus:outline-none ${
                isDarkTheme 
                  ? 'bg-slate-950/40 border border-white/10 text-white focus:border-[#E7C768]'
                  : 'bg-white border border-amber-800/30 text-amber-950 focus:border-amber-600 font-medium'
              }`}
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2">
            <Filter size={15} className={isDarkTheme ? 'text-slate-400' : 'text-amber-800'} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`w-full rounded-xl px-3 py-2 text-sm focus:outline-none ${
                isDarkTheme 
                  ? 'bg-slate-950/40 border border-white/10 text-white focus:border-[#E7C768]'
                  : 'bg-white border border-amber-800/30 text-amber-950 focus:border-amber-600 font-medium'
              }`}
            >
              <option value="all">Все статусы подписки</option>
              <option value="trial">Только Триал (Пробный)</option>
              <option value="active">Только Активные (Бизнес)</option>
              <option value="archived">Архивные / Приостановленные</option>
            </select>
          </div>

          {/* Balance Filter */}
          <div className="flex items-center gap-2">
            <Coins size={15} className={isDarkTheme ? 'text-slate-400' : 'text-amber-800'} />
            <select
              value={balanceFilter}
              onChange={(e) => setBalanceFilter(e.target.value)}
              className={`w-full rounded-xl px-3 py-2 text-sm focus:outline-none ${
                isDarkTheme 
                  ? 'bg-slate-950/40 border border-white/10 text-white focus:border-[#E7C768]'
                  : 'bg-white border border-amber-800/30 text-amber-950 focus:border-amber-600 font-medium'
              }`}
            >
              <option value="all">Любой баланс счета</option>
              <option value="positive">Положительный баланс (&gt;0 ₽)</option>
              <option value="zero">Нулевой баланс (0 ₽)</option>
              <option value="debt">Задолженность (&lt;0 ₽)</option>
            </select>
          </div>

          {/* Sorter selection */}
          <div className="flex items-center gap-2">
            <ArrowUpDown size={15} className={isDarkTheme ? 'text-slate-400' : 'text-amber-800'} />
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(order as 'asc' | 'desc');
              }}
              className={`w-full rounded-xl px-3 py-2 text-sm focus:outline-none ${
                isDarkTheme 
                  ? 'bg-slate-950/40 border border-white/10 text-white focus:border-[#E7C768]'
                  : 'bg-white border border-amber-800/30 text-amber-950 focus:border-amber-600 font-medium'
              }`}
            >
              <option value="name-asc">Название (А-Я)</option>
              <option value="name-desc">Название (Я-А)</option>
              <option value="balance-desc">Сначала богатые (Баланс ↓)</option>
              <option value="balance-asc">Сначала бедные (Баланс ↑)</option>
              <option value="employeesCount-desc">Сотрудников (Много ↓)</option>
              <option value="departmentsCount-desc">Отделов (Много ↓)</option>
            </select>
          </div>
        </div>
      )}

      {/* SUB-TAB 1: KANBAN BOARD */}
      {activeSubTab === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" id="crm-kanban-board">
          {[
            { id: 'lead', title: 'Лиды & Первичный контакт', dot: 'bg-amber-400', nextStage: 'В работе', nextStatus: 'В работе', nextLabel: 'В работу →' },
            { id: 'work', title: 'В работе & Переговоры', dot: 'bg-amber-500', nextStage: 'Сделка закрыта', nextStatus: 'Активен (Бизнес)', nextLabel: 'В клиенты →' },
            { id: 'client', title: 'Клиенты & Оплачено', dot: 'bg-amber-300', nextStage: 'Архив', nextStatus: 'В архиве', nextLabel: 'В архив →' },
            { id: 'archive', title: 'Архив & Завершено', dot: 'bg-stone-500', nextStage: 'Первичный контакт', nextStatus: 'Триал (7 дней)', nextLabel: 'В лиды →' }
          ].map(column => {
            const columnCompanies = filteredAndSortedCompanies.filter(c => getCompanyColumnKey(c) === column.id);
            return (
              <div 
                key={column.id}
                className={`flex flex-col rounded-3xl p-4 space-y-4 shadow-xl border ${
                  isDarkTheme 
                    ? 'bg-transparent border-amber-400/30' 
                    : 'bg-amber-50/20 border-amber-900/20'
                }`}
              >
                <div className={`flex justify-between items-center border-b pb-2 ${isDarkTheme ? 'border-amber-400/20' : 'border-amber-900/20'}`}>
                  <span className={`text-sm font-bold flex items-center gap-2 ${
                    isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'
                  }`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${column.dot}`}></span>
                    {column.title}
                  </span>
                  <span className={`text-sm font-mono px-2.5 py-0.5 rounded-full border ${
                    isDarkTheme ? 'bg-amber-400/10 text-amber-200 border-amber-400/30' : 'bg-amber-100 text-amber-950 border-amber-800/30 font-bold'
                  }`}>
                    {columnCompanies.length}
                  </span>
                </div>

                <div className="space-y-3 overflow-y-auto max-h-[600px] pr-1">
                  {columnCompanies.map(comp => (
                    <div 
                      key={comp.id}
                      onClick={() => setEditingCrmCompany({ ...comp })}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-3 group relative shadow-md ${
                        isDarkTheme
                          ? 'border-amber-400/30 bg-transparent hover:border-amber-300 hover:shadow-[0_0_20px_rgba(244,238,142,0.15)]'
                          : 'border-amber-900/20 bg-amber-50/30 hover:border-amber-700 hover:bg-amber-100/40'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className={`font-bold text-sm transition-colors truncate ${
                            isDarkTheme ? 'text-white group-hover:text-amber-200' : 'text-amber-950 group-hover:text-amber-800'
                          }`}>
                            {comp.name}
                          </h4>
                          <span className={`text-sm font-mono ${isDarkTheme ? 'text-amber-200/70' : 'text-amber-900/70'}`}>
                            ID: #{comp.id}
                          </span>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            moveCompanyToStage(comp.id, column.nextStatus, column.nextStage);
                          }}
                          title={`Перевести в статус "${column.nextStage}"`}
                          className="text-sm text-amber-900 dark:text-amber-200 bg-amber-400/20 hover:bg-amber-400/30 px-2.5 py-1 rounded-xl transition-all font-bold border border-amber-400/40 shrink-0"
                        >
                          {column.nextLabel}
                        </button>
                      </div>

                      <div className={`text-sm font-mono space-y-1 ${isDarkTheme ? 'text-slate-300' : 'text-amber-950'}`}>
                        <div className="truncate">ИНН: {comp.inn || 'Не указан'}</div>
                        <div className="truncate text-amber-200/80">{comp.email || 'Email не указан'}</div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                        <div className={`p-2 rounded-xl border ${
                          isDarkTheme ? 'border-amber-400/20 text-slate-200' : 'border-amber-800/20 text-amber-950'
                        }`}>
                          <span className={`block text-sm ${isDarkTheme ? 'text-amber-200/60' : 'text-amber-900/70'}`}>Отделы</span>
                          <strong className="text-sm">{comp.departmentsCount || 0}</strong>
                        </div>
                        <div className={`p-2 rounded-xl border ${
                          isDarkTheme ? 'border-amber-400/20 text-slate-200' : 'border-amber-800/20 text-amber-950'
                        }`}>
                          <span className={`block text-sm ${isDarkTheme ? 'text-amber-200/60' : 'text-amber-900/70'}`}>Сотрудники</span>
                          <strong className="text-sm">{comp.employeesCount || 0}</strong>
                        </div>
                      </div>

                      <div className={`flex justify-between items-center text-sm border-t pt-2 ${isDarkTheme ? 'border-amber-400/20' : 'border-amber-900/15'}`}>
                        <span className="text-amber-900 dark:text-amber-200 bg-amber-400/10 px-2.5 py-0.5 rounded-lg text-sm font-bold border border-amber-400/30">
                          {comp.status || 'Триал'}
                        </span>
                        <span className="text-amber-300 dark:text-[#F4EE8E] font-bold font-mono text-sm">
                          {comp.balance || 0} ₽
                        </span>
                      </div>
                    </div>
                  ))}

                  {columnCompanies.length === 0 && (
                    <p className={`text-center text-sm py-8 font-mono ${isDarkTheme ? 'text-slate-400' : 'text-amber-900/60'}`}>
                      Нет клиентов в этом статусе
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SUB-TAB 2: DETAILED DATA TABLE */}
      {activeSubTab === 'table' && (
        <div className={`border rounded-3xl overflow-hidden shadow-2xl ${
          isDarkTheme ? 'border-amber-400/30 bg-transparent' : 'border-amber-900/20 bg-transparent'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className={`border-b text-sm font-bold ${
                  isDarkTheme ? 'border-amber-400/30 text-amber-200' : 'border-amber-900/20 text-amber-950 bg-amber-50/40'
                }`}>
                  <th className="p-4 cursor-pointer hover:bg-white/5" onClick={() => toggleSort('name')}>
                    Организация {sortBy === 'name' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="p-4">Реквизиты и контакты</th>
                  <th className="p-4 text-center cursor-pointer hover:bg-white/5" onClick={() => toggleSort('departmentsCount')}>
                    Отделов {sortBy === 'departmentsCount' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="p-4 text-center cursor-pointer hover:bg-white/5" onClick={() => toggleSort('employeesCount')}>
                    Сотрудников {sortBy === 'employeesCount' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="p-4 text-right cursor-pointer hover:bg-white/5" onClick={() => toggleSort('balance')}>
                    Баланс счета {sortBy === 'balance' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="p-4">Статус подписки</th>
                  <th className="p-4 text-center">Действия</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkTheme ? 'divide-amber-400/15' : 'divide-amber-900/10'}`}>
                {filteredAndSortedCompanies.map((comp) => (
                  <tr 
                    key={comp.id} 
                    className={`transition-colors group ${
                      isDarkTheme ? 'hover:bg-white/5' : 'hover:bg-amber-50/60'
                    }`}
                  >
                    {/* Organization Cell */}
                    <td 
                      onClick={() => setCrmCellEdit({
                        companyId: comp.id,
                        companyName: comp.name,
                        field: 'name',
                        label: 'Название организации',
                        value: comp.name,
                        type: 'text'
                      })}
                      className={`p-4 font-bold max-w-[220px] cursor-pointer hover:underline ${isDarkTheme ? 'text-white' : 'text-amber-950'}`}
                      title="Кликните для редактирования названия"
                    >
                      <div className="truncate text-sm">{comp.name}</div>
                      <div className={`text-sm font-mono mt-0.5 ${isDarkTheme ? 'text-amber-200/60' : 'text-amber-900/60'}`}>ID: #{comp.id}</div>
                    </td>

                    {/* INN & Email Cell */}
                    <td 
                      onClick={() => setCrmCellEdit({
                        companyId: comp.id,
                        companyName: comp.name,
                        field: 'inn',
                        label: 'ИНН организации',
                        value: comp.inn || '',
                        type: 'text'
                      })}
                      className="p-4 cursor-pointer hover:underline"
                      title="Кликните для редактирования ИНН"
                    >
                      <div className={`font-mono text-sm ${isDarkTheme ? 'text-slate-200' : 'text-amber-950'}`}>ИНН: {comp.inn || 'Не указан'}</div>
                      <div className={`text-sm font-mono truncate max-w-[190px] ${isDarkTheme ? 'text-amber-200/70' : 'text-amber-900/70'}`}>{comp.email || 'Email не указан'}</div>
                    </td>

                    {/* Departments Count Cell */}
                    <td 
                      onClick={() => setCrmCellEdit({
                        companyId: comp.id,
                        companyName: comp.name,
                        field: 'departmentsCount',
                        label: 'Лимит отделов',
                        value: comp.departmentsCount || 0,
                        type: 'number'
                      })}
                      className={`p-4 text-center font-bold font-mono text-sm cursor-pointer hover:underline ${isDarkTheme ? 'text-slate-200' : 'text-amber-950'}`}
                      title="Кликните для редактирования отделов"
                    >
                      {comp.departmentsCount || 0}
                    </td>

                    {/* Employees Count Cell */}
                    <td 
                      onClick={() => setCrmCellEdit({
                        companyId: comp.id,
                        companyName: comp.name,
                        field: 'employeesCount',
                        label: 'Лимит сотрудников',
                        value: comp.employeesCount || 0,
                        type: 'number'
                      })}
                      className={`p-4 text-center font-bold font-mono text-sm cursor-pointer hover:underline ${isDarkTheme ? 'text-slate-200' : 'text-amber-950'}`}
                      title="Кликните для редактирования сотрудников"
                    >
                      {comp.employeesCount || 0}
                    </td>

                    {/* Balance Cell */}
                    <td 
                      onClick={() => setCrmCellEdit({
                        companyId: comp.id,
                        companyName: comp.name,
                        field: 'balance',
                        label: 'Баланс счета (₽)',
                        value: comp.balance || 0,
                        type: 'number'
                      })}
                      className={`p-4 text-right font-mono font-bold text-sm cursor-pointer hover:underline ${isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-900'}`}
                      title="Кликните для корректировки баланса"
                    >
                      {comp.balance || 0} ₽
                    </td>

                    {/* Status Cell */}
                    <td 
                      onClick={() => setCrmCellEdit({
                        companyId: comp.id,
                        companyName: comp.name,
                        field: 'status',
                        label: 'Статус подписки',
                        value: comp.status || 'Триал (7 дней)',
                        type: 'status'
                      })}
                      className="p-4 cursor-pointer"
                      title="Кликните для изменения статуса"
                    >
                      <span className="px-3 py-1 rounded-full text-sm font-bold border bg-amber-400/10 text-amber-900 dark:text-amber-200 border-amber-400/30">
                        {comp.status || 'Триал (7 дней)'}
                      </span>
                    </td>

                    {/* Actions Column */}
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => setEditingCrmCompany({ ...comp })}
                          className={`p-2 rounded-xl transition-all border ${
                            isDarkTheme 
                              ? 'border-amber-400/30 text-amber-200 hover:text-white hover:bg-amber-400/20' 
                              : 'border-amber-800/30 text-amber-950 hover:bg-amber-100'
                          }`}
                          title="Полная карточка организации"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmCompany(comp)}
                          className="p-2 bg-red-500/15 hover:bg-red-500/30 text-red-400 rounded-xl transition-all border border-red-500/30 cursor-pointer"
                          title="Удалить организацию"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredAndSortedCompanies.length === 0 && (
                  <tr>
                    <td colSpan={7} className={`p-8 text-center font-mono text-sm ${isDarkTheme ? 'text-slate-400' : 'text-amber-900/60'}`}>
                      Компании по заданным критериям не найдены
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: SALES FUNNEL & CONVERSION METRICS */}
      {activeSubTab === 'funnel' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className={`p-4 rounded-3xl border space-y-1 ${isDarkTheme ? 'bg-black/30 border-amber-400/20' : 'bg-amber-50/40 border-amber-900/20'}`}>
              <span className={`text-sm font-bold ${isDarkTheme ? 'text-slate-400' : 'text-amber-950/70'}`}>Всего регистраций</span>
              <div className={`text-2xl font-black ${isDarkTheme ? 'text-white' : 'text-amber-950'}`}>{funnelStats.total}</div>
              <p className={`text-sm ${isDarkTheme ? 'text-slate-400' : 'text-amber-900/60'}`}>Зарегистрировано компаний в БД</p>
            </div>
            <div className={`p-4 rounded-3xl border space-y-1 ${isDarkTheme ? 'bg-black/30 border-amber-400/20' : 'bg-amber-50/40 border-amber-900/20'}`}>
              <span className="text-sm text-amber-400 font-bold">В триале</span>
              <div className="text-2xl font-black text-amber-300">{funnelStats.trial}</div>
              <p className={`text-sm ${isDarkTheme ? 'text-slate-400' : 'text-amber-900/60'}`}>Пользуются пробным периодом</p>
            </div>
            <div className={`p-4 rounded-3xl border space-y-1 ${isDarkTheme ? 'bg-black/30 border-amber-400/20' : 'bg-amber-50/40 border-amber-900/20'}`}>
              <span className="text-sm text-[#F4EE8E] font-bold">Активный бизнес</span>
              <div className="text-2xl font-black text-[#F4EE8E]">{funnelStats.active}</div>
              <p className={`text-sm ${isDarkTheme ? 'text-slate-400' : 'text-amber-900/60'}`}>Приносят постоянный доход</p>
            </div>
            <div className={`p-4 rounded-3xl border space-y-1 ${isDarkTheme ? 'bg-black/30 border-amber-400/20' : 'bg-amber-50/40 border-amber-900/20'}`}>
              <span className="text-sm text-amber-300 font-bold">Общая конверсия</span>
              <div className="text-2xl font-black text-amber-300">{funnelStats.conversionRate}%</div>
              <p className={`text-sm ${isDarkTheme ? 'text-slate-400' : 'text-amber-900/60'}`}>Из лидов в платящих клиентов</p>
            </div>
          </div>

          {/* VISUAL REPRESENTATION OF SALES FUNNEL */}
          <div className={`p-6 rounded-3xl border space-y-6 ${isDarkTheme ? 'border-amber-400/20 bg-black/20' : 'border-amber-900/20 bg-amber-50/20'}`}>
            <div>
              <h4 className={`text-base font-bold flex items-center gap-2 ${isDarkTheme ? 'text-white' : 'text-amber-950'}`}>
                <TrendingUp size={18} className="text-[#E7C768]" />
                <span>Воронка продаж B2B-продуктов</span>
              </h4>
              <p className={`text-sm mt-1 ${isDarkTheme ? 'text-slate-300' : 'text-amber-900/70'}`}>Относительные объемы конверсии клиентов по статусам коммерческого цикла.</p>
            </div>

            <div className="space-y-4 max-w-2xl mx-auto">
              
              {/* STAGE 1: REGISTRATIONS */}
              <div className="space-y-1">
                <div className="flex justify-between items-end text-sm">
                  <span className={`font-bold flex items-center gap-1.5 ${isDarkTheme ? 'text-slate-200' : 'text-amber-950'}`}>
                    <span className="w-5 h-5 bg-stone-700 rounded-full text-sm font-mono flex items-center justify-center text-white">1</span>
                    Зарегистрировались в системе (Лиды)
                  </span>
                  <span className="font-mono text-sm opacity-80">{funnelStats.total} комп. (100%)</span>
                </div>
                <div className="h-6 w-full bg-black/40 rounded-full overflow-hidden border border-amber-400/20">
                  <div className="h-full bg-gradient-to-r from-stone-600 to-stone-400 rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>

              {/* STAGE 2: TRIALS */}
              <div className="space-y-1">
                <div className="flex justify-between items-end text-sm">
                  <span className="font-bold text-amber-400 flex items-center gap-1.5">
                    <span className="w-5 h-5 bg-amber-500/20 rounded-full text-sm font-mono flex items-center justify-center text-amber-300">2</span>
                    Пользуются демо/триалом
                  </span>
                  <span className="font-mono text-sm text-amber-300">
                    {funnelStats.trial + funnelStats.active} комп. ({funnelStats.total > 0 ? Math.round(((funnelStats.trial + funnelStats.active) / funnelStats.total) * 100) : 0}%)
                  </span>
                </div>
                <div className="h-6 w-full bg-black/40 rounded-full overflow-hidden border border-amber-400/20">
                  <div 
                    className="h-full bg-gradient-to-r from-[#D99E41] to-[#E7C768] rounded-full" 
                    style={{ width: `${funnelStats.total > 0 ? Math.round(((funnelStats.trial + funnelStats.active) / funnelStats.total) * 100) : 0}%` }}
                  ></div>
                </div>
              </div>

              {/* STAGE 3: PREMIUM BUSINESS */}
              <div className="space-y-1">
                <div className="flex justify-between items-end text-sm">
                  <span className="font-bold text-[#F4EE8E] flex items-center gap-1.5">
                    <span className="w-5 h-5 bg-amber-500/20 rounded-full text-sm font-mono flex items-center justify-center text-amber-300">3</span>
                    Оплатили подписку (Бизнес)
                  </span>
                  <span className="font-mono text-sm text-[#F4EE8E]">{funnelStats.active} комп. ({funnelStats.conversionRate}%)</span>
                </div>
                <div className="h-6 w-full bg-black/40 rounded-full overflow-hidden border border-amber-400/20">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-600 via-[#D4AF37] to-[#F4EE8E] rounded-full" 
                    style={{ width: `${funnelStats.conversionRate}%` }}
                  ></div>
                </div>
              </div>

            </div>

            <div className={`p-4 rounded-2xl border text-sm leading-relaxed flex items-start gap-2 max-w-2xl mx-auto ${
              isDarkTheme ? 'bg-amber-950/20 border-amber-400/20 text-amber-200/90' : 'bg-amber-50/50 border-amber-900/20 text-amber-950'
            }`}>
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-400" />
              <span>
                <strong>Административная заметка:</strong> Относительная конверсия триал-аккаунтов в платящих B2B клиентов составляет <strong>{funnelStats.trialConversion}%</strong>. Сделать основной упор на ИИ-продукт "ИИ Ревизор" (с лимитом 10 бесплатных проектов в триале) позволило увеличить конверсию в закрытие сделки на 18.4% по сравнению со старой схемой.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: INTERACTIVE PRODUCT CATALOG */}
      {activeSubTab === 'products' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h4 className={`text-base font-bold flex items-center gap-2 ${isDarkTheme ? 'text-white' : 'text-amber-950'}`}>
                <Layers size={18} className="text-[#E7C768]" />
                <span>Каталог ИИ-продуктов и параметры триала</span>
              </h4>
              <p className={`text-sm mt-1 ${isDarkTheme ? 'text-slate-300' : 'text-amber-900/70'}`}>Тонкая калибровка бесплатных лимитов, цен за пользователя в месяц и параметров триала для каждого ИИ продукта.</p>
            </div>
            
            <button
              onClick={() => {
                const newProd: Product = {
                  id: 'prod-' + Date.now(),
                  name: 'Новый интеллектуальный сервис',
                  code: 'raport',
                  trialDays: 7,
                  freeProjectsLimit: 5,
                  pricePerUserMonth: 490,
                  minUsers: 2,
                  features: ['Дополнительные ИИ-фичи']
                };
                setProducts([...products, newProd]);
                setEditingProduct(newProd);
              }}
              className="px-4 py-2 bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-amber-950 text-sm font-bold rounded-xl transition-all flex items-center gap-1.5 border border-amber-400/40 cursor-pointer shadow-md active:scale-95"
            >
              <Plus size={16} />
              Добавить продукт
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {products.map(prod => (
              <div 
                key={prod.id}
                className={`p-5 rounded-3xl border space-y-4 transition-all flex flex-col justify-between ${
                  isDarkTheme 
                    ? 'border-amber-400/30 bg-black/20 hover:border-amber-300' 
                    : 'border-amber-900/20 bg-amber-50/20 hover:border-amber-700'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-sm font-mono text-amber-400/90 bg-amber-400/10 px-2.5 py-0.5 rounded-lg border border-amber-400/20">
                        Код: {prod.code.toLowerCase()}
                      </span>
                      <h5 className={`font-extrabold text-base mt-1.5 ${isDarkTheme ? 'text-white' : 'text-amber-950'}`}>{prod.name}</h5>
                    </div>
                    <button
                      onClick={() => setEditingProduct({ ...prod })}
                      className={`p-2 rounded-xl transition-colors cursor-pointer ${
                        isDarkTheme ? 'bg-white/5 hover:bg-white/10 text-amber-200' : 'bg-amber-100 hover:bg-amber-200 text-amber-950'
                      }`}
                    >
                      <Settings2 size={16} />
                    </button>
                  </div>

                  {/* Product stats details */}
                  <div className={`grid grid-cols-2 gap-3 text-sm p-3.5 rounded-2xl font-mono border ${
                    isDarkTheme ? 'bg-black/40 border-amber-400/20 text-slate-200' : 'bg-amber-50/50 border-amber-900/20 text-amber-950'
                  }`}>
                    <div>
                      <span className={`text-sm block ${isDarkTheme ? 'text-slate-400' : 'text-amber-900/70'}`}>Триал период</span>
                      <strong className="text-amber-300">{prod.trialDays} дней</strong>
                    </div>
                    <div>
                      <span className={`text-sm block ${isDarkTheme ? 'text-slate-400' : 'text-amber-900/70'}`}>Проектов в триале</span>
                      <strong className="text-amber-300">{prod.freeProjectsLimit || 'Без ограничений'}</strong>
                    </div>
                    <div>
                      <span className={`text-sm block ${isDarkTheme ? 'text-slate-400' : 'text-amber-900/70'}`}>Цена за юзера</span>
                      <strong className="text-[#F4EE8E]">{prod.pricePerUserMonth} ₽ / мес</strong>
                    </div>
                    <div>
                      <span className={`text-sm block ${isDarkTheme ? 'text-slate-400' : 'text-amber-900/70'}`}>Мин. пользователей</span>
                      <strong className={isDarkTheme ? 'text-slate-200' : 'text-amber-950'}>{prod.minUsers} чел.</strong>
                    </div>
                  </div>

                  {/* Feature list */}
                  <div className="space-y-1.5">
                    <span className={`text-sm font-bold block ${isDarkTheme ? 'text-slate-300' : 'text-amber-950'}`}>Функциональный состав:</span>
                    <ul className={`text-sm space-y-1.5 pl-1 ${isDarkTheme ? 'text-slate-300' : 'text-amber-950'}`}>
                      {prod.features.map((feat, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#E7C768]"></span>
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className={`border-t pt-3.5 flex justify-between items-center gap-2 ${isDarkTheme ? 'border-amber-400/20' : 'border-amber-900/20'}`}>
                  <button
                    onClick={() => setEditingProduct({ ...prod })}
                    className="px-3.5 py-2 bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md hover:brightness-110 active:scale-95"
                  >
                    <Settings2 size={16} />
                    <span>Редактировать продукт</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-mono ${isDarkTheme ? 'text-slate-400' : 'text-amber-900/60'}`}>ID: {prod.id}</span>
                    <button
                      onClick={() => setDeleteConfirmProduct(prod)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer border border-red-500/30"
                      title="Удалить продукт"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CRM ADVANCED DETAILED COMPANY EDITOR MODAL */}
      {editingCrmCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-transparent pointer-events-auto backdrop-blur-xs" id="crm-company-modal">
          <div className={`relative w-full max-w-xl border-2 rounded-3xl p-5 sm:p-7 shadow-2xl overflow-y-auto max-h-[85vh] space-y-4 ${
            isDarkTheme 
              ? 'bg-[#1A0F02]/90 border-amber-400/60 text-white shadow-[0_0_30px_rgba(244,238,142,0.25)]' 
              : 'bg-[#FFFBF5]/95 border-amber-900/40 text-amber-950 shadow-xl'
          }`}>
            
            <div className={`flex justify-between items-start border-b pb-3 relative z-10 ${isDarkTheme ? 'border-amber-400/30' : 'border-amber-900/20'}`}>
              <div className="flex items-center gap-2.5">
                <Building className="text-[#E7C768]" size={22} />
                <div>
                  <h4 className={`text-base font-bold font-mono ${isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                    Карточка организации: {editingCrmCompany.name}
                  </h4>
                  <span className={`text-sm font-mono ${isDarkTheme ? 'text-amber-200/80' : 'text-amber-900/70'}`}>
                    Системный идентификатор: #{editingCrmCompany.id}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setEditingCrmCompany(null)}
                className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                  isDarkTheme ? 'hover:bg-amber-400/15 text-amber-200' : 'hover:bg-amber-200/50 text-amber-950'
                }`}
              >
                <X size={20} />
              </button>
            </div>

            {/* Editor Form fields */}
            <div className="space-y-4 text-sm relative z-10">
              
              {/* Name */}
              <div>
                <label className={`block text-sm font-bold font-mono mb-1 ${isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                  Название организации *
                </label>
                <input 
                  type="text"
                  required
                  value={editingCrmCompany.name}
                  onChange={(e) => setEditingCrmCompany({ ...editingCrmCompany, name: e.target.value })}
                  className={`w-full px-3.5 py-2 rounded-xl border text-sm focus:outline-none transition-all ${
                    isDarkTheme 
                      ? 'bg-black/40 border-amber-400/50 text-white focus:border-[#F4EE8E]' 
                      : 'bg-white border-amber-900/30 text-amber-950 focus:border-amber-700'
                  }`}
                />
              </div>

              {/* INN & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-bold font-mono mb-1 ${isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                    ИНН налогоплательщика
                  </label>
                  <input 
                    type="text"
                    value={editingCrmCompany.inn || ''}
                    onChange={(e) => setEditingCrmCompany({ ...editingCrmCompany, inn: e.target.value })}
                    className={`w-full px-3.5 py-2 rounded-xl border text-sm font-mono focus:outline-none transition-all ${
                      isDarkTheme 
                        ? 'bg-black/40 border-amber-400/50 text-white focus:border-[#F4EE8E]' 
                        : 'bg-white border-amber-900/30 text-amber-950 focus:border-amber-700'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-bold font-mono mb-1 ${isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                    Адрес электронной почты (B2B)
                  </label>
                  <input 
                    type="email"
                    value={editingCrmCompany.email || ''}
                    onChange={(e) => setEditingCrmCompany({ ...editingCrmCompany, email: e.target.value })}
                    className={`w-full px-3.5 py-2 rounded-xl border text-sm font-mono focus:outline-none transition-all ${
                      isDarkTheme 
                        ? 'bg-black/40 border-amber-400/50 text-white focus:border-[#F4EE8E]' 
                        : 'bg-white border-amber-900/30 text-amber-950 focus:border-amber-700'
                    }`}
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className={`block text-sm font-bold font-mono mb-1 ${isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                  Фактический юридический адрес
                </label>
                <input 
                  type="text"
                  value={editingCrmCompany.address || ''}
                  onChange={(e) => setEditingCrmCompany({ ...editingCrmCompany, address: e.target.value })}
                  className={`w-full px-3.5 py-2 rounded-xl border text-sm focus:outline-none transition-all ${
                    isDarkTheme 
                      ? 'bg-black/40 border-amber-400/50 text-white focus:border-[#F4EE8E]' 
                      : 'bg-white border-amber-900/30 text-amber-950 focus:border-amber-700'
                  }`}
                />
              </div>

              {/* Department counts and Employee counts */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={`block text-sm font-bold font-mono mb-1 ${isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                    Лимит отделов
                  </label>
                  <input 
                    type="number"
                    value={editingCrmCompany.departmentsCount ?? 0}
                    onChange={(e) => setEditingCrmCompany({ ...editingCrmCompany, departmentsCount: parseInt(e.target.value) || 0 })}
                    className={`w-full px-3.5 py-2 rounded-xl border text-sm font-mono focus:outline-none transition-all ${
                      isDarkTheme 
                        ? 'bg-black/40 border-amber-400/50 text-white focus:border-[#F4EE8E]' 
                        : 'bg-white border-amber-900/30 text-amber-950 focus:border-amber-700'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-bold font-mono mb-1 ${isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                    Лимит сотрудников
                  </label>
                  <input 
                    type="number"
                    value={editingCrmCompany.employeesCount ?? 0}
                    onChange={(e) => setEditingCrmCompany({ ...editingCrmCompany, employeesCount: parseInt(e.target.value) || 0 })}
                    className={`w-full px-3.5 py-2 rounded-xl border text-sm font-mono focus:outline-none transition-all ${
                      isDarkTheme 
                        ? 'bg-black/40 border-amber-400/50 text-white focus:border-[#F4EE8E]' 
                        : 'bg-white border-amber-900/30 text-amber-950 focus:border-amber-700'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-bold font-mono mb-1 ${isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                    Рефералов привлечено
                  </label>
                  <input 
                    type="number"
                    value={editingCrmCompany.referrals ?? 0}
                    onChange={(e) => setEditingCrmCompany({ ...editingCrmCompany, referrals: parseInt(e.target.value) || 0 })}
                    className={`w-full px-3.5 py-2 rounded-xl border text-sm font-mono focus:outline-none transition-all ${
                      isDarkTheme 
                        ? 'bg-black/40 border-amber-400/50 text-white focus:border-[#F4EE8E]' 
                        : 'bg-white border-amber-900/30 text-amber-950 focus:border-amber-700'
                    }`}
                  />
                </div>
              </div>

              {/* Status and Balance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-bold font-mono mb-1 ${isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                    Тарифный статус подписки *
                  </label>
                  <select
                    value={editingCrmCompany.status}
                    onChange={(e) => setEditingCrmCompany({ ...editingCrmCompany, status: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-sm font-medium focus:outline-none h-10 ${
                      isDarkTheme
                        ? 'bg-[#140A01] border-amber-400/50 text-white focus:border-[#F4EE8E]'
                        : 'bg-white border-amber-900/30 text-amber-950 focus:border-amber-700'
                    }`}
                  >
                    <option value="Активен (Бизнес)">Активен (Бизнес)</option>
                    <option value="Триал (7 дней)">Триал (7 дней)</option>
                    <option value="Триал (5 дней)">Триал (5 дней)</option>
                    <option value="В работе">В работе</option>
                    <option value="Завершен">Завершен / Приостановлен</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-bold font-mono mb-1 ${isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                    Баланс лицевого счета (₽)
                  </label>
                  <input 
                    type="number"
                    step="any"
                    value={editingCrmCompany.balance ?? 0}
                    onChange={(e) => setEditingCrmCompany({ ...editingCrmCompany, balance: parseFloat(e.target.value) || 0 })}
                    className={`w-full px-3.5 py-2 rounded-xl border text-sm font-mono font-bold focus:outline-none h-10 ${
                      isDarkTheme 
                        ? 'bg-black/40 border-amber-400/50 text-[#F4EE8E] focus:border-[#F4EE8E]' 
                        : 'bg-white border-amber-900/30 text-amber-950 focus:border-amber-700'
                    }`}
                  />
                  <span className={`text-sm font-mono mt-1 block ${isDarkTheme ? 'text-amber-300/80' : 'text-amber-900/70'}`}>
                    Прямая корректировка суммы баланса организации
                  </span>
                </div>
              </div>

              {/* Description field */}
              <div>
                <label className={`block text-sm font-bold font-mono mb-1 ${isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                  Описание и примечания к компании
                </label>
                <textarea 
                  rows={3}
                  value={editingCrmCompany.description || ''}
                  onChange={(e) => setEditingCrmCompany({ ...editingCrmCompany, description: e.target.value })}
                  placeholder="Введите описание организации, заметки о клиенте, специфику договоренностей или реквизиты..."
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none transition-all resize-none ${
                    isDarkTheme
                      ? 'bg-black/40 border-amber-400/50 text-white placeholder-slate-400 focus:border-[#F4EE8E]'
                      : 'bg-white border-amber-900/30 text-amber-950 placeholder-amber-900/40 focus:border-amber-700'
                  }`}
                />
              </div>

              {/* CRM Balance Adjustment Calculator Block */}
              <div className={`p-3.5 rounded-2xl border space-y-2.5 ${
                isDarkTheme ? 'bg-black/30 border-amber-400/40' : 'bg-amber-50/50 border-amber-900/20'
              }`}>
                <div className="flex items-center gap-2 text-sm font-bold font-mono text-[#F4EE8E]">
                  <Coins size={16} className="text-[#E7C768]" />
                  <span className={isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'}>Корректировка баланса клиенту (Транзакция администратора)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-sm font-mono mb-1 ${isDarkTheme ? 'text-amber-200/80' : 'text-amber-900/80'}`}>
                      Сумма (+ начисление, - списание)
                    </label>
                    <input 
                      type="number"
                      step="any"
                      value={adjustCrmDelta}
                      onChange={(e) => setAdjustCrmDelta(parseFloat(e.target.value) || 0)}
                      placeholder="0 (например: 1000 или -500)"
                      className={`w-full px-3.5 py-2 rounded-xl border text-sm font-mono focus:outline-none h-10 ${
                        isDarkTheme 
                          ? 'bg-black/40 border-amber-400/50 text-white focus:border-[#F4EE8E]' 
                          : 'bg-white border-amber-900/30 text-amber-950 focus:border-amber-700'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-mono mb-1 ${isDarkTheme ? 'text-amber-200/80' : 'text-amber-900/80'}`}>
                      Причина / Комментарий
                    </label>
                    <input 
                      type="text"
                      value={adjustCrmComment}
                      onChange={(e) => setAdjustCrmComment(e.target.value)}
                      placeholder="Корректировка администратором"
                      className={`w-full px-3.5 py-2 rounded-xl border text-sm font-mono focus:outline-none h-10 ${
                        isDarkTheme 
                          ? 'bg-black/40 border-amber-400/50 text-white focus:border-[#F4EE8E]' 
                          : 'bg-white border-amber-900/30 text-amber-950 focus:border-amber-700'
                      }`}
                    />
                  </div>
                </div>
              </div>

            </div>

            <div className={`border-t pt-4 flex justify-between items-center gap-2 relative z-10 ${
              isDarkTheme ? 'border-amber-400/30' : 'border-amber-900/20'
            }`}>
              <button
                type="button"
                onClick={() => {
                  const toDelete = editingCrmCompany;
                  setEditingCrmCompany(null);
                  setDeleteConfirmCompany(toDelete);
                }}
                className="px-4 py-2.5 rounded-xl border border-red-500/40 text-red-400 hover:bg-red-500/10 text-sm font-medium transition-colors cursor-pointer"
              >
                Удалить организацию
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAdjustCrmDelta(0);
                    setEditingCrmCompany(null);
                  }}
                  className={`px-4 py-2.5 rounded-xl border text-sm cursor-pointer transition-colors ${
                    isDarkTheme 
                      ? 'border-amber-400/40 text-amber-200 hover:bg-amber-400/10' 
                      : 'border-amber-900/30 text-amber-950 hover:bg-amber-100'
                  }`}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    let updatedCompany = { ...editingCrmCompany };
                    if (adjustCrmDelta !== 0) {
                      const targetUserId = (editingCrmCompany.id || '').toString().replace(/^crm-/, '');
                      try {
                        const res = await fetch('/api/admin/transactions', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            userId: targetUserId || '91827364501',
                            amount: Number(adjustCrmDelta),
                            type: 'admin',
                            description: adjustCrmComment || 'Корректировка администратором'
                          })
                        });
                        const resData = await res.json();
                        if (resData.success && resData.newBalance !== undefined) {
                          updatedCompany.balance = resData.newBalance;
                        } else {
                          updatedCompany.balance = (updatedCompany.balance || 0) + Number(adjustCrmDelta);
                        }
                      } catch (e) {
                        console.error('Failed to save CRM transaction:', e);
                        updatedCompany.balance = (updatedCompany.balance || 0) + Number(adjustCrmDelta);
                      }
                    }

                    // Save to backend API
                    try {
                      await fetch(`/api/crm/companies/${encodeURIComponent(updatedCompany.id)}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          name: updatedCompany.name,
                          inn: updatedCompany.inn,
                          email: updatedCompany.email,
                          phone: updatedCompany.phone,
                          address: updatedCompany.address,
                          status: updatedCompany.status,
                          balance: updatedCompany.balance,
                          dealAmount: updatedCompany.balance,
                          description: updatedCompany.description || ''
                        })
                      });
                    } catch (e) {
                      console.warn('Ошибка сохранения компании в API:', e);
                    }

                    const next = crmCompanies.map(c => c.id === editingCrmCompany.id ? updatedCompany : c);
                    setCrmCompanies(next);
                    saveStateToServer?.({ company, departments, templates, reports, transactions, notifications, tariff, crmCompanies: next, mockEmployees });
                    setAdjustCrmDelta(0);
                    setEditingCrmCompany(null);
                  }}
                  className="px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 text-sm flex items-center gap-2 cursor-pointer shadow-md hover:brightness-110 active:scale-95"
                >
                  <Check size={16} />
                  Сохранить изменения
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* EDITING GLOBAL PRODUCT PARAMETERS MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-transparent pointer-events-auto backdrop-blur-xs" id="crm-product-modal">
          <div className={`relative w-full max-w-lg border-2 rounded-3xl p-5 sm:p-7 shadow-2xl overflow-y-auto max-h-[85vh] space-y-4 ${
            isDarkTheme 
              ? 'bg-[#1A0F02]/90 border-amber-400/60 text-white shadow-[0_0_30px_rgba(244,238,142,0.25)]' 
              : 'bg-[#FFFBF5]/95 border-amber-900/40 text-amber-950 shadow-xl'
          }`}>
            
            <div className={`flex justify-between items-start border-b pb-3 relative z-10 ${isDarkTheme ? 'border-amber-400/30' : 'border-amber-900/20'}`}>
              <div className="flex items-center gap-2.5">
                <Sliders className="text-[#E7C768]" size={22} />
                <div>
                  <h4 className={`text-base font-bold font-mono ${isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                    Настройка тарификации продукта
                  </h4>
                  <span className={`text-sm font-mono ${isDarkTheme ? 'text-amber-200/80' : 'text-amber-900/70'}`}>
                    Продукт: {editingProduct.name}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setEditingProduct(null)}
                className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                  isDarkTheme ? 'hover:bg-amber-400/15 text-amber-200' : 'hover:bg-amber-200/50 text-amber-950'
                }`}
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-sm relative z-10">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className={`block text-sm font-bold font-mono mb-1 ${isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                    Название продукта *
                  </label>
                  <input 
                    type="text"
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className={`w-full px-3.5 py-2 rounded-xl border text-sm focus:outline-none transition-all ${
                      isDarkTheme 
                        ? 'bg-black/40 border-amber-400/50 text-white focus:border-[#F4EE8E]' 
                        : 'bg-white border-amber-900/30 text-amber-950 focus:border-amber-700'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-bold font-mono mb-1 ${isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                    Системный код
                  </label>
                  <input 
                    type="text"
                    value={editingProduct.code}
                    onChange={(e) => setEditingProduct({ ...editingProduct, code: e.target.value as any })}
                    className={`w-full px-3.5 py-2 rounded-xl border text-sm font-mono focus:outline-none transition-all ${
                      isDarkTheme 
                        ? 'bg-black/40 border-amber-400/50 text-[#F4EE8E] focus:border-[#F4EE8E]' 
                        : 'bg-white border-amber-900/30 text-amber-950 focus:border-amber-700'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-bold font-mono mb-1 ${isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                    Дней бесплатного триала
                  </label>
                  <input 
                    type="number"
                    value={editingProduct.trialDays}
                    onChange={(e) => setEditingProduct({ ...editingProduct, trialDays: parseInt(e.target.value) || 0 })}
                    className={`w-full px-3.5 py-2 rounded-xl border text-sm font-mono focus:outline-none transition-all ${
                      isDarkTheme 
                        ? 'bg-black/40 border-amber-400/50 text-white focus:border-[#F4EE8E]' 
                        : 'bg-white border-amber-900/30 text-amber-950 focus:border-amber-700'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-bold font-mono mb-1 ${isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                    Бесплатных проектов в триале
                  </label>
                  <input 
                    type="number"
                    value={editingProduct.freeProjectsLimit}
                    onChange={(e) => setEditingProduct({ ...editingProduct, freeProjectsLimit: parseInt(e.target.value) || 0 })}
                    className={`w-full px-3.5 py-2 rounded-xl border text-sm font-mono focus:outline-none transition-all ${
                      isDarkTheme 
                        ? 'bg-black/40 border-amber-400/50 text-white focus:border-[#F4EE8E]' 
                        : 'bg-white border-amber-900/30 text-amber-950 focus:border-amber-700'
                    }`}
                    placeholder="Например: 10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-bold font-mono mb-1 ${isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                    Цена за юзера в месяц (₽)
                  </label>
                  <input 
                    type="number"
                    value={editingProduct.pricePerUserMonth}
                    onChange={(e) => setEditingProduct({ ...editingProduct, pricePerUserMonth: parseInt(e.target.value) || 0 })}
                    className={`w-full px-3.5 py-2 rounded-xl border text-sm font-mono focus:outline-none transition-all ${
                      isDarkTheme 
                        ? 'bg-black/40 border-amber-400/50 text-white focus:border-[#F4EE8E]' 
                        : 'bg-white border-amber-900/30 text-amber-950 focus:border-amber-700'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-bold font-mono mb-1 ${isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                    Мин. пользователей при покупке
                  </label>
                  <input 
                    type="number"
                    value={editingProduct.minUsers}
                    onChange={(e) => setEditingProduct({ ...editingProduct, minUsers: parseInt(e.target.value) || 0 })}
                    className={`w-full px-3.5 py-2 rounded-xl border text-sm font-mono focus:outline-none transition-all ${
                      isDarkTheme 
                        ? 'bg-black/40 border-amber-400/50 text-white focus:border-[#F4EE8E]' 
                        : 'bg-white border-amber-900/30 text-amber-950 focus:border-amber-700'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-bold font-mono mb-1 ${isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                  Функциональные возможности (по одной на строку)
                </label>
                <textarea 
                  rows={4}
                  value={editingProduct.features ? editingProduct.features.join('\n') : ''}
                  onChange={(e) => {
                    const lines = e.target.value.split('\n');
                    setEditingProduct({ ...editingProduct, features: lines });
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none transition-all resize-none leading-relaxed ${
                    isDarkTheme
                      ? 'bg-black/40 border-amber-400/50 text-white placeholder-slate-400 focus:border-[#F4EE8E]'
                      : 'bg-white border-amber-900/30 text-amber-950 placeholder-amber-900/40 focus:border-amber-700'
                  }`}
                  placeholder="Каждая новая строка станет пунктом списка возможностей"
                />
              </div>

              <div className={`p-3.5 rounded-2xl border text-sm leading-relaxed flex items-start gap-2.5 ${
                isDarkTheme ? 'bg-amber-500/10 border-amber-400/30 text-amber-200' : 'bg-amber-100/60 border-amber-900/20 text-amber-950'
              }`}>
                <AlertCircle size={18} className="shrink-0 mt-0.5 text-[#E7C768]" />
                <span>
                  <strong>Внимание:</strong> Изменения вступят в силу немедленно для всех новых B2B-регистраций в системе. Для ИИ Ревизора по умолчанию установлено <strong>10 бесплатных проектов в триале</strong>.
                </span>
              </div>
            </div>

            <div className={`border-t pt-4 flex justify-end gap-2 relative z-10 ${
              isDarkTheme ? 'border-amber-400/30' : 'border-amber-900/20'
            }`}>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className={`px-4 py-2.5 rounded-xl border text-sm cursor-pointer transition-colors ${
                  isDarkTheme 
                    ? 'border-amber-400/40 text-amber-200 hover:bg-amber-400/10' 
                    : 'border-amber-900/30 text-amber-950 hover:bg-amber-100'
                }`}
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = products.map(p => p.id === editingProduct.id ? editingProduct : p);
                  setProducts(next);
                  setEditingProduct(null);
                }}
                className="px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 text-sm flex items-center gap-2 cursor-pointer shadow-md hover:brightness-110 active:scale-95"
              >
                <Check size={16} />
                Сохранить параметры
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CUSTOM INLINE CELL EDIT MODAL */}
      {crmCellEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent pointer-events-auto backdrop-blur-xs">
          <div className={`relative w-full max-w-md rounded-3xl p-6 shadow-2xl border-2 space-y-4 ${
            isDarkTheme 
              ? 'bg-[#1A0F02]/85 border-amber-400/60 text-white shadow-[0_0_30px_rgba(244,238,142,0.25)]' 
              : 'bg-[#FFFBF5]/90 border-amber-900/40 text-amber-950 shadow-xl'
          }`}>
            <div className={`flex justify-between items-start border-b pb-3 ${isDarkTheme ? 'border-amber-400/30' : 'border-amber-900/20'}`}>
              <div>
                <h4 className={`text-base font-bold ${isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                  {crmCellEdit.label}
                </h4>
                <p className={`text-sm mt-0.5 ${isDarkTheme ? 'text-amber-200/70' : 'text-amber-900/70'}`}>
                  {crmCellEdit.companyName} (ID: #{crmCellEdit.companyId})
                </p>
              </div>
              <button
                onClick={() => setCrmCellEdit(null)}
                className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                  isDarkTheme ? 'hover:bg-amber-400/15 text-amber-200' : 'hover:bg-amber-200/50 text-amber-950'
                }`}
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 py-1">
              {crmCellEdit.type === 'status' ? (
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDarkTheme ? 'text-amber-200' : 'text-amber-950'}`}>
                    Выберите новый статус:
                  </label>
                  <select
                    value={crmCellEdit.value}
                    onChange={(e) => setCrmCellEdit({ ...crmCellEdit, value: e.target.value })}
                    className={`w-full p-3 rounded-2xl border text-sm font-medium focus:outline-none transition-all ${
                      isDarkTheme
                        ? 'bg-[#140A01]/70 border-amber-400/50 text-white focus:border-[#F4EE8E]'
                        : 'bg-white border-amber-900/30 text-amber-950 focus:border-amber-700'
                    }`}
                  >
                    <option value="Триал (7 дней)">Триал (7 дней)</option>
                    <option value="В работе">В работе</option>
                    <option value="Активен (Бизнес)">Активен (Бизнес)</option>
                    <option value="В архиве">В архиве</option>
                    <option value="Заблокирован">Заблокирован</option>
                  </select>
                </div>
              ) : crmCellEdit.type === 'number' ? (
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDarkTheme ? 'text-amber-200' : 'text-amber-950'}`}>
                    Введите числовое значение:
                  </label>
                  <input
                    type="number"
                    value={crmCellEdit.value}
                    onChange={(e) => setCrmCellEdit({ ...crmCellEdit, value: e.target.value })}
                    className={`w-full p-3 rounded-2xl border text-sm font-mono focus:outline-none transition-all ${
                      isDarkTheme
                        ? 'bg-[#140A01]/70 border-amber-400/50 text-white focus:border-[#F4EE8E]'
                        : 'bg-white border-amber-900/30 text-amber-950 focus:border-amber-700'
                    }`}
                    autoFocus
                  />
                </div>
              ) : (
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDarkTheme ? 'text-amber-200' : 'text-amber-950'}`}>
                    Новое значение поля:
                  </label>
                  <input
                    type="text"
                    value={crmCellEdit.value}
                    onChange={(e) => setCrmCellEdit({ ...crmCellEdit, value: e.target.value })}
                    className={`w-full p-3 rounded-2xl border text-sm focus:outline-none transition-all ${
                      isDarkTheme
                        ? 'bg-[#140A01]/70 border-amber-400/50 text-white focus:border-[#F4EE8E]'
                        : 'bg-white border-amber-900/30 text-amber-950 focus:border-amber-700'
                    }`}
                    autoFocus
                  />
                </div>
              )}
            </div>

            <div className={`flex justify-end gap-3 pt-3 border-t ${isDarkTheme ? 'border-amber-400/30' : 'border-amber-900/20'}`}>
              <button
                type="button"
                onClick={() => setCrmCellEdit(null)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border cursor-pointer transition-colors ${
                  isDarkTheme 
                    ? 'border-amber-400/40 text-amber-200 hover:bg-amber-400/10' 
                    : 'border-amber-900/30 text-amber-950 hover:bg-amber-100'
                }`}
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSaveCrmCell}
                className="px-5 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 flex items-center gap-1.5 cursor-pointer shadow-md hover:brightness-110 active:scale-95"
              >
                <Check size={16} />
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {deleteConfirmCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent pointer-events-auto backdrop-blur-xs">
          <div className={`relative w-full max-w-md rounded-3xl p-6 shadow-2xl border-2 space-y-4 ${
            isDarkTheme 
              ? 'bg-[#1A0F02]/90 border-red-500/60 text-white shadow-[0_0_30px_rgba(239,68,68,0.2)]' 
              : 'bg-[#FFFBF5]/95 border-red-600/40 text-amber-950 shadow-xl'
          }`}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30">
                <Trash2 size={22} />
              </div>
              <div>
                <h4 className="text-base font-bold">Подтверждение удаления</h4>
                <p className={`text-sm ${isDarkTheme ? 'text-slate-300' : 'text-amber-900/70'}`}>
                  Это действие необратимо
                </p>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border text-sm leading-relaxed ${
              isDarkTheme ? 'bg-black/40 border-amber-400/20 text-slate-200' : 'bg-amber-50/50 border-amber-900/20 text-amber-950'
            }`}>
              Вы действительно хотите безвозвратно удалить организацию <strong className="text-amber-300">{deleteConfirmCompany.name}</strong> (ID: #{deleteConfirmCompany.id}) из базы данных CRM?
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmCompany(null)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border cursor-pointer transition-colors ${
                  isDarkTheme 
                    ? 'border-amber-400/40 text-amber-200 hover:bg-amber-400/10' 
                    : 'border-amber-900/30 text-amber-950 hover:bg-amber-100'
                }`}
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCompany}
                className="px-5 py-2 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-500 text-white flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
              >
                <Trash2 size={16} />
                Удалить организацию
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM PRODUCT DELETE CONFIRMATION MODAL */}
      {deleteConfirmProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent pointer-events-auto backdrop-blur-xs">
          <div className={`relative w-full max-w-md rounded-3xl p-6 shadow-2xl border-2 space-y-4 ${
            isDarkTheme 
              ? 'bg-[#1A0F02]/90 border-red-500/60 text-white shadow-[0_0_30px_rgba(239,68,68,0.2)]' 
              : 'bg-[#FFFBF5]/95 border-red-600/40 text-amber-950 shadow-xl'
          }`}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30">
                <Trash2 size={22} />
              </div>
              <div>
                <h4 className="text-base font-bold">Подтверждение удаления продукта</h4>
                <p className={`text-sm ${isDarkTheme ? 'text-slate-300' : 'text-amber-900/70'}`}>
                  Это действие необратимо
                </p>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border text-sm leading-relaxed ${
              isDarkTheme ? 'bg-black/40 border-amber-400/20 text-slate-200' : 'bg-amber-50/50 border-amber-900/20 text-amber-950'
            }`}>
              Вы действительно хотите удалить ИИ продукт <strong className="text-amber-300">"{deleteConfirmProduct.name}"</strong> (код: {deleteConfirmProduct.code}) из каталога?
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmProduct(null)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border cursor-pointer transition-colors ${
                  isDarkTheme 
                    ? 'border-amber-400/40 text-amber-200 hover:bg-amber-400/10' 
                    : 'border-amber-900/30 text-amber-950 hover:bg-amber-100'
                }`}
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteProduct}
                className="px-5 py-2 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-500 text-white flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
              >
                <Trash2 size={16} />
                Удалить продукт
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
