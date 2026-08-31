import type { ComponentSpec } from '@/types/components';
import type { DesignRule, RuleViolation } from '@/types/rules';

/** Evaluate one spec against enabled rules. componentId may be null for a pre-creation check. */
export function evaluateSpec(spec: ComponentSpec, rules: DesignRule[]): RuleViolation[] {
  /* STREAM 2: implement */ return [];
}
/** All components in componentStore against all enabled rules. */
export function evaluateAll(): RuleViolation[] {
  /* STREAM 2: implement */ return [];
}
