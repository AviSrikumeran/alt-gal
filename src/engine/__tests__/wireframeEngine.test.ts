import { describe, expect, it } from 'vitest';
import { SECTION_TYPES } from '@/types/layouts';
import {
  PAGE_TYPE_SECTIONS,
  SECTION_BOX,
  addSection,
  boxLabel,
  createSection,
  createWireframe,
  innerBoxCount,
  moveSection,
  removeSection,
  reorderSection,
  resolvedColumns,
} from '@/engine/wireframeEngine';

const landing = () => createWireframe({ pageType: 'landing', title: 'Northwind', createdBy: 'human' });

describe('SECTION_BOX', () => {
  it('covers all twelve section types with the Turn 5 §4.1 heights', () => {
    expect(Object.keys(SECTION_BOX).sort()).toEqual([...SECTION_TYPES].sort());
    expect(SECTION_BOX.navbar.height).toBe(64);
    expect(SECTION_BOX.hero.height).toBe(360);
    expect(SECTION_BOX.pricing.height).toBe(420);
    expect(SECTION_BOX.stats.height).toBe(160);
  });

  it('draws one inner box per resolved column, and none for non-grid sections', () => {
    expect(innerBoxCount(createSection('features'))).toBe(3);
    expect(innerBoxCount(createSection('gallery'))).toBe(4);
    expect(innerBoxCount(createSection('gallery', 2))).toBe(2);
    expect(innerBoxCount(createSection('hero'))).toBe(0);
  });

  it('labels grid sections with their column count', () => {
    expect(boxLabel(createSection('hero'))).toBe('HERO');
    expect(boxLabel(createSection('features'))).toBe('FEATURES · 3 COL');
    expect(boxLabel(createSection('gallery', 2))).toBe('GALLERY · 2 COL');
  });

  it('keeps columns null on sections that are not grid sections', () => {
    expect(createSection('hero', 4).columns).toBeNull();
    expect(resolvedColumns(createSection('hero'))).toBeNull();
  });
});

describe('createWireframe', () => {
  it('uses the page type preselection and starts unrendered', () => {
    const wireframe = landing();
    expect(wireframe.sections.map((s) => s.type)).toEqual(PAGE_TYPE_SECTIONS.landing);
    expect(wireframe.status).toBe('wireframe');
    expect(wireframe.id.startsWith('wf_')).toBe(true);
    expect(wireframe.sections.every((s) => s.id.startsWith('sec_'))).toBe(true);
  });

  it('has a preselection for every page type', () => {
    for (const [pageType, sections] of Object.entries(PAGE_TYPE_SECTIONS)) {
      expect(sections.length, pageType).toBeGreaterThan(0);
    }
  });
});

describe('section operations', () => {
  it('reorders by id and clamps the target index', () => {
    const { sections } = landing();
    const moved = reorderSection(sections, sections[3]!.id, 0)!;
    expect(moved.map((s) => s.type)).toEqual(['pricing', 'navbar', 'hero', 'features', 'faq', 'footer']);
    expect(reorderSection(sections, sections[0]!.id, 99)!.at(-1)!.type).toBe('navbar');
  });

  it('moves relatively and refuses to move past either end', () => {
    const { sections } = landing();
    expect(moveSection(sections, sections[0]!.id, -1)).toBeNull();
    expect(moveSection(sections, sections.at(-1)!.id, 1)).toBeNull();
    expect(moveSection(sections, sections[1]!.id, 1)!.map((s) => s.type)).toEqual([
      'navbar',
      'features',
      'hero',
      'pricing',
      'faq',
      'footer',
    ]);
  });

  it('removes and inserts by id, and returns null for an unknown id (D-124, D-125)', () => {
    const { sections } = landing();
    expect(removeSection(sections, sections[1]!.id)!.map((s) => s.type)).toEqual([
      'navbar',
      'features',
      'pricing',
      'faq',
      'footer',
    ]);
    expect(removeSection(sections, 'sec_missing')).toBeNull();

    const added = addSection(sections, sections[1]!.id, createSection('testimonials'))!;
    expect(added.map((s) => s.type)[2]).toBe('testimonials');
    expect(addSection(sections, null, createSection('cta'))![0]!.type).toBe('cta');
    expect(addSection(sections, 'sec_missing', createSection('cta'))).toBeNull();
  });

  it('never mutates the input array', () => {
    const { sections } = landing();
    const before = sections.map((s) => s.type);
    reorderSection(sections, sections[0]!.id, 3);
    removeSection(sections, sections[0]!.id);
    addSection(sections, null, createSection('cta'));
    expect(sections.map((s) => s.type)).toEqual(before);
  });
});
