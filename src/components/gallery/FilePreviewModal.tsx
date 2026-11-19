import React, { useState } from 'react';
import { X, Copy, ExternalLink, HardDrive, FileText, Calendar, Check, Image as ImageIcon, Video, Music, User } from 'lucide-react';
import { FileRecord, getFileFormattedUrl, slugifyFileName } from '../../services/FileUploadService';

interface FilePreviewModalProps {
  file: FileRecord | null;
  onClose: () => void;
  isDarkTheme?: boolean;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, onClose, isDarkTheme = true }) => {
  const [copied, setCopied] = useState(false);
  if (!file) return null;

  const formattedUrl = getFileFormattedUrl(file, window.location.origin);
  const formattedPath = getFileFormattedUrl(file);

  const nameLower = (file.name || '').toLowerCase();
  const mimeLower = (file.mime_type || '').toLowerCase();

  const isAudio = Boolean(
    mimeLower.startsWith('audio/') || 
    /\.(mp3|wav|ogg|m4a|aac|flac|wma|weba|opus|caf)$/i.test(nameLower) ||
    (/\.webm$/i.test(nameLower) && (mimeLower.includes('audio') || !mimeLower.startsWith('video/'))) ||
    ((nameLower.includes('voice') || nameLower.includes('voisesite') || nameLower.includes('audio')) && !mimeLower.startsWith('image/'))
  );

  const isVideo = Boolean(
    !isAudio && (
      mimeLower.startsWith('video/') || 
      /\.(mp4|mov|avi|mkv|flv|wmv)$/i.test(nameLower) ||
      (/\.webm$/i.test(nameLower) && mimeLower.startsWith('video/'))
    )
  );

  const isImage = Boolean(
    !isAudio && !isVideo && (
      mimeLower.startsWith('image/') || 
      /\.(png|jpg|jpeg|gif|svg|webp|ico|bmp|tiff)$/i.test(nameLower)
    )
  );

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className={`relative w-full max-w-3xl rounded-3xl p-6 shadow-2xl overflow-hidden border backdrop-blur-xl transition-all ${
        isDarkTheme 
          ? 'bg-[#1A0F02]/90 border-amber-500/40 text-amber-100 shadow-[0_0_50px_rgba(244,238,142,0.15)]' 
          : 'bg-white/90 border-amber-800/30 text-amber-950 shadow-[0_10px_40px_rgba(0,0,0,0.1)]'
      }`}>
        
        {/* Close Button */}
        <button 
          type="button"
          onClick={onClose}
          className={`absolute top-4 right-4 p-2.5 rounded-full border transition cursor-pointer ${
            isDarkTheme 
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20 hover:text-white' 
              : 'bg-amber-100/80 border-amber-800/20 text-amber-900 hover:bg-amber-200'
          }`}
          title="Закрыть"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="pr-12 mb-4">
          <h3 className={`text-lg font-bold truncate ${isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
            {file.name}
          </h3>
          <p className="text-[11px] font-mono opacity-70">
            Ключ: <span className="font-bold text-[#E7C768]">{file.file_key}</span> | ID: #{file.id} | Тип: <span className="font-bold text-[#E7C768]">{isAudio ? 'Аудио' : isVideo ? 'Видео' : isImage ? 'Изображение' : 'Документ'}</span>
          </p>
        </div>

        {/* Preview Container */}
        <div className={`relative w-full h-72 rounded-2xl overflow-hidden flex items-center justify-center border mb-5 ${
          isDarkTheme ? 'bg-black/40 border-amber-500/20' : 'bg-amber-50/50 border-amber-800/20'
        }`}>
          {isImage ? (
            /* High-contrast checkerboard pattern for transparent PNG verification */
            <div 
              className="w-full h-full flex items-center justify-center p-4 rounded-xl overflow-hidden"
              style={{
                backgroundImage: `
                  linear-gradient(45deg, #cbd5e1 25%, transparent 25%), 
                  linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), 
                  linear-gradient(45deg, transparent 75%, #cbd5e1 75%), 
                  linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)
                `,
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                backgroundColor: '#ffffff'
              }}
            >
              <img 
                src={formattedPath} 
                alt={file.name} 
                className="max-h-full max-w-full object-contain drop-shadow-md rounded-lg"
              />
            </div>
          ) : isVideo ? (
            <video src={formattedPath} controls className="max-h-full max-w-full rounded-lg" />
          ) : isAudio ? (
            <div className="flex flex-col items-center gap-4 w-4/5">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                <Music className="w-12 h-12 text-[#E7C768]" />
              </div>
              <audio src={formattedPath} controls className="w-full" />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 opacity-60">
              <FileText className="w-16 h-16 text-[#E7C768]" />
              <span className="text-xs font-mono">Предпросмотр недоступен для этого типа</span>
            </div>
          )}
        </div>

        {/* File Metadata with Owner Info */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5 text-xs">
          <div className={`flex items-center gap-2.5 p-2.5 rounded-xl border ${
            isDarkTheme ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-800/20'
          }`}>
            <User className="w-4 h-4 text-[#E7C768] shrink-0" />
            <div className="min-w-0">
              <div className="text-[9px] opacity-60 uppercase font-mono">Владелец</div>
              <div className="font-bold font-mono truncate">{file.owner_name || file.owner_id || 'Администратор'}</div>
            </div>
          </div>

          <div className={`flex items-center gap-2.5 p-2.5 rounded-xl border ${
            isDarkTheme ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-800/20'
          }`}>
            <HardDrive className="w-4 h-4 text-[#E7C768] shrink-0" />
            <div className="min-w-0">
              <div className="text-[9px] opacity-60 uppercase font-mono">Размер</div>
              <div className="font-bold font-mono">{formatBytes(file.file_size)}</div>
            </div>
          </div>

          <div className={`flex items-center gap-2.5 p-2.5 rounded-xl border ${
            isDarkTheme ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-800/20'
          }`}>
            <FileText className="w-4 h-4 text-[#E7C768] shrink-0" />
            <div className="min-w-0">
              <div className="text-[9px] opacity-60 uppercase font-mono">MIME-тип</div>
              <div className="font-bold font-mono truncate">{file.mime_type || 'unknown'}</div>
            </div>
          </div>

          <div className={`flex items-center gap-2.5 p-2.5 rounded-xl border ${
            isDarkTheme ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-800/20'
          }`}>
            <Calendar className="w-4 h-4 text-[#E7C768] shrink-0" />
            <div className="min-w-0">
              <div className="text-[9px] opacity-60 uppercase font-mono">Загружен</div>
              <div className="font-bold font-mono truncate">
                {file.created_at ? new Date(file.created_at).toLocaleDateString('ru-RU') : 'Сегодня'}
              </div>
            </div>
          </div>
        </div>

        {/* Links & Quick Actions */}
        <div className="space-y-3">
          {file.original_url && (
            <div className="flex flex-col sm:flex-row gap-2">
              <div className={`flex-1 flex items-center border rounded-xl px-3 py-2 ${
                isDarkTheme ? 'bg-black/40 border-amber-500/30' : 'bg-white border-amber-800/30'
              }`}>
                <input
                  readOnly
                  value={file.original_url}
                  aria-label="Прямая оригинальная ссылка"
                  className={`bg-transparent text-sm font-mono w-full focus:outline-none ${
                    isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950 font-bold'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(file.original_url)}
                  className={`ml-2 px-3 py-1.5 rounded-lg border transition cursor-pointer flex items-center gap-1 text-sm font-bold shrink-0 ${
                    copied
                      ? 'bg-[#F4EE8E] text-amber-950 border-amber-400'
                      : isDarkTheme
                        ? 'bg-amber-500/15 border-amber-500/35 text-[#F4EE8E] hover:bg-amber-500/25'
                        : 'bg-amber-100 border-amber-800/25 text-amber-950 hover:bg-amber-200'
                  }`}
                  title="Копировать прямую ссылку"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Скопировано!' : 'Прямая ссылка'}</span>
                </button>
              </div>

              <a
                href={file.original_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-amber-950 hover:brightness-110 transition cursor-pointer shadow-md shrink-0"
              >
                <span>Оригинал</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

          <div className={`flex items-center border rounded-xl px-3 py-2 ${
            isDarkTheme ? 'bg-black/30 border-amber-500/20' : 'bg-white/80 border-amber-800/20'
          }`}>
            <input
              readOnly
              value={formattedUrl}
              aria-label="Короткая ссылка галереи"
              className={`bg-transparent text-sm font-mono w-full focus:outline-none ${
                isDarkTheme ? 'text-amber-200/80' : 'text-amber-900'
              }`}
            />
            <button
              type="button"
              onClick={() => copyToClipboard(formattedUrl)}
              className={`ml-2 px-3 py-1.5 rounded-lg border transition cursor-pointer flex items-center gap-1 text-sm font-bold shrink-0 ${
                isDarkTheme
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-200 hover:bg-amber-500/20'
                  : 'bg-amber-100 border-amber-800/20 text-amber-950 hover:bg-amber-200'
              }`}
              title="Копировать короткую ссылку"
            >
              <Copy className="w-4 h-4" />
              <span>Копировать</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
