import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, Save, Copy, Trash2, MoreHorizontal, Loader2 } from "lucide-react";
import type { FormViewProps } from "./types";
import { FORM_STATUS_COLORS } from "./types";

type Props = Pick<FormViewProps,
  "title" | "subtitle" | "status" | "isNew" |
  "onSave" | "onSaveAndClose" | "onDuplicate" | "onDelete" | "extraActions" | "saving" |
  "onBack" | "backLabel" | "lastSavedAt"
>;

export function FormViewHeader({
  title, subtitle, status, isNew,
  onSave, onSaveAndClose, onDuplicate, onDelete, extraActions, saving,
  onBack, backLabel, lastSavedAt,
}: Props) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        {onBack && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">
              {isNew ? "Novo Registro" : title}
            </h1>
            {status && (
              <Badge className={`text-[11px] ${FORM_STATUS_COLORS[status.color] || FORM_STATUS_COLORS.gray}`}>
                {status.label}
              </Badge>
            )}
          </div>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          {lastSavedAt && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Salvo automaticamente às {lastSavedAt}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onSave && (
          <Button size="sm" className="h-8" onClick={onSave} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
            Salvar
          </Button>
        )}
        {onSaveAndClose && (
          <Button variant="outline" size="sm" className="h-8" onClick={onSaveAndClose} disabled={saving}>
            Salvar e Fechar
          </Button>
        )}

        {(onDuplicate || onDelete || extraActions?.length) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onDuplicate && (
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="h-3.5 w-3.5 mr-2" />Duplicar
                </DropdownMenuItem>
              )}
              {extraActions?.map((a) => (
                <DropdownMenuItem key={a.key} onClick={a.onClick} disabled={a.disabled}>
                  {a.icon && <a.icon className="h-3.5 w-3.5 mr-2" />}
                  {a.label}
                </DropdownMenuItem>
              ))}
              {onDelete && (
                <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                  <Trash2 className="h-3.5 w-3.5 mr-2" />Excluir
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
