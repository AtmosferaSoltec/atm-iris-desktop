import { Check, ChevronDown, Search } from "lucide-react";
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@renderer/lib/cn";
import { nameKey } from "@shared/lib/text";
import { controlStyles, describedBy, Field } from "./field";
import { Popover, PopoverAnchor, PopoverContent } from "./popover";

export type ComboboxOption = {
  value: string;
  label: string;
  /** Options with the same group are listed under its heading, in order of appearance. */
  group?: string;
  /** Right side of the row (e.g. the current time in that zone). Rendered only when open. */
  hint?: () => ReactNode;
  /** Extra words the search matches. */
  keywords?: string;
};

type ComboboxProps = {
  id: string;
  label?: string;
  error?: string;
  hint?: string;
  options: ComboboxOption[];
  value: string;
  onValueChange: (value: string) => void;
  /** Submitted with forms. */
  name?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  containerClassName?: string;
};

const MAX_RESULTS = 200;

/** Select with a search box, for long lists such as time zones (WAI-ARIA combobox + listbox). */
export function Combobox({
  id,
  label,
  error,
  hint,
  options,
  value,
  onValueChange,
  name,
  searchPlaceholder = "Buscar",
  emptyText = "Sin resultados",
  disabled,
  containerClassName,
}: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((option) => option.value === value);
  const key = nameKey(query);
  const matches = (
    key
      ? options.filter((option) =>
          nameKey(`${option.label} ${option.group ?? ""} ${option.keywords ?? ""}`).includes(key),
        )
      : options
  ).slice(0, MAX_RESULTS);

  function open(next: boolean) {
    setIsOpen(next);
    if (next) {
      setQuery("");
      setActiveIndex(
        Math.max(
          0,
          options.findIndex((option) => option.value === value),
        ),
      );
    }
  }

  function choose(option: ComboboxOption) {
    onValueChange(option.value);
    setIsOpen(false);
  }

  function moveTo(index: number) {
    const next = Math.min(Math.max(index, 0), matches.length - 1);
    setActiveIndex(next);
    listRef.current?.querySelector(`[data-index="${next}"]`)?.scrollIntoView({ block: "nearest" });
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") moveTo(activeIndex + 1);
    else if (event.key === "ArrowUp") moveTo(activeIndex - 1);
    else if (event.key === "Home") moveTo(0);
    else if (event.key === "End") moveTo(matches.length - 1);
    else if (event.key === "Enter" && matches[activeIndex]) choose(matches[activeIndex]);
    else return;
    event.preventDefault();
  }

  const trigger = (
    <button
      id={id}
      type="button"
      disabled={disabled}
      aria-haspopup="listbox"
      aria-expanded={isOpen}
      aria-describedby={describedBy(id, error, hint)}
      onClick={() => open(!isOpen)}
      className={cn(
        controlStyles(Boolean(error)),
        "flex h-11 cursor-pointer items-center justify-between gap-2 pr-3 pl-4 text-left disabled:cursor-not-allowed disabled:opacity-60",
      )}
    >
      <span className="min-w-0 truncate">
        {selected ? (
          <>
            {selected.label}
            {selected.group && <span className="text-ink-2"> · {selected.group}</span>}
          </>
        ) : (
          <span className="text-ink-3">{value || "Elegir"}</span>
        )}
      </span>
      <ChevronDown aria-hidden className="size-4 shrink-0 text-ink-3" />
    </button>
  );

  return (
    <Field id={id} label={label} error={error} hint={hint} className={containerClassName}>
      {name && <input type="hidden" name={name} value={value} />}
      <Popover open={isOpen} onOpenChange={open}>
        <PopoverAnchor asChild>{trigger}</PopoverAnchor>
        <PopoverContent
          className="w-(--radix-popover-trigger-width) min-w-72 p-0"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            (event.currentTarget as HTMLElement).querySelector("input")?.focus();
          }}
        >
          <div className="relative border-b border-line">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-3"
            />
            <input
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={matches[activeIndex] ? `${listId}-${activeIndex}` : undefined}
              aria-label={searchPlaceholder}
              placeholder={searchPlaceholder}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={onKeyDown}
              className="h-11 w-full bg-transparent pr-3 pl-10 text-sm text-ink outline-none placeholder:text-ink-3"
            />
          </div>
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={label}
            className="max-h-72 overflow-y-auto p-1.5"
          >
            {matches.length === 0 && (
              <li className="px-2.5 py-6 text-center text-sm text-ink-2">{emptyText}</li>
            )}
            {matches.map((option, index) => {
              const heading =
                index === 0 || matches[index - 1].group !== option.group ? option.group : undefined;
              return (
                <li key={option.value} role="presentation">
                  {heading && (
                    <p
                      role="presentation"
                      className="px-2.5 pt-3 pb-1 eyebrow text-ink-2 first:pt-1"
                    >
                      {heading}
                    </p>
                  )}
                  <div
                    id={`${listId}-${index}`}
                    data-index={index}
                    role="option"
                    aria-selected={option.value === value}
                    onPointerMove={() => setActiveIndex(index)}
                    onClick={() => choose(option)}
                    className={cn(
                      "relative flex min-h-9 cursor-pointer items-center gap-3 rounded-sm py-1.5 pr-8 pl-2.5 text-sm",
                      index === activeIndex && "bg-surface-raised",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    {option.hint && (
                      <span className="shrink-0 text-xs text-ink-2 tabular-nums">
                        {option.hint()}
                      </span>
                    )}
                    {option.value === value && (
                      <Check aria-hidden className="absolute right-2.5 size-4 text-coral" />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </PopoverContent>
      </Popover>
    </Field>
  );
}
