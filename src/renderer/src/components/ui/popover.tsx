import { Popover as PopoverPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@renderer/lib/cn";
import { floatingPanel } from "./dropdown-menu";

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;
export const PopoverClose = PopoverPrimitive.Close;

export function PopoverContent({
  className,
  align = "start",
  sideOffset = 8,
  ...props
}: ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        collisionPadding={16}
        className={cn(floatingPanel, "p-4 outline-none", className)}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
