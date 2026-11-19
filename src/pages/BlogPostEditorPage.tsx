import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  FileText, Plus, Trash2, Edit3, Save, Eye, X, HelpCircle, 
  Sparkles, Bold, Italic, Heading, Quote, List, Code, Link as LinkIcon, 
  Image as ImageIcon, Video, Folder, Calendar, User, Search, ArrowLeft,
  Check, Layout, ExternalLink, RefreshCw
} from 'lucide-react';
import { BlogPost, UserProfile } from '../types';
import { DEFAULT_BLOG_POSTS } from '../data/defaultBlogPosts';
import MarkdownRenderer from '../components/MarkdownRenderer';
import InteractiveGoldenWaves from '../components/InteractiveGoldenWaves';

interface BlogPostEditorPageProps {
  onNavigate: (path: string) => void;
  currentUser: UserProfile | null;
  editPostId?: string;
}

export default function BlogPostEditorPage({ onNavigate, currentUser, editPostId }: BlogPostEditorPageProps) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  
  // AI Generator modal state
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiKeyPoints, setAiKeyPoints] = useState('');
  const [aiCategory, setAiCategory] = useState('ИИ в бизнесе');
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(editPostId || null);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('ИИ в бизнесе');
  const [author, setAuthor] = useState(currentUser?.name || 'Григорий РентРоп');
  const [authorRole, setAuthorRole] = useState(currentUser?.position || 'CEO ИИ Рапорт');
  const DEFAULT_BLOG_COVER_URL = 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGDQjUQkQMR8fbWVWaWh8CDBXEDshGkg6KlEjKC0sKyAqCkQeBXAyRwQ9SQ1MCTMyDy0dBg8cEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg';
  const [image, setImage] = useState(DEFAULT_BLOG_COVER_URL);
  const [summary, setSummary] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDesc, setSeoDesc] = useState('');
  const [seoKeywords, setSeoKeywords] = useState('');
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingInline, setIsUploadingInline] = useState(false);
  const [showGalleryPicker, setShowGalleryPicker] = useState<'cover' | 'inline' | null>(null);

  const presetImages = [
    { url: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGDQjUQkQMR8fbWVWaWh8CDBXEDshGkg6KlEjKC0sKyAqCkQeBXAyRwQ9SQ1MCTMyDy0dBg8cEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg', label: 'Автопилот ИИ Ревизор' },
    { url: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGCgjUQkQIjsMKRMmfzBMLSNlHRs2Fh8LBTgPLT0sKyMQCkQeBXAyRwQ4GiIrNWAjLzMCNA8cEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg', label: 'Контроль и чек-листы' },
    { url: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGDwjUQkQCVkBADg7R2FzdBFXAHsdcSwBIBsIHQssKyAACkQeBXAyRwQ9AyA-HQoeLBRrBh8cEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg', label: 'Голосовые отчеты' },
    { url: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGAIjUQkQEiUrO2EDDw1AMSxZOHkwBzk8KxEKLBssKyAQCkQeBXAyRwQ9EXQdFwc-CDUAWSkcEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg', label: 'Геймификация и Магазин Благ' },
    { url: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGCAjUQkQBQEQaWtURQkGDDFLHQYBPBMCMSwlKQssKyM6CkQeBXAyRwQ_Lj8eMj4eD3IxHR8cEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg', label: 'Строительный аудит КС-2/КС-3' },
    { url: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGGkjUQkTHSoeIz1XdQhsBABiPwovEh8efwFWMD0sKyMqCkQeBXAyRwQ_Dw8IHRo9DQIcAh8cEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg', label: 'Telegram-бот отчетов' },
    { url: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGA4jUQkQGyw_Ozw0QXQMLjZZPhkOKAoBYzgQfT4oKRghAW84TTIuWSMnNSktbWoYUSY_NwIAECN3FHYHIHxiCjgIQxoTFBh9b1RQbWVQBWEFfCBzFC0eFhMpIScuPW4AKWoYCQMdfh82ChAePyI2HwRcNyZiERR0Y1IGawR2UgRkckB1Qg.jpg', label: 'Финансы и кассовые разрывы' },
    { url: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGCwjUQkQblk4HjQuehhEAjJtMiwfE0wKOFwsfAssKyMACkQeBXAyRwQ9AD1DbStdAgsVWTkcEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg', label: 'Командный мостик 3D' },
    { url: 'https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKlJzP2IIL1oQCjoEGAojUQkRNBcrHzcjAht9AFMAMDEePzg_PFAtPC0sKyE6CkQeBXAyRwQ9DxEIPmNFFywLVDkcEyNBEHQHUlEQCgN1PyQuUFF8Yllfa2FaBmN0ByRUNhgQNAkXGBBQKBteIjJnJn0AYn4gZxcsNQIsbAELXDkmQFlpYlAHaQZwVAtoe0E.jpg', label: 'Умный Гантт и смены' },
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
  const [content, setContent] = useState(`## Введение в тему

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

Успешного внедрения технологий!`);

  // Fetch posts from DB to populate if editing
  useEffect(() => {
    fetch('/api/blog/posts')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.posts)) {
          setPosts(data.posts);
          if (editPostId) {
            const found = data.posts.find((p: BlogPost) => p.id === editPostId);
            if (found) {
              setEditingId(found.id);
              setTitle(found.title);
              setSlug(found.slug || transliterate(found.title));
              setCategory(found.category);
              setAuthor(found.author);
              setAuthorRole(found.authorRole);
              setImage(found.image || DEFAULT_BLOG_COVER_URL);
              setSummary(found.summary);
              setSeoTitle((found as any).seoTitle || found.title);
              setSeoDesc(found.seoDesc);
              setSeoKeywords(found.seoKeywords);
              setContent(found.content);
            }
          }
        }
      })
      .catch(err => console.error("Failed to load posts in editor:", err));

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
            const merged = [...remoteImgs, ...presetImages.filter(p => !seen.has(p.url))];
            setGalleryImages(merged);
          }
        }
      })
      .catch(() => {});
  }, [editPostId]);

  // Handle AI Article Generation
  const handleGenerateAiArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiTopic.trim()) {
      setSaveToast("Пожалуйста, укажите тему статьи.");
      setTimeout(() => setSaveToast(null), 3000);
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
        setShowAiModal(false);
        setAiTopic('');
        setAiKeyPoints('');

        const p = data.post;
        setEditingId(p.id);
        setTitle(p.title);
        setSlug(p.slug || transliterate(p.title));
        setCategory(p.category || aiCategory);
        setAuthor(p.author || 'Игорь Давыдов');
        setAuthorRole(p.authorRole || 'CEO ИИ Ревизор');
        setImage(p.image || DEFAULT_BLOG_COVER_URL);
        setSummary(p.summary || '');
        setSeoTitle(p.seoTitle || p.title || '');
        setSeoDesc(p.seoDesc || '');
        setSeoKeywords(p.seoKeywords || '');
        setContent(p.content || '');

        setSaveToast('✨ Статья сгенерирована нейросетью! Проверьте текст и нажмите «Сохранить и опубликовать».');
        setTimeout(() => setSaveToast(null), 5000);
      } else {
        setSaveToast('Ошибка при генерации статьи: ' + (data.error || 'Неизвестная ошибка'));
        setTimeout(() => setSaveToast(null), 4000);
      }
    } catch (err: any) {
      setSaveToast('Не удалось сгенерировать статью: ' + err.message);
      setTimeout(() => setSaveToast(null), 4000);
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Real multipart upload to /api/upload for cover or inline Markdown image
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
        setSaveToast('Обложка загружена и привязана к статье.');
        setTimeout(() => setSaveToast(null), 3000);
      }
    } catch (err: any) {
      setSaveToast('Ошибка загрузки обложки: ' + err.message);
      setTimeout(() => setSaveToast(null), 4000);
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
        setSaveToast('Фото вставлено в текст статьи.');
        setTimeout(() => setSaveToast(null), 3000);
      }
    } catch (err: any) {
      setSaveToast('Ошибка загрузки фото в текст: ' + err.message);
      setTimeout(() => setSaveToast(null), 4000);
    } finally {
      setIsUploadingInline(false);
      e.target.value = '';
    }
  };

  // Format Helper for Textarea
  const handleFormat = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('main-markdown-editor-textarea') as HTMLTextAreaElement;
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

  // Save Post to DB
  const handleSave = async () => {
    if (!title.trim()) {
      setSaveToast('Пожалуйста, введите заголовок статьи.');
      setTimeout(() => setSaveToast(null), 3500);
      return;
    }
    if (!content.trim()) {
      setSaveToast('Пожалуйста, введите текст статьи.');
      setTimeout(() => setSaveToast(null), 3500);
      return;
    }

    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
    const calculatedReadTime = `${Math.max(3, Math.ceil(wordCount / 180))} мин`;
    const formattedDate = new Date().toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const postId = editingId || Date.now().toString();
    const effectiveSlug = slug.trim() || transliterate(title) || postId;

    const postData: BlogPost & { seoTitle?: string } = {
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
        setSaveToast('🎉 Статья успешно сохранена и опубликована в PostgreSQL BD ProTalk!');
        setTimeout(() => {
          onNavigate(`/system-admin/blog`);
        }, 1200);
      } else {
        setSaveToast('Ошибка при сохранении: ' + (data.error || 'Неизвестная ошибка'));
        setTimeout(() => setSaveToast(null), 4000);
      }
    } catch (err: any) {
      setSaveToast('Ошибка при сохранении статьи: ' + err.message);
      setTimeout(() => setSaveToast(null), 4000);
    }
  };

  return (
    <div className="bg-transparent text-white pt-2 pb-8 relative" id="blog-post-editor-page">
      
      <div className="max-w-7xl mx-auto relative z-10 space-y-8">
        
        {saveToast && (
          <div className="p-4 rounded-2xl bg-amber-500/20 border border-amber-400 text-[#F4EE8E] text-sm font-semibold flex items-center justify-between shadow-[0_0_20px_rgba(244,238,142,0.25)] animate-fade-in">
            <span>{saveToast}</span>
            <button type="button" onClick={() => setSaveToast(null)} className="text-amber-200 hover:text-white cursor-pointer ml-3 font-bold">✕</button>
          </div>
        )}

        {/* TOP TOOLBAR & BREADCRUMB */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#140A01]/90 backdrop-blur-md p-5 rounded-3xl border border-amber-400/40 shadow-[0_0_30px_rgba(244,238,142,0.15)]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('/system-admin/blog')}
              className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer"
              title="Вернуться к списку статей"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/10 text-[#F4EE8E] text-[10px] font-bold uppercase tracking-wider font-mono border border-amber-400/30">
                  {editingId ? 'Редактирование Поста' : 'Создание и Генерация Поста'}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white font-sans mt-0.5">
                {title ? title : 'Новая статья блога'}
              </h1>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* AI Generator Button */}
            <button
              onClick={() => setShowAiModal(true)}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-amber-400/30 to-amber-600/20 border border-amber-400/60 hover:border-amber-300 text-[#F4EE8E] text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95"
              id="btn-open-ai-generator"
            >
              <Sparkles size={16} className="text-[#F4EE8E] animate-pulse" />
              <span>Сгенерировать ИИ RR</span>
            </button>

            {/* Toggle Editor / Live Preview */}
            <div className="flex items-center p-1 bg-black/50 rounded-2xl border border-white/10">
              <button
                onClick={() => setActiveTab('editor')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'editor'
                    ? 'bg-amber-400/20 text-[#F4EE8E] border border-amber-400/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Edit3 size={14} />
                <span>Редактор</span>
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'preview'
                    ? 'bg-amber-400/20 text-[#F4EE8E] border border-amber-400/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye size={14} />
                <span>Предпросмотр</span>
              </button>
            </div>

            {/* Save & Publish */}
            <button
              onClick={handleSave}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-zinc-950 font-black text-xs hover:brightness-110 active:scale-95 transition-all shadow-xl cursor-pointer flex items-center gap-2"
              id="btn-save-blog-post"
            >
              <Save size={16} />
              <span>Сохранить и опубликовать</span>
            </button>
          </div>
        </div>

        {/* AI GENERATOR MODAL */}
        {showAiModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="bg-[#140A01] border border-amber-400/60 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-[0_0_50px_rgba(244,238,142,0.25)] text-white space-y-5">
              <div className="flex items-center justify-between border-b border-amber-400/20 pb-4">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="text-[#F4EE8E] animate-spin" size={22} />
                  <h3 className="font-black text-lg text-[#F4EE8E]">Генерация экспертной статьи RR</h3>
                </div>
                <button 
                  onClick={() => setShowAiModal(false)}
                  className="text-amber-200/60 hover:text-white p-1 rounded-xl transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleGenerateAiArticle} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-amber-200/90 mb-1.5">Тема или заголовок статьи *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Например: Как автоматизировать проверку кассовых отчетов с помощью голосового ИИ"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs rounded-xl bg-[#1A0F02] border border-amber-400/30 text-white focus:outline-none focus:border-[#F4EE8E] font-sans"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-200/90 mb-1.5">Категория публикации</label>
                  <select
                    value={aiCategory}
                    onChange={(e) => setAiCategory(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs rounded-xl bg-[#1A0F02] border border-amber-400/30 text-white focus:outline-none focus:border-[#F4EE8E] font-sans"
                  >
                    <option value="ИИ в бизнесе">ИИ в бизнесе</option>
                    <option value="Мотивация">Мотивация</option>
                    <option value="Технологии">Технологии</option>
                    <option value="Интеграции">Интеграции</option>
                    <option value="ИИ-Коучинг">ИИ-Коучинг</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-200/90 mb-1.5">Ключевые факты, тезисы и кейсы (необязательно)</label>
                  <textarea 
                    rows={3}
                    placeholder="Укажите цифры, специфику вашей ниши или ключевые преимущества ИИ Рапорта..."
                    value={aiKeyPoints}
                    onChange={(e) => setAiKeyPoints(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs rounded-xl bg-[#1A0F02] border border-amber-400/30 text-white focus:outline-none focus:border-[#F4EE8E] font-sans"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAiModal(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-amber-200/70 hover:text-white transition-colors cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={isAiGenerating}
                    className="px-6 py-2.5 bg-gradient-to-r from-[#F4EE8E] to-[#E7C768] text-amber-950 font-black text-xs rounded-xl hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-lg"
                  >
                    {isAiGenerating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-amber-950 border-t-transparent rounded-full animate-spin" />
                        <span>Генерация статьи RR...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        <span>Сгенерировать текст</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MAIN EDITOR FORM OR LIVE PREVIEW */}
        {activeTab === 'editor' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* MAIN CONTENT & MARKDOWN TEXTAREA (8 COLUMNS) */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Title Input */}
              <div className="space-y-2 bg-[#140A01]/70 p-5 rounded-3xl border border-amber-400/25">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-sm font-bold text-[#F4EE8E]">Заголовок публикации</label>
                  <span className="text-sm text-amber-200/80 font-mono">
                    Слов: {content.trim().split(/\s+/).filter(Boolean).length} · ~{Math.max(3, Math.ceil(content.trim().split(/\s+/).filter(Boolean).length / 180))} мин
                  </span>
                </div>
                <input 
                  type="text"
                  placeholder="Введите заголовок статьи..."
                  value={title}
                  onChange={(e) => {
                    const nextTitle = e.target.value;
                    setTitle(nextTitle);
                    if (!editingId) setSlug(transliterate(nextTitle));
                  }}
                  className="w-full px-4 py-3 text-sm sm:text-base font-bold rounded-2xl bg-black/40 border border-amber-400/30 text-white placeholder-zinc-500 focus:outline-none focus:border-[#F4EE8E] transition-all font-sans"
                />
              </div>

              {/* MARKDOWN TOOLBAR & TEXTAREA */}
              <div className="bg-[#140A01]/70 rounded-3xl border border-amber-400/25 overflow-hidden shadow-xl">
                
                {/* TOOLBAR */}
                <div className="p-3 bg-black/40 border-b border-amber-400/20 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-bold text-[#F4EE8E] px-2">
                    Текст статьи (Markdown)
                  </span>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleFormat('**', '**')}
                      className="p-1.5 text-amber-100 hover:text-[#F4EE8E] hover:bg-amber-400/10 rounded-lg transition-colors cursor-pointer"
                      title="Жирный шрифт (**)"
                    >
                      <Bold size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFormat('*', '*')}
                      className="p-1.5 text-amber-100 hover:text-[#F4EE8E] hover:bg-amber-400/10 rounded-lg transition-colors cursor-pointer"
                      title="Курсив (*)"
                    >
                      <Italic size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFormat('## ')}
                      className="p-1.5 text-[#F4EE8E] hover:bg-amber-400/10 rounded-lg text-sm font-black cursor-pointer"
                      title="Заголовок H2"
                    >
                      H2
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFormat('### ')}
                      className="p-1.5 text-[#E7C768] hover:bg-amber-400/10 rounded-lg text-sm font-black cursor-pointer"
                      title="Заголовок H3"
                    >
                      H3
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFormat('> ')}
                      className="p-1.5 text-amber-100 hover:text-[#F4EE8E] hover:bg-amber-400/10 rounded-lg transition-colors cursor-pointer"
                      title="Цитата (>)"
                    >
                      <Quote size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFormat('- ')}
                      className="p-1.5 text-amber-100 hover:text-[#F4EE8E] hover:bg-amber-400/10 rounded-lg transition-colors cursor-pointer"
                      title="Маркированный список (-)"
                    >
                      <List size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFormat('```javascript\n', '\n```')}
                      className="p-1.5 text-amber-100 hover:text-[#F4EE8E] hover:bg-amber-400/10 rounded-lg transition-colors cursor-pointer"
                      title="Блок кода (```)"
                    >
                      <Code size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFormat('[Текст ссылки](', ')')}
                      className="p-1.5 text-amber-100 hover:text-[#F4EE8E] hover:bg-amber-400/10 rounded-lg transition-colors cursor-pointer"
                      title="Вставить ссылку"
                    >
                      <LinkIcon size={15} />
                    </button>
                    <label
                      className="px-2.5 py-1 bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/35 text-[#F4EE8E] rounded-lg text-sm font-bold flex items-center gap-1.5 cursor-pointer"
                      title="Загрузить изображение прямо в текст статьи"
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
                      Галерея в текст
                    </button>

                    <div className="h-4 w-px bg-amber-400/20 mx-1" />

                    <button
                      type="button"
                      onClick={() => handleFormat('<iframe src="https://rutube.ru/play/embed/ecfa0ea2bd452178fb012cb7f7cf5429" width="100%" height="400" frameborder="0" allowfullscreen></iframe>')}
                      className="px-2.5 py-1 bg-amber-400/10 hover:bg-amber-400/20 text-[#F4EE8E] rounded-lg text-sm font-bold cursor-pointer"
                      title="Вставить RuTube Видео"
                    >
                      RuTube
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFormat('<iframe src="https://vk.com/video_ext.php?oid=-220311234&id=456239120&hash=bc123" width="100%" height="400" frameborder="0" allowfullscreen></iframe>')}
                      className="px-2.5 py-1 bg-amber-400/10 hover:bg-amber-400/20 text-[#F4EE8E] rounded-lg text-sm font-bold cursor-pointer"
                      title="Вставить VK Видео"
                    >
                      VK Видео
                    </button>
                  </div>
                </div>

                {showGalleryPicker && (
                  <div className="p-4 bg-[#1A0F02]/95 border-b border-amber-400/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[#F4EE8E]">
                        {showGalleryPicker === 'cover' ? 'Выберите обложку из галереи' : 'Вставьте иллюстрацию из галереи в статью'}
                      </span>
                      <button type="button" onClick={() => setShowGalleryPicker(null)} className="text-amber-200 hover:text-white cursor-pointer">
                        <X size={16} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 max-h-72 overflow-y-auto pr-1">
                      {galleryImages.map((item) => (
                        <button
                          key={item.url}
                          type="button"
                          onClick={() => {
                            if (showGalleryPicker === 'cover') {
                              setImage(item.url);
                            } else {
                              handleFormat(`\n![${item.label}](${item.url})\n`, '');
                            }
                            setShowGalleryPicker(null);
                          }}
                          className="rounded-xl overflow-hidden border border-amber-400/30 hover:border-[#F4EE8E] text-left cursor-pointer bg-black/40"
                        >
                          <img src={item.url} alt={item.label} className="w-full h-16 object-cover" referrerPolicy="no-referrer" />
                          <span className="block p-1.5 text-sm text-amber-100 truncate">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <textarea
                  id="main-markdown-editor-textarea"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={22}
                  placeholder="Пишите подробный текст статьи в формате Markdown..."
                  className="w-full p-5 text-sm bg-black/40 text-white placeholder-zinc-500 focus:outline-none font-mono leading-relaxed resize-y"
                />

              </div>

            </div>

            {/* SIDEBAR METADATA & COVER SETTINGS (4 COLUMNS) */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Cover Image Box */}
              <div className="bg-[#140A01]/70 p-5 rounded-3xl border border-amber-400/25 space-y-3">
                <label className="text-sm font-bold text-[#F4EE8E] block">
                  Обложка публикации
                </label>
                
                <input 
                  type="text"
                  placeholder="URL изображения..."
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl bg-black/40 border border-amber-400/25 text-white focus:outline-none focus:border-[#F4EE8E] font-mono"
                />

                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <button
                    type="button"
                    onClick={() => setShowGalleryPicker(showGalleryPicker === 'cover' ? null : 'cover')}
                    className="bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 px-3 py-1.5 rounded-xl text-sm font-bold text-[#F4EE8E] cursor-pointer"
                  >
                    Из галереи
                  </button>
                  <label className="cursor-pointer bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/35 px-3 py-1.5 rounded-xl text-sm font-bold text-[#F4EE8E] transition-all">
                    {isUploadingCover ? 'Загрузка...' : 'Загрузить файл'}
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleImageUpload} 
                    />
                  </label>
                </div>

                {image && (
                  <div className="relative rounded-2xl overflow-hidden border border-amber-400/25 h-40 bg-black flex items-center justify-center mt-2">
                    <img src={image} alt="Cover Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                )}
              </div>

              {/* Category & Author Settings */}
              <div className="bg-[#140A01]/70 p-5 rounded-3xl border border-white/10 space-y-4">
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-[#F4EE8E] block mb-1.5">Категория</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-[#F4EE8E] font-sans"
                  >
                    <option value="ИИ в бизнесе">ИИ в бизнесе</option>
                    <option value="Мотивация">Мотивация</option>
                    <option value="Технологии">Технологии</option>
                    <option value="Интеграции">Интеграции</option>
                    <option value="ИИ-Коучинг">ИИ-Коучинг</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-zinc-300 block mb-1.5">Имя Автора</label>
                  <input 
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-[#F4EE8E] font-sans"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-zinc-300 block mb-1.5">Должность автора</label>
                  <input 
                    type="text"
                    value={authorRole}
                    onChange={(e) => setAuthorRole(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-[#F4EE8E] font-sans"
                  />
                </div>
              </div>

              {/* SEO Summary & Keywords */}
              <div className="bg-[#140A01]/70 p-5 rounded-3xl border border-white/10 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-[#F4EE8E] block">
                      URL Slug (транслитерация)
                    </label>
                    <button
                      type="button"
                      onClick={() => setSlug(transliterate(title))}
                      className="text-[10px] text-amber-300 hover:underline flex items-center gap-1 font-mono cursor-pointer"
                    >
                      <span>Сгенерировать</span>
                    </button>
                  </div>
                  <input 
                    type="text"
                    placeholder="avtomatizaciya-otchetov-ii"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-black/60 border border-white/10 text-[#F4EE8E] focus:outline-none focus:border-[#F4EE8E] font-mono"
                  />
                  <p className="text-[10px] text-zinc-400 font-mono mt-1 truncate">
                    URL: <span className="text-[#F4EE8E]">https://ii-rr.ru/blog/{slug || transliterate(title) || 'slug'}</span>
                  </p>
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-[#F4EE8E] block mb-1.5">Краткое описание (Summary)</label>
                  <textarea 
                    rows={3}
                    placeholder="2-3 предложения для карточки анонса..."
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-[#F4EE8E] font-sans"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-[#F4EE8E] block mb-1.5">SEO Title (заголовок в поиске)</label>
                  <input 
                    type="text"
                    placeholder="До 65 символов для Яндекса и Google..."
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl bg-black/40 border border-amber-400/25 text-white focus:outline-none focus:border-[#F4EE8E] font-sans"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-[#F4EE8E] block mb-1.5">SEO Description (для поисковиков)</label>
                  <input 
                    type="text"
                    placeholder="Метатег description для Яндекса и Google..."
                    value={seoDesc}
                    onChange={(e) => setSeoDesc(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl bg-black/40 border border-amber-400/25 text-white focus:outline-none focus:border-[#F4EE8E] font-sans"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-[#F4EE8E] block mb-1.5">SEO Ключевые слова</label>
                  <input 
                    type="text"
                    placeholder="голосовые отчеты, ии в ритейле, автоматизация"
                    value={seoKeywords}
                    onChange={(e) => setSeoKeywords(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl bg-black/40 border border-amber-400/25 text-white focus:outline-none focus:border-[#F4EE8E] font-sans"
                  />
                </div>
              </div>

            </div>

          </div>
        ) : (
          /* LIVE PREVIEW OF THE ARTICLE BEFORE PUBLISHING */
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-4xl mx-auto space-y-8 bg-[#140A01]/95 p-6 sm:p-10 rounded-3xl border border-amber-400/40 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-amber-400/20 pb-4">
              <span className="px-3 py-1 rounded-full bg-amber-400/20 text-[#F4EE8E] text-xs font-bold uppercase tracking-wider font-mono border border-amber-400/40">
                👁️ Предпросмотр перед публикацией
              </span>
              <button
                onClick={() => setActiveTab('editor')}
                className="text-xs font-bold text-amber-200 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <Edit3 size={14} />
                <span>Вернуться к редактированию</span>
              </button>
            </div>

            {/* Post Header */}
            <div className="space-y-4">
              <span className="px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-200 text-xs font-bold uppercase tracking-wider font-mono">
                {category}
              </span>
              <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight font-sans">
                {title || 'Заголовок публикации не указан'}
              </h1>

              {/* Author & Meta */}
              <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-zinc-300 border-b border-white/10 pb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center font-bold">
                    {author ? author[0] : '✍️'}
                  </div>
                  <div>
                    <p className="font-bold text-white">{author}</p>
                    <p className="text-[10px] text-zinc-400">{authorRole}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar size={13} className="text-zinc-400" />
                  <span>Сегодня</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Eye size={13} className="text-zinc-400" />
                  <span>{Math.max(2, Math.ceil(content.split(/\s+/).length / 150))} мин чтения</span>
                </div>
              </div>
            </div>

            {/* Post Cover Banner */}
            {image && (
              <div className="rounded-3xl overflow-hidden border border-white/10 shadow-2xl max-h-[400px] bg-black">
                <img 
                  src={image} 
                  alt={title} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            {/* Markdown Body */}
            <div className="bg-[#1A0F02]/70 backdrop-blur-md p-6 sm:p-10 rounded-3xl border border-[#E7C768]/40">
              <MarkdownRenderer content={content} excludeImages={image ? [image] : []} />
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/10">
              <button
                onClick={() => setActiveTab('editor')}
                className="px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all cursor-pointer"
              >
                Вернуться в Редактор
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-zinc-950 font-black text-xs hover:brightness-110 active:scale-95 transition-all shadow-xl cursor-pointer flex items-center gap-2"
              >
                <Save size={16} />
                <span>Опубликовать прямо сейчас</span>
              </button>
            </div>

          </motion.div>
        )}

      </div>
    </div>
  );
}
