import type { TokenPath } from '@/types/tokens';

export type ComponentType =
  | 'button'
  | 'card'
  | 'input'
  | 'textarea'
  | 'select'
  | 'toggle'
  | 'badge'
  | 'avatar'
  | 'navbar'
  | 'hero'
  | 'pricing-card'
  | 'feature-grid'
  | 'footer'
  | 'modal'
  | 'toast'
  | 'accordion';

export const COMPONENT_TYPES: readonly ComponentType[] = [
  'button',
  'card',
  'input',
  'textarea',
  'select',
  'toggle',
  'badge',
  'avatar',
  'navbar',
  'hero',
  'pricing-card',
  'feature-grid',
  'footer',
  'modal',
  'toast',
  'accordion',
] as const;

export type ComponentVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export const COMPONENT_VARIANTS: readonly ComponentVariant[] = [
  'primary',
  'secondary',
  'ghost',
  'danger',
  'outline',
] as const;

export type ComponentSize = 'sm' | 'md' | 'lg';
export const COMPONENT_SIZES: readonly ComponentSize[] = ['sm', 'md', 'lg'] as const;

/** Interactive states expressed in library.css via [data-state] (D-063). */
export type ComponentState = 'default' | 'hover' | 'focus' | 'disabled' | 'loading' | 'error';

/** Typed content slots per component type (D-051, D-052). All fields required; defaults fill gaps. */
export interface ComponentContentMap {
  button: { label: string };
  card: { title: string; body: string; ctaLabel: string | null };
  input: { label: string; placeholder: string; helper: string | null; error: string | null };
  textarea: { label: string; placeholder: string; helper: string | null; error: string | null };
  select: { label: string; placeholder: string; options: string[] };
  toggle: { label: string; checked: boolean };
  badge: { label: string };
  avatar: { initials: string; name: string };
  navbar: { brand: string; links: string[]; ctaLabel: string };
  hero: { headline: string; subtitle: string; primaryCta: string; secondaryCta: string | null };
  'pricing-card': {
    tier: string;
    price: string;
    period: string;
    features: string[];
    ctaLabel: string;
    featured: boolean;
  };
  'feature-grid': { items: { title: string; body: string }[]; columns: 2 | 3 | 4 };
  footer: { brand: string; columns: { heading: string; links: string[] }[]; copyright: string };
  modal: { title: string; body: string; confirmLabel: string; cancelLabel: string };
  toast: { message: string };
  accordion: { items: { question: string; answer: string }[] };
}

export type ComponentContent<T extends ComponentType = ComponentType> = ComponentContentMap[T];

export interface ComponentSpec<T extends ComponentType = ComponentType> {
  id: string; // comp_xxxxxxxx
  type: T;
  variant: ComponentVariant;
  size: ComponentSize;
  content: ComponentContentMap[T];
  pageId: string | null; // D-053: set when created by render_page
  sectionId: string | null;
  createdBy: 'human' | 'agent';
  createdAt: number; // Unix ms
}

export interface ComponentSummary {
  id: string;
  type: ComponentType;
  variant: ComponentVariant;
  size: ComponentSize;
  label: string | null; // primary text slot, per contentFromInput's mapping
  pageId: string | null;
}

/** One row of explain_component / export. */
export interface TokenMapping {
  part: string; // 'root' | 'label' | 'title' | …
  cssProperty: string; // 'background-color'
  token: TokenPath; // 'color.primary'
  cssVar: string; // '--color-primary'
  resolvedValue: string | null; // current value or null if unset
}

/** Props every library component accepts. Nothing else (D-062, D-069). */
export interface LibraryComponentProps {
  spec: ComponentSpec;
  selected?: boolean;
}

/** Flat generate_component input (D-075). */
export interface GenerateComponentInput {
  type: ComponentType;
  variant?: ComponentVariant;
  size?: ComponentSize;
  label?: string;
  description?: string;
  items?: string[];
}
