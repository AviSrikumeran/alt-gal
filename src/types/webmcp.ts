import type { Phase } from '@/types/phase';
import type { InverseAction } from '@/types/log';

export type ToolErrorCode = 'INVALID_INPUT' | 'NOT_FOUND' | 'RULE_VIOLATION' | 'LOCKED' | 'PHASE_LOCKED' | 'INTERNAL';

export type ToolOutcome<T = unknown> =
  | { kind: 'ok'; summary: string; data?: T; inverse?: InverseAction | null }
  | { kind: 'error'; code: ToolErrorCode; message: string; hint?: string; alternatives?: string[] };

export type ToolResult<T = unknown> =
  | {
      ok: true;
      phase: Phase;
      phaseChanged: boolean;
      newTools: string[];
      removedTools: string[];
      summary: string;
      data?: T;
    }
  | { ok: false; phase: Phase; code: ToolErrorCode; error: string; hint?: string; alternatives?: string[] };

export type ToolName =
  | 'get_current_state'
  | 'set_token'
  | 'get_tokens'
  | 'suggest_palette'
  | 'remove_token'
  | 'add_rule'
  | 'remove_rule'
  | 'list_rules'
  | 'generate_component'
  | 'list_components'
  | 'modify_component'
  | 'remove_component'
  | 'explain_component'
  | 'get_component_code'
  | 'sketch_wireframe'
  | 'modify_layout'
  | 'remove_wireframe'
  | 'render_page'
  | 'generate_dark_theme'
  | 'audit_accessibility'
  | 'export_tokens'
  | 'export_components'
  | 'export_page'
  | 'export_full_system';

export interface ToolInputSchema {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties: false;
}

export interface ToolDefinition<TInput extends Record<string, unknown> = Record<string, unknown>, TData = unknown> {
  name: ToolName;
  title: string;
  description: string;
  inputSchema: ToolInputSchema;
  phases: readonly Phase[];
  readOnly: boolean;
  untrusted?: boolean;
  /** Synchronous. No awaits. Reads stores via getState(). May throw ToolInputError; anything else is a bug. */
  execute(input: TInput): ToolOutcome<TData>;
}

/** Thrown by validate.ts helpers; the wrapper maps it to INVALID_INPUT (D-076). */
export class ToolInputError extends Error {
  constructor(
    message: string,
    public readonly alternatives?: string[],
  ) {
    super(message);
    this.name = 'ToolInputError';
  }
}
