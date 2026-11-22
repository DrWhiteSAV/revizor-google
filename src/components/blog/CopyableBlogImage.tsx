import React, { useState } from 'react';
import { Copy, Check, Link2, Loader2 } from 'lucide-react';

interface CopyableBlogImageProps {
  src: string;
  alt?: string;
  caption?: string;
  isLight?: boolean;
  variant?: 'cover' | 'figure' | 'inline';
  containerClassName?: string;
  imgClassName?: string;
}

export function resolveAbsoluteImageUrl(src: string): string {
  if (!src) return '';
  if (typeof window === 'undefined') return src;
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:') || src.startsWith('blob:')) {
    return src;
  }
  return `${window.location.origin}${src.startsWith('/') ? src : '/' + src}`;
}

async function blobToPngBlob(blob: Blob): Promise<Blob> {
  if (blob.type === 'image/png') {
    return blob;
  }
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Image decode failed'));
      el.src = objectUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width || 1;
    canvas.height = img.naturalHeight || img.height || 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas context unavailable');
    }
    ctx.drawImage(img, 0, 0);
    const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!pngBlob) {
      throw new Error('PNG conversion failed');
    }
    return pngBlob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function fetchImageBlobSameOriginOrProxy(src: string): Promise<Blob> {
  const isRemote = src.startsWith('http://') || src.startsWith('https://');
  const isSameOrigin =
    !isRemote ||
    (typeof window !== 'undefined' && src.startsWith(window.location.origin));

  if (isSameOrigin) {
    const res = await fetch(src);
    if (!res.ok) throw new Error('Same-origin fetch failed');
    return await res.blob();
  }

  const proxyRes = await fetch(`/api/blog/image-proxy?url=${encodeURIComponent(src)}`);
  if (proxyRes.ok) {
    return await proxyRes.blob();
  }

  const directRes = await fetch(src, { mode: 'cors' });
  if (!directRes.ok) {
    throw new Error('Remote fetch failed');
  }
  return await directRes.blob();
}

function fallbackCopyTextExecCommand(text: string): boolean {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export async function copyBlogImageToClipboard(src: string): Promise<'image' | 'url'> {
  const absUrl = resolveAbsoluteImageUrl(src);
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.write === 'function' &&
    typeof ClipboardItem !== 'undefined'
  ) {
    try {
      const rawBlob = await fetchImageBlobSameOriginOrProxy(src);
      const pngBlob = await blobToPngBlob(rawBlob);
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
      return 'image';
    } catch {
      // Fall back to copying URL
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(absUrl);
      return 'url';
    } catch {
      // Fall back to execCommand
    }
  }

  if (fallbackCopyTextExecCommand(absUrl)) {
    return 'url';
  }
  throw new Error('Clipboard API unavailable');
}

export const CopyableBlogImage: React.FC<CopyableBlogImageProps> = ({
  src,
  alt = 'Изображение публикации',
  caption,
  isLight = false,
  variant = 'figure',
  containerClassName,
  imgClassName,
}) => {
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'image' | 'url' | 'link'>('idle');

  const handleCopyImage = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (copyState === 'copying') return;
    setCopyState('copying');
    try {
      const mode = await copyBlogImageToClipboard(src);
      setCopyState(mode);
      setTimeout(() => setCopyState('idle'), 2200);
    } catch {
      setCopyState('idle');
    }
  };

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const absUrl = resolveAbsoluteImageUrl(src);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(absUrl);
      } else {
        fallbackCopyTextExecCommand(absUrl);
      }
      setCopyState('link');
      setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      if (fallbackCopyTextExecCommand(absUrl)) {
        setCopyState('link');
        setTimeout(() => setCopyState('idle'), 2000);
      }
    }
  };

  const toolbarClasses = isLight
    ? 'bg-[#FFFBF5]/95 border-amber-900/30 text-amber-950 shadow-md'
    : 'bg-[#140A01]/90 border-[#E7C768]/50 text-[#F4EE8E] shadow-lg';

  const buttonHoverClasses = isLight
    ? 'hover:bg-amber-900/10 text-amber-950'
    : 'hover:bg-[#E7C768]/15 text-[#F4EE8E]';

  const copyControls = (
    <div
      className={`absolute top-2.5 right-2.5 z-10 flex items-center gap-1 rounded-xl border backdrop-blur-md px-1.5 py-1 transition-opacity ${toolbarClasses}`}
    >
      <button
        type="button"
        onClick={handleCopyImage}
        title="Копировать изображение в буфер обмена"
        aria-label="Копировать изображение"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-bold transition-colors cursor-pointer ${buttonHoverClasses}`}
      >
        {copyState === 'copying' ? (
          <Loader2 size={14} className="animate-spin shrink-0" />
        ) : copyState === 'image' || copyState === 'url' ? (
          <Check size={14} className="shrink-0" />
        ) : (
          <Copy size={14} className="shrink-0" />
        )}
        <span>
          {copyState === 'copying'
            ? 'Копирую...'
            : copyState === 'image'
              ? 'Скопировано'
              : copyState === 'url'
                ? 'URL скопирован'
                : 'Копировать'}
        </span>
      </button>

      <div className={`w-px h-4 ${isLight ? 'bg-amber-900/20' : 'bg-[#E7C768]/30'}`} />

      <button
        type="button"
        onClick={handleCopyLink}
        title="Копировать прямую ссылку на изображение"
        aria-label="Копировать ссылку на изображение"
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${buttonHoverClasses}`}
      >
        {copyState === 'link' ? <Check size={14} className="shrink-0" /> : <Link2 size={14} className="shrink-0" />}
        <span className="hidden sm:inline">{copyState === 'link' ? 'Готово' : 'Ссылка'}</span>
      </button>
    </div>
  );

  if (variant === 'inline') {
    return (
      <span
        className={
          containerClassName ||
          `copyable-blog-media relative block my-4 rounded-2xl overflow-hidden border shadow-lg group ${
            isLight ? 'border-amber-900/20 bg-amber-50/50' : 'border-amber-400/30 bg-[#1A0F02]'
          }`
        }
      >
        {copyControls}
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className={imgClassName || 'copyable-blog-img w-full h-auto max-h-[460px] object-cover'}
          referrerPolicy="no-referrer"
        />
        {caption && (
          <span className={`block text-center text-sm py-2 px-3 italic ${isLight ? 'text-stone-700' : 'text-amber-200/80'}`}>
            {caption}
          </span>
        )}
      </span>
    );
  }

  return (
    <figure
      className={
        containerClassName ||
        `copyable-blog-media relative my-6 rounded-2xl overflow-hidden border shadow-xl group ${
          isLight ? 'border-amber-900/20 bg-amber-50/60' : 'border-amber-400/35 bg-[#1A0F02]/80'
        }`
      }
    >
      {copyControls}
      <img
        src={src}
        alt={alt}
        loading={variant === 'cover' ? 'eager' : 'lazy'}
        className={imgClassName || 'copyable-blog-img w-full h-auto max-h-[480px] object-cover'}
        referrerPolicy="no-referrer"
      />
      {caption && (
        <figcaption
          className={`text-center text-sm py-2.5 px-4 italic border-t ${
            isLight ? 'text-stone-700 border-amber-900/10' : 'text-amber-200/85 border-amber-400/20'
          }`}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  );
};
