# 10 · Settings and maintenance

## Goal

The `#/settings` page without accounts: church name and time zone, storage, backups and "start over". Plus automatic
safety for the database.

## Depends on

02, 03, 04, 09.

## Reference (web project, read-only)

- `src/app/(app)/settings/page.tsx` (the order and copy of the panels), `src/features/church/*` (`church-form`,
  `storage-usage`), `src/features/backup/*` (`backup-panel`, `erase-panel`, `schemas.ts`), `src/lib/time-zones.ts`.
- `src/server/repositories/mock/data.ts` (`backup` repository: export/import/erase rules).
- **Do not port:** `features/account/*` (profile, password, devices, delete account), the team and modules panels.

## Steps

1. **Page.** `#/settings` inside `AppLayout`, panels in the web's order with the same titles and descriptions where they
   still apply: **Iglesia** (name, time zone: from phase 02), **Almacenamiento**, **Respaldo**, **Empezar de cero**,
   and a new **Acerca de** (app version, Iris home path, "Abrir carpeta de Iris", "Abrir carpeta de registros").
2. **Almacenamiento.** The phase 03 disk usage by folder (audio, videos, images, backgrounds, sounds, database) and the
   free space; the list of **unused files** (assets no song/plan/background/sound refers to, e.g. an orphan track after
   deleting a song) with "Quitar" (Recycle Bin). Show missing files with the actions of phase 03.
3. **Respaldo (export/import).** As the web: export songs (lyrics, YouTube links, section data, per-song settings that
   do not depend on files) and saved YouTube videos to a JSON file; import it, skipping what is already there
   ("Se importaron N canciones…"). A wrong file says "Ese archivo no es un respaldo de Iris." Port `schemas.ts` for the
   backup file. The backup file format must stay **readable by the web project's importer** if it is the same shape.
4. **Database snapshots.** Automatic: at most one snapshot per day, on startup, using SQLite `VACUUM INTO` to
   `Backups/iris-<yyyy-mm-dd>.db`, keeping the last 7. Manual: "Crear respaldo ahora" button in Respaldo. Restoring is a
   documented manual step (replace `iris.db` with a snapshot while the app is closed) written in the panel's help text;
   a restore UI is not part of this phase.
5. **Empezar de cero.** As the web: choose songs / media / YouTube links, confirm by typing `ELIMINAR`, delete in one go
   (media files go to the Recycle Bin), report the counts. Deleting media also removes the plan items that referenced
   it.
6. **Window preferences** persisted in `app_settings` where the web had them (e.g. last console window size and
   position). Keep this small.

## Acceptance

- Unit tests: backup export/import (round trip, duplicates skipped, wrong file), erase (counts, plan cleanup, files to
  trash), snapshot rotation (keeps 7, one per day), unused-files detection.
- E2E: export a backup and import it back (nothing duplicated); erase songs with the typed confirmation; the snapshot file
  appears in `Backups/`.
- No profile, password, device or account UI anywhere.
- `pnpm check && pnpm format:check && pnpm build && pnpm test:e2e` pass.

## Out of scope

A restore wizard, cloud backups, changing the Iris home location from the UI (show the path only).

## Deviations

- JSON export/import uses native file dialogs in main rather than browser downloads or renderer file reads. The JSON fields remain compatible with the web importer; all entries are validated before an atomic database import, with normalized duplicates skipped. Audio-only songs remain in the JSON and are counted as `withoutLyrics` when importing, matching the web rules.
- Automatic snapshots use the church day and persist the last successful day. Manual snapshots add a timestamp so they capture current data without overwriting the daily copy; the latest seven daily/manual snapshots are retained. Pre-migration safety copies are separate.
- Local storage replaces the web account quota with actual folder sizes and disk free space. Background/sound roles count as references; library files and orphan tracks with no references can be sent to the trash after confirmation. Missing records can be removed without touching a missing file.
- Console bounds and maximized state are restored only if the title bar remains reachable on a current monitor.

Verification: 114 unit tests and 19 Electron E2E tests pass, together with lint, strict type checks, formatting and production builds. Maintenance E2E exports/reimports without duplicates, creates a manual snapshot, erases with the typed word, restores JSON content and rejects a wrong file. Native dialogs are redirected to the temporary test home; the real Iris home is never used.
