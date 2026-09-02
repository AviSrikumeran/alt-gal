// PagePreview.tsx — a rendered page: real components in token-styled sections (D-136, §4.4).
'use client';
import type { CSSProperties } from 'react';
import type { ComponentSpec } from '@/types/components';
import type { RenderedPage, RenderedSection } from '@/types/layouts';
import { COMPONENT_REGISTRY } from '@/components/library';
import { useComponentStore } from '@/stores/componentStore';
import { useUIStore } from '@/stores/uiStore';
import type { Theme } from '@/stores/uiStore';
import {
  FULL_BLEED_SECTIONS,
  PAGE_SECTION_CSS,
  isBlockSection,
  orderSectionComponents,
  sectionBackground,
} from '@/engine/layoutEngine';
import { SectionBlock } from '@/engine/sectionBlocks';
import './canvas.css';

function PageComponent({
  spec,
  selected,
  onSelect,
}: {
  spec: ComponentSpec;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const C = COMPONENT_REGISTRY[spec.type];
  return (
    <div
      className="alt-page__component"
      data-selected={selected || undefined}
      data-id={spec.id}
      tabIndex={0}
      role="group"
      aria-label={`${spec.type} ${spec.id}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(spec.id);
      }}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && e.key === 'Enter') onSelect(spec.id);
      }}
    >
      <C spec={spec} selected={selected} />
    </div>
  );
}

export interface PageSectionProps {
  section: RenderedSection;
  index: number;
  components: readonly ComponentSpec[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** One `<section>` of a rendered page. Pure: everything it draws comes from props. */
export function PageSection({ section, index, components, selectedId, onSelect }: PageSectionProps) {
  const specs = orderSectionComponents(section, components);
  const background = sectionBackground(section.type, index);
  const style = {
    ['--i']: index,
    ...(section.columns === null ? {} : { ['--section-columns']: section.columns }),
  } as CSSProperties;
  const selectedHere = specs.find((s) => s.id === selectedId);

  const rendered = specs.map((spec) => (
    <PageComponent key={spec.id} spec={spec} selected={spec.id === selectedId} onSelect={onSelect} />
  ));

  let body;
  if (isBlockSection(section.type)) {
    body = (
      <div data-section-container>
        <SectionBlock section={section} />
      </div>
    );
  } else if (specs.length === 0) {
    // D-138: the page and the phase stay; the section says what to do about it.
    body = <div className="alt-page__emptied">Section emptied · Re-render page to restore</div>;
  } else if (FULL_BLEED_SECTIONS.has(section.type)) {
    body = rendered;
  } else if (specs.length > 1) {
    body = (
      <div data-section-container>
        <div data-section-grid>{rendered}</div>
      </div>
    );
  } else {
    body = <div data-section-container>{rendered}</div>;
  }

  return (
    <section
      className="alt-page__section"
      data-section={section.type}
      data-index={index}
      data-bg={background ?? undefined}
      style={style}
    >
      {selectedHere && (
        <span className="alt-page__chip" data-part="chip">
          <code>{selectedHere.type}</code>
          <code>{selectedHere.id}</code>
        </span>
      )}
      {body}
    </section>
  );
}

export interface PageViewProps {
  page: RenderedPage;
  components: readonly ComponentSpec[];
  theme: Theme;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /**
   * D-137's page-in half. Set only when this page has just been rendered — the animation is the
   * payoff of the render, and firing it on a plain page load (which is what a hardcoded
   * `data-rendering="in"` did) spends it on nothing.
   */
  entering?: boolean;
}

/** Pure page renderer. `PagePreview` wires it to the stores; the exporter mirrors it (D-172). */
export function PageView({ page, components, theme, selectedId, onSelect, entering = false }: PageViewProps) {
  return (
    <div
      data-alt-page
      className={theme === 'dark' ? 'alt-page dark' : 'alt-page'}
      data-rendering={entering ? 'in' : undefined}
      aria-label={page.title}
    >
      <style>{PAGE_SECTION_CSS}</style>
      {page.sections.map((section, index) => (
        <PageSection
          key={section.sectionId}
          section={section}
          index={index}
          components={components}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

export function PagePreview({ page, entering = false }: { page: RenderedPage; entering?: boolean }) {
  const components = useComponentStore((s) => s.components);
  const theme = useUIStore((s) => s.theme);
  const selectedId = useUIStore((s) => s.selectedComponentId);
  const select = useUIStore((s) => s.select);
  return (
    <PageView
      page={page}
      components={components}
      theme={theme}
      selectedId={selectedId}
      onSelect={select}
      entering={entering}
    />
  );
}
