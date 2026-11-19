import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bot, Check, AlertTriangle, RefreshCw, X, ChevronDown, ChevronUp, FileText, Image as ImageIcon, Mic, BarChart2 } from 'lucide-react';

export interface CascadeStep {
  id: string;
  type: 'voice' | 'doc' | 'image' | 'final' | 'criteria';
  fieldLabel?: string;
  title: string;
  subtitle: string;
  status: 'pending' | 'running' | 'completed' | 'skipped' | 'error';
  resultText?: string;
  errorReason?: string;
  fileName?: string;
  fileUrl?: string;
}

interface ReportCascadeCheckOverlayProps {
  isOpen: boolean;
  isLightTheme?: boolean;
  steps: CascadeStep[];
  currentStepIndex: number;
  totalSteps: number;
  overallStatus: 'idle' | 'running' | 'completed' | 'error';
  errorMessage?: string | null;
  onRetry?: () => void;
  onClose?: () => void;
  onCancel?: () => void;
  reportTitle?: string;
  employeeName?: string;
}

export const ReportCascadeCheckOverlay: React.FC<ReportCascadeCheckOverlayProps> = ({
  isOpen,
  isLightTheme = false,
  steps,
  currentStepIndex,
  totalSteps,
  overallStatus,
  errorMessage,
  onRetry,
  onClose,
  onCancel,
  reportTitle,
  employeeName
}) => {
  const [seconds, setSeconds] = useState(0);
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);

  useEffect(() => {
    let interval: any = null;
    if (isOpen && overallStatus === 'running') {
      interval = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    } else if (!isOpen) {
      setSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, overallStatus]);

  if (!isOpen || overallStatus === 'idle' || typeof document === 'undefined') return null;

  const currentStep = steps[currentStepIndex] || steps[0];
  const progressPercent = totalSteps > 0 
    ? Math.min(100, Math.round(((currentStepIndex + (overallStatus === 'completed' ? 1 : 0.5)) / totalSteps) * 100))
    : 0;

  const getStepIcon = (type: CascadeStep['type']) => {
    switch (type) {
      case 'voice': return <Mic className="w-4 h-4 text-amber-400" />;
      case 'doc': return <FileText className="w-4 h-4 text-amber-400" />;
      case 'criteria': return <FileText className="w-4 h-4 text-amber-400" />;
      case 'image': return <ImageIcon className="w-4 h-4 text-amber-400" />;
      case 'final': return <BarChart2 className="w-4 h-4 text-amber-400" />;
    }
  };

  return createPortal(
    <div 
      id="report-cascade-check-overlay"
      className="fixed inset-0 z-[9996] flex items-center justify-center p-3 sm:p-4 backdrop-blur-md transition-all duration-300 animate-fadeIn"
      style={{
        backgroundColor: isLightTheme ? 'rgba(250, 246, 236, 0.72)' : 'rgba(20, 10, 1, 0.72)'
      }}
    >
      <div 
        id="report-cascade-card"
        className="w-full max-w-lg max-h-[92vh] rounded-3xl p-5 sm:p-7 border shadow-2xl flex flex-col items-center text-center relative overflow-hidden transition-all overflow-y-auto backdrop-blur-xl"
        style={{
          backgroundColor: isLightTheme ? 'rgba(255, 251, 245, 0.90)' : 'rgba(26, 15, 2, 0.85)',
          borderColor: isLightTheme ? '#D99E41' : '#E7C768',
          boxShadow: isLightTheme 
            ? '0 10px 30px rgba(217, 158, 65, 0.25)' 
            : '0 0 40px rgba(244, 238, 142, 0.25)'
        }}
      >
        {/* Glow Accent Top */}
        <div 
          className="absolute -top-12 left-1/2 -translate-x-1/2 w-64 h-24 rounded-full blur-2xl pointer-events-none opacity-40"
          style={{
            background: isLightTheme ? '#D99E41' : '#F4EE8E'
          }}
        />

        {/* Close / Minimize in background Button */}
        {onClose && (
          <button 
            onClick={onClose}
            title={overallStatus === 'running' ? "Свернуть проверку в фон (ИИ продолжит работу)" : "Закрыть окно"}
            className="absolute top-4 right-4 p-2 rounded-full border transition-all cursor-pointer hover:scale-105 active:scale-95 z-20"
            style={{
              borderColor: isLightTheme ? 'rgba(180, 120, 20, 0.4)' : 'rgba(231, 199, 104, 0.4)',
              backgroundColor: isLightTheme ? 'rgba(250, 246, 236, 0.95)' : 'rgba(42, 23, 5, 0.95)',
              color: isLightTheme ? '#78350F' : '#F4EE8E'
            }}
            id="cascade-overlay-close-btn"
          >
            <X size={18} />
          </button>
        )}

        {/* Liquid Glass Neural Mascot Sphere */}
        <div className="relative mb-4 mt-1 flex items-center justify-center">
          {/* Outer Pulsing Halo */}
          <div 
            className="absolute -inset-4 rounded-full animate-pulse opacity-40 blur-xl pointer-events-none"
            style={{
              background: isLightTheme 
                ? 'radial-gradient(circle, #D99E41 0%, rgba(217,158,65,0) 70%)' 
                : 'radial-gradient(circle, #F4EE8E 0%, rgba(231,199,104,0) 70%)'
            }}
          />

          {/* Rotating Rings & Synapses Container */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
            {/* Outer Rotating Ring 1 */}
            <div 
              className="absolute inset-0 rounded-full border border-amber-400/40 border-t-amber-300 border-r-transparent animate-spin" 
              style={{ animationDuration: '6s' }}
            />
            {/* Outer Reverse Ring 2 */}
            <div 
              className="absolute inset-1.5 rounded-full border border-dashed border-amber-500/50 border-b-amber-300 animate-spin" 
              style={{ animationDuration: '4s', animationDirection: 'reverse' }}
            />
            {/* Inner Glowing Orbit */}
            <div 
              className="absolute inset-3 rounded-full border border-amber-300/60 border-l-transparent animate-spin" 
              style={{ animationDuration: '3s' }}
            />
            
            {/* Synapse dots */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_8px_#F4EE8E] animate-pulse" />
            <div className="absolute bottom-1 right-2 w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#E7C768] animate-ping" />
            <div className="absolute top-3 left-1 w-1.5 h-1.5 rounded-full bg-yellow-200 shadow-[0_0_6px_#FFF8B4]" />

            {/* Mascot Pod */}
            <div 
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 flex items-center justify-center relative overflow-hidden p-2 shadow-2xl backdrop-blur-md"
              style={{
                backgroundColor: isLightTheme ? 'rgba(255, 253, 245, 0.9)' : 'rgba(20, 10, 1, 0.9)',
                borderColor: isLightTheme ? '#D99E41' : '#E7C768',
                boxShadow: isLightTheme 
                  ? 'inset 0 0 15px rgba(217, 158, 65, 0.3), 0 0 20px rgba(217, 158, 65, 0.2)' 
                  : 'inset 0 0 20px rgba(244, 238, 142, 0.25), 0 0 30px rgba(244, 238, 142, 0.3)'
              }}
            >
              <img 
                src="/file/36/rr-logo.png" 
                alt="Маскот ИИ Ревизор" 
                className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(244,238,142,0.6)] animate-pulse"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                  const parent = (e.target as HTMLElement).parentElement;
                  if (parent) {
                    const fallbackDiv = parent.querySelector('.mascot-fallback');
                    if (fallbackDiv) (fallbackDiv as HTMLElement).style.display = 'flex';
                  }
                }}
              />
              <div className="mascot-fallback hidden w-full h-full items-center justify-center">
                <Bot className="w-8 h-8 text-amber-500 animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Title */}
        <h3 
          className="text-base sm:text-lg font-bold mb-1 px-2"
          style={{ color: isLightTheme ? '#451A03' : '#F4EE8E' }}
        >
          {overallStatus === 'completed' 
            ? (reportTitle ? `проверка «${reportTitle}» успешно завершена` : 'проверка успешно завершена')
            : overallStatus === 'error'
            ? 'ошибка при проверке'
            : (currentStep?.fieldLabel ? `Проверка: «${currentStep.fieldLabel}»` : (currentStep?.title || 'ии ревизор выполняет проверку'))}
        </h3>

        {/* Subtitle */}
        <p 
          className="text-sm font-normal mb-3 px-2 opacity-90 leading-relaxed text-center"
          style={{ color: isLightTheme ? '#78350F' : '#E7C768' }}
        >
          {overallStatus === 'completed'
            ? 'все показатели и данные проверены, оценка зафиксирована в базе данных'
            : overallStatus === 'error'
            ? (errorMessage || 'не удалось завершить проверку. пожалуйста, повторите попытку.')
            : (
              <>
                {currentStep?.fileName ? <span className="font-semibold">{currentStep.fileName} — </span> : null}
                {currentStep?.subtitle || 'анализ показателей и вложений...'}
              </>
            )}
        </p>

        {/* Timer Box */}
        {overallStatus === 'running' && (
          <div 
            className="w-full py-2 px-3.5 rounded-2xl border mb-3 flex items-center justify-between font-mono"
            style={{
              backgroundColor: isLightTheme ? 'rgba(250, 246, 236, 0.85)' : 'rgba(20, 10, 1, 0.75)',
              borderColor: isLightTheme ? 'rgba(180, 120, 20, 0.3)' : 'rgba(231, 199, 104, 0.3)'
            }}
          >
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span 
                className="text-sm font-medium"
                style={{ color: isLightTheme ? '#78350F' : '#E7C768' }}
              >
                время ожидания:
              </span>
            </div>
            
            <div 
              className="text-sm font-bold"
              style={{ color: isLightTheme ? '#451A03' : '#F4EE8E' }}
            >
              {seconds} <span className="font-normal opacity-70">сек</span>
            </div>
          </div>
        )}

        {/* Progress Bar & Percentage */}
        <div className="w-full mb-4">
          <div className="flex items-center justify-between text-sm font-bold mb-1.5 px-0.5 font-mono">
            <span style={{ color: isLightTheme ? '#78350F' : '#E7C768' }}>
              прогресс проверки:
            </span>
            <span 
              className="text-sm font-extrabold px-2 py-0.5 rounded-lg border"
              style={{
                backgroundColor: isLightTheme ? 'rgba(250, 246, 236, 0.9)' : 'rgba(30, 15, 2, 0.9)',
                borderColor: isLightTheme ? 'rgba(180, 120, 20, 0.3)' : 'rgba(231, 199, 104, 0.3)',
                color: isLightTheme ? '#451A03' : '#F4EE8E'
              }}
            >
              {progressPercent}%
            </span>
          </div>
          <div 
            className="w-full h-2.5 rounded-full overflow-hidden p-0.5 border"
            style={{
              backgroundColor: isLightTheme ? '#EAE0CC' : '#140A01',
              borderColor: isLightTheme ? 'rgba(180, 120, 20, 0.2)' : 'rgba(231, 199, 104, 0.2)'
            }}
          >
            <div 
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${Math.max(5, progressPercent)}%`,
                background: isLightTheme 
                  ? 'linear-gradient(90deg, #D99E41, #F4EE8E)' 
                  : 'linear-gradient(90deg, #E7C768, #F4EE8E)'
              }}
            />
          </div>
        </div>

        {/* Cascading Steps Tracker Card List */}
        <div className="w-full space-y-2.5 mb-4 text-left" id="cascade-steps-list">
          {steps.map((step, idx) => {
            const isDone = step.status === 'completed';
            const isErr = step.status === 'error';
            const isSkipped = step.status === 'skipped';
            const isCurrent = idx === currentStepIndex && overallStatus === 'running' && !isDone && !isErr && !isSkipped;
            const isExpanded = expandedStepId === step.id;

            return (
              <div 
                key={step.id}
                className="w-full rounded-2xl border p-3.5 transition-all backdrop-blur-md"
                style={{
                  backgroundColor: isLightTheme
                    ? (isCurrent ? 'rgba(250, 246, 236, 0.98)' : 'rgba(255, 255, 255, 0.85)')
                    : (isCurrent ? 'rgba(42, 23, 5, 0.95)' : 'rgba(20, 10, 1, 0.7)'),
                  borderColor: isCurrent
                    ? (isLightTheme ? '#D99E41' : '#F4EE8E')
                    : (isLightTheme ? 'rgba(180, 120, 20, 0.25)' : 'rgba(231, 199, 104, 0.25)'),
                  boxShadow: isCurrent
                    ? (isLightTheme ? '0 0 15px rgba(217, 158, 65, 0.2)' : '0 0 20px rgba(244, 238, 142, 0.2)')
                    : 'none'
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div 
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border"
                      style={{
                        backgroundColor: isLightTheme ? '#FAF6EC' : 'rgba(30, 15, 2, 0.9)',
                        borderColor: isLightTheme ? 'rgba(180, 120, 20, 0.3)' : 'rgba(231, 199, 104, 0.3)'
                      }}
                    >
                      {getStepIcon(step.type)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center flex-wrap gap-1.5">
                        <span 
                          className="text-sm font-bold truncate max-w-[240px] sm:max-w-[320px]"
                          style={{ color: isLightTheme ? '#451A03' : '#F4EE8E' }}
                          title={step.fieldLabel || step.title}
                        >
                          {step.fieldLabel ? `Поле: «${step.fieldLabel}»` : step.title}
                        </span>
                        {step.fileName && (
                          <span 
                            className="text-sm px-2 py-0.5 rounded border truncate max-w-[150px] font-mono"
                            style={{
                              backgroundColor: isLightTheme ? '#F4EDE0' : 'rgba(42, 23, 5, 0.8)',
                              borderColor: isLightTheme ? 'rgba(180, 120, 20, 0.3)' : 'rgba(231, 199, 104, 0.3)',
                              color: isLightTheme ? '#78350F' : '#E7C768'
                            }}
                            title={step.fileName}
                          >
                            {step.fileName}
                          </span>
                        )}
                      </div>
                      <p 
                        className="text-sm leading-tight truncate mt-0.5"
                        style={{ color: isLightTheme ? '#78350F' : '#E7C768' }}
                      >
                        {step.subtitle}
                      </p>

                      {/* Immediate Result Snippet when completed and not expanded */}
                      {isDone && Boolean(step.resultText) && !isExpanded && (
                        <div 
                          onClick={() => setExpandedStepId(step.id)}
                          className="mt-1.5 text-sm line-clamp-2 cursor-pointer hover:opacity-100 transition-opacity select-text"
                          style={{ color: isLightTheme ? '#78350F' : '#E7C768' }}
                          title="нажмите, чтобы раскрыть весь текст"
                        >
                          <span className="font-bold text-amber-500 mr-1">результат:</span>
                          <span>{step.resultText}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-amber-400/10">
                    {/* Status Badge: running, completed, error, or pending */}
                    {isCurrent && (
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-500 animate-pulse">
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                        <span>проверяется</span>
                      </div>
                    )}

                    {isDone && (
                      <div className="flex items-center gap-1.5 text-sm font-bold text-amber-400">
                        <div className="w-5 h-5 rounded-full border border-amber-400/60 flex items-center justify-center bg-amber-400/20">
                          <Check className="w-3.5 h-3.5 text-amber-300" />
                        </div>
                        <span>готово</span>
                      </div>
                    )}

                    {isSkipped && (
                      <span className="text-sm opacity-60 text-stone-400">
                        пропущено
                      </span>
                    )}

                    {isErr && (
                      <div className="flex items-center gap-1.5 text-sm font-bold text-red-400">
                        <div className="w-5 h-5 rounded-full border border-red-400/60 flex items-center justify-center bg-red-500/20">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                        </div>
                        <span>ошибка</span>
                      </div>
                    )}

                    {/* Result disclosure toggle button */}
                    {Boolean(step.resultText) && (
                      <button
                        type="button"
                        onClick={() => setExpandedStepId(isExpanded ? null : step.id)}
                        title={isExpanded ? "свернуть полученный текст" : "раскрыть полученный текст"}
                        className="p-1 px-2.5 rounded-xl border transition-all cursor-pointer opacity-90 hover:opacity-100 flex items-center gap-1 text-sm font-medium"
                        style={{
                          borderColor: isLightTheme ? 'rgba(180, 120, 20, 0.35)' : 'rgba(231, 199, 104, 0.4)',
                          backgroundColor: isLightTheme ? 'rgba(250, 246, 236, 0.8)' : 'rgba(42, 23, 5, 0.8)',
                          color: isLightTheme ? '#78350F' : '#F4EE8E'
                        }}
                      >
                        <span>{isExpanded ? 'свернуть' : 'раскрыть текст'}</span>
                        {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Error explanation: clear reason why the function failed */}
                {isErr && (
                  <div 
                    className="mt-2.5 text-sm rounded-xl p-3 border flex items-start gap-2.5"
                    style={{
                      backgroundColor: isLightTheme ? 'rgba(254, 242, 242, 0.95)' : 'rgba(45, 15, 15, 0.8)',
                      borderColor: isLightTheme ? 'rgba(239, 68, 68, 0.35)' : 'rgba(239, 68, 68, 0.5)',
                      color: isLightTheme ? '#991B1B' : '#FCA5A5'
                    }}
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                    <div className="min-w-0 text-left">
                      <span className="font-bold block mb-0.5">причина ошибки:</span>
                      <p className="break-words opacity-95 text-sm">{step.errorReason || 'сервер распознавания не вернул ответ или файл недоступен'}</p>
                    </div>
                  </div>
                )}

                {/* Expanded AI Output Details */}
                {isExpanded && step.resultText && (
                  <div 
                    className="mt-2.5 pt-2.5 border-t text-sm leading-relaxed rounded-xl p-3"
                    style={{
                      borderColor: isLightTheme ? 'rgba(180, 120, 20, 0.25)' : 'rgba(231, 199, 104, 0.25)',
                      backgroundColor: isLightTheme ? 'rgba(255, 255, 255, 0.9)' : 'rgba(15, 8, 1, 0.75)',
                      color: isLightTheme ? '#451A03' : '#F4EE8E'
                    }}
                  >
                    <div className="flex items-center justify-between gap-1.5 mb-1.5 font-semibold text-amber-400">
                      <div className="flex items-center gap-1.5">
                        <Bot className="w-4 h-4" />
                        <span>полученный текст функции:</span>
                      </div>
                      <span className="text-sm opacity-75 font-mono">
                        {step.resultText.length} симв.
                      </span>
                    </div>
                    <div className="max-h-48 overflow-y-auto whitespace-pre-wrap font-sans text-sm break-words select-text opacity-95">
                      {step.resultText}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Actions */}
        {overallStatus === 'running' && (
          <div className="w-full flex flex-col sm:flex-row gap-2">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-2xl font-bold text-sm border shadow-md hover:brightness-105 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
                style={{
                  backgroundColor: isLightTheme ? '#D99E41' : '#E7C768',
                  borderColor: isLightTheme ? '#B47814' : '#F4EE8E',
                  color: '#140A01',
                  boxShadow: '0 4px 15px rgba(231, 199, 104, 0.25)'
                }}
              >
                <span>свернуть проверку в фон</span>
              </button>
            )}

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="py-3 px-4 rounded-2xl font-bold text-sm border shadow-md hover:brightness-105 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
                style={{
                  backgroundColor: isLightTheme ? 'rgba(250, 246, 236, 0.95)' : 'rgba(35, 18, 4, 0.95)',
                  borderColor: isLightTheme ? 'rgba(180, 120, 20, 0.4)' : 'rgba(231, 199, 104, 0.4)',
                  color: isLightTheme ? '#78350F' : '#F4EE8E',
                  boxShadow: isLightTheme ? '0 2px 10px rgba(180, 120, 20, 0.15)' : '0 0 15px rgba(244, 238, 142, 0.15)'
                }}
              >
                <X className="w-4 h-4" />
                <span>прервать</span>
              </button>
            )}
          </div>
        )}

        {overallStatus === 'completed' && (
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-6 rounded-2xl font-bold text-sm border shadow-lg hover:brightness-110 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
            style={{
              backgroundColor: isLightTheme ? '#D99E41' : '#E7C768',
              borderColor: isLightTheme ? '#B47814' : '#F4EE8E',
              color: '#140A01',
              boxShadow: '0 4px 20px rgba(231, 199, 104, 0.35)'
            }}
          >
            <Check className="w-4 h-4" />
            <span>принять результаты и перейти к отчету</span>
          </button>
        )}

        {overallStatus === 'error' && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="w-full py-3 px-6 rounded-2xl font-bold text-sm border shadow-lg hover:brightness-110 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
            style={{
              backgroundColor: isLightTheme ? '#D99E41' : '#E7C768',
              borderColor: isLightTheme ? '#B47814' : '#F4EE8E',
              color: '#140A01',
              boxShadow: '0 4px 20px rgba(231, 199, 104, 0.35)'
            }}
          >
            <RefreshCw className="w-4 h-4 animate-spin-reverse" />
            <span>повторить каскадную проверку</span>
          </button>
        )}
      </div>
    </div>,
    document.body
  );
};
