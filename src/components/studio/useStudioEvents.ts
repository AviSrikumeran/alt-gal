'use client';
/**
 * The listener half of `events.ts` (D-240).
 *
 * `emitStudio` has always dispatched four `alt:*` window events; nothing listened for any of
 * them, so the phase-0 and phase-1 empty-state CTAs and both wireframe toolbar buttons were
 * inert. The handlers live here rather than in the emitting components because each one belongs
 * to a different stream's state, and the event bus exists precisely so the shell does not fork
 * those algorithms — every handler below delegates to the owner's own function.
 *
 * Mounted once, in StudioShell.
 */
import { useEffect } from 'react';
import { commitHuman } from '@/engine/commit';
import { renderPage } from '@/engine/layoutEngine';
import { createWireframe } from '@/engine/wireframeEngine';
import { useLayoutStore } from '@/stores/layoutStore';
import { useUIStore } from '@/stores/uiStore';
import { fillFromPrimary } from '@/components/tokens/fillFromPrimary';
import { PRIMARY_COLOR_INPUT_ID } from '@/components/tokens/PrimaryColorForm';
import type { StudioEvent } from './events';
import { pushToast } from './toastStore';

/** D-130's default structure. A human clicking "+ New wireframe" gets a landing page to edit. */
const STARTER_PAGE_TYPE = 'landing' as const;

function newWireframe(): void {
  const existing = useLayoutStore.getState().wireframes.length;
  const wireframe = createWireframe({
    pageType: STARTER_PAGE_TYPE,
    title: existing === 0 ? 'Landing page' : `Landing page ${existing + 1}`,
    createdBy: 'human',
  });
  commitHuman(
    'ui.sketch_wireframe',
    () => {
      useLayoutStore.getState().addWireframe(wireframe); // also makes it the active tab (D-054)
      return { kind: 'remove_wireframe', id: wireframe.id };
    },
    { title: wireframe.title, sections: wireframe.sections.map((s) => s.type) },
  );
}

function reRender(wireframeId: string): void {
  const wireframe = useLayoutStore.getState().getWireframe(wireframeId);
  if (!wireframe) {
    pushToast({ message: 'That wireframe is gone — sketch a new one.', tone: 'warn' });
    return;
  }
  commitHuman(
    'ui.render_page',
    () => {
      // The engine owns D-140's implicit unrender, so re-render is the same call as first render.
      const result = renderPage(wireframeId, 'human');
      if (!result) return null;
      const { page, componentIds } = result;
      return { kind: 'unrender_page', pageId: page.id, wireframeId, componentIds };
    },
    { title: wireframe.title },
  );
}

function focusPrimary(): void {
  // The Colors section is collapsible (D-145); open it before reaching for the input inside it.
  useUIStore.getState().setPanelSection('colors', true);
  requestAnimationFrame(() => {
    const input = document.getElementById(PRIMARY_COLOR_INPUT_ID);
    if (!(input instanceof HTMLInputElement)) return;
    input.scrollIntoView({ block: 'center', behavior: 'smooth' });
    input.focus();
  });
}

function fill(): void {
  if (!fillFromPrimary()) pushToast({ message: 'Set a primary color first.', tone: 'warn' });
}

export function useStudioEvents(): void {
  useEffect(() => {
    const handlers: Record<StudioEvent, (event: Event) => void> = {
      'alt:new-wireframe': () => newWireframe(),
      'alt:re-render': (event) => {
        const detail = (event as CustomEvent<{ wireframeId?: string } | undefined>).detail;
        const id = detail?.wireframeId ?? useLayoutStore.getState().activeWireframeId;
        if (id) reRender(id);
      },
      'alt:focus-primary': () => focusPrimary(),
      'alt:fill-from-primary': () => fill(),
    };
    const entries = Object.entries(handlers) as [StudioEvent, (event: Event) => void][];
    for (const [name, handler] of entries) window.addEventListener(name, handler);
    return () => {
      for (const [name, handler] of entries) window.removeEventListener(name, handler);
    };
  }, []);
}
