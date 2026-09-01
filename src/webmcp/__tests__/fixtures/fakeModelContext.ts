/**
 * A fake `document.modelContext`, following shipwright's Playwright fixture
 * (`tests/fixtures/webmcp-init.js`) and the polyfill's observable behaviour:
 * registerTool stores the tool and fires `toolchange`, aborting the registration signal
 * removes it synchronously, duplicate names reject with InvalidStateError, and
 * non-serializable schemas reject. `executeTool` takes the JSON string Chrome ≤152 wants.
 *
 * Node has no `document`; the fixture installs a minimal one so `webmcp/detect.ts` and
 * `webmcp/inspector.ts` run unchanged.
 */
export class FakeModelContext extends EventTarget {
  readonly tools = new Map<string, WebMCP.ModelContextTool>();
  ontoolchange: WebMCP.ModelContext['ontoolchange'] = null;
  readonly origin = 'https://alt.gal';

  async registerTool(tool: WebMCP.ModelContextTool, options?: WebMCP.ModelContextRegisterToolOptions): Promise<void> {
    if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (this.tools.has(tool.name)) throw new DOMException(`Tool already registered: ${tool.name}`, 'InvalidStateError');
    JSON.stringify(tool.inputSchema ?? {}); // the polyfill rejects schemas it cannot serialize
    this.tools.set(tool.name, tool);
    options?.signal?.addEventListener(
      'abort',
      () => {
        if (this.tools.get(tool.name) === tool) {
          this.tools.delete(tool.name);
          this.dispatchEvent(new Event('toolchange'));
        }
      },
      { once: true },
    );
    this.dispatchEvent(new Event('toolchange'));
  }

  async getTools(): Promise<WebMCP.RegisteredTool[]> {
    return [...this.tools.values()].map(
      (t) =>
        ({
          name: t.name,
          title: t.title ?? t.name,
          description: t.description,
          inputSchema: t.inputSchema,
          annotations: t.annotations,
          origin: this.origin,
        }) as unknown as WebMCP.RegisteredTool,
    );
  }

  async executeTool(tool: WebMCP.RegisteredTool, inputArguments: string | Record<string, unknown>): Promise<string> {
    const registered = this.tools.get(tool.name);
    if (!registered) throw new DOMException('The provided value is not of type RegisteredTool.', 'InvalidStateError');
    const input = typeof inputArguments === 'string' ? JSON.parse(inputArguments) : inputArguments;
    const out = await registered.execute(input as Record<string, unknown>, { signal: new AbortController().signal });
    return typeof out === 'string' ? out : JSON.stringify(out);
  }
}

export interface FakeHost {
  context: FakeModelContext;
  uninstall(): void;
}

export function installFakeModelContext(): FakeHost {
  const globals = globalThis as { document?: Document };
  const createdDocument = !globals.document;
  if (createdDocument) globals.document = new EventTarget() as unknown as Document;
  const context = new FakeModelContext();
  Object.defineProperty(globals.document!, 'modelContext', { configurable: true, value: context });
  return {
    context,
    uninstall() {
      if (createdDocument) delete globals.document;
      else Reflect.deleteProperty(globals.document!, 'modelContext');
    },
  };
}
