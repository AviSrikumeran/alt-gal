// Toast.tsx
'use client';
import type { ComponentSpec, LibraryComponentProps } from '@/types/components';
import { getStyles } from '@/engine/componentRenderer';
import { rootAttrs } from './_shared';
export default function Toast({ spec, selected }: LibraryComponentProps) {
  const s = spec as ComponentSpec<'toast'>;
  return (
    <div
      role="status"
      aria-live="polite"
      {...rootAttrs(s, 'default', selected)}
      data-part="root"
      style={getStyles(s, 'root')}
    >
      <span data-part="bar" style={getStyles(s, 'bar')} aria-hidden="true" />
      <p data-part="message" style={getStyles(s, 'message')}>
        {s.content.message}
      </p>
      <button type="button" data-part="dismiss" aria-label="Dismiss" style={getStyles(s, 'dismiss')}>
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
    </div>
  );
}
