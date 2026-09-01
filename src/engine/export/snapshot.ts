import type { ComponentSpec, ComponentType } from '@/types/components';
import type { RenderedPage } from '@/types/layouts';
import type { DesignRule } from '@/types/rules';
import type { TokenState } from '@/types/tokens';
import { useTokenStore } from '@/stores/tokenStore';
import { useComponentStore } from '@/stores/componentStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { useRuleStore } from '@/stores/ruleStore';
import { tokenToVars } from '@/engine/tokenToCss';

export type ExportFormat = 'css' | 'dtcg' | 'tailwind' | 'scss';
export const EXPORT_FORMATS: readonly ExportFormat[] = ['css', 'dtcg', 'tailwind', 'scss'] as const;

export type ExportScope = 'tokens' | 'components' | 'page' | 'everything';
export const EXPORT_SCOPES: readonly ExportScope[] = ['tokens', 'components', 'page', 'everything'] as const;

/**
 * Everything the exporters read. Passing a snapshot rather than reaching into stores keeps every
 * exporter a pure `(state) => ExportFile[]` function (Turn 6 §7.1) and makes them testable.
 */
export interface ExportSnapshot {
  tokens: TokenState;
  vars: Record<string, string>;
  components: ComponentSpec[];
  pages: RenderedPage[];
  rules: DesignRule[];
  productName: string;
  slug: string;
  exportedAt: number;
}

export const slugify = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'design-system';

/** PascalCase file/base name: 'pricing-card' → 'PricingCard'. */
export const pascal = (type: string): string =>
  type
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');

/** Component types actually present on the canvas or in a page (D-171). */
export function typesPresent(snap: ExportSnapshot): ComponentType[] {
  const seen = new Set<ComponentType>();
  for (const c of snap.components) seen.add(c.type);
  return [...seen];
}

/** Reads the live stores. Called from the export panel and from the `export_*` tools (D-175). */
export function collectExport(): ExportSnapshot {
  const tokens = useTokenStore.getState();
  const pages = useLayoutStore.getState().renderedPages;
  const productName = pages[0]?.title ?? 'Alternative Galaxy';
  return {
    tokens,
    vars: tokenToVars(tokens),
    components: useComponentStore.getState().list(),
    pages,
    rules: useRuleStore.getState().list(),
    productName,
    slug: slugify(productName),
    exportedAt: Date.now(),
  };
}
