# 03 · Media library

## Goal

Manage the user's images, videos, audio tracks, backgrounds and sound effects as real files in the Iris folders,
registered in the database, and serve them to the renderers safely. The web uploaded files to cloud storage; here the
"upload" is **copy into the Iris folder**, and a **scan** also picks up files the user dropped in by hand.

## Depends on

2.

## Reference (web project, read-only)

- `src/domain/media-rules.ts` (kinds, accepted types, size limits, **background rules**, `mediaSection`, messages) and
  its test.
- `src/features/media/*`: `media-format.ts`, `schemas.ts`, `upload/measure.ts`, `upload/use-media-upload.ts`,
  `components/upload-queue.tsx`, `components/media-detail-dialog.tsx`, `actions.ts` (rewrite).
- `src/features/console/library/media-dialog.tsx`, `src/server/repositories/mock/data.ts` (the `media` repository: the
  readable rules).
- `docs/api-contract.md` §11 (kinds, rules, backgrounds) in the web repo.

## Steps

1. **Migration `0002-media.sql`**: `media_assets` as in `platform.md` §6.3 (`id`, `kind`, `role`, `title`,
   `description`, `file_name`, `relative_path` UNIQUE, `content_type`, `size_bytes`, `duration_seconds`, `width`,
   `height`, `sound_icon`, `is_missing`, timestamps). Repository + service. The service returns the **web's
   `MediaAsset` shape** (`isBackground`, `soundIcon`, …) so the ported components barely change.
2. **Rules** → `src/shared/domain/media-rules.ts`: port with its test. Keep the accepted content types and the
   background rules (image ≤ 15 MB, video ≤ 200 MB and ≤ 30 s: they exist so TV playback stays smooth). Drop the cloud
   storage quota. Keep a sane upper size per kind as a named constant (a 4 GB video is a mistake, not a use case).
3. **Where a file goes** (decided by `role` + `kind`): background → `Backgrounds/`; track → `Audio/`; sound →
   `Sounds/`; library video → `Videos/`; library image → `Images/`.
4. **Import** (`media:import`). Two entry points: a native file picker run by main (`dialog.showOpenDialog`) and
   drag-and-drop from the renderer (use `webUtils.getPathForFile` in the preload; the renderer never sees paths
   otherwise). Main validates type and size, **copies** the file into the right folder with a collision-safe name
   (`name.ext`, `name (2).ext`…), registers the row, and sends progress events (`media:import-progress`) for large
   files. Never move or modify the source.
5. **Measures.** Duration (audio, video) and width/height (image, video) are measured in the renderer exactly like the
   web's `measure.ts` (it can already read local files through `iris-media://`), then saved with `media:set-measures`.
   An asset without measures is flagged and measured on next open. Background rules need the measures, so a background
   import is validated after measuring and rolled back (file removed) if it fails.
6. **`iris-media://` protocol** (`src/main/files/protocol.ts`). Register the scheme as privileged _before_ app ready
   (`standard`, `secure`, `supportFetchAPI`, `stream`). `iris-media://asset/<id>` resolves the id through the database
   and `resolveInside`, honours HTTP `Range` (video seeking), sets the right `Content-Type`, answers 404 for unknown or
   missing assets and never serves a path that is not a registered asset. Test the path rules and the Range answer.
7. **Scan** (`media:scan`). Walk the five folders; register unknown supported files by relative path (title from the
   file name; role from the folder), flag rows whose file vanished as `is_missing` (and clear the flag when it returns).
   Ignore dotfiles, partial copies and unsupported extensions. Runs at startup, when the window regains focus
   (debounced) and on demand. It is idempotent. Emit `media:changed` when something changed.
8. **Operations.** Rename (title only; the file keeps its name), change role where it makes sense (library image ↔
   background, with the background rules), delete (**moves the file to the Recycle Bin** with `shell.trashItem`, then
   removes the row; confirm in the UI), `media:reveal` (`shell.showItemInFolder`), open the Iris folder.
9. **Disk usage.** `storage:usage`: bytes per role/folder from the database plus the free space of the drive
   (`fs.statfs`). Replaces the web's quota breakdown.
10. **UI.** Port the import queue (progress, cancel not needed for copies, errors in Spanish), the media detail dialog
    and the media library dialog (`media-dialog.tsx`). Show a "missing file" state on an asset whose file is gone, with
    "Quitar" and "Buscar en la carpeta" actions. Empty states in Spanish. The Library panel itself is phase 05.

## Acceptance

- Unit tests: import naming collisions, destination folder by role/kind, rejected types/sizes, background rules,
  scan (register, vanish, return, idempotent, ignored files), `resolveInside` use in the protocol (traversal rejected),
  Range answers.
- Importing a video and an image through the app copies them into `Videos/` and `Images/`; a file dropped in `Audio/`
  by hand appears after a scan; deleting a file from disk marks it missing; deleting from the app sends it to the
  Recycle Bin.
- A `<video>` served by `iris-media://` can be seeked.
- E2E: import a fixture image and see it listed; scan picks up a file added to the folder.
- `pnpm check && pnpm format:check && pnpm build && pnpm test:e2e` pass.

## Out of scope

The console's Library panel (05), backgrounds picker (06), sounds UI (07), song tracks (04).

## Deviations

- Subsequent user decision in phase 13: the active image/video Library reads the Images/Videos folders and has folder/refresh controls instead of upload/drop-copy controls. Binary media remains on disk; SQLite remains a metadata index.

- Added `media_assets.is_import_pending` so rejecting an imported background removes only its new copy; files found by scanning are never removed on a metadata validation failure.
- Import queue copy uses “Importaciones” / “Importando” for local copies. The temporary console entry opens the media dialogs until the console Library is ported in phase 05.

Verification: `pnpm check`, `pnpm format:check`, `pnpm build`, `pnpm test:e2e` pass (42 unit tests, 7 Electron tests). Electron tests import and preview a PNG, detect an added/missing file, and seek an MP4 generated locally through `iris-media://`. The development gallery and dialog interactions also pass. Windows Recycle Bin behavior remains a manual check.
