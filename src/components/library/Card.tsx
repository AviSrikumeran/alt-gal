// Card.tsx
'use client';
import type { ComponentSpec, LibraryComponentProps } from '@/types/components';
import { getStyles } from '@/engine/componentRenderer';
import { rootAttrs, nestedButtonStyles } from './_shared';
export default function Card({ spec, selected }: LibraryComponentProps) {
  const s = spec as ComponentSpec<'card'>;
  const id = `${s.id}-title`;
  return (
    <article {...rootAttrs(s, 'default', selected)} data-part="root" aria-labelledby={id} style={getStyles(s, 'root')}>
      <h3 id={id} data-part="title" style={getStyles(s, 'title')}>
        {s.content.title}
      </h3>
      <p data-part="body" style={getStyles(s, 'body')}>
        {s.content.body}
      </p>
      {s.content.ctaLabel && (
        <div data-part="actions" style={getStyles(s, 'actions')}>
          <button
            type="button"
            data-alt="button"
            data-variant={s.variant}
            data-size="sm"
            data-state="default"
            style={nestedButtonStyles(s.variant, 'sm')}
          >
            {s.content.ctaLabel}
          </button>
        </div>
      )}
    </article>
  );
}
