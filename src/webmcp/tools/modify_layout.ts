// modify_layout — phases 3, 4 (mutating). D-025, D-028, D-124.
// The agent's half of the shared wireframe controls: the human moves boxes with the hover
// strip, the agent moves them by id. Sections are addressed by id only, never by index.
import type { ToolDefinition } from '@/types/webmcp';
import type { SectionType, WireframeSection } from '@/types/layouts';
import { SECTION_TYPES } from '@/types/layouts';
import { generateId } from '@/utils/idGenerator';
import { useLayoutStore } from '@/stores/layoutStore';
import { ok } from '@/webmcp/results';
import { fail, notFound } from '@/webmcp/outcomes';
import { guard, optionalNumber, optionalString, requireEnum, requireString } from '@/webmcp/validate';

const ACTIONS = ['reorder', 'remove-section', 'add-section'] as const;

interface ModifyLayoutData {
  wireframeId: string;
  sections: { id: string; type: SectionType; columns: number | null }[];
}

const tool: ToolDefinition<Record<string, unknown>, ModifyLayoutData> = {
  name: 'modify_layout',
  title: 'Modify Layout',
  description:
    'Reorder, add, or remove sections in a wireframe by id. Returns the resulting section order so you can confirm it.',
  inputSchema: {
    type: 'object',
    properties: {
      wireframeId: { type: 'string', description: "The wireframe's id, e.g. 'wf_a1b2c3d4'." },
      action: {
        type: 'string',
        enum: [...ACTIONS],
        description:
          'reorder moves a section to a new position; remove-section deletes one; add-section inserts a new one.',
      },
      sectionId: { type: 'string', description: 'The section to move or remove, e.g. `sec_a1b2c3d4`.' },
      newIndex: {
        type: 'number',
        description: 'For reorder: the zero-based position the section should end up at.',
      },
      afterSectionId: {
        type: 'string',
        description: 'For add-section: insert after this section. Omit to insert at the top.',
      },
      sectionType: {
        type: 'string',
        enum: [...SECTION_TYPES],
        description: 'For add-section: which section to insert.',
      },
      columns: {
        type: 'number',
        description: 'For add-section on a grid section (features, pricing, testimonials, gallery, stats, team).',
      },
    },
    required: ['wireframeId', 'action'],
    additionalProperties: false,
  },
  phases: [3, 4],
  readOnly: false,
  untrusted: false,
  execute: (input) =>
    guard(() => {
      const wireframeId = requireString(input, 'wireframeId');
      const action = requireEnum(input, 'action', ACTIONS);
      const layouts = useLayoutStore.getState();
      const wireframe = layouts.getWireframe(wireframeId);
      if (!wireframe)
        return notFound(
          'wireframe',
          wireframeId,
          layouts.wireframes.map((w) => w.id),
          'get_current_state',
        );

      const before = wireframe.sections.map((s) => ({ ...s }));
      const sections = wireframe.sections.map((s) => ({ ...s }));
      const ids = sections.map((s) => s.id);
      let note: string;

      if (action === 'reorder') {
        const sectionId = requireString(input, 'sectionId');
        const from = ids.indexOf(sectionId);
        if (from < 0) return notFound('section', sectionId, ids, 'get_current_state');
        const newIndex = optionalNumber(input, 'newIndex', { min: 0, max: sections.length - 1, integer: true });
        if (newIndex === undefined)
          return fail('INVALID_INPUT', '"newIndex" is required for reorder.', {
            hint: `Positions run 0 to ${sections.length - 1}, top to bottom.`,
          });
        const [moved] = sections.splice(from, 1);
        sections.splice(newIndex, 0, moved!);
        note = `Moved ${moved!.type} to position ${newIndex}`;
      } else if (action === 'remove-section') {
        const sectionId = requireString(input, 'sectionId');
        const at = ids.indexOf(sectionId);
        if (at < 0) return notFound('section', sectionId, ids, 'get_current_state');
        const [removed] = sections.splice(at, 1);
        note = `Removed the ${removed!.type} section`;
      } else {
        const type = requireEnum(input, 'sectionType', SECTION_TYPES);
        const columns = optionalNumber(input, 'columns', { min: 1, max: 6, integer: true });
        const section: WireframeSection = { id: generateId('sec'), type, label: type, columns: columns ?? null };
        const afterSectionId = optionalString(input, 'afterSectionId');
        if (afterSectionId) {
          const at = ids.indexOf(afterSectionId);
          if (at < 0) return notFound('section', afterSectionId, ids, 'get_current_state');
          sections.splice(at + 1, 0, section);
        } else {
          sections.unshift(section);
        }
        note = `Added a ${type} section`;
      }

      layouts.setSections(wireframeId, sections);
      return ok(
        `${note}. "${wireframe.title}" is now ${sections.map((s) => s.type).join(' → ')}.` +
          (wireframe.status === 'rendered' ? ' Re-render the page to apply the new structure.' : ''),
        {
          wireframeId,
          sections: sections.map((s) => ({ id: s.id, type: s.type, columns: s.columns })),
        },
        { kind: 'restore_sections', wireframeId, sections: before },
      );
    }),
};
export default tool;
