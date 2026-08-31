import type { ComponentType } from '@/types/components';

export type SectionType =
  | 'navbar'
  | 'hero'
  | 'features'
  | 'pricing'
  | 'testimonials'
  | 'cta'
  | 'faq'
  | 'footer'
  | 'content'
  | 'gallery'
  | 'stats'
  | 'team';
export const SECTION_TYPES: readonly SectionType[] = [
  'navbar',
  'hero',
  'features',
  'pricing',
  'testimonials',
  'cta',
  'faq',
  'footer',
  'content',
  'gallery',
  'stats',
  'team',
] as const;

export type PageType =
  'landing' | 'pricing' | 'about' | 'contact' | 'blog-post' | 'dashboard' | 'onboarding' | 'settings';
export const PAGE_TYPES: readonly PageType[] = [
  'landing',
  'pricing',
  'about',
  'contact',
  'blog-post',
  'dashboard',
  'onboarding',
  'settings',
] as const;

export interface WireframeSection {
  id: string; // sec_xxxxxxxx
  type: SectionType;
  label: string; // shown in the gray box
  columns: number | null; // grid sections only; null = section default (Turn 5 table)
}

export interface Wireframe {
  id: string; // wf_xxxxxxxx
  pageType: PageType;
  title: string;
  sections: WireframeSection[]; // array order is display order (D-055)
  status: 'wireframe' | 'rendered';
  createdBy: 'human' | 'agent';
  createdAt: number;
}

export interface RenderedSection {
  sectionId: string; // WireframeSection.id
  type: SectionType;
  columns: number | null;
  componentIds: string[]; // components in componentStore with pageId === page.id (D-053)
}

export interface RenderedPage {
  id: string; // page_xxxxxxxx
  wireframeId: string;
  pageType: PageType;
  title: string;
  sections: RenderedSection[];
  createdAt: number;
}

/** Which component types a section produces; filled in Turn 5, typed here. */
export type SectionComponentMap = Record<
  SectionType,
  { component: ComponentType | 'block'; perColumn: boolean; defaultColumns: number | null }
>;
