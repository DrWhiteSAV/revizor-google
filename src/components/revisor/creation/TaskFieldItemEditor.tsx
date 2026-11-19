import React, { useState } from 'react';
import { 
  ArrowUp, ArrowDown, Trash2, Sparkles, Plus, X, 
  HelpCircle, Bot, Check, CheckSquare, Radio, Copy
} from 'lucide-react';
import { TaskCardField } from './CreateTaskModal';
import { MiniAudioField } from '../../voice/MiniAudioField';
import { REPORT_FIELD_TYPES, getFieldTypeMeta } from '../../raport/ReportFieldTypeConfig';
import { ReportFieldType } from '../../../types';

interface TaskFieldItemEditorProps {
  field: TaskCardField;
  index: number;
  totalFields: number;
  onUpdate: (updated: Partial<TaskCardField>) => void;
  onMove: (direction: 'up' | 'down') => void;
  onRemove: () => void;
  onDuplicate?: () => void;
  isDark?: boolean;
}

export const TaskFieldItemEditor: React.FC<TaskFieldItemEditorProps> = ({
  field,
  index,
  totalFields,
  onUpdate,
  onMove,
  onRemove,
  onDuplicate,
  isDark = true
}) => {
  const [newOptionInput, setNewOptionInput] = useState('');
  const [isGeneratingFieldAiPrompt, setIsGeneratingFieldAiPrompt] = useState(false);

  const meta = getFieldTypeMeta(field.type);

  // Auto-generate AI check prompt for this specific field
  const handleGenerateAiPrompt = async () => {
    if (!field.label.trim()) return;
    setIsGeneratingFieldAiPrompt(true);
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Сформулируй краткий и жесткий критерий проверки ответа для ИИ Ревизора.
Вопрос карточки задачи: "${field.label}"
Тип поля: "${meta.label}" (${field.type})
Подсказка: "${field.hint || 'нет'}"
Напиши 1-2 предложения: что именно нейросеть должна проверить в ответе сотрудника (полнота, реквизиты, фотофиксация, отсутствие отписок). Без лишних слов, только сам критерий.`,
          format: 'text'
        })
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.result || data.text || '';
        if (text) {
          onUpdate({ ai_check_prompt: text.trim().replace(/^["']|["']$/g, '') });
        }
      }
    } catch (err) {
      console.warn('Field prompt generation error:', err);
    } finally {
      setIsGeneratingFieldAiPrompt(false);
    }
  };

  const handleAddOption = () => {
    const val = newOptionInput.trim();
    if (!val) return;
    const current = field.options || [];
    if (!current.includes(val)) {
      onUpdate({ options: [...current, val] });
    }
    setNewOptionInput('');
  };

  const handleRemoveOption = (optIdx: number) => {
    const current = field.options || [];
    onUpdate({ options: current.filter((_, i) => i !== optIdx) });
  };

  return (
    <div className={`p-4 rounded-2xl border transition-all ${
      isDark
        ? 'bg-[#1A0F02]/70 border-[#E7C768]/40 shadow-xs'
        : 'bg-[#FAF6EC]/90 border-[#B8860B]/30 shadow-xs'
    }`}>
      {/* Top Header of the Field Item */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-amber-500/15">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-[#E7C768] text-sm font-bold flex items-center justify-center">
            {index + 1}
          </span>
          <span className="text-sm font-bold text-[#E7C768]">
            Карточка проверки #{index + 1}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-400/30 text-xs font-mono text-[#E7C768]">
            {meta.label}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {onDuplicate && (
            <button
              type="button"
              onClick={onDuplicate}
              className="p-1.5 rounded-lg hover:bg-amber-500/15 text-amber-300 cursor-pointer"
              title="Дублировать карточку"
            >
              <Copy size={15} />
            </button>
          )}
          <button
            type="button"
            onClick={() => onMove('up')}
            disabled={index === 0}
            className="p-1.5 rounded-lg hover:bg-amber-500/15 disabled:opacity-30 cursor-pointer"
            title="Поднять выше"
          >
            <ArrowUp size={15} />
          </button>
          <button
            type="button"
            onClick={() => onMove('down')}
            disabled={index === totalFields - 1}
            className="p-1.5 rounded-lg hover:bg-amber-500/15 disabled:opacity-30 cursor-pointer"
            title="Опустить ниже"
          >
            <ArrowDown size={15} />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 rounded-lg hover:bg-amber-500/15 text-amber-400 cursor-pointer"
            title="Удалить карточку"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Row 1: Label & Type */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-3">
        <div className="md:col-span-7">
          <label className="block text-sm font-bold mb-1 opacity-85">
            Вопрос или название карточки *
          </label>
          <MiniAudioField
            value={field.label}
            onChange={(val) => onUpdate({ label: val })}
            placeholder="Сформулируйте суть вопроса или что должен предоставить исполнитель..."
            multiline={true}
            rows={2}
            resizable={true}
            isLightTheme={!isDark}
          />
        </div>

        <div className="md:col-span-5">
          <label className="block text-sm font-bold mb-1 opacity-85">
            Тип подтверждения (20 типов)
          </label>
          <select
            value={field.type}
            onChange={(e) => onUpdate({ type: e.target.value as ReportFieldType })}
            className={`w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none cursor-pointer ${
              isDark ? 'bg-[#1A0F02] border-[#E7C768]/40 text-[#F4EE8E]' : 'bg-white border-[#B8860B]/40 text-amber-950'
            }`}
          >
            <optgroup label="1. Голос и текст">
              <option value="voice">🎤 Голосовой отчет (ИИ)</option>
              <option value="text_short">Строка текста (краткий ответ)</option>
              <option value="text_paragraph">Развернутый комментарий</option>
              <option value="number">Числовой показатель / метрика</option>
            </optgroup>
            <optgroup label="2. Варианты выбора">
              <option value="multiple_choice">Множественный выбор (чекбоксы)</option>
              <option value="single_choice">Одиночный выбор (один из списка)</option>
              <option value="checkbox">Чекбокс (да / нет)</option>
            </optgroup>
            <optgroup label="3. Медиа и камера">
              <option value="photo">Фотография (из галереи)</option>
              <option value="camera_photo">Фото с камеры (реальное время)</option>
              <option value="screenshot">Скриншот экрана</option>
              <option value="video">Видеозапись (из памяти)</option>
              <option value="camera_video">Видео с камеры (в реальном времени)</option>
            </optgroup>
            <optgroup label="4. Документы и файлы">
              <option value="pdf">PDF документ</option>
              <option value="table">Таблица (Excel / Sheets / CSV)</option>
              <option value="document">Документ (Word / Docs / TXT)</option>
              <option value="presentation">Презентация (PPTX / Slides)</option>
              <option value="audio">Аудиофайл (MP3 / WAV)</option>
              <option value="file">Универсальный файл</option>
              <option value="google_drive">Ссылка на Google Диск</option>
            </optgroup>
            <optgroup label="5. Специальные поля">
              <option value="geolocation">Геолокация (GPS координаты)</option>
              <option value="url">Ссылка на веб-ресурс</option>
            </optgroup>
          </select>
        </div>
      </div>

      {/* Row 2: Options Editor for Choice Fields */}
      {(field.type === 'single_choice' || field.type === 'multiple_choice' || (field.type as string) === 'select' || (field.type as string) === 'list') && (
        <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 mb-3 space-y-2">
          <label className="block text-sm font-bold opacity-85">
            Варианты ответа для выбора:
          </label>
          <div className="flex flex-wrap gap-2">
            {(field.options && field.options.length > 0 ? field.options : ['Вариант 1', 'Вариант 2']).map((opt, oi) => (
              <span
                key={oi}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-400/30 text-sm font-medium"
              >
                <span>{opt}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveOption(oi)}
                  className="hover:text-amber-400 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={newOptionInput}
              onChange={(e) => setNewOptionInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddOption();
                }
              }}
              placeholder="Добавить вариант ответа..."
              className={`flex-1 px-3 py-1.5 rounded-xl text-sm border focus:outline-none ${
                isDark ? 'bg-transparent border-amber-400/30 text-[#F4EE8E]' : 'bg-white border-amber-900/20 text-amber-950'
              }`}
            />
            <button
              type="button"
              onClick={handleAddOption}
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-[#E7C768] text-sm font-bold hover:bg-amber-500/30 flex items-center gap-1 cursor-pointer"
            >
              <Plus size={14} />
              <span>Добавить</span>
            </button>
          </div>
        </div>
      )}

      {/* Row 3: Hint & AI Prompt for Field */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-3">
        <div className="md:col-span-5">
          <label className="block text-sm font-semibold opacity-80 mb-1">
            Подсказка для сотрудника (опционально)
          </label>
          <input
            type="text"
            value={field.hint || ''}
            onChange={(e) => onUpdate({ hint: e.target.value })}
            placeholder="Например: Загрузить четкий скриншот без бликов"
            className={`w-full px-3 py-2 rounded-xl text-sm border focus:outline-none ${
              isDark ? 'bg-transparent border-amber-400/30 text-[#F4EE8E]' : 'bg-white border-amber-900/20 text-amber-950'
            }`}
          />
        </div>

        <div className="md:col-span-7">
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-bold text-[#E7C768] flex items-center gap-1">
              <Bot size={15} />
              <span>ИИ-критерий проверки этого поля</span>
            </label>
            <button
              type="button"
              onClick={handleGenerateAiPrompt}
              disabled={isGeneratingFieldAiPrompt || !field.label.trim()}
              className="px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-[#E7C768] text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-all"
              title="Сгенерировать индивидуальный ИИ критерий проверки для поля"
            >
              <Sparkles size={12} />
              <span>{isGeneratingFieldAiPrompt ? 'ИИ пишет...' : 'ИИ-помощник'}</span>
            </button>
          </div>
          <input
            type="text"
            value={field.ai_check_prompt || ''}
            onChange={(e) => onUpdate({ ai_check_prompt: e.target.value })}
            placeholder="Что проверять нейросетью: реквизиты, полноту, отсутствие отписок"
            className={`w-full px-3 py-2 rounded-xl text-sm border focus:outline-none ${
              isDark ? 'bg-transparent border-amber-400/30 text-[#F4EE8E]' : 'bg-white border-amber-900/20 text-amber-950'
            }`}
          />
        </div>
      </div>

      {/* Row 4: Required Checkbox & Image Analysis Mode */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm pt-2 border-t border-amber-500/10">
        <label className="flex items-center gap-2 cursor-pointer font-medium">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(e) => onUpdate({ required: e.target.checked })}
            className="w-4 h-4 accent-[#E7C768] cursor-pointer"
          />
          <span>Обязательное поле для сдачи задачи</span>
        </label>

        {/* Visual vs Text OCR mode for images */}
        {(field.type === 'photo' || field.type === 'camera_photo' || field.type === 'screenshot') && (
          <div className="flex items-center gap-2">
            <span className="opacity-75">Режим анализа:</span>
            <select
              value={field.image_analysis_mode || 'visual_description'}
              onChange={(e) => onUpdate({ image_analysis_mode: e.target.value as any })}
              className={`px-2.5 py-1 rounded-lg border text-sm focus:outline-none ${
                isDark ? 'bg-[#1A0F02] border-amber-400/30 text-[#F4EE8E]' : 'bg-white border-amber-900/20 text-amber-950'
              }`}
            >
              <option value="visual_description">Анализ визуальных объектов</option>
              <option value="text">Распознавание текста (OCR)</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskFieldItemEditor;
