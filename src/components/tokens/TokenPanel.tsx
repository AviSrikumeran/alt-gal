'use client';
/**
 * The 280px left panel: six collapsible sections in the order of Turn 5 §5.2, open/closed state in
 * uiStore (D-145). Colors, Typography, and Rules start open because those are the three a first
 * visit touches; Spacing, Elevation, and Motion start closed because they have good defaults.
 */
import { useRef } from 'react';
import { auditAccessibility } from '@/engine/accessibilityAuditor';
import type { AuditFinding } from '@/engine/accessibilityAuditor';
import { useState } from 'react';
import { FONT_CATALOG } from '@/utils/fonts';
import { Section } from './_controls';
import './tokens.css';
import AnimationTokenEditor from './AnimationTokenEditor';
import ColorTokenEditor from './ColorTokenEditor';
import ElevationTokenEditor from './ElevationTokenEditor';
import PrimaryColorForm from './PrimaryColorForm';
import RadiusTokenEditor from './RadiusTokenEditor';
import RuleEditor from './RuleEditor';
import SpacingTokenEditor from './SpacingTokenEditor';
import TypographyTokenEditor from './TypographyTokenEditor';

export default function TokenPanel() {
  const prefetched = useRef(false);
  const [findings, setFindings] = useState<AuditFinding[] | null>(null);

  /** D-122: the dropdown previews render in their own faces, so warm all 13 on first hover. */
  const prefetchFonts = () => {
    if (prefetched.current || typeof document === 'undefined' || !document.fonts) return;
    prefetched.current = true;
    for (const font of FONT_CATALOG) void document.fonts.load(`400 15px '${font.family}'`);
  };

  return (
    <aside className="tk-panel" aria-label="Tokens">
      <h2 className="tk-panel-title">Tokens</h2>

      <Section id="colors" title="Colors">
        <PrimaryColorForm />
        <ColorTokenEditor />
      </Section>

      <div onMouseEnter={prefetchFonts}>
        <Section id="typography" title="Typography">
          <TypographyTokenEditor />
        </Section>
      </div>

      <Section id="spacing" title="Spacing &amp; radius">
        <SpacingTokenEditor />
        <RadiusTokenEditor />
      </Section>

      <Section id="elevation" title="Elevation">
        <ElevationTokenEditor />
      </Section>

      <Section id="motion" title="Motion">
        <AnimationTokenEditor />
      </Section>

      <Section
        id="rules"
        title="Rules"
        actions={
          // D-189: the audit has a human path too, so nothing here is agent-only.
          <button
            type="button"
            className="tk-button tk-button-quiet"
            onClick={() => setFindings(auditAccessibility('all'))}
          >
            Run audit
          </button>
        }
      >
        <RuleEditor />
        {findings ? <AuditResults findings={findings} onDismiss={() => setFindings(null)} /> : null}
      </Section>
    </aside>
  );
}

function AuditResults({ findings, onDismiss }: { findings: AuditFinding[]; onDismiss(): void }) {
  return (
    <div className="tk-audit" role="status" aria-label="Audit results">
      <div className="tk-audit-head">
        <span>
          {findings.filter((f) => f.severity === 'error').length} errors ·{' '}
          {findings.filter((f) => f.severity === 'warning').length} warnings
        </span>
        <button type="button" className="tk-icon-button" aria-label="Dismiss audit" onClick={onDismiss}>
          ×
        </button>
      </div>
      {findings.length === 0 ? (
        <p className="tk-hint">Nothing to fix.</p>
      ) : (
        <ul className="tk-audit-list">
          {findings.map((f, i) => (
            <li key={`${f.rule}-${i}`} className="tk-audit-item" data-severity={f.severity}>
              <span className="tk-audit-rule">{f.rule}</span>
              <span className="tk-audit-value">
                {f.currentValue} · needs {f.requiredValue}
              </span>
              <span className="tk-audit-fix">{f.fix}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
