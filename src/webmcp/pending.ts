/**
 * Boundary shims — the engine entry points Stream 3's tools call that other streams own
 * and that do not exist in the tree yet (§11.2: "Stream 3 stubs the call; it does not add
 * the function"). Each is `null` until its owner lands; every caller degrades to an
 * honest envelope instead of pretending to work.
 *
 * Integration (Stream 5) replaces each `null` with the real import and deletes this note.
 * Nothing else in `webmcp/` needs to change.
 *
 *   [boundary] need engine/layoutEngine.renderWireframe        — Stream 4 (render_page)
 *   [boundary] need engine/accessibilityAuditor.auditAccessibility — Stream 1 (audit_accessibility)
 *   [boundary] need engine/export/{css,dtcg,tailwind,scss,react,page,zip} — Stream 5 (export_*)
 *   [boundary] need engine/export/react.componentCode          — Stream 5 (get_component_code)
 *   [boundary] need layoutStore.setPageSections(pageId, sections) — store action, D-138
 */
import type { ComponentSpec } from '@/types/components';
import type { ExportFile } from '@/types/export';
import type { RenderedSection, Wireframe } from '@/types/layouts';
import type { TokenPath } from '@/types/tokens';

/** What `render_page` needs back: the page's sections and the real ComponentSpecs behind them (D-053). */
export interface WireframeRender {
  sections: RenderedSection[];
  specs: ComponentSpec[];
}

/** Turn 6 §6.2. Moves to engine/accessibilityAuditor.ts when Stream 1 lands. */
export interface AuditFinding {
  severity: 'error' | 'warning';
  rule: string;
  tokens: TokenPath[];
  componentId?: string;
  currentValue: string;
  requiredValue: string;
  fix: string;
}
export type AuditScope = 'all' | 'components' | 'current-page';
export const AUDIT_SCOPES: readonly AuditScope[] = ['all', 'components', 'current-page'] as const;

export type TokenExportFormat = 'css' | 'json' | 'tailwind' | 'scss';
export const TOKEN_EXPORT_FORMATS: readonly TokenExportFormat[] = ['css', 'json', 'tailwind', 'scss'] as const;

export const renderWireframe: ((wireframe: Wireframe, pageId: string) => WireframeRender) | null = null;

export const auditAccessibility: ((scope: AuditScope) => AuditFinding[]) | null = null;

export const exportTokens: ((formats: TokenExportFormat[]) => ExportFile[]) | null = null;
export const exportComponents: (() => ExportFile[]) | null = null;
export const exportPage: ((pageId: string) => ExportFile[]) | null = null;
export const exportFullSystem: (() => ExportFile[]) | null = null;

export const componentCode: ((spec: ComponentSpec) => { filename: string; code: string }) | null = null;

/**
 * D-138: removing a page component drops its id from the section that held it.
 * `layoutStore` has no action for that yet, so the id is left dangling and the section
 * renders as emptied. Returns whether the detach actually happened.
 */
export const detachComponentFromPage: ((pageId: string, componentId: string) => boolean) | null = null;

/** One line the tools use so the "not wired yet" answer reads the same everywhere. */
export const NOT_WIRED = (what: string, owner: string): string =>
  `${what} is not available in this build yet (${owner} lands it).`;
