import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ComponentSpec, ComponentType } from '@/types/components';
import { DEFAULT_CONTENT } from '@/components/library/content';
import { ComponentGrid } from '@/components/canvas/ComponentGrid';
import { useComponentStore } from '@/stores/componentStore';
import { useUIStore } from '@/stores/uiStore';

let seq = 0;
function spec(type: ComponentType, pageId: string | null = null): ComponentSpec {
  return {
    id: `comp_grid${(seq += 1)}`,
    type,
    variant: 'primary',
    size: 'md',
    content: DEFAULT_CONTENT[type],
    pageId,
    sectionId: pageId ? 'sec_1' : null,
    createdBy: 'agent',
    createdAt: 0,
  } as ComponentSpec;
}

beforeEach(() => {
  useComponentStore.getState().reset();
  useUIStore.getState().select(null);
});
afterEach(cleanup);

describe('ComponentGrid', () => {
  it('renders nothing when there are no loose components (Stream 5 owns the empty state)', () => {
    const { container } = render(<ComponentGrid />);
    expect(container.querySelector('.alt-grid')).toBeNull();
  });

  it('renders one specimen per loose component, in creation order (D-096)', () => {
    const first = spec('button');
    const second = spec('card');
    useComponentStore.getState().add(first);
    useComponentStore.getState().add(second);

    render(<ComponentGrid />);
    const specimens = [...document.querySelectorAll('.alt-specimen')];
    expect(specimens).toHaveLength(2);
    expect(specimens[0]?.getAttribute('aria-label')).toBe(`button ${first.id}`);
    expect(specimens[1]?.getAttribute('aria-label')).toBe(`card ${second.id}`);
  });

  it('never shows page-owned components (D-053, D-096)', () => {
    useComponentStore.getState().add(spec('button'));
    useComponentStore.getState().add(spec('hero', 'page_1'));

    render(<ComponentGrid />);
    expect(document.querySelectorAll('.alt-specimen')).toHaveLength(1);
    expect(document.querySelector('[data-alt="hero"]')).toBeNull();
  });

  it('selects a specimen on click and marks it on the component root (D-097)', () => {
    const target = spec('button');
    useComponentStore.getState().add(target);

    render(<ComponentGrid />);
    fireEvent.click(screen.getByLabelText(`button ${target.id}`));
    expect(useUIStore.getState().selectedComponentId).toBe(target.id);
    expect(document.querySelector('[data-part="root"]')?.getAttribute('data-selected')).toBe('true');
  });

  it('selects on Enter for keyboard users (D-097)', () => {
    const target = spec('badge');
    useComponentStore.getState().add(target);

    render(<ComponentGrid />);
    fireEvent.keyDown(screen.getByLabelText(`badge ${target.id}`), { key: 'Enter' });
    expect(useUIStore.getState().selectedComponentId).toBe(target.id);
  });

  it('deselects on a background click and on Escape (D-097)', () => {
    const target = spec('button');
    useComponentStore.getState().add(target);

    const { container } = render(<ComponentGrid />);
    const grid = container.querySelector('.alt-grid') as HTMLElement;

    fireEvent.click(screen.getByLabelText(`button ${target.id}`));
    expect(useUIStore.getState().selectedComponentId).toBe(target.id);
    fireEvent.click(grid);
    expect(useUIStore.getState().selectedComponentId).toBeNull();

    fireEvent.click(screen.getByLabelText(`button ${target.id}`));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useUIStore.getState().selectedComponentId).toBeNull();
  });
});
