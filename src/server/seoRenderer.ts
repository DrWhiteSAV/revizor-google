import type { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import type { PgDbAdapter } from '../db/initDb';

export function resolveSiteOrigin(req: Request): string {
  const rawHost = String(req.headers['x-forwarded-host'] || req.headers.host || 'ii-rr.ru').split(',')[0].trim();
  const cleanHost = rawHost.toLowerCase();
  const protoHeader = String(req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0].trim();
  const scheme = cleanHost.includes('localhost') || cleanHost.includes('127.0.0.1') ? protoHeader : 'https';

  if (cleanHost.includes('ii-rr.online')) return 'https://ii-rr.online';
  if (cleanHost.includes('ii-rr.ru')) return 'https://ii-rr.ru';
  return `${scheme}://${rawHost}`;
}

export function toAbsoluteUrl(urlOrPath: string | null | undefined, origin: string): string {
  const fallback = `${origin}/file/21/iirrsocial.jpg`;
  if (!urlOrPath || typeof urlOrPath !== 'string') return fallback;
  const trimmed = urlOrPath.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    if (trimmed.includes('unsplash.com')) return fallback;
    return trimmed;
  }
  if (trimmed.startsWith('data:')) return fallback;
  return `${origin}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeXml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function markdownToSemanticHtml(markdown: string, origin: string, excludeImages: string[] = []): string {
  if (!markdown) return '';
  const normalizeUrl = (u: string) => u.trim().split('?')[0].toLowerCase();
  const seenImages = new Set<string>(excludeImages.filter(Boolean).map(normalizeUrl));
  const lines = markdown.replace(/\\n/g, '\n').split('\n');
  const out: string[] = [];
  let inUl = false;
  let inOl = false;
  let i = 0;

  const closeLists = () => {
    if (inUl) {
      out.push('</ul>');
      inUl = false;
    }
    if (inOl) {
      out.push('</ol>');
      inOl = false;
    }
  };

  const formatInline = (txt: string): string => {
    let s = escapeHtml(txt);
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
    s = s.replace(/`(.+?)`/g, '<code>$1</code>');
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, url) => {
      const safeUrl = url.startsWith('http') ? url : `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
      return `<a href="${escapeHtml(safeUrl)}">${label}</a>`;
    });
    return s;
  };

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();

    if (!line) {
      closeLists();
      i++;
      continue;
    }

    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      closeLists();
      const absImg = toAbsoluteUrl(imgMatch[2], origin);
      const normRaw = normalizeUrl(imgMatch[2]);
      const normAbs = normalizeUrl(absImg);
      if (!seenImages.has(normRaw) && !seenImages.has(normAbs)) {
        seenImages.add(normRaw);
        seenImages.add(normAbs);
        out.push(
          `<figure style="margin:24px 0;"><img src="${escapeHtml(absImg)}" alt="${escapeHtml(imgMatch[1] || 'Изображение статьи ИИ Ревизор и ИИ Рапорт')}" style="max-width:100%;height:auto;border-radius:12px;" />${
            imgMatch[1] ? `<figcaption style="font-size:13px;color:#555;margin-top:6px;">${escapeHtml(imgMatch[1])}</figcaption>` : ''
          }</figure>`
        );
      }
      i++;
      continue;
    }

    if (line.startsWith('|') && i + 1 < lines.length && lines[i + 1].trim().startsWith('|') && lines[i + 1].includes('-')) {
      closeLists();
      const headers = line.split('|').slice(1, -1).map(c => formatInline(c.trim()));
      i += 2;
      const bodyRows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        bodyRows.push(lines[i].trim().split('|').slice(1, -1).map(c => formatInline(c.trim())));
        i++;
      }
      out.push(
        `<table border="1" cellpadding="8" cellspacing="0" style="width:100%;border-collapse:collapse;margin:18px 0;"><thead><tr>${headers
          .map(h => `<th style="text-align:left;background:#f5efe0;">${h}</th>`)
          .join('')}</tr></thead><tbody>${bodyRows
          .map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`)
          .join('')}</tbody></table>`
      );
      continue;
    }

    if (line === '---' || line === '***') {
      closeLists();
      out.push('<hr />');
    } else if (line.startsWith('# ')) {
      closeLists();
      out.push(`<h2>${formatInline(line.slice(2))}</h2>`);
    } else if (line.startsWith('## ')) {
      closeLists();
      out.push(`<h2>${formatInline(line.slice(3))}</h2>`);
    } else if (line.startsWith('### ')) {
      closeLists();
      out.push(`<h3>${formatInline(line.slice(4))}</h3>`);
    } else if (line.startsWith('#### ')) {
      closeLists();
      out.push(`<h4>${formatInline(line.slice(5))}</h4>`);
    } else if (line.startsWith('>')) {
      closeLists();
      const quoteLines = [formatInline(line.slice(1).trim())];
      while (i + 1 < lines.length && lines[i + 1].trim().startsWith('>')) {
        i++;
        quoteLines.push(formatInline(lines[i].trim().slice(1).trim()));
      }
      out.push(`<blockquote style="border-left:4px solid #b38c1e;padding:10px 16px;margin:16px 0;background:#faf6ec;">${quoteLines.join('<br/>')}</blockquote>`);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      if (inOl) {
        out.push('</ol>');
        inOl = false;
      }
      if (!inUl) {
        out.push('<ul>');
        inUl = true;
      }
      out.push(`<li>${formatInline(line.slice(2))}</li>`);
    } else if (/^\d+\.\s/.test(line)) {
      if (inUl) {
        out.push('</ul>');
        inUl = false;
      }
      if (!inOl) {
        out.push('<ol>');
        inOl = true;
      }
      out.push(`<li>${formatInline(line.replace(/^\d+\.\s/, ''))}</li>`);
    } else {
      closeLists();
      out.push(`<p>${formatInline(line)}</p>`);
    }

    i++;
  }

  closeLists();
  return out.join('\n');
}

function replaceMetaTags(html: string, opts: {
  origin: string;
  canonicalUrl: string;
  title: string;
  description: string;
  keywords?: string;
  ogType?: string;
  ogImage?: string;
  ogImageWidth?: string | null;
  ogImageHeight?: string | null;
  replaceRootJsonLd?: boolean;
  extraHeadJsonLd?: string;
}): string {
  const safeTitle = escapeHtml(opts.title);
  const safeDesc = escapeHtml(opts.description);
  const safeUrl = escapeHtml(opts.canonicalUrl);
  const safeImage = escapeHtml(opts.ogImage || `${opts.origin}/file/21/iirrsocial.jpg`);
  const safeKeywords = escapeHtml(opts.keywords || '');

  let out = html
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${safeTitle}</title>`)
    .replace(/<meta name="title" content="[^"]*"\s*\/?>/i, `<meta name="title" content="${safeTitle}" />`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/i, `<meta name="description" content="${safeDesc}" />`)
    .replace(/<link rel="canonical" href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${safeUrl}" />`)
    .replace(/<meta property="og:type" content="[^"]*"\s*\/?>/i, `<meta property="og:type" content="${opts.ogType || 'website'}" />`)
    .replace(/<meta property="og:url" content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${safeUrl}" />`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${safeTitle}" />`)
    .replace(/<meta property="og:description" content="[^"]*"\s*\/?>/i, `<meta property="og:description" content="${safeDesc}" />`)
    .replace(/<meta property="og:image" content="[^"]*"\s*\/?>/i, `<meta property="og:image" content="${safeImage}" />`)
    .replace(/<meta property="og:image:secure_url" content="[^"]*"\s*\/?>/i, `<meta property="og:image:secure_url" content="${safeImage}" />`)
    .replace(/<meta property="og:image:alt" content="[^"]*"\s*\/?>/i, `<meta property="og:image:alt" content="${safeTitle}" />`)
    .replace(/<meta property="vk:image" content="[^"]*"\s*\/?>/i, `<meta property="vk:image" content="${safeImage}" />`)
    .replace(/<link rel="image_src" href="[^"]*"\s*\/?>/i, `<link rel="image_src" href="${safeImage}" />`)
    .replace(/<meta (?:name|property)="twitter:url" content="[^"]*"\s*\/?>/i, `<meta name="twitter:url" content="${safeUrl}" />`)
    .replace(/<meta (?:name|property)="twitter:title" content="[^"]*"\s*\/?>/i, `<meta name="twitter:title" content="${safeTitle}" />`)
    .replace(/<meta (?:name|property)="twitter:description" content="[^"]*"\s*\/?>/i, `<meta name="twitter:description" content="${safeDesc}" />`)
    .replace(/<meta (?:name|property)="twitter:image" content="[^"]*"\s*\/?>/i, `<meta name="twitter:image" content="${safeImage}" />`)
    .replace(/<meta (?:name|property)="twitter:image:alt" content="[^"]*"\s*\/?>/i, `<meta name="twitter:image:alt" content="${safeTitle}" />`)
    .replace(/https:\/\/ii-rr\.ru\//g, `${opts.origin}/`)
    .replace(/"\/file\/21\/iirrsocial\.jpg"/g, `"${opts.origin}/file/21/iirrsocial.jpg"`)
    .replace(/"\/file\/36\/rr-logo\.png"/g, `"${opts.origin}/file/36/rr-logo.png"`);

  if (opts.ogImageWidth === null) {
    out = out.replace(/<meta property="og:image:width" content="[^"]*"\s*\/?>\s*/i, '');
  } else if (opts.ogImageWidth) {
    out = out.replace(/<meta property="og:image:width" content="[^"]*"\s*\/?>/i, `<meta property="og:image:width" content="${opts.ogImageWidth}" />`);
  }

  if (opts.ogImageHeight === null) {
    out = out.replace(/<meta property="og:image:height" content="[^"]*"\s*\/?>\s*/i, '');
  } else if (opts.ogImageHeight) {
    out = out.replace(/<meta property="og:image:height" content="[^"]*"\s*\/?>/i, `<meta property="og:image:height" content="${opts.ogImageHeight}" />`);
  }

  if (safeKeywords) {
    out = out.replace(/<meta name="keywords" content="[^"]*"\s*\/?>/i, `<meta name="keywords" content="${safeKeywords}" />`);
  }

  if (opts.replaceRootJsonLd) {
    out = out.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/gi, '');
  }

  if (opts.extraHeadJsonLd) {
    out = out.replace('</head>', `${opts.extraHeadJsonLd}\n</head>`);
  }

  return out;
}

export async function handleRobotsTxt(req: Request, res: Response): Promise<void> {
  const origin = resolveSiteOrigin(req);
  const hostHeader = origin.replace(/^https?:\/\//, '');
  const content = [
    'User-agent: *',
    'Allow: /',
    'Allow: /blog/',
    'Allow: /academy/',
    'Allow: /oferta',
    'Allow: /images/',
    'Allow: /uploads/',
    'Allow: /file/',
    'Allow: /llms.txt',
    'Allow: /llms-full.txt',
    'Allow: /rss.xml',
    'Allow: /favicon.ico',
    'Allow: /site.webmanifest',
    'Allow: /yandex-tableau.json',
    'Allow: /browserconfig.xml',
    'Allow: /og-banner.png',
    'Disallow: /cabinet/',
    'Disallow: /system-admin/',
    'Disallow: /api/',
    'Disallow: /payment/',
    'Disallow: /invite/',
    'Disallow: /auth',
    '',
    'User-agent: Yandex',
    'Allow: /',
    'Allow: /blog/',
    'Allow: /academy/',
    'Allow: /oferta',
    'Allow: /favicon.ico',
    'Allow: /rss.xml',
    'Allow: /yandex-tableau.json',
    'Disallow: /cabinet/',
    'Disallow: /system-admin/',
    'Disallow: /api/',
    'Disallow: /payment/',
    'Disallow: /invite/',
    'Clean-param: utm_source&utm_medium&utm_campaign&utm_content&utm_term&ssr&ref&yclid&gclid /',
    '',
    'User-agent: YandexBot',
    'Allow: /',
    '',
    'User-agent: YandexFavicon',
    'Allow: /',
    '',
    'User-agent: YandexAdditional',
    'Allow: /',
    '',
    'User-agent: Googlebot',
    'Allow: /',
    'Disallow: /cabinet/',
    'Disallow: /system-admin/',
    'Disallow: /api/',
    'Disallow: /payment/',
    'Disallow: /invite/',
    '',
    'User-agent: GPTBot',
    'Allow: /',
    '',
    'User-agent: OAI-SearchBot',
    'Allow: /',
    '',
    'User-agent: ChatGPT-User',
    'Allow: /',
    '',
    'User-agent: PerplexityBot',
    'Allow: /',
    '',
    'User-agent: ClaudeBot',
    'Allow: /',
    '',
    'User-agent: Google-Extended',
    'Allow: /',
    '',
    'User-agent: DeepSeekBot',
    'Allow: /',
    '',
    'User-agent: Applebot-Extended',
    'Allow: /',
    '',
    'User-agent: Meta-ExternalAgent',
    'Allow: /',
    '',
    'User-agent: MistralAI-User',
    'Allow: /',
    '',
    `Host: ${hostHeader}`,
    `Sitemap: ${origin}/sitemap.xml`,
    ''
  ].join('\n');

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.send(content);
}

export async function handleSitemapXml(req: Request, res: Response, getDb: () => Promise<PgDbAdapter>): Promise<void> {
  try {
    const origin = resolveSiteOrigin(req);
    const db = await getDb();
    const today = new Date().toISOString().split('T')[0];

    const blogPosts = await db.all(
      'SELECT id, slug, title, image, cover_image, updated_at, created_at FROM blog_posts ORDER BY created_at DESC'
    );
    const academyPosts = await db.all(
      'SELECT id, slug, title, cover_image, updated_at, created_at FROM academy_posts WHERE is_published = 1 ORDER BY order_index ASC'
    );

    const staticUrls = [
      { loc: `${origin}/`, priority: '1.0', changefreq: 'daily', image: `${origin}/file/21/iirrsocial.jpg`, imageTitle: 'ИИ Ревизор & ИИ Рапорт — Платформа нейросетевого контроля' },
      { loc: `${origin}/blog`, priority: '0.95', changefreq: 'daily', image: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGDQjUQkQMR8fbWVWaWh8CDBXEDshGkg6KlEjKC0sKyAqCkQeBXAyRwQ9SQ1MCTMyDy0dBg8cEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg', imageTitle: 'Блог и SEO База знаний ИИ Ревизор и ИИ Рапорт' },
      { loc: `${origin}/academy`, priority: '0.9', changefreq: 'weekly', image: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGDAjUQkQADwbMzQTY2hkFVR1ExNIER8vAV0pfT0sKyA6CkQeBXAyRwQ_O3xPNAAdViIOCikcEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg', imageTitle: 'Академия и регламенты работы с ИИ' },
      { loc: `${origin}/oferta`, priority: '0.6', changefreq: 'monthly', image: '', imageTitle: '' }
    ];

    const urlNodes: string[] = staticUrls.map(u => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>${
      u.image
        ? `
    <image:image>
      <image:loc>${escapeXml(u.image)}</image:loc>
      <image:title>${escapeXml(u.imageTitle)}</image:title>
    </image:image>`
        : ''
    }
  </url>`);

    const safeIsoDate = (rawVal: any): string => {
      if (!rawVal) return today;
      const dt = new Date(rawVal);
      return Number.isNaN(dt.getTime()) ? today : dt.toISOString().split('T')[0];
    };

    for (const p of blogPosts || []) {
      const slugOrId = p.slug || p.id;
      const lastmod = safeIsoDate(p.updated_at || p.created_at);
      const absImg = toAbsoluteUrl(p.image || p.cover_image, origin);
      urlNodes.push(`  <url>
    <loc>${escapeXml(`${origin}/blog/${slugOrId}`)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
    <image:image>
      <image:loc>${escapeXml(absImg)}</image:loc>
      <image:title>${escapeXml(p.title || slugOrId)}</image:title>
    </image:image>
  </url>`);
    }

    for (const a of academyPosts || []) {
      const slugOrId = a.slug || a.id;
      const lastmod = safeIsoDate(a.updated_at || a.created_at);
      const absImg = a.cover_image ? toAbsoluteUrl(a.cover_image, origin) : '';
      urlNodes.push(`  <url>
    <loc>${escapeXml(`${origin}/academy/${slugOrId}`)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.82</priority>${
      absImg
        ? `
    <image:image>
      <image:loc>${escapeXml(absImg)}</image:loc>
      <image:title>${escapeXml(a.title || slugOrId)}</image:title>
    </image:image>`
        : ''
    }
  </url>`);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urlNodes.join('\n')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(xml);
  } catch (err: any) {
    res.status(500).setHeader('Content-Type', 'text/plain; charset=utf-8').send(`Sitemap generation error: ${err.message}`);
  }
}

