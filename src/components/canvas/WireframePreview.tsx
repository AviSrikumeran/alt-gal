// WireframePreview.tsx — the gray-box stack (D-128) with human section controls (D-129, D-190).
'use client';
import { Fragment } from 'react';
import type { KeyboardEvent } from 'react';
import type { Wireframe, WireframeSection } from '@/types/layouts';
import { useLayoutStore } from '@/stores/layoutStore';
import { SECTION_BOX, boxLabel, innerBoxCount, moveSection, removeSection } from '@/engine/wireframeEngine';
import { AddSectionButton, SectionControls } from './SectionControls';
import { commitHuman } from '@/engine/commit';
import './canvas.css';

export interface WireframePreviewProps {
  wireframe: Wireframe;
  /** Set while the render transition plays the boxes out (D-137). */
  exiting?: boolean;
}

export function WireframePreview({ wireframe, exiting = false }: WireframePreviewProps) {
  const sections = wireframe.sections;

  // D-190: boxes are focusable; ↑/↓ move, Delete removes. Keys from the control
  // buttons bubble here, so only act when the box itself has focus.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>, section: WireframeSection) => {
    if (e.target !== e.currentTarget) return;
    const next =
      e.key === 'ArrowUp'
        ? moveSection(sections, section.id, -1)
        : e.key === 'ArrowDown'
          ? moveSection(sections, section.id, 1)
          : e.key === 'Delete' || e.key === 'Backspace'
            ? removeSection(sections, section.id)
            : undefined;
    if (next === undefined) return;
    e.preventDefault();
    if (!next) return;
    commitHuman('ui.modify_layout', () => {
      const applied = useLayoutStore.getState().setSections(wireframe.id, next);
      return applied ? { kind: 'restore_sections', wireframeId: wireframe.id, sections: [...sections] } : null;
    });
  };

  return (
    <div className="alt-wf" data-rendering={exiting ? 'out' : undefined} aria-label={`Wireframe ${wireframe.title}`}>
      <AddSectionButton wireframeId={wireframe.id} sections={sections} afterSectionId={null} />
      {sections.map((section, index) => {
        const box = SECTION_BOX[section.type];
        const inner = innerBoxCount(section);
        return (
          <Fragment key={section.id}>
            <div
              className="alt-wf__box"
              data-section={section.type}
              tabIndex={0}
              role="group"
              aria-label={boxLabel(section)}
              style={{ height: box.height, ['--i' as string]: index }}
              onKeyDown={(e) => onKeyDown(e, section)}
            >
              <span className="alt-wf__label">{boxLabel(section)}</span>
              <span className="alt-wf__placeholder">{box.placeholder}</span>
              {inner > 0 && (
                <div className="alt-wf__inner" style={{ ['--cols' as string]: inner }} aria-hidden>
                  {Array.from({ length: inner }, (_, i) => (
                    <span key={i} className="alt-wf__innerbox" />
                  ))}
                </div>
              )}
              <SectionControls wireframeId={wireframe.id} sections={sections} section={section} index={index} />
            </div>
            <AddSectionButton wireframeId={wireframe.id} sections={sections} afterSectionId={section.id} />
          </Fragment>
        );
      })}
    </div>
  );
}
