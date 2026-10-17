import { cn } from "@/lib/utils";

const tones = {
  positive: "bg-positive-soft text-positive",
  primary: "bg-accent text-accent-foreground",
  danger: "bg-danger-soft text-danger",
  warning: "bg-incomplete-soft text-incomplete",
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
        "inline-flex items-center gap-2 px-3 py-1 text-sm font-semibold whitespace-nowrap",
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
