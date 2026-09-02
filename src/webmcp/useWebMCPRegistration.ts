'use client';
import { useEffect, useRef } from 'react';
import { usePhaseStore } from '@/stores/phaseStore';
import { useLogStore } from '@/stores/logStore';
import { useWebMCPStatusStore } from '@/stores/webmcpStatusStore';
import { TOOL_DEFINITIONS } from '@/webmcp/registry';
import { toolsForPhase, isToolAvailable } from '@/webmcp/toolPhaseMap';
import { toResult, serialize } from '@/webmcp/results';
import { getModelContext } from '@/webmcp/detect';
import type { ToolDefinition, ToolName, ToolOutcome } from '@/types/webmcp';
import { ToolInputError } from '@/types/webmcp';

const isAbortError = (e: unknown): boolean => e instanceof DOMException && e.name === 'AbortError';

/**
 * Builds the WebMCP tool object for one definition.
 * The wrapper owns: cancellation check, phase re-check, try/catch, envelope, logging, serialization.
 * The definition owns: validation + store mutation, returning a ToolOutcome.
 */
function wrapTool(def: ToolDefinition): WebMCP.ModelContextTool {
  return {
    name: def.name,
    title: def.title,
    description: def.description,
    inputSchema: def.inputSchema,
    annotations: { readOnlyHint: def.readOnly, untrustedContentHint: def.untrusted ?? false },
    execute: async (input, options) => {
      if (options?.signal?.aborted) throw new DOMException('Cancelled', 'AbortError'); // D-008, D-010
      const startedAt = Date.now();
      const phaseBefore = usePhaseStore.getState().currentPhase;
      let outcome: ToolOutcome;
      if (!isToolAvailable(def.name, phaseBefore)) {
        // D-009
        outcome = {
          kind: 'error',
          code: 'PHASE_LOCKED',
          message: `${def.name} is not available right now.`,
          hint: 'Call get_current_state to see the available tools and what unlocks the next phase.',
        };
      } else {
        try {
          outcome = def.execute((input ?? {}) as Record<string, unknown>);
        } catch (e) {
          // I-6, D-076: this is the backstop for a tool body that threw outside its own `guard`.
          // A ToolInputError is the agent's mistake, not the studio's, so it keeps the same
          // INVALID_INPUT mapping (and its alternatives) that guard() would have given it.
          outcome =
            e instanceof ToolInputError
              ? { kind: 'error', code: 'INVALID_INPUT', message: e.message, alternatives: e.alternatives }
              : { kind: 'error', code: 'INTERNAL', message: e instanceof Error ? e.message : String(e) };
        }
      }
      const phaseAfter = usePhaseStore.getState().currentPhase; // D-032: sync recalc already ran
      const result = toResult(outcome, phaseBefore, phaseAfter);
      useLogStore.getState().addEntry({
        actor: 'agent',
        tool: def.name,
        input: (input ?? {}) as Record<string, unknown>,
        result,
        status: result.ok ? 'ok' : 'error',
        durationMs: Date.now() - startedAt,
        inverse: outcome.kind === 'ok' ? (outcome.inverse ?? null) : null,
      });
      return serialize(result); // D-005
    },
  };
}

/**
 * Registers exactly the tools valid for the current phase and keeps that set in sync.
 * Diff-based (D-002). Per-tool + epoch controllers (D-003). Deferred, coalesced sync (D-004).
 * Mount once, in <Registrar/> under <WebMCPBridge/> (D-017).
 */
export function useWebMCPRegistration(): void {
  const registeredRef = useRef<Map<ToolName, AbortController>>(new Map());
  const syncQueuedRef = useRef(false);

  useEffect(() => {
    const ctx = getModelContext();
    if (!ctx) return;

    const epoch = new AbortController();
    const registered = registeredRef.current;
    const status = useWebMCPStatusStore.getState();

    /**
     * D-016 wants the browser's own answer, not a hand-tracked number, so `getTools()` is the
     * source. But it is the *only* source, its failure was swallowed, and the number it feeds is
     * the thing being demonstrated — a host without `getTools` froze the count at its last value
     * with nothing on screen to say so. The registered map is the honest second-best: it is what
     * this hook just asked the host to hold.
     */
    const refreshCount = async () => {
      let names: string[];
      try {
        const tools = await ctx.getTools();
        if (!Array.isArray(tools)) throw new TypeError('getTools() did not return a list');
        names = tools.map((t) => t.name);
      } catch {
        names = [...registered.keys()];
      }
      if (!epoch.signal.aborted) useWebMCPStatusStore.getState().setTools(names);
    };

    const sync = async () => {
      const phase = usePhaseStore.getState().currentPhase;
      const want = new Set<ToolName>(toolsForPhase(phase));
      const have = new Set<ToolName>(registered.keys());

      for (const name of have) {
        if (!want.has(name)) {
          registered.get(name)!.abort();
          registered.delete(name);
        } // abort-to-unregister
      }
      for (const name of want) {
        if (have.has(name)) continue;
        const ctl = new AbortController();
        registered.set(name, ctl); // set before await (mace)
        try {
          await ctx.registerTool(wrapTool(TOOL_DEFINITIONS[name]), {
            signal: AbortSignal.any([ctl.signal, epoch.signal]), // D-003
          });
        } catch (e) {
          registered.delete(name);
          if (!isAbortError(e)) status.markDegraded(name, e); // D-015
        }
        if (epoch.signal.aborted) return; // D-018
      }
      await refreshCount();
    };

    const scheduleSync = () => {
      // D-004
      if (syncQueuedRef.current) return;
      syncQueuedRef.current = true;
      setTimeout(() => {
        syncQueuedRef.current = false;
        if (!epoch.signal.aborted) void sync();
      }, 0);
    };

    const onToolChange = () => {
      void refreshCount();
    };
    ctx.addEventListener('toolchange', onToolChange);

    void sync(); // initial registration
    const unsubscribe = usePhaseStore.subscribe((s, prev) => {
      if (s.currentPhase !== prev.currentPhase) scheduleSync();
    });

    return () => {
      unsubscribe();
      ctx.removeEventListener('toolchange', onToolChange);
      epoch.abort(); // drops every registered tool at once
      registered.clear();
    };
  }, []);
}
