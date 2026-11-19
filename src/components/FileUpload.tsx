import React, { useRef } from 'react';
import { useFileUpload } from '../hooks/useFileUpload';
import { Paperclip, Loader2, UploadCloud } from 'lucide-react';

interface FileUploadProps {
    onUploaded: (key: string, url: string) => void;
    accept?: string;
    multiple?: boolean;
    buttonText?: string;
    className?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
    onUploaded, 
    accept = "*/*",
    multiple = false,
    buttonText = "Прикрепить файл (RR)",
    className = ""
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const { upload, uploading } = useFileUpload();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        for (const file of Array.from(files)) {
            try {
                const { key, url } = await upload(file as File);
                onUploaded(key, url);
            } catch (err) {
                console.error('Upload failed:', err);
            }
        }

        // Reset input
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    return (
        <div className={`inline-block ${className}`}>
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                multiple={multiple}
                onChange={handleFileChange}
                disabled={uploading}
                style={{ display: 'none' }}
                id="rr-file-input"
            />
            <label 
                htmlFor="rr-file-input" 
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs font-semibold hover:bg-amber-500/20 active:scale-95 transition-all cursor-pointer ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
            >
                {uploading ? (
                    <>
                        <Loader2 size={14} className="animate-spin text-amber-400" />
                        <span>Загрузка...</span>
                    </>
                ) : (
                    <>
                        <UploadCloud size={14} className="text-[#E7C768]" />
                        <span>{buttonText}</span>
                    </>
                )}
            </label>
        </div>
    );
};
