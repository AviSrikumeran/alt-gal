import { describe, expect, it } from 'vitest';
import { COMPONENT_TYPES } from '@/types/components';
import type { ComponentType } from '@/types/components';
import { DEFAULT_CONTENT, contentFromInput, primaryText } from '@/components/library/content';

/**
 * §3.7 test 4 (D-075, D-101). `label` fills the primary text slot, `description` the secondary one, `items` the
 * list slot; everything else falls back to DEFAULT_CONTENT.
 */

const INPUT = { label: 'X', description: 'Y', items: ['a', 'b'] };

/** The slots each type takes from `{label:'X', description:'Y', items:['a','b']}`. */
const EXPECTED: Record<ComponentType, Record<string, unknown>> = {
  button: { label: 'X' },
  badge: { label: 'X' },
  toggle: { label: 'X' },
  card: { title: 'X', body: 'Y', ctaLabel: 'a' },
  input: { label: 'X', placeholder: 'Y' },
  textarea: { label: 'X', placeholder: 'Y' },
  select: { label: 'X', placeholder: 'Y', options: ['a', 'b'] },
  avatar: { name: 'X', initials: 'X' },
  navbar: { brand: 'X', links: ['a', 'b'], ctaLabel: 'Y' },
  hero: { headline: 'X', subtitle: 'Y', primaryCta: 'a', secondaryCta: 'b' },
  'pricing-card': { tier: 'X', price: 'Y', features: ['a', 'b'] },
  'feature-grid': {
    items: [
      { title: 'a', body: DEFAULT_CONTENT['feature-grid'].items[0]?.body },
      { title: 'b', body: DEFAULT_CONTENT['feature-grid'].items[0]?.body },
    ],
  },
  footer: { brand: 'X', copyright: 'Y' },
  modal: { title: 'X', body: 'Y', confirmLabel: 'a', cancelLabel: 'b' },
  toast: { message: 'X' },
  accordion: {
    items: [
      { question: 'a', answer: DEFAULT_CONTENT.accordion.items[0]?.answer },
      { question: 'b', answer: DEFAULT_CONTENT.accordion.items[0]?.answer },
    ],
  },
};

/** Types whose primary text slot is a list, so `primaryText` has nothing single to return (D-075). */
const NO_PRIMARY_TEXT: ComponentType[] = ['feature-grid', 'accordion'];

describe('DEFAULT_CONTENT', () => {
  it('covers all 16 types', () => {
    expect(Object.keys(DEFAULT_CONTENT).sort()).toEqual([...COMPONENT_TYPES].sort());
  });

  it('has no lorem, no placeholder names and no exclamation points (D-101)', () => {
    const text = JSON.stringify(DEFAULT_CONTENT);
    expect(text).not.toMatch(/lorem|ipsum|feature name|!/i);
  });
});

describe.each(COMPONENT_TYPES)('contentFromInput(%s)', (type) => {
  it('maps label, description and items to the right slots', () => {
    expect(contentFromInput(type, INPUT)).toMatchObject(EXPECTED[type]);
  });

  it('falls back to DEFAULT_CONTENT when nothing is supplied', () => {
    expect(contentFromInput(type, {})).toEqual(DEFAULT_CONTENT[type]);
  });

  it('does not mutate DEFAULT_CONTENT', () => {
    const before = structuredClone(DEFAULT_CONTENT[type]);
    contentFromInput(type, INPUT);
    expect(DEFAULT_CONTENT[type]).toEqual(before);
  });

  it('keeps unfilled slots at their defaults', () => {
    const filled = contentFromInput(type, INPUT) as Record<string, unknown>;
    const defaults = DEFAULT_CONTENT[type] as Record<string, unknown>;
    const touched = new Set(Object.keys(EXPECTED[type]));
    for (const key of Object.keys(defaults))
      if (!touched.has(key)) expect(filled[key], `${type}.${key}`).toEqual(defaults[key]);
  });
});

describe('primaryText', () => {
  it.each(COMPONENT_TYPES.filter((t) => !NO_PRIMARY_TEXT.includes(t)))('%s returns the label', (type) => {
    expect(primaryText(type, contentFromInput(type, INPUT))).toBe('X');
  });

  it.each(NO_PRIMARY_TEXT)('%s returns null', (type) => {
    expect(primaryText(type, contentFromInput(type, INPUT))).toBeNull();
  });

  it.each(COMPONENT_TYPES)('%s returns a string or null for default content', (type) => {
    const value = primaryText(type, DEFAULT_CONTENT[type]);
    expect(value === null || typeof value === 'string').toBe(true);
  });
});
