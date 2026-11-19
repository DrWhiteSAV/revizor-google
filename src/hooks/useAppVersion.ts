import { useEffect, useState } from 'react';

const VERSION_STORAGE_KEY = 'ii_rr_app_version';
const VERSION_EVENT = 'ii-rr-version-updated';

let memoryVersionCache = '';

function readCachedVersion(): string {
  if (memoryVersionCache) return memoryVersionCache;
  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem(VERSION_STORAGE_KEY);
      if (stored && stored.trim()) {
        memoryVersionCache = stored.trim();
        return memoryVersionCache;
      }
    } catch {
      // ignore storage access errors
    }
  }
  return '';
}

function writeCachedVersion(version: string): void {
  const clean = String(version || '').trim();
  if (!clean) return;
  memoryVersionCache = clean;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(VERSION_STORAGE_KEY, clean);
    } catch {
      // ignore storage quota errors
    }
  }
}

export function broadcastAppVersionUpdate(newVersion: string): void {
  const clean = String(newVersion || '').trim();
  if (!clean || typeof window === 'undefined') return;
  writeCachedVersion(clean);
  window.dispatchEvent(new CustomEvent(VERSION_EVENT, { detail: clean }));
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('ii_rr_db_sync');
      bc.postMessage({ type: 'version-updated', table: 'system_settings', version: clean });
      bc.close();
    }
  } catch {
    // BroadcastChannel unavailable
  }
}

export function useAppVersion(fallback = 'v.1.54'): string {
  const [appVersion, setAppVersion] = useState<string>(() => readCachedVersion() || fallback);

  useEffect(() => {
    let active = true;

    const fetchLatestVersion = async () => {
      try {
        const res = await fetch(`/api/system/version?_t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        const data = await res.json();
        if (active && data?.success && data?.version) {
          const next = String(data.version).trim();
          writeCachedVersion(next);
          setAppVersion(next);
        }
      } catch {
        // Keep cached or fallback version on transient offline failure
      }
    };

    fetchLatestVersion();

    const onVersionEvent = (evt: Event) => {
      const customEvt = evt as CustomEvent<string>;
      if (customEvt?.detail) {
        setAppVersion(String(customEvt.detail).trim());
      } else {
        fetchLatestVersion();
      }
    };

    const onStorage = (evt: StorageEvent) => {
      if (evt.key === VERSION_STORAGE_KEY && evt.newValue) {
        memoryVersionCache = evt.newValue.trim();
        setAppVersion(memoryVersionCache);
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchLatestVersion();
      }
    };

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('ii_rr_db_sync');
        bc.onmessage = (evt: MessageEvent) => {
          if (evt.data?.type === 'version-updated' && evt.data?.version) {
            const next = String(evt.data.version).trim();
            writeCachedVersion(next);
            if (active) setAppVersion(next);
          } else if (evt.data?.table === 'system_settings' || evt.data?.table === 'all') {
            fetchLatestVersion();
          }
        };
      }
    } catch {
      // BroadcastChannel unavailable
    }

    window.addEventListener(VERSION_EVENT, onVersionEvent);
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      active = false;
      window.removeEventListener(VERSION_EVENT, onVersionEvent);
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisibility);
      if (bc) bc.close();
    };
  }, []);

  return appVersion;
}
