import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Phase } from '@/types/phase';
import type { WebMCPSource } from '@/webmcp/detect';
import { useComponentStore } from '@/stores/componentStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { useLogStore } from '@/stores/logStore';
import { usePhaseStore } from '@/stores/phaseStore';
import { useUIStore } from '@/stores/uiStore';
import { useWebMCPStatusStore } from '@/stores/webmcpStatusStore';
import StudioShell from '@/components/studio/StudioShell';

/**
 * §11.2 isolation test: StudioShell renders with every store at its default and shows the four
 * empty states from Part 8.5. `react-dom/server` is enough — the empty states are pure render
 * output — and it keeps the suite free of a DOM dependency (D-073 forbids adding jsdom).
 *
 * One wrinkle: zustand hands `getInitialState` to `useSyncExternalStore` as the server snapshot,
 * so a server render reads the state a store was *created* with, not the state a test just set.
 * `seed` therefore writes both. Nothing outside these fixtures does that.
 */
function seedPhase(phase: Phase): void {
  usePhaseStore.setState({ currentPhase: phase });
  Object.assign(usePhaseStore.getInitialState(), { currentPhase: phase });
}

function seedSource(source: WebMCPSource, toolCount = 4): void {
  useWebMCPStatusStore.setState({ source, toolCount });
  Object.assign(useWebMCPStatusStore.getInitialState(), { source, toolCount });
}

function seedOnboarding(dismissed: boolean): void {
  useUIStore.setState({ onboardingDismissed: dismissed });
  Object.assign(useUIStore.getInitialState(), { onboardingDismissed: dismissed });
}

const at = (phase: Phase): string => {
  seedPhase(phase);
  return renderToStaticMarkup(<StudioShell />);
};

beforeEach(() => {
  useComponentStore.getState().reset();
  useLayoutStore.getState().reset();
  useLogStore.getState().clear();
  seedOnboarding(true);
  seedSource('none');
  seedPhase(0);
});

afterEach(() => {
  seedPhase(0);
  seedSource('none');
  seedOnboarding(false);
});

describe('StudioShell', () => {
  it('renders the three panels and the phase bar with every store at defaults', () => {
    const html = at(0);
    expect(html).toContain('alt-studio');
    expect(html).toContain('alt.gal');
    expect(html).toContain('4 of 24 tools');
    expect(html).toContain('aria-label="Tokens"');
    expect(html).toContain('aria-label="Canvas"');
    expect(html).toContain('aria-label="Log"');
    expect(html).toContain('No activity yet.');
  });

  it('shows the phase 0 empty state (D-149)', () => {
    const html = at(0);
    expect(html).toContain('Nothing to render yet');
    expect(html).toContain('Set primary color');
    expect(html).toContain('Open Tool Inspector');
  });

  it('shows the phase 1 empty state with the remaining count', () => {
    const html = at(1);
    expect(html).toContain('more tokens to unlock components.');
    expect(html).toContain('Fill from primary');
  });

  it('shows the phase 2 empty state and the + Component path (D-150)', () => {
    const html = at(2);
    expect(html).toContain('Your tokens are ready.');
    expect(html).toContain('Generate a component from the + button, or ask your agent for one.');
    expect(html).toContain('+ Component');
  });

  it('shows the phase 3 wireframe banner and the New wireframe button', () => {
    const html = at(3);
    expect(html).toContain('Sketch a wireframe to compose a page.');
    expect(html).toContain('+ New wireframe');
  });

  it('offers Export only in phase 4', () => {
    // the stepper always names the Export phase; this is the toolbar button (D-148)
    expect(at(3)).not.toContain('data-kind="primary">Export<');
    expect(at(4)).toContain('data-kind="primary">Export<');
  });

  it('marks the current phase step with aria-current (D-206)', () => {
    expect(at(2)).toContain('aria-current="step"');
  });

  it('carries the landmark roles the a11y target requires', () => {
    const html = at(0);
    expect(html).toContain('<header class="alt-phasebar"');
    expect(html).toContain('<main class="alt-canvas"');
    expect(html).toContain('<footer class="alt-status"'); // Stream 3's WebMCPStatusBar (D-158)
  });

  it('shows the small-screen notice for viewports under 1024px (D-155)', () => {
    expect(at(0)).toContain('Alternative Galaxy is a desktop studio.');
  });

  it('shows the suggested prompts only when WebMCP is native (D-159)', () => {
    expect(at(0)).toContain('Open this page in an agent browser to collaborate.');
    seedSource('native');
    expect(at(0)).toContain('What can you do on this page?');
  });

  it('renders the onboarding banner until it is dismissed (D-156)', () => {
    seedOnboarding(false);
    expect(at(0)).toContain('Load example tokens');
    seedOnboarding(true);
    expect(at(0)).not.toContain('Load example tokens');
  });
});
