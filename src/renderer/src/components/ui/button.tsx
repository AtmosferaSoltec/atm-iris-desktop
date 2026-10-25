import { Link } from "react-router";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@renderer/lib/cn";
import { Spinner } from "./spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition duration-100 ease-(--ease-calm) select-none active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-ink-inverse shadow-[0_10px_22px_-10px_rgb(255_122_89/0.55)] ring-1 ring-white/35 ring-inset hover:brightness-110",
  secondary:
    "bg-surface text-ink ring-1 ring-line ring-inset backdrop-blur hover:bg-surface-raised",
  ghost: "text-ink-2 hover:bg-surface hover:text-ink",
  danger: "text-danger ring-1 ring-danger/40 ring-inset hover:bg-danger/12",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3.5 text-[13px]",
  md: "h-10 px-5 text-sm",
  lg: "h-11 px-6 text-[15px]",
};

export function buttonStyles({
  variant = "primary",
  size = "md",
  className,
}: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  isLoading?: boolean;
};

export function Button({
  variant,
  size,
  icon,
  isLoading = false,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={buttonStyles({ variant, size, className })}
      {...props}
    >
      <span className={cn("inline-flex items-center gap-2", isLoading && "invisible")}>
        {icon}
        {children}
      </span>
      {isLoading && <Spinner className="absolute size-4" />}
    </button>
  );
}

type ButtonLinkProps = Omit<ComponentProps<typeof Link>, "to"> & {
  href: string;
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
};

export function ButtonLink({
  href,
  variant,
  size,
  icon,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link to={href} className={buttonStyles({ variant, size, className })} {...props}>
      {icon}
      {children}
    </Link>
  );
}

type IconButtonProps = ComponentProps<"button"> & { label: string; isActive?: boolean };

/** Round glass button with a single icon. `label` is the tooltip and accessible name. */
export function IconButton({
  label,
  isActive,
  className,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full ring-1 ring-line transition ring-inset active:scale-95 disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4",
        isActive
          ? "bg-coral text-ink-inverse"
          : "bg-surface text-ink-2 hover:bg-surface-raised hover:text-ink",
        className,
      )}
      {...props}
    />
  );
}
