# Iris Desktop · platform decisions

> Product, architecture and conventions shared by every phase. If a phase seems to contradict this document, this
> document wins; ask the user before changing it.

---

## 1. Product

**Iris** projects songs, images and videos on the church screen and times each block of the service. This repo is the
**desktop app**: one Windows PC, one operator, a second monitor or projector connected by HDMI.

| Included                                                                                        | Not included (kept out on purpose)                     |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Songs with lyrics (sections), a track (local audio **or** YouTube link) and optional background | Sign-in, accounts, teams, roles, modules               |
| Media library: images, videos, backgrounds, audio tracks, sound effects, in the Iris folder     | Any backend, sync, cloud storage, upload quota         |
| Service plan (the live list), console with Library · Service · Stage · live preview             | The Bible (removed from scope by the user, 2026-10-24) |
| Projection to a chosen monitor, backgrounds, black/clear, video and YouTube playback            | Linking TVs by code, projecting through a TV browser   |
| Typography settings, countdown timer, sound effects, the Tools menu                             | Cloud backups, auto-update server, store delivery      |
| Service timing: people, service types, block timer, records, summaries                          | iPad companion (kept in mind only: see `ideas.md`)     |
| Settings: church name and time zone, storage, backups, start over                               |                                                        |

Everything runs **offline** except YouTube (embedded player + oEmbed check). Lyrics are entered manually (subsequent user decision; see phase 04 deviations).

---

## 2. Principles

1. **Same app as the web console, local.** Port design, components and behaviour; do not redesign.
2. **Professional, scalable, clean.** Small modules, clear boundaries, typed contracts, tests next to the logic.
3. **The renderer is a browser, nothing more.** All files, SQL, windows and OS access live in the main process.
4. **User files are the user's.** Never delete a user file without moving it to the Recycle Bin, never rewrite one, never
   store an absolute path.
5. **The service must not fail.** A missing file, a disconnected monitor or no internet degrade one feature and say so
   in Spanish; they never crash the app.
6. **Keep the door open** for an iPad companion and a future backend without building either (see §11).

---

## 3. Architecture

```
┌────────────────────────── Electron app (one PC) ──────────────────────────┐
│                                                                           │
│  Console window                         Projection window(s)              │
│  renderer: React (hash route /)          renderer: React (hash /display)  │
│        │  window.iris (typed)                  ▲  frames, playback state  │
│        ▼                                       │                          │
│  ───────────── preload (contextBridge, no Node in renderers) ──────────── │
│        │ IPC invoke / events                    │                         │
│        ▼                                        │                         │
│  Main process                                                             │
│   ipc handlers (zod) → services (rules) → repositories (SQL, node:sqlite) │
│   windows & monitors · iris-media:// protocol · file scan/import          │
│        │                                 │                                │
│        ▼                                 ▼                                │
│   Iris/Database/iris.db           Iris/Audio · Videos · Images · …        │
└───────────────────────────────────────────────────────────────────────────┘
        Network: only YouTube (embed, oEmbed)
```

- **Main** (`src/main`): app lifecycle, windows, monitors, database, files, protocol, services. Node and Electron APIs.
- **Preload** (`src/preload`): builds `window.iris` from the shared contract. No logic.
- **Renderer** (`src/renderer/src`): React UI, TanStack Query for data, Zustand for local UI state. No Node.
- **Shared** (`src/shared`): pure TypeScript used by all three: domain models, zod schemas, the IPC contract, errors,
  pure helpers (lyrics parsing, formatting, zoned time, time statistics). No Electron, no Node-only APIs, no DOM.

One renderer bundle serves both windows; the route decides what is drawn (`#/` console, `#/display` projection).

---

## 4. Stack

