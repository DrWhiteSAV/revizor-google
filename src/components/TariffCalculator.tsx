import React, { useState } from 'react';
import { Sparkles, Calendar, Users, Coins, Clock, TrendingUp, ArrowRight, FolderKanban, CheckSquare, FileText } from 'lucide-react';

interface TariffCalculatorProps {
  onAction?: (quantity: number, months: number, totalCost: number, productType: 'raport' | 'revisor') => void;
  actionButtonText?: string;
  className?: string;
  initialEmployees?: number;
  alwaysLight?: boolean;
  mode?: 'landing' | 'cabinet';
  theme?: 'dark' | 'light';
}

export default function TariffCalculator({
  onAction,
  actionButtonText = 'Купить подписку',
  className = '',
  initialEmployees = 15,
  alwaysLight = false,
  mode = 'landing',
  theme = 'dark'
}: TariffCalculatorProps) {
  const [productType, setProductType] = useState<'raport' | 'revisor'>('revisor');
  const [months, setMonths] = useState<number>(1);

  // Dynamic Prices from Database
  const [raportUnitPrice, setRaportUnitPrice] = useState<number>(290);
  const [revisorUnitPrice, setRevisorUnitPrice] = useState<number>(690);
  const [extraProjectUnitPrice, setExtraProjectUnitPrice] = useState<number>(10);
  const [extraTaskUnitPrice, setExtraTaskUnitPrice] = useState<number>(5);
  const [extraReportUnitPrice, setExtraReportUnitPrice] = useState<number>(5);

  // EXTRA LIMIT TOP-UP STATES
  const [extraProjects, setExtraProjects] = useState<number>(0);
  const [extraTasks, setExtraTasks] = useState<number>(0);
  const [extraReports, setExtraReports] = useState<number>(0);

  React.useEffect(() => {
    fetch('/api/tariffs')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.tariffs)) {
          const raportRow = data.tariffs.find((t: any) => t.product_key === 'raport' || t.id === 'raport');
          const revisorRow = data.tariffs.find((t: any) => t.product_key === 'revisor' || t.id === 'revisor');
          const projExtraRow = data.tariffs.find((t: any) => t.product_key === 'revisor_extra_project' || t.id === 'revisor_extra_project');
          const taskExtraRow = data.tariffs.find((t: any) => t.product_key === 'revisor_extra_task' || t.id === 'revisor_extra_task');
          const reportExtraRow = data.tariffs.find((t: any) => t.product_key === 'raport_extra_report' || t.id === 'raport_extra_report');

          if (raportRow && raportRow.price_per_unit) setRaportUnitPrice(Number(raportRow.price_per_unit));
          if (revisorRow && revisorRow.price_per_unit) setRevisorUnitPrice(Number(revisorRow.price_per_unit));
          if (projExtraRow && projExtraRow.price_per_unit) setExtraProjectUnitPrice(Number(projExtraRow.price_per_unit));
          if (taskExtraRow && taskExtraRow.price_per_unit) setExtraTaskUnitPrice(Number(taskExtraRow.price_per_unit));
          if (reportExtraRow && reportExtraRow.price_per_unit) setExtraReportUnitPrice(Number(reportExtraRow.price_per_unit));
        }
      })
      .catch((err) => {
        console.warn('Failed to load DB tariffs in calculator, using defaults:', err);
      });
  }, []);

  // RAPORT SPECIFIC STATES
  const [employees, setEmployees] = useState<number>(initialEmployees);
  const [managerHourlyRate, setManagerHourlyRate] = useState<number>(1500);
  const [hoursSpentManual, setHoursSpentManual] = useState<number>(1.5);

  // REVISOR SPECIFIC STATES
  const [projects, setProjects] = useState<number>(10);
  const [tasksPerProject, setTasksPerProject] = useState<number>(25);
  const [hoursSpentPerTaskChecking, setHoursSpentPerTaskChecking] = useState<number>(0.5);
  const [directorHourlyRate, setDirectorHourlyRate] = useState<number>(2000);

  // Period / Discount calculations
  let discountPercent = 0;
  if (months === 3) discountPercent = 10;
  else if (months === 6) discountPercent = 20;
  else if (months === 12) discountPercent = 30;

  let baseMonthlyPrice = 0;
  let hoursSavedPerMonth = 0;
  let budgetSavedPerMonth = 0;

  if (productType === 'raport') {
    // Dynamically loaded from database (default 290 RR base + extra reports at 5 RR)
    const extraReportsCost = extraReports * extraReportUnitPrice;
    baseMonthlyPrice = (employees * raportUnitPrice) + extraReportsCost;
    hoursSavedPerMonth = Math.max(1, Math.round((hoursSpentManual - 0.1) * employees * 4.3));
    budgetSavedPerMonth = Math.round(hoursSavedPerMonth * managerHourlyRate);
  } else {
    // Revisor: Dynamically loaded from database (default 690 RR base + extra projects at 50 RR + extra tasks at 10 RR)
    const extraProjCost = extraProjects * extraProjectUnitPrice;
    const extraTasksCost = extraTasks * extraTaskUnitPrice;
    baseMonthlyPrice = (employees * revisorUnitPrice) + extraProjCost + extraTasksCost;
    const totalTasksPerMonth = projects * tasksPerProject;
    // 85% of checking tasks is automated by AI Agent and checklist verification
    hoursSavedPerMonth = Math.max(1, Math.round(totalTasksPerMonth * hoursSpentPerTaskChecking * 0.85));
    budgetSavedPerMonth = Math.round(hoursSavedPerMonth * directorHourlyRate);
  }

  const discountedMonthlyPrice = Math.round(baseMonthlyPrice * (1 - discountPercent / 100));
  const totalPeriodCost = discountedMonthlyPrice * months;
  const netSavingPerMonth = budgetSavedPerMonth - discountedMonthlyPrice;
  const roiPercent = discountedMonthlyPrice > 0 ? Math.round((netSavingPerMonth / discountedMonthlyPrice) * 100) : 0;

  const durations = [
    { value: 1, label: '1 месяц', discount: 0 },
    { value: 3, label: '3 мес (-10%)', discount: 10 },
    { value: 6, label: '6 мес (-20%)', discount: 20 },
    { value: 12, label: '12 мес (-30%)', discount: 30 },
  ];

  const isCabinet = mode === 'cabinet';
  const isDark = isCabinet ? theme === 'dark' : !alwaysLight;

  const containerClass = `w-full bg-transparent border ${
    isDark ? 'border-amber-400/30 text-[#F4EE8E]' : 'border-amber-900/30 text-amber-950'
  } rounded-[32px] p-5 sm:p-8 space-y-6 text-left shadow-none relative overflow-hidden liquid-glass-card backdrop-blur-md ${className}`;

  const cardBoxSpace2Class = `p-4 sm:p-5 rounded-2xl bg-transparent border ${
    isDark ? 'border-amber-400/30' : 'border-amber-900/20'
  } space-y-2.5 backdrop-blur-md`;

  const textLabelClass = `text-xs sm:text-sm font-bold flex items-center gap-1.5 ${
    isDark ? 'text-[#F4EE8E]' : 'text-amber-950'
  }`;

  const miniBadgeClass = `font-mono text-xs sm:text-sm font-black px-2.5 py-1 rounded-lg border self-start sm:self-auto shrink-0 ${
    isDark ? 'text-[#F4EE8E] bg-amber-500/10 border-amber-400/40' : 'text-amber-950 bg-amber-500/15 border-amber-800/30'
  }`;

  const miniBadgeSlateClass = `font-mono text-xs sm:text-sm font-bold px-2.5 py-1 rounded-lg border self-start sm:self-auto shrink-0 ${
    isDark ? 'text-[#F4EE8E] bg-amber-500/10 border-amber-400/40' : 'text-amber-950 bg-amber-500/15 border-amber-800/30'
  }`;

  return (
    <div 
      className={containerClass} 
      id="unified-tariff-calculator"
    >
      {/* Visual top bar glow decorator */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#F4D06F]" />

      {/* Title block */}
      <div className="space-y-2 relative z-10">
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider font-mono border ${
          isDark ? 'bg-amber-500/10 border-amber-400/40 text-[#F4EE8E]' : 'bg-amber-500/15 border-amber-800/30 text-amber-950'
        }`}>
          <Sparkles size={11} className="text-[#D4AF37]" />
          Интеллектуальный расчет окупаемости
        </div>
        <h4 className={`text-xl sm:text-2xl lg:text-3xl font-black tracking-tight leading-none ${
          isDark ? 'text-[#F4EE8E]' : 'text-amber-950'
        }`}>
          ИИ-Калькулятор выгоды и окупаемости (ROI)
        </h4>
        <p className={`text-xs sm:text-sm leading-relaxed max-w-3xl font-medium ${
          isDark ? 'text-[#F4EE8E]/80' : 'text-amber-900'
        }`}>
          Сравните окупаемость двух продуктов и рассчитайте точную выгоду от автоматизации периодических отчетов или контроля целых проектных задач по чек-листам.
        </p>
      </div>

      {/* Product Selection Toggle */}
      <div className={`p-1 rounded-2xl border flex gap-2 w-full max-w-md relative z-10 bg-transparent backdrop-blur-md ${
        isDark ? 'border-amber-400/40' : 'border-amber-800/30'
      }`}>
        <button
          type="button"
          onClick={() => setProductType('raport')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
            productType === 'raport'
              ? 'bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 border border-amber-300 shadow-md font-black'
              : isDark ? 'text-[#F4EE8E] hover:bg-amber-400/10 font-bold' : 'text-amber-950 hover:bg-amber-200/50 font-bold'
          }`}
        >
          📊 ИИ Рапорт (Отчеты)
        </button>
        <button
          type="button"
          onClick={() => setProductType('revisor')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
            productType === 'revisor'
              ? 'bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 border border-amber-300 shadow-md font-black'
              : isDark ? 'text-[#F4EE8E] hover:bg-amber-400/10 font-bold' : 'text-amber-950 hover:bg-amber-200/50 font-bold'
          }`}
        >
          🛡️ ИИ Ревизор (Проекты)
        </button>
      </div>

      {/* TRIAL LIMIT BANNER */}
      <div className={`p-4 rounded-2xl border font-sans text-xs relative z-10 bg-transparent backdrop-blur-md ${
        isDark ? 'border-amber-400/40 text-[#F4EE8E]' : 'border-amber-800/30 text-amber-950'
      }`}>
        {productType === 'raport' ? (
          <div className="flex items-center gap-2.5">
            <span className="text-lg">🎁</span>
            <div>
              <p className={`font-black ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>Бесплатный пробный период ИИ Рапорт:</p>
              <p className={`text-[11px] mt-0.5 ${isDark ? 'text-amber-200/80' : 'text-amber-900'}`}>
                Вам дается <strong className={`font-black ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>60 бесплатных отчетов</strong> на 7 дней для тестирования всех возможностей сервиса.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <span className="text-lg">⚡</span>
            <div>
              <p className={`font-black ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>Бесплатный пробный период ИИ Ревизор:</p>
              <p className={`text-[11px] mt-0.5 ${isDark ? 'text-amber-200/80' : 'text-amber-900'}`}>
                Вам доступно <strong className={`font-black ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>10 проектов и 60 задач бесплатно</strong> на 7 дней со встроенным ИИ-контролем, чек-листами и автопилотом.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Left Column for Inputs, Right Column for Outputs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start relative z-10">
        
        {/* LEFT COLUMN: Inputs */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Period selector */}
          <div className={cardBoxSpace2Class}>
            <div className="flex justify-between items-center flex-wrap gap-2">
              <span className={textLabelClass}>
                <Calendar size={15} className="text-[#D4AF37]" />
                Период подписки (длительность):
              </span>
              {discountPercent > 0 && (
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md font-mono border ${
                  isDark ? 'text-[#F4EE8E] bg-amber-500/20 border-amber-400/30' : 'text-amber-950 bg-amber-500/20 border-amber-800/30'
                }`}>
                  Скидка -{discountPercent}%
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {durations.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setMonths(d.value)}
                  className={`py-2.5 px-1 rounded-xl text-xs font-black transition-all cursor-pointer text-center border ${
                    months === d.value
                      ? 'bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] border-amber-300 text-amber-950 shadow-md font-black'
                      : isDark
                        ? 'bg-transparent border-amber-400/40 text-[#F4EE8E] hover:border-amber-400 font-bold'
                        : 'bg-transparent border-amber-800/30 text-amber-950 hover:border-amber-800 font-bold'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* SLIDERS BASED ON SELECTED PRODUCT TYPE */}
          {productType === 'raport' ? (
            <>
              {/* Sliders for AI-Raport */}
              <div className={cardBoxSpace2Class}>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <span className={textLabelClass}>
                    <Users size={15} className="text-[#D4AF37]" />
                    Количество сотрудников на контроле:
                  </span>
                  <span className={miniBadgeClass}>
                    {employees} чел.
                  </span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="150" 
                  step="1"
                  value={employees}
                  onChange={(e) => setEmployees(parseInt(e.target.value) || 1)}
                  className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-[#D4AF37] ${
                    isDark ? 'bg-black/60' : 'bg-amber-300'
                  }`}
                />
                <div className={`flex justify-between text-[10px] font-mono font-bold px-0.5 ${
                  isDark ? 'text-amber-200/70' : 'text-amber-900'
                }`}>
                  <span>1 сотр.</span>
                  <span>75 сотр.</span>
                  <span>150+ сотр.</span>
                </div>
              </div>

              <div className={cardBoxSpace2Class}>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <span className={textLabelClass}>
                    <Clock size={15} className="text-[#D4AF37]" />
                    Время на ручной отчет сотрудника в неделю:
                  </span>
                  <span className={miniBadgeSlateClass}>
                    {hoursSpentManual} ч.
                  </span>
                </div>
                <input 
                  type="range" 
                  min="0.5" 
                  max="5.0" 
                  step="0.1"
                  value={hoursSpentManual}
                  onChange={(e) => setHoursSpentManual(parseFloat(e.target.value))}
                  className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-[#D4AF37] ${
                    isDark ? 'bg-black/60' : 'bg-amber-300'
                  }`}
                />
                <div className={`flex justify-between text-[10px] font-mono font-bold px-0.5 ${
                  isDark ? 'text-amber-200/70' : 'text-amber-900'
                }`}>
                  <span>30 мин</span>
                  <span>2.5 ч</span>
                  <span>5 ч</span>
                </div>
              </div>

              <div className={cardBoxSpace2Class}>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <span className={textLabelClass}>
                    <Coins size={15} className="text-[#D4AF37]" />
                    Ставка часа руководителя:
                  </span>
                  <span className={miniBadgeSlateClass}>
                    {managerHourlyRate.toLocaleString('ru-RU')} RR / ч
                  </span>
                </div>
                <input 
                  type="range" 
                  min="500" 
                  max="5000" 
                  step="100"
                  value={managerHourlyRate}
                  onChange={(e) => setManagerHourlyRate(parseInt(e.target.value))}
                  className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-[#D4AF37] ${
                    isDark ? 'bg-black/60' : 'bg-amber-300'
                  }`}
                />
                <div className={`flex justify-between text-[10px] font-mono font-bold px-0.5 ${
                  isDark ? 'text-amber-200/70' : 'text-amber-900'
                }`}>
                  <span>500 RR</span>
                  <span>2 500 RR</span>
                  <span>5 000 RR</span>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Sliders for AI-Revisor (Project & Task tracking metrics) */}
              <div className={cardBoxSpace2Class}>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <span className={textLabelClass}>
                    <Users size={15} className="text-[#D4AF37]" />
                    Количество сотрудников в проектах:
                  </span>
                  <span className={miniBadgeClass}>
                    {employees} чел.
                  </span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="150" 
                  step="1"
                  value={employees}
                  onChange={(e) => setEmployees(parseInt(e.target.value) || 1)}
                  className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-[#D4AF37] ${
                    isDark ? 'bg-black/60' : 'bg-amber-300'
                  }`}
                />
                <div className={`flex justify-between text-[10px] font-mono font-bold px-0.5 ${
                  isDark ? 'text-amber-200/70' : 'text-amber-900'
                }`}>
                  <span>1 сотр.</span>
                  <span>75 сотр.</span>
                  <span>150+ сотр.</span>
                </div>
              </div>

              <div className={cardBoxSpace2Class}>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <span className={textLabelClass}>
                    <FolderKanban size={15} className="text-[#D4AF37]" />
                    Количество активных ИИ-проектов:
                  </span>
                  <span className={miniBadgeClass}>
                    {projects} проектов
                  </span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="50" 
                  step="1"
                  value={projects}
                  onChange={(e) => setProjects(parseInt(e.target.value) || 1)}
                  className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-[#D4AF37] ${
                    isDark ? 'bg-black/60' : 'bg-amber-300'
                  }`}
                />
                <div className={`flex justify-between text-[10px] font-mono font-bold px-0.5 ${
                  isDark ? 'text-amber-200/70' : 'text-amber-900'
                }`}>
                  <span>1 проект</span>
                  <span>25 проектов</span>
                  <span>50+ проектов</span>
                </div>
              </div>

              <div className={cardBoxSpace2Class}>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <span className={textLabelClass}>
                    <CheckSquare size={15} className="text-[#D4AF37]" />
                    Среднее кол-во задач на проект в месяц:
                  </span>
                  <span className={miniBadgeSlateClass}>
                    {tasksPerProject} задач
                  </span>
                </div>
                <input 
                  type="range" 
                  min="5" 
                  max="100" 
                  step="5"
                  value={tasksPerProject}
                  onChange={(e) => setTasksPerProject(parseInt(e.target.value) || 5)}
                  className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-[#D4AF37] ${
                    isDark ? 'bg-black/60' : 'bg-amber-300'
                  }`}
                />
                <div className={`flex justify-between text-[10px] font-mono font-bold px-0.5 ${
                  isDark ? 'text-amber-200/70' : 'text-amber-900'
                }`}>
                  <span>5 задач</span>
                  <span>50 задач</span>
                  <span>100 задач</span>
                </div>
              </div>

              <div className={cardBoxSpace2Class}>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <span className={textLabelClass}>
                    <Clock size={15} className="text-[#D4AF37]" />
                    Время ручной проверки 1 задачи (часов):
                  </span>
                  <span className={miniBadgeSlateClass}>
                    {hoursSpentPerTaskChecking} ч.
                  </span>
                </div>
                <input 
                  type="range" 
                  min="0.1" 
                  max="3.0" 
                  step="0.1"
                  value={hoursSpentPerTaskChecking}
                  onChange={(e) => setHoursSpentPerTaskChecking(parseFloat(e.target.value))}
                  className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-[#D4AF37] ${
                    isDark ? 'bg-black/60' : 'bg-amber-300'
                  }`}
                />
                <div className={`flex justify-between text-[10px] font-mono font-bold px-0.5 ${
                  isDark ? 'text-amber-200/70' : 'text-amber-900'
                }`}>
                  <span>6 минут</span>
                  <span>1.5 часа</span>
                  <span>3 часа</span>
                </div>
              </div>

              <div className={cardBoxSpace2Class}>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <span className={textLabelClass}>
                    <Coins size={15} className="text-[#D4AF37]" />
                    Ставка часа руководителя/директора:
                  </span>
                  <span className={miniBadgeSlateClass}>
                    {directorHourlyRate.toLocaleString('ru-RU')} RR / ч
                  </span>
                </div>
                <input 
                  type="range" 
                  min="500" 
                  max="5000" 
                  step="100"
                  value={directorHourlyRate}
                  onChange={(e) => setDirectorHourlyRate(parseInt(e.target.value))}
                  className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-[#D4AF37] ${
                    isDark ? 'bg-black/60' : 'bg-amber-300'
                  }`}
                />
                <div className={`flex justify-between text-[10px] font-mono font-bold px-0.5 ${
                  isDark ? 'text-amber-200/70' : 'text-amber-900'
                }`}>
                  <span>500 RR</span>
                  <span>2 500 RR</span>
                  <span>5 000 RR</span>
                </div>
              </div>
            </>
          )}

        </div>

        {/* RIGHT COLUMN: Results & Checkout */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Efficiency indicators */}
          <div className={`p-4 sm:p-5 rounded-2xl border space-y-3.5 ${
            isDark ? 'border-[#E7C768]/40 bg-transparent' : 'border-amber-800/30 bg-transparent'
          }`}>
            <h5 className={`text-xs font-black flex items-center gap-1.5 tracking-wide uppercase ${
              isDark ? 'text-[#F4EE8E]' : 'text-amber-950'
            }`}>
              <TrendingUp size={14} className="text-[#D4AF37]" />
              Расчет эффективности {productType === 'raport' ? 'ИИ-Рапорт' : 'ИИ-Ревизор'}
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className={`p-3.5 rounded-xl border space-y-1 shadow-sm ${
                isDark ? 'border-[#E7C768]/30 bg-transparent' : 'border-amber-800/30 bg-amber-100/40'
              }`}>
                <span className={`text-[9px] font-bold uppercase block tracking-wider ${
                  isDark ? 'text-amber-200/70' : 'text-amber-900'
                }`}>Сбережем времени</span>
                <span className={`text-base sm:text-lg font-black font-mono block ${
                  isDark ? 'text-[#F4EE8E]' : 'text-amber-950'
                }`}>
                  ~{hoursSavedPerMonth} ч <span className={`text-[10px] font-normal ${isDark ? 'text-amber-200/80' : 'text-amber-900'}`}>/ мес</span>
                </span>
                <span className="text-[9px] text-[#D4AF37] font-bold block">✓ Свобода от рутины</span>
              </div>
              <div className={`p-3.5 rounded-xl border space-y-1 shadow-none backdrop-blur-md ${
                isDark ? 'border-amber-400/30 bg-transparent' : 'border-amber-800/30 bg-amber-100/40'
              }`}>
                <span className={`text-[9px] font-bold uppercase block tracking-wider ${
                  isDark ? 'text-[#F4EE8E]/70' : 'text-amber-900'
                }`}>
                  Высвобожденный бюджет
                </span>
                <span className={`text-base sm:text-lg font-black font-mono block ${
                  isDark ? 'text-[#F4EE8E]' : 'text-amber-950'
                }`}>
                  {budgetSavedPerMonth.toLocaleString('ru-RU')} RR <span className={`text-[10px] font-normal ${isDark ? 'text-[#F4EE8E]/70' : 'text-amber-900'}`}>/ мес</span>
                </span>
                <span className={`text-[9px] font-bold block ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>✓ Окупаемость ИИ</span>
              </div>
            </div>
          </div>

          {/* Pricing calculations details */}
          <div className={`p-4 sm:p-5 rounded-2xl border bg-transparent space-y-3 shadow-none backdrop-blur-md ${
            isDark ? 'border-amber-400/30 text-[#F4EE8E]' : 'border-amber-800/30 text-amber-950'
          }`}>
            <h5 className={`text-xs font-black tracking-wide uppercase ${
              isDark ? 'text-[#F4EE8E]' : 'text-amber-950'
            }`}>
              Стоимость подписки
            </h5>
            <div className={`space-y-2 text-xs ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
              <div className={`flex justify-between items-start gap-4 py-1.5 border-b ${
                isDark ? 'border-amber-400/20' : 'border-amber-800/20'
              }`}>
                <span className={`font-semibold ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                  {productType === 'raport' 
                    ? `Базовый тариф (${employees} сотр. × 290 RR):` 
                    : `Базовый тариф (${employees} сотр. × 690 RR):`
                  }
                </span>
                <span className={`font-mono text-right shrink-0 font-bold ${
                  isDark ? 'text-[#F4EE8E]' : 'text-amber-950'
                }`}>{baseMonthlyPrice.toLocaleString('ru-RU')} RR / мес</span>
              </div>
              {discountPercent > 0 && (
                <div className={`flex justify-between items-start gap-4 py-1.5 border-b font-bold ${
                  isDark ? 'border-amber-400/20 text-[#F4EE8E]' : 'border-amber-800/20 text-amber-950'
                }`}>
                  <span>Скидка за длительность ({discountPercent}%):</span>
                  <span className="font-mono text-right shrink-0">-{Math.round(baseMonthlyPrice * (discountPercent / 100)).toLocaleString('ru-RU')} RR / мес</span>
                </div>
              )}
              <div className={`flex justify-between items-start gap-4 py-1.5 font-bold ${
                isDark ? 'text-[#F4EE8E]' : 'text-amber-950'
              }`}>
                <span>Стоимость с учетом скидки:</span>
                <span className={`font-mono text-right shrink-0 font-black ${
                  isDark ? 'text-[#F4EE8E]' : 'text-amber-950'
                }`}>{discountedMonthlyPrice.toLocaleString('ru-RU')} RR / мес</span>
              </div>
              {months > 1 && (
                <div className={`flex justify-between items-center p-3 rounded-xl border font-bold mt-1 gap-2 ${
                  isDark ? 'border-amber-400/40 bg-amber-500/10 text-[#F4EE8E]' : 'border-amber-800/30 bg-amber-500/15 text-amber-950'
                }`}>
                  <span className="text-xs font-black">Итого к оплате за {months} мес:</span>
                  <span className={`font-mono text-sm sm:text-base text-right shrink-0 font-black ${
                    isDark ? 'text-[#F4EE8E]' : 'text-amber-950'
                  }`}>{totalPeriodCost.toLocaleString('ru-RU')} RR</span>
                </div>
              )}
            </div>
          </div>

          {/* Net Saving & ROI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Net Saving */}
            <div className={`p-4 rounded-2xl border bg-transparent space-y-1 shadow-none backdrop-blur-md ${
              isDark ? 'border-amber-400/30' : 'border-amber-800/30'
            }`}>
              <span className={`text-[9px] font-bold uppercase tracking-wider block ${
                isDark ? 'text-[#F4EE8E]/70' : 'text-amber-900'
              }`}>
                Чистая экономия
              </span>
              <div className={`text-base sm:text-lg font-black font-mono ${
                isDark ? 'text-[#F4EE8E]' : 'text-amber-950'
              }`}>
                +{netSavingPerMonth.toLocaleString('ru-RU')} RR <span className={`text-[10px] font-normal ${
                  isDark ? 'text-[#F4EE8E]/70' : 'text-amber-900'
                }`}>/ мес</span>
              </div>
              <p className={`text-[10px] leading-normal ${
                isDark ? 'text-[#F4EE8E]/70' : 'text-amber-900'
              }`}>
                За вычетом стоимости ИИ.
              </p>
            </div>

            {/* ROI */}
            <div className={`p-4 rounded-2xl border bg-transparent flex flex-col justify-between space-y-2 shadow-none backdrop-blur-md ${
              isDark ? 'border-amber-400/30' : 'border-amber-800/30'
            }`}>
              <span className={`text-[9px] font-bold uppercase tracking-wider block ${
                isDark ? 'text-[#F4EE8E]' : 'text-amber-950'
              }`}>
                Окупаемость ROI
              </span>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 font-black text-xs sm:text-sm font-mono shadow-md self-start">
                ROI {roiPercent}%
              </div>
              <p className={`text-[9px] leading-snug ${
                isDark ? 'text-[#F4EE8E]/70' : 'text-amber-900'
              }`}>
                Окупаемость вложений в первый же месяц.
              </p>
            </div>

          </div>

          {/* CTA Button */}
          <div className="space-y-3 pt-1">
            <button
              type="button"
              onClick={() => onAction && onAction(employees, months, totalPeriodCost, productType)}
              className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 hover:brightness-110 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer font-sans shadow-lg flex items-center justify-between gap-3 text-left font-black border border-amber-300/80"
              id="tariff-calculator-purchase-btn"
            >
              <div className="flex flex-col">
                <span className="text-xs sm:text-sm uppercase tracking-widest font-black leading-none text-amber-950">
                  {actionButtonText}
                </span>
                <span className="text-[11px] sm:text-xs font-bold text-amber-950/90 mt-1.5 font-mono leading-none">
                  На {months} мес. за {totalPeriodCost.toLocaleString('ru-RU')} RR
                </span>
              </div>
              <ArrowRight size={16} className="shrink-0 text-amber-950 bg-white/40 p-0.5 rounded-full" />
            </button>

            <div className={`border p-3 rounded-xl flex items-start gap-2.5 bg-transparent backdrop-blur-md ${
              isDark ? 'border-amber-400/30' : 'border-amber-800/30'
            }`}>
              <Sparkles className="text-[#D4AF37] shrink-0 mt-0.5" size={14} />
              <p className={`text-[10px] leading-normal font-medium ${
                isDark ? 'text-[#F4EE8E]/80' : 'text-amber-900'
              }`}>
                {productType === 'raport' 
                  ? 'Внедрение ИИ Рапорта полностью избавляет руководителей от рутины ручного контроля ежедневных отчетов.'
                  : 'ИИ Ревизор окупается мгновенно, снижая время ручной постановки и контроля проектных задач до 85% благодаря автопилоту.'
                }
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
