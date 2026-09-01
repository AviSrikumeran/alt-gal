import { beforeEach } from 'vitest';

/**
 * Node 25 installs a `localStorage` global that throws unless the runtime was started with `--localstorage-file`,
 * and it shadows jsdom's implementation. Every store uses zustand `persist` against localStorage (D-068), so
 * without this shim `setState` throws `storage.setItem is not a function` in any test that touches a store.
 * An in-memory Storage, reset between tests, keeps persistence exercised and test runs isolated from each other.
 */
class MemoryStorage implements Storage {
  #map = new Map<string, string>();
  get length() {
    return this.#map.size;
  }
  clear() {
    this.#map.clear();
  }
  getItem(key: string) {
    return this.#map.get(key) ?? null;
  }
  key(index: number) {
    return [...this.#map.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.#map.delete(key);
  }
  setItem(key: string, value: string) {
    this.#map.set(key, String(value));
  }
}

function install(target: typeof globalThis | Window) {
  Object.defineProperty(target, 'localStorage', {
    configurable: true,
    writable: true,
    value: new MemoryStorage(),
  });
}

install(globalThis);
if (typeof window !== 'undefined' && window !== (globalThis as unknown as Window)) install(window);

beforeEach(() => {
  globalThis.localStorage.clear();
});