| Concern          | Decision                                                                                                    |
| ---------------- | ----------------------------------------------------------------------------------------------------------- |
| Shell            | **Electron 44** (Node 24, Chromium; H.264/AAC playback built in)                                            |
| Build            | **electron-vite 6** (already scaffolded), **Vite 8**, TypeScript strict                                     |
| UI               | **React 19** with **React Compiler**, **Tailwind CSS 4** (`@tailwindcss/vite`), **radix-ui** primitives     |
| Icons, toasts    | **lucide-react**, **sonner** (restyled), as in the web project                                              |
| Drag and drop    | **@dnd-kit** (core, sortable, utilities), as in the web project                                             |
| Routing          | **react-router** with `createHashRouter` (the app loads from disk, not from a server)                       |
| Data in renderer | **TanStack Query 5** over the IPC client (cache, invalidation, loading states); **Zustand** for local state |
| Forms            | **react-hook-form** + `@hookform/resolvers/zod`; the zod schema is shared with the IPC handler              |
| Validation       | **zod 4** everywhere                                                                                        |
| Database         | **SQLite via `node:sqlite`** (built into Electron's Node; no native module; FTS5 available)                 |
| Tests            | **Vitest** (unit, node environment) · **Playwright** with `_electron` (UI)                                  |
| Lint, format     | ESLint (electron-toolkit config + boundary rules) · Prettier (same options as the web project)              |
| Packaging        | **electron-builder** (Windows). Updater plugin installed but **disabled** until a release feed exists       |
| Package manager  | **pnpm 11**                                                                                                 |

**Why these differ from the web project.** The web used Next.js, so it loaded data in Server Components, mutated with
Server Actions and kept filters with `nuqs`. In Electron there is no server: the equivalent of a Server Action is an
IPC handler in main, the equivalent of loading data in a server component is a TanStack Query call over IPC, forms use
react-hook-form (the house standard in `../../../../forma-de-trabajo.md` §4.5) and filters live in router search params.
Everything else (Radix primitives, tokens, lucide, sonner, dnd-kit, zod) is the same.

**`node:sqlite`.** Verified on this repo's Electron (44.9.3): Node 24.22, SQLite 3.53, FTS5 available, foreign keys on by
default. It is marked experimental in Node 24, so it is **only imported in `src/main/db/sqlite.ts`** (a thin adapter:
`exec`, `prepare`, `transaction`). If it ever has to change (for `better-sqlite3`, say) it is a one-file change. Make
sure its experimental warning does not pollute the logs.

---

## 5. Folder structure

```
atm-iris-desktop/
├── AGENTS.md · CLAUDE.md · README.md
├── docs/plans/                    these plans
├── e2e/                           Playwright (Electron) tests and helpers
├── resources/                     icons and static assets shipped with the app
├── src/
│   ├── main/
│   │   ├── index.ts               bootstrap only
│   │   ├── env.ts                 the ONLY place that reads process.env
│   │   ├── app/                   lifecycle, single instance, logging, crash handling
│   │   ├── windows/               console window, projection manager, monitors
│   │   ├── db/                    sqlite.ts adapter, connection, migrations/ (0001-*.sql…)
│   │   ├── files/                 iris-home, scanner, importer, protocol (iris-media://), disk usage
│   │   ├── repositories/          types.ts (interfaces) + sqlite/ (implementations)
│   │   ├── services/              business rules (songs, media, plan, timing, backup…)
│   │   └── ipc/                   register.ts + one handlers file per area
│   ├── preload/
│   │   └── index.ts               window.iris from the contract
│   ├── shared/
│   │   ├── ipc/contract.ts        channels: name, input schema, output type; events
│   │   ├── schemas/               zod schemas per feature (used by main and renderer)
│   │   ├── domain/                models, media rules, projection fonts, time statistics, next service
│   │   ├── lib/                   pure helpers: lyrics, lyrics-import, text, format, zoned-time, youtube
│   │   ├── errors.ts              AppError, error codes
│   │   └── id.ts                  UUID v7
│   └── renderer/
│       ├── index.html
│       └── src/
│           ├── main.tsx · app.tsx · router.tsx
│           ├── styles/globals.css           design tokens (ported verbatim)
│           ├── components/{ui,brand,service,projection}/
│           ├── features/<feature>/          components, hooks, messages.ts, schemas if renderer-only
│           └── lib/                         ipc client, query client, search-params, cn
```

Path aliases: `@shared/*` (all three), `@renderer/*` (renderer), `@main/*` (main). ESLint forbids: renderer importing
`electron`, `node:*` or `@main`; main importing `@renderer`; shared importing from either, or `electron` / `node:*`.

---

## 6. Data and files

### 6.1 The Iris home

Default root: `<user home>/Iris` (for example `C:\Users\<name>\Iris`). It is **outside** Documents on purpose: Windows
often syncs Documents to OneDrive, which can corrupt a live database. The root can be overridden by the `IRIS_HOME`
environment variable (tests) or by `homeDir` in `userData/config.json` (the only setting needed before the database
opens). Created on first run:

```
Iris/
├── Audio/        song tracks (mp3, m4a, aac, wav)
├── Videos/       videos used in services
├── Images/       images used in services
├── Backgrounds/  images and videos used behind lyrics
├── Sounds/       sound effects
├── Backups/      database snapshots and exports
└── Database/     iris.db
```

The user can drop files into these folders by hand; a scan registers them (phase 03).

### 6.2 Database conventions

- Tables `snake_case` plural, columns `snake_case`, ids **UUID v7** text (`src/shared/id.ts`), timestamps UTC ISO text
  (`created_at`, `updated_at`), booleans as 0/1 integers mapped to `boolean` in the repository.
- `PRAGMA foreign_keys = ON`, `journal_mode = DELETE` (one file; a snapshot or a copy of `iris.db` is always whole),
  `synchronous = FULL`, a `busy_timeout`.
- Migrations: numbered SQL files in `src/main/db/migrations`, applied in order inside a transaction, tracked with
  `PRAGMA user_version`. A database **newer** than the app is refused with a clear message. A copy of the database is
  saved in `Backups/` before any migration runs.
- Deletes are **hard** deletes. Records that name a person or a service type keep the name (denormalized) so deleting
  the person or the type does not break history.
- Repository rows are mapped to the **same shapes as the web models** (`src/domain/models.ts` in the web project:
  `Song`, `SongSection`, `SongSummary`, `MediaAsset`, `YoutubeVideo`, `ServicePlanItem`, `Person`, `ServiceType`,
  `BlockTemplate`, `ServiceRecord`, `BlockRecord`, `ProjectionSettings`) minus anything about sessions, churches as
  tenants, uploads, displays and the Bible. Same names and fields means the ported components change as little as
  possible and a later sync stays possible.

### 6.3 Target tables (each phase owns its migration)

| Table                 | Phase | Key columns                                                                                                                                                                                           |
| --------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `church_settings`     | 02    | singleton: `name`, `timezone`                                                                                                                                                                         |
| `projection_settings` | 02    | singleton: `font_family`, `font_size_pt`, `font_bold`, `font_italic`, `uppercase`, `default_background_id`                                                                                            |
| `app_settings`        | 02    | `key`, `value` (JSON text): selected monitor, selected service type, small UI preferences                                                                                                             |
| `media_assets`        | 03    | `kind` (image/video/audio), `role` (library/background/track/sound), `title`, `relative_path` unique, `content_type`, `size_bytes`, `duration_seconds`, `width`, `height`, `sound_icon`, `is_missing` |
| `songs`               | 04    | `title`, `author`, `audio_id` → media (SET NULL), `youtube_id`, `background_id` → media (SET NULL), `search_text`, `last_used_at`, `archived_at`                                                      |
| `song_sections`       | 04    | `song_id`, `position`, `label`, `text`                                                                                                                                                                |
| `youtube_videos`      | 09    | `video_id` unique, `title`, `author`                                                                                                                                                                  |
| `service_plan_items`  | 05    | `kind` (song/media/youtube), `ref_id`, `position`                                                                                                                                                     |
| `people`              | 08    | `name`, `name_key` unique                                                                                                                                                                             |
| `service_types`       | 08    | `name`, `name_key` unique, `color`, `schedule_*` nullable                                                                                                                                             |
| `block_templates`     | 08    | `service_type_id`, `position`, `name`, `planned_minutes`                                                                                                                                              |
| `service_records`     | 08    | `service_type_id` (SET NULL), `service_type_name`, `status`, `date`                                                                                                                                   |
| `block_records`       | 08    | `service_record_id`, `position`, planned/actual seconds, `person_id` (SET NULL), `person_name`, `status`, `started_at`, `ended_at`                                                                    |

`media_assets.role` maps to the web fields: `background` ⇔ `isBackground`, `sound` ⇔ `soundIcon != null`, `track` ⇔ the
audio of a song. The web's `MediaAsset` shape is still produced for the UI.

---

## 7. IPC contract

- `src/shared/ipc/contract.ts` lists every channel once: `name` (`<area>:<action>`, e.g. `songs:list`), the zod
  **input schema** and the **output type**. Events from main to renderer (`media:changed`, `projection:status`, …) are
  listed the same way.
- **Main** registers handlers from the contract (`src/main/ipc/register.ts`): it checks the sender is one of the app's
  own windows, validates input with the schema, calls a service, and answers `{ ok: true, data }` or
  `{ ok: false, error: { code, message, fields? } }`. A handler never throws across the bridge.
- **Preload** exposes `window.iris` with the same names and types, built from the contract. Nothing else crosses the
  bridge. Raw `ipcRenderer` is never exposed.
- **Renderer** calls through `src/renderer/src/lib/ipc.ts`, which unwraps the answer and throws `AppError`. Queries use
  TanStack Query; a global handler shows the error `message` as a toast, and a mutation that handles its own errors
  (field errors in a form) opts out, as the house standard does.
- **Errors:** `AppError(code, message, fields?)`. Codes: `VALIDATION_FAILED`, `NOT_FOUND`, `CONFLICT`,
  `FILE_MISSING`, `FILE_TYPE_UNSUPPORTED`, `FILE_TOO_LARGE`, `DISK_FULL`, `OFFLINE`, `INTERNAL`. Messages are Spanish and
  user-facing.

---

## 8. Security

- Renderers: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` (if the preload bundle needs it off,
  record the deviation and why), `webSecurity` on, no `webview`.
- A **Content-Security-Policy** in `index.html`: `default-src 'self'`; `img-src 'self' iris-media: data: blob:`;
  `media-src 'self' iris-media: blob:`; `frame-src https://www.youtube.com https://www.youtube-nocookie.com`;
  `connect-src 'self'` plus the exact hosts the main process does not already cover; no remote scripts. Vite's dev
  server needs relaxations: apply them only in development.
- Block navigation (`will-navigate`) and new windows (`setWindowOpenHandler` → deny; open external links in the system
  browser only for a short allowlist, if any).
- Every IPC sender is validated (`event.senderFrame`); every path derived from an id stays inside the Iris home
  (resolve, then check the prefix; reject `..`, absolute paths and symlinks that leave it).
- `iris-media://` serves only registered assets and supports HTTP `Range` (needed for video seeking). Forward the
  `Range` header with `net.fetch`; if it does not honour it, answer `206` yourself with a read stream. Verify with a test.
- No secrets exist. No telemetry. Logs stay on disk (`userData/logs`).

---

## 9. Language, naming, glossary

Code in English, UI in Spanish (see `AGENTS.md`). One English name per concept, used in code, database and docs; the
Spanish word is what the user sees.

| Code              | UI (Spanish)               | Meaning                                                               |
| ----------------- | -------------------------- | --------------------------------------------------------------------- |
| Console           | Consola / Servicio en vivo | The operator window (the whole screen of the app)                     |
| Toolbar           | Barra de herramientas      | Top bar of the console: Tools, Background, Project, …                 |
| Library           | Biblioteca                 | Left panel: songs, media and YouTube videos to add to the service     |
| Service (panel)   | Servicio                   | The list being run now (the **service plan**) plus the block timer    |
| Stage (workspace) | Escenario                  | Center: slides or media of the open item                              |
| Live preview      | En vivo                    | The small copy of what the projection shows                           |
| Service plan      | Servicio (lista)           | Ordered items of today's service (`service_plan_items`)               |
| Slide / section   | Diapositiva / sección      | One part of a song shown at a time                                    |
| Track             | Pista                      | Audio that plays in the room for a song: local file or YouTube        |
| Background        | Fondo                      | Image or looping video behind the lyrics                              |
| Sound effect      | Sonido                     | Short audio the operator triggers (applause, drum…)                   |
| Monitor           | Pantalla                   | A physical screen reported by Electron (replaces the web's "display") |
| Projection        | Proyección                 | The full-screen window drawn on a monitor                             |
| Frame             | —                          | What the projection shows at one moment (`ProjectionFrame`)           |
| Service type      | Tipo de servicio           | A template with timed blocks (e.g. "Culto general")                   |
| Block             | Bloque                     | A timed part of a service                                             |
| Service record    | Registro (de tiempos)      | What really happened in one service                                   |
| Person            | Persona / responsable      | Who leads a block                                                     |
| Iris home         | Carpeta de Iris            | `<home>/Iris`                                                         |

---

## 10. Port map: web → desktop

Paths are in `../atm-iris-web/src`. "Port" = copy and adapt imports; "Rewrite" = same behaviour, new implementation.

| Web                                                                                                                                                         | Desktop                                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `app/globals.css`, `components/ui/*`, `components/brand/*`, `components/service/*`, `components/projection/*`                                               | **Port** to `renderer/src/styles` and `components/*` (phase 01). `next/link`, `Route` types → router                                   |
| `domain/*`, `lib/*` (pure: lyrics, lyrics-import, text, format, zoned-time, youtube, time-statistics, next-service, media-rules, projection-fonts)          | **Port** to `shared/domain` and `shared/lib` with their tests                                                                          |
| `features/projection/*` (model, `ProjectionCanvas`, fonts, youtube-api)                                                                                     | **Port** (phase 06). Drop `channel.ts`, `file-cache.ts`, `file-store.ts`, `file-resolver.tsx`, remote-source code in `screen-view.tsx` |
| `features/console/*` UI (panels, library, workspace, dnd, dialogs, tools, sounds, timer, typography, backgrounds)                                           | **Port** (phases 05–07). Drop `bible/*`, `displays-dialog`, `use-remote-displays`, `selected-service-cookie`                           |
| `features/songs/*`, `features/media/*`, `features/people/*`, `features/times/*`, `features/backup/*`, `features/church/*`                                   | **Port** UI and schemas. **Rewrite** `actions.ts` (Server Actions) as IPC handlers + services                                          |
| `server/repositories/types.ts`, `server/repositories/mock/*` (rules, e.g. duplicates)                                                                       | **Rewrite**: interfaces in `main/repositories/types.ts`, one SQLite implementation. The mock is the readable spec of the rules         |
| `features/console/load.ts` (`loadConsole`)                                                                                                                  | **Rewrite** as the query `console:load` (items with `iris-media://` URLs; no signed URLs, no refresh timer)                            |
| `features/console/running-backup.ts`, `use-service-timer.ts` (crash recovery)                                                                               | **Rewrite**: the running record is saved in the database as it runs; no local-vs-API conflict logic                                    |
| `features/auth/*`, `features/account/*`, `features/landing/*`, `app/(auth)/*`, `app/welcome`, `app/downloads`, `server/session`, `server/dal`, `server/env` | **Drop**                                                                                                                               |
| `app/api/*` (display link, pairing, stream, health, mock-storage, session)                                                                                  | **Drop**                                                                                                                               |
| `features/console/bible/*`, `domain/bible-books.ts`, `lib/bible-*`                                                                                          | **Drop** (the Bible is out of scope)                                                                                                   |
| `app/page.tsx` (console), `app/(app)/times`, `app/(app)/settings`, `app/display`                                                                            | Routes `#/`, `#/times`, `#/settings`, `#/display`                                                                                      |

---

## 11. Quality gates

- Scripts (phase 00): `dev`, `build`, `lint`, `typecheck` (node + web projects), `test`, `test:watch`, `test:e2e`,
  `format`, `format:check`, `check` (= lint + typecheck + test), `build:win`.
- A phase is done when `pnpm check && pnpm format:check && pnpm build` pass, its acceptance list is met and, for UI
  phases, `pnpm test:e2e` passes.
- Unit-test: shared pure code, services, repositories (against an in-memory database with migrations applied),
  migrations, the IPC contract/validation, the media protocol path rules. E2E-test: the user flows each phase names.
  Tests never touch the real Iris home: use `IRIS_HOME` pointing to a temp folder.
- Things that need real hardware (HDMI second monitor, YouTube playback on Windows, the installer) cannot be tested in
  CI: each phase lists them in `docs/manual-tests.md` (created in phase 06 and extended by later phases).

---

## 12. Future hooks (do not build)

- **iPad companion / backend.** Ids are UUID v7, rows carry `created_at` / `updated_at`, models match the web's, data
  goes through repository interfaces and mutations go through services. A future sync layer can sit beside the
  repositories without changing the UI. Do not add sync, sync columns or network code now.
- **The Bible, accounts, linked TVs** were deliberately removed. See `ideas.md`.
