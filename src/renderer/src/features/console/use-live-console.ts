import { followPlayback } from "@shared/domain/playback";
import { countdownReducer } from "@shared/domain/countdown";
import { ownBackgroundOnPresent } from "@shared/domain/playback";
import { invoke } from "@renderer/lib/ipc";
import { errorMessage } from "@shared/errors";
import { consoleContent } from "@shared/domain/console-frame";
import { useCallback, useEffect, useMemo, useRef, useState, useReducer } from "react";
import { toast } from "@renderer/components/ui/toaster";
import {
  type ProjectionBackground,
  type ProjectionContent,
  type ProjectionFrame,
  type ProjectionTypography,
} from "@renderer/features/projection/model";
import { clearPlan, movePlanItem, removePlanItem } from "@renderer/features/service-plan/actions";
import { addToService, quickItem } from "./actions";
import { RoomAudio } from "./room-audio";
import type { ConsoleData, ConsoleItem, LibraryEntry, SoundEntry } from "./model";

export type LivePosition = { key: string; slide: number };

/**
 * What is playing: a song's track (in the room, from this computer) or a video (on the
 * screens, muted). `position` seconds at `at` (epoch ms) is the source of truth; the
 * screens and the clock derive from it.
 */
export type Playback = {
  key: string;
  kind: "track" | "video";
  /** The file playing, to match what the screen reports. */
  fileId: string;
  title: string;
  playing: boolean;
  position: number;
  at: number;
  duration: number;
  loop: boolean;
  /** YouTube's subtitles on the screens; null for anything that is not a YouTube video. */
  captions: boolean | null;
  /**
   * Played by YouTube's player instead of a file: a YouTube video (on the screens, its sound
   * from EN VIVO) or a song's YouTube track (a visible player in the console; the screens keep
   * the lyrics).
   */
  youTube: boolean;
};

/** A track from an uploaded file: the room's audio element plays it. */
const inRoom = (playback: Playback | null): boolean =>
  playback?.kind === "track" && !playback.youTube;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- The inferred result is the controller contract.
