import { useQuery } from "@tanstack/react-query";
import { invoke } from "@renderer/lib/ipc";
import { useSearchParamStates, timeSearchParams } from "@renderer/lib/search-params";
import { blockNames } from "@shared/domain/time-statistics";
import { zonedParts } from "@shared/lib/zoned-time";
import { TimesView } from "./components/times-view";
import { periodFromParams } from "./period";

export function TimesPage() {
  const { data } = useQuery({
    queryKey: ["times"],
    gcTime: 0,
    queryFn: () => invoke("times:load", undefined),
  });
  const [params] = useSearchParamStates(timeSearchParams);
  if (!data) return <p role="status">Cargando tiempos…</p>;
  const firstYear = Math.min(
    zonedParts(new Date(data.now), data.timeZone).year,
    ...data.records.map((record) => zonedParts(new Date(record.date), data.timeZone).year),
  );
  return (
    <TimesView
      {...data}
      period={periodFromParams(params.period, params.month)}
      blockNames={blockNames(data.records)}
      firstYear={firstYear}
    />
  );
}
