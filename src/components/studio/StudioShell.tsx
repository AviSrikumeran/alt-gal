'use client';
import { useCallback, useEffect, useState } from 'react';
import { useLogStore } from '@/stores/logStore';
import { usePhaseStore } from '@/stores/phaseStore';
import AgentLog from './AgentLog';
import Canvas from './Canvas';
import PhaseIndicator from './PhaseIndicator';
import ShortcutsSheet from './ShortcutsSheet';
import Toasts from './Toasts';
import ExportPanel from '@/components/export/ExportPanel';
import { StatusBarSlot, TokenPanelSlot, TokenStyleInjectorSlot, ToolInspectorSlot } from './integration';
import { undoEntry } from '@/engine/undo';
import { pushToast } from './toastStore';
import { useShortcuts } from './useShortcuts';
import { DEMO_URL, S } from './strings';
import '@/components/library/library.css';
import './studio.css';

/** D-126: only an agent overwrite of a non-null token gets a toast; everything else is visible already. */
function useOverwriteToast(): void {
  useEffect(() =>
    useLogStore.subscribe((state, previous) => {
      if (state.entries.length <= previous.entries.length) return;
      const entry = state.entries[state.entries.length - 1];
      if (!entry || entry.actor !== 'agent' || entry.tool !== 'set_token') return;
      if (!entry.result?.ok) return;
      const data = entry.result.data as { role?: string; previous?: string | null; value?: string } | undefined;
      if (!data?.previous || !data.role) return;
      pushToast({
        message: S.overwriteToast(data.role, data.previous, data.value ?? '—'),
        tone: 'agent',
        ttl: 8000,
        actionLabel: S.undo,
        onAction: () => {
          const result = undoEntry(entry.id);
          if (!result.ok) pushToast({ message: S.undoBlocked(result.reason), tone: 'warn' });
        },
      });
    }),
  );
}

/** D-154: a phase drop is information, not a failure — neutral copy, no red. */
function usePhaseDownToast(): void {
  useEffect(() =>
    usePhaseStore.subscribe((state, previous) => {
      if (state.currentPhase >= previous.currentPhase) return;
      const group = ['token', 'token', 'component', 'layout', 'export'][previous.currentPhase] ?? 'agent';
      pushToast({ message: S.phaseDownToast(state.currentPhase, group), tone: 'info' });
    }),
  );
}

/**
 * The three-panel studio (§5). Tokens on the left, the canvas in the middle, the collaboration log
 * on the right — the same three things the agent reads through `get_current_state`, laid out so a
 * viewer can watch a tool call land in all three at once.
 */
export default function StudioShell() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const showSheet = useCallback(() => setSheetOpen(true), []);
  useShortcuts(showSheet);
  useOverwriteToast();
  usePhaseDownToast();

  return (
    <>
      <div className="alt-small-screen">
        <p>
          {S.smallScreen}{' '}
          <a href={DEMO_URL} target="_blank" rel="noreferrer">
            {S.onboardingDemo}
          </a>
        </p>
      </div>

      <div className="alt-studio">
        <TokenStyleInjectorSlot />
        <PhaseIndicator />
        <div className="alt-studio__body">
          <TokenPanelSlot />
          <Canvas />
          <AgentLog />
        </div>
        <StatusBarSlot />
        <ToolInspectorSlot />
        <ExportPanel />
        <ShortcutsSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
        <Toasts />
      </div>
    </>
  );
}
