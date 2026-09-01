import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { act } from 'react';
import TokenPanel from '@/components/tokens/TokenPanel';
import { tokenToCss } from '@/engine/tokenToCss';
import { useTokenStore } from '@/stores/tokenStore';
import { useLogStore } from '@/stores/logStore';
import { useRuleStore } from '@/stores/ruleStore';
import { useUIStore } from '@/stores/uiStore';
import { toHSLString, parseColor } from '@/utils/colorUtils';

const tokens = () => useTokenStore.getState();

beforeEach(() => {
  useTokenStore.getState().reset();
  useLogStore.getState().clear();
  useRuleStore.getState().reset();
  useUIStore.setState({
    panelSections: { colors: true, typography: true, spacing: true, elevation: true, motion: true, rules: true },
  });
});

describe('TokenPanel — §11.2 isolation test', () => {
  it('drives the real tokenStore, and the stylesheet follows', () => {
    render(<TokenPanel />);
    expect(tokenToCss(tokens())).toContain('--color-primary');

    act(() => {
      tokens().setToken('color.primary', 'hsl(250, 84%, 60%)');
    });

    const css = tokenToCss(tokens());
    expect(css).toContain('--color-primary');
    expect(css).toContain('--color-primary: hsl(250, 84.0%, 60.0%);');
  });

  it('renders all six sections and thirteen color rows', () => {
    const { container } = render(<TokenPanel />);
    for (const title of ['Colors', 'Typography', 'Spacing & radius', 'Elevation', 'Motion', 'Rules']) {
      expect(screen.getByRole('button', { name: title })).toBeTruthy();
    }
    expect(container.querySelectorAll('.tk-colors .tk-row')).toHaveLength(13);
  });
});

describe('the human write path', () => {
  it('normalizes a pasted hex and logs one human entry (D-080, D-111)', () => {
    render(<TokenPanel />);
    const field = screen.getByLabelText('Primary hex value') as HTMLInputElement;
    fireEvent.change(field, { target: { value: '#7c5cff' } });
    fireEvent.blur(field);

    expect(tokens().getToken('color.primary')).toBe(toHSLString(parseColor('#7c5cff')!));
    const entries = useLogStore.getState().entries;
    expect(entries).toHaveLength(1);
    expect(entries[0]?.actor).toBe('human');
    expect(entries[0]?.tool).toBe('ui.set_token');
    expect(entries[0]?.inverse).toEqual({ kind: 'restore_token', path: 'color.primary', value: null });
  });

  it('rejects a bad value and leaves the store and the log alone', () => {
    render(<TokenPanel />);
    const field = screen.getByLabelText('Primary hex value') as HTMLInputElement;
    fireEvent.change(field, { target: { value: 'rebeccapurple' } });
    fireEvent.blur(field);
    expect(tokens().getToken('color.primary')).toBeNull();
    expect(useLogStore.getState().entries).toHaveLength(0);
  });

  it('offers ghost proposals only once primary exists, and fills from them (D-104, D-107)', () => {
    const { container } = render(<TokenPanel />);
    expect(screen.queryByText('Fill from primary')).toBeNull();

    act(() => {
      tokens().setToken('color.primary', 'hsl(250, 84%, 60%)');
    });
    expect(container.querySelectorAll('.tk-swatch[data-state="ghost"]').length).toBe(12);

    fireEvent.click(screen.getByText('Fill from primary'));
    expect(tokens().getDefinedTokenCount()).toBe(13);
    expect(tokens().getMissingForPhase2()).toEqual([]);
    // One entry for the primary, one for the fill — not thirteen.
    expect(useLogStore.getState().entries).toHaveLength(1);
    expect(useLogStore.getState().entries[0]?.inverse?.kind).toBe('restore_tokens');
  });

  it('skips locked roles when filling (D-127)', () => {
    render(<TokenPanel />);
    act(() => {
      tokens().setToken('color.primary', 'hsl(250, 84%, 60%)');
      tokens().setToken('color.background', 'hsl(0, 0%, 100%)');
      tokens().setLocked('color.background', true);
    });
    fireEvent.click(screen.getByText('Fill from primary'));
    expect(tokens().getToken('color.background')).toBe('hsl(0, 0.0%, 100.0%)');
  });

  it('shows the primary hint while primary is unset (D-146)', () => {
    render(<TokenPanel />);
    expect(screen.getByText('Set primary to begin.')).toBeTruthy();
    act(() => {
      tokens().setToken('color.primary', 'hsl(250, 84%, 60%)');
    });
    expect(screen.queryByText('Set primary to begin.')).toBeNull();
  });

  it('rebuilds all nine type steps from base and ratio in one entry (D-105)', () => {
    render(<TokenPanel />);
    // The shipped default scale is closest to 1.125, so that is the ratio the segmented control shows.
    fireEvent.click(screen.getByRole('button', { name: '1.25' }));
    const base = screen.getByLabelText('Base size') as HTMLInputElement;
    fireEvent.change(base, { target: { value: '18' } });

    const scale = tokens().typography.scale;
    expect(scale.base).toBe(18);
    expect(scale.md).toBe(Math.round(18 * 1.25));
    expect(scale.lg).toBe(Math.round(18 * 1.25 * 1.25));
    expect(scale.xs).toBe(Math.round(18 / 1.25 / 1.25));
    // One entry per control change: nine steps, not nine entries.
    expect(useLogStore.getState().entries).toHaveLength(2);
  });

  it('writes the spacing unit and derives every step (D-082)', () => {
    render(<TokenPanel />);
    const unit = within(screen.getByRole('group', { name: 'Unit' })).getByText('8');
    fireEvent.click(unit);
    expect(tokens().spacing.unit).toBe(8);
    expect(tokenToCss(tokens())).toContain('--spacing-16: 128px;');
  });
});

