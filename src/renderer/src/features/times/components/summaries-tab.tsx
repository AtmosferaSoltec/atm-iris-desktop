import { SearchX } from "lucide-react";
import { useState } from "react";
import { TimeBar } from "@renderer/components/service/time-bar";
import { Avatar } from "@renderer/components/ui/avatar";
import { Button } from "@renderer/components/ui/button";
import { Dialog } from "@renderer/components/ui/dialog";
import { EmptyState } from "@renderer/components/ui/empty-state";
import { SectionHeader } from "@renderer/components/ui/page-header";
import { Select } from "@renderer/components/ui/select";
import { Surface } from "@renderer/components/ui/surface";
import type { Person, ServiceRecord, ServiceType } from "@shared/domain/models";
import {
  computeStatistics,
  isOver,
  overtimeSeconds,
  personName,
  serviceName,
  type Period,
  type StatisticsFilter,
} from "@shared/domain/time-statistics";
import { cn } from "@renderer/lib/cn";
import { clock, monthName, overtime, percent, shortWeekdayDate } from "@shared/lib/format";
import { compareNames } from "@shared/lib/text";
import { zonedParts } from "@shared/lib/zoned-time";

const ALL = "all";
const PICK_MONTH = "__pick_month__";

const PERIOD_LABELS: Record<Exclude<Period["kind"], "month">, string> = {
  thisMonth: "Este mes",
  lastMonth: "Mes anterior",
  last3Months: "Últimos 3 meses",
  thisYear: "Este año",
  all: "Todo",
};

export type SummaryParams = {
  period: Period["kind"];
  month: string;
  service: string;
  block: string;
  person: string;
};

type Props = {
  /** Records of the selected period (the page loads only those). */
  records: ServiceRecord[];
  params: SummaryParams;
  period: Period;
  blockNames: string[];
  types: ServiceType[];
  people: Person[];
  timeZone: string;
  now: string;
  firstYear: number;
  onChange: (change: Partial<SummaryParams>) => void;
};

const capitalize = (text: string) => text.charAt(0).toLocaleUpperCase("es") + text.slice(1);

export function SummariesTab({
  records,
  params,
  period,
  blockNames,
  types,
  people,
  timeZone,
  now,
  firstYear,
  onChange,
}: Props) {
  const [isPickingMonth, setIsPickingMonth] = useState(false);
  const [detailPersonId, setDetailPersonId] = useState<string | null>(null);

  const filter: StatisticsFilter = {
    period,
    serviceTypeId: params.service || null,
    blockName: params.block || null,
    personId: params.person || null,
  };
  const stats = computeStatistics(records, filter, new Date(now), timeZone);
  const name = (id: string) => personName(id, people, records);
  const blockScale = Math.max(
    1,
    ...stats.byBlock.map((block) => Math.max(block.avgActual, block.avgPlanned)),
  );
  const monthLabel =
    period.kind === "month" ? `${capitalize(monthName(period.month))} ${period.year}` : null;

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Select
          id="summary-period"
          ariaLabel="Periodo"
          value={params.period}
          onValueChange={(value) => {
            if (value === PICK_MONTH) setIsPickingMonth(true);
            else onChange({ period: value as Period["kind"], month: "" });
          }}
          options={[
            ...Object.entries(PERIOD_LABELS).map(([value, label]) => ({ value, label })),
            ...(monthLabel ? [{ value: "month", label: monthLabel }] : []),
          ]}
          footer={[{ value: PICK_MONTH, label: "Elegir mes…" }]}
        />
        <Select
          id="summary-service"
          ariaLabel="Servicio"
          value={params.service || ALL}
          onValueChange={(value) => onChange({ service: value === ALL ? "" : value })}
          options={[
            { value: ALL, label: "Todos los servicios" },
            ...types.map((type) => ({ value: type.id, label: type.name })),
          ]}
        />
        <Select
          id="summary-block"
          ariaLabel="Bloque"
          value={params.block || ALL}
          onValueChange={(value) => onChange({ block: value === ALL ? "" : value })}
          options={[
            { value: ALL, label: "Todos los bloques" },
            ...blockNames.map((block) => ({ value: block, label: block })),
          ]}
        />
        <Select
          id="summary-person"
          ariaLabel="Persona"
          value={params.person || ALL}
          onValueChange={(value) => onChange({ person: value === ALL ? "" : value })}
          options={[
            { value: ALL, label: "Todas las personas" },
            ...[...people]
              .sort((a, b) => compareNames(a.name, b.name))
              .map((person) => ({ value: person.id, label: person.name })),
          ]}
        />
      </div>

      {stats.serviceCount === 0 ? (
        <Surface>
          <EmptyState icon={<SearchX />} title="No hay tiempos con estos filtros" />
        </Surface>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <Kpi label="Servicios" value={String(stats.serviceCount)} />
            <Kpi label="Duración promedio" value={clock(Math.round(stats.averageDuration))} />
            <Kpi
              label="Exceso promedio por servicio"
              value={overtime(Math.round(stats.averageOvertimePerService))}
            />
            <Kpi
              label="Bloques pasados"
              value={`${stats.overBlocks.over} de ${stats.overBlocks.total}`}
              detail={percent(
                stats.overBlocks.total ? stats.overBlocks.over / stats.overBlocks.total : 0,
              )}
            />
          </dl>

          {stats.byPerson.length > 0 && (
            <section className="flex flex-col gap-3">
              <SectionHeader>Por persona</SectionHeader>
              <Surface className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-xs text-ink-2">
                      <th scope="col" className="px-5 py-3 font-medium">
                        Persona
                      </th>
                      <th scope="col" className="px-3 py-3 text-right font-medium">
                        Participaciones
                      </th>
                      <th scope="col" className="px-3 py-3 text-right font-medium">
                        Veces que se pasó
                      </th>
                      <th scope="col" className="px-3 py-3 text-right font-medium">
                        Exceso promedio
                      </th>
                      <th scope="col" className="px-3 py-3 text-right font-medium">
                        Exceso máximo
                      </th>
                      <th scope="col" className="px-5 py-3 text-right font-medium">
                        Exceso total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line tabular-nums">
                    {stats.byPerson.map((stat, index) => (
                      <tr key={stat.personId}>
                        <th scope="row" className="px-5 py-3 font-normal">
                          <button
                            type="button"
                            onClick={() => setDetailPersonId(stat.personId)}
                            aria-label={`Ver sus bloques: ${name(stat.personId)}`}
                            className="flex cursor-pointer items-center gap-3 text-left font-semibold hover:underline"
                          >
                            <Avatar name={name(stat.personId)} index={index} size={32} />
                            {name(stat.personId)}
                          </button>
                        </th>
                        <td className="px-3 py-3 text-right">{stat.participations}</td>
                        <td className="px-3 py-3 text-right">{stat.timesOver}</td>
                        <td className="px-3 py-3 text-right">
                          {stat.timesOver ? overtime(Math.round(stat.avgOvertimeWhenOver)) : "—"}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {stat.timesOver ? overtime(Math.round(stat.maxOvertime)) : "—"}
                        </td>
                        <td className="px-5 py-3 text-right">
                          {stat.timesOver ? overtime(Math.round(stat.totalOvertime)) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Surface>
            </section>
          )}

          <section className="flex flex-col gap-3">
            <SectionHeader>Por bloque</SectionHeader>
            <Surface className="divide-y divide-line">
              {stats.byBlock.map((block) => (
                <div
                  key={block.name}
                  className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{block.name}</p>
                    <p className="text-sm text-ink-2">
                      Se pasó {block.timesOver} de {block.total} veces
                      {block.timesOver > 0 &&
                        ` · promedio ${overtime(Math.round(block.avgOvertimeWhenOver))}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 sm:w-80">
                    <TimeBar
                      actual={block.avgActual}
                      planned={block.avgPlanned}
                      scale={blockScale}
                    />
                    <span className="shrink-0 text-xs text-ink-2 tabular-nums">
                      {clock(Math.round(block.avgActual))} / {clock(Math.round(block.avgPlanned))}
                    </span>
                  </div>
                </div>
              ))}
            </Surface>
          </section>
        </>
      )}

      {isPickingMonth && (
        <MonthPicker
          initial={period.kind === "month" ? period : zonedParts(new Date(now), timeZone)}
          firstYear={firstYear}
          lastYear={zonedParts(new Date(now), timeZone).year}
          onClose={() => setIsPickingMonth(false)}
          onPick={(year, month) => {
            setIsPickingMonth(false);
            onChange({ period: "month", month: `${year}-${String(month).padStart(2, "0")}` });
          }}
        />
      )}
      {detailPersonId && (
        <PersonBlocksDialog
          personId={detailPersonId}
          name={name(detailPersonId)}
          records={records}
          filter={filter}
          types={types}
          timeZone={timeZone}
          now={now}
          onClose={() => setDetailPersonId(null)}
        />
      )}
    </div>
  );
}

function Kpi({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <Surface className="flex flex-col gap-1 p-5">
      <dt className="text-sm text-ink-2">{label}</dt>
      <dd className="text-2xl font-semibold tabular-nums">
        {value}
        {detail && <span className="text-base font-medium text-ink-2"> · {detail}</span>}
      </dd>
    </Surface>
  );
}

function MonthPicker({
  initial,
  firstYear,
  lastYear,
  onClose,
  onPick,
}: {
  initial: { year: number; month: number };
  firstYear: number;
  lastYear: number;
  onClose: () => void;
  onPick: (year: number, month: number) => void;
}) {
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const years = Array.from(
    { length: lastYear - Math.min(firstYear, lastYear) + 1 },
    (_, i) => lastYear - i,
  );

  return (
    <Dialog
      open
      onClose={onClose}
      size="sm"
      title="Elegir mes"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => onPick(year, month)}>Ver este mes</Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 pb-2">
        <Select
          id="pick-month"
          label="Mes"
          value={String(month)}
          onValueChange={(value) => setMonth(Number(value))}
          options={Array.from({ length: 12 }, (_, index) => ({
            value: String(index + 1),
            label: capitalize(monthName(index + 1)),
          }))}
        />
        <Select
          id="pick-year"
          label="Año"
          value={String(year)}
          onValueChange={(value) => setYear(Number(value))}
          options={years.map((value) => ({ value: String(value), label: String(value) }))}
        />
      </div>
    </Dialog>
  );
}

function PersonBlocksDialog({
  personId,
  name,
  records,
  filter,
  types,
  timeZone,
  now,
  onClose,
}: {
  personId: string;
  name: string;
  records: ServiceRecord[];
  filter: StatisticsFilter;
  types: ServiceType[];
  timeZone: string;
  now: string;
  onClose: () => void;
}) {
  const stats = computeStatistics(records, { ...filter, personId }, new Date(now), timeZone);
  const stat = stats.byPerson.find((candidate) => candidate.personId === personId);
  const summary =
    stat && stat.timesOver > 0
      ? `Se pasó en ${stat.timesOver} de ${stat.participations} bloques · promedio ${overtime(Math.round(stat.avgOvertimeWhenOver))}`
      : `A tiempo en sus ${stats.overBlocks.total} bloques`;

  return (
    <Dialog open onClose={onClose} size="lg" title={name} description={summary}>
      <div className="overflow-x-auto pb-4">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-ink-2">
              <th scope="col" className="py-2 pr-3 font-medium">
                Fecha
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Servicio
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Bloque
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                Real / previsto
              </th>
              <th scope="col" className="py-2 pl-3 text-right font-medium">
                Exceso
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line tabular-nums">
            {stats.entries.map((entry) => (
              <tr key={entry.block.id}>
                <td className="py-2.5 pr-3 whitespace-nowrap">
                  {shortWeekdayDate(entry.date, timeZone)}
                </td>
                <td className="px-3 py-2.5">{serviceName(entry, types)}</td>
                <td className="px-3 py-2.5">{entry.block.name}</td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                  {clock(entry.block.actualSeconds)} / {clock(entry.block.plannedSeconds)}
                </td>
                <td
                  className={cn(
                    "py-2.5 pl-3 text-right",
                    isOver(entry.block) ? "text-danger" : "text-success",
                  )}
                >
                  {isOver(entry.block) ? overtime(overtimeSeconds(entry.block)) : "a tiempo"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Dialog>
  );
}
