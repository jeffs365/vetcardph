import { AlertTriangle, Check, Circle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "success" | "warn" | "danger" | "info" | "neutral";

const styles: Record<Tone, string> = {
  success: "bg-primary text-primary-foreground",
  info: "bg-accent text-accent-foreground",
  warn: "bg-tertiary-soft text-tertiary",
  danger: "bg-destructive-soft text-destructive",
  neutral: "bg-muted text-muted-foreground",
};

export function StatusBadge({
  tone = "info",
  icon = false,
  children,
  className,
}: {
  tone?: Tone;
  icon?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const Icon = tone === "success" ? Check : tone === "danger" || tone === "warn" ? AlertTriangle : tone === "neutral" ? Circle : Clock;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        styles[tone],
        className
      )}
    >
      {icon && <Icon aria-hidden="true" className="size-3" strokeWidth={2.5} />}
      {children}
    </span>
  );
}
