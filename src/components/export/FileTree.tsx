'use client';
import type { ExportFile } from '@/types/export';

const bytes = (n: number): string => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`);

/** Groups by first path segment so the tree reads `tokens/ components/ pages/` plus loose files. */
export default function FileTree({
  files,
  selected,
  onSelect,
}: {
  files: ExportFile[];
  selected: string;
  onSelect: (path: string) => void;
}) {
  const groups = new Map<string, ExportFile[]>();
  for (const file of files) {
    const slash = file.path.indexOf('/');
    const key = slash === -1 ? '' : file.path.slice(0, slash);
    const bucket = groups.get(key);
    if (bucket) bucket.push(file);
    else groups.set(key, [file]);
  }

  return (
    <nav className="alt-tree" aria-label="Exported files">
      {[...groups.entries()].map(([dir, list]) => (
        <div key={dir || '.'} className="alt-tree__group">
          {dir && <p className="alt-tree__dir alt-mono">{dir}/</p>}
          <ul>
            {list.map((file) => (
              <li key={file.path}>
                <button
                  type="button"
                  className="alt-tree__file"
                  data-active={file.path === selected}
                  onClick={() => onSelect(file.path)}
                >
                  <span className="alt-mono">{dir ? file.path.slice(dir.length + 1) : file.path}</span>
                  <span className="alt-tree__size">{bytes(file.contents.length)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
