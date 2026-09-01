#!/usr/bin/env bash
# D-198 / §11.2 isolation test: the TSX this studio exports has to compile in someone else's app.
# Emits the fixture export into a scratch directory, points a consumer-shaped tsconfig at it, and
# runs `tsc --noEmit`. Token files are excluded: tailwind.config.ts imports tailwindcss, which a
# consumer installs and this repo does not (D-073).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT

echo "→ emitting the fixture export into $OUT"
ALT_EXPORT_OUT="$OUT" "$ROOT/node_modules/.bin/vitest" run src/engine/__tests__/emitExport.test.ts

ln -s "$ROOT/node_modules" "$OUT/node_modules"
cat > "$OUT/tsconfig.json" <<'JSON'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "jsx": "react-jsx",
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "isolatedModules": true
  },
  "include": ["components/**/*.tsx", "pages/**/*.tsx"]
}
JSON

echo "→ type-checking the generated components and pages"
"$ROOT/node_modules/.bin/tsc" --noEmit -p "$OUT/tsconfig.json"
echo "✓ exported TSX compiles"
