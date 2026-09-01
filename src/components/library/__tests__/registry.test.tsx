import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup } from '@testing-library/react';
import { COMPONENT_SIZES, COMPONENT_TYPES, COMPONENT_VARIANTS } from '@/types/components';
import type { ComponentType } from '@/types/components';
import { COMPONENT_REGISTRY } from '@/components/library';
import { DEFAULT_CONTENT } from '@/components/library/content';
import { STYLE_DICTIONARY } from '@/engine/componentRenderer';
import type { ComponentStyleDef } from '@/engine/componentRenderer';
import { fixtureSpec } from './fixtures/vars';
import { renderWithVars } from './fixtures/renderWithVars';

/**
 * §3.7 test 2. Every registry entry renders with DEFAULT_CONTENT, carries the D-100 root attributes, and marks
 * only parts the dictionary or library.css knows about.
 */

/**
 * Parts styled exclusively in library.css, so they carry no inline styles and no dictionary entry (D-063).
 * Each is asserted to exist in library.css below, so this list cannot quietly absorb a typo.
 */
const CSS_ONLY_PARTS: Partial<Record<ComponentType, readonly string[]>> = {
  navbar: ['menu'],
  'pricing-card': ['featuredBadge'],
};

afterEach(cleanup);

describe('COMPONENT_REGISTRY', () => {
  it('maps all 16 component types', () => {
    expect(Object.keys(COMPONENT_REGISTRY).sort()).toEqual([...COMPONENT_TYPES].sort());
  });
});

describe.each(COMPONENT_TYPES)('%s', (type) => {
  const C = COMPONENT_REGISTRY[type];

  it('renders with DEFAULT_CONTENT and sets the D-100 root attributes', () => {
    const spec = fixtureSpec(type);
    const { host } = renderWithVars(<C spec={spec} />);
    const root = host.querySelector('[data-part="root"]');
    expect(root, 'a [data-part="root"] element').not.toBeNull();
    expect(root?.getAttribute('data-alt')).toBe(type);
    expect(root?.getAttribute('data-variant')).toBe(spec.variant);
    expect(root?.getAttribute('data-size')).toBe(spec.size);
    expect(root?.getAttribute('data-state')).not.toBeNull();
    expect(root?.getAttribute('data-id')).toBe(spec.id);
  });

  it('marks selection on the root only when selected', () => {
    const spec = fixtureSpec(type);
    const unselected = renderWithVars(<C spec={spec} />);
    expect(unselected.host.querySelector('[data-part="root"]')?.hasAttribute('data-selected')).toBe(false);
    cleanup();
    const selected = renderWithVars(<C spec={spec} selected />);
    expect(selected.host.querySelector('[data-part="root"]')?.getAttribute('data-selected')).toBe('true');
  });

  it('uses only parts the dictionary or library.css declares', () => {
    const known = new Set([...(STYLE_DICTIONARY[type] as ComponentStyleDef).parts, ...(CSS_ONLY_PARTS[type] ?? [])]);
    for (const variant of COMPONENT_VARIANTS) {
      for (const size of COMPONENT_SIZES) {
        const { host } = renderWithVars(<C spec={fixtureSpec(type, variant, size)} />);
        const used = [...host.querySelectorAll('[data-part]')].map((el) => el.getAttribute('data-part') as string);
        expect(
          used.filter((p) => !known.has(p)),
          `${type} ${variant}/${size}`,
        ).toEqual([]);
        cleanup();
      }
    }
  });

  it('renders every variant and size without throwing', () => {
    for (const variant of COMPONENT_VARIANTS) {
      for (const size of COMPONENT_SIZES) {
        const { host } = renderWithVars(<C spec={fixtureSpec(type, variant, size)} />);
        expect(host.querySelector('[data-part="root"]')).not.toBeNull();
        cleanup();
      }
    }
  });

  it('renders its default content', () => {
    const { host } = renderWithVars(<C spec={fixtureSpec(type)} />);
    // innerHTML, not textContent: some slots land in attributes (input placeholder, avatar name).
    const html = host.innerHTML;
    for (const text of collectStrings(DEFAULT_CONTENT[type])) expect(html, `${type}: "${text}"`).toContain(text);
  });
});

describe('CSS-only parts', () => {
  // Prettier normalises attribute selectors to single quotes; compare quote-insensitively.
  const css = readFileSync(path.join(process.cwd(), 'src/components/library/library.css'), 'utf8').replace(/'/g, '"');

  it.each(Object.entries(CSS_ONLY_PARTS).flatMap(([type, parts]) => (parts ?? []).map((p) => [type, p] as const)))(
    '%s: [data-part="%s"] is styled in library.css',
    (type, part) => {
      expect(css).toContain(`[data-alt="${type}"] [data-part="${part}"]`);
    },
  );

  it.each(Object.entries(CSS_ONLY_PARTS))('%s: no CSS-only part duplicates a dictionary part', (type, parts) => {
    const dictionary = new Set((STYLE_DICTIONARY[type as ComponentType] as ComponentStyleDef).parts);
    expect((parts ?? []).filter((p) => dictionary.has(p))).toEqual([]);
  });
});

/** Every visible string in a content object, flattened. Booleans and numbers are not rendered as text. */
function collectStrings(content: unknown): string[] {
  if (typeof content === 'string') return [content];
  if (Array.isArray(content)) return content.flatMap(collectStrings);
  if (content && typeof content === 'object') return Object.values(content).flatMap(collectStrings);
  return [];
}
