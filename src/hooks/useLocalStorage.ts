import { useState, useCallback } from 'react';

export function useLocalStorage<T extends Record<string, unknown>>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void];
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void];
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [stored, setStored] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      if (!item) return initialValue;
      const parsed = JSON.parse(item);
      if (initialValue && typeof initialValue === 'object' && !Array.isArray(initialValue) && typeof parsed === 'object' && parsed !== null) {
        return { ...initialValue, ...parsed } as T;
      }
      return parsed as T;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStored((prev) => {
      const next = value instanceof Function ? value(prev) : value;
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch { /* quota exceeded */ }
      return next;
    });
  }, [key]);

  return [stored, setValue];
}
