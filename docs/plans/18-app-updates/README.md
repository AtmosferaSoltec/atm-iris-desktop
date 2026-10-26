# 18 · Mandatory automatic updates (Windows)

## Goal

On startup, Iris checks for a newer release. If there is one, the console stays blocked behind a mandatory-update screen until it is downloaded and installed. Offline with nothing pending, Iris opens normally.

## Design

- `UpdateService` (`src/main/updates`) owns the state machine: `checking → downloading → ready → installing`, or `current` / `offline` / `error`. The check runs once per launch; an operator already in the console is never interrupted.
- The required version is persisted (`updates.requiredVersion`) **before** downloading, so closing the app or losing the connection cannot dismiss it. Until the session is admitted, `assertCanUse` rejects every IPC channel except `updates:*` and `app:info`.
- `UpdateGate` (renderer) mounts the router only when no update is required. No close/skip control.
- Install takes an automatic data snapshot first and is refused while a projection is running.
- `electron-updater` is used only in packaged Windows builds (GitHub provider, channel `latest`; `personal` for the personal edition). Tests use `IRIS_E2E_UPDATES` (`available`, `download-error`, `offline`) with a fake port.

## Tests

Unit: `update-service.test.ts`. Electron: `e2e/updates.spec.ts`.

## Pending / not verified

- A push to `deploy/windows` builds, tests and publishes a GitHub release (`latest.yml` + installer) with `electron-builder --publish always`. Bump `package.json.version` before each push: clients only update to a higher version. Manual runs and the personal edition never publish. The macOS workflow is manual-only for now.
- No real update has been run on Windows (installer, SmartScreen, restart). macOS is excluded (unsigned builds cannot auto-update).
