import { Badge } from "@/components/ui/badge";
import { Calendar, FolderOpen } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ArchitectTagsProps {
  ultimoProjetoData: string | null;
  dataUltimoContato: string | null;
  active: boolean;
}

export function ArchitectTags({ ultimoProjetoData, dataUltimoContato, active }: ArchitectTagsProps) {
  const formatDate = (date: string | null) => {
    if (!date) return null;
    try {
      return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return null;
    }
  };

  const getRelativeTime = (date: string | null) => {
    if (!date) return null;
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
    } catch {
      return null;
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {/* Tag de Último Projeto */}
      {ultimoProjetoData ? (
        <Badge variant="outline" className="flex items-center gap-1 bg-blue-50 border-blue-200">
          <FolderOpen className="h-3 w-3" />
          <span className="text-xs">
            Último Projeto: {formatDate(ultimoProjetoData)}
          </span>
        </Badge>
      ) : (
        <Badge variant="outline" className="flex items-center gap-1 bg-gray-50 border-gray-200">
          <FolderOpen className="h-3 w-3" />
          <span className="text-xs">Nunca Enviou Projeto</span>
        </Badge>
      )}

      {/* Tag de Último Contato */}
      {dataUltimoContato ? (
        <Badge variant="outline" className="flex items-center gap-1 bg-green-50 border-green-200">
          <Calendar className="h-3 w-3" />
          <span className="text-xs">
            Último Contato: {getRelativeTime(dataUltimoContato)}
          </span>
        </Badge>
      ) : (
        <Badge variant="outline" className="flex items-center gap-1 bg-yellow-50 border-yellow-200">
          <Calendar className="h-3 w-3" />
          <span className="text-xs">Sem registro de contato</span>
        </Badge>
      )}

      {/* Tag de Status Inativo */}
      {!active && (
        <Badge variant="destructive" className="flex items-center gap-1">
          <span className="text-xs">⚠️ Inativo (45+ dias)</span>
        </Badge>
      )}
    </div>
  );
}