describe('the color popover (D-106)', () => {
  it('applies a preset and closes', () => {
    render(<TokenPanel />);
    fireEvent.click(screen.getByLabelText('Primary color'));
    fireEvent.click(screen.getByLabelText('hsl(250, 84%, 60%)'));
    expect(tokens().getToken('color.primary')).toBe('hsl(250, 84.0%, 60.0%)');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('coalesces a slider drag into one log entry (D-110, D-111)', () => {
    render(<TokenPanel />);
    act(() => {
      tokens().setToken('color.primary', 'hsl(250, 84%, 60%)');
      useLogStore.getState().clear();
    });
    fireEvent.click(screen.getByLabelText('Primary color'));
    const hue = within(screen.getByRole('dialog')).getByLabelText('Hue', { selector: 'input' });

    fireEvent.pointerDown(hue);
    for (const value of ['240', '220', '200']) fireEvent.change(hue, { target: { value } });
    fireEvent.pointerUp(hue);

    expect(parseColor(tokens().getToken('color.primary')!)?.h).toBe(200);
    expect(useLogStore.getState().entries).toHaveLength(1);
    expect(useLogStore.getState().entries[0]?.inverse).toEqual({
      kind: 'restore_token',
      path: 'color.primary',
      value: 'hsl(250, 84.0%, 60.0%)',
    });
  });

  it('closes on Escape', () => {
    render(<TokenPanel />);
    fireEvent.click(screen.getByLabelText('Primary color'));
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('PrimaryColorForm — the one declarative tool (D-029, D-030)', () => {
  it('carries the declarative attributes and no toolautosubmit', () => {
    const { container } = render(<TokenPanel />);
    const form = container.querySelector('form.tk-primary-form') as HTMLFormElement;
    expect(form.getAttribute('toolname')).toBe('set_primary_color');
    expect(form.getAttribute('tooldescription')).toContain('the human clicks Apply');
    expect(form.hasAttribute('toolautosubmit')).toBe(false);
    expect(form.querySelector('input[name="value"]')?.getAttribute('toolparamdescription')).toContain('hsl');
  });

  it('sets primary on Apply and answers an agent-invoked submit with a ToolResult envelope', () => {
    const { container } = render(<TokenPanel />);
    const form = container.querySelector('form.tk-primary-form') as HTMLFormElement;
    fireEvent.change(screen.getByLabelText('Proposed primary color'), { target: { value: '#7c5cff' } });

    let responded: string | null = null;
    const event = new Event('submit', { bubbles: true, cancelable: true }) as Event & {
      agentInvoked?: boolean;
      respondWith?(p: Promise<string>): void;
    };
    event.agentInvoked = true;
    event.respondWith = (p) => {
      void p.then((value) => {
        responded = value;
      });
    };
    fireEvent(form, event);

    expect(tokens().getToken('color.primary')).toBe(toHSLString(parseColor('#7c5cff')!));
    return Promise.resolve().then(() => {
      const result = JSON.parse(responded!);
      expect(result.ok).toBe(true);
      expect(result.phase).toBe(1);
      expect(result.phaseChanged).toBe(true);
      expect(result.summary).toContain('Primary is now');
      expect(Array.isArray(result.newTools)).toBe(true);
    });
  });

  it('refuses a locked primary with a LOCKED envelope', () => {
    const { container } = render(<TokenPanel />);
    act(() => {
      tokens().setToken('color.primary', 'hsl(250, 84%, 60%)');
      tokens().setLocked('color.primary', true);
    });
    const form = container.querySelector('form.tk-primary-form') as HTMLFormElement;
    fireEvent.change(screen.getByLabelText('Proposed primary color'), { target: { value: '#000000' } });

    let responded: string | null = null;
    const event = new Event('submit', { bubbles: true, cancelable: true }) as Event & {
      agentInvoked?: boolean;
      respondWith?(p: Promise<string>): void;
    };
    event.agentInvoked = true;
    event.respondWith = (p) => {
      void p.then((value) => {
        responded = value;
      });
    };
    fireEvent(form, event);

    expect(tokens().getToken('color.primary')).toBe('hsl(250, 84.0%, 60.0%)');
    return Promise.resolve().then(() => {
      const result = JSON.parse(responded!);
      expect(result.ok).toBe(false);
      expect(result.code).toBe('LOCKED');
    });
  });
});

describe('RuleEditor (D-113)', () => {
  it('adds a preset rule with an undoable inverse', () => {
    render(<TokenPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Add rule' }));
    fireEvent.click(screen.getByRole('button', { name: 'No danger buttons' }));

    const rules = useRuleStore.getState().rules;
    expect(rules).toHaveLength(1);
    expect(rules[0]?.condition).toEqual({
      target: 'button',
      property: 'variant',
      operator: 'not-equals',
      value: 'danger',
    });
    expect(rules[0]?.createdBy).toBe('human');
    expect(useLogStore.getState().entries[0]?.inverse).toEqual({ kind: 'remove_rule', id: rules[0]?.id });
  });

  it('removes a rule with a restore_rule inverse', () => {
    render(<TokenPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Add rule' }));
    fireEvent.click(screen.getByRole('button', { name: 'Minimum radius 8px' }));
    fireEvent.click(screen.getByRole('button', { name: /^Remove rule/ }));

    expect(useRuleStore.getState().rules).toHaveLength(0);
    const last = useLogStore.getState().entries.at(-1);
    expect(last?.inverse?.kind).toBe('restore_rule');
  });
});

describe('the audit has a human path (D-189)', () => {
  it('runs from the Rules header and reports findings', () => {
    render(<TokenPanel />);
    act(() => {
      // A pale text on a pale background: an error the audit must catch.
      tokens().setMany({
        'color.background': 'hsl(0, 0%, 100%)',
        'color.surface': 'hsl(0, 0%, 100%)',
        'color.text-primary': 'hsl(0, 0%, 88%)',
      });
    });
    fireEvent.click(screen.getByRole('button', { name: 'Run audit' }));
    expect(screen.getByRole('status', { name: 'Audit results' }).textContent).toContain('errors');
    expect(screen.getAllByText(/Text contrast/).length).toBeGreaterThan(0);
  });
});
