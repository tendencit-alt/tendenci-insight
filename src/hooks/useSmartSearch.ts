import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  searchClients,
  searchOrders,
  searchProjects,
  searchPayables,
  searchReceivables,
  searchSuppliers,
  searchStatic,
} from "@/components/smart-search/searchProviders";
import {
  CONTEXT_PRIORITIES,
  detectContext,
  matchIntent,
} from "@/components/smart-search/intentRegistry";
import type {
  SavedSearch,
  SearchAnalyticsEvent,
  SearchContext,
  SearchResult,
} from "@/components/smart-search/types";

const SAVED_KEY = "smart-search:saved";
const ANALYTICS_KEY = "smart-search:analytics";
const RECENT_KEY = "smart-search:recent";

function readJSON<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function useSmartSearch() {
  const location = useLocation();
  const context: SearchContext = detectContext(location.pathname);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(() =>
    readJSON<SavedSearch[]>(SAVED_KEY, [])
  );
  const [recentQueries, setRecentQueries] = useState<string[]>(() =>
    readJSON<string[]>(RECENT_KEY, [])
  );

  const debounceRef = useRef<number | null>(null);
  const abandonRef = useRef<{ query: string; ts: number } | null>(null);

  const intent = useMemo(() => matchIntent(query), [query]);

  const trackEvent = useCallback((event: Partial<SearchAnalyticsEvent> & { query: string }) => {
    const events = readJSON<SearchAnalyticsEvent[]>(ANALYTICS_KEY, []);
    events.push({
      timestamp: new Date().toISOString(),
      resultCount: 0,
      hadResults: false,
      context,
      ...event,
    } as SearchAnalyticsEvent);
    writeJSON(ANALYTICS_KEY, events.slice(-500));
  }, [context]);

  const performSearch = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);

      const intentResult: SearchResult[] = [];
      const matched = matchIntent(q);
      if (matched) {
        intentResult.push({
          id: `intent-${matched.key}`,
          type: "intent",
          title: matched.label,
          subtitle: matched.description,
          badge: "Sugestão inteligente",
          route: matched.route,
          score: 200,
        });
      }

      try {
        const [clients, orders, projects, payables, receivables, suppliers] = await Promise.all([
          searchClients(q).catch(() => []),
          searchOrders(q).catch(() => []),
          searchProjects(q).catch(() => []),
          searchPayables(q).catch(() => []),
          searchReceivables(q).catch(() => []),
          searchSuppliers(q).catch(() => []),
        ]);
        const staticResults = searchStatic(q);
        const all = [
          ...intentResult,
          ...clients,
          ...orders,
          ...projects,
          ...payables,
          ...receivables,
          ...suppliers,
          ...staticResults,
        ];

        // Apply context priority boost
        const priorities = CONTEXT_PRIORITIES[context];
        const boosted = all.map((r) => {
          const idx = priorities.indexOf(r.type);
          const boost = idx >= 0 ? (priorities.length - idx) * 5 : 0;
          return { ...r, score: (r.score || 0) + boost };
        });
        boosted.sort((a, b) => (b.score || 0) - (a.score || 0));
        setResults(boosted);

        trackEvent({
          query: q,
          resultCount: boosted.length,
          hadResults: boosted.length > 0,
        });
      } finally {
        setLoading(false);
      }
    },
    [context, trackEvent]
  );

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    abandonRef.current = { query, ts: Date.now() };
    debounceRef.current = window.setTimeout(() => {
      performSearch(query);
    }, 250);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, performSearch]);

  const saveSearch = useCallback(
    (name: string) => {
      if (!query.trim() || !name.trim()) return;
      const saved: SavedSearch = {
        id: `s-${Date.now()}`,
        name: name.trim(),
        query: query.trim(),
        intentKey: intent?.key,
        createdAt: new Date().toISOString(),
      };
      const next = [saved, ...savedSearches].slice(0, 30);
      setSavedSearches(next);
      writeJSON(SAVED_KEY, next);
    },
    [query, intent, savedSearches]
  );

  const removeSavedSearch = useCallback(
    (id: string) => {
      const next = savedSearches.filter((s) => s.id !== id);
      setSavedSearches(next);
      writeJSON(SAVED_KEY, next);
    },
    [savedSearches]
  );

  const loadSavedSearch = useCallback((saved: SavedSearch) => {
    setQuery(saved.query);
  }, []);

  const trackAction = useCallback(
    (q: string, action: string) => {
      trackEvent({ query: q, actionTaken: action, hadResults: true, resultCount: results.length });
      const next = [q, ...recentQueries.filter((r) => r !== q)].slice(0, 10);
      setRecentQueries(next);
      writeJSON(RECENT_KEY, next);
      abandonRef.current = null;
    },
    [trackEvent, results.length, recentQueries]
  );

  const trackAbandon = useCallback(() => {
    if (abandonRef.current && Date.now() - abandonRef.current.ts > 1500) {
      trackEvent({
        query: abandonRef.current.query,
        abandoned: true,
        resultCount: results.length,
        hadResults: results.length > 0,
      });
    }
    abandonRef.current = null;
  }, [trackEvent, results.length]);

  return {
    query,
    setQuery,
    results,
    loading,
    intent,
    context,
    savedSearches,
    recentQueries,
    saveSearch,
    removeSavedSearch,
    loadSavedSearch,
    trackAction,
    trackAbandon,
  };
}

export function getSearchAnalytics(): SearchAnalyticsEvent[] {
  return readJSON<SearchAnalyticsEvent[]>(ANALYTICS_KEY, []);
}
