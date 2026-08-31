export type SemanticColorRole =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'danger'
  | 'warning'
  | 'success'
  | 'muted'
  | 'background'
  | 'surface'
  | 'text-primary'
  | 'text-secondary'
  | 'text-muted'
  | 'border';

export const SEMANTIC_COLOR_ROLES: readonly SemanticColorRole[] = [
  'primary',
  'secondary',
  'accent',
  'danger',
  'warning',
  'success',
  'muted',
  'background',
  'surface',
  'text-primary',
  'text-secondary',
  'text-muted',
  'border',
] as const;

/** Roles that receive a derived on-color (D-046). */
export const ON_COLOR_ROLES: readonly SemanticColorRole[] = [
  'primary',
  'secondary',
  'accent',
  'danger',
  'warning',
  'success',
] as const;

export type FontFamilyKey = 'heading' | 'body' | 'mono';
export type TypeScaleKey = 'xs' | 'sm' | 'base' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
export type FontWeightKey = 'light' | 'regular' | 'medium' | 'semibold' | 'bold';
export type LineHeightKey = 'tight' | 'normal' | 'relaxed';
export type SpacingStep = '1' | '2' | '3' | '4' | '5' | '6' | '8' | '10' | '12' | '16';
/** 'unit' is the only human-editable spacing token; the steps are derived (unit x multiplier). D-082, D-213. */
export type SpacingKey = 'unit' | SpacingStep;
export type RadiusKey = 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type ElevationKey = 'none' | 'sm' | 'md' | 'lg' | 'xl';
export type AnimationKey =
  'durationFast' | 'durationNormal' | 'durationSlow' | 'easingDefault' | 'easingIn' | 'easingOut';

export type TokenGroup =
  'color' | 'font' | 'fontSize' | 'fontWeight' | 'lineHeight' | 'spacing' | 'radius' | 'elevation' | 'animation';

/** Dotted token identity (D-044). */
export type TokenPath =
  | `color.${SemanticColorRole}`
  | `font.${FontFamilyKey}`
  | `fontSize.${TypeScaleKey}`
  | `fontWeight.${FontWeightKey}`
  | `lineHeight.${LineHeightKey}`
  | `spacing.${SpacingKey}`
  | `radius.${RadiusKey}`
  | `elevation.${ElevationKey}`
  | `animation.${AnimationKey}`;

export const TOKEN_PATHS: readonly TokenPath[] = [
  ...SEMANTIC_COLOR_ROLES.map((r) => `color.${r}` as const),
  'font.heading',
  'font.body',
  'font.mono',
  'fontSize.xs',
  'fontSize.sm',
  'fontSize.base',
  'fontSize.md',
  'fontSize.lg',
  'fontSize.xl',
  'fontSize.2xl',
  'fontSize.3xl',
  'fontSize.4xl',
  'fontWeight.light',
  'fontWeight.regular',
  'fontWeight.medium',
  'fontWeight.semibold',
  'fontWeight.bold',
  'lineHeight.tight',
  'lineHeight.normal',
  'lineHeight.relaxed',
  'spacing.unit',
  'radius.none',
  'radius.sm',
  'radius.md',
  'radius.lg',
  'radius.xl',
  'radius.full',
  'elevation.none',
  'elevation.sm',
  'elevation.md',
  'elevation.lg',
  'elevation.xl',
  'animation.durationFast',
  'animation.durationNormal',
  'animation.durationSlow',
  'animation.easingDefault',
  'animation.easingIn',
  'animation.easingOut',
];

/** set_token's `category` enum → TokenGroup. */
export const CATEGORY_TO_GROUP: Record<string, TokenGroup> = {
  color: 'color',
  'font-family': 'font',
  'font-size': 'fontSize',
  'font-weight': 'fontWeight',
  'line-height': 'lineHeight',
  'spacing-unit': 'spacing',
  radius: 'radius',
  elevation: 'elevation',
  'animation-duration': 'animation',
  'animation-easing': 'animation',
};
export const TOKEN_CATEGORIES = Object.keys(CATEGORY_TO_GROUP);

export interface TokenState {
  colors: Record<SemanticColorRole, string | null>; // normalized 'hsl(H, S%, L%)' (D-080)
  dark: Record<SemanticColorRole, string | null> | null; // D-057
  typography: {
    families: Record<FontFamilyKey, string>; // bare family names (D-066)
    scale: Record<TypeScaleKey, number>; // px
    weights: Record<FontWeightKey, number>;
    lineHeights: Record<LineHeightKey, number>;
  };
  spacing: { unit: number; scale: readonly number[] }; // scale fixed: [1,2,3,4,5,6,8,10,12,16] (D-082)
  radius: Record<RadiusKey, number>; // px
  elevation: Record<ElevationKey, string>; // CSS box-shadow
  animation: Record<AnimationKey, number | string>; // durations ms (number), easings string
  touched: TokenPath[]; // non-default, non-color paths (D-047)
  locked: TokenPath[]; // D-056
}

/** Flat view used by tools and export. */
export type TokenMap = Record<TokenPath, string | null>;

export type Actor = 'human' | 'agent';
