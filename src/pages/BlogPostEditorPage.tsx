import React, { useState, useEffect, useCallback } from 'react';
import {
  Edit3, Save, Eye, X, Bold, Italic, Quote, List, Code,
  Link as LinkIcon, Image as ImageIcon, ExternalLink, Columns2
} from 'lucide-react';
import { BlogPost, UserProfile } from '../types';
import { BlogEditorPostsList } from '../components/blog/BlogEditorPostsList';
import { BlogEditorPreviewPanel } from '../components/blog/BlogEditorPreviewPanel';
import { BlogEditorModals } from '../components/blog/BlogEditorModals';

interface BlogPostEditorPageProps {
  onNavigate: (path: string) => void;
  currentUser: UserProfile | null;
  editPostId?: string;
  isDarkTheme?: boolean;
}

const DEFAULT_BLOG_COVER_URL =
  'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGDQjUQkQMR8fbWVWaWh8CDBXEDshGkg6KlEjKC0sKyAqCkQeBXAyRwQ9SQ1MCTMyDy0dBg8cEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg';

const DEFAULT_ARTICLE_TEMPLATE = `## Введение в тему

Напишите здесь вводный абзац о решении задач бизнеса с помощью голосовых отчетов ИИ Рапорт...

> **Главная концепция публикации**
> Внедрение искусственного интеллекта сокращает время сдачи смены в 4 раза и исключает человеческий фактор.

## Практический разбор и преимущества

Используйте списки и форматирование:
- **Голосовой ввод:** достаточно проговорить факт смены на диктофон
- **Магазин Благ:** геймификация и автоначисление баллов
- **Прозрачность:** автоматическая валидация данных

### Пример использования

| Параметр | До внедрения | С ИИ Рапорт |
| :--- | :--- | :--- |
| Время сдачи отчета | 25 минут | 3 минуты |
| Ошибки во вводе | 12% | 0.1% |

Успешного внедрения технологий!`;

