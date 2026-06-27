/** Minimal localStorage mock for Node unit tests. */
export function installLocalStorageMock() {
  const store = new Map()
  const api = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(key, String(value)) },
    removeItem: (key) => { store.delete(key) },
    clear: () => { store.clear() },
  }
  globalThis.localStorage = api
  return {
    clear: () => store.clear(),
    dump: () => Object.fromEntries(store),
  }
}
