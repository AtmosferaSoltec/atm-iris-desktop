import { spectrumColor } from "@shared/domain/rules";
import { cn } from "@renderer/lib/cn";
import { initials } from "@shared/lib/text";

type AvatarProps = { name: string; index?: number; size?: number; className?: string };

/** Initials on a spectrum color, rotating by `index`. */
export function Avatar({ name, index = 0, size = 40, className }: AvatarProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full font-semibold text-ink-inverse",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        backgroundColor: spectrumColor(index),
      }}
    >
      {initials(name)}
    </span>
  );
}

/** Overlapping avatars with a "+N" remainder. */
export function AvatarStack({
  names,
  max = 5,
  size = 34,
}: {
  names: string[];
  max?: number;
  size?: number;
}) {
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  return (
    <div className="flex items-center">
      {shown.map((name, index) => (
        <Avatar
          key={`${name}-${index}`}
          name={name}
          index={index}
          size={size}
          className="-ml-1.5 ring-2 ring-elevated first:ml-0"
        />
      ))}
      {rest > 0 && (
        <span
          className="-ml-1.5 inline-grid place-items-center rounded-full bg-surface-raised text-xs font-semibold text-ink-2 ring-2 ring-elevated"
          style={{ width: size, height: size }}
        >
          +{rest}
        </span>
      )}
    </div>
  );
}
