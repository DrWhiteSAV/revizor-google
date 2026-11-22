declare global {
  interface Window {
    ym?: (...args: any[]) => void;
    __rrMetrikaInitialized?: Set<number>;
    __rrMetrikaScriptLoaded?: boolean;
  }
}

export function parseMetrikaCounterIds(raw?: string | null): number[] {
  if (!raw || typeof raw !== 'string') return [];
  const ids = raw
    .split(/[\s,;]+/)
    .map((part) => part.trim())
    .filter((part) => /^\d{5,12}$/.test(part))
    .map((part) => Number(part));
  return Array.from(new Set(ids));
}

function getEnvCounterIds(): number[] {
  const env = (import.meta as any)?.env || {};
  const combined = [env.VITE_YANDEX_METRIKA_IDS, env.VITE_YANDEX_METRIKA_ID].filter(Boolean).join(',');
  return parseMetrikaCounterIds(combined);
}

function ensureYmQueue(): void {
  if (typeof window === 'undefined') return;
  if (typeof window.ym === 'function') return;
  const ymFn: any = function (...args: any[]) {
    (ymFn.a = ymFn.a || []).push(args);
  };
  ymFn.l = Date.now();
  window.ym = ymFn;
}

function injectMetrikaScriptOnce(): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  if (window.__rrMetrikaScriptLoaded) return;
  const existing = document.querySelector('script[src*="mc.yandex.ru/metrika/tag.js"]');
  if (existing) {
    window.__rrMetrikaScriptLoaded = true;
    return;
  }
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://mc.yandex.ru/metrika/tag.js';
  document.head.appendChild(s);
  window.__rrMetrikaScriptLoaded = true;
}

export function initYandexMetrikaCounters(counterIds: number[]): number[] {
  if (typeof window === 'undefined' || !counterIds.length) return [];
  ensureYmQueue();
  injectMetrikaScriptOnce();
  if (!window.__rrMetrikaInitialized) {
    window.__rrMetrikaInitialized = new Set<number>();
  }

  for (const id of counterIds) {
    if (window.__rrMetrikaInitialized.has(id)) continue;
    window.__rrMetrikaInitialized.add(id);
    window.ym?.(id, 'init', {
      clickmap: true,
      trackLinks: true,
      accurateTrackBounce: true,
      webvisor: true,
      trackHash: false,
    });
  }
  return Array.from(window.__rrMetrikaInitialized);
}

let cachedServerIds: number[] | null = null;
let fetchPromise: Promise<number[]> | null = null;

export async function loadAndInitYandexMetrika(): Promise<number[]> {
  const envIds = getEnvCounterIds();
  if (envIds.length > 0) {
    initYandexMetrikaCounters(envIds);
  }

  if (cachedServerIds !== null) {
    const merged = Array.from(new Set([...envIds, ...cachedServerIds]));
    return initYandexMetrikaCounters(merged);
  }

  if (!fetchPromise) {
    fetchPromise = fetch('/api/system/metrika')
      .then(async (res) => {
        if (!res.ok) return [];
        const data = await res.json().catch(() => null);
        if (data?.success && Array.isArray(data.ids)) {
          return parseMetrikaCounterIds(data.ids.join(','));
        }
        return parseMetrikaCounterIds(data?.rawIds || '');
      })
      .catch(() => [])
      .then((serverIds) => {
        cachedServerIds = serverIds;
        const merged = Array.from(new Set([...envIds, ...serverIds]));
        return initYandexMetrikaCounters(merged);
      });
  }

  return fetchPromise;
}

export function resetYandexMetrikaCache(): void {
  cachedServerIds = null;
  fetchPromise = null;
}

export function trackYandexMetrikaHit(urlPath?: string): void {
  if (typeof window === 'undefined') return;
  const active = window.__rrMetrikaInitialized;
  if (!active || active.size === 0) return;
  const targetUrl = urlPath
    ? `${window.location.origin}${urlPath.startsWith('/') ? urlPath : `/${urlPath}`}`
    : window.location.href;
  active.forEach((id) => {
    try {
      window.ym?.(id, 'hit', targetUrl, {
        title: document.title,
      });
    } catch {
      // ignore non-critical analytics error
    }
  });
}
