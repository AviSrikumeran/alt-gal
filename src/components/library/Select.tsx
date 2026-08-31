// Select.tsx
'use client';
import type { ComponentSpec, LibraryComponentProps } from '@/types/components';
import { getStyles } from '@/engine/componentRenderer';
import { rootAttrs } from './_shared';
export default function Select({ spec, selected }: LibraryComponentProps) {
  const s = spec as ComponentSpec<'select'>;
  const id = `${s.id}-field`;
  return (
    <div {...rootAttrs(s, 'default', selected)} data-part="root" style={getStyles(s, 'root')}>
      <label htmlFor={id} data-part="label" style={getStyles(s, 'label')}>
        {s.content.label}
      </label>
      <select id={id} defaultValue="" data-part="field" style={getStyles(s, 'field')}>
        <option value="" disabled>
          {s.content.placeholder}
        </option>
        {s.content.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <svg data-part="chevron" style={getStyles(s, 'chevron')} viewBox="0 0 16 16" aria-hidden="true">
        <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </div>
  );
}
