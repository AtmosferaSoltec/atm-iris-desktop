# 05 · Console

## Goal

The main window, ported from the web console: toolbar, **Library**, **Service** (the plan), **Stage**, the live preview
and the drag-and-drop between them. The console computes the `ProjectionFrame` and shows it in the live preview; sending
it to a monitor is phase 06.

## Depends on

02, 03, 04.

## Reference (web project, read-only)

- `src/features/console/`: `components/live-console.tsx`, `console-top-bar.tsx`, `service-panel.tsx`, `workspace.tsx`,
  `slide-editor-dialog.tsx`, `file-status.tsx`; `library/*` (panel, toolbar, rows, tiles, `use-library.ts`,
  `entries.ts`, `entry-icons.ts`, dialogs, archived songs); `dnd.tsx`; `model.ts`; `load.ts` (rewrite);
  `use-live-console.ts`; `room-audio.ts`; `actions.ts` (rewrite).
- `src/features/service-plan/*` (rewrite the actions), `src/server/repositories/mock/data.ts` (`servicePlan` rules).
- `IRIS_SPEC.md` §6.2 (console), §6.4 (add to service), §7.1–7.6 (behaviour: "the list opens, the stage presents",
  what happens on present per content type, the TV frame, playback, editing the service), §12.4 (keyboard and mouse).
- Words used by the team: **Toolbar**, **Library**, **Service**, **Stage** ([`platform.md` §9](../00-foundations/platform.md)).

## Steps

1. **Migration `0004-service-plan.sql`**: `service_plan_items` (`kind` song | media | youtube, `ref_id`, `position`).
   Repository + service: list (with the referenced items resolved), add (rules from the mock: the target must exist;
   duplicates behave as the web), remove, move (reindex positions), clear. Deleting a song, asset or YouTube video also
   removes its plan items (in the service, in one transaction).
2. **`console:load`** (replaces `loadConsole`): one query returning what the console needs to open: the plan items as
   `ConsoleItem` (slides for songs; `file` with an `iris-media://asset/<id>` URL and duration for media and tracks;
   `youTubeId` for YouTube), the Library entries (songs, media, YouTube videos), backgrounds, projection settings,
   sounds. No signed URLs, so no URL-refresh timer. Invalidate it on `media:changed` and after each mutation.
3. **Layout** (`live-console.tsx`): toolbar on top; Library | Stage | Service as in the web; live preview and block
   timer placement as the web has them. Window layout rules from `IRIS_SPEC.md` §12.1. Keep the minimum size usable.
4. **Toolbar** (`console-top-bar.tsx`): port with what exists in this phase: the Tools menu button (the menu content is
   phase 07), the Background picker (phase 06) and a **"Proyectar"** button (phase 06) as visible placeholders in their
   final positions; remove the account menu, the Bible button and the "Pantallas" TV dialog. Order from the web:
   Tools, Background, Project (right side).
5. **Library panel.** Songs, media and YouTube videos in the list/grid, search and filters in the URL, archived songs,
   "Nueva canción" / import dialogs, row context menu, double click or drag to add. Port `use-library.ts` and
   `entries.ts` (the icon rules for lyrics-only, lyrics-with-track, track-only, image, video, YouTube; the music icon for
   uploaded audio and the YouTube icon).
6. **Service panel.** The plan list with drag to reorder (`@dnd-kit`), remove, clear (with confirmation), counts, the
   open item highlighted, the running/selected item marks. The block timer bar is phase 08; leave its slot.
7. **Stage.** Slide grid for songs (click presents), media stage for images and videos, the slide editor dialog
   (edit one slide, split into several), empty hint. "Opening never changes the projection; clicking a card does."
8. **Live state** (`use-live-console.ts`, adapted): live position (`key` + `slide`), `isCleared` (B key), the
   `liveFrame` computed from live item + background + typography, playback state for videos and tracks. **Remove**
   everything about remote displays, preload lists, channels, quick Bible passage and signed URL refresh. Audio of
   tracks and sounds plays through `room-audio.ts` (an `HTMLAudioElement` in the console, default output device).
9. **Keyboard and mouse** as the web and spec §12.4 (arrows to step slides, `B` to clear, double click, right click
   menus). Keep shortcuts working only when no dialog or text field has focus.
10. **Selecting the open item** is local UI state (it is not persisted); the plan is.

## Acceptance

- Add a song, an image and a video to the service by double click and by drag; reorder; remove; clear; a restart keeps
  the plan.
- Clicking a slide changes the live preview; `B` clears and restores; stepping with the arrows works across items as in
  the web.
- Deleting a song that is in the plan removes it from the plan.
- Unit tests: plan service rules (add, move, reindex, clear, cascade on delete), `entries.ts` icon rules, frame
  computation for song/image/video/cleared.
- E2E: the flows above through the real UI.
- `pnpm check && pnpm format:check && pnpm build && pnpm test:e2e` pass.

## Out of scope

Monitors and projection windows (06), Tools menu content (07), block timer (08), YouTube playback (09).

## Deviations

- Ported the offline `ProjectionCanvas` while building the Stage/live preview (a phase 06 prerequisite). YouTube playback remains deferred to phase 09.
- Media double-click presents directly without adding a plan item, matching the web's `LibraryTile` behavior. Drag and the accessible add action add media to the plan; this conservatively follows the source where the acceptance wording says double-click adds every kind.
- The controller hooks keep inferred return types as their public contracts. Synchronization from query data uses guarded state updates during rendering, preserving local selection and satisfying React Compiler rules.

Verification: `pnpm check`, `pnpm format:check`, `pnpm build`, `pnpm test:e2e` pass (70 unit tests, 12 Electron tests). Tests cover plan rules and cascades, frame computation, double-click/drag, keyboard reorder, opening vs presenting, clear/restore, slide stepping, removal, clear, persistence after restart and deleting an in-plan song.
