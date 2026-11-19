import { create } from 'zustand';
import { CascadeStep } from '../components/raport/ReportCascadeCheckOverlay';
import { SubmittedReport } from '../types';

export interface CascadeCheckState {
  isCascadeOverlayOpen: boolean;
  isBackgroundMinified: boolean;
  cascadeOverallStatus: 'idle' | 'running' | 'completed' | 'error';
  cascadeSteps: CascadeStep[];
  currentCascadeStepIndex: number;
  cascadeErrorMessage: string | null;
  submittedResult: SubmittedReport | null;
  reportTitle: string;
  employeeName: string;
  onRetry?: () => void;

  // Actions
  startCascadeCheck: (steps: CascadeStep[], reportTitle?: string, employeeName?: string, onRetry?: () => void) => void;
  setOnRetry: (fn?: () => void) => void;
  updateCascadeStep: (index: number, patch: Partial<CascadeStep>) => void;
  setCascadeStepRunning: (index: number) => void;
  setCascadeOverallStatus: (status: 'idle' | 'running' | 'completed' | 'error', errorMessage?: string | null) => void;
  setMinified: (minified: boolean) => void;
  setOverlayOpen: (open: boolean) => void;
  restoreToForeground: () => void;
  sendToBackground: () => void;
  setSubmittedResult: (result: SubmittedReport | null) => void;
  resetCheck: () => void;
}

export const useCascadeCheckStore = create<CascadeCheckState>((set) => ({
  isCascadeOverlayOpen: false,
  isBackgroundMinified: false,
  cascadeOverallStatus: 'idle',
  cascadeSteps: [],
  currentCascadeStepIndex: 0,
  cascadeErrorMessage: null,
  submittedResult: null,
  reportTitle: '',
  employeeName: '',
  onRetry: undefined,

  startCascadeCheck: (steps, reportTitle = '', employeeName = '', onRetry?: () => void) => set({
    cascadeSteps: steps,
    currentCascadeStepIndex: 0,
    cascadeOverallStatus: 'running',
    isBackgroundMinified: false,
    isCascadeOverlayOpen: true,
    cascadeErrorMessage: null,
    reportTitle,
    employeeName,
    onRetry
  }),

  setOnRetry: (fn?: () => void) => set({ onRetry: fn }),

  updateCascadeStep: (index, patch) => set((state) => ({
    cascadeSteps: state.cascadeSteps.map((s, i) => i === index ? { ...s, ...patch } : s)
  })),

  setCascadeStepRunning: (index) => set((state) => ({
    currentCascadeStepIndex: index,
    cascadeSteps: state.cascadeSteps.map((s, i) => i === index ? { ...s, status: 'running' } : s)
  })),

  setCascadeOverallStatus: (status, errorMessage = null) => set((state) => {
    const isFinished = status === 'completed' || status === 'error';
    return {
      cascadeOverallStatus: status,
      cascadeErrorMessage: errorMessage,
      // After check finishes, automatically open modal and restore from background
      ...(isFinished ? { isBackgroundMinified: false, isCascadeOverlayOpen: true } : {})
    };
  }),

  setMinified: (minified) => set({ isBackgroundMinified: minified }),

  setOverlayOpen: (open) => set({ isCascadeOverlayOpen: open }),

  // Restore forcefully from background to foreground modal
  restoreToForeground: () => set({
    isBackgroundMinified: false,
    isCascadeOverlayOpen: true
  }),

  // Forcibly send to background (e.g. when user navigates to another page)
  sendToBackground: () => set({
    isBackgroundMinified: true,
    isCascadeOverlayOpen: false
  }),

  setSubmittedResult: (result) => set({ submittedResult: result }),

  resetCheck: () => set({
    isCascadeOverlayOpen: false,
    isBackgroundMinified: false,
    cascadeOverallStatus: 'idle',
    cascadeSteps: [],
    currentCascadeStepIndex: 0,
    cascadeErrorMessage: null,
    submittedResult: null
  })
}));
