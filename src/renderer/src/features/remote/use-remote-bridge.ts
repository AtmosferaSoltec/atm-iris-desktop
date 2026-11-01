import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Person } from "@shared/domain/models";
import { passageId } from "@shared/lib/bible-reference";
import { findOrAddPerson } from "@renderer/features/people/actions";
import { passageItem } from "../console/bible/passage-item";
import type { LibraryEntry } from "../console/model";
import { errorMessage } from "@shared/errors";
import type { RemoteCommand, RemoteState } from "@shared/remote/protocol";
import { nextIndex } from "@shared/domain/block-timer";
import { toast } from "@renderer/components/ui/toaster";
import { invoke } from "@renderer/lib/ipc";
import { playSound } from "../console/sounds/play-sound";
import type { LiveConsole } from "../console/use-live-console";
import type { ServiceTimerControls } from "../console/use-service-timer";
import { buildRemoteState, shouldPublish } from "./remote-state";
import { useRemoteStatus } from "./use-remote-status";

/**
 * Lets the iPad drive this console. The live state lives here, so this is where it is read to
 * be published and where the iPad's commands are carried out, with the same functions the
 * buttons use: the remote can do nothing the operator cannot.
 */
export function useRemoteBridge(
  ctrl: LiveConsole,
  service: ServiceTimerControls,
  {
    churchName,
    library,
    people: initialPeople,
  }: { churchName: string; library: LibraryEntry[]; people: Person[] },
): void {
  const status = useRemoteStatus();
  // People added from the iPad join this list; the computer's own dialog picks them up on reload.
  const [people, setPeople] = useState(initialPeople);
  const bible = useQuery({
    queryKey: ["bible", "status"],
    queryFn: () => invoke("bible:status", undefined),
  });
  const bibles = bible.data?.translations;
  const selectedBible = bible.data?.selectedTranslation ?? null;
  const isEnabled = status?.isEnabled ?? false;
  const deviceCount = status?.deviceCount ?? 0;
  const last = useRef<{ state: RemoteState; at: number } | null>(null);

  const { items, openItem, live, isCleared, playback, volume, backgroundId, backgrounds, sounds } =
    ctrl;
  const countdown = ctrl.timer;
  const serviceName = service.serviceType?.name ?? null;
  const serviceTimer = service.timer;
  const serviceTypes = service.types;
  const selectedServiceTypeId = service.serviceType?.id ?? null;

  useEffect(() => {
    if (!isEnabled) {
      last.current = null;
      return;
    }
    const now = Date.now();
    const state = buildRemoteState({
      churchName,
      items,
      openItem,
      live,
      isCleared,
      playback,
      volume,
      backgroundId,
      backgrounds,
      sounds,
      countdown,
      service: serviceName && serviceTimer ? { name: serviceName, timer: serviceTimer } : null,
      serviceTypes,
      selectedServiceTypeId,
      people,
      library,
      bibles: (bibles ?? []).map((translation) => ({
        code: translation.code,
        name: translation.name,
      })),
      selectedBible,
      now,
    });
    if (!shouldPublish(last.current, state, now)) return;
    last.current = { state, at: now };
    void invoke("remote:publish-state", state).catch((error) => toast.error(errorMessage(error)));
    // A new iPad is sent the latest state by main; this only keeps main's copy current.
  }, [
    isEnabled,
    deviceCount,
    churchName,
    items,
    openItem,
    live,
    isCleared,
    playback,
    volume,
    backgroundId,
    backgrounds,
    sounds,
    countdown,
    serviceName,
    serviceTimer,
    serviceTypes,
    selectedServiceTypeId,
    people,
    library,
    bibles,
    selectedBible,
  ]);

  // Leaving the console (Settings, Times…) takes its live state away: the iPad must know.
  useEffect(
    () => () => {
      void invoke("remote:publish-state", null).catch(() => {});
    },
    [],
  );

  // Commands are carried out against the newest controllers, not the ones of the render that subscribed.
  const latest = useRef({ ctrl, service, library, people, setPeople });
  useEffect(() => {
    latest.current = { ctrl, service, library, people, setPeople };
  }, [ctrl, service, library, people]);
  useEffect(
    () => window.iris.onEvent("remote:command", (command) => apply(command, latest.current)),
    [],
  );
}

type Context = {
  ctrl: LiveConsole;
  service: ServiceTimerControls;
  library: LibraryEntry[];
  people: Person[];
  setPeople: (update: (current: Person[]) => Person[]) => void;
};

