# Iris Desktop — agent instructions

**Start with [`docs/plans/README.md`](docs/plans/README.md)**: the phased implementation plan, the platform decisions
([`docs/plans/00-foundations/platform.md`](docs/plans/00-foundations/platform.md)) and the way of working.

This is a **local-first Windows desktop app** (Electron) that replaces the web console: the PC drives a second screen
(TV or projector over HDMI), media lives in a folder (`Iris/`), data lives in a local SQLite database.
**No backend, no account, no sign-in.** The only network use is YouTube (embedded player and oEmbed check) and the
optional online lyrics lookup. Everything else works offline.

## Reference projects (read-only)

- `../atm-iris-web` — the web console this app ports: design, components, behaviour. **Never edit it.** Its working
  copy may be ahead of its git remote: read the files, not the history.
- `../atm-iris-ios/IRIS_SPEC.md` — product spec: tokens (§3–4), screens (§6), behaviour rules (§7), desktop adaptation
  (§12: keyboard, mouse, second monitor). Sections about login, modules and team do not apply.
- `../atm-iris-api` — only for rules the web inherited from it (field limits, song rules: `docs/api-contract.md` in the
  web repo is the readable version). Never edit it.
- `../atm-iris-win` — a discarded earlier project. Do not edit it and do not port code from it.

## Way of working

1. **Code in English, everything the user sees in Spanish** (JSX, zod messages, error `message`, dialogs, menus).
   Comments explain _why_, not _what_. Enums travel in English and are translated in one place (`messages.ts` of the
   feature).
2. **Three processes, one rule: the renderer never touches Node, files or the database.** It only calls `window.iris`
   (the typed preload API built from `src/shared/ipc/contract.ts`). `src/main` never imports from the renderer and
   `src/shared` imports neither. ESLint enforces it (phase 00).
3. **Every IPC handler validates its input with zod** before doing anything. Handlers are thin and call services;
   services hold the rules; repositories are the only code that writes SQL and they hide `node:sqlite`.
4. **Errors:** throw `AppError` (`src/shared/errors.ts`) with a stable `code`, a Spanish `message` and optional field
   errors. The renderer shows `message` as it comes and maps `fields` onto form fields.
5. **Files:** user files live under the Iris home (`<home>/Iris/` by default). The database stores **relative paths
   only**. The renderer never sends or receives a path to read a file: it uses an asset id (`iris-media://asset/<id>`)
   and main resolves it, refusing anything outside the Iris home.
6. **Dates and "today"** use the church time zone setting (`src/shared/lib/zoned-time.ts`, `format.ts`), never the OS
   locale by accident. Store UTC ISO strings.
7. **Design:** tokens live in `src/renderer/src/styles/globals.css` and components in
   `src/renderer/src/components/ui` (Radix primitives with Iris styles; toasts with `toast` from `ui/toaster`). No loose
   colors or sizes. Small text uses `ink-2`, not `ink-3` (contrast).
8. **Search, filters and pagination live in the URL** (router search params) with parsers in
   `src/renderer/src/lib/search-params.ts`.
9. **React Compiler is on.** While rendering, never read mutable non-React state (class fields, refs, module variables)
   to decide what to show: it would be cached and go stale. Keep it in `useState` / `useSyncExternalStore`, or derive it
   from props and state.
10. **Naming:** files and folders `kebab-case`; components and types `PascalCase`; variables and functions `camelCase`;
    constants `SCREAMING_SNAKE_CASE`; booleans `is` / `has` / `can`; tables `snake_case` plural, columns `snake_case`.
    No invented abbreviations (`quantity`, not `qty`; `id`, `url`, `db` are fine).
11. **No network** except where a plan says so. Never download or run code at runtime.
12. **Before finishing a phase:** `pnpm check && pnpm format:check && pnpm build`, and `pnpm test:e2e` when the phase
    touches UI or windows. Unit tests are written **together with the logic** (pure code, services, repositories,
    migrations), not left for the end.
13. **Do not commit or push**; the user handles git. Do not change a decision in `platform.md` on your own: ask, or
    record a deviation in the phase's _Deviations_ section with its reason.
14. **Tool notes:** pnpm 11 blocks dependency build scripts (declare them in `pnpm-workspace.yaml`). In a VS Code
    terminal `ELECTRON_RUN_AS_NODE=1` is set and makes Electron start as plain Node: run
    `env -u ELECTRON_RUN_AS_NODE pnpm dev`.
