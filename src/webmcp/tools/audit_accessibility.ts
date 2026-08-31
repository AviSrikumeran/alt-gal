// audit_accessibility — phases 3, 4 (read-only). D-025, D-028.
import type { ToolDefinition } from '@/types/webmcp';
const tool: ToolDefinition = {
  name: 'audit_accessibility',
  title: 'Accessibility Audit',
  description:
    'Check color contrast, type sizes, and touch targets across tokens and components against WCAG 2.1 AA. Returns each finding with a plain-language fix you can relay to the human.',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false }, // STREAM 3: fill
  phases: [3, 4],
  readOnly: true,
  untrusted: false,
  execute: () => ({ kind: 'error', code: 'INTERNAL', message: 'audit_accessibility is not implemented yet.' }), // STREAM 3
};
export default tool;
