"use client";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:   "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?:      "sm" | "md" | "lg";
  isLoading?: boolean;
  fullWidth?: boolean;
}

const variants = {
  primary:   "bg-brand-600 text-white hover:bg-brand-500 active:bg-brand-700 shadow-sm",
  secondary: "bg-slate-700 text-slate-200 hover:bg-slate-600 active:bg-slate-800",
  ghost:     "text-slate-400 hover:bg-slate-700 hover:text-slate-100 active:bg-slate-800",
  danger:    "bg-danger-600 text-white hover:bg-danger-500 active:bg-danger-700 shadow-sm",
  outline:   "border border-slate-600 bg-transparent text-slate-300 hover:bg-slate-700 hover:border-slate-500",
};

const sizes = {
  sm: "h-8  px-3   text-sm   rounded-lg  gap-1.5",
  md: "h-10 px-4   text-sm   rounded-xl",
  lg: "h-12 px-5   text-base rounded-xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, className, variant = "primary", size = "md", isLoading = false, fullWidth = false, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn("btn-base", variants[variant], sizes[size], fullWidth && "w-full", className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /><span>Bitte warten…</span></>
      ) : children}
    </button>
  ),
);
Button.displayName = "Button";
