import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Button({ className, variant = "primary", children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost"; children: ReactNode }) {
  return <button className={cn("inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50", variant === "primary" && "bg-navy text-white hover:bg-cobalt", variant === "secondary" && "border border-line bg-white text-navy hover:border-navy", variant === "ghost" && "bg-transparent text-navy hover:bg-mist", className)} {...props}>{children}</button>;
}