export function useLiveConsole(data: ConsoleData) {
  const [items, setItems] = useState(data.items);
  const [backgrounds, setBackgrounds] = useState(data.backgrounds);
  const [sounds, setSounds] = useState(data.sounds);
  const [openKey, setOpenKey] = useState<string | null>(data.items[0]?.planItemId ?? null);
  const [live, setLive] = useState<LivePosition | null>(null);
  const [isCleared, setIsCleared] = useState(false);
  const [backgroundId, setBackgroundId] = useState<string | null>(() => {
    const id = data.projection.defaultBackgroundId;
    return id && data.backgrounds.some((background) => background.id === id) ? id : null;
  });
  const [isScreenMuted, setIsScreenMuted] = useState(false);
  const [playback, setPlayback] = useState<Playback | null>(null);
  // A countdown ("Temporizador"): on the screens over whatever was there until it is hidden.
  const [timer, dispatchTimer] = useReducer(countdownReducer, null);
  // How the lyrics look (contract §6): the church's, changed live from "Texto".
  const [typography, setTypography] = useState<ProjectionTypography>(() => ({
    fontFamily: data.projection.fontFamily,
    fontSizePt: data.projection.fontSizePt,
    fontBold: data.projection.fontBold ?? false,
    fontItalic: data.projection.fontItalic ?? false,
    uppercase: data.projection.uppercase ?? false,
  }));
  const [room] = useState(() => new RoomAudio());

  // A passage shown from "Biblia" (V): straight to the screens, never in the service.
  const [quickItemState, setQuickItemState] = useState<ConsoleItem | null>(null);
  const itemByKey = useMemo(
    () =>
      new Map(
        [...items, ...(quickItemState ? [quickItemState] : [])].map((item) => [
          item.planItemId,
          item,
        ]),
      ),
    [items, quickItemState],
  );
  const openItem = openKey ? (itemByKey.get(openKey) ?? null) : null;
  const background = backgrounds.find((candidate) => candidate.id === backgroundId) ?? null;

  const missingBackground = backgroundId && !background ? backgroundId : null;
  useEffect(() => {
    if (missingBackground)
      toast.warning("No encontramos el fondo. La pantalla se mostrará en negro.");
  }, [missingBackground]);

  // A song with its own background puts it up when it is presented (once per song: changing
  // the background afterwards is only for this time, it does not touch the song).
  const songBackgroundRef = useRef({ itemByKey, backgrounds });
  useEffect(() => {
    songBackgroundRef.current = { itemByKey, backgrounds };
  }, [itemByKey, backgrounds]);
  const liveKey = live?.key ?? null;
  const previousBackgroundKey = useRef<string | null>(null);
  useEffect(() => {
    if (!liveKey) return;
    const own = ownBackgroundOnPresent(
      liveKey,
      previousBackgroundKey.current,
      songBackgroundRef.current.itemByKey.get(liveKey)?.backgroundId,
      songBackgroundRef.current.backgrounds.map((candidate) => candidate.id),
    );
    previousBackgroundKey.current = liveKey;
    if (own) setBackgroundId(own);
  }, [liveKey]);

  const [source, setSource] = useState(data);
  if (source !== data) {
    setSource(data);
    setItems(data.items);
    setBackgrounds(data.backgrounds);
    setSounds(data.sounds);
  }

  // ----- What the screens show (IRIS_SPEC §7.3) -----

  const liveContent = useMemo<ProjectionContent>(
    () =>
      consoleContent(
        live ? (itemByKey.get(live.key) ?? null) : null,
        live?.slide ?? 0,
        isCleared,
        timer,
        playback,
      ),
    [isCleared, timer, live, itemByKey, playback],
  );

  const liveFrame = useMemo<ProjectionFrame>(
    () => ({
      background,
      content:
        liveContent.kind === "video" || liveContent.kind === "youtube"
          ? { ...liveContent, muted: isScreenMuted }
          : liveContent,
      typography,
    }),
    [background, liveContent, typography, isScreenMuted],
  );

  // ----- Talking to the screens -----

  /**
   * A player says where its video really is: its real length, and its end. The one with the
   * sound (YouTube in this console) is also the clock: when it runs late (it buffered) the
   * timeline moves to it, and the screens follow, so picture and sound stay together.
   */
  const followVideo = useCallback(
    (fileId: string, position: number, duration: number, isSound = false) => {
      setPlayback((current) => {
        if (!current) return current;
        const next = followPlayback(
          current,
          { id: fileId, position, duration },
          isSound,
          Date.now(),
        );
        if (!next && current.kind === "video")
          setLive((live) => (live?.key === current.key ? null : live));
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    void invoke("projection:push-frame", liveFrame).catch((error) =>
      toast.error(errorMessage(error)),
    );
  }, [liveFrame]);
  useEffect(
    () =>
      window.iris.onEvent("projection:video-time", (time) =>
        followVideo(time.id, time.position, time.duration, true),
      ),
    [followVideo],
  );

  useEffect(
    () =>
      window.iris.onEvent("projection:error", (message) =>
        toast.error(message, { id: "projection-error" }),
      ),
    [],
  );

  // ----- Playback (IRIS_SPEC §7.4) -----

  // Playing has side effects (the audio element), so the controls read the current playback
  // from a ref and touch the player exactly once, outside the state updates.
  const playbackRef = useRef(playback);
  useEffect(() => {
    playbackRef.current = playback;
  }, [playback]);

  const commit = useCallback((next: Playback | null) => {
    playbackRef.current = next;
    setPlayback(next);
  }, []);

  const stopPlayback = useCallback(() => {
    const current = playbackRef.current;
    if (!current) return;
    room.pause();
    // A stopped video that was on the screens leaves only the background.
    if (current.kind === "video") setLive((now) => (now?.key === current.key ? null : now));
    commit(null);
  }, [commit, room]);

  const startPlayback = useCallback(
    (item: ConsoleItem) => {
      const fileId = item.youTubeId ?? item.file?.id;
      if (!fileId) return;
      const current = playbackRef.current;
      // A YouTube video plays on the screens like a video; its sound comes from EN VIVO here.
      const kind = item.kind === "video" || item.kind === "youtube" ? "video" : "track";
      // Presenting what is already loaded resumes it, never restarts.
      if (current?.key === item.planItemId) {
        if (current.playing) return;
        if (inRoom(current)) room.resume();
        commit({ ...current, playing: true, at: Date.now() });
        return;
      }
      if (current?.kind === "track") room.pause();
      if (kind === "track" && item.file) room.start(item.file.url);
      commit({
        key: item.planItemId,
        kind,
        fileId,
        title: item.title,
        playing: true,
        position: 0,
        at: Date.now(),
        duration: item.file?.durationSeconds ?? 0,
        loop: false,
        captions: item.kind === "youtube" ? false : null,
        youTube: item.youTubeId !== undefined,
      });
    },
    [commit, room],
  );

  const togglePlay = useCallback(() => {
    const current = playbackRef.current;
    if (!current) return;
    const now = Date.now();
    if (current.playing) {
      if (inRoom(current)) room.pause();
      commit({ ...current, playing: false, position: elapsedOf(current, now), at: now });
      return;
    }
    if (inRoom(current)) room.resume();
    // A paused video resumes on the screens.
    if (current.kind === "video") {
      setLive({ key: current.key, slide: 0 });
      setIsCleared(false);
    }
    commit({ ...current, playing: true, at: now });
  }, [commit, room]);

  const seek = useCallback(
    (seconds: number) => {
      const current = playbackRef.current;
      if (!current) return;
      if (inRoom(current)) room.seek(seconds);
      commit({ ...current, position: seconds, at: Date.now() });
    },
    [commit, room],
  );

  const toggleLoop = useCallback(() => {
    const current = playbackRef.current;
    if (!current) return;
    if (inRoom(current)) room.setLoop(!current.loop);
    commit({ ...current, loop: !current.loop });
  }, [commit, room]);

  const toggleCaptions = useCallback(() => {
    const current = playbackRef.current;
    if (current?.captions === null || !current) return;
    commit({ ...current, captions: !current.captions });
  }, [commit]);

  // The track's real length and its end come from the room's audio; the video's from the screen.
  useEffect(() => {
    const stop = room.listen({
      onDuration: (seconds) => {
        const current = playbackRef.current;
        if (current && inRoom(current) && seconds > 0) commit({ ...current, duration: seconds });
      },
      onEnded: () => {
        if (inRoom(playbackRef.current)) commit(null);
      },
      onError: () => toast.error("No pudimos reproducir la pista."),
    });
    return () => {
      stop();
      room.pause();
    };
  }, [room, commit]);

  // ----- Presenting (IRIS_SPEC §7.1–7.2) -----

  /** Puts a slide (or an image/video) on the screens. A video that was playing pauses; a track keeps going. */
  const show = useCallback((position: LivePosition) => {
    setPlayback((current) =>
      current?.kind === "video" && current.key !== position.key && current.playing
        ? { ...current, playing: false, position: elapsedOf(current, Date.now()), at: Date.now() }
        : current,
    );
    setLive(position);
    setIsCleared(false);
  }, []);

  const presentPassage = useCallback(
    (item: ConsoleItem, slide: number) => {
      setQuickItemState(item);
      setOpenKey(item.planItemId);
      show({ key: item.planItemId, slide });
    },
    [show],
  );

  /**
   * Library "doble clic" on an image, video or YouTube link: straight to the screens, without
   * adding it to the service (unless it is already there). Videos and YouTube start playing.
   */
  const presentQuick = useCallback(
    async (entry: LibraryEntry) => {
      let item = items.find((candidate) => candidate.refId === entry.id) ?? null;
      if (!item) {
        const result = await quickItem(entry.kind === "youtube" ? "youtube" : "media", entry.id);
        if (!result.item) {
          toast.error(result.error ?? "No pudimos mostrarlo.");
          return;
        }
        item = result.item;
        setQuickItemState(item);
      }
      if ((item.kind === "image" || item.kind === "video") && !item.file) {
        toast.error("No encontramos el archivo.");
        return;
      }
      setOpenKey(item.planItemId);
      show({ key: item.planItemId, slide: 0 });
      if (item.kind === "video" || item.kind === "youtube") startPlayback(item);
    },
    [items, show, startPlayback],
  );

  const presentSlide = useCallback(
    (index: number) => {
      if (openKey) show({ key: openKey, slide: index });
    },
    [openKey, show],
  );

  const presentMedia = useCallback(() => {
    if (!openItem) return;
    if (openItem.kind === "image") show({ key: openItem.planItemId, slide: 0 });
    if (openItem.kind === "video" || openItem.kind === "youtube") {
      show({ key: openItem.planItemId, slide: 0 });
      startPlayback(openItem);
    }
    if (openItem.kind === "track") startPlayback(openItem);
  }, [openItem, show, startPlayback]);

  /** "Pista" of a song with lyrics: plays or pauses it; the screens do not change. */
  const toggleTrack = useCallback(() => {
    if (!openItem?.file && !openItem?.youTubeId) return;
    if (playback?.key === openItem.planItemId) togglePlay();
    else startPlayback(openItem);
  }, [openItem, playback?.key, startPlayback, togglePlay]);

  /** ← / →: the slide before or after the one on the screens (or the first of the open song). */
  const step = useCallback(
    (offset: number) => {
      const key = live?.key ?? openKey;
      const item = key ? itemByKey.get(key) : null;
      if (!item || (item.kind !== "song" && item.kind !== "bible") || item.slides.length === 0) {
        return;
      }
      // Not on the screens yet: a passage starts at its first verse (or ends at its last).
      const before = item.focus ? item.focus.first - 1 : -1;
      const after = item.focus ? item.focus.last + 1 : item.slides.length;
      const current = live?.key === key ? live.slide : offset > 0 ? before : after;
      const next = Math.min(Math.max(current + offset, 0), item.slides.length - 1);
      if (key !== openKey) setOpenKey(key);
      show({ key: item.planItemId, slide: next });
    },
    [live, openKey, itemByKey, show],
  );

  // ----- Editing the service (IRIS_SPEC §7.6); the plan follows -----

  /** Adds to the end of the service, or at `index` when dropped between two rows. */
  const add = useCallback(
    async (kind: "song" | "media" | "youtube", refId: string, index?: number) => {
      const result = await addToService(kind, refId);
      if (!result.item) {
        toast.error(result.error ?? "No pudimos agregarlo.");
        return;
      }
      const item = result.item;
      setItems((current) => {
        const at = Math.min(index ?? current.length, current.length);
        return [...current.slice(0, at), item, ...current.slice(at)];
      });
      setOpenKey(item.planItemId);
      if (index !== undefined) {
        void movePlanItem(item.planItemId, index).then(
          (moved) => moved.error && toast.error(moved.error),
        );
      }
    },
    [],
  );

  /** Takes rows out of this console: what was open moves on, what was playing stops. */
  const forget = useCallback(
    (keys: Set<string>) => {
      const index = items.findIndex((item) => keys.has(item.planItemId));
      if (index === -1) return;
      const rest = items.filter((item) => !keys.has(item.planItemId));
      setItems(rest);
      if (openKey && keys.has(openKey)) {
        setOpenKey(rest[Math.min(index, rest.length - 1)]?.planItemId ?? null);
      }
      if (playback && keys.has(playback.key)) stopPlayback();
      if (live && keys.has(live.key)) setLive(null);
    },
    [items, openKey, playback, live, stopPlayback],
  );

  const remove = useCallback(
    (key: string) => {
      const item = items.find((candidate) => candidate.planItemId === key);
      if (!item) return;
      forget(new Set([key]));
      void removePlanItem(key).then((result) => result.error && toast.error(result.error));
    },
    [items, forget],
  );

  /**
   * A song or file changed in the library (edited, or its track replaced): every row of it in
   * the service shows the new version.
   */
  const updateRef = useCallback((refId: string, content: Omit<ConsoleItem, "planItemId">) => {
    setItems((current) =>
      current.map((item) =>
        item.refId === refId ? { ...content, planItemId: item.planItemId } : item,
      ),
    );
  }, []);

  /** A song's own background changed: every row of it in the service. */
  const setSongBackground = useCallback((refId: string, backgroundId: string | null) => {
    setItems((current) =>
      current.map((item) => (item.refId === refId ? { ...item, backgroundId } : item)),
    );
  }, []);

  /** Deleted from the library: the API already took it out of the plan, so only here. */
  const dropRef = useCallback(
    (refId: string) =>
      forget(new Set(items.filter((item) => item.refId === refId).map((item) => item.planItemId))),
    [items, forget],
  );

  /** Drag and drop: the row `key` goes to place `to` (0-based), the others make room. */
  const moveTo = useCallback(
    (key: string, to: number) => {
      const from = items.findIndex((item) => item.planItemId === key);
      if (from === -1 || to < 0 || to >= items.length || to === from) return;
      const next = [...items];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      setItems(next);
      void movePlanItem(key, to).then((result) => result.error && toast.error(result.error));
    },
    [items],
  );

  const startTimer = useCallback((seconds: number, label?: string) => {
    dispatchTimer({ type: "start", seconds, label, now: Date.now() });
    setIsCleared(false);
  }, []);
  const pauseTimer = useCallback(() => dispatchTimer({ type: "pause", now: Date.now() }), []);
  const resumeTimer = useCallback(() => dispatchTimer({ type: "resume", now: Date.now() }), []);
  const hideTimer = useCallback(() => dispatchTimer({ type: "hide" }), []);

  const clear = useCallback(() => {
    stopPlayback();
    setItems([]);
    setOpenKey(null);
    setLive(null);
    void clearPlan().then((result) => result.error && toast.error(result.error));
  }, [stopPlayback]);

  const fileState = (_id: string): "ready" | "loading" | null => null;

  /** A background uploaded from the console joins the list (and the screens preload it). */
  const addBackground = useCallback((added: ProjectionBackground) => {
    setBackgrounds((current) => [...current.filter((item) => item.id !== added.id), added]);
  }, []);

  /** A deleted background leaves the list; if it was showing, the screens go black. */
  const removeBackground = useCallback((id: string) => {
    setBackgrounds((current) => current.filter((item) => item.id !== id));
    setBackgroundId((current) => (current === id ? null : current));
  }, []);

  return {
    isScreenMuted,
    setIsScreenMuted,
    timer,
    startTimer,
    pauseTimer,
    resumeTimer,
    hideTimer,
    presentQuick,
    presentPassage,
    sounds,
    addSound: (sound: SoundEntry) =>
      setSounds((current) => [...current.filter((item) => item.id !== sound.id), sound]),
    removeSound: (id: string) => setSounds((current) => current.filter((item) => item.id !== id)),
    addBackground,
    removeBackground,
    typography,
    setTypography,
    updateRef,
    setSongBackground,
    dropRef,
    items,
    openItem,
    openKey,
    setOpenKey,
    live,
    liveFrame,
    isCleared,
    toggleCleared: () => setIsCleared((value) => !value),
    backgrounds,
    backgroundId,
    setBackgroundId,
    playback,
    togglePlay,
    seek,
    toggleLoop,
    toggleCaptions,
    stopPlayback,
    presentSlide,
    presentMedia,
    toggleTrack,
    step,
    add,
    followVideo,
    remove,
    moveTo,
    clear,
    fileState,
  };
}

export type LiveConsole = ReturnType<typeof useLiveConsole>;

export function elapsedOf(playback: Playback, now: number): number {
  const elapsed = playback.playing
    ? playback.position + (now - playback.at) / 1000
    : playback.position;
  return playback.duration > 0 ? Math.min(elapsed, playback.duration) : elapsed;
}
