import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, Trash2, Edit3, Save, Eye, X, HelpCircle, 
  Sparkles, Bold, Italic, Heading, Quote, List, Code, Link as LinkIcon, 
  Image as ImageIcon, Video, Folder, Calendar, User, Search
} from 'lucide-react';
import { BlogPost } from '../../types';
import { DEFAULT_BLOG_POSTS } from '../../data/defaultBlogPosts';
import MarkdownRenderer from '../../components/MarkdownRenderer';

export default function CabinetBlogPosts() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // AI Generator modal states
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiKeyPoints, setAiKeyPoints] = useState('');
  const [aiCategory, setAiCategory] = useState('ИИ в бизнесе');
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('ИИ в бизнесе');
  const [author, setAuthor] = useState('Администратор');
  const [authorRole, setAuthorRole] = useState('Редактор базы знаний');
  const [image, setImage] = useState('');
  const [summary, setSummary] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDesc, setSeoDesc] = useState('');
  const [seoKeywords, setSeoKeywords] = useState('');
  const [content, setContent] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingInline, setIsUploadingInline] = useState(false);
  const [showGalleryPicker, setShowGalleryPicker] = useState<'cover' | 'inline' | null>(null);

  const DEFAULT_BLOG_COVER_URL = 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGDQjUQkQMR8fbWVWaWh8CDBXEDshGkg6KlEjKC0sKyAqCkQeBXAyRwQ9SQ1MCTMyDy0dBg8cEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg';

  const presetImages = [
    { url: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGDQjUQkQMR8fbWVWaWh8CDBXEDshGkg6KlEjKC0sKyAqCkQeBXAyRwQ9SQ1MCTMyDy0dBg8cEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg', label: 'Автопилот ИИ Ревизор' },
    { url: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGCgjUQkQIjsMKRMmfzBMLSNlHRs2Fh8LBTgPLT0sKyMQCkQeBXAyRwQ4GiIrNWAjLzMCNA8cEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg', label: 'Чек-листы и зрение' },
    { url: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGDwjUQkQCVkBADg7R2FzdBFXAHsdcSwBIBsIHQssKyAACkQeBXAyRwQ9AyA-HQoeLBRrBh8cEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg', label: 'Голосовые отчеты' },
    { url: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGAIjUQkQEiUrO2EDDw1AMSxZOHkwBzk8KxEKLBssKyAQCkQeBXAyRwQ9EXQdFwc-CDUAWSkcEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg', label: 'Магазин Благ' },
    { url: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGCAjUQkQBQEQaWtURQkGDDFLHQYBPBMCMSwlKQssKyM6CkQeBXAyRwQ_Lj8eMj4eD3IxHR8cEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg', label: 'Строительный аудит КС-2' },
    { url: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGGkjUQkTHSoeIz1XdQhsBABiPwovEh8efwFWMD0sKyMqCkQeBXAyRwQ_Dw8IHRo9DQIcAh8cEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg', label: 'Telegram-бот' },
    { url: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGA4jUQkQGyw_Ozw0QXQMLjZZPhkOKAoBYzgQfT4oKRghAW84TTIuWSMnNSktbWoYUSY_NwIAECN3FHYHIHxiCjgIQxoTFBh9b1RQbWVQBWEFfCBzFC0eFhMpIScuPW4AKWoYCQMdfh82ChAePyI2HwRcNyZiERR0Y1IGawR2UgRkckB1Qg.jpg', label: 'Финансовый контроль' },
    { url: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGCwjUQkQblk4HjQuehhEAjJtMiwfE0wKOFwsfAssKyMACkQeBXAyRwQ9AD1DbStdAgsVWTkcEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg', label: 'Командный мостик' },
    { url: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGAojUQkRNBcrHzcjAht9AFMAMDEePzg_PFAtPC0sKyE6CkQeBXAyRwQ9DxEIPmNFFywLVDkcEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg', label: 'График смен и Гантт' },
    { url: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGDAjUQkQADwbMzQTY2hkFVR1ExNIER8vAV0pfT0sKyA6CkQeBXAyRwQ_O3xPNAAdViIOCikcEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg', label: 'ИИ Копилот и Quality Score' }
  ];
  const [galleryImages, setGalleryImages] = useState<Array<{ url: string; label: string }>>(presetImages);

  const transliterate = (str: string) => {
    const ruMap: Record<string, string> = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
      'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
      'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts',
      'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
    };
    return str
      .toLowerCase()
      .split('')
      .map(c => ruMap[c] !== undefined ? ruMap[c] : c)
      .join('')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch posts from PostgreSQL BD ProTalk DB
  const fetchPostsFromDb = async () => {
    try {
      const res = await fetch('/api/blog/posts');
      const data = await res.json();
      if (data.success && Array.isArray(data.posts) && data.posts.length > 0) {
        setPosts(data.posts);
      } else {
        setPosts(DEFAULT_BLOG_POSTS);
      }
    } catch (e) {
      console.error("Failed to load blog posts from PostgreSQL BD ProTalk DB:", e);
      setPosts(DEFAULT_BLOG_POSTS);
    }
  };

  useEffect(() => {
    fetchPostsFromDb();
    fetch('/api/admin/files')
      .then(res => res.json())
      .then(data => {
        const list = Array.isArray(data) ? data : (Array.isArray(data?.files) ? data.files : []);
        if (list.length > 0) {
          const remoteImgs = list
            .filter((f: any) => f.original_url && (String(f.mime_type || '').startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(f.name || '')))
            .map((f: any) => ({ url: f.original_url, label: f.name || `Файл #${f.id}` }));
          if (remoteImgs.length > 0) {
            const seen = new Set(remoteImgs.map((i: { url: string }) => i.url));
            setGalleryImages([...remoteImgs, ...presetImages.filter(p => !seen.has(p.url))]);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Handle AI Article Generator
  const handleGenerateAiArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiTopic.trim()) {
      showToast("Пожалуйста, укажите тему статьи.");
      return;
    }

    setIsAiGenerating(true);
    try {
      const res = await fetch('/api/blog/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: aiTopic,
          category: aiCategory,
          keyPoints: aiKeyPoints
        })
      });

      const data = await res.json();
      if (data.success && data.post) {
        await fetchPostsFromDb();
        setShowAiModal(false);
        setAiTopic('');
        setAiKeyPoints('');
        // Automatically open the generated article for review
        handleEditClick(data.post);
        showToast('Статья успешно сгенерирована нейросетью RR и сохранена в базу данных!');
      } else {
        showToast('Ошибка при генерации статьи: ' + (data.error || 'Неизвестная ошибка'));
      }
    } catch (err: any) {
      showToast('Не удалось сгенерировать статью: ' + err.message);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const uploadFileToServer = async (file: File): Promise<string | null> => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.success && data.url) return data.url;
    throw new Error(data.error || 'Не удалось загрузить изображение');
  };

  // Real multipart cover upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingCover(true);
    try {
      const url = await uploadFileToServer(file);
      if (url) {
        setImage(url);
        showToast('Обложка загружена и сохранена на сервере.');
      }
    } catch (err: any) {
      showToast('Ошибка загрузки обложки: ' + err.message);
    } finally {
      setIsUploadingCover(false);
      e.target.value = '';
    }
  };

  const handleInlineImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingInline(true);
    try {
      const url = await uploadFileToServer(file);
      if (url) {
        const alt = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
        handleFormat(`\n![${alt}](${url})\n`, '');
        showToast('Изображение вставлено в текст статьи.');
      }
    } catch (err: any) {
      showToast('Ошибка загрузки фото в текст: ' + err.message);
    } finally {
      setIsUploadingInline(false);
      e.target.value = '';
    }
  };

  // Helper for formatting selected text in the Markdown textarea
  const handleFormat = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('blog-content-textarea') as HTMLTextAreaElement;
    if (!textarea) {
      setContent(prev => prev + prefix + suffix);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    const replacement = prefix + (selectedText || '') + suffix;
    const newValue = text.substring(0, start) + replacement + text.substring(end);
    
    setContent(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length, 
        start + prefix.length + (selectedText ? selectedText.length : 0)
      );
    }, 10);
  };

  const handleEditClick = (post: BlogPost) => {
    setEditingPost(post);
    setIsCreatingNew(false);
    setTitle(post.title);
    setSlug(post.slug || transliterate(post.title));
    setCategory(post.category);
    setAuthor(post.author);
    setAuthorRole(post.authorRole);
    setImage(post.image || DEFAULT_BLOG_COVER_URL);
    setSummary(post.summary);
    setSeoTitle((post as any).seoTitle || post.title);
    setSeoDesc(post.seoDesc);
    setSeoKeywords(post.seoKeywords);
    setContent(post.content);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreateNewClick = () => {
    setEditingPost(null);
    setIsCreatingNew(true);
    setTitle('');
    setSlug('');
    setCategory('ИИ в бизнесе');
    setAuthor('Григорий РентРоп');
    setAuthorRole('CEO ИИ Рапорт');
    setImage(DEFAULT_BLOG_COVER_URL);
    setSummary('');
    setSeoTitle('');
    setSeoDesc('');
    setSeoKeywords('');
    setContent(`## Введение в новую тему\n\nНапишите здесь вводный абзац о решении болей бизнеса с помощью ИИ Рапорта...\n\n> **Главная мысль поста**\n> Качественные голосовые отчеты позволяют снизить нагрузку и мотивировать сотрудников через Магазин Благ.\n\n## Основной раздел статьи\n\nЗдесь можно описать детальную методологию. Используйте списки:\n- Первое преимущество решения\n- Второе преимущество интеграции\n- Эффективный тайм-менеджмент\n\n### Пример интеграции\n\n**Голос:** "Запустили смену, продали 3 лицензии."\n**ИИ Раскладка:** Выручка зафиксирована.\n\nУспешного внедрения технологий!`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setEditingPost(null);
    setIsCreatingNew(false);
    setShowPreview(false);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      showToast('Пожалуйста, введите заголовок статьи.');
      return;
    }
    if (!content.trim()) {
      showToast('Пожалуйста, введите содержание статьи.');
      return;
    }

    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
    const calculatedReadTime = `${Math.max(3, Math.ceil(wordCount / 180))} мин`;
    const formattedDate = new Date().toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const postId = editingPost ? editingPost.id : Date.now().toString();
    const effectiveSlug = slug.trim() || transliterate(title) || postId;

    const postData = {
      id: postId,
      title,
      slug: effectiveSlug,
      category,
      author,
      authorRole,
      image: image || DEFAULT_BLOG_COVER_URL,
      summary: summary || title.slice(0, 150) + '...',
      seoTitle: seoTitle || title,
      seoDesc: seoDesc || summary || title,
      seoKeywords: seoKeywords || category,
      content,
      readTime: calculatedReadTime,
      date: editingPost?.date || formattedDate
    };

    try {
      const res = await fetch('/api/blog/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      });
      const data = await res.json();
      if (data.success) {
        await fetchPostsFromDb();
        showToast('Пост успешно сохранен в базе данных!');
        handleCancel();
      } else {
        showToast('Ошибка при сохранении статьи: ' + (data.error || 'Неизвестная ошибка'));
      }
    } catch (err: any) {
      showToast('Не удалось сохранить статью: ' + err.message);
    }
  };

  const executeDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/blog/posts/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await fetchPostsFromDb();
        showToast('Пост успешно удален!');
      } else {
        showToast('Ошибка при удалении: ' + (data.error || 'Неизвестная ошибка'));
      }
    } catch (err: any) {
      showToast('Не удалось удалить пост: ' + err.message);
    } finally {
      setDeleteTargetId(null);
    }
  };

  const filteredPosts = posts.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6" id="admin-blog-posts-root">
      
      {/* HEADER ROW */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-xl font-extrabold bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] bg-clip-text text-transparent font-sans">
            Управление Постами и SEO Базой Знаний
          </h2>
          <p className="text-[11px] text-slate-400 font-mono mt-1">Добавление, редактирование и SEO-оптимизация статей компании</p>
        </div>
        
        {!isCreatingNew && !editingPost && (
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              onClick={() => setShowAiModal(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-500/20 to-amber-600/30 border border-amber-400/50 hover:bg-amber-500/30 text-[#F4EE8E] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              id="admin-btn-ai-generate-post"
            >
              <Sparkles size={15} className="text-[#F4EE8E] animate-pulse" />
              <span>Генерация статьи через RR</span>
            </button>

            <button
              onClick={handleCreateNewClick}
              className="px-4 py-2 bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] hover:brightness-110 active:scale-95 text-slate-950 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer"
              id="admin-btn-create-post"
            >
              <Plus size={15} />
              <span>Создать пост</span>
            </button>
          </div>
        )}
      </div>

      {/* AI GENERATOR MODAL */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#140A01] border border-amber-400/50 rounded-2xl p-6 max-w-lg w-full shadow-[0_0_30px_rgba(244,238,142,0.2)] text-white space-y-4">
            <div className="flex items-center justify-between border-b border-amber-400/20 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="text-[#F4EE8E]" size={20} />
                <h3 className="font-extrabold text-base text-[#F4EE8E]">Генерация SEO-статьи ИИ RR</h3>
              </div>
              <button 
                onClick={() => setShowAiModal(false)}
                className="text-amber-200/60 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleGenerateAiArticle} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-amber-200/90 mb-1">Тема статьи *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Например: Как нейросеть помогает сократить издержки на контроль качества"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#1A0F02] border border-amber-400/30 text-white focus:outline-none focus:border-[#F4EE8E]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-200/90 mb-1">Категория</label>
                <select
                  value={aiCategory}
                  onChange={(e) => setAiCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#1A0F02] border border-amber-400/30 text-white focus:outline-none focus:border-[#F4EE8E]"
                >
                  <option value="ИИ в бизнесе">ИИ в бизнесе</option>
                  <option value="Мотивация">Мотивация</option>
                  <option value="Технологии">Технологии</option>
                  <option value="Интеграции">Интеграции</option>
                  <option value="ИИ-Коучинг">ИИ-Коучинг</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-200/90 mb-1">Ключевые тезисы / факты (необязательно)</label>
                <textarea 
                  rows={3}
                  placeholder="Укажите уникальные примеры, цифры или особенности работы ИИ Рапорт..."
                  value={aiKeyPoints}
                  onChange={(e) => setAiKeyPoints(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#1A0F02] border border-amber-400/30 text-white focus:outline-none focus:border-[#F4EE8E]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAiModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-amber-200/70 hover:text-white transition-colors cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isAiGenerating}
                  className="px-5 py-2 bg-gradient-to-r from-[#F4EE8E] to-[#E7C768] text-amber-950 font-extrabold text-xs rounded-xl hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isAiGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-amber-950 border-t-transparent rounded-full animate-spin" />
                      <span>Генерация статьи RR...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} />
                      <span>Сгенерировать и сохранить</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE OR EDIT FORM */}
      {(isCreatingNew || editingPost) && (
        <div className="p-5 rounded-2xl bg-[#1A1A1A]/30 border border-amber-200/20 space-y-6" id="blog-editor-form">
          
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-200 flex items-center gap-1.5">
              <Sparkles size={14} />
              {editingPost ? 'Редактирование статьи' : 'Создание новой статьи'}
            </span>
            <button 
              onClick={handleCancel}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Заголовок статьи</label>
              <input 
                type="text"
                placeholder="Например: Как автоматизировать отчеты за 5 минут"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-[#161616]/60 border border-white/10 text-white focus:outline-none focus:border-[#F4EE8E] transition-all"
              />
            </div>

            {/* Category */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Категория</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-[#161616]/60 border border-white/10 text-white focus:outline-none focus:border-[#F4EE8E] transition-all"
              >
                <option value="ИИ в бизнесе">ИИ в бизнесе</option>
                <option value="Мотивация">Мотивация</option>
                <option value="Технологии">Технологии</option>
                <option value="Интеграции">Интеграции</option>
                <option value="ИИ-Коучинг">ИИ-Коучинг</option>
              </select>
            </div>

            {/* Author */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Автор</label>
              <input 
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-[#161616]/60 border border-white/10 text-white focus:outline-none focus:border-[#F4EE8E] transition-all"
              />
            </div>

            {/* Author Role */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Должность автора</label>
              <input 
                type="text"
                value={authorRole}
                onChange={(e) => setAuthorRole(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-[#161616]/60 border border-white/10 text-white focus:outline-none focus:border-[#F4EE8E] transition-all"
              />
            </div>
          </div>

          {/* Cover photo upload zone */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-[#F4EE8E] block">Обложка статьи</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <input 
                  type="text"
                  placeholder="Вставьте URL картинки..."
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-black/40 border border-amber-400/25 text-white focus:outline-none focus:border-[#F4EE8E] transition-all"
                />
                
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowGalleryPicker(showGalleryPicker === 'cover' ? null : 'cover')}
                    className="bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 px-3 py-1 rounded-lg text-sm font-bold text-amber-200 transition-all cursor-pointer"
                  >
                    Выбрать из галереи
                  </button>
                  <label className="cursor-pointer bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/35 px-3 py-1 rounded-lg text-sm font-bold text-[#F4EE8E] transition-all">
                    {isUploadingCover ? 'Загрузка...' : 'Загрузить с ПК'}
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleImageUpload} 
                    />
                  </label>
                </div>
              </div>

              {image && (
                <div className="relative rounded-xl overflow-hidden border border-amber-400/30 h-28 bg-black flex items-center justify-center">
                  <img src={image} alt="Preview" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  <button 
                    type="button"
                    onClick={() => setImage('')}
                    className="absolute top-1.5 right-1.5 p-1 bg-black/70 rounded-full hover:bg-black/90 text-white cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* SEO and Summary Fields */}
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-bold text-[#F4EE8E]">Краткое описание (Summary для списков)</label>
              <textarea 
                placeholder="Краткое введение для карточки статьи..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-xl bg-black/40 border border-amber-400/25 text-white focus:outline-none focus:border-[#F4EE8E] transition-all font-sans"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-bold text-[#E7C768]">SEO Title</label>
                <input 
                  type="text"
                  placeholder="SEO-заголовок для Яндекса и Google"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-black/40 border border-amber-400/25 text-white focus:outline-none focus:border-[#F4EE8E] transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-bold text-[#E7C768]">URL Slug (транслитерация)</label>
                <input 
                  type="text"
                  placeholder="avtomatizaciya-otchetov"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-black/40 border border-amber-400/25 text-[#F4EE8E] focus:outline-none focus:border-[#F4EE8E] transition-all font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-bold text-[#E7C768]">SEO Description (мета-тег)</label>
                <input 
                  type="text"
                  placeholder="Описание 120–160 символов для поиска"
                  value={seoDesc}
                  onChange={(e) => setSeoDesc(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-black/40 border border-amber-400/25 text-white focus:outline-none focus:border-[#F4EE8E] transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-bold text-[#E7C768]">SEO Keywords (ключевые слова)</label>
                <input 
                  type="text"
                  placeholder="голосовые отчеты, ии в торговле, ритейл автоматизация"
                  value={seoKeywords}
                  onChange={(e) => setSeoKeywords(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-black/40 border border-amber-400/25 text-white focus:outline-none focus:border-[#F4EE8E] transition-all"
                />
              </div>
            </div>
          </div>

          {/* MARKDOWN EDITOR ROW WITH TOOLBAR */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-black/40 p-2.5 rounded-t-xl border-t border-x border-amber-400/25">
              <span className="text-sm font-bold text-[#F4EE8E]">
                Редактор контента (слов: {content.trim().split(/\s+/).filter(Boolean).length})
              </span>
              
              {/* TOOLBAR FOR TEXT WRAPPING */}
              <div className="flex flex-wrap gap-1.5 items-center">
                <button
                  type="button"
                  onClick={() => handleFormat('**', '**')}
                  className="p-1.5 text-amber-100 hover:text-[#F4EE8E] hover:bg-amber-400/10 rounded cursor-pointer"
                  title="Жирный текст (**)"
                >
                  <Bold size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleFormat('*', '*')}
                  className="p-1.5 text-amber-100 hover:text-[#F4EE8E] hover:bg-amber-400/10 rounded cursor-pointer"
                  title="Курсив (*)"
                >
                  <Italic size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleFormat('## ')}
                  className="p-1.5 text-[#F4EE8E] hover:bg-amber-400/10 rounded text-sm font-bold cursor-pointer"
                  title="Заголовок 2"
                >
                  H2
                </button>
                <button
                  type="button"
                  onClick={() => handleFormat('### ')}
                  className="p-1.5 text-[#E7C768] hover:bg-amber-400/10 rounded text-sm font-bold cursor-pointer"
                  title="Заголовок 3"
                >
                  H3
                </button>
                <button
                  type="button"
                  onClick={() => handleFormat('> ')}
                  className="p-1.5 text-amber-100 hover:text-[#F4EE8E] hover:bg-amber-400/10 rounded cursor-pointer"
                  title="Цитата (>)"
                >
                  <Quote size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleFormat('- ')}
                  className="p-1.5 text-amber-100 hover:text-[#F4EE8E] hover:bg-amber-400/10 rounded cursor-pointer"
                  title="Список (-)"
                >
                  <List size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleFormat('[Текст ссылки](', ')')}
                  className="p-1.5 text-amber-100 hover:text-[#F4EE8E] hover:bg-amber-400/10 rounded cursor-pointer"
                  title="Ссылка"
                >
                  <LinkIcon size={14} />
                </button>
                <label
                  className="px-2.5 py-1 bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/35 text-[#F4EE8E] rounded-lg text-sm font-bold flex items-center gap-1 cursor-pointer"
                  title="Загрузить фото и вставить в статью"
                >
                  <ImageIcon size={14} />
                  <span>{isUploadingInline ? 'Загрузка...' : 'Фото в текст'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleInlineImageUpload} />
                </label>
                <button
                  type="button"
                  onClick={() => setShowGalleryPicker(showGalleryPicker === 'inline' ? null : 'inline')}
                  className="px-2.5 py-1 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 text-[#F4EE8E] rounded-lg text-sm font-bold cursor-pointer"
                >
                  Галерея
                </button>
              </div>
            </div>

            {showGalleryPicker && (
              <div className="p-3 bg-[#1A0F02]/95 border-x border-b border-amber-400/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[#F4EE8E]">
                    {showGalleryPicker === 'cover' ? 'Выберите обложку из галереи' : 'Вставьте изображение из галереи в текст статьи'}
                  </span>
                  <button type="button" onClick={() => setShowGalleryPicker(null)} className="text-amber-200 cursor-pointer">
                    <X size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 max-h-72 overflow-y-auto pr-1">
                  {galleryImages.map((item) => (
                    <button
                      key={item.url}
                      type="button"
                      onClick={() => {
                        if (showGalleryPicker === 'cover') setImage(item.url);
                        else handleFormat(`\n![${item.label}](${item.url})\n`, '');
                        setShowGalleryPicker(null);
                      }}
                      className="rounded-xl overflow-hidden border border-amber-400/30 hover:border-[#F4EE8E] text-left cursor-pointer bg-black/40"
                    >
                      <img src={item.url} alt={item.label} className="w-full h-14 object-cover" referrerPolicy="no-referrer" />
                      <span className="block p-1 text-sm text-amber-100 truncate">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
              {/* Text Area */}
              <div className={`${showPreview ? 'xl:col-span-6' : 'xl:col-span-12'}`}>
                <textarea 
                  id="blog-content-textarea"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={16}
                  placeholder="Пишите длинный текст статьи в формате Markdown..."
                  className="w-full px-3.5 py-3 text-sm rounded-b-xl bg-black/40 border-b border-x border-amber-400/25 text-white placeholder-slate-400 focus:outline-none focus:border-[#F4EE8E] font-mono leading-relaxed"
                />
              </div>

              {/* Live Preview Side (Toggled) */}
              {showPreview && (
                <div className="xl:col-span-6 p-4 rounded-xl bg-[#1A0F02]/70 border border-amber-400/25 max-h-[420px] overflow-y-auto">
                  <span className="text-sm text-[#E7C768] font-mono block mb-3 pb-1 border-b border-amber-400/15">Предпросмотр форматирования</span>
                  <MarkdownRenderer content={content} />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  showPreview ? 'bg-amber-400/20 text-[#F4EE8E] border border-amber-400/40' : 'bg-white/5 text-amber-100 hover:bg-white/10'
                }`}
              >
                <Eye size={14} />
                <span>{showPreview ? 'Скрыть предпросмотр' : 'Показать предпросмотр'}</span>
              </button>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-amber-400/20">
            <button
              onClick={handleCancel}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-amber-100 text-sm font-bold transition-all cursor-pointer"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] hover:brightness-110 text-amber-950 text-sm font-extrabold rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Save size={15} />
              <span>{editingPost ? 'Сохранить изменения' : 'Опубликовать'}</span>
            </button>
          </div>

        </div>
      )}

      {/* POSTS LIST VIEW */}
      {!isCreatingNew && !editingPost && (
        <div className="space-y-4">
          
          {/* Search bar */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-amber-200/60">
              <Search size={15} />
            </span>
            <input 
              type="text"
              placeholder="Поиск по статьям в базе знаний..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-black/40 border border-amber-400/25 text-white placeholder-amber-200/50 focus:outline-none focus:border-[#F4EE8E] transition-all font-mono"
            />
          </div>

          {filteredPosts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPosts.map((post) => (
                <div 
                  key={post.id}
                  className="p-4 rounded-xl bg-[#1A0F02]/50 border border-amber-400/25 hover:border-amber-400/50 transition-all flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded text-sm font-bold bg-amber-400/15 text-amber-200 border border-amber-400/25">
                        {post.category}
                      </span>
                      <span className="text-sm text-amber-200/70 font-mono flex items-center gap-1">
                        <Calendar size={12} />
                        {post.date}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white line-clamp-1">{post.title}</h3>
                    <p className="text-sm text-amber-100/80 line-clamp-2 leading-relaxed">{post.summary}</p>
                    
                    {/* SEO badge */}
                    <div className="pt-2 flex flex-wrap gap-1.5">
                      <span className="text-sm px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/25 text-[#F4EE8E] font-mono">
                        SEO: {post.seoKeywords ? post.seoKeywords.split(',')[0] : 'не заданы'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-slate-400">
                    <span className="flex items-center gap-1 text-[10px]">
                      <User size={11} className="text-[#E7C768]" />
                      {post.author}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditClick(post)}
                        className="p-1.5 text-slate-300 hover:text-[#F4EE8E] hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                        title="Редактировать статью"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        onClick={() => setDeleteTargetId(post.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                        title="Удалить"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-[#161616]/20 border border-white/5 rounded-2xl">
              <p className="text-xs text-slate-400">Посты не найдены. Создайте первый пост прямо сейчас!</p>
            </div>
          )}

        </div>
      )}

      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1A0F02] border border-amber-400/50 text-[#F4EE8E] px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold animate-in fade-in">
          {toastMessage}
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="max-w-md w-full rounded-3xl p-6 border shadow-2xl backdrop-blur-xl space-y-4 bg-[#1A0F02]/95 border-amber-400/50 text-amber-100">
            <h3 className="text-base font-bold flex items-center gap-2 text-[#F4EE8E]">
              <Trash2 size={18} className="text-red-400" />
              <span>Подтверждение удаления поста</span>
            </h3>

            <p className="text-sm opacity-90 leading-relaxed font-sans">
              Вы действительно хотите удалить этот пост из базы данных?
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-amber-500/20">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="px-4 py-2 rounded-xl border border-amber-400/30 text-amber-200 hover:bg-amber-400/10 text-sm font-bold cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => executeDelete(deleteTargetId)}
                className="px-5 py-2 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-700 text-white transition-all shadow-md active:scale-95 cursor-pointer"
              >
                Удалить пост
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
