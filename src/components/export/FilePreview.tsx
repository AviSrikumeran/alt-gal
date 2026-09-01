'use client';
import { useState } from 'react';
import type { ExportFile } from '@/types/export';
import { highlight } from '@/engine/export';
import { S } from '@/components/studio/strings';

/** D-174: a regex highlighter, no highlighting dependency. */
export default function FilePreview({ file }: { file: ExportFile | undefined }) {
  const [copied, setCopied] = useState(false);
  if (!file) return <div className="alt-preview" />;

  const copy = () => {
    void navigator.clipboard?.writeText(file.contents);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="alt-preview">
      <div className="alt-preview__head">
        <span className="alt-mono">{file.path}</span>
        <button type="button" className="alt-btn" data-kind="ghost" onClick={copy}>
          {copied ? S.exportCopied : S.exportCopy}
        </button>
      </div>
      <pre className="alt-preview__code alt-mono">
        <code dangerouslySetInnerHTML={{ __html: highlight(file.contents, file.language) }} />
      </pre>
    </div>
  );
}
