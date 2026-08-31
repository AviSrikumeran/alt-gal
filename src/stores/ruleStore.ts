import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DesignRule } from '@/types/rules';

/** Owns design rules only. Evaluation lives in engine/ruleEngine.ts (D-050). */
export interface RuleState {
  rules: DesignRule[];
}
export interface RuleActions {
  add(rule: DesignRule, index?: number): void;
  remove(id: string): DesignRule | null;
  setEnabled(id: string, enabled: boolean): void;
  get(id: string): DesignRule | undefined;
  list(): DesignRule[];
  listEnabled(): DesignRule[];
  reset(): void;
}
export type RuleStore = RuleState & RuleActions;

export const useRuleStore = create<RuleStore>()(
  persist(
    (set, get) => ({
      rules: [],
      add: (rule, index) =>
        set((s) => {
          const r = [...s.rules];
          r.splice(index ?? r.length, 0, rule);
          return { rules: r };
        }),
      remove: (id) => {
        const cur = get().rules.find((r) => r.id === id) ?? null;
        if (cur) set((s) => ({ rules: s.rules.filter((r) => r.id !== id) }));
        return cur;
      },
      setEnabled: (id, enabled) => set((s) => ({ rules: s.rules.map((r) => (r.id === id ? { ...r, enabled } : r)) })),
      get: (id) => get().rules.find((r) => r.id === id),
      list: () => get().rules,
      listEnabled: () => get().rules.filter((r) => r.enabled),
      reset: () => set({ rules: [] }),
    }),
    { name: 'altgal.rules.v1', version: 1 },
  ),
);
