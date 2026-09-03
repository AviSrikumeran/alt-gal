'use client';
/**
 * D-189's edit panel, the third of the three "nothing is agent-only" paths.
 *
 * Selecting a component drew an outline and nothing else: `getTokenMapping` — the engine behind
 * `explain_component` — and the component exporter behind `get_component_code` were reachable by
 * an agent and by no human. This panel is the human end of both. It docks under the canvas while
 * a component is selected; Escape and a click on the canvas background still deselect.
 */
import { useState } from 'react';
import type { ComponentSize, ComponentVariant } from '@/types/components';
import { COMPONENT_SIZES, COMPONENT_VARIANTS } from '@/types/components';
import { useComponentStore } from '@/stores/componentStore';
import { useUIStore } from '@/stores/uiStore';
import { commitHuman } from '@/engine/commit';
import { getTokenMapping } from '@/engine/componentRenderer';
import { exportComponent } from '@/engine/export/react';
import { collectExport } from '@/engine/export/snapshot';
import { S } from './strings';

type Tab = 'edit' | 'why';
type CopyState = 'idle' | 'copied' | 'failed';

export default function EditPanel() {
  const selectedId = useUIStore((s) => s.selectedComponentId);
  const select = useUIStore((s) => s.select);
  const components = useComponentStore((s) => s.components);
  const spec = components.find((c) => c.id === selectedId);
  const [tab, setTab] = useState<Tab>('edit');
  // Stamped with the id it belongs to, so a new selection is a new panel and never inherits the
  // previous component's "Copied" — no effect needed to clear it.
  const [copied, setCopied] = useState<{ id: string; state: CopyState } | null>(null);
  const copyState: CopyState = copied?.id === selectedId ? copied.state : 'idle';

  if (!spec) return null;

  const change = (patch: { variant?: ComponentVariant; size?: ComponentSize }) => {
    const previous = spec;
    commitHuman(
      'ui.modify_component',
      () => {
        useComponentStore.getState().update(spec.id, patch);
        return { kind: 'restore_component_spec', id: spec.id, previous };
      },
      { id: spec.id, ...patch },
    );
  };

  const copyCode = async () => {
    const file = exportComponent(spec.type, collectExport().productName);
    try {
      await navigator.clipboard.writeText(file.contents);
      setCopied({ id: spec.id, state: 'copied' });
    } catch {
      setCopied({ id: spec.id, state: 'failed' });
    }
  };

  const mapping = tab === 'why' ? getTokenMapping(spec) : [];

  return (
    <section className="alt-edit" aria-label={`${S.editTitle} ${spec.id}`}>
      <header className="alt-edit__head">
        <code className="alt-edit__type">{spec.type}</code>
        <code className="alt-edit__id alt-mono">{spec.id}</code>
        <div className="alt-edit__tabs" role="tablist" aria-label={S.editTitle}>
          {(['edit', 'why'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              className="alt-chip"
              data-active={tab === t}
              aria-selected={tab === t}
              onClick={() => setTab(t)}
            >
              {S.editTabs[t]}
            </button>
          ))}
        </div>
        <button type="button" className="alt-btn" onClick={copyCode}>
          {copyState === 'copied' ? S.editCopied : copyState === 'failed' ? S.editCopyFailed : S.editCopyCode}
        </button>
        <button
          type="button"
          className="alt-btn"
          data-kind="ghost"
          aria-label={S.editClose}
          onClick={() => select(null)}
        >
          ×
        </button>
      </header>

      {tab === 'edit' ? (
        <div className="alt-edit__body alt-edit__fields">
          <label className="alt-label">
            {S.formVariant}
            <select
              className="alt-field"
              value={spec.variant}
              onChange={(e) => change({ variant: e.target.value as ComponentVariant })}
            >
              {COMPONENT_VARIANTS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="alt-label">
            {S.formSize}
            <select
              className="alt-field"
              value={spec.size}
              onChange={(e) => change({ size: e.target.value as ComponentSize })}
            >
              {COMPONENT_SIZES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          {spec.pageId !== null && <p className="alt-edit__note">{S.editPageOwned}</p>}
        </div>
      ) : (
        <div className="alt-edit__body">
          {mapping.length === 0 ? (
            <p className="alt-edit__note">{S.editWhyEmpty}</p>
          ) : (
            <>
              <p className="alt-edit__note">{S.editWhyIntro(mapping.length)}</p>
              <table className="alt-edit__map">
                <tbody>
                  {mapping.map((m) => (
                    <tr key={`${m.part}.${m.cssProperty}`}>
                      <th scope="row" className="alt-mono">
                        {m.part}.{m.cssProperty}
                      </th>
                      <td className="alt-mono">{m.cssVar}</td>
                      <td className="alt-mono" data-unset={m.resolvedValue === null || undefined}>
                        {m.resolvedValue ?? S.editUnset}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </section>
  );
}
