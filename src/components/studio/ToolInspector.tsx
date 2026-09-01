'use client';
// ToolInspector — a shipped product feature, not a dev panel (D-031, Part 8.7).
// It lists what document.modelContext.getTools() reports right now, live through the
// toolchange event, and drives a tool through the browser's own executeTool path. Every
// run is logged by the registration wrapper exactly like an agent call (D-177).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getModelContext } from '@/webmcp/detect';
import { runTool } from '@/webmcp/inspector';
import { useUIStore } from '@/stores/uiStore';
import { useWebMCPStatusStore } from '@/stores/webmcpStatusStore';
import './webmcp-panels.css';

/** The shape we read out of a RegisteredTool's `inputSchema` (typed `object` upstream). */
interface JsonSchema {
  type?: string;
  properties?: Record<string, { type?: string; enum?: unknown[]; description?: string }>;
  required?: string[];
}

/** Part 8.7: prefill the JSON well from the schema's required keys. */
function exampleInput(schema: JsonSchema | undefined): string {
  const properties = schema?.properties ?? {};
  const out: Record<string, unknown> = {};
  for (const key of schema?.required ?? []) {
    const prop = properties[key];
    if (prop?.enum?.length) out[key] = prop.enum[0];
    else if (prop?.type === 'number' || prop?.type === 'integer') out[key] = 0;
    else if (prop?.type === 'boolean') out[key] = false;
    else if (prop?.type === 'array') out[key] = [];
    else out[key] = '';
  }
  return JSON.stringify(out, null, 2);
}

const pretty = (value: string): string => {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
};

export default function ToolInspector() {
  const open = useUIStore((s) => s.inspectorOpen);
  const setOpen = useUIStore((s) => s.setInspectorOpen);
  // The hook's own getTools() poll drives this store, so its tool list is the refresh signal.
  const toolNames = useWebMCPStatusStore((s) => s.toolNames);
  const [tools, setTools] = useState<WebMCP.RegisteredTool[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [input, setInput] = useState('{}');
  const [result, setResult] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const refresh = useCallback(async () => {
    const ctx = getModelContext();
    if (!ctx) return;
    try {
      const registered = await ctx.getTools();
      setTools(registered);
    } catch {
      /* getTools unsupported on this host: keep the last known list */
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const ctx = getModelContext();
    const onToolChange = () => void refresh();
    ctx?.addEventListener('toolchange', onToolChange);
    // Read the list on the next macrotask, the same beat the registration diff runs on (D-004).
    const queued = setTimeout(onToolChange, 0);
    return () => {
      clearTimeout(queued);
      ctx?.removeEventListener('toolchange', onToolChange);
    };
  }, [open, refresh, toolNames]);

  const current = useMemo(() => tools.find((t) => t.name === selected) ?? null, [tools, selected]);

  const select = (tool: WebMCP.RegisteredTool) => {
    setSelected(tool.name);
    setInput(exampleInput(tool.inputSchema as JsonSchema | undefined));
    setResult(null);
  };

  const run = async () => {
    if (!current) return;
    let parsed: Record<string, unknown>;
    try {
      parsed = input.trim() ? (JSON.parse(input) as Record<string, unknown>) : {};
    } catch (e) {
      setResult(`That input is not valid JSON. ${e instanceof Error ? e.message : ''}`.trim());
      return;
    }
    setRunning(true);
    try {
      setResult(pretty(await runTool(current.name, parsed)));
    } finally {
      setRunning(false);
    }
  };

  if (!open) return null;

  return (
    <aside className="alt-inspector" aria-label="Tool Inspector">
      <div className="alt-inspector__head">
        <h2>Tool Inspector</h2>
        <button type="button" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>
      {tools.length === 0 ? (
        <p className="alt-inspector__empty">No tools registered.</p>
      ) : (
        <div className="alt-inspector__body">
          <div className="alt-inspector__list">
            <div className="alt-inspector__label">Registered now · {tools.length}</div>
            {tools.map((tool) => (
              <button
                key={tool.name}
                type="button"
                className="alt-inspector__tool"
                aria-current={tool.name === selected}
                onClick={() => select(tool)}
              >
                {tool.name}
              </button>
            ))}
          </div>
          <div className="alt-inspector__detail">
            {current ? (
              <>
                <h3>{current.name}</h3>
                <p className="alt-inspector__desc">{current.description}</p>
                <label className="alt-inspector__label" htmlFor="alt-inspector-input">
                  Input (JSON)
                </label>
                <textarea
                  id="alt-inspector-input"
                  rows={6}
                  value={input}
                  spellCheck={false}
                  onChange={(e) => setInput(e.target.value)}
                />
                <button type="button" className="alt-inspector__run" onClick={() => void run()} disabled={running}>
                  Run
                </button>
                {result !== null && (
                  <>
                    <div className="alt-inspector__label">Result</div>
                    <pre>{result}</pre>
                  </>
                )}
              </>
            ) : (
              <p className="alt-inspector__desc">Select a tool to see its schema and call it.</p>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
