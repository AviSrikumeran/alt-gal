// PricingCard.tsx
'use client';
import type { ComponentSpec, LibraryComponentProps } from '@/types/components';
import { getStyles } from '@/engine/componentRenderer';
import { rootAttrs } from './_shared';
export default function PricingCard({ spec, selected }: LibraryComponentProps) {
  const s = spec as ComponentSpec<'pricing-card'>;
  const id = `${s.id}-tier`;
  return (
    <article aria-labelledby={id} {...rootAttrs(s, 'default', selected)} data-part="root" style={getStyles(s, 'root')}>
      {s.content.featured && <span data-part="featuredBadge">Most popular</span>}
      <p id={id} data-part="tier" style={getStyles(s, 'tier')}>
        {s.content.tier}
      </p>
      <p data-part="price" style={getStyles(s, 'price')}>
        {s.content.price}
      </p>
      <p data-part="period" style={getStyles(s, 'period')}>
        {s.content.period}
      </p>
      <ul data-part="features" style={getStyles(s, 'features')}>
        {s.content.features.map((f) => (
          <li key={f} data-part="feature" style={getStyles(s, 'feature')}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              aria-hidden="true"
              style={{ color: 'var(--color-success)', flexShrink: 0 }}
            >
              <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="1.8" />
            </svg>
            {f}
          </li>
        ))}
      </ul>
      <button type="button" data-part="cta" style={getStyles(s, 'cta')}>
        {s.content.ctaLabel}
      </button>
    </article>
  );
}
