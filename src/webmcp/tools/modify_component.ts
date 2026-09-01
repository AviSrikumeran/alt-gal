// modify_component — phases 2, 3, 4 (mutating). D-025, D-028, D-097, D-116.
// A shared capability: the human edits the same fields from the canvas spec panel, so the
// tool addresses components by id and re-checks rules exactly as generation does.
import type { ToolDefinition } from '@/types/webmcp';
import type { ComponentContent, ComponentSpec } from '@/types/components';
import { COMPONENT_SIZES, COMPONENT_VARIANTS } from '@/types/components';
import { contentFromInput } from '@/components/library/content';
import { getTokenMapping } from '@/engine/componentRenderer';
import { evaluateSpec } from '@/engine/ruleEngine';
import { useComponentStore } from '@/stores/componentStore';
import { useRuleStore } from '@/stores/ruleStore';
import { ok } from '@/webmcp/results';
import { fail, notFound } from '@/webmcp/outcomes';
import { guard, optionalEnum, optionalString, optionalStringArray, requireString } from '@/webmcp/validate';

interface ModifyComponentData {
  id: string;
  changed: string[];
  tokensUsed: Record<string, string>;
}

const tokensUsed = (spec: ComponentSpec): Record<string, string> =>
  Object.fromEntries(getTokenMapping(spec).map((m) => [`${m.part}.${m.cssProperty}`, m.token]));

/**
 * Content slots that the supplied label/description/items actually touch, found by
 * comparing the defaults against the same defaults plus the input. The mapping itself
 * stays in contentFromInput (D-075); this only reads which slots it moved.
 */
function contentPatch(spec: ComponentSpec, input: Record<string, unknown>): Partial<ComponentContent> {
  const label = optionalString(input, 'label');
  const description = optionalString(input, 'description');
  const items = optionalStringArray(input, 'items');
  if (label === undefined && description === undefined && items === undefined) return {};
  const base = contentFromInput(spec.type, {}) as Record<string, unknown>;
  const filled = contentFromInput(spec.type, { label, description, items }) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  for (const key of Object.keys(filled))
    if (JSON.stringify(filled[key]) !== JSON.stringify(base[key])) patch[key] = filled[key];
  return patch as Partial<ComponentContent>;
}

const tool: ToolDefinition<Record<string, unknown>, ModifyComponentData> = {
  name: 'modify_component',
  title: 'Modify Component',
  description:
    'Change an existing component by id: variant, size, label, or content. Rules are re-checked; a violating change is rejected with alternatives.',
  inputSchema: {
    type: 'object',
    properties: {
      componentId: { type: 'string', description: "The component's id, e.g. 'comp_a1b2c3d4'." },
      variant: {
        type: 'string',
        enum: [...COMPONENT_VARIANTS],
        description: 'New accent role and fill.',
      },
      size: { type: 'string', enum: [...COMPONENT_SIZES], description: 'New size.' },
      label: { type: 'string', description: 'New primary text.' },
      description: { type: 'string', description: 'New secondary text.' },
      items: { type: 'array', items: { type: 'string' }, description: 'New list content.' },
    },
    required: ['componentId'],
    additionalProperties: false,
  },
  phases: [2, 3, 4],
  readOnly: false,
  untrusted: false,
  execute: (input) =>
    guard(() => {
      const id = requireString(input, 'componentId');
      const components = useComponentStore.getState();
      const current = components.get(id);
      if (!current) return notFound('component', id, components.ids(), 'list_components');

      const previous = structuredClone(current);
      const changed: string[] = [];
      const next: ComponentSpec = structuredClone(current);

      if (input.variant !== undefined) {
        next.variant = optionalEnum(input, 'variant', COMPONENT_VARIANTS, current.variant);
        if (next.variant !== current.variant) changed.push('variant');
      }
      if (input.size !== undefined) {
        next.size = optionalEnum(input, 'size', COMPONENT_SIZES, current.size);
        if (next.size !== current.size) changed.push('size');
      }
      const patch = contentPatch(current, input);
      for (const key of Object.keys(patch)) changed.push(`content.${key}`);
      next.content = { ...next.content, ...patch } as ComponentSpec['content'];

      if (!changed.length)
        return fail('INVALID_INPUT', 'Nothing to change: no new variant, size, label, description or items.', {
          hint: 'Pass at least one field that differs from the current value. explain_component shows the current one.',
        });

      const violation = evaluateSpec(next, useRuleStore.getState().listEnabled())[0];
      if (violation)
        return fail('RULE_VIOLATION', violation.message, {
          hint: `The rule is "${violation.ruleDescription}".`,
          alternatives: violation.alternatives,
        });

      components.update(id, { variant: next.variant, size: next.size, content: next.content });
      return ok(
        `Updated ${current.type} ${id}: ${changed.join(', ')}.`,
        { id, changed, tokensUsed: tokensUsed(next) },
        { kind: 'restore_component_spec', id, previous },
      );
    }),
};
export default tool;
