import type { ComponentSpec } from '@/types/components';
import type { RenderedPage } from '@/types/layouts';
import type { DesignRule } from '@/types/rules';
import type { TokenState } from '@/types/tokens';
import { DEFAULT_TOKENS } from '@/utils/defaults';
import type { ExportSnapshot } from '@/engine/export';

/**
 * One fixture design system, shared by `export.test.ts` and by the emitter that
 * `scripts/verify-export.sh` compiles. It covers the cases the exporters have to get right:
 * a null color, a dark palette, a loose component, a page-owned component, a block section,
 * and one active rule.
 */
export const tokens: TokenState = {
  ...DEFAULT_TOKENS,
  colors: {
    primary: 'hsl(250, 84.0%, 60.0%)',
    secondary: 'hsl(280, 76.0%, 60.0%)',
    accent: 'hsl(220, 76.0%, 60.0%)',
    danger: 'hsl(0, 84.0%, 60.0%)',
    warning: 'hsl(38, 92.0%, 50.0%)',
    success: 'hsl(142, 71.0%, 45.0%)',
    muted: 'hsl(250, 6.0%, 90.0%)',
    background: 'hsl(250, 10.0%, 98.0%)',
    surface: 'hsl(250, 10.0%, 100.0%)',
    'text-primary': 'hsl(250, 15.0%, 10.0%)',
    'text-secondary': 'hsl(250, 10.0%, 40.0%)',
    'text-muted': null, // exercises the `/* unset */` path (D-167)
    border: 'hsl(250, 12.0%, 88.0%)',
  },
  dark: { ...DEFAULT_TOKENS.colors, primary: 'hsl(250, 79.0%, 68.0%)', background: 'hsl(250, 20.0%, 8.0%)' },
  typography: { ...DEFAULT_TOKENS.typography, families: { heading: 'Geist', body: 'Inter', mono: 'JetBrains Mono' } },
};

/** Stands in for `tokenToVars` (Stream 1); the exporters take vars as input, never a store. */
const vars: Record<string, string> = {
  '--color-primary': 'hsl(250, 84.0%, 60.0%)',
  '--color-background': 'hsl(250, 10.0%, 98.0%)',
  '--color-text-muted': 'hsl(0, 0%, 58.0%)',
  '--color-on-primary': 'hsl(250, 10%, 98.0%)',
  '--font-heading': "'__Geist_abc123', system-ui, sans-serif",
  '--font-body': "'__Inter_def456', system-ui, sans-serif",
  '--font-mono': "'__JetBrains_Mono_789', ui-monospace, monospace",
  '--font-size-base': '16px',
  '--line-height-normal': '1.5',
  '--spacing-4': '16px',
  '--radius-md': '8px',
  '--elevation-sm': '0 1px 2px 0 rgba(0,0,0,0.05)',
  '--animation-duration-fast': '150ms',
  '--animation-easing-default': 'cubic-bezier(0.4, 0, 0.2, 1)',
};

const button: ComponentSpec = {
  id: 'comp_1',
  type: 'button',
  variant: 'primary',
  size: 'md',
  content: { label: 'Get started' },
  pageId: null,
  sectionId: null,
  createdBy: 'agent',
  createdAt: 0,
};

const heroInPage: ComponentSpec = {
  id: 'comp_2',
  type: 'hero',
  variant: 'primary',
  size: 'md',
  content: { headline: 'Ship the system', subtitle: 'Not the screenshot.', primaryCta: 'Start', secondaryCta: null },
  pageId: 'page_1',
  sectionId: 'sec_1',
  createdBy: 'agent',
  createdAt: 0,
};

const pricingCard = (id: string, tier: string, featured: boolean): ComponentSpec => ({
  id,
  type: 'pricing-card',
  variant: 'primary',
  size: 'md',
  content: {
    tier,
    price: featured ? '$24' : '$0',
    period: 'per seat / month',
    features: ['Unlimited systems', 'Agent access with rules'],
    ctaLabel: `Choose ${tier}`,
    featured,
  },
  pageId: 'page_1',
  sectionId: 'sec_3',
  createdBy: 'agent',
  createdAt: 0,
});

const pricing = [pricingCard('comp_3', 'Starter', false), pricingCard('comp_4', 'Team', true)];

export const page: RenderedPage = {
  id: 'page_1',
  wireframeId: 'wf_1',
  pageType: 'landing',
  title: 'Northwind Landing',
  sections: [
    { sectionId: 'sec_1', type: 'hero', columns: null, componentIds: ['comp_2'] },
    { sectionId: 'sec_2', type: 'stats', columns: 4, componentIds: [] },
    { sectionId: 'sec_3', type: 'pricing', columns: 2, componentIds: ['comp_3', 'comp_4'] },
    { sectionId: 'sec_4', type: 'cta', columns: null, componentIds: [] }, // emptied section (D-138)
  ],
  createdAt: 0,
};

const rules: DesignRule[] = [
  {
    id: 'rule_1',
    type: 'component-restriction',
    description: 'No danger-variant buttons',
    condition: { target: 'button', property: 'variant', operator: 'not-equals', value: 'danger' },
    enabled: true,
    createdBy: 'human',
    createdAt: 0,
  },
];

export const SNAPSHOT: ExportSnapshot = {
  tokens,
  vars,
  components: [button, heroInPage, ...pricing],
  pages: [page],
  rules,
  productName: 'Northwind',
  slug: 'northwind',
  exportedAt: Date.UTC(2026, 8, 1),
};
