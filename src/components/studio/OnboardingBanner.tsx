'use client';
import type { TokenPath } from '@/types/tokens';
import { SEMANTIC_COLOR_ROLES } from '@/types/tokens';
import { useTokenStore } from '@/stores/tokenStore';
import { useUIStore } from '@/stores/uiStore';
import { generatePalette, toHSLString } from '@/utils/colorUtils';
import { commitHuman } from '@/engine/commit';
import { pushToast } from './toastStore';
import { DEMO_URL, S } from './strings';

/** D-157: the exact example set. Tokens only — never components, never pages. */
const EXAMPLE_PRIMARY = { h: 250, s: 84, l: 60 };
const EXAMPLE_FAMILIES: Record<'heading' | 'body' | 'mono', string> = {
  heading: 'Geist',
  body: 'Inter',
  mono: 'JetBrains Mono',
};
const BASE_SIZE = 16;
const RATIO = 1.25;
const SCALE_KEYS = ['xs', 'sm', 'base', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'] as const;

/** D-105: nine steps, `round(base × ratio^n)` for n = −2…6. */
function typeScale(): Partial<Record<TokenPath, string>> {
  const out: Partial<Record<TokenPath, string>> = {};
  SCALE_KEYS.forEach((key, i) => {
    out[`fontSize.${key}`] = String(Math.round(BASE_SIZE * Math.pow(RATIO, i - 2)));
  });
  return out;
}

/**
 * D-156. One dismissible banner — not a tour, not a modal. `Load example tokens` lands a first
 * visitor in phase 2 in one click, without an agent and without skipping the phase system: it sets
 * colors and type, and nothing else.
 */
export default function OnboardingBanner() {
  const dismissed = useUIStore((s) => s.onboardingDismissed);
  const dismiss = useUIStore((s) => s.dismissOnboarding);
  if (dismissed) return null;

  const loadExample = () => {
    const store = useTokenStore.getState();
    let palette: Record<string, string>;
    try {
      palette = generatePalette(EXAMPLE_PRIMARY, 'analogous');
    } catch {
      palette = { primary: toHSLString(EXAMPLE_PRIMARY) };
    }

    const values: Partial<Record<TokenPath, string>> = { ...typeScale(), 'spacing.unit': '4' };
    for (const role of SEMANTIC_COLOR_ROLES) {
      const value = palette[role];
      if (value) values[`color.${role}`] = value;
    }
    for (const [key, family] of Object.entries(EXAMPLE_FAMILIES))
      values[`font.${key as 'heading' | 'body' | 'mono'}`] = family;

    const snapshot: Partial<Record<TokenPath, string | null>> = {};
    for (const path of Object.keys(values) as TokenPath[]) snapshot[path] = store.getToken(path);

    commitHuman('ui.load_example', () => {
      useTokenStore.getState().setMany(values);
      return { kind: 'restore_tokens', snapshot };
    });
    pushToast({ message: 'Example tokens loaded. Generate a component to keep going.', tone: 'info' });
  };

  return (
    <div className="alt-onboarding">
      <p className="alt-onboarding__body">
        <strong>Alternative Galaxy</strong> is a design studio for humans and AI agents. You set the tokens and the
        rules; an agent builds inside them, using only the tools the current phase allows.
      </p>
      <div className="alt-onboarding__actions">
        <a className="alt-btn" href={DEMO_URL} target="_blank" rel="noreferrer">
          {S.onboardingDemo}
        </a>
        <button type="button" className="alt-btn" onClick={loadExample}>
          {S.onboardingExample}
        </button>
        <button type="button" className="alt-btn" data-kind="ghost" onClick={dismiss}>
          {S.onboardingDismiss}
        </button>
      </div>
    </div>
  );
}
