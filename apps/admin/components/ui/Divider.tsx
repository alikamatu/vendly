import { clsx } from "@/utils/clsx";

interface DividerProps {
  label?: string;
  className?: string;
}

export function Divider({ label, className }: DividerProps) {
  if (!label) {
    return <hr className={clsx("border-[--color-foreground]/10", className)} />;
  }
  return (
    <div className={clsx("flex items-center gap-3", className)}>
      <div className="flex-1 h-px bg-[--color-foreground]/10" />
      <span className="text-xs text-[--color-foreground]/30 font-medium">{label}</span>
      <div className="flex-1 h-px bg-[--color-foreground]/10" />
    </div>
  );
}