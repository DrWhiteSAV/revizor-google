import React, { useState } from 'react';
import { 
  Check, Mic, MapPin, CheckSquare, Radio, 
  Sparkles, RefreshCw, AlertCircle, FileText,
  Link2, ExternalLink, Sheet, Presentation, Paperclip,
  FileCheck, Video, Headphones, Image as ImageIcon, Camera,
  Monitor, CheckCircle2, X, Upload
} from 'lucide-react';
import { TaskCardField } from '../creation/CreateTaskModal';
import { TaskSmartFileInput } from './TaskSmartFileInput';
import { MiniAudioField } from '../../voice/MiniAudioField';

interface TaskCardFieldRendererProps {
  field: TaskCardField;
  fieldIndex?: number;
  value: any;
  onChange: (val: any) => void;
  isDark?: boolean;
  onOpenMediaCapture?: (mode: 'photo' | 'video' | 'screenshot', fieldId: string) => void;
  taskTitle?: string;
  checkCriteria?: string;
  extractedText?: string;
}

export const TaskCardFieldRenderer: React.FC<TaskCardFieldRendererProps> = ({
  field,
  fieldIndex,
  value,
  onChange,
  isDark = true,
  onOpenMediaCapture,
  checkCriteria,
  extractedText
}) => {
  const [isLocating, setIsLocating] = useState(false);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);

  // Helper for geolocation
  const handleGetLocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coordsStr = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
        onChange(coordsStr);
        setIsLocating(false);
      },
      (err) => {
        console.warn('Ошибка геолокации:', err);
        setIsLocating(false);
      }
    );
  };

  // Helper for voice simulation/recording
  const handleSimulateVoice = () => {
    if (isVoiceRecording) {
      setIsVoiceRecording(false);
      return;
    }
    setIsVoiceRecording(true);
    setTimeout(() => {
      onChange(value ? `${value} (Аудиоотчет подтвержден)` : 'Аудиоотчет записан: все контрольные параметры задачи выполнены в полном объеме.');
      setIsVoiceRecording(false);
    }, 1500);
  };

  return (
    <div className={`w-full max-w-full p-3.5 sm:p-5 rounded-2xl border transition-all space-y-4 ${
      isDark
        ? 'bg-amber-500/5 border-[#E7C768]/30 text-[#F4EE8E]'
        : 'bg-amber-500/5 border-[#B8860B]/30 text-amber-950'
    }`}>
      {/* 1. Header with Card Number, Required Badge and Question */}
      <div className="space-y-3 border-b border-amber-400/20 pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {fieldIndex !== undefined && (
            <span className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-400/40 text-[#E7C768] text-sm font-bold flex items-center gap-1.5">
              <span>Карточка #{fieldIndex}</span>
            </span>
          )}

          <span className={`px-2.5 py-1 rounded-xl text-sm font-semibold border ${
            field.required
              ? 'bg-amber-500/20 border-amber-400/40 text-[#E7C768]'
              : 'bg-amber-500/5 border-amber-400/20 text-amber-200/70'
          }`}>
            {field.required ? 'Обязательное поле' : 'По желанию'}
          </span>
        </div>

        {/* 2. Question / Field Label */}
        <h3 className="text-base sm:text-lg font-bold text-[#E7C768] leading-snug">
          {field.label}
        </h3>

        {/* 3. Employee Hint */}
        <div className={`p-3 rounded-xl border text-sm leading-relaxed ${
          isDark
            ? 'bg-amber-500/10 border-amber-400/30 text-[#F4EE8E]'
            : 'bg-amber-100/60 border-amber-400/40 text-amber-950'
        }`}>
          <span className="font-bold text-sm block mb-0.5 text-[#E7C768]">
            💡 Подсказка для сотрудника:
          </span>
          <span className="opacity-90 text-sm">
            {field.hint || 'Предоставьте подтверждение выполнения согласно требованиям регламента задачи.'}
          </span>
        </div>

        {/* 4. AI Verification Criteria for this Field */}
        <div className={`p-3 rounded-xl border text-sm leading-relaxed flex items-start gap-2.5 ${
          isDark
            ? 'bg-[#140A01]/70 border-amber-400/30 text-amber-200'
            : 'bg-amber-100/50 border-amber-400/40 text-amber-950'
        }`}>
          <Sparkles size={16} className="text-[#E7C768] shrink-0 mt-0.5" />
          <div className="space-y-0.5 min-w-0">
            <span className="font-bold block text-sm text-[#E7C768]">
              🤖 ИИ-критерий проверки этого поля:
            </span>
            <span className="opacity-95 text-sm">
              {field.ai_check_prompt || (field.hint ? `Сверка с требованиями: ${field.hint}` : checkCriteria || 'ИИ Ревизор проверит корректность, подлинность и соответствие регламенту задачи.')}
            </span>
          </div>
        </div>

        {/* Cascaded Extracted Text from AI Image/Doc/Audio analysis */}
        {extractedText && (
          <div className={`p-3 rounded-xl border text-sm leading-relaxed animate-fade-in ${
            isDark
              ? 'bg-[#1A0F02]/90 border-[#E7C768]/50 text-[#F4EE8E] shadow-[0_0_20px_rgba(244,238,142,0.15)]'
              : 'bg-amber-100/80 border-[#B8860B]/50 text-amber-950'
          }`}>
            <div className="flex items-center gap-1.5 font-bold mb-1 text-[#E7C768]">
              <Sparkles size={15} className="shrink-0" />
              <span className="text-sm">Распознанный текст нейросети по полю:</span>
            </div>
            <p className="whitespace-pre-wrap font-sans opacity-95 text-sm">{extractedText}</p>
          </div>
        )}
      </div>

      {/* Field Input by Type */}
      {/* 1. Voice Field */}
      {field.type === 'voice' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleSimulateVoice}
              className={`px-3.5 py-2 rounded-xl border text-sm font-bold flex items-center gap-2 cursor-pointer transition-all ${
                isVoiceRecording
                  ? 'bg-amber-600 text-white border-amber-600 animate-pulse'
                  : 'bg-amber-500/20 border-amber-500/40 text-[#E7C768] hover:bg-amber-500/30'
              }`}
            >
              <Mic size={16} />
              <span>{isVoiceRecording ? 'Идет запись...' : 'Надиктовать ответ'}</span>
            </button>
            {value && (
              <span className="text-sm font-mono text-[#E7C768] flex items-center gap-1">
                <Check size={14} />
                <span>Голос распознан</span>
              </span>
            )}
          </div>
          <MiniAudioField
            value={value || ''}
            onChange={(val) => onChange(val)}
            rows={2}
            multiline={true}
            resizable={true}
            placeholder="Или наберите текст вручную или надиктуйте..."
            isLightTheme={!isDark}
          />
        </div>
      )}

      {/* 2. Text Paragraph */}
      {(field.type === 'text_paragraph' || (field.type as string) === 'text') && (
        <MiniAudioField
          value={value || ''}
          onChange={(val) => onChange(val)}
          rows={3}
          multiline={true}
          resizable={true}
          placeholder="Введите развернутый комментарий или продиктуйте..."
          isLightTheme={!isDark}
        />
      )}

      {/* 3. Short Text */}
      {field.type === 'text_short' && (
        <MiniAudioField
          value={value || ''}
          onChange={(val) => onChange(val)}
          rows={2}
          multiline={true}
          resizable={true}
          placeholder="Краткий ответ или артикул (можно надиктовать)..."
          isLightTheme={!isDark}
        />
      )}

      {/* 4. Number */}
      {field.type === 'number' && (
        <input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className={`w-full sm:w-48 px-3.5 py-2 rounded-xl text-sm border focus:outline-none transition-colors ${
            isDark
              ? 'bg-transparent border-[#E7C768]/40 text-[#F4EE8E] focus:border-[#F4EE8E]'
              : 'bg-white/80 border-[#B8860B]/40 text-amber-950 focus:border-[#B8860B]'
          }`}
        />
      )}

      {/* 5. Checkbox (Big Binary Yes / No Toggle as in reports) */}
      {field.type === 'checkbox' && (
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => onChange(true)}
            className={`py-2 px-3 rounded-xl border text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              value === true || value === 'Да'
                ? 'bg-amber-500/30 border-amber-300 text-[#F4EE8E] shadow-sm font-black ring-1 ring-amber-400/50'
                : 'border-amber-400/30 hover:bg-amber-500/10 opacity-75'
            }`}
          >
            <CheckCircle2 size={16} />
            <span>Да, выполнено</span>
          </button>
          <button
            type="button"
            onClick={() => onChange(false)}
            className={`py-2 px-3 rounded-xl border text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              value === false || value === 'Нет'
                ? 'bg-amber-500/30 border-amber-300 text-[#F4EE8E] shadow-sm font-black ring-1 ring-amber-400/50'
                : 'border-amber-400/30 hover:bg-amber-500/10 opacity-75'
            }`}
          >
            <X size={16} />
            <span>Нет</span>
          </button>
        </div>
      )}

      {/* 6. Multiple Choice (Checkboxes) */}
      {(field.type === 'multiple_choice' || (field.type as string) === 'checkboxes' || (field.type as string) === 'list') && (
        <div className="space-y-1.5">
          {(field.options && field.options.length > 0 ? field.options : ['Пункт 1 выполнен', 'Пункт 2 выполнен', 'Пункт 3 проверен']).map((opt, i) => {
            const currentSelected = Array.isArray(value) ? value : [];
            const isChecked = currentSelected.includes(opt);
            return (
              <label key={i} className="flex items-center gap-2.5 text-sm cursor-pointer p-2 rounded-xl border border-amber-400/20 bg-amber-500/5 hover:bg-amber-500/10">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => {
                    if (e.target.checked) onChange([...currentSelected, opt]);
                    else onChange(currentSelected.filter((item: string) => item !== opt));
                  }}
                  className="w-4 h-4 accent-[#E7C768]"
                />
                <span className="leading-snug">{opt}</span>
              </label>
            );
          })}
        </div>
      )}

      {/* 7. Single Choice (Radio / Select) */}
      {(field.type === 'single_choice' || (field.type as string) === 'select') && (
        <div className="space-y-1.5">
          {(field.options && field.options.length > 0 ? field.options : ['Вариант А', 'Вариант Б', 'Вариант В']).map((opt, i) => (
            <label key={i} className="flex items-center gap-2.5 text-sm cursor-pointer p-2 rounded-xl border border-amber-400/20 bg-amber-500/5 hover:bg-amber-500/10">
              <input
                type="radio"
                name={`radio_${field.id}`}
                value={opt}
                checked={value === opt}
                onChange={() => onChange(opt)}
                className="w-4 h-4 accent-[#E7C768]"
              />
              <span className="leading-snug">{opt}</span>
            </label>
          ))}
        </div>
      )}

      {/* 8. Photo, Camera Photo & Media Photo with camera capture, gallery upload, Ctrl+V and preview support */}
      {(
        field.type === 'camera_photo' || 
        field.type === 'photo' || 
        field.type === 'media_photo' || 
        field.type === 'image' || 
        field.type === 'picture'
      ) && (
        <div className="space-y-2">
          <div className={`flex items-center justify-center gap-2 text-sm font-bold ${
            !isDark ? 'text-zinc-950' : 'text-[#F4EE8E]'
          }`}>
            <Camera size={18} />
            <span>Подтверждающее фото / снимок</span>
          </div>
          <p className={`text-xs text-center font-medium ${
            !isDark ? 'text-zinc-800' : 'text-amber-200 opacity-80'
          }`}>
            {field.hint || 'Сделайте фотографию с камеры или выберите снимок из галереи устройства'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onOpenMediaCapture?.('photo', field.id)}
              className="w-full min-h-[46px] py-2.5 px-3 rounded-xl border border-amber-400/60 bg-gradient-to-r from-amber-400/20 via-amber-500/30 to-amber-400/20 hover:from-amber-400/30 hover:to-amber-500/40 text-[#F4EE8E] text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shadow-sm"
            >
              <Camera size={18} />
              <span>Сделать фото с камеры</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const inputEl = document.getElementById(`file-input-${field.id}`) as HTMLInputElement;
                if (inputEl) inputEl.click();
              }}
              className="w-full min-h-[46px] py-2.5 px-3 rounded-xl border border-amber-400/60 bg-gradient-to-r from-amber-400/10 via-amber-500/20 to-amber-400/10 hover:bg-amber-500/25 text-[#F4EE8E] text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shadow-sm"
            >
              <Upload size={18} />
              <span>Выбрать из галереи</span>
            </button>
          </div>
          {(() => {
            const photoUrl = typeof value === 'string' ? value : value?.url;
            if (!photoUrl) return null;
            return (
              <div className="mt-2 space-y-1.5">
                <div className="relative rounded-xl overflow-hidden border border-amber-400/50 max-h-48 flex items-center justify-center bg-[#1A0F02]/30">
                  <img src={photoUrl} alt="Подтверждающее фото" className="max-h-48 object-contain rounded-lg" />
                  <button
                    type="button"
                    onClick={() => onChange(null)}
                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-amber-950/80 border border-amber-400/40 text-amber-200 hover:text-[#F4EE8E] cursor-pointer"
                    title="Удалить фото"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-xs ${
                  !isDark 
                    ? 'border-amber-300/60 bg-amber-100/60 text-zinc-900' 
                    : 'border-amber-400/30 bg-amber-500/10 text-amber-200'
                }`}>
                  <div className="flex items-center gap-1.5 truncate">
                    <ExternalLink size={13} className="text-amber-500 shrink-0" />
                    <a 
                      href={photoUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="truncate hover:underline font-medium text-xs"
                      title={photoUrl}
                    >
                      {photoUrl}
                    </a>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${
                    !isDark ? 'bg-amber-200/80 text-amber-950' : 'bg-amber-500/20 text-[#F4EE8E]'
                  }`}>
                    Загружено
                  </span>
                </div>
              </div>
            );
          })()}
          <TaskSmartFileInput
            value={typeof value === 'object' ? value?.url : value}
            fileName={typeof value === 'object' ? value?.name : ''}
            onChange={(url, name) => onChange({ url, name })}
            label="Или перетащите файл фото сюда"
            isDark={isDark}
            fieldId={field.id}
            accept="image/*"
          />
          <p className={`text-[11px] text-center font-medium ${
            !isDark ? 'text-zinc-600' : 'text-amber-300/70'
          }`}>
            💡 Также можно нажать <kbd className="px-1.5 py-0.5 rounded border border-amber-400/40 font-mono text-[10px]">Ctrl+V</kbd> для быстрой вставки снимка из буфера
          </p>
        </div>
      )}

      {/* 9. Screenshot with Display Capture & Ctrl+V hint */}
      {field.type === 'screenshot' && (
        <div className="space-y-2">
          <div className={`flex items-center justify-center gap-2 text-sm font-bold ${
            !isDark ? 'text-zinc-950' : 'text-[#F4EE8E]'
          }`}>
            <Monitor size={18} />
            <span>Скриншот экрана</span>
          </div>
          <p className={`text-xs text-center font-medium ${
            !isDark ? 'text-zinc-800' : 'text-amber-200 opacity-80'
          }`}>
            {field.hint || 'Прикрепите скриншот экрана с подтверждением'}
          </p>
          <button
            type="button"
            onClick={() => onOpenMediaCapture?.('screenshot', field.id)}
            className="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-amber-400/60 bg-gradient-to-r from-amber-400/20 via-amber-500/30 to-amber-400/20 hover:from-amber-400/30 hover:to-amber-500/40 font-bold text-sm flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-95 transition-all text-[#F4EE8E]"
          >
            <Monitor size={18} />
            <span>Сделать снимок экрана (ПК)</span>
          </button>
          <TaskSmartFileInput
            value={typeof value === 'object' ? value?.url : value}
            fileName={typeof value === 'object' ? value?.name : ''}
            onChange={(url, name) => onChange({ url, name })}
            label={field.hint || 'Загрузить файл скриншота'}
            isDark={isDark}
            fieldId={field.id}
            accept="image/*"
          />
          <p className={`text-[11px] text-center font-medium ${
            !isDark ? 'text-zinc-600' : 'text-amber-300/70'
          }`}>
            💡 Также можно нажать <kbd className="px-1.5 py-0.5 rounded border border-amber-400/40 font-mono text-[10px]">Ctrl+V</kbd> для вставки из буфера
          </p>
        </div>
      )}

      {/* 10. Video with camera video capture support */}
      {(field.type === 'camera_video' || field.type === 'media_video') && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => onOpenMediaCapture?.('video', field.id)}
            className="w-full py-2.5 px-3 rounded-xl border border-amber-400/50 bg-amber-500/15 hover:bg-amber-500/30 text-[#E7C768] text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <Video size={16} />
            <span>Включить камеру и записать видео</span>
          </button>
          {(() => {
            const videoUrl = typeof value === 'string' ? value : value?.url;
            if (!videoUrl) return null;
            return (
              <div className="relative rounded-xl overflow-hidden border border-amber-400/40">
                <video src={videoUrl} controls className="w-full max-h-36" />
                <button
                  type="button"
                  onClick={() => onChange(null)}
                  className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 border border-amber-400/40 text-amber-200 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })()}
          <TaskSmartFileInput
            value={typeof value === 'object' ? value?.url : value}
            fileName={typeof value === 'object' ? value?.name : ''}
            onChange={(url, name) => onChange({ url, name })}
            label="Или выбрать видеофайл с устройства"
            isDark={isDark}
            fieldId={field.id}
            accept="video/*"
          />
        </div>
      )}

      {/* 11. Documents & Other Media Files */}
      {(
        field.type === 'document' || 
        field.type === 'video' || 
        field.type === 'audio' || 
        field.type === 'media_audio' ||
        field.type === 'pdf' || 
        field.type === 'table' || 
        field.type === 'presentation' || 
        field.type === 'file' ||
        field.type === 'media_file' ||
        field.type === 'media' ||
        field.type === 'attachment'
      ) && (
        <TaskSmartFileInput
          value={typeof value === 'object' ? value?.url : value}
          fileName={typeof value === 'object' ? value?.name : ''}
          onChange={(url, name) => onChange({ url, name })}
          label={`Прикрепить ${field.label.toLowerCase()}`}
          isDark={isDark}
          fieldId={field.id}
          accept={
            field.type === 'pdf' ? '.pdf,application/pdf' :
            field.type === 'table' ? '.xls,.xlsx,.csv' :
            field.type === 'presentation' ? '.ppt,.pptx,.key' :
            field.type === 'audio' ? 'audio/*' :
            field.type === 'video' ? 'video/*' :
            field.type === 'photo' ? 'image/*' :
            '*'
          }
        />
      )}

      {/* 11. Google Drive Link */}
      {field.type === 'google_drive' && (
        <div className="space-y-1.5">
          <div className="relative">
            <ExternalLink size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
            <input
              type="url"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder="https://drive.google.com/file/d/..."
              className={`w-full pl-9 pr-3.5 py-2 rounded-xl text-sm border focus:outline-none ${
                isDark ? 'bg-transparent border-[#E7C768]/40 text-[#F4EE8E]' : 'bg-white border-[#B8860B]/40 text-amber-950'
              }`}
            />
          </div>
          {value && (
            <a 
              href={value} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-1.5 text-sm text-[#E7C768] hover:underline"
            >
              <span>Открыть в Google Диске</span>
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      )}

      {/* 12. Web URL */}
      {field.type === 'url' && (
        <div className="space-y-1.5">
          <div className="relative">
            <Link2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
            <input
              type="url"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder="https://example.com/result..."
              className={`w-full pl-9 pr-3.5 py-2 rounded-xl text-sm border focus:outline-none ${
                isDark ? 'bg-transparent border-[#E7C768]/40 text-[#F4EE8E]' : 'bg-white border-[#B8860B]/40 text-amber-950'
              }`}
            />
          </div>
          {value && (
            <a 
              href={value} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-1.5 text-sm text-[#E7C768] hover:underline"
            >
              <span>Перейти по ссылке</span>
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      )}

      {/* 13. Geolocation */}
      {(field.type === 'geolocation' || (field.type as string) === 'location') && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          <button
            type="button"
            onClick={handleGetLocation}
            disabled={isLocating}
            className="px-3.5 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-[#E7C768] text-sm font-bold flex items-center gap-2 hover:bg-amber-500/30 cursor-pointer disabled:opacity-50"
          >
            <MapPin size={16} />
            <span>{isLocating ? 'Определение GPS...' : 'Определить геопозицию'}</span>
          </button>
          {value && (
            <div className="text-sm font-mono opacity-80 flex items-center gap-1">
              <Check size={14} className="text-[#E7C768]" />
              <span>Координаты: {value}</span>
            </div>
          )}
        </div>
      )}

      {/* 14. Universal fallback for any custom or non-standard field type */}
      {![
        'voice', 'text_paragraph', 'text', 'text_short', 'number', 'checkbox', 
        'multiple_choice', 'checkboxes', 'list', 'single_choice', 'select', 
        'camera_photo', 'photo', 'media_photo', 'image', 'picture', 'screenshot', 
        'camera_video', 'media_video', 'video', 'audio', 'media_audio', 
        'pdf', 'table', 'document', 'presentation', 'file', 'media_file', 
        'media', 'attachment', 'google_drive', 'url', 'link', 'geolocation', 'location'
      ].includes(field.type) && (
        <div className="space-y-3">
          <TaskSmartFileInput
            value={typeof value === 'object' ? value?.url : value}
            fileName={typeof value === 'object' ? value?.name : ''}
            onChange={(url, name) => onChange({ url, name })}
            label="Прикрепить файл или фото подтверждения"
            isDark={isDark}
            fieldId={field.id}
          />
          <MiniAudioField
            value={typeof value === 'string' ? value : (value?.text || '')}
            onChange={(val) => onChange(typeof value === 'object' ? { ...value, text: val } : val)}
            rows={2}
            multiline={true}
            placeholder="Текстовое пояснение или комментарий сотрудника..."
            isLightTheme={!isDark}
          />
        </div>
      )}
    </div>
  );
};

export default TaskCardFieldRenderer;
