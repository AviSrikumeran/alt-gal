// Hero.tsx
'use client';
import type { ComponentSpec, LibraryComponentProps } from '@/types/components';
import { getStyles } from '@/engine/componentRenderer';
import { rootAttrs } from './_shared';
export default function Hero({ spec, selected }: LibraryComponentProps) {
  const s = spec as ComponentSpec<'hero'>;
  const id = `${s.id}-headline`;
  return (
    <section aria-labelledby={id} {...rootAttrs(s, 'default', selected)} data-part="root" style={getStyles(s, 'root')}>
      <h1 id={id} data-part="headline" style={getStyles(s, 'headline')}>
        {s.content.headline}
      </h1>
      <p data-part="subtitle" style={getStyles(s, 'subtitle')}>
        {s.content.subtitle}
      </p>
      <div data-part="actions" style={getStyles(s, 'actions')}>
        <button type="button" data-part="primaryCta" style={getStyles(s, 'primaryCta')}>
          {s.content.primaryCta}
        </button>
        {s.content.secondaryCta && (
          <button type="button" data-part="secondaryCta" style={getStyles(s, 'secondaryCta')}>
            {s.content.secondaryCta}
          </button>
        )}
      </div>
    </section>
  );
}
