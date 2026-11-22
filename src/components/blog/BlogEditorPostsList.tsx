import React from 'react';
import {
  Plus, Sparkles, Search, RefreshCw, ExternalLink, Trash2, Calendar, Clock, FileText
} from 'lucide-react';
import { BlogPost } from '../../types';

interface BlogEditorPostsListProps {
  posts: BlogPost[];
  selectedPostId: string | null;
  isCreatingNew: boolean;
  loading: boolean;
  isDark: boolean;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  onSelectPost: (post: BlogPost) => void;
  onCreateNew: () => void;
  onOpenAiModal: () => void;
  onRequestDelete: (post: BlogPost) => void;
  onRefresh: () => void;
}

export const BlogEditorPostsList: React.FC<BlogEditorPostsListProps> = ({
  posts,
  selectedPostId,
  isCreatingNew,
  loading,
  isDark,
  searchQuery,
  onSearchChange,
  onSelectPost,
  onCreateNew,
  onOpenAiModal,
  onRequestDelete,
  onRefresh,
}) => {
  const q = searchQuery.trim().toLowerCase();
  const filteredPosts = posts.filter((post) => {
    if (!q) return true;
    return (
      (post.title || '').toLowerCase().includes(q) ||
      (post.category || '').toLowerCase().includes(q) ||
      (post.slug || '').toLowerCase().includes(q)
    );
  });

  const panelClass = isDark
    ? 'bg-[#140A01]/90 border-amber-400/35 text-white shadow-[0_0_25px_rgba(244,238,142,0.1)]'
    : 'bg-[#FFFBF5] border-amber-900/25 text-amber-950 shadow-sm';

  const inputClass = isDark
    ? 'bg-[#1A0F02] border-amber-400/30 text-white placeholder-amber-200/45 focus:border-[#F4EE8E]'
    : 'bg-[#FAF6EC] border-amber-900/25 text-amber-950 placeholder-amber-900/45 focus:border-amber-800';

  return (
    <aside
      className={`rounded-3xl border p-4 sm:p-5 flex flex-col gap-4 ${panelClass}`}
      id="blog-editor-posts-sidebar"
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileText size={18} className={isDark ? 'text-[#F4EE8E] shrink-0' : 'text-amber-800 shrink-0'} />
          <h2 className={`text-base font-extrabold truncate ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
            Статьи блога ({posts.length})
          </h2>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          title="Обновить список статей"
          className={`p-2 rounded-xl border transition-colors cursor-pointer shrink-0 ${
            isDark
              ? 'bg-[#1A0F02] border-amber-400/30 text-amber-200 hover:border-[#F4EE8E] hover:text-[#F4EE8E]'
              : 'bg-[#FAF6EC] border-amber-900/25 text-amber-900 hover:border-amber-800'
          }`}
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Primary Creation Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onCreateNew}
          id="btn-new-blog-post"
          className={`px-3.5 py-2.5 rounded-xl text-sm font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            isCreatingNew
              ? 'bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-[#140A01] shadow-md'
              : isDark
                ? 'bg-[#1A0F02] border border-[#E7C768]/50 text-[#F4EE8E] hover:bg-amber-400/15'
                : 'bg-gradient-to-r from-[#E7C768] to-[#D4AF37] text-amber-950 hover:brightness-105'
          }`}
        >
          <Plus size={16} />
          <span>Новая статья</span>
        </button>

        <button
          type="button"
          onClick={onOpenAiModal}
          id="btn-open-ai-generator"
          className={`px-3.5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
            isDark
              ? 'bg-[#1A0F02] border-amber-400/40 text-[#F4EE8E] hover:border-[#F4EE8E] hover:bg-amber-400/10'
              : 'bg-[#FAF6EC] border-amber-900/30 text-amber-950 hover:border-amber-800 hover:bg-amber-100/70'
          }`}
        >
          <Sparkles size={15} className={isDark ? 'text-[#F4EE8E]' : 'text-amber-700'} />
          <span>ИИ-генерация</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={16}
          className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
            isDark ? 'text-amber-200/60' : 'text-amber-900/55'
          }`}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Поиск по заголовку, теме..."
          className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border focus:outline-none transition-colors ${inputClass}`}
          id="blog-editor-search-input"
        />
      </div>

      {/* Posts Scrollable List */}
      <div className="space-y-2.5 max-h-[420px] lg:max-h-[720px] overflow-y-auto pr-1" id="blog-editor-posts-list">
        {loading && posts.length === 0 ? (
          <div className="space-y-2.5">
            {[1, 2, 3, 4].map((idx) => (
              <div
                key={idx}
                className={`h-20 rounded-2xl border animate-pulse ${
                  isDark ? 'bg-[#1A0F02]/70 border-amber-400/20' : 'bg-amber-50 border-amber-900/15'
                }`}
              />
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <div
            className={`p-5 rounded-2xl border text-center text-sm ${
              isDark ? 'bg-[#1A0F02]/60 border-amber-400/20 text-amber-200/75' : 'bg-[#FAF6EC] border-amber-900/20 text-amber-900/75'
            }`}
          >
            {q ? 'По вашему запросу статьи не найдены.' : 'Список публикаций пуст. Нажмите «Новая статья».'}
          </div>
        ) : (
          filteredPosts.map((post) => {
            const isSelected = !isCreatingNew && selectedPostId === post.id;
            const postHref = `/blog/${post.slug || post.id}`;
            return (
              <div
                key={post.id}
                onClick={() => onSelectPost(post)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectPost(post);
                  }
                }}
                id={`blog-editor-list-item-${post.id}`}
                className={`group rounded-2xl border p-3 transition-all cursor-pointer ${
                  isSelected
                    ? isDark
                      ? 'bg-amber-400/15 border-[#F4EE8E] shadow-[0_0_20px_rgba(244,238,142,0.18)]'
                      : 'bg-amber-100/80 border-amber-800 shadow-sm'
                    : isDark
                      ? 'bg-[#1A0F02]/70 border-amber-400/25 hover:border-[#E7C768]/70 hover:bg-[#1A0F02]'
                      : 'bg-[#FAF6EC] border-amber-900/20 hover:border-amber-800/60 hover:bg-amber-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  {post.image ? (
                    <img
                      src={post.image}
                      alt={post.title}
                      className={`w-12 h-12 rounded-xl object-cover shrink-0 border ${
                        isDark ? 'border-amber-400/30' : 'border-amber-900/20'
                      }`}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div
                      className={`w-12 h-12 rounded-xl shrink-0 flex items-center justify-center border ${
                        isDark ? 'bg-[#140A01] border-amber-400/30 text-[#E7C768]' : 'bg-amber-100 border-amber-900/20 text-amber-900'
                      }`}
                    >
                      <FileText size={18} />
                    </div>
                  )}

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3
                        className={`text-sm font-bold leading-snug line-clamp-2 ${
                          isSelected
                            ? isDark
                              ? 'text-[#F4EE8E]'
                              : 'text-amber-950'
                            : isDark
                              ? 'text-white group-hover:text-[#F4EE8E]'
                              : 'text-amber-950'
                        }`}
                      >
                        {post.title}
                      </h3>
                    </div>

                    <div
                      className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm ${
                        isDark ? 'text-amber-200/75' : 'text-amber-900/75'
                      }`}
                    >
                      <span
                        className={`px-2 py-0.5 rounded-lg border text-sm font-semibold ${
                          isDark
                            ? 'bg-[#140A01]/80 border-amber-400/25 text-[#E7C768]'
                            : 'bg-[#FFFBF5] border-amber-900/20 text-amber-900'
                        }`}
                      >
                        {post.category || 'Блог'}
                      </span>
                      {post.date && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={13} />
                          <span>{post.date}</span>
                        </span>
                      )}
                      {post.readTime && (
                        <span className="inline-flex items-center gap-1">
                          <Clock size={13} />
                          <span>{post.readTime}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action strip */}
                <div
                  className={`mt-2.5 pt-2 border-t flex items-center justify-between gap-2 ${
                    isDark ? 'border-amber-400/15' : 'border-amber-900/15'
                  }`}
                >
                  <span
                    className={`text-sm font-semibold ${
                      isSelected
                        ? isDark
                          ? 'text-[#F4EE8E]'
                          : 'text-amber-900'
                        : isDark
                          ? 'text-amber-200/70'
                          : 'text-amber-900/70'
                    }`}
                  >
                    {isSelected ? 'Выбрано в редакторе' : 'Нажмите для редактирования'}
                  </span>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <a
                      href={postHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Открыть статью на сайте"
                      className={`p-1.5 rounded-lg border transition-colors ${
                        isDark
                          ? 'bg-[#140A01]/80 border-amber-400/25 text-amber-200 hover:border-[#F4EE8E] hover:text-[#F4EE8E]'
                          : 'bg-[#FFFBF5] border-amber-900/20 text-amber-900 hover:border-amber-800'
                      }`}
                    >
                      <ExternalLink size={14} />
                    </a>
                    <button
                      type="button"
                      onClick={() => onRequestDelete(post)}
                      title="Удалить статью"
                      aria-label={`Удалить ${post.title}`}
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                        isDark
                          ? 'bg-[#140A01]/80 border-amber-400/25 text-red-300 hover:border-red-400 hover:bg-red-500/15'
                          : 'bg-[#FFFBF5] border-amber-900/20 text-red-700 hover:border-red-600 hover:bg-red-50'
                      }`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
