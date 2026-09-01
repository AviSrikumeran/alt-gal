// add_rule — phases 1, 2, 3, 4 (mutating). D-025, D-028, D-113, D-116.
// Absent in phase 0: a constraint on a system with no tokens has nothing to constrain,
// and the first thing the agent should do there is help set a color.
import type { ToolDefinition } from '@/types/webmcp';
import type { DesignRule, RuleViolation } from '@/types/rules';
import { RULE_OPERATORS, RULE_PROPERTIES, RULE_TYPES } from '@/types/rules';
import { COMPONENT_TYPES } from '@/types/components';
import type { ComponentType } from '@/types/components';
import { generateId } from '@/utils/idGenerator';
import { useRuleStore } from '@/stores/ruleStore';
import { evaluateAll } from '@/engine/ruleEngine';
import { ok } from '@/webmcp/results';
import { guard, optionalEnum, requireEnum, requireString } from '@/webmcp/validate';

interface AddRuleData {
  rule: { id: string; description: string };
  violations: RuleViolation[];
}

const TARGETS = ['all', ...COMPONENT_TYPES] as const;

const tool: ToolDefinition<Record<string, unknown>, AddRuleData> = {
  name: 'add_rule',
  title: 'Add Rule',
  description:
    'Add a design constraint the human wants enforced, e.g. no danger-variant buttons or minimum radius 8px. Rules reject future generations and edits that violate them. Add rules only when the human asks for a constraint.',
  inputSchema: {
    type: 'object',
    properties: {
      description: {
        type: 'string',
        description: "The rule in the human's own words, e.g. 'No danger buttons anywhere in the product'.",
      },
      property: {
        type: 'string',
        enum: [...RULE_PROPERTIES],
        description:
          "What the rule reads. Spec fields: variant, size, type. Token-driven: background-color, color, border-radius, font-size, min-height (touch target, px), contrast (ratio of a component's text on its own background).",
      },
      operator: {
        type: 'string',
        enum: [...RULE_OPERATORS],
        description:
          "How the value is compared: equals, not-equals, min (numeric floor), max (numeric ceiling), not-contains (substring), hue-not-in (a degree range like '345-15', wrapping allowed).",
      },
      value: {
        type: 'string',
        description:
          "The compared value, e.g. 'danger' for variant, '8' for border-radius min, '4.5' for contrast min, '345-15' for hue-not-in, '44' for min-height.",
      },
      target: {
        type: 'string',
        enum: [...TARGETS],
        description: "Which component type the rule applies to. Defaults to 'all'.",
      },
      type: {
        type: 'string',
        enum: [...RULE_TYPES],
        description: "How to file the rule in the human's rule list. Defaults to 'custom'.",
      },
    },
    required: ['description', 'property', 'operator', 'value'],
    additionalProperties: false,
  },
  phases: [1, 2, 3, 4],
  readOnly: false,
  untrusted: false,
  execute: (input) =>
    guard(() => {
      const rule: DesignRule = {
        id: generateId('rule'),
        type: optionalEnum(input, 'type', RULE_TYPES, 'custom'),
        description: requireString(input, 'description'),
        condition: {
          target: optionalEnum(input, 'target', TARGETS, 'all') as ComponentType | 'all',
          property: requireEnum(input, 'property', RULE_PROPERTIES),
          operator: requireEnum(input, 'operator', RULE_OPERATORS),
          value: requireString(input, 'value'),
        },
        enabled: true,
        createdBy: 'agent',
        createdAt: Date.now(),
      };
      useRuleStore.getState().add(rule);

      // D-116: existing components that break the new rule are flagged, never removed.
      const violations = evaluateAll().filter((v) => v.ruleId === rule.id);
      return ok(
        `Rule added: ${rule.description}.` +
          (violations.length
            ? ` ${violations.length} existing component${violations.length === 1 ? '' : 's'} already break it; they are flagged, not changed.`
            : ' Nothing on the canvas breaks it.'),
        { rule: { id: rule.id, description: rule.description }, violations },
        { kind: 'remove_rule', id: rule.id },
      );
    }),
};
export default tool;
