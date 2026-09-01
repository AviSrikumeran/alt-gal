import { create } from 'zustand';

/**
 * The toast rail (D-126 overwrite, D-154 phase-down, D-176 persist reset, blocked undo).
 *
 * Studio-local on purpose: it is presentation state with no protocol meaning, so it stays out of
 * `uiStore` — whose shape is frozen (§11.2) — and out of the persisted stores.
 */
export interface Toast {
  id: number;
  message: string;
  tone: 'info' | 'warn' | 'agent';
  actionLabel?: string;
  onAction?: () => void;
  ttl: number;
}

interface ToastState {
  toasts: Toast[];
  push(toast: Omit<Toast, 'id' | 'ttl'> & { ttl?: number }): number;
  dismiss(id: number): void;
}

let nextId = 1;

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  push: (toast) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { ttl: 6000, ...toast, id }] }));
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const pushToast = (toast: Omit<Toast, 'id' | 'ttl'> & { ttl?: number }): number =>
  useToastStore.getState().push(toast);
