'use client';
import { useState } from 'react';
import { useComponentStore } from '@/stores/componentStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { usePhaseStore } from '@/stores/phaseStore';
import { useUIStore, VIEWPORT_WIDTHS } from '@/stores/uiStore';
import { commitHuman } from '@/engine/commit';
import ComponentForm from './ComponentForm';
import EditPanel from './EditPanel';
import EmptyState from './EmptyState';
import ErrorBoundary from './ErrorBoundary';
import OnboardingBanner from './OnboardingBanner';
import ThemeToggle from './ThemeToggle';
import ViewportSwitcher from './ViewportSwitcher';
import { ComponentGridSlot, WireframeViewSlot } from './integration';
import { emitStudio } from './events';
import { pushToast } from './toastStore';
import { S } from './strings';

/**
 * §5.3. The canvas surround is studio chrome; everything inside the root sits on the *user's*
 * `--color-background` (D-144), which is what makes the token cascade read as one bounded change.
 */
export default function Canvas() {
  const phase = usePhaseStore((s) => s.currentPhase);
  const viewport = useUIStore((s) => s.viewport);
  const theme = useUIStore((s) => s.theme);
  const select = useUIStore((s) => s.select);
  const setExportOpen = useUIStore((s) => s.setExportOpen);

  const components = useComponentStore((s) => s.components);
  const loose = components.filter((c) => c.pageId === null); // derive after the selector, not inside it
  const wireframes = useLayoutStore((s) => s.wireframes);
  const activeId = useLayoutStore((s) => s.activeWireframeId);
  const active = wireframes.find((w) => w.id === activeId);
  const activePage = useLayoutStore((s) => s.renderedPages.find((p) => p.wireframeId === activeId));

  const [formOpen, setFormOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const deletePage = () => {
    if (!activePage) return;
    if (!window.confirm(`Delete the page "${activePage.title}"? This can't be undone — re-render reproduces it.`))
      return;
    const ids = activePage.sections.flatMap((s) => s.componentIds);
    // D-184: no inverse. Restoring N components with their original ids and relinking sections is
    // strictly worse than one Render click, and the dialog says so.
    commitHuman(
      'ui.delete_page',
      () => {
        useLayoutStore.getState().removeRenderedPage(activePage.id);
        useComponentStore.getState().removeMany(ids);
        useLayoutStore.getState().setWireframeStatus(activePage.wireframeId, 'wireframe');
        return null;
      },
      { title: activePage.title },
    );
  };

  const removeWireframe = (id: string) => {
    const store = useLayoutStore.getState();
    if (store.renderedPages.some((p) => p.wireframeId === id)) {
      pushToast({ message: 'Delete the rendered page first.', tone: 'warn' });
      return;
    }
    const index = store.wireframes.findIndex((w) => w.id === id);
    const wireframe = store.wireframes[index];
    if (!wireframe) return;
    commitHuman(
      'ui.remove_wireframe',
      () => {
        useLayoutStore.getState().removeWireframe(id);
        return { kind: 'restore_wireframe', wireframe, index };
      },
      { title: wireframe.title },
    );
  };

  return (
    <main className="alt-canvas" aria-label="Canvas">
      <div className="alt-toolbar">
        <div className="alt-toolbar__group">
          {wireframes.map((w) => (
            <span key={w.id} className="alt-tab" data-active={w.id === activeId}>
              <button type="button" onClick={() => useLayoutStore.getState().setActiveWireframe(w.id)}>
                <span className="alt-tab__dot" data-rendered={w.status === 'rendered'} aria-hidden="true" />
                {w.title}
              </button>
              <button
                type="button"
                className="alt-tab__close"
                aria-label={`Remove ${w.title}`}
                onClick={() => removeWireframe(w.id)}
              >
                ×
              </button>
            </span>
          ))}
          {phase >= 3 && (
            <button type="button" className="alt-btn" onClick={() => emitStudio('alt:new-wireframe')}>
              {S.newWireframe}
            </button>
          )}
        </div>

        <div className="alt-toolbar__group">
          <ViewportSwitcher />
          <ThemeToggle />
        </div>

        <div className="alt-toolbar__group">
          {phase >= 2 && (
            <button type="button" className="alt-btn" onClick={() => setFormOpen((v) => !v)} aria-expanded={formOpen}>
              {S.addComponent}
            </button>
          )}
          {activePage && (
            <>
              <button
                type="button"
                className="alt-btn"
                onClick={() => emitStudio('alt:re-render', { wireframeId: activePage.wireframeId })}
              >
                {S.reRender}
              </button>
              <button type="button" className="alt-btn" onClick={deletePage}>
                {S.deletePage}
              </button>
            </>
          )}
          {phase >= 4 && (
            <button type="button" className="alt-btn" data-kind="primary" onClick={() => setExportOpen(true)}>
              {S.exportLabel}
            </button>
          )}
        </div>
      </div>

      {formOpen && <ComponentForm onDone={() => setFormOpen(false)} />}

      <div className="alt-canvas__surface" onClick={() => select(null)}>
        <OnboardingBanner />

        {phase === 3 && !active && <p className="alt-canvas__banner">{S.banner3}</p>}

        <div
          className={theme === 'dark' ? 'alt-canvas__root dark' : 'alt-canvas__root'}
          style={{ width: VIEWPORT_WIDTHS[viewport] }}
          data-viewport={viewport}
        >
          {active ? (
            <ErrorBoundary>
              {/* Keyed by wireframe: the render transition is per-wireframe state (D-137), and
                  switching tabs must not read as a fresh render of the tab you switched to. */}
              <WireframeViewSlot key={active.id} wireframe={active} page={activePage} />
            </ErrorBoundary>
          ) : loose.length > 0 ? (
            <ErrorBoundary>
              <ComponentGridSlot />
            </ErrorBoundary>
          ) : (
            <EmptyState phase={phase} onAddComponent={() => setFormOpen(true)} />
          )}
        </div>

        {active && loose.length > 0 && (
          <div className="alt-drawer">
            <button
              type="button"
              className="alt-drawer__head"
              onClick={() => setDrawerOpen((v) => !v)}
              aria-expanded={drawerOpen}
            >
              Components ({loose.length})
            </button>
            {drawerOpen && (
              <ErrorBoundary>
                <ComponentGridSlot />
              </ErrorBoundary>
            )}
          </div>
        )}
      </div>

      {/* D-189: the selection's edit panel, docked under the canvas while something is selected. */}
      <ErrorBoundary>
        <EditPanel />
      </ErrorBoundary>
    </main>
  );
}
