/**
 * One-off message that must survive a full document navigation.
 *
 * Auth transitions use a full page load (see `navigateTo`), so a toast fired
 * before the navigation would be destroyed with the document. The message is
 * stashed here and rendered by `FlashNotice` once the next document mounts.
 *
 * `sessionStorage` is the store and the listener set keeps subscribers (via
 * `useSyncExternalStore`) in step when the message is set or cleared.
 */
const FLASH_STORAGE_KEY = "nocfinity:flash";

const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeFlash(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function setFlash(message: string): void {
  try {
    window.sessionStorage.setItem(FLASH_STORAGE_KEY, message);
  } catch {
    // Private mode or a blocked storage partition: the message is optional.
  }

  notify();
}

export function peekFlash(): string | null {
  try {
    return window.sessionStorage.getItem(FLASH_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearFlash(): void {
  try {
    window.sessionStorage.removeItem(FLASH_STORAGE_KEY);
  } catch {
    // Nothing to clean up when storage is unavailable.
  }

  notify();
}
