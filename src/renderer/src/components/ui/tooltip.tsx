import { Tooltip as TooltipPrimitive } from "radix-ui";
import type { ReactNode } from "react";

export const TooltipProvider = TooltipPrimitive.Provider;

/**
 * Short hint on hover and keyboard focus. Disabled buttons don't get pointer
 * events, so wrap them in a focusable element (see PermissionGate).
 */
export function Tooltip({
  content,
  children,
  side = "top",
}: {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <TooltipPrimitive.Root delayDuration={250}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          collisionPadding={12}
          className="z-50 max-w-64 rounded-sm bg-ink px-2.5 py-1.5 text-xs font-medium text-ink-inverse shadow-menu data-[state=delayed-open]:animate-fade-in"
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-ink" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
