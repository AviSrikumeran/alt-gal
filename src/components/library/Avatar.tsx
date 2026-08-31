// Avatar.tsx
'use client';
import type { ComponentSpec, LibraryComponentProps } from '@/types/components';
import { getStyles } from '@/engine/componentRenderer';
import { rootAttrs } from './_shared';
export default function Avatar({ spec, selected }: LibraryComponentProps) {
  const s = spec as ComponentSpec<'avatar'>;
  return (
    <span
      role="img"
      aria-label={s.content.name}
      title={s.content.name}
      {...rootAttrs(s, 'default', selected)}
      data-part="root"
      style={getStyles(s, 'root')}
    >
      {s.content.initials}
    </span>
  );
}
