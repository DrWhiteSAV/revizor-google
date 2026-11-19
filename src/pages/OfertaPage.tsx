import React, { useEffect, useState, useMemo } from 'react';
import { ShieldCheck, Calendar, FileText, CheckCircle2, AlertCircle, Coins, ArrowLeft, Shield, Lock, UserCheck, RefreshCw } from 'lucide-react';
import { usePageSeo } from '../utils/seo/usePageSeo';
import { useAppVersion } from '../hooks/useAppVersion';

interface TariffItem {
  id: string;
  product_name: string;
  product_key: string;
  price_per_unit: number;
  unit_name: string;
  trial_limit: string;
  description: string;
  features?: string;
  updated_at: string;
}

type LegalDocTab = 'oferta' | 'privacy' | 'terms' | 'consent';

export default function OfertaPage() {
  const [activeTab, setActiveTab] = useState<LegalDocTab>(() => {
    if (typeof window !== 'undefined') {
      const tabParam = new URLSearchParams(window.location.search).get('tab');
      if (tabParam === 'privacy') return 'privacy';
      if (tabParam === 'terms') return 'terms';
      if (tabParam === 'consent' || tabParam === 'personal-data') return 'consent';
    }
    return 'oferta';
  });
  const [tariffs, setTariffs] = useState<TariffItem[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('01.07.2026');
  const [loading, setLoading] = useState<boolean>(true);
  const appVersion = useAppVersion();

  const ofertaJsonLd = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://ii-rr.ru';
    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage',
          name: 'Публичная оферта и политика конфиденциальности | ИИ Ревизор & ИИ Рапорт',
          description:
            'Официальная публичная оферта ООО «РентРоп», тарифная сетка, правила рекуррентных платежей, политика конфиденциальности и согласие 152-ФЗ.',
          url: `${origin}/oferta`,
          inLanguage: 'ru-RU'
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Главная', item: `${origin}/` },
            { '@type': 'ListItem', position: 2, name: 'Публичная оферта', item: `${origin}/oferta` }
          ]
        }
      ]
    };
  }, []);

  usePageSeo({
    title: 'Публичная оферта и документы | ИИ Ревизор & ИИ Рапорт',
    description:
      'Официальная публичная оферта ООО «РентРоп», тарифы, реквизиты, политика конфиденциальности и согласие на обработку данных 152-ФЗ.',
    keywords: 'публичная оферта ООО РентРоп, политика конфиденциальности ИИ Рапорт, тарифы ИИ Ревизор, 152-ФЗ',
    path: '/oferta',
    ogType: 'website',
    image: '/file/21/iirrsocial.jpg',
    imageWidth: 1280,
    imageHeight: 756,
    imageAlt: 'Публичная оферта и правовые документы ИИ Ревизор & ИИ Рапорт',
    jsonLd: ofertaJsonLd
  });

  const handleTabChange = (tab: LegalDocTab) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab === 'consent' ? 'personal-data' : tab);
      window.history.replaceState({}, '', url.toString());
    }
  };

  useEffect(() => {
    fetch('/api/tariffs')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.tariffs)) {
          setTariffs(data.tariffs);
          if (data.lastUpdated) {
            const parsedDate = new Date(data.lastUpdated);
            if (!isNaN(parsedDate.getTime())) {
              const formatted = parsedDate.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              });
              setLastUpdated(formatted);
            } else {
              setLastUpdated(data.lastUpdated);
            }
          }
        }
      })
      .catch((err) => {
        console.warn('Failed to load tariffs on Oferta page:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="w-full min-h-screen text-amber-100/90 bg-[#140A01] font-sans selection:bg-[#E7C768] selection:text-amber-950 px-4 sm:px-6 py-12 relative overflow-hidden" id="oferta-page-root">
      {/* Background Golden Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(244,238,142,0.06),transparent_70%)]" />

      <div className="mx-auto max-w-4xl space-y-8 bg-[#1A0F02]/90 backdrop-blur-md border border-[#E7C768]/40 p-6 sm:p-10 rounded-3xl relative overflow-hidden shadow-[0_0_30px_rgba(244,238,142,0.15)]">
        
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-500/20 pb-4">
          <a
            href="/cabinet"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 text-[#F4EE8E] text-sm font-bold transition-all border border-amber-400/30 w-fit cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Вернуться в кабинет</span>
          </a>

          <div className="inline-flex items-center gap-1.5 bg-amber-400/10 border border-amber-400/30 text-[#F4EE8E] px-3.5 py-1.5 rounded-full text-sm font-mono font-bold">
            <FileText size={15} />
            <span>Официальная документация сервиса ({appVersion})</span>
          </div>
        </div>

        {/* Legal Tabs Navigation Bar */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-black/40 border border-amber-400/30 select-none">
          <button
            type="button"
            onClick={() => handleTabChange('oferta')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'oferta'
                ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 shadow-md font-black'
                : 'text-stone-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText size={15} />
            <span>Публичная оферта и подписка</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('privacy')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'privacy'
                ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 shadow-md font-black'
                : 'text-stone-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Lock size={15} />
            <span>Политика конфиденциальности</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('terms')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'terms'
                ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 shadow-md font-black'
                : 'text-stone-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Shield size={15} />
            <span>Пользовательское соглашение</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('consent')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'consent'
                ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 shadow-md font-black'
                : 'text-stone-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <UserCheck size={15} />
            <span>Согласие на обработку данных</span>
          </button>
        </div>

        {/* TAB 1: ПУБЛИЧНАЯ ОФЕРТА */}
        {activeTab === 'oferta' && (
          <div className="space-y-6 animate-fade-in text-sm leading-relaxed">
            <div className="text-center space-y-2">
              <h1 className="text-2xl sm:text-3xl font-black text-[#F4EE8E] font-sans tracking-tight">
                Договор публичной оферты «ИИ Рапорт & ИИ Ревизор»
              </h1>
              <p className="text-sm text-amber-200/80 font-mono">
                ООО «РентРоп» · Актуальная редакция от: <strong className="text-[#F4EE8E]">{lastUpdated}</strong> · Версия: <strong className="text-[#F4EE8E]">{appVersion}</strong>
              </p>
            </div>

            {/* TAXATION BADGE (НДС 5% ОСН) */}
            <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-400/40 space-y-2 text-sm text-amber-100">
              <div className="flex items-center gap-2 text-[#F4EE8E] font-bold text-sm">
                <ShieldCheck size={18} />
                <span>Налоговый режим и статус исполнителя:</span>
              </div>
              <p>
                Исполнитель ООО «РентРоп» применяет <strong>Общую систему налогообложения (ОСН)</strong>.
                Все тарифы и услуги облагаются налогом на добавленную стоимость по ставке <strong>НДС 5%</strong> (в соответствии с положениями Налогового кодекса Российской Федерации).
              </p>
            </div>

            <p className="bg-amber-950/30 p-4 rounded-2xl border border-amber-500/30 text-amber-100 text-sm">
              Настоящий документ представляет собой официальное публичное предложение Общества с ограниченной ответственностью «РентРоп» (далее — Исполнитель) заключить Договор об оказании цифровых услуг и предоставлении права использования программных комплексов <strong>«ИИ Рапорт»</strong> и <strong>«ИИ Ревизор»</strong> (домены ii-rr.ru и ii-rr.online) на изложенных ниже условиях.
            </p>

            {/* 1. ТЕРМИНЫ */}
            <div className="space-y-3">
              <h3 className="font-black text-[#F4EE8E] text-base flex items-center gap-2 border-b border-amber-500/20 pb-2">
                <span>1. Термины и определения</span>
              </h3>
              <p>
                <strong>Исполнитель</strong> — ООО «РентРоп» (ИНН 7726477438, ОГРН 1217700234157, адрес: 115191, г. Москва, пер. Духовской, д. 17, стр. 15, помещ. 11Н/2, электронная почта: info@arenda-ropa.com).
              </p>
              <p>
                <strong>Заказчик</strong> — любое юридическое лицо, индивидуальный предприниматель или полностью дееспособное физическое лицо, совершившее акцепт настоящей оферты путем регистрации в Сервисе или пополнения расчетного счета RR.
              </p>
              <p>
                <strong>Виртуальная валюта RR (RentRop Token)</strong> — расчетная единица внутреннего аналитического учета внутриплатформенных токенов и квот для вызова нейросетевых алгоритмов, генерации отчетов и аудита задач. Курс конвертации: 1 RR = 1 российский рубль.
              </p>
              <p>
                <strong>Рекуррентные платежи</strong> — автоматическое регулярное списание денежных средств с банковской карты Заказчика в пользу Исполнителя без необходимости повторного ввода реквизитов карты, на основании предварительно выраженного Заказчиком согласия при подключении подписки.
              </p>
            </div>

            {/* 2. ПРЕДМЕТ ДОГОВОРА */}
            <div className="space-y-3">
              <h3 className="font-black text-[#F4EE8E] text-base flex items-center gap-2 border-b border-amber-500/20 pb-2">
                <span>2. Предмет договора</span>
              </h3>
              <p>
                Исполнитель предоставляет Заказчику право доступа к облачному программному обеспечению «ИИ Рапорт» и «ИИ Ревизор», а также комплекс вычислительных услуг по нейросетевому анализу рабочих отчетов, верификации выполнения задач по чек-листам и автоматизации коммуникаций, а Заказчик обязуется своевременно оплачивать услуги в соответствии с установленными тарифами.
              </p>
            </div>

            {/* 3. ТАРИФЫ И ПОРЯДОК РАСЧЕТОВ */}
            <div className="space-y-4">
              <h3 className="font-black text-[#F4EE8E] text-base flex items-center gap-2 border-b border-amber-500/20 pb-2">
                <Coins className="text-amber-400" size={18} />
                <span>3. Стоимость услуг, продукты и порядок расчетов</span>
              </h3>
              <p className="text-sm text-amber-200/80">
                Официальная тарифная сетка сервиса. Расчетной единицей в интерфейсе является виртуальная валюта RR.
              </p>

              {/* ТАБЛИЦА ТАРИФОВ */}
              <div className="overflow-x-auto rounded-2xl border border-[#E7C768]/40 bg-black/40">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-amber-950/60 text-[#F4EE8E] font-bold border-b border-amber-500/30">
                      <th className="p-3">Продукт / Услуга</th>
                      <th className="p-3">Стоимость единицы</th>
                      <th className="p-3">Включенный лимит</th>
                      <th className="p-3">Назначение</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-500/20">
                    {tariffs.length > 0 ? (
                      tariffs.map((item) => (
                        <tr key={item.id} className="hover:bg-amber-950/20 transition-colors">
                          <td className="p-3 font-bold text-[#F4EE8E] whitespace-nowrap">{item.product_name}</td>
                          <td className="p-3 font-mono font-bold text-[#F4EE8E] whitespace-nowrap">
                            {item.unit_name.replace(/₽/g, 'RR')}
                          </td>
                          <td className="p-3 font-mono text-amber-200">{item.trial_limit}</td>
                          <td className="p-3 text-amber-100/90 leading-relaxed">{item.description}</td>
                        </tr>
                      ))
                    ) : (
                      <>
                        <tr className="hover:bg-amber-950/20 transition-colors">
                          <td className="p-3 font-bold text-[#F4EE8E]">Бесплатный триал</td>
                          <td className="p-3 font-mono text-amber-300 font-bold">0 RR (7 дней)</td>
                          <td className="p-3 font-mono text-amber-200">50 отчетов, 50 задач, 10 проектов</td>
                          <td className="p-3">7-дневный пробный период после регистрации без лимита на сотрудников.</td>
                        </tr>
                        <tr className="hover:bg-amber-950/20 transition-colors">
                          <td className="p-3 font-bold text-[#F4EE8E]">ИИ Ревизор</td>
                          <td className="p-3 font-mono text-amber-300 font-bold">690 RR за сотрудника в месяц</td>
                          <td className="p-3 font-mono text-amber-200">10 проектов и 60 задач на сотрудника</td>
                          <td className="p-3">Автоматизация проектного контроля и проверка задач по чек-листам.</td>
                        </tr>
                        <tr className="hover:bg-amber-950/20 transition-colors">
                          <td className="p-3 font-bold text-[#F4EE8E]">ИИ Рапорт</td>
                          <td className="p-3 font-mono text-amber-300 font-bold">290 RR за сотрудника в месяц</td>
                          <td className="p-3 font-mono text-amber-200">60 отчетов на сотрудника</td>
                          <td className="p-3">Сбор и автоматический скоринг ежедневных рабочих рапортов.</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>

              {/* БЕССРОЧНЫЕ И ТАРИФНЫЕ ЛИМИТЫ */}
              <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 space-y-2 text-sm leading-relaxed">
                <h4 className="font-bold text-[#F4EE8E] text-sm">3.2. Виды лимитов и правила их расходования:</h4>
                <ul className="list-disc pl-5 space-y-2 text-amber-100/90">
                  <li>
                    <strong>Тарифные лимиты (включенные в подписку):</strong> Начисляются в зависимости от оплаченного количества рабочих мест. Действуют строго в период активности подписки и расходуются в <u>первую очередь</u>.
                  </li>
                  <li>
                    <strong>Дополнительные лимиты (бессрочные):</strong> Приобретаются Директором компании сверх тарифа (+50 RR за проект, +10 RR за задачу, +5 RR за отчет). <u>Не имеют срока сгорания</u>, сохраняются на счете бессрочно и расходуются во <u>вторую очередь</u>.
                  </li>
                </ul>
              </div>
            </div>

            {/* 4. РЕКУРРЕНТНЫЕ ПЛАТЕЖИ И ПОДПИСКА (ОБЯЗАТЕЛЬНЫЙ РАЗДЕЛ РОБОКАССЫ) */}
            <div className="space-y-4 bg-amber-950/45 p-5 rounded-2xl border border-amber-400/50">
              <h3 className="font-black text-[#F4EE8E] text-base flex items-center gap-2 border-b border-amber-500/20 pb-2">
                <RefreshCw className="text-amber-400" size={18} />
                <span>4. Правила рекуррентных платежей (автоматического продления подписки)</span>
              </h3>

              <div className="space-y-3 text-sm leading-relaxed text-amber-100/95">
                <p>
                  <strong>4.1. Условия подписки:</strong> Подписка на сервисы «ИИ Ревизор» и «ИИ Рапорт» оформляется на выбранный Заказчиком период: 1, 3, 6 или 12 месяцев. Стоимость определяется количеством подключенных сотрудников согласно тарифной сетке на момент оформления.
                </p>

                <p>
                  <strong>4.2. Порядок и время списания средств:</strong> Автоматическое списание денежных средств за продление подписки осуществляется в дату окончания предоплаченного периода в интервале с <strong>03:00 до 04:00 по московскому времени</strong>. Списание производится через шлюз Робокасса с привязанной банковской карты Заказчика в размере стоимости следующего периода.
                </p>

                <p>
                  <strong>4.3. Способы отмены подписки:</strong> Заказчик имеет право в любой момент отказаться от автоматического продления подписки:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-amber-100/90">
                  <li>В Личном кабинете сервиса: в разделе <strong>«Тариф»</strong> нажатием одной кнопки «Отключить автопродление» (без подтверждения звонками или сложными процедурами);</li>
                  <li>Либо направив письменное обращение на официальную электронную почту службы поддержки: <a href="mailto:info@arenda-ropa.com" className="text-[#F4EE8E] underline font-bold">info@arenda-ropa.com</a> с темой «Отмена подписки».</li>
                </ul>
                <p>
                  При отключении автопродления доступ к сервису сохраняется до конца текущего оплаченного расчетного периода. После окончания периода повторные списания не производятся.
                </p>

                <p>
                  <strong>4.4. Порядок возврата средств:</strong> В случае ошибочного списания или отказа от использования сервиса возврат средств за фактически неиспользованные полные дни расчетного периода осуществляется на основании электронного заявления Заказчика, направленного на <a href="mailto:info@arenda-ropa.com" className="text-[#F4EE8E] underline font-bold">info@arenda-ropa.com</a>. Денежные средства возвращаются на ту же банковскую карту или расчетный счет, с которого была совершена оплата, в течение 10 рабочих дней.
                </p>

                <p>
                  <strong>4.5. Условия изменения стоимости:</strong> Исполнитель вправе пересматривать тарифы, предварительно уведомив Заказчика не менее чем за <strong>14 календарных дней</strong> до даты очередного списания посредством уведомления в личном кабинете и письма на электронную почту Заказчика. Если Заказчик не согласен с новой стоимостью, он вправе отменить подписку до даты списания.
                </p>

                <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-amber-200 text-sm flex items-start gap-2.5">
                  <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <strong>Ограничение по иностранным картам:</strong> Обращаем ваше внимание, что прием регулярных рекуррентных оплат по иностранным банковским картам временно не доступен. Оплата принимается по картам банков РФ и платежной системе МИР / СБП.
                  </div>
                </div>

                <p>
                  <strong>4.6. Фиксация согласий:</strong> При подключении подписки согласие Заказчика фиксируется в электронном журнале базы данных (IP-адрес, дата, время и идентификатор пользователя).
                </p>
              </div>
            </div>

            {/* 5. ПАРТНЕРСКАЯ ПРОГРАММА */}
            <div className="space-y-3">
              <h3 className="font-black text-[#F4EE8E] text-base flex items-center gap-2 border-b border-amber-500/20 pb-2">
                <span>5. Партнерская (реферальная) программа</span>
              </h3>
              <p>
                Заказчики могут участвовать в партнерской программе и получать вознаграждение в размере <strong>15%</strong> от реальных платежей привлеченных организаций.
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-amber-100/90 text-sm">
                <li>
                  <strong>Мгновенный обмен на RR:</strong> Вознаграждение может быть в любое время без комиссий обменяно на баланс RR по курсу <strong>1 RR = 1 RR</strong> для оплаты услуг.
                </li>
                <li>
                  <strong>Вывод на расчетный счет:</strong> Выплата вознаграждения на банковские реквизиты Заказчика производится по заявке от суммы <strong>10 000 RR</strong>.
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* TAB 2: ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ */}
        {activeTab === 'privacy' && (
          <div className="space-y-6 animate-fade-in text-sm leading-relaxed">
            <div className="text-center space-y-2">
              <h1 className="text-2xl sm:text-3xl font-black text-[#F4EE8E] font-sans tracking-tight">
                Политика конфиденциальности сервисов «ИИ Рапорт & ИИ Ревизор»
              </h1>
              <p className="text-sm text-amber-200/80 font-mono">
                Оператор персональных данных: ООО «РентРоп»
              </p>
            </div>

            <div className="space-y-4 text-sm leading-relaxed text-amber-100/90">
              <p>
                Настоящая Политика конфиденциальности определяет порядок обработки и защиты информации о физических и юридических лицах, пользующихся сервисами на доменах ii-rr.ru и ii-rr.online.
              </p>

              <h4 className="font-bold text-[#F4EE8E] text-base">1. Собираемые данные</h4>
              <p>
                Мы обрабатываем только минимально необходимые данные для функционирования сервиса: ФИО, адрес электронной почты, контактный телефон, данные организации, а также служебные рабочие отчеты и чек-листы, вносимые сотрудниками.
              </p>

              <h4 className="font-bold text-[#F4EE8E] text-base">2. Цели обработки</h4>
              <p>
                Данные используются исключительно для: предоставления доступа к функционалу ИИ-Ревизора и ИИ-Рапорта; расчета аналитических показателей KPI; отправки системных уведомлений в Telegram и на email; формирования финансовой отчетности и чеков в соответствии с 54-ФЗ.
              </p>

              <h4 className="font-bold text-[#F4EE8E] text-base">3. Безопасность и защита</h4>
              <p>
                Все передаваемые данные шифруются протоколами TLS/SSL. Базы данных размещаются в защищенных дата-центрах на территории Российской Федерации в соответствии с требованиями Федерального закона № 152-ФЗ.
              </p>

              <h4 className="font-bold text-[#F4EE8E] text-base">4. Передача третьим лицам</h4>
              <p>
                Исполнитель не передает и не продает персональные данные Заказчика третьим лицам, за исключением платежного оператора «Робокасса» исключительно в объеме, необходимом для проведения транзакции и фискализации чека.
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: ПОЛЬЗОВАТЕЛЬСКОЕ СОГЛАШЕНИЕ */}
        {activeTab === 'terms' && (
          <div className="space-y-6 animate-fade-in text-sm leading-relaxed">
            <div className="text-center space-y-2">
              <h1 className="text-2xl sm:text-3xl font-black text-[#F4EE8E] font-sans tracking-tight">
                Пользовательское соглашение сервиса
              </h1>
              <p className="text-sm text-amber-200/80 font-mono">
                Правила использования платформы «ИИ Рапорт & ИИ Ревизор»
              </p>
            </div>

            <div className="space-y-4 text-sm leading-relaxed text-amber-100/90">
              <h4 className="font-bold text-[#F4EE8E] text-base">1. Общие положения</h4>
              <p>
                Используя сайт и регистрируясь в системе, Пользователь подтверждает полное и безоговорочное согласие со всеми положениями настоящего Соглашения, Публичной оферты и Политики конфиденциальности.
              </p>

              <h4 className="font-bold text-[#F4EE8E] text-base">2. Учетная запись и безопасность</h4>
              <p>
                Пользователь несет полную ответственность за сохранность своих учетных данных (логина и пароля) и за все действия, совершенные в Личном кабинете с использованием его учетной записи.
              </p>

              <h4 className="font-bold text-[#F4EE8E] text-base">3. Права и обязанности Пользователя</h4>
              <p>
                Пользователь обязуется не использовать сервис для распространения вредоносного ПО, спама, а также материалов, противоречащих законодательству РФ. Пользователь имеет право получать консультации технической поддержки и использовать приобретенные квоты RR.
              </p>

              <h4 className="font-bold text-[#F4EE8E] text-base">4. Ответственность Исполнителя</h4>
              <p>
                Сервис предоставляется по принципу «как есть». Исполнитель гарантирует доступность сервиса на уровне 99.5% времени, за исключением регламентных технических работ.
              </p>
            </div>
          </div>
        )}

        {/* TAB 4: СОГЛАСИЕ НА ОБРАБОТКУ ПЕРСОНАЛЬНЫХ ДАННЫХ */}
        {activeTab === 'consent' && (
          <div className="space-y-6 animate-fade-in text-sm leading-relaxed">
            <div className="text-center space-y-2">
              <h1 className="text-2xl sm:text-3xl font-black text-[#F4EE8E] font-sans tracking-tight">
                Согласие на обработку персональных данных
              </h1>
              <p className="text-sm text-amber-200/80 font-mono">
                В соответствии с требованиями Федерального закона № 152-ФЗ «О персональных данных»
              </p>
            </div>

            <div className="space-y-4 text-sm leading-relaxed text-amber-100/90">
              <p>
                Пользователь, регистрируясь на сайте ii-rr.ru или ii-rr.online, подтверждает свое согласие ООО «РентРоп» (ИНН 7726477438, ОГРН 1217700234157) на обработку своих персональных данных на следующих условиях:
              </p>

              <h4 className="font-bold text-[#F4EE8E] text-base">1. Перечень обрабатываемых данных</h4>
              <p>
                Фамилия, имя, отчество; номер мобильного телефона; адрес электронной почты; место работы и должность; технические параметры сессии (IP-адрес, файлы cookies, User-Agent браузера).
              </p>

              <h4 className="font-bold text-[#F4EE8E] text-base">2. Перечень действий с данными</h4>
              <p>
                Сбор, запись, систематизация, накопление, хранение, уточнение (обновление, изменение), извлечение, использование, передача платежному оператору «Робокасса» для проведения расчетов, обезличивание, блокирование, удаление, уничтожение.
              </p>

              <h4 className="font-bold text-[#F4EE8E] text-base">3. Срок действия согласия и порядок отзыва</h4>
              <p>
                Настоящее согласие действует бессрочно с момента предоставления и может быть отозвано Пользователем в любое время путем направления письменного заявления по адресу электронной почты: <a href="mailto:info@arenda-ropa.com" className="text-[#F4EE8E] underline font-bold">info@arenda-ropa.com</a>.
              </p>
            </div>
          </div>
        )}

        {/* FOOTER REQUISITES */}
        <div className="pt-6 border-t border-amber-500/30 text-center space-y-2">
          <p className="text-sm text-amber-200/80">
            Официальная служба финансовой и правовой поддержки: <a href="mailto:info@arenda-ropa.com" className="text-[#F4EE8E] font-bold underline">info@arenda-ropa.com</a>
          </p>
          <p className="text-sm text-amber-300/60 font-mono">
            ООО «РентРоп» · ИНН 7726477438 · ОГРН 1217700234157 · 115191, г. Москва, пер. Духовской, д. 17, стр. 15, помещ. 11Н/2
          </p>
        </div>

      </div>
    </div>
  );
}
