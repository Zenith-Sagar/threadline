// Decision log: every player choice and every simulated event, with cause references.
// This powers the Causality Replay (tracing a crisis back to a decision) and Rewind.
import type { LogEntry } from '@/data/schemas/types';

export interface LogBuilder {
  /** Append an entry and return its id. */
  add(entry: Omit<LogEntry, 'id'>): number;
  entries(): LogEntry[];
}

export function createLog(): LogBuilder {
  const list: LogEntry[] = [];
  return {
    add(entry) {
      const id = list.length + 1;
      list.push({ ...entry, id });
      return id;
    },
    entries: () => list.slice(),
  };
}
