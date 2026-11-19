import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import type { PgDbAdapter } from '../../db/initDb';
import { resolveSiteOrigin } from '../seoRenderer';

function readPublicAsset(filename: string): Buffer | null {
  const candidates = [
    path.join(process.cwd(), 'public', filename),
    path.join(process.cwd(), 'dist', filename),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        return fs.readFileSync(p);
      }
    } catch {
      // try next path
    }
  }
  return null;
}

export const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <radialGradient id="rrBg" cx="50%" cy="50%" r="65%">
      <stop offset="0%" stop-color="#261404" />
      <stop offset="100%" stop-color="#140A01" />
    </radialGradient>
    <linearGradient id="rrGold" x1="12%" y1="15%" x2="88%" y2="85%">
      <stop offset="0%" stop-color="#F4EE8E" />
      <stop offset="52%" stop-color="#E7C768" />
      <stop offset="100%" stop-color="#C88A2E" />
    </linearGradient>
    <mask id="rrEmblemMask">
      <rect width="128" height="128" fill="black" />
      <circle cx="64" cy="64" r="24.5" fill="white" />
      <path d="M31 61 C38 59 40 55 43 49 L85 49 C88 55 90 59 97 61 L97 67 L31 67 Z" fill="white" />
      <circle cx="64" cy="64" r="19.2" fill="black" />
      <ellipse cx="64" cy="68.5" rx="43" ry="10.2" fill="black" />
      <path d="M40 76 A24.5 24.5 0 0 0 88 76 A20 20 0 0 1 40 76 Z" fill="white" />
      <ellipse cx="64" cy="69" rx="56" ry="15.2" fill="white" />
      <ellipse cx="64" cy="68.2" rx="43" ry="10.2" fill="black" />
      <path d="M35 59 C40 57 41 53 43 48 A23.5 23.5 0 0 1 85 48 C87 53 88 57 93 59 L84 69 A20 20 0 0 0 44 69 Z" fill="white" />
      <path d="M44.5 72 A19.8 19.8 0 1 1 83.5 72 Q64 78 44.5 72 Z" fill="black" />
    </mask>
  </defs>
  <rect width="128" height="128" rx="26" fill="url(#rrBg)" />
  <rect width="128" height="128" rx="26" fill="url(#rrGold)" mask="url(#rrEmblemMask)" />
