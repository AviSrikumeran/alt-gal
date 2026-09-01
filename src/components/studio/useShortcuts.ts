'use client';
import { useEffect } from 'react';
import type { Viewport } from '@/stores/uiStore';
import { useUIStore } from '@/stores/uiStore';
import { useLogStore } from '@/stores/logStore';
import { usePhaseStore } from '@/stores/phaseStore';
import { useTokenStore } from '@/stores/tokenStore';
import { undoEntry } from '@/engine/undo';
import { pushToast } from './toastStore';
import { S } from './strings';

const VIEWPORT_KEYS: Record<string, Viewport> = { '1': 'desktop', '2': 'tablet', '3': 'mobile' };

const inText = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

/**
 * D-207. Cmd/Ctrl+Z is the one that is never cut: undo has to be reachable without hunting for the
 * log entry. Everything else is convenience, and all of it is ignored while typing.
 */
export function useShortcuts(onShowSheet: () => void): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (inText(e.target)) return;
      const meta = e.metaKey || e.ctrlKey;

      if (meta && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        const entry = useLogStore.getState().lastUndoable();
        if (!entry) return;
        const result = undoEntry(entry.id);
        if (!result.ok) pushToast({ message: S.undoBlocked(result.reason), tone: 'warn' });
        return;
      }
      if (meta && e.key.toLowerCase() === 'e') {
        if (usePhaseStore.getState().currentPhase < 4) return;
        e.preventDefault();
        useUIStore.getState().setExportOpen(true);
        return;
      }
      if (meta) return;

      const viewport = VIEWPORT_KEYS[e.key];
      if (viewport) {
        useUIStore.getState().setViewport(viewport);
        return;
      }
      if (e.key.toLowerCase() === 'd') {
        if (!useTokenStore.getState().dark) return;
        const ui = useUIStore.getState();
        ui.setTheme(ui.theme === 'dark' ? 'light' : 'dark');
        return;
      }
      if (e.key === 'Escape') {
        const ui = useUIStore.getState();
        ui.select(null);
        ui.setExportOpen(false);
        ui.setInspectorOpen(false);
        return;
      }
      if (e.key === '?') onShowSheet();
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onShowSheet]);
}
