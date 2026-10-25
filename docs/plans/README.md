# Implementation plans · atm-iris-desktop

> **For the implementing agent.** This is your starting point. You work in **this repo only**, phase by phase and in
> order. Reference projects are read-only (see [`AGENTS.md`](../../AGENTS.md)).

## Read first

1. [`00-foundations/platform.md`](00-foundations/platform.md): product, architecture, folder layout, data model, IPC,
   security, glossary and the **port map** (what to copy from the web project, what to drop, what to rewrite).
2. [`../../AGENTS.md`](../../AGENTS.md): the way of working. It is the web project's way of working carried over; follow
   it strictly.
3. `../../../atm-iris-ios/IRIS_SPEC.md`: design, texts and rules (§3–4 tokens, §6.2 console, §6.4–6.5, §6.7–6.10,
   §7 behaviour, §12 desktop adaptation). Texts in the UI are Spanish exactly as the spec and the web have them.
4. The web project, `../../../atm-iris-web`: **the source of truth for look and behaviour.** Each phase lists the files
   to read and port. Do not redesign anything: the goal is the same app, local.

## What this project is (and is not)

Same product as the web console (songs, media, service plan, live projection, typography, timer, sounds, service
timing), rebuilt as an Electron desktop app that needs no server:

- The PC projects to a second monitor over HDMI. No internet, no TV browser, no sync between machines.
- Media (audio, video, images) lives in `Iris/Audio`, `Iris/Videos`, `Iris/Images`, `Iris/Backgrounds`,
  `Iris/Sounds`. Data lives in a local SQLite database (`Iris/Database/iris.db`).
- **Out of scope for now:** sign-in and accounts, backend, sync, the Bible, linked TVs by code, delivery to a store.
  Some are kept in mind in [`ideas.md`](ideas.md) (iPad companion, Bible) and are **not to be built**.

## Commands

| For                 | Command                                                                             |
| ------------------- | ----------------------------------------------------------------------------------- |
| Development         | `pnpm dev` (VS Code terminal: `env -u ELECTRON_RUN_AS_NODE pnpm dev`)               |
| Check every phase   | `pnpm check && pnpm format:check && pnpm build` (`check` = lint + typecheck + test) |
| Format              | `pnpm format`                                                                       |
| Unit tests          | `pnpm test` · `pnpm test:watch`                                                     |
| UI tests (Electron) | `pnpm test:e2e` (created in phase 00)                                               |
| Windows build       | `pnpm build:win` (phase 11; the installer cannot be built on an Apple Silicon Mac)  |

## Phases

| #   | Phase                                                                                                           | Status                   |
| --- | --------------------------------------------------------------------------------------------------------------- | ------------------------ |
| 00  | [Foundations](00-foundations/README.md): project skeleton, tooling, security baseline, quality gates            | [x]                      |
| 01  | [Design system and shell](01-design-system/README.md): tokens, `ui` components, fonts, router, app layout       | [x]                      |
| 02  | [Local data](02-local-data/README.md): Iris folder, SQLite and migrations, repositories, IPC contract, errors   | [x]                      |
| 03  | [Media library](03-media-library/README.md): import, scan, `iris-media://`, storage usage                       | [x]                      |
| 04  | [Songs](04-songs/README.md): songs, sections, tracks, archive, search, online lyrics lookup                     | [x]                      |
| 05  | [Console](05-console/README.md): toolbar, Library, Service, Stage, drag and drop, live state                    | [x]                      |
| 06  | [Projection](06-projection/README.md): monitors, projection windows, frames, backgrounds, playback sync         | [x]                      |
| 07  | [Tools](07-tools/README.md): typography, timer, sounds, the Tools menu                                          | [x]                      |
| 08  | [Service timing](08-service-timing/README.md): people, service types, block timer, records, summaries           | [x]                      |
| 09  | [YouTube](09-youtube/README.md): saved videos, song tracks, embed workaround, offline behaviour                 | [x]                      |
| 10  | [Settings and maintenance](10-settings/README.md): church settings, storage, backups, start over                | [x]                      |
| 11  | [Quality and delivery](11-quality-delivery/README.md): test sweep, manual checklist, Windows build, report      | [x] ⚠️ Windows pendiente |
| 99  | [Optional downloader](99-optional-downloader/README.md): **deferred; do not start without the user's go-ahead** | —                        |

Tick the box when a phase is done and fill its _Deviations_ section ("None" if there are none).

## Rules specific to this repo

- Every phase has: **Goal · Depends on · Reference · Steps · Acceptance · Out of scope · Deviations**. Do the steps in
  order; the acceptance list is the definition of done.
- Port, do not reinvent. When the web does something a certain way (copy, layout, keyboard, edge cases), do it the same
  way. The web code is written for Next.js and a server: strip what depends on them (Server Actions, `"use client"`,
  `next/*`, cookies, signed URLs) and keep the rest.
- A web feature that depends on a server has a local equivalent in [`platform.md` §10](00-foundations/platform.md).
- Ask the user only when blocked by something only they can give (a decision the plans do not settle, a file you need).
  Otherwise take the most conservative reading, continue and record it under _Deviations_.

## Final report (when every phase is done)

```markdown
## Status of atm-iris-desktop

- Phases: 00 ✅ · 01 ✅ · … (or ⚠️ with the reason)
- Verification: check ✅ · format ✅ · build ✅ · e2e: N pass, M fail (details)
- Deviations from the plans: list, with file and reason
- Not verified (needs real hardware): what could not be tested here (HDMI, YouTube on Windows, installer)
- How to run it: exact commands
```

Then ask the user whether the repo can be considered done.
