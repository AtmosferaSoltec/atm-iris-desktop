import { ArrowLeftRight, Clock, Ellipsis, Timer, Trash2, UserRound } from "lucide-react";
import { useState, useTransition } from "react";
import { TimeBar } from "@renderer/components/service/time-bar";
import { Button, IconButton } from "@renderer/components/ui/button";
import { Chip } from "@renderer/components/ui/chip";
import { ConfirmDialog, Dialog } from "@renderer/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@renderer/components/ui/dropdown-menu";
import { Select } from "@renderer/components/ui/select";
import { Switch } from "@renderer/components/ui/switch";
import { TextField } from "@renderer/components/ui/text-field";
import { toast } from "@renderer/components/ui/toaster";
import type { BlockRecord, Person, ServiceRecord, ServiceType } from "@shared/domain/models";
import {
  isOver,
  leaderName,
  overtimeSeconds,
  recordTotals,
  serviceName,
} from "@shared/domain/time-statistics";
import { cn } from "@renderer/lib/cn";
import { clock, clockTime, longDate, overtime } from "@shared/lib/format";
import { zonedParts, zonedTimeToUtc } from "@shared/lib/zoned-time";
import { compareNames } from "@shared/lib/text";
import {
  adjustBlockDuration,
  changeBlockLeader,
  changeBlockStart,
  deleteRecord,
  swapBlocks,
} from "../actions";

type Props = {
  record: ServiceRecord;
  types: ServiceType[];
  people: Person[];
  timeZone: string;
  onDeleted: () => void;
};

