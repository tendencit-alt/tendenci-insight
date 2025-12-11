import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Phone, Mail, MapPin } from "lucide-react";

interface SuppliersTableProps {
  suppliers: any[];
  isLoading: boolean;
  onSelect: (supplier: any) => void;
}

export default function SuppliersTable({ suppliers, isLoading, onSelect }: SuppliersTableProps) {
  if (isLoading) {
    return (
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CNPJ/CPF</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (suppliers.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        Nenhum fornecedor encontrado
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>CNPJ/CPF</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead>Cidade</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {suppliers.map((supplier) => (
            <TableRow 
              key={supplier.id} 
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onSelect(supplier)}
            >
              <TableCell>
                <div>
                  <p className="font-medium">{supplier.name}</p>
                  {supplier.trade_name && (
                    <p className="text-xs text-muted-foreground">{supplier.trade_name}</p>
                  )}
                </div>
              </TableCell>
              <TableCell className="font-mono text-sm">
                {supplier.cpf_cnpj || "-"}
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1 text-sm">
                  {supplier.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {supplier.phone}
                    </span>
                  )}
                  {supplier.email && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {supplier.email}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {supplier.city && supplier.state ? (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {supplier.city}/{supplier.state}
                  </span>
                ) : "-"}
              </TableCell>
              <TableCell>
                <Badge variant={supplier.active ? "default" : "secondary"}>
                  {supplier.active ? "Ativo" : "Inativo"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
