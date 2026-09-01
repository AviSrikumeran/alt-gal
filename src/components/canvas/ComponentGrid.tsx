'use client';
import { useEffect } from 'react';
import { useComponentStore } from '@/stores/componentStore';
import { useUIStore } from '@/stores/uiStore';
import { ComponentPreview } from './ComponentPreview';
import './canvas.css';

/**
 * The phase 2/3 canvas (D-096): one specimen per loose component, in creation order, stacked vertically with a
 * 24px studio gap. Page-owned components (`pageId !== null`) render inside Stream 4's PagePreview and never
 * appear here (D-053). Clicking the background or pressing Escape deselects (D-097).
 */
export function ComponentGrid() {
  const components = useComponentStore((s) => s.components);
  const selectedComponentId = useUIStore((s) => s.selectedComponentId);
  const select = useUIStore((s) => s.select);
  const loose = components.filter((c) => c.pageId === null);

  useEffect(() => {
    if (selectedComponentId === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') select(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedComponentId, select]);

  if (loose.length === 0) return null; // Stream 5's EmptyState owns the per-phase empty canvas (D-149).

  return (
    <div className="alt-grid" data-count={loose.length} onClick={() => select(null)}>
      {loose.map((spec) => (
        <ComponentPreview key={spec.id} spec={spec} />
      ))}
    </div>
  );
}
