import { beforeEach, describe, expect, it } from 'vitest';
import type { ComponentSpec } from '@/types/components';
import type { RenderedPage, Wireframe } from '@/types/layouts';
import type { DesignRule } from '@/types/rules';
import { useComponentStore } from '@/stores/componentStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { useLogStore } from '@/stores/logStore';
import { useRuleStore } from '@/stores/ruleStore';
import { commitHuman } from '@/engine/commit';
import { undoEntry } from '@/engine/undo';

const spec = (id: string, over: Partial<ComponentSpec> = {}): ComponentSpec => ({
  id,
  type: 'button',
  variant: 'primary',
  size: 'md',
  content: { label: 'Get started' },
  pageId: null,
  sectionId: null,
  createdBy: 'human',
  createdAt: 0,
  ...over,
});

const wireframe = (id: string, status: Wireframe['status'] = 'wireframe'): Wireframe => ({
  id,
  pageType: 'landing',
  title: 'Landing',
  sections: [{ id: 'sec_1', type: 'hero', label: 'HERO', columns: null }],
  status,
  createdBy: 'human',
  createdAt: 0,
});

const page = (id: string, wireframeId: string, componentIds: string[]): RenderedPage => ({
  id,
  wireframeId,
  pageType: 'landing',
  title: 'Landing',
  sections: [{ sectionId: 'sec_1', type: 'hero', columns: null, componentIds }],
  createdAt: 0,
});

const rule = (id: string): DesignRule => ({
  id,
  type: 'component-restriction',
  description: 'No danger buttons',
  condition: { target: 'button', property: 'variant', operator: 'not-equals', value: 'danger' },
  enabled: true,
  createdBy: 'human',
  createdAt: 0,
});

beforeEach(() => {
  useComponentStore.getState().reset();
  useLayoutStore.getState().reset();
  useRuleStore.getState().reset();
  useLogStore.getState().clear();
});

describe('commitHuman', () => {
  it('logs one human entry carrying the inverse (D-077)', () => {
    const entry = commitHuman(
      'ui.generate_component',
      () => {
        useComponentStore.getState().add(spec('comp_1'));
        return { kind: 'remove_component', id: 'comp_1' };
      },
      { type: 'button' },
    );

    expect(useLogStore.getState().entries).toHaveLength(1);
    expect(entry.actor).toBe('human');
    expect(entry.tool).toBe('ui.generate_component');
    expect(entry.result).toBeNull();
    expect(entry.inverse).toEqual({ kind: 'remove_component', id: 'comp_1' });
  });

  it('prefixes a bare action name with ui.', () => {
    const entry = commitHuman('set_token', () => null);
    expect(entry.tool).toBe('ui.set_token');
  });
});

