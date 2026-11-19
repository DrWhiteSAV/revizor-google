import { BlogPost } from '../types';

export const DEFAULT_BLOG_POSTS: BlogPost[] = [
  {
    id: 'revisor-post-1',
    slug: 'avtomatizaciya-upravleniya-proektami-ii-revisor',
    seoTitle: 'Автоматизация управления проектами с ИИ Ревизором — декомпозиция и контроль',
    title: 'ИИ Ревизор: как полностью автоматизировать управление проектами и задачами',
    category: 'ИИ в бизнесе',
    date: '12 июля 2026',
    readTime: '20 мин',
    author: 'Игорь Давыдов',
    authorRole: 'CEO ИИ Ревизор',
    image: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGDQjUQkQMR8fbWVWaWh8CDBXEDshGkg6KlEjKC0sKyAqCkQeBXAyRwQ9SQ1MCTMyDy0dBg8cEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg',
    summary: 'Подробное руководство по переходу от ручных таск-менеджеров к ИИ-автопилоту: декомпозиция целей, матрица зависимостей, чек-листы приемки и контроль сроков.',
    seoDesc: 'Автоматизация управления проектами с ИИ Ревизором: декомпозиция целей на подзадачи, назначение исполнителей и автоконтроль качества.',
    seoKeywords: 'ии ревизор, автоматизация управления проектами, ии таск менеджер, декомпозиция задач, автопилот бизнеса',
    content: `![ИИ-автопилот управления проектами](https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGDQjUQkQMR8fbWVWaWh8CDBXEDshGkg6KlEjKC0sKyAqCkQeBXAyRwQ9SQ1MCTMyDy0dBg8cEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg)

Современные компании теряют до половины управленческого ресурса на бесконечное согласование задач, напоминания исполнителям и ручную сверку результатов. **ИИ Ревизор** переводит проектное управление в автономный контур: от голосовой постановки цели до верифицированной приемки по чек-листам.`
  },
  {
    id: 'revisor-post-2',
    slug: 'kontrol-sotrudnikov-po-chek-listam-ii-revisor',
    seoTitle: 'Контроль сотрудников по чек-листам и компьютерное зрение в ИИ Ревизоре',
    title: 'Контроль сотрудников по чек-листам: как компьютерное зрение и ИИ исключают брак',
    category: 'Технологии',
    date: '8 июля 2026',
    readTime: '19 мин',
    author: 'Екатерина Кравцова',
    authorRole: 'Ведущий продуктолог',
    image: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGCgjUQkQIjsMKRMmfzBMLSNlHRs2Fh8LBTgPLT0sKyMQCkQeBXAyRwQ4GiIrNWAjLzMCNA8cEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg',
    summary: 'Как многофакторная верификация отчетов объединяет семантический анализ речи, компьютерное зрение и чек-листы приемки для сокращения брака на 92%.',
    seoDesc: 'Контроль качества работы сотрудников по чек-листам с помощью компьютерного зрения ИИ Ревизора и фотоотчетов.',
    seoKeywords: 'контроль сотрудников по чек листам, компьютерное зрение, фотоотчеты персонала, верификация задач ии',
    content: `![Контроль сотрудников по чек-листам с компьютерным зрением](https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGCgjUQkQIjsMKRMmfzBMLSNlHRs2Fh8LBTgPLT0sKyMQCkQeBXAyRwQ4GiIrNWAjLzMCNA8cEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg)

Визуальная и смысловая приемка работ в **ИИ Ревизоре** превращает каждый сдаваемый фото- и голосовой отчет в объективный аудит без выезда супервайзера на объект.`
  },
  {
    id: 'post-golosovoj-vvod-otchetov',
    slug: 'golosovoj-vvod-otchetov-ii-raport',
    seoTitle: 'Голосовой ввод отчетов в ИИ Рапорте: как экономить до 15 часов в месяц на каждого сотрудника',
    title: 'Голосовой ввод отчетов в ИИ Рапорте: от сменной рутины к структурированным рапортам за 2 минуты',
    category: 'ИИ-автоматизация',
    date: '5 июля 2026',
    readTime: '18 мин',
    author: 'Михаил Котов',
    authorRole: 'CTO ИИ Рапорт',
    image: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGDwjUQkQCVkBADg7R2FzdBFXAHsdcSwBIBsIHQssKyAACkQeBXAyRwQ9AyA-HQoeLBRrBh8cEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg',
    summary: 'Разбираем архитектуру шумоподавления, транскрибации речи и извлечения бизнес-сущностей для мгновенного формирования сменных отчетов из голоса.',
    seoDesc: 'Голосовые отчеты сотрудников с искусственным интеллектом в ИИ Рапорте: распознавание речи, заполнение KPI и экономия до 15 часов в месяц.',
    seoKeywords: 'голосовой ввод отчетов, ии рапорт, распознавание речи для бизнеса, сменные отчеты голосом',
    content: `![Голосовой ввод отчетов с ИИ](https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGDwjUQkQCVkBADg7R2FzdBFXAHsdcSwBIBsIHQssKyAACkQeBXAyRwQ9AyA-HQoeLBRrBh8cEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg)

Голосовая сдача сменного рапорта убирает когнитивный барьер конца рабочего дня и повышает полноту данных для руководителя в несколько раз.`
  },
  {
    id: 'post-gejmifikaciya-magazin-blag',
    slug: 'gejmifikaciya-otchetnosti-sotrudnikov-magazin-blag',
    seoTitle: 'Геймификация отчетности и Магазин Благ: рост дисциплины персонала до 98% без штрафов',
    title: 'Геймификация отчетности и Магазин Благ: как мотивировать команду сдавать рапорты вовремя',
    category: 'HR и Мотивация',
    date: '2 июля 2026',
    readTime: '18 мин',
    author: 'Елена Смирнова',
    authorRole: 'HR-директор',
    image: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGAIjUQkQEiUrO2EDDw1AMSxZOHkwBzk8KxEKLBssKyAQCkQeBXAyRwQ9EXQdFwc-CDUAWSkcEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg',
    summary: 'Как серии комбо-дней (streaks), внутренняя валюта RR и корпоративный Магазин Благ заменяют штрафы и поднимают вовлеченность персонала.',
    seoDesc: 'Геймификация работы сотрудников и корпоративный Магазин Благ в ИИ Рапорте: streaks, баллы за отчеты и мотивация без штрафов.',
    seoKeywords: 'геймификация отчетности, магазин благ, мотивация сотрудников ии, корпоративная валюта',
    content: `![Геймификация отчетности и Магазин Благ](https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGAIjUQkQEiUrO2EDDw1AMSxZOHkwBzk8KxEKLBssKyAQCkQeBXAyRwQ9EXQdFwc-CDUAWSkcEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg)

Позитивное подкрепление за качественную отчетность формирует устойчивую привычку дисциплины и снижает текучесть линейного персонала.`
  },
  {
    id: 'post-stroitelnyj-audit-ks2-ks3',
    slug: 'avtomaticheskij-kontrol-stroitelstva-ks2-ks3',
    seoTitle: 'Строительный аудит КС-2 и КС-3 с ИИ: проверка объемов работ, OCR и фотоконтроль ПТО',
    title: 'Автоматический аудит строительства: контроль актов КС-2, КС-3 и фотофиксация этапов с ИИ',
    category: 'Строительство и ПТО',
    date: '29 июня 2026',
    readTime: '21 мин',
    author: 'Алексей Петров',
    authorRole: 'Руководитель направления ПТО',
    image: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGCAjUQkQBQEQaWtURQkGDDFLHQYBPBMCMSwlKQssKyM6CkQeBXAyRwQ_Lj8eMj4eD3IxHR8cEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg',
    summary: 'Практическое руководство по применению ИИ для сверки актов КС-2/КС-3, распознавания накладных ТТН и контроля скрытых работ на стройплощадке.',
    seoDesc: 'Автоматический контроль строительства с ИИ Ревизором: аудит КС-2 и КС-3, фотофиксация этапов, проверка прорабов и подрядчиков.',
    seoKeywords: 'контроль строительства ии, аудит кс 2 кс 3, фотофиксация стройки, ии для пто, контроль подрядчиков',
    content: `![Строительный аудит КС-2 и КС-3](https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGCAjUQkQBQEQaWtURQkGDDFLHQYBPBMCMSwlKQssKyM6CkQeBXAyRwQ_Lj8eMj4eD3IxHR8cEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg)

ИИ-аудит стройплощадки связывает сметную документацию КС-2/КС-3 с реальными фотографиями выполненных этапов и товарными накладными.`
  },
  {
    id: 'post-telegram-bot-otchetov',
    slug: 'telegram-bot-dlya-sbora-otchetov-sotrudnikov',
    seoTitle: 'Telegram-бот для сбора сменных отчетов и уведомлений: бесшовная работа команды 24/7',
    title: 'Telegram-бот для корпоративных отчетов: почему мессенджер побеждает тяжелые ERP-системы',
    category: 'Интеграции',
    date: '25 июня 2026',
    readTime: '17 мин',
    author: 'Сергей Николаев',
    authorRole: 'Lead Backend Architect',
    image: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGGkjUQkTHSoeIz1XdQhsBABiPwovEh8efwFWMD0sKyMqCkQeBXAyRwQ_Dw8IHRo9DQIcAh8cEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg',
    summary: 'Как перенести сбор голосовых рапортов, привязку геопозиции, фотоотчеты и утренние сводки руководителя прямо в Telegram.',
    seoDesc: 'Telegram-бот для сбора отчетов сотрудников и контроля задач в ИИ Рапорте: настройка за 5 минут и мгновенные сводки директору.',
    seoKeywords: 'телеграм бот для отчетов, бот для сотрудников telegram, автоматизация отчетности в телеграм, ии рапорт бот',
    content: `![Telegram-бот для корпоративных отчетов](https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGGkjUQkTHSoeIz1XdQhsBABiPwovEh8efwFWMD0sKyMqCkQeBXAyRwQ_Dw8IHRo9DQIcAh8cEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg)

Когда рабочий интерфейс живет в привычном Telegram, сотрудники сдают отчеты с поля в один клик без установки тяжелых приложений.`
  },
  {
    id: 'post-finansovyj-kontrol-kassovye-razryvy',
    slug: 'finansovyj-kontrol-i-radar-kassovyh-razryvov',
    seoTitle: 'Финансовый контроль и радар кассовых разрывов: управленческий учет с ИИ в реальном времени',
    title: 'Финансовый контроль и радар кассовых разрывов: как ИИ защищает прибыль и маржинальность бизнеса',
    category: 'Финансы и Учет',
    date: '21 июня 2026',
    readTime: '20 мин',
    author: 'Анна Соколова',
    authorRole: 'Финансовый архитектор',
    image: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGA4jUQkQGyw_Ozw0QXQMLjZZPhkOKAoBYzgQfT4oKRghAW84TTIuWSMnNSktbWoYUSY_NwIAECN3FHYHIHxiCjgIQxoTFBh9b1RQbWVQBWEFfCBzFC0eFhMpIScuPW4AKWoYCQMdfh82ChAePyI2HwRcNyZiERR0Y1IGawR2UgRkckB1Qg.jpg',
    summary: 'Как автоматический сбор дневной выручки, контроль расходов по точкам и предиктивный радар кассовых разрывов сохраняют оборотный капитал.',
    seoDesc: 'Финансовый контроль и прогнозирование кассовых разрывов с помощью ИИ Рапорта: дневной P&L, сверка касс и контроль бюджета проектов.',
    seoKeywords: 'финансовый контроль ии, радар кассовых разрывов, управленческий учет онлайн, контроль бюджета проекта',
    content: `![Финансовый контроль и радар кассовых разрывов](https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGA4jUQkQGyw_Ozw0QXQMLjZZPhkOKAoBYzgQfT4oKRghAW84TTIuWSMnNSktbWoYUSY_NwIAECN3FHYHIHxiCjgIQxoTFBh9b1RQbWVQBWEFfCBzFC0eFhMpIScuPW4AKWoYCQMdfh82ChAePyI2HwRcNyZiERR0Y1IGawR2UgRkckB1Qg.jpg)

Ежедневная сверка фактической выручки и сметных затрат в ИИ-контуре позволяет видеть приближение кассового разрыва за недели до даты платежа.`
  },
  {
    id: 'post-korporativnyj-korabl-orgstruktura',
    slug: 'korporativnyj-korabl-orgstruktura-kompanii-3d',
    seoTitle: '3D-оргструктура «Командный мостик»: визуальное управление отделами и ролями компании',
    title: 'Корпоративный корабль и 3D-оргструктура: как превратить управление отделами в прозрачную систему',
    category: 'Оргструктура',
    date: '17 июня 2026',
    readTime: '18 мин',
    author: 'Игорь Давыдов',
    authorRole: 'CEO ИИ Ревизор',
    image: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGCwjUQkQblk4HjQuehhEAjJtMiwfE0wKOFwsfAssKyMACkQeBXAyRwQ9AD1DbStdAgsVWTkcEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg',
    summary: 'Зачем бизнесу интерактивная 3D-карта отделов «Командный мостик»: зоны ответственности, каскадирование KPI и мгновенная диагностика узких мест.',
    seoDesc: 'Интерактивная 3D-оргструктура компании «Командный мостик» в ИИ Ревизоре: роли, отделы, права доступа и прозрачные KPI.',
    seoKeywords: 'оргструктура компании онлайн, командный мостик 3d, управление отделами ии, матрица ответственности',
    content: `![Корпоративный корабль и 3D-оргструктура](https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGCwjUQkQblk4HjQuehhEAjJtMiwfE0wKOFwsfAssKyMACkQeBXAyRwQ9AD1DbStdAgsVWTkcEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg)

Визуальная архитектура отделов связывает стратегию собственника с ежедневными задачами каждого подразделения и сотрудника.`
  },
  {
    id: 'post-umnyj-grafik-smen-gantt',
    slug: 'umnyj-grafik-smen-i-gantt-chasovye-poyasa',
    seoTitle: 'Умный график смен, диаграмма Гантта и синхронизация часовых поясов для распределенных команд',
    title: 'Умный график смен и диаграмма Гантта: управление распределенными командами в разных часовых поясах',
    category: 'Планирование',
    date: '13 июня 2026',
    readTime: '19 мин',
    author: 'Дмитрий Орлов',
    authorRole: 'Product Lead планирования',
    image: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGAojUQkRNBcrHzcjAht9AFMAMDEePzg_PFAtPC0sKyE6CkQeBXAyRwQ9DxEIPmNFFywLVDkcEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg',
    summary: 'Как автоматический планировщик смен учитывает часовые пояса, перегрузки персонала и зависимости на диаграмме Гантта.',
    seoDesc: 'Умный график смен и диаграмма Гантта с учетом часовых поясов в ИИ Ревизоре: расписание смен, загрузка команды и контроль дедлайнов.',
    seoKeywords: 'умный график смен, диаграмма гантта ии, часовые пояса сотрудников, планирование смен онлайн',
    content: `![Умный график смен и диаграмма Гантта](https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGAojUQkRNBcrHzcjAht9AFMAMDEePzg_PFAtPC0sKyE6CkQeBXAyRwQ9DxEIPmNFFywLVDkcEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg)

Автоматическое планирование смен синхронизирует офисных, полевых и удаленных сотрудников от Калининграда до Владивостока без накладок.`
  },
  {
    id: 'post-ii-kopilot-quality-score',
    slug: 'ii-kopilot-rukovoditelya-i-quality-score',
    seoTitle: 'ИИ-Копилот руководителя и Quality Score: автоматическая аналитика качества отчетов и задач',
    title: 'ИИ-Копилот руководителя и Quality Score: как нейросеть оценивает качество работы и подсказывает решения',
    category: 'ИИ-Коучинг',
    date: '10 июня 2026',
    readTime: '20 мин',
    author: 'Ольга Радина',
    authorRole: 'ИИ-Методолог',
    image: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGDAjUQkQADwbMzQTY2hkFVR1ExNIER8vAV0pfT0sKyA6CkQeBXAyRwQ_O3xPNAAdViIOCikcEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg',
    summary: 'Подробный разбор метрики Quality Score и голосового ИИ-Копилота: автоматический фидбек сотрудникам, поиск аномалий и каскадное выполнение поручений.',
    seoDesc: 'ИИ-Копилот руководителя и рейтинг Quality Score в ИИ Рапорте: оценка содержательности отчетов, рекомендации сотрудникам и управленческая аналитика.',
    seoKeywords: 'ии копилот руководителя, quality score, оценка качества работы ии, ии коучинг персонала',
    content: `![ИИ-Копилот руководителя и Quality Score](https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGDAjUQkQADwbMzQTY2hkFVR1ExNIER8vAV0pfT0sKyA6CkQeBXAyRwQ_O3xPNAAdViIOCikcEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg)

Quality Score переводит субъективное «хорошо или плохо» в прозрачный индекс качества, а ИИ-Копилот берет на себя рутинные действия по управлению системой.`
  }
];
