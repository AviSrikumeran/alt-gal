'use client';
import { useMemo, useState } from 'react';
import type { ExportFile } from '@/types/export';
import { useUIStore } from '@/stores/uiStore';
import type { ExportFormat, ExportScope } from '@/engine/export';
import { EXPORT_FORMATS, buildExport, collectExport, downloadZip, slugify, totalLines } from '@/engine/export';
import { S } from '@/components/studio/strings';
import { pushToast } from '@/components/studio/toastStore';
import FilePreview from './FilePreview';
import FileTree from './FileTree';
import './export.css';

const TABS: ExportScope[] = ['tokens', 'components', 'page', 'everything'];

/**
 * D-174 delivery, D-175 agent handoff. When an `export_*` tool runs, it stashes its files in
 * `uiStore.exportFiles` and opens this panel; the agent gets a summary, the human gets the code.
 * When the human opens it, the same exporters run here.
 */
export default function ExportPanel() {
  const open = useUIStore((s) => s.exportOpen);
  const setOpen = useUIStore((s) => s.setExportOpen);
  const stashed = useUIStore((s) => s.exportFiles);
  const setExportFiles = useUIStore((s) => s.setExportFiles);

  const [scope, setScope] = useState<ExportScope>('everything');
  const [formats, setFormats] = useState<ExportFormat[]>([...EXPORT_FORMATS]);
  const [selected, setSelected] = useState('');

  // Derived, not stored: `stashed` is what an `export_*` tool already built (D-175); otherwise the
  // human's tab and format choices are the whole input, so there is nothing to synchronise.
  const files: ExportFile[] = useMemo(
    () => (!open ? [] : (stashed ?? buildExport(collectExport(), scope, formats))),
    [open, stashed, scope, formats],
  );
  const current = files.find((f) => f.path === selected) ?? files[0];

  if (!open) return null;

  const close = () => {
    setOpen(false);
    setExportFiles(null);
  };

  const toggleFormat = (format: ExportFormat) =>
    setFormats((chosen) => {
      const next = new Set(chosen);
      if (next.has(format)) next.delete(format);
      else next.add(format);
      return EXPORT_FORMATS.filter((f) => next.has(f));
    });

  const download = () => {
    const name = slugify(collectExport().productName);
    void downloadZip(files, name).catch((error: unknown) =>
      pushToast({ message: `Download failed: ${String(error)}`, tone: 'warn' }),
    );
  };

  return (
    <div className="alt-modal" role="dialog" aria-modal="true" aria-label={S.exportTitle}>
      <div className="alt-modal__panel">
        <header className="alt-modal__head">
          <h2 className="alt-panel__title">{S.exportTitle}</h2>
          <div className="alt-group" role="tablist" aria-label="Export scope">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                className="alt-chip"
                data-active={scope === tab}
                aria-selected={scope === tab}
                onClick={() => {
                  setExportFiles(null);
                  setScope(tab);
                  setSelected('');
                }}
              >
                {S.exportTabs[tab]}
              </button>
            ))}
          </div>
          <button type="button" className="alt-btn" data-kind="ghost" onClick={close} aria-label="Close">
            ×
          </button>
        </header>

        {scope === 'tokens' && (
          <div className="alt-modal__formats">
            {EXPORT_FORMATS.map((format) => (
              <label key={format} className="alt-check">
                <input
                  type="checkbox"
                  checked={formats.includes(format)}
                  onChange={() => {
                    setExportFiles(null);
                    toggleFormat(format);
                  }}
                />
                {S.exportFormats[format]}
              </label>
            ))}
          </div>
        )}

        <div className="alt-modal__body">
          <FileTree files={files} selected={current?.path ?? ''} onSelect={setSelected} />
          <FilePreview file={current} />
        </div>

        <footer className="alt-modal__foot">
          <span className="alt-modal__count">
            {files.length} files · {totalLines(files)} lines
          </span>
          <button
            type="button"
            className="alt-btn"
            data-kind="primary"
            onClick={download}
            disabled={files.length === 0}
          >
            {S.exportDownload}
          </button>
        </footer>
      </div>
    </div>
  );
}
