import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COMPONENT_TYPES } from '@/types/components';
import { buildExport } from '@/engine/export';
import { exportComponent } from '@/engine/export/react';
import { SNAPSHOT } from './fixtures/exportSnapshot';

/**
 * Writes the fixture export to `$ALT_EXPORT_OUT` so `scripts/verify-export.sh` can run
 * `tsc --noEmit` over the generated TSX (D-198). All sixteen component templates are emitted, not
 * just the two the fixture uses, so every one of them is compiled on every run.
 * Skipped unless that variable is set, so a normal `pnpm test` never touches the filesystem.
 */
const outDir = process.env.ALT_EXPORT_OUT;

describe('export emitter', () => {
  it.runIf(!!outDir)('writes the fixture export to disk', () => {
    const files = [
      ...buildExport(SNAPSHOT, 'everything'),
      ...COMPONENT_TYPES.map((type) => exportComponent(type, SNAPSHOT.productName)),
    ];
    for (const file of files) {
      const target = join(outDir!, file.path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, file.contents);
    }
    const written = new Set(files.filter((f) => f.path.startsWith('components/')).map((f) => f.path));
    expect(written.size).toBe(COMPONENT_TYPES.length);
  });
});
