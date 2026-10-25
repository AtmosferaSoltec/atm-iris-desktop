# 15 · Windows/macOS delivery and manual upgrades

## Goal

At the user's explicit request, deliver version 0.2.0 for Windows and macOS, activate both GitHub Actions workflows, and verify that updates reuse existing data and run required migrations.

## Depends on

11–14.

## Steps

1. Keep `com.atmosfera.iris`, the package name, product name and Iris home stable. Increment the app version to 0.2.0 independently of SQLite schema version 11.
2. Keep the Windows NSIS/ZIP x64 workflow; add a second workflow with native macOS arm64 and x64 jobs, DMG/ZIP targets and the Iris ICNS icon. Use the actual package version in artifact names.
3. Keep manual updates: rerun the Windows installer or replace Iris.app on macOS. Never include user data in installation artifacts or delete it during replacement.
4. Test on-disk upgrades from schema 8, 9 and 10, including songs, sections, media references, YouTube, plan, history, settings and existing Bible text. Verify original media bytes, an exact pre-migration backup, idempotence and foreign keys.
5. Build and open the packaged Mac app with an isolated Iris home. Both workflows run the same packaged-app smoke test before uploading deliverables.
6. Document update/restore instructions and hardware/platform checks. Commit and push to main to activate workflows, as explicitly requested in this turn.

## Acceptance

- `pnpm check && pnpm format:check && pnpm build && pnpm test:e2e`.
- Validate workflow YAML/triggers and packaging config against the installed electron-builder schema.
- Local `pnpm build:mac --arm64 --publish never` and `pnpm test:packaged dist/mac-arm64/Iris.app/Contents/MacOS/Iris`.
- Push activates independent Windows and macOS workflows. Do not report remote runs as passed without evidence.

## Out of scope

Auto-update feed, Apple notarization/Developer ID provisioning, Windows certificate provisioning, App Store and optional downloader.

## Deviations

- macOS CI follow-up: the development gallery used a five-second assertion during cold Vite dependency optimization and changed the hash after Electron's first window appeared. The test now starts directly at the gallery URL, warms its modules, uses an isolated cold cache on every run, and gives only this development startup a longer readiness budget. Application interaction assertions remain unchanged; teardown closes Vite even when Electron fails to launch.
- Windows CI follow-up: the folder-opening E2E compared path spellings and failed when Electron returned the DOS 8.3 alias of the runner profile. It now compares the actual directory's device/inode identity, preserving the check that Images and Videos open their respective folders without depending on path spelling. Production path handling remains unchanged.
- macOS delivery is now explicitly authorized, extending the original Windows-only distribution scope. Separate architecture builds avoid requiring Rosetta for native execution.
- No distribution certificates were provided. macOS uses ad-hoc signing without Hardened Runtime/notarization; Windows retains its unsigned installer. These are not presented as signed/notarized client releases.
- Data and migration handling already exist. Added upgrade regression coverage and delivery documentation rather than changing data locations or introducing a second migration mechanism.
- The user's current instruction authorizes the commit/push needed to activate workflows, superseding the default git restriction for this delivery.

Verification: `pnpm check` (130 unit tests), `pnpm format:check`, `pnpm build` and `pnpm test:e2e` (21 passed) pass. Workflow YAML/triggers and installed packaging schema validate. The local arm64 DMG/ZIP were built and the packaged Iris 0.2.0 console/IPC opened successfully with temporary data. Windows and Intel builds are delegated to the triggered CI jobs; their completion is not claimed locally. Physical installer upgrades, downloaded-app security prompts and HDMI remain manual checks.

CI follow-up verification: the user reports that the Windows workflow passed after the folder-identity fix. The macOS gallery correction passed the full 21-test Electron suite and three additional cold-cache gallery runs locally; the next remote macOS run remains to be confirmed. No physical installer/HDMI result is inferred from CI.
