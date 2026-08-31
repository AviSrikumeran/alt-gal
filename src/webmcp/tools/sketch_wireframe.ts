// sketch_wireframe — phases 3, 4 (mutating). D-025, D-028.
import type { ToolDefinition } from '@/types/webmcp';
const tool: ToolDefinition = {
  name: 'sketch_wireframe',
  title: 'Sketch Wireframe',
  description:
    'Propose a page as an ordered list of sections — navbar, hero, features, pricing, testimonials, cta, faq, footer, content, gallery, stats, team — shown as gray boxes for the human to approve. Do not render; call render_page after approval.',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false }, // STREAM 3: fill
  phases: [3, 4],
  readOnly: false,
  untrusted: false,
  execute: () => ({ kind: 'error', code: 'INTERNAL', message: 'sketch_wireframe is not implemented yet.' }), // STREAM 3
};
export default tool;
