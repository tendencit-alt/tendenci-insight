import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * DateBrInput
 * Input de data com máscara dd/mm/aaaa para exibição,
 * mas armazena/emite valor no formato ISO yyyy-mm-dd.
 *
 * Resolve o bug de inputs nativos type="date" controlados que
 * recebem/emitem valores em formato BR e acabam corrompendo os
 * segmentos do calendário do navegador.
 *
 * Props:
 *  - value: string em ISO yyyy-mm-dd (ou "")
 *  - onChange: recebe string em ISO yyyy-mm-dd (ou "" quando incompleto/inválido)
 */
export interface DateBrInputProps
  extends Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> {
  value: string;
  onChange: (isoValue: string) => void;
}

function isoToBr(iso: string): string {
  if (!iso) return "";
  // espera yyyy-mm-dd (pode vir com hora; pegamos só a data)
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function applyMask(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  const dd = digits.slice(0, 2);
  const mm = digits.slice(2, 4);
  const yyyy = digits.slice(4, 8);
  let out = dd;
  if (digits.length >= 3) out += "/" + mm;
  if (digits.length >= 5) out += "/" + yyyy;
  return out;
}

function brToIso(br: string): string {
  const digits = br.replace(/\D/g, "");
  if (digits.length !== 8) return "";
  const dd = parseInt(digits.slice(0, 2), 10);
  const mm = parseInt(digits.slice(2, 4), 10);
  const yyyy = parseInt(digits.slice(4, 8), 10);
  if (
    !dd ||
    !mm ||
    !yyyy ||
    mm < 1 ||
    mm > 12 ||
    dd < 1 ||
    dd > 31 ||
    yyyy < 1900 ||
    yyyy > 9999
  ) {
    return "";
  }
  // valida data real (rejeita 31/02 etc)
  const d = new Date(yyyy, mm - 1, dd);
  if (
    d.getFullYear() !== yyyy ||
    d.getMonth() !== mm - 1 ||
    d.getDate() !== dd
  ) {
    return "";
  }
  return `${String(yyyy).padStart(4, "0")}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

export const DateBrInput = React.forwardRef<HTMLInputElement, DateBrInputProps>(
  ({ value, onChange, className, placeholder = "dd/mm/aaaa", ...props }, ref) => {
    const [display, setDisplay] = React.useState<string>(isoToBr(value));

    // Mantém display sincronizado quando o value ISO externo muda
    React.useEffect(() => {
      const next = isoToBr(value);
      // só atualiza se mudou de fato para não atrapalhar digitação
      const currentIso = brToIso(display);
      if (next !== display && (value || "") !== currentIso) {
        setDisplay(next);
      }
    }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const masked = applyMask(e.target.value);
      setDisplay(masked);
      const iso = brToIso(masked);
      // emite ISO válido ou "" enquanto incompleto
      onChange(iso);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const iso = brToIso(display);
      if (!iso && display.replace(/\D/g, "").length > 0) {
        // incompleto/ inválido — limpa
        setDisplay("");
        onChange("");
      }
      props.onBlur?.(e);
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={display}
        onChange={handleChange}
        onBlur={handleBlur}
        maxLength={10}
        className={cn(className)}
        {...props}
      />
    );
  },
);
DateBrInput.displayName = "DateBrInput";
