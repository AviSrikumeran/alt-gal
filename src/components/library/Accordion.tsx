// Accordion.tsx — first item open by default; local state only (not persisted, not in spec).
'use client';
import { useState } from 'react';
import type { ComponentSpec, LibraryComponentProps } from '@/types/components';
import { getStyles } from '@/engine/componentRenderer';
import { rootAttrs } from './_shared';
export default function Accordion({ spec, selected }: LibraryComponentProps) {
  const s = spec as ComponentSpec<'accordion'>;
  const [open, setOpen] = useState(0);
  return (
    <div {...rootAttrs(s, 'default', selected)} data-part="root" style={getStyles(s, 'root')}>
      {s.content.items.map((it, i) => {
        const tId = `${s.id}-t${i}`,
          pId = `${s.id}-p${i}`;
        const isOpen = open === i;
        return (
          <div key={i} data-part="item" style={getStyles(s, 'item')}>
            <h3 style={{ margin: 0 }}>
              <button
                type="button"
                id={tId}
                aria-expanded={isOpen}
                aria-controls={pId}
                onClick={() => setOpen(isOpen ? -1 : i)}
                data-part="trigger"
                style={getStyles(s, 'trigger')}
              >
                <span data-part="question" style={getStyles(s, 'question')}>
                  {it.question}
                </span>
                <svg data-part="chevron" style={getStyles(s, 'chevron')} viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </button>
            </h3>
            <div
              id={pId}
              role="region"
              aria-labelledby={tId}
              hidden={!isOpen}
              data-part="panel"
              style={getStyles(s, 'panel')}
            >
              <p data-part="answer" style={getStyles(s, 'answer')}>
                {it.answer}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
