import type { ComponentContentMap, ComponentType, GenerateComponentInput } from '@/types/components';

export const DEFAULT_CONTENT: { [K in ComponentType]: ComponentContentMap[K] } = {
  button: { label: 'Get started' },
  card: {
    title: 'Ship without the handoff',
    body: 'Designers set the system. Agents build inside it. Nothing drifts between the two.',
    ctaLabel: 'Learn more',
  },
  input: {
    label: 'Work email',
    placeholder: 'you@company.com',
    helper: 'We only use this to send your invite.',
    error: null,
  },
  textarea: { label: 'What are you building?', placeholder: 'A few sentences is plenty.', helper: null, error: null },
  select: {
    label: 'Team size',
    placeholder: 'Choose a range',
    options: ['Just me', '2–10', '11–50', '51–200', '200+'],
  },
  toggle: { label: 'Email me weekly summaries', checked: true },
  badge: { label: 'New' },
  avatar: { initials: 'AS', name: 'Avi Srikumeran' },
  navbar: { brand: 'Northwind', links: ['Product', 'Pricing', 'Docs', 'Changelog'], ctaLabel: 'Sign in' },
  hero: {
    headline: 'Design systems that agents respect',
    subtitle: 'Define the tokens once. Every component, page, and export stays on brand — whoever generates it.',
    primaryCta: 'Start building',
    secondaryCta: 'Watch the demo',
  },
  'pricing-card': {
    tier: 'Team',
    price: '$24',
    period: 'per seat / month',
    features: ['Unlimited design systems', 'Agent access with rules', 'Export to code', 'Priority support'],
    ctaLabel: 'Choose Team',
    featured: false,
  },
  'feature-grid': {
    columns: 3,
    items: [
      { title: 'Tokens as the contract', body: 'Colors, type, and spacing live in one place and cascade everywhere.' },
      { title: 'Rules the agent can’t break', body: 'Set a constraint once. Every generation is checked against it.' },
      { title: 'Export that compiles', body: 'CSS variables, DTCG JSON, Tailwind, and React — from the same source.' },
    ],
  },
  footer: {
    brand: 'Northwind',
    columns: [
      { heading: 'Product', links: ['Features', 'Pricing', 'Changelog'] },
      { heading: 'Company', links: ['About', 'Careers', 'Contact'] },
      { heading: 'Resources', links: ['Docs', 'Guides', 'Status'] },
    ],
    copyright: '© 2026 Northwind, Inc.',
  },
  modal: {
    title: 'Delete this workspace?',
    body: 'This removes all pages and components. Tokens are kept. This can’t be undone.',
    confirmLabel: 'Delete workspace',
    cancelLabel: 'Cancel',
  },
  toast: { message: 'Changes saved. Your team can see them now.' },
  accordion: {
    items: [
      {
        question: 'Can I bring my own agent?',
        answer: 'Yes. Any WebMCP-capable browser or agent host can use the tools this page registers.',
      },
      {
        question: 'What happens if the agent breaks a rule?',
        answer:
          'The generation is rejected with the rule and the alternatives that would pass. Nothing lands on the canvas.',
      },
      {
        question: 'Do I own the export?',
        answer: 'Everything exported is MIT-licensed code you can drop into any React project.',
      },
    ],
  },
};

/** D-075: label → primary text slot, description → secondary text slot, items → list slot. Everything else from defaults. */
export function contentFromInput<T extends ComponentType>(
  type: T,
  input: Pick<GenerateComponentInput, 'label' | 'description' | 'items'>,
): ComponentContentMap[T] {
  const d = structuredClone(DEFAULT_CONTENT[type]) as Record<string, unknown>;
  const { label, description, items } = input;
  const set = (k: string, val: unknown) => {
    if (val !== undefined) d[k] = val;
  };
  switch (type) {
    case 'button':
    case 'badge':
    case 'toggle':
      set('label', label);
      break;
    case 'card':
      set('title', label);
      set('body', description);
      if (items?.[0]) set('ctaLabel', items[0]);
      break;
    case 'input':
    case 'textarea':
      set('label', label);
      set('placeholder', description);
      break;
    case 'select':
      set('label', label);
      set('placeholder', description);
      set('options', items);
      break;
    case 'avatar':
      if (label) {
        set('name', label);
        set(
          'initials',
          label
            .split(/\s+/)
            .map((w) => w[0] ?? '')
            .join('')
            .slice(0, 2)
            .toUpperCase(),
        );
      }
      break;
    case 'navbar':
      set('brand', label);
      set('links', items);
      set('ctaLabel', description);
      break;
    case 'hero':
      set('headline', label);
      set('subtitle', description);
      if (items?.[0]) set('primaryCta', items[0]);
      if (items?.[1]) set('secondaryCta', items[1]);
      break;
    case 'pricing-card':
      set('tier', label);
      set('price', description);
      set('features', items);
      break;
    case 'feature-grid':
      if (items)
        set(
          'items',
          items.map((t) => ({ title: t, body: (d.items as { body: string }[])[0]?.body ?? '' })),
        );
      break;
    case 'footer':
      set('brand', label);
      set('copyright', description);
      break;
    case 'modal':
      set('title', label);
      set('body', description);
      if (items?.[0]) set('confirmLabel', items[0]);
      if (items?.[1]) set('cancelLabel', items[1]);
      break;
    case 'toast':
      set('message', label ?? description);
      break;
    case 'accordion':
      if (items)
        set(
          'items',
          items.map((q) => ({ question: q, answer: (d.items as { answer: string }[])[0]?.answer ?? '' })),
        );
      break;
  }
  return d as ComponentContentMap[T];
}

export function primaryText(type: ComponentType, content: ComponentContentMap[ComponentType]): string | null {
  const c = content as Record<string, unknown>;
  const key: Record<ComponentType, string> = {
    button: 'label',
    badge: 'label',
    toggle: 'label',
    card: 'title',
    input: 'label',
    textarea: 'label',
    select: 'label',
    avatar: 'name',
    navbar: 'brand',
    hero: 'headline',
    'pricing-card': 'tier',
    'feature-grid': '',
    footer: 'brand',
    modal: 'title',
    toast: 'message',
    accordion: '',
  };
  const k = key[type];
  return k && typeof c[k] === 'string' ? (c[k] as string) : null;
}
