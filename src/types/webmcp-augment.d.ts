// Fills the gaps in webmcp-types@0.1.5 (no executeTool, loose event map).
// Ambient file: no imports/exports.
declare namespace WebMCP {
  interface ModelContextExecuteToolOptions {
    signal?: AbortSignal;
  }
  interface ModelContext {
    /** Chromium extension. Input is a JSON *string* on Chrome ≤152 (webmcp#243 moves to object). Feature-detect. */
    executeTool?(
      tool: RegisteredTool,
      inputArguments: string | Record<string, unknown>,
      options?: ModelContextExecuteToolOptions,
    ): Promise<string | null>;
  }
}
