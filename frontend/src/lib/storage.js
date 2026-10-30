// localStorage can throw (private mode, blocked site data), so every access is guarded.
export const readStorage = (key) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const writeStorage = (key, value) => {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

export const removeStorage = (key) => {
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};
