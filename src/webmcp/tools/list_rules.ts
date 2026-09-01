// list_rules — phases 1, 2, 3, 4 (read-only). D-025, D-028.
// Shares add_rule's window: the ids it returns are what remove_rule addresses, and rules
// cannot exist before phase 1.
import type { ToolDefinition } from '@/types/webmcp';
import type { RuleViolation } from '@/types/rules';
import { useRuleStore } from '@/stores/ruleStore';
import { evaluateAll } from '@/engine/ruleEngine';
import { ok } from '@/webmcp/results';
import { guard } from '@/webmcp/validate';

interface ListRulesData {
  rules: { id: string; description: string; enabled: boolean }[];
  violations: RuleViolation[];
}

const tool: ToolDefinition<Record<string, unknown>, ListRulesData> = {
  name: 'list_rules',
  title: 'List Rules',
  description: 'List active design rules in plain language with their ids and any current violations.',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  phases: [1, 2, 3, 4],
  readOnly: true,
  untrusted: false,
  execute: () =>
    guard(() => {
      const rules = useRuleStore
        .getState()
        .list()
        .map((r) => ({ id: r.id, description: r.description, enabled: r.enabled }));
      const violations = evaluateAll();
      return ok(
        rules.length
          ? `${rules.length} rule${rules.length === 1 ? '' : 's'}, ${violations.length} current violation${violations.length === 1 ? '' : 's'}.`
          : 'No design rules yet.',
        { rules, violations },
        null,
      );
    }),
};
export default tool;
