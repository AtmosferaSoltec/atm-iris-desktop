# 02 · Local data

## Goal

The base every feature stands on: the Iris home folder, the SQLite database with migrations, the repository layer, the
IPC contract with its typed bridge, the error model and the renderer's data client. One small real feature goes through
all of it end to end: church settings and projection settings.

## Depends on

00, 01 (a stub of the query client is enough).

## Reference

- [`platform.md`](../00-foundations/platform.md) §5, §6, §7, §8.
- Web: `src/server/repositories/types.ts` and `mock/*` (shapes and rules), `src/domain/models.ts`,
  `src/features/church/*`, `src/server/repositories/api/errors.ts` (`toFormState`, `errorMessage`),
  `src/lib/form-state.ts`, `src/lib/validation.ts`, `src/lib/zoned-time.ts`, `src/lib/format.ts`.

## Steps

1. **Iris home** (`src/main/files/iris-home.ts`). Resolve the root: `IRIS_HOME` env, else `homeDir` from
   `userData/config.json`, else `<home>/Iris`. Create the folders of `platform.md` §6.1; check the root is writable. If
   it cannot be created, show a Spanish dialog that says why and quit. Expose typed paths (`audioDir`, `videosDir`,
   `imagesDir`, `backgroundsDir`, `soundsDir`, `backupsDir`, `databasePath`). Add a safe `resolveInside(relativePath)`
   that rejects `..`, absolute paths and escapes (symlinks included) and is the only way to turn a stored path into a
   real one.
2. **SQLite adapter** (`src/main/db/sqlite.ts`): wraps `node:sqlite` `DatabaseSync` with `exec`, `prepare` (returning
   typed `get` / `all` / `run`), and `transaction(fn)` (BEGIN/COMMIT/ROLLBACK, nested via savepoints or refused).
   Applies the pragmas of `platform.md` §6.2. Nothing else imports `node:sqlite`. Keep its experimental warning out of
   the logs.
3. **Migrations** (`src/main/db/migrate.ts` + `migrations/0001-settings.sql`): numbered SQL files, applied in order in a
   transaction, `PRAGMA user_version` as the version. Before applying anything, copy `iris.db` to
   `Backups/pre-migration-<from>-to-<to>-<timestamp>.db`. Refuse a database newer than the app with a Spanish message.
   `0001` creates `church_settings` (singleton), `projection_settings` (singleton, defaults as the web) and
   `app_settings`.
4. **Repositories.** `src/main/repositories/types.ts` with one interface per aggregate (start with `SettingsRepository`),
   `sqlite/` implementations, row mappers (snake_case ↔ camelCase, 0/1 ↔ boolean), and a test helper
   `createTestDatabase()` (in-memory, all migrations applied).
5. **Services** (`src/main/services/settings.service.ts`): validates rules (church name 1–120 characters, time zone
   must be a valid IANA zone, projection ranges as the web's `ProjectionSettings` limits), returns models.
   Defaults on first run: church name "Mi iglesia", time zone from the OS (`Intl`), projection settings as in the web.
6. **IPC contract.** `src/shared/ipc/contract.ts` with a small `defineChannel(name, input, output)` helper and the
   first channels: `settings:get`, `settings:update-church`, `settings:update-projection`, `app:info` (version, Iris
   home path). `src/main/ipc/register.ts` registers handlers: sender check, zod validation, service call, the
   `{ ok, data } | { ok: false, error }` envelope. `src/preload/index.ts` builds `window.iris` from the contract; add the
   `window.iris` type declaration for the renderer.
7. **Errors.** `src/shared/errors.ts`: `AppError(code, message, fields?)` and the codes of `platform.md` §7; helpers
   `toFormErrors(error, fieldNames)` (the web's `toFormState` equivalent) and `errorMessage(error)`.
8. **Renderer data client.** `src/renderer/src/lib/ipc.ts` (calls `window.iris`, unwraps, throws `AppError`),
   `lib/query-client.ts` (30 s stale time, a `QueryCache`/`MutationCache` handler that shows the error `message` as a
   toast; a mutation with `meta: { handlesErrors: true }` opts out) and a query-key factory convention per feature.
9. **First real feature.** A temporary `#/settings` section "Iglesia" (name, time zone, with `time-zones.ts` from the
   web) that reads and saves through the whole stack. Phase 10 completes the page.
10. **Boot sequence** (`src/main/app/boot.ts`): resolve home → open database → migrate → register IPC → create windows.
    Any failure before the window shows a clear Spanish error and quits cleanly.

## Acceptance

- Unit tests: `resolveInside` (traversal, absolute, symlink escape), migrations (fresh database, upgrade, newer database
  refused, the pre-migration copy exists), settings repository and service rules, `AppError` mapping, IPC validation
  (bad input yields `VALIDATION_FAILED` with field errors).
- A compile-time check that `window.iris` types come from the contract (a wrong argument does not type-check).
- E2E: launching with a temp `IRIS_HOME` creates the folder tree and `Database/iris.db`; changing the church name in
  Settings survives a restart.
- `pnpm check && pnpm format:check && pnpm build && pnpm test:e2e` pass.

## Out of scope

Songs, media and the rest of the domain; they add their own migrations, repositories and channels in their phases.

## Deviations

None.

Verification: `pnpm check`, `pnpm format:check`, `pnpm build`, `pnpm test:e2e` pass (32 unit tests, 4 Electron tests). Tests cover migrations and pre-upgrade copies, rollback, newer-version refusal, path and symlink confinement, settings rules, error envelopes, sender rejection, and settings persistence across restart. TypeScript explicitly enables `noImplicitAny` (the toolkit preset disables it despite `strict`).
