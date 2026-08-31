export type IdPrefix = 'comp' | 'wf' | 'sec' | 'page' | 'rule' | 'log';

/** comp_a1b2c3d4 — readable in the log, unique for a session. */
export function generateId(prefix: IdPrefix): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
}
