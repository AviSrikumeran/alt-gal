import type { ExportFile } from '@/types/export';

/**
 * D-174/D-202: JSZip is a dynamic import so it never lands in the first-load bundle — the export
 * panel is the only thing that needs it, and only when the human clicks Download.
 */
export async function downloadZip(files: ExportFile[], slug: string): Promise<void> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  for (const file of files) zip.file(file.path, file.contents);
  const blob = await zip.generateAsync({ type: 'blob' });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug}-design-system.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
