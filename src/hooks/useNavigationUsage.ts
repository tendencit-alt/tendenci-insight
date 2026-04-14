import { useCallback, useEffect, useState } from "react";

// ── Storage keys ──
const USAGE_KEY = "erp_nav_usage";
const MAX_TRACKED = 50; // keep last N navigations

interface UsageEntry {
  path: string;
  group: string;
  ts: number;
}

/** Track which paths/groups the user visits most */
export function useNavigationUsage() {
  const [usage, setUsage] = useState<UsageEntry[]>(() => {
    try {
      const raw = localStorage.getItem(USAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  const trackVisit = useCallback((path: string, groupLabel: string) => {
    setUsage(prev => {
      const next = [{ path, group: groupLabel, ts: Date.now() }, ...prev].slice(0, MAX_TRACKED);
      localStorage.setItem(USAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  /** Top N most visited paths (unique, ordered by frequency) */
  const getTopPaths = useCallback((n: number): string[] => {
    const freq: Record<string, number> = {};
    usage.forEach(e => { freq[e.path] = (freq[e.path] || 0) + 1; });
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([p]) => p);
  }, [usage]);

  /** Top N most visited groups */
  const getTopGroups = useCallback((n: number): string[] => {
    const freq: Record<string, number> = {};
    usage.forEach(e => { freq[e.group] = (freq[e.group] || 0) + 1; });
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([g]) => g);
  }, [usage]);

  return { trackVisit, getTopPaths, getTopGroups, usage };
}