export function RecordDetail({ record, types, people, timeZone, onDeleted }: Props) {
  const [adjusting, setAdjusting] = useState<BlockRecord | null>(null);
  const [reassigning, setReassigning] = useState<BlockRecord | null>(null);
  const [restarting, setRestarting] = useState<BlockRecord | null>(null);
  const [swapping, setSwapping] = useState<BlockRecord | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();
  const [isDeleting, startDelete] = useTransition();

  const totals = recordTotals(record);
  const scale = Math.max(
    ...record.blocks.map((block) => Math.max(block.actualSeconds, block.plannedSeconds)),
    1,
  );

  function confirmDelete() {
    startDelete(async () => {
      const result = await deleteRecord(record.id);
      if (result.error) {
        setDeleteError(result.error);
        return;
      }
      toast.success("Registro eliminado");
      setIsConfirmingDelete(false);
      onDeleted();
    });
  }

  return (
    <article className="flex flex-col gap-7">
      <header>
        <h2 className="font-serif text-3xl font-medium tracking-tight">
          {serviceName(record, types)}
        </h2>
        <p className="mt-1 text-ink-2">{longDate(record.date, timeZone)}</p>
      </header>

      <dl className="grid grid-cols-3 gap-3">
        <Metric label="Duración" value={clock(totals.actual)} />
        <Metric label="Previsto" value={clock(totals.planned)} />
        <Metric
          label="Exceso"
          value={totals.overtime > 0 ? overtime(totals.overtime) : "A tiempo"}
          tone={totals.overtime > 0 ? "danger" : "success"}
        />
      </dl>

      <section className="flex flex-col gap-3" aria-label="Bloques">
        <h3 className="eyebrow text-ink-2">Bloques</h3>
        <ul className="divide-y divide-line">
          {record.blocks.map((block) => {
            const skipped = block.status === "skipped";
            const over = overtimeSeconds(block);
            return (
              <li key={block.id} className="flex flex-col gap-2.5 py-4 first:pt-0">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "flex flex-wrap items-center gap-2 font-semibold",
                        skipped && "text-ink-2",
                      )}
                    >
                      {block.name}
                      {block.status === "adjusted" && (
                        <Chip color="var(--color-violet)">Ajustado</Chip>
                      )}
                      {skipped && <Chip>Omitido</Chip>}
                    </p>
                    <p className="text-sm text-ink-2">
                      <span>{leaderName(block, people)}</span>
                      {block.startedAt && !skipped && (
                        <span>
                          {" · "}
                          {block.endedAt
                            ? `de ${timeLabel(block.startedAt, timeZone)} a ${timeLabel(block.endedAt, timeZone)}`
                            : `inició ${timeLabel(block.startedAt, timeZone)}`}
                        </span>
                      )}
                    </p>
                  </div>
                  {!skipped && (
                    <div className="text-right text-sm tabular-nums">
                      <p className="font-semibold">{clock(block.actualSeconds)}</p>
                      <p className={isOver(block) ? "text-danger" : "text-success"}>
                        {isOver(block) ? overtime(over) : "a tiempo"}
                      </p>
                    </div>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <IconButton label={`Opciones del bloque ${block.name}`}>
                        <Ellipsis />
                      </IconButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onSelect={() => setAdjusting(block)}>
                        <Timer aria-hidden />
                        Ajustar duración…
                      </DropdownMenuItem>
                      {block.startedAt && block.endedAt && !skipped && (
                        <DropdownMenuItem onSelect={() => setRestarting(block)}>
                          <Clock aria-hidden />
                          Cambiar hora de inicio…
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onSelect={() => setReassigning(block)}>
                        <UserRound aria-hidden />
                        Cambiar responsable
                      </DropdownMenuItem>
                      {record.blocks.length > 1 && (
                        <DropdownMenuItem onSelect={() => setSwapping(block)}>
                          <ArrowLeftRight aria-hidden />
                          Intercambiar con otro bloque…
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {!skipped && (
                  <div className="flex items-center gap-3">
                    <TimeBar
                      actual={block.actualSeconds}
                      planned={block.plannedSeconds}
                      scale={scale}
                    />
                    <span className="shrink-0 text-xs text-ink-2 tabular-nums">
                      previsto {clock(block.plannedSeconds)}
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <div className="border-t border-line pt-5">
        <Button
          variant="ghost"
          className="text-danger hover:text-danger"
          icon={<Trash2 className="size-4" />}
          onClick={() => {
            setDeleteError(undefined);
            setIsConfirmingDelete(true);
          }}
        >
          Eliminar registro
        </Button>
      </div>

      {adjusting && (
        <AdjustDurationDialog
          recordId={record.id}
          block={adjusting}
          onClose={() => setAdjusting(null)}
        />
      )}
      {restarting && (
        <ChangeStartDialog
          recordId={record.id}
          block={restarting}
          timeZone={timeZone}
          onClose={() => setRestarting(null)}
        />
      )}
      {swapping && (
        <SwapBlocksDialog
          record={record}
          block={swapping}
          people={people}
          timeZone={timeZone}
          onClose={() => setSwapping(null)}
        />
      )}
      {reassigning && (
        <ChangeLeaderDialog
          recordId={record.id}
          block={reassigning}
          people={people}
          onClose={() => setReassigning(null)}
        />
      )}
      <ConfirmDialog
        open={isConfirmingDelete}
        onClose={() => setIsConfirmingDelete(false)}
        onConfirm={confirmDelete}
        isPending={isDeleting}
        error={deleteError}
        title="¿Eliminar este registro?"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
      />
    </article>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "danger" | "success";
}) {
  return (
    <div className="rounded-md bg-surface px-4 py-3 ring-1 ring-line ring-inset">
      <dt className="text-xs text-ink-2">{label}</dt>
      <dd
        className={cn(
          "mt-1 text-xl font-semibold tabular-nums",
          tone === "danger" && "text-danger",
          tone === "success" && "text-success",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

const MINUTE_OPTIONS = Array.from({ length: 241 }, (_, minute) => minute);
const SECOND_OPTIONS = Array.from({ length: 60 }, (_, second) => second);

function AdjustDurationDialog({
  recordId,
  block,
  onClose,
}: {
  recordId: string;
  block: BlockRecord;
  onClose: () => void;
}) {
  const [minutes, setMinutes] = useState(Math.min(240, Math.floor(block.actualSeconds / 60)));
  const [seconds, setSeconds] = useState(block.actualSeconds % 60);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await adjustBlockDuration(recordId, block.id, minutes * 60 + seconds);
      if (result.error) setError(result.error);
      else {
        toast.success("Duración ajustada");
        onClose();
      }
    });
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="sm"
      title="Ajustar duración"
      description={`${block.name} · previsto ${clock(block.plannedSeconds)}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} isLoading={isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {error && (
          <p role="alert" className="text-sm font-medium text-danger">
            {error}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Select
            id="adjust-minutes"
            label="Minutos"
            value={String(minutes)}
            onValueChange={(value) => setMinutes(Number(value))}
            options={MINUTE_OPTIONS.map((value) => ({
              value: String(value),
              label: String(value),
            }))}
          />
          <Select
            id="adjust-seconds"
            label="Segundos"
            value={String(seconds)}
            onValueChange={(value) => setSeconds(Number(value))}
            options={SECOND_OPTIONS.map((value) => ({
              value: String(value),
              label: String(value).padStart(2, "0"),
            }))}
          />
        </div>
      </div>
    </Dialog>
  );
}

function timeLabel(instant: string, timeZone: string): string {
  const { hour, minute } = zonedParts(new Date(instant), timeZone);
  return clockTime(hour, minute);
}

/** The block really began earlier or later than the click: it lasts until it ended. */
function ChangeStartDialog({
  recordId,
  block,
  timeZone,
  onClose,
}: {
  recordId: string;
  block: BlockRecord;
  timeZone: string;
  onClose: () => void;
}) {
  const start = zonedParts(new Date(block.startedAt!), timeZone);
  const [time, setTime] = useState(
    `${String(start.hour).padStart(2, "0")}:${String(start.minute).padStart(2, "0")}`,
  );
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function save() {
    const [hour, minute] = time.split(":").map(Number);
    if (hour === undefined || minute === undefined || Number.isNaN(hour * minute)) {
      setError("Escribe una hora válida.");
      return;
    }
    // The same day as the block, in the church's time zone.
    const instant = zonedTimeToUtc(timeZone, start.year, start.month, start.day, hour, minute);
    startTransition(async () => {
      const result = await changeBlockStart(recordId, block.id, instant.toISOString());
      if (result.error) setError(result.error);
      else {
        toast.success("Hora de inicio actualizada");
        onClose();
      }
    });
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="sm"
      title="Cambiar hora de inicio"
      description={`${block.name} · terminó a las ${timeLabel(block.endedAt!, timeZone)}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} isLoading={isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {error && (
          <p role="alert" className="text-sm font-medium text-danger">
            {error}
          </p>
        )}
        <TextField
          id="change-start-time"
          label="Hora de inicio"
          type="time"
          value={time}
          onChange={(event) => setTime(event.target.value)}
        />
        <p className="text-xs text-ink-2">
          El bloque durará hasta que terminó. Si hay un bloque antes, terminará a esa hora.
        </p>
      </div>
    </Dialog>
  );
}

/**
 * Two blocks were timed under each other's name (it happens when the order changes during the
 * service): each takes the other's name and planned time; the real times stay where they happened.
 */
function SwapBlocksDialog({
  record,
  block,
  people,
  timeZone,
  onClose,
}: {
  record: ServiceRecord;
  block: BlockRecord;
  people: Person[];
  timeZone: string;
  onClose: () => void;
}) {
  const others = record.blocks.filter((candidate) => candidate.id !== block.id);
  const [otherId, setOtherId] = useState(others[0]!.id);
  const [swapLeaders, setSwapLeaders] = useState(false);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const other = others.find((candidate) => candidate.id === otherId)!;
  // In the service's order: each place keeps its time and takes the other's name.
  const slots: [BlockRecord, BlockRecord][] =
    record.blocks.indexOf(block) < record.blocks.indexOf(other)
      ? [
          [block, other],
          [other, block],
        ]
      : [
          [other, block],
          [block, other],
        ];
  const when = (candidate: BlockRecord): string =>
    candidate.startedAt && candidate.status !== "skipped"
      ? ` · ${timeLabel(candidate.startedAt, timeZone)}`
      : "";
  const leader = (candidate: BlockRecord): string =>
    candidate.personId || candidate.personName ? ` · ${leaderName(candidate, people)}` : "";

  function save() {
    startTransition(async () => {
      const result = await swapBlocks(record.id, block.id, otherId, swapLeaders);
      if (result.error) setError(result.error);
      else {
        toast.success("Bloques intercambiados");
        onClose();
      }
    });
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="sm"
      title="Intercambiar bloques"
      description="Para cuando un bloque se cronometró con el nombre de otro. Las horas quedan donde pasaron: cambian el nombre y el tiempo previsto."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} isLoading={isPending}>
            Intercambiar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 pb-2">
        {error && (
          <p role="alert" className="text-sm font-medium text-danger">
            {error}
          </p>
        )}
        <Select
          id="swap-with"
          label={`Intercambiar «${block.name}»${when(block)} con`}
          value={otherId}
          onValueChange={setOtherId}
          options={others.map((candidate) => ({
            value: candidate.id,
            label: `${candidate.name}${when(candidate)}`,
          }))}
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm">
            También los responsables
            <span className="block text-xs text-ink-2">
              Si cada uno se fue con su bloque y no con su hora.
            </span>
          </span>
          <Switch
            label="Intercambiar también los responsables"
            checked={swapLeaders}
            onCheckedChange={setSwapLeaders}
          />
        </div>
        <div className="rounded-md bg-surface px-4 py-3 text-sm ring-1 ring-line ring-inset">
          <p className="text-xs text-ink-2">Quedará así</p>
          {slots.map(([slot, partner]) => (
            <p key={slot.id} className="mt-1">
              {partner.name}
              <span className="text-ink-2">
                {when(slot)}
                {leader(swapLeaders ? partner : slot)}
              </span>
            </p>
          ))}
        </div>
      </div>
    </Dialog>
  );
}

const NO_PERSON = "none";

function ChangeLeaderDialog({
  recordId,
  block,
  people,
  onClose,
}: {
  recordId: string;
  block: BlockRecord;
  people: Person[];
  onClose: () => void;
}) {
  const [personId, setPersonId] = useState(block.personId ?? NO_PERSON);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  // A deleted leader still shows (with the saved name) until someone else is picked.
  const missing = block.personId && !people.some((person) => person.id === block.personId);

  function save() {
    startTransition(async () => {
      const result = await changeBlockLeader(
        recordId,
        block.id,
        personId === NO_PERSON ? null : personId,
      );
      if (result.error) setError(result.error);
      else {
        toast.success("Responsable actualizado");
        onClose();
      }
    });
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="sm"
      title="Cambiar responsable"
      description={block.name}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} isLoading={isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3 pb-2">
        {error && (
          <p role="alert" className="text-sm font-medium text-danger">
            {error}
          </p>
        )}
        <Select
          id="leader"
          label="Responsable"
          value={personId}
          onValueChange={setPersonId}
          options={[
            { value: NO_PERSON, label: "Sin responsable" },
            ...(missing ? [{ value: block.personId!, label: leaderName(block, people) }] : []),
            ...[...people]
              .sort((a, b) => compareNames(a.name, b.name))
              .map((person) => ({ value: person.id, label: person.name })),
          ]}
        />
      </div>
    </Dialog>
  );
}
