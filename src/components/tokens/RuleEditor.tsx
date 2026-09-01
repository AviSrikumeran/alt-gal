'use client';
/**
 * The rules the human sets and the agent must obey (D-113, D-116). Existing components that violate
 * a rule are flagged, never removed — enforcement where the agent acts, information where the human
 * already decided. The badge count comes from the rule engine, not from this component.
 */
import { useEffect, useState } from 'react';
import type { ComponentType } from '@/types/components';
import { COMPONENT_TYPES } from '@/types/components';
import type { DesignRule, RuleCondition, RuleOperator, RuleProperty, RuleType } from '@/types/rules';
import { RULE_OPERATORS, RULE_PROPERTIES } from '@/types/rules';
import { generateId } from '@/utils/idGenerator';
import { useRuleStore } from '@/stores/ruleStore';
import { evaluateAll } from '@/engine/ruleEngine';
import { useUIStore } from '@/stores/uiStore';
import { commitHuman } from '@/engine/commit';

interface Preset {
  label: string;
  type: RuleType;
  description: string;
  condition: RuleCondition;
}

/** D-113. These five are also the examples cited in `add_rule`'s description. */
const PRESETS: readonly Preset[] = [
  {
    label: 'No danger buttons',
    type: 'component-restriction',
    description: 'No danger buttons',
    condition: { target: 'button', property: 'variant', operator: 'not-equals', value: 'danger' },
  },
  {
    label: 'No red primaries',
    type: 'color-restriction',
    description: 'No red primaries',
    condition: { target: 'all', property: 'background-color', operator: 'hue-not-in', value: '345-15' },
  },
  {
    label: 'Minimum radius 8px',
    type: 'size-restriction',
    description: 'Minimum radius 8px',
    condition: { target: 'all', property: 'border-radius', operator: 'min', value: '8' },
  },
  {
    label: 'Text contrast at least 4.5:1',
    type: 'contrast-minimum',
    description: 'Text contrast at least 4.5:1',
    condition: { target: 'all', property: 'contrast', operator: 'min', value: '4.5' },
  },
  {
    label: 'Touch targets at least 44px',
    type: 'size-restriction',
    description: 'Touch targets at least 44px',
    condition: { target: 'button', property: 'min-height', operator: 'min', value: '44' },
  },
];

export default function RuleEditor() {
  const rules = useRuleStore((s) => s.rules);
  const setPanelSection = useUIStore((s) => s.setPanelSection);
  const [adding, setAdding] = useState(false);
  const violations = evaluateAll();

  // D-145: the Rules section opens itself the first time a rule exists.
  useEffect(() => {
    if (rules.length === 1) setPanelSection('rules', true);
  }, [rules.length, setPanelSection]);

  const addRule = (type: RuleType, description: string, condition: RuleCondition) => {
    const rule: DesignRule = {
      id: generateId('rule'),
      type,
      description,
      condition,
      enabled: true,
      createdBy: 'human',
      createdAt: Date.now(),
    };
    commitHuman('ui.add_rule', () => {
      useRuleStore.getState().add(rule);
      return { kind: 'remove_rule', id: rule.id };
    });
    setAdding(false);
  };

  const removeRule = (id: string) => {
    const index = useRuleStore.getState().rules.findIndex((r) => r.id === id);
    if (index < 0) return;
    commitHuman('ui.remove_rule', () => {
      const removed = useRuleStore.getState().remove(id);
      return removed ? { kind: 'restore_rule', rule: removed, index } : null;
    });
  };

  const toggleRule = (id: string, enabled: boolean) => {
    commitHuman('ui.toggle_rule', () => {
      useRuleStore.getState().setEnabled(id, enabled);
      return null;
    });
  };

  return (
    <div className="tk-rules">
      {rules.length === 0 && !adding ? <p className="tk-hint">No rules yet.</p> : null}

      <ul className="tk-rule-list">
        {rules.map((rule) => {
          const count = violations.filter((v) => v.ruleId === rule.id).length;
          return (
            <li key={rule.id} className="tk-rule" data-enabled={rule.enabled}>
              <input
                type="checkbox"
                className="tk-checkbox"
                checked={rule.enabled}
                aria-label={`${rule.description} enabled`}
                onChange={(e) => toggleRule(rule.id, e.target.checked)}
              />
              <span className="tk-rule-text">{rule.description}</span>
              {count > 0 ? (
                <span className="tk-violation-badge">
                  {count} {count === 1 ? 'violation' : 'violations'}
                </span>
              ) : null}
              <button
                type="button"
                className="tk-icon-button"
                aria-label={`Remove rule ${rule.description}`}
                onClick={() => removeRule(rule.id)}
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>

      {adding ? (
        <AddRuleForm onCancel={() => setAdding(false)} onAdd={addRule} />
      ) : (
        <button type="button" className="tk-button" onClick={() => setAdding(true)}>
          Add rule
        </button>
      )}
    </div>
  );
}

function AddRuleForm({
  onAdd,
  onCancel,
}: {
  onAdd(type: RuleType, description: string, condition: RuleCondition): void;
  onCancel(): void;
}) {
  const [target, setTarget] = useState<ComponentType | 'all'>('all');
  const [property, setProperty] = useState<RuleProperty>('variant');
  const [operator, setOperator] = useState<RuleOperator>('not-equals');
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');

  return (
    <div className="tk-rule-form">
      <ul className="tk-preset-list">
        {PRESETS.map((preset) => (
          <li key={preset.label}>
            <button
              type="button"
              className="tk-button tk-button-quiet"
              onClick={() => onAdd(preset.type, preset.description, preset.condition)}
            >
              {preset.label}
            </button>
          </li>
        ))}
      </ul>

      <div className="tk-field">
        <label className="tk-label" htmlFor="tk-rule-target">
          Applies to
        </label>
        <select
          id="tk-rule-target"
          className="tk-select"
          value={target}
          onChange={(e) => setTarget(e.target.value as ComponentType | 'all')}
        >
          <option value="all">all</option>
          {COMPONENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div className="tk-field">
        <label className="tk-label" htmlFor="tk-rule-property">
          Property
        </label>
        <select
          id="tk-rule-property"
          className="tk-select"
          value={property}
          onChange={(e) => setProperty(e.target.value as RuleProperty)}
        >
          {RULE_PROPERTIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
      <div className="tk-field">
        <label className="tk-label" htmlFor="tk-rule-operator">
          Condition
        </label>
        <select
          id="tk-rule-operator"
          className="tk-select"
          value={operator}
          onChange={(e) => setOperator(e.target.value as RuleOperator)}
        >
          {RULE_OPERATORS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
      <div className="tk-field">
        <label className="tk-label" htmlFor="tk-rule-value">
          Value
        </label>
        <input
          id="tk-rule-value"
          className="tk-text"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>
      <div className="tk-field">
        <label className="tk-label" htmlFor="tk-rule-description">
          Describe this rule
        </label>
        <input
          id="tk-rule-description"
          className="tk-text"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="tk-form-actions">
        <button
          type="button"
          className="tk-button tk-button-primary"
          disabled={value.trim() === '' || description.trim() === ''}
          onClick={() => onAdd('custom', description.trim(), { target, property, operator, value: value.trim() })}
        >
          Add rule
        </button>
        <button type="button" className="tk-button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
