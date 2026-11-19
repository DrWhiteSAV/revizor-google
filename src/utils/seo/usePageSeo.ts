import { useEffect } from 'react';

export interface PageSeoConfig {
  title: string;
  description: string;
  keywords?: string;
  path: string;
  ogType?: 'website' | 'article';
  ogTitle?: string;
  ogDescription?: string;
  image?: string;
  imageAlt?: string;
  imageWidth?: number | null;
  imageHeight?: number | null;
  robots?: string;
  jsonLd?: Record<string, unknown> | null;
}

function getOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://ii-rr.ru';
}

function toAbsoluteUrl(urlOrPath: string | undefined, origin: string): string {
  const fallback = `${origin}/file/21/iirrsocial.jpg`;
  if (!urlOrPath || typeof urlOrPath !== 'string') return fallback;
  const trimmed = urlOrPath.trim();
  if (!trimmed || trimmed.startsWith('data:')) return fallback;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed.includes('unsplash.com') ? fallback : trimmed;
  }
  return `${origin}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string): void {
  if (typeof document === 'undefined') return;
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function removeMeta(attr: 'name' | 'property', key: string): void {
  if (typeof document === 'undefined') return;
  const el = document.querySelector(`meta[${attr}="${key}"]`);
  if (el) el.remove();
}

function upsertLink(rel: string, href: string): void {
  if (typeof document === 'undefined') return;
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

export function usePageSeo(config: PageSeoConfig): void {
  const serializedJsonLd = config.jsonLd ? JSON.stringify(config.jsonLd) : '';

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const origin = getOrigin();
    const cleanPath = config.path.startsWith('/') ? config.path : `/${config.path}`;
    const fullUrl = cleanPath === '/' ? `${origin}/` : `${origin}${cleanPath}`;
    const ogTitle = config.ogTitle || config.title;
    const ogDescription = config.ogDescription || config.description;
    const absImage = toAbsoluteUrl(config.image, origin);
    const imageAlt = config.imageAlt || config.title;

    document.title = config.title;
    upsertLink('canonical', fullUrl);
    upsertLink('image_src', absImage);

    upsertMeta('name', 'title', config.title);
    upsertMeta('name', 'description', config.description);
    if (config.keywords) {
      upsertMeta('name', 'keywords', config.keywords);
    }
    upsertMeta(
      'name',
      'robots',
      config.robots || 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
    );

    upsertMeta('property', 'og:type', config.ogType || 'website');
    upsertMeta('property', 'og:url', fullUrl);
    upsertMeta('property', 'og:title', ogTitle);
    upsertMeta('property', 'og:description', ogDescription);
    upsertMeta('property', 'og:image', absImage);
    upsertMeta('property', 'og:image:secure_url', absImage);
    upsertMeta('property', 'og:image:alt', imageAlt);
    upsertMeta('property', 'vk:image', absImage);

    if (config.imageWidth && config.imageHeight) {
      upsertMeta('property', 'og:image:width', String(config.imageWidth));
      upsertMeta('property', 'og:image:height', String(config.imageHeight));
    } else {
      removeMeta('property', 'og:image:width');
      removeMeta('property', 'og:image:height');
    }

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:url', fullUrl);
    upsertMeta('name', 'twitter:title', ogTitle);
    upsertMeta('name', 'twitter:description', ogDescription);
    upsertMeta('name', 'twitter:image', absImage);
    upsertMeta('name', 'twitter:image:alt', imageAlt);

    const legacyScript = document.getElementById('dynamic-blog-jsonld');
    if (legacyScript) {
      legacyScript.remove();
    }

    let ldScript = document.getElementById('dynamic-seo-jsonld') as HTMLScriptElement | null;
    if (serializedJsonLd) {
      if (!ldScript) {
        ldScript = document.createElement('script');
        ldScript.id = 'dynamic-seo-jsonld';
        ldScript.type = 'application/ld+json';
        document.head.appendChild(ldScript);
      }
      ldScript.textContent = serializedJsonLd;
    } else if (ldScript) {
      ldScript.remove();
    }
  }, [
    config.title,
    config.description,
    config.keywords,
    config.path,
    config.ogType,
    config.ogTitle,
    config.ogDescription,
    config.image,
    config.imageAlt,
    config.imageWidth,
    config.imageHeight,
    config.robots,
    serializedJsonLd,
  ]);
}
