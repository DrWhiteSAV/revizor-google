import React, { useState } from 'react';
import { 
  ShieldCheck, AlertTriangle, ChevronRight, CheckCircle2, 
  Clock, Users, Sparkles, X
} from 'lucide-react';

export interface DiagnosticResultItem {
  id: string;
  category: 'deadlines' | 'workload' | 'verification' | 'budget';
  title: string;
  score: number;
  status: 'good' | 'warning' | 'critical';
  summary: string;
  details: string;
  affectedItems?: string[];
  recommendation: string;
}

interface DoctorDiagnosticCardItemProps {
  item: DiagnosticResultItem;
  isDark?: boolean;
}

export const DoctorDiagnosticCardItem: React.FC<DoctorDiagnosticCardItemProps> = ({
  item,
  isDark = true
}) => {
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const getStatusBadge = () => {
    switch (item.status) {
      case 'good':
        return (
          <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-[#E7C768] text-xs font-bold flex items-center gap-1">
            <CheckCircle2 size={13} />
            <span>Стабильно ({item.score}%)</span>
          </span>
        );
      case 'warning':
        return (
          <span className="px-2.5 py-1 rounded-xl bg-amber-600/20 border border-amber-600/40 text-amber-300 text-xs font-bold flex items-center gap-1">
            <AlertTriangle size={13} />
            <span>Внимание ({item.score}%)</span>
          </span>
        );
      case 'critical':
        return (
          <span className="px-2.5 py-1 rounded-xl bg-amber-800/25 border border-amber-700/50 text-amber-200 text-xs font-bold flex items-center gap-1">
            <AlertTriangle size={13} />
            <span>Риск срыва ({item.score}%)</span>
          </span>
        );
    }
  };

  return (
    <>
      <div 
        onClick={() => setIsDetailModalOpen(true)}
        className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer hover:scale-[1.01] ${
          isDark
            ? 'bg-[#1A0F02]/80 border-[#E7C768]/40 shadow-[0_0_20px_rgba(244,238,142,0.1)] hover:border-[#F4EE8E] text-[#F4EE8E]'
            : 'bg-[#FAF6EC]/90 border-[#B8860B]/30 shadow-sm hover:border-[#B8860B] text-amber-950'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-[#E7C768]">
              <Sparkles size={18} />
            </div>
            <div>
              <h4 className="text-base font-bold">{item.title}</h4>
              <p className="text-sm opacity-80 mt-0.5">{item.summary}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {getStatusBadge()}
            <ChevronRight size={18} className="opacity-60" />
          </div>
        </div>

        <div className="text-sm opacity-85 pt-2 border-t border-amber-500/15 flex items-center justify-between">
          <span className="italic line-clamp-1">{item.recommendation}</span>
          <span className="text-xs text-[#E7C768] font-bold shrink-0 ml-2">Подробнее...</span>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {isDetailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
          <div className={`w-full max-w-lg p-6 sm:p-7 rounded-3xl border shadow-2xl space-y-4 ${
            isDark
              ? 'bg-[#1A0F02]/95 border-[#E7C768]/50 text-[#F4EE8E] shadow-[0_0_35px_rgba(244,238,142,0.2)]'
              : 'bg-[#FAF6EC]/95 border-[#B8860B]/40 text-amber-950'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-amber-500/20">
              <div className="flex items-center gap-2">
                <Sparkles size={20} className="text-[#E7C768]" />
                <h3 className="text-lg font-bold text-[#E7C768]">{item.title}</h3>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1.5 rounded-xl border border-amber-500/30 hover:bg-amber-500/10 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-sm opacity-90">
              <div>
                <span className="font-bold text-[#E7C768] block mb-1">Диагноз ИИ Доктора:</span>
                <p className="leading-relaxed">{item.details}</p>
              </div>

              {item.affectedItems && item.affectedItems.length > 0 && (
                <div>
                  <span className="font-bold text-[#E7C768] block mb-1">Связанные задачи и исполнители:</span>
                  <div className="p-2.5 rounded-xl border border-amber-500/20 space-y-1">
                    {item.affectedItems.map((aff, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs font-mono">
                        <span>•</span>
                        <span>{aff}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10">
                <span className="font-bold text-[#E7C768] block mb-1">Рекомендация по исправлению:</span>
                <p>{item.recommendation}</p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-amber-500/20">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-bold text-sm cursor-pointer shadow-md"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
