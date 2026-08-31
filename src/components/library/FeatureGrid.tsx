// FeatureGrid.tsx
'use client';
import type { ComponentSpec, LibraryComponentProps } from '@/types/components';
import { getStyles } from '@/engine/componentRenderer';
import { rootAttrs } from './_shared';
export default function FeatureGrid({ spec, selected }: LibraryComponentProps) {
  const s = spec as ComponentSpec<'feature-grid'>;
  return (
    <section aria-label="Features" {...rootAttrs(s, 'default', selected)} data-part="root" style={getStyles(s, 'root')}>
      <ul data-part="grid" style={getStyles(s, 'grid')}>
        {s.content.items.map((it, i) => (
          <li key={i} data-part="item" style={getStyles(s, 'item')}>
            <div data-part="icon" style={getStyles(s, 'icon')} aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path d="M7 10l2 2 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </div>
            <h3 data-part="title" style={getStyles(s, 'title')}>
              {it.title}
            </h3>
            <p data-part="body" style={getStyles(s, 'body')}>
              {it.body}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
