import type { Phase } from '@/types/phase';
import type { ToolResult } from '@/types/webmcp';
import type { ComponentSpec } from '@/types/components';
import type { Wireframe, WireframeSection } from '@/types/layouts';
import type { DesignRule } from '@/types/rules';
import type { SemanticColorRole, TokenPath } from '@/types/tokens';

/** Everything undo can do (D-061). Payloads captured at execution time. */
export type InverseAction =
  | { kind: 'restore_token'; path: TokenPath; value: string | null }
  | { kind: 'restore_tokens'; snapshot: Partial<Record<TokenPath, string | null>> }
  | { kind: 'remove_component'; id: string }
  | { kind: 'restore_component'; spec: ComponentSpec; index: number }
  | { kind: 'restore_component_spec'; id: string; previous: ComponentSpec }
  | { kind: 'remove_wireframe'; id: string }
  | { kind: 'restore_wireframe'; wireframe: Wireframe; index: number }
  | { kind: 'restore_sections'; wireframeId: string; sections: WireframeSection[] }
  | { kind: 'unrender_page'; pageId: string; wireframeId: string; componentIds: string[] }
  | { kind: 'restore_dark'; previous: Record<SemanticColorRole, string | null> | null }
  | { kind: 'remove_rule'; id: string }
  | { kind: 'restore_rule'; rule: DesignRule; index: number };

export interface AgentLogEntry {
  id: string; // log_xxxxxxxx
  timestamp: number; // Unix ms (D-038)
  actor: 'agent' | 'human';
  tool: string; // ToolName, or 'ui.<action>' for humans (D-060)
  input: Record<string, unknown>;
  result: ToolResult | null; // null for human actions
  status: 'ok' | 'error';
  durationMs: number;
  phase: Phase; // phase after the action
  inverse: InverseAction | null;
  undone: boolean;
}

export type NewLogEntry = Omit<AgentLogEntry, 'id' | 'timestamp' | 'undone' | 'phase'>;
