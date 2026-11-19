import React, { useState, useRef } from 'react';
import { Upload, FileText, Image as ImageIcon, Check, RefreshCw, X, Sparkles, Paperclip } from 'lucide-react';

interface TaskSmartFileInputProps {
  value: string | null;
  fileName?: string;
  onChange: (url: string, name: string) => void;
  accept?: string;
  label?: string;
  isDark?: boolean;
  fieldId: string;
}

export const TaskSmartFileInput: React.FC<TaskSmartFileInputProps> = ({
  value,
  fileName = '',
  onChange,
  accept = 'image/*,.pdf,.doc,.docx',
  label = 'Прикрепить файл или фото',
  isDark = true,
  fieldId
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable) {
        const percent = Math.min(100, Math.round((evt.loaded / evt.total) * 100));
        setUploadProgress(percent);
      }
    };

    xhr.onload = async () => {
      try {
        let uploadedUrl = '';
        let uploadedName = file.name;
        if (xhr.status >= 200 && xhr.status < 300) {
          const data = JSON.parse(xhr.responseText);
          uploadedUrl = data.url || data.original_url || '';
        }
        if (!uploadedUrl) {
          uploadedUrl = URL.createObjectURL(file);
        }
        onChange(uploadedUrl, uploadedName);
        setUploadProgress(100);
      } catch (err) {
        console.warn('Ошибка обработки ответа загрузки:', err);
        onChange(URL.createObjectURL(file), file.name);
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    };

    xhr.onerror = () => {
      console.warn('Ошибка сети при загрузке файла');
      onChange(URL.createObjectURL(file), file.name);
      setIsUploading(false);
      setUploadProgress(0);
    };

    xhr.send(formData);
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelected}
        className="hidden"
        id={`file-input-${fieldId}`}
      />

      {!value ? (
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className={`w-full p-4 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${
              isDark
                ? 'border-amber-500/30 hover:border-[#E7C768] hover:bg-amber-500/5 text-[#F4EE8E]'
                : 'border-[#B8860B]/30 hover:border-[#B8860B] hover:bg-amber-100/30 text-amber-950'
            }`}
          >
            {isUploading ? (
              <RefreshCw size={22} className="animate-spin text-[#E7C768]" />
            ) : (
              <Upload size={22} className="text-[#E7C768]" />
            )}
            <span className="text-sm font-semibold">
              {isUploading ? `Загрузка файла (${uploadProgress}%)...` : label}
            </span>
            <span className="text-xs opacity-70">Нажмите для выбора снимка или документа</span>
          </button>

          {isUploading && (
            <div className="space-y-1 px-1">
              <div className="flex justify-between items-center text-xs font-mono font-bold text-amber-500">
                <span>Прогресс отправки:</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-amber-500/20 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] transition-all duration-150"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className={`p-3.5 rounded-2xl border flex flex-col gap-2 ${
          isDark ? 'bg-[#140A01]/70 border-amber-500/30' : 'bg-white/80 border-amber-500/30'
        }`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="p-2 rounded-xl bg-amber-500/20 text-[#E7C768] shrink-0">
                {fileName.match(/\.(jpg|jpeg|png|webp)$/i) ? <ImageIcon size={18} /> : <FileText size={18} />}
              </div>
              <div className="overflow-hidden">
                <div className="text-sm font-bold truncate">{fileName || 'Загруженный файл'}</div>
                <div className="text-xs text-[#E7C768] font-mono flex items-center gap-1">
                  <Check size={12} />
                  <span>Прикреплено</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 rounded-lg border border-amber-500/30 text-xs font-semibold hover:bg-amber-500/10 cursor-pointer"
              >
                Заменить
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange('', '');
                }}
                className="p-1 rounded-lg border border-amber-500/30 text-amber-400 hover:text-amber-200 cursor-pointer"
                title="Удалить"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
