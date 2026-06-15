import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { type ReactNode } from "react";

const alertConfig = {
  error: {
    wrapper: "bg-rose-950/50 border-rose-800 text-rose-300",
    icon:    <AlertCircle   className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />,
  },
  success: {
    wrapper: "bg-emerald-950/50 border-emerald-800 text-emerald-300",
    icon:    <CheckCircle2  className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />,
  },
  warning: {
    wrapper: "bg-amber-950/50 border-amber-800 text-amber-300",
    icon:    <TriangleAlert className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />,
  },
  info: {
    wrapper: "bg-brand-950/50 border-brand-800 text-brand-300",
    icon:    <Info          className="h-4 w-4 shrink-0 mt-0.5 text-brand-400" />,
  },
};

interface AlertProps {
  variant:   keyof typeof alertConfig;
  children:  ReactNode;
  className?: string;
}

export function Alert({ variant, children, className }: AlertProps) {
  const { wrapper, icon } = alertConfig[variant];
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn("flex gap-2.5 rounded-xl border p-3 text-sm", wrapper, className)}
    >
      {icon}
      <div className="leading-snug">{children}</div>
    </div>
  );
}
