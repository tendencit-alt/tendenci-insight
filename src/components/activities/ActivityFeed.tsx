import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare,
  CheckCircle,
  XCircle,
  ArrowRight,
  User,
  Package,
  Target,
  TrendingUp,
  ClipboardList,
  Factory,
  ShoppingCart,
  Calendar,
  Edit,
  Plus,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { SystemActivity } from "@/pages/ActivityCenter";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface ActivityFeedProps {
  activities: SystemActivity[];
  loading: boolean;
}

const moduleConfig: Record<string, { icon: any; color: string; label: string }> = {
  prospeccao: { icon: User, color: "text-blue-500", label: "Prospecção" },
  crm: { icon: TrendingUp, color: "text-green-500", label: "CRM" },
  projetos: { icon: Package, color: "text-purple-500", label: "Projetos" },
  producao: { icon: Factory, color: "text-orange-500", label: "Produção" },
  pedidos: { icon: ShoppingCart, color: "text-pink-500", label: "Pedidos" },
  metas: { icon: Target, color: "text-yellow-500", label: "Metas" },
  estoque: { icon: ClipboardList, color: "text-teal-500", label: "Estoque" },
};

const actionConfig: Record<string, { icon: any; color: string; bgColor: string }> = {
  comment: { icon: MessageSquare, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  crm_comment: { icon: MessageSquare, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  task_created: { icon: Plus, color: "text-green-500", bgColor: "bg-green-500/10" },
  task_completed: { icon: CheckCircle, color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
  task_cancelled: { icon: XCircle, color: "text-red-500", bgColor: "bg-red-500/10" },
  task_updated: { icon: Edit, color: "text-yellow-500", bgColor: "bg-yellow-500/10" },
  prospec_task_created: { icon: Calendar, color: "text-indigo-500", bgColor: "bg-indigo-500/10" },
  prospec_task_completed: { icon: CheckCircle, color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
  prospec_task_updated: { icon: Edit, color: "text-yellow-500", bgColor: "bg-yellow-500/10" },
  stage_change: { icon: ArrowRight, color: "text-purple-500", bgColor: "bg-purple-500/10" },
  deal_update: { icon: Edit, color: "text-orange-500", bgColor: "bg-orange-500/10" },
  created: { icon: Plus, color: "text-green-500", bgColor: "bg-green-500/10" },
  won: { icon: CheckCircle, color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
  lost: { icon: XCircle, color: "text-red-500", bgColor: "bg-red-500/10" },
  field_change: { icon: Edit, color: "text-yellow-500", bgColor: "bg-yellow-500/10" },
  status_change: { icon: ArrowRight, color: "text-purple-500", bgColor: "bg-purple-500/10" },
  indication: { icon: Target, color: "text-pink-500", bgColor: "bg-pink-500/10" },
  architect_update: { icon: Edit, color: "text-blue-500", bgColor: "bg-blue-500/10" },
};

export function ActivityFeed({ activities, loading }: ActivityFeedProps) {
  const navigate = useNavigate();

  const getNavigationPath = (activity: SystemActivity): string | null => {
    switch (activity.module) {
      case "prospeccao":
        if (activity.entity_type === "architect") {
          return `/prospeccao?architect=${activity.entity_id}`;
        }
        return "/prospeccao";
      case "crm":
        if (activity.entity_type === "deal") {
          return `/kanban?deal=${activity.entity_id}`;
        }
        return "/kanban";
      case "projetos":
        return "/projects";
      case "producao":
        return "/producao";
      case "pedidos":
        return "/pedidos";
      default:
        return null;
    }
  };

  const handleActivityClick = (activity: SystemActivity) => {
    const path = getNavigationPath(activity);
    if (path) {
      navigate(path);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Carregando atividades...</span>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-lg font-medium text-muted-foreground">Nenhuma atividade encontrada</p>
        <p className="text-sm text-muted-foreground/70">
          Tente ajustar os filtros ou aguarde novas atividades
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[600px] pr-4">
      <div className="space-y-4">
        {activities.map((activity, index) => {
          const module = moduleConfig[activity.module] || { icon: AlertCircle, color: "text-gray-500", label: activity.module };
          const action = actionConfig[activity.action_type] || { icon: AlertCircle, color: "text-gray-500", bgColor: "bg-gray-500/10" };
          const ModuleIcon = module.icon;
          const ActionIcon = action.icon;
          const path = getNavigationPath(activity);

          return (
            <div
              key={activity.id}
              className={`group relative flex gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-all ${path ? "cursor-pointer" : ""}`}
              onClick={() => handleActivityClick(activity)}
            >
              {/* Timeline line */}
              {index < activities.length - 1 && (
                <div className="absolute left-[26px] top-[60px] bottom-[-16px] w-px bg-border" />
              )}

              {/* Avatar */}
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarFallback className={`${action.bgColor} ${action.color}`}>
                  <ActionIcon className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    {/* User and action */}
                    <p className="text-sm">
                      <span className="font-semibold">{activity.user_name || "Sistema"}</span>
                      {" "}
                      <span className="text-muted-foreground">{activity.description}</span>
                    </p>

                    {/* Entity name */}
                    {activity.entity_name && (
                      <p className="text-sm font-medium text-foreground/80">
                        → {activity.entity_name}
                      </p>
                    )}

                    {/* Old/New values */}
                    {(activity.old_value || activity.new_value) && (
                      <div className="flex items-center gap-2 text-xs">
                        {activity.old_value && (
                          <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-500 line-through">
                            {activity.old_value.substring(0, 50)}
                          </span>
                        )}
                        {activity.old_value && activity.new_value && (
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        )}
                        {activity.new_value && (
                          <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-500">
                            {activity.new_value.substring(0, 50)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Time and module */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-xs text-muted-foreground" title={format(new Date(activity.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}>
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                    <Badge variant="outline" className={`text-xs ${module.color}`}>
                      <ModuleIcon className="h-3 w-3 mr-1" />
                      {module.label}
                    </Badge>
                  </div>
                </div>

                {/* View button on hover */}
                {path && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Ver detalhes
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
