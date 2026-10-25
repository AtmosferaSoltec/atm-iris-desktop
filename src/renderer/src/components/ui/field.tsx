import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@renderer/lib/cn";

type FieldProps = {
  id: string;
  label?: string;
  error?: string;
  hint?: string;
  /** Right side of the label row, e.g. a "¿Olvidaste tu contraseña?" link. */
  accessory?: ReactNode;
  className?: string;
  children: ReactNode;
};

/** Label + control + error or hint. Controls get ids `${id}-error` / `${id}-hint` for aria-describedby. */
export function Field({ id, label, error, hint, accessory, className, children }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {(label || accessory) && (
        <div className="flex items-center justify-between gap-3">
          {label && (
            <label htmlFor={id} className="text-[13px] font-medium text-ink-2">
              {label}
            </label>
          )}
          {accessory}
        </div>
      )}
      {children}
      {error ? (
        <p
          id={`${id}-error`}
          className="flex animate-fade-in items-center gap-1.5 text-xs font-medium text-danger"
        >
          <CircleAlert className="size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-ink-2">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function describedBy(id: string, error?: string, hint?: string): string | undefined {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

/** Shared look of text inputs, textareas and selects (IrisTextField). */
export function controlStyles(hasError?: boolean) {
  return cn(
    "w-full rounded-md bg-surface text-[15px] text-ink caret-coral ring-1 ring-line transition outline-none ring-inset placeholder:text-ink-3",
    "hover:ring-line-strong focus:bg-surface-raised focus:shadow-[0_0_18px_-4px_rgb(255_122_89/0.22)] focus:ring-[1.5px] focus:ring-coral",
    hasError && "ring-[1.5px] ring-danger/80 hover:ring-danger/80 focus:ring-danger",
  );
}
