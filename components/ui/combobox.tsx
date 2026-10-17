"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Check, ChevronDown, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { selectContentClass, selectItemClass, selectTriggerClass } from "./select";

export type ComboboxOption = {
  value: string;
  label: string;
  /** Extra text matched by the search, e.g. "Saudi riyal" for SAR. */
  keywords?: string;
};

/** Lowercases and treats "_" and "/" as spaces, so "new york" finds America/New_York. */
function normalize(text: string) {
  return text.toLowerCase().replace(/[_/]+/g, " ");
}

/**
 * Searchable single-select for long lists (currencies, time zones). Same look as
 * Select; type to filter, arrow keys to move, Enter to choose, Escape to close.
 */
export const Combobox = React.forwardRef<
  HTMLButtonElement,
  {
    id?: string;
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    options: readonly ComboboxOption[];
    placeholder?: string;
    searchPlaceholder?: string;
    emptyText?: string;
    disabled?: boolean;
    className?: string;
    "aria-invalid"?: boolean;
    "aria-describedby"?: string;
  }
>(function Combobox(
  {
    id,
    value,
    onChange,
    onBlur,
    options,
    placeholder = "Select…",
    searchPlaceholder = "Search…",
    emptyText = "No matches.",
    disabled,
    className,
    ...aria
  },
  ref,
) {
  const listId = React.useId();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const listRef = React.useRef<HTMLUListElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);

  const filtered = React.useMemo(() => {
    const needle = normalize(query.trim());
    if (!needle) return options;
    return options.filter((option) =>
      normalize(`${option.value} ${option.label} ${option.keywords ?? ""}`).includes(needle),
    );
  }, [options, query]);

  const selected = options.find((option) => option.value === value);

  function openChange(next: boolean) {
    setOpen(next);
    if (next) {
      setQuery("");
      setActive(
        Math.max(
          0,
          options.findIndex((option) => option.value === value),
        ),
      );
    } else {
      onBlur?.();
    }
  }

  function choose(option: ComboboxOption) {
    onChange(option.value);
    openChange(false);
  }

  // Keep the highlighted option visible while moving with the keyboard.
  React.useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      listRef.current
        ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
        ?.scrollIntoView({ block: "nearest" });
    });
    return () => cancelAnimationFrame(frame);
  }, [active, open]);

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActive(filtered.length - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = filtered[active];
      if (option) choose(option);
    }
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={openChange}>
      <PopoverPrimitive.Trigger asChild>
        <button
          ref={ref}
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={open ? listId : undefined}
          disabled={disabled}
          data-placeholder={selected ? undefined : ""}
          className={cn(selectTriggerClass, className)}
          {...aria}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronDown aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          className={cn(
            selectContentClass,
            "flex w-[var(--radix-popover-trigger-width)] min-w-64 flex-col p-0",
          )}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            searchRef.current?.focus();
          }}
        >
          <div className="flex items-center gap-2 border-b px-3">
            <Search aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
            <input
              ref={searchRef}
              type="text"
              role="searchbox"
              aria-label={searchPlaceholder}
              aria-controls={listId}
              aria-activedescendant={filtered[active] ? `${listId}-${active}` : undefined}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder={searchPlaceholder}
              autoComplete="off"
              spellCheck={false}
              className="placeholder:text-muted-foreground h-11 w-full bg-transparent text-base outline-none sm:text-sm"
            />
          </div>
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            className="max-h-[min(18rem,calc(var(--radix-popover-content-available-height)-3rem))] overflow-y-auto p-1"
          >
            {filtered.length === 0 ? (
              <li className="text-muted-foreground px-3 py-6 text-center text-sm">{emptyText}</li>
            ) : (
              filtered.map((option, index) => {
                const isSelected = option.value === value;
                return (
                  <li
                    key={option.value}
                    id={`${listId}-${index}`}
                    data-index={index}
                    role="option"
                    aria-selected={isSelected}
                    data-highlighted={index === active ? "" : undefined}
                    data-state={isSelected ? "checked" : undefined}
                    onPointerMove={() => setActive(index)}
                    onClick={() => choose(option)}
                    className={selectItemClass}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected ? (
                      <Check aria-hidden="true" className="text-primary absolute right-3 size-4" />
                    ) : null}
                  </li>
                );
              })
            )}
          </ul>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
});
