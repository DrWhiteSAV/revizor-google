import React, { useState, useEffect, useMemo } from 'react';
import { AcademyPost, ACADEMY_CATEGORIES, ACADEMY_ROLES } from '../components/academy/types';
import { AcademyCard } from '../components/academy/AcademyCard';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { Search, GraduationCap, ArrowLeft, X, BookOpen, Sparkles, Filter, ShieldCheck } from 'lucide-react';
import { usePageSeo } from '../utils/seo/usePageSeo';

interface AcademyPageProps {
  onNavigate?: (path: string) => void;
  activeSlug?: string;
  theme?: 'dark' | 'light';
}

export default function AcademyPage({ onNavigate, activeSlug, theme = 'dark' }: AcademyPageProps) {
  const isDark = theme === 'dark';
  const [posts, setPosts] = useState<AcademyPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('Все');
  const [activeReadingPost, setActiveReadingPost] = useState<AcademyPost | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetch('/api/academy/posts')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && data.posts) {
          setPosts(data.posts);
        }
      })
      .catch((err) => {
        console.error('Error fetching academy posts:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!activeSlug) {
      setActiveReadingPost(null);
      return;
    }
    if (posts.length > 0) {
      const matched = posts.find(
        (p) => p.slug === activeSlug || p.id === activeSlug
      );
      if (matched) {
        setActiveReadingPost(matched);
      }
    }
  }, [activeSlug, posts]);

  const openPost = (post: AcademyPost) => {
    setActiveReadingPost(post);
    const slug = post.slug || post.id;
    if (onNavigate) {
      onNavigate(`/academy/${slug}`);
    } else if (typeof window !== 'undefined') {
      window.history.pushState({}, '', `/academy/${slug}`);
    }
  };

  const closePost = () => {
    setActiveReadingPost(null);
    if (onNavigate) {
      onNavigate('/academy');
    } else if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/academy');
    }
  };

  const seoConfig = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://ii-rr.ru';
    if (activeReadingPost) {
      const slug = activeReadingPost.slug || activeReadingPost.id;
      const postPath = `/academy/${slug}`;
      const postUrl = `${origin}${postPath}`;
      const desc = (activeReadingPost.summary || activeReadingPost.title).slice(0, 160);
      const image = activeReadingPost.cover_image || '/file/21/iirrsocial.jpg';
      const absImage = image.startsWith('http') ? image : `${origin}${image.startsWith('/') ? '' : '/'}${image}`;

      return {
        title: `${activeReadingPost.title} | Академия ИИ Рапорт`,
        description: desc,
        keywords: `${activeReadingPost.category}, Академия ИИ Рапорт, ИИ Ревизор, инструкция, регламент`,
        path: postPath,
        ogType: 'article' as const,
        image,
        imageAlt: activeReadingPost.title,
        jsonLd: {
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'TechArticle',
              headline: activeReadingPost.title,
              description: desc,
              image: [absImage],
              url: postUrl,
              mainEntityOfPage: { '@type': 'WebPage', '@id': postUrl },
              articleSection: activeReadingPost.category,
              author: { '@type': 'Organization', name: 'ООО РентРоп — ИИ Ревизор & ИИ Рапорт' },
              publisher: {
                '@type': 'Organization',
                name: 'ООО РентРоп — ИИ Ревизор & ИИ Рапорт',
                logo: { '@type': 'ImageObject', url: `${origin}/favicon-192.png` }
              },
              inLanguage: 'ru-RU'
            },
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Главная', item: `${origin}/` },
                { '@type': 'ListItem', position: 2, name: 'Академия', item: `${origin}/academy` },
                { '@type': 'ListItem', position: 3, name: activeReadingPost.title, item: postUrl }
              ]
            }
          ]
        }
      };
    }

    const listTitle = 'Академия Рапорт — База знаний и инструкции | ИИ Ревизор';
    const listDesc =
      'Пошаговые руководства, регламенты и инструкции по работе с ИИ Ревизором, ИИ Рапортом, чек-листами и сменами для директоров, руководителей и сотрудников.';
    return {
      title: listTitle,
      description: listDesc,
      keywords: 'Академия ИИ Рапорт, инструкции ИИ Ревизор, база знаний, регламенты, обучение персонала',
      path: '/academy',
      ogType: 'website' as const,
      image: '/file/21/iirrsocial.jpg',
      imageWidth: 1280,
      imageHeight: 756,
      imageAlt: 'Академия ИИ Рапорт и ИИ Ревизор',
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'CollectionPage',
            name: listTitle,
            description: listDesc,
            url: `${origin}/academy`,
            inLanguage: 'ru-RU'
          },
          {
            '@type': 'ItemList',
            itemListElement: posts.slice(0, 20).map((p, idx) => ({
              '@type': 'ListItem',
              position: idx + 1,
              name: p.title,
              url: `${origin}/academy/${p.slug || p.id}`
            }))
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Главная', item: `${origin}/` },
              { '@type': 'ListItem', position: 2, name: 'Академия', item: `${origin}/academy` }
            ]
          }
        ]
      }
    };
  }, [activeReadingPost, posts]);

  usePageSeo(seoConfig);

  const filteredPosts = posts.filter((post) => {
    const postRole = post.target_role || 'all';
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

    const matchesCategory =
      selectedCategory === 'Все' || post.category === selectedCategory;
    const matchesQuery =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content_markdown.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesCategory && matchesQuery;
  });

  return (
    <div
      className={`w-full min-h-screen px-4 sm:px-6 md:px-8 py-6 transition-colors duration-200 ${
        isDark
          ? 'bg-[#1A0F02] text-stone-100 selection:bg-amber-400/30'
          : 'bg-[#FFFBF5] text-amber-950 selection:bg-amber-300'
      }`}
    >
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Navigation & Header Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={() => {
              if (onNavigate) onNavigate('/cabinet');
              else window.location.href = '/cabinet';
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-sm font-semibold transition-all cursor-pointer ${
              isDark
                ? 'border-amber-400/40 text-[#F4EE8E] hover:bg-amber-400/10 hover:border-[#E7C768]'
                : 'border-amber-800/30 text-amber-950 hover:bg-amber-100/60'
            }`}
          >
            <ArrowLeft size={18} />
            <span>Вернуться в кабинет</span>
          </button>

          <div className="flex items-center gap-2">
            <span
              className={`text-sm px-3 py-1 rounded-full border ${
                isDark
                  ? 'border-amber-400/30 text-[#E7C768] bg-amber-400/5'
                  : 'border-amber-800/30 text-amber-900 bg-amber-100/50 font-semibold'
              }`}
            >
              База знаний и регламенты
            </span>
          </div>
        </div>

        {/* Hero Section */}
        <div
          className={`relative rounded-3xl border p-6 sm:p-8 md:p-10 overflow-hidden shadow-2xl ${
            isDark
              ? 'bg-transparent border-amber-400/40 shadow-[0_0_35px_rgba(244,238,142,0.1)]'
              : 'bg-transparent border-amber-900/30 shadow-lg'
          }`}
        >
          <div className="max-w-3xl space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                  isDark
                    ? 'border-amber-400/50 text-[#F4EE8E] bg-amber-400/10'
                    : 'border-amber-800/40 text-amber-950 bg-amber-100/80'
                }`}
              >
                <GraduationCap size={28} />
              </div>
              <h1
                className={`text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight ${
                  isDark ? 'text-white' : 'text-amber-950'
                }`}
              >
                Академия Рапорт
              </h1>
            </div>

            <p
              className={`text-base sm:text-lg leading-relaxed ${
                isDark ? 'text-stone-300' : 'text-stone-700'
              }`}
            >
              Интерактивные обучающие статьи, пошаговые инструкции и регламенты
              для эффективного управления проектами, подачей рапортов и
              контролем смен.
            </p>

            {/* Search Input Bar */}
            <div className="pt-2">
              <div className="relative max-w-xl">
                <Search
                  size={18}
                  className={`absolute left-4 top-3.5 ${
                    isDark ? 'text-stone-400' : 'text-stone-500'
                  }`}
                />
                <input
                  type="text"
                  placeholder="Поиск по статьям, функциям или регламентам..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-11 pr-4 py-3 rounded-2xl border text-sm sm:text-base focus:outline-none transition-all shadow-inner ${
                    isDark
                      ? 'bg-black/20 border-amber-400/40 text-white placeholder-stone-400 focus:border-[#E7C768]'
                      : 'bg-white/80 border-amber-800/30 text-amber-950 placeholder-stone-500 focus:border-amber-700'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Roles Filter Bar (Audience segmentation) */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold opacity-80">
            <ShieldCheck size={15} />
            <span>Для кого инструкция (роль)</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {ACADEMY_ROLES.map((r) => {
              const isSelected = selectedRole === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedRole(r.id)}
                  className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? isDark
                        ? 'border-amber-400/70 bg-gradient-to-r from-amber-400/25 to-[#E7C768]/20 text-[#F4EE8E] shadow-[0_0_15px_rgba(244,238,142,0.2)]'
                        : 'border-amber-900/60 bg-amber-200 text-amber-950 font-black shadow-sm'
                      : isDark
                      ? 'border-amber-400/25 bg-transparent text-stone-300 hover:border-amber-400/50 hover:text-white'
                      : 'border-amber-800/20 bg-transparent text-stone-700 hover:border-amber-800/40 hover:text-stone-950'
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Categories Bar (Mobile-friendly bubble wrap, no horizontal scroll) */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold opacity-80">
            <Filter size={15} />
            <span>Фильтр по категориям</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {ACADEMY_CATEGORIES.map((category) => {
              const isSelected = selectedCategory === category;
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3.5 py-1.5 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                    isSelected
                      ? isDark
                        ? 'border-amber-400/60 bg-amber-400/20 text-[#F4EE8E] shadow-[0_0_15px_rgba(244,238,142,0.15)]'
                        : 'border-amber-800/60 bg-amber-200 text-amber-950 font-bold'
                      : isDark
                      ? 'border-amber-400/20 bg-transparent text-stone-300 hover:border-amber-400/40 hover:text-white'
                      : 'border-amber-800/20 bg-transparent text-stone-700 hover:border-amber-800/40 hover:text-stone-950'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>

        {/* Posts Grid */}
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin mb-3">
              <Sparkles size={28} className="text-[#E7C768]" />
            </div>
            <p className="text-sm text-stone-400">Загрузка статей Академии...</p>
          </div>
        ) : filteredPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post) => (
              <AcademyCard
                key={post.id}
                post={post}
                onRead={openPost}
                theme={theme}
              />
            ))}
          </div>
        ) : (
          <div
            className={`text-center py-16 rounded-3xl border ${
              isDark ? 'border-amber-400/20 bg-transparent' : 'border-amber-800/20 bg-transparent'
            }`}
          >
            <BookOpen size={36} className="mx-auto text-stone-400 mb-3" />
            <h3 className="text-lg font-bold mb-1">Ничего не найдено</h3>
            <p className="text-sm text-stone-400">
              Попробуйте изменить поисковый запрос или выбрать другую категорию
            </p>
          </div>
        )}
      </div>

      {/* Reading Article Modal */}
      {activeReadingPost && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
          onClick={closePost}
        >
          <div
            className={`relative w-full max-w-4xl h-[92vh] max-h-[880px] rounded-3xl border flex flex-col overflow-hidden shadow-2xl backdrop-blur-xl ${
              isDark
                ? 'bg-[#1A0F02]/95 border-amber-400/40 shadow-[0_0_40px_rgba(244,238,142,0.15)] text-stone-100'
                : 'bg-[#FFFBF5]/95 border-amber-900/30 shadow-2xl text-amber-950'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-amber-400/20 bg-amber-400/5">
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`text-sm px-2.5 py-0.5 rounded-xl font-medium border shrink-0 ${
                    isDark
                      ? 'border-amber-400/40 text-[#F4EE8E] bg-amber-400/10'
                      : 'border-amber-800/30 text-amber-950 bg-amber-100/70 font-semibold'
                  }`}
                >
                  {activeReadingPost.category}
                </span>
                <span className="text-sm font-semibold truncate max-w-xs sm:max-w-md">
                  {activeReadingPost.title}
                </span>
              </div>

              <button
                onClick={closePost}
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

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-8 md:p-10 space-y-6">
              <h1
                className={`text-2xl sm:text-3xl font-extrabold leading-tight ${
                  isDark ? 'text-white' : 'text-amber-950'
                }`}
              >
                {activeReadingPost.title}
              </h1>

              {activeReadingPost.summary && (
                <div
                  className={`p-4 rounded-2xl border ${
                    isDark
                      ? 'border-amber-400/30 bg-amber-400/5 text-stone-200'
                      : 'border-amber-800/30 bg-amber-100/40 text-stone-800'
                  }`}
                >
                  <p className="text-sm sm:text-base leading-relaxed italic">
                    {activeReadingPost.summary}
                  </p>
                </div>
              )}

              <div className="prose-content">
                <MarkdownRenderer
                  content={activeReadingPost.content_markdown}
                  theme={isDark ? 'dark' : 'light'}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
