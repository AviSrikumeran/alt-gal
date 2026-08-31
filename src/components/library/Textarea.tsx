// Textarea.tsx — Input.tsx with <textarea rows={4}> and type 'textarea'.
'use client';
import type { ComponentSpec, LibraryComponentProps } from '@/types/components';
import { getStyles } from '@/engine/componentRenderer';
import { rootAttrs } from './_shared';
export default function Textarea({ spec, selected }: LibraryComponentProps) {
  const s = spec as ComponentSpec<'textarea'>;
  const fieldId = `${s.id}-field`,
    helpId = `${s.id}-help`;
  const state = s.content.error ? 'error' : 'default';
  const help = s.content.error ?? s.content.helper;
  return (
    <div {...rootAttrs(s, state, selected)} data-part="root" style={getStyles(s, 'root')}>
      <label htmlFor={fieldId} data-part="label" style={getStyles(s, 'label')}>
        {s.content.label}
      </label>
      <textarea
        id={fieldId}
        rows={4}
        placeholder={s.content.placeholder}
        aria-invalid={state === 'error' || undefined}
        aria-describedby={help ? helpId : undefined}
        data-part="field"
        style={getStyles(s, 'field')}
      />
      {help && (
        <p id={helpId} data-part="helper" role={state === 'error' ? 'alert' : undefined} style={getStyles(s, 'helper')}>
          {help}
        </p>
      )}
    </div>
  );
}
