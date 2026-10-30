import { readStorage, removeStorage, writeStorage } from './storage.js';

export const TOKEN_STORAGE_KEY = 'algolearn-token';

const listeners = new Set();
const expiredHandlers = new Set();
let token = readStorage(TOKEN_STORAGE_KEY);

const emit = () => listeners.forEach((listener) => listener());

/** Holds the JWT outside React so the axios client can read it without hooks. */
export const authStore = {
  getToken: () => token,
  setToken: (next) => {
    token = next;
    writeStorage(TOKEN_STORAGE_KEY, next);
    emit();
  },
  clear: () => {
    token = null;
    removeStorage(TOKEN_STORAGE_KEY);
    emit();
  },
  /** Called by the API client when the server rejects the token. */
  expire: () => {
    authStore.clear();
    expiredHandlers.forEach((handler) => handler());
  },
  subscribe: (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  onExpire: (handler) => {
    expiredHandlers.add(handler);
    return () => expiredHandlers.delete(handler);
  },
  /** Test helper: re-read storage, as on a fresh page load. */
  reload: () => {
    token = readStorage(TOKEN_STORAGE_KEY);
    emit();
  },
};
