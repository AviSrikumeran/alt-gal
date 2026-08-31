import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ComponentSpec, ComponentSummary } from '@/types/components';

/** Owns every ComponentSpec on the canvas, including page-owned ones (D-053). */
export interface ComponentState {
  components: ComponentSpec[];
}
export interface ComponentActions {
  add(spec: ComponentSpec, index?: number): void;
  update(id: string, patch: Partial<Omit<ComponentSpec, 'id' | 'type' | 'createdAt' | 'createdBy'>>): boolean;
  remove(id: string): ComponentSpec | null; // returns removed spec for undo
  removeMany(ids: string[]): void;
  get(id: string): ComponentSpec | undefined;
  list(): ComponentSpec[];
  listLoose(): ComponentSpec[]; // pageId === null (canvas in phase 2/3)
  summaries(): ComponentSummary[];
  count(): number;
  ids(): string[];
  reset(): void;
}
export type ComponentStore = ComponentState & ComponentActions;

export const useComponentStore = create<ComponentStore>()(
  persist(
    (set, get) => ({
      components: [],
      add: (spec, index) =>
        set((s) => {
          const c = [...s.components];
          c.splice(index ?? c.length, 0, spec);
          return { components: c };
        }),
      update: (id, patch) => {
        const cur = get().components.find((c) => c.id === id);
        if (!cur) return false;
        set((s) => ({
          components: s.components.map((c) => (c.id === id ? ({ ...c, ...patch } as ComponentSpec) : c)),
        }));
        return true;
      },
      remove: (id) => {
        const cur = get().components.find((c) => c.id === id) ?? null;
        if (cur) set((s) => ({ components: s.components.filter((c) => c.id !== id) }));
        return cur;
      },
      removeMany: (ids) => set((s) => ({ components: s.components.filter((c) => !ids.includes(c.id)) })),
      get: (id) => get().components.find((c) => c.id === id),
      list: () => get().components,
      listLoose: () => get().components.filter((c) => c.pageId === null),
      summaries: () => /* STREAM 2: implement (uses content.ts primaryText) */ [],
      count: () => get().components.length,
      ids: () => get().components.map((c) => c.id),
      reset: () => set({ components: [] }),
    }),
    { name: 'altgal.components.v1', version: 1, partialize: (s) => ({ components: s.components }) },
  ),
);
