// SectionControls.tsx — human up/down/delete/add in wireframe mode (D-129, D-190).
'use client';
import { useEffect, useRef, useState } from 'react';
import type { SectionType, WireframeSection } from '@/types/layouts';
import { SECTION_TYPES } from '@/types/layouts';
import { useLayoutStore } from '@/stores/layoutStore';
import { addSection, createSection, moveSection, removeSection, sectionLabel } from '@/engine/wireframeEngine';
import { commitHuman } from '@/engine/commit';
import './canvas.css';

/** Every section edit is one human log entry with a `restore_sections` inverse (D-129, D-183). */
function commitSections(wireframeId: string, before: readonly WireframeSection[], next: WireframeSection[]): void {
  commitHuman('ui.modify_layout', () => {
    const applied = useLayoutStore.getState().setSections(wireframeId, next);
    return applied ? { kind: 'restore_sections', wireframeId, sections: [...before] } : null;
  });
}

export interface SectionControlsProps {
  wireframeId: string;
  sections: readonly WireframeSection[];
  section: WireframeSection;
  index: number;
}

export function SectionControls({ wireframeId, sections, section, index }: SectionControlsProps) {
  const move = (delta: number) => {
    const next = moveSection(sections, section.id, delta);
    if (next) commitSections(wireframeId, sections, next);
  };
  const drop = () => {
    const next = removeSection(sections, section.id);
    if (next) commitSections(wireframeId, sections, next);
  };

  return (
    <div className="alt-wf__strip" data-part="controls">
      <button
        type="button"
        className="alt-wf__ctrl"
        title="Move up"
        aria-label="Move up"
        disabled={index === 0}
        onClick={() => move(-1)}
      >
        <span aria-hidden>▲</span>
      </button>
      <button
        type="button"
        className="alt-wf__ctrl"
        title="Move down"
        aria-label="Move down"
        disabled={index === sections.length - 1}
        onClick={() => move(1)}
      >
        <span aria-hidden>▼</span>
      </button>
      <button type="button" className="alt-wf__ctrl" title="Remove section" aria-label="Remove section" onClick={drop}>
        <span aria-hidden>✕</span>
      </button>
    </div>
  );
}

export interface AddSectionButtonProps {
  wireframeId: string;
  sections: readonly WireframeSection[];
  /** null inserts at the top of the wireframe. */
  afterSectionId: string | null;
}

/** The slim "+ Add section" rail between boxes; opens the twelve section types (D-129). */
export function AddSectionButton({ wireframeId, sections, afterSectionId }: AddSectionButtonProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  const pick = (type: SectionType) => {
    setOpen(false);
    const next = addSection(sections, afterSectionId, createSection(type));
    if (next) commitSections(wireframeId, sections, next);
  };

  return (
    <div className="alt-wf__add" ref={root}>
      <button
        type="button"
        className="alt-wf__addbtn"
        aria-label="Add section"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
      >
        + Add section
      </button>
      {open && (
        <div className="alt-wf__menu" role="menu">
          {SECTION_TYPES.map((type) => (
            <button type="button" key={type} role="menuitem" className="alt-wf__menuitem" onClick={() => pick(type)}>
              {sectionLabel(type)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
