import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import NotFound from "@/pages/NotFound";

// Mapeamento de módulos para rotas reais do sistema
const MODULE_TO_ROUTE_MAP: Record<string, string> = {
  dashboard: "/bi-dashboard",
  leads: "/leads",
  crm: "/crm",
  projetos: "/projects",
  arquitetos: "/prospeccao",
  metas: "/metas",
  configuracoes: "/settings",
  gestao_usuarios: "/settings",
  dashboards_personalizados: "/dashboards",
};

export function DynamicRouteHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const [checked, setChecked] = useState(false);
  const [isValidRoute, setIsValidRoute] = useState(false);

  useEffect(() => {
    const checkAndRedirect = async () => {
      // Verificar se a rota atual existe no banco como uma rota editada
      const { data } = await supabase
        .from('menu_items')
        .select('route, module')
        .eq('route', location.pathname)
        .single();

      if (data && data.module) {
        const realRoute = MODULE_TO_ROUTE_MAP[data.module];
        if (realRoute && realRoute !== location.pathname) {
          // Redirecionar para a rota real baseada no módulo
          navigate(realRoute, { replace: true });
          setIsValidRoute(true);
        }
      }

      setChecked(true);
    };

    checkAndRedirect();
  }, [location.pathname, navigate]);

  // Mostrar loading enquanto verifica
  if (!checked) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se é uma rota válida que foi redirecionada, não mostrar nada
  if (isValidRoute) {
    return null;
  }

  // Se não é uma rota editada, mostrar 404
  return <NotFound />;
}

