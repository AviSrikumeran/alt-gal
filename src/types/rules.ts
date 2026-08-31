import type { ComponentType } from '@/types/components';

export type RuleType =
  | 'color-restriction'
  | 'contrast-minimum'
  | 'size-restriction'
  | 'spacing-restriction'
  | 'component-restriction'
  | 'custom';
export const RULE_TYPES: readonly RuleType[] = [
  'color-restriction',
  'contrast-minimum',
  'size-restriction',
  'spacing-restriction',
  'component-restriction',
  'custom',
] as const;

/** Resolvable properties. The rule engine knows how to read each from a spec + tokens (Turn 6). */
export type RuleProperty =
  | 'variant'
  | 'size'
  | 'type'
  | 'background-color'
  | 'color'
  | 'border-radius'
  | 'font-size'
  | 'min-height'
  | 'contrast';
export const RULE_PROPERTIES: readonly RuleProperty[] = [
  'variant',
  'size',
  'type',
  'background-color',
  'color',
  'border-radius',
  'font-size',
  'min-height',
  'contrast',
] as const;

export type RuleOperator = 'equals' | 'not-equals' | 'min' | 'max' | 'not-contains' | 'hue-not-in';
export const RULE_OPERATORS: readonly RuleOperator[] = [
  'equals',
  'not-equals',
  'min',
  'max',
  'not-contains',
  'hue-not-in',
] as const;

export interface RuleCondition {
  target: ComponentType | 'all';
  property: RuleProperty;
  operator: RuleOperator;
  value: string; // 'danger' | '8' | '4.5' | '350-10' (hue range, wraps)
}

export interface DesignRule {
  id: string; // rule_xxxxxxxx
  type: RuleType;
  description: string; // plain language, shown in UI and to the agent
  condition: RuleCondition;
  enabled: boolean;
  createdBy: 'human' | 'agent';
  createdAt: number;
}

export interface RuleViolation {
  ruleId: string;
  ruleDescription: string;
  componentId: string | null; // null when evaluating a not-yet-created spec
  property: RuleProperty;
  currentValue: string;
  message: string;
  alternatives: string[]; // what would pass, when computable
}
