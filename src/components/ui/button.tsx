import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const variants = {
  default: "bg-primary text-white hover:bg-primary-hover shadow-sm",
  secondary: "bg-surface text-navy-900 hover:bg-slate-100 border border-border",
  outline: "border border-border bg-white text-navy-900 hover:bg-surface shadow-sm",
  ghost: "text-navy-700 hover:bg-surface hover:text-navy-900",
  destructive: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
  link: "text-primary underline-offset-4 hover:underline px-0 h-auto",
} as const;
const sizes = { sm: "h-8 px-3 text-xs gap-1.5", md: "h-9 px-4 text-sm gap-2", lg: "h-10 px-5 text-sm gap-2", icon: "h-9 w-9", "icon-sm": "h-8 w-8" } as const;

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
};

export function buttonClasses(variant: keyof typeof variants = "default", size: keyof typeof sizes = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center rounded-lg font-medium whitespace-nowrap transition-colors disabled:opacity-50 disabled:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    variants[variant],
    sizes[size],
    className,
  );
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, type = "button", ...props }, ref) => (
    <button ref={ref} type={type} className={buttonClasses(variant, size, className)} disabled={disabled || loading} {...props}>
      {loading && <Loader2 className="animate-spin" aria-hidden />}
      {children}
    </button>
  ),
);
Button.displayName = "Button";
