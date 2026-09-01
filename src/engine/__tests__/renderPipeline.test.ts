import { beforeEach, describe, expect, it } from 'vitest';
import { livePageComponentIds, pageForWireframe, renderPage, unrenderPage } from '@/engine/layoutEngine';
import { createWireframe } from '@/engine/wireframeEngine';
import { useComponentStore } from '@/stores/componentStore';
import { useLayoutStore } from '@/stores/layoutStore';

function seedWireframe() {
  const wireframe = createWireframe({ pageType: 'landing', title: 'Northwind', createdBy: 'human' });
  useLayoutStore.getState().addWireframe(wireframe);
  return wireframe;
}

beforeEach(() => {
  useComponentStore.getState().reset();
  useLayoutStore.getState().reset();
});

describe('renderPage', () => {
  it('writes the page, its components, and the wireframe status', () => {
    const wireframe = seedWireframe();
    const result = renderPage(wireframe.id, 'agent')!;

    expect(result.replaced).toBeNull();
    expect(result.componentIds).toHaveLength(8);
    expect(useComponentStore.getState().count()).toBe(8);
    expect(useComponentStore.getState().listLoose()).toHaveLength(0);
    expect(useLayoutStore.getState().getWireframe(wireframe.id)!.status).toBe('rendered');
    expect(pageForWireframe(wireframe.id)!.id).toBe(result.page.id);
  });

  it('re-renders in place when the wireframe already has a page (D-140)', () => {
    const wireframe = seedWireframe();
    const first = renderPage(wireframe.id, 'human')!;
    const second = renderPage(wireframe.id, 'agent')!;

    expect(second.replaced).toEqual({
      pageId: first.page.id,
      wireframeId: wireframe.id,
      componentIds: first.componentIds,
    });
    expect(second.page.id).not.toBe(first.page.id);
    expect(useLayoutStore.getState().renderedPages).toHaveLength(1);
    expect(useComponentStore.getState().count()).toBe(8); // the first page's components are gone
  });

  it('returns null for an unknown wireframe id (D-125)', () => {
    expect(renderPage('wf_missing')).toBeNull();
  });
});

describe('unrenderPage', () => {
  it('removes the page and its components and returns the undo payload (D-182)', () => {
    const wireframe = seedWireframe();
    const rendered = renderPage(wireframe.id, 'agent')!;

    const undone = unrenderPage(rendered.page.id)!;
    expect(undone).toEqual({
      pageId: rendered.page.id,
      wireframeId: wireframe.id,
      componentIds: rendered.componentIds,
    });
    expect(useComponentStore.getState().count()).toBe(0);
    expect(useLayoutStore.getState().renderedPages).toHaveLength(0);
    expect(useLayoutStore.getState().getWireframe(wireframe.id)!.status).toBe('wireframe');
    expect(unrenderPage(rendered.page.id)).toBeNull(); // missing page is treated as done
  });

  it('reports the live component ids, so a deleted page component is not resurrected (D-138)', () => {
    const wireframe = seedWireframe();
    const rendered = renderPage(wireframe.id, 'agent')!;
    const dropped = rendered.componentIds[0]!;
    useComponentStore.getState().remove(dropped);

    expect(livePageComponentIds(rendered.page.id)).not.toContain(dropped);
    expect(unrenderPage(rendered.page.id)!.componentIds).toHaveLength(7);
    expect(useComponentStore.getState().count()).toBe(0);
  });

  it('leaves the wireframe itself in place — a phase drop deletes nothing (D-132)', () => {
    const wireframe = seedWireframe();
    const rendered = renderPage(wireframe.id, 'human')!;
    unrenderPage(rendered.page.id);
    expect(useLayoutStore.getState().getWireframe(wireframe.id)!.sections).toHaveLength(6);
  });
});