const PRESET_IMAGES = [
  { url: DEFAULT_BLOG_COVER_URL, label: 'Автопилот ИИ Ревизор' },
  { url: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGCgjUQkQIjsMKRMmfzBMLSNlHRs2Fh8LBTgPLT0sKyMQCkQeBXAyRwQ4GiIrNWAjLzMCNA8cEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg', label: 'Контроль и чек-листы' },
  { url: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGDwjUQkQCVkBADg7R2FzdBFXAHsdcSwBIBsIHQssKyAACkQeBXAyRwQ9AyA-HQoeLBRrBh8cEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg', label: 'Голосовые отчеты' },
  { url: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGAIjUQkQEiUrO2EDDw1AMSxZOHkwBzk8KxEKLBssKyAQCkQeBXAyRwQ9EXQdFwc-CDUAWSkcEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg', label: 'Геймификация и Магазин Благ' },
  { url: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGCAjUQkQBQEQaWtURQkGDDFLHQYBPBMCMSwlKQssKyM6CkQeBXAyRwQ_Lj8eMj4eD3IxHR8cEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg', label: 'Строительный аудит КС-2/КС-3' },
  { url: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGGkjUQkTHSoeIz1XdQhsBABiPwovEh8efwFWMD0sKyMqCkQeBXAyRwQ_Dw8IHRo9DQIcAh8cEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg', label: 'Telegram-бот отчетов' },
  { url: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGA4jUQkQGyw_Ozw0QXQMLjZZPhkOKAoBYzgQfT4oKRghAW84TTIuWSMnNSktbWoYUSY_NwIAECN3FHYHIHxiCjgIQxoTFBh9b1RQbWVQBWEFfCBzFC0eFhMpIScuPW4AKWoYCQMdfh82ChAePyI2HwRcNyZiERR0Y1IGawR2UgRkckB1Qg.jpg', label: 'Финансы и кассовые разрывы' },
  { url: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGCwjUQkQblk4HjQuehhEAjJtMiwfE0wKOFwsfAssKyMACkQeBXAyRwQ9AD1DbStdAgsVWTkcEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg', label: 'Командный мостик 3D' },
  { url: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGAojUQkRNBcrHzcjAht9AFMAMDEePzg_PFAtPC0sKyE6CkQeBXAyRwQ9DxEIPmNFFywLVDkcEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg', label: 'Умный Гантт и смены' },
  { url: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGDAjUQkQADwbMzQTY2hkFVR1ExNIER8vAV0pfT0sKyA6CkQeBXAyRwQ_O3xPNAAdViIOCikcEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg', label: 'ИИ Копилот и оценка качества' }
];

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
    .map(c => (ruMap[c] !== undefined ? ruMap[c] : c))
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export default function BlogPostEditorPage({
  onNavigate: _onNavigate,
  currentUser,
  editPostId,
  isDarkTheme: isDarkProp
}: BlogPostEditorPageProps) {
  const [detectedDark, setDetectedDark] = useState<boolean>(() =>
    typeof document !== 'undefined' ? !document.documentElement.classList.contains('theme-light') : true
  );
  useEffect(() => {
    const syncTheme = () => setDetectedDark(!document.documentElement.classList.contains('theme-light'));
    window.addEventListener('theme-changed', syncTheme);
    return () => window.removeEventListener('theme-changed', syncTheme);
  }, []);
  const isDark = isDarkProp ?? detectedDark;

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [listSearch, setListSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'editor' | 'split' | 'preview'>('split');

  // AI Generator & Delete Modal states
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiKeyPoints, setAiKeyPoints] = useState('');
  const [aiCategory, setAiCategory] = useState('ИИ в бизнесе');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [deleteTargetPost, setDeleteTargetPost] = useState<BlogPost | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Active post fields
  const [editingId, setEditingId] = useState<string | null>(editPostId || null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('ИИ в бизнесе');
  const [author, setAuthor] = useState(currentUser?.name || 'Игорь Давыдов');
  const [authorRole, setAuthorRole] = useState(currentUser?.position || 'Руководитель ИИ Ревизор');
  const [image, setImage] = useState(DEFAULT_BLOG_COVER_URL);
  const [summary, setSummary] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDesc, setSeoDesc] = useState('');
  const [seoKeywords, setSeoKeywords] = useState('');
  const [content, setContent] = useState(DEFAULT_ARTICLE_TEMPLATE);

  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingInline, setIsUploadingInline] = useState(false);
  const [showGalleryPicker, setShowGalleryPicker] = useState<'cover' | 'inline' | null>(null);
  const [galleryImages, setGalleryImages] = useState<Array<{ url: string; label: string }>>(PRESET_IMAGES);

  const showNotice = useCallback((msg: string, durationMs = 3500) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), durationMs);
  }, []);

  const applyPostToForm = useCallback((post: BlogPost) => {
    setIsCreatingNew(false);
    setEditingId(post.id);
    setTitle(post.title || '');
    setSlug(post.slug || transliterate(post.title || ''));
    setCategory(post.category || 'ИИ в бизнесе');
    setAuthor(post.author || 'Игорь Давыдов');
    setAuthorRole(post.authorRole || 'Руководитель ИИ Ревизор');
    setImage(post.image || DEFAULT_BLOG_COVER_URL);
    setSummary(post.summary || '');
    setSeoTitle((post as BlogPost & { seoTitle?: string }).seoTitle || post.title || '');
    setSeoDesc(post.seoDesc || '');
    setSeoKeywords(post.seoKeywords || '');
    setContent(post.content || '');
    setShowGalleryPicker(null);
  }, []);

  const startNewPost = useCallback(() => {
    setIsCreatingNew(true);
    setEditingId(null);
    setTitle('');
    setSlug('');
    setCategory('ИИ в бизнесе');
    setAuthor(currentUser?.name || 'Игорь Давыдов');
    setAuthorRole(currentUser?.position || 'Руководитель ИИ Ревизор');
    setImage(DEFAULT_BLOG_COVER_URL);
    setSummary('');
    setSeoTitle('');
    setSeoDesc('');
    setSeoKeywords('');
    setContent(DEFAULT_ARTICLE_TEMPLATE);
    setShowGalleryPicker(null);
    if (activeTab === 'preview') {
      setActiveTab('split');
    }
  }, [activeTab, currentUser]);

  const loadPosts = useCallback(async (preferredId?: string | null) => {
    setLoadingPosts(true);
    try {
      const res = await fetch('/api/blog/posts');
      const data = await res.json();
      if (data.success && Array.isArray(data.posts)) {
        const list: BlogPost[] = data.posts;
        setPosts(list);
        const targetId = preferredId ?? editPostId;
        if (targetId) {
          const matched = list.find(p => p.id === targetId || p.slug === targetId);
          if (matched) {
            applyPostToForm(matched);
            return;
          }
        }
        if (list.length > 0 && !isCreatingNew) {
          const keepCurrent = editingId ? list.find(p => p.id === editingId) : null;
          applyPostToForm(keepCurrent || list[0]);
        } else if (list.length === 0) {
          startNewPost();
        }
      }
    } catch (err) {
      console.error('Failed to load posts in editor:', err);
    } finally {
      setLoadingPosts(false);
    }
  }, [applyPostToForm, editPostId, editingId, isCreatingNew, startNewPost]);

  useEffect(() => {
    loadPosts(editPostId || null);

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
            setGalleryImages([...remoteImgs, ...PRESET_IMAGES.filter(p => !seen.has(p.url))]);
          }
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editPostId]);

  const handleGenerateAiArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiTopic.trim()) {
      showNotice('Пожалуйста, укажите тему статьи.', 3000);
      return;
    }

    setIsAiGenerating(true);
    try {
      const res = await fetch('/api/blog/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: aiTopic, category: aiCategory, keyPoints: aiKeyPoints })
      });
      const data = await res.json();
      if (data.success && data.post) {
        setShowAiModal(false);
        setAiTopic('');
        setAiKeyPoints('');
        const p: BlogPost = data.post;
        setPosts(prev => [p, ...prev.filter(item => item.id !== p.id)]);
        applyPostToForm(p);
        showNotice('Статья сгенерирована и добавлена в список. Проверьте текст и сохраните изменения.', 5000);
      } else {
        showNotice('Ошибка при генерации статьи: ' + (data.error || 'Неизвестная ошибка'), 4000);
      }
    } catch (err: any) {
      showNotice('Не удалось сгенерировать статью: ' + err.message, 4000);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const uploadFileToServer = async (file: File): Promise<string | null> => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.success && data.url) {
      return data.url;
    }
    throw new Error(data.error || 'Не удалось загрузить изображение');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingCover(true);
    try {
      const uploadedUrl = await uploadFileToServer(file);
      if (uploadedUrl) {
        setImage(uploadedUrl);
        showNotice('Обложка загружена и привязана к статье.');
      }
    } catch (err: any) {
      showNotice('Ошибка загрузки обложки: ' + err.message, 4000);
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
      const uploadedUrl = await uploadFileToServer(file);
      if (uploadedUrl) {
        const alt = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
        handleFormat(`\n![${alt}](${uploadedUrl})\n`, '');
        showNotice('Изображение вставлено в текст статьи.');
      }
    } catch (err: any) {
      showNotice('Ошибка загрузки фото в текст: ' + err.message, 4000);
    } finally {
      setIsUploadingInline(false);
      e.target.value = '';
    }
  };

  const handleFormat = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('main-markdown-editor-textarea') as HTMLTextAreaElement | null;
    if (!textarea) {
      setContent(prev => prev + prefix + suffix);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    const replacement = prefix + (selectedText || '') + suffix;
    setContent(text.substring(0, start) + replacement + text.substring(end));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + (selectedText ? selectedText.length : 0)
      );
    }, 10);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      showNotice('Пожалуйста, введите заголовок статьи.');
      return;
    }
    if (!content.trim()) {
      showNotice('Пожалуйста, введите текст статьи.');
      return;
    }

    setIsSaving(true);
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    const calculatedReadTime = `${Math.max(3, Math.ceil(words / 180))} мин`;
    const existingPost = editingId ? posts.find(p => p.id === editingId) : null;
    const formattedDate =
      existingPost?.date ||
      new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

    const postId = editingId || `post-${Date.now()}`;
    const effectiveSlug = slug.trim() || transliterate(title) || postId;

    const postData: BlogPost & { seoTitle?: string } = {
      id: postId,
      title: title.trim(),
      slug: effectiveSlug,
      category,
      author: author.trim() || 'Игорь Давыдов',
      authorRole: authorRole.trim() || 'Руководитель ИИ Ревизор',
      image: image.trim() || DEFAULT_BLOG_COVER_URL,
      summary: summary.trim() || title.trim().slice(0, 160),
      seoTitle: seoTitle.trim() || title.trim(),
      seoDesc: seoDesc.trim() || summary.trim() || title.trim(),
      seoKeywords: seoKeywords.trim() || category,
      content,
      readTime: calculatedReadTime,
      date: formattedDate
    };

    try {
      const res = await fetch('/api/blog/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      });
      const data = await res.json();
      if (data.success) {
        const saved: BlogPost = data.post || postData;
        setPosts(prev => {
          const exists = prev.some(p => p.id === saved.id);
          return exists ? prev.map(p => (p.id === saved.id ? saved : p)) : [saved, ...prev];
        });
        applyPostToForm(saved);
        showNotice('Статья сохранена и опубликована в базе данных.');
      } else {
        showNotice('Ошибка при сохранении: ' + (data.error || 'Неизвестная ошибка'), 4000);
      }
    } catch (err: any) {
      showNotice('Ошибка при сохранении статьи: ' + err.message, 4000);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeletePost = async () => {
    if (!deleteTargetPost) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/blog/posts/${encodeURIComponent(deleteTargetPost.id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        const remaining = posts.filter(p => p.id !== deleteTargetPost.id);
        setPosts(remaining);
        if (editingId === deleteTargetPost.id) {
          if (remaining.length > 0) applyPostToForm(remaining[0]);
          else startNewPost();
        }
        showNotice(`Статья «${deleteTargetPost.title}» удалена.`);
      } else {
        showNotice('Не удалось удалить статью: ' + (data.error || 'Ошибка сервера'), 4000);
      }
    } catch (err: any) {
      showNotice('Ошибка удаления: ' + err.message, 4000);
    } finally {
      setIsDeleting(false);
      setDeleteTargetPost(null);
    }
  };

  const cardSurface = isDark
    ? 'bg-[#140A01]/90 border-amber-400/30 text-white'
    : 'bg-[#FFFBF5] border-amber-900/25 text-amber-950';
  const inputSurface = isDark
    ? 'bg-[#1A0F02] border-amber-400/30 text-white placeholder-amber-200/40 focus:border-[#F4EE8E]'
    : 'bg-[#FAF6EC] border-amber-900/25 text-amber-950 placeholder-amber-900/45 focus:border-amber-800';
  const labelColor = isDark ? 'text-[#F4EE8E]' : 'text-amber-950';
  const mutedColor = isDark ? 'text-amber-200/80' : 'text-amber-900/80';

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const estReadMinutes = Math.max(3, Math.ceil(wordCount / 180));
  const publicHref = `/blog/${slug || transliterate(title) || editingId || ''}`;

  return (
    <div className={`pt-2 pb-6 relative ${isDark ? 'text-white' : 'text-amber-950'}`} id="blog-post-editor-page">
      <div className="w-full max-w-[1600px] mx-auto relative z-10 space-y-5">
        {saveToast && (
          <div
            className={`p-4 rounded-2xl border text-sm font-semibold flex items-center justify-between shadow-lg ${
              isDark ? 'bg-[#1A0F02] border-[#F4EE8E] text-[#F4EE8E]' : 'bg-[#FAF6EC] border-amber-800 text-amber-950'
            }`}
          >
            <span>{saveToast}</span>
            <button type="button" onClick={() => setSaveToast(null)} className="ml-3 font-bold cursor-pointer">
              <X size={16} />
            </button>
          </div>
        )}

        {/* MAIN 2-COLUMN WORKSPACE: LEFT POSTS LIST + RIGHT EDITOR & PREVIEW */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-24 min-w-0">
            <BlogEditorPostsList
              posts={posts}
              selectedPostId={editingId}
              isCreatingNew={isCreatingNew}
              loading={loadingPosts}
              isDark={isDark}
              searchQuery={listSearch}
              onSearchChange={setListSearch}
              onSelectPost={applyPostToForm}
              onCreateNew={startNewPost}
              onOpenAiModal={() => setShowAiModal(true)}
              onRequestDelete={setDeleteTargetPost}
              onRefresh={() => loadPosts(editingId)}
            />
          </div>

          <div className="lg:col-span-8 xl:col-span-9 min-w-0 space-y-6">
            {/* TOP TOOLBAR */}
            <div className={`flex flex-col gap-3 p-4 sm:p-5 rounded-3xl border shadow-lg ${cardSurface}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span
                      className={`px-3 py-0.5 rounded-full border text-sm font-bold whitespace-nowrap shrink-0 ${
                        isDark
                          ? 'bg-[#1A0F02] border-amber-400/35 text-[#F4EE8E]'
                          : 'bg-[#FAF6EC] border-amber-900/25 text-amber-950'
                      }`}
                    >
                      {editingId && !isCreatingNew ? 'Редактирование статьи' : 'Новая статья'}
                    </span>
                    <span className={`text-sm whitespace-nowrap ${mutedColor}`}>
                      Слов: {wordCount} · ~{estReadMinutes} мин
                    </span>
                  </div>
                  <h1 className={`text-lg sm:text-xl font-extrabold font-sans truncate ${isDark ? 'text-white' : 'text-amber-950'}`}>
                    {title || 'Без названия'}
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <div
                    className={`flex items-center p-1 rounded-2xl border ${
                      isDark ? 'bg-[#1A0F02] border-amber-400/25' : 'bg-[#FAF6EC] border-amber-900/20'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveTab('editor')}
                      className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeTab === 'editor'
                          ? isDark
                            ? 'bg-amber-400/20 text-[#F4EE8E] border border-amber-400/40'
                            : 'bg-gradient-to-r from-[#E7C768] to-[#D4AF37] text-amber-950'
                          : mutedColor
                      }`}
                    >
                      <Edit3 size={14} />
                      <span>Редактор</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('split')}
                      className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeTab === 'split'
                          ? isDark
                            ? 'bg-amber-400/20 text-[#F4EE8E] border border-amber-400/40'
                            : 'bg-gradient-to-r from-[#E7C768] to-[#D4AF37] text-amber-950'
                          : mutedColor
                      }`}
                    >
                      <Columns2 size={14} />
                      <span>Вместе</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('preview')}
                      className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeTab === 'preview'
                          ? isDark
                            ? 'bg-amber-400/20 text-[#F4EE8E] border border-amber-400/40'
                            : 'bg-gradient-to-r from-[#E7C768] to-[#D4AF37] text-amber-950'
                          : mutedColor
                      }`}
                    >
                      <Eye size={14} />
                      <span>Предпросмотр</span>
                    </button>
                  </div>

                  {editingId && !isCreatingNew && (
                    <a
                      href={publicHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`px-3.5 py-2 rounded-2xl border text-sm font-bold inline-flex items-center gap-1.5 transition-colors ${
                        isDark
                          ? 'bg-[#1A0F02] border-amber-400/35 text-[#E7C768] hover:border-[#F4EE8E]'
                          : 'bg-[#FAF6EC] border-amber-900/25 text-amber-950 hover:border-amber-800'
                      }`}
                    >
                      <ExternalLink size={15} />
                      <span>На сайте</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    id="btn-save-blog-post"
                    className="px-5 py-2 rounded-2xl bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-[#140A01] font-extrabold text-sm hover:brightness-110 active:scale-95 transition-all shadow-lg cursor-pointer flex items-center gap-2 disabled:opacity-60"
                  >
                    <Save size={16} />
                    <span>{isSaving ? 'Сохранение...' : 'Сохранить'}</span>
                  </button>
                </div>
              </div>
            </div>

            {activeTab === 'preview' ? (
              <BlogEditorPreviewPanel
                title={title}
                category={category}
                author={author}
                authorRole={authorRole}
                image={image}
                content={content}
                estReadMinutes={estReadMinutes}
                editingId={editingId}
                publicHref={publicHref}
                isDark={isDark}
              />
            ) : (
              <div className="space-y-6">
                <div className={`space-y-2 p-5 rounded-3xl border ${cardSurface}`}>
                  <label className={`text-sm font-bold block ${labelColor}`} htmlFor="blog-editor-title-input">
                    Заголовок публикации
                  </label>
                  <input
                    id="blog-editor-title-input"
                    type="text"
                    placeholder="Введите заголовок статьи..."
                    value={title}
                    onChange={(e) => {
                      const nextTitle = e.target.value;
                      setTitle(nextTitle);
                      if (!editingId) setSlug(transliterate(nextTitle));
                    }}
                    className={`w-full px-4 py-3 text-base font-bold rounded-2xl border focus:outline-none transition-all font-sans ${inputSurface}`}
                  />
                </div>

                {/* Editor + Live Preview side-by-side on xl+ */}
                <div className={activeTab === 'split' ? 'grid grid-cols-1 xl:grid-cols-2 gap-6 items-start' : 'space-y-6'}>
                  <div className={`min-w-0 rounded-3xl border overflow-hidden shadow-lg ${cardSurface}`}>
                    <div
                      className={`p-3 border-b flex flex-wrap items-center justify-between gap-2 ${
                        isDark ? 'bg-[#1A0F02] border-amber-400/25' : 'bg-[#FAF6EC] border-amber-900/20'
                      }`}
                    >
                      <span className={`text-sm font-bold px-2 ${labelColor}`}>Текст статьи (Markdown)</span>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleFormat('**', '**')}
                          className={`p-1.5 rounded-lg cursor-pointer ${
                            isDark ? 'text-amber-100 hover:text-[#F4EE8E] hover:bg-amber-400/10' : 'text-amber-950 hover:bg-amber-200/60'
                          }`}
                          title="Жирный шрифт"
                        >
                          <Bold size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFormat('*', '*')}
                          className={`p-1.5 rounded-lg cursor-pointer ${
                            isDark ? 'text-amber-100 hover:text-[#F4EE8E] hover:bg-amber-400/10' : 'text-amber-950 hover:bg-amber-200/60'
                          }`}
                          title="Курсив"
                        >
                          <Italic size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFormat('## ')}
                          className={`px-2 py-1 rounded-lg text-sm font-extrabold cursor-pointer ${
                            isDark ? 'text-[#F4EE8E] hover:bg-amber-400/10' : 'text-amber-950 hover:bg-amber-200/60'
                          }`}
                          title="Заголовок H2"
                        >
                          H2
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFormat('### ')}
                          className={`px-2 py-1 rounded-lg text-sm font-extrabold cursor-pointer ${
                            isDark ? 'text-[#E7C768] hover:bg-amber-400/10' : 'text-amber-900 hover:bg-amber-200/60'
                          }`}
                          title="Заголовок H3"
                        >
                          H3
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFormat('> ')}
                          className={`p-1.5 rounded-lg cursor-pointer ${
                            isDark ? 'text-amber-100 hover:text-[#F4EE8E] hover:bg-amber-400/10' : 'text-amber-950 hover:bg-amber-200/60'
                          }`}
                          title="Цитата"
                        >
                          <Quote size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFormat('- ')}
                          className={`p-1.5 rounded-lg cursor-pointer ${
                            isDark ? 'text-amber-100 hover:text-[#F4EE8E] hover:bg-amber-400/10' : 'text-amber-950 hover:bg-amber-200/60'
                          }`}
                          title="Список"
                        >
                          <List size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFormat('```javascript\n', '\n```')}
                          className={`p-1.5 rounded-lg cursor-pointer ${
                            isDark ? 'text-amber-100 hover:text-[#F4EE8E] hover:bg-amber-400/10' : 'text-amber-950 hover:bg-amber-200/60'
                          }`}
                          title="Блок кода"
                        >
                          <Code size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFormat('[Текст ссылки](', ')')}
                          className={`p-1.5 rounded-lg cursor-pointer ${
                            isDark ? 'text-amber-100 hover:text-[#F4EE8E] hover:bg-amber-400/10' : 'text-amber-950 hover:bg-amber-200/60'
                          }`}
                          title="Вставить ссылку"
                        >
                          <LinkIcon size={15} />
                        </button>
                        <label
                          className={`px-2.5 py-1 rounded-lg border text-sm font-bold flex items-center gap-1.5 cursor-pointer ${
                            isDark
                              ? 'bg-amber-400/15 hover:bg-amber-400/25 border-amber-400/35 text-[#F4EE8E]'
                              : 'bg-amber-100 hover:bg-amber-200 border-amber-900/25 text-amber-950'
                          }`}
                        >
                          <ImageIcon size={14} />
                          <span>{isUploadingInline ? 'Загрузка...' : 'Фото в текст'}</span>
                          <input type="file" accept="image/*" className="hidden" onChange={handleInlineImageUpload} />
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowGalleryPicker(showGalleryPicker === 'inline' ? null : 'inline')}
                          className={`px-2.5 py-1 rounded-lg border text-sm font-bold cursor-pointer ${
                            isDark
                              ? 'bg-amber-400/10 hover:bg-amber-400/20 border-amber-400/30 text-[#F4EE8E]'
                              : 'bg-[#FFFBF5] hover:bg-amber-100 border-amber-900/25 text-amber-950'
                          }`}
                        >
                          Галерея
                        </button>
                      </div>
                    </div>

                    {showGalleryPicker && (
                      <div
                        className={`p-4 border-b space-y-2 ${
                          isDark ? 'bg-[#1A0F02] border-amber-400/30' : 'bg-[#FAF6EC] border-amber-900/20'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-bold ${labelColor}`}>
                            {showGalleryPicker === 'cover' ? 'Выберите обложку из галереи' : 'Вставьте иллюстрацию из галереи'}
                          </span>
                          <button type="button" onClick={() => setShowGalleryPicker(null)} className={`cursor-pointer ${mutedColor}`}>
                            <X size={16} />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto pr-1">
                          {galleryImages.map((item) => (
                            <button
                              key={item.url}
                              type="button"
                              onClick={() => {
                                if (showGalleryPicker === 'cover') setImage(item.url);
                                else handleFormat(`\n![${item.label}](${item.url})\n`, '');
                                setShowGalleryPicker(null);
                              }}
                              className={`rounded-xl overflow-hidden border text-left cursor-pointer ${
                                isDark ? 'border-amber-400/30 hover:border-[#F4EE8E] bg-[#140A01]' : 'border-amber-900/20 hover:border-amber-800 bg-[#FFFBF5]'
                              }`}
                            >
                              <img src={item.url} alt={item.label} className="w-full h-16 object-cover" referrerPolicy="no-referrer" />
                              <span className={`block p-1.5 text-sm truncate ${isDark ? 'text-amber-100' : 'text-amber-950'}`}>
                                {item.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <textarea
                      id="main-markdown-editor-textarea"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={24}
                      placeholder="Пишите подробный текст статьи в формате Markdown..."
                      className={`w-full p-5 text-sm focus:outline-none font-mono leading-relaxed resize-y ${
                        isDark ? 'bg-[#140A01]/60 text-white placeholder-amber-200/40' : 'bg-[#FFFBF5] text-amber-950 placeholder-amber-900/45'
                      }`}
                    />
                  </div>

                  {activeTab === 'split' && (
                    <BlogEditorPreviewPanel
                      title={title}
                      category={category}
                      author={author}
                      authorRole={authorRole}
                      image={image}
                      content={content}
                      estReadMinutes={estReadMinutes}
                      editingId={editingId}
                      publicHref={publicHref}
                      isDark={isDark}
                    />
                  )}
                </div>

                {/* METADATA, COVER & SEO GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className={`p-5 rounded-3xl border space-y-4 ${cardSurface}`}>
                    <div className="space-y-2.5">
                      <label className={`text-sm font-bold block ${labelColor}`}>Обложка публикации</label>
                      <input
                        type="text"
                        placeholder="URL изображения..."
                        value={image}
                        onChange={(e) => setImage(e.target.value)}
                        className={`w-full px-3.5 py-2 text-sm rounded-xl border focus:outline-none font-mono ${inputSurface}`}
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowGalleryPicker(showGalleryPicker === 'cover' ? null : 'cover')}
                          className={`px-3 py-1.5 rounded-xl border text-sm font-bold cursor-pointer ${
                            isDark
                              ? 'bg-amber-400/10 hover:bg-amber-400/20 border-amber-400/30 text-[#F4EE8E]'
                              : 'bg-[#FAF6EC] hover:bg-amber-100 border-amber-900/25 text-amber-950'
                          }`}
                        >
                          Из галереи
                        </button>
                        <label
                          className={`cursor-pointer border px-3 py-1.5 rounded-xl text-sm font-bold ${
                            isDark
                              ? 'bg-amber-400/15 hover:bg-amber-400/25 border-amber-400/35 text-[#F4EE8E]'
                              : 'bg-amber-100 hover:bg-amber-200 border-amber-900/25 text-amber-950'
                          }`}
                        >
                          {isUploadingCover ? 'Загрузка...' : 'Загрузить файл'}
                          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        </label>
                      </div>
                      {image && (
                        <div
                          className={`relative rounded-2xl overflow-hidden border h-40 flex items-center justify-center ${
                            isDark ? 'border-amber-400/25 bg-[#1A0F02]' : 'border-amber-900/20 bg-[#FAF6EC]'
                          }`}
                        >
                          <img src={image} alt="Предпросмотр обложки" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className={`text-sm font-bold block mb-1 ${labelColor}`}>Категория</label>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className={`w-full px-3.5 py-2 text-sm rounded-xl border focus:outline-none ${inputSurface}`}
                        >
                          <option value="ИИ в бизнесе">ИИ в бизнесе</option>
                          <option value="Мотивация">Мотивация</option>
                          <option value="Технологии">Технологии</option>
                          <option value="Интеграции">Интеграции</option>
                          <option value="ИИ-Коучинг">ИИ-Коучинг</option>
                        </select>
                      </div>
                      <div>
                        <label className={`text-sm font-bold block mb-1 ${labelColor}`}>Имя автора</label>
                        <input
                          type="text"
                          value={author}
                          onChange={(e) => setAuthor(e.target.value)}
                          className={`w-full px-3.5 py-2 text-sm rounded-xl border focus:outline-none ${inputSurface}`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={`text-sm font-bold block mb-1 ${labelColor}`}>Должность автора</label>
                      <input
                        type="text"
                        value={authorRole}
                        onChange={(e) => setAuthorRole(e.target.value)}
                        className={`w-full px-3.5 py-2 text-sm rounded-xl border focus:outline-none ${inputSurface}`}
                      />
                    </div>
                  </div>

                  <div className={`p-5 rounded-3xl border space-y-4 ${cardSurface}`}>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className={`text-sm font-bold ${labelColor}`}>Адрес страницы (Slug)</label>
                        <button
                          type="button"
                          onClick={() => setSlug(transliterate(title))}
                          className={`text-sm font-semibold hover:underline cursor-pointer ${isDark ? 'text-[#E7C768]' : 'text-amber-800'}`}
                        >
                          Из заголовка
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="avtomatizaciya-otchetov-ii"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                        className={`w-full px-3.5 py-2 text-sm rounded-xl border focus:outline-none font-mono ${inputSurface}`}
                      />
                      <p className={`text-sm font-mono mt-1 truncate ${mutedColor}`}>
                        /blog/{slug || transliterate(title) || 'slug'}
                      </p>
                    </div>

                    <div>
                      <label className={`text-sm font-bold block mb-1 ${labelColor}`}>Краткое описание (анонс)</label>
                      <textarea
                        rows={3}
                        placeholder="2–3 предложения для карточки в блоге..."
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        className={`w-full px-3.5 py-2 text-sm rounded-xl border focus:outline-none ${inputSurface}`}
                      />
                    </div>

                    <div>
                      <label className={`text-sm font-bold block mb-1 ${labelColor}`}>SEO-заголовок</label>
                      <input
                        type="text"
                        placeholder="До 65 символов для поиска..."
                        value={seoTitle}
                        onChange={(e) => setSeoTitle(e.target.value)}
                        className={`w-full px-3.5 py-2 text-sm rounded-xl border focus:outline-none ${inputSurface}`}
                      />
                    </div>

                    <div>
                      <label className={`text-sm font-bold block mb-1 ${labelColor}`}>SEO-описание</label>
                      <input
                        type="text"
                        placeholder="Краткое описание для поисковых систем..."
                        value={seoDesc}
                        onChange={(e) => setSeoDesc(e.target.value)}
                        className={`w-full px-3.5 py-2 text-sm rounded-xl border focus:outline-none ${inputSurface}`}
                      />
                    </div>

                    <div>
                      <label className={`text-sm font-bold block mb-1 ${labelColor}`}>Ключевые слова</label>
                      <input
                        type="text"
                        placeholder="голосовые отчеты, автоматизация..."
                        value={seoKeywords}
                        onChange={(e) => setSeoKeywords(e.target.value)}
                        className={`w-full px-3.5 py-2 text-sm rounded-xl border focus:outline-none ${inputSurface}`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <BlogEditorModals
        isDark={isDark}
        showAiModal={showAiModal}
        aiTopic={aiTopic}
        aiCategory={aiCategory}
        aiKeyPoints={aiKeyPoints}
        isAiGenerating={isAiGenerating}
        onCloseAiModal={() => setShowAiModal(false)}
        onAiTopicChange={setAiTopic}
        onAiCategoryChange={setAiCategory}
        onAiKeyPointsChange={setAiKeyPoints}
        onSubmitAi={handleGenerateAiArticle}
        deleteTargetPost={deleteTargetPost}
        isDeleting={isDeleting}
        onCancelDelete={() => setDeleteTargetPost(null)}
        onConfirmDelete={confirmDeletePost}
      />
    </div>
  );
}