function apply(command: RemoteCommand, context: Context): void {
  const { ctrl, service } = context;
  switch (command.type) {
    case "select":
      if (ctrl.items.some((item) => item.planItemId === command.id)) ctrl.setOpenKey(command.id);
      return;
    case "show-slide":
      ctrl.presentAt(command.id, command.slide);
      return;
    case "set-cleared":
      if (ctrl.isCleared !== command.value) ctrl.toggleCleared();
      return;
    case "playback":
      return applyPlayback(command.action, ctrl);
    case "seek":
      ctrl.seek(command.seconds);
      return;
    case "volume":
      ctrl.setVolume(command.value);
      return;
    case "set-background":
      if (command.id === null || ctrl.backgrounds.some((item) => item.id === command.id))
        ctrl.setBackgroundId(command.id);
      return;
    case "countdown":
      if (command.action === "start" && command.seconds)
        ctrl.startTimer(command.seconds, command.label);
      if (command.action === "pause") ctrl.pauseTimer();
      if (command.action === "resume") ctrl.resumeTimer();
      if (command.action === "hide") ctrl.hideTimer();
      return;
    case "play-sound":
      // Only a sound the church has: the id comes from the network.
      if (ctrl.sounds.some((sound) => sound.id === command.id))
        void playSound(command.id).then(
          (isPlaying) => !isPlaying && toast.error("No pudimos reproducir el sonido."),
        );
      return;
    case "next-block":
      if (service.timer && service.timer.phase !== "finished" && nextIndex(service.timer) !== null)
        service.startNext();
      return;
    case "finish-service":
      if (service.timer?.phase === "running") service.finish();
      return;
    case "choose-service": {
      const type = service.types.find((candidate) => candidate.id === command.id);
      // Only before it starts, like the computer's "Seleccionar servicio".
      if (type && service.timer?.phase !== "running") service.choose(type);
      return;
    }
    case "add-block":
      if (service.timer && service.timer.phase !== "finished")
        service.addBlock({ name: command.name, plannedSeconds: command.minutes * 60 }, command.at);
      return;
    case "set-leader":
      void setLeader(command, context);
      return;
    case "present-media": {
      const entry = context.library.find(
        (candidate) => candidate.kind === "media" && candidate.id === command.id,
      );
      if (entry) void ctrl.presentQuick(entry);
      return;
    }
    case "present-bible":
      void presentBible(command, ctrl);
      return;
  }
}

async function setLeader(
  command: Extract<RemoteCommand, { type: "set-leader" }>,
  { service, people, setPeople }: Context,
): Promise<void> {
  if (!service.timer?.blocks[command.block]) return;
  let person = command.personId
    ? people.find((candidate) => candidate.id === command.personId)
    : null;
  if (!person && command.name) {
    const result = await findOrAddPerson(command.name);
    if (!result.person) {
      toast.error(result.error ?? "No pudimos agregar a esa persona.");
      return;
    }
    person = result.person;
    const added = result.person;
    setPeople((current) =>
      current.some((candidate) => candidate.id === added.id)
        ? current
        : [...current, added].sort((a, b) => a.name.localeCompare(b.name, "es")),
    );
  }
  service.setLeader(
    command.block,
    person ? { id: person.id, name: person.name } : { id: null, name: null },
  );
}

/** The same passage the computer's "Biblia" projects: shown once, never added to the service. */
async function presentBible(
  command: Extract<RemoteCommand, { type: "present-bible" }>,
  ctrl: LiveConsole,
): Promise<void> {
  try {
    const chapter = await invoke("bible:chapter", {
      translation: command.translation,
      bookId: command.bookId,
      chapter: command.chapter,
    });
    const passage = {
      code: command.translation,
      bookId: command.bookId,
      chapter: command.chapter,
      from: command.from,
      to: Math.max(command.to, command.from),
    };
    if (!chapter.verses.some((verse) => verse.number === passage.from)) return;
    const item = passageItem(chapter, passage, {
      planItemId: "bible-live",
      refId: passageId(passage),
    });
    ctrl.presentPassage(item, item.focus?.first ?? 0);
  } catch (error) {
    toast.error(errorMessage(error));
  }
}

function applyPlayback(
  action: Extract<RemoteCommand, { type: "playback" }>["action"],
  ctrl: LiveConsole,
): void {
  const { playback, openItem } = ctrl;
  switch (action) {
    case "play":
      if (playback && !playback.playing) ctrl.togglePlay();
      else if (!playback && openItem?.kind === "video") ctrl.presentMedia();
      else if (!playback) ctrl.toggleTrack();
      return;
    case "pause":
      if (playback?.playing) ctrl.togglePlay();
      return;
    case "stop":
      ctrl.stopPlayback();
      return;
    case "restart":
      if (playback) ctrl.seek(0);
      return;
    case "loop-on":
    case "loop-off":
      if (playback && playback.loop !== (action === "loop-on")) ctrl.toggleLoop();
      return;
  }
}
