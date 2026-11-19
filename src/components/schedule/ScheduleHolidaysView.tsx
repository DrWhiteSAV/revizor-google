import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  Edit3, 
  RotateCcw, 
  Check, 
  X, 
  Flag, 
  Building2, 
  ArrowRightLeft, 
  Clock, 
  Sparkles,
  Info,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { CompanyHoliday, HolidayType, MONTH_NAMES_RU, WEEK_DAY_NAMES_RU } from './types';

interface ScheduleHolidaysViewProps {
  companyHolidays: CompanyHoliday[];
  currentYear: number;
  currentMonth: number;
  isLightTheme: boolean;
  onRefreshHolidays: () => Promise<void>;
  onBackToSchedule: () => void;
}

export const ScheduleHolidaysView: React.FC<ScheduleHolidaysViewProps> = ({
  companyHolidays,
  currentYear: initialYear,
  isLightTheme,
  onRefreshHolidays,
  onBackToSchedule
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(initialYear || new Date().getFullYear());
  const [filterType, setFilterType] = useState<string>('all');
  const [holidays, setHolidays] = useState<CompanyHoliday[]>(companyHolidays);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<CompanyHoliday | null>(null);
  const [isDateRangeMode, setIsDateRangeMode] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    date: string;
    start_date: string;
    end_date: string;
    holiday_type: HolidayType;
    is_working: number;
    transfer_from: string;
    description: string;
  }>({
    name: '',
    date: `${selectedYear}-01-01`,
    start_date: `${selectedYear}-01-01`,
    end_date: `${selectedYear}-01-08`,
    holiday_type: 'official',
    is_working: 0,
    transfer_from: '',
    description: ''
  });

  // Modal State for Delete Confirmation (Custom styled modal - NO window.confirm)
  const [deleteCandidate, setDeleteCandidate] = useState<CompanyHoliday | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  useEffect(() => {
    setHolidays(companyHolidays);
  }, [companyHolidays]);

  // When selectedYear changes, load holidays for that year
  useEffect(() => {
    const fetchHolidaysForYear = async () => {
      try {
        const res = await fetch(`/api/schedules/holidays?year=${selectedYear}`);
        if (res.ok) {
          const d = await res.json();
          if (d.success && Array.isArray(d.holidays)) {
            setHolidays(d.holidays);
          }
        }
      } catch (err) {
        console.warn('Failed to load holidays for year:', selectedYear, err);
      }
    };
    fetchHolidaysForYear();
  }, [selectedYear]);

  const showToast = (text: string, isError = false) => {
    setStatusMessage({ text, isError });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleOpenAdd = () => {
    setEditingHoliday(null);
    setIsDateRangeMode(false);
    setFormData({
      name: '',
      date: `${selectedYear}-01-01`,
      start_date: `${selectedYear}-01-01`,
      end_date: `${selectedYear}-01-08`,
      holiday_type: 'custom',
      is_working: 0,
      transfer_from: '',
      description: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (h: CompanyHoliday) => {
    setEditingHoliday(h);
    setIsDateRangeMode(false);
    setFormData({
      name: h.name,
      date: h.date,
      start_date: h.date,
      end_date: h.date,
      holiday_type: h.holiday_type || 'custom',
      is_working: h.is_working || 0,
      transfer_from: h.transfer_from || '',
      description: h.description || ''
    });
    setIsModalOpen(true);
  };

  // Calculate days in period
  const periodDaysCount = React.useMemo(() => {
    if (!isDateRangeMode) return 1;
    if (!formData.start_date || !formData.end_date) return 1;
    const s = new Date(formData.start_date);
    const e = new Date(formData.end_date);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) return 1;
    const diffTime = Math.abs(e.getTime() - s.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [isDateRangeMode, formData.start_date, formData.end_date]);

  const handleSaveHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Укажите название праздника', true);
      return;
    }

    if (!isDateRangeMode && !formData.date) {
      showToast('Укажите дату праздника', true);
      return;
    }

    if (isDateRangeMode && (!formData.start_date || !formData.end_date)) {
      showToast('Укажите дату начала и окончания периода', true);
      return;
    }

    try {
      setLoading(true);
      const payload = isDateRangeMode ? {
        ...formData,
        company_id: 'flagship-main',
        start_date: formData.start_date,
        end_date: formData.end_date
      } : {
        ...formData,
        company_id: 'flagship-main',
        date: formData.date
      };

      if (editingHoliday) {
        // Update
        const res = await fetch(`/api/schedules/holidays/${editingHoliday.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const d = await res.json();
        if (d.success) {
          showToast('Праздничный день / период успешно сохранен');
          setIsModalOpen(false);
          await onRefreshHolidays();
          // Also refetch for current selectedYear
          const yearRes = await fetch(`/api/schedules/holidays?year=${selectedYear}`);
          if (yearRes.ok) {
            const yrJson = await yearRes.json();
            if (yrJson.success && Array.isArray(yrJson.holidays)) setHolidays(yrJson.holidays);
          }
        } else {
          showToast(d.error || 'Ошибка при обновлении', true);
        }
      } else {
        // Create
        const res = await fetch('/api/schedules/holidays', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const d = await res.json();
        if (d.success) {
          const countMsg = d.count && d.count > 1 ? ` (${d.count} дн.)` : '';
          showToast(`Праздник успешно добавлен в производственный календарь${countMsg}`);
          setIsModalOpen(false);
          await onRefreshHolidays();
          // Also refetch for current selectedYear
          const yearRes = await fetch(`/api/schedules/holidays?year=${selectedYear}`);
          if (yearRes.ok) {
            const yrJson = await yearRes.json();
            if (yrJson.success && Array.isArray(yrJson.holidays)) setHolidays(yrJson.holidays);
          }
        } else {
          showToast(d.error || 'Ошибка при добавлении', true);
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Ошибка сети', true);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (h: CompanyHoliday) => {
    try {
      const res = await fetch(`/api/schedules/holidays/toggle/${h.id}`, {
        method: 'POST'
      });
      const d = await res.json();
      if (d.success) {
        setHolidays(prev => prev.map(item => item.id === h.id ? { ...item, is_active: d.is_active } : item));
        await onRefreshHolidays();
      }
    } catch (e: any) {
      showToast('Ошибка при переключении статуса', true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteCandidate) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/schedules/holidays/${deleteCandidate.id}`, {
        method: 'DELETE'
      });
      const d = await res.json();
      if (d.success) {
        showToast(`Праздник "${deleteCandidate.name}" удален`);
        setDeleteCandidate(null);
        await onRefreshHolidays();
        // Refetch for current year
        const yearRes = await fetch(`/api/schedules/holidays?year=${selectedYear}`);
        if (yearRes.ok) {
          const yrJson = await yearRes.json();
          if (yrJson.success && Array.isArray(yrJson.holidays)) setHolidays(yrJson.holidays);
        }
      }
    } catch (e: any) {
      showToast('Ошибка при удалении', true);
    } finally {
      setLoading(false);
    }
  };

  const handleResetRfCalendar = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/schedules/holidays/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: 'flagship-main', year: selectedYear })
      });
      const d = await res.json();
      if (d.success) {
        showToast(`Производственный календарь РФ на ${selectedYear} год восстановлен`);
        setIsResetConfirmOpen(false);
        if (Array.isArray(d.holidays)) {
          setHolidays(d.holidays);
        }
        await onRefreshHolidays();
      }
    } catch (e: any) {
      showToast('Ошибка при восстановлении', true);
    } finally {
      setLoading(false);
    }
  };

  const filteredHolidays = holidays
    .filter(h => {
      const hYear = h.year || (h.date ? parseInt(h.date.split('-')[0], 10) : selectedYear);
      if (hYear !== selectedYear && hYear !== 0) return false;
      if (filterType === 'all') return true;
      if (filterType === 'official') return h.holiday_type === 'official';
      if (filterType === 'custom') return h.holiday_type === 'custom';
      if (filterType === 'transfer') return h.holiday_type === 'transfer';
      if (filterType === 'working') return h.is_working === 1;
      if (filterType === 'weekend') return h.is_working === 0;
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const typeLabels: Record<HolidayType, { label: string; icon: any; color: string }> = {
    official: { label: 'Государственный РФ', icon: Flag, color: 'text-red-500 bg-red-500/10 border-red-500/30' },
    custom: { label: 'Корпоративный', icon: Building2, color: 'text-amber-500 bg-amber-500/10 border-amber-500/30' },
    transfer: { label: 'Перенос выходного', icon: ArrowRightLeft, color: 'text-purple-500 bg-purple-500/10 border-purple-500/30' },
    shortened: { label: 'Предпраздничный', icon: Clock, color: 'text-orange-500 bg-orange-500/10 border-orange-500/30' }
  };

  return (
    <div className="space-y-6 animate-fade-in text-sm">
      {/* Toast Notification */}
      {statusMessage && (
        <div className={`p-4 rounded-2xl border text-sm font-semibold flex items-center justify-between shadow-lg ${
          statusMessage.isError
            ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
            : 'bg-amber-500/20 text-amber-950 dark:text-[#F4EE8E] border-amber-500/40 shadow-[0_0_20px_rgba(244,238,142,0.2)]'
        }`}>
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-amber-400 shrink-0" />
            <span>{statusMessage.text}</span>
          </div>
          <button type="button" onClick={() => setStatusMessage(null)} className="p-1 opacity-70 hover:opacity-100">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header & Navigation bar */}
      <div className="p-4 md:p-6 rounded-3xl bg-[#FFFBF5]/90 dark:bg-[#1A0F02]/80 border border-amber-500/30 dark:border-amber-400/30 shadow-md backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-950 dark:text-[#F4EE8E] border border-amber-500/40 shadow-xs">
            <CalendarIcon size={24} />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
              <span>Праздники и Производственный календарь</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-900 dark:text-[#F4EE8E] border border-amber-500/40 font-mono">
                {selectedYear} г.
              </span>
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Учет государственных праздников РФ, корпоративных дат компании и праздничных переносов смен
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Universal Year Selector (Any Year support with input, steppers and presets) */}
          <div className="flex items-center bg-amber-500/10 p-1 rounded-2xl border border-amber-500/30 gap-1">
            <button
              type="button"
              onClick={() => setSelectedYear(prev => prev - 1)}
              className="p-1.5 rounded-xl hover:bg-amber-500/20 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
              title="Предыдущий год"
            >
              <ChevronLeft size={15} />
            </button>

            {/* Direct Editable Year Input */}
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="2000"
                max="2099"
                value={selectedYear}
                onChange={e => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 1900 && val <= 2100) {
                    setSelectedYear(val);
                  }
                }}
                className="w-16 px-1.5 py-1 text-center font-mono font-black text-xs rounded-xl bg-amber-500/20 text-amber-950 dark:text-[#F4EE8E] border border-amber-500/40 focus:outline-none focus:border-amber-400"
                title="Введите любой год"
              />
              <span className="text-[11px] font-bold opacity-70">г.</span>
            </div>

            {/* Quick preset buttons around selected year */}
            {[selectedYear - 1, selectedYear + 1].map(yr => (
              <button
                key={`yr-btn-${yr}`}
                type="button"
                onClick={() => setSelectedYear(yr)}
                className="hidden sm:inline-block px-2.5 py-1 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:text-amber-500 hover:bg-amber-500/10 transition-all cursor-pointer"
              >
                {yr}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setSelectedYear(prev => prev + 1)}
              className="p-1.5 rounded-xl hover:bg-amber-500/20 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
              title="Следующий год"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-black text-xs md:text-sm border border-amber-400 shadow-md hover:brightness-105 active:scale-95 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Добавить праздник / период</span>
          </button>

          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-950 dark:text-[#F4EE8E] border border-amber-500/30 text-xs font-bold transition-all cursor-pointer"
            title="Восстановить стандартные государственные праздники РФ"
          >
            <RotateCcw size={14} />
            <span className="hidden sm:inline">Сбросить к стандарту РФ</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: 'all', label: 'Все дни' },
          { id: 'official', label: 'Государственные РФ' },
          { id: 'custom', label: 'Корпоративные компании' },
          { id: 'transfer', label: 'Переносы выходных' },
          { id: 'weekend', label: 'Праздничные выходные' },
          { id: 'working', label: 'Праздничные смены (x2)' }
        ].map(tab => (
          <button
            key={`filter-tab-${tab.id}`}
            type="button"
            onClick={() => setFilterType(tab.id)}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer border ${
              filterType === tab.id
                ? 'bg-amber-500/20 border-amber-400 text-amber-950 dark:text-[#F4EE8E] shadow-xs'
                : 'bg-[#FFFBF5]/60 dark:bg-[#1A0F02]/50 border-amber-500/20 text-zinc-600 dark:text-zinc-400 hover:border-amber-400/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Holidays List / Grid */}
      <div className="rounded-3xl bg-[#FFFBF5]/80 dark:bg-[#1A0F02]/70 border border-amber-500/30 dark:border-amber-400/30 shadow-md backdrop-blur-md overflow-hidden">
        {filteredHolidays.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 dark:text-zinc-400 space-y-3">
            <CalendarIcon size={40} className="mx-auto text-amber-400/60" />
            <p className="text-base font-bold">В {selectedYear} году в выбранной категории праздников не найдено</p>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-4 py-2 rounded-2xl bg-amber-500/20 text-amber-950 dark:text-[#F4EE8E] border border-amber-500/40 text-xs font-black cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus size={15} />
              Добавить праздничный день или период
            </button>
          </div>
        ) : (
          <div className="divide-y divide-amber-500/15">
            {filteredHolidays.map(h => {
              const [y, m, d] = h.date.split('-').map(Number);
              const dateObj = new Date(y, m - 1, d);
              const dow = dateObj.getDay();
              const typeCfg = typeLabels[h.holiday_type] || typeLabels.custom;
              const TypeIcon = typeCfg.icon;

              return (
                <div
                  key={`hol-row-${h.id}`}
                  className={`p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:bg-amber-500/5 ${
                    h.is_active === 0 ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-4">
                    {/* Date Badge */}
                    <div className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-center shrink-0">
                      <span className="text-[10px] font-bold text-amber-800 dark:text-[#F4EE8E] uppercase tracking-wider">
                        {MONTH_NAMES_RU[m - 1]?.slice(0, 3)}
                      </span>
                      <span className="text-xl font-black text-zinc-900 dark:text-white leading-none">
                        {d}
                      </span>
                      <span className="text-[9px] font-semibold text-zinc-500 dark:text-zinc-400">
                        {WEEK_DAY_NAMES_RU[dow]}
                      </span>
                    </div>

                    {/* Holiday Info */}
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-extrabold text-sm md:text-base text-zinc-900 dark:text-white">
                          {h.name}
                        </h4>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${typeCfg.color}`}>
                          <TypeIcon size={11} />
                          <span>{typeCfg.label}</span>
                        </span>
                        {h.is_working === 1 ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-950 dark:text-[#F4EE8E] border border-amber-500/40">
                            🏛️ Праздничная смена (x2)
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30">
                            🎉 Выходной день
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400">
                        <span className="font-mono text-zinc-500 dark:text-zinc-400">{h.date}</span>
                        {h.transfer_from && (
                          <span className="text-purple-600 dark:text-purple-400 flex items-center gap-1">
                            <ArrowRightLeft size={12} />
                            перенос с {h.transfer_from}
                          </span>
                        )}
                        {h.description && (
                          <span className="text-zinc-500 italic">«{h.description}»</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {/* Toggle Active Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleActive(h)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        h.is_active === 1
                          ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                          : 'bg-zinc-500/20 text-zinc-600 dark:text-zinc-400 border-zinc-500/40 hover:bg-zinc-500/30'
                      }`}
                      title={h.is_active === 1 ? 'Праздник активен в графике смен' : 'Праздник отключен'}
                    >
                      <Check size={13} className={h.is_active === 1 ? 'opacity-100' : 'opacity-40'} />
                      <span>{h.is_active === 1 ? 'Активен' : 'Отключен'}</span>
                    </button>

                    {/* Edit Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(h)}
                      className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-950 dark:text-[#F4EE8E] border border-amber-500/30 transition-all cursor-pointer"
                      title="Редактировать праздник"
                    >
                      <Edit3 size={15} />
                    </button>

                    {/* Delete Button (Opens custom styled confirmation modal) */}
                    <button
                      type="button"
                      onClick={() => setDeleteCandidate(h)}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 transition-all cursor-pointer"
                      title="Удалить праздник"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Holiday Modal with Period Support */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-[#FFFBF5] dark:bg-[#140A01] border border-amber-400/50 shadow-[0_0_30px_rgba(244,238,142,0.3)] p-6 text-zinc-900 dark:text-white space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
              <h3 className="text-lg font-black text-zinc-900 dark:text-[#F4EE8E] flex items-center gap-2">
                <CalendarIcon size={20} className="text-amber-400" />
                <span>{editingHoliday ? 'Редактировать праздник' : 'Добавить праздничный день или период'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-amber-500/20 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveHoliday} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Название праздника *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="например, Новогодние каникулы или День компании"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-zinc-900 dark:text-white text-sm font-semibold focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Mode Toggle: Single Date vs. Period / Range */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Формат даты
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-amber-500/10 border border-amber-500/25">
                  <button
                    type="button"
                    onClick={() => setIsDateRangeMode(false)}
                    className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      !isDateRangeMode
                        ? 'bg-gradient-to-r from-[#F4EE8E] to-[#E7C768] text-amber-950 shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-amber-500'
                    }`}
                  >
                    Один день
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDateRangeMode(true)}
                    className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      isDateRangeMode
                        ? 'bg-gradient-to-r from-[#F4EE8E] to-[#E7C768] text-amber-950 shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-amber-500'
                    }`}
                  >
                    Период дат (диапазон)
                  </button>
                </div>
              </div>

              {/* Single Date vs Period inputs */}
              {!isDateRangeMode ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Дата праздника *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-zinc-900 dark:text-white text-sm font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Тип праздника
                    </label>
                    <select
                      value={formData.holiday_type}
                      onChange={e => setFormData({ ...formData, holiday_type: e.target.value as HolidayType })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-zinc-900 dark:text-white text-sm font-semibold focus:outline-none focus:border-amber-400"
                    >
                      <option value="official">Государственный РФ</option>
                      <option value="custom">Корпоративный компании</option>
                      <option value="transfer">Перенос выходного дня</option>
                      <option value="shortened">Предпраздничный сокращенный</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                        Дата начала периода *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.start_date}
                        onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-zinc-900 dark:text-white text-sm font-mono focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                        Дата окончания периода *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.end_date}
                        onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-zinc-900 dark:text-white text-sm font-mono focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-xs font-bold text-amber-950 dark:text-[#F4EE8E]">
                    <span>Длительность периода:</span>
                    <span className="font-mono px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/40">
                      {periodDaysCount} {periodDaysCount === 1 ? 'день' : periodDaysCount < 5 ? 'дня' : 'дней'}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Тип праздника для всего периода
                    </label>
                    <select
                      value={formData.holiday_type}
                      onChange={e => setFormData({ ...formData, holiday_type: e.target.value as HolidayType })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-zinc-900 dark:text-white text-sm font-semibold focus:outline-none focus:border-amber-400"
                    >
                      <option value="official">Государственный РФ (каникулы)</option>
                      <option value="custom">Корпоративный компании</option>
                      <option value="transfer">Перенос выходных дней</option>
                      <option value="shortened">Предпраздничный период</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Режим дня для сотрудников
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, is_working: 0 })}
                    className={`p-3 rounded-2xl border text-xs font-black transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      formData.is_working === 0
                        ? 'bg-red-500/20 border-red-500 text-red-800 dark:text-red-300 shadow-xs'
                        : 'bg-amber-500/10 border-amber-500/20 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <span>🎉 Праздничный выходной</span>
                    <span className="text-[10px] font-normal opacity-80">Нерабочий день (0 ч)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, is_working: 1 })}
                    className={`p-3 rounded-2xl border text-xs font-black transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      formData.is_working === 1
                        ? 'bg-amber-500/30 border-amber-400 text-amber-950 dark:text-[#F4EE8E] shadow-xs'
                        : 'bg-amber-500/10 border-amber-500/20 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <span>🏛️ Праздничная смена</span>
                    <span className="text-[10px] font-normal opacity-80">Рабочий день с доплатой x2</span>
                  </button>
                </div>
              </div>

              {formData.holiday_type === 'transfer' && (
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    С какой даты перенесен (например, 2026-01-03)
                  </label>
                  <input
                    type="text"
                    value={formData.transfer_from}
                    onChange={e => setFormData({ ...formData, transfer_from: e.target.value })}
                    placeholder="YYYY-MM-DD"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-zinc-900 dark:text-white text-sm font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Примечание / Описание
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Дополнительные указания для диспетчера смен..."
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-zinc-900 dark:text-white text-sm font-semibold focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-amber-500/20">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-zinc-700 dark:text-zinc-300 text-xs font-bold cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-2xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-black text-xs md:text-sm shadow-md hover:brightness-105 active:scale-95 transition-all cursor-pointer"
                >
                  {loading ? 'Сохранение...' : editingHoliday ? 'Сохранить изменения' : isDateRangeMode ? `Создать период (${periodDaysCount} дн.)` : 'Создать праздник'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (NO window.confirm) */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#FFFBF5] dark:bg-[#140A01] border border-rose-500/40 p-6 text-zinc-900 dark:text-white space-y-4 shadow-2xl animate-scale-up">
            <h3 className="text-base font-black text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <Trash2 size={18} />
              Подтверждение удаления
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-300">
              Вы уверены, что хотите удалить праздник <strong className="text-zinc-900 dark:text-white">"{deleteCandidate.name}"</strong> на дату <strong className="font-mono">{deleteCandidate.date}</strong>?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                className="px-4 py-2 rounded-2xl bg-amber-500/10 text-zinc-700 dark:text-zinc-300 text-xs font-bold cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={loading}
                className="px-4 py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black cursor-pointer shadow-md"
              >
                {loading ? 'Удаление...' : 'Да, удалить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#FFFBF5] dark:bg-[#140A01] border border-amber-400/50 p-6 text-zinc-900 dark:text-white space-y-4 shadow-2xl animate-scale-up">
            <h3 className="text-base font-black text-amber-950 dark:text-[#F4EE8E] flex items-center gap-2">
              <RotateCcw size={18} className="text-amber-400" />
              Восстановление праздников РФ
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-300">
              Это действие восстановит полный список официальных праздничных дней РФ на <strong className="font-mono">{selectedYear} год</strong> в базе данных.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-4 py-2 rounded-2xl bg-amber-500/10 text-zinc-700 dark:text-zinc-300 text-xs font-bold cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleResetRfCalendar}
                disabled={loading}
                className="px-4 py-2 rounded-2xl bg-gradient-to-r from-[#F4EE8E] to-[#E7C768] text-amber-950 text-xs font-black cursor-pointer shadow-md"
              >
                {loading ? 'Восстановление...' : 'Восстановить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
