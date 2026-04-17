import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  SHORTCUT_REGISTRY,
  getContextualShortcuts,
  getDefaultQuickAccess,
  getShortcutById,
  getShortcutsByProfile,
} from "@/components/smart-shortcuts/shortcutRegistry";
import type {
  Shortcut,
  ShortcutAnalyticsEvent,
  ShortcutProfile,
} from "@/components/smart-shortcuts/types";
import { useUserProfile } from "@/hooks/useSmartLauncher";

const QUICK_BAR_KEY = "smart-shortcuts-quickbar";
const PERSONAL_KEY = "smart-shortcuts-personal";
const ANALYTICS_KEY = "smart-shortcuts-analytics";
const MAX_QUICK = 8;
const MAX_ANALYTICS = 200;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function useSmartShortcuts() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const profile = useUserProfile() as ShortcutProfile;

  // ── Quick Access Bar (user-customisable) ──
  const [quickIds, setQuickIds] = useState<string[]>(() =>
    readJson<string[]>(QUICK_BAR_KEY, getDefaultQuickAccess())
  );

  // ── Personal pinned shortcuts ──
  const [personalIds, setPersonalIds] = useState<string[]>(() =>
    readJson<string[]>(PERSONAL_KEY, [])
  );

  // ── Analytics ──
  const [analytics, setAnalytics] = useState<ShortcutAnalyticsEvent[]>(() =>
    readJson<ShortcutAnalyticsEvent[]>(ANALYTICS_KEY, [])
  );

  useEffect(() => writeJson(QUICK_BAR_KEY, quickIds), [quickIds]);
  useEffect(() => writeJson(PERSONAL_KEY, personalIds), [personalIds]);
  useEffect(() => writeJson(ANALYTICS_KEY, analytics.slice(-MAX_ANALYTICS)), [analytics]);

  const trackUsage = useCallback(
    (shortcutId: string, via: ShortcutAnalyticsEvent["triggeredVia"], route?: string) => {
      setAnalytics((prev) => [
        ...prev,
        { shortcutId, triggeredVia: via, route, at: Date.now() },
      ]);
    },
    []
  );

  const executeShortcut = useCallback(
    (shortcut: Shortcut, via: ShortcutAnalyticsEvent["triggeredVia"] = "click") => {
      trackUsage(shortcut.id, via, shortcut.route);
      navigate(shortcut.route);
    },
    [navigate, trackUsage]
  );

  // ── Mutations ──
  const togglePersonal = useCallback((shortcutId: string) => {
    setPersonalIds((prev) =>
      prev.includes(shortcutId)
        ? prev.filter((id) => id !== shortcutId)
        : [...prev, shortcutId]
    );
  }, []);

  const toggleQuickBar = useCallback((shortcutId: string) => {
    setQuickIds((prev) => {
      if (prev.includes(shortcutId)) return prev.filter((id) => id !== shortcutId);
      if (prev.length >= MAX_QUICK) return prev;
      return [...prev, shortcutId];
    });
  }, []);

  const reorderQuickBar = useCallback((newOrder: string[]) => {
    setQuickIds(newOrder.slice(0, MAX_QUICK));
  }, []);

  const resetQuickBar = useCallback(() => {
    setQuickIds(getDefaultQuickAccess());
  }, []);

  // ── Derived collections ──
  const profileShortcuts = useMemo(() => getShortcutsByProfile(profile), [profile]);
  const contextualShortcuts = useMemo(() => getContextualShortcuts(pathname), [pathname]);

  const quickShortcuts = useMemo(
    () => quickIds.map(getShortcutById).filter(Boolean) as Shortcut[],
    [quickIds]
  );

  const personalShortcuts = useMemo(
    () => personalIds.map(getShortcutById).filter(Boolean) as Shortcut[],
    [personalIds]
  );

  // ── Analytics summary ──
  const usageStats = useMemo(() => {
    const counts: Record<string, number> = {};
    analytics.forEach((e) => (counts[e.shortcutId] = (counts[e.shortcutId] || 0) + 1));
    const ranked = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([id, count]) => ({ id, count, shortcut: getShortcutById(id) }))
      .filter((r) => r.shortcut);
    return {
      total: analytics.length,
      mostUsed: ranked.slice(0, 5),
      ignored: SHORTCUT_REGISTRY.filter((s) => !counts[s.id]).slice(0, 10),
    };
  }, [analytics]);

  return {
    profile,
    allShortcuts: SHORTCUT_REGISTRY,
    profileShortcuts,
    contextualShortcuts,
    quickShortcuts,
    personalShortcuts,
    quickIds,
    personalIds,
    executeShortcut,
    togglePersonal,
    toggleQuickBar,
    reorderQuickBar,
    resetQuickBar,
    trackUsage,
    usageStats,
  };
}
