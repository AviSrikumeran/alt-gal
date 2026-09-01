import { getModelContext } from '@/webmcp/detect';
import { useLogStore } from '@/stores/logStore';

/** Drives a registered tool through the browser's own executeTool path. Used by the Tool Inspector panel. */
export async function runTool(name: string, input: Record<string, unknown>, signal?: AbortSignal): Promise<string> {
  const ctx = getModelContext();
  if (!ctx) return 'WebMCP is not available in this browser.';
  if (!ctx.executeTool) return 'This browser exposes tools but not executeTool(); use an agent host.';
  const tool = (await ctx.getTools()).find((t) => t.name === name);
  if (!tool) return `${name} is not registered right now, so there is no tool to call.`;
  // I-8: the call goes through the host's own executeTool, so the registration wrapper logs it
  // exactly like a host-driven call. This marks it as the human's, so the transcript does not
  // read as though an agent made it. Restored in `finally`, including on the fallback path.
  useLogStore.getState().setSource('inspector');
  try {
    try {
      return (await ctx.executeTool(tool, JSON.stringify(input), { signal })) ?? 'null'; // Chrome ≤152: string
    } catch {
      return (await ctx.executeTool(tool, input, { signal })) ?? 'null'; // webmcp#243: object
    }
  } finally {
    useLogStore.getState().setSource('agent');
  }
}
