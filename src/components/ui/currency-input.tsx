import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
}

export function CurrencyInput({ value, onChange, className, ...props }: CurrencyInputProps) {
  const formatToDisplay = (val: string): string => {
    // Remove tudo exceto números
    const numericValue = val.replace(/\D/g, '');
    
    if (!numericValue) return '';
    
    // Converte para número e divide por 100 para os centavos
    const numberValue = parseInt(numericValue, 10) / 100;
    
    // Formata como moeda brasileira
    return numberValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const formatted = formatToDisplay(inputValue);
    onChange(formatted);
  };

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
        R$
      </span>
      <Input
        {...props}
        type="text"
        inputMode="numeric"
        value={value}
        onChange={handleChange}
        className={cn("pl-10", className)}
        placeholder="0,00"
      />
    </div>
  );
}

// Helper function to parse currency string to number
export function parseCurrencyToNumber(value: string): number {
  if (!value) return 0;
  // Remove R$, espaços e pontos de milhar, substitui vírgula por ponto
  const cleanValue = value
    .replace(/R\$\s?/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  return parseFloat(cleanValue) || 0;
}

// Helper function to format number to currency display
export function formatToCurrencyDisplay(value: number): string {
  return (value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Numeric variant: accepts a number and emits a number. Same R$ 10,00 mask.
interface MoneyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number | null | undefined;
  onChange: (value: number) => void;
}

export function MoneyInput({ value, onChange, className, ...props }: MoneyInputProps) {
  const [display, setDisplay] = React.useState<string>(
    value != null && value !== 0 ? formatToCurrencyDisplay(Number(value)) : ""
  );

  React.useEffect(() => {
    const numFromDisplay = parseCurrencyToNumber(display);
    const incoming = Number(value) || 0;
    if (Math.abs(numFromDisplay - incoming) > 0.005) {
      setDisplay(incoming === 0 ? "" : formatToCurrencyDisplay(incoming));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = e.target.value.replace(/\D/g, '');
    if (!numericValue) {
      setDisplay('');
      onChange(0);
      return;
    }
    const numberValue = parseInt(numericValue, 10) / 100;
    setDisplay(numberValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }));
    onChange(numberValue);
  };

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
        R$
      </span>
      <Input
        {...props}
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        className={cn("pl-10", className)}
        placeholder="0,00"
      />
    </div>
  );
}
