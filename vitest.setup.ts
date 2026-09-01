import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

/**
 * Vitest's jsdom environment hands back a `localStorage` with no methods on it, so every store that
 * uses zustand `persist` (D-068) throws on its first write. An in-memory Storage stands in.
 */
class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length(): number {
    return this.data.size;
  }
  clear(): void {
    this.data.clear();
  }
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
  setItem(key: string, value: string): void {
    this.data.set(key, String(value));
  }
}

if (typeof globalThis.localStorage?.setItem !== 'function') {
  const storage = new MemoryStorage();
  // `window` is absent in the node-environment suites (export.test.ts), so it is only
  // patched when it exists. jsdom aliases the two, but defining both is harmless.
  const targets: Record<string, unknown>[] = [globalThis as unknown as Record<string, unknown>];
  if (typeof window !== 'undefined') targets.push(window as unknown as Record<string, unknown>);
  for (const target of targets) {
    Object.defineProperty(target, 'localStorage', { value: storage, configurable: true, writable: true });
  }
}

afterEach(() => {
  // cleanup() needs a document; the node-environment suites render with react-dom/server.
  if (typeof document !== 'undefined') cleanup();
  localStorage.clear();
});
