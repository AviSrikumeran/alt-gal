// generate_component — phases 2, 3, 4 (mutating). D-025, D-028, D-035, D-075, D-116.
// Unlocked at phase 2 because a component with no tokens behind it is a gray box: the
// five-token gate is what makes "styled entirely from the human's tokens" true.
import type { ToolDefinition } from '@/types/webmcp';
import type { ComponentSpec, ComponentType } from '@/types/components';
import { COMPONENT_SIZES, COMPONENT_TYPES, COMPONENT_VARIANTS } from '@/types/components';
import { generateId } from '@/utils/idGenerator';
import { contentFromInput } from '@/components/library/content';
import { getTokenMapping } from '@/engine/componentRenderer';
import { evaluateSpec } from '@/engine/ruleEngine';
import { useComponentStore } from '@/stores/componentStore';
import { useRuleStore } from '@/stores/ruleStore';
import { ok } from '@/webmcp/results';
import { fail } from '@/webmcp/outcomes';
import { guard, optionalEnum, optionalString, optionalStringArray, requireEnum } from '@/webmcp/validate';

interface GenerateComponentData {
  id: string;
  type: ComponentType;
  variant: string;
  size: string;
  /** D-209: keys are `part.cssProperty`, values are token paths. */
  tokensUsed: Record<string, string>;
}

const tokensUsed = (spec: ComponentSpec): Record<string, string> =>
  Object.fromEntries(getTokenMapping(spec).map((m) => [`${m.part}.${m.cssProperty}`, m.token]));

const tool: ToolDefinition<Record<string, unknown>, GenerateComponentData> = {
  name: 'generate_component',
  title: 'Generate Component',
  description:
    "Create a component on the canvas — button, card, input, hero, navbar, pricing card and more — styled entirely from the human's tokens. Supply real content (label, headline, body) rather than relying on defaults. Rejected with alternatives if a rule forbids the request.",
  inputSchema: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: [...COMPONENT_TYPES],
        description: 'Which component to create.',
      },
      variant: {
        type: 'string',
        enum: [...COMPONENT_VARIANTS],
        description: "Accent role and fill: primary, secondary, ghost, danger, outline. Defaults to 'primary'.",
      },
      size: {
        type: 'string',
        enum: [...COMPONENT_SIZES],
        description: "sm, md or lg. Defaults to 'md'.",
      },
      label: {
        type: 'string',
        description:
          "The primary text: a button's label, a card or modal title, a hero headline, a navbar brand, a pricing tier.",
      },
      description: {
        type: 'string',
        description: 'The secondary text: a card body, a hero subtitle, an input placeholder, a price.',
      },
      items: {
        type: 'array',
        items: { type: 'string' },
        description:
          'List content: select options, navbar links, pricing features, feature titles, accordion questions, or the call-to-action labels of a hero or card.',
      },
    },
    required: ['type'],
    additionalProperties: false,
  },
  phases: [2, 3, 4],
  readOnly: false,
  untrusted: false,
  execute: (input) =>
    guard(() => {
      const type = requireEnum(input, 'type', COMPONENT_TYPES);
      const spec: ComponentSpec = {
        id: generateId('comp'),
        type,
        variant: optionalEnum(input, 'variant', COMPONENT_VARIANTS, 'primary'),
        size: optionalEnum(input, 'size', COMPONENT_SIZES, 'md'),
        content: contentFromInput(type, {
          label: optionalString(input, 'label'),
          description: optionalString(input, 'description'),
          items: optionalStringArray(input, 'items'),
        }),
        pageId: null,
        sectionId: null,
        createdBy: 'agent',
        createdAt: Date.now(),
      };

      // D-116: a violating generation is rejected, not created and flagged.
      const violation = evaluateSpec(spec, useRuleStore.getState().listEnabled())[0];
      if (violation)
        return fail('RULE_VIOLATION', violation.message, {
          hint: `The rule is "${violation.ruleDescription}".`,
          alternatives: violation.alternatives,
        });

      useComponentStore.getState().add(spec);
      return ok(
        `Created a ${spec.variant} ${spec.size} ${type} (${spec.id}) from the current tokens.`,
        { id: spec.id, type, variant: spec.variant, size: spec.size, tokensUsed: tokensUsed(spec) },
        { kind: 'remove_component', id: spec.id },
      );
    }),
};
export default tool;
