/**
 * sectionContent — per-section copy for a rendered page (D-135).
 *
 * Derived from DEFAULT_CONTENT with per-slot overrides so a rendered page reads
 * as one product rather than a strip of independent specimens. Wireframe labels
 * are structural (`HERO`) and are never used as content.
 */
import type { ComponentContent, ComponentContentMap, ComponentType } from '@/types/components';
import type { SectionType } from '@/types/layouts';
import { DEFAULT_CONTENT } from '@/components/library/content';

const clone = <T extends ComponentType>(type: T): ComponentContentMap[T] => structuredClone(DEFAULT_CONTENT[type]);

const PRICING_TIERS: ComponentContentMap['pricing-card'][] = [
  {
    tier: 'Starter',
    price: '$0',
    period: 'free forever',
    features: ['One design system', 'Up to 20 components', 'CSS and JSON export', 'Community support'],
    ctaLabel: 'Start free',
    featured: false,
  },
  {
    tier: 'Team',
    price: '$24',
    period: 'per seat / month',
    features: ['Unlimited design systems', 'Agent access with rules', 'Export to code', 'Priority support'],
    ctaLabel: 'Choose Team',
    featured: false,
  },
  {
    tier: 'Business',
    price: '$79',
    period: 'per seat / month',
    features: ['Everything in Team', 'SSO and audit log', 'Shared component libraries', 'Dedicated support'],
    ctaLabel: 'Choose Business',
    featured: false,
  },
];

const TESTIMONIALS: { name: string; role: string; quote: string }[] = [
  {
    name: 'Dana Whitfield',
    role: 'Design lead, Kestrel',
    quote: 'Our agent stopped inventing colors the day we moved the palette into Northwind.',
  },
  {
    name: 'Marcus Oyelaran',
    role: 'Head of platform, Bluewire',
    quote: 'Two designers and four agents ship from one system, and nothing drifts between them.',
  },
  {
    name: 'Priya Raghavan',
    role: 'Staff engineer, Halden',
    quote: 'The export compiles into our app untouched. That was the whole evaluation, and it passed.',
  },
];

const FEATURE_ITEMS: { title: string; body: string }[] = [
  { title: 'Tokens as the contract', body: 'Colors, type, and spacing live in one place and cascade everywhere.' },
  { title: 'Rules the agent respects', body: 'Set a constraint once. Every generation is checked against it.' },
  { title: 'Export that compiles', body: 'CSS variables, DTCG JSON, Tailwind, and React from the same source.' },
  { title: 'One record of the work', body: 'Every change, human or agent, is logged and reversible.' },
];

const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: 'Can I bring my own agent?',
    answer: 'Any WebMCP-capable browser or agent host can use the tools this page registers.',
  },
  {
    question: 'What happens if the agent breaks a rule?',
    answer: 'The generation is rejected with the rule and the alternatives that would pass. Nothing lands on the page.',
  },
  {
    question: 'Do I own the export?',
    answer: 'Everything exported is MIT-licensed code you can drop into any React project.',
  },
  {
    question: 'Does the agent need my design files?',
    answer: 'No. The tokens and rules on this page are the whole brief, and they travel with the export.',
  },
  {
    question: 'What if I change a color later?',
    answer: 'Every component and page on the canvas updates as you drag the slider. Nothing is baked in.',
  },
];

const CONTENT_CARD: ComponentContentMap['card'] = {
  title: 'Built for the handoff that no longer happens',
  body: 'A design system used to be a document that people agreed to follow. Northwind makes it something both a person and an agent read at the moment of building: the same tokens, the same components, the same constraints. What ships is what the system allows, whoever pressed the button.',
  ctaLabel: null,
};

const CTA_HERO: ComponentContentMap['hero'] = {
  headline: 'Ready when you are',
  subtitle: 'Start free, upgrade when the team joins.',
  primaryCta: 'Start building',
  secondaryCta: null,
};

/** Copy for the three token-styled section blocks (gallery, stats, team). */
export const BLOCK_CONTENT = {
  stats: [
    { value: '12k', label: 'Components generated' },
    { value: '98%', label: 'Generations passing rules' },
    { value: '40+', label: 'Teams building on Northwind' },
    { value: '3 min', label: 'From first token to export' },
  ],
  team: [
    { initials: 'DW', name: 'Dana Whitfield', role: 'Design' },
    { initials: 'MO', name: 'Marcus Oyelaran', role: 'Platform' },
    { initials: 'PR', name: 'Priya Raghavan', role: 'Engineering' },
    { initials: 'JL', name: 'June Lindqvist', role: 'Research' },
  ],
  gallery: { caption: 'Northwind in use' },
} as const;

const clampColumns = (n: number): 2 | 3 | 4 => (n <= 2 ? 2 : n >= 4 ? 4 : 3);

/**
 * Content for the `index`-th component a section produces.
 * `columns` is the section's resolved column count, or null for a section that
 * isn't a grid section; for per-column sections it is also the component count.
 */
export function contentForSection(
  section: SectionType,
  component: ComponentType,
  index: number,
  columns: number | null,
): ComponentContent {
  switch (section) {
    case 'features': {
      const c = clone('feature-grid');
      c.columns = clampColumns(columns ?? 3);
      c.items = Array.from({ length: c.columns }, (_, i) => ({ ...FEATURE_ITEMS[i % FEATURE_ITEMS.length]! }));
      return c;
    }
    case 'pricing': {
      const tier = PRICING_TIERS[index % PRICING_TIERS.length]!;
      return { ...tier, features: [...tier.features], featured: index === Math.floor(((columns ?? 1) - 1) / 2) };
    }
    case 'testimonials': {
      const t = TESTIMONIALS[index % TESTIMONIALS.length]!;
      return { title: `${t.name} · ${t.role}`, body: t.quote, ctaLabel: null };
    }
    case 'cta':
      return { ...CTA_HERO };
    case 'faq': {
      const c = clone('accordion');
      c.items = FAQ_ITEMS.map((i) => ({ ...i }));
      return c;
    }
    case 'content':
      return { ...CONTENT_CARD };
    default:
      // navbar, hero, footer render their library defaults; blocks never reach here.
      return clone(component);
  }
}
