import type { ComponentSize, ComponentSpec } from '@/types/components';
import type { SemanticColorRole, TokenPath, TypeScaleKey } from '@/types/tokens';
import { SEMANTIC_COLOR_ROLES, ON_COLOR_ROLES } from '@/types/tokens';
import { contrastRatio, onColor, parseColor } from '@/utils/colorUtils';
import { UNSET_COLOR } from '@/utils/defaults';
import { useTokenStore } from '@/stores/tokenStore';
import { useComponentStore } from '@/stores/componentStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { getTokenMapping } from '@/engine/componentRenderer';

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

const ROLE_LABEL: Record<SemanticColorRole, string> = {
  primary: 'primary',
  secondary: 'secondary',
  accent: 'accent',
  danger: 'danger',
  warning: 'warning',
  success: 'success',
  muted: 'muted',
  background: 'background',
  surface: 'surface',
  'text-primary': 'text-primary',
  'text-secondary': 'text-secondary',
  'text-muted': 'text-muted',
  border: 'border',
};

/** 4.5 for body text, 3 for the tertiary/large-text pairs (D-165 check 1). */
const TEXT_PAIRS: { fg: SemanticColorRole; bg: SemanticColorRole; min: number }[] = [
  { fg: 'text-primary', bg: 'background', min: 4.5 },
  { fg: 'text-primary', bg: 'surface', min: 4.5 },
  { fg: 'text-secondary', bg: 'background', min: 4.5 },
  { fg: 'text-secondary', bg: 'surface', min: 4.5 },
  { fg: 'text-muted', bg: 'background', min: 3 },
  { fg: 'text-muted', bg: 'surface', min: 3 },
];

/** Reported once per size, not once per component (D-165 check 5). */
const SIZE_PAD: Record<ComponentSize, { block: number; text: TypeScaleKey }> = {
  sm: { block: 2, text: 'sm' },
  md: { block: 3, text: 'base' },
  lg: { block: 4, text: 'md' },
};

const round = (n: number): number => Math.round(n * 100) / 100;

/**
 * Reads tokens and components and reports WCAG 2.1 AA findings, errors first (D-165).
 * Never mutates and never auto-fixes: `fix` is a sentence the agent relays or acts on with set_token.
 */
export function auditAccessibility(scope: AuditScope = 'all'): AuditFinding[] {
  const tokens = useTokenStore.getState();
  const colors = tokens.colors;
  const findings: AuditFinding[] = [];

  // 1 — text pairs. A pair with a null side is skipped, not reported: an unset token is not a failure.
  for (const { fg, bg, min } of TEXT_PAIRS) {
    const f = colors[fg];
    const b = colors[bg];
    if (!f || !b) continue;
    const ratio = contrastRatio(f, b);
    if (ratio >= min) continue;
    findings.push({
      severity: min >= 4.5 ? 'error' : 'warning',
      rule: `Text contrast: ${ROLE_LABEL[fg]} on ${ROLE_LABEL[bg]}`,
      tokens: [`color.${fg}`, `color.${bg}`],
      currentValue: `${ratio}:1`,
      requiredValue: `${min}:1`,
      fix:
        min >= 4.5
          ? `Darken color.${fg} or lighten color.${bg} until the pair reaches ${min}:1.`
          : `Darken color.${fg} until it reaches ${min}:1 on color.${bg}. ${min}:1 assumes this text is only used at 18px or larger.`,
    });
  }

  // 2 — derived on-colors (D-046) against their role.
  for (const role of ON_COLOR_ROLES) {
    const value = colors[role];
    if (!value) continue;
    const base = parseColor(value);
    if (!base) continue;
    const ratio = contrastRatio(onColor(base), value);
    if (ratio >= 4.5) continue;
    findings.push({
      severity: 'error',
      rule: `On-color contrast: text on ${ROLE_LABEL[role]}`,
      tokens: [`color.${role}`],
      currentValue: `${ratio}:1`,
      requiredValue: '4.5:1',
      fix: `Lighten color.${role} to at least 62% or darken it to at most 38% so its text passes.`,
    });
  }

  // 3 — focus ring. Focus rings are drawn in primary (D-092).
  if (colors.primary && colors.background) {
    const ratio = contrastRatio(colors.primary, colors.background);
    if (ratio < 3) {
      findings.push({
        severity: 'warning',
        rule: 'Focus ring contrast',
        tokens: ['color.primary', 'color.background'],
        currentValue: `${ratio}:1`,
        requiredValue: '3:1',
        fix: "Focus rings use primary; move it further from the background's lightness.",
      });
    }
  }

  // 4 — type scale.
  for (const [key, px] of Object.entries(tokens.typography.scale)) {
    if (px >= 14) continue;
    findings.push({
      severity: px < 12 ? 'error' : 'warning',
      rule: `Type size: fontSize.${key}`,
      tokens: [`fontSize.${key}` as TokenPath],
      currentValue: `${px}px`,
      requiredValue: '12px',
      fix: `Raise fontSize.${key} to 12px.`,
    });
  }

  // 5 — touch targets: 2·padding-block + font-size × tight line height, per size actually in use.
  const unit = tokens.spacing.unit;
  const tight = tokens.typography.lineHeights.tight;
  const sizesInScope = scope === 'all' ? (['sm', 'md', 'lg'] as const) : sizesPresent(scope);
  for (const size of sizesInScope) {
    const pad = SIZE_PAD[size];
    const height = 2 * pad.block * unit + tokens.typography.scale[pad.text] * tight;
    if (height >= 44) continue;
    findings.push({
      severity: 'warning',
      rule: `Touch target: ${size} controls`,
      tokens: ['spacing.unit', `fontSize.${pad.text}`],
      currentValue: `${round(height)}px`,
      requiredValue: '44px',
      fix: 'Use size lg for primary actions, or raise spacing.unit to 5.',
    });
  }

  // 6 — per-component root contrast, resolved through the unset sentinels (D-109).
  if (scope !== 'all') {
    for (const spec of specsInScope(scope)) {
      const finding = componentContrast(spec);
      if (finding) findings.push(finding);
    }
  }

  return findings.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1));
}

