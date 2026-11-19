import React, { useState } from 'react';
import { 
  Sparkles, MessageSquare, Mic, ShieldAlert, Calendar, Users, Sliders, Check, 
  HelpCircle, ArrowRight, MessageCircle, TrendingUp, Clock, Coins, Briefcase, 
  Shield, FileText, Phone, Award, Gift, Video, Globe, Compass, PhoneCall, 
  Grid3X3, Truck, Activity, FileCheck, CheckSquare, ListTodo, ChevronRight, ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import TypewriterText from '../components/TypewriterText';
import VerticalReviewsCarousel from '../components/VerticalReviewsCarousel';
import InteractiveFlowSimulator from '../components/InteractiveFlowSimulator';
import TemplateVerificationSimulator from '../components/TemplateVerificationSimulator';
import CommentsSection from '../components/CommentsSection';
import TariffCalculator from '../components/TariffCalculator';
import InteractiveGoldenWaves from '../components/InteractiveGoldenWaves';
import { UserProfile } from '../types';
import { MiniAudioField } from '../components/voice/MiniAudioField';
import { MobileScreenSwitcher, MobileScreenOption } from '../components/common/MobileScreenSwitcher';
import { usePageSeo } from '../utils/seo/usePageSeo';

interface Review {
  id: string;
  name: string;
  company: string;
  text: string;
  aiResponse: string | null;
  officialResponse: string;
  date: string;
  audio_url?: string;
  reactions?: Record<string, number>;
}

interface TemplateItem {
  id: string;
  title: string;
  category: string;
  emoji: string;
  desc: string;
  aiCheckTitle: string;
  aiCheckPoints: string[];
  tasks: string[];
}

interface ParallaxMascotProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
  baseZIndex?: number;
  startProgress?: number;
  maxOffset?: number;
  maxFade?: number;
}

