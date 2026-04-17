import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { WIDGET_REGISTRY, DEFAULT_LAYOUTS } from "@/components/smart-dashboards/widgetRegistry";
import type { DashboardProfile, WidgetInstance, WidgetSize, SavedDashboard } from "@/components/smart-dashboards/types";

const LAYOUT_KEY = (userId: string, profile: DashboardProfile) =>
  `tendenci.dashboard.layout.${userId}.${profile}`;
const SAVED_KEY = (userId: string) => `tendenci.dashboard.saved.${userId}`;
const ANALYTICS_KEY = (userId: string) => `tendenci.dashboard.analytics.${userId}`;

interface WidgetAnalytics {
  views: Record<string, number>;
  clicks: Record<string, number>;
  removed: Record<string, number>;
  lastUsed: Record<string, string>;
}

function buildDefaultLayout(profile: DashboardProfile): WidgetInstance[] {
  return DEFAULT_LAYOUTS[profile].map((widgetId, idx) => {
    const def = WIDGET_REGISTRY[widgetId];
    return { widgetId, size: def?.defaultSize || "sm", position: idx };
  });
}

export function useDashboardLayout(profile: DashboardProfile) {
  const { user } = useAuth();
  const userId = user?.id || "anon";

  const [widgets, setWidgets] = useState<WidgetInstance[]>(() => {
    try {
      const raw = localStorage.getItem(LAYOUT_KEY(userId, profile));
      if (raw) return JSON.parse(raw);
    } catch {}
    return buildDefaultLayout(profile);
  });

  // Reload when profile or user changes
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LAYOUT_KEY(userId, profile));
      setWidgets(raw ? JSON.parse(raw) : buildDefaultLayout(profile));
    } catch {
      setWidgets(buildDefaultLayout(profile));
    }
  }, [userId, profile]);

  // Persist
  useEffect(() => {
    try {
      localStorage.setItem(LAYOUT_KEY(userId, profile), JSON.stringify(widgets));
    } catch {}
  }, [widgets, userId, profile]);

  const addWidget = useCallback((widgetId: string) => {
    setWidgets((prev) => {
      if (prev.some((w) => w.widgetId === widgetId)) return prev;
      const def = WIDGET_REGISTRY[widgetId];
      return [...prev, { widgetId, size: def?.defaultSize || "sm", position: prev.length }];
    });
  }, []);

  const removeWidget = useCallback((widgetId: string) => {
    setWidgets((prev) => prev.filter((w) => w.widgetId !== widgetId));
    trackAnalytics(userId, "removed", widgetId);
  }, [userId]);

  const resizeWidget = useCallback((widgetId: string, size: WidgetSize) => {
    setWidgets((prev) => prev.map((w) => (w.widgetId === widgetId ? { ...w, size } : w)));
  }, []);

  const togglePin = useCallback((widgetId: string) => {
    setWidgets((prev) => prev.map((w) => (w.widgetId === widgetId ? { ...w, pinned: !w.pinned } : w)));
  }, []);

  const moveWidget = useCallback((widgetId: string, direction: "up" | "down") => {
    setWidgets((prev) => {
      const idx = prev.findIndex((w) => w.widgetId === widgetId);
      if (idx === -1) return prev;
      const target = direction === "up" ? idx - 1 : idx + 1;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next.map((w, i) => ({ ...w, position: i }));
    });
  }, []);

  const reset = useCallback(() => {
    setWidgets(buildDefaultLayout(profile));
  }, [profile]);

  const sorted = useMemo(() => {
    return [...widgets].sort((a, b) => {
      if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
      return a.position - b.position;
    });
  }, [widgets]);

  return { widgets: sorted, addWidget, removeWidget, resizeWidget, togglePin, moveWidget, reset };
}

// Saved dashboards
export function useSavedDashboards() {
  const { user } = useAuth();
  const userId = user?.id || "anon";

  const [saved, setSaved] = useState<SavedDashboard[]>(() => {
    try {
      const raw = localStorage.getItem(SAVED_KEY(userId));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SAVED_KEY(userId), JSON.stringify(saved));
    } catch {}
  }, [saved, userId]);

  const save = useCallback((dashboard: Omit<SavedDashboard, "id" | "createdAt">) => {
    const item: SavedDashboard = {
      ...dashboard,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setSaved((prev) => [...prev, item]);
    return item;
  }, []);

  const remove = useCallback((id: string) => {
    setSaved((prev) => prev.filter((d) => d.id !== id));
  }, []);

  return { saved, save, remove };
}

// Analytics
function trackAnalytics(userId: string, type: keyof WidgetAnalytics, widgetId: string) {
  try {
    const raw = localStorage.getItem(ANALYTICS_KEY(userId));
    const data: WidgetAnalytics = raw
      ? JSON.parse(raw)
      : { views: {}, clicks: {}, removed: {}, lastUsed: {} };
    if (type === "lastUsed") {
      data.lastUsed[widgetId] = new Date().toISOString();
    } else {
      data[type][widgetId] = (data[type][widgetId] || 0) + 1;
      data.lastUsed[widgetId] = new Date().toISOString();
    }
    localStorage.setItem(ANALYTICS_KEY(userId), JSON.stringify(data));
  } catch {}
}

export function trackWidgetView(userId: string, widgetId: string) {
  trackAnalytics(userId, "views", widgetId);
}

export function trackWidgetClick(userId: string, widgetId: string) {
  trackAnalytics(userId, "clicks", widgetId);
}

export function getWidgetAnalytics(userId: string): WidgetAnalytics | null {
  try {
    const raw = localStorage.getItem(ANALYTICS_KEY(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
