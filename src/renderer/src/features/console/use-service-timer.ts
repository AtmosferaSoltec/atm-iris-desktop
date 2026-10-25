import { invoke } from "@renderer/lib/ipc";
import { toast } from "@renderer/components/ui/toaster";
import { errorMessage } from "@shared/errors";
import { createId } from "@shared/id";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ServiceRecord, ServiceType } from "@shared/domain/models";
import { saveServiceRecord } from "./actions";
import {
  finish,
  recordInput,
  resumeTimer,
  setLeader,
  startNext,
  timerFor,
  type ServiceTimer,
} from "./block-timer";

export type Leader = { id: string | null; name: string | null };

const NO_LEADER: Leader = { id: null, name: null };

/** Every block change is queued to SQLite; startup resumes the saved running record. */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- The inferred result defines the timer controller.
export function useServiceTimer({
  serviceTypes,
  inProgress,
  selectedServiceTypeId,
}: {
  serviceTypes: ServiceType[];
  inProgress: ServiceRecord | null;
  selectedServiceTypeId: string | null;
}) {
  const [types, setTypes] = useState(serviceTypes);
  // Initialize once from the local snapshot so query refreshes cannot reset a live clock.
  const [initial] = useState(() => initialState(serviceTypes, inProgress, selectedServiceTypeId));
  const [serviceType, setServiceType] = useState<ServiceType | null>(initial.serviceType);
  const [timer, setTimer] = useState<ServiceTimer | null>(initial.timer);
  const [now, setNow] = useState(() => Date.now());
  const [saveError, setSaveError] = useState<string | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const latest = useRef<ServiceTimer | null>(initial.timer);

  // One tick a second, only while a block runs. The clock never goes to the screens.
  useEffect(() => {
    if (timer?.phase !== "running") return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [timer?.phase]);

  const persist = useCallback((next: ServiceTimer) => {
    latest.current = next;
    const input = recordInput(next);
    if (!input) return;
    queue.current = queue.current.then(async () => {
      const result = await saveServiceRecord(next.recordId, input);
      // A later change already went out: only the newest failure matters.
      if (latest.current !== next) return;
      setSaveError(result.error ? "No pudimos guardar los tiempos. Inténtalo de nuevo." : null);
    });
  }, []);

  // Revalidate the resumed record through the same persistence queue.
  useEffect(() => {
    if (initial.timer && initial.timer.phase === "running") persist(initial.timer);
  }, [initial.timer, persist]);

  const apply = useCallback(
    (next: ServiceTimer) => {
      setTimer(next);
      setNow(Date.now());
      persist(next);
    },
    [persist],
  );

  /** Chooses the service to lead (only before it starts); it is remembered until it ends. */
  const choose = useCallback((type: ServiceType) => {
    setServiceType(type);
    setTimer(type.blocks.length > 0 ? timerFor(type, newId) : null);
    setSaveError(null);
    void invoke("service-types:select", type.id).catch((error) => toast.error(errorMessage(error)));
  }, []);

  /** After "Finalizar servicio": back to "Seleccionar servicio". */
  const clear = useCallback(() => {
    setServiceType(null);
    setTimer(null);
    latest.current = null;
    void invoke("service-types:select", null).catch((error) => toast.error(errorMessage(error)));
  }, []);

  return {
    types,
    /** A service created from the console joins the list. */
    addType: (type: ServiceType) => setTypes((current) => [...current, type]),
    serviceType,
    timer,
    now,
    saveError,
    choose,
    clear,
    /** Closes the current block (if any) and starts the next one right away; the leader is set after. */
    startNext: () => timer && apply(startNext(timer, NO_LEADER, Date.now())),
    setLeader: (index: number, leader: Leader) => timer && apply(setLeader(timer, index, leader)),
    finish: () => {
      if (!timer) return;
      apply(finish(timer, Date.now()));
      void invoke("service-types:select", null).catch((error) => toast.error(errorMessage(error)));
    },
    retrySave: () => latest.current && persist(latest.current),
  };
}

export type ServiceTimerControls = ReturnType<typeof useServiceTimer>;

/** The running record wins; otherwise the service chosen before; otherwise none. */
function initialState(
  types: ServiceType[],
  inProgress: ServiceRecord | null,
  selectedId: string | null,
): { serviceType: ServiceType | null; timer: ServiceTimer | null } {
  const resumed = inProgress ? resumeTimer(inProgress) : null;
  if (inProgress && resumed) {
    return {
      serviceType: types.find((type) => type.id === inProgress.serviceTypeId) ?? {
        id: inProgress.serviceTypeId ?? inProgress.id,
        name: inProgress.serviceTypeName,
        schedule: null,
        blocks: [],
        createdAt: inProgress.createdAt,
        updatedAt: inProgress.updatedAt,
      },
      timer: resumed,
    };
  }
  const selected = types.find((type) => type.id === selectedId) ?? null;
  return {
    serviceType: selected,
    timer: selected && selected.blocks.length > 0 ? timerFor(selected, newId) : null,
  };
}

function newId(): string {
  return createId();
}
