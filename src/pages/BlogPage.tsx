import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, Search, Calendar, Clock, Share2, Sparkles, 
  ChevronRight, BookOpen, FileText, TrendingUp 
} from 'lucide-react';
import { BlogPost, UserProfile } from '../types';
import { DEFAULT_BLOG_POSTS } from '../data/defaultBlogPosts';
import MarkdownRenderer from '../components/MarkdownRenderer';
import CommentsSection from '../components/CommentsSection';
import InteractiveGoldenWaves from '../components/InteractiveGoldenWaves';
import { MiniAudioField } from '../components/voice/MiniAudioField';
import { usePageSeo } from '../utils/seo/usePageSeo';

interface BlogPageProps {
  onNavigate: (path: string) => void;
  activePostId?: string;
  currentUser: UserProfile | null;
}

export default function BlogPage({ onNavigate, activePostId, currentUser }: BlogPageProps) {
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('q') || '';
    }
    return '';
  });
  const [selectedCategory, setSelectedCategory] = useState('Все');

  const categories = ['Все', ...Array.from(new Set(blogPosts.map(p => p.category).filter(Boolean)))];

  // Load posts from server database on mount and subscribe to real-time BD updates
  const loadPosts = () => {
    fetch('/api/blog/posts')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.posts) && data.posts.length > 0) {
          setBlogPosts(data.posts);
        } else {
          setBlogPosts(DEFAULT_BLOG_POSTS);
        }
      })
      .catch(err => {
        console.error('Failed to fetch blog posts from API, falling back to defaults:', err);
        setBlogPosts(DEFAULT_BLOG_POSTS);
      })
      .finally(() => {
        setIsLoadingPosts(false);
      });
  };

  useEffect(() => {
    loadPosts();
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('ii_rr_db_sync');
        bc.onmessage = (evt: MessageEvent) => {
          if (evt.data?.table === 'blog_posts' || evt.data?.table === 'all') {
            loadPosts();
          }
        };
      }
    } catch {
      // BroadcastChannel unavailable
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadPosts();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (bc) bc.close();
    };
  }, []);

  const activePost = blogPosts.find(p => p.id === activePostId || (p.slug && p.slug === activePostId));

  useEffect(() => {
    if (activePost || typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const trimmed = searchQuery.trim();
    if (trimmed) {
      url.searchParams.set('q', trimmed);
    } else {
      url.searchParams.delete('q');
    }
    const nextUrl = `${url.pathname}${url.search}`;
    if (nextUrl !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState({}, '', nextUrl);
    }
  }, [searchQuery, activePost]);

  const seoConfig = React.useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://ii-rr.ru';
    const toAbs = (img?: string) => {
      if (!img) return `${origin}/file/21/iirrsocial.jpg`;
      if (img.startsWith('http://') || img.startsWith('https://')) {
        return img.includes('unsplash.com') ? `${origin}/file/21/iirrsocial.jpg` : img;
      }
      return `${origin}${img.startsWith('/') ? '' : '/'}${img}`;
    };

    if (activePost) {
      const slugOrId = activePost.slug || activePost.id;
      const postPath = `/blog/${slugOrId}`;
      const postUrl = `${origin}${postPath}`;
      const pageTitle = `${(activePost as any).seoTitle || activePost.title} | Блог ИИ Ревизор & ИИ Рапорт`;
      const desc = activePost.seoDesc || activePost.summary || activePost.title;
      const keywords = activePost.seoKeywords || activePost.category || 'ИИ Ревизор, ИИ Рапорт';
      const absImage = toAbs(activePost.image);

      return {
        title: pageTitle,
        description: desc,
        keywords,
        path: postPath,
        ogType: 'article' as const,
        image: absImage,
        imageAlt: activePost.title,
        jsonLd: {
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'BlogPosting',
              headline: activePost.title,
              description: desc,
              image: [absImage],
              url: postUrl,
              mainEntityOfPage: { '@type': 'WebPage', '@id': postUrl },
              author: { '@type': 'Person', name: activePost.author || 'Игорь Давыдов' },
              publisher: {
                '@type': 'Organization',
                name: 'ООО РентРоп — ИИ Ревизор & ИИ Рапорт',
                logo: { '@type': 'ImageObject', url: `${origin}/favicon-192.png` }
              },
              keywords,
              inLanguage: 'ru-RU'
            },
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Главная', item: `${origin}/` },
                { '@type': 'ListItem', position: 2, name: 'Блог', item: `${origin}/blog` },
                { '@type': 'ListItem', position: 3, name: activePost.title, item: postUrl }
              ]
            }
          ]
        }
      };
    }

    const listTitle = 'Блог и База знаний | ИИ Ревизор & ИИ Рапорт';
    const listDesc =
      'Экспертные статьи о внедрении ИИ в бизнес: голосовые отчеты сотрудников, контроль чек-листов, аудит смет КС-2/КС-3, Telegram-боты и геймификация.';
    return {
      title: listTitle,
      description: listDesc,
      keywords: 'блог ИИ Ревизор, статьи про ИИ в бизнесе, голосовые отчеты, аудит смет КС-2, Telegram бот отчетов',
      path: '/blog',
      ogType: 'website' as const,
      image: '/file/21/iirrsocial.jpg',
      imageWidth: 1280,
      imageHeight: 756,
      imageAlt: 'Блог ИИ Ревизор & ИИ Рапорт',
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Blog',
            name: listTitle,
            description: listDesc,
            url: `${origin}/blog`,
            inLanguage: 'ru-RU'
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Главная', item: `${origin}/` },
              { '@type': 'ListItem', position: 2, name: 'Блог', item: `${origin}/blog` }
            ]
          }
        ]
      }
    };
  }, [activePost]);

  usePageSeo(seoConfig);

  const filteredPosts = blogPosts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          post.summary.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Все' || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#140A01] text-white pt-2 sm:pt-4 pb-16 px-4 sm:px-6 relative" id="blog-page-container">
      
      {/* Global Interactive Golden Waves Parallax Background */}
      <InteractiveGoldenWaves />

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Render Single Post Detail View */}
        {activePost ? (
          <motion.article 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto space-y-8"
            id={`blog-post-detail-${activePost.id}`}
          >
            {/* Go Back button */}
            <button 
              onClick={() => onNavigate('/blog')}
              className="inline-flex items-center gap-2 text-sm font-bold text-[#F4EE8E] hover:text-white transition-colors cursor-pointer bg-[#1A0F02]/70 backdrop-blur-md px-4 py-2 rounded-xl border border-[#E7C768]/40"
              id="btn-back-to-blogs"
            >
              <ArrowLeft size={16} />
              <span>Вернуться к списку статей</span>
            </button>

            {/* Post Header */}
            <div className="space-y-4">
              <span className="inline-block px-3.5 py-1 rounded-full bg-[#1A0F02]/70 border border-[#E7C768]/40 text-[#F4EE8E] text-sm font-bold">
                {activePost.category}
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-[#F4EE8E] leading-tight font-sans">
                {activePost.title}
              </h1>

              {/* Author & Meta */}
              <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm text-amber-100/90 border-b border-[#E7C768]/25 pb-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#F4EE8E] to-[#D99E41] text-[#140A01] flex items-center justify-center font-bold text-sm">
                    {activePost.author ? activePost.author[0] : '✍️'}
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">{activePost.author}</p>
                    <p className="text-sm text-[#E7C768]">{activePost.authorRole}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar size={15} className="text-[#E7C768]" />
                  <span>{activePost.date}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={15} className="text-[#E7C768]" />
                  <span>{activePost.readTime} чтения</span>
                </div>
              </div>
            </div>

            {/* Post Main image banner */}
            {activePost.image && (
              <div className="rounded-3xl overflow-hidden border border-[#E7C768]/40 shadow-[0_0_30px_rgba(244,238,142,0.2)] max-h-[400px] bg-[#1A0F02]/70">
                <img 
                  src={activePost.image} 
                  alt={activePost.title} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            {/* Content formatted in Markdown with Gold gradients & embeddings */}
            <div className="bg-[#1A0F02]/70 backdrop-blur-md border border-[#E7C768]/40 p-5 sm:p-10 rounded-3xl shadow-[0_0_30px_rgba(244,238,142,0.15)]">
              <MarkdownRenderer
                content={activePost.content}
                excludeImages={activePost.image ? [activePost.image] : []}
              />
            </div>

            {/* Social Share / Promotional CTA Box */}
            <div className="p-6 rounded-2xl bg-[#1A0F02]/70 backdrop-blur-md border border-[#E7C768]/45 flex flex-col md:flex-row justify-between items-start md:items-center gap-5 shadow-[0_0_25px_rgba(244,238,142,0.2)]" id="blog-article-promo-cta">
              <div className="text-left space-y-1.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1A0F02]/70 border border-[#E7C768]/40 text-[#F4EE8E] text-sm font-bold">
                  <Sparkles size={14} />
                  <span>Спецпредложение для бизнеса</span>
                </span>
                <h4 className="text-base sm:text-lg font-extrabold text-[#F4EE8E] font-sans">
                  Запустите ИИ-Ревизор + ИИ-Рапорт на 7 дней бесплатно
                </h4>
                <p className="text-sm text-amber-100/90 leading-normal">
                  Внедрите голосовые отчеты в Telegram, проверку чек-листов с ИИ-оценкой качества и аудит смет КС-2/КС-3. За приглашение партнеров в ИИ-Рекрутер начисляется бонус +1000 RR.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <button 
                  onClick={() => onNavigate('/')}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-[#140A01] text-sm font-extrabold hover:brightness-110 active:scale-95 transition-all cursor-pointer font-sans"
                >
                  Попробовать бесплатно
                </button>
                <a
                  href="https://hr-rr.ru/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-[#1A0F02]/70 border border-[#E7C768]/45 text-[#F4EE8E] text-sm font-bold hover:border-[#F4EE8E] transition-all no-underline"
                >
                  ИИ-Рекрутер (+1000 RR)
                </a>
              </div>
            </div>

            {/* Comments and reactions section */}
            <CommentsSection 
              entityId={`post-${activePost.id}`} 
              entityType="post" 
              entityTitle={activePost.title} 
              currentUser={currentUser} 
            />

          </motion.article>
        ) : (
          /* Render Blog Post Listing View */
          <div className="space-y-5" id="blog-list-view">

            {/* Search & Filter bar layout */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between p-4 rounded-2xl bg-[#1A0F02]/70 backdrop-blur-md border border-[#E7C768]/40 gap-4 shadow-[0_0_25px_rgba(244,238,142,0.15)]" id="blog-search-filters">
              
              {/* Categories filters (wrapped nicely on mobile without horizontal scrolling) */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-[#140A01] font-extrabold'
                        : 'bg-[#1A0F02]/60 text-amber-100 hover:bg-[#E7C768]/20 border border-[#E7C768]/30'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Search text input with voice support */}
              <div className="w-full md:w-80">
                <MiniAudioField 
                  placeholder="Поиск статей (или голосом)..."
                  value={searchQuery}
                  onChange={setSearchQuery}
                  isLightTheme={false}
                  multiline={false}
                  showPlayer={false}
                />
              </div>

            </div>

            {/* Promotional Ecosystem Banner in Blog */}
            <div
              className="rounded-3xl bg-[#1A0F02]/70 backdrop-blur-md border border-[#E7C768]/50 p-5 sm:p-7 shadow-[0_0_30px_rgba(244,238,142,0.22)] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
              id="blog-promo-banner"
            >
              <div className="space-y-2.5 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-[#140A01] text-sm font-extrabold">
                    <Sparkles size={14} />
                    <span>Реклама экосистемы</span>
                  </span>
                  <span className="px-3 py-1 rounded-full bg-[#1A0F02]/70 border border-[#E7C768]/40 text-[#F4EE8E] text-sm font-bold">
                    7 дней бесплатно на старте
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#F4EE8E] leading-snug font-sans">
                  ИИ-Ревизор + ИИ-Рапорт: автопилот контроля задач, смет и голосовых отчетов
                </h2>
                <p className="text-sm text-amber-100/90 leading-relaxed">
                  Подключите команду за 3 минуты: сотрудники надиктовывают рапорты в Telegram или на сайте, ИИ проверяет фото-отчеты и оценивает качество работы от 1 до 5, а система стрик-наград и связка с ИИ-Рекрутером повышают дисциплину без ручного микроменеджмента.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full lg:w-auto shrink-0">
                <button
                  onClick={() => onNavigate('/blog/ii-revisor-i-ii-raport-avtopilot-upravleniya-proektami-i-otchetami')}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-[#140A01] text-sm font-extrabold hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 font-sans whitespace-nowrap"
                  id="btn-promo-read-raport"
                >
                  <FileText size={16} className="shrink-0" />
                  <span>Обзор ИИ-Ревизор + ИИ-Рапорт</span>
                </button>
                <div className="flex flex-col sm:flex-row gap-2.5 w-full">
                  <button
                    onClick={() => onNavigate('/')}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-[#1A0F02]/70 border border-[#E7C768]/45 text-[#F4EE8E] text-sm font-bold hover:border-[#F4EE8E] transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
                    id="btn-promo-try-free"
                  >
                    <TrendingUp size={15} className="shrink-0" />
                    <span>7 дней бесплатно</span>
                  </button>
                  <a
                    href="https://hr-rr.ru/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-[#1A0F02]/70 border border-[#E7C768]/45 text-amber-100 text-sm font-bold hover:border-[#F4EE8E] hover:text-[#F4EE8E] transition-all flex items-center justify-center gap-1.5 no-underline whitespace-nowrap"
                    id="btn-promo-recruiter-link"
                  >
                    <BookOpen size={15} className="shrink-0" />
                    <span>ИИ-Рекрутер</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Grid of posts */}
            {isLoadingPosts ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="blog-posts-loading">
                {[1, 2, 3].map((idx) => (
                  <div key={idx} className="h-80 rounded-3xl bg-[#1A0F02]/70 backdrop-blur-md border border-[#E7C768]/30 animate-pulse" />
                ))}
              </div>
            ) : filteredPosts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="blog-posts-grid">
                {filteredPosts.map((post) => (
                  <motion.a
                    key={post.id}
                    href={`/blog/${post.slug || post.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="flex flex-col rounded-3xl bg-[#1A0F02]/70 backdrop-blur-md border border-[#E7C768]/40 overflow-hidden shadow-[0_0_25px_rgba(244,238,142,0.12)] hover:border-[#F4EE8E] transition-all group cursor-pointer no-underline"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate(`/blog/${post.slug || post.id}`);
                    }}
                    id={`blog-card-${post.id}`}
                  >
                    {/* Image block */}
                    {post.image && (
                      <div className="relative h-48 overflow-hidden bg-[#1A0F02]/70 border-b border-[#E7C768]/25">
                        <img 
                          src={post.image} 
                          alt={post.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                        />
                        <span className="absolute top-3 left-3 px-3 py-1 text-sm font-bold rounded-lg bg-[#1A0F02]/80 border border-[#E7C768]/40 text-[#F4EE8E]">
                          {post.category}
                        </span>
                      </div>
                    )}

                    {/* Meta & Info details */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2.5">
                        <div className="flex flex-wrap items-center gap-2 text-sm text-[#E7C768]">
                          <span className="flex items-center gap-1">
                            <Calendar size={14} /> {post.date}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock size={14} /> {post.readTime}
                          </span>
                        </div>
                        <h3 className="text-base font-extrabold text-white leading-snug group-hover:text-[#F4EE8E] transition-colors font-sans line-clamp-2">
                          {post.title}
                        </h3>
                        <p className="text-sm text-amber-100/85 line-clamp-3 leading-relaxed">
                          {post.summary}
                        </p>
                      </div>

                      {/* Author row & Read link */}
                      <div className="flex items-center justify-between pt-3 border-t border-[#E7C768]/25">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#F4EE8E] to-[#D99E41] text-[#140A01] text-sm font-bold flex items-center justify-center">
                            {post.author ? post.author[0] : '✍️'}
                          </div>
                          <span className="text-sm font-bold text-amber-100">{post.author}</span>
                        </div>

                        <span className="text-sm font-extrabold text-[#F4EE8E] flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                          <span>Читать</span>
                          <ChevronRight size={15} />
                        </span>
                      </div>
                    </div>

                  </motion.a>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-[#1A0F02]/70 backdrop-blur-md border border-[#E7C768]/40 rounded-3xl" id="blog-empty-state">
                <p className="text-sm text-amber-100">По вашему запросу статьи не найдены. Попробуйте изменить фильтр.</p>
                <button 
                  onClick={() => { setSearchQuery(''); setSelectedCategory('Все'); }}
                  className="mt-4 px-4 py-2 bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-[#140A01] text-sm font-bold rounded-xl hover:brightness-110 cursor-pointer"
                >
                  Сбросить фильтры
                </button>
              </div>
            )}

            {/* SEO Section removed */}
          </div>
        )}

      </div>
    </div>
  );
}
