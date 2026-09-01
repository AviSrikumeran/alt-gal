import { describe, expect, it } from 'vitest';
import type { ComponentType } from '@/types/components';
import type { SectionType } from '@/types/layouts';
import { SECTION_COMPONENT_MAP, renderWireframe } from '@/engine/layoutEngine';
import { PAGE_TYPE_SECTIONS, createWireframe, resolvedColumns } from '@/engine/wireframeEngine';

const landing = () => createWireframe({ pageType: 'landing', title: 'Northwind', createdBy: 'human' });

/** Part Four's table: what each section produces (Turn 5 §4.2). */
const EXPECTED: Record<SectionType, { component: ComponentType | 'block'; count: number }> = {
  navbar: { component: 'navbar', count: 1 },
  hero: { component: 'hero', count: 1 },
  features: { component: 'feature-grid', count: 1 },
  pricing: { component: 'pricing-card', count: 3 },
  testimonials: { component: 'card', count: 3 },
  cta: { component: 'hero', count: 1 },
  faq: { component: 'accordion', count: 1 },
  footer: { component: 'footer', count: 1 },
  content: { component: 'card', count: 1 },
  gallery: { component: 'block', count: 0 },
  stats: { component: 'block', count: 0 },
  team: { component: 'block', count: 0 },
};

describe('renderWireframe', () => {
  it('renders the six-section landing wireframe into the mapped components', () => {
    const wireframe = landing();
    expect(wireframe.sections).toHaveLength(6);

    const { page, components } = renderWireframe(wireframe);

    expect(page.sections.map((s) => s.type)).toEqual(PAGE_TYPE_SECTIONS.landing);
    expect(components).toHaveLength(8); // 1 navbar + 1 hero + 1 feature-grid + 3 pricing-card + 1 accordion + 1 footer

    for (const section of page.sections) {
      const expected = EXPECTED[section.type];
      const specs = components.filter((c) => c.sectionId === section.sectionId);
      expect(specs).toHaveLength(expected.count);
      expect(section.componentIds).toEqual(specs.map((c) => c.id));
      for (const spec of specs) expect(spec.type).toBe(expected.component);
    }
  });

  it('produces the mapped component and count for every section type', () => {
    const wireframe = createWireframe({
      pageType: 'landing',
      title: 'Everything',
      sections: Object.keys(EXPECTED) as SectionType[],
      createdBy: 'agent',
    });
    const { page, components } = renderWireframe(wireframe);

    for (const section of page.sections) {
      const { component, count } = EXPECTED[section.type];
      const specs = components.filter((c) => c.sectionId === section.sectionId);
      expect({ type: section.type, count: specs.length }).toEqual({ type: section.type, count });
      if (component !== 'block') for (const spec of specs) expect(spec.type).toBe(component);
      expect(SECTION_COMPONENT_MAP[section.type].component).toBe(component);
    }
  });

  it('makes every rendered component page-owned and section-owned (D-053)', () => {
    const { page, components } = renderWireframe(landing(), 'agent');
    const sectionIds = new Set(page.sections.map((s) => s.sectionId));
    for (const spec of components) {
      expect(spec.pageId).toBe(page.id);
      expect(spec.sectionId).not.toBeNull();
      expect(sectionIds.has(spec.sectionId!)).toBe(true);
      expect(spec.createdBy).toBe('agent');
    }
  });

  it('features maps columns to content.columns; pricing features the middle card', () => {
    const wireframe = createWireframe({
      pageType: 'landing',
      title: 'Columns',
      sections: ['features', 'pricing'],
      createdBy: 'human',
    });
    const { page, components } = renderWireframe(wireframe);

    const grid = components.find((c) => c.type === 'feature-grid')!;
    const gridContent = grid.content as { columns: number; items: unknown[] };
    expect(gridContent.columns).toBe(resolvedColumns(wireframe.sections[0]!));
    expect(gridContent.items).toHaveLength(gridContent.columns);

    const pricing = components.filter((c) => c.type === 'pricing-card');
    expect(pricing.map((c) => (c.content as { featured: boolean }).featured)).toEqual([false, true, false]);
    expect(pricing.map((c) => (c.content as { tier: string }).tier)).toEqual(['Starter', 'Team', 'Business']);
    expect(page.sections[1]!.columns).toBe(3);
  });

  it('honours an explicit column count on a per-column section', () => {
    const wireframe = createWireframe({
      pageType: 'landing',
      title: 'Wide',
      sections: ['testimonials'],
      createdBy: 'human',
    });
    wireframe.sections[0]!.columns = 4;
    const { page, components } = renderWireframe(wireframe);
    expect(components).toHaveLength(4);
    expect(page.sections[0]!.columns).toBe(4);
    expect((components[0]!.content as { title: string }).title).toContain('·');
  });

  it('gives cta a small hero with no secondary call to action, and content a large card', () => {
    const wireframe = createWireframe({
      pageType: 'landing',
      title: 'Shapes',
      sections: ['cta', 'content'],
      createdBy: 'agent',
    });
    const { components } = renderWireframe(wireframe);
    const [cta, content] = components;
    expect(cta!.type).toBe('hero');
    expect(cta!.size).toBe('sm');
    expect((cta!.content as { secondaryCta: string | null }).secondaryCta).toBeNull();
    expect(content!.type).toBe('card');
    expect(content!.size).toBe('lg');
    expect((content!.content as { ctaLabel: string | null }).ctaLabel).toBeNull();
  });
});