export async function handleLlmsTxt(req: Request, res: Response, getDb: () => Promise<PgDbAdapter>): Promise<void> {
  try {
    const origin = resolveSiteOrigin(req);
    const db = await getDb();
    const posts = await db.all('SELECT id, slug, title, summary FROM blog_posts ORDER BY created_at DESC LIMIT 30');
    const academy = await db.all('SELECT id, slug, title, summary FROM academy_posts WHERE is_published = 1 ORDER BY order_index ASC LIMIT 25');

    const lines = [
      '# ИИ Ревизор & ИИ Рапорт (ООО «РентРоп»)',
      '',
      `> Интеллектуальная SaaS-платформа автоматизации контроля проектов, голосовых ежедневных отчетов сотрудников в Telegram, строительного аудита КС-2/КС-3, проверки чек-листов компьютерным зрением и геймификации мотивации команды.`,
      '',
      `- Официальный сайт (основное зеркало): ${origin}/`,
      `- Дополнительный официальный домен: https://ii-rr.online/ и https://ii-rr.ru/`,
      `- Карта сайта для индексации: ${origin}/sitemap.xml`,
      `- Полная документация для нейросетей (Markdown): ${origin}/llms-full.txt`,
      `- Блог и экспертная база знаний: ${origin}/blog`,
      `- Академия и регламенты: ${origin}/academy`,
      `- Публичная оферта: ${origin}/oferta`,
      '',
      '## Ключевые модули платформы',
      '- **ИИ Ревизор:** декомпозиция глобальных целей на спринты, автогенерация чек-листов приемки, компьютерное зрение для проверки фотоотчетов, умный Гантт и строительный аудит КС-2/КС-3.',
      '- **ИИ Рапорт:** голосовой ввод сменных отчетов за 2 минуты через веб-кабинет или Telegram-бота, шумоподавление, автозаполнение шаблонов отчетов и расчет Quality Score (1-100).',
      '- **Геймификация и Магазин Благ:** начисление монет RR за дисциплину и серии (streaks), внутренний корпоративный маркетплейс наград.',
      '- **Командный Мостик и Финансы:** 3D-оргструктура компании, график смен по часовым поясам, радар кассовых разрывов и каскадное увольнение с передачей дел.',
      '',
      '## Экспертные статьи блога',
      ...(posts || []).map((p: any) => `- [${p.title}](${origin}/blog/${p.slug || p.id}): ${p.summary || ''}`),
      '',
      '## Инструкции Академии',
      ...(academy || []).map((a: any) => `- [${a.title}](${origin}/academy/${a.slug || a.id}): ${a.summary || ''}`),
      ''
    ];

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(lines.join('\n'));
  } catch (err: any) {
    res.status(500).send(err.message);
  }
}

