# 13 · Folder-based multimedia library

## Goal

At the user's request, replace image/video upload controls in the console Library with **Buscar → folder icon → refresh icon**. The Iris home remains the parent folder; images, videos and audio remain ordinary files in their existing folders. SQLite stores only metadata, relative paths and references, never their binary contents.

## Depends on

03, 05, 06, 10.

## Steps

1. Remove the image/video upload button, import queue and external-file copy/drop behavior from the active Library panel. Keep existing-entry drag to the service and song/YouTube creation actions.
2. In Images and Videos, put folder and refresh icons immediately after the search field. YouTube accepts links and has no local-folder/file-import controls.
3. Add validated `media:open-folder` IPC with an enum, not a path. Main resolves the selected Audio/Images/Videos folder inside Iris home and opens it through the system shell.
4. Scan folders on startup, return to the app and explicit refresh. Respect folder kinds, preserve nested directories, ignore unsupported or misplaced files and never copy/move/delete files during scanning. Hide missing files from the folder-backed Library while retaining metadata for plan references and maintenance.
5. Migration 0010 records file modification timestamps. Detect changed files even when their size is unchanged, reset outdated dimensions/duration and version asset URLs so previews/projection reread their bytes. Keep existing ids for the same relative path.
6. Read dimensions/duration on demand for folder-discovered files in the detail dialog. Persist metadata only; the renderer still uses asset ids and the typed bridge.

## Acceptance

- Unit tests: folder mapping, kind separation, idempotent/no-copy scanning, same-size file updates and asset URL versions. Protocol accepts only the numeric version query and still rejects traversal/unknown parameters.
- Electron: no local image/video upload controls, search/folder/refresh order, matching folders opened, files added/replaced/deleted/restored, image preview, video seeking and projection with audio. YouTube remains link-only.
- `pnpm check && pnpm format:check && pnpm build && pnpm test:e2e` pass with temporary Iris homes.
- Windows Explorer interaction remains a manual check.

## Out of scope

Renaming the existing Iris folders, changing Iris home, removing SQLite metadata or replacing the separate song-track/background/sound editors. The optional downloader remains deferred.

## Deviations

- Subsequent user request: show images, videos and YouTube links as rows with a thumbnail on the left and the stored title on the right, retaining drag, quick projection and context menus. YouTube already retrieves and persists its title/author through oEmbed; these are now visible without hovering. No additional network request is needed to render the list.
- This user decision supersedes the Library upload UX from phases 03/05. The native import API remains for the separate track/background/sound workflows; the console's local image/video Library uses folders only.
- Folder icons open the selected Images/Videos subfolder to avoid mixing file types. The parent Iris folder remains available from Settings → About.
- Missing entries remain in the metadata index to preserve service references and maintenance actions, but disappear from the folder-backed Library until the file returns.
- Added modification-time tracking and asset URL versions because filesystem changes must also refresh existing previews, including same-size replacements. No media bytes are stored in SQLite.

Verification: `pnpm check` (124 unit tests), `pnpm format:check`, `pnpm build` and `pnpm test:e2e` (20 passed, 0 failed) pass. Tests use temporary homes. Electron checks the exact control order and folder dispatch (system shell stubbed), new/changed/deleted/restored files, unchanged source bytes/no duplicate copies, refreshed image dimensions, seeking and projection of folder-discovered videos, and link-only YouTube controls. Actual Windows Explorer/HDMI interaction remains unverified.
