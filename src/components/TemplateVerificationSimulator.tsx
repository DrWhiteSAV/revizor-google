import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, Image, Mic, MapPin, Sparkles, CheckCircle2, Play, Pause, 
  RotateCcw, ChevronRight, ChevronLeft, ShieldCheck, Eye, ClipboardCheck
} from 'lucide-react';
import { DESIGN_TOKENS } from '../styles/design-tokens';

interface TemplateVerificationSimulatorProps {
  templateId: string;
  templateTitle: string;
}

export default function TemplateVerificationSimulator({ templateId, templateTitle }: TemplateVerificationSimulatorProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [typingText, setTypingText] = useState('');
  const [pulseWave, setPulseWave] = useState(false);

  // Dynamic template-specific texts
  const getSimulatedData = () => {
    switch (templateId) {
      case 'tpl-1': // Обзвон
        return {
          text: 'Переговоры проведены успешно. Клиент выразил заинтересованность в подключении тарифа "Бизнес Плюс" на 15 сотрудников. Скрипт отработан в полном объеме, возражения по цене нейтрализованы.',
          docName: 'soglasovannyi_reklamnyi_briket.pdf',
          docSize: '840 КБ',
          imageDesc: 'Скриншот CRM карточки сделки с активным тегом "SQL Лид"',
          audioDesc: 'Разговор записан. ИИ обнаружил теплый вежливый тон, четкий темп речи и отсутствие пауз.',
          coords: 'IP-Телефония SIP: 192.168.4.155 (Внутренний порт 443)',
          score: 95,
          feedback: 'Отличная отработка возражений! Тембр голоса уверенный, вежливость на высоте.'
        };
      case 'tpl-2': // Найм персонала
        return {
          text: 'Соискатель прошел технический скрининг и проверку службы безопасности. Оффер сформирован на позицию Старшего Инженера с окладом по регламенту HR-4. Кандидат готов к выходу с 1-го числа.',
          docName: 'podpisannyi_offer_and_resume.pdf',
          docSize: '1.8 МБ',
          imageDesc: 'Сканированная копия паспорта кандидата с подтвержденной подписью',
          audioDesc: 'Голосовой протокол HR-интервью оцифрован. Свободная речь структурирована ИИ.',
          coords: 'GPS: 55.7558° N, 37.6173° E (Офис HR • Точность: 2.1м)',
          score: 98,
          feedback: 'Оффер юридически чист. Тестовое задание проверено на плагиат — уникальность кода 100%.'
        };
      case 'tpl-3': // Корпоратив
        return {
          text: 'Смета расходов на 120 гостей составлена и верифицирована. Стоимость аренды лофта, кейтеринга и шоу-программы укладывается в утвержденные лимиты бюджета на Q3. Договор согласован юристом.',
          docName: 'smeta_and_dogovor_arendy.xlsx',
          docSize: '450 КБ',
          imageDesc: 'Фото-референс оформленной зоны фотозоны с утвержденным логотипом',
          audioDesc: 'Аудио-запись звонка с банкетным менеджером о готовности площадки.',
          coords: 'GPS: 55.7415° N, 37.6034° E (Лофт "Кристалл" • Точность: 3.5м)',
          score: 96,
          feedback: 'Все расходы по смете укладываются в лимиты бюджета. Форс-мажоры прописаны.'
        };
      case 'tpl-4': // Видео Ютуб
        return {
          text: 'Сценарий видеоролика "Как автоматизировать контроль качества бизнеса" написан и отформатирован под ТЗ. Метаданные, теги и таймкоды оптимизированы под поисковые запросы Ютуба.',
          docName: 'scenariy_video_and_seo_tags.docx',
          docSize: '320 КБ',
          imageDesc: 'Обложка видеоролика (Превью) проверена ИИ на CTR-кликабельность',
          audioDesc: 'Записана пробная дорожка. Уровень шумов в норме, эхо отсутствует, речь разборчива.',
          coords: 'GPS: 55.7512° N, 37.6256° E (Студия Звукозаписи • Точность: 1.5м)',
          score: 94,
          feedback: 'SEO теги подобраны идеально. Превью имеет высокий прогнозируемый коэффициент кликабельности (CTR).'
        };
      case 'tpl-5': // Создание сайта
        return {
          text: 'Адаптивный Landing Page разработан по ТЗ в Figma и сверстан на React/Tailwind. Формы отправки лидов протестированы и успешно интегрированы напрямую в CRM. Скорость загрузки оптимизирована.',
          docName: 'figma_design_and_deploy_spec.pdf',
          docSize: '2.5 МБ',
          imageDesc: 'Скриншот Lighthouse со 100% оценками производительности и доступности',
          audioDesc: 'Голосовое подтверждение от тимлида разработки о готовности к релизу.',
          coords: 'Hosting Сервер IP: 84.201.128.4 (Node.js Container)',
          score: 97,
          feedback: 'Верстка валидна во всех разрешениях. SSL сертификат установлен, редиректы настроены.'
        };
      default:
        return {
          text: 'Все работы по данному регламенту выполнены в полном соответствии с техническим заданием. Чек-лист заполнен, подтверждающие файлы собраны.',
          docName: 'otchet_o_rabote_v2.docx',
          docSize: '620 КБ',
          imageDesc: 'Фотоотчет выполненных работ с гео-меткой',
          audioDesc: 'Аудиозапись рапорта успешно расшифрована.',
          coords: 'GPS: 55.7539° N, 37.6208° E (Точка выполнения)',
          score: 95,
          feedback: 'ИИ подтвердил выполнение всех пунктов регламента.'
        };
    }
  };

  const simData = getSimulatedData();

  // Steps definitions
  const steps = [
    {
      title: 'Текст',
      icon: (active: boolean) => <FileText size={16} className={active ? "text-slate-900" : "text-slate-300"} />,
      label: '📝 ТЕКСТОВЫЕ ДАННЫЕ',
      desc: 'ИИ сканирует текстовые описания, выявляет слова-паразиты, сравнивает результаты со скриптами, регламентами компании и проверяет на плагиат.'
    },
    {
      title: 'Документы',
      icon: (active: boolean) => <FileText size={16} className={active ? "text-slate-900" : "text-[#D4AF37]"} />,
      label: '📄 АНАЛИЗ ДОКУМЕНТОВ',
      desc: 'Верификация загруженных PDF, Word, Excel файлов: проверка смет на перерасход лимитов, юридический аудит договоров на скрытые штрафы.'
    },
    {
      title: 'Картинки',
      icon: (active: boolean) => <Image size={16} className={active ? "text-slate-900" : "text-slate-300"} />,
      label: '🖼️ КОМПЬЮТЕРНОЕ ЗРЕНИЕ',
      desc: 'Нейросетевой фото-аудит: ИИ распознает объекты, логотипы, проверяет качество выкладки товара или сверяет фотоотчет с референсом.'
    },
    {
      title: 'Голос',
      icon: (active: boolean) => <Mic size={16} className={active ? "text-slate-900" : "text-slate-300"} />,
      label: '🎙️ АНАЛИЗ РЕЧИ (VOICE)',
      desc: 'Преобразование голосового рапорта в деловой текст. ИИ оценивает тон, вежливость, скорость речи и заполняет форму шаблона автоматически.'
    },
    {
      title: 'Геопозиция',
      icon: (active: boolean) => <MapPin size={16} className={active ? "text-slate-900" : "text-slate-300"} />,
      label: '📍 ГЕОЛОКАЦИЯ И GPS',
      desc: 'Проверка физического присутствия сотрудника на рабочем месте. ИИ сопоставляет GPS-координаты отчета с картой и временем смены.'
    },
    {
      title: 'ИИ-Вердикт',
      icon: (active: boolean) => <Sparkles size={16} className={active ? "text-slate-900" : "text-[#D4AF37]"} />,
      label: '🤖 ИТОГОВЫЙ АУДИТ ИQS',
      desc: 'Расчет индекса качества Quality Score (1-100), автозакрытие задачи по чек-листу и генерация умных рекомендаций.'
    }
  ];

  // Typing animation for step 0
  useEffect(() => {
    if (currentStep === 0) {
      setTypingText('');
      let index = 0;
      const interval = setInterval(() => {
        if (index < simData.text.length) {
          setTypingText((prev) => prev + simData.text.charAt(index));
          index++;
        } else {
          clearInterval(interval);
        }
      }, 15);
      return () => clearInterval(interval);
    }
  }, [currentStep, templateId]);

  // Voice wave pulsing
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentStep === 3) {
      interval = setInterval(() => {
        setPulseWave((prev) => !prev);
      }, 500);
    }
    return () => clearInterval(interval);
  }, [currentStep]);

  // Autoplay handler
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [isPlaying]);

  const handleNext = () => {
    setCurrentStep((prev) => (prev + 1) % steps.length);
  };

  const handlePrev = () => {
    setCurrentStep((prev) => (prev - 1 + steps.length) % steps.length);
  };

  return (
    <div className="w-full flex flex-col gap-4" id="template-verification-simulator">
      {/* Progress timeline / tabs - transparent glass style */}
      <div className="grid grid-cols-6 gap-1" id="sim-tabs-header">
        {steps.map((step, idx) => {
          const isActive = currentStep === idx;
          return (
            <button
              key={idx}
              onClick={() => {
                setCurrentStep(idx);
                setIsPlaying(false);
              }}
              className={`flex flex-col items-center gap-1 py-1.5 px-0.5 rounded-xl border transition-all cursor-pointer ${
                isActive 
                  ? 'bg-white/25 border-[#D4AF37] shadow-md text-white font-black' 
                  : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className={`p-1 rounded-lg ${isActive ? 'bg-[#D4AF37] text-slate-900' : 'bg-white/5 text-slate-300'}`}>
                {step.icon(isActive)}
              </div>
              <span className="text-[8px] font-bold tracking-tight hidden sm:block">{step.title}</span>
            </button>
          );
        })}
      </div>

      {/* Display box (Transparent frosted glass, no dark colors) */}
      <div className="relative border border-white/20 bg-white/10 p-5 rounded-3xl min-h-[290px] flex flex-col justify-between backdrop-blur-md overflow-hidden shadow-xl" id="sim-main-canvas">
        {/* Decorative golden ambient light circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -10 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col justify-between"
          >
            {/* Step info */}
            <div className="space-y-1.5 text-left z-10">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-wider text-[#D4AF37] bg-[#D4AF37]/20 px-2 py-0.5 rounded-md font-mono">
                  {steps[currentStep].label}
                </span>
                <span className="text-[9px] text-slate-300 font-mono font-bold">
                  Шаг {currentStep + 1} из 6
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-100 font-medium leading-relaxed">
                {steps[currentStep].desc}
              </p>
            </div>

            {/* Simulated field workspace (transparent block) */}
            <div className="my-4 p-4 rounded-2xl bg-white/10 border border-white/15 min-h-[140px] flex flex-col justify-center relative z-10" id="sim-workspace">
              
              {/* STEP 1: TEXT SIMULATION */}
              {currentStep === 0 && (
                <div className="space-y-2 text-left w-full">
                  <div className="flex justify-between items-center text-[9px] font-mono text-slate-300 border-b border-white/10 pb-1">
                    <span>📝 Поле отчета: Детализация сдачи</span>
                    <span className="text-[#D4AF37] uppercase font-black">Проверка ИИ...</span>
                  </div>
                  <p className="text-xs font-mono text-white leading-normal h-20 overflow-y-auto bg-black/10 p-2 rounded-xl border border-white/5">
                    {typingText}
                    <span className="inline-block w-1.5 h-3 bg-[#D4AF37] animate-pulse ml-0.5" />
                  </p>
                  <div className="flex items-center gap-1.5 text-[9px] text-[#D4AF37] font-mono font-bold">
                    <ShieldCheck size={11} />
                    <span>✓ Ненормативная лексика отсутствует • Соответствие скрипту: 94%</span>
                  </div>
                </div>
              )}

              {/* STEP 2: DOCUMENT SIMULATION */}
              {currentStep === 1 && (
                <div className="space-y-3 w-full">
                  <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-white/5 border border-white/10 rounded-xl text-[#D4AF37] shrink-0">
                        <FileText size={20} />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-white font-mono truncate max-w-[180px]">{simData.docName}</p>
                        <p className="text-[9px] text-slate-300 font-mono">{simData.docSize} • PDF Документ</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono bg-white/5 text-[#D4AF37] border border-[#D4AF37]/30 px-2 py-0.5 rounded">
                      Загружен 100%
                    </span>
                  </div>
                  
                  {/* Progress simulator */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[8px] text-slate-300 font-mono">
                      <span>ИИ-Анализ содержания...</span>
                      <span className="text-[#D4AF37] font-bold">Готово ✓</span>
                    </div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: '100%' }} 
                        transition={{ duration: 1.5 }} 
                        className="bg-gradient-to-r from-white to-[#D4AF37] h-full" 
                      />
                    </div>
                  </div>

                  <p className="text-[9.5px] font-mono text-white text-left leading-normal">
                    ✓ Проверен лимит расходов: Перерасхода бюджета не выявлено.<br />
                    ✓ Проверены юридические риски: Штрафных аномалий не обнаружено.
                  </p>
                </div>
              )}

              {/* STEP 3: IMAGE SIMULATION */}
              {currentStep === 2 && (
                <div className="space-y-2 w-full text-left">
                  <div className="flex justify-between items-center text-[9px] font-mono text-slate-300 border-b border-white/10 pb-1">
                    <span>🖼️ Подтверждающий фотоотчет</span>
                    <span className="text-[#D4AF37] font-bold uppercase">Свет / Ракурс / Объекты</span>
                  </div>
                  
                  <div className="relative h-20 bg-white/5 border border-white/10 rounded-xl overflow-hidden flex items-center justify-center">
                    {/* Laser scanning sweep line */}
                    <motion.div 
                      animate={{ top: ['0%', '100%', '0%'] }} 
                      transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                      className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shadow-[0_0_8px_#D4AF37] z-20"
                    />
                    <div className="text-center space-y-1 z-10 px-4">
                      <Image size={24} className="mx-auto text-[#D4AF37] opacity-80" />
                      <p className="text-[9px] text-slate-200 font-bold font-mono">{simData.imageDesc}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    <span className="text-[8px] font-mono bg-white/5 border border-[#D4AF37]/30 text-white px-1.5 py-0.5 rounded">✓ Снимок четкий</span>
                    <span className="text-[8px] font-mono bg-white/5 border border-[#D4AF37]/30 text-white px-1.5 py-0.5 rounded">✓ Метаданные совпадают</span>
                    <span className="text-[8px] font-mono bg-white/5 border border-[#D4AF37]/30 text-white px-1.5 py-0.5 rounded">✓ Объекты распознаны</span>
                  </div>
                </div>
              )}

              {/* STEP 4: VOICE SIMULATION */}
              {currentStep === 3 && (
                <div className="space-y-2.5 w-full text-left">
                  <div className="flex justify-between items-center text-[9px] font-mono text-slate-300 border-b border-white/10 pb-1">
                    <span>🎙️ Диктовка голосового отчета</span>
                    <span className="text-[#D4AF37] font-bold font-mono">АКТИВНА ЗАПИСЬ</span>
                  </div>

                  <div className="flex items-center gap-4 py-1">
                    {/* Siri Equalizer wave */}
                    <div className="flex items-end gap-1 h-8 shrink-0">
                      {[1.2, 2.5, 0.8, 3.2, 1.5, 4.0, 2.1, 1.3, 3.5, 0.9, 1.8].map((mul, idx) => (
                        <span 
                          key={idx}
                          className="w-1 bg-[#D4AF37] rounded-full transition-all duration-300"
                          style={{ 
                            height: pulseWave ? `${Math.floor(mul * 8)}px` : '4px',
                            opacity: pulseWave ? 1 : 0.4
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] italic text-slate-100 bg-white/5 border border-white/10 p-2 rounded-xl flex-1 leading-snug">
                      "{simData.audioDesc.slice(0, 85)}..."
                    </p>
                  </div>

                  <div className="text-[8.5px] text-[#D4AF37] font-mono font-bold leading-normal">
                    ⚡ ИИ оцифровал речь • Тон: Деловая беседа • Оценка лексики: А+
                  </div>
                </div>
              )}

              {/* STEP 5: GEOPOSITION SIMULATION */}
              {currentStep === 4 && (
                <div className="space-y-2 w-full text-left">
                  <div className="flex justify-between items-center text-[9px] font-mono text-slate-300 border-b border-white/10 pb-1">
                    <span>📍 GPS Верификация местоположения</span>
                    <span className="text-[#D4AF37] font-bold">ФИКСАЦИЯ СЕТИ</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] shrink-0 animate-pulse relative">
                      <MapPin size={18} />
                      <span className="absolute inset-0 rounded-full border border-[#D4AF37] animate-ping opacity-25" />
                    </div>
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <p className="text-[10.5px] font-mono font-bold text-white truncate">{simData.coords}</p>
                      <p className="text-[9px] text-slate-300">Совпадение с адресом компании: <strong className="text-[#D4AF37]">ПОДТВЕРЖДЕНО ✓</strong></p>
                    </div>
                  </div>

                  <div className="text-[9px] bg-white/5 border border-white/10 text-white p-2 rounded-xl font-mono">
                    ИИ проверил: Координаты соответствуют месту выполнения задачи. Защита от подмены GPS активна.
                  </div>
                </div>
              )}

              {/* STEP 6: VERDICT / QUALITY SCORE */}
              {currentStep === 5 && (
                <div className="space-y-2.5 w-full text-center">
                  <div className="flex justify-between items-center text-[9px] font-mono text-slate-300 border-b border-white/10 pb-1">
                    <span>🤖 Итоговый вердикт ИИ-Ревизора</span>
                    <span className="text-[#D4AF37] font-black font-mono">АУДИТ ЗАКРЫТ ✓</span>
                  </div>

                  <div className="flex items-center justify-center gap-6 py-1">
                    <div className="relative flex items-center justify-center">
                      {/* Circle Progress bar around score */}
                      <svg className="w-16 h-16 transform -rotate-90">
                        <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" className="text-white/15" fill="transparent" />
                        <motion.circle 
                          cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" className="text-[#D4AF37]" 
                          strokeDasharray={2 * Math.PI * 28}
                          initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
                          animate={{ strokeDashoffset: 2 * Math.PI * 28 * (1 - simData.score / 100) }}
                          transition={{ duration: 1.2, ease: "easeOut" }}
                          fill="transparent" 
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-lg font-black text-white font-mono leading-none">{simData.score}</span>
                        <span className="text-[7px] text-slate-300 font-bold font-mono">QS</span>
                      </div>
                    </div>

                    <div className="text-left space-y-1 max-w-[170px]">
                      <div className="flex items-center gap-1 bg-white/5 border border-[#D4AF37]/30 text-[#D4AF37] px-2 py-0.5 rounded-md text-[9px] font-mono font-bold w-max">
                        <ShieldCheck size={10} />
                        <span>ВЕРИФИЦИРОВАНО ИИ</span>
                      </div>
                      <p className="text-[9.5px] italic text-slate-100 font-medium leading-snug">
                        "{simData.feedback}"
                      </p>
                    </div>
                  </div>

                  <p className="text-[8px] font-mono text-slate-300">
                    Задача автоматически переведена в архив. Премия начислена в кабинет.
                  </p>
                </div>
              )}

            </div>
          </motion.div>
        </AnimatePresence>

        {/* Step controls footer */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10 relative z-10" id="sim-controls">
          <button
            onClick={handlePrev}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer text-[10px] font-bold font-sans transition-all active:scale-95"
          >
            <ChevronLeft size={12} />
            <span>Назад</span>
          </button>
          
          {/* Bullet step counters */}
          <div className="flex gap-1">
            {steps.map((_, idx) => (
              <span 
                key={idx}
                className={`h-1 rounded-full transition-all duration-300 ${currentStep === idx ? 'w-4 bg-[#D4AF37]' : 'w-1 bg-white/30'}`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-[#F4D06F] to-[#D4AF37] text-slate-950 cursor-pointer text-[10px] font-bold font-sans transition-all active:scale-95 hover:brightness-110"
          >
            <span>Дальше</span>
            <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
