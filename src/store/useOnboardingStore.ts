import { create } from 'zustand';
import {
  OnboardingPayload,
  OnboardingStepId,
  VerificationResult,
} from '../components/onboarding/types';

interface OnboardingStoreState {
  isOpen: boolean;
  isLoading: boolean;
  isProcessingAi: boolean;
  isVerifying: boolean;
  error: string | null;
  lastActionMessage: string | null;
  lastActionData: any;
  verificationByStep: Record<string, VerificationResult>;
  data: OnboardingPayload | null;

  openModal: () => void;
  closeModal: () => void;
  fetchOnboarding: (userId: string, options?: { autoOpenIfFresh?: boolean }) => Promise<OnboardingPayload | null>;
  selectStep: (userId: string, stepId: OnboardingStepId) => Promise<void>;
  skipStep: (userId: string, stepId: OnboardingStepId, nextStepId?: OnboardingStepId) => Promise<void>;
  minimizeWizard: (userId: string) => Promise<void>;
  restoreWizard: (userId: string) => Promise<void>;
  completeWizard: (userId: string) => Promise<void>;
  runAiAction: (
    userId: string,
    stepId: OnboardingStepId,
    params: { action?: string; input?: string; payload?: Record<string, any> }
  ) => Promise<{ success: boolean; message?: string; data?: any; error?: string }>;
  verifyStep: (
    userId: string,
    stepId: OnboardingStepId,
    options?: { send_test_telegram?: boolean; test_chat_id?: string }
  ) => Promise<VerificationResult | null>;
  cleanupTests: (userId: string) => Promise<boolean>;
  resetOnboarding: (userId: string) => Promise<void>;
  clearMessages: () => void;
}

