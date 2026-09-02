/**
 * The tool count is demo moment (a), and `getTools()` is its only source (D-016). These cases
 * cover the two ways a host can take that source away — a `getTools` that rejects and a host
 * that never implemented it — and assert the count still reports what was registered.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, render } from '@testing-library/react';
import { useComponentStore } from '@/stores/componentStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { usePhaseStore } from '@/stores/phaseStore';
import { useTokenStore } from '@/stores/tokenStore';
import { useWebMCPStatusStore } from '@/stores/webmcpStatusStore';
import { useWebMCPRegistration } from '@/webmcp/useWebMCPRegistration';
import { toolsForPhase } from '@/webmcp/toolPhaseMap';
import { installFakeModelContext } from './fixtures/fakeModelContext';
import type { FakeHost } from './fixtures/fakeModelContext';

function Harness(): null {
  useWebMCPRegistration();
  return null;
}

/** One macrotask covers the deferred sync (D-004) and the awaited registerTool chain. */
const settle = () => act(async () => void (await new Promise((r) => setTimeout(r, 0))));

let host: FakeHost;

beforeEach(() => {
  useTokenStore.getState().reset();
  useComponentStore.getState().reset();
  useLayoutStore.getState().reset();
  useWebMCPStatusStore.setState({ toolCount: 0, toolNames: [] });
  host = installFakeModelContext();
});

afterEach(() => {
  host.uninstall();
});

describe('useWebMCPRegistration — the tool count', () => {
  it('reads the host when getTools() works', async () => {
    render(<Harness />);
    await settle();
    expect(useWebMCPStatusStore.getState().toolCount).toBe(toolsForPhase(usePhaseStore.getState().currentPhase).length);
  });

  it('falls back to what it registered when getTools() throws', async () => {
    Object.defineProperty(host.context, 'getTools', {
      configurable: true,
      value: () => Promise.reject(new Error('not supported on this host')),
    });
    render(<Harness />);
    await settle();
    const phase = usePhaseStore.getState().currentPhase;
    expect(useWebMCPStatusStore.getState().toolNames.slice().sort()).toEqual([...toolsForPhase(phase)].sort());
  });

  it('falls back when the host has no getTools at all', async () => {
    Object.defineProperty(host.context, 'getTools', { configurable: true, value: undefined });
    render(<Harness />);
    await settle();
    expect(useWebMCPStatusStore.getState().toolCount).toBe(toolsForPhase(usePhaseStore.getState().currentPhase).length);
  });
});
