import React, { useState, useEffect } from 'react';
import { AcademyPost } from './types';
import MarkdownRenderer from '../MarkdownRenderer';
import { X, BookOpen, ExternalLink, Search, ChevronRight, HelpCircle, ArrowLeft } from 'lucide-react';

interface AcademyHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRoute?: string;
  userRole?: string;
  theme?: 'dark' | 'light';
  onNavigateToAcademy?: () => void;
}

export const AcademyHelpModal: React.FC<AcademyHelpModalProps> = ({
  isOpen,
  onClose,
  initialRoute = 'ship',
  userRole,
  theme = 'dark',
  onNavigateToAcademy
}) => {
  const isDark = theme === 'dark';
  const [posts, setPosts] = useState<AcademyPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<AcademyPost | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>(
    userRole === 'super_admin' ? 'director' :
    userRole === 'head_of_department' ? 'manager' :
    userRole === 'employee' ? 'employee' : 'all'
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    if (userRole) {
      if (userRole === 'super_admin') setSelectedRole('director');
      else if (userRole === 'head_of_department') setSelectedRole('manager');
      else if (userRole === 'employee') setSelectedRole('employee');
    }
  }, [userRole]);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);

    fetch('/api/academy/posts')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && data.posts) {
          setPosts(data.posts);

          // Find post matching initialRoute
          const normRoute = (initialRoute || '').toLowerCase();
          const matched = data.posts.find((p: AcademyPost) => {
            const t = (p.target_route || '').toLowerCase();
            return t === normRoute || normRoute.includes(t) || t.includes(normRoute);
          });

          setSelectedPost(matched || data.posts[0] || null);
        }
      })
      .catch((err) => {
        console.error('Failed to load academy posts for help modal:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, initialRoute]);

  if (!isOpen) return null;

  const filteredPosts = posts.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.summary.toLowerCase().includes(searchQuery.toLowerCase());

    const postRole = p.target_role || 'all';
    let matchesRole = true;

    if (selectedRole === 'director') {
      matchesRole = true;
    } else if (selectedRole === 'manager') {
      matchesRole = postRole === 'manager' || postRole === 'employee' || postRole === 'all';
    } else if (selectedRole === 'employee') {
      matchesRole = postRole === 'employee' || postRole === 'all';
    } else {
      matchesRole = true;
    }

    return matchesSearch && matchesRole;
  });

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-5xl h-[92vh] max-h-[850px] rounded-3xl border flex flex-col overflow-hidden shadow-2xl backdrop-blur-xl ${
          isDark
            ? 'bg-[#1A0F02]/95 border-amber-400/40 shadow-[0_0_40px_rgba(244,238,142,0.15)] text-stone-100'
            : 'bg-[#FFFBF5]/95 border-amber-900/30 shadow-2xl text-amber-950'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-amber-400/20 bg-amber-400/5">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center border ${
                isDark
                  ? 'border-amber-400/40 text-[#F4EE8E] bg-amber-400/10'
                  : 'border-amber-800/30 text-amber-950 bg-amber-100/60'
              }`}
            >
              <HelpCircle size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-bold">Академия Рапорт</span>
                <span
                  className={`hidden sm:inline-block text-xs px-2 py-0.5 rounded-full border ${
                    isDark
                      ? 'border-amber-400/30 text-[#E7C768]'
                      : 'border-amber-800/30 text-amber-900 font-medium'
                  }`}
                >
                  Инструкции и регламенты
                </span>
              </div>
              <p
                className={`text-xs ${
                  isDark ? 'text-stone-400' : 'text-stone-600'
                }`}
              >
                Обучающий центр для настройки и работы с системой
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToAcademy && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToAcademy();
                }}
                className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-medium transition-all ${
                  isDark
                    ? 'border-amber-400/30 text-[#F4EE8E] hover:bg-amber-400/10'
                    : 'border-amber-800/30 text-amber-950 hover:bg-amber-100/60'
                }`}
              >
                <span>Все материалы</span>
                <ExternalLink size={14} />
              </button>
            )}

            <button
              onClick={onClose}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isDark
                  ? 'border-amber-400/30 text-stone-300 hover:text-white hover:bg-amber-400/10'
                  : 'border-amber-800/30 text-stone-700 hover:text-stone-950 hover:bg-amber-100/60'
              }`}
              title="Закрыть"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Body: Sidebar + Main Post Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          {/* Mobile selector trigger bar */}
          <div className="md:hidden flex items-center justify-between p-3 border-b border-amber-400/20 bg-amber-400/5">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-medium w-full justify-between ${
                isDark
                  ? 'border-amber-400/40 text-[#F4EE8E] bg-amber-400/10'
                  : 'border-amber-800/30 text-amber-950 bg-amber-100/70'
              }`}
            >
              <span className="truncate">
                {selectedPost ? selectedPost.title : 'Выбрать инструкцию'}
              </span>
              <ChevronRight
                size={16}
                className={`transition-transform duration-200 ${
                  isMobileMenuOpen ? 'rotate-90' : ''
                }`}
              />
            </button>
          </div>

          {/* Left Navigation Sidebar */}
          <div
            className={`w-full md:w-80 flex-shrink-0 border-r border-amber-400/20 flex flex-col overflow-hidden transition-all duration-300 ${
              isMobileMenuOpen
                ? 'absolute inset-0 z-30 bg-[#1A0F02] md:static'
                : 'hidden md:flex'
            }`}
          >
            {/* Search within guides */}
            <div className="p-3 border-b border-amber-400/15 space-y-2">
              <div className="relative">
                <Search
                  size={16}
                  className={`absolute left-3 top-2.5 ${
                    isDark ? 'text-stone-400' : 'text-stone-500'
                  }`}
                />
                <input
                  type="text"
                  placeholder="Поиск по инструкциям..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-9 pr-3 py-1.5 rounded-xl border text-sm focus:outline-none transition-all ${
                    isDark
                      ? 'bg-transparent border-amber-400/30 text-white placeholder-stone-400 focus:border-[#E7C768]'
                      : 'bg-transparent border-amber-800/30 text-amber-950 placeholder-stone-500 focus:border-amber-700'
                  }`}
                />
              </div>

              {/* Role filter buttons */}
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                {[
                  { id: 'all', label: 'Все роли' },
                  { id: 'director', label: 'Директору' },
                  { id: 'manager', label: 'Руководителю' },
                  { id: 'employee', label: 'Сотруднику' }
                ].map((r) => {
                  const active = selectedRole === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedRole(r.id)}
                      className={`px-2 py-1 rounded-lg text-xs font-medium border transition-all text-center truncate ${
                        active
                          ? isDark
                            ? 'border-amber-400/70 bg-amber-400/20 text-[#F4EE8E]'
                            : 'border-amber-850 bg-amber-200/80 text-amber-950 font-bold'
                          : isDark
                          ? 'border-amber-400/15 text-stone-400 hover:text-stone-200 hover:border-amber-400/30'
                          : 'border-amber-900/15 text-amber-900/70 hover:text-amber-950 hover:border-amber-900/30'
                      }`}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* List of articles */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredPosts.map((post) => {
                const isSelected = selectedPost?.id === post.id;
                return (
                  <button
                    key={post.id}
                    onClick={() => {
                      setSelectedPost(post);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full text-left p-3 rounded-2xl border transition-all flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? isDark
                          ? 'border-amber-400/60 bg-amber-400/15 text-[#F4EE8E] shadow-[0_0_15px_rgba(244,238,142,0.1)]'
                          : 'border-amber-800/50 bg-amber-200/50 text-amber-950 font-semibold'
                        : isDark
                        ? 'border-transparent hover:border-amber-400/20 hover:bg-amber-400/5 text-stone-200'
                        : 'border-transparent hover:border-amber-800/20 hover:bg-amber-100/40 text-stone-800'
                    }`}
                  >
                    <BookOpen
                      size={18}
                      className={`flex-shrink-0 mt-0.5 ${
                        isSelected
                          ? isDark
                            ? 'text-[#F4EE8E]'
                            : 'text-amber-900'
                          : isDark
                          ? 'text-stone-400'
                          : 'text-stone-500'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium line-clamp-1">
                        {post.title}
                      </div>
                      <div
                        className={`text-xs mt-0.5 ${
                          isDark ? 'text-stone-400' : 'text-stone-600'
                        }`}
                      >
                        {post.category}
                      </div>
                    </div>
                  </button>
                );
              })}

              {filteredPosts.length === 0 && (
                <div className="text-center py-8 text-sm text-stone-400">
                  Инструкции не найдены
                </div>
              )}
            </div>

            {/* Mobile close button for sidebar */}
            {isMobileMenuOpen && (
              <div className="p-3 border-t border-amber-400/20 md:hidden">
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full py-2 rounded-xl border border-amber-400/40 text-sm font-medium flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={16} />
                  <span>Вернуться к просмотру</span>
                </button>
              </div>
            )}
          </div>

          {/* Right Main Post Reading View */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-sm text-stone-400 animate-pulse">
                  Загрузка инструкции...
                </div>
              </div>
            ) : selectedPost ? (
              <div className="max-w-3xl mx-auto space-y-6">
                {/* Meta Badge Bar */}
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-xs px-3 py-1 rounded-xl font-medium border ${
                      isDark
                        ? 'border-amber-400/40 text-[#F4EE8E] bg-amber-400/10'
                        : 'border-amber-800/30 text-amber-950 bg-amber-100/70 font-semibold'
                    }`}
                  >
                    {selectedPost.category}
                  </span>
                  <span
                    className={`text-xs px-3 py-1 rounded-xl border ${
                      isDark
                        ? 'border-amber-400/20 text-stone-300'
                        : 'border-amber-800/20 text-stone-700'
                    }`}
                  >
                    Привязка: {selectedPost.target_route}
                  </span>
                </div>

                {/* Title */}
                <h1
                  className={`text-xl sm:text-2xl md:text-3xl font-extrabold leading-tight ${
                    isDark ? 'text-white' : 'text-amber-950'
                  }`}
                >
                  {selectedPost.title}
                </h1>

                {/* Summary Box */}
                {selectedPost.summary && (
                  <div
                    className={`p-4 rounded-2xl border ${
                      isDark
                        ? 'border-amber-400/30 bg-amber-400/5 text-stone-200'
                        : 'border-amber-800/30 bg-amber-100/40 text-stone-800'
                    }`}
                  >
                    <p className="text-sm leading-relaxed italic">
                      {selectedPost.summary}
                    </p>
                  </div>
                )}

                {/* Markdown Renderer Content */}
                <div className="prose-content">
                  <MarkdownRenderer
                    content={selectedPost.content_markdown}
                    theme={isDark ? 'dark' : 'light'}
                  />
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-stone-400 text-sm">
                Выберите инструкцию слева для чтения
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
