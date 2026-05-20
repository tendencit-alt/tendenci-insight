import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FieldErrorProps {
  /** Mensagem específica para o campo (ex.: "E-mail inválido"). Se vazio, não renderiza. */
  message?: string | null;
  /** Id para acessibilidade (use o mesmo em aria-describedby do input) */
  id?: string;
  className?: string;
}

/**
 * Mensagem de erro inline para campos de formulário.
 * Padrão de uso:
 *
 *   <Label htmlFor="email">E-mail</Label>
 *   <Input id="email" aria-invalid={!!errors.email} aria-describedby="email-error" />
 *   <FieldError id="email-error" message={errors.email} />
 */
export function FieldError({ message, id, className }: FieldErrorProps) {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      className={cn(
        'mt-1 flex items-start gap-1 text-xs text-destructive',
        className
      )}
    >
      <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden />
      <span>{message}</span>
    </p>
  );
}
