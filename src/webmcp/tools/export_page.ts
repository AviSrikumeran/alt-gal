// export_page — phase 4 (read-only, untrusted content). D-025, D-028, D-172, D-175.
// Only reachable once a page is rendered, which is also what unlocks phase 4 — so the
// tool exists exactly when it has something to emit. Untrusted: it carries page copy.
import type { ToolDefinition } from '@/types/webmcp';
import type { ExportSummary } from '@/webmcp/outcomes';
import { exportPage } from '@/webmcp/pending';
import { useLayoutStore } from '@/stores/layoutStore';
import { exportDelivery, fail, notFound } from '@/webmcp/outcomes';
import { guard, optionalString } from '@/webmcp/validate';

const tool: ToolDefinition<Record<string, unknown>, ExportSummary> = {
  name: 'export_page',
  title: 'Export Page',
  description:
    'Export a rendered page as Page.tsx composing the exported components. Files open in the export panel; you receive a summary.',
  inputSchema: {
    type: 'object',
    properties: {
      pageId: {
        type: 'string',
        description: "The rendered page's id, e.g. 'page_a1b2c3d4'. Omit to export the most recent page.",
      },
    },
    additionalProperties: false,
  },
  phases: [4],
  readOnly: true,
  untrusted: true,
  execute: (input) =>
    guard(() => {
      const layouts = useLayoutStore.getState();
      const pages = layouts.renderedPages;
      const requested = optionalString(input, 'pageId');
      const page = requested ? layouts.getPage(requested) : pages[pages.length - 1];
      if (!page)
        return requested
          ? notFound(
              'rendered page',
              requested,
              pages.map((p) => p.id),
              'get_current_state',
            )
          : fail('INVALID_INPUT', 'No page has been rendered yet.', {
              hint: 'Sketch a wireframe, get the human to approve it, then call render_page.',
            });

      return exportDelivery(exportPage(page.id), `the page "${page.title}"`);
    }),
};
export default tool;
