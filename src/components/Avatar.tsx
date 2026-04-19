import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";

export function Avatar({ name, size = 40, className }: { name: string; size?: number; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-medium bg-secondary text-foreground/80 shrink-0",
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name) || "·"}
    </div>
  );
}
