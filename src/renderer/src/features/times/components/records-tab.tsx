import { Download, FileText, Table2, Timer } from "lucide-react";
import { useTransition } from "react";
import { Chip } from "@renderer/components/ui/chip";
import { EmptyState } from "@renderer/components/ui/empty-state";
import { Select } from "@renderer/components/ui/select";
import { Surface } from "@renderer/components/ui/surface";
import { Button } from "@renderer/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@renderer/components/ui/dropdown-menu";
import { toast } from "@renderer/components/ui/toaster";
import { plural } from "@shared/lib/text";
import { exportRecords } from "../actions";
import type { Person, ServiceRecord, ServiceType } from "@shared/domain/models";
import { recordTotals, serviceName } from "@shared/domain/time-statistics";
import { cn } from "@renderer/lib/cn";
import { clock, monthYearOverline, overtime, shortWeekdayDate } from "@shared/lib/format";
import { zonedParts } from "@shared/lib/zoned-time";
import { RecordDetail } from "./record-detail";

const ALL = "all";

type Props = {
  records: ServiceRecord[];
  types: ServiceType[];
  people: Person[];
  timeZone: string;
  months: { value: string; label: string }[];
  from: string;
  to: string;
  onRange: (range: { from: string | null; to: string | null }) => void;
  serviceFilter: string;
  selectedId: string;
  onServiceFilter: (id: string) => void;
  onSelect: (id: string) => void;
};

export function RecordsTab({
  records,
  types,
  people,
  timeZone,
  months,
  from,
  to,
  onRange,
  serviceFilter,
  selectedId,
  onServiceFilter,
  onSelect,
}: Props) {
  const selected = records.find((record) => record.id === selectedId) ?? records[0];
  const groups = groupByMonth(records, timeZone);
  const finished = records.filter((record) => record.status === "finished");
  const [isExporting, startExport] = useTransition();

  function download(format: "csv" | "pdf") {
    startExport(async () => {
      const result = await exportRecords(
        format,
        finished.map((record) => record.id),
      );
      if (result.error) toast.error(result.error);
      else if (result.result && !result.result.isCanceled)
        toast.success(
          `Se guardó ${format === "pdf" ? "el informe" : "la tabla"} con ${plural(result.result.count, "servicio", "servicios")}`,
        );
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start">
      <Surface className="flex flex-col overflow-hidden lg:max-h-[calc(100dvh-14rem)]">
        <div className="flex flex-col gap-3 border-b border-line p-4">
          <Select
            id="records-service"
            ariaLabel="Servicio"
            value={serviceFilter || ALL}
            onValueChange={(value) => onServiceFilter(value === ALL ? "" : value)}
            options={[
              { value: ALL, label: "Todos los servicios" },
              ...types.map((type) => ({ value: type.id, label: type.name })),
            ]}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              id="records-from"
              ariaLabel="Desde el mes"
              value={from || ALL}
              onValueChange={(value) =>
                onRange({ from: value === ALL ? null : value, to: to || null })
              }
              options={[{ value: ALL, label: "Desde: todos" }, ...months]}
            />
            <Select
              id="records-to"
              ariaLabel="Hasta el mes"
              value={to || ALL}
              onValueChange={(value) =>
                onRange({ from: from || null, to: value === ALL ? null : value })
              }
              options={[{ value: ALL, label: "Hasta: todos" }, ...months]}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-ink-2">
              {plural(records.length, "servicio", "servicios")}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Download className="size-4" />}
                  isLoading={isExporting}
                  disabled={finished.length === 0}
                >
                  Descargar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => download("pdf")}>
                  <FileText aria-hidden />
                  Informe en PDF
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => download("csv")}>
                  <Table2 aria-hidden />
                  Tabla (CSV, abre en Excel)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {records.length === 0 ? (
          <EmptyState icon={<Timer />} title="No hay tiempos con estos filtros" className="py-10" />
        ) : (
          <div className="overflow-y-auto">
            {groups.map((group) => (
              <section key={group.key} aria-label={group.title}>
                <h3 className="sticky top-0 z-10 bg-elevated/95 px-4 pt-4 pb-2 eyebrow text-ink-2 backdrop-blur">
                  {group.title}
                </h3>
                <ul className="px-2 pb-2">
                  {group.records.map((record) => {
                    const totals = recordTotals(record);
                    const isSelected = record.id === selected?.id;
                    return (
                      <li key={record.id}>
                        <button
                          type="button"
                          aria-current={isSelected ? "true" : undefined}
                          onClick={() => onSelect(record.id)}
                          className={cn(
                            "relative flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-3 text-left transition-colors",
                            isSelected ? "bg-surface-raised" : "hover:bg-surface",
                          )}
                        >
                          {isSelected && (
                            <span
                              aria-hidden
                              className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-accent"
                            />
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">
                              {serviceName(record, types)}
                            </span>
                            <span className="block text-xs text-ink-2">
                              {shortWeekdayDate(record.date, timeZone)}
                            </span>
                          </span>
                          <span className="text-sm tabular-nums">{clock(totals.actual)}</span>
                          {record.status === "inProgress" ? (
                            <Chip color="var(--color-live)">En curso</Chip>
                          ) : totals.overtime > 0 ? (
                            <Chip color="var(--color-danger)">{overtime(totals.overtime)}</Chip>
                          ) : (
                            <Chip color="var(--color-success)">A tiempo</Chip>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Surface>

      <Surface className="p-6 sm:p-8">
        {selected ? (
          <RecordDetail
            key={selected.id}
            record={selected}
            types={types}
            people={people}
            timeZone={timeZone}
            onDeleted={() => onSelect("")}
          />
        ) : (
          <EmptyState icon={<Timer />} title="Selecciona un registro" />
        )}
      </Surface>
    </div>
  );
}

function groupByMonth(records: ServiceRecord[], timeZone: string) {
  const groups: { key: string; title: string; records: ServiceRecord[] }[] = [];
  for (const record of records) {
    const { year, month } = zonedParts(new Date(record.date), timeZone);
    const key = `${year}-${month}`;
    const last = groups.at(-1);
    if (last?.key === key) last.records.push(record);
    else groups.push({ key, title: monthYearOverline(record.date, timeZone), records: [record] });
  }
  return groups;
}
