// Modal.tsx — renders the dialog surface inline on the canvas over a fixed-height backdrop. No portal, no focus trap on canvas.
'use client';
import type { ComponentSpec, LibraryComponentProps } from '@/types/components';
import { getStyles } from '@/engine/componentRenderer';
import { rootAttrs } from './_shared';
export default function Modal({ spec, selected }: LibraryComponentProps) {
  const s = spec as ComponentSpec<'modal'>;
  const tId = `${s.id}-title`,
    bId = `${s.id}-body`;
  return (
    <div {...rootAttrs(s, 'default', selected)} data-part="root" style={getStyles(s, 'root')}>
      <div data-part="backdrop" style={getStyles(s, 'backdrop')} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={tId}
        aria-describedby={bId}
        data-part="dialog"
        style={getStyles(s, 'dialog')}
      >
        <h2 id={tId} data-part="title" style={getStyles(s, 'title')}>
          {s.content.title}
        </h2>
        <p id={bId} data-part="body" style={getStyles(s, 'body')}>
          {s.content.body}
        </p>
        <div data-part="actions" style={getStyles(s, 'actions')}>
          <button type="button" data-part="cancel" style={getStyles(s, 'cancel')}>
            {s.content.cancelLabel}
          </button>
          <button type="button" data-part="confirm" style={getStyles(s, 'confirm')}>
            {s.content.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
