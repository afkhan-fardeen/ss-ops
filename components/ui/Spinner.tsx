import { Loader2 } from "lucide-react";

/** Inline loading spinner. Inherits the current text colour. */
export function Spinner({ size = 16, className = "" }: { size?: number; className?: string }) {
  return <Loader2 size={size} aria-hidden className={`animate-spin motion-reduce:animate-none ${className}`} />;
}
