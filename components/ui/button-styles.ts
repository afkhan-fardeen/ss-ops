/**
 * Single source of truth for button looks. Pure function (no React) so it works in server and client
 * components, on <button>, <a> and next/link alike:  className={btn("primary", "md")}
 */
export type ButtonVariant = "primary" | "secondary" | "tonal" | "danger" | "dangerSoft" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "focus-ring inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors disabled:pointer-events-none disabled:opacity-50";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white shadow-soft hover:bg-primary-strong active:bg-primary-strong",
  secondary: "border border-line bg-white text-ink hover:bg-canvas active:bg-line/60",
  tonal: "bg-primary-soft text-primary-strong hover:bg-blue-100 active:bg-blue-100",
  danger: "bg-danger text-white shadow-soft hover:bg-red-800 active:bg-red-800",
  dangerSoft: "border border-danger-line bg-danger-soft text-danger hover:bg-red-100 active:bg-red-100",
  ghost: "text-muted hover:bg-canvas hover:text-ink active:bg-line/60",
};

// Phones get the larger touch-friendly height; md+ is denser.
const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-body-sm md:h-8",
  md: "h-11 px-4 text-body md:h-9",
  lg: "h-12 px-6 text-body-lg md:h-10",
};

export function btn(variant: ButtonVariant = "primary", size: ButtonSize = "md", extra = "", pill = false): string {
  return [BASE, pill ? "rounded-full" : "rounded-control", VARIANTS[variant], SIZES[size], extra].filter(Boolean).join(" ");
}
