import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RenderedPage, Wireframe, WireframeSection } from '@/types/layouts';

/** Owns wireframes, rendered pages, and which wireframe the canvas shows (D-054). */
export interface LayoutState {
  wireframes: Wireframe[];
  renderedPages: RenderedPage[];
  activeWireframeId: string | null;
}
export interface LayoutActions {
  addWireframe(wf: Wireframe, index?: number): void; // also sets active
  removeWireframe(id: string): Wireframe | null;
  setSections(wireframeId: string, sections: WireframeSection[]): boolean;
  setWireframeStatus(wireframeId: string, status: Wireframe['status']): void;
  setActiveWireframe(id: string | null): void;
  addRenderedPage(page: RenderedPage): void;
  removeRenderedPage(id: string): RenderedPage | null;
  getWireframe(id: string): Wireframe | undefined;
  getPage(id: string): RenderedPage | undefined;
  getActiveWireframe(): Wireframe | undefined;
  getActivePage(): RenderedPage | undefined; // page whose wireframeId === activeWireframeId
  reset(): void;
}
export type LayoutStore = LayoutState & LayoutActions;

export const useLayoutStore = create<LayoutStore>()(
  persist(
    (set, get) => ({
      wireframes: [],
      renderedPages: [],
      activeWireframeId: null,
      addWireframe: (wf, index) =>
        set((s) => {
          const w = [...s.wireframes];
          w.splice(index ?? w.length, 0, wf);
          return { wireframes: w, activeWireframeId: wf.id };
        }),
      removeWireframe: (id) => {
        const cur = get().wireframes.find((w) => w.id === id) ?? null;
        if (cur)
          set((s) => ({
            wireframes: s.wireframes.filter((w) => w.id !== id),
            activeWireframeId:
              s.activeWireframeId === id ? (s.wireframes.find((w) => w.id !== id)?.id ?? null) : s.activeWireframeId,
          }));
        return cur;
      },
      setSections: (wireframeId, sections) => {
        if (!get().wireframes.some((w) => w.id === wireframeId)) return false;
        set((s) => ({ wireframes: s.wireframes.map((w) => (w.id === wireframeId ? { ...w, sections } : w)) }));
        return true;
      },
      setWireframeStatus: (wireframeId, status) =>
        set((s) => ({ wireframes: s.wireframes.map((w) => (w.id === wireframeId ? { ...w, status } : w)) })),
      setActiveWireframe: (id) => set({ activeWireframeId: id }),
      addRenderedPage: (page) => set((s) => ({ renderedPages: [...s.renderedPages, page] })),
      removeRenderedPage: (id) => {
        const cur = get().renderedPages.find((p) => p.id === id) ?? null;
        if (cur) set((s) => ({ renderedPages: s.renderedPages.filter((p) => p.id !== id) }));
        return cur;
      },
      getWireframe: (id) => get().wireframes.find((w) => w.id === id),
      getPage: (id) => get().renderedPages.find((p) => p.id === id),
      getActiveWireframe: () => get().wireframes.find((w) => w.id === get().activeWireframeId),
      getActivePage: () => get().renderedPages.find((p) => p.wireframeId === get().activeWireframeId),
      reset: () => set({ wireframes: [], renderedPages: [], activeWireframeId: null }),
    }),
    { name: 'altgal.layouts.v1', version: 1 },
  ),
);
