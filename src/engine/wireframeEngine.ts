/**
 * wireframeEngine — the gray-box model (D-128) and the pure section operations
 * behind `modify_layout` (D-124) and the human section controls (D-129).
 *
 * Wireframes are deliberately never token-styled: heights, placeholders, and
 * inner-box counts are structural facts about a section type, so they live here
 * and are rendered with studio grays by WireframePreview.
 */
import type { PageType, SectionType, Wireframe, WireframeSection } from '@/types/layouts';
import { generateId } from '@/utils/idGenerator';

/** One row of the Turn 5 §4.1 box table. `innerBoxes: 'columns'` draws one box per resolved column. */
export interface SectionBox {
  height: number;
  placeholder: string;
  innerBoxes: 'columns' | null;
  /** null = the section is not a grid section; `WireframeSection.columns` stays null. */
  defaultColumns: number | null;
}

export const SECTION_BOX: Record<SectionType, SectionBox> = {
  navbar: { height: 64, placeholder: 'Brand, links, sign-in', innerBoxes: null, defaultColumns: null },
  hero: { height: 360, placeholder: 'Headline, subtitle, two calls to action', innerBoxes: null, defaultColumns: null },
  features: {
    height: 320,
    placeholder: 'Icon, title, one-line description per item',
    innerBoxes: 'columns',
    defaultColumns: 3,
  },
  pricing: {
    height: 420,
    placeholder: 'Tier, price, feature list, button per plan',
    innerBoxes: 'columns',
    defaultColumns: 3,
  },
  testimonials: { height: 280, placeholder: 'Quote, avatar, name, role', innerBoxes: 'columns', defaultColumns: 3 },
  cta: { height: 220, placeholder: 'Headline, subtitle, one call to action', innerBoxes: null, defaultColumns: null },
  faq: { height: 320, placeholder: 'Five expandable questions', innerBoxes: null, defaultColumns: null },
  footer: { height: 200, placeholder: 'Brand, three link columns, copyright', innerBoxes: null, defaultColumns: null },
  content: {
    height: 400,
    placeholder: 'Heading and two or three paragraphs',
    innerBoxes: null,
    defaultColumns: null,
  },
  gallery: { height: 360, placeholder: 'Image placeholders, 4:3', innerBoxes: 'columns', defaultColumns: 4 },
  stats: { height: 160, placeholder: 'Large number and label ×4', innerBoxes: 'columns', defaultColumns: 4 },
  team: { height: 300, placeholder: 'Photo, name, role per person', innerBoxes: 'columns', defaultColumns: 4 },
};

/** Preselection per page type for the "New wireframe" form and `sketch_wireframe` (D-130). */
export const PAGE_TYPE_SECTIONS: Record<PageType, readonly SectionType[]> = {
  landing: ['navbar', 'hero', 'features', 'pricing', 'faq', 'footer'],
  pricing: ['navbar', 'hero', 'pricing', 'faq', 'footer'],
  about: ['navbar', 'hero', 'content', 'team', 'footer'],
  contact: ['navbar', 'hero', 'content', 'footer'],
  'blog-post': ['navbar', 'content', 'footer'],
  dashboard: ['navbar', 'content', 'footer'],
  onboarding: ['navbar', 'content', 'footer'],
  settings: ['navbar', 'content', 'footer'],
};

/** Structural label, never content (D-135): `HERO`, `FEATURES`. */
export function sectionLabel(type: SectionType): string {
  return type.toUpperCase();
}

/** What the box prints top-left: `FEATURES · 3 COL` when the section is a grid section. */
export function boxLabel(section: WireframeSection): string {
  const columns = resolvedColumns(section);
  return columns === null ? section.label : `${section.label} · ${columns} COL`;
}

/** null on a grid section means "the Turn 5 default"; on any other section it stays null. */
export function resolvedColumns(section: Pick<WireframeSection, 'type' | 'columns'>): number | null {
  const box = SECTION_BOX[section.type];
  if (box.defaultColumns === null) return null;
  return section.columns ?? box.defaultColumns;
}

/** Inner dashed boxes drawn inside the gray box so column count is visible without reading the label. */
export function innerBoxCount(section: Pick<WireframeSection, 'type' | 'columns'>): number {
  if (SECTION_BOX[section.type].innerBoxes !== 'columns') return 0;
  return resolvedColumns(section) ?? 0;
}

export function createSection(type: SectionType, columns?: number | null): WireframeSection {
  return {
    id: generateId('sec'),
    type,
    label: sectionLabel(type),
    columns: SECTION_BOX[type].defaultColumns === null ? null : (columns ?? null),
  };
}

export interface CreateWireframeInput {
  pageType: PageType;
  title: string;
  /** Omitted → the page type's preselection (D-130). */
  sections?: readonly SectionType[];
  createdBy: 'human' | 'agent';
}

export function createWireframe(input: CreateWireframeInput): Wireframe {
  const types = input.sections ?? PAGE_TYPE_SECTIONS[input.pageType];
  return {
    id: generateId('wf'),
    pageType: input.pageType,
    title: input.title,
    sections: types.map((t) => createSection(t)),
    status: 'wireframe',
    createdBy: input.createdBy,
    createdAt: Date.now(),
  };
}

// ---- pure section operations (D-124: ids only, never indices) ---------------

/** Moves `sectionId` to `newIndex`, clamped. null when the id isn't in the list. */
export function reorderSection(
  sections: readonly WireframeSection[],
  sectionId: string,
  newIndex: number,
): WireframeSection[] | null {
  const from = sections.findIndex((s) => s.id === sectionId);
  if (from === -1) return null;
  const next = [...sections];
  const [moved] = next.splice(from, 1);
  if (!moved) return null;
  next.splice(Math.max(0, Math.min(newIndex, next.length)), 0, moved);
  return next;
}

/** The ▲/▼ controls and the ↑/↓ keys (D-129, D-190) express themselves as a relative reorder. */
export function moveSection(
  sections: readonly WireframeSection[],
  sectionId: string,
  delta: number,
): WireframeSection[] | null {
  const from = sections.findIndex((s) => s.id === sectionId);
  if (from === -1) return null;
  const to = from + delta;
  if (to < 0 || to >= sections.length) return null;
  return reorderSection(sections, sectionId, to);
}

export function removeSection(sections: readonly WireframeSection[], sectionId: string): WireframeSection[] | null {
  if (!sections.some((s) => s.id === sectionId)) return null;
  return sections.filter((s) => s.id !== sectionId);
}

/** `afterSectionId: null` prepends. null when `afterSectionId` isn't in the list. */
export function addSection(
  sections: readonly WireframeSection[],
  afterSectionId: string | null,
  section: WireframeSection,
): WireframeSection[] | null {
  if (afterSectionId === null) return [section, ...sections];
  const at = sections.findIndex((s) => s.id === afterSectionId);
  if (at === -1) return null;
  const next = [...sections];
  next.splice(at + 1, 0, section);
  return next;
}
