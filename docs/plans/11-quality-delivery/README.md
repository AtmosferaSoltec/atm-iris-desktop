# 11 · Quality and delivery

## Goal

Make the app trustworthy and installable: a test sweep, a manual checklist for the things only hardware can prove, the
Windows build, and the final report.

## Depends on

00–10.

## Steps

1. **Test sweep.** Read every phase's acceptance list and make sure each item has a test or a line in
   `docs/manual-tests.md`. Add what is missing. `pnpm test` and `pnpm test:e2e` must pass from a clean checkout and a
   clean temp `IRIS_HOME`. No test may touch the real Iris home or the network.
2. **E2E coverage of the main flows** (Playwright with `_electron`): first run (folders and database created), create a
   song, import media, build a service, project (preview-window mode), play a video, use the timer and a sound, time a
   service and see the record, back up and restore the JSON, start over. Keep each test independent (its own temp home).
3. **Manual checklist** (`docs/manual-tests.md`): consolidate every hardware item added by earlier phases (HDMI second
   monitor, unplug/replug, video with HDMI sound, ten-minute background video, YouTube on Windows, sounds through the
   speakers, high-DPI, installer on a clean PC). Each line says what to do and what should happen.
4. **Hardening review.** Check against `platform.md` §8: CSP in the production build, navigation and new windows blocked,
   IPC sender checks, `resolveInside` everywhere a path is built, no `console.log` of user data, logs rotate.
5. **Error behaviour.** Walk the failure cases and confirm each degrades with a Spanish message and no crash: missing
   media file, full disk on import, corrupt `iris.db` (offer to restore the latest snapshot), database newer than the
   app, second monitor lost, no internet for YouTube or lyrics.
6. **Packaging.** `electron-builder.yml` for Windows: NSIS installer (per-user, desktop shortcut, Spanish
   product name "Iris"), plus a `dir`/`zip` target for quick tests. The installer must **not** bundle the user's data and
   an uninstall must **not** delete `Iris/`. Real icons in `build/` and `resources/`. `build:win` produces the artifacts
   in `dist/`.
   - An Apple Silicon Mac cannot run the NSIS tool (it is Intel-only) without Rosetta. Provide a GitHub Actions workflow
     (`.github/workflows/build-win.yml`, `windows-latest`, pnpm 11, `pnpm check`, `pnpm build:win`, upload the artifact)
     so the installer is built on Windows. The repo has no remote yet: ship the file anyway.
7. **Updates and signing.** `electron-updater` is installed but there is no feed: keep auto-update **disabled** (no
   network calls at startup) and remove or document `dev-app-update.yml`. Document in the README that an unsigned build
   shows Windows SmartScreen ("Más información → Ejecutar de todas formas") and what code signing would need.
8. **Docs.** Finish `README.md` (install, first run, the Iris folder, where the data lives, backups, troubleshooting) and
   a short `docs/architecture.md` that mirrors `platform.md` as built. Mark each phase's _Deviations_ section.
9. **Version.** `0.1.0` and a `CHANGELOG.md` entry.

## Acceptance

- `pnpm check && pnpm format:check && pnpm build && pnpm test:e2e` all green; the workflow file exists and is valid.
- The Windows artifacts are produced (on Windows or in CI) and the app starts from the installer on a clean machine
  without developer tools.
- `docs/manual-tests.md` is complete; the final report lists which items were run and which were not.
- The final report of [`../README.md`](../README.md) is delivered.

## Out of scope

Code signing, an update feed, a store listing.

## Deviations

- Windows artifacts, installer execution, HDMI, audible output and YouTube on Windows cannot be verified on this Apple Silicon macOS host. The validated NSIS/ZIP configuration and Windows CI workflow are delivered; actual Windows/CI results are explicitly pending in `docs/manual-tests.md`, not reported as passed.
- The installer is per-user and one-click, in Spanish, with no update feed. Removed the scaffold update config and macOS packaging assets. PNG/ICO icons derive from the ported Iris SVGs; `build/icon.svg` is the editable source.
- The quality review added Spanish startup recovery guidance for corrupt SQLite, Spanish Electron menus, local log rotation coverage, default network denial and temporary IRIS_HOME in test harnesses, and production CSP/player-origin checks. The fonts test now waits for the console/styles before requesting faces.
- Enforced sequential blocks/no new skips in main in addition to the ported UI; historical skipped blocks remain readable. Fixed detached historical records and offset-aware record filtering, plus cleanup of deleted default backgrounds and storage refresh after media events.

Packaging schema validation and workflow YAML parsing pass locally. `pnpm install --frozen-lockfile` succeeds. Automated evidence and remaining hardware checks are consolidated in `docs/manual-tests.md`. The workflow has not been executed: this repository has no remote. No commits or pushes were made. Phase 99 was not started.

Final automated gates pass: `pnpm check` (118 unit tests in 39 files), `pnpm format:check`, `pnpm build`, and `pnpm test:e2e` (19 passed, 0 failed), with temporary Iris homes and external network denied by default. The full Electron run includes the corrected offline font check and secure player origin checks. Implementation and local automated acceptance are complete; Windows artifacts and physical/installer acceptance remain explicitly unverified.
