import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Upload, 
  FileText, 
  Link2, 
  CheckCircle, 
  X, 
  Loader2, 
  ExternalLink, 
  Sparkles, 
  Sheet, 
  Presentation, 
  FileCheck, 
  Globe, 
  HardDrive,
  Info
} from 'lucide-react';
import { FileUploadService } from '../../services/FileUploadService';
import { ReportField } from '../../types';

export interface ReportSmartFileValue {
  url?: string;
  name?: string;
  size?: number;
  type?: string;
  isGoogleLink?: boolean;
  detectedType?: string;
  sourceMode?: 'upload' | 'google_link';
}

interface ReportSmartFileInputProps {
  field: ReportField;
  value?: any;
  onChange: (data: ReportSmartFileValue | null) => void;
  isLightTheme: boolean;
  onAiFeedback?: (message: string) => void;
}

export const ReportSmartFileInput: React.FC<ReportSmartFileInputProps> = ({
  field,
  value,
  onChange,
  isLightTheme,
  onAiFeedback
}) => {
  // Normalize value
  const normalizedValue: ReportSmartFileValue | null = useMemo(() => {
    if (!value) return null;
    if (typeof value === 'string') {
      const isGoogle = value.includes('docs.google.com') || value.includes('drive.google.com');
      return {
        url: value,
        name: isGoogle ? 'Google Документ / Ссылка' : 'Интернет-ссылка',
        isGoogleLink: isGoogle,
        sourceMode: 'google_link'
      };
    }
    return value;
  }, [value]);

  const [activeTab, setActiveTab] = useState<'upload' | 'google_link'>(() => {
    if (normalizedValue?.sourceMode === 'google_link' || normalizedValue?.isGoogleLink) {
      return 'google_link';
    }
    return 'upload';
  });

  const [linkInput, setLinkInput] = useState<string>(() => {
    if (normalizedValue?.sourceMode === 'google_link' || normalizedValue?.isGoogleLink) {
      return normalizedValue.url || '';
    }
    return '';
  });

  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isCancelledRef = useRef<boolean>(false);
  const fileService = new FileUploadService();

  // Determine accepted file types based on field.type
  const acceptMime = useMemo(() => {
    switch (field.type) {
      case 'pdf':
        return '.pdf,application/pdf';
      case 'table':
        return '.xls,.xlsx,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv';
      case 'document':
        return '.doc,.docx,.txt,.rtf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'presentation':
        return '.ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation';
      default:
        return '*/*';
    }
  }, [field.type]);

  // Function to detect file type from link
  const detectFromLink = (url: string) => {
    if (!url) return null;
    const lower = url.toLowerCase();

    if (lower.includes('docs.google.com/spreadsheets') || lower.includes('.xlsx') || lower.includes('.csv')) {
      return {
        label: 'Google Таблица (Sheets / Excel)',
        icon: <Sheet size={16} className="text-amber-500" />,
        isGoogle: true,
        canAi: true
      };
    }
    if (lower.includes('docs.google.com/document') || lower.includes('.docx') || lower.includes('.doc')) {
      return {
        label: 'Google Документ (Docs / Word)',
        icon: <FileText size={16} className="text-amber-500" />,
        isGoogle: true,
        canAi: true
      };
    }
    if (lower.includes('docs.google.com/presentation') || lower.includes('.pptx') || lower.includes('.ppt')) {
      return {
        label: 'Google Презентация (Slides / PPTX)',
        icon: <Presentation size={16} className="text-amber-500" />,
        isGoogle: true,
        canAi: true
      };
    }
    if (lower.includes('drive.google.com/file') || lower.includes('.pdf')) {
      return {
        label: 'Файл Google Диск / PDF',
        icon: <FileCheck size={16} className="text-amber-500" />,
        isGoogle: true,
        canAi: true
      };
    }
    if (lower.includes('drive.google.com')) {
      return {
        label: 'Google Диск (папка / ресурс)',
        icon: <HardDrive size={16} className="text-amber-500" />,
        isGoogle: true,
        canAi: true
      };
    }

    return {
      label: 'Внешняя веб-ссылка',
      icon: <Globe size={16} className="text-amber-500" />,
      isGoogle: false,
      canAi: false
    };
  };

  // Function to detect file type from uploaded file
  const detectFromFile = (filename: string, mime?: string) => {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.pdf') || mime?.includes('pdf')) {
      return {
        label: 'PDF Документ',
        icon: <FileCheck size={16} className="text-amber-500" />,
        canAi: true
      };
    }
    if (lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv') || mime?.includes('sheet') || mime?.includes('excel') || mime?.includes('csv')) {
      return {
        label: 'Таблица Excel / CSV',
        icon: <Sheet size={16} className="text-amber-500" />,
        canAi: true
      };
    }
    if (lower.endsWith('.docx') || lower.endsWith('.doc') || lower.endsWith('.txt') || lower.endsWith('.rtf') || mime?.includes('word')) {
      return {
        label: 'Документ Word / Текст',
        icon: <FileText size={16} className="text-amber-500" />,
        canAi: true
      };
    }
    if (lower.endsWith('.pptx') || lower.endsWith('.ppt') || mime?.includes('presentation')) {
      return {
        label: 'Презентация PowerPoint',
        icon: <Presentation size={16} className="text-amber-500" />,
        canAi: true
      };
    }
    return {
      label: 'Файл данных',
      icon: <FileText size={16} className="text-amber-500" />,
      canAi: true
    };
  };

  const detectedLinkType = useMemo(() => {
    return detectFromLink(linkInput);
  }, [linkInput]);

  const handleApplyLink = (urlToApply: string) => {
    const trimmed = urlToApply.trim();
    if (!trimmed) {
      onChange(null);
      return;
    }

    const info = detectFromLink(trimmed);
    const finalUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://') 
      ? trimmed 
      : `https://${trimmed}`;

    onChange({
      url: finalUrl,
      name: info ? info.label : 'Ссылка Google',
      isGoogleLink: info ? info.isGoogle : false,
      detectedType: info ? info.label : undefined,
      sourceMode: 'google_link'
    });

    if (onAiFeedback) {
      onAiFeedback(
        info?.isGoogle 
          ? `Ссылка на ${info.label} прикреплена. Нейросеть проанализирует данные при наличии доступа.` 
          : 'Ссылка прикреплена к рапорту'
      );
    }
  };

  const handleCancelUpload = () => {
    isCancelledRef.current = true;
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setErrorMessage('Загрузка файла отменена.');
  };

  const handleUploadFile = async (file: File) => {
    if (!file) return;
    isCancelledRef.current = false;
    setIsUploading(true);
    setErrorMessage(null);

    const detected = detectFromFile(file.name, file.type);

    try {
      const url = await fileService.uploadFromFile(file);
      if (isCancelledRef.current) return;

      const fileUrl = url || URL.createObjectURL(file);
      onChange({
        url: fileUrl,
        name: file.name,
        size: file.size,
        type: file.type,
        detectedType: detected.label,
        sourceMode: 'upload'
      });

      if (onAiFeedback) {
        onAiFeedback(`${detected.label} успешно прикреплен для анализа нейросетью`);
      }
    } catch (e: any) {
      if (isCancelledRef.current) return;
      console.error('File upload error:', e);
      try {
        const localUrl = URL.createObjectURL(file);
        if (isCancelledRef.current) return;
        onChange({
          url: localUrl,
          name: file.name,
          size: file.size,
          type: file.type,
          detectedType: detected.label,
          sourceMode: 'upload'
        });
        if (onAiFeedback) {
          onAiFeedback(`${detected.label} прикреплен`);
        }
      } catch (err) {
        if (!isCancelledRef.current) {
          setErrorMessage('Не удалось загрузить файл. Попробуйте еще раз.');
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

  const handleClear = () => {
    setLinkInput('');
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full space-y-3">
      {/* Tab Switcher: Upload File vs Google Link */}
      <div className={`p-1 rounded-2xl border flex gap-1 ${
        isLightTheme ? 'bg-amber-50/70 border-amber-300' : 'bg-white/5 border-amber-400/40'
      }`}>
        <button
          type="button"
          onClick={() => {
            setActiveTab('upload');
          }}
          className={`flex-1 min-h-[44px] py-2 px-3 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'upload'
              ? isLightTheme
                ? 'bg-amber-400 text-amber-950 font-black shadow-sm border border-amber-500'
                : 'bg-gradient-to-r from-[#F4EE8E] to-[#E7C768] text-amber-950 font-black shadow-[0_0_15px_rgba(244,238,142,0.3)]'
              : isLightTheme
                ? 'text-amber-950 hover:bg-amber-100/60'
                : 'text-amber-200 hover:bg-white/5'
          }`}
        >
          <Upload size={16} className="shrink-0" />
          <span className="truncate">Загрузить файл</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('google_link');
          }}
          className={`flex-1 min-h-[44px] py-2 px-3 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'google_link'
              ? isLightTheme
                ? 'bg-amber-400 text-amber-950 font-black shadow-sm border border-amber-500'
                : 'bg-gradient-to-r from-[#F4EE8E] to-[#E7C768] text-amber-950 font-black shadow-[0_0_15px_rgba(244,238,142,0.3)]'
              : isLightTheme
                ? 'text-amber-950 hover:bg-amber-100/60'
                : 'text-amber-200 hover:bg-white/5'
          }`}
        >
          <Link2 size={16} className="shrink-0" />
          <span className="truncate">Ссылка Google Диск</span>
        </button>
      </div>

      {/* Tab 1: Upload File Mode */}
      {activeTab === 'upload' && (
        <div className="space-y-2.5">
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptMime}
            onChange={handleFileChange}
            className="hidden"
          />

          {normalizedValue?.url && normalizedValue.sourceMode !== 'google_link' ? (
            <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
              isLightTheme 
                ? 'bg-amber-50/90 border-amber-300 text-amber-950' 
                : 'bg-amber-950/30 border-amber-400/50 text-amber-100'
            }`}>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${
                  isLightTheme 
                    ? 'bg-amber-200/80 border-amber-400 text-amber-950' 
                    : 'bg-amber-400/20 border-amber-400/50 text-[#F4EE8E]'
                }`}>
                  <FileCheck size={22} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold truncate break-words">
                    {normalizedValue.name || 'Прикрепленный файл'}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {normalizedValue.detectedType && (
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${
                        isLightTheme 
                          ? 'bg-amber-200/80 border-amber-400 text-amber-950' 
                          : 'bg-amber-400/20 border-amber-400/40 text-[#F4EE8E]'
                      }`}>
                        <Sparkles size={11} className="text-amber-500 shrink-0" />
                        <span>{normalizedValue.detectedType}</span>
                      </span>
                    )}
                    {normalizedValue.size && (
                      <span className="text-xs opacity-75 font-mono">
                        {(normalizedValue.size / 1024).toFixed(0)} КБ
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={normalizedValue.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`min-h-[44px] min-w-[44px] p-2.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                    isLightTheme 
                      ? 'border-amber-300 text-amber-950 hover:bg-amber-100' 
                      : 'border-amber-400/40 text-amber-200 hover:bg-amber-400/20'
                  }`}
                  title="Просмотреть файл"
                >
                  <ExternalLink size={16} />
                </a>

                <button
                  type="button"
                  onClick={handleClear}
                  className={`min-h-[44px] min-w-[44px] p-2.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                    isLightTheme 
                      ? 'border-amber-400 bg-amber-100/80 text-amber-950 hover:bg-amber-200' 
                      : 'border-amber-400/50 bg-amber-950/40 text-amber-200 hover:bg-amber-900/40'
                  }`}
                  title="Удалить файл"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`p-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-2 min-h-[110px] text-center ${
                dragActive
                  ? isLightTheme ? 'border-amber-500 bg-amber-100/70' : 'border-amber-300 bg-amber-400/20'
                  : isLightTheme ? 'border-amber-300 hover:border-amber-400 bg-amber-50/50' : 'border-amber-400/40 hover:border-amber-400/80 bg-amber-950/20'
              }`}
            >
              {isUploading ? (
                <div className="flex flex-col items-center gap-2.5 py-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-amber-500">
                    <Loader2 size={20} className="animate-spin" />
                    <span>Загрузка файла в систему...</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelUpload();
                    }}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 ${
                      isLightTheme 
                        ? 'border-amber-400 bg-amber-100 text-amber-950 hover:bg-amber-200' 
                        : 'border-amber-400/50 bg-amber-950/50 text-amber-200 hover:bg-amber-900/50'
                    }`}
                  >
                    <X size={14} />
                    <span>Отменить загрузку</span>
                  </button>
                </div>
              ) : (
                <>
                  <div className={`p-2.5 rounded-xl border ${
                    isLightTheme 
                      ? 'bg-amber-100 border-amber-300 text-amber-900' 
                      : 'bg-amber-400/15 border-amber-400/40 text-[#F4EE8E]'
                  }`}>
                    <Upload size={20} />
                  </div>
                  <div>
                    <span className="text-sm font-bold block text-amber-950 dark:text-[#F4EE8E]">
                      {field.hint || 'Перетащите файл сюда или нажмите для выбора'}
                    </span>
                    <span className="text-xs opacity-75 mt-0.5 block text-amber-900 dark:text-amber-200">
                      Поддерживаются файлы формата: {acceptMime.replace(/application\/[^,]+/g, '').replace(/,/g, ' ')}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* AI Analysis Capability Badge */}
          <div className={`p-2.5 rounded-xl border flex items-start gap-2.5 text-xs font-medium ${
            isLightTheme 
              ? 'bg-amber-50/80 border-amber-300 text-amber-950' 
              : 'bg-amber-950/25 border-amber-400/40 text-amber-200'
          }`}>
            <Sparkles size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">Анализ нейросетью:</span> ИИ автоматически распознает данные загруженного файла ({field.label}) при проверке рапорта.
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Google Link Mode */}
      {activeTab === 'google_link' && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className={`block text-xs font-bold ${
              isLightTheme ? 'text-zinc-950' : 'text-[#F4EE8E]'
            }`}>
              Ссылка на Google Таблицу, Документ, Презентацию или Google Диск:
            </label>
            <div className="relative">
              <input
                type="url"
                value={linkInput}
                onChange={(e) => {
                  setLinkInput(e.target.value);
                  handleApplyLink(e.target.value);
                }}
                placeholder="https://docs.google.com/spreadsheets/d/... или drive.google.com/..."
                className={`w-full min-h-[46px] pl-3.5 pr-10 py-2.5 rounded-xl border text-sm font-medium focus:outline-none transition-all ${
                  isLightTheme
                    ? 'bg-transparent border-amber-300 text-zinc-950 placeholder:text-zinc-500 focus:border-amber-500'
                    : 'bg-transparent border-amber-400/40 text-amber-100 placeholder:text-amber-300/40 focus:border-[#E7C768]'
                }`}
              />
              {linkInput && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100 text-amber-500 cursor-pointer p-1"
                  title="Очистить поле ссылки"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Detected Format Badge */}
          {detectedLinkType && (
            <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs font-bold ${
              isLightTheme 
                ? 'bg-transparent border-amber-400 text-zinc-950' 
                : 'bg-transparent border-amber-400/40 text-[#F4EE8E]'
            }`}>
              <div className="flex items-center gap-2 min-w-0">
                {detectedLinkType.icon}
                <span className="truncate">Определен формат: {detectedLinkType.label}</span>
              </div>
              {detectedLinkType.canAi && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold shrink-0 border ${
                  isLightTheme 
                    ? 'bg-transparent border-amber-400 text-zinc-950' 
                    : 'bg-transparent border-amber-400/50 text-[#F4EE8E]'
                }`}>
                  <Sparkles size={12} className="text-amber-500" />
                  <span>ИИ поддерживается</span>
                </span>
              )}
            </div>
          )}

          {/* Google Access Notice */}
          <div className={`p-3 rounded-2xl border flex items-start gap-2.5 text-xs ${
            isLightTheme 
              ? 'bg-transparent border-amber-300 text-zinc-950' 
              : 'bg-transparent border-amber-400/40 text-amber-200'
          }`}>
            <Info size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1 leading-relaxed">
              <div className="font-bold flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-500" />
                <span>Распознавание ссылок Google нейросетью:</span>
              </div>
              <p className="opacity-90">
                Нейросеть сможет проанализировать содержимое таблицы, документа или презентации, если в настройках файла на Google Диске открыт доступ для чтения: 
                <span className="font-bold underline ml-1">«Все, у кого есть ссылка — Читатель»</span>.
              </p>
            </div>
          </div>

          {/* Link Verification in New Tab */}
          {linkInput.trim().length > 0 && (
            <div className="pt-0.5">
              <a
                href={linkInput.startsWith('http') ? linkInput : `https://${linkInput}`}
                target="_blank"
                rel="noreferrer noopener"
                className={`inline-flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                  isLightTheme ? 'text-amber-900 hover:underline' : 'text-[#F4EE8E] hover:underline'
                }`}
              >
                <ExternalLink size={14} />
                <span>Проверить доступность ссылки в новом окне</span>
              </a>
            </div>
          )}
        </div>
      )}

      {errorMessage && (
        <div className="text-xs font-bold text-amber-600 dark:text-amber-400">
          {errorMessage}
        </div>
      )}
    </div>
  );
};

export default ReportSmartFileInput;