export function ParallaxMascot({
  src,
  alt,
  className = "",
  style = {},
  referrerPolicy = "no-referrer",
  baseZIndex = 10,
  startProgress = 0.2,
  maxOffset = 120,
  maxFade = 0.8
}: ParallaxMascotProps) {
  const imgRef = React.useRef<HTMLImageElement>(null);
  const [offsetY, setOffsetY] = React.useState(0);
  const [opacity, setOpacity] = React.useState(1);

  React.useEffect(() => {
    const handleScroll = () => {
      if (!imgRef.current) return;
      
      const rect = imgRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      const elementHeight = rect.height || 100;
      const progress = (viewportHeight - rect.top) / (viewportHeight + elementHeight);
      const clampedProgress = Math.min(1, Math.max(0, progress));

      if (clampedProgress > startProgress) {
        const t = (clampedProgress - startProgress) / (1 - startProgress);
        setOffsetY(t * maxOffset);
        setOpacity(1 - t * maxFade);
      } else {
        setOffsetY(0);
        setOpacity(1);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [startProgress, maxOffset, maxFade]);

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      className={className}
      referrerPolicy={referrerPolicy}
      style={{
        ...style,
        transform: `${style.transform || ''} translateY(${offsetY}px)`,
        opacity: opacity * (style.opacity !== undefined ? Number(style.opacity) : 1),
        zIndex: baseZIndex,
        transition: 'transform 0.1s ease-out, opacity 0.1s ease-out',
      }}
    />
  );
}

interface ParallaxBlockProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  startProgress?: number;
  maxOffset?: number;
  maxFade?: number;
  id?: string;
}

export function ParallaxBlock({
  children,
  className = "",
  style = {},
  startProgress = 0.2,
  maxOffset = 120,
  maxFade = 0.8,
  id
}: ParallaxBlockProps) {
  const blockRef = React.useRef<HTMLDivElement>(null);
  const [offsetY, setOffsetY] = React.useState(0);
  const [opacity, setOpacity] = React.useState(1);

  React.useEffect(() => {
    const handleScroll = () => {
      if (!blockRef.current) return;
      
      const rect = blockRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      const elementHeight = rect.height || 100;
      const progress = (viewportHeight - rect.top) / (viewportHeight + elementHeight);
      const clampedProgress = Math.min(1, Math.max(0, progress));

      if (clampedProgress > startProgress) {
        const t = (clampedProgress - startProgress) / (1 - startProgress);
        setOffsetY(t * maxOffset);
        setOpacity(1 - t * maxFade);
      } else {
        setOffsetY(0);
        setOpacity(1);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [startProgress, maxOffset, maxFade]);

  return (
    <div
      ref={blockRef}
      className={`${className} transition-all duration-100 ease-out`}
      style={{
        ...style,
        transform: `translateY(${offsetY}px)`,
        opacity: opacity,
      }}
      id={id}
    >
      {children}
    </div>
  );
}

const UNIVERSAL_TEMPLATES: TemplateItem[] = [
  {
    id: 'tpl-2',
    title: 'Найм персонала',
    category: 'HR & Управление',
    emoji: '👥',
    desc: 'Поиск, отбор, проведение интервью и успешный запуск процесса адаптации (онбординга) нового сотрудника.',
    aiCheckTitle: 'Что проверяет ИИ-Ревизор по RR API:',
    aiCheckPoints: [
      'Соответствие вакансии внутреннему регламенту и бюджетному лимиту',
      'Оценивает тестовые задания кандидатов на плагиат и качество',
      'Проверяет чек-лист прохождения адаптационной недели сотрудника',
      'Анализирует заполненный оффер на юридические риски'
    ],
    tasks: [
      'Составление профиля должности, требований и KPI',
      'Публикация вакансии на HeadHunter, Хабр Карьере и в каналах',
      'Первичный скрининг резюме и отбор кандидатов',
      'Проведение первого и финального собеседований',
      'Выставление оффера и запуск онбординг-трека в ИИ-Ревизоре'
    ]
  },
  {
    id: 'tpl-1',
    title: 'Обзвон клиентов по базе',
    category: 'Маркетинг & Продажи',
    emoji: '📞',
    desc: 'Массовый или точечный обзвон клиентов по скрипту для выявления лидов, опросов качества или холодных продаж.',
    aiCheckTitle: 'Что проверяет ИИ-Ревизор по RR API:',
    aiCheckPoints: [
      'Анализирует аудиозапись звонка: интонацию, вежливость, скорость речи',
      'Выявляет ключевые триггеры согласия или возражений',
      'Сравнивает разговор со скриптом и выставляет оценку полноты диалога',
      'Проверяет автоматический импорт карточки сделки в CRM'
    ],
    tasks: [
      'Написание и согласование скрипта разговора',
      'Импорт и сегментация базы контактов в IP-телефонии',
      'Тестовый обзвон пилотной группы (10 контактов)',
      'Основной раунд звонков по всей базе',
      'Передача квалифицированных лидов (SQL) в отдел продаж'
    ]
  },
  {
    id: 'tpl-3',
    title: 'Организация корпоратива',
    category: 'HR & Ивенты',
    emoji: '🎉',
    desc: 'Организация запоминающегося корпоративного праздника для сплочения команды — от сметы до финального салюта.',
    aiCheckTitle: 'Что проверяет ИИ-Ревизор по RR API:',
    aiCheckPoints: [
      'Проверяет смету расходов на перерасход лимитов по категориям',
      'Анализирует договор аренды локации на форс-мажоры и штрафы',
      'Запускает автоматический опрос удовлетворенности команды после ивента',
      'Верифицирует фото-отчет от декораторов по референсам'
    ],
    tasks: [
      'Сбор пожеланий и голосование за концепцию праздника',
      'Бюджетирование, выбор и бронирование локации/кейтеринга',
      'Разработка сценария развлекательной программы',
      'Заказ брендированного мерча и подарков для конкурсов',
      'Координация подрядчиков на площадке и проведение ивента'
    ]
  },
  {
    id: 'tpl-4',
    title: 'Запись видео для Ютуб',
    category: 'Контент-маркетинг',
    emoji: '🎥',
    desc: 'Полный цикл видеопроизводства для официального канала компании или личного блога.',
    aiCheckTitle: 'Что проверяет ИИ-Ревизор по RR API:',
    aiCheckPoints: [
      'Сканирует сценарий на соответствие редполитике и SEO-ключам',
      'Анализирует аудиодорожку на шумы, эхо и четкость речи',
      'Проверяет обложку (превью) на кликабельность (CTR-анализ)',
      'Сверяет метаданные (теги, таймкоды) с лучшими практиками Ютуба'
    ],
    tasks: [
      'Разработка идеи и написание подробного сценария (скрипта)',
      'Подготовка съемочного оборудования (свет, звук, камера)',
      'Запись видеоматериала (несколько дублей)',
      'Монтаж, цветокоррекция и наложение аудиоэффектов',
      'Дизайн кликабельного превью и публикация с SEO-описанием'
    ]
  },
  {
    id: 'tpl-5',
    title: 'Создание сайта',
    category: 'IT & Разработка',
    emoji: '💻',
    desc: 'Разработка продающего Landing Page или корпоративного сайта с высокой конверсией.',
    aiCheckTitle: 'Что проверяет ИИ-Ревизор по RR API:',
    aiCheckPoints: [
      'Проверяет валидность верстки и кроссбраузерность',
      'Измеряет скорость загрузки страниц по Google PageSpeed',
      'Тестирует отправку форм и интеграцию с CRM системой',
      'Выявляет SEO-ошибки и отсутствие SSL-сертификата'
    ],
    tasks: [
      'Анализ конкурентов, сбор требований и составление ТЗ',
      'Разработка интерактивного прототипа и UI/UX дизайна в Figma',
      'Верстка сайта на современном стеке (React/Tailwind)',
      'Интеграция веб-форм, аналитики Яндекса/Google и CRM',
      'Тестирование на ошибки, перенос на хостинг и привязка домена'
    ]
  },
  {
    id: 'tpl-6',
    title: 'Поход с друзьями',
    category: 'Спорт & Лайфстайл',
    emoji: '🏕️',
    desc: 'Тщательное планирование и проведение безопасного туристического похода выходного дня.',
    aiCheckTitle: 'Что проверяет ИИ-Ревизор по RR API:',
    aiCheckPoints: [
      'Проверяет нитку маршрута на опасные участки и рельеф',
      'Сверяет вес рюкзаков с физическими возможностями участников',
      'Проверяет калорийность и сбалансированность раскладки еды',
      'Контролирует прогноз погоды и выдает рекомендации по экипировке'
    ],
    tasks: [
      'Выбор локации, построение маршрута и составление тайминга',
      'Составление списка группового и личного снаряжения',
      'Закупка продуктов и фасовка раскладки питания по дням',
      'Распределение веса снаряжения между участниками похода',
      'Сбор на точке старта, прохождение маршрута и обустройство лагеря'
    ]
  },
  {
    id: 'tpl-7',
    title: 'Настройка телефонии',
    category: 'Телеком & IT',
    emoji: '☎️',
    desc: 'Развертывание виртуальной АТС, настройка голосового меню и интеграция телефонии в рабочие CRM процессы.',
    aiCheckTitle: 'Что проверяет ИИ-Ревизор по RR API:',
    aiCheckPoints: [
      'Сверяет логи звонков и проверяет правильность IVR сценариев',
      'Контролирует запись разговоров в карточках клиентов',
      'Измеряет качество связи (потерю пакетов, задержку)',
      'Проверяет правила распределения звонков по свободным менеджерам'
    ],
    tasks: [
      'Выбор провайдера облачной АТС и покупка многоканальных номеров',
      'Настройка логики входящих звонков и запись голосового приветствия',
      'Установка и авторизация SIP-софтфонов на устройствах менеджеров',
      'Интеграция телефонии с CRM-системой компании',
      'Проведение тестовых звонков и фиксация в истории CRM'
    ]
  },
  {
    id: 'tpl-8',
    title: 'Установка окна',
    category: 'Бытовые услуги',
    emoji: '🪟',
    desc: 'Замена оконных блоков в квартире или офисе — от профессионального замера до чистовой отделки откосов.',
    aiCheckTitle: 'Что проверяет ИИ-Ревизор по RR API:',
    aiCheckPoints: [
      'Анализирует фото выполненного монтажного шва на пустоты пены',
      'Сверяет замеры с чертежом на производстве для исключения брака',
      'Проверяет установку по уровню (по фото-подтверждению)',
      'Верифицирует подписание акта приема-передачи клиентом'
    ],
    tasks: [
      'Выезд мастера-замерщика на объект, составление чертежа и сметы',
      'Передача заказа на завод и контроль сроков изготовления профиля',
      'Демонтаж старой оконной рамы и очистка проема от мусора',
      'Монтаж нового окна по ГОСТу с запениванием и парогидроизоляцией',
      'Установка отливов, подоконника и финишная отделка откосов'
    ]
  },
  {
    id: 'tpl-9',
    title: 'Закупка щебня',
    category: 'Строительство & Снабжение',
    emoji: '🪨',
    desc: 'Организация оптовой поставки качественного щебня нужной фракции на строительную площадку точно в срок.',
    aiCheckTitle: 'Что проверяет ИИ-Ревизор по RR API:',
    aiCheckPoints: [
      'Распознает сканы ТТН и весовых талонов через OCR',
      'Сверяет фракцию и марку прочности щебня с ТЗ проекта',
      'Анализирует логистические накладные на накрутку километража',
      'Проверяет паспорт качества карьера на радиационный фон'
    ],
    tasks: [
      'Мониторинг цен у карьеров и сбор коммерческих предложений',
      'Проверка сертификатов соответствия и паспортов качества',
      'Заключение договора поставки и проведение безналичной оплаты',
      'Координация и контроль подачи самосвалов на объекте',
      'Приемка щебня, взвешивание, проверка фракции и подписание актов'
    ]
  },
  {
    id: 'tpl-10',
    title: 'Аренда лыж',
    category: 'Спорт & Логистика',
    emoji: '🎿',
    desc: 'Подбор, бронирование и получение горнолыжного снаряжения для группы сотрудников во время выезда на склон.',
    aiCheckTitle: 'Что проверяет ИИ-Ревизор по RR API:',
    aiCheckPoints: [
      'Сверяет рост/вес участников с таблицей настройки креплений DIN',
      'Распознает чек аренды на соответствие количеству комплектов',
      'Проверяет наличие шлемов и защиты по фотоотчету группы',
      'Контролирует своевременность возврата для избежания штрафов'
    ],
    tasks: [
      'Сбор антропометрических данных участников (рост, вес, размер обуви)',
      'Поиск пунктов проката у склона и согласование корпоративной скидки',
      'Оформление групповой брони и внесение предоплаты',
      'Получение снаряжения, настройка креплений и прохождение инструктажа',
      'Возврат снаряжения в прокат и подписание закрывающего акта'
    ]
  },
  {
    id: 'tpl-11',
    title: 'Сдача налоговой отчетности',
    category: 'Бухгалтерия & Финансы',
    emoji: '📊',
    desc: 'Сбор первичных документов, расчет налогов и своевременная отправка декларации без штрафов и пеней.',
    aiCheckTitle: 'Что проверяет ИИ-Ревизор по RR API:',
    aiCheckPoints: [
      'Сканирует квитанцию ФНС о приеме декларации на валидность',
      'Проверяет книгу покупок/продаж на расхождения с контрагентами',
      'Перепроверяет расчет налога по формуле на арифметические ошибки',
      'Контролирует наличие КЭП руководителя для отправки отчета'
    ],
    tasks: [
      'Сбор первичных документов (актов, накладных, чеков) от менеджеров',
      'Сверка взаиморасчетов со всеми ключевыми контрагентами за квартал',
      'Расчет налоговой базы, вычетов и итоговой суммы к уплате',
      'Заполнение декларации в бухгалтерской системе (1С, МоеДело)',
      'Подписание отчета КЭП и отправка в ФНС с получением квитанции'
    ]
  }
];

interface LandingPageProps {
  onNavigate: (path: string) => void;
  onOpenLoginModal: () => void;
  currentUser: UserProfile | null;
}

// Interactive dark process visualizer with gold glow animation for ИИ РЕВИЗОР
function RevisorProcessVisualizer() {
  const [step, setStep] = useState(0);
  React.useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % 3);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center justify-center gap-4 bg-amber-500/10 p-3.5 rounded-2xl border border-[#D4AF37]/40 w-full max-w-[320px] h-20 shadow-[0_0_20px_rgba(212,175,55,0.15)] relative overflow-hidden my-3 mx-auto">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#D4AF37]/5 to-transparent" />
      
      {/* Step 1 */}
      <div className="flex flex-col items-center z-10 transition-all duration-300">
        <div className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs transition-all duration-300 ${
          step === 0 
            ? 'border-[#D4AF37] bg-[#D4AF37]/20 text-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.6)] scale-110 font-bold' 
            : 'border-[#1A0F02]/30 bg-[#1A0F02]/10 text-[#1A0F02]'
        }`}>
          🎤
        </div>
        <span className={`text-[9px] font-mono mt-1 transition-all ${step === 0 ? 'text-[#D4AF37] font-bold' : 'text-[#1A0F02]'}`}>Голос</span>
      </div>

      <div className={`w-8 h-[1.5px] transition-all duration-300 ${step === 0 ? 'bg-gradient-to-r from-[#D4AF37] to-[#1A0F02]/30' : 'bg-[#1A0F02]/30'}`} />

      {/* Step 2 */}
      <div className="flex flex-col items-center z-10 transition-all duration-300">
        <div className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs transition-all duration-300 ${
          step === 1 
            ? 'border-[#D4AF37] bg-[#D4AF37]/20 text-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.6)] scale-110 font-bold' 
            : 'border-[#1A0F02]/30 bg-[#1A0F02]/10 text-[#1A0F02]'
        }`}>
          📋
        </div>
        <span className={`text-[9px] font-mono mt-1 transition-all ${step === 1 ? 'text-[#D4AF37] font-bold' : 'text-[#1A0F02]'}`}>ИИ ТЗ</span>
      </div>

      <div className={`w-8 h-[1.5px] transition-all duration-300 ${step === 1 ? 'bg-gradient-to-r from-[#D4AF37] to-[#1A0F02]/30' : 'bg-[#1A0F02]/30'}`} />

      {/* Step 3 */}
      <div className="flex flex-col items-center z-10 transition-all duration-300">
        <div className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs transition-all duration-300 ${
          step === 2 
            ? 'border-[#D4AF37] bg-[#D4AF37]/20 text-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.6)] scale-110 font-bold' 
            : 'border-[#1A0F02]/30 bg-[#1A0F02]/10 text-[#1A0F02]'
        }`}>
          ⚖️
        </div>
        <span className={`text-[9px] font-mono mt-1 transition-all ${step === 2 ? 'text-[#D4AF37] font-bold' : 'text-[#1A0F02]'}`}>Контроль</span>
      </div>
    </div>
  );
}

// Interactive dark process visualizer with gold glow animation for ИИ РАПОРТ
function RaportProcessVisualizer() {
  const [waveActive, setWaveActive] = useState(true);
  React.useEffect(() => {
    const interval = setInterval(() => {
      setWaveActive((prev) => !prev);
    }, 450);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center justify-between bg-zinc-950/80 p-3.5 rounded-2xl border border-[#D4AF37]/30 w-full max-w-[320px] h-20 shadow-[0_0_20px_rgba(212,175,55,0.15)] relative overflow-hidden my-3 mx-auto">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#D4AF37]/5 to-transparent" />
      
      {/* Voice bars */}
      <div className="flex items-end gap-1 h-8 px-2 shrink-0">
        {[2.5, 4.2, 1.8, 5.0, 3.5, 1.2, 4.8, 2.2].map((val, idx) => (
          <span 
            key={idx}
            style={{ 
              height: waveActive ? `${val * 6}px` : '4px',
              opacity: waveActive ? 1 : 0.4
            }}
            className="w-1 bg-[#D4AF37] rounded-full transition-all duration-300 shadow-[0_0_6px_#D4AF37]"
          />
        ))}
      </div>

      {/* Converting arrow */}
      <div className="text-[#D4AF37] animate-pulse text-sm font-mono font-bold">➡️</div>

      {/* Structured report document mockup */}
      <div className="flex flex-col gap-1 w-28 bg-black/60 border border-white/10 p-2 rounded-xl text-[8px] text-left shrink-0 font-sans">
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
          <span className="text-white font-bold">Рапорт готов</span>
        </div>
        <div className="w-full h-[2px] bg-[#D4AF37]/50 rounded mt-0.5" />
        <div className="w-16 h-[2px] bg-white/20 rounded" />
        <div className="w-12 h-[2px] bg-white/20 rounded" />
      </div>
    </div>
  );
}

export default function LandingPage({ onNavigate, onOpenLoginModal, currentUser }: LandingPageProps) {
  // Scroll ratio state for Mascot gathering animation
  const [scrollRatio, setScrollRatio] = useState(0);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [isRevisorFlipped, setIsRevisorFlipped] = useState(false);
  const [isRaportFlipped, setIsRaportFlipped] = useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY;
      // Scroll range 0 to 450px on desktop, but 320px on mobile to slow down scroll animation beautifully!
      const maxScroll = window.innerWidth < 768 ? 320 : 450;
      const ratio = Math.min(1, Math.max(0, current / maxScroll));
      setScrollRatio(ratio);
    };

    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      handleScroll();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    
    // Initial call
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const isMobile = windowWidth < 768;
  const [mobileScreen, setMobileScreen] = useState<string>('hero');

  const mobileScreens: MobileScreenOption[] = [
    { id: 'hero', label: 'Презентация', icon: <Sparkles size={14} className="text-[#E7C768]" /> },
    { id: 'demo', label: 'Симулятор', icon: <Sliders size={14} className="text-[#E7C768]" /> },
    { id: 'templates', label: 'Маркетплейс', icon: <Grid3X3 size={14} className="text-[#E7C768]" /> },
    { id: 'calculator', label: 'Калькулятор', icon: <Coins size={14} className="text-[#E7C768]" /> },
    { id: 'reviews', label: 'Отзывы и FAQ', icon: <MessageSquare size={14} className="text-[#E7C768]" /> }
  ];

  // Showcase state
  const [selectedTplId, setSelectedTplId] = useState<string>('tpl-2');
  const [tplViewMode, setTplViewMode] = useState<'details' | 'simulator'>('simulator');

  // Calculator state
  const [employeesCount, setEmployeesCount] = useState<number>(10);
  const [tariffType, setTariffType] = useState<'trial' | 'business'>('business');
  const [managerHourlyRate, setManagerHourlyRate] = useState<number>(1500);
  const [hoursSpentManual, setHoursSpentManual] = useState<number>(1.5);

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeReviewIndex, setActiveReviewIndex] = useState<number>(0);
  const [showComments, setShowComments] = useState<boolean>(false);
  const [showWriteReview, setShowWriteReview] = useState<boolean>(false);
  const [newReviewName, setNewReviewName] = useState<string>('');
  const [newReviewCompany, setNewReviewCompany] = useState<string>('');
  const [newReviewText, setNewReviewText] = useState<string>('');
  const [newReviewAudioUrl, setNewReviewAudioUrl] = useState<string | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [aiReviewReply, setAiReviewReply] = useState<string>('');

  // Fetch reviews from PostgreSQL BD ProTalk database API
  const fetchReviewsFromDb = React.useCallback(async () => {
    try {
      const res = await fetch('/api/landing/reviews', { cache: 'no-store' });
      if (!res.ok) return;
      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        return;
      }
      if (data && data.success && Array.isArray(data.reviews)) {
        setReviews(data.reviews);
        setActiveReviewIndex((prev) =>
          data.reviews.length > 0 ? Math.min(Math.max(0, prev), data.reviews.length - 1) : 0
        );
      }
    } catch (e) {
      console.warn("Could not load reviews from DB:", e);
    }
  }, []);

  React.useEffect(() => {
    fetchReviewsFromDb();
    const handleReviewsEvent = () => {
      fetchReviewsFromDb();
    };
    window.addEventListener('db-reviews-updated', handleReviewsEvent);

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('ii_rr_db_sync');
        bc.onmessage = (evt: MessageEvent) => {
          if (evt.data?.table === 'landing_reviews' || evt.data?.table === 'all') {
            fetchReviewsFromDb();
          }
        };
      }
    } catch {
      // BroadcastChannel unavailable
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchReviewsFromDb();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('db-reviews-updated', handleReviewsEvent);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (bc) bc.close();
    };
  }, [fetchReviewsFromDb]);

  React.useEffect(() => {
    if (isMobile && mobileScreen === 'reviews') {
      fetchReviewsFromDb();
    }
  }, [isMobile, mobileScreen, fetchReviewsFromDb]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser && !newReviewName.trim()) return;
    if (!newReviewText.trim()) return;

    setIsSubmittingReview(true);
    setAiReviewReply('ИИ Рапорт анализирует ваш отзыв в базе данных и генерирует персональный ответ...');

    try {
      const res = await fetch('/api/landing/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: currentUser ? currentUser.name : newReviewName,
          company: currentUser ? (currentUser.position || 'Пользователь') : (newReviewCompany || 'Частное лицо'),
          text: newReviewText,
          audio_url: newReviewAudioUrl,
          rating: 5
        })
      });

      const data = await res.json();
      if (data.success && data.review) {
        setReviews((prev) => [data.review, ...prev.filter((r) => r.id !== data.review.id)]);
        setActiveReviewIndex(0);
        window.dispatchEvent(new Event('db-reviews-updated'));
      } else {
        await fetchReviewsFromDb();
      }
    } catch (e) {
      console.error("Failed to submit review to DB:", e);
    } finally {
      setNewReviewName('');
      setNewReviewCompany('');
      setNewReviewText('');
      setNewReviewAudioUrl(null);
      setIsSubmittingReview(false);
      setShowWriteReview(false);
    }
  };

  const homeJsonLd = React.useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://ii-rr.ru';
    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': `${origin}/#organization`,
          name: 'ООО РентРоп — ИИ Ревизор & ИИ Рапорт',
          url: `${origin}/`,
          sameAs: ['https://ii-rr.online/', 'https://t.me/SAV_AI'],
          logo: {
            '@type': 'ImageObject',
            url: `${origin}/favicon-192.png`,
            width: 192,
            height: 192
          },
          email: 'info@arenda-ropa.com'
        },
        {
          '@type': 'WebSite',
          '@id': `${origin}/#website`,
          url: `${origin}/`,
          name: 'ИИ Ревизор & ИИ Рапорт',
          publisher: { '@id': `${origin}/#organization` },
          inLanguage: 'ru-RU',
          potentialAction: {
            '@type': 'SearchAction',
            target: `${origin}/blog?q={search_term_string}`,
            'query-input': 'required name=search_term_string'
          }
        },
        {
          '@type': 'SoftwareApplication',
          name: 'ИИ Ревизор & ИИ Рапорт',
          operatingSystem: 'Web, Telegram, iOS, Android',
          applicationCategory: 'BusinessApplication',
          url: `${origin}/`,
          image: `${origin}/file/21/iirrsocial.jpg`,
          offers: {
            '@type': 'AggregateOffer',
            lowPrice: '290',
            highPrice: '690',
            priceCurrency: 'RUB',
            offerCount: '3'
          },
          publisher: { '@id': `${origin}/#organization` },
          description:
            'Интеллектуальная система управления проектами, голосового сбора отчетов сотрудников в Telegram, строительного аудита КС-2/КС-3 и автоматизированного контроля чек-листов с нейросетью.'
        }
      ]
    };
  }, []);

  usePageSeo({
    title: 'ИИ Ревизор & ИИ Рапорт — Контроль проектов и голосовые отчеты',
    description:
      'Платформа управления проектами, голосовых отчетов в Telegram за 2 минуты, аудита смет КС-2/КС-3 и геймификации с ИИ. Тарифы от 290 ₽.',
    keywords:
      'ИИ Ревизор, ИИ Рапорт, голосовые отчеты сотрудников, контроль проектов с ИИ, аудит смет КС-2 КС-3, Telegram бот отчетов, проверка чек-листов, геймификация персонала',
    path: '/',
    ogType: 'website',
    image: '/file/21/iirrsocial.jpg',
    imageWidth: 1280,
    imageHeight: 756,
    imageAlt: 'ИИ Ревизор & ИИ Рапорт — Платформа контроля и отчетов',
    jsonLd: homeJsonLd
  });

  return (
    <div className="w-full text-white bg-[#140A01] font-sans selection:bg-[#D4AF37]/30 selection:text-white relative" id="landing-page-root">
      
      {/* Global Interactive Golden Waves Parallax Background */}
      <InteractiveGoldenWaves />

      {/* Mobile Screen Switcher Bar (Only visible on mobile devices) */}
      {isMobile && (
        <div className="sticky top-[72px] z-40 bg-[#140A01]/95 backdrop-blur-xl px-2 pt-2 pb-1 border-b border-amber-400/25 shadow-lg">
          <MobileScreenSwitcher
            screens={mobileScreens}
            activeScreen={mobileScreen}
            onSelectScreen={setMobileScreen}
            showBottomPager={false}
          />
        </div>
      )}

      {/* 1. HERO SECTION (DARK) */}
      {(!isMobile || mobileScreen === 'hero') && (
        <section 
          className="relative overflow-x-clip overflow-y-visible pt-6 pb-20 md:pt-16 md:pb-32 px-4 sm:px-6 animate-fade-in z-10" 
          id="hero-section"
          style={{ background: 'transparent' }}
        >
        {/* Apple Liquid Glass floating blur blobs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-[#D4AF37]/5 blur-[120px] pointer-events-none" />
        <div className="absolute -top-10 -right-10 w-[300px] h-[300px] rounded-full bg-[#D4AF37]/10 blur-[80px] pointer-events-none" />

        <div className="mx-auto max-w-7xl relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Block */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-7 space-y-6 text-left relative z-30 order-2 lg:order-1"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#D4AF37]/30 bg-white/5 text-[#D4AF37] text-sm font-bold tracking-wide font-mono shadow-md">
              <Sparkles size={14} className="text-[#D4AF37] animate-spin" />
              <span>ИИ-рекомендации и автоконтроль команды</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight text-white">
              <span className="bg-gradient-to-r from-[#FFF8B4] via-[#E7C768] to-[#D4AF37] bg-clip-text text-transparent">
                ИИ Ревизор &amp; ИИ Рапорт
              </span>{' '}
              — автопилот проектов и голосовых отчетов
            </h1>

            <div className="space-y-8 max-w-2xl">
              {/* Product 1 Block */}
              <div className="space-y-3">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-snug text-white">
                  <span className="bg-gradient-to-r from-[#FFF8B4] to-[#D4AF37] bg-clip-text text-transparent">ИИ Ревизор</span> — это ваш автопилот для проектов:
                </h2>
                <p className="text-sm sm:text-base text-[#BDBDBD] leading-relaxed pl-4 border-l-2 border-[#D4AF37]/40 font-sans">
                  Автоматическое планирование, распределение задач между сотрудниками и тотальный контроль качества по чек-листам.
                </p>
              </div>

              {/* Product 2 Block */}
              <div className="space-y-3">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-snug text-white">
                  <span className="bg-gradient-to-r from-[#FFF8B4] to-[#D4AF37] bg-clip-text text-transparent">ИИ Рапорт</span> — это система голосовых и текстовых отчетов:
                </h2>
                <p className="text-sm sm:text-base text-[#BDBDBD] leading-relaxed pl-4 border-l-2 border-[#D4AF37]/40 font-sans">
                  Мгновенный автоматический расчет ключевых показателей эффективности (KPI) и умная сменная аналитика для полного контроля бизнеса без рутины.
                </p>
              </div>
            </div>

            {/* CTA Buttons Block */}
            <div className="flex flex-wrap gap-4 pt-4 items-center relative z-40">
              <button
                onClick={onOpenLoginModal}
                className="px-8 py-4 rounded-[18px] font-bold btn-primary-gold shadow-lg shadow-[#D4AF37]/15 hover:shadow-[#D4AF37]/25 active:scale-95 transition-all cursor-pointer text-sm flex items-center gap-2 font-sans shimmer-effect"
                id="hero-cta-trial"
              >
                Попробовать 7 дней бесплатно
              </button>
              <div className="btn-glow-border-container">
                <div className="btn-glow-border-bg" />
                <button
                  onClick={() => {
                    if (isMobile) {
                      setMobileScreen('calculator');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    } else {
                      const el = document.getElementById('calculator-section');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="px-6 py-4 btn-glow-border-content btn-secondary-glass transition-all text-sm cursor-pointer animate-pulse-slow"
                  id="hero-cta-calc"
                >
                  Рассчитать стоимость
                </button>
              </div>
            </div>
          </motion.div>

          {/* Right Mascot Block with Scroll-Linked Card Collection */}
          <div className="lg:col-span-5 flex justify-center items-end relative h-[450px] sm:h-[500px] md:h-[620px] w-full mt-[-60px] sm:mt-[-100px] lg:mt-auto overflow-visible order-1 lg:order-2" id="hero-mascot-container">
            {/* Mascot Container without the outer block/background */}
            <motion.div 
              initial={{ y: 220, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 45, damping: 14, delay: 0.1 }}
              className="relative flex flex-col items-center w-full z-10 pb-0 justify-end"
              id="hero-mascot-box"
            >
              <ParallaxMascot 
                src="/file/28/iirr2.png" 
                alt="Робот-Помощник RR" 
                className="w-[378px] h-[378px] sm:w-[540px] sm:h-[540px] md:w-[640px] md:h-[640px] lg:w-[700px] lg:h-[700px] max-w-none object-contain animate-pulse-slow relative z-10 translate-y-[-6px] sm:translate-y-12 md:translate-y-16"
                style={{
                  maskImage: 'linear-gradient(to top, transparent 0%, rgba(0,0,0,0.1) 8%, rgba(0,0,0,0.85) 25%, rgba(0,0,0,1) 50%)',
                  WebkitMaskImage: 'linear-gradient(to top, transparent 0%, rgba(0,0,0,0.1) 8%, rgba(0,0,0,0.85) 25%, rgba(0,0,0,1) 50%)'
                }}
                referrerPolicy="no-referrer"
                startProgress={0.45}
                maxOffset={200}
                maxFade={0.9}
              />

              {/* Glowing convergence point indicator at the bottom boundary */}
              <div 
                style={{ top: isMobile ? `${42 + Math.min(1, scrollRatio / 0.5) * (85 - 42)}%` : '85%' }}
                className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#D4AF37]/20 blur-md animate-ping z-30" 
              />

              {/* Central Unified AI Report Badge that builds up on scroll, positioned at the bottom boundary */}
              <motion.div
                style={{
                  opacity: Math.min(1, scrollRatio / 0.5),
                  scale: isMobile ? (0.5 + Math.min(1, scrollRatio / 0.5) * 0.7) : (0.5 + Math.min(1, scrollRatio / 0.5) * 1.5),
                  y: "-50%",
                  x: "-50%",
                  top: isMobile ? `${42 + Math.min(1, scrollRatio / 0.5) * (85 - 42)}%` : '85%',
                }}
                className="absolute left-1/2 z-30 p-[1.5px] rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(212,175,55,0.5)] w-32 text-center pointer-events-none"
              >
                {/* Centered perfect square rotating glow */}
                <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[250%] aspect-square bg-[conic-gradient(from_0deg,transparent_20%,rgba(212,175,55,0.45)_42%,#FFF8B4_50%,#D4AF37_58%,transparent_80%)] animate-[rotate-header-border_6s_linear_infinite] z-0" />
                </div>
                
                {/* Inner Content Card */}
                <div className="relative z-10 p-3 rounded-[15px] bg-[#070707]/25 backdrop-blur-xs flex flex-col items-center gap-1 w-full h-full">
                  <Sparkles className="text-[#D4AF37] animate-bounce animate-pulse" size={20} />
                  <p className="text-[10px] font-black uppercase text-[#D4AF37] tracking-wider font-mono">ИИ ОТЧЕТ</p>
                  <p className="text-[10px] text-[#FFF8B4] font-black uppercase tracking-wide font-mono">100% готов</p>
                </div>
              </motion.div>
            </motion.div>

            {/* 6 Miniature Report Cards collecting into Mascot, converging towards the bottom boundary */}
            {[
              { id: 'c1', label: 'Голос', detail: 'Голосовой отчет', icon: <Mic className="text-[#D4AF37] shrink-0" size={14} />, x: -180, y: -240, mx: -90, my: -120 },
              { id: 'c2', label: 'Текст', detail: 'Сводка работы', icon: <MessageSquare className="text-[#D4AF37] shrink-0" size={14} />, x: -210, y: -100, mx: -110, my: 0 },
              { id: 'c3', label: 'Геопозиция', detail: 'Объект: Москва', icon: <Compass className="text-[#D4AF37] shrink-0" size={14} />, x: -160, y: 40, mx: -90, my: 120 },
              { id: 'c4', label: 'Документ', detail: 'Регламент', icon: <FileText className="text-[#D4AF37] shrink-0" size={14} />, x: 180, y: -240, mx: 90, my: -120 },
              { id: 'c5', label: 'Фото', detail: 'Фотофиксация', icon: <Sparkles className="text-[#D4AF37] shrink-0" size={14} />, x: 210, y: -100, mx: 110, my: 0 },
              { id: 'c6', label: 'Чек-лист', detail: '14/14 проверено', icon: <CheckSquare className="text-[#D4AF37] shrink-0" size={14} />, x: 160, y: 40, mx: 90, my: 120 },
            ].map((card) => {
              // Apply mobile scaling and linear interpolation to converge at 50% scroll distance
              const convergenceRatio = Math.min(1, scrollRatio / 0.5);
              const startX = isMobile ? card.mx : card.x;
              const startY = isMobile ? card.my : card.y;
              const curX = startX * (1 - convergenceRatio);
              const curY = startY * (1 - convergenceRatio);
              const opacity = Math.max(0, 1 - convergenceRatio * 0.95);
              const scale = isMobile 
                ? (0.85 - convergenceRatio * 0.45) 
                : (1.4 - convergenceRatio * 0.7);
              const centerTop = isMobile ? (42 + convergenceRatio * (85 - 42)) : 85;

              return (
                <motion.div
                  key={card.id}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: `${centerTop}%`,
                    x: `calc(-50% + ${curX}px)`,
                    y: `calc(-50% + ${curY}px)`,
                    opacity: opacity,
                    scale: scale,
                    zIndex: scrollRatio > 0.15 ? 35 : 20,
                  }}
                  className="p-[1.5px] rounded-2xl overflow-hidden shadow-[0_12px_24px_rgba(0,0,0,0.85),0_0_15px_rgba(212,175,55,0.25)] pointer-events-none transition-all duration-100 flex flex-col items-center justify-center w-[110px] sm:w-[150px] h-auto min-h-[90px] sm:min-h-[125px] relative"
                >
                  {/* Centered perfect square rotating glow */}
                  <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[250%] aspect-square bg-[conic-gradient(from_0deg,transparent_20%,rgba(212,175,55,0.45)_42%,#FFF8B4_50%,#D4AF37_58%,transparent_80%)] animate-[rotate-header-border_6s_linear_infinite] z-0" />
                  </div>

                  {/* Inner Content Card (no blur, 25% transparent background to make text and icons 100% opaque and fully readable) */}
                  <div className="relative z-10 w-full h-full bg-[#050505]/25 backdrop-blur-xs rounded-[15px] flex flex-col items-center justify-center p-2.5 gap-1 text-center">
                    <div className="w-7 h-7 rounded-lg bg-[#D4AF37]/20 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(212,175,55,0.35)]">
                      {card.icon}
                    </div>
                    <div className="text-center w-full">
                      <p 
                        style={{ textShadow: '0 1px 3px rgba(0,0,0,1)' }}
                        className="text-[10px] sm:text-xs font-black text-white leading-tight uppercase tracking-wider"
                      >
                        {card.label}
                      </p>
                      <p 
                        style={{ textShadow: '0 1px 2.5px rgba(0,0,0,1)' }}
                        className="text-[9px] sm:text-[10px] text-[#FFFEE5] mt-0.5 leading-normal w-full font-black"
                      >
                        {card.detail}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

        </div>
      </section>
      )}

      {/* Golden Decorative Line */}
      {(!isMobile || mobileScreen === 'hero') && (
        <div className="w-full h-px bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent relative z-20" />
      )}

      {/* 2. CORE USP & FEATURES SECTION + INTERACTIVE SIMULATOR */}
      {(!isMobile || mobileScreen === 'demo') && (
        <>
          <section 
            className="pt-8 pb-20 px-4 sm:px-6 relative z-10" 
            id="features-section"
            style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.02) 200px, rgba(255,255,255,0.02) calc(100% - 200px), transparent 100%)' }}
          >
        <div className="mx-auto max-w-7xl">
          
          {/* TWO MAIN PRODUCTS SHOWCASE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* PRODUCT A: ИИ РЕВИЗОР (MAIN - PROJECTS & TASKS) */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6 }}
              className="space-y-6 flex flex-col justify-between"
              id="revisor-product-block"
            >
              {/* 3D Flip Card Container */}
              <div 
                onClick={() => setIsRevisorFlipped(!isRevisorFlipped)}
                className="w-full h-[430px] sm:h-[380px] [perspective:1000px] select-none"
                id="revisor-flip-card-wrapper"
              >
                <motion.div
                  animate={{ rotateY: isRevisorFlipped ? 180 : 0 }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                  className="relative w-full h-full [transform-style:preserve-3d]"
                >
                  {/* FRONT SIDE (Light Card) */}
                  <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] rounded-[24px] border border-[#D4AF37]/30 bg-[#F8F8F6]/95 p-6 sm:p-8 shadow-xl text-center flex flex-col items-center justify-center overflow-hidden">
                    <div className="absolute top-12 right-12 w-64 h-64 rounded-full bg-[#D4AF37]/5 blur-[50px] pointer-events-none" />
                    <div className="flex flex-col items-center gap-3 w-full">
                      <RevisorProcessVisualizer />
                      <div className="text-center">
                        <h4 className="text-2xl font-extrabold text-[#1A0F02] font-sans tracking-tight">ИИ РЕВИЗОР</h4>
                        <p className="text-[#3D2314] text-[10px] font-mono uppercase tracking-wider mt-1 font-bold">Нейросетевое автоуправление проектами</p>
                      </div>
                    </div>

                    <p className="text-[#2B180A] text-xs sm:text-sm leading-relaxed mt-4 max-w-lg text-center font-medium">
                      Полноценная замена зарубежным таск-менеджерам, где <strong className="text-[#8B4513] font-extrabold">нейросеть выступает в роли скрам-мастера и контролера</strong>. ИИ сам декомпозирует ваши цели, распределяет задачи, создает чек-листы и следит за их соблюдением.
                    </p>
                    
                    <div className="text-[#8B4513] text-[10px] font-bold font-mono tracking-wider mt-4 animate-pulse flex items-center gap-1.5 justify-center">
                      <span>✨ Нажмите для подробностей</span>
                    </div>
                  </div>

                  {/* BACK SIDE (Dark Card) */}
                  <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-[24px] border border-[#D4AF37]/40 bg-zinc-950 p-6 sm:p-8 shadow-xl text-left flex flex-col justify-between overflow-hidden">
                    {/* Ambient luxury gold glow */}
                    <div className="absolute -bottom-10 -right-10 w-48 h-48 rounded-full bg-[#D4AF37]/10 blur-[40px] pointer-events-none" />
                    
                    <div className="space-y-3.5 z-10 w-full">
                      <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                        <span className="text-xl">🕵️‍♂️</span>
                        <div>
                          <h4 className="text-base font-extrabold text-[#D4AF37] font-sans">ИИ РЕВИЗОР: Подробности</h4>
                          <p className="text-[9px] text-zinc-400 font-mono uppercase font-bold tracking-wider">Глубокая верификация и автопилот</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3 text-[11px] sm:text-xs text-zinc-200 leading-relaxed font-sans">
                        <p className="flex items-start gap-2">
                          <span className="text-[#D4AF37] text-sm mt-0.5">⚡</span>
                          <span><strong>Автопланирование:</strong> Полная раскладка целей на мелкие задачи с четкими инструкциями за 5 секунд.</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <span className="text-[#D4AF37] text-sm mt-0.5">🔍</span>
                          <span><strong>Тотальный контроль:</strong> Робот сам сверяет файлы, ссылки и скриншоты с чек-листом перед закрытием таски.</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <span className="text-[#D4AF37] text-sm mt-0.5">📈</span>
                          <span><strong>Умный Гантт:</strong> Авто-сдвиг дедлайнов и прогнозирование рисков перегрузки исполнителей.</span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-center z-10 border-t border-white/10 pt-3">
                      <span className="text-[#D4AF37]/80 hover:text-[#D4AF37] text-[10px] font-bold font-mono tracking-wider flex items-center gap-1 justify-center transition-colors">
                        <span>↩ Нажмите для возврата</span>
                      </span>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Recessed "Hole" peeking to background with rotating gold border glow */}
              <div className="relative overflow-hidden p-[1.5px] rounded-[24px] z-10 w-full shadow-2xl">
                {/* Rotating border bg */}
                <div className="absolute inset-0 w-[300%] h-[300%] -top-full -left-full bg-[conic-gradient(from_0deg,transparent_20%,rgba(212,175,55,0.45)_42%,#FFF8B4_50%,#D4AF37_58%,transparent_80%)] animate-[rotate-header-border_6s_linear_infinite] z-0" />
                
                {/* Inner Content (Transparent hole peeking through to global background with parallax) */}
                <div className="relative z-10 bg-black/60 backdrop-blur-none p-5 rounded-[23px] text-left space-y-3 shadow-[inset_0_4px_16px_rgba(0,0,0,0.95)] border border-[#D4AF37]/30">
                  <span className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-widest block font-mono">Мощнейший функционал Ревизора:</span>
                  <ul className="space-y-3 text-xs text-gray-200">
                    <li className="flex items-start gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] mt-1.5 shrink-0 animate-pulse" />
                      <span><strong className="text-[#D4AF37] font-black">ИИ Конструктор Проектов & Задач:</strong> Создавайте готовые спринты по одной голосовой команде — ИИ сам напишет ТЗ для каждого сотрудника.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] mt-1.5 shrink-0 animate-pulse" />
                      <span><strong className="text-[#D4AF37] font-black">Умный Гантт & Канбан Доски:</strong> Полноценный календарь с авто-сдвигом сроков с помощью нейросети или вручную.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] mt-1.5 shrink-0 animate-pulse" />
                      <span><strong className="text-[#D4AF37] font-black">ИИ Верификация по Чек-листам:</strong> Сотрудники сдают работу, а ИИ проводит детальный аудит результатов перед закрытием таски.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] mt-1.5 shrink-0 animate-pulse" />
                      <span><strong className="text-[#D4AF37] font-black">Реалтайм Доктор & Статусы:</strong> Мгновенный мониторинг зависших задач и перегрузок. Четко видно, кто пашет, а кто простаивает.</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Robot Mascot display - Recessed cutout */}
              <ParallaxBlock 
                startProgress={0.6}
                maxOffset={250}
                maxFade={1.0}
                className="relative z-10 w-full bg-transparent p-0 border-0 shadow-none overflow-visible"
              >
                {/* Inner Content */}
                <div className="relative z-10 p-0 text-left flex flex-col sm:flex-row items-center sm:items-start gap-6 md:gap-8">
                  <img 
                    src="/file/32/iirr6.png" 
                    alt="Робот Ревизор" 
                    className="w-52 h-52 sm:w-60 sm:h-60 md:w-64 md:h-64 object-contain animate-bounce-slow shrink-0"
                    style={{
                      WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%)',
                      maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%)'
                    }}
                  />
                  <div className="flex-1 mt-2">
                    <div className="relative bg-[#050505]/40 border border-amber-500/10 p-4 sm:p-5 rounded-2xl shadow-md">
                      <p className="text-gray-100 text-sm italic font-medium leading-relaxed">
                        "Я проверяю каждый шаг, сверяю файлы, скриншоты и ссылки с чек-листом. Халтура не пройдет!"
                      </p>
                      <span className="absolute -top-3 -left-1 text-4xl text-[#D4AF37]/25 font-serif select-none">“</span>
                    </div>
                  </div>
                </div>
              </ParallaxBlock>
            </motion.div>

            {/* PRODUCT B: ИИ РАПОРТ (COMPLEMENTARY - PERIODIC REPORTING) */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="space-y-6 flex flex-col justify-between"
              id="raport-product-block"
            >
              {/* 3D Flip Card Container */}
              <div 
                onClick={() => setIsRaportFlipped(!isRaportFlipped)}
                className="w-full h-[430px] sm:h-[380px] [perspective:1000px] select-none"
                id="raport-flip-card-wrapper"
              >
                <motion.div
                  animate={{ rotateY: isRaportFlipped ? 180 : 0 }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                  className="relative w-full h-full [transform-style:preserve-3d]"
                >
                  {/* FRONT SIDE (Light Card) */}
                  <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] rounded-[24px] border border-[#D4AF37]/30 bg-[#F8F8F6]/95 p-6 sm:p-8 shadow-xl text-center flex flex-col items-center justify-center overflow-hidden">
                    <div className="absolute top-12 right-12 w-64 h-64 rounded-full bg-[#D4AF37]/5 blur-[50px] pointer-events-none" />
                    <div className="flex flex-col items-center gap-3 w-full">
                      <RaportProcessVisualizer />
                      <div className="text-center">
                        <h4 className="text-2xl font-extrabold text-[#1A0F02] font-sans tracking-tight">ИИ РАПОРТ</h4>
                        <p className="text-[#3D2314] text-[10px] font-mono uppercase tracking-wider mt-1 font-bold">Голосовые отчеты и регулярные сводки</p>
                      </div>
                    </div>

                    <p className="text-[#2B180A] text-xs sm:text-sm leading-relaxed mt-4 max-w-lg text-center font-medium">
                      Идеальный сателлит для фиксации регулярной активности. <strong className="text-[#8B4513] font-extrabold">Освобождает команду от созвонов по статусу</strong>. Сотрудники просто наговаривают итоги смены голосом в Telegram или форму, а ИИ структурирует их за 5 секунд.
                    </p>
                    
                    <div className="text-[#8B4513] text-[10px] font-bold font-mono tracking-wider mt-4 animate-pulse flex items-center gap-1.5 justify-center">
                      <span>✨ Нажмите для подробностей</span>
                    </div>
                  </div>

                  {/* BACK SIDE (Dark Card) */}
                  <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-[24px] border border-[#D4AF37]/40 bg-zinc-950 p-6 sm:p-8 shadow-xl text-left flex flex-col justify-between overflow-hidden">
                    {/* Ambient luxury gold glow */}
                    <div className="absolute -bottom-10 -right-10 w-48 h-48 rounded-full bg-[#D4AF37]/10 blur-[40px] pointer-events-none" />
                    
                    <div className="space-y-3.5 z-10 w-full">
                      <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                        <span className="text-xl">🎙️</span>
                        <div>
                          <h4 className="text-base font-extrabold text-[#D4AF37] font-sans">ИИ РАПОРТ: Подробности</h4>
                          <p className="text-[9px] text-zinc-400 font-mono uppercase font-bold tracking-wider">Сменная аналитика и голосовой ввод</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3 text-[11px] sm:text-xs text-zinc-200 leading-relaxed font-sans">
                        <p className="flex items-start gap-2">
                          <span className="text-[#D4AF37] text-sm mt-0.5">🎙️</span>
                          <span><strong>Распознавание речи:</strong> Быстрый голосовой ввод свободной речью. ИИ сам очистит текст от слов-паразитов.</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <span className="text-[#D4AF37] text-sm mt-0.5">📝</span>
                          <span><strong>Идеальное форматирование:</strong> Преобразует хаотичные мысли в структурированный деловой отчет.</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <span className="text-[#D4AF37] text-sm mt-0.5">📊</span>
                          <span><strong>Аналитика аномалий:</strong> Сравнение сменных показателей, расчет личных KPI и автоматические оповещения в TG.</span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-center z-10 border-t border-white/10 pt-3">
                      <span className="text-[#D4AF37]/80 hover:text-[#D4AF37] text-[10px] font-bold font-mono tracking-wider flex items-center gap-1 justify-center transition-colors">
                        <span>↩ Нажмите для возврата</span>
                      </span>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Recessed "Hole" peeking to background with rotating gold border glow */}
              <div className="relative overflow-hidden p-[1.5px] rounded-[24px] z-10 w-full shadow-2xl">
                {/* Rotating border bg */}
                <div className="absolute inset-0 w-[300%] h-[300%] -top-full -left-full bg-[conic-gradient(from_0deg,transparent_20%,rgba(212,175,55,0.45)_42%,#FFF8B4_50%,#D4AF37_58%,transparent_80%)] animate-[rotate-header-border_6s_linear_infinite] z-0" />
                
                {/* Inner Content (Transparent hole peeking through to global background with parallax) */}
                <div className="relative z-10 bg-black/60 backdrop-blur-none p-5 rounded-[23px] text-left space-y-3 shadow-[inset_0_4px_16px_rgba(0,0,0,0.95)] border border-[#D4AF37]/30">
                  <span className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-widest block font-mono">Функционал ИИ Рапорта:</span>
                  <ul className="space-y-3 text-xs text-gray-200">
                    <li className="flex items-start gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] mt-1.5 shrink-0 animate-pulse" />
                      <span><strong className="text-[#D4AF37] font-black">Конструктор форм & Шаблоны:</strong> Создавайте уникальные опросники для любых отделов: Планы на день, Факты смены, Недели, Месяцы.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] mt-1.5 shrink-0 animate-pulse" />
                      <span><strong className="text-[#D4AF37] font-black">Голосовой Ввод & Саммари:</strong> Надиктуйте мысли свободной речью. ИИ уберет слова-паразиты и превратит в отчет в идеальном деловом стиле.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] mt-1.5 shrink-0 animate-pulse" />
                      <span><strong className="text-[#D4AF37] font-black">Календарь отчетов & Аналитика:</strong> Вся история в одном календаре. ИИ находит системные аномалии и строит красивые KPI-графики.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] mt-1.5 shrink-0 animate-pulse" />
                      <span><strong className="text-[#D4AF37] font-black">ТГ Бот-контролер & Тренды:</strong> Автоматические напоминания сотрудникам, мгновенные пуши директорам и отчетные саммари.</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Robot Mascot display - Recessed cutout */}
              <ParallaxBlock 
                startProgress={0.6}
                maxOffset={250}
                maxFade={1.0}
                className="relative z-10 w-full bg-transparent p-0 border-0 shadow-none overflow-visible"
              >
                {/* Inner Content */}
                <div className="relative z-10 p-0 text-left flex flex-col sm:flex-row items-center sm:items-start gap-6 md:gap-8">
                  <img 
                    src="/file/34/iirr8.png" 
                    alt="Робот Рапорт" 
                    className="w-52 h-52 sm:w-60 sm:h-60 md:w-64 md:h-64 object-contain animate-pulse-slow shrink-0"
                  />
                  <div className="flex-1 mt-2">
                    <div className="relative bg-[#050505]/40 border border-amber-500/10 p-4 sm:p-5 rounded-2xl shadow-md">
                      <p className="text-gray-200 text-sm italic font-medium leading-relaxed">
                        "Я преобразую ваш голос в структурированный текст, рассчитываю рейтинг сотрудников и мгновенно оповещаю в Телеграм."
                      </p>
                      <span className="absolute -top-3 -left-1 text-4xl text-[#D4AF37]/25 font-serif select-none">“</span>
                    </div>
                  </div>
                </div>
              </ParallaxBlock>
            </motion.div>

          </div>
        </div>
      </section>
      {/* NEW: INTERACTIVE STEP-BY-STEP SIMULATOR SECTION (LIGHT) */}
      <section 
        className="py-24 px-4 sm:px-6 relative overflow-hidden" 
        id="interactive-simulator-section"
        style={{ background: 'linear-gradient(180deg, transparent 0%, #F8F8F6 200px, #FFFFFF calc(100% - 200px), transparent 100%)' }}
      >
        {/* Absolute glow element */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-amber-400/5 blur-[100px] pointer-events-none" />
        
        <div className="mx-auto max-w-7xl">
          
          <div className="text-center space-y-4 max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-semibold uppercase tracking-wider font-mono">
              <Sparkles size={13} className="text-[#D4AF37] animate-pulse" />
              <span>9 суперспособностей ИИ Ревизора</span>
            </div>
            <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1C1C1C] font-sans">
              Как устроен рабочий цикл ИИ Ревизора
            </h3>
          </div>

          <InteractiveFlowSimulator />

        </div>
      </section>
        </>
      )}

      {/* 4. ONE TOOL FOR HUNDREDS OF SCENARIOS (DARK VIEW WITH TRANSPARENT GRADIENTS FOR TRANSITIONS) */}
      {(!isMobile || mobileScreen === 'templates') && (
        <section 
          className="py-16 md:py-24 px-4 sm:px-6 relative overflow-hidden z-10" 
          id="scenarios-section"
          style={{ background: 'linear-gradient(180deg, rgba(7,7,7,0) 0%, #070707 15%, #070707 85%, rgba(7,7,7,0) 100%)' }}
        >
        <div className="mx-auto max-w-7xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6 }}
            id="templates-showcase"
            className="w-full space-y-8"
          >
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#D4AF37]">
                <Sparkles size={12} className="animate-pulse" />
                <span className="text-[9px] uppercase tracking-wider font-extrabold font-mono">100% Универсальность</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight bg-gradient-to-r from-[#FFF8B4] to-[#D4AF37] bg-clip-text text-transparent">
                Один инструмент для сотен сценариев
              </h3>
              <p className="text-xs sm:text-sm text-slate-300">
                Проект в <span className="text-[#D4AF37] font-semibold">RR</span> — это не только классическая ИТ-разработка. Наша система декомпозиции и ИИ-Ревизор идеально подходят для абсолютно любых бизнес-процессов и бытовых задач. Выберите шаблон ниже, чтобы увидеть совместную работу человека и нейросети.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch lg:h-[680px]">
              {/* Centered Mobile Template Carousel */}
              <div className="block lg:hidden w-full py-4 relative" id="templates-mobile-carousel">
                <div className="flex items-center justify-between gap-4 max-w-sm mx-auto px-4">
                  {/* Left Arrow Button */}
                  <button
                    onClick={() => {
                      const currentIndex = UNIVERSAL_TEMPLATES.findIndex(t => t.id === selectedTplId);
                      const prevIndex = (currentIndex - 1 + UNIVERSAL_TEMPLATES.length) % UNIVERSAL_TEMPLATES.length;
                      setSelectedTplId(UNIVERSAL_TEMPLATES[prevIndex].id);
                    }}
                    className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white active:scale-90 transition-all cursor-pointer shadow-md"
                    aria-label="Предыдущий шаблон"
                  >
                    <span>◀</span>
                  </button>

                  {/* Active Centered Template Card */}
                  {(() => {
                    const activeTpl = UNIVERSAL_TEMPLATES.find(t => t.id === selectedTplId) || UNIVERSAL_TEMPLATES[0];
                    return (
                      <motion.div
                        key={activeTpl.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2 }}
                        className="flex-1 p-4 rounded-2xl border-2 border-[#D4AF37] bg-white/10 text-white flex items-center gap-3 shadow-[0_0_15px_rgba(212,175,55,0.25)] text-left min-w-0"
                      >
                        <span className="text-3xl shrink-0">{activeTpl.emoji}</span>
                        <div className="min-w-0 flex-1">
                          <span className="text-[9px] uppercase tracking-wider text-[#D4AF37] font-bold font-mono">Шаблон {UNIVERSAL_TEMPLATES.indexOf(activeTpl) + 1}/11</span>
                          <h4 className="text-xs font-black leading-tight truncate text-white mt-0.5">{activeTpl.title}</h4>
                          <p className="text-[10px] text-slate-300 truncate mt-0.5">{activeTpl.category}</p>
                        </div>
                      </motion.div>
                    );
                  })()}

                  {/* Right Arrow Button */}
                  <button
                    onClick={() => {
                      const currentIndex = UNIVERSAL_TEMPLATES.findIndex(t => t.id === selectedTplId);
                      const nextIndex = (currentIndex + 1) % UNIVERSAL_TEMPLATES.length;
                      setSelectedTplId(UNIVERSAL_TEMPLATES[nextIndex].id);
                    }}
                    className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white active:scale-90 transition-all cursor-pointer shadow-md"
                    aria-label="Следующий шаблон"
                  >
                    <span>▶</span>
                  </button>
                </div>

                {/* Dot Indicators */}
                <div className="flex justify-center gap-1 mt-4">
                  {UNIVERSAL_TEMPLATES.map((tpl, idx) => {
                    const isActive = selectedTplId === tpl.id;
                    return (
                      <button
                        key={tpl.id}
                        onClick={() => setSelectedTplId(tpl.id)}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          isActive 
                            ? 'bg-[#D4AF37] w-4' 
                            : 'bg-white/20 hover:bg-white/40 w-1.5'
                        }`}
                        aria-label={`Шаблон ${idx + 1}`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Left: Interactive list of 11 templates - transparent glass style (desktop only) */}
              <div className="hidden lg:flex lg:col-span-5 flex-col gap-2 h-full overflow-y-auto pr-1.5 custom-scrollbar" id="templates-list-left">
                <div className="text-[10px] uppercase font-bold text-slate-400 px-2 pb-1 tracking-widest flex items-center justify-between">
                  <span>Доступные шаблоны:</span>
                  <span className="text-[#D4AF37] font-mono font-black">11 готовых решений</span>
                </div>

                {UNIVERSAL_TEMPLATES.map((tpl) => {
                  const isActive = selectedTplId === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      id={`btn-${tpl.id}`}
                      onClick={() => setSelectedTplId(tpl.id)}
                      className={`w-full text-left p-3.5 rounded-[20px] border transition-all duration-300 flex items-center justify-between group cursor-pointer ${
                        isActive
                          ? 'bg-white/10 border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.15)] text-white'
                          : 'bg-white/5 border-white/5 hover:border-white/15 hover:bg-white/10 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl shrink-0 group-hover:scale-110 transition-transform">{tpl.emoji}</span>
                        <div className="min-w-0">
                          <h4 className={`text-xs font-bold leading-snug truncate ${isActive ? 'text-[#D4AF37]' : 'text-slate-300 group-hover:text-white'}`}>
                            {tpl.title}
                          </h4>
                          <p className="text-[9px] text-slate-400 mt-0.5 truncate">{tpl.category}</p>
                        </div>
                      </div>
                      <div className={`shrink-0 ml-2 p-1 rounded-lg transition-all ${isActive ? 'bg-[#D4AF37]/15 text-[#D4AF37]' : 'bg-white/5 text-slate-400 group-hover:text-white group-hover:bg-white/10'}`}>
                        <ChevronRight size={14} className={isActive ? 'translate-x-0.5 transition-transform' : ''} />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Right: Detailed layout of active template - transparent glass style with view toggle */}
              <div className="col-span-1 lg:col-span-7 h-full" id="templates-details-right">
                <AnimatePresence mode="wait">
                  {UNIVERSAL_TEMPLATES.map((tpl) => {
                    if (tpl.id !== selectedTplId) return null;
                    return (
                      <motion.div
                        key={tpl.id}
                        id={`showcase-detail-${tpl.id}`}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="h-full flex flex-col rounded-[24px] border border-white/10 bg-[#161616]/75 p-5 sm:p-6 shadow-2xl relative overflow-hidden backdrop-blur-md text-white"
                      >
                        {/* Ambient glow */}
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                        {/* Detail Header */}
                        <div className="flex flex-wrap items-center gap-4 justify-between pb-4 border-b border-white/10 relative z-10">
                          <div className="flex items-center gap-3">
                            <span className="text-4xl shrink-0 bg-white/5 p-2.5 rounded-[18px] border border-white/10">{tpl.emoji}</span>
                            <div>
                              <span className="inline-block text-[9px] font-black uppercase tracking-wider text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded-full mb-1">
                                {tpl.category}
                              </span>
                              <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                                {tpl.title}
                              </h3>
                            </div>
                          </div>

                          {/* View Switcher Toggle - premium glass style */}
                          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 gap-1 shadow-sm" id="tpl-view-switcher">
                            <button
                              onClick={() => setTplViewMode('simulator')}
                              className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                tplViewMode === 'simulator'
                                  ? 'bg-[#D4AF37] text-black font-extrabold shadow'
                                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
                              }`}
                            >
                              Симулятор ИИ
                            </button>
                            <button
                              onClick={() => setTplViewMode('details')}
                              className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                tplViewMode === 'details'
                                  ? 'bg-[#D4AF37] text-black font-extrabold shadow'
                                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
                              }`}
                            >
                              Чек-лист
                            </button>
                          </div>
                        </div>

                        {/* Description */}
                        <div className="py-4 text-xs text-slate-300 leading-relaxed relative z-10 border-b border-white/10">
                          {tpl.desc}
                        </div>

                        {/* Body Content dependent on tplViewMode */}
                        <div className="py-4 flex-grow relative z-10">
                          <AnimatePresence mode="wait">
                            {tplViewMode === 'simulator' ? (
                              <motion.div
                                key="simulator-view"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                              >
                                <TemplateVerificationSimulator templateId={tpl.id} templateTitle={tpl.title} />
                              </motion.div>
                            ) : (
                              <motion.div
                                key="details-view"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="grid grid-cols-1 md:grid-cols-2 gap-5 h-full"
                              >
                                {/* Col 1: Checklist tasks */}
                                <div className="space-y-3">
                                  <div className="flex items-center gap-1.5 text-white">
                                    <ListTodo size={14} className="text-[#D4AF37]" />
                                    <h5 className="text-[10px] font-bold uppercase tracking-wider">Декомпозиция задач:</h5>
                                  </div>
                                  <div className="space-y-2.5 bg-black/40 p-3.5 rounded-[20px] border border-white/5 h-[260px] overflow-y-auto custom-scrollbar">
                                    {tpl.tasks.map((task, idx) => (
                                      <div key={idx} className="flex items-start gap-2 text-[11px] text-slate-200 leading-snug">
                                        <div className="w-4 h-4 rounded bg-white/10 border border-white/10 flex items-center justify-center text-[9px] font-mono font-bold text-[#D4AF37] shrink-0 mt-0.5 shadow-sm">
                                          {idx + 1}
                                        </div>
                                        <span>{task}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Col 2: AI Verification */}
                                <div className="space-y-3">
                                  <div className="flex items-center gap-1.5 text-[#D4AF37]">
                                    <Shield size={14} />
                                    <h5 className="text-[10px] font-bold uppercase tracking-wider">{tpl.aiCheckTitle}</h5>
                                  </div>
                                  <div className="space-y-2.5 bg-black/40 p-3.5 rounded-[20px] border border-white/5 h-[260px] overflow-y-auto custom-scrollbar">
                                    {tpl.aiCheckPoints.map((point, idx) => (
                                      <div key={idx} className="flex items-start gap-2 text-[11px] text-slate-200 leading-snug">
                                        <Check size={12} className="text-[#D4AF37] shrink-0 mt-0.5" />
                                        <span>{point}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Action Button */}
                        <div className="pt-4 border-t border-white/15 flex flex-wrap items-center justify-end gap-3 relative z-10">
                          <button
                            onClick={onOpenLoginModal}
                            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#F4D06F] via-[#D4AF37] to-[#9F7B12] hover:brightness-110 active:scale-98 transition-all text-slate-900 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/5"
                          >
                            <span>Активировать шаблон</span>
                            <ArrowRight size={13} />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
      )}

      {/* 5. PRICING & CALCULATOR SECTION */}
      {(!isMobile || mobileScreen === 'calculator') && (
        <section 
          className="py-16 md:py-32 px-4 sm:px-6 relative z-10" 
          id="calculator-section"
          style={{ background: 'linear-gradient(180deg, transparent 0%, #FFFFFF 380px, #F8F8F6 calc(100% - 380px), transparent 100%)' }}
        >
        <div className="mx-auto max-w-7xl text-center space-y-12">
          
          <div className="space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-semibold uppercase tracking-wider font-mono">
              Тарифы и калькулятор
            </div>
            <h3 className="text-3xl sm:text-5xl font-black tracking-tight text-[#1C1C1C]">
              Прозрачная стоимость без скрытых платежей
            </h3>
            <p className="text-[#666666] text-sm sm:text-base leading-relaxed">
              Начните с бесплатного пробного периода и переходите на бизнес-тариф по мере масштабирования компании.
            </p>
          </div>

          <div className="flex flex-col gap-10 w-full text-left mt-10">
            
            {/* Section 1: Horizontal Trial Card (Full Width) */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6 }}
              className="w-full rounded-[24px] border border-black/8 bg-white/65 backdrop-blur-[22px] p-6 sm:p-8 shadow-xl relative overflow-hidden group text-[#1C1C1C]"
              id="horizontal-trial-block"
            >
              <div className="absolute top-0 right-0 px-3 py-1 text-[10px] font-bold tracking-widest text-[#D4AF37] uppercase bg-[#D4AF37]/10 rounded-bl-2xl border-l border-b border-black/5 font-mono">
                ТРИАЛ
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                
                {/* Left: Info & Big price */}
                <div className="lg:col-span-4 space-y-4 text-left">
                  <div>
                    <h4 className="text-2xl sm:text-3xl font-extrabold text-[#1C1C1C] font-sans tracking-tight">
                      Пробный период
                    </h4>
                    <p className="text-[#666666] text-xs mt-1 leading-relaxed">
                      Оцените все преимущества ИИ-отчетности абсолютно бесплатно в течение 7 дней.
                    </p>
                  </div>

                  <div className="text-4xl sm:text-5xl font-black text-[#D4AF37] font-sans">
                    0 ₽ <span className="text-xs sm:text-sm text-[#666666] font-normal">/ 7 дней триала</span>
                  </div>

                  {/* Mascot integrated */}
                  <ParallaxBlock 
                    startProgress={0.6}
                    maxOffset={250}
                    maxFade={1.0}
                    className="flex flex-col sm:flex-row items-center gap-4 bg-transparent p-0 border-0 shadow-none overflow-visible w-full"
                  >
                    <img 
                      src="/file/23/iirr10.png" 
                      alt="Робот RR" 
                      className="w-40 h-40 sm:w-44 sm:h-44 object-contain animate-pulse-slow shrink-0"
                    />
                    <div className="text-left flex-1">
                      <div className="relative bg-[#FAF9F5]/90 p-4 rounded-2xl border border-[#D4AF37]/20 shadow-md">
                        <p className="text-xs text-[#1C1C1C] italic font-medium leading-relaxed">
                          "Дарим сияние и 7 дней свободы! Тестируйте без обязательств!"
                        </p>
                        <span className="absolute -top-2.5 -left-1 text-2xl text-[#D4AF37]/35 font-serif select-none">“</span>
                      </div>
                    </div>
                  </ParallaxBlock>
                </div>

                {/* Middle: Beautiful checklist of benefits */}
                <div className="lg:col-span-5 text-left bg-black/5 p-5 rounded-[20px] border border-black/5">
                  <span className="text-[10px] text-[#666666] font-bold uppercase tracking-widest block mb-3 font-mono">Что входит в тест-драйв:</span>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#666666]">
                    <li className="flex items-start gap-2">
                      <Check size={14} className="text-[#D4AF37] shrink-0 mt-0.5" />
                      <span>Бесплатно <strong className="text-[#D4AF37]">10 проектов</strong> и 50 отчетов</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={14} className="text-[#D4AF37] shrink-0 mt-0.5" />
                      <span>Без ограничений по отделам</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={14} className="text-[#D4AF37] shrink-0 mt-0.5" />
                      <span>Неограниченно руководителей</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={14} className="text-[#D4AF37] shrink-0 mt-0.5" />
                      <span>ИИ-автогенерация структуры</span>
                    </li>
                    <li className="flex items-start gap-2 sm:col-span-2">
                      <Check size={14} className="text-[#D4AF37] shrink-0 mt-0.5" />
                      <span>Интеграция с Telegram и личный график</span>
                    </li>
                  </ul>
                </div>

                {/* Right: Large button */}
                <div className="lg:col-span-3 flex flex-col justify-center">
                  <button
                    onClick={onOpenLoginModal}
                    className="w-full py-4 rounded-[18px] font-bold btn-primary-gold shadow-lg shadow-[#D4AF37]/15 hover:shadow-[#D4AF37]/25 active:scale-95 transition-all cursor-pointer text-xs sm:text-sm uppercase tracking-wider font-sans text-center shimmer-effect"
                  >
                    Запустить триал бесплатно
                  </button>
                  <p className="text-[10px] text-[#666666] mt-2 text-center">
                    Без привязки банковской карты
                  </p>
                </div>

              </div>
            </motion.div>

            {/* Section 2: Unified Tariff & ROI Calculator (Full Width) */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6 }}
              className="w-full"
            >
              <TariffCalculator 
                onAction={onOpenLoginModal} 
                actionButtonText="Купить подписку" 
                initialEmployees={15}
                alwaysLight={true}
              />
            </motion.div>

          </div>
        </div>
      </section>
      )}

      {/* 5. INTERACTIVE REVIEWS & FEEDBACK FORM */}
      {(!isMobile || mobileScreen === 'reviews') && (
        <section 
          className="pt-4 pb-20 px-4 sm:px-6 relative overflow-hidden" 
          id="reviews-section"
          style={{ background: 'transparent' }}
        >
        {/* Glow lighting */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-[#D4AF37]/5 blur-[120px] pointer-events-none" />

        <div className="mx-auto max-w-7xl relative z-10">
          
          <div className="text-center space-y-4 mb-12">
            {/* Center Mascot with parallax disappearance */}
            <ParallaxBlock
              startProgress={0.6}
              maxOffset={70}
              maxFade={1.0}
              className="flex justify-center mb-6"
            >
              <img 
                src="/file/33/iirr7.png" 
                alt="Робот Маскот Отзывы" 
                className="w-60 h-60 sm:w-64 sm:h-64 object-contain animate-bounce-slow"
              />
            </ParallaxBlock>

            <div className="inline-flex items-center gap-2 justify-center">
              <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-[#D4AF37] bg-clip-text text-transparent">
                Что говорят клиенты
              </h3>
            </div>
            <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
              Реальные отзывы руководителей и владельцев бизнеса о качестве и удобстве сервиса. Напишите свой анонимный отзыв, и наш ИИ ответит на него мгновенно!
            </p>
          </div>

          <div className="max-w-2xl mx-auto space-y-8" id="reviews-interactive-container">
            
            {/* Reviews display list (Vertical Carousel with 2 preview blocks on each side) */}
            <div 
              className="w-full space-y-6" 
              id="reviews-carousel-container"
            >
              <VerticalReviewsCarousel 
                reviews={reviews}
                activeIndex={activeReviewIndex}
                onChangeIndex={(idx) => {
                  setActiveReviewIndex(idx);
                }}
                isCommentsOpen={showComments}
                isWriteReviewOpen={showWriteReview}
                onToggleComments={() => {
                  setShowComments(!showComments);
                  setShowWriteReview(false);
                }}
                onToggleWriteReview={() => {
                  setShowWriteReview(!showWriteReview);
                  setShowComments(false);
                }}
              />
            </div>

            <AnimatePresence mode="wait">
              {showComments && reviews[activeReviewIndex] && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="w-full overflow-hidden"
                  key={`comments-${reviews[activeReviewIndex].id}`}
                >
                  <CommentsSection 
                    entityId={`review-${reviews[activeReviewIndex].id}`} 
                    entityType="review" 
                    entityTitle={`Отзыв от ${reviews[activeReviewIndex].name}`} 
                    currentUser={currentUser} 
                  />
                </motion.div>
              )}

              {showWriteReview && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="w-full overflow-hidden rounded-[24px] border border-amber-400/40 bg-[#1A0F02]/70 backdrop-blur-md p-6 sm:p-8 shadow-[0_0_30px_rgba(244,238,142,0.15)] relative"
                  id="review-form-box"
                  key="write-review-form"
                >
                  <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/0 via-amber-400/5 to-transparent" />
                  
                  {currentUser ? (
                    <>
                      <h4 className="text-base sm:text-lg font-bold text-[#F4EE8E] mb-1 font-sans">Оставить отзыв как {currentUser.name}</h4>
                      <p className="text-zinc-300 text-sm mb-6 font-sans">Вы вошли как зарегистрированный пользователь.</p>
                    </>
                  ) : (
                    <>
                      <h4 className="text-base sm:text-lg font-bold text-[#F4EE8E] mb-1 font-sans">Оставить анонимный отзыв</h4>
                      <p className="text-zinc-300 text-sm mb-6 font-sans">Ваше мнение улучшает качество работы нашего сервиса.</p>
                    </>
                  )}

                  <form onSubmit={handleSubmitReview} className="space-y-4">
                    <div>
                      <label className="block text-sm text-zinc-200 font-semibold mb-1.5">Ваше имя *</label>
                      <MiniAudioField
                        value={currentUser ? currentUser.name : newReviewName}
                        onChange={(text) => {
                          if (!currentUser) setNewReviewName(text);
                        }}
                        disabled={!!currentUser}
                        placeholder="Например, Виталий или надиктуйте голосом..."
                        isLightTheme={false}
                        multiline={false}
                        showPlayer={false}
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-zinc-200 font-semibold mb-1.5">Компания / Сфера деятельности</label>
                      <MiniAudioField
                        value={currentUser ? (currentUser.position || 'Пользователь ИИ Рапорт') : newReviewCompany}
                        onChange={(text) => {
                          if (!currentUser) setNewReviewCompany(text);
                        }}
                        disabled={!!currentUser}
                        placeholder="Например, ООО «ПродОпт» или надиктуйте..."
                        isLightTheme={false}
                        multiline={false}
                        showPlayer={false}
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-zinc-200 font-semibold mb-1.5">Текст отзыва или голосовая запись *</label>
                      <MiniAudioField
                        multiline={true}
                        rows={4}
                        value={newReviewText}
                        onChange={setNewReviewText}
                        audioUrl={newReviewAudioUrl}
                        onAudioUrlChange={setNewReviewAudioUrl}
                        placeholder="Поделитесь вашим впечатлением от использования или надиктуйте голосом..."
                        isLightTheme={false}
                        showPlayer={true}
                      />
                    </div>

                    {isSubmittingReview && (
                      <div className="p-3 bg-amber-400/10 border border-amber-400/30 text-amber-200 text-sm rounded-xl flex items-center gap-2 animate-pulse">
                        <Sparkles size={16} className="animate-spin text-[#E7C768]" />
                        <span>{aiReviewReply}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmittingReview || (!currentUser && !newReviewName.trim()) || !newReviewText.trim()}
                      className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-amber-950 text-sm tracking-wider hover:brightness-110 active:scale-98 disabled:opacity-50 disabled:scale-100 transition-all cursor-pointer font-sans shadow-[0_0_20px_rgba(244,238,142,0.25)]"
                    >
                      Отправить отзыв
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>
      </section>
      )}

      {/* Mobile Screen Bottom Pager */}
      {isMobile && (
        <div className="px-4 pb-8 relative z-30">
          <MobileScreenSwitcher
            screens={mobileScreens}
            activeScreen={mobileScreen}
            onSelectScreen={setMobileScreen}
            showBottomPager={true}
          />
        </div>
      )}

    </div>
  );
}
