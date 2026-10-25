import { Check, ChevronRight } from "lucide-react";
import { DropdownMenu as MenuPrimitive } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@renderer/lib/cn";

// Radix DropdownMenu with Iris' look: keyboard navigation, typeahead and
// focus return come from Radix.

export const DropdownMenu = MenuPrimitive.Root;
export const DropdownMenuTrigger = MenuPrimitive.Trigger;
export const DropdownMenuSub = MenuPrimitive.Sub;
export const DropdownMenuRadioGroup = MenuPrimitive.RadioGroup;

export const floatingPanel =
  "z-50 min-w-48 overflow-hidden rounded-md bg-elevated p-1.5 text-ink shadow-menu ring-1 ring-line data-[state=open]:animate-fade-in";

const itemStyles =
  "relative flex min-h-9 cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-sm outline-none select-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-45 data-[highlighted]:bg-surface-raised [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-ink-3";

export function DropdownMenuContent({
  className,
  align = "end",
  sideOffset = 6,
  ...props
}: ComponentProps<typeof MenuPrimitive.Content>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(floatingPanel, className)}
        {...props}
      />
    </MenuPrimitive.Portal>
  );
}

export function DropdownMenuItem({
  className,
  tone,
  ...props
}: ComponentProps<typeof MenuPrimitive.Item> & { tone?: "danger" }) {
  return (
    <MenuPrimitive.Item
      className={cn(
        itemStyles,
        tone === "danger" && "text-danger data-[highlighted]:bg-danger/12 [&_svg]:text-danger",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: ComponentProps<typeof MenuPrimitive.RadioItem>) {
  return (
    <MenuPrimitive.RadioItem className={cn(itemStyles, "pr-8", className)} {...props}>
      {children}
      <MenuPrimitive.ItemIndicator className="absolute right-2.5">
        <Check className="text-coral!" />
      </MenuPrimitive.ItemIndicator>
    </MenuPrimitive.RadioItem>
  );
}

export function DropdownMenuSubTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof MenuPrimitive.SubTrigger>) {
  return (
    <MenuPrimitive.SubTrigger
      className={cn(itemStyles, "data-[state=open]:bg-surface-raised", className)}
      {...props}
    >
      {children}
      <ChevronRight aria-hidden className="ml-auto" />
    </MenuPrimitive.SubTrigger>
  );
}

export function DropdownMenuSubContent({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.SubContent>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.SubContent
        sideOffset={6}
        className={cn(floatingPanel, className)}
        {...props}
      />
    </MenuPrimitive.Portal>
  );
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <MenuPrimitive.Separator className={cn("-mx-1.5 my-1.5 h-px bg-line", className)} />;
}

export function DropdownMenuLabel({ children }: { children: ReactNode }) {
  return (
    <MenuPrimitive.Label className="px-2.5 pt-1.5 pb-1 eyebrow text-ink-2">
      {children}
    </MenuPrimitive.Label>
  );
}
