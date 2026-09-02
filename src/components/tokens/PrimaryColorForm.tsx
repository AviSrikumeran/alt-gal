'use client';
/**
 * The one declarative tool (D-029, D-030): `<form toolname="set_primary_color">` with NO
 * `toolautosubmit`. The agent fills it, a human clicks Apply. That asymmetry is the whole argument —
 * the 24 imperative tools are state transitions the agent executes; this one is a proposal the human
 * ratifies, and a form without `toolautosubmit` is the platform's own primitive for saying so.
 *
 * Never phase-gated: it is a way out of phase 0 (D-027, D-029). `set_token` is the imperative path to
 * the same store action, so nothing in the demo depends on the host supporting declarative forms.
 *
 * The attribute names come from Chrome's `webmcp-declarative.d.ts`, copied verbatim into
 * src/types/ (D-079); the submit contract comes from mace's declarative.js.
 */
import type { FormEvent } from 'react';
import { useState } from 'react';
import type { ToolOutcome } from '@/types/webmcp';
import { parseColor, toHex } from '@/utils/colorUtils';
import { useTokenStore } from '@/stores/tokenStore';
import { usePhaseStore } from '@/stores/phaseStore';
import { ok, serialize, toResult } from '@/webmcp/results';
import { useTokenEditor } from './useTokenEditor';

/**
 * The agent-invocation fields the host adds to a submit event. They are not in Chrome's attribute
 * typings, which cover the JSX attributes only, so they are declared here rather than in the frozen
 * `src/types/**` (§11.2).
 */
interface AgentSubmitEvent extends SubmitEvent {
  agentInvoked?: boolean;
  respondWith?(response: Promise<string>): void;
}

/** The `alt:focus-primary` listener (useStudioEvents) reaches this input by id; it owns the CTA. */
export const PRIMARY_COLOR_INPUT_ID = 'tk-primary-value';

const DESCRIPTION =
  'Propose a primary brand color for the human to apply. Fill it with an hsl() or hex value; the human clicks Apply.';

export default function PrimaryColorForm() {
  const primary = useTokenStore((s) => s.colors.primary);
  const locked = useTokenStore((s) => s.locked.includes('color.primary'));
  const editor = useTokenEditor('color.primary');
  const [draft, setDraft] = useState('');

  const apply = (raw: string): ToolOutcome<{ value: string; previous: string | null }> => {
    const value = raw.trim();
    if (value === '') return { kind: 'error', code: 'INVALID_INPUT', message: 'Enter a color as hsl(...) or #rrggbb.' };
    if (locked)
      return {
        kind: 'error',
        code: 'LOCKED',
        message: 'color.primary is locked by the human.',
        hint: 'Unlock the primary row in the token panel, or propose a different role with set_token.',
      };
    const parsed = parseColor(value);
    if (!parsed)
      return {
        kind: 'error',
        code: 'INVALID_INPUT',
        message: `'${value}' is not a color. Use hsl(250, 84%, 60%), #7c5cff, or rgb(124, 92, 255).`,
      };
    const previous = useTokenStore.getState().getToken('color.primary');
    editor.set(value);
    const stored = useTokenStore.getState().getToken('color.primary') ?? value;
    return ok(`Primary is now ${stored}.`, { value: stored, previous });
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    const native = event.nativeEvent as AgentSubmitEvent;
    // preventDefault is required before respondWith, and there is no server to submit to anyway.
    event.preventDefault();
    const form = event.currentTarget;
    const raw = String(new FormData(form).get('value') ?? '');

    const phaseBefore = usePhaseStore.getState().currentPhase;
    const outcome = apply(raw);
    // Phase recalculation is synchronous inside the store write (D-049), so this read is the after.
    const phaseAfter = usePhaseStore.getState().currentPhase;
    const result = toResult(outcome, phaseBefore, phaseAfter);

    if (outcome.kind === 'ok') {
      setDraft('');
      form.reset();
    }
    if (native.agentInvoked && native.respondWith) native.respondWith(Promise.resolve(serialize(result)));
  };

  const preview = parseColor(draft.trim());

  return (
    <form
      className="tk-primary-form"
      toolname="set_primary_color"
      tooldescription={DESCRIPTION}
      onSubmit={onSubmit}
      aria-label="Set primary color"
    >
      <span
        className="tk-swatch"
        data-state={preview ? 'set' : 'empty'}
        style={preview ? { backgroundColor: draft } : undefined}
        aria-hidden="true"
      />
      <input
        id={PRIMARY_COLOR_INPUT_ID}
        className="tk-hex"
        type="text"
        name="value"
        spellCheck={false}
        toolparamdescription="The proposed primary color, as hsl(250, 84%, 60%) or #7c5cff. rgb() is accepted too."
        placeholder={primary ? toHex(parseColor(primary) ?? { h: 0, s: 0, l: 0 }) : 'Not set'}
        aria-label="Proposed primary color"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
      <button type="submit" className="tk-button tk-button-primary" disabled={locked}>
        Apply
      </button>
    </form>
  );
}
