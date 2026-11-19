import React from 'react';
import { useCascadeCheckStore } from '../../store/useCascadeCheckStore';
import { ReportCascadeCheckOverlay } from './ReportCascadeCheckOverlay';
import { Loader2, Check, AlertCircle, X } from 'lucide-react';

interface GlobalCascadeWidgetProps {
  isLightTheme?: boolean;
  onNavigateToVerdict?: (reportId: string) => void;
}

export const GlobalCascadeWidget: React.FC<GlobalCascadeWidgetProps> = ({
  isLightTheme = false,
  onNavigateToVerdict
}) => {
  const {
    isCascadeOverlayOpen,
    isBackgroundMinified,
    cascadeOverallStatus,
    cascadeSteps,
    currentCascadeStepIndex,
    cascadeErrorMessage,
    submittedResult,
    reportTitle,
    employeeName,
    onRetry,
    restoreToForeground,
    sendToBackground,
    setOverlayOpen,
    resetCheck
  } = useCascadeCheckStore();

  const isRunning = cascadeOverallStatus === 'running';
  const isCompleted = cascadeOverallStatus === 'completed';
  const isError = cascadeOverallStatus === 'error';

  // Pinned floating badge must ALWAYS stay visible whenever the overlay is not open and a check is active or finished
  const showFloatingWidget = !isCascadeOverlayOpen && (isRunning || isCompleted || isError);

  const completedStepsCount = cascadeSteps.filter(s => s.status === 'completed').length;
  const totalStepsCount = cascadeSteps.length;

  return (
    <>
      {/* Global Cascading Multi-Type AI Verification Modal Overlay */}
      <ReportCascadeCheckOverlay
        isOpen={isCascadeOverlayOpen}
        isLightTheme={isLightTheme}
        steps={cascadeSteps}
        currentStepIndex={currentCascadeStepIndex}
        totalSteps={totalStepsCount}
        overallStatus={cascadeOverallStatus}
        errorMessage={cascadeErrorMessage}
        reportTitle={reportTitle}
        employeeName={employeeName}
        onRetry={onRetry}
        onClose={() => {
          if (isRunning) {
            // Send to background
            sendToBackground();
          } else if (isCompleted) {
            // Close and navigate to report/verdict if available
            setOverlayOpen(false);
            if (submittedResult?.id && onNavigateToVerdict) {
              onNavigateToVerdict(submittedResult.id);
            }
            resetCheck();
          } else {
            setOverlayOpen(false);
            resetCheck();
          }
        }}
        onCancel={() => {
          resetCheck();
        }}
      />

      {/* Floating Background Check Indicator Widget - pinned on screen across all pages */}
      {showFloatingWidget && (
        <div
          onClick={() => {
            restoreToForeground();
          }}
          className={`fixed bottom-24 sm:bottom-6 right-3 sm:right-6 z-[9999] p-3 sm:p-4 rounded-2xl border shadow-2xl backdrop-blur-md flex items-center gap-3 cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 select-none ${
            isLightTheme
              ? 'bg-[#FAF6EC]/95 border-amber-600/40 text-amber-950 shadow-[0_4px_25px_rgba(217,158,65,0.3)]'
              : 'bg-[#1A0F02]/95 border-amber-400/50 text-[#F4EE8E] shadow-[0_0_30px_rgba(244,238,142,0.35)]'
          }`}
          title="нажмите, чтобы открыть окно проверки"
        >
          {/* Status Icon */}
          <div className="relative flex items-center justify-center shrink-0">
            {isRunning && (
              <>
                <Loader2 size={24} className="text-amber-500 animate-spin" />
                <div className="absolute w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              </>
            )}
            {isCompleted && (
              <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-400/70 flex items-center justify-center text-amber-400 shadow-[0_0_10px_rgba(244,238,142,0.4)]">
                <Check size={16} className="text-amber-300 stroke-[3]" />
              </div>
            )}
            {isError && (
              <div className="w-7 h-7 rounded-full bg-amber-900/30 border border-amber-500/60 flex items-center justify-center text-amber-400">
                <AlertCircle size={16} />
              </div>
            )}
          </div>

          {/* Text & Steps Info */}
          <div className="flex flex-col text-left min-w-0 pr-1">
            <span className="text-sm font-bold leading-tight">
              {isRunning
                ? 'проверка рапорта в фоне'
                : isCompleted
                ? 'проверка завершена!'
                : 'ошибка проверки'}
            </span>
            <span
              className={`text-sm opacity-85 leading-snug mt-0.5 truncate max-w-[220px] sm:max-w-xs ${
                isLightTheme ? 'text-amber-900' : 'text-amber-200'
              }`}
            >
              {isRunning
                ? `шаг ${completedStepsCount} из ${totalStepsCount} (нажмите для просмотра)`
                : isCompleted
                ? 'нажмите для просмотра результатов'
                : 'нажмите для просмотра деталей'}
            </span>
          </div>

          {/* Close button only available when finished so active running check cannot be accidentally dismissed */}
          {!isRunning && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                resetCheck();
              }}
              className="p-1 rounded-full opacity-60 hover:opacity-100 transition-opacity ml-1 cursor-pointer shrink-0"
              title="закрыть"
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}
    </>
  );
};

export default GlobalCascadeWidget;
