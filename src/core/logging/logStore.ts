import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

import type { GameLogRecord } from './logTypes';

const MAX_LOG_ENTRIES = 250;

export interface GameLogState {
  entries: GameLogRecord[];
  appendLog: (entry: GameLogRecord) => void;
  clearLogs: () => void;
}

export const createGameLogStore = () =>
  createStore<GameLogState>()((set) => ({
    entries: [],
    appendLog: (entry) =>
      set((state) => ({
        entries: [entry, ...state.entries].slice(0, MAX_LOG_ENTRIES),
      })),
    clearLogs: () => set({ entries: [] }),
  }));

export const gameLogStore = createGameLogStore();

export const useGameLogStore = <T>(selector: (state: GameLogState) => T) =>
  useStore(gameLogStore, selector);

export const selectLogEntries = (state: GameLogState) => state.entries;
export const makeSelectLogsByKind =
  (kind: GameLogRecord['kind']) =>
  (state: GameLogState): GameLogRecord[] =>
    state.entries.filter((entry) => entry.kind === kind);
