import { Check, ChevronDown } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import { useState, type ComponentProps, type ReactNode } from "react";
import { cn } from "@renderer/lib/cn";
import { floatingPanel } from "./dropdown-menu";
import { controlStyles, describedBy, Field } from "./field";

export type SelectOption = {
  /** Radix can't use "" as a value; pick a sentinel such as "none" for "nothing". */
  value: string;
  label: string;
  /** One line under the label, in the open list only. */
  description?: string;
  icon?: ReactNode;
};

type SelectProps = {
  id: string;
  label?: string;
  /** For selects without a visible label. */
  ariaLabel?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Submitted with forms through a hidden native select. */
  name?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Extra rows after the options, e.g. "Agregar persona…" (give them a sentinel value). */
  footer?: SelectOption[];
  className?: string;
  containerClassName?: string;
};

/** Listbox on Radix Select, styled as an Iris text field. */
export function Select({
  id,
  label,
  ariaLabel,
  error,
  hint,
  options,
  value,
  defaultValue,
  onValueChange,
  name,
  placeholder,
  disabled,
  footer,
  className,
  containerClassName,
}: SelectProps) {
  // Radix reads the label from the mounted items, so an option added while the
  // list is closed would show blank: render the selected label ourselves.
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const current = value ?? uncontrolled;
  const selected = [...options, ...(footer ?? [])].find((option) => option.value === current);

  const control = (
    <SelectPrimitive.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={(next) => {
        // Radix's hidden native select reports "" while a just-added option isn't
        // registered yet; options never use "" (see SelectOption.value).
        if (next === "") return;
        setUncontrolled(next);
        onValueChange?.(next);
      }}
      name={name}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        id={id}
        aria-label={ariaLabel}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={cn(
          controlStyles(Boolean(error)),
          "flex h-11 cursor-pointer items-center justify-between gap-2 pr-3 pl-4 text-left disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-ink-3",
          className,
        )}
      >
        <span className="min-w-0 truncate">
          <SelectPrimitive.Value placeholder={placeholder}>{selected?.label}</SelectPrimitive.Value>
        </span>
        <SelectPrimitive.Icon asChild>
          <ChevronDown aria-hidden className="size-4 shrink-0 text-ink-3" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className={cn(
            floatingPanel,
            "max-h-[min(360px,var(--radix-select-content-available-height))] w-(--radix-select-trigger-width) min-w-56",
          )}
        >
          <SelectPrimitive.Viewport>
            {options.map((option) => (
              <SelectItem key={option.value} option={option} />
            ))}
            {footer && footer.length > 0 && (
              <>
                <SelectPrimitive.Separator className="-mx-1.5 my-1.5 h-px bg-line" />
                {footer.map((option) => (
                  <SelectItem key={option.value} option={option} />
                ))}
              </>
            )}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );

  if (!label && !error && !hint) return <div className={containerClassName}>{control}</div>;
  return (
    <Field id={id} label={label} error={error} hint={hint} className={containerClassName}>
      {control}
    </Field>
  );
}

function SelectItem({ option }: { option: SelectOption }) {
  return (
    <SelectPrimitive.Item
      value={option.value}
      className="relative flex min-h-9 cursor-pointer items-start gap-2.5 rounded-sm py-2 pr-8 pl-2.5 text-sm outline-none select-none data-[disabled]:opacity-45 data-[highlighted]:bg-surface-raised [&_svg]:size-4 [&_svg]:shrink-0"
    >
      {option.icon && <span className="mt-0.5 text-ink-3">{option.icon}</span>}
      <span className="min-w-0">
        <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
        {option.description && (
          <span className="mt-0.5 block text-xs text-ink-2">{option.description}</span>
        )}
      </span>
      <SelectPrimitive.ItemIndicator className="absolute top-2.5 right-2.5 text-coral">
        <Check />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

type NativeSelectProps = Omit<ComponentProps<"select">, "id"> & {
  id: string;
  label?: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
};

/** Native <select> for short numeric pickers (hour, minutes) where the OS wheel is handy. */
export function NativeSelect({
  id,
  label,
  error,
  hint,
  className,
  containerClassName,
  children,
  ...props
}: NativeSelectProps) {
  return (
    <Field id={id} label={label} error={error} hint={hint} className={containerClassName}>
      <div className="relative">
        <select
          id={id}
          name={props.name ?? id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
          className={cn(
            controlStyles(Boolean(error)),
            "h-11 cursor-pointer appearance-none pr-10 pl-4",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-ink-3"
        />
      </div>
    </Field>
  );
}
