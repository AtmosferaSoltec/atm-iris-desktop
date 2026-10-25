import { ContextMenu as MenuPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@renderer/lib/cn";
import { floatingPanel } from "./dropdown-menu";

// Radix ContextMenu (right click, or long press on touch) with the same look as the
// dropdown menu.

export const ContextMenu = MenuPrimitive.Root;
export const ContextMenuTrigger = MenuPrimitive.Trigger;

const itemStyles =
  "relative flex min-h-9 cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-sm outline-none select-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-45 data-[highlighted]:bg-surface-raised [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-ink-3";

export function ContextMenuContent({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.Content>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Content className={cn(floatingPanel, className)} {...props} />
    </MenuPrimitive.Portal>
  );
}

export function ContextMenuItem({
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
