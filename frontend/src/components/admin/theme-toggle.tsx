"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "nocfinity-admin-theme";
const EVENT_NAME = "nocfinity-theme-change";

function subscribe(callback: () => void) {
  window.addEventListener(EVENT_NAME, callback);

  return () => window.removeEventListener(EVENT_NAME, callback);
}

function getSnapshot(): boolean {
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * FR-ADMIN-10 bonus: admin-only light/dark toggle persisted in the browser.
 * The class is read as an external store so React stays the single renderer.
 */
export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (window.localStorage.getItem(STORAGE_KEY) === "dark") {
      document.documentElement.classList.add("dark");
      window.dispatchEvent(new Event(EVENT_NAME));
    }
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");

    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    window.dispatchEvent(new Event(EVENT_NAME));
  }

  return (
    <button
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={dark}
      className="grid size-9 place-items-center rounded-full text-shop-muted transition hover:bg-background hover:text-foreground"
      onClick={toggle}
      type="button"
    >
      {dark ? <Sun aria-hidden="true" size={17} /> : <Moon aria-hidden="true" size={17} />}
    </button>
  );
}
