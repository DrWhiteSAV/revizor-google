import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Mic, Calendar, TrendingUp, CheckCircle2, AlertCircle, XCircle, 
  Play, Pause, Info, Square, RefreshCw, Volume2, Clock, Award, ThumbsUp, Bell, 
  Trophy, Send, UserCheck, Flame, MessageSquare, Compass, CheckSquare, Smile, FileText, 
  HelpCircle, Phone, Coins, Check, Sliders, ChevronRight, Share2, Shield, Eye, ArrowRight,
  Wifi, Battery, ShieldCheck, CheckSquare2, MapPin
} from 'lucide-react';

type StepId = 
  | 'creation_system' 
  | 'employee_comfort' 
  | 'schedules_shifts' 
  | 'ai_scores' 
  | 'manager_reactions' 
  | 'reminders' 
  | 'gamification' 
  | 'ai_analytics' 
  | 'telegram_delivery'
  | 'revisor_planning'
  | 'revisor_allocation'
  | 'revisor_voice'
  | 'revisor_checklists'
  | 'revisor_gantt'
  | 'revisor_protalk'
  | 'revisor_verification'
  | 'revisor_autopilot'
  | 'revisor_audit';

interface Step {
  id: StepId;
  title: string;
  shortDesc: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

export default function InteractiveFlowSimulator() {
  // Mobile toggle state ('raport' | 'revisor')
  const [mobileActivePhone, setMobileActivePhone] = useState<'raport' | 'revisor'>('raport');

  // Independent Step index pointers (0 to 8)
  const [raportIdx, setRaportIdx] = useState(0);
  const [revisorIdx, setRevisorIdx] = useState(0);

  // Independent Autoplay states
  const [raportAutoplay, setRaportAutoplay] = useState(true);
  const [revisorAutoplay, setRevisorAutoplay] = useState(true);

  // Independent scenario ticks & progress percentages
  const [raportTick, setRaportTick] = useState(0);
  const [revisorTick, setRevisorTick] = useState(0);

  const [raportProgress, setRaportProgress] = useState(0);
  const [revisorProgress, setRevisorProgress] = useState(0);

  // Steps definition for ИИ-РАПОРТ (Left iPhone)
  const raportSteps: Step[] = [
    {
      id: 'creation_system',
      title: '1. Умное Создание',
      shortDesc: 'Сбор голоса, фото и геологика',
      description: 'Сотрудник наговаривает отчет голосом, прикрепляет фото выполненных работ и файлов, а GPS фиксирует координаты.',
      icon: <Sparkles size={14} />,
      color: 'from-amber-400 to-[#D99E41]'
    },
    {
      id: 'employee_comfort',
      title: '2. Комфорт Команды',
      shortDesc: 'Сдача отчета за 2 минуты без рутины',
      description: 'Больше нет скучных бланков. Свободная речь автоматически структурируется ИИ по нужным полям шаблона.',
      icon: <Smile size={14} />,
      color: 'from-amber-400 to-amber-600'
    },
    {
      id: 'schedules_shifts',
      title: '3. Графики и Смены',
      shortDesc: 'Календарь выходов и замен',
      description: 'Контролируйте смены, больничные и отгулы. ИИ сопоставляет графики с фактической сдачей рапортов.',
      icon: <Calendar size={14} />,
      color: 'from-amber-300 to-[#D4AF37]'
    },
    {
      id: 'ai_scores',
      title: '4. Оценки и Советы',
      shortDesc: 'Quality Score и ИИ-наставник',
      description: 'Нейросеть оценивает отчет на содержательность и выдает 3 индивидуальных совета для роста сотрудника.',
      icon: <Award size={14} />,
      color: 'from-[#D4AF37] to-yellow-500'
    },
    {
      id: 'manager_reactions',
      title: '5. Реакции с ИИ',
      shortDesc: 'Рецензии в один клик для лидера',
      description: 'Директор получает краткие саммари отчетов и отправляет умную обратную связь одной кнопкой.',
      icon: <ThumbsUp size={14} />,
      color: 'from-amber-400 to-[#D4AF37]'
    },
    {
      id: 'reminders',
      title: '6. Контроль Сроков',
      shortDesc: 'Умный бот-оповещатель в ТГ',
      description: 'Спустя 15 минут после завершения смены бот вежливо напомнит в Telegram о забытом отчете.',
      icon: <Bell size={14} />,
      color: 'from-[#D4AF37] to-amber-600'
    },
    {
      id: 'gamification',
      title: '7. Награды и Мотивация',
      shortDesc: 'Личные streaks и Блага',
      description: 'Сотрудники зарабатывают баллы, соревнуются в рейтингах и обменивают монеты на реальные призы.',
      icon: <Trophy size={14} />,
      color: 'from-yellow-400 to-amber-500'
    },
    {
      id: 'ai_analytics',
      title: '8. Аналитика Периодов',
      shortDesc: 'Поиск скрытых аномалий',
      description: 'ИИ агрегирует отчеты за неделю, находит сбои в бизнес-процессах и формирует бизнес-инсайты.',
      icon: <TrendingUp size={14} />,
      color: 'from-[#D4AF37] to-amber-600'
    },
    {
      id: 'telegram_delivery',
      title: '9. Доставка в ТГ',
      shortDesc: 'Отправка в чаты отделов',
      description: 'Мгновенная доставка готовых отчетов и уведомлений в Telegram-группу вашей команды с красивой Markdown разметкой.',
      icon: <Send size={14} />,
      color: 'from-amber-400 to-[#D4AF37]'
    }
  ];

  // Steps definition for ИИ-РЕВИЗОР (Right iPhone)
  const revisorSteps: Step[] = [
    {
      id: 'revisor_planning',
      title: '1. ИИ-Планирование',
      shortDesc: 'Декомпозиция целей компании',
      description: 'ИИ декомпозирует глобальную цель компании на проекты, этапы и конкретные контрольные точки.',
      icon: <Sparkles size={14} />,
      color: 'from-amber-400 to-[#D99E41]'
    },
    {
      id: 'revisor_allocation',
      title: '2. Автораспределение',
      shortDesc: 'Умное назначение задач',
      description: 'Нейросеть оценивает компетенции, график работы и текущую загрузку каждого сотрудника для автораспределения.',
      icon: <UserCheck size={14} />,
      color: 'from-amber-400 to-amber-600'
    },
    {
      id: 'revisor_voice',
      title: '3. Регламент по Голосу',
      shortDesc: 'Голосовая оцифровка процессов',
      description: 'Надиктуйте требования свободной речью. ИИ превратит ее в структурированный регламент и авто-задачи.',
      icon: <Mic size={14} />,
      color: 'from-amber-300 to-[#D4AF37]'
    },
    {
      id: 'revisor_checklists',
      title: '4. Умные Чек-листы',
      shortDesc: 'Автогенерация критериев проверки',
      description: 'ИИ автоматически генерирует пошаговые критерии и чек-листы для каждой задачи по вашему регламенту.',
      icon: <Sliders size={14} />,
      color: 'from-[#D4AF37] to-yellow-500'
    },
    {
      id: 'revisor_gantt',
      title: '5. Сроки и Дедлайны',
      shortDesc: 'ИИ Карта Ганта и авто-сдвиги',
      description: 'Автоматический перерасчет всей дорожной карты проекта при сдвиге дедлайна или задержке на одном из этапов.',
      icon: <Calendar size={14} />,
      color: 'from-amber-400 to-[#D4AF37]'
    },
    {
      id: 'revisor_protalk',
      title: '6. Сдача RR',
      shortDesc: 'Приемка отчетов по фото',
      description: 'Исполнитель надиктовывает отчет о проделанной работе и прикладывает фото/файлы результата.',
      icon: <Check size={14} />,
      color: 'from-[#D4AF37] to-amber-600'
    },
    {
      id: 'revisor_verification',
      title: '7. ИИ Верификация',
      shortDesc: 'Проверка качества нейросетью',
      description: 'ИИ сравнивает сданную работу с ТЗ и чек-листом, выявляет отклонения, дефекты и ставит статус.',
      icon: <Eye size={14} />,
      color: 'from-yellow-400 to-amber-500'
    },
    {
      id: 'revisor_autopilot',
      title: '8. Автопилот Процессов',
      shortDesc: 'Авто-переход к новым этапам',
      description: 'При успешном прохождении верификации ИИ автоматически переводит проект на следующий этап.',
      icon: <TrendingUp size={14} />,
      color: 'from-[#D4AF37] to-amber-600'
    },
    {
      id: 'revisor_audit',
      title: '9. Бизнес-Аудит',
      shortDesc: 'Оценка рентабельности и KPI',
      description: 'Сводный ИИ-анализ эффективности команды, рентабельности проекта и рекомендации по оптимизации.',
      icon: <Send size={14} />,
      color: 'from-amber-400 to-[#D4AF37]'
    }
  ];

  // Independent Autoplay Effects
  // RAPORT Autoplay Timer
  useEffect(() => {
    if (!raportAutoplay) return;
    const intervalTime = 100; // 100ms
    const totalTicks = 80;    // 8 seconds total
    const timer = setInterval(() => {
      setRaportProgress((prev) => {
        if (prev >= 100) {
          setRaportIdx((idx) => (idx + 1) % raportSteps.length);
          setRaportTick(0);
          return 0;
        }
        return prev + (100 / totalTicks);
      });
      setRaportTick((prev) => prev + 1);
    }, intervalTime);

    return () => clearInterval(timer);
  }, [raportAutoplay, raportIdx]);

  // REVISOR Autoplay Timer
  useEffect(() => {
    if (!revisorAutoplay) return;
    const intervalTime = 100; // 100ms
    const totalTicks = 80;    // 8 seconds total
    const timer = setInterval(() => {
      setRevisorProgress((prev) => {
        if (prev >= 100) {
          setRevisorIdx((idx) => (idx + 1) % revisorSteps.length);
          setRevisorTick(0);
          return 0;
        }
        return prev + (100 / totalTicks);
      });
      setRevisorTick((prev) => prev + 1);
    }, intervalTime);

    return () => clearInterval(timer);
  }, [revisorAutoplay, revisorIdx]);

  // Reset ticks when manually setting steps
  const selectRaportStep = (idx: number) => {
    setRaportIdx(idx);
    setRaportTick(0);
    setRaportProgress(0);
  };

  const selectRevisorStep = (idx: number) => {
    setRevisorIdx(idx);
    setRevisorTick(0);
    setRevisorProgress(0);
  };

  // Pre-calculated variables for simulations based on ticks
  // Raport simulations variables
  const rStep = raportSteps[raportIdx];
  const rTick = raportTick;

  // Raport: Step 1 (creation_system)
  const step1Uploading = rTick < 25;
  const step1Done = rTick >= 50;

  // Raport: Step 2 (employee_comfort)
  const typedTextLength = Math.min(Math.floor(rTick * 2.5), 140);
  const rawSpeechText = "Закончил смену на точке. Выручка составила 42500 рублей, кассу закрыл без расхождений. Витрина в порядке, все ценники обновил. Завтра нужно принять поставку в 10 утра.";
  const simulatedTypedSpeech = rawSpeechText.slice(0, typedTextLength);
  const step2Parsed = rTick >= 45;

  // Raport: Step 3 (schedules_shifts)
  const scheduleCycle = Math.floor(rTick / 25) % 3;

  // Raport: Step 4 (ai_scores)
  const displayedScore = rTick < 10 ? 0 : Math.min(Math.floor((rTick - 10) * 2.7), 94);
  const showTips = rTick >= 40;

  // Raport: Step 5 (manager_reactions)
  const reactionCycle = Math.floor(rTick / 25) % 3;

  // Raport: Step 6 (reminders)
  const showNotification = rTick >= 35;
  const timeString = rTick < 15 ? "17:59" : rTick < 35 ? "18:00" : "18:15";

  // Raport: Step 7 (gamification)
  const coinAdd = rTick >= 45;

  // Revisor simulations variables
  const revStep = revisorSteps[revisorIdx];
  const revTick = revisorTick;

  return (
    <div className="w-full relative z-20 space-y-8" id="simulator-container">
      
      {/* Mobile Toggle Selector (Visible only on mobile screen) */}
      <div className="flex md:hidden justify-center bg-[#111111]/90 p-1.5 rounded-2xl border border-white/5 w-fit mx-auto shadow-lg" id="mobile-phone-selector">
        <button
          onClick={() => setMobileActivePhone('raport')}
          className={`px-4 py-2 rounded-xl text-xs font-bold font-sans transition-all flex items-center gap-2 ${
            mobileActivePhone === 'raport'
              ? 'bg-[#D4AF37] text-black shadow-[0_0_15px_rgba(212,175,55,0.35)]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles size={13} />
          ИИ Рапорт
        </button>
        <button
          onClick={() => setMobileActivePhone('revisor')}
          className={`px-4 py-2 rounded-xl text-xs font-bold font-sans transition-all flex items-center gap-2 ${
            mobileActivePhone === 'revisor'
              ? 'bg-[#D4AF37] text-black shadow-[0_0_15px_rgba(212,175,55,0.35)]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShieldCheck size={13} />
          ИИ Ревизор
        </button>
      </div>

      {/* Main Dual-iPhone Row / Switch Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 justify-center max-w-5xl mx-auto">
        
        {/* IPHONE 1: ИИ РАПОРТ */}
        <div className={`flex flex-col items-center ${mobileActivePhone === 'raport' ? 'flex' : 'hidden md:flex'}`}>
          <div className="text-center mb-4">
            <span className="text-[10px] font-mono text-zinc-800 uppercase tracking-widest font-black">УПРАВЛЕНИЕ СМЕНОЙ</span>
            <h4 className="text-base font-black text-black">Мобильное приложение ИИ Рапорт</h4>
          </div>

          {/* Realistic iPhone Case Wrapper */}
          <div className="w-[280px] sm:w-[310px] h-[600px] sm:h-[690px] bg-black rounded-[40px] border-[2px] border-[#D4AF37]/65 relative shadow-[0_25px_60px_rgba(0,0,0,0.9)] p-[4px] flex flex-col justify-between overflow-hidden ring-1 ring-white/20">
            
            {/* Elegant premium glass glare overlay and high-end bevel highlights */}
            <div className="absolute inset-0 z-[60] pointer-events-none rounded-[40px] overflow-hidden">
              {/* Diagonal glass reflection */}
              <div className="absolute -top-[20%] -left-[20%] w-[140%] h-[140%] bg-gradient-to-tr from-transparent via-white/[0.14] to-transparent rotate-[28deg] translate-x-[-35%] translate-y-[-35%] mix-blend-overlay" />
              {/* Second light streak */}
              <div className="absolute top-[-50%] right-[-50%] w-[100%] h-[150%] bg-gradient-to-l from-transparent via-white/[0.08] to-transparent rotate-[-45deg] pointer-events-none" />
              {/* Ultra thin bright screen border bezel highlight reflection */}
              <div className="absolute inset-0 rounded-[40px] border border-white/25 pointer-events-none" />
              {/* Glass glare top overlay */}
              <div className="absolute top-[2px] left-[10%] right-[10%] h-[25%] bg-gradient-to-b from-white/[0.12] to-transparent rounded-b-full filter blur-[1px]" />
            </div>

            {/* Volume Buttons & Power button graphic decor */}
            <div className="absolute top-24 -left-[2px] w-[2px] h-12 bg-[#D4AF37]/60 rounded-r-sm" />
            <div className="absolute top-40 -left-[2px] w-[2px] h-12 bg-[#D4AF37]/60 rounded-r-sm" />
            <div className="absolute top-32 -right-[2px] w-[2px] h-16 bg-[#D4AF37]/60 rounded-l-sm" />

            {/* Inner Screen Canvas */}
            <div className="w-full h-full rounded-[37px] bg-[#070707] border border-white/5 flex flex-col justify-between overflow-hidden relative pb-4 pt-10">
              
              {/* Parallax Background Layers */}
              <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                {/* Parallax wireframe grid lines */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(212,175,55,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(212,175,55,0.02)_1px,transparent_1px)] bg-[size:14px_14px]" />
                
                {/* Floating blur points simulating parallax */}
                <motion.div 
                  animate={{ x: [0, 15, -15, 0], y: [0, -20, 20, 0] }}
                  transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                  className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-[#D4AF37]/5 blur-3xl"
                />
                <motion.div 
                  animate={{ x: [0, -15, 15, 0], y: [0, 20, -20, 0] }}
                  transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                  className="absolute -bottom-12 -right-12 w-44 h-44 rounded-full bg-amber-500/5 blur-3xl"
                />
              </div>

              {/* Status Bar */}
              <div className="absolute top-2 left-0 right-0 px-6 flex justify-between items-center text-[9px] font-sans text-slate-300 z-50 pointer-events-none">
                <span className="font-bold">18:02</span>
                <div className="flex items-center gap-1">
                  <Wifi size={10} />
                  <span className="font-mono text-[8px]">5G</span>
                  <Battery size={12} className="text-amber-200" />
                </div>
              </div>

              {/* Notch / Dynamic Island featuring current interactive title */}
              <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-48 h-[24px] bg-black rounded-full z-50 border border-white/10 flex items-center justify-center px-3 shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
                <div className="w-full text-center truncate flex items-center justify-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-amber-400 animate-ping shrink-0" />
                  <span className="text-[9px] font-black text-amber-200 tracking-wide truncate">{rStep.title}</span>
                </div>
              </div>

              {/* Interactive Screen Body */}
              <div className="flex-1 flex flex-col justify-between p-4 relative z-10 overflow-y-auto scrollbar-none">
                
                {/* Description Header Box */}
                <div className="bg-black/45 border border-white/5 p-2.5 rounded-2xl mb-3 text-left">
                  <h5 className="text-[10px] font-black text-amber-300 uppercase tracking-wider mb-0.5">{rStep.shortDesc}</h5>
                  <p className="text-[9.5px] text-slate-200 leading-relaxed font-sans">{rStep.description}</p>
                </div>

                {/* Simulation Component Showcase */}
                <div className="flex-1 flex flex-col justify-center my-1 min-h-[220px]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={rStep.id}
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="w-full text-left"
                    >
                      {/* RAPORT STEP 1: Smart creation */}
                      {rStep.id === 'creation_system' && (
                        <div className="space-y-2.5">
                          {/* Voice recorder simulation panel */}
                          <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between shadow-md">
                            <div className="space-y-0.5">
                              <span className="text-[8px] text-[#D4AF37] font-mono block uppercase">1. Запись аудио:</span>
                              <span className="text-[11px] font-bold text-white flex items-center gap-1">
                                <Mic size={10} className="text-[#D4AF37] animate-pulse" />
                                {step1Uploading ? 'Идет запись...' : 'Аудиофайл готов'}
                              </span>
                              <span className="text-[8px] text-[#FFF8B4]/70 block">Размер: 1.8 Мб • .mp3</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 2, 1, 3, 4, 2, 1, 2].map((val, idx) => (
                                <span 
                                  key={idx} 
                                  className="w-0.5 rounded-full bg-[#D4AF37] transition-all duration-200" 
                                  style={{ 
                                    height: step1Uploading ? `${val * 4.5}px` : '3px',
                                    opacity: step1Uploading ? 1 : 0.4
                                  }} 
                                />
                              ))}
                            </div>
                          </div>

                          {/* Media files checklist */}
                          <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 space-y-1.5 shadow-md">
                            <span className="text-[8px] text-[#D4AF37] font-mono block uppercase">2. Медиа и документы:</span>
                            
                            <div className="flex items-center justify-between text-[9px] bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                              <span className="text-white flex items-center gap-1">📸 photo_check_1.jpg</span>
                              <span className="text-[#D4AF37] font-bold font-mono">100% ✓</span>
                            </div>
                            
                            <div className="flex items-center justify-between text-[9px] bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                              <span className="text-white flex items-center gap-1">📄 check_kassa.pdf</span>
                              <span className={step1Done ? 'text-[#D4AF37] font-bold font-mono' : 'text-[#D4AF37] font-mono animate-pulse'}>
                                {step1Done ? '100% ✓' : 'Загрузка...'}
                              </span>
                            </div>
                          </div>

                          {/* Geoloc marker */}
                          <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center gap-2.5 text-[9px] text-[#FFF8B4]/80">
                            <MapPin size={12} className="text-[#D4AF37] shrink-0" />
                            <div>
                              <p className="text-white font-bold">Координаты GPS:</p>
                              <p className="font-mono text-[8px] text-white/70">55.7558° N, 37.6173° E (Москва)</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* RAPORT STEP 2: comfort */}
                      {rStep.id === 'employee_comfort' && (
                        <div className="space-y-2.5">
                          <div className="bg-white/5 border border-white/10 p-3 rounded-xl space-y-2">
                            <span className="text-[8px] text-[#D4AF37] font-mono block uppercase">🗣️ Записанная речь сотрудника:</span>
                            <div className="bg-black/40 p-2 rounded-lg border border-white/5 text-[10px] text-white min-h-[50px] leading-relaxed">
                              {simulatedTypedSpeech}
                              <span className="animate-pulse font-black text-[#D4AF37]">|</span>
                            </div>
                          </div>

                          {/* Parsing transition */}
                          <div className="bg-white/5 border border-[#D4AF37]/30 p-2 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <RefreshCw size={12} className={`text-[#D4AF37] ${!step2Parsed ? 'animate-spin' : ''}`} />
                              <span className="text-[9px] font-bold text-white">
                                {step2Parsed ? 'Умное Распознавание Завершено!' : 'ИИ структурирует текст...'}
                              </span>
                            </div>
                            <span className="text-[8px] font-mono text-[#FFF8B4]">GPT-4o</span>
                          </div>

                          {/* Parsed JSON fields view */}
                          {step2Parsed && (
                            <motion.div 
                              initial={{ opacity: 0, y: 5 }} 
                              animate={{ opacity: 1, y: 0 }} 
                              className="bg-white/5 border border-white/10 p-2.5 rounded-xl space-y-1 text-[9px]"
                            >
                              <div className="flex justify-between border-b border-white/5 pb-1"><span className="text-[#FFF8B4]/80">Выручка за смену:</span><strong className="text-[#D4AF37]">42 500 руб.</strong></div>
                              <div className="flex justify-between border-b border-white/5 pb-1"><span className="text-[#FFF8B4]/80">Аномалии кассы:</span><strong className="text-white">Разрешено (0)</strong></div>
                              <div className="flex justify-between"><span className="text-[#FFF8B4]/80">Планы / Задачи:</span><strong className="text-white">Сдать смену, принять ТТ</strong></div>
                            </motion.div>
                          )}
                        </div>
                      )}

                      {/* RAPORT STEP 3: calendars */}
                      {rStep.id === 'schedules_shifts' && (
                        <div className="space-y-2.5">
                          <div className="bg-white/5 border border-white/10 p-2.5 rounded-xl space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-[8px] text-[#D4AF37] font-mono uppercase">Календарь Смен</span>
                              <span className="text-[8px] bg-white/10 text-[#FFF8B4] px-1.5 py-0.5 rounded">Июль 2026</span>
                            </div>
                            <div className="grid grid-cols-7 gap-1 text-center text-[8px] font-mono">
                              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => (
                                <span key={d} className="text-[#FFF8B4]/60 font-bold">{d}</span>
                              ))}
                              {Array.from({ length: 14 }).map((_, idx) => {
                                const dayNum = idx + 1;
                                let bgClass = "bg-white/5 border border-white/5 text-white/70";
                                if (dayNum === 7) bgClass = "bg-white/15 border border-[#D4AF37]/30 text-white font-bold";
                                if (dayNum === 8) bgClass = "bg-white/5 border border-white/10 text-white/50 font-bold";
                                if (dayNum === 12) bgClass = "bg-white/15 border border-[#D4AF37]/30 text-[#D4AF37] font-bold";
                                return (
                                  <div key={idx} className={`p-1.5 rounded-md ${bgClass} flex flex-col items-center justify-between h-8`}>
                                    <span>{dayNum}</span>
                                    <span className="text-[6px] scale-75">
                                      {dayNum === 7 ? 'СМЕНА' : dayNum === 8 ? 'БОЛ' : dayNum === 12 ? 'ОТП' : 'ВЫХ'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="bg-white/5 border border-[#D4AF37]/20 p-2 rounded-xl text-[9px] text-white space-y-1">
                            <span className="text-[8px] text-[#D4AF37] font-mono block uppercase">🤖 Сверка ИИ по графикам:</span>
                            <p className="leading-snug">
                              {scheduleCycle === 0 && "⚪ 7 Июля: Сотрудник Артем сдал отчет точно в срок. Нарушений нет."}
                              {scheduleCycle === 1 && "⚪ 8 Июля: Больничный подтвержден. ИИ зафиксировал автозамену."}
                              {scheduleCycle === 2 && "✨ 12 Июля: Зарегистрирован отпуск. Смена переведена в резерв."}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* RAPORT STEP 4: scores */}
                      {rStep.id === 'ai_scores' && (
                        <div className="space-y-2.5">
                          <div className="bg-white/5 border border-white/10 p-3 rounded-xl space-y-3 shadow-md">
                            <div className="flex justify-between items-center">
                              <span className="text-[8px] text-[#D4AF37] font-mono uppercase">Качество отчета</span>
                              <span className="text-[8px] font-mono font-bold bg-[#D4AF37]/10 text-[#FFF8B4] px-1.5 py-0.5 rounded">ИИ-Ревизор</span>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="relative w-14 h-14 shrink-0 flex items-center justify-center rounded-full border-2 border-[#D4AF37]/20 bg-black/40">
                                <span className="text-sm font-black font-mono text-[#FFF8B4]">{displayedScore}%</span>
                                <div className="absolute inset-0 rounded-full border-2 border-[#D4AF37] border-t-transparent animate-spin-slow" />
                              </div>
                              <div className="space-y-0.5">
                                <p className="text-[10px] font-bold text-white">Quality Score</p>
                                <p className="text-[8px] text-white/70">Оценка на основе полноты метрик и фотофиксации</p>
                              </div>
                            </div>
                          </div>

                          {showTips && (
                            <motion.div 
                              initial={{ opacity: 0, y: 5 }} 
                              animate={{ opacity: 1, y: 0 }} 
                              className="bg-white/5 border border-[#D4AF37]/20 p-2.5 rounded-xl space-y-1.5 text-[9px]"
                            >
                              <span className="text-[8px] text-[#FFF8B4] font-mono block uppercase">🎓 ИИ-Советы сотруднику:</span>
                              <div className="space-y-1 text-white">
                                <p>• Сделайте фото фасада с более близкого ракурса (улица)</p>
                                <p>• Уточните сумму возвратов по безналичному расчету</p>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      )}

                      {/* RAPORT STEP 5: manager_reactions */}
                      {rStep.id === 'manager_reactions' && (
                        <div className="space-y-2.5">
                          <div className="bg-white/5 border border-white/10 p-3 rounded-xl space-y-1.5">
                            <span className="text-[8px] text-[#D4AF37] font-mono block uppercase">📱 Панель Директора:</span>
                            <div className="p-2 bg-black/30 rounded-lg text-[9.5px] italic text-white">
                              {reactionCycle === 0 && "«Отличная смена! Выручка супер. Объявляю благодарность за чистую кассу!»"}
                              {reactionCycle === 1 && "«Внимание, зафиксировано отклонение по регламенту выкладки. Прошу переделать.»"}
                              {reactionCycle === 2 && "«Спасибо за обратную связь. Направил электрика для устранения неполадок.»"}
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-1.5 text-center">
                            <div className={`p-1.5 rounded-lg border text-[9px] transition-all ${reactionCycle === 0 ? 'bg-white/10 border-[#D4AF37]/30 text-[#D4AF37] font-bold scale-[1.02]' : 'bg-white/5 border-white/5 text-white/70'}`}>
                              👍 Хвала ИИ
                            </div>
                            <div className={`p-1.5 rounded-lg border text-[9px] transition-all ${reactionCycle === 1 ? 'bg-white/5 border border-white/10 text-white font-bold scale-[1.02]' : 'bg-white/5 border-white/5 text-white/70'}`}>
                              ⚠️ Замечание
                            </div>
                            <div className={`p-1.5 rounded-lg border text-[9px] transition-all ${reactionCycle === 2 ? 'bg-white/10 border-[#D4AF37]/30 text-[#D4AF37] font-bold scale-[1.02]' : 'bg-white/5 border-white/5 text-white/70'}`}>
                              💡 Поддержка
                            </div>
                          </div>
                        </div>
                      )}

                      {/* RAPORT STEP 6: reminders */}
                      {rStep.id === 'reminders' && (
                        <div className="space-y-2.5">
                          <div className="bg-white/5 border border-white/10 p-3 rounded-xl space-y-1.5">
                            <div className="flex justify-between text-[8px] text-white/60 font-mono uppercase">
                              <span>Напоминания ботом</span>
                              <span>Время: {timeString}</span>
                            </div>
                            <div className="flex justify-between text-[10px] items-center p-1.5 bg-black/30 rounded-lg">
                              <span>Выход из смены:</span>
                              <span className="font-bold text-white">18:00</span>
                            </div>
                          </div>

                          {showNotification ? (
                            <motion.div 
                              initial={{ opacity: 0, x: -10 }} 
                              animate={{ opacity: 1, x: 0 }} 
                              className="p-2.5 bg-white/5 border border-[#D4AF37]/20 rounded-xl space-y-1.5"
                            >
                              <div className="flex justify-between items-center text-[8px] text-[#FFF8B4] font-bold font-mono">
                                <span>🤖 RR-БОТ: СРОКИ ОТЧЕТА</span>
                                <span>18:15 (через 15 мин)</span>
                              </div>
                              <p className="text-[9.5px] text-white leading-normal">
                                📢 <strong>Артем</strong>, твоя смена окончена in 18:00! Пожалуйста, отправь ИИ-Рапорт за 7 июля, чтобы сохранить ежедневный стрик 🔥.
                              </p>
                            </motion.div>
                          ) : (
                            <p className="text-[9px] text-[#FFF8B4]/60 italic text-center">Ожидание дедлайна сдачи...</p>
                          )}
                        </div>
                      )}

                      {/* RAPORT STEP 7: gamification */}
                      {rStep.id === 'gamification' && (
                        <div className="space-y-2.5">
                          <div className="bg-white/5 border border-white/10 p-2.5 rounded-xl space-y-1.5">
                            <span className="text-[8px] text-[#D4AF37] font-mono block uppercase">Личный Прогресс:</span>
                            
                            <div className="flex justify-between items-center text-[10px] bg-black/30 p-2 rounded-lg">
                              <span className="flex items-center gap-1">🔥 Ежедневный стрик:</span>
                              <strong className="text-[#D4AF37] font-black">14 Дней подряд!</strong>
                            </div>

                            <div className="flex justify-between items-center text-[10px] bg-black/30 p-2 rounded-lg">
                              <span className="flex items-center gap-1">🪙 Баланс монет:</span>
                              <div className="flex items-center gap-1">
                                <strong className="text-white">2,450</strong>
                                {coinAdd && (
                                  <motion.span 
                                    initial={{ opacity: 0, y: 5 }} 
                                    animate={{ opacity: 1, y: -5 }} 
                                    className="text-[#D4AF37] text-[8px] font-bold"
                                  >
                                    +50 монет!
                                  </motion.span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="p-2 bg-white/5 border border-[#D4AF37]/20 rounded-xl text-[9.5px] text-center text-white">
                            🎁 Монеты можно обменять в <strong>Магазине Благ</strong> на мерч, кофе или премию!
                          </div>
                        </div>
                      )}

                      {/* RAPORT STEP 8: ai_analytics */}
                      {rStep.id === 'ai_analytics' && (
                        <div className="space-y-2.5">
                          <div className="bg-white/5 border border-white/10 p-3 rounded-xl space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-[8px] text-[#D4AF37] font-mono uppercase">ИИ-АНАЛИТИКА ПЕРИОДА</span>
                              <span className="text-[8px] text-white/60">Недельный отчет</span>
                            </div>
                            
                            <div className="bg-black/40 p-2 rounded-lg space-y-1 text-[9px] text-white leading-relaxed">
                              <p className="border-b border-white/5 pb-1"><strong className="text-[#FFF8B4]">Аномалия:</strong> Снижение выручки по вторникам на 15% во время дождей.</p>
                              <p><strong className="text-[#FFF8B4]">Решение:</strong> ИИ рекомендует запускать акцию «Кофе + Донат» в дождливые часы.</p>
                            </div>
                          </div>

                          <div className="bg-white/5 border border-[#D4AF37]/20 p-2 rounded-xl text-center text-[9px] text-[#FFF8B4] font-bold">
                            📈 Экономия за счет автоматической оптимизации: до 40к в месяц.
                          </div>
                        </div>
                      )}

                      {/* RAPORT STEP 9: telegram_delivery */}
                      {rStep.id === 'telegram_delivery' && (
                        <div className="space-y-2.5">
                          <div className="bg-white/5 border border-white/10 p-3 rounded-xl space-y-2">
                            <div className="flex justify-between items-center text-[8px] text-[#D4AF37] font-mono font-bold">
                              <span>✈️ ОПОВЕЩЕНИЕ В TELEGRAM</span>
                              <span>Мгновенно</span>
                            </div>
                            
                            <div className="bg-black/30 p-2 rounded-lg text-[9px] font-mono text-white space-y-1">
                              <p className="text-white font-bold">📊 ОТЧЕТ СМЕНЫ: АРТЕМ К.</p>
                              <p>• Выручка: 42,500 руб. (Аномалий нет)</p>
                              <p>• Смена закрыта: 18:00 ✓</p>
                              <p>• Quality Score: 94% ★</p>
                            </div>
                          </div>

                          <p className="text-[8px] text-white/60 text-center font-mono">
                            Отправлено во внутренний чат кофеен Telegram.
                          </p>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Navigation and Autoplay controls within the iPhone */}
                <div className="mt-3 pt-3 border-t border-white/5 space-y-2 relative z-10">
                  {/* Slim Progress Bar */}
                  <div className="w-full h-[2px] bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="bg-amber-400 h-full transition-all duration-100 ease-linear" 
                      style={{ width: `${raportProgress}%` }}
                    />
                  </div>

                  {/* 9 Selectable Dots for Steps */}
                  <div className="flex justify-between items-center px-1">
                    <div className="flex gap-1">
                      {raportSteps.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => selectRaportStep(idx)}
                          className={`w-1.5 h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                            raportIdx === idx ? 'bg-amber-400 scale-125' : 'bg-white/20 hover:bg-white/45'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[8px] font-mono text-slate-400">Шаг {raportIdx + 1} из 9</span>
                  </div>

                  {/* Interactive Button Bar */}
                  <div className="flex justify-between items-center bg-black/40 p-1 rounded-xl border border-white/5">
                    <button
                      onClick={() => selectRaportStep((raportIdx - 1 + raportSteps.length) % raportSteps.length)}
                      className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <ChevronRight size={14} className="rotate-180" />
                    </button>
                    <button
                      onClick={() => setRaportAutoplay(!raportAutoplay)}
                      className="px-2 py-0.5 text-[8px] font-black uppercase text-amber-200 bg-amber-500/10 rounded-md flex items-center gap-1 border border-amber-400/20 cursor-pointer hover:bg-amber-500/20 transition-all"
                    >
                      {raportAutoplay ? <Pause size={8} fill="currentColor" /> : <Play size={8} fill="currentColor" />}
                      {raportAutoplay ? 'Пауза' : 'Авто'}
                    </button>
                    <button
                      onClick={() => selectRaportStep((raportIdx + 1) % raportSteps.length)}
                      className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* IPHONE 2: ИИ РЕВИЗОР */}
        <div className={`flex flex-col items-center ${mobileActivePhone === 'revisor' ? 'flex' : 'hidden md:flex'}`}>
          <div className="text-center mb-4">
            <span className="text-[10px] font-mono text-zinc-800 uppercase tracking-widest font-black">АВТОПИЛОТ БИЗНЕСА</span>
            <h4 className="text-base font-black text-black">Управление проектами ИИ Ревизор</h4>
          </div>

          {/* Realistic iPhone Case Wrapper */}
          <div className="w-[280px] sm:w-[310px] h-[600px] sm:h-[690px] bg-black rounded-[40px] border-[2px] border-[#D4AF37]/65 relative shadow-[0_25px_60px_rgba(0,0,0,0.9)] p-[4px] flex flex-col justify-between overflow-hidden ring-1 ring-white/20">
            
            {/* Elegant premium glass glare overlay and high-end bevel highlights */}
            <div className="absolute inset-0 z-[60] pointer-events-none rounded-[40px] overflow-hidden">
              {/* Diagonal glass reflection */}
              <div className="absolute -top-[20%] -left-[20%] w-[140%] h-[140%] bg-gradient-to-tr from-transparent via-white/[0.14] to-transparent rotate-[28deg] translate-x-[-35%] translate-y-[-35%] mix-blend-overlay" />
              {/* Second light streak */}
              <div className="absolute top-[-50%] right-[-50%] w-[100%] h-[150%] bg-gradient-to-l from-transparent via-white/[0.08] to-transparent rotate-[-45deg] pointer-events-none" />
              {/* Ultra thin bright screen border bezel highlight reflection */}
              <div className="absolute inset-0 rounded-[40px] border border-white/25 pointer-events-none" />
              {/* Glass glare top overlay */}
              <div className="absolute top-[2px] left-[10%] right-[10%] h-[25%] bg-gradient-to-b from-white/[0.12] to-transparent rounded-b-full filter blur-[1px]" />
            </div>

            {/* Volume Buttons & Power button graphic decor */}
            <div className="absolute top-24 -left-[2px] w-[2px] h-12 bg-[#D4AF37]/60 rounded-r-sm" />
            <div className="absolute top-40 -left-[2px] w-[2px] h-12 bg-[#D4AF37]/60 rounded-r-sm" />
            <div className="absolute top-32 -right-[2px] w-[2px] h-16 bg-[#D4AF37]/60 rounded-l-sm" />

            {/* Inner Screen Canvas */}
            <div className="w-full h-full rounded-[37px] bg-[#070707] border border-white/5 flex flex-col justify-between overflow-hidden relative pb-4 pt-10">
              
              {/* Parallax Background Layers */}
              <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                {/* Parallax wireframe grid lines */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(212,175,55,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(212,175,55,0.02)_1px,transparent_1px)] bg-[size:14px_14px]" />
                
                {/* Floating blur points simulating parallax */}
                <motion.div 
                  animate={{ x: [0, -15, 15, 0], y: [0, 20, -20, 0] }}
                  transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
                  className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#D4AF37]/5 blur-3xl"
                />
                <motion.div 
                  animate={{ x: [0, 15, -15, 0], y: [0, -20, 20, 0] }}
                  transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                  className="absolute -bottom-12 -left-12 w-44 h-44 rounded-full bg-amber-500/5 blur-3xl"
                />
              </div>

              {/* Status Bar */}
              <div className="absolute top-2 left-0 right-0 px-6 flex justify-between items-center text-[9px] font-sans text-slate-300 z-50 pointer-events-none">
                <span className="font-bold">18:02</span>
                <div className="flex items-center gap-1">
                  <Wifi size={10} />
                  <span className="font-mono text-[8px]">5G</span>
                  <Battery size={12} className="text-[#FFF8B4]" />
                </div>
              </div>

              {/* Notch / Dynamic Island featuring current interactive title */}
              <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-48 h-[24px] bg-black rounded-full z-50 border border-white/10 flex items-center justify-center px-3 shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
                <div className="w-full text-center truncate flex items-center justify-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-[#D4AF37] animate-ping shrink-0" />
                  <span className="text-[9px] font-black text-[#FFF8B4] tracking-wide truncate">{revStep.title}</span>
                </div>
              </div>

              {/* Interactive Screen Body */}
              <div className="flex-1 flex flex-col justify-between p-4 relative z-10 overflow-y-auto scrollbar-none">
                
                {/* Description Header Box */}
                <div className="bg-black/45 border border-white/5 p-2.5 rounded-2xl mb-3 text-left">
                  <h5 className="text-[10px] font-black text-[#FFF8B4] uppercase tracking-wider mb-0.5">{revStep.shortDesc}</h5>
                  <p className="text-[9.5px] text-white leading-relaxed font-sans">{revStep.description}</p>
                </div>

                {/* Simulation Component Showcase */}
                <div className="flex-1 flex flex-col justify-center my-1 min-h-[220px]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={revStep.id}
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="w-full text-left animate-fade-in"
                    >
                      {/* REVISOR STEP 1: planning */}
                      {revStep.id === 'revisor_planning' && (
                        <div className="space-y-2.5">
                          <div className="bg-black/40 p-2.5 rounded-xl border border-white/5 space-y-1.5">
                            <span className="text-[8px] text-[#D4AF37] font-mono block uppercase">🎯 Глобальная Цель:</span>
                            <p className="text-[10px] font-bold text-white bg-white/5 p-2 rounded-lg border border-white/5 leading-snug">
                              "Открыть новый филиал кофейни за 30 дней и запустить продажи"
                            </p>
                          </div>
                          
                          <div className="text-[8px] text-white/60 font-bold uppercase tracking-wider text-center">↓ ИИ-декомпозиция на этапы ↓</div>
                          
                          <div className="grid grid-cols-3 gap-1 text-center text-[8px] font-sans">
                            <div className="p-1 bg-white/5 border border-[#D4AF37]/20 rounded-lg">
                              <span className="block text-[#FFF8B4] font-bold">Этап 1</span>
                              <span className="text-[7.5px] text-white">Ремонт</span>
                            </div>
                            <div className="p-1 bg-white/5 border border-[#D4AF37]/20 rounded-lg animate-pulse">
                              <span className="block text-[#FFF8B4] font-bold">Этап 2</span>
                              <span className="text-[7.5px] text-white">Закупки</span>
                            </div>
                            <div className="p-1 bg-white/5 border border-[#D4AF37]/20 rounded-lg">
                              <span className="block text-[#FFF8B4] font-bold">Этап 3</span>
                              <span className="text-[7.5px] text-white">Старт</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* REVISOR STEP 2: allocation */}
                      {revStep.id === 'revisor_allocation' && (
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between p-1.5 bg-white/5 border border-white/5 rounded-xl text-[9px]">
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center font-bold text-[8px] text-[#FFF8B4]">АК</div>
                                <span className="text-white font-bold">Артем К. (Монтажник)</span>
                              </div>
                              <span className="text-[7.5px] px-1.5 py-0.5 rounded bg-white/10 border border-[#D4AF37]/30 text-[#D4AF37] font-mono font-bold">Свободен</span>
                            </div>

                            <div className="flex items-center justify-between p-1.5 bg-white/5 border border-white/5 rounded-xl text-[9px]">
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center font-bold text-[8px] text-[#FFF8B4]">ЕП</div>
                                <span className="text-white font-bold">Елена П. (Снабжение)</span>
                              </div>
                              <span className="text-[7.5px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/50 font-mono font-bold">Занята</span>
                            </div>
                          </div>

                          <div className="p-2 bg-white/5 border border-[#D4AF37]/20 rounded-xl text-[8.5px] text-white leading-snug">
                            💡 <strong>Решение ИИ:</strong> Задача «Монтаж вывески» автоматически назначена на Артема К. с учетом загрузки и навыков.
                          </div>
                        </div>
                      )}

                      {/* REVISOR STEP 3: voice */}
                      {revStep.id === 'revisor_voice' && (
                        <div className="space-y-2">
                          <div className="bg-white/5 p-2 rounded-xl border border-white/10 space-y-1.5 text-[9px]">
                            <span className="text-[8px] text-[#D4AF37] font-mono block uppercase">🎙️ Голосовая команда директора:</span>
                            <p className="text-white italic leading-normal bg-black/40 p-1.5 rounded-lg">
                              "Смонтировать неоновую вывеску на фасад, подключить к диммеру и загерметизировать."
                            </p>
                          </div>
                          
                          <div className="p-2 bg-white/5 border border-[#D4AF37]/20 rounded-xl space-y-1 text-[8.5px]">
                            <span className="text-[8px] text-[#D4AF37] font-mono block uppercase">🤖 Сформировано ИИ-ТЗ:</span>
                            <p className="text-white">📋 <strong>Задача:</strong> Монтаж фасадной вывески</p>
                            <p className="text-white">🛠️ <strong>Условия:</strong> Ровная навеска, герметизация контактов</p>
                          </div>
                        </div>
                      )}

                      {/* REVISOR STEP 4: checklists */}
                      {revStep.id === 'revisor_checklists' && (
                        <div className="space-y-2 text-[9px]">
                          <div className="bg-black/40 p-2.5 rounded-xl border border-[#D4AF37]/20 space-y-1.5">
                            <span className="text-[8px] text-[#D4AF37] font-mono block uppercase">📋 ЧЕК-ЛИСТ ПРИЕМКИ ДЛЯ «ВЫВЕСКИ»:</span>
                            <div className="space-y-1 text-white">
                              <p className="flex items-center gap-1.5">🔸 <span>Проверить геометрию вывески по уровню</span></p>
                              <p className="flex items-center gap-1.5">🔸 <span>Замерить изоляцию контактов муфтами</span></p>
                              <p className="flex items-center gap-1.5">🔸 <span>Проверить регулировку яркости диммером</span></p>
                              <p className="flex items-center gap-1.5">🔸 <span>Сделать фотоотчет с 3 ракурсов в темноте</span></p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* REVISOR STEP 5: gantt */}
                      {revStep.id === 'revisor_gantt' && (
                        <div className="space-y-2 text-[9px]">
                          <div className="bg-white/5 p-2.5 rounded-xl border border-white/5 space-y-2">
                            <span className="text-[8px] text-[#D4AF37] font-mono uppercase">Диаграмма Ганта ИИ</span>
                            
                            <div className="space-y-1.5">
                              <div>
                                <div className="flex justify-between text-[8px] text-white/60"><span>Этап 1: Ремонт фасада</span> <span className="text-[#D4AF37]">Завершено</span></div>
                                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-0.5">
                                  <div className="bg-white h-full w-full" />
                                </div>
                              </div>
                              <div>
                                <div className="flex justify-between text-[8px] text-white/60"><span>Этап 2: Монтаж вывески</span> <span>Сдвиг на 14.07 (Авто)</span></div>
                                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-0.5">
                                  <div className="bg-[#D4AF37] h-full w-2/3" />
                                </div>
                              </div>
                            </div>
                          </div>

                          <p className="text-[8px] text-[#D4AF37] text-center italic">При сдвиге сроков ИИ автоматически корректирует дедлайны!</p>
                        </div>
                      )}

                      {/* REVISOR STEP 6: protalk */}
                      {revStep.id === 'revisor_protalk' && (
                        <div className="space-y-2 text-[9px]">
                          <div className="bg-white/5 p-2.5 rounded-xl border border-white/5 space-y-1.5">
                            <span className="text-[8px] text-[#D4AF37] font-mono uppercase">Загрузка работы сотрудником</span>
                            
                            <div className="p-2 bg-black/40 rounded-lg text-white space-y-1">
                              <p>📋 <strong>Исполнитель:</strong> Артем К.</p>
                              <p className="text-[#D4AF37]">✓ Загружено фото результата (фасад)</p>
                              <p className="text-[#D4AF37]">✓ Загружена схема подключения диммера</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* REVISOR STEP 7: verification */}
                      {revStep.id === 'revisor_verification' && (
                        <div className="space-y-2 text-[9px]">
                          <div className="bg-black/50 p-2.5 rounded-xl border border-[#D4AF37]/25 space-y-2">
                            <div className="flex justify-between text-[8px] text-[#D4AF37] font-mono uppercase">
                              <span>🤖 ИИ-ВЕРИФИКАТОР</span>
                              <span className="text-white animate-pulse">АНАЛИЗ...</span>
                            </div>
                            
                            <div className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-white leading-normal">
                              🔍 <strong>Сверка фото:</strong> Вывеска закреплена ровно (отклонение 0.2°). Диммер зафиксирован на фото. Влагозащита проводов подтверждена.
                            </div>
                            
                            <div className="text-center font-bold text-[#D4AF37] border border-[#D4AF37]/30 py-1 bg-white/5 rounded-lg">
                              ✓ ВЕРИФИКАЦИЯ ПРОЙДЕНА (А+)
                            </div>
                          </div>
                        </div>
                      )}

                      {/* REVISOR STEP 8: autopilot */}
                      {revStep.id === 'revisor_autopilot' && (
                        <div className="space-y-2 text-[9px]">
                          <div className="bg-black/50 p-2.5 rounded-xl border border-[#D4AF37]/25 space-y-1.5">
                            <div className="flex justify-between text-[8px] text-[#D4AF37] font-mono uppercase">
                              <span>🤖 ИИ-АВТОПИЛОТ</span>
                              <span className="text-[#FFF8B4] font-bold animate-pulse">АКТИВАЦИЯ 🚀</span>
                            </div>
                            
                            <div className="p-2 bg-white/5 border border-[#D4AF37]/25 rounded-lg space-y-1 text-white">
                              <p>📢 Задача <strong>«Монтаж вывески»</strong> верифицирована ИИ и закрыта!</p>
                              <p>🚀 Запущен этап 3 <strong>«Закупки»</strong>. Задачи распределены Елене П.</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* REVISOR STEP 9: audit */}
                      {revStep.id === 'revisor_audit' && (
                        <div className="space-y-2 text-[9px]">
                          <div className="bg-black/40 p-2.5 rounded-xl border border-white/5 space-y-2">
                            <span className="text-[8px] text-[#D4AF37] font-mono uppercase">Итоговый бизнес-аудит кофейни</span>
                            
                            <div className="grid grid-cols-2 gap-1.5 text-center font-mono">
                              <div className="p-1.5 bg-white/5 rounded-lg">
                                <span className="text-white/60 text-[7px] uppercase">Сэкономлено</span>
                                <p className="text-white font-bold">38 часов (14%)</p>
                              </div>
                              <div className="p-1.5 bg-white/5 rounded-lg">
                                <span className="text-white/60 text-[7px] uppercase">Индекс Качества</span>
                                <p className="text-[#FFF8B4] font-bold">96.4 / 100</p>
                              </div>
                            </div>
                            
                            <p className="text-[8px] text-white/80 italic text-center">Все задачи закрыты строго по регламенту. Дефектов 0.</p>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Navigation and Autoplay controls within the iPhone */}
                <div className="mt-3 pt-3 border-t border-white/5 space-y-2 relative z-10">
                  {/* Slim Progress Bar */}
                  <div className="w-full h-[2px] bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="bg-[#D4AF37] h-full transition-all duration-100 ease-linear" 
                      style={{ width: `${revisorProgress}%` }}
                    />
                  </div>

                  {/* 9 Selectable Dots for Steps */}
                  <div className="flex justify-between items-center px-1">
                    <div className="flex gap-1">
                      {revisorSteps.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => selectRevisorStep(idx)}
                          className={`w-1.5 h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                            revisorIdx === idx ? 'bg-[#D4AF37] scale-125' : 'bg-white/20 hover:bg-white/45'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[8px] font-mono text-white/60">Шаг {revisorIdx + 1} из 9</span>
                  </div>

                  {/* Interactive Button Bar */}
                  <div className="flex justify-between items-center bg-black/40 p-1 rounded-xl border border-white/5">
                    <button
                      onClick={() => selectRevisorStep((revisorIdx - 1 + revisorSteps.length) % revisorSteps.length)}
                      className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <ChevronRight size={14} className="rotate-180" />
                    </button>
                    <button
                      onClick={() => setRevisorAutoplay(!revisorAutoplay)}
                      className="px-2 py-0.5 text-[8px] font-black uppercase text-[#FFF8B4] bg-white/10 rounded-md flex items-center gap-1 border border-[#D4AF37]/30 cursor-pointer hover:bg-white/20 transition-all"
                    >
                      {revisorAutoplay ? <Pause size={8} fill="currentColor" /> : <Play size={8} fill="currentColor" />}
                      {revisorAutoplay ? 'Пауза' : 'Авто'}
                    </button>
                    <button
                      onClick={() => selectRevisorStep((revisorIdx + 1) % revisorSteps.length)}
                      className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

      </div>



    </div>
  );
}
