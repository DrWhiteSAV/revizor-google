import React from 'react';
import { motion } from 'motion/react';
import { Calendar, ExternalLink } from 'lucide-react';
import MarkdownRenderer from '../MarkdownRenderer';
import { CopyableBlogImage } from './CopyableBlogImage';

interface BlogEditorPreviewPanelProps {
  title: string;
  category: string;
  author: string;
  authorRole: string;
  image: string;
  content: string;
  estReadMinutes: number;
  editingId: string | null;
  publicHref: string;
  isDark: boolean;
}

export const BlogEditorPreviewPanel: React.FC<BlogEditorPreviewPanelProps> = ({
  title,
  category,
  author,
  authorRole,
  image,
  content,
  estReadMinutes,
  editingId,
  publicHref,
  isDark,
}) => {
  const labelColor = isDark ? 'text-[#F4EE8E]' : 'text-amber-950';
  const mutedColor = isDark ? 'text-amber-200/80' : 'text-amber-900/80';

  return (
    <motion.div
      initial={{ opacity: 0.96 }}
      animate={{ opacity: 1 }}
      className={`min-w-0 rounded-3xl border p-5 sm:p-6 space-y-5 shadow-xl ${
        isDark
          ? 'bg-[#140A01]/95 border-amber-400/35 text-white'
          : 'bg-[#FFFBF5] border-amber-900/25 text-amber-950'
      }`}
      id="blog-editor-live-preview"
    >
      <div
        className={`flex flex-wrap items-center justify-between gap-2 pb-3 border-b ${
          isDark ? 'border-amber-400/20' : 'border-amber-900/15'
        }`}
      >
        <span
          className={`px-3 py-1 rounded-full border text-sm font-bold whitespace-nowrap ${
            isDark
              ? 'bg-[#1A0F02] border-amber-400/40 text-[#F4EE8E]'
              : 'bg-[#FAF6EC] border-amber-900/25 text-amber-950'
          }`}
        >
          Предпросмотр публикации
        </span>
        {editingId && (
          <a
            href={publicHref}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 text-sm font-bold hover:underline whitespace-nowrap ${
              isDark ? 'text-[#E7C768]' : 'text-amber-800'
            }`}
          >
            <span>Открыть на сайте</span>
            <ExternalLink size={14} />
          </a>
        )}
      </div>

      <div className="space-y-3">
        <span
          className={`inline-block px-3 py-1 rounded-full border text-sm font-bold ${
            isDark
              ? 'bg-[#1A0F02] border-amber-400/30 text-[#F4EE8E]'
              : 'bg-[#FAF6EC] border-amber-900/20 text-amber-900'
          }`}
        >
          {category}
        </span>
        <h2 className={`text-xl sm:text-2xl font-extrabold leading-tight font-sans ${labelColor}`}>
          {title || 'Заголовок публикации не указан'}
        </h2>

        <div
          className={`flex flex-wrap items-center gap-y-2 gap-x-5 text-sm pb-4 border-b ${
            isDark ? 'text-amber-100/85 border-amber-400/20' : 'text-amber-900/85 border-amber-900/15'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F4EE8E] to-[#D99E41] text-[#140A01] flex items-center justify-center font-bold text-sm shrink-0">
              {author ? author[0] : 'А'}
            </div>
            <div>
              <p className={`font-bold text-sm ${isDark ? 'text-white' : 'text-amber-950'}`}>{author}</p>
              <p className={`text-sm ${mutedColor}`}>{authorRole}</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5">
            <Calendar size={14} />
            <span>{estReadMinutes} мин чтения</span>
          </span>
        </div>
      </div>

      {image && (
        <CopyableBlogImage
          src={image}
          alt={title || 'Обложка статьи'}
          isLight={!isDark}
          variant="cover"
          containerClassName={`copyable-blog-media relative rounded-2xl overflow-hidden border shadow-lg max-h-[300px] ${
            isDark ? 'border-[#E7C768]/40 bg-[#1A0F02]' : 'border-amber-900/25 bg-[#FAF6EC]'
          }`}
          imgClassName="copyable-blog-img w-full h-full max-h-[300px] object-cover"
        />
      )}

      <div
        className={`p-4 sm:p-5 rounded-2xl border max-h-[640px] overflow-y-auto ${
          isDark ? 'bg-[#1A0F02]/70 border-[#E7C768]/30' : 'bg-[#FAF6EC] border-amber-900/20'
        }`}
      >
        <MarkdownRenderer
          content={content}
          theme={isDark ? 'dark' : 'light'}
          excludeImages={image ? [image] : []}
        />
      </div>
    </motion.div>
  );
};
