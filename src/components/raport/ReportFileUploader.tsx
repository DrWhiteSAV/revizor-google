import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, X, Loader2, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { FileUploadService } from '../../services/FileUploadService';

interface ReportFileUploaderProps {
  value?: any;
  onChange: (fileData: { url: string; name: string; size?: number; type?: string } | null) => void;
  isLightTheme: boolean;
  label?: string;
  accept?: string;
}

export const ReportFileUploader: React.FC<ReportFileUploaderProps> = ({
  value,
  onChange,
  isLightTheme,
  label = 'Прикрепить файл или фото',
  accept = '*/*'
}) => {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isCancelledRef = useRef<boolean>(false);

  const fileService = new FileUploadService();

  const handleCancelUpload = () => {
    isCancelledRef.current = true;
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setUploadError('Загрузка файла отменена пользователем.');
  };

  const handleUploadFile = async (file: File) => {
    if (!file) return;
    isCancelledRef.current = false;
    setIsUploading(true);
    setUploadError(null);

    try {
      const url = await fileService.uploadFromFile(file);
      if (isCancelledRef.current) return;

      if (url) {
        onChange({
          url,
          name: file.name,
          size: file.size,
          type: file.type
        });
      } else {
        // Fallback: create local object URL if cloud storage upload had an issue
        const localUrl = URL.createObjectURL(file);
        if (isCancelledRef.current) return;
        onChange({
          url: localUrl,
          name: file.name,
          size: file.size,
          type: file.type
        });
      }
    } catch (e: any) {
      if (isCancelledRef.current) return;
      console.error('File upload error:', e);
      // Fallback to local object URL
      try {
        const localUrl = URL.createObjectURL(file);
        if (isCancelledRef.current) return;
        onChange({
          url: localUrl,
          name: file.name,
          size: file.size,
          type: file.type
        });
      } catch (err) {
        if (!isCancelledRef.current) {
          setUploadError('Не удалось загрузить файл. Попробуйте еще раз.');
        }
      }
    } finally {
      if (!isCancelledRef.current) {
        setIsUploading(false);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUploadFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1 || items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          e.stopPropagation();
          handleUploadFile(file);
          return;
        }
      }
    }
  };

  const isImage = value?.type?.startsWith('image/') || 
    (typeof value?.url === 'string' && (value.url.endsWith('.png') || value.url.endsWith('.jpg') || value.url.endsWith('.jpeg') || value.url.endsWith('.webp')));

  return (
    <div className="w-full space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />

      {value?.url ? (
        <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
          isLightTheme 
            ? 'bg-amber-50/80 border-amber-300 text-zinc-900' 
            : 'bg-white/5 border-amber-400/40 text-amber-100'
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            {isImage ? (
              <img
                src={value.url}
                alt={value.name || 'Прикрепленный файл'}
                className="w-12 h-12 rounded-xl object-cover border border-amber-400/50 shrink-0"
              />
            ) : (
              <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${
                isLightTheme ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-amber-400/20 border-amber-400/40 text-[#F4EE8E]'
              }`}>
                <FileText size={20} />
              </div>
            )}

            <div className="min-w-0">
              <div className="text-sm font-bold truncate max-w-[200px] sm:max-w-xs">
                {value.name || 'прикрепленный файл'}
              </div>
              <div className="text-sm opacity-80 flex items-center gap-1.5">
                <CheckCircle size={15} className="text-amber-500" />
                <span>файл успешно прикреплен</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <a
              href={value.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`min-h-[44px] min-w-[44px] p-2 rounded-xl border flex items-center justify-center transition-all ${
                isLightTheme ? 'border-amber-300 text-zinc-700 hover:bg-amber-100' : 'border-amber-400/30 text-amber-200 hover:bg-white/10'
              }`}
              title="открыть файл"
            >
              <ExternalLink size={16} />
            </a>

            <button
              type="button"
              onClick={() => onChange(null)}
              className={`min-h-[44px] min-w-[44px] p-2 rounded-xl border flex items-center justify-center transition-all ${
                isLightTheme ? 'border-amber-400 bg-amber-100/60 text-amber-950 hover:bg-amber-200' : 'border-amber-400/40 bg-amber-950/40 text-amber-200 hover:bg-amber-900/40'
              }`}
              title="удалить файл"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div
          tabIndex={0}
          onPaste={handlePaste}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`p-4 sm:p-5 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 min-h-[120px] text-center focus:outline-none focus:ring-1 focus:ring-amber-400/60 select-none ${
            dragActive
              ? (isLightTheme ? 'border-amber-500 bg-amber-100/60' : 'border-amber-300 bg-amber-400/20')
              : (isLightTheme ? 'border-amber-300/80 hover:border-amber-400 bg-amber-50/40' : 'border-amber-400/40 hover:border-amber-400/80 bg-white/5')
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="flex items-center gap-2 text-sm font-bold text-amber-500">
                <Loader2 size={20} className="animate-spin" />
                <span>загрузка файла в систему...</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancelUpload();
                }}
                className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-950 dark:text-[#F4EE8E] text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                title="отменить процесс загрузки файла"
              >
                <X size={15} />
                <span>отменить загрузку</span>
              </button>
            </div>
          ) : (
            <>
              <div className={`p-3 rounded-2xl border ${
                isLightTheme ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-amber-400/15 border-amber-400/40 text-[#F4EE8E]'
              }`}>
                <Upload size={22} />
              </div>
              <div>
                <span className="text-sm font-bold block mb-1">{label}</span>
                <span className="text-sm opacity-80 block max-w-sm mx-auto leading-relaxed">
                  перетащите файл сюда, нажмите кнопку выбора или вставьте скриншот сочетанием клавиш (Ctrl+V)
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className={`min-h-[44px] px-4 py-2 rounded-xl font-bold text-sm border transition-all cursor-pointer flex items-center gap-2 shadow-sm active:scale-95 ${
                    isLightTheme
                      ? 'bg-amber-400 hover:bg-amber-500 text-amber-950 border-amber-500'
                      : 'bg-gradient-to-r from-[#F4EE8E] to-[#E7C768] text-[#140A01] border-[#E7C768]'
                  }`}
                >
                  <Upload size={16} />
                  <span>выбрать файл</span>
                </button>

                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      if (navigator.clipboard?.read) {
                        const clipboardItems = await navigator.clipboard.read();
                        for (const item of clipboardItems) {
                          const imageType = item.types.find(t => t.startsWith('image/'));
                          if (imageType) {
                            const blob = await item.getType(imageType);
                            const file = new File([blob], `screenshot_${Date.now().toString().slice(-4)}.png`, { type: imageType });
                            await handleUploadFile(file);
                            return;
                          }
                        }
                      }
                    } catch (err) {
                      // Fallback hint for user
                    }
                    setUploadError('нажмите комбинацию Ctrl+V для вставки скриншота из буфера обмена');
                  }}
                  className={`min-h-[44px] px-4 py-2 rounded-xl font-semibold text-sm border transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                    isLightTheme
                      ? 'border-amber-400 bg-amber-100/50 hover:bg-amber-200/60 text-amber-950'
                      : 'border-amber-400/40 bg-white/5 hover:bg-white/10 text-amber-200'
                  }`}
                  title="вставить скриншот из буфера обмена"
                >
                  <ImageIcon size={16} />
                  <span>вставить (Ctrl+V)</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {uploadError && (
        <div className="text-sm font-semibold text-amber-800 dark:text-amber-300">{uploadError}</div>
      )}
    </div>
  );
};
export default ReportFileUploader;
