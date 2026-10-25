import type { ComponentProps, ReactNode } from "react";
import { cn } from "@renderer/lib/cn";
import { controlStyles, describedBy, Field } from "./field";

type TextAreaProps = Omit<ComponentProps<"textarea">, "id"> & {
  id: string;
  label?: string;
  error?: string;
  hint?: string;
  accessory?: ReactNode;
  containerClassName?: string;
};

export function TextArea({
  id,
  label,
  error,
  hint,
  accessory,
  className,
  containerClassName,
  ...props
}: TextAreaProps) {
  return (
    <Field
      id={id}
      label={label}
      error={error}
      hint={hint}
      accessory={accessory}
      className={containerClassName}
    >
      <textarea
        id={id}
        name={props.name ?? id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={cn(
          controlStyles(Boolean(error)),
          "min-h-40 resize-y px-4 py-3 leading-relaxed",
          className,
        )}
        {...props}
      />
    </Field>
  );
}
