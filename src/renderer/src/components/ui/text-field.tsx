import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps, type ReactNode } from "react";
import { cn } from "@renderer/lib/cn";
import { controlStyles, describedBy, Field } from "./field";

type TextFieldProps = Omit<ComponentProps<"input">, "id"> & {
  id: string;
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  accessory?: ReactNode;
  containerClassName?: string;
  /** `sm`: a slim field for dense panels (the library's search). */
  density?: "md" | "sm";
};

export function TextField({
  id,
  label,
  error,
  hint,
  icon,
  accessory,
  type = "text",
  className,
  containerClassName,
  density = "md",
  ...props
}: TextFieldProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const isPassword = type === "password";

  return (
    <Field
      id={id}
      label={label}
      error={error}
      hint={hint}
      accessory={accessory}
      className={containerClassName}
    >
      <div className="group relative">
        {icon && (
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute top-1/2 -translate-y-1/2 text-ink-3 transition group-focus-within:text-ink",
              density === "sm" ? "left-2.5 [&_svg]:size-4" : "left-3.5 [&_svg]:size-[18px]",
              error && "text-danger group-focus-within:text-danger",
            )}
          >
            {icon}
          </span>
        )}
        <input
          id={id}
          name={props.name ?? id}
          type={isPassword && isRevealed ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
          className={cn(
            controlStyles(Boolean(error)),
            density === "sm" ? "h-8 px-3 text-sm" : "h-11 px-4",
            icon && (density === "sm" ? "pl-8" : "pl-11"),
            isPassword && "pr-11",
            className,
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setIsRevealed((value) => !value)}
            aria-label={isRevealed ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-ink-3 hover:text-ink"
          >
            {isRevealed ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
          </button>
        )}
      </div>
    </Field>
  );
}
