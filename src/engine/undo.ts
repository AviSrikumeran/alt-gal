import type { InverseAction } from '@/types/log';
import type { RenderedPage } from '@/types/layouts';
import { useTokenStore } from '@/stores/tokenStore';
import { useComponentStore } from '@/stores/componentStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { useRuleStore } from '@/stores/ruleStore';
import { useLogStore } from '@/stores/logStore';
import { commitHuman } from '@/engine/commit';

/** `note` carries a consequence the human should know about; it never means failure. */
export type UndoResult = { ok: true; note?: string } | { ok: false; reason: string };

/**
 * The only place an InverseAction is executed (D-061, D-180, D-182).
 * Tools and the UI *produce* inverses; they never apply them.
 */
export function undoEntry(entryId: string): UndoResult {
  const entry = useLogStore.getState().get(entryId);
  if (!entry) return { ok: false, reason: 'that entry is no longer in the log' };
  if (entry.undone) return { ok: false, reason: 'it has already been undone' };
  if (!entry.inverse) return { ok: false, reason: 'this action cannot be reversed' };

  const result = applyInverse(entry.inverse);
  if (!result.ok) return result;

  useLogStore.getState().markUndone(entry.id);
  // Undo is itself a human action in the collaboration record (D-060).
  commitHuman('ui.undo', () => null, { entryId: entry.id, tool: entry.tool });
  return result;
}

/** Exported for tests and for the Cmd+Z path; assumes the caller owns logging. */
export function applyInverse(inverse: InverseAction): UndoResult {
  const tokens = useTokenStore.getState();
  const components = useComponentStore.getState();
  const layouts = useLayoutStore.getState();
  const rules = useRuleStore.getState();

  switch (inverse.kind) {
    case 'restore_token': {
      // Locks never block undo (D-127): the lock constrains the agent, undo is the human.
      if (inverse.value === null) tokens.removeToken(inverse.path);
      else tokens.setToken(inverse.path, inverse.value);
      return { ok: true };
    }
    case 'restore_tokens': {
      const set: Partial<Record<string, string>> = {};
      for (const [path, value] of Object.entries(inverse.snapshot)) {
        if (value === null) tokens.removeToken(path as never);
        else set[path] = value;
      }
      if (Object.keys(set).length) tokens.setMany(set as never);
      return { ok: true };
    }
    case 'remove_component': {
      const spec = components.get(inverse.id);
      if (!spec) return { ok: true }; // missing target is treated as done (D-182)
      components.remove(inverse.id);
      if (spec.pageId) detachFromPage(spec.pageId, inverse.id);
      return { ok: true };
    }
    case 'restore_component': {
      if (components.get(inverse.spec.id)) return { ok: true }; // already there: no-op, still marked undone
      components.add(inverse.spec, inverse.index);
      if (inverse.spec.pageId && inverse.spec.sectionId)
        attachToPage(inverse.spec.pageId, inverse.spec.sectionId, inverse.spec.id);
      return { ok: true };
    }
    case 'restore_component_spec': {
      if (!components.get(inverse.id)) return { ok: false, reason: 'the component was removed' };
      components.update(inverse.id, {
        variant: inverse.previous.variant,
        size: inverse.previous.size,
        content: inverse.previous.content,
        pageId: inverse.previous.pageId,
        sectionId: inverse.previous.sectionId,
      });
      return { ok: true };
    }
    case 'remove_wireframe': {
      const wf = layouts.getWireframe(inverse.id);
      if (!wf) return { ok: true };
      if (layouts.renderedPages.some((p) => p.wireframeId === inverse.id))
        return { ok: false, reason: 'the wireframe has a rendered page; delete the page first' };
      layouts.removeWireframe(inverse.id);
      return { ok: true };
    }
    case 'restore_wireframe': {
      if (layouts.getWireframe(inverse.wireframe.id)) return { ok: true };
      layouts.addWireframe(inverse.wireframe, inverse.index);
      return { ok: true };
    }
    case 'restore_sections': {
      const wf = layouts.getWireframe(inverse.wireframeId);
      if (!wf) return { ok: false, reason: 'the wireframe no longer exists' };
      layouts.setSections(inverse.wireframeId, inverse.sections);
      return wf.status === 'rendered'
        ? { ok: true, note: 'Sections restored — re-render the page to match.' }
        : { ok: true };
    }
    case 'unrender_page': {
      const page = layouts.getPage(inverse.pageId);
      if (!page) return { ok: true };
      layouts.removeRenderedPage(inverse.pageId);
      components.removeMany(inverse.componentIds);
      layouts.setWireframeStatus(inverse.wireframeId, 'wireframe');
      return { ok: true };
    }
    case 'restore_dark': {
      tokens.setDark(inverse.previous);
      return { ok: true };
    }
    case 'remove_rule': {
      rules.remove(inverse.id);
      return { ok: true };
    }
    case 'restore_rule': {
      if (rules.get(inverse.rule.id)) return { ok: true };
      rules.add(inverse.rule, inverse.index);
      return { ok: true };
    }
  }
}

// ---- rendered-page section bookkeeping --------------------------------------
// RenderedSection.componentIds is derived data owned by layoutStore; it has no dedicated
// action, so a page is replaced through addRenderedPage/removeRenderedPage (D-123: last write
// wins, and there is exactly one writer here). Order is preserved by rebuilding the list.

function replacePage(next: RenderedPage): void {
  const before = useLayoutStore.getState().renderedPages;
  const after = before.map((p) => (p.id === next.id ? next : p));
  for (const p of before) useLayoutStore.getState().removeRenderedPage(p.id);
  for (const p of after) useLayoutStore.getState().addRenderedPage(p);
}

function detachFromPage(pageId: string, componentId: string): void {
  const page = useLayoutStore.getState().getPage(pageId);
  if (!page) return;
  replacePage({
    ...page,
    sections: page.sections.map((s) => ({ ...s, componentIds: s.componentIds.filter((id) => id !== componentId) })),
  });
}

function attachToPage(pageId: string, sectionId: string, componentId: string): void {
  const page = useLayoutStore.getState().getPage(pageId);
  if (!page) return;
  replacePage({
    ...page,
    sections: page.sections.map((s) =>
      s.sectionId === sectionId && !s.componentIds.includes(componentId)
        ? { ...s, componentIds: [...s.componentIds, componentId] }
        : s,
    ),
  });
}
