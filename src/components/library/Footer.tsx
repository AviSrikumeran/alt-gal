// Footer.tsx
'use client';
import type { ComponentSpec, LibraryComponentProps } from '@/types/components';
import { getStyles } from '@/engine/componentRenderer';
import { rootAttrs } from './_shared';
export default function Footer({ spec, selected }: LibraryComponentProps) {
  const s = spec as ComponentSpec<'footer'>;
  return (
    <footer {...rootAttrs(s, 'default', selected)} data-part="root" style={getStyles(s, 'root')}>
      <div data-part="top" style={getStyles(s, 'top')}>
        <p data-part="brand" style={getStyles(s, 'brand')}>
          {s.content.brand}
        </p>
        <div data-part="columns" style={getStyles(s, 'columns')}>
          {s.content.columns.map((col) => (
            <ul key={col.heading} data-part="column" style={getStyles(s, 'column')} aria-label={col.heading}>
              <li data-part="heading" style={getStyles(s, 'heading')}>
                {col.heading}
              </li>
              {col.links.map((l) => (
                <li key={l}>
                  <a href="#" onClick={(e) => e.preventDefault()} data-part="link" style={getStyles(s, 'link')}>
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
      <div data-part="bottom" style={getStyles(s, 'bottom')}>
        <p data-part="copyright" style={getStyles(s, 'copyright')}>
          {s.content.copyright}
        </p>
      </div>
    </footer>
  );
}
