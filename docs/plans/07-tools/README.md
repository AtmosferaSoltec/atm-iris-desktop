# 07 · Tools

## Goal

The **Tools** menu of the toolbar and the three tools behind it, ported from the web: **Texto** (typography),
**Temporizador** (a countdown on the projection) and **Sonidos** (the church's own sound effects). The menu is built so
adding a fourth tool is one list entry.

## Depends on

05, 06.

## Reference (web project, read-only)

- `src/features/console/tools/tools-button.tsx` (the card grid popover; the `TOOLS` list with `panel` vs `dialog` tools).
- `src/features/console/typography/*` (`typography-dialog.tsx`, `schemas.ts`, `actions.ts`),
  `src/domain/projection-fonts.ts`, `ProjectionSettings` in `domain/models.ts`.
- `src/features/console/timer/timer-panel.tsx`, the `timer` content kind and `timerRemaining` in
  `features/projection/model.ts`, the timer branch of `use-live-console.ts` (`startTimer`, `pauseTimer`, `resumeTimer`,
  `hideTimer`) and `Countdown` in `projection-canvas.tsx`.
- `src/features/console/sounds/*` (`sounds-panel.tsx`, `add-sound-dialog.tsx`, `sound-icons.ts`, `play-sound.ts`).
- `e2e/console.spec.ts` («Texto»), `e2e/console-timer.spec.ts` (not the same thing: that one is the block timer).

## Steps

1. **Tools menu.** Port `tools-button.tsx`: a pill button "Herramientas" in the toolbar (left of Background; border and
   background like the other toolbar pills, no accent color), opening a popover with a **3-column grid of small cards**
   (icon above, name below, `rounded-sm`, icon 18 px). Tools are declared in one `TOOLS` list; a tool is either a
   `panel` (opens inside the same popover, with a back arrow) or a `dialog` (closes the popover and opens a modal).
2. **Texto** (`dialog`). Typeface, size, bold, italic, uppercase, with a live preview that uses the background in use
   and the slide on screen; "Aplicar" updates the projection at once and saves to `projection_settings`
   (`settings:update-projection`, phase 02). Typefaces come from the offline fonts of phase 01.
3. **Temporizador** (`panel`). Presets (30 s, 1, 2, 5, 10 min), custom minutes and seconds (max 99:59), an optional text
   shown above the digits ("Empezamos en…", 60 characters), start, pause, resume, remove. While one is on the
   projection the Tools button gets a subtle tint to say so. The timer is a **frame content kind**
   `{ kind: "timer", seconds, running, at, label? }`; the projection computes the remaining time itself from `at`, so
   only start/pause/remove produce a new frame. "Negro" (clear) wins over the timer. Port `timerRemaining` and its unit
   tests.
4. **Sonidos** (`panel`). The church's sound effects: `media_assets` with `role = sound` and a `sound_icon` (one of the
   14 icons in `sound-icons.ts`). **No built-in sounds**: with none, show "No tienes ningún sonido." and a **+** button
   that opens "Agregar sonido" (choose an audio file, a name, an icon) using the phase 03 import with role `sound`
   (folder `Sounds/`). A click on a sound plays it from the start in the console (default output device); no preload
   cache is needed, the files are local. Hover shows a delete (trash) with confirmation (moves the file to the Recycle
   Bin, phase 03). Sounds are kept out of the song-track pickers.
5. **IPC:** `sounds:list` (a filter on media), reuse `media:import` / `media:delete`; the timer lives entirely in the
   renderer plus the frame; no new persistence.

## Acceptance

- Unit tests: `timerRemaining`, timer reducer (start, pause, resume, hide, reach zero), the `TOOLS` list rendering rule
  (panel vs dialog), sound entry mapping.
- E2E: change the typography and see the projection window change and persist after a restart; start a 30 s timer with a
  text and see it on the projection, pause and remove it; add a sound from a fixture audio file, play it, delete it.
- Manual (append to `docs/manual-tests.md`): sound effects audible through the speakers.
- `pnpm check && pnpm format:check && pnpm build && pnpm test:e2e` pass.

## Out of scope

Choosing the audio output device; built-in sounds.

## Deviations

- Replaced signed-URL/preload sound caching with local `iris-media://` playback handles. A repeated trigger restarts that sound; no built-in sounds or downloads are added.
- Added a pure countdown reducer for start/pause/resume/hide and range limits. Sound icon keys are validated in the shared media schema; labels live in the console messages module.

Verification: unit tests cover countdown transitions and zero, all fourteen sound keys/fallback mapping, and exactly one panel/dialog mode per tool. Targeted Electron tests pass for live typography plus restart persistence, countdown pause/removal, and local sound import/play/delete with a temporary trash adapter. Audible speaker output and the Windows Recycle Bin remain manual checks.

Final automated gates pass: 78 unit tests and 16 Electron E2E tests.
