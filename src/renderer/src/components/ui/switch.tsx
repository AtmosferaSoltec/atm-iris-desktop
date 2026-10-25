import { cn } from "@renderer/lib/cn";

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  id?: string;
};

/** Accessible toggle (role="switch"), coral when on. */
export function Switch({ checked, onCheckedChange, label, disabled, id }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-coral" : "bg-white/15",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block size-6 rounded-full bg-white shadow-md transition-transform duration-200 ease-(--ease-calm)",
          checked ? "translate-x-[22px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
