/** Every exporter is a pure function `(state) => ExportFile[]` (Turn 6 §7.1, D-211). */
export interface ExportFile {
  path: string;
  contents: string;
  language: 'css' | 'json' | 'ts' | 'tsx' | 'scss' | 'md';
}
