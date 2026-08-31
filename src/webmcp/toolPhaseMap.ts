import type { Phase } from '@/types/phase';
import type { ToolName } from '@/types/webmcp';

export const TOOL_PHASE_MAP: Record<ToolName, readonly Phase[]> = {
  get_current_state: [0, 1, 2, 3, 4],
  set_token: [0, 1, 2, 3, 4],
  get_tokens: [0, 1, 2, 3, 4],
  suggest_palette: [0, 1, 2, 3, 4],
  remove_token: [1, 2, 3, 4],
  add_rule: [1, 2, 3, 4],
  remove_rule: [1, 2, 3, 4],
  list_rules: [1, 2, 3, 4],
  generate_component: [2, 3, 4],
  list_components: [2, 3, 4],
  modify_component: [2, 3, 4],
  remove_component: [2, 3, 4],
  explain_component: [2, 3, 4],
  get_component_code: [2, 3, 4],
  sketch_wireframe: [3, 4],
  modify_layout: [3, 4],
  remove_wireframe: [3, 4],
  render_page: [3, 4],
  generate_dark_theme: [3, 4],
  audit_accessibility: [3, 4],
  export_tokens: [4],
  export_components: [4],
  export_page: [4],
  export_full_system: [4],
};

export const ALL_TOOL_NAMES = Object.keys(TOOL_PHASE_MAP) as ToolName[];

export const toolsForPhase = (phase: Phase): ToolName[] =>
  ALL_TOOL_NAMES.filter((n) => TOOL_PHASE_MAP[n].includes(phase));

export const isToolAvailable = (name: ToolName, phase: Phase): boolean => TOOL_PHASE_MAP[name].includes(phase);
