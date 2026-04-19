import { useEffect, useState, useCallback } from "react";

const PREFIX = "bgstudio:";

export function loadStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveStorage<T>(key: string, value: T) {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("bgstudio:update", { detail: { key } }));
}

export function useStorage<T>(key: string, fallback: T): [T, (v: T | ((p: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => loadStorage(key, fallback));

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.key === key) setValue(loadStorage(key, fallback));
    };
    window.addEventListener("bgstudio:update", handler);
    return () => window.removeEventListener("bgstudio:update", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (v: T | ((p: T) => T)) => {
      setValue((prev) => {
        const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
        saveStorage(key, next);
        return next;
      });
    },
    [key]
  );

  return [value, update];
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
