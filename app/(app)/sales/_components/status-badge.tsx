import { cn } from "@/lib/utils";

const tones = {
  positive: "bg-positive/15 text-positive",
  primary: "bg-primary/25 text-accent-foreground",
  danger: "bg-destructive/25 text-[#f08cbd]",
  warning: "bg-incomplete/15 text-incomplete",
  muted: "bg-secondary text-muted-foreground",
} as const;

export function StatusBadge({
  tone,
  children,
  className,
}: {
  tone: keyof typeof tones;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

/** "Complete" or "Recorded zero" for an existing record (design/03). */
export function RecordStatus({ zero }: { zero: boolean }) {
  return <StatusBadge tone="positive">{zero ? "Recorded zero" : "Complete"}</StatusBadge>;
}
