import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, AlertTriangle, Info, AlertCircle, Link2, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { FormViewTimelineEntry, FormViewRelation, FormViewAlert, FormViewSidePanelTab } from "./types";
import { ReactNode } from "react";

interface Props {
  timeline?: FormViewTimelineEntry[];
  relations?: FormViewRelation[];
  alerts?: FormViewAlert[];
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  extra?: ReactNode;
  tabs?: FormViewSidePanelTab[];
}

const ALERT_ICONS = { info: Info, warning: AlertTriangle, error: AlertCircle };
const ALERT_COLORS = {
  info: "border-blue-200 bg-blue-50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-400",
  warning: "border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 text-yellow-800 dark:text-yellow-400",
  error: "border-destructive/30 bg-destructive/5 text-destructive",
};

export function FormViewSidePanel({ timeline, relations, alerts, createdAt, createdBy, updatedAt, updatedBy, extra, tabs }: Props) {
  const [activeTab, setActiveTab] = useState<string>(tabs?.[0]?.key || "timeline");

  // If tabs are provided, render tabbed interface
  const hasTabs = tabs && tabs.length > 0;

  return (
    <div className="space-y-4 w-full lg:w-[320px] flex-shrink-0">
      {/* Alerts */}
      {alerts && alerts.length > 0 && (
        <Card>
          <CardContent className="p-3 space-y-2">
            {alerts.map((alert, i) => {
              const Icon = ALERT_ICONS[alert.severity];
              return (
                <div key={i} className={`flex items-start gap-2 p-2.5 rounded-lg border text-sm ${ALERT_COLORS[alert.severity]}`}>
                  <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{alert.message}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Audit */}
      {(createdAt || updatedAt) && (
        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Auditoria</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-2 text-xs">
            {createdAt && (
              <div className="flex items-center gap-2">
                <User className="h-3 w-3 text-muted-foreground" />
                <span>Criado por <strong>{createdBy || "—"}</strong></span>
                <span className="text-muted-foreground ml-auto">
                  {formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: ptBR })}
                </span>
              </div>
            )}
            {updatedAt && (
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span>Editado por <strong>{updatedBy || "—"}</strong></span>
                <span className="text-muted-foreground ml-auto">
                  {formatDistanceToNow(new Date(updatedAt), { addSuffix: true, locale: ptBR })}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabbed content or default layout */}
      {hasTabs ? (
        <Card>
          <CardContent className="p-0">
            {/* Tab buttons */}
            <div className="flex border-b overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap",
                    activeTab === tab.key
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.icon && <tab.icon className="h-3.5 w-3.5" />}
                  {tab.label}
                  {tab.badge !== undefined && (
                    <Badge variant="secondary" className="text-[9px] h-4 px-1">{tab.badge}</Badge>
                  )}
                </button>
              ))}
            </div>
            {/* Tab content */}
            <div className="p-3">
              {tabs.map((tab) => (
                <div key={tab.key} className={activeTab === tab.key ? "block" : "hidden"}>
                  {tab.content}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Relations */}
          {relations && relations.length > 0 && (
            <Card>
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Vínculos</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 space-y-1.5">
                {relations.map((rel, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 cursor-pointer text-sm">
                    <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{rel.title}</p>
                      <p className="text-[10px] text-muted-foreground">{rel.type}</p>
                    </div>
                    {rel.status && <Badge variant="outline" className="text-[10px] h-4">{rel.status}</Badge>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          {timeline && timeline.length > 0 && (
            <Card>
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Timeline</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <ScrollArea className="h-[250px]">
                  <div className="space-y-3">
                    {timeline.map((entry) => (
                      <div key={entry.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                          <div className="w-px flex-1 bg-border" />
                        </div>
                        <div className="pb-3">
                          <p className="text-sm font-medium">{entry.action}</p>
                          <p className="text-[11px] text-muted-foreground">{entry.user}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true, locale: ptBR })}
                          </p>
                          {entry.detail && <p className="text-xs text-muted-foreground mt-0.5">{entry.detail}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {extra}
    </div>
  );
}
