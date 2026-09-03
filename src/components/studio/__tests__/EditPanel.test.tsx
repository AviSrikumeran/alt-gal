/**
 * D-189's third "nothing is agent-only" path. `getTokenMapping` and the component exporter were
 * reachable by `explain_component` and `get_component_code` and by no human.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentSpec } from '@/types/components';
import EditPanel from '@/components/studio/EditPanel';
import { contentFromInput } from '@/components/library/content';
import { generateId } from '@/utils/idGenerator';
import { useComponentStore } from '@/stores/componentStore';
import { useLogStore } from '@/stores/logStore';
import { useTokenStore } from '@/stores/tokenStore';
import { useUIStore } from '@/stores/uiStore';

function button(): ComponentSpec {
  const spec: ComponentSpec = {
    id: generateId('comp'),
    type: 'button',
    variant: 'primary',
    size: 'md',
    content: contentFromInput('button', { label: 'Get started' }),
    pageId: null,
    sectionId: null,
    createdBy: 'human',
    createdAt: Date.now(),
  };
  useComponentStore.getState().add(spec);
  return spec;
}

beforeEach(() => {
  useComponentStore.getState().reset();
  useTokenStore.getState().reset();
  useLogStore.getState().clear();
  useUIStore.getState().select(null);
});

describe('EditPanel', () => {
  it('renders nothing until a component is selected', () => {
    button();
    const { container } = render(<EditPanel />);
    expect(container.querySelector('.alt-edit')).toBe(null);
  });

  it('shows the token behind every styled property (D-189)', () => {
    const spec = button();
    useTokenStore.getState().setToken('color.primary', 'hsl(250, 84%, 60%)');
    useUIStore.getState().select(spec.id);
    render(<EditPanel />);

    fireEvent.click(screen.getByRole('tab', { name: 'WHY IT LOOKS LIKE THIS' }));
    expect(screen.getByText('--color-primary')).toBeTruthy();
    expect(screen.getByText('root.background-color')).toBeTruthy();
    expect(screen.getByText('hsl(250, 84.0%, 60.0%)')).toBeTruthy();
  });

  it('edits the variant through commitHuman, once (D-077)', () => {
    const spec = button();
    useUIStore.getState().select(spec.id);
    render(<EditPanel />);

    fireEvent.change(screen.getByLabelText('Variant'), { target: { value: 'ghost' } });
    expect(useComponentStore.getState().get(spec.id)?.variant).toBe('ghost');
    const entries = useLogStore.getState().entries;
    expect(entries).toHaveLength(1);
    expect(entries[0]?.tool).toBe('ui.modify_component');
    expect(entries[0]?.inverse).toEqual({ kind: 'restore_component_spec', id: spec.id, previous: spec });
  });

  it('offers a Copy code button', () => {
    const spec = button();
    useUIStore.getState().select(spec.id);
    render(<EditPanel />);
    expect(screen.getByRole('button', { name: 'COPY CODE' })).toBeTruthy();
  });
});
