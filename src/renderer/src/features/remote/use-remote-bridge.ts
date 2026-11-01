import { useEffect, useRef } from "react";
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
  churchName: string,
): void {
  const status = useRemoteStatus();
  const isEnabled = status?.isEnabled ?? false;
  const deviceCount = status?.deviceCount ?? 0;
  const last = useRef<{ state: RemoteState; at: number } | null>(null);

  const { items, openItem, live, isCleared, playback, volume, backgroundId, backgrounds, sounds } =
    ctrl;
  const countdown = ctrl.timer;
  const serviceName = service.serviceType?.name ?? null;
  const serviceTimer = service.timer;

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
  ]);

  // Commands are carried out against the newest controllers, not the ones of the render that subscribed.
  const latest = useRef({ ctrl, service });
  useEffect(() => {
    latest.current = { ctrl, service };
  }, [ctrl, service]);
  useEffect(
    () =>
      window.iris.onEvent("remote:command", (command) =>
        apply(command, latest.current.ctrl, latest.current.service),
      ),
    [],
  );
}

function apply(command: RemoteCommand, ctrl: LiveConsole, service: ServiceTimerControls): void {
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
