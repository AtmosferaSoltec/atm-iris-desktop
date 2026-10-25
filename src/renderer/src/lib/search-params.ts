import { useSearchParams } from "react-router";

export type SearchParser<T> = {
  defaultValue: T;
  parse: (value: string | null) => T;
  serialize(value: T): string | null;
};

function stringParser(defaultValue = ""): SearchParser<string> {
  return {
    defaultValue,
    parse: (value) => value ?? defaultValue,
    serialize: (value) => (value === defaultValue ? null : value),
  };
}

export function literalParser<const T extends readonly string[]>(
  values: T,
  defaultValue: T[number],
): SearchParser<T[number]> {
  return {
    defaultValue,
    parse: (value) => (value !== null && values.includes(value) ? value : defaultValue),
    serialize: (value) => (value === defaultValue ? null : value),
  };
}

export const pageParser: SearchParser<number> = {
  defaultValue: 1,
  parse: (value) => {
    if (!value || !/^[1-9]\d*$/.test(value)) return 1;
    const page = Number(value);
    return Number.isSafeInteger(page) ? page : 1;
  },
  serialize: (value) => (value > 1 && Number.isSafeInteger(value) ? String(value) : null),
};
export const searchParser = stringParser();
export const kindParser = literalParser(["all", "image", "video", "audio"] as const, "all");
export const TIME_TABS = ["records", "summaries"] as const;
export const TIME_PERIODS = [
  "thisMonth",
  "lastMonth",
  "last3Months",
  "thisYear",
  "all",
  "month",
] as const;
export const timeSearchParams = {
  tab: literalParser(TIME_TABS, "records"),
  service: stringParser(),
  record: stringParser(),
  period: literalParser(TIME_PERIODS, "last3Months"),
  month: stringParser(),
  block: stringParser(),
  person: stringParser(),
};

export function useSearchParamState<T>(
  key: string,
  parser: SearchParser<T>,
): [T, (value: T) => void] {
  const [params, setParams] = useSearchParams();
  return [
    parser.parse(params.get(key)),
    (value) => {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          const serialized = parser.serialize(value);
          if (serialized === null) next.delete(key);
          else next.set(key, serialized);
          if (key === "search" || key === "kind" || key === "songs") next.delete("page");
          return next;
        },
        { replace: true },
      );
    },
  ];
}

export function useSearchParamStates<P extends Record<string, SearchParser<unknown>>>(
  parsers: P,
): [
  { [K in keyof P]: ReturnType<P[K]["parse"]> },
  (change: Partial<{ [K in keyof P]: ReturnType<P[K]["parse"]> | null }>) => void,
] {
  const [params, setParams] = useSearchParams();
  const values = Object.fromEntries(
    Object.entries(parsers).map(([key, parser]) => [key, parser.parse(params.get(key))]),
  ) as { [K in keyof P]: ReturnType<P[K]["parse"]> };
  return [
    values,
    (change) =>
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          for (const [key, value] of Object.entries(change)) {
            const serialized = value == null ? null : parsers[key].serialize(value);
            if (serialized === null) next.delete(key);
            else next.set(key, serialized);
          }
          return next;
        },
        { replace: true },
      ),
  ];
}