function specsInScope(scope: Exclude<AuditScope, 'all'>): ComponentSpec[] {
  const all = useComponentStore.getState().list();
  if (scope === 'components') return all;
  const page = useLayoutStore.getState().getActivePage();
  if (!page) return [];
  const ids = new Set(page.sections.flatMap((s) => s.componentIds));
  return all.filter((c) => ids.has(c.id));
}

function sizesPresent(scope: Exclude<AuditScope, 'all'>): ComponentSize[] {
  return [...new Set(specsInScope(scope).map((s) => s.size))];
}

/** Root `color` on root `background-color`, both resolved through the token map. */
function componentContrast(spec: ComponentSpec): AuditFinding | null {
  const mapping = getTokenMapping(spec);
  const at = (property: string): { token: TokenPath; value: string } | null => {
    const row = mapping.find((m) => m.part === 'root' && m.cssProperty === property);
    if (!row) return null;
    const role = row.token.startsWith('color.') ? (row.token.slice('color.'.length) as SemanticColorRole) : null;
    const value = row.resolvedValue ?? (role ? UNSET_COLOR[role] : null);
    return value ? { token: row.token, value } : null;
  };
  const fg = at('color');
  const bg = at('background-color');
  if (!fg || !bg) return null;
  const ratio = contrastRatio(fg.value, bg.value);
  if (ratio >= 4.5) return null;
  return {
    severity: 'error',
    rule: `Component contrast: ${spec.type} (${spec.variant})`,
    tokens: [fg.token, bg.token],
    componentId: spec.id,
    currentValue: `${ratio}:1`,
    requiredValue: '4.5:1',
    fix: `Change ${bg.token} or ${fg.token} so ${spec.type} text reaches 4.5:1.`,
  };
}

/** The shape `audit_accessibility.data` carries (Turn 6 §6.2). */
export function auditSummary(findings: AuditFinding[]): {
  findings: AuditFinding[];
  errors: number;
  warnings: number;
} {
  return {
    findings,
    errors: findings.filter((f) => f.severity === 'error').length,
    warnings: findings.filter((f) => f.severity === 'warning').length,
  };
}

/** Roles the audit can reason about at all — used by the panel to explain an empty result. */
export const AUDITABLE_ROLES: readonly SemanticColorRole[] = SEMANTIC_COLOR_ROLES;
