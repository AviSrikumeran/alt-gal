// audit_accessibility — phases 3, 4 (read-only). D-025, D-028, D-165.
// Gated to phase 3 because an audit of two tokens and no components is noise; by phase 3
// there is a palette, a type scale and components to check. It never mutates anything.
import type { ToolDefinition } from '@/types/webmcp';
import type { AuditFinding } from '@/webmcp/pending';
import { AUDIT_SCOPES, auditAccessibility } from '@/webmcp/pending';
import { ok } from '@/webmcp/results';
import { guard, optionalEnum } from '@/webmcp/validate';

interface AuditAccessibilityData {
  findings: AuditFinding[];
  errors: number;
  warnings: number;
}

const tool: ToolDefinition<Record<string, unknown>, AuditAccessibilityData> = {
  name: 'audit_accessibility',
  title: 'Accessibility Audit',
  description:
    'Check color contrast, type sizes, and touch targets across tokens and components against WCAG 2.1 AA. Returns each finding with a plain-language fix you can relay to the human.',
  inputSchema: {
    type: 'object',
    properties: {
      scope: {
        type: 'string',
        enum: [...AUDIT_SCOPES],
        description:
          'all checks tokens and components (the default); components checks only what is on the canvas; current-page checks the rendered page.',
      },
    },
    additionalProperties: false,
  },
  phases: [3, 4],
  readOnly: true,
  untrusted: false,
  execute: (input) =>
    guard(() => {
      const scope = optionalEnum(input, 'scope', AUDIT_SCOPES, 'all');
      const findings = auditAccessibility(scope);
      const errors = findings.filter((f) => f.severity === 'error').length;
      const warnings = findings.length - errors;
      return ok(
        findings.length
          ? `${errors} error${errors === 1 ? '' : 's'} and ${warnings} warning${warnings === 1 ? '' : 's'} against WCAG 2.1 AA. Each finding carries the fix to relay.`
          : 'No accessibility problems found against WCAG 2.1 AA.',
        { findings, errors, warnings },
        null,
      );
    }),
};
export default tool;
