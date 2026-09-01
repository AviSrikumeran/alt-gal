// get_current_state — phases 0, 1, 2, 3, 4 (read-only). D-025, D-028.
// Never gated: it is the agent's map, and the one tool allowed to describe the phase
// system (D-022). Absence is the signal everywhere else; this is where it is explained.
import type { ToolDefinition } from '@/types/webmcp';
import type { Phase } from '@/types/phase';
import { PHASE_DEFINITIONS } from '@/types/phase';
import type { ToolName } from '@/types/webmcp';
import type { NextPhaseInfo } from '@/types/phase';
import type { ComponentSummary } from '@/types/components';
import type { RuleViolation } from '@/types/rules';
import type { TokenMap } from '@/types/tokens';
import { usePhaseStore } from '@/stores/phaseStore';
import { useTokenStore } from '@/stores/tokenStore';
import { useComponentStore } from '@/stores/componentStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { useRuleStore } from '@/stores/ruleStore';
import { evaluateAll } from '@/engine/ruleEngine';
import { toolsForPhase } from '@/webmcp/toolPhaseMap';
import { ok } from '@/webmcp/results';
import { guard } from '@/webmcp/validate';

/** D-033. Full token values, summarized everything else. */
export interface CurrentState {
  phase: Phase;
  phaseName: string;
  phaseDescription: string;
  nextPhase: NextPhaseInfo | null;
  counts: { tokens: number; components: number; wireframes: number; renderedPages: number; rules: number };
  tokens: TokenMap;
  lockedTokens: string[];
  components: ComponentSummary[];
  wireframes: { id: string; name: string; status: 'wireframe' | 'rendered'; sectionCount: number }[];
  renderedPages: { id: string; wireframeId: string }[];
  rules: { id: string; description: string }[];
  violations: RuleViolation[];
  availableTools: ToolName[];
  suggestedNext: string;
}

/** D-034: one sentence, here and nowhere else. */
const SUGGESTED_NEXT: Record<Phase, string> = {
  0: 'Ask the human for their primary brand color, then call suggest_palette to fill the rest.',
  1: 'Set the missing tokens listed in nextPhase.missing; suggest_palette covers all colors at once.',
  2: 'Generate at least two components so the human can see the tokens applied; then sketch a wireframe.',
  3: 'Sketch a wireframe for the human to approve, then render it.',
  4: 'Offer to export the system or refine components.',
};

const tool: ToolDefinition<Record<string, unknown>, CurrentState> = {
  name: 'get_current_state',
  title: 'Studio State',
  description:
    'Report where the design system stands: phase, defined tokens, components, wireframes, pages, active rules, locked tokens, and exactly which tools are available right now. Call it first in a session, and again whenever a tool you expected is missing.',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  phases: [0, 1, 2, 3, 4],
  readOnly: true,
  untrusted: false,
  execute: () =>
    guard(() => {
      const phase = usePhaseStore.getState().currentPhase;
      const def = PHASE_DEFINITIONS[phase]!;
      const tokens = useTokenStore.getState();
      const components = useComponentStore.getState();
      const layouts = useLayoutStore.getState();
      const rules = useRuleStore.getState().list();

      const data: CurrentState = {
        phase,
        phaseName: def.name,
        phaseDescription: def.description,
        nextPhase: usePhaseStore.getState().nextPhase(),
        counts: {
          tokens: tokens.getDefinedTokenCount(),
          components: components.count(),
          wireframes: layouts.wireframes.length,
          renderedPages: layouts.renderedPages.length,
          rules: rules.length,
        },
        tokens: tokens.getTokenMap(),
        lockedTokens: [...tokens.locked],
        components: components.summaries(),
        wireframes: layouts.wireframes.map((w) => ({
          id: w.id,
          name: w.title,
          status: w.status,
          sectionCount: w.sections.length,
        })),
        renderedPages: layouts.renderedPages.map((p) => ({ id: p.id, wireframeId: p.wireframeId })),
        rules: rules.map((r) => ({ id: r.id, description: r.description })),
        violations: evaluateAll(),
        availableTools: toolsForPhase(phase),
        suggestedNext: SUGGESTED_NEXT[phase],
      };

      const c = data.counts;
      const summary =
        `Phase ${phase} (${def.name}). ${c.tokens} token${c.tokens === 1 ? '' : 's'}, ` +
        `${c.components} component${c.components === 1 ? '' : 's'}, ${c.wireframes} wireframe${c.wireframes === 1 ? '' : 's'}, ` +
        `${c.renderedPages} rendered page${c.renderedPages === 1 ? '' : 's'}, ${c.rules} rule${c.rules === 1 ? '' : 's'}. ` +
        `${data.availableTools.length} tools available.`;
      return ok(summary, data, null);
    }),
};
export default tool;
