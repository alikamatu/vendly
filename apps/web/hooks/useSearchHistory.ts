"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "vendly_search_history";
const MAX_ITEMS = 12;
const MIN_LEN = 2;

export interface SearchHistoryEntry {
  q: string;
  at: number;
  count: number;
}

function read(): SearchHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function write(items: SearchHistoryEntry[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    // ignore
  }
}

export function useSearchHistory() {
  const [items, setItems] = useState<SearchHistoryEntry[]>([]);

  useEffect(() => {
    setItems(read());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setItems(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const record = useCallback((raw: string) => {
    const q = raw.trim().toLowerCase();
    if (q.length < MIN_LEN) return;
    const cur = read();
    const existing = cur.find((x) => x.q === q);
    const next: SearchHistoryEntry[] = existing
      ? [
          { ...existing, at: Date.now(), count: existing.count + 1 },
          ...cur.filter((x) => x.q !== q),
        ]
      : [{ q, at: Date.now(), count: 1 }, ...cur];
    write(next);
    setItems(next.slice(0, MAX_ITEMS));
  }, []);

  const remove = useCallback((q: string) => {
    const next = read().filter((x) => x.q !== q);
    write(next);
    setItems(next);
  }, []);

  const clear = useCallback(() => {
    write([]);
    setItems([]);
  }, []);

  /**
   * Returns history entries matching the current input as a "starts-with" /
   * "contains" filter, ranked by recency × frequency. Empty input → all.
   */
  const suggest = useCallback(
    (input: string): SearchHistoryEntry[] => {
      const q = input.trim().toLowerCase();
      if (!q) return items.slice(0, 6);
      const matches = items
        .filter((x) => x.q !== q && x.q.includes(q))
        .sort((a, b) => {
          const aStarts = a.q.startsWith(q) ? 1 : 0;
          const bStarts = b.q.startsWith(q) ? 1 : 0;
          if (aStarts !== bStarts) return bStarts - aStarts;
          return b.at - a.at;
        });
      return matches.slice(0, 6);
    },
    [items],
  );

  return { items, record, remove, clear, suggest };
}
