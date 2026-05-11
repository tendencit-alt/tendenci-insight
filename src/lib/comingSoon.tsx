import * as React from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Centralized "Coming Soon" UI logic for AppNavbar, AppSidebar and HomeLauncher.
 *
 * Per project Core memory:
 *   "UI Visibility: 'Coming Soon' features must remain visible but disabled
 *   (low opacity) to show roadmap."
 *
 * - `available: false` (Navbar style) and `comingSoon: true` (Sidebar style)
 *   are normalized via `isComingSoon`.
 * - Items must remain visible — never filter them out — and behave as inert.
 */

export interface ComingSoonAware {
  available?: boolean;
  comingSoon?: boolean;
}

export const COMING_SOON_OPACITY_CLASS = "opacity-40 grayscale-[20%]";

export function isComingSoon(item: ComingSoonAware | null | undefined): boolean {
  if (!item) return false;
  if (item.comingSoon === true) return true;
  if (item.available === false) return true;
  return false;
}

export function handleComingSoonClick(
  e: React.SyntheticEvent,
  label?: string
) {
  e.preventDefault();
  e.stopPropagation();
  toast.info(`${label ? `"${label}" ` : ""}estará disponível em breve`, {
    description: "Funcionalidade em desenvolvimento — visível para preview do roadmap.",
  });
}

interface ComingSoonBadgeProps {
  className?: string;
  variant?: "outline" | "secondary";
  size?: "xs" | "sm";
}

export function ComingSoonBadge({
  className,
  variant = "outline",
  size = "xs",
}: ComingSoonBadgeProps) {
  return (
    <Badge
      variant={variant}
      className={cn(
        "font-normal border-muted-foreground/20 text-muted-foreground/70 bg-transparent",
        size === "xs" ? "text-[9px] px-1.5 py-0 h-4" : "text-[10px] px-2 py-0 h-5",
        className
      )}
    >
      Em breve
    </Badge>
  );
}

interface ComingSoonItemProps {
  label: string;
  className?: string;
  showBadge?: boolean;
  children: React.ReactNode;
}

/**
 * Wrapper that renders any inner content as visually-disabled and intercepts
 * clicks. Use inside Sidebar/Navbar/HomeLauncher item rows.
 */
export function ComingSoonItem({
  label,
  className,
  children,
}: ComingSoonItemProps) {
  return (
    <div
      onClick={(e) => handleComingSoonClick(e, label)}
      role="button"
      aria-disabled="true"
      title={`${label} — em breve`}
      className={cn(
        "cursor-not-allowed select-none",
        COMING_SOON_OPACITY_CLASS,
        className
      )}
    >
      {children}
    </div>
  );
}
