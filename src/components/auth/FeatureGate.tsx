import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
}

/**
 * Verifica se o tenant tem a feature liberada via RPC tenant_has_feature.
 * Owner sempre passa (decidido na função SQL).
 * Sem permissão → redireciona para /configuracoes/assinatura?upgrade=<feature>.
 */
export function FeatureGate({ feature, children }: FeatureGateProps) {
  const [state, setState] = useState<"loading" | "allowed" | "denied">("loading");
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("tenant_has_feature", { _feature_key: feature });
        if (!mounted) return;
        if (error) {
          console.error("tenant_has_feature error", error);
          setState("denied");
          return;
        }
        setState(data === true ? "allowed" : "denied");
      } catch (e) {
        console.error(e);
        if (mounted) setState("denied");
      }
    })();
    return () => { mounted = false; };
  }, [feature]);

  if (state === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (state === "denied") {
    return <Navigate to={`/configuracoes/assinatura?upgrade=${encodeURIComponent(feature)}`} replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