export const useOnboardingStore = create<OnboardingStoreState>((set, get) => ({
  isOpen: false,
  isLoading: false,
  isProcessingAi: false,
  isVerifying: false,
  error: null,
  lastActionMessage: null,
  lastActionData: null,
  verificationByStep: {},
  data: null,

  openModal: () => set({ isOpen: true, error: null }),
  closeModal: () => set({ isOpen: false }),
  clearMessages: () => set({ error: null, lastActionMessage: null, lastActionData: null }),

  fetchOnboarding: async (userId, options = {}) => {
    if (!userId) return null;
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/onboarding/${encodeURIComponent(userId)}`);
      const json = await res.json();
      if (!json.success || !json.onboarding) {
        set({ isLoading: false, error: json.error || 'Не удалось загрузить онбординг' });
        return null;
      }
      const onb: OnboardingPayload = json.onboarding;
      let shouldOpen = get().isOpen;

      if (options.autoOpenIfFresh) {
        let justRegistered = false;
        try {
          const regFlag = sessionStorage.getItem('rr_just_registered');
          if (regFlag && String(regFlag) === String(userId)) {
            justRegistered = true;
            sessionStorage.removeItem('rr_just_registered');
          }
        } catch {}

        const untouchedZero = onb.completed_count === 0 && !onb.is_minimized && !onb.is_completed;
        if (justRegistered || (untouchedZero && !onb.is_completed)) {
          shouldOpen = true;
        }
      }

      set({ data: onb, isLoading: false, isOpen: shouldOpen });
      return onb;
    } catch (err: any) {
      set({ isLoading: false, error: err?.message || 'Ошибка сети при загрузке онбординга' });
      return null;
    }
  },

  selectStep: async (userId, stepId) => {
    const current = get().data;
    if (current) {
      set({
        data: { ...current, current_step_id: stepId },
        error: null,
        lastActionMessage: null,
        lastActionData: null,
      });
    }
    try {
      const res = await fetch(`/api/onboarding/${encodeURIComponent(userId)}/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_step_id: stepId }),
      });
      const json = await res.json();
      if (json.success && json.steps) {
        const latest = get().data;
        if (latest) {
          set({
            data: {
              ...latest,
              current_step_id: stepId,
              steps: json.steps,
              completed_count: json.steps.filter((s: any) => s.status === 'completed').length,
            },
          });
        }
      }
    } catch {}
  },

  skipStep: async (userId, stepId, nextStepId) => {
    set({ error: null, lastActionMessage: null, lastActionData: null });
    try {
      const res = await fetch(`/api/onboarding/${encodeURIComponent(userId)}/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step_id: stepId,
          status: 'skipped',
          current_step_id: nextStepId || stepId,
        }),
      });
      const json = await res.json();
      if (json.success) {
        const cur = get().data;
        if (cur) {
          set({
            data: {
              ...cur,
              current_step_id: nextStepId || cur.current_step_id,
              steps: json.steps || cur.steps,
              completed_count: (json.steps || cur.steps).filter((s: any) => s.status === 'completed').length,
            },
          });
        }
      }
    } catch (err: any) {
      set({ error: err?.message || 'Не удалось пропустить шаг' });
    }
  },

  minimizeWizard: async (userId) => {
    set({ isOpen: false });
    try {
      await fetch(`/api/onboarding/${encodeURIComponent(userId)}/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_minimized: true }),
      });
      const cur = get().data;
      if (cur) set({ data: { ...cur, is_minimized: true } });
    } catch {}
  },

  restoreWizard: async (userId) => {
    set({ isOpen: true, error: null });
    try {
      await fetch(`/api/onboarding/${encodeURIComponent(userId)}/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_minimized: false }),
      });
      await get().fetchOnboarding(userId);
    } catch {}
  },

  completeWizard: async (userId) => {
    set({ isOpen: false });
    try {
      await fetch(`/api/onboarding/${encodeURIComponent(userId)}/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_completed: true, is_minimized: true }),
      });
      const cur = get().data;
      if (cur) set({ data: { ...cur, is_completed: true, is_minimized: true } });
    } catch {}
  },

  runAiAction: async (userId, stepId, params) => {
    set({ isProcessingAi: true, error: null, lastActionMessage: null });
    try {
      const res = await fetch(`/api/onboarding/${encodeURIComponent(userId)}/ai-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step_id: stepId,
          action: params.action || 'ai_generate',
          input: params.input || '',
          payload: params.payload || {},
        }),
      });
      const json = await res.json();
      if (!json.success) {
        const errMsg = json.error || 'Не удалось выполнить действие';
        set({ isProcessingAi: false, error: errMsg });
        return { success: false, error: errMsg };
      }

      set({
        isProcessingAi: false,
        lastActionMessage: json.message || 'Сохранено!',
        lastActionData: json.data || null,
      });

      // Refresh full context & audit from PostgreSQL
      await get().fetchOnboarding(userId);

      // Sync Cabinet UI in real time
      try {
        window.dispatchEvent(new Event('db-updated'));
        window.dispatchEvent(new Event('db-company-updated'));
        window.dispatchEvent(new Event('db-departments-updated'));
        window.dispatchEvent(new Event('db-employees-updated'));
        window.dispatchEvent(new Event('db-reports-updated'));
        window.dispatchEvent(new Event('db-users-updated'));
        window.dispatchEvent(new Event('user-profile-updated'));
      } catch {}

      return { success: true, message: json.message, data: json.data };
    } catch (err: any) {
      const errMsg = err?.message || 'Ошибка соединения при выполнении операции';
      set({ isProcessingAi: false, error: errMsg });
      return { success: false, error: errMsg };
    }
  },

  verifyStep: async (userId, stepId, options = {}) => {
    set({ isVerifying: true, error: null });
    try {
      const res = await fetch(`/api/onboarding/${encodeURIComponent(userId)}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step_id: stepId,
          send_test_telegram: Boolean(options.send_test_telegram),
          test_chat_id: options.test_chat_id || undefined,
        }),
      });
      const json = await res.json();
      set({ isVerifying: false });
      if (!json.success) {
        set({ error: json.error || 'Ошибка проверки этапа' });
        return null;
      }

      const result: VerificationResult = {
        step_id: stepId,
        passed: Boolean(json.passed),
        output: json.output || '',
        checks: Array.isArray(json.checks) ? json.checks : [],
      };

      const prevVerif = get().verificationByStep;
      const cur = get().data;
      set({
        verificationByStep: { ...prevVerif, [stepId]: result },
        data:
          cur && Array.isArray(json.steps)
            ? {
                ...cur,
                steps: json.steps,
                completed_count: json.steps.filter((s: any) => s.status === 'completed').length,
              }
            : cur,
      });

      return result;
    } catch (err: any) {
      set({ isVerifying: false, error: err?.message || 'Ошибка сети при проверке этапа' });
      return null;
    }
  },

  cleanupTests: async (userId) => {
    set({ isProcessingAi: true, error: null });
    try {
      const res = await fetch(`/api/onboarding/${encodeURIComponent(userId)}/cleanup-tests`, {
        method: 'POST',
      });
      const json = await res.json();
      set({
        isProcessingAi: false,
        lastActionMessage: json.message || 'Тестовые данные очищены',
      });
      await get().fetchOnboarding(userId);
      try {
        window.dispatchEvent(new Event('db-updated'));
        window.dispatchEvent(new Event('db-reports-updated'));
      } catch {}
      return Boolean(json.success);
    } catch {
      set({ isProcessingAi: false, error: 'Не удалось очистить тестовые артефакты' });
      return false;
    }
  },

  resetOnboarding: async (userId) => {
    set({ isLoading: true, error: null, verificationByStep: {}, lastActionMessage: null });
    try {
      await fetch(`/api/onboarding/${encodeURIComponent(userId)}/reset`, { method: 'POST' });
      await get().fetchOnboarding(userId);
    } finally {
      set({ isLoading: false });
    }
  },
}));
