import { cn } from "@/lib/utils";
import { type HTMLAttributes, type ReactNode } from "react";

const badgeVariants = {
  default: "bg-slate-700 text-slate-300",
  primary: "bg-brand-900 text-brand-300",
  success: "bg-emerald-900 text-emerald-300",
  warning: "bg-amber-900  text-amber-300",
  danger:  "bg-rose-900   text-rose-300",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof badgeVariants;
}

export function Badge({ children, className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", badgeVariants[variant], className)}
      {...props}
    >
      {children}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Wird geladen"
      className={cn("h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-brand-400", className)}
    />
  );
}

export function PageSpinner() {
  return <div className="flex items-center justify-center py-16"><Spinner className="h-8 w-8" /></div>;
}

interface EmptyStateProps {
  icon?:        ReactNode;
  title:        string;
  description?: string;
  action?:      ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
      {icon && (
        <div className="mb-4 text-slate-600 [&>svg]:h-11 [&>svg]:w-11">{icon}</div>
      )}
      <h3 className="text-sm font-semibold text-slate-300 mb-1">{title}</h3>
      {description && <p className="text-sm text-slate-500 max-w-xs mb-5">{description}</p>}
      {action}
    </div>
  );
}

export function Divider({ label }: { label?: string }) {
  if (!label) return <hr className="border-slate-700 my-4" />;
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-slate-700" />
      <span className="text-xs text-slate-500 font-medium">{label}</span>
      <div className="flex-1 h-px bg-slate-700" />
    </div>
  );
}
