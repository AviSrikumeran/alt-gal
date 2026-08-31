export type Phase = 0 | 1 | 2 | 3 | 4;

export interface PhaseDefinition {
  phase: Phase;
  name: string;
  description: string;
  requirement: string; // what unlocks the NEXT phase; '' for phase 4
}

export const PHASE_DEFINITIONS: readonly PhaseDefinition[] = [
  {
    phase: 0,
    name: 'Empty',
    description: 'No tokens yet. Set a primary color to begin.',
    requirement: 'Define 1 token.',
  },
  {
    phase: 1,
    name: 'Tokens',
    description: 'Tokens are being defined. Components unlock at five.',
    requirement: 'Define 5 tokens including primary, background, and text-primary.',
  },
  {
    phase: 2,
    name: 'Components',
    description: 'Components can be generated from your tokens.',
    requirement: 'Have 2 components on the canvas.',
  },
  {
    phase: 3,
    name: 'Layout',
    description: 'Pages can be sketched as wireframes and rendered.',
    requirement: 'Render 1 page.',
  },
  {
    phase: 4,
    name: 'Export',
    description: 'The system is complete. Export tokens, components, and pages as code.',
    requirement: '',
  },
] as const;

export interface NextPhaseInfo {
  phase: Phase;
  requirement: string;
  missing: string[]; // specific unmet items, e.g. ['2 more tokens', 'color.background']
}
