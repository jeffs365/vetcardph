import { vetcardCharacters } from "@/assets/brand/characters";
import { cn } from "@/lib/utils";

type CharacterName = keyof typeof vetcardCharacters;

type CharacterSpotProps = {
  character: CharacterName;
  className?: string;
  imageClassName?: string;
  label?: string;
  size?: "xs" | "sm" | "md" | "lg";
};

const sizeClasses: Record<NonNullable<CharacterSpotProps["size"]>, string> = {
  xs: "w-14",
  sm: "w-20",
  md: "w-28",
  lg: "w-36",
};

export function CharacterSpot({
  character,
  className,
  imageClassName,
  label,
  size = "md",
}: CharacterSpotProps) {
  const asset = vetcardCharacters[character];

  return (
    <div className={cn("pointer-events-none select-none", sizeClasses[size], className)} aria-hidden={!label}>
      <img
        src={asset.src}
        alt={label ?? ""}
        className={cn("block h-auto w-full drop-shadow-[0_14px_18px_hsl(var(--primary)_/_0.14)]", imageClassName)}
        draggable={false}
      />
    </div>
  );
}