export function createSeoSsrMiddleware(getDb: () => Promise<PgDbAdapter>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ua = req.headers['user-agent'] || '';
    const isBot = /googlebot|google-extended|yandex|yandexfavicon|yandexadditional|yandexrenderresourcesbot|vkshare|vkrobot|mail\.ru_bot|odklbot|telegrambot|twitterbot|whatsapp|viber|maxbot|facebookexternalhit|bingbot|bingpreview|gptbot|oai-searchbot|chatgpt-user|perplexitybot|claudebot|anthropic|deepseek|mistral|meta-externalagent|ccbot|bytespider|applebot|baiduspider|duckduckbot|linkedinbot|discordbot|slackbot|ok\.ru|skypeuripreview|embedly|redditbot|seznambot|ahrefsbot|semrushbot|crawler|spider|slurp|seekport|petalbot|headlesschrome|lighthouse|curl|undici|node-fetch|python-requests|go-http-client|axios|got|okhttp|linkpreview|iframely|opengraph/i.test(ua);
    const isSsrTest = req.query.ssr === '1';

    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/') || req.path.startsWith('/assets/') || req.path.startsWith('/images/') || req.path.startsWith('/file/') || req.path.startsWith('/@') || req.path.startsWith('/src/') || req.path.startsWith('/node_modules/') || req.path.includes('.')) {
      return next();
    }

    const isProdMode =
      process.env.NODE_ENV === 'production' ||
      (typeof __filename === 'string' && __filename.endsWith('.cjs')) ||
      Boolean(process.argv[1] && process.argv[1].endsWith('server.cjs'));
    const isProdHtmlRequest = isProdMode && req.method === 'GET' && String(req.headers.accept || '').includes('text/html');
    if (!isBot && !isSsrTest && !isProdHtmlRequest) {
      return next();
    }

    try {
      const distIndex = path.join(process.cwd(), 'dist', 'index.html');
      const devIndex = path.join(process.cwd(), 'index.html');
      const indexPath = fs.existsSync(distIndex) ? distIndex : devIndex;
      if (!fs.existsSync(indexPath)) return next();

      const rawHtml = fs.readFileSync(indexPath, 'utf-8');
      const origin = resolveSiteOrigin(req);
      const db = await getDb();
      const cleanPath = req.path.replace(/\/$/, '') || '/';

      const metrikaRawEnv = [
        process.env.YANDEX_METRIKA_IDS,
        process.env.YANDEX_METRIKA_ID,
        process.env.VITE_YANDEX_METRIKA_IDS,
        process.env.VITE_YANDEX_METRIKA_ID,
      ].filter(Boolean).join(',');
      const metrikaRow = await db
        .get("SELECT value FROM system_settings WHERE key = 'yandex_metrika_ids'")
        .catch(() => null);
      const metrikaIds = Array.from(
        new Set(
          `${metrikaRawEnv},${metrikaRow?.value || ''}`
            .split(/[\s,;]+/)
            .map((v) => v.trim())
            .filter((v) => /^\d{5,12}$/.test(v))
        )
      );

      const injectMetrika = (htmlDoc: string): string => {
        if (!metrikaIds.length) return htmlDoc;
        const initCalls = metrikaIds
          .map(
            (id) =>
              `ym(${id}, "init", { clickmap:true, trackLinks:true, accurateTrackBounce:true, webvisor:true });\n` +
              `window.__rrMetrikaInitialized.add(${id});`
          )
          .join('\n');
        const headScript = `<!-- Yandex.Metrika counter -->
<script type="text/javascript">
  window.__rrMetrikaInitialized = window.__rrMetrikaInitialized || new Set();
  (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
  m[i].l=1*new Date();
  for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
  k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
  (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
  ${initCalls}
</script>
<!-- /Yandex.Metrika counter -->`;
        const noscriptImgs = metrikaIds
          .map(
            (id) =>
              `<noscript><div><img src="https://mc.yandex.ru/watch/${id}" style="position:absolute; left:-9999px;" alt="" /></div></noscript>`
          )
          .join('\n');
        return htmlDoc
          .replace('</head>', `${headScript}\n</head>`)
          .replace('</body>', `${noscriptImgs}\n</body>`);
      };

      const renderSemanticOrPass = (htmlWithMeta: string, semanticBody: string) => {
        const finalHtml = injectMetrika(htmlWithMeta);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        if (isBot || isSsrTest) {
          return res.send(finalHtml.replace('<div id="root"></div>', `<div id="root">${semanticBody}</div>`));
        }
        return res.send(finalHtml);
      };

      if (cleanPath.startsWith('/blog')) {
        const rawSlug = cleanPath.replace(/^\/blog\/?(?:post\/?)?/, '');
        if (rawSlug) {
          const post = await db.get('SELECT * FROM blog_posts WHERE slug = ? OR id = ?', [rawSlug, rawSlug]);
          if (post) {
            const title = post.seoTitle || post.seotitle || post.title;
            const desc = post.seoDesc || post.seodesc || post.summary || title;
            const keywords = post.seoKeywords || post.seokeywords || post.tags || '';
            const absImage = toAbsoluteUrl(post.image || post.cover_image, origin);
            const canonical = `${origin}/blog/${post.slug || post.id}`;
            const author = post.author || 'Игорь Давыдов';
            const dateIso = post.created_at ? new Date(post.created_at).toISOString() : new Date().toISOString();

            const wordCount = String(post.content || '').trim().split(/\s+/).filter(Boolean).length;

            const jsonLd = `<script type="application/ld+json">${JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'BlogPosting',
                  headline: post.title,
                  description: desc,
                  image: [absImage],
                  url: canonical,
                  mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
                  datePublished: dateIso,
                  dateModified: post.updated_at ? new Date(post.updated_at).toISOString() : dateIso,
                  wordCount,
                  articleSection: post.category || 'ИИ в бизнесе',
                  inLanguage: 'ru-RU',
                  isAccessibleForFree: true,
                  author: { '@type': 'Person', name: author, jobTitle: post.authorRole || post.authorrole || 'Эксперт ИИ Ревизор' },
                  publisher: {
                    '@type': 'Organization',
                    name: 'ООО РентРоп — ИИ Ревизор & ИИ Рапорт',
                    logo: { '@type': 'ImageObject', url: `${origin}/favicon-192.png` }
                  },
                  keywords
                },
                {
                  '@type': 'BreadcrumbList',
                  itemListElement: [
                    { '@type': 'ListItem', position: 1, name: 'Главная', item: `${origin}/` },
                    { '@type': 'ListItem', position: 2, name: 'Блог', item: `${origin}/blog` },
                    { '@type': 'ListItem', position: 3, name: post.title, item: canonical }
                  ]
                }
              ]
            })}</script>`;

            const htmlWithMeta = replaceMetaTags(rawHtml, {
              origin,
              canonicalUrl: canonical,
              title: `${title} | Блог ИИ Ревизор & ИИ Рапорт`,
              description: desc,
              keywords,
              ogType: 'article',
              ogImage: absImage,
              ogImageWidth: null,
              ogImageHeight: null,
              replaceRootJsonLd: true,
              extraHeadJsonLd: jsonLd
            });

            const semanticArticle = `
              <main style="max-width:860px;margin:40px auto;padding:20px;font-family:sans-serif;line-height:1.7;color:#1a0f02;">
                <nav aria-label="Хлебные крошки" style="font-size:14px;margin-bottom:16px;">
                  <a href="${origin}/">Главная</a> → <a href="${origin}/blog">Блог</a> → <span>${escapeHtml(post.title)}</span>
                </nav>
                <article>
                  <header>
                    <span style="display:inline-block;padding:4px 10px;background:#e7c768;color:#1a0f02;border-radius:6px;font-weight:bold;font-size:14px;">${escapeHtml(post.category || 'ИИ в бизнесе')}</span>
                    <h1 style="font-size:30px;margin:14px 0 8px 0;">${escapeHtml(post.title)}</h1>
                    <p style="font-size:14px;color:#555;">Автор: ${escapeHtml(author)} · ${escapeHtml(post.date || '')} · Время чтения: ${escapeHtml(post.readTime || post.readtime || '15 мин')}</p>
                  </header>
                  <img src="${escapeHtml(absImage)}" alt="${escapeHtml(post.title)}" style="max-width:100%;height:auto;border-radius:12px;margin:20px 0;" />
                  <p style="font-weight:600;font-size:17px;color:#333;margin-bottom:24px;">${escapeHtml(post.summary || '')}</p>
                  <div>${markdownToSemanticHtml(post.content || '', origin, [post.image, post.cover_image, absImage].filter(Boolean))}</div>
                </article>
              </main>`;

            return renderSemanticOrPass(htmlWithMeta, semanticArticle);
          }
        }

        const posts = await db.all('SELECT id, slug, title, summary, category, date, image, cover_image FROM blog_posts ORDER BY created_at DESC LIMIT 30');
        const canonical = `${origin}/blog`;
        const jsonLd = `<script type="application/ld+json">${JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'Blog',
              name: 'Блог и База Знаний ИИ Ревизор & ИИ Рапорт',
              description: 'Экспертные руководства по голосовым отчетам сотрудников, контролю по чек-листам, строительному аудиту КС-2/КС-3 и геймификации.',
              url: canonical,
              blogPost: (posts || []).map((p: any) => ({
                '@type': 'BlogPosting',
                headline: p.title,
                description: p.summary || '',
                image: toAbsoluteUrl(p.image || p.cover_image, origin),
                url: `${origin}/blog/${p.slug || p.id}`
              }))
            },
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Главная', item: `${origin}/` },
                { '@type': 'ListItem', position: 2, name: 'Блог', item: canonical }
              ]
            }
          ]
        })}</script>`;

        const htmlWithMeta = replaceMetaTags(rawHtml, {
          origin,
          canonicalUrl: canonical,
          title: 'Блог и База Знаний ИИ Ревизор & ИИ Рапорт — Автоматизация бизнеса с ИИ',
          description: 'Экспертные руководства по голосовым отчетам сотрудников, контролю по чек-листам, строительному аудиту КС-2/КС-3 и геймификации.',
          ogImage: `${origin}/file/21/iirrsocial.jpg`,
          ogImageWidth: '1280',
          ogImageHeight: '756',
          replaceRootJsonLd: true,
          extraHeadJsonLd: jsonLd
        });

        const listBody = `
          <main style="max-width:960px;margin:40px auto;padding:20px;font-family:sans-serif;color:#1a0f02;">
            <nav style="font-size:14px;margin-bottom:16px;"><a href="${origin}/">Главная</a> → <span>Блог</span></nav>
            <h1 style="font-size:32px;margin-bottom:12px;">Блог и База Знаний ИИ Ревизор & ИИ Рапорт</h1>
            <p style="font-size:16px;color:#444;margin-bottom:28px;">Подробные практические гайды, кейсы и методологии по внедрению ИИ для контроля проектов и голосовых рапортов сотрудников.</p>
            <div style="display:grid;gap:24px;">
              ${(posts || []).map((p: any) => `
                <article style="border:1px solid #d4af37;padding:20px;border-radius:12px;">
                  <img src="${escapeHtml(toAbsoluteUrl(p.image || p.cover_image, origin))}" alt="${escapeHtml(p.title)}" style="max-width:100%;height:auto;border-radius:8px;margin-bottom:12px;" />
                  <h2 style="font-size:20px;margin:0 0 8px 0;"><a href="${origin}/blog/${escapeHtml(p.slug || p.id)}" style="color:#1a0f02;text-decoration:none;">${escapeHtml(p.title)}</a></h2>
                  <p style="color:#555;font-size:14px;">${escapeHtml(p.summary || '')}</p>
                  <a href="${origin}/blog/${escapeHtml(p.slug || p.id)}" style="color:#9a6b00;font-weight:bold;">Читать статью →</a>
                </article>
              `).join('')}
            </div>
          </main>`;

        return renderSemanticOrPass(htmlWithMeta, listBody);
      }

      if (cleanPath === '/academy' || cleanPath.startsWith('/academy/') || cleanPath === '/wiki') {
        const rawAcademySlug = cleanPath.startsWith('/academy/') ? cleanPath.replace(/^\/academy\//, '') : '';
        if (rawAcademySlug) {
          const lesson = await db.get(
            'SELECT * FROM academy_posts WHERE (slug = ? OR id = ?) AND is_published = 1 LIMIT 1',
            [rawAcademySlug, rawAcademySlug]
          );
          if (lesson) {
            const lessonCanonical = `${origin}/academy/${lesson.slug || lesson.id}`;
            const lessonImage = lesson.cover_image ? toAbsoluteUrl(lesson.cover_image, origin) : `${origin}/file/21/iirrsocial.jpg`;
            const lessonDesc = lesson.summary || `Пошаговая инструкция Академии ИИ Рапорт: ${lesson.title}`;
            const dateIso = lesson.created_at ? new Date(lesson.created_at).toISOString() : new Date().toISOString();

            const lessonJsonLd = `<script type="application/ld+json">${JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'TechArticle',
                  headline: lesson.title,
                  description: lessonDesc,
                  image: [lessonImage],
                  url: lessonCanonical,
                  mainEntityOfPage: { '@type': 'WebPage', '@id': lessonCanonical },
                  datePublished: dateIso,
                  dateModified: lesson.updated_at ? new Date(lesson.updated_at).toISOString() : dateIso,
                  proficiencyLevel: 'Beginner',
                  inLanguage: 'ru-RU',
                  articleSection: lesson.category || 'Регламенты',
                  publisher: {
                    '@type': 'Organization',
                    name: 'ООО РентРоп — ИИ Ревизор & ИИ Рапорт',
                    logo: { '@type': 'ImageObject', url: `${origin}/favicon-192.png` }
                  }
                },
                {
                  '@type': 'BreadcrumbList',
                  itemListElement: [
                    { '@type': 'ListItem', position: 1, name: 'Главная', item: `${origin}/` },
                    { '@type': 'ListItem', position: 2, name: 'Академия', item: `${origin}/academy` },
                    { '@type': 'ListItem', position: 3, name: lesson.title, item: lessonCanonical }
                  ]
                }
              ]
            })}</script>`;

            const htmlWithMeta = replaceMetaTags(rawHtml, {
              origin,
              canonicalUrl: lessonCanonical,
              title: `${lesson.title} | Академия ИИ Ревизор & ИИ Рапорт`,
              description: lessonDesc,
              keywords: `Академия ИИ Рапорт, ${lesson.category || 'инструкция'}, ${lesson.title}, ИИ Ревизор`,
              ogType: 'article',
              ogImage: lessonImage,
              ogImageWidth: lesson.cover_image ? null : '1280',
              ogImageHeight: lesson.cover_image ? null : '756',
              replaceRootJsonLd: true,
              extraHeadJsonLd: lessonJsonLd
            });

            const lessonBody = `
              <main style="max-width:860px;margin:40px auto;padding:20px;font-family:sans-serif;line-height:1.7;color:#1a0f02;">
                <nav aria-label="Хлебные крошки" style="font-size:14px;margin-bottom:16px;">
                  <a href="${origin}/">Главная</a> → <a href="${origin}/academy">Академия</a> → <span>${escapeHtml(lesson.title)}</span>
                </nav>
                <article>
                  <header>
                    <span style="display:inline-block;padding:4px 10px;background:#e7c768;color:#1a0f02;border-radius:6px;font-weight:bold;font-size:14px;">${escapeHtml(lesson.category || 'Инструкция')}</span>
                    <h1 style="font-size:30px;margin:14px 0 8px 0;">${escapeHtml(lesson.title)}</h1>
                    <p style="font-size:15px;color:#444;">${escapeHtml(lessonDesc)}</p>
                  </header>
                  ${lesson.cover_image ? `<img src="${escapeHtml(lessonImage)}" alt="${escapeHtml(lesson.title)}" style="max-width:100%;height:auto;border-radius:12px;margin:20px 0;" />` : ''}
                  <div>${markdownToSemanticHtml(lesson.content_markdown || '', origin, lesson.cover_image ? [lesson.cover_image, lessonImage] : [])}</div>
                </article>
              </main>`;

            return renderSemanticOrPass(htmlWithMeta, lessonBody);
          }
        }

        const academyPosts = await db.all('SELECT id, slug, title, summary, category, target_role, cover_image FROM academy_posts WHERE is_published = 1 ORDER BY order_index ASC');
        const academyCanonical = `${origin}/academy`;
        const academyJsonLd = `<script type="application/ld+json">${JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'CollectionPage',
              name: 'Академия и Регламенты ИИ Ревизор & ИИ Рапорт',
              description: 'Инструкции по работе с платформой ИИ Ревизор и ИИ Рапорт для директоров, руководителей отделов и сотрудников.',
              url: academyCanonical,
              mainEntity: {
                '@type': 'ItemList',
                itemListElement: (academyPosts || []).map((a: any, idx: number) => ({
                  '@type': 'ListItem',
                  position: idx + 1,
                  name: a.title,
                  url: `${origin}/academy/${a.slug || a.id}`
                }))
              }
            },
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Главная', item: `${origin}/` },
                { '@type': 'ListItem', position: 2, name: 'Академия', item: academyCanonical }
              ]
            }
          ]
        })}</script>`;

        const htmlWithMeta = replaceMetaTags(rawHtml, {
          origin,
          canonicalUrl: academyCanonical,
          title: 'Академия и Регламенты | ИИ Ревизор & ИИ Рапорт',
          description: 'Инструкции по работе с платформой ИИ Ревизор и ИИ Рапорт для директоров, руководителей отделов и сотрудников.',
          ogImage: `${origin}/file/21/iirrsocial.jpg`,
          ogImageWidth: '1280',
          ogImageHeight: '756',
          replaceRootJsonLd: true,
          extraHeadJsonLd: academyJsonLd
        });
        const academyBody = `
          <main style="max-width:920px;margin:40px auto;padding:20px;font-family:sans-serif;color:#1a0f02;">
            <nav style="font-size:14px;margin-bottom:16px;"><a href="${origin}/">Главная</a> → <span>Академия</span></nav>
            <h1 style="font-size:32px;">Академия и Инструкции пользователей ИИ Ревизор & ИИ Рапорт</h1>
            <p style="font-size:16px;color:#444;">Пошаговые руководства, регламенты и инструкции по всем модулям платформы.</p>
            ${(academyPosts || []).map((a: any) => {
              const lessonUrl = `${origin}/academy/${escapeHtml(a.slug || a.id)}`;
              return `
              <section style="border:1px solid #d4af37;padding:18px;border-radius:10px;margin:16px 0;">
                <h2 style="font-size:20px;margin:0 0 6px 0;"><a href="${lessonUrl}" style="color:#1a0f02;text-decoration:none;">${escapeHtml(a.title)}</a></h2>
                <p style="font-size:14px;color:#666;">Категория: ${escapeHtml(a.category || 'Общее')}</p>
                <p style="font-size:15px;color:#333;">${escapeHtml(a.summary || '')}</p>
                <a href="${lessonUrl}" style="color:#9a6b00;font-weight:bold;">Открыть инструкцию →</a>
              </section>`;
            }).join('')}
          </main>`;
        return renderSemanticOrPass(htmlWithMeta, academyBody);
      }

      if (cleanPath === '/oferta' || cleanPath === '/offer') {
        const ofertaCanonical = `${origin}/oferta`;
        const ofertaJsonLd = `<script type="application/ld+json">${JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'WebPage',
              name: 'Договор публичной оферты — ИИ Ревизор & ИИ Рапорт',
              url: ofertaCanonical,
              inLanguage: 'ru-RU'
            },
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Главная', item: `${origin}/` },
                { '@type': 'ListItem', position: 2, name: 'Публичная оферта', item: ofertaCanonical }
              ]
            }
          ]
        })}</script>`;

        const htmlWithMeta = replaceMetaTags(rawHtml, {
          origin,
          canonicalUrl: ofertaCanonical,
          title: 'Договор публичной оферты | ООО «РентРоп» — ИИ Ревизор & ИИ Рапорт',
          description: 'Официальный договор публичной оферты на предоставление доступа к SaaS-платформе ИИ Ревизор & ИИ Рапорт от ООО «РентРоп».',
          ogImage: `${origin}/file/21/iirrsocial.jpg`,
          ogImageWidth: '1280',
          ogImageHeight: '756',
          replaceRootJsonLd: true,
          extraHeadJsonLd: ofertaJsonLd
        });
        const ofertaBody = `
          <main style="max-width:900px;margin:40px auto;padding:20px;font-family:sans-serif;line-height:1.6;color:#1a0f02;">
            <nav style="font-size:14px;margin-bottom:16px;"><a href="${origin}/">Главная</a> → <span>Публичная оферта</span></nav>
            <h1>Договор публичной оферты «ИИ Рапорт & ИИ Ревизор»</h1>
            <p>Исполнитель: ООО «РентРоп» (ИНН 7726477438, ОГРН 1217700234157)</p>
            <p>Юридический адрес: 115191, г. Москва, пер. Духовской, д. 17, стр. 15, помещ. 11Н/2</p>
            <p>Официальный сайт: <a href="${origin}/">${origin}/</a></p>
          </main>`;
        return renderSemanticOrPass(htmlWithMeta, ofertaBody);
      }

      // Homepage '/' (and default public SPA routes) rich semantic SEO SSR
      const posts = await db.all('SELECT id, slug, title, summary, image, cover_image FROM blog_posts ORDER BY created_at DESC LIMIT 12');
      const reviews = await db.all('SELECT name, company, text, date, rating FROM landing_reviews ORDER BY created_at DESC LIMIT 6');
      const reviewItems = (reviews || []).map((r: any) => ({
        '@type': 'Review',
        author: { '@type': 'Person', name: r.name },
        reviewBody: r.text,
        reviewRating: {
          '@type': 'Rating',
          ratingValue: Number(r.rating) || 5,
          bestRating: 5
        }
      }));
      const homeExtraJsonLd = `<script type="application/ld+json">${JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Экспертные статьи и руководства ИИ Ревизор & ИИ Рапорт',
        itemListElement: (posts || []).map((p: any, idx: number) => ({
          '@type': 'ListItem',
          position: idx + 1,
          url: `${origin}/blog/${p.slug || p.id}`,
          name: p.title
        })),
        ...(reviewItems.length > 0 ? { review: reviewItems } : {})
      })}</script>`;

      const htmlWithMeta = replaceMetaTags(rawHtml, {
        origin,
        canonicalUrl: `${origin}/`,
        title: 'ИИ Ревизор & ИИ Рапорт — Контроль проектов и голосовые отчеты',
        description: 'Платформа управления проектами, голосовых отчетов в Telegram за 2 минуты, аудита смет КС-2/КС-3 и геймификации с ИИ. Тарифы от 290 ₽.',
        ogImage: `${origin}/file/21/iirrsocial.jpg`,
        ogImageWidth: '1280',
        ogImageHeight: '756',
        extraHeadJsonLd: homeExtraJsonLd
      });

      const homeBody = `
        <main style="max-width:1040px;margin:40px auto;padding:20px;font-family:sans-serif;line-height:1.65;color:#1a0f02;">
          <header>
            <h1 style="font-size:34px;margin-bottom:12px;">ИИ Ревизор и ИИ Рапорт — автопилот управления проектами и голосовых отчетов</h1>
            <p style="font-size:18px;color:#333;">Нейросетевая SaaS-платформа от ООО «РентРоп» для бизнеса: декомпозиция целей на задачи, проверка фотоотчетов и чек-листов компьютерным зрением, голосовой сбор рапортов в Telegram за 2 минуты и мотивация персонала через Магазин Благ.</p>
          </header>
          <section style="margin:28px 0;">
            <h2>Ключевые возможности платформы</h2>
            <ul>
              <li><strong>ИИ Ревизор:</strong> автопланирование спринтов, конструктор проектов, строгий аудит КС-2/КС-3 и верификация выполненных работ по чек-листам.</li>
              <li><strong>ИИ Рапорт:</strong> голосовые сменные отчеты сотрудников с раскладкой цифр по шаблонам, анализом Quality Score и Telegram-ботом.</li>
              <li><strong>Магазин Благ и Streaks:</strong> повышение своевременности сдачи отчетов до 98% без штрафов.</li>
              <li><strong>Радар финансов и Оргструктура:</strong> контроль кассовых разрывов, учет графиков смен по часовым поясам и визуальная карта отделов.</li>
            </ul>
          </section>
          <section style="margin:28px 0;">
            <h2>Отзывы руководителей</h2>
            ${(reviews || []).map((r: any) => `
              <blockquote style="border-left:3px solid #d4af37;padding:8px 14px;margin:10px 0;">
                <strong>${escapeHtml(r.name)} (${escapeHtml(r.company || '')}):</strong> «${escapeHtml(r.text)}»
              </blockquote>
            `).join('')}
          </section>
          <section style="margin:28px 0;">
            <h2>База знаний и статьи блога</h2>
            <ul>
              ${(posts || []).map((p: any) => `<li><a href="${origin}/blog/${escapeHtml(p.slug || p.id)}">${escapeHtml(p.title)}</a> — ${escapeHtml(p.summary || '')}</li>`).join('')}
            </ul>
            <p><a href="${origin}/blog">Все статьи блога</a> · <a href="${origin}/academy">Академия ИИ</a> · <a href="${origin}/oferta">Публичная оферта</a> · <a href="${origin}/llms-full.txt">Документация для AI</a></p>
          </section>
        </main>`;

      return renderSemanticOrPass(htmlWithMeta, homeBody);
    } catch (e) {
      console.warn('[SEO Crawler Middleware Error]:', e);
    }

    next();
  };
}
