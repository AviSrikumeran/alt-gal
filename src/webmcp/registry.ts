import type { ToolDefinition, ToolName } from '@/types/webmcp';
import add_rule from '@/webmcp/tools/add_rule';
import audit_accessibility from '@/webmcp/tools/audit_accessibility';
import explain_component from '@/webmcp/tools/explain_component';
import export_components from '@/webmcp/tools/export_components';
import export_full_system from '@/webmcp/tools/export_full_system';
import export_page from '@/webmcp/tools/export_page';
import export_tokens from '@/webmcp/tools/export_tokens';
import generate_component from '@/webmcp/tools/generate_component';
import generate_dark_theme from '@/webmcp/tools/generate_dark_theme';
import get_component_code from '@/webmcp/tools/get_component_code';
import get_current_state from '@/webmcp/tools/get_current_state';
import get_tokens from '@/webmcp/tools/get_tokens';
import list_components from '@/webmcp/tools/list_components';
import list_rules from '@/webmcp/tools/list_rules';
import modify_component from '@/webmcp/tools/modify_component';
import modify_layout from '@/webmcp/tools/modify_layout';
import remove_component from '@/webmcp/tools/remove_component';
import remove_rule from '@/webmcp/tools/remove_rule';
import remove_token from '@/webmcp/tools/remove_token';
import remove_wireframe from '@/webmcp/tools/remove_wireframe';
import render_page from '@/webmcp/tools/render_page';
import set_token from '@/webmcp/tools/set_token';
import sketch_wireframe from '@/webmcp/tools/sketch_wireframe';
import suggest_palette from '@/webmcp/tools/suggest_palette';

export const TOOL_DEFINITIONS: Record<ToolName, ToolDefinition> = {
  add_rule,
  audit_accessibility,
  explain_component,
  export_components,
  export_full_system,
  export_page,
  export_tokens,
  generate_component,
  generate_dark_theme,
  get_component_code,
  get_current_state,
  get_tokens,
  list_components,
  list_rules,
  modify_component,
  modify_layout,
  remove_component,
  remove_rule,
  remove_token,
  remove_wireframe,
  render_page,
  set_token,
  sketch_wireframe,
  suggest_palette,
};
