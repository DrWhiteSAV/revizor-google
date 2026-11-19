import React from 'react';
import { CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { TaskCardField } from '../creation/CreateTaskModal';
import { TaskCardFieldRenderer } from './TaskCardFieldRenderer';

interface TaskSectionCardsListProps {
  fields: TaskCardField[];
  fieldValues: Record<string, any>;
  onChangeField: (fieldId: string, val: any) => void;
  isDark?: boolean;
  taskTitle?: string;
  checkCriteria?: string;
}

export const TaskSectionCardsList: React.FC<TaskSectionCardsListProps> = ({
  fields,
  fieldValues,
  onChangeField,
  isDark = true,
  taskTitle,
  checkCriteria
}) => {
  const completedCount = fields.filter(f => {
    const val = fieldValues[f.id];
    if (val === undefined || val === null || val === '') return false;
    if (typeof val === 'object' && !val.url) return false;
    return true;
  }).length;

  const totalCount = fields.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Progress Bar Card */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        isDark
          ? 'bg-[#1A0F02]/80 border-[#E7C768]/40 text-[#F4EE8E]'
          : 'bg-[#FAF6EC]/90 border-[#B8860B]/30 text-amber-950'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/20 text-[#E7C768]">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <div className="text-sm font-bold">Прогресс заполнения карточек задачи</div>
            <div className="text-xs opacity-75">
              Заполнено {completedCount} из {totalCount} обязательных разделов ({pct}%)
            </div>
          </div>
        </div>

        <div className="w-full sm:w-48 bg-amber-500/15 rounded-full h-2.5 overflow-hidden border border-amber-500/30">
          <div
            className="h-full bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] transition-all duration-300 rounded-full"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Cards List */}
      <div className="space-y-3.5">
        {fields.map((field, idx) => (
          <TaskCardFieldRenderer
            key={field.id}
            field={field}
            fieldIndex={idx + 1}
            value={fieldValues[field.id]}
            onChange={(val) => onChangeField(field.id, val)}
            isDark={isDark}
            checkCriteria={checkCriteria}
          />
        ))}
      </div>
    </div>
  );
};
