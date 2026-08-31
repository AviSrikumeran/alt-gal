// Navbar.tsx
'use client';
import type { ComponentSpec, LibraryComponentProps } from '@/types/components';
import { getStyles } from '@/engine/componentRenderer';
import { rootAttrs } from './_shared';
export default function Navbar({ spec, selected }: LibraryComponentProps) {
  const s = spec as ComponentSpec<'navbar'>;
  return (
    <nav aria-label="Primary" {...rootAttrs(s, 'default', selected)} data-part="root" style={getStyles(s, 'root')}>
      <a href="#" onClick={(e) => e.preventDefault()} data-part="brand" style={getStyles(s, 'brand')}>
        {s.content.brand}
      </a>
      <ul data-part="links" style={getStyles(s, 'links')}>
        {s.content.links.map((l) => (
          <li key={l}>
            <a href="#" onClick={(e) => e.preventDefault()} data-part="link" style={getStyles(s, 'link')}>
              {l}
            </a>
          </li>
        ))}
      </ul>
      <button
        type="button"
        data-part="menu"
        aria-label="Open menu"
        style={{
          ...getStyles(s, 'cta'),
          backgroundColor: 'transparent',
          color: 'var(--color-text-primary)',
          borderColor: 'var(--color-border)',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      <button type="button" data-part="cta" style={getStyles(s, 'cta')}>
        {s.content.ctaLabel}
      </button>
    </nav>
  );
}
