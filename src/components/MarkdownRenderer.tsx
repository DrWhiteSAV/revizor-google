import React from 'react';

interface MarkdownRendererProps {
  content: string;
  theme?: 'dark' | 'light';
  isLightTheme?: boolean;
  excludeImages?: string[];
}

export default function MarkdownRenderer({ content, theme, isLightTheme: isLightProp, excludeImages = [] }: MarkdownRendererProps) {
  if (!content) return null;
  const isLight = isLightProp ?? theme === 'light';

  const normalizeImgUrl = (url: string) => url.trim().split('?')[0].toLowerCase();
  const seenImages = new Set<string>(excludeImages.filter(Boolean).map(normalizeImgUrl));

  const normalizedContent = content.replace(/\\n/g, '\n');

  const blocks: { type: 'markdown' | 'html'; value: string }[] = [];
  const htmlEmbedRegex = /(<iframe[^>]*>[\s\S]*?<\/iframe>|<video[^>]*>[\s\S]*?<\/video>|<embed[^>]*\/?>|<object[^>]*>[\s\S]*?<\/object>)/gi;
  const parts = normalizedContent.split(htmlEmbedRegex);

  for (const part of parts) {
    if (!part.trim()) continue;
    const t = part.trim().toLowerCase();
    if (t.startsWith('<iframe') || t.startsWith('<video') || t.startsWith('<embed') || t.startsWith('<object')) {
      blocks.push({ type: 'html', value: part });
    } else {
      blocks.push({ type: 'markdown', value: part });
    }
  }

  const parseInline = (text: string): React.ReactNode[] => {
    const inlineRegex = /(\*\*[^*]+?\*\*|\*[^*]+?\*|`[^`]+?`|!\[[^\]]*?\]\([^)]+?\)|\[[^\]]+?\]\([^)]+?\))/g;
    const segments = text.split(inlineRegex);

    return segments.map((seg, i) => {
      if (seg.startsWith('**') && seg.endsWith('**') && seg.length > 4) {
        return (
          <strong key={i} className={`font-extrabold ${isLight ? 'text-amber-950 font-black' : 'text-[#F4EE8E]'}`}>
            {seg.slice(2, -2)}
          </strong>
        );
      }
      if (seg.startsWith('*') && seg.endsWith('*') && seg.length > 2) {
        return (
          <em key={i} className={`italic ${isLight ? 'text-stone-800' : 'text-zinc-200'}`}>
            {seg.slice(1, -1)}
          </em>
        );
      }
      if (seg.startsWith('`') && seg.endsWith('`') && seg.length > 2) {
        return (
          <code
            key={i}
            className={`px-1.5 py-0.5 rounded font-mono text-sm border ${
              isLight
                ? 'bg-amber-100 text-amber-950 border-amber-300'
                : 'bg-[#1A0F02] text-amber-200 border-amber-400/25'
            }`}
          >
            {seg.slice(1, -1)}
          </code>
        );
      }
      if (seg.startsWith('![') && seg.includes('](')) {
        const match = seg.match(/!\[(.*?)\]\((.*?)\)/);
        if (match) {
          const normUrl = normalizeImgUrl(match[2]);
          if (seenImages.has(normUrl)) {
            return null;
          }
          seenImages.add(normUrl);
          return (
            <span
              key={i}
              className={`block my-4 rounded-2xl overflow-hidden border shadow-lg ${
                isLight ? 'border-amber-900/20 bg-amber-50/50' : 'border-amber-400/30 bg-[#1A0F02]'
              }`}
            >
              <img
                src={match[2]}
                alt={match[1] || 'Иллюстрация статьи'}
                loading="lazy"
                className="w-full h-auto max-h-[460px] object-cover"
                referrerPolicy="no-referrer"
              />
              {match[1] && (
                <span className={`block text-center text-sm py-2 px-3 italic ${isLight ? 'text-stone-700' : 'text-amber-200/80'}`}>
                  {match[1]}
                </span>
              )}
            </span>
          );
        }
      }
      if (seg.startsWith('[') && seg.includes('](')) {
        const match = seg.match(/\[(.*?)\]\((.*?)\)/);
        if (match) {
          const isInternal = match[2].startsWith('/');
          return (
            <a
              key={i}
              href={match[2]}
              target={isInternal ? undefined : '_blank'}
              rel={isInternal ? undefined : 'noopener noreferrer'}
              className={`underline font-semibold transition-colors ${
                isLight ? 'text-amber-900 hover:text-amber-700' : 'text-[#F4EE8E] hover:text-amber-200'
              }`}
            >
              {match[1]}
            </a>
          );
        }
      }
      return seg;
    });
  };

  const renderMarkdownBlock = (text: string, blockIndex: number) => {
    const lines = text.split('\n');
    let inList = false;
    let listItems: string[] = [];
    let isOrderedList = false;
    const elements: React.ReactNode[] = [];

    const flushList = (key: string) => {
      if (listItems.length > 0) {
        if (isOrderedList) {
          elements.push(
            <ol key={key} className={`list-decimal pl-6 my-4 space-y-2 text-sm sm:text-base ${isLight ? 'text-stone-900' : 'text-stone-200'}`}>
              {listItems.map((item, idx) => (
                <li key={idx} className="leading-relaxed">
                  {parseInline(item)}
                </li>
              ))}
            </ol>
          );
        } else {
          elements.push(
            <ul key={key} className={`my-4 space-y-2 text-sm sm:text-base ${isLight ? 'text-stone-900' : 'text-stone-200'}`}>
              {listItems.map((item, idx) => (
                <li key={idx} className="leading-relaxed flex items-start gap-2.5">
                  <span className={`mt-1.5 font-bold text-sm select-none ${isLight ? 'text-amber-700' : 'text-[#E7C768]'}`}>•</span>
                  <span>{parseInline(item)}</span>
                </li>
              ))}
            </ul>
          );
        }
        listItems = [];
        inList = false;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Standalone Markdown Image ![alt](url)
      const standaloneImg = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
      if (standaloneImg) {
        flushList(`list-img-${blockIndex}-${i}`);
        const normUrl = normalizeImgUrl(standaloneImg[2]);
        if (seenImages.has(normUrl)) {
          continue;
        }
        seenImages.add(normUrl);
        elements.push(
          <figure
            key={`fig-${blockIndex}-${i}`}
            className={`my-6 rounded-2xl overflow-hidden border shadow-xl ${
              isLight ? 'border-amber-900/20 bg-amber-50/60' : 'border-amber-400/35 bg-[#1A0F02]/80'
            }`}
          >
            <img
              src={standaloneImg[2]}
              alt={standaloneImg[1] || 'Иллюстрация ИИ Ревизор и ИИ Рапорт'}
              loading="lazy"
              className="w-full h-auto max-h-[480px] object-cover"
              referrerPolicy="no-referrer"
            />
            {standaloneImg[1] && (
              <figcaption
                className={`text-center text-sm py-2.5 px-4 italic border-t ${
                  isLight ? 'text-stone-700 border-amber-900/10' : 'text-amber-200/85 border-amber-400/20'
                }`}
              >
                {standaloneImg[1]}
              </figcaption>
            )}
          </figure>
        );
        continue;
      }

      // Raw HTML <img> tag
      const rawImgMatch = trimmed.match(/^<img\s+[^>]*src=["']([^"']+)["'][^>]*>$/i);
      if (rawImgMatch) {
        flushList(`list-rawimg-${blockIndex}-${i}`);
        const normUrl = normalizeImgUrl(rawImgMatch[1]);
        if (seenImages.has(normUrl)) {
          continue;
        }
        seenImages.add(normUrl);
        const altMatch = trimmed.match(/alt=["']([^"']*)["']/i);
        elements.push(
          <figure
            key={`rawfig-${blockIndex}-${i}`}
            className={`my-6 rounded-2xl overflow-hidden border shadow-xl ${
              isLight ? 'border-amber-900/20 bg-amber-50/60' : 'border-amber-400/35 bg-[#1A0F02]/80'
            }`}
          >
            <img
              src={rawImgMatch[1]}
              alt={altMatch ? altMatch[1] : 'Изображение публикации'}
              loading="lazy"
              className="w-full h-auto max-h-[480px] object-cover"
              referrerPolicy="no-referrer"
            />
          </figure>
        );
        continue;
      }

      // Markdown Table | h1 | h2 |
      if (
        trimmed.startsWith('|') &&
        i + 1 < lines.length &&
        lines[i + 1].trim().startsWith('|') &&
        /[-:]/.test(lines[i + 1])
      ) {
        flushList(`list-tbl-${blockIndex}-${i}`);
        const parseRow = (r: string) =>
          r
            .trim()
            .replace(/^\|/, '')
            .replace(/\|$/, '')
            .split('|')
            .map(c => c.trim());

        const headers = parseRow(trimmed);
        i += 2;
        const rows: string[][] = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          rows.push(parseRow(lines[i]));
          i++;
        }
        i--;

        elements.push(
          <div
            key={`tbl-${blockIndex}-${i}`}
            className={`my-6 overflow-x-auto rounded-2xl border shadow-lg ${
              isLight ? 'border-amber-900/25 bg-[#FFFBF5]' : 'border-amber-400/30 bg-[#140A01]/80'
            }`}
          >
            <table className="w-full text-left border-collapse text-sm">
              <thead
                className={
                  isLight
                    ? 'bg-amber-100/90 text-amber-950 border-b border-amber-900/20'
                    : 'bg-amber-400/15 text-[#F4EE8E] border-b border-amber-400/30'
                }
              >
                <tr>
                  {headers.map((h, idx) => (
                    <th key={idx} className="px-4 py-3 font-extrabold whitespace-nowrap sm:whitespace-normal">
                      {parseInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-amber-900/10 text-stone-900' : 'divide-amber-400/15 text-stone-200'}`}>
                {rows.map((r, rIdx) => (
                  <tr key={rIdx} className={isLight ? 'hover:bg-amber-50/70' : 'hover:bg-amber-400/5'}>
                    {headers.map((_, cIdx) => (
                      <td key={cIdx} className="px-4 py-3 align-top leading-relaxed">
                        {parseInline(r[cIdx] || '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }

      // Horizontal rule
      if (trimmed === '---' || trimmed === '***') {
        flushList(`list-hr-${blockIndex}-${i}`);
        elements.push(
          <hr key={`hr-${blockIndex}-${i}`} className={`my-6 border-t ${isLight ? 'border-amber-900/20' : 'border-amber-400/25'}`} />
        );
        continue;
      }

      // Headers
      if (trimmed.startsWith('# ')) {
        flushList(`list-${blockIndex}-${i}`);
        elements.push(
          <h1
            key={`h1-${blockIndex}-${i}`}
            className={`text-xl sm:text-2xl font-bold font-sans mt-6 mb-3 tracking-tight ${
              isLight ? 'text-amber-950 border-b border-amber-900/15 pb-2' : 'text-[#F4EE8E] border-b border-amber-400/20 pb-2'
            }`}
          >
            {parseInline(trimmed.slice(2))}
          </h1>
        );
      } else if (trimmed.startsWith('## ')) {
        flushList(`list-${blockIndex}-${i}`);
        elements.push(
          <h2
            key={`h2-${blockIndex}-${i}`}
            className={`text-lg sm:text-xl font-bold font-sans mt-6 mb-2.5 tracking-tight ${
              isLight ? 'text-amber-900 border-b border-amber-900/10 pb-1.5' : 'text-[#E7C768] border-b border-amber-400/15 pb-1.5'
            }`}
          >
            {parseInline(trimmed.slice(3))}
          </h2>
        );
      } else if (trimmed.startsWith('### ')) {
        flushList(`list-${blockIndex}-${i}`);
        elements.push(
          <h3 key={`h3-${blockIndex}-${i}`} className={`text-base sm:text-lg font-bold font-sans mt-5 mb-2 ${isLight ? 'text-amber-950' : 'text-amber-200'}`}>
            {parseInline(trimmed.slice(4))}
          </h3>
        );
      } else if (trimmed.startsWith('#### ')) {
        flushList(`list-${blockIndex}-${i}`);
        elements.push(
          <h4 key={`h4-${blockIndex}-${i}`} className={`text-sm sm:text-base font-bold font-sans mt-4 mb-1.5 ${isLight ? 'text-amber-900' : 'text-[#F4EE8E]'}`}>
            {parseInline(trimmed.slice(5))}
          </h4>
        );
      } else if (trimmed.startsWith('>')) {
        flushList(`list-${blockIndex}-${i}`);
        let quoteContent = trimmed.slice(1).trim();
        while (i + 1 < lines.length && lines[i + 1].trim().startsWith('>')) {
          i++;
          quoteContent += '\n' + lines[i].trim().slice(1).trim();
        }
        elements.push(
          <blockquote
            key={`quote-${blockIndex}-${i}`}
            className={`border-l-4 pl-4 italic my-4 py-3 pr-4 rounded-r-xl font-sans text-sm sm:text-base ${
              isLight ? 'border-amber-600 bg-amber-50/80 text-stone-900' : 'border-[#E7C768] bg-amber-400/10 text-stone-100'
            }`}
          >
            {quoteContent.split('\n').map((ql, qIdx) => (
              <span key={qIdx} className="block">
                {parseInline(ql)}
              </span>
            ))}
          </blockquote>
        );
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        if (!inList || isOrderedList) {
          flushList(`list-${blockIndex}-${i}`);
          inList = true;
          isOrderedList = false;
        }
        listItems.push(trimmed.slice(2));
      } else if (/^\d+\.\s/.test(trimmed)) {
        if (!inList || !isOrderedList) {
          flushList(`list-${blockIndex}-${i}`);
          inList = true;
          isOrderedList = true;
        }
        listItems.push(trimmed.replace(/^\d+\.\s/, ''));
      } else if (!trimmed) {
        flushList(`list-${blockIndex}-${i}`);
      } else if (trimmed.startsWith('```')) {
        flushList(`list-${blockIndex}-${i}`);
        const lang = trimmed.slice(3).trim();
        let code = '';
        while (i + 1 < lines.length && !lines[i + 1].trim().startsWith('```')) {
          i++;
          code += lines[i] + '\n';
        }
        if (i + 1 < lines.length) i++;
        elements.push(
          <pre
            key={`code-${blockIndex}-${i}`}
            className={`p-4 rounded-xl border font-mono text-sm overflow-x-auto my-4 ${
              isLight ? 'bg-amber-50/90 border-amber-900/20 text-stone-900' : 'bg-[#140A01] border-amber-400/30 text-amber-200'
            }`}
          >
            {lang && (
              <span className={`block text-sm font-bold mb-2 pb-1 border-b ${isLight ? 'text-amber-800 border-amber-200' : 'text-amber-300/80 border-amber-400/20'}`}>
                {lang}
              </span>
            )}
            <code>{code}</code>
          </pre>
        );
      } else {
        flushList(`list-${blockIndex}-${i}`);
        elements.push(
          <p key={`p-${blockIndex}-${i}`} className={`leading-relaxed mb-3 text-sm sm:text-base font-sans ${isLight ? 'text-stone-900' : 'text-stone-200'}`}>
            {parseInline(line)}
          </p>
        );
      }
    }

    flushList(`list-trail-${blockIndex}`);
    return (
      <div key={`markdown-block-${blockIndex}`} className="space-y-2">
        {elements}
      </div>
    );
  };

  return (
    <div className={`space-y-4 leading-relaxed font-sans ${isLight ? 'text-stone-900' : 'text-stone-200'}`} id="markdown-rendered-body">
      {blocks.map((block, index) => {
        if (block.type === 'html') {
          return (
            <div
              key={`html-${index}`}
              className={`w-full overflow-hidden rounded-2xl border shadow-lg my-4 relative aspect-video ${
                isLight ? 'border-amber-900/20 bg-amber-50/50' : 'border-amber-400/30 bg-[#140A01]'
              }`}
              dangerouslySetInnerHTML={{ __html: block.value }}
              id={`embed-container-${index}`}
            />
          );
        }
        return renderMarkdownBlock(block.value, index);
      })}
    </div>
  );
}
