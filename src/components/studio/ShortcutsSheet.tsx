'use client';
import { S } from './strings';

const ROWS: [string, string][] = [
  ['Cmd/Ctrl + Z', 'Undo the last reversible action'],
  ['Cmd/Ctrl + E', 'Open the export panel (phase 4)'],
  ['1 · 2 · 3', 'Desktop, tablet, mobile viewport'],
  ['D', 'Toggle the dark theme'],
  ['Esc', 'Deselect, or close a panel'],
  ['?', 'Show this sheet'],
];

export default function ShortcutsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="alt-sheet" role="dialog" aria-modal="true" aria-label={S.shortcutsTitle}>
      <div className="alt-sheet__panel">
        <h2 className="alt-panel__title">{S.shortcutsTitle}</h2>
        <dl className="alt-sheet__rows">
          {ROWS.map(([keys, what]) => (
            <div key={keys}>
              <dt className="alt-mono">{keys}</dt>
              <dd>{what}</dd>
            </div>
          ))}
        </dl>
        <button type="button" className="alt-btn" onClick={onClose} autoFocus>
          Close
        </button>
      </div>
    </div>
  );
}
