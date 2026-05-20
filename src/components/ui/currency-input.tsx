import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

/** Parses a pt-BR currency display string ("1.234,56") into a number. */
export function parseCurrencyToNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  // Strip everything that is not digit, comma, dot or minus
  let raw = String(value).replace(/[^\d,.\-]/g, "");
  if (!raw) return 0;
  // If both separators exist, assume "." is thousands and "," is decimal
  if (raw.includes(",") && raw.includes(".")) {
    raw = raw.replace(/\./g, "").replace(",", ".");
  } else if (raw.includes(",")) {
    raw = raw.replace(",", ".");
  }
  const num = Number(raw);
  return Number.isFinite(num) ? num : 0;
}

/** Formats a number to a pt-BR display string with up to `decimals` places (default 2). */
export function formatToCurrencyDisplay(value: number | string | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || value === "") return "";
  const num = typeof value === "number" ? value : parseCurrencyToNumber(value);
  if (!Number.isFinite(num)) return "";
  return num.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

/* -------------------------------------------------------------------------- */
/* Core (string-based) currency input                                          */
/* -------------------------------------------------------------------------- */

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  /** Display value as string (e.g. "1.234,56"). */
  value: string | number | null | undefined;
  /** Receives the raw typed string. Use parseCurrencyToNumber() to convert. */
  onChange: (value: string) => void;
  /** Max number of decimal places (default 2). */
  decimals?: number;
  /** Allow negative numbers (default false). */
  allowNegative?: boolean;
}

/**
 * Currency-friendly numeric input that accepts both "." and "," as decimal separators.
 * Returns the raw typed string via `onChange` — use `parseCurrencyToNumber` to convert.
 */
export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, decimals = 2, allowNegative = false, className, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let raw = e.target.value;
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
      const m = raw.match(/^(-?\d*)([.,])?(\d*)$/);
      if (m && m[3] && m[3].length > decimals) {
        raw = `${m[1]}${m[2]}${m[3].slice(0, decimals)}`;
      }
      onChange(raw);
    };

    const displayValue =
      value === null || value === undefined ? "" : typeof value === "number" ? String(value).replace(".", ",") : value;

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        className={cn(className)}
        value={displayValue}
        onChange={handleChange}
        {...props}
      />
    );
  }
);
CurrencyInput.displayName = "CurrencyInput";

/* -------------------------------------------------------------------------- */
/* Number-based MoneyInput (convenience wrapper)                               */
/* -------------------------------------------------------------------------- */

export interface MoneyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  /** Numeric value. */
  value: number | string | null | undefined;
  /** Receives the parsed numeric value. */
  onChange: (value: number) => void;
  decimals?: number;
  allowNegative?: boolean;
}

/**
 * Money input that works directly with `number` values (parses comma/dot).
 * Use for any monetary / decimal value field.
 */
export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ value, onChange, decimals = 2, allowNegative = false, ...props }, ref) => {
    const [internal, setInternal] = React.useState<string>(() =>
      value === null || value === undefined || value === "" ? "" : formatToCurrencyDisplay(value, decimals)
    );
    const [focused, setFocused] = React.useState(false);

    React.useEffect(() => {
      if (!focused) {
        setInternal(
          value === null || value === undefined || value === "" ? "" : formatToCurrencyDisplay(value, decimals)
        );
      }
    }, [value, focused, decimals]);

    return (
      <CurrencyInput
        ref={ref}
        value={internal}
        decimals={decimals}
        allowNegative={allowNegative}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          setInternal(
            value === null || value === undefined || value === "" ? "" : formatToCurrencyDisplay(value, decimals)
          );
          props.onBlur?.(e);
        }}
        onChange={(raw) => {
          setInternal(raw);
          onChange(parseCurrencyToNumber(raw));
        }}
        {...props}
      />
    );
  }
);
MoneyInput.displayName = "MoneyInput";
