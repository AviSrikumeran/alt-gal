/**
 * layoutEngine — section → components, the render pipeline, and the page's own CSS.
 *
 * `render_page` (agent) and the canvas Render button (human) both land here, so
 * the mapping is one place and is not agent-configurable (D-134). Page components
 * are real ComponentSpecs (D-053): they count toward the phase, they are
 * addressable by `modify_component`, and they cascade with the tokens.
 */
import type { ComponentSize, ComponentSpec, ComponentVariant } from '@/types/components';
import type { RenderedPage, RenderedSection, SectionComponentMap, SectionType, Wireframe } from '@/types/layouts';
import { generateId } from '@/utils/idGenerator';
import { useComponentStore } from '@/stores/componentStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { SECTION_BOX, resolvedColumns } from './wireframeEngine';
import { contentForSection } from './sectionContent';

/** Turn 5 §4.2, final. `defaultColumns` is the one in the §4.1 box table. */
export const SECTION_COMPONENT_MAP: SectionComponentMap = {
  navbar: { component: 'navbar', perColumn: false, defaultColumns: SECTION_BOX.navbar.defaultColumns },
  hero: { component: 'hero', perColumn: false, defaultColumns: SECTION_BOX.hero.defaultColumns },
  // one component; columns → content.columns
  features: { component: 'feature-grid', perColumn: false, defaultColumns: SECTION_BOX.features.defaultColumns },
  // middle card featured: true
  pricing: { component: 'pricing-card', perColumn: true, defaultColumns: SECTION_BOX.pricing.defaultColumns },
  // title = "Name · Role", body = quote, ctaLabel null
  testimonials: { component: 'card', perColumn: true, defaultColumns: SECTION_BOX.testimonials.defaultColumns },
  // size 'sm', secondaryCta null
  cta: { component: 'hero', perColumn: false, defaultColumns: SECTION_BOX.cta.defaultColumns },
  faq: { component: 'accordion', perColumn: false, defaultColumns: SECTION_BOX.faq.defaultColumns },
  footer: { component: 'footer', perColumn: false, defaultColumns: SECTION_BOX.footer.defaultColumns },
  // size 'lg', single wide card, ctaLabel null
  content: { component: 'card', perColumn: false, defaultColumns: SECTION_BOX.content.defaultColumns },
  gallery: { component: 'block', perColumn: true, defaultColumns: SECTION_BOX.gallery.defaultColumns },
  stats: { component: 'block', perColumn: true, defaultColumns: SECTION_BOX.stats.defaultColumns },
  team: { component: 'block', perColumn: true, defaultColumns: SECTION_BOX.team.defaultColumns },
};

/** How each section instantiates its component. Variant/size are the only knobs; the human or agent edits after. */
export const SECTION_RENDER: Record<SectionType, { variant: ComponentVariant; size: ComponentSize }> = {
  navbar: { variant: 'primary', size: 'md' },
  hero: { variant: 'primary', size: 'lg' },
  features: { variant: 'primary', size: 'md' },
  pricing: { variant: 'primary', size: 'md' },
  testimonials: { variant: 'primary', size: 'md' },
  cta: { variant: 'primary', size: 'sm' },
  faq: { variant: 'primary', size: 'md' },
  footer: { variant: 'primary', size: 'md' },
  content: { variant: 'primary', size: 'lg' },
  gallery: { variant: 'primary', size: 'md' },
  stats: { variant: 'primary', size: 'md' },
  team: { variant: 'primary', size: 'md' },
};

/** These components own their width and padding, so they skip the 1120px container (D-136). */
export const FULL_BLEED_SECTIONS: ReadonlySet<SectionType> = new Set<SectionType>([
  'navbar',
  'hero',
  'features',
  'cta',
  'footer',
]);

export function isBlockSection(type: SectionType): type is 'gallery' | 'stats' | 'team' {
  return SECTION_COMPONENT_MAP[type].component === 'block';
}

/** Sections alternate background/surface by index; navbar and footer keep their own (D-136). */
export function sectionBackground(type: SectionType, index: number): 'background' | 'surface' | null {
  if (type === 'navbar' || type === 'footer') return null;
  return index % 2 === 0 ? 'background' : 'surface';
}

// ---- render ----------------------------------------------------------------

export interface RenderPlan {
  page: RenderedPage;
  components: ComponentSpec[];
}

