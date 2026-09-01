// remove_rule — phases 1, 2, 3, 4 (mutating). D-025, D-026, D-028.
// Paired with add_rule so a constraint the human changes their mind about is reversible
// by the agent that added it; absent in phase 0 for the same reason add_rule is.
import type { ToolDefinition } from '@/types/webmcp';
import { useRuleStore } from '@/stores/ruleStore';
import { ok } from '@/webmcp/results';
import { notFound } from '@/webmcp/outcomes';
import { guard, requireString } from '@/webmcp/validate';

interface RemoveRuleData {
  rule: { id: string; description: string };
}

const tool: ToolDefinition<Record<string, unknown>, RemoveRuleData> = {
  name: 'remove_rule',
  title: 'Remove Rule',
  description: 'Delete a design rule by id. Use list_rules to find ids. Existing components are not changed.',
  inputSchema: {
    type: 'object',
    properties: { ruleId: { type: 'string', description: "The rule's id, e.g. 'rule_a1b2c3d4'." } },
    required: ['ruleId'],
    additionalProperties: false,
  },
  phases: [1, 2, 3, 4],
  readOnly: false,
  untrusted: false,
  execute: (input) =>
    guard(() => {
      const id = requireString(input, 'ruleId');
      const rules = useRuleStore.getState();
      const index = rules.list().findIndex((r) => r.id === id);
      if (index < 0)
        return notFound(
          'rule',
          id,
          rules.list().map((r) => r.id),
          'list_rules',
        );

      const removed = rules.remove(id)!;
      return ok(
        `Removed the rule: ${removed.description}.`,
        { rule: { id: removed.id, description: removed.description } },
        { kind: 'restore_rule', rule: removed, index },
      );
    }),
};
export default tool;
