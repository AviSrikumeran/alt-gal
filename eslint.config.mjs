import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

/** D-050 is enforced mechanically here (D-197): only these directories may import phaseStore. */
const PHASE_STORE_ALLOWED = [
  'src/webmcp/**',
  'src/components/studio/**',
  'src/components/canvas/**',
  'src/stores/phaseStore.ts',
  'src/stores/logStore.ts', // D-083: call-time read when stamping entries
  // D-223: the one declarative tool lives in the token panel (D-029) but still has to stamp a
  // ToolResult envelope, and `phase` is a required field of that envelope. One file, not the dir.
  'src/components/tokens/PrimaryColorForm.tsx',
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../../*'],
              message: 'D-036: import with @/ from any other directory; relative imports are for siblings only.',
            },
            {
              group: ['@/stores/phaseStore'],
              message:
                'D-050: phaseStore is importable only from webmcp/**, components/studio/**, components/canvas/**.',
            },
          ],
        },
      ],
    },
  },
  {
    files: PHASE_STORE_ALLOWED,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../../*'],
              message: 'D-036: import with @/ from any other directory; relative imports are for siblings only.',
            },
          ],
        },
      ],
    },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'alt-gal-docs/**']),
]);

export default eslintConfig;
