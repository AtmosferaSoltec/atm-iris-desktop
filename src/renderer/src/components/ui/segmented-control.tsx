import { cn } from "@renderer/lib/cn";

type Option<T extends string> = { value: T; label: string };

type SegmentedControlProps<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
};

/** Capsule with a sliding warm-white indicator (IrisSegmentedControl). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: SegmentedControlProps<T>) {
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "relative grid rounded-full bg-surface p-1 ring-1 ring-line ring-inset",
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 rounded-full bg-ink transition-transform duration-300 ease-(--ease-calm)"
        style={{
          width: `calc((100% - 0.5rem) / ${options.length})`,
          transform: `translateX(${selectedIndex * 100}%)`,
        }}
      />
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative z-10 h-9 cursor-pointer rounded-full px-4 text-sm font-semibold transition-colors",
              isSelected ? "text-ink-inverse" : "text-ink-2 hover:text-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
