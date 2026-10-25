# 12 · Biblia RVR1960

## Goal

Restore Bible projection at the user's explicit request, with only Reina-Valera 1960. Import the user's XML once, keep verses in local SQLite, and port the existing web console picker and quick projection flow. No network, translation catalogue or Bible text bundled in the installer.

## Depends on

02, 05, 06, 11.

## Reference

- Read-only web `features/console/bible/*`, `domain/bible-books.ts`, `lib/bible-reference.ts` and its tests, Bible branches in the console controller/workspace.
- iOS spec §6.3 and §7.5. The current web is the UI source of truth: typed references plus book/chapter/verse navigation.
- User-provided `SpanishRVR1960Bible.xml`: `<bible translation="…RVR 1960…" status="…"><testament name="Old|New"><book number="1…66"><chapter number="…"><verse number="…">…`.

## Steps

1. Port the 66-book index/reference parser and adapt the fixed translation to RVR1960.
2. Migration 0009: local metadata and verses, with transactional replacement. Validate the XML before writing: 16 MB maximum, RVR1960 label, both testaments, 66 canonically numbered books, their 1,189 chapters and consecutive verse numbers. Reject DTD/custom entity declarations and unsupported nested markup; keep verse text and attribution.
3. Main-only native XML picker and file reading. Validated `bible:status`, `bible:import`, `bible:chapter` channels; renderer receives status and chapter data only.
4. Port the Bible button (`V`), picker, chapter and verse grids. Import gate on first use, reimport action, copyright notice and Spanish errors. Query state lives in React/TanStack Query rather than mutable module caches.
5. Quick projection: entire chapter as slides, focus requested range, project the first selected verse immediately, reference/RVR1960 footer, previous/next arrows and keyboard. A passage stays temporary and never enters the service plan.
6. Unit tests with synthetic text and Electron tests using temp IRIS_HOME. Check the supplied XML separately using a temp profile; do not put its text in source or test fixtures.

## Acceptance

- Import/cancel/error handling, only RVR1960, malformed/truncated XML rejection and preservation of the previous Bible on failed imports.
- Reference aliases/ranges, exact verse text, footnotes/focus, book → chapter → verse selection, chapter boundaries, persistence, two-window preview projection and no passage added to the plan.
- `pnpm check && pnpm format:check && pnpm build && pnpm test:e2e` pass.
- Real Windows/HDMI output remains a manual check.

## Out of scope

Other translations, online Bible fetching, encrypted `.bib` modules, bundled Bible text, word searches across the Bible, persistent passages in the service plan and the optional downloader (phase 99).

## Deviations

- The user explicitly restored this feature after the original plans had excluded it, and chose RVR1960 rather than the web's RVR1909. There is no translation selector.
- The provided readable XML is imported at runtime through a native picker rather than committed or distributed as source data. The user's `.bib` files are not read or modified by the application.
- The source's mutable chapter cache is replaced by query-managed state for React Compiler compatibility. The reference input clears stale selections when invalid, and validates both ends of a range before projecting.
- SQLite snapshots include the imported Bible; the web-compatible songs/YouTube JSON backup does not. To move a Bible separately, import the original XML on the other PC.

Verification: `pnpm check` (121 unit tests), `pnpm format:check`, `pnpm build` and `pnpm test:e2e` (20 passed, 0 failed) pass. The Bible E2E covers import, exact references and range focus, projection in a second preview window, previous/next, invalid references/XML, chapter boundaries and retained data. A separate manual check imported the supplied XML into a temporary profile: 31,104 verses, attribution retained, 36 verses in John 3, and all data still present after a full close/relaunch. No real Iris home was accessed. Windows/HDMI Bible projection remains unverified.
