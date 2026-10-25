import { useSearchParamStates } from "@renderer/lib/search-params";

import { PageHeader } from "@renderer/components/ui/page-header";
import { SegmentedControl } from "@renderer/components/ui/segmented-control";
import type { Person, ServiceRecord, ServiceType } from "@shared/domain/models";
import type { Period } from "@shared/domain/time-statistics";
import { cn } from "@renderer/lib/cn";
import { timeSearchParams } from "@renderer/lib/search-params";
import { RecordsTab } from "./records-tab";
import { SummariesTab } from "./summaries-tab";

type Props = {
  records: ServiceRecord[];
  period: Period;
  blockNames: string[];
  types: ServiceType[];
  people: Person[];
  timeZone: string;
  now: string;
  firstYear: number;
};

/** Tab, filters and the selected record live in the URL; the server loads what they ask for. */
export function TimesView(props: Props) {
  const isLoading = false;
  const [params, setParams] = useSearchParamStates(timeSearchParams);

  return (
    <div className="mx-auto flex max-w-content flex-col gap-8">
      <PageHeader
        title="Tiempos"
        description="Lo que duró cada bloque de los servicios, según las consolas."
        actions={
          <SegmentedControl
            label="Vista"
            value={params.tab}
            onChange={(tab) => void setParams({ tab })}
            options={[
              { value: "records", label: "Registros" },
              { value: "summaries", label: "Resúmenes" },
            ]}
          />
        }
      />
      <div className={cn("transition-opacity", isLoading && "opacity-60")} aria-busy={isLoading}>
        {params.tab === "records" ? (
          <RecordsTab
            records={props.records.filter(
              (record) => !params.service || record.serviceTypeId === params.service,
            )}
            types={props.types}
            people={props.people}
            timeZone={props.timeZone}
            serviceFilter={params.service}
            selectedId={params.record}
            onServiceFilter={(service) =>
              void setParams({ service: service || null, record: null })
            }
            onSelect={(record) => void setParams({ record: record || null })}
          />
        ) : (
          <SummariesTab
            records={props.records}
            params={params}
            period={props.period}
            blockNames={props.blockNames}
            types={props.types}
            people={props.people}
            timeZone={props.timeZone}
            now={props.now}
            firstYear={props.firstYear}
            onChange={(change) =>
              void setParams(
                Object.fromEntries(
                  Object.entries(change).map(([key, value]) => [key, value || null]),
                ),
              )
            }
          />
        )}
      </div>
    </div>
  );
}
