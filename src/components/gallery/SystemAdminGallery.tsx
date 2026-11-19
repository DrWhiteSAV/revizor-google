import React, { useState, useEffect } from 'react';
import { 
  Folder, FolderPlus, FolderOpen, Image as ImageIcon, FileText, Video, Music, 
  Trash2, MoveRight, Search, Key, Check, Copy, ExternalLink, RefreshCw, 
  Layers, CheckSquare, Square, X, AlertTriangle, Shield, HardDrive, Plus, Sparkles, User, Filter
} from 'lucide-react';
import { FileRecord, FileFolder, getUploadService, slugifyFileName, getFileFormattedUrl } from '../../services/FileUploadService';
import { DropzoneUploader } from './DropzoneUploader';
import { FilePreviewModal } from './FilePreviewModal';

interface SystemAdminGalleryProps {
  isDarkTheme?: boolean;
}

interface FileOwner {
  id: string;
  name: string;
  file_count: number;
}

export const SystemAdminGallery: React.FC<SystemAdminGalleryProps> = ({ isDarkTheme = true }) => {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [folders, setFolders] = useState<FileFolder[]>([]);
  const [owners, setOwners] = useState<FileOwner[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<number | 'all' | 'root'>('all');
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Token management
  const uploadService = getUploadService();
  const [tokenInput, setTokenInput] = useState(uploadService.getCurrentToken());
  const [tokenSaved, setTokenSaved] = useState(false);

  // Multi-select state
  const [selectedFileIds, setSelectedFileIds] = useState<number[]>([]);
  const [copiedFileId, setCopiedFileId] = useState<number | null>(null);

  const handleCopyUrl = (file: FileRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const url = getFileFormattedUrl(file, window.location.origin);
    navigator.clipboard.writeText(url);
    setCopiedFileId(file.id);
    setTimeout(() => setCopiedFileId(null), 2000);
  };

  // Preview modal
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);

  // Create folder modal / form
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#E7C768');

  // Custom Delete Confirmation Modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<'single' | 'batch' | 'folder'>('single');
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  // Mass Move Modal state
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [targetMoveFolderId, setTargetMoveFolderId] = useState<number | null>(null);

  // Toast message
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Fetch folders, owners & files
  const loadGalleryData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Folders
      const foldersRes = await fetch('/api/admin/file-folders');
      if (foldersRes.ok) {
        const folderData = await foldersRes.json();
        setFolders(folderData);
      }

      // 2. Fetch Owners
      const ownersRes = await fetch('/api/admin/file-owners');
      if (ownersRes.ok) {
        const ownersData = await ownersRes.json();
        setOwners(ownersData);
      }

      // 3. Fetch Files
      let url = '/api/admin/files?';
      if (selectedFolderId === 'root') {
        url += 'folder_id=root&';
      } else if (typeof selectedFolderId === 'number') {
        url += `folder_id=${selectedFolderId}&`;
      }
      if (selectedOwnerId && selectedOwnerId !== 'all') {
        url += `owner_id=${encodeURIComponent(selectedOwnerId)}&`;
      }
      if (searchQuery.trim()) {
        url += `search=${encodeURIComponent(searchQuery.trim())}&`;
      }

      const filesRes = await fetch(url);
      if (filesRes.ok) {
        const fileData = await filesRes.json();
        setFiles(fileData);
      }
    } catch (err) {
      console.error('Failed to load gallery data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGalleryData();
  }, [selectedFolderId, selectedOwnerId, searchQuery]);

  useEffect(() => {
    fetch('/api/admin/gallery-token')
      .then(r => r.json())
      .then(d => {
        if (d?.token) {
          uploadService.setToken(d.token);
          setTokenInput(d.token);
        }
      })
      .catch(() => {});
  }, []);

  // Handle Token Save
  const handleSaveToken = async () => {
    const cleanToken = tokenInput.trim();
    uploadService.setToken(cleanToken);
    try {
      await fetch('/api/admin/gallery-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: cleanToken })
      });
    } catch (e) {
      console.warn('Failed to sync token to server:', e);
    }
    setTokenSaved(true);
    showToast('Токен загрузки успешно сохранен');
    setTimeout(() => setTokenSaved(false), 2000);
  };

  // Create folder
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      const res = await fetch('/api/admin/file-folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim(), color: newFolderColor })
      });

      if (res.ok) {
        showToast(`Папка '${newFolderName}' создана`);
        setNewFolderName('');
        setShowFolderModal(false);
        loadGalleryData();
      }
    } catch (err) {
      console.error('Failed to create folder:', err);
    }
  };

  // Toggle selection
  const toggleSelectFile = (id: number) => {
    setSelectedFileIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedFileIds.length === files.length) {
      setSelectedFileIds([]);
    } else {
      setSelectedFileIds(files.map(f => f.id));
    }
  };

  // Confirm delete handlers
  const openDeleteModal = (type: 'single' | 'batch' | 'folder', id?: number) => {
    setDeleteType(type);
    if (id !== undefined) setDeleteTargetId(id);
    setDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    try {
      if (deleteType === 'single' && deleteTargetId) {
        await fetch(`/api/admin/files/${deleteTargetId}`, { method: 'DELETE' });
        showToast('Файл успешно удален');
      } else if (deleteType === 'batch') {
        await fetch('/api/admin/files/batch-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: selectedFileIds })
        });
        showToast(`Удалено файлов: ${selectedFileIds.length}`);
        setSelectedFileIds([]);
      } else if (deleteType === 'folder' && deleteTargetId) {
        await fetch(`/api/admin/file-folders/${deleteTargetId}`, { method: 'DELETE' });
        showToast('Папка и привязки удалены');
        if (selectedFolderId === deleteTargetId) setSelectedFolderId('all');
      }
      loadGalleryData();
    } catch (err) {
      console.error('Delete action failed:', err);
    } finally {
      setDeleteModalOpen(false);
      setDeleteTargetId(null);
    }
  };

  // Execute Mass Move
  const executeMassMove = async () => {
    try {
      await fetch('/api/admin/files/batch-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedFileIds, folder_id: targetMoveFolderId })
      });
      showToast(`Перемещено файлов: ${selectedFileIds.length}`);
      setSelectedFileIds([]);
      setMoveModalOpen(false);
      loadGalleryData();
    } catch (err) {
      console.error('Batch move failed:', err);
    }
  };

  // Single Move / Add Folder
  const handleSingleMove = async (fileId: number, folderId: number | null) => {
    try {
      const file = files.find(f => f.id === fileId);
      const current = file?.folder_ids || (file?.folder_id ? [file.folder_id] : []);
      const updated = folderId ? Array.from(new Set([...current, folderId])) : [];

      await fetch(`/api/admin/files/${fileId}/folders`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_ids: updated })
      });
      showToast('Папки файла обновлены');
      loadGalleryData();
    } catch (err) {
      console.error('Move file failed:', err);
    }
  };

  // Helpers
  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className={`w-full min-h-screen p-4 sm:p-6 md:p-8 space-y-6 transition-colors duration-300 ${
      isDarkTheme ? 'bg-[#1A0F02] text-amber-100' : 'bg-[#FFFBF5] text-amber-950'
    }`}>

      {/* Header Banner */}
      <div className={`p-6 sm:p-8 rounded-3xl border backdrop-blur-md relative overflow-hidden transition ${
        isDarkTheme 
          ? 'bg-amber-500/5 border-amber-500/30 shadow-[0_0_40px_rgba(244,238,142,0.1)]' 
          : 'bg-white/80 border-amber-800/20 shadow-[0_4px_25px_rgba(0,0,0,0.05)]'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2.5 rounded-2xl border ${
                isDarkTheme ? 'bg-amber-500/10 border-amber-500/30 text-[#F4EE8E]' : 'bg-amber-100 border-amber-800/20 text-amber-950'
              }`}>
                <ImageIcon className="w-6 h-6" />
              </div>
              <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'
              }`}>
                Галерея файлов & Storage RR
              </h1>
            </div>
            <p className={`text-sm font-medium ${isDarkTheme ? 'text-amber-200/70' : 'text-amber-900/80'}`}>
              Централизованное автономное хранилище медиа-файлов, документов и коротких ссылок PostgreSQL BD ProTalk (`/file/:id`)
            </p>
          </div>

          {/* RR Token Config Box */}
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-md w-full ${
            isDarkTheme ? 'bg-black/40 border-amber-500/30' : 'bg-amber-50 border-amber-800/20'
          }`}>
            <Key className="w-4 h-4 text-[#E7C768] shrink-0 hidden sm:block" />
            <input 
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Токен RR..."
              className={`flex-1 px-3 py-1.5 rounded-xl border font-mono text-xs focus:outline-none ${
                isDarkTheme ? 'bg-[#1A0F02] border-amber-500/30 text-amber-100' : 'bg-white border-amber-800/30 text-amber-950'
              }`}
            />
            <button
              type="button"
              onClick={handleSaveToken}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition ${
                tokenSaved
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-slate-900 hover:brightness-110'
              }`}
            >
              {tokenSaved ? <Check className="w-3.5 h-3.5" /> : null}
              <span>{tokenSaved ? 'Сохранено' : 'Сохранить'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-slate-900 font-bold text-xs shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom duration-200">
          <Sparkles className="w-4 h-4 text-slate-900" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Dropzone Upload Area */}
      <DropzoneUploader 
        folderId={typeof selectedFolderId === 'number' ? selectedFolderId : null}
        onUploadSuccess={() => {
          showToast('Файлы успешно загружены и зарегистрированы');
          loadGalleryData();
        }}
        isDarkTheme={isDarkTheme}
      />

      {/* Toolbar & Folders Bar */}
      <div className={`p-5 rounded-3xl border backdrop-blur-md space-y-4 ${
        isDarkTheme ? 'bg-amber-500/5 border-amber-500/30' : 'bg-white/80 border-amber-800/20'
      }`}>
        {/* Top Controls: Search, Owner Filter & Folder Actions */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search & Owner Filter */}
          <div className="flex flex-col sm:flex-row items-center gap-2 flex-1 max-w-2xl">
            {/* Search Bar */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-60" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по названию, ключу или автору..."
                className={`w-full pl-10 pr-4 py-2 rounded-2xl border text-xs font-mono focus:outline-none transition ${
                  isDarkTheme ? 'bg-[#1A0F02] border-amber-500/30 text-amber-100 focus:border-[#E7C768]' : 'bg-white border-amber-800/30 text-amber-950 focus:border-amber-800'
                }`}
              />
            </div>

            {/* Owner Filter Dropdown */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <div className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl border text-xs font-mono ${
                isDarkTheme ? 'bg-[#1A0F02] border-amber-500/30 text-amber-200' : 'bg-white border-amber-800/30 text-amber-950'
              }`}>
                <User className="w-3.5 h-3.5 text-[#E7C768] shrink-0" />
                <select
                  value={selectedOwnerId}
                  onChange={(e) => setSelectedOwnerId(e.target.value)}
                  className="bg-transparent focus:outline-none text-xs cursor-pointer max-w-[150px] truncate"
                >
                  <option value="all" className={isDarkTheme ? 'bg-[#1A0F02] text-amber-100' : 'bg-white text-amber-950'}>
                    Все авторы ({owners.reduce((acc, o) => acc + o.file_count, 0)})
                  </option>
                  {owners.map(owner => (
                    <option 
                      key={owner.id} 
                      value={owner.id}
                      className={isDarkTheme ? 'bg-[#1A0F02] text-amber-100' : 'bg-white text-amber-950'}
                    >
                      {owner.name} ({owner.file_count})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFolderModal(true)}
              className="px-4 py-2 rounded-2xl font-bold text-xs bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-slate-900 hover:brightness-110 flex items-center gap-1.5 transition cursor-pointer shadow-sm"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Создать папку</span>
            </button>

            <button
              type="button"
              onClick={loadGalleryData}
              className={`p-2 rounded-2xl border transition cursor-pointer ${
                isDarkTheme ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20' : 'bg-amber-100 border-amber-800/20 text-amber-900 hover:bg-amber-200'
              }`}
              title="Обновить список"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Folders Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-2">
          <button
            type="button"
            onClick={() => setSelectedFolderId('all')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 border ${
              selectedFolderId === 'all'
                ? 'bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-slate-900 border-transparent shadow-md'
                : isDarkTheme 
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-200 hover:bg-amber-500/20' 
                  : 'bg-white border-amber-800/20 text-amber-950 hover:bg-amber-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Все файлы</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedFolderId('root')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 border ${
              selectedFolderId === 'root'
                ? 'bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-slate-900 border-transparent shadow-md'
                : isDarkTheme 
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-200 hover:bg-amber-500/20' 
                  : 'bg-white border-amber-800/20 text-amber-950 hover:bg-amber-100'
            }`}
          >
            <Folder className="w-3.5 h-3.5" />
            <span>Без папки (Корень)</span>
          </button>

          {folders.map(folder => (
            <div key={folder.id} className="relative group flex items-center">
              <button
                type="button"
                onClick={() => setSelectedFolderId(folder.id)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-2 border ${
                  selectedFolderId === folder.id
                    ? 'bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-slate-900 border-transparent shadow-md'
                    : isDarkTheme 
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-200 hover:bg-amber-500/20' 
                      : 'bg-white border-amber-800/20 text-amber-950 hover:bg-amber-100'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: folder.color || '#E7C768' }} />
                <FolderOpen className="w-3.5 h-3.5" />
                <span>{folder.name}</span>
              </button>

              <button
                type="button"
                onClick={() => openDeleteModal('folder', folder.id)}
                className="ml-1 p-1 rounded-full text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition"
                title="Удалить папку"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Batch Actions Bar (when items are selected) */}
        {selectedFileIds.length > 0 && (
          <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-xs font-bold text-[#E7C768]">
              <CheckSquare className="w-4 h-4" />
              <span>Выбрано элементов: {selectedFileIds.length} из {files.length}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMoveModalOpen(true)}
                className="px-3 py-1.5 rounded-xl font-bold text-xs bg-amber-500/20 text-amber-200 border border-amber-500/40 hover:bg-amber-500/30 flex items-center gap-1.5 cursor-pointer"
              >
                <MoveRight className="w-3.5 h-3.5" />
                <span>Переместить массово</span>
              </button>

              <button
                type="button"
                onClick={() => openDeleteModal('batch')}
                className="px-3 py-1.5 rounded-xl font-bold text-xs bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Удалить массово</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFileIds([])}
                className="px-2 py-1.5 rounded-xl text-xs font-mono opacity-60 hover:opacity-100"
              >
                Сбросить
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Select All Controls */}
      {files.length > 0 && (
        <div className="flex items-center justify-between px-2 text-xs font-mono opacity-80">
          <button
            type="button"
            onClick={handleSelectAll}
            className="flex items-center gap-2 hover:text-[#E7C768] cursor-pointer"
          >
            {selectedFileIds.length === files.length ? <CheckSquare className="w-4 h-4 text-[#E7C768]" /> : <Square className="w-4 h-4" />}
            <span>{selectedFileIds.length === files.length ? 'Снять выделение со всех' : 'Выделить все файлы'}</span>
          </button>
          <span>Найдено файлов: {files.length}</span>
        </div>
      )}

      {/* Files Grid */}
      {files.length === 0 ? (
        <div className={`p-12 text-center rounded-3xl border ${
          isDarkTheme ? 'bg-amber-500/5 border-amber-500/20 text-amber-200/60' : 'bg-white/60 border-amber-800/20 text-amber-900/60'
        }`}>
          <ImageIcon className="w-12 h-12 mx-auto mb-3 text-[#E7C768] opacity-50" />
          <p className="text-sm font-bold">В этой папке пока нет загруженных файлов</p>
          <p className="text-xs mt-1">Воспользуйтесь областью загрузки выше для добавления файлов</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {files.map(file => {
            const isSelected = selectedFileIds.includes(file.id);
            const nameLower = (file.name || '').toLowerCase();
            const mimeLower = (file.mime_type || '').toLowerCase();

            const isAud = Boolean(
              mimeLower.startsWith('audio/') || 
              /\.(mp3|wav|ogg|m4a|aac|flac|wma|weba|opus|caf)$/i.test(nameLower) ||
              (/\.webm$/i.test(nameLower) && (mimeLower.includes('audio') || !mimeLower.startsWith('video/'))) ||
              ((nameLower.includes('voice') || nameLower.includes('voisesite') || nameLower.includes('audio')) && !mimeLower.startsWith('image/'))
            );

            const isVid = Boolean(
              !isAud && (
                mimeLower.startsWith('video/') || 
                /\.(mp4|mov|avi|mkv|flv|wmv)$/i.test(nameLower) ||
                (/\.webm$/i.test(nameLower) && mimeLower.startsWith('video/'))
              )
            );

            const isImg = Boolean(
              !isAud && !isVid && (
                mimeLower.startsWith('image/') || 
                /\.(png|jpg|jpeg|gif|svg|webp|ico|bmp|tiff)$/i.test(nameLower)
              )
            );

            const formattedPath = getFileFormattedUrl(file);
            const isCopied = copiedFileId === file.id;

            return (
              <div
                key={file.id}
                className={`group relative rounded-2xl border p-3 flex flex-col justify-between transition-all duration-200 backdrop-blur-md ${
                  isSelected 
                    ? 'border-[#E7C768] bg-[#E7C768]/10 ring-2 ring-[#E7C768]/30 scale-[1.01]' 
                    : isDarkTheme
                      ? 'bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40'
                      : 'bg-white/80 hover:bg-white border-amber-800/20 hover:border-amber-800/40 shadow-sm'
                }`}
              >
                {/* Select Checkbox & Key / Type badge */}
                <div className="flex items-center justify-between mb-2 z-10">
                  <button
                    type="button"
                    onClick={() => toggleSelectFile(file.id)}
                    className="p-1 text-[#E7C768] cursor-pointer"
                  >
                    {isSelected ? <CheckSquare className="w-4 h-4 text-[#E7C768]" /> : <Square className="w-4 h-4 opacity-50 hover:opacity-100" />}
                  </button>

                  <div className="flex items-center gap-1">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                      isAud 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                        : isVid 
                          ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                          : isImg 
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                            : 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                    }`}>
                      {isAud ? 'Аудио' : isVid ? 'Видео' : isImg ? 'Изобр' : 'Файл'}
                    </span>

                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md border ${
                      isDarkTheme ? 'bg-black/40 border-amber-500/30 text-[#F4EE8E]' : 'bg-amber-100 border-amber-800/20 text-amber-950 font-bold'
                    }`}>
                      {file.file_key}
                    </span>
                  </div>
                </div>

                {/* Preview Thumbnail */}
                <div 
                  onClick={() => setPreviewFile(file)}
                  className={`w-full h-36 rounded-xl overflow-hidden mb-3 flex items-center justify-center cursor-pointer border ${
                    isDarkTheme ? 'border-amber-500/20' : 'border-amber-800/15'
                  }`}
                  style={isImg ? {
                    backgroundImage: `
                      linear-gradient(45deg, #cbd5e1 25%, transparent 25%), 
                      linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), 
                      linear-gradient(45deg, transparent 75%, #cbd5e1 75%), 
                      linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)
                    `,
                    backgroundSize: '14px 14px',
                    backgroundPosition: '0 0, 0 7px, 7px -7px, -7px 0px',
                    backgroundColor: '#ffffff'
                  } : undefined}
                >
                  {isImg ? (
                    <img 
                      src={formattedPath} 
                      alt={file.name}
                      className="w-full h-full object-contain p-2 group-hover:scale-105 transition duration-300"
                    />
                  ) : isVid ? (
                    <div className="flex flex-col items-center gap-1.5">
                      <Video className="w-10 h-10 text-[#E7C768]" />
                      <span className="text-[10px] font-bold opacity-60">Видеофайл</span>
                    </div>
                  ) : isAud ? (
                    <div className="flex flex-col items-center gap-1.5">
                      <Music className="w-10 h-10 text-[#E7C768]" />
                      <span className="text-[10px] font-bold opacity-60">Аудиозапись</span>
                    </div>
                  ) : (
                    <FileText className="w-10 h-10 text-[#E7C768]" />
                  )}
                </div>

                {/* File Title & Details */}
                <div className="space-y-1.5 mb-3">
                  <h4 
                    onClick={() => setPreviewFile(file)}
                    className={`text-xs font-bold truncate cursor-pointer hover:underline ${
                      isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'
                    }`}
                    title={file.name}
                  >
                    {file.name}
                  </h4>

                  {/* Owner Info Badge */}
                  <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[10px] ${
                    isDarkTheme ? 'bg-amber-500/5 border-amber-500/20 text-amber-200/80' : 'bg-amber-50 border-amber-800/15 text-amber-900'
                  }`}>
                    <User className="w-3 h-3 text-[#E7C768] shrink-0" />
                    <span className="truncate font-medium">{file.owner_name || file.owner_id || 'Администратор'}</span>
                  </div>

                  {/* Formatted Short URL Pill on Card */}
                  <div 
                    onClick={(e) => handleCopyUrl(file, e)}
                    className={`flex items-center justify-between gap-1 px-2 py-1 rounded-lg border cursor-pointer transition text-[10px] font-mono ${
                      isCopied 
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : isDarkTheme 
                          ? 'bg-black/40 border-amber-500/30 text-amber-200/90 hover:border-amber-400/60 hover:text-white' 
                          : 'bg-amber-50 border-amber-800/20 text-amber-900 hover:bg-amber-100'
                    }`}
                    title="Нажмите, чтобы скопировать ссылку с ЧПУ"
                  >
                    <span className="truncate max-w-[130px] font-mono">{formattedPath}</span>
                    {isCopied ? <Check className="w-3 h-3 text-emerald-400 shrink-0" /> : <Copy className="w-3 h-3 opacity-60 hover:opacity-100 shrink-0" />}
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono opacity-60 pt-0.5">
                    <span>{formatBytes(file.file_size)}</span>
                    <span className="truncate max-w-[100px]">{file.mime_type || 'file'}</span>
                  </div>

                  {/* Multi-folder Badges */}
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    {folders
                      .filter(f => (file.folder_ids || (file.folder_id ? [file.folder_id] : [])).includes(f.id))
                      .map(f => (
                        <span 
                          key={f.id} 
                          className="px-1.5 py-0.5 rounded-md text-[9px] font-bold text-slate-900 shadow-sm flex items-center gap-1"
                          style={{ backgroundColor: f.color || '#E7C768' }}
                        >
                          <Folder className="w-2.5 h-2.5" />
                          <span>{f.name}</span>
                        </span>
                      ))
                    }
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="pt-2 border-t border-amber-500/10 flex items-center justify-between gap-1 text-[11px]">
                  {/* Single Folder Move Selector */}
                  <select
                    value={file.folder_id || ''}
                    onChange={(e) => handleSingleMove(file.id, e.target.value ? Number(e.target.value) : null)}
                    className={`px-1.5 py-1 rounded-lg border font-mono text-[10px] focus:outline-none max-w-[90px] truncate ${
                      isDarkTheme ? 'bg-[#1A0F02] border-amber-500/30 text-amber-200' : 'bg-white border-amber-800/20 text-amber-950'
                    }`}
                  >
                    <option value="">Без папки</option>
                    {folders.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPreviewFile(file)}
                      className={`p-1.5 rounded-lg border transition cursor-pointer ${
                        isDarkTheme ? 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20 text-amber-300' : 'bg-amber-100 border-amber-800/20 text-amber-900 hover:bg-amber-200'
                      }`}
                      title="Предпросмотр"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => openDeleteModal('single', file.id)}
                      className="p-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 cursor-pointer transition"
                      title="Удалить файл"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreviewModal 
          file={previewFile}
          onClose={() => setPreviewFile(null)}
          isDarkTheme={isDarkTheme}
        />
      )}

      {/* Create Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-4 backdrop-blur-xl ${
            isDarkTheme ? 'bg-[#1A0F02]/95 border-amber-500/40 text-amber-100' : 'bg-white border-amber-800/30 text-amber-950'
          }`}>
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-[#E7C768]" />
                <span>Создание папки галереи</span>
              </h3>
              <button type="button" onClick={() => setShowFolderModal(false)} className="opacity-60 hover:opacity-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-mono mb-1 opacity-80">Название папки</label>
                <input 
                  type="text"
                  required
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Например: Иконки приложения"
                  className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                    isDarkTheme ? 'bg-black/40 border-amber-500/30 text-amber-100' : 'bg-amber-50 border-amber-800/30 text-amber-950'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-mono mb-1 opacity-80">Цветовой маркер</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="color"
                    value={newFolderColor}
                    onChange={(e) => setNewFolderColor(e.target.value)}
                    className="w-10 h-10 rounded-xl border-none cursor-pointer bg-transparent"
                  />
                  <span className="font-mono text-xs">{newFolderColor}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFolderModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-amber-500/20 hover:bg-amber-500/10"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-bold text-xs bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-slate-900 hover:brightness-110 cursor-pointer"
                >
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-4 backdrop-blur-xl ${
            isDarkTheme ? 'bg-[#1A0F02]/95 border-amber-500/40 text-amber-100' : 'bg-white border-amber-800/30 text-amber-950'
          }`}>
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold">Подтверждение удаления</h3>
                <p className="text-xs opacity-70">
                  {deleteType === 'single' && 'Вы действительно хотите удалить выбранный файл из базы?'}
                  {deleteType === 'batch' && `Вы действительно хотите удалить ${selectedFileIds.length} выделенных файлов?`}
                  {deleteType === 'folder' && 'Вы действительно хотите удалить эту папку? Файлы из неё перенесутся в корень.'}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-amber-500/20">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-amber-500/20 hover:bg-amber-500/10"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={executeDelete}
                className="px-5 py-2 rounded-xl font-bold text-xs bg-red-600 hover:bg-red-500 text-white shadow-lg cursor-pointer"
              >
                Да, удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mass Move Modal */}
      {moveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-4 backdrop-blur-xl ${
            isDarkTheme ? 'bg-[#1A0F02]/95 border-amber-500/40 text-amber-100' : 'bg-white border-amber-800/30 text-amber-950'
          }`}>
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <MoveRight className="w-5 h-5 text-[#E7C768]" />
                <span>Массовое перемещение ({selectedFileIds.length} шт)</span>
              </h3>
              <button type="button" onClick={() => setMoveModalOpen(false)} className="opacity-60 hover:opacity-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-mono mb-2 opacity-80">Выберите целевую папку:</label>
              <select
                value={targetMoveFolderId || ''}
                onChange={(e) => setTargetMoveFolderId(e.target.value ? Number(e.target.value) : null)}
                className={`w-full px-3 py-2 rounded-xl border text-xs font-mono focus:outline-none ${
                  isDarkTheme ? 'bg-black/40 border-amber-500/30 text-amber-100' : 'bg-amber-50 border-amber-800/30 text-amber-950'
                }`}
              >
                <option value="">Без папки (В корень)</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-amber-500/20">
              <button
                type="button"
                onClick={() => setMoveModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-amber-500/20 hover:bg-amber-500/10"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={executeMassMove}
                className="px-5 py-2 rounded-xl font-bold text-xs bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-slate-900 hover:brightness-110 cursor-pointer"
              >
                Переместить
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
