import React, { useState, useRef } from 'react';
import { UploadCloud, Loader2, FileCheck } from 'lucide-react';
import { getUploadService } from '../../services/FileUploadService';

interface DropzoneUploaderProps {
  folderId?: number | null;
  onUploadSuccess: () => void;
  isDarkTheme?: boolean;
}

export const DropzoneUploader: React.FC<DropzoneUploaderProps> = ({ 
  folderId, 
  onUploadSuccess,
  isDarkTheme = true 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ loaded: 0, total: 0 });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    setUploading(true);
    setProgress({ loaded: 0, total: fileList.length });
    setErrorMsg(null);
    const uploadService = getUploadService();

    try {
      await uploadService.uploadBatch(fileList, folderId, (loaded, total) => {
        setProgress({ loaded, total });
      });
      onUploadSuccess();
    } catch (err: any) {
      console.error('Batch upload error:', err);
      setErrorMsg('Ошибка при загрузке файлов через RR API');
    } finally {
      setUploading(false);
      setProgress({ loaded: 0, total: 0 });
    }
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => !uploading && fileInputRef.current?.click()}
      className={`relative w-full p-6 sm:p-8 border-2 border-dashed rounded-3xl text-center cursor-pointer transition-all duration-200 backdrop-blur-md ${
        isDragging 
          ? 'border-[#E7C768] bg-[#E7C768]/10 scale-[1.01]' 
          : isDarkTheme
            ? 'border-amber-500/30 hover:border-amber-400/60 bg-amber-500/5 hover:bg-amber-500/10'
            : 'border-amber-800/20 hover:border-amber-800/40 bg-white/60 hover:bg-white/80'
      }`}
    >
      <input 
        ref={fileInputRef} 
        type="file" 
        multiple 
        className="hidden" 
        onChange={(e) => handleFiles(e.target.files)} 
      />

      <div className="flex flex-col items-center justify-center gap-3">
        {uploading ? (
          <>
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
              <Loader2 className="w-8 h-8 text-[#E7C768] animate-spin" />
            </div>
            <p className={`text-sm font-bold ${isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
              Загрузка {progress.loaded} из {progress.total} файлов...
            </p>
            <div className="w-full max-w-xs bg-amber-500/20 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] h-full transition-all duration-300"
                style={{ width: `${progress.total ? (progress.loaded / progress.total) * 100 : 0}%` }}
              />
            </div>
          </>
        ) : (
          <>
            <div className={`p-4 rounded-2xl border transition ${
              isDarkTheme 
                ? 'bg-amber-500/10 border-amber-500/30 text-[#E7C768] shadow-[0_0_20px_rgba(231,199,104,0.15)]' 
                : 'bg-amber-100 border-amber-800/20 text-amber-900'
            }`}>
              <UploadCloud className="w-8 h-8" />
            </div>
            <div>
              <p className={`text-base font-bold ${isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                Перетащите файлы сюда или кликните для выбора
              </p>
              <p className={`text-xs mt-1 ${isDarkTheme ? 'text-amber-200/60' : 'text-amber-900/70'}`}>
                Поддерживаются любые типы файлов (до 20 МБ для обычных файлов, до 2 ГБ для видео)
              </p>
            </div>
          </>
        )}

        {errorMsg && (
          <p className="text-xs font-bold text-red-400 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 mt-2">
            {errorMsg}
          </p>
        )}
      </div>
    </div>
  );
};
