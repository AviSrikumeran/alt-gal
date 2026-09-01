'use client';
import { useState } from 'react';
import type { ComponentSize, ComponentSpec, ComponentType, ComponentVariant } from '@/types/components';
import { COMPONENT_SIZES, COMPONENT_TYPES, COMPONENT_VARIANTS } from '@/types/components';
import { useComponentStore } from '@/stores/componentStore';
import { contentFromInput } from '@/components/library/content';
import { generateId } from '@/utils/idGenerator';
import { commitHuman } from '@/engine/commit';
import { S } from './strings';

/**
 * D-150: the human path to `generate_component`. It exists so nothing on the canvas is agent-only
 * (13.4) — the same verb, the same store action, the same log entry shape.
 */
export default function ComponentForm({ onDone }: { onDone: () => void }) {
  const [type, setType] = useState<ComponentType>('button');
  const [variant, setVariant] = useState<ComponentVariant>('primary');
  const [size, setSize] = useState<ComponentSize>('md');
  const [label, setLabel] = useState('');

  const create = () => {
    const spec: ComponentSpec = {
      id: generateId('comp'),
      type,
      variant,
      size,
      content: contentFromInput(type, { label: label.trim() || undefined }),
      pageId: null,
      sectionId: null,
      createdBy: 'human',
      createdAt: Date.now(),
    };
    commitHuman(
      'ui.generate_component',
      () => {
        useComponentStore.getState().add(spec);
        return { kind: 'remove_component', id: spec.id };
      },
      { type, variant, size, ...(label.trim() ? { label: label.trim() } : {}) },
    );
    onDone();
  };

  return (
    <form
      className="alt-form"
      onSubmit={(e) => {
        e.preventDefault();
        create();
      }}
    >
      <label className="alt-label">
        {S.formType}
        <select className="alt-field" value={type} onChange={(e) => setType(e.target.value as ComponentType)}>
          {COMPONENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <label className="alt-label">
        {S.formVariant}
        <select className="alt-field" value={variant} onChange={(e) => setVariant(e.target.value as ComponentVariant)}>
          {COMPONENT_VARIANTS.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label className="alt-label">
        {S.formSize}
        <select className="alt-field" value={size} onChange={(e) => setSize(e.target.value as ComponentSize)}>
          {COMPONENT_SIZES.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label className="alt-label">
        {S.formLabel}
        <input className="alt-field" value={label} placeholder="Optional" onChange={(e) => setLabel(e.target.value)} />
      </label>
      <div className="alt-form__actions">
        <button type="button" className="alt-btn" data-kind="ghost" onClick={onDone}>
          {S.formCancel}
        </button>
        <button type="submit" className="alt-btn" data-kind="primary">
          {S.formCreate}
        </button>
      </div>
    </form>
  );
}
