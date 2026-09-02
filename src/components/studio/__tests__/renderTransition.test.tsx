/**
 * D-137's transition, which is demo moment (c)'s payoff shot. The two halves the audit found
 * unwired: the wireframe never played out, and the page played in on every mount.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import type { RenderedPage, Wireframe } from '@/types/layouts';
import { useComponentStore } from '@/stores/componentStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { renderWireframe } from '@/engine/layoutEngine';
import { createWireframe } from '@/engine/wireframeEngine';
import { WireframeViewSlot } from '@/components/studio/integration';

function fixture(): { wireframe: Wireframe; page: RenderedPage } {
  const wireframe = createWireframe({ pageType: 'landing', title: 'Landing page', createdBy: 'human' });
  const { page, components } = renderWireframe(wireframe, 'human');
  for (const spec of components) useComponentStore.getState().add(spec);
  return { wireframe, page };
}

beforeEach(() => {
  useComponentStore.getState().reset();
  useLayoutStore.getState().reset();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('WireframeViewSlot — the render transition (D-137)', () => {
  it('holds the wireframe out, then plays the page in, on a fresh render', () => {
    const { wireframe, page } = fixture();
    const { container, rerender } = render(<WireframeViewSlot wireframe={wireframe} />);
    expect(container.querySelector('.alt-wf')?.getAttribute('data-rendering')).toBe(null);

    act(() => {
      rerender(<WireframeViewSlot wireframe={wireframe} page={page} />);
    });
    // The page is in the store, but the boxes are still leaving.
    expect(container.querySelector('.alt-wf')?.getAttribute('data-rendering')).toBe('out');

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(container.querySelector('.alt-wf')).toBe(null);
    expect(container.querySelector('.alt-page')?.getAttribute('data-rendering')).toBe('in');
  });

  it('does not play the page in when it was already rendered at mount', () => {
    const { wireframe, page } = fixture();
    const { container } = render(<WireframeViewSlot wireframe={wireframe} page={page} />);
    expect(container.querySelector('.alt-page')).toBeTruthy();
    expect(container.querySelector('.alt-page')?.getAttribute('data-rendering')).toBe(null);
  });
});
