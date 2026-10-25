# 06 · Projection

## Goal

The reason this app exists: the console drives a **real second monitor over HDMI** with no network in between.
Monitors, projection windows, frame distribution, backgrounds, black/clear, and in-sync video playback, all local.

## Depends on

03, 05.

## Reference (web project, read-only)

- `src/features/projection/`: `model.ts` (`ProjectionFrame`, content kinds, typography, `lyricSizes`, `fontStack`),
  `components/projection-canvas.tsx` (the shared canvas: layers, fades, `Lyrics`, `Video`, `YouTubeVideo`, timer),
  `fonts.ts`, `youtube-api.ts`. **Do not port:** `channel.ts`, `file-cache.ts`, `file-store.ts`,
  `file-resolver.tsx`, the remote/BroadcastChannel sources in `components/screen-view.tsx`.
- `src/features/console/backgrounds/*` (picker, swatch, song background), `src/features/console/components/displays-dialog.tsx`
  (the old TV dialog: only for the look of the new picker), `use-live-console.ts` (frame, playback timeline, `followVideo`).
- `IRIS_SPEC.md` §5.12 (`ProjectionCanvas`), §6.5 (backgrounds), §7.2–7.4 (what presenting does, the frame, playback),
  §12.6 (second monitor), §12.8.

## Steps

1. **Port the model and the canvas** to `shared/domain/projection.ts` (types, `rebaseFrame` is not needed) and
   `renderer/src/components/projection/projection-canvas.tsx`. Files come from `iris-media://asset/<id>` directly:
   remove every `resolve`/cache indirection. Keep the cross-fade between backgrounds and the "content goes out, then in"
   timing. A frame's media is addressed by asset id; the canvas builds the URL.
2. **Monitors** (`src/main/windows/monitors.ts`). List monitors from Electron's `screen` (id, label, bounds, scale,
   `isPrimary`, `isInternal`) and emit `monitors:changed` on add/remove/metrics change. Channels: `monitors:list`.
   Make the service depend on a small interface (not on `electron` directly) so it can be unit-tested with a fake.
3. **Projection manager** (`src/main/windows/projection.ts`). `projection:start({ monitorId })` opens a frameless,
   full-screen `BrowserWindow` on that monitor's bounds, loading the renderer at `#/display`, black background, cursor
   hidden, not focusable by accident; `projection:stop`; status and events (`projection:status`: running, monitor,
   window mode). Behaviour:
   - If there is **no second monitor**, offer a resizable window ("Ventana de vista previa") so the app can be used and
     tested on one screen. Never project fullscreen over the console's own monitor without the user choosing it.
   - If the chosen monitor disappears (cable pulled), close the window, set the status and tell the console; if it
     comes back, offer to resume (setting: resume automatically, default off).
   - Remember the last monitor (by id + bounds) in `app_settings`.
   - `powerSaveBlocker` (`prevent-display-sleep`) while projecting (the web's wake lock).
4. **Frame distribution.** The console renderer sends frames with `projection:push-frame`; main keeps the latest and
   forwards it to every projection window; a window that loads asks for the current frame (`projection:request-frame`).
   Frames are cheap (ids and numbers, not bytes). Do not throttle in a way that makes held arrow keys lag; coalesce to
   the latest frame.
5. **Projection renderer** (`#/display`): draws the received frame with `ProjectionCanvas` (`transitions`, `playsVideo`),
   black when there is none, no controls, no shell.
6. **Playback sync.** Same model as the web: `{ playing, position, at }` is the source of truth in the console
   timeline; the projection `<video>` follows it with drift correction (port the web's `Video` logic) and reports
   `projection:video-time` (main → console) so the console learns the real duration, the end (loop or stop) and the
   current time. Clocks are the same machine's, so no rebase.
7. **Sound.** Backgrounds are always muted. A local **video content** item plays **with sound in the projection
   window** (HDMI audio goes to the monitor/TV); the console preview is muted. A toggle "Silenciar en pantalla" lives in
   the playback bar. Track audio (songs) keeps playing in the console (room audio). Record the output-device caveat
   (Windows chooses it) in `docs/manual-tests.md`.
8. **Backgrounds.** Port the picker (black + the library's backgrounds + "Agregar fondo" using the phase 03 import with
   role `background`), `song-background-field`, the rule "a song with its own background puts it up when presented,
   once per song, without forcing it afterwards", and the default background from `projection_settings`
   (`projection:set-default-background`). A missing background file falls back to black with a notice, never a crash.
9. **"Proyectar" UI** (toolbar): a button that opens a popover with the monitor list (label, resolution, "Principal"),
   the preview-window option, "Iniciar proyección" / "Detener proyección", and a live indicator in the toolbar while
   projecting (`IrisLiveIndicator`). Keyboard: a shortcut to start/stop. Spanish copy in `messages.ts`; follow the look of
   the web's old displays dialog.
10. **`docs/manual-tests.md`** (new): the checklist that needs real hardware: second monitor over HDMI, start/stop,
    unplug the cable during projection, replug, video with sound through HDMI, background video looping smoothly for
    ten minutes, the console on the primary monitor staying usable, high-DPI scaling. Later phases append to it.

## Acceptance

- Unit tests: monitor service with a fake `screen` (add, remove, remember), projection manager state machine (start,
  stop, monitor lost, monitor back, single-monitor fallback), frame coalescing, drift correction, background rules
  (own background applied once per song).
- E2E (single monitor, so the preview window): start the projection, click a slide in the console, the projection
  window shows the text; clear with `B`; change background; play a video and see its time reported; stop.
- On a real second monitor: the manual checklist in `docs/manual-tests.md` passes (record the result, or list it as not
  verified in the final report).
- `pnpm check && pnpm format:check && pnpm build && pnpm test:e2e` pass.

## Out of scope

Typography dialog, timer and sounds (07), YouTube playback in the canvas (09), audio output device selection.

## Deviations

- The offline canvas/model were introduced as Stage/editor prerequisites in phases 04–05 and completed here. Frame distribution uses typed IPC and microtask coalescing, with no remote channel or file cache.
- Video frames carry an optional `muted` flag for “Silenciar en pantalla”. Local video audio is enabled only in the projection renderer; the console preview stays muted.
- Hardware-dependent acceptance is documented as pending in `docs/manual-tests.md`; this environment verifies the resizable preview output only.

Verification: unit tests cover monitor fallback/loss/return, remembered selection, frame coalescing, stale close events, drift decisions and own-background application. Electron preview tests cover text, clear/restore, backgrounds, stop, video time reports and independent muting. HDMI, real Windows audio routing, high DPI and prolonged video looping are not verified.

Final automated gates pass: 75 unit tests and 14 Electron E2E tests.
