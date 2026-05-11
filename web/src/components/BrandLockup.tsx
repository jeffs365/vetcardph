import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
};

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <img
      src="/vetcard-icon.svg"
      alt="VetCard"
      className={cn("size-16 rounded-[1.35rem] object-cover shadow-float", className)}
    />
  );
}

type BrandLockupProps = {
  className?: string;
  compact?: boolean;
};

type BrandWordmarkProps = {
  className?: string;
  compact?: boolean;
};

export function BrandWordmark({ className, compact = false }: BrandWordmarkProps) {
  return (
    <div
      className={cn(
        "font-display font-extrabold tracking-tight leading-none",
        compact ? "text-2xl" : "text-4xl sm:text-5xl",
        className,
      )}
    >
      <span className="text-primary">Vet</span>
      <span className="text-tertiary">Card</span>
    </div>
  );
}

export function BrandLockup({ className, compact = false }: BrandLockupProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <BrandMark className={compact ? "size-12 rounded-[1rem]" : "size-16"} />
      <div className="min-w-0">
        <BrandWordmark compact={compact} />
      </div>
    </div>
  );
}
