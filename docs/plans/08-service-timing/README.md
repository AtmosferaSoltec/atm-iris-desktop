# 08 · Service timing

## Goal

Everything the web has for timing a service: people (leaders), service types with timed blocks, the **block timer** in
the console, the running record, and the **Tiempos** page (records and summaries). Local, with the running service saved
to the database as it goes.

## Depends on

02, 05.

## Reference (web project, read-only)

- `src/features/console/`: `block-timer.ts` (+ test), `use-service-timer.ts`, `components/block-timer-bar.tsx`,
  `components/leader-dialog.tsx`, `selected-service.ts`, `schemas.ts` (the quick service), `actions.ts`.
- `src/features/times/*` (`times-view.tsx`, `records-tab.tsx`, `summaries-tab.tsx`, `record-detail.tsx`, `period.ts`,
  `schemas.ts`), `src/features/people/*`.
- `src/domain/time-statistics.ts`, `next-service.ts`, `rules.ts` (+ tests), `src/lib/format.ts`, `zoned-time.ts`.
- `src/server/repositories/mock/data.ts` (`people`, `serviceTypes`, `records`: the readable rules).
- `docs/api-contract.md` §8, §9, §14 in the web repo. `IRIS_SPEC.md` §6.7–6.10 and §7.9–7.10.

## Rules to keep

- Person names unique by `name_key` (accents/case folded); a person can be deleted and history keeps the name.
- A service type: name 1–60 unique by `name_key`, one of the six colors, optional schedule (weekday, hour, minute), 0–30
  blocks (name 1–60, planned minutes 1–240). **Zero blocks = "Solo proyección"** (no timing).
- Block timer rules (§7.9): blocks run one after the other; **no skipping**; "Comenzar" starts the first block at once;
  a leader per block; "Finalizar servicio" only in the last block; the clock turns to warning at 90 % and to over at
  100 % of the planned time (`clockState`); overtime is shown as `+m:ss`.
- Statistics (§7.10): excess = actual − planned if > 0, no margin; skipped blocks do not count.
- Time zone: "today", schedules and period ranges use the church time zone setting.

## Steps

1. **Migrations `0005-people.sql`, `0006-service-types.sql`, `0007-service-records.sql`**: `people`, `service_types` +
   `block_templates`, `service_records` + `block_records` as in `platform.md` §6.3 (records keep `service_type_name`,
   `person_name` denormalized; foreign keys `SET NULL` on delete).
2. **Repositories, services, IPC** for people (list with `blockCount`, create, update, delete), service types (CRUD with
   blocks: blocks without an id get one, absent blocks are removed), records (list with filters and pagination, get,
   save, delete). Schemas in `src/shared/schemas/timing.ts` shared with the forms.
3. **Selected service.** The web kept the chosen service in a cookie; here it is `app_settings.selected_service_type_id`.
   "Seleccionar servicio" dialog (choose, **crear servicio** quick form with blocks, change) as in the web.
4. **Running record.** While a service runs, the record is **written to the database on every block change**
   (`status: inProgress`), so a crash or a closed window loses nothing and reopening resumes it. This replaces the web's
   `running-backup.ts` (which reconciled a local copy with the API): delete that logic, do not port it. On startup, if
   a record is `inProgress`, the console picks it up exactly as the web picks up `inProgress` from the API.
5. **Block timer UI.** Port `block-timer-bar.tsx`, `leader-dialog.tsx` (choose a leader, add a newcomer inline), the
   per-block clock, the progress, "Siguiente: …", "Finalizar servicio" and the finished summary. The timer ticks in the
   renderer; it never goes to the projection.
6. **Tiempos page** (`#/times`, inside `AppLayout`): records tab (by month, with detail and delete), summaries tab
   (period, KPIs, per block, per person), the same copy. Port `period.ts` and use `time-statistics.ts` unchanged.
7. **People management.** Wherever the web lets you manage people and service types (leader dialog, service dialogs,
   times page), port exactly that. Do not invent new screens.

## Acceptance

- Unit tests (ported and new): `block-timer`, `clockState`, `time-statistics`, `next-service`, `period`, the rules above
  (duplicate people and service types, zero-block types), record save/resume, migrations.
- E2E: create a service type with blocks, select it, start, set a leader, advance blocks, finish, and see the record in
  Tiempos with correct totals; close and reopen mid-service and resume; delete a person and keep the history name.
- `pnpm check && pnpm format:check && pnpm build && pnpm test:e2e` pass.

## Out of scope

Syncing records anywhere; exporting to files other than what the web offers.

## Deviations

- `clockState` becomes over at exactly 100 %, following this plan; the web helper used strictly greater than 100 %.
- Records use nullable foreign keys with denormalized names. Adapted the web `leaderName` fallback to show the saved name after SQLite applies `SET NULL`; retained the statistics calculations and adapted only nullable type references.
- The reference working copy has inline leader creation and the quick service selector, but no separate people/service management screens. Ported those existing dialogs and exposed the full validated CRUD (including color/schedule) through IPC; no new screens were invented. The quick creator allows removing all blocks for projection-only services and caps additions at 30.
- Replaced cookies and running browser backups with local app settings and serialized SQLite saves. URL filters use React Router; timing fixtures are test-only, with no seeded operator data.

Verification: 106 unit tests cover the ported timer/statistics/schedules/period logic plus database save/resume, duplicates, projection-only services and historical names. Electron covers creating/selecting a two-block service, adding a leader, reopening mid-service, finishing, records, summaries and deleting a leader while retaining the name.
