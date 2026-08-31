// Toggle.tsx
'use client';
import type { ComponentSpec, LibraryComponentProps } from '@/types/components';
import { getStyles } from '@/engine/componentRenderer';
import { rootAttrs } from './_shared';
export default function Toggle({ spec, selected }: LibraryComponentProps) {
  const s = spec as ComponentSpec<'toggle'>;
  const id = `${s.id}-label`;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={s.content.checked}
      aria-labelledby={id}
      {...rootAttrs(s, 'default', selected)}
      data-part="root"
      style={{ ...getStyles(s, 'root'), background: 'none', border: 'none', padding: 0 }}
    >
      <span data-part="track" style={getStyles(s, 'track')}>
        <span data-part="thumb" style={getStyles(s, 'thumb')} />
      </span>
      <span id={id} data-part="label" style={getStyles(s, 'label')}>
        {s.content.label}
      </span>
    </button>
  );
}
