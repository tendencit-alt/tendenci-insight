import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: number | string | null | undefined;
  onChange: (value: number) => void;
  /** number of decimal places allowed (default 2) */
  decimals?: number;
  /** allow negative values (default false) */
  allowNegative?: boolean;
}

/**
 * Currency-friendly numeric input that accepts both "." and "," as decimal separators.
 * Internally stores the raw user typing so the caret behaves naturally, while
 * the parsed numeric value is emitted via onChange.
 *
 * Use this for any monetary / decimal value field (R$, %, valores em geral)
 * em vez de <Input type="number" />, que rejeita "," no pt-BR.
 */
export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, decimals = 2, allowNegative = false, className, onBlur, ...props }, ref) => {
    const formatFromValue = React.useCallback(
      (v: number | string | null | undefined) => {
        if (v === null || v === undefined || v === "") return "";
        const num = typeof v === "number" ? v : Number(String(v).replace(",", "."));
        if (!Number.isFinite(num)) return "";
        if (num === 0) return "0";
        // Show up to `decimals` places, dropping trailing zeros, using comma
        return num
          .toFixed(decimals)
          .replace(/\.?0+$/, "")
          .replace(".", ",");
      },
      [decimals]
    );

    const [internal, setInternal] = React.useState<string>(() => formatFromValue(value));
    const [focused, setFocused] = React.useState(false);

    // Sync external value when not focused (avoids fighting the user's typing)
    React.useEffect(() => {
      if (!focused) setInternal(formatFromValue(value));
    }, [value, focused, formatFromValue]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let raw = e.target.value;
      // Keep only digits, separators, and optional sign
      const allowed = allowNegative ? /[^\d,.\-]/g : /[^\d,.]/g;
      raw = raw.replace(allowed, "");
      // Collapse multiple separators: keep only the first occurrence
      const firstSep = raw.search(/[.,]/);
      if (firstSep !== -1) {
        const before = raw.slice(0, firstSep + 1);
        const after = raw.slice(firstSep + 1).replace(/[.,]/g, "");
        raw = before + after;
      }
      // Limit decimals
      const match = raw.match(/^(-?\d*)([.,])?(\d*)$/);
      if (match && match[3] && match[3].length > decimals) {
        raw = `${match[1]}${match[2]}${match[3].slice(0, decimals)}`;
      }
      setInternal(raw);

      const normalized = raw.replace(",", ".");
      if (normalized === "" || normalized === "-" || normalized === "." || normalized === "-.") {
        onChange(0);
        return;
      }
      const num = Number(normalized);
      if (Number.isFinite(num)) onChange(num);
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        className={cn(className)}
        value={internal}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          setInternal(formatFromValue(value));
          onBlur?.(e);
        }}
        onChange={handleChange}
        {...props}
      />
    );
  }
);
CurrencyInput.displayName = "CurrencyInput";
