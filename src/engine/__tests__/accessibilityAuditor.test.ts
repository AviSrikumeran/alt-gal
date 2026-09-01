import { beforeEach, describe, expect, it } from 'vitest';
import { auditAccessibility, auditSummary } from '@/engine/accessibilityAuditor';
import { useTokenStore } from '@/stores/tokenStore';
import { generatePalette, parseColor } from '@/utils/colorUtils';
import { paletteToValues } from '@/stores/tokenStore';

const tokens = () => useTokenStore.getState();

beforeEach(() => {
  tokens().reset();
});

const loadPalette = (primary: string) =>
  tokens().setMany(paletteToValues(generatePalette(parseColor(primary)!, 'analogous')));

describe('auditAccessibility (D-165)', () => {
  it('reports nothing about colors while every role is unset', () => {
    const colorFindings = auditAccessibility('all').filter((f) => f.tokens.some((t) => t.startsWith('color.')));
    expect(colorFindings).toHaveLength(0);
  });

  it('passes a generated palette on every text pair', () => {
    loadPalette('hsl(250, 84%, 60%)');
    const textFindings = auditAccessibility('all').filter((f) => f.rule.startsWith('Text contrast'));
    expect(textFindings).toHaveLength(0);
  });

  it('catches pale text on a pale background as an error', () => {
    tokens().setMany({
      'color.background': 'hsl(0, 0%, 100%)',
      'color.surface': 'hsl(0, 0%, 100%)',
      'color.text-primary': 'hsl(0, 0%, 88%)',
    });
    const findings = auditAccessibility('all');
    const pair = findings.find((f) => f.rule === 'Text contrast: text-primary on background');
    expect(pair?.severity).toBe('error');
    expect(pair?.requiredValue).toBe('4.5:1');
    expect(pair?.fix).toContain('color.text-primary');
  });

  it('reports the on-color a mid-blue primary cannot satisfy', () => {
    tokens().setToken('color.primary', 'hsl(220, 90%, 56%)');
    const finding = auditAccessibility('all').find((f) => f.rule.startsWith('On-color contrast'));
    expect(finding?.severity).toBe('error');
    expect(finding?.tokens).toEqual(['color.primary']);
  });

  it('warns on a low-contrast focus ring', () => {
    tokens().setMany({ 'color.primary': 'hsl(0, 0%, 96%)', 'color.background': 'hsl(0, 0%, 100%)' });
    expect(auditAccessibility('all').some((f) => f.rule === 'Focus ring contrast')).toBe(true);
  });

  it('grades the type scale at 12px', () => {
    tokens().setToken('fontSize.xs', '10');
    const finding = auditAccessibility('all').find((f) => f.rule === 'Type size: fontSize.xs');
    expect(finding?.severity).toBe('error');
    tokens().setToken('fontSize.xs', '13');
    expect(auditAccessibility('all').find((f) => f.rule === 'Type size: fontSize.xs')?.severity).toBe('warning');
    tokens().setToken('fontSize.xs', '14');
    expect(auditAccessibility('all').find((f) => f.rule === 'Type size: fontSize.xs')).toBeUndefined();
  });

  it('computes touch targets from the same tokens the dictionary uses', () => {
    const findings = auditAccessibility('all').filter((f) => f.rule.startsWith('Touch target'));
    // Defaults: sm = 2x8 + 14x1.2 = 32.8, md = 2x12 + 16x1.2 = 43.2, lg = 2x16 + 18x1.2 = 53.6.
    expect(findings.map((f) => f.rule)).toEqual(['Touch target: sm controls', 'Touch target: md controls']);
    expect(findings[0]?.currentValue).toBe('32.8px');
    expect(findings[0]?.fix).toContain('spacing.unit to 5');

    // The fix the agent is told to relay actually works.
    tokens().setToken('spacing.unit', '6');
    expect(auditAccessibility('all').some((f) => f.rule === 'Touch target: md controls')).toBe(false);
  });

  it('sorts errors before warnings and never mutates', () => {
    tokens().setMany({
      'color.background': 'hsl(0, 0%, 100%)',
      'color.surface': 'hsl(0, 0%, 100%)',
      'color.text-primary': 'hsl(0, 0%, 88%)',
    });
    const before = JSON.stringify(tokens().getTokenMap());
    const findings = auditAccessibility('all');
    const firstWarning = findings.findIndex((f) => f.severity === 'warning');
    const lastError = findings.map((f) => f.severity).lastIndexOf('error');
    expect(lastError).toBeLessThan(firstWarning);
    expect(JSON.stringify(tokens().getTokenMap())).toBe(before);
  });

  it('summarizes for the tool envelope', () => {
    loadPalette('hsl(250, 84%, 60%)');
    const summary = auditSummary(auditAccessibility('all'));
    expect(summary.errors + summary.warnings).toBe(summary.findings.length);
  });
});
