import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AgentLogEntry, NewLogEntry } from '@/types/log';
import { generateId } from '@/utils/idGenerator';
import { usePhaseStore } from '@/stores/phaseStore';

/** Owns the collaboration log: agent tool calls and human UI actions, newest last (UI reverses). */
export interface LogState {
  entries: AgentLogEntry[];
}
export interface LogActions {
  addEntry(entry: NewLogEntry): AgentLogEntry;
  markUndone(id: string): void;
  get(id: string): AgentLogEntry | undefined;
  lastUndoable(): AgentLogEntry | undefined;
  clear(): void;
}
export type LogStore = LogState & LogActions;

export const useLogStore = create<LogStore>()(
  persist(
    (set, get) => ({
      entries: [],
      addEntry: (entry) => {
        const full: AgentLogEntry = {
          ...entry,
          id: generateId('log'),
          timestamp: Date.now(),
          undone: false,
          phase: usePhaseStore.getState().currentPhase,
        };
        set((s) => ({ entries: [...s.entries, full] }));
        return full;
      },
      markUndone: (id) => set((s) => ({ entries: s.entries.map((e) => (e.id === id ? { ...e, undone: true } : e)) })),
      get: (id) => get().entries.find((e) => e.id === id),
      lastUndoable: () => [...get().entries].reverse().find((e) => e.inverse && !e.undone),
      clear: () => set({ entries: [] }),
    }),
    { name: 'altgal.log.v1', version: 1 },
  ),
);
