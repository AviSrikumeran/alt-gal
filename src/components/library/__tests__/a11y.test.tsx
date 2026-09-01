import { afterEach, describe, expect, it } from 'vitest';
import { cleanup } from '@testing-library/react';
import axe from 'axe-core';
import { COMPONENT_SIZES, COMPONENT_TYPES, COMPONENT_VARIANTS } from '@/types/components';
import type { ComponentSpec } from '@/types/components';
import { COMPONENT_REGISTRY } from '@/components/library';
import { DEFAULT_CONTENT } from '@/components/library/content';
import { fixtureSpec } from './fixtures/vars';
import { renderWithVars } from './fixtures/renderWithVars';

/**
 * §3.7 test 3: axe-core over every rendered component, zero violations. Run scoped to the wrapper element, so
 * document-level rules (landmark-one-main, page-has-heading-one) correctly stay out of a component's scope.
 * axe reports colour contrast as *incomplete* under jsdom, which has no layout engine; the real contrast checks
 * are Stream 1's `accessibilityAuditor` over token values (D-165), not this test.
 */
async function expectNoViolations(spec: ComponentSpec, label: string) {
  const C = COMPONENT_REGISTRY[spec.type];
  const { host } = renderWithVars(<C spec={spec} />);
  // color-contrast needs a layout engine and pixel sampling; jsdom has neither, so it only emits
  // "incomplete" plus canvas warnings. Token contrast is covered by D-165's auditor instead.
  const results = await axe.run(host, { rules: { 'color-contrast': { enabled: false } } });
  expect(
    results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.html).join(' | ')}`),
    label,
  ).toEqual([]);
  cleanup();
}

afterEach(cleanup);

describe.each(COMPONENT_TYPES)('%s', (type) => {
  it('has no axe violations in any variant', async () => {
    for (const variant of COMPONENT_VARIANTS)
      await expectNoViolations(fixtureSpec(type, variant), `${type}/${variant}`);
  });

  it('has no axe violations at any size', async () => {
    for (const size of COMPONENT_SIZES) await expectNoViolations(fixtureSpec(type, 'primary', size), `${type}/${size}`);
  });
});

describe('content states that change the rendered markup', () => {
  it('input and textarea in the error state keep the field described', async () => {
    for (const type of ['input', 'textarea'] as const) {
      const spec = fixtureSpec(type);
      await expectNoViolations(
        { ...spec, content: { ...DEFAULT_CONTENT[type], error: 'Use your work address.' } },
        `${type} error`,
      );
    }
  });

  it('a featured pricing card announces its badge accessibly', async () => {
    const spec = fixtureSpec('pricing-card');
    await expectNoViolations(
      { ...spec, content: { ...DEFAULT_CONTENT['pricing-card'], featured: true } },
      'pricing-card featured',
    );
  });

  it('an unchecked toggle is still a labelled switch', async () => {
    const spec = fixtureSpec('toggle');
    await expectNoViolations({ ...spec, content: { ...DEFAULT_CONTENT.toggle, checked: false } }, 'toggle unchecked');
  });

  it('a hero without a secondary CTA is fine', async () => {
    const spec = fixtureSpec('hero');
    await expectNoViolations({ ...spec, content: { ...DEFAULT_CONTENT.hero, secondaryCta: null } }, 'hero solo CTA');
  });

  it('a card without a CTA is fine', async () => {
    const spec = fixtureSpec('card');
    await expectNoViolations({ ...spec, content: { ...DEFAULT_CONTENT.card, ctaLabel: null } }, 'card no CTA');
  });
});
