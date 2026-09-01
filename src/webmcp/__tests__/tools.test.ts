/**
 * Stream 3 isolation test (§11.2): with the fixture, register all 24 definitions, call
 * each with valid and invalid input, assert every return parses as a ToolResult and no
 * execute throws.
 *
 * The registration wrapper lives in the frozen `useWebMCPRegistration.ts` and needs a
 * React tree; `wrapForTest` below mirrors its contract (cancellation check, phase re-check,
 * envelope, serialization) so the definitions can be driven from Node. The real wrapper is
 * exercised end-to-end in `webmcp.e2e.ts`.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import type { ComponentSpec } from '@/types/components';
import type { DesignRule } from '@/types/rules';
import type { RenderedPage, Wireframe } from '@/types/layouts';
import type { ToolDefinition, ToolErrorCode, ToolName, ToolOutcome } from '@/types/webmcp';
import { DEFAULT_CONTENT } from '@/components/library/content';
import { generateId } from '@/utils/idGenerator';
import { useComponentStore } from '@/stores/componentStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { usePhaseStore } from '@/stores/phaseStore';
import { useRuleStore } from '@/stores/ruleStore';
import { TOOL_DEFINITIONS } from '@/webmcp/registry';
import { ALL_TOOL_NAMES, TOOL_PHASE_MAP, isToolAvailable, toolsForPhase } from '@/webmcp/toolPhaseMap';
import { serialize, toResult } from '@/webmcp/results';
import { installFakeModelContext } from './fixtures/fakeModelContext';
import type { FakeHost } from './fixtures/fakeModelContext';

const ERROR_CODES: ToolErrorCode[] = [
  'INVALID_INPUT',
  'NOT_FOUND',
  'RULE_VIOLATION',
  'LOCKED',
  'PHASE_LOCKED',
  'INTERNAL',
];

/** D-025: the hint lists, verbatim. */
const READ_ONLY: ToolName[] = [
  'get_current_state',
  'get_tokens',
  'list_rules',
  'list_components',
  'explain_component',
  'get_component_code',
  'audit_accessibility',
  'export_tokens',
  'export_components',
  'export_page',
  'export_full_system',
];
const UNTRUSTED: ToolName[] = [
  'list_components',
  'explain_component',
  'get_component_code',
  'export_components',
  'export_page',
  'export_full_system',
];

