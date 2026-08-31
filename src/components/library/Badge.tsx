// Badge.tsx
'use client';
import type { ComponentSpec, LibraryComponentProps } from '@/types/components';
import { getStyles } from '@/engine/componentRenderer';
import { rootAttrs } from './_shared';
export default function Badge({ spec, selected }: LibraryComponentProps) {
  const s = spec as ComponentSpec<'badge'>;
  return (
    <span {...rootAttrs(s, 'default', selected)} data-part="root" style={getStyles(s, 'root')}>
      {s.content.label}
    </span>
  );
}
