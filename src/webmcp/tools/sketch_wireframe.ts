// sketch_wireframe — phases 3, 4 (mutating). D-025, D-028, D-054, D-055.
// Unlocked at phase 3, once two components prove the tokens work: a page sketched before
// there is anything to fill it with is a picture, not a plan. Sketching never renders.
import type { ToolDefinition } from '@/types/webmcp';
import type { SectionType, Wireframe, WireframeSection } from '@/types/layouts';
import { PAGE_TYPES, SECTION_TYPES } from '@/types/layouts';
import { generateId } from '@/utils/idGenerator';
import { useLayoutStore } from '@/stores/layoutStore';
import { ok } from '@/webmcp/results';
import { guard, optionalEnum, requireString, requireStringArray } from '@/webmcp/validate';
import { ToolInputError } from '@/types/webmcp';

interface SketchWireframeData {
  wireframeId: string;
  sections: { id: string; type: SectionType; columns: number | null }[];
}

const tool: ToolDefinition<Record<string, unknown>, SketchWireframeData> = {
  name: 'sketch_wireframe',
  title: 'Sketch Wireframe',
  description:
    'Propose a page as an ordered list of sections — navbar, hero, features, pricing, testimonials, cta, faq, footer, content, gallery, stats, team — shown as gray boxes for the human to approve. Do not render; call render_page after approval.',
  inputSchema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: "The page's name, e.g. 'Northwind landing page'." },
      sections: {
        type: 'array',
        items: { type: 'string', enum: [...SECTION_TYPES] },
        description:
          "The sections top to bottom, e.g. ['navbar','hero','features','pricing','faq','footer']. Order is the page order.",
      },
      pageType: {
        type: 'string',
        enum: [...PAGE_TYPES],
        description: "What kind of page this is. Defaults to 'landing'.",
      },
    },
    required: ['title', 'sections'],
    additionalProperties: false,
  },
  phases: [3, 4],
  readOnly: false,
  untrusted: false,
  execute: (input) =>
    guard(() => {
      const title = requireString(input, 'title');
      const pageType = optionalEnum(input, 'pageType', PAGE_TYPES, 'landing');
      const raw = requireStringArray(input, 'sections');
      const sections: WireframeSection[] = raw.map((value, i) => {
        if (!SECTION_TYPES.includes(value as SectionType))
          throw new ToolInputError(`"sections[${i}]" must be one of: ${SECTION_TYPES.join(', ')} — got "${value}".`, [
            ...SECTION_TYPES,
          ]);
        // D-055: array order is display order; the box height comes from the type.
        return { id: generateId('sec'), type: value as SectionType, label: value, columns: null };
      });

      const wireframe: Wireframe = {
        id: generateId('wf'),
        pageType,
        title,
        sections,
        status: 'wireframe',
        createdBy: 'agent',
        createdAt: Date.now(),
      };
      useLayoutStore.getState().addWireframe(wireframe); // also makes it the active tab (D-054)

      return ok(
        `Sketched "${title}" as ${sections.length} section${sections.length === 1 ? '' : 's'}: ${sections.map((s) => s.type).join(' → ')}. Waiting for the human to approve it before rendering.`,
        {
          wireframeId: wireframe.id,
          sections: sections.map((s) => ({ id: s.id, type: s.type, columns: s.columns })),
        },
        { kind: 'remove_wireframe', id: wireframe.id },
      );
    }),
};
export default tool;
