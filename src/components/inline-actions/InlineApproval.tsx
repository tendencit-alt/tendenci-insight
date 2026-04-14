import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CheckCircle2, XCircle, Loader2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface InlineApprovalProps {
  onApprove: (comment?: string) => Promise<void> | void;
  onReject: (reason: string) => Promise<void> | void;
  disabled?: boolean;
  requireRejectReason?: boolean;
  className?: string;
}

export function InlineApproval({
  onApprove,
  onReject,
  disabled,
  requireRejectReason = true,
  className,
}: InlineApprovalProps) {
  const [saving, setSaving] = useState<"approve" | "reject" | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const handleApprove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setSaving("approve");
    try {
      await onApprove();
    } finally {
      setSaving(null);
    }
  };

  const handleReject = async () => {
    if (requireRejectReason && !rejectReason.trim()) return;
    setSaving("reject");
    try {
      await onReject(rejectReason);
      setRejectOpen(false);
      setRejectReason("");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className={cn("inline-flex items-center gap-1", className)} onClick={(e) => e.stopPropagation()}>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 text-[10px] px-2 gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
        onClick={handleApprove}
        disabled={disabled || saving !== null}
      >
        {saving === "approve" ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <CheckCircle2 className="h-3 w-3" />
        )}
        Aprovar
      </Button>

      <Popover open={rejectOpen} onOpenChange={setRejectOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] px-2 gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
            disabled={disabled || saving !== null}
          >
            {saving === "reject" ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
            Reprovar
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="end">
          <div className="space-y-2">
            <p className="text-xs font-medium flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> Motivo da reprovação
            </p>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Descreva o motivo..."
              rows={2}
              className="text-xs"
            />
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setRejectOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="h-6 text-[10px]"
                onClick={handleReject}
                disabled={requireRejectReason && !rejectReason.trim()}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
