// Button.tsx
'use client';
import type { ComponentSpec, LibraryComponentProps } from '@/types/components';
import { getStyles } from '@/engine/componentRenderer';
import { rootAttrs } from './_shared';
export default function Button({ spec, selected }: LibraryComponentProps) {
  const s = spec as ComponentSpec<'button'>;
  return (
    <button type="button" {...rootAttrs(s, 'default', selected)} data-part="root" style={getStyles(s, 'root')}>
      {s.content.label}
    </button>
  );
}
