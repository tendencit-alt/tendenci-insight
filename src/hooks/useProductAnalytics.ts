import { useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// ── Session ID (stable per browser tab) ──
const SESSION_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// ── Module map ──
const ROUTE_MODULE_MAP: Record<string, string> = {
  "/financeiro": "Financeiro",
  "/dre": "DRE",
  "/fluxo-caixa": "Fluxo de Caixa",
  "/pedidos": "Pedidos",
  "/conciliacao": "Conciliação Bancária",
  "/metas": "Metas",
  "/forecast": "Forecast",
  "/bi-dashboard": "Dashboard",
  "/dashboards": "Dashboards",
  "/crm": "CRM",
  "/leads": "Leads",
  "/producao": "Produção",
  "/projects": "Projetos",
  "/prospeccao": "Prospecção",
  "/fornecedores": "Fornecedores",
  "/relatorios": "KPI's",
  "/controladoria": "Controladoria",
  "/settings": "Configurações",
};

function resolveModule(path: string): string {
  // Direct match
  if (ROUTE_MODULE_MAP[path]) return ROUTE_MODULE_MAP[path];
  // Prefix match
  const base = "/" + (path.split("/")[1] || "");
  return ROUTE_MODULE_MAP[base] || path;
}

/** Lightweight product analytics tracker */
export function useProductAnalytics() {
  const { user } = useAuth();
  const location = useLocation();
  const enterTimeRef = useRef<number>(Date.now());
  const lastPathRef = useRef<string>("");

  // ── Generic track event ──
  const track = useCallback(
    async (
      eventType: string,
      module?: string,
      feature?: string,
      metadata?: Record<string, unknown>,
      durationMs?: number
    ) => {
      if (!user) return;
      try {
        await (supabase as any).from("product_analytics_events").insert({
          user_id: user.id,
          session_id: SESSION_ID,
          event_type: eventType,
          module: module || null,
          feature: feature || null,
          metadata: metadata || {},
          duration_ms: durationMs || null,
        });
      } catch {
        // silent – analytics should never break UX
      }
    },
    [user]
  );

  // ── Auto-track page views + time on page ──
  useEffect(() => {
    if (!user) return;
    const currentPath = location.pathname;
    const currentModule = resolveModule(currentPath);

    // Send duration for previous page
    if (lastPathRef.current && lastPathRef.current !== currentPath) {
      const duration = Date.now() - enterTimeRef.current;
      if (duration > 1000) {
        track("page_duration", resolveModule(lastPathRef.current), undefined, undefined, duration);
      }
    }

    // Track new page view
    track("page_view", currentModule, undefined, { path: currentPath });
    enterTimeRef.current = Date.now();
    lastPathRef.current = currentPath;
  }, [location.pathname, user, track]);

  // ── Convenience helpers ──
  const trackFeatureUse = useCallback(
    (module: string, feature: string, meta?: Record<string, unknown>) =>
      track("feature_use", module, feature, meta),
    [track]
  );

  const trackFlowAbandon = useCallback(
    (module: string, feature: string, step?: string) =>
      track("flow_abandon", module, feature, { step }),
    [track]
  );

  const trackFirstValue = useCallback(
    (module: string, feature: string) =>
      track("first_value", module, feature),
    [track]
  );

  const trackNavError = useCallback(
    (module: string, detail?: string) =>
      track("error_nav", module, undefined, { detail }),
    [track]
  );

  return { track, trackFeatureUse, trackFlowAbandon, trackFirstValue, trackNavError };
}
