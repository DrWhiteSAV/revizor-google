import React, { useState, useEffect, useRef } from 'react';
import { AcademyPost, ACADEMY_CATEGORIES } from './types';
import MarkdownRenderer from '../MarkdownRenderer';
import { Plus, Edit2, Trash2, Save, Image, Eye, EyeOff, BookOpen, RefreshCw, Check } from 'lucide-react';

interface AcademyAdminEditorProps {
  theme?: 'dark' | 'light';
}

export const AcademyAdminEditor: React.FC<AcademyAdminEditorProps> = ({ theme = 'dark' }) => {
  const isDark = theme === 'dark';
  const [posts, setPosts] = useState<AcademyPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingPost, setEditingPost] = useState<Partial<AcademyPost> | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<Array<{ id: number; name: string; original_url: string }>>([]);
  const [galleryPickerTarget, setGalleryPickerTarget] = useState<'cover' | 'inline' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/academy/posts');
      const data = await res.json();
      if (data.success && data.posts) {
        setPosts(data.posts);
      }
    } catch (err) {
      console.error('Failed to load academy posts for admin:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGalleryImages = async () => {
    try {
      const res = await fetch('/api/admin/files');
      const data = await res.json();
      const list = Array.isArray(data) ? data : (Array.isArray(data?.files) ? data.files : []);
      if (list.length > 0) {
        const imgs = list.filter(
          (f: any) => f.original_url && (String(f.mime_type || '').startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(f.name || ''))
        );
        setGalleryImages(imgs);
      }
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchPosts();
    fetchGalleryImages();
  }, []);

  const handleCreateNew = () => {
    setEditingPost({
      title: '',
      slug: 'instruktsiya-' + Date.now(),
      category: 'Организация',
      target_route: 'cabinet',
      summary: '',
      content_markdown: '## Новая инструкция\n\nОпишите назначение раздела и порядок работы.\n\n### Шаги:\n1. Первый шаг\n2. Второй шаг',
      cover_image: 'https://filestore.pro-talk.ru/GgMpJwQ9JCkYKglyGHQMTANjOUtxAw89Hw8sP1ohGyVPG2xXMAdDYAEUKggZEyJSNS0sKyM4MQMKDHQOAjgeSxJDAh84NRQmEV9uZlUAaA11VQJrCjgDAzkkAVczLRouDiMXfQxTNBdFGT8aIyw2ZyIcIQsIKjIuHhtsBXZSBGZ5T3FP.png',
      order_index: posts.length + 1,
      is_published: 1
    });
    setIsCreating(true);
    setActiveTab('editor');
  };

  const handleEdit = (post: AcademyPost) => {
    setEditingPost({ ...post });
    setIsCreating(false);
    setActiveTab('editor');
  };

  const executeDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/academy/posts/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setStatusMessage('Статья успешно удалена');
        fetchPosts();
        if (editingPost?.id === id) {
          setEditingPost(null);
        }
      }
    } catch (err: any) {
      console.error('Delete error:', err);
      setStatusMessage('Ошибка удаления: ' + err.message);
    } finally {
      setDeleteTargetId(null);
    }
  };

  const handleSave = async () => {
    if (!editingPost?.title || !editingPost?.content_markdown) {
      setStatusMessage('Заполните название и текст статьи');
      return;
    }

    try {
      const isNew = isCreating || !editingPost.id;
      const url = isNew ? '/api/academy/posts' : `/api/academy/posts/${editingPost.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingPost)
      });
      const data = await res.json();

      if (data.success) {
        setStatusMessage(isNew ? 'Статья успешно создана' : 'Статья успешно обновлена');
        setIsCreating(false);
        fetchPosts();
        setTimeout(() => setStatusMessage(''), 3000);
      } else {
        setStatusMessage('Ошибка: ' + (data.error || 'Не удалось сохранить'));
      }
    } catch (err: any) {
      console.error('Save error:', err);
      setStatusMessage('Ошибка сохранения: ' + err.message);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (data.url || data.filePath) {
        const fileUrl = data.url || data.filePath;
        const imgMarkdown = `\n\n![Скриншот](${fileUrl})\n\n`;
        setEditingPost(prev => ({
          ...prev,
          content_markdown: (prev?.content_markdown || '') + imgMarkdown
        }));
        setStatusMessage('Изображение загружено и добавлено в текст');
      } else {
        setStatusMessage('Не удалось загрузить изображение');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setStatusMessage('Ошибка загрузки: ' + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-amber-950'}`}>
            Управление Академией
          </h2>
          <p className={`text-sm ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>
            Редактирование обучающих постов, скриншотов и привязок к разделам кабинета
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchPosts}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isDark
                ? 'border-amber-400/30 text-stone-300 hover:text-white hover:bg-amber-400/10'
                : 'border-amber-800/30 text-stone-700 hover:text-stone-950 hover:bg-amber-100/60'
            }`}
            title="Обновить список"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={handleCreateNew}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
              isDark
                ? 'border-amber-400/50 bg-amber-400/20 text-[#F4EE8E] hover:bg-amber-400/30 shadow-[0_0_15px_rgba(244,238,142,0.15)]'
                : 'border-amber-800/40 bg-amber-200 text-amber-950 hover:bg-amber-300'
            }`}
          >
            <Plus size={18} />
            <span>Новая статья</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-3 rounded-xl border text-sm flex items-center justify-between ${
            isDark
              ? 'border-amber-400/40 bg-amber-400/10 text-[#F4EE8E]'
              : 'border-amber-800/30 bg-amber-100/70 text-amber-950 font-medium'
          }`}
        >
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage('')}>
            <Check size={16} />
          </button>
        </div>
      )}

      {/* Editor & Post Management Area */}
      {editingPost ? (
        <div
          className={`p-5 rounded-2xl border space-y-4 ${
            isDark
              ? 'bg-[#1A0F02]/80 border-amber-400/40'
              : 'bg-[#FFFBF5]/90 border-amber-900/30'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-400/20 pb-3">
            <span className={`text-base font-bold ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
              {isCreating ? 'Создание статьи' : `Редактирование: ${editingPost.title}`}
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab(activeTab === 'editor' ? 'preview' : 'editor')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-medium ${
                  isDark
                    ? 'border-amber-400/30 text-stone-200 hover:bg-amber-400/10'
                    : 'border-amber-800/30 text-stone-800 hover:bg-amber-100/60'
                }`}
              >
                {activeTab === 'editor' ? (
                  <>
                    <Eye size={16} />
                    <span>Предпросмотр</span>
                  </>
                ) : (
                  <>
                    <EyeOff size={16} />
                    <span>Редактор</span>
                  </>
                )}
              </button>

              <button
                onClick={handleSave}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                  isDark
                    ? 'border-amber-400/60 bg-amber-400/25 text-[#F4EE8E] hover:bg-amber-400/35'
                    : 'border-amber-800/50 bg-amber-200 text-amber-950 hover:bg-amber-300'
                }`}
              >
                <Save size={16} />
                <span>Сохранить</span>
              </button>

              <button
                onClick={() => setEditingPost(null)}
                className={`px-3 py-1.5 rounded-xl border text-sm ${
                  isDark
                    ? 'border-amber-400/20 text-stone-400 hover:text-white'
                    : 'border-amber-800/20 text-stone-600 hover:text-stone-900'
                }`}
              >
                Отмена
              </button>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1 opacity-80">Заголовок</label>
              <input
                type="text"
                value={editingPost.title || ''}
                onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value })}
                className={`w-full p-2 rounded-xl border text-sm focus:outline-none ${
                  isDark
                    ? 'bg-transparent border-amber-400/30 text-white focus:border-[#E7C768]'
                    : 'bg-transparent border-amber-800/30 text-amber-950 focus:border-amber-700'
                }`}
                placeholder="Название статьи"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 opacity-80">Категория</label>
              <select
                value={editingPost.category || 'Организация'}
                onChange={(e) => setEditingPost({ ...editingPost, category: e.target.value })}
                className={`w-full p-2 rounded-xl border text-sm focus:outline-none ${
                  isDark
                    ? 'bg-[#1A0F02] border-amber-400/30 text-white focus:border-[#E7C768]'
                    : 'bg-[#FFFBF5] border-amber-800/30 text-amber-950 focus:border-amber-700'
                }`}
              >
                {ACADEMY_CATEGORIES.filter(c => c !== 'Все').map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 opacity-80">Привязка к разделу (Route/Tab)</label>
              <input
                type="text"
                value={editingPost.target_route || ''}
                onChange={(e) => setEditingPost({ ...editingPost, target_route: e.target.value })}
                className={`w-full p-2 rounded-xl border text-sm focus:outline-none ${
                  isDark
                    ? 'bg-transparent border-amber-400/30 text-white focus:border-[#E7C768]'
                    : 'bg-transparent border-amber-800/30 text-amber-950 focus:border-amber-700'
                }`}
                placeholder="ship, revisor, fill_report, schedule..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 opacity-80">Обложка (URL картинки)</label>
              <input
                type="text"
                value={editingPost.cover_image || ''}
                onChange={(e) => setEditingPost({ ...editingPost, cover_image: e.target.value })}
                className={`w-full p-2 rounded-xl border text-sm focus:outline-none ${
                  isDark
                    ? 'bg-transparent border-amber-400/30 text-white focus:border-[#E7C768]'
                    : 'bg-transparent border-amber-800/30 text-amber-950 focus:border-amber-700'
                }`}
                placeholder="https://filestore.pro-talk.ru/..."
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 opacity-80">Краткое описание (summary)</label>
            <input
              type="text"
              value={editingPost.summary || ''}
              onChange={(e) => setEditingPost({ ...editingPost, summary: e.target.value })}
              className={`w-full p-2 rounded-xl border text-sm focus:outline-none ${
                isDark
                  ? 'bg-transparent border-amber-400/30 text-white focus:border-[#E7C768]'
                  : 'bg-transparent border-amber-800/30 text-amber-950 focus:border-amber-700'
              }`}
              placeholder="1-2 предложения о содержании инструкции"
            />
          </div>

          {/* Screenshot upload & Gallery picker helper */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                  isDark
                    ? 'border-amber-400/30 text-[#F4EE8E] hover:bg-amber-400/10'
                    : 'border-amber-800/30 text-amber-950 hover:bg-amber-100/60'
                }`}
              >
                <Image size={16} />
                <span>{isUploading ? 'Загрузка...' : 'Загрузить скриншот'}</span>
              </button>
              <button
                type="button"
                onClick={() => setGalleryPickerTarget(galleryPickerTarget === 'inline' ? null : 'inline')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                  isDark
                    ? 'border-amber-400/30 text-[#F4EE8E] hover:bg-amber-400/10'
                    : 'border-amber-800/30 text-amber-950 hover:bg-amber-100/60'
                }`}
              >
                <Image size={16} />
                <span>Из галереи (в текст)</span>
              </button>
              <button
                type="button"
                onClick={() => setGalleryPickerTarget(galleryPickerTarget === 'cover' ? null : 'cover')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                  isDark
                    ? 'border-amber-400/30 text-[#E7C768] hover:bg-amber-400/10'
                    : 'border-amber-800/30 text-amber-950 hover:bg-amber-100/60'
                }`}
              >
                <Image size={16} />
                <span>Обложка из галереи</span>
              </button>
            </div>

            {galleryPickerTarget && galleryImages.length > 0 && (
              <div className={`p-3 rounded-xl border space-y-2 ${isDark ? 'bg-[#1A0F02]/90 border-amber-400/35' : 'bg-[#FFFBF5]/95 border-amber-800/30'}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-bold ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                    {galleryPickerTarget === 'cover' ? 'Выберите обложку из галереи' : 'Вставьте прямую ссылку из галереи в текст'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setGalleryPickerTarget(null)}
                    className={`text-sm cursor-pointer ${isDark ? 'text-amber-200 hover:text-white' : 'text-amber-900'}`}
                  >
                    Закрыть
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 max-h-64 overflow-y-auto pr-1">
                  {galleryImages.map((img) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => {
                        if (galleryPickerTarget === 'cover') {
                          setEditingPost(prev => ({ ...prev, cover_image: img.original_url }));
                        } else {
                          setEditingPost(prev => ({
                            ...prev,
                            content_markdown: (prev?.content_markdown || '') + `\n\n![${img.name}](${img.original_url})\n\n`
                          }));
                        }
                        setGalleryPickerTarget(null);
                      }}
                      className={`rounded-xl overflow-hidden border text-left cursor-pointer ${
                        isDark ? 'border-amber-400/30 hover:border-[#F4EE8E] bg-black/30' : 'border-amber-800/25 hover:border-amber-900 bg-white/70'
                      }`}
                    >
                      <img src={img.original_url} alt={img.name} className="w-full h-16 object-cover" referrerPolicy="no-referrer" />
                      <span className={`block p-1.5 text-sm truncate ${isDark ? 'text-amber-100' : 'text-amber-950'}`}>{img.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Editor vs Preview */}
          {activeTab === 'editor' ? (
            <div>
              <label className="block text-xs font-semibold mb-1 opacity-80">Содержимое (Markdown)</label>
              <textarea
                rows={16}
                value={editingPost.content_markdown || ''}
                onChange={(e) => setEditingPost({ ...editingPost, content_markdown: e.target.value })}
                className={`w-full p-4 rounded-xl border text-sm font-mono focus:outline-none leading-relaxed ${
                  isDark
                    ? 'bg-transparent border-amber-400/30 text-stone-100 focus:border-[#E7C768]'
                    : 'bg-transparent border-amber-800/30 text-amber-950 focus:border-amber-700'
                }`}
                placeholder="Пишите текст инструкции с поддержкой markdown..."
              />
            </div>
          ) : (
            <div
              className={`p-6 rounded-xl border overflow-y-auto max-h-[500px] ${
                isDark
                  ? 'border-amber-400/30 bg-black/20'
                  : 'border-amber-800/30 bg-amber-50/50'
              }`}
            >
              <MarkdownRenderer
                content={editingPost.content_markdown || ''}
                theme={isDark ? 'dark' : 'light'}
              />
            </div>
          )}
        </div>
      ) : null}

      {/* Posts Table List */}
      <div
        className={`rounded-2xl border overflow-hidden ${
          isDark
            ? 'bg-[#1A0F02]/60 border-amber-400/30'
            : 'bg-[#FFFBF5]/80 border-amber-900/20'
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className={`border-b border-amber-400/20 text-xs ${isDark ? 'text-[#E7C768]' : 'text-amber-950'}`}>
              <tr>
                <th className="p-3.5">№</th>
                <th className="p-3.5">Название</th>
                <th className="p-3.5">Категория</th>
                <th className="p-3.5">Привязка (Route)</th>
                <th className="p-3.5">Статус</th>
                <th className="p-3.5 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-400/10">
              {posts.map((post, idx) => (
                <tr
                  key={post.id}
                  className={`transition-colors ${
                    isDark ? 'hover:bg-amber-400/5' : 'hover:bg-amber-100/40'
                  }`}
                >
                  <td className="p-3.5 text-stone-400">{idx + 1}</td>
                  <td className="p-3.5 font-medium">
                    <div className="flex items-center gap-2">
                      <BookOpen size={16} className={isDark ? 'text-[#F4EE8E]' : 'text-amber-900'} />
                      <span className="line-clamp-1">{post.title}</span>
                    </div>
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full border ${
                        isDark
                          ? 'border-amber-400/30 text-[#E7C768]'
                          : 'border-amber-800/30 text-amber-950 font-medium'
                      }`}
                    >
                      {post.category}
                    </span>
                  </td>
                  <td className="p-3.5 font-mono text-xs text-stone-400">
                    {post.target_route}
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        post.is_published
                          ? isDark
                            ? 'text-[#F4EE8E] bg-amber-400/10'
                            : 'text-amber-950 bg-amber-200'
                          : 'text-stone-400 bg-stone-500/10'
                      }`}
                    >
                      {post.is_published ? 'Опубликован' : 'Черновик'}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleEdit(post)}
                        className={`p-1.5 rounded-lg border transition-all ${
                          isDark
                            ? 'border-amber-400/30 text-stone-300 hover:text-[#F4EE8E] hover:bg-amber-400/10'
                            : 'border-amber-800/30 text-stone-700 hover:text-stone-950 hover:bg-amber-100/60'
                        }`}
                        title="Редактировать"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteTargetId(post.id)}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                          isDark
                            ? 'border-amber-400/30 text-red-400 hover:bg-red-400/10'
                            : 'border-amber-800/30 text-red-600 hover:bg-red-100/60'
                        }`}
                        title="Удалить"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Custom Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`max-w-md w-full rounded-3xl p-6 border shadow-2xl backdrop-blur-xl space-y-4 ${
            isDark ? 'bg-[#1A0F02]/95 border-amber-400/50 text-amber-100' : 'bg-[#FFFBF5]/95 border-amber-900/30 text-amber-950'
          }`}>
            <h3 className={`text-base font-bold flex items-center gap-2 ${
              isDark ? 'text-[#F4EE8E]' : 'text-amber-950'
            }`}>
              <Trash2 size={18} className="text-red-400" />
              <span>Подтверждение удаления</span>
            </h3>

            <p className="text-sm opacity-90 leading-relaxed font-sans">
              Вы уверены, что хотите удалить эту статью из Академии? Это действие нельзя будет отменить.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-amber-500/20">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className={`px-4 py-2 rounded-xl border text-sm font-bold cursor-pointer ${
                  isDark ? 'border-amber-400/30 text-amber-200 hover:bg-amber-400/10' : 'border-amber-800/30 text-amber-950 hover:bg-amber-100'
                }`}
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => executeDelete(deleteTargetId)}
                className="px-5 py-2 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-700 text-white transition-all shadow-md active:scale-95 cursor-pointer"
              >
                Удалить статью
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
