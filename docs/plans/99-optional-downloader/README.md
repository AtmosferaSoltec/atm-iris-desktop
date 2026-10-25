# 99 · Optional downloader (deferred)

> **Do not start this phase without the user's explicit go-ahead.** It is not part of the main plan and nothing else
> depends on it.

## Goal

An optional module for the user's own installation: paste a YouTube URL and choose to save the **video** or only the
**audio (MP3)** into the Iris folders (`Videos/` or `Audio/`), where it behaves like any other file.

## Why it is separate (read this first)

- **It goes against YouTube's terms of service**, which allow downloading only with the features YouTube provides. The
  user has been told and decided to proceed for the church's own use.
- It does **not** grant any music or video license. The church's licensing is separate.
- It breaks often: YouTube changes frequently and the downloader tool must be updated every few weeks.
- **It must never ship in any build given to other people.** If the app is ever distributed, this module is excluded.

## Design constraints

1. **Isolated and removable.** One folder (`src/main/modules/downloader`, `src/renderer/src/features/downloader`), one
   feature flag in `app_settings` (`features.downloader`, **off by default**) and one build flag so a distributable build
   can leave it out entirely. Deleting the folder and the flag leaves the rest working.
2. **Tool.** Run `yt-dlp` (and `ffmpeg` for MP3) as external processes from the main process with `child_process`
   (`spawn`, never a shell string; arguments as an array; no user text interpolated into a command line). Keep the
   binaries in `userData/tools`, not in the installer.
3. **Updates.** `yt-dlp` self-update on demand and on a weekly check, with a clear "Actualizar herramienta" button and
   a Spanish error when it is out of date. This is the only code allowed to download an executable at runtime, and only
   from the tool's official release location, with its checksum verified.
4. **UI** (Spanish): a field for the URL, "Video" / "Solo audio (MP3)", quality, a progress bar, cancel, the result added
   to the media library (role by choice: library video, track, sound), clear errors (no internet, unavailable video,
   age-restricted, tool out of date).
5. **Safety:** validate that the URL is a YouTube URL (`src/shared/lib/youtube.ts`), cap the file size and duration, write
   to a temp folder first, then register through the phase 03 importer.

## Acceptance (when it is eventually built)

- Unit tests: URL validation, argument building (no injection), progress parsing, the feature-flag gating.
- Removing the module compiles and passes `pnpm check`.
- Manual: a short public video downloads as MP4 and as MP3 and plays from the library.

## Deviations

_Not started._
