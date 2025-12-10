import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "elevated" | "bordered";
}

export function GlassCard({ children, className, variant = "default" }: GlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg p-6 backdrop-blur-xl",
        "bg-white/10 dark:bg-gray-800/10",
        "border border-white/20 dark:border-white/10",
        "shadow-2xl",
        variant === "elevated" && "shadow-[0_20px_50px_rgba(0,0,0,0.3)]",
        variant === "bordered" && "border-2",
        className
      )}
    >
      {children}
    </div>
  );
}

interface GlassInputProps {
  className?: string;
  [key: string]: any;
}

export function GlassInput({ className, ...props }: GlassInputProps) {
  return (
    <input
      className={cn(
        "w-full px-4 py-3 rounded-lg",
        "bg-white/5 dark:bg-black/20",
        "border border-white/20 dark:border-white/10",
        "shadow-inner",
        "text-foreground placeholder:text-muted-foreground",
        "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50",
        "transition-all duration-200",
        className
      )}
      {...props}
    />
  );
}