describe('undoEntry', () => {
  it('reverses the mutation and appends a ui.undo entry (D-060, D-180)', () => {
    const entry = commitHuman('ui.generate_component', () => {
      useComponentStore.getState().add(spec('comp_1'));
      return { kind: 'remove_component', id: 'comp_1' };
    });

    expect(useComponentStore.getState().count()).toBe(1);
    expect(undoEntry(entry.id)).toEqual({ ok: true });
    expect(useComponentStore.getState().count()).toBe(0);

    const entries = useLogStore.getState().entries;
    expect(entries[0]?.undone).toBe(true);
    expect(entries[1]?.tool).toBe('ui.undo');
    expect(entries[1]?.inverse).toBeNull();
  });

  it('refuses to undo the same entry twice (D-181: there is no redo)', () => {
    const entry = commitHuman('ui.generate_component', () => {
      useComponentStore.getState().add(spec('comp_1'));
      return { kind: 'remove_component', id: 'comp_1' };
    });
    undoEntry(entry.id);
    expect(undoEntry(entry.id)).toEqual({ ok: false, reason: 'it has already been undone' });
  });

  it('reports read-only entries as irreversible', () => {
    const entry = commitHuman('ui.delete_page', () => null);
    expect(undoEntry(entry.id)).toEqual({ ok: false, reason: 'this action cannot be reversed' });
  });

  it('restores a previous spec, and blocks when the component is gone (D-182)', () => {
    const before = spec('comp_1');
    useComponentStore.getState().add(before);
    const entry = commitHuman('ui.modify_component', () => {
      useComponentStore.getState().update('comp_1', { variant: 'danger' });
      return { kind: 'restore_component_spec', id: 'comp_1', previous: before };
    });

    expect(useComponentStore.getState().get('comp_1')?.variant).toBe('danger');
    expect(undoEntry(entry.id)).toEqual({ ok: true });
    expect(useComponentStore.getState().get('comp_1')?.variant).toBe('primary');

    const second = commitHuman('ui.modify_component', () => ({
      kind: 'restore_component_spec',
      id: 'comp_missing',
      previous: before,
    }));
    expect(undoEntry(second.id)).toEqual({ ok: false, reason: 'the component was removed' });
  });

  it('treats a missing target as already done', () => {
    const entry = commitHuman('ui.generate_component', () => ({ kind: 'remove_component', id: 'comp_gone' }));
    expect(undoEntry(entry.id)).toEqual({ ok: true });
  });

  it('blocks removing a wireframe that has a rendered page (D-141)', () => {
    useLayoutStore.getState().addWireframe(wireframe('wf_1', 'rendered'));
    useLayoutStore.getState().addRenderedPage(page('page_1', 'wf_1', []));
    const entry = commitHuman('ui.sketch_wireframe', () => ({ kind: 'remove_wireframe', id: 'wf_1' }));

    expect(undoEntry(entry.id)).toEqual({
      ok: false,
      reason: 'the wireframe has a rendered page; delete the page first',
    });
    expect(useLayoutStore.getState().wireframes).toHaveLength(1);
  });

  it('unrenders a page: removes it, its components, and resets the wireframe status', () => {
    useComponentStore.getState().add(spec('comp_1', { pageId: 'page_1', sectionId: 'sec_1' }));
    useLayoutStore.getState().addWireframe(wireframe('wf_1', 'rendered'));
    useLayoutStore.getState().addRenderedPage(page('page_1', 'wf_1', ['comp_1']));

    const entry = commitHuman('ui.render_page', () => ({
      kind: 'unrender_page',
      pageId: 'page_1',
      wireframeId: 'wf_1',
      componentIds: ['comp_1'],
    }));

    expect(undoEntry(entry.id)).toEqual({ ok: true });
    expect(useLayoutStore.getState().renderedPages).toHaveLength(0);
    expect(useComponentStore.getState().count()).toBe(0);
    expect(useLayoutStore.getState().getWireframe('wf_1')?.status).toBe('wireframe');
  });

  it('re-inserts a restored page component into its section (D-182)', () => {
    const owned = spec('comp_1', { pageId: 'page_1', sectionId: 'sec_1' });
    useLayoutStore.getState().addWireframe(wireframe('wf_1', 'rendered'));
    useLayoutStore.getState().addRenderedPage(page('page_1', 'wf_1', []));

    const entry = commitHuman('ui.remove_component', () => ({
      kind: 'restore_component',
      spec: owned,
      index: 0,
    }));

    expect(undoEntry(entry.id)).toEqual({ ok: true });
    expect(useComponentStore.getState().get('comp_1')).toBeDefined();
    expect(useLayoutStore.getState().getPage('page_1')?.sections[0]?.componentIds).toEqual(['comp_1']);
  });

  it('drops a removed page component out of its section', () => {
    useComponentStore.getState().add(spec('comp_1', { pageId: 'page_1', sectionId: 'sec_1' }));
    useLayoutStore.getState().addRenderedPage(page('page_1', 'wf_1', ['comp_1']));

    const entry = commitHuman('ui.generate_component', () => ({ kind: 'remove_component', id: 'comp_1' }));
    expect(undoEntry(entry.id)).toEqual({ ok: true });
    expect(useLayoutStore.getState().getPage('page_1')?.sections[0]?.componentIds).toEqual([]);
  });

  it('notes that a rendered wireframe needs re-rendering after restore_sections', () => {
    useLayoutStore.getState().addWireframe(wireframe('wf_1', 'rendered'));
    const sections = [{ id: 'sec_1', type: 'hero' as const, label: 'HERO', columns: null }];
    const entry = commitHuman('ui.modify_layout', () => ({ kind: 'restore_sections', wireframeId: 'wf_1', sections }));

    const result = undoEntry(entry.id);
    expect(result.ok).toBe(true);
    expect(result.ok && result.note).toMatch(/re-render/i);
  });

  it('restores and removes rules', () => {
    const r = rule('rule_1');
    const added = commitHuman('ui.add_rule', () => {
      useRuleStore.getState().add(r);
      return { kind: 'remove_rule', id: r.id };
    });
    expect(undoEntry(added.id)).toEqual({ ok: true });
    expect(useRuleStore.getState().list()).toHaveLength(0);

    const removed = commitHuman('ui.remove_rule', () => ({ kind: 'restore_rule', rule: r, index: 0 }));
    expect(undoEntry(removed.id)).toEqual({ ok: true });
    expect(useRuleStore.getState().get('rule_1')).toBeDefined();
  });
});