</svg>`;

const FAVICON_ICO = readPublicAsset('favicon.ico') || Buffer.alloc(0);
const PNG_48 = readPublicAsset('favicon-48.png') || Buffer.alloc(0);
const PNG_180 = readPublicAsset('apple-touch-icon.png') || Buffer.alloc(0);
const PNG_192 = readPublicAsset('favicon-192.png') || Buffer.alloc(0);
const PNG_512 = readPublicAsset('favicon-512.png') || Buffer.alloc(0);
const PNG_MASKABLE_512 = readPublicAsset('pwa-maskable-512.png') || Buffer.alloc(0);
const SVG_BUF = readPublicAsset('icon.svg');

export function handleFaviconIco(_req: Request, res: Response): void {
  const buf = readPublicAsset('favicon.ico') || FAVICON_ICO;
  res.setHeader('Content-Type', 'image/x-icon');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(buf);
}

export function handleIconSvg(_req: Request, res: Response): void {
  const buf = readPublicAsset('icon.svg') || SVG_BUF;
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(buf ? buf.toString('utf-8') : ICON_SVG);
}

export function handleSquarePng(size: 48 | 180 | 192 | 512, maskable = false) {
  const filename = maskable
    ? 'pwa-maskable-512.png'
    : size === 48
    ? 'favicon-48.png'
    : size === 180
    ? 'apple-touch-icon.png'
    : size === 192
    ? 'favicon-192.png'
    : 'favicon-512.png';
  const cached = maskable
    ? PNG_MASKABLE_512
    : size === 48
    ? PNG_48
    : size === 180
    ? PNG_180
    : size === 192
    ? PNG_192
    : PNG_512;
  return (_req: Request, res: Response): void => {
    const buf = readPublicAsset(filename) || cached;
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(buf);
  };
}

export function handleSiteManifest(req: Request, res: Response): void {
  const origin = resolveSiteOrigin(req);
  const manifest = {
    id: '/',
    name: 'ИИ Ревизор & ИИ Рапорт — Контроль проектов и отчеты',
    short_name: 'ИИ Ревизор',
    description:
      'Платформа автоматизации управления проектами, голосовых отчетов сотрудников в Telegram, строительного аудита КС-2/КС-3 и контроля смен с ИИ.',
    start_url: '/cabinet',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#140A01',
    theme_color: '#140A01',
    lang: 'ru',
    icons: [
      {
        src: `${origin}/favicon-48.png`,
        sizes: '48x48',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: `${origin}/favicon-192.png`,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: `${origin}/favicon-512.png`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: `${origin}/pwa-maskable-512.png`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: `${origin}/icon.svg`,
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
    shortcuts: [
      {
        name: 'Календарь отчетов',
        short_name: 'Календарь',
        url: '/cabinet/raport/calendar',
        icons: [{ src: `${origin}/favicon-192.png`, sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Диаграмма Ганта',
        short_name: 'Гант',
        url: '/cabinet/revisor/gantt',
        icons: [{ src: `${origin}/favicon-192.png`, sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Сдать рапорт',
        short_name: 'Рапорт',
        url: '/cabinet/raport',
        icons: [{ src: `${origin}/favicon-192.png`, sizes: '192x192', type: 'image/png' }],
      },
    ],
  };
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(JSON.stringify(manifest, null, 2));
}

function stripMarkdown(md: string, maxLen = 1800): string {
  const clean = String(md || '')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return clean.length > maxLen ? `${clean.slice(0, maxLen)}…` : clean;
}

export async function handleLlmsFullTxt(
  req: Request,
  res: Response,
  getDb: () => Promise<PgDbAdapter>
): Promise<void> {
  try {
    const origin = resolveSiteOrigin(req);
    const db = await getDb();
    const posts = await db.all(
      'SELECT id, slug, title, category, summary, content, author, date FROM blog_posts ORDER BY created_at DESC LIMIT 30'
    );
    const academy = await db.all(
      'SELECT id, slug, title, category, target_role, summary, content_markdown FROM academy_posts WHERE is_published = 1 ORDER BY order_index ASC LIMIT 30'
    );
    const tariffs = await db
      .all('SELECT product_name, price_per_unit, unit_name, trial_limit, description FROM tariffs ORDER BY id ASC')
      .catch(() => []);

    const sections: string[] = [
      '# ИИ Ревизор & ИИ Рапорт — Полная документация для AI-поисковиков (llms-full)',
      '',
      `> Российская SaaS-платформа от ООО «РентРоп» (ИНН 7726477438) для интеллектуального контроля проектов, голосовых ежедневных отчетов сотрудников в Telegram, строительного аудита КС-2/КС-3 и геймификации персонала.`,
      '',
      `Официальный сайт: ${origin}/`,
      `Зеркало: https://ii-rr.online/`,
      `Карта сайта: ${origin}/sitemap.xml`,
      `Краткий индекс для LLM: ${origin}/llms.txt`,
      `Блог: ${origin}/blog`,
      `Академия и инструкции: ${origin}/academy`,
      `Публичная оферта: ${origin}/oferta`,
      '',
      '## Тарифы и стоимость',
      ...(Array.isArray(tariffs) && tariffs.length > 0
        ? tariffs.map(
            (t: any) =>
              `- **${t.product_name}**: от ${t.price_per_unit} ₽ / ${t.unit_name || 'сотрудник/мес'}. Пробный доступ: ${t.trial_limit || 'бесплатный триал при регистрации'}. ${t.description || ''}`
          )
        : [
            '- **ИИ Рапорт и ИИ Ревизор**: от 290 ₽ за сотрудника в месяц, доступен бесплатный триал при регистрации без привязки карты.',
          ]),
      '',
      '## Ключевые вопросы и ответы (FAQ)',
      '- **Как сдать голосовой отчет?** Сотрудник надиктовывает итоги смены в кабинете или Telegram-боте за 2 минуты, нейросеть извлекает цифры, выручку и инциденты и заполняет шаблон.',
      '- **Как работает ИИ Ревизор?** Формирует чек-листы приемки, декомпозирует проекты на спринты и задачи, проверяет фотоотчеты компьютерным зрением и выявляет расхождения смет КС-2/КС-3.',
      '- **Как устроено каскадное увольнение и замена директора?** Система переносит открытые задачи, проекты, отделы, графики, правила Telegram, реферальную сеть, балансы RR и права директора на выбранного или созданного преемника в фоновом режиме с журналом аудита.',
      '',
      '## Уроки Академии (подробные инструкции)',
      ...(academy || []).flatMap((a: any) => [
        `### ${a.title}`,
        `URL: ${origin}/academy/${a.slug || a.id} | Категория: ${a.category || 'Общее'} | Роль: ${a.target_role || 'all'}`,
        a.summary ? `Кратко: ${a.summary}` : '',
        stripMarkdown(a.content_markdown || '', 1500),
        '',
      ]),
      '## Экспертные статьи блога',
      ...(posts || []).flatMap((p: any) => [
        `### ${p.title}`,
        `URL: ${origin}/blog/${p.slug || p.id} | Категория: ${p.category || 'ИИ'} | Автор: ${p.author || 'Игорь Давыдов'}`,
        p.summary ? `Аннотация: ${p.summary}` : '',
        stripMarkdown(p.content || '', 1600),
        '',
      ]),
    ];

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(sections.filter((line) => line !== null && line !== undefined).join('\n'));
  } catch (err: any) {
    res.status(500).setHeader('Content-Type', 'text/plain; charset=utf-8').send(err.message);
  }
}