/** Pure: builds the page and its components without touching any store. */
export function renderWireframe(wireframe: Wireframe, createdBy: 'human' | 'agent' = 'agent'): RenderPlan {
  const pageId = generateId('page');
  const createdAt = Date.now();
  const components: ComponentSpec[] = [];

  const sections: RenderedSection[] = wireframe.sections.map((s) => {
    const map = SECTION_COMPONENT_MAP[s.type];
    const columns = resolvedColumns(s);
    const componentIds: string[] = [];

    if (map.component !== 'block') {
      const count = map.perColumn ? (columns ?? 1) : 1;
      const { variant, size } = SECTION_RENDER[s.type];
      for (let i = 0; i < count; i += 1) {
        const spec: ComponentSpec = {
          id: generateId('comp'),
          type: map.component,
          variant,
          size,
          content: contentForSection(s.type, map.component, i, columns),
          pageId,
          sectionId: s.id,
          createdBy,
          createdAt,
        };
        components.push(spec);
        componentIds.push(spec.id);
      }
    }
    return { sectionId: s.id, type: s.type, columns, componentIds };
  });

  return {
    page: {
      id: pageId,
      wireframeId: wireframe.id,
      pageType: wireframe.pageType,
      title: wireframe.title,
      sections,
      createdAt,
    },
    components,
  };
}

export interface UnrenderResult {
  pageId: string;
  wireframeId: string;
  componentIds: string[];
}

export interface RenderResult {
  page: RenderedPage;
  componentIds: string[];
  /** D-140: rendering a wireframe that already has a page is a re-render; this is the implicit unrender. */
  replaced: UnrenderResult | null;
}

export function pageForWireframe(wireframeId: string): RenderedPage | undefined {
  return useLayoutStore.getState().renderedPages.find((p) => p.wireframeId === wireframeId);
}

/** Live ids, not the render-time snapshot: components deleted since (D-138) are already gone. */
export function livePageComponentIds(pageId: string): string[] {
  return useComponentStore
    .getState()
    .list()
    .filter((c) => c.pageId === pageId)
    .map((c) => c.id);
}

/**
 * Removes a page, its components, and the wireframe's rendered status.
 * The undo executor's `unrender_page` and the human's Delete page both use this (D-141, D-182).
 */
export function unrenderPage(pageId: string): UnrenderResult | null {
  const layout = useLayoutStore.getState();
  const page = layout.getPage(pageId);
  if (!page) return null;
  const componentIds = livePageComponentIds(pageId);
  layout.removeRenderedPage(pageId);
  useComponentStore.getState().removeMany(componentIds);
  layout.setWireframeStatus(page.wireframeId, 'wireframe');
  return { pageId, wireframeId: page.wireframeId, componentIds };
}

/** null when the wireframe id is unknown. Re-renders in place when the wireframe already has a page (D-140). */
export function renderPage(wireframeId: string, createdBy: 'human' | 'agent' = 'agent'): RenderResult | null {
  const layout = useLayoutStore.getState();
  const wireframe = layout.getWireframe(wireframeId);
  if (!wireframe) return null;

  const existing = pageForWireframe(wireframeId);
  const replaced = existing ? unrenderPage(existing.id) : null;

  const { page, components } = renderWireframe(wireframe, createdBy);
  const store = useComponentStore.getState();
  for (const spec of components) store.add(spec);
  layout.addRenderedPage(page);
  layout.setWireframeStatus(wireframeId, 'rendered');

  return { page, componentIds: components.map((c) => c.id), replaced };
}

// ---- reading a rendered page ------------------------------------------------

/**
 * The components a section currently holds, in render order.
 * Derived from componentStore rather than the section snapshot so that deleting
 * a page component empties the section without a second write (D-138).
 */
export function orderSectionComponents(
  section: RenderedSection,
  components: readonly ComponentSpec[],
): ComponentSpec[] {
  const order = new Map(section.componentIds.map((id, i) => [id, i]));
  return components
    .filter((c) => c.sectionId === section.sectionId && c.pageId !== null)
    .sort((a, b) => (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.id) ?? Number.MAX_SAFE_INTEGER));
}

/**
 * Section wrapper and container rules (D-136). Exported as text because the page
 * exporter emits these same rules alongside the generated Page.tsx (D-172).
 */
export const PAGE_SECTION_CSS = `[data-alt-page] {
  background: var(--color-background);
  display: flex;
  flex-direction: column;
}
[data-alt-page] [data-section] {
  width: 100%;
}
[data-alt-page] [data-section][data-bg='background'] {
  background: var(--color-background);
}
[data-alt-page] [data-section][data-bg='surface'] {
  background: var(--color-surface);
}
[data-alt-page] [data-section-container] {
  max-width: 1120px;
  margin: 0 auto;
  padding-inline: var(--spacing-8);
  padding-block: var(--spacing-16);
}
[data-alt-page] [data-section-grid] {
  display: grid;
  grid-template-columns: repeat(var(--section-columns, 3), minmax(0, 1fr));
  gap: var(--spacing-6);
  align-items: stretch;
}
@container canvas (max-width: 900px) {
  [data-alt-page] [data-section-grid] {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@container canvas (max-width: 640px) {
  [data-alt-page] [data-section-grid] {
    grid-template-columns: minmax(0, 1fr);
  }
}
`;
