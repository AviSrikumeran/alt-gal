import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ExportFile } from '@/types/export';

export type Viewport = 'desktop' | 'tablet' | 'mobile';
export const VIEWPORT_WIDTHS: Record<Viewport, number> = { desktop: 1280, tablet: 768, mobile: 375 };
export type Theme = 'light' | 'dark';
export type PanelSection = 'colors' | 'typography' | 'spacing' | 'elevation' | 'motion' | 'rules';

export interface UIState {
  viewport: Viewport;
  theme: Theme;
  selectedComponentId: string | null;
  exportOpen: boolean;
  inspectorOpen: boolean;
  onboardingDismissed: boolean;
  panelSections: Record<PanelSection, boolean>; // D-211, persisted
  exportFiles: ExportFile[] | null; // D-211, transient
}
export interface UIActions {
  setViewport(v: Viewport): void;
  setTheme(t: Theme): void;
  select(id: string | null): void;
  setExportOpen(open: boolean): void;
  setInspectorOpen(open: boolean): void;
  dismissOnboarding(): void;
  setPanelSection(section: PanelSection, open: boolean): void;
  setExportFiles(files: ExportFile[] | null): void;
}
export const useUIStore = create<UIState & UIActions>()(
  persist(
    (set) => ({
      viewport: 'desktop',
      theme: 'light',
      selectedComponentId: null,
      exportOpen: false,
      inspectorOpen: false,
      onboardingDismissed: false,
      panelSections: { colors: true, typography: true, spacing: false, elevation: false, motion: false, rules: true }, // D-145
      exportFiles: null,
      setViewport: (viewport) => set({ viewport }),
      setTheme: (theme) => set({ theme }),
      select: (selectedComponentId) => set({ selectedComponentId }),
      setExportOpen: (exportOpen) => set({ exportOpen }),
      setInspectorOpen: (inspectorOpen) => set({ inspectorOpen }),
      dismissOnboarding: () => set({ onboardingDismissed: true }),
      setPanelSection: (section, open) => set((s) => ({ panelSections: { ...s.panelSections, [section]: open } })),
      setExportFiles: (exportFiles) => set({ exportFiles }),
    }),
    {
      name: 'altgal.ui.v1',
      version: 1,
      partialize: (s) => ({ onboardingDismissed: s.onboardingDismissed, panelSections: s.panelSections }),
    },
  ),
);
