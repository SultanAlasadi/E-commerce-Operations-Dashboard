"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/utils";

const Select = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

/** Shared trigger look; pass className to match the surrounding form's height. */
export const selectTriggerClass =
  "bg-secondary/60 border-input text-foreground focus-visible:ring-ring data-[placeholder]:text-muted-foreground flex h-12 w-full items-center justify-between gap-2 rounded-xl border px-4 text-left text-base outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-danger sm:text-sm [&>span]:truncate";

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger ref={ref} className={cn(selectTriggerClass, className)} {...props}>
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "text-muted-foreground flex cursor-default items-center justify-center py-1",
      className,
    )}
    {...props}
  >
    <ChevronUp aria-hidden="true" className="size-4" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "text-muted-foreground flex cursor-default items-center justify-center py-1",
      className,
    )}
    {...props}
  >
    <ChevronDown aria-hidden="true" className="size-4" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;

/** Dark popover panel, as wide as the trigger. */
export const selectContentClass =
  "bg-popover text-popover-foreground z-50 overflow-hidden rounded-xl border p-1 shadow-lg shadow-slate-900/10";

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", sideOffset = 6, ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      sideOffset={sideOffset}
      className={cn(
        selectContentClass,
        "max-h-[min(20rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)]",
        className,
      )}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("text-muted-foreground px-3 py-1.5 text-xs font-semibold", className)}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

/** Item look shared with the searchable combobox. */
export const selectItemClass =
  "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[state=checked]:text-accent-foreground relative flex w-full cursor-pointer items-center rounded-lg py-2.5 pr-9 pl-3 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50";

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item ref={ref} className={cn(selectItemClass, className)} {...props}>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    <span className="absolute right-3 flex size-4 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check aria-hidden="true" className="text-primary size-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("bg-border -mx-1 my-1 h-px", className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