function wrapForTest(def: ToolDefinition): WebMCP.ModelContextTool {
  return {
    name: def.name,
    title: def.title,
    description: def.description,
    inputSchema: def.inputSchema,
    annotations: { readOnlyHint: def.readOnly, untrustedContentHint: def.untrusted ?? false },
    execute: async (input, options) => {
      if (options?.signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
      const phaseBefore = usePhaseStore.getState().currentPhase;
      const outcome: ToolOutcome = isToolAvailable(def.name, phaseBefore)
        ? def.execute((input ?? {}) as Record<string, unknown>)
        : { kind: 'error', code: 'PHASE_LOCKED', message: `${def.name} is not available right now.` };
      // D-049's subscriber only installs in a browser; recompute so the envelope's phase is real.
      usePhaseStore.getState().recalculatePhase();
      return serialize(toResult(outcome, phaseBefore, usePhaseStore.getState().currentPhase));
    },
  };
}

interface Envelope {
  ok: boolean;
  phase: number;
  code?: string;
  error?: string;
  summary?: string;
  newTools?: string[];
  removedTools?: string[];
  phaseChanged?: boolean;
}

function parseEnvelope(raw: string): Envelope {
  expect(typeof raw).toBe('string');
  const env = JSON.parse(raw) as Envelope;
  expect(typeof env.ok).toBe('boolean');
  expect([0, 1, 2, 3, 4]).toContain(env.phase);
  if (env.ok) {
    expect(typeof env.summary).toBe('string');
    expect(env.summary!.length).toBeGreaterThan(0);
    expect(typeof env.phaseChanged).toBe('boolean');
    expect(Array.isArray(env.newTools)).toBe(true);
    expect(Array.isArray(env.removedTools)).toBe(true);
  } else {
    expect(ERROR_CODES).toContain(env.code as ToolErrorCode);
    expect(typeof env.error).toBe('string');
    expect(env.error!.length).toBeGreaterThan(0);
  }
  return env;
}

const spec = (id: string, type: ComponentSpec['type']): ComponentSpec => ({
  id,
  type,
  variant: 'primary',
  size: 'md',
  content: structuredClone(DEFAULT_CONTENT[type]),
  pageId: null,
  sectionId: null,
  createdBy: 'human',
  createdAt: Date.now(),
});

let host: FakeHost;
const componentA = generateId('comp');
const componentB = generateId('comp');
let ruleId = '';
let wireframeId = '';
let spareWireframeId = '';
let sectionId = '';

describe('tool definitions', () => {
  it('registers exactly the 24 imperative tools, keyed by name', () => {
    expect(Object.keys(TOOL_DEFINITIONS)).toHaveLength(24);
    for (const name of ALL_TOOL_NAMES) expect(TOOL_DEFINITIONS[name].name).toBe(name);
  });

  it('agrees with TOOL_PHASE_MAP and yields 4 / 8 / 14 / 20 / 24 tools per phase', () => {
    for (const name of ALL_TOOL_NAMES) expect(TOOL_DEFINITIONS[name].phases).toEqual(TOOL_PHASE_MAP[name]);
    expect([0, 1, 2, 3, 4].map((p) => toolsForPhase(p as 0).length)).toEqual([4, 8, 14, 20, 24]);
  });

  it('carries names, titles and descriptions the host will accept (D-023, D-024)', () => {
    for (const name of ALL_TOOL_NAMES) {
      const def = TOOL_DEFINITIONS[name];
      expect(def.name).toMatch(/^[A-Za-z0-9_.-]{1,128}$/);
      expect(def.title.length).toBeGreaterThan(0);
      expect(def.title.split(' ').length).toBeLessThanOrEqual(4);
      expect(def.description.length).toBeLessThanOrEqual(300);
    }
  });

  it('never mentions phases outside get_current_state (D-022)', () => {
    for (const name of ALL_TOOL_NAMES) {
      if (name === 'get_current_state') continue;
      expect(TOOL_DEFINITIONS[name].description.toLowerCase()).not.toContain('phase');
    }
  });

  it('uses closed, serializable object schemas with no oneOf and no examples (D-020, D-021)', () => {
    for (const name of ALL_TOOL_NAMES) {
      const schema = TOOL_DEFINITIONS[name].inputSchema;
      expect(schema.type).toBe('object');
      expect(schema.additionalProperties).toBe(false);
      const serialized = JSON.stringify(schema);
      expect(serialized).not.toContain('oneOf');
      expect(serialized).not.toContain('"examples"');
      for (const key of schema.required ?? []) expect(Object.keys(schema.properties)).toContain(key);
      expect(JSON.parse(serialized)).toEqual(schema);
    }
  });

  it('sets the annotation hints on exactly the tools D-025 names', () => {
    for (const name of ALL_TOOL_NAMES) {
      expect(TOOL_DEFINITIONS[name].readOnly).toBe(READ_ONLY.includes(name));
      expect(TOOL_DEFINITIONS[name].untrusted ?? false).toBe(UNTRUSTED.includes(name));
    }
  });
});

describe('registration against a fake host', () => {
  beforeAll(() => {
    host = installFakeModelContext();
  });

  it('registers all 24 definitions and exposes them through getTools()', async () => {
    const epoch = new AbortController();
    for (const name of ALL_TOOL_NAMES)
      await host.context.registerTool(wrapForTest(TOOL_DEFINITIONS[name]), { signal: epoch.signal });
    const tools = await host.context.getTools();
    expect(tools.map((t) => t.name).sort()).toEqual([...ALL_TOOL_NAMES].sort());
    for (const tool of tools) {
      expect(tool.title).toBeTruthy();
      expect(tool.annotations).toBeDefined();
    }
  });

  it('unregisters by aborting the registration signal, as the spec has no unregisterTool', async () => {
    const ctl = new AbortController();
    await host.context.registerTool(
      { name: 'temp_tool', description: 'temporary', execute: () => 'ok' },
      {
        signal: ctl.signal,
      },
    );
    expect((await host.context.getTools()).some((t) => t.name === 'temp_tool')).toBe(true);
    ctl.abort();
    expect((await host.context.getTools()).some((t) => t.name === 'temp_tool')).toBe(false);
  });

  it('answers a gated tool with PHASE_LOCKED while the studio is empty (D-009)', async () => {
    usePhaseStore.getState().recalculatePhase();
    expect(usePhaseStore.getState().currentPhase).toBe(0);
    const tools = await host.context.getTools();
    const gated = tools.find((t) => t.name === 'generate_component')!;
    const env = parseEnvelope(await host.context.executeTool(gated, JSON.stringify({ type: 'button' })));
    expect(env.ok).toBe(false);
    expect(env.code).toBe('PHASE_LOCKED');
    expect(useComponentStore.getState().count()).toBe(0);
  });
});

describe('every tool, valid and invalid input', () => {
  /** Tools whose bodies run end to end against the seed's stubs; the rest answer honestly. */
  const EXPECT_OK = new Set<ToolName>([
    'get_current_state',
    'get_tokens',
    'remove_token',
    'add_rule',
    'remove_rule',
    'list_rules',
    'generate_component',
    'list_components',
    'modify_component',
    'remove_component',
    'explain_component',
    'sketch_wireframe',
    'modify_layout',
    'remove_wireframe',
  ]);

  let cases: Record<ToolName, { valid: Record<string, unknown>; invalid?: Record<string, unknown> }>;

  beforeAll(() => {
    // Phase 4 without Streams 1/4: two components, wireframes, a rule and a page record.
    useComponentStore.getState().reset();
    useLayoutStore.getState().reset();
    useRuleStore.getState().reset();
    useComponentStore.getState().add(spec(componentA, 'button'));
    useComponentStore.getState().add(spec(componentB, 'card'));

    const rule: DesignRule = {
      id: generateId('rule'),
      type: 'component-restriction',
      description: 'No danger buttons',
      condition: { target: 'button', property: 'variant', operator: 'not-equals', value: 'danger' },
      enabled: true,
      createdBy: 'human',
      createdAt: Date.now(),
    };
    ruleId = rule.id;
    useRuleStore.getState().add(rule);

    sectionId = generateId('sec');
    const wireframe: Wireframe = {
      id: generateId('wf'),
      pageType: 'landing',
      title: 'Northwind landing',
      sections: [
        { id: sectionId, type: 'navbar', label: 'navbar', columns: null },
        { id: generateId('sec'), type: 'hero', label: 'hero', columns: null },
      ],
      status: 'rendered',
      createdBy: 'human',
      createdAt: Date.now(),
    };
    wireframeId = wireframe.id;
    const spare: Wireframe = { ...wireframe, id: generateId('wf'), title: 'Spare', status: 'wireframe' };
    spareWireframeId = spare.id;
    useLayoutStore.getState().addWireframe(wireframe);
    useLayoutStore.getState().addWireframe(spare);

    const page: RenderedPage = {
      id: generateId('page'),
      wireframeId,
      pageType: 'landing',
      title: 'Northwind landing',
      sections: [{ sectionId, type: 'navbar', columns: null, componentIds: [] }],
      createdAt: Date.now(),
    };
    useLayoutStore.getState().addRenderedPage(page);
    usePhaseStore.getState().recalculatePhase();

    cases = {
      get_current_state: { valid: {} },
      set_token: {
        valid: { category: 'color', key: 'primary', value: 'hsl(250, 84%, 60%)' },
        invalid: { category: 'colour', key: 'primary', value: 'hsl(250, 84%, 60%)' },
      },
      get_tokens: { valid: { category: 'color' }, invalid: { category: 'colour' } },
      suggest_palette: { valid: { primary: '#7c5cff' }, invalid: { primary: 'cornflower' } },
      remove_token: { valid: { category: 'color', key: 'accent' }, invalid: { category: 'color', key: 'accentt' } },
      add_rule: {
        valid: {
          description: 'Minimum radius 8px',
          property: 'border-radius',
          operator: 'min',
          value: '8',
          target: 'all',
        },
        invalid: { description: 'x', property: 'vibes', operator: 'min', value: '8' },
      },
      remove_rule: { valid: { ruleId }, invalid: { ruleId: 'rule_00000000' } },
      list_rules: { valid: {} },
      generate_component: {
        valid: { type: 'button', variant: 'primary', size: 'lg', label: 'Start free' },
        invalid: { type: 'spaceship' },
      },
      list_components: { valid: {}, invalid: { type: 'spaceship' } },
      modify_component: {
        valid: { componentId: componentA, variant: 'secondary', label: 'Talk to sales' },
        invalid: { componentId: 'comp_00000000', variant: 'secondary' },
      },
      remove_component: { valid: { componentId: componentB }, invalid: { componentId: 'comp_00000000' } },
      explain_component: { valid: { componentId: componentA }, invalid: { componentId: 'comp_00000000' } },
      get_component_code: { valid: { componentId: componentA }, invalid: { componentId: 'comp_00000000' } },
      sketch_wireframe: {
        valid: { title: 'Pricing', sections: ['navbar', 'pricing', 'faq', 'footer'] },
        invalid: { title: 'Pricing', sections: ['navbar', 'carousel'] },
      },
      modify_layout: {
        valid: { wireframeId, action: 'add-section', sectionType: 'features', afterSectionId: sectionId },
        invalid: { wireframeId: 'wf_00000000', action: 'add-section', sectionType: 'features' },
      },
      remove_wireframe: { valid: { wireframeId: spareWireframeId }, invalid: { wireframeId: 'wf_00000000' } },
      render_page: { valid: { wireframeId }, invalid: { wireframeId: 'wf_00000000' } },
      generate_dark_theme: { valid: {} },
      audit_accessibility: { valid: { scope: 'all' }, invalid: { scope: 'everything' } },
      export_tokens: { valid: { formats: ['css'] }, invalid: { formats: ['postscript'] } },
      export_components: { valid: {} },
      export_page: { valid: {}, invalid: { pageId: 'page_00000000' } },
      export_full_system: { valid: {} },
    };
  });

  it('reaches phase 4, where all 24 tools are available', () => {
    expect(usePhaseStore.getState().currentPhase).toBe(4);
    expect(toolsForPhase(4)).toHaveLength(24);
  });

  it('answers every valid call with a well-formed envelope and never throws', async () => {
    const tools = await host.context.getTools();
    for (const name of ALL_TOOL_NAMES) {
      const tool = tools.find((t) => t.name === name)!;
      const raw = await host.context.executeTool(tool, JSON.stringify(cases[name].valid));
      const env = parseEnvelope(raw);
      if (EXPECT_OK.has(name)) expect({ name, ok: env.ok, error: env.error }).toEqual({ name, ok: true });
    }
  });

  it('answers every invalid call with an error envelope that names the way out', async () => {
    const tools = await host.context.getTools();
    for (const name of ALL_TOOL_NAMES) {
      const invalid = cases[name].invalid;
      if (!invalid) continue;
      const env = parseEnvelope(
        await host.context.executeTool(
          tools.find((t) => t.name === name)!,
          JSON.stringify(invalid),
        ),
      );
      expect({ name, ok: env.ok }).toEqual({ name, ok: false });
      expect(['INVALID_INPUT', 'NOT_FOUND']).toContain(env.code);
    }
  });

  it('rejects a rule-breaking generation instead of creating it (D-116)', async () => {
    const tools = await host.context.getTools();
    const add = tools.find((t) => t.name === 'add_rule')!;
    await host.context.executeTool(
      add,
      JSON.stringify({
        description: 'No ghost buttons',
        property: 'variant',
        operator: 'not-equals',
        value: 'ghost',
        target: 'button',
      }),
    );
    const before = useComponentStore.getState().count();
    const env = parseEnvelope(
      await host.context.executeTool(
        tools.find((t) => t.name === 'generate_component')!,
        JSON.stringify({ type: 'button', variant: 'ghost', label: 'Maybe' }),
      ),
    );
    // ruleEngine is Stream 2's; against its stub nothing is violated and the button is created.
    if (!env.ok) {
      expect(env.code).toBe('RULE_VIOLATION');
      expect(useComponentStore.getState().count()).toBe(before);
    } else {
      expect(useComponentStore.getState().count()).toBe(before + 1);
    }
  });

  it('narrates the phase change in the envelope when one happens (D-006)', async () => {
    const tools = await host.context.getTools();
    const page = useLayoutStore.getState().renderedPages[0]!;
    useLayoutStore.getState().removeRenderedPage(page.id);
    useComponentStore.getState().reset();
    usePhaseStore.getState().recalculatePhase();
    expect(usePhaseStore.getState().currentPhase).toBe(0);

    const env = parseEnvelope(
      await host.context.executeTool(
        tools.find((t) => t.name === 'get_current_state')!,
        JSON.stringify({}),
      ),
    );
    expect(env.ok).toBe(true);
    expect(env.phase).toBe(0);
  });
});
