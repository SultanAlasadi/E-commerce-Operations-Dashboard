import { cn } from "@/lib/utils";

/** Native form controls styled to the design tokens (design/04, design/14). */
export const controlClass =
  "bg-secondary/60 border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-ring h-12 w-full rounded-xl border px-4 text-base outline-none focus-visible:ring-2 disabled:opacity-60 aria-invalid:border-[#d0709f] sm:text-sm [color-scheme:dark]";

export function Field({
  id,
  label,
  hint,
  error,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-[#f08cbd]">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-muted-foreground text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** aria props tying a control to its error or hint. */
export function describedBy(id: string, error?: string, hint?: boolean) {
  return {
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : hint ? `${id}-hint` : undefined,
  } as const;
}
