# 17 · Local playback and operator controls

## Goal

Apply the user's delivery, playback, audio-file lifecycle and Bible-search requests for 0.3.0. YouTube URLs remain only in the optional personal downloader; no online playback or saved links remain.

## Depends on

12–16 and the explicitly authorized optional downloader (99).

## Reference

Keep Iris's existing design tokens, UI primitives, IPC boundaries and projection model. The supplied Holyrics image informs compact workspace use only; no code or styling is copied.

## Steps

1. Remove online playback, oEmbed, linked tracks/videos, their IPC, player scheme and renderer entry. Migrate installed schema 11 to 12 with a backup, preserving songs, sections, local files, Bible translations and other settings.
2. Remove the final blank-slide card. Place a latched clear-screen icon below live preview: B or an explicit click toggles it; slide/song changes and timers never release it.
3. Prefer MP3 for new song tracks; allow lyrics only, audio only or both. Trash replaced/removed/deleted audio only after checking references; canceling a new imported draft also cleans its unused copy. Rename from the editor while preserving asset ids, extensions and references and refusing collisions.
4. Add the vertical volume popover, MP3 indicator/duration in service rows and an icon with tooltip for clearing the service.
5. Complete unambiguous Bible names while selecting the completed suffix, preserve aliases, parse full chapter numbers and let Enter on a chapter project its first verse. Cover Salmos 96 and all 13 synthetic verses.
6. Trigger Windows and macOS automatic builds from `deploy/windows` and `deploy/macos`, respectively; retain manual runs. Main and PRs do not start both delivery workflows.
7. Run all quality gates and Electron regressions with temporary profiles and Iris homes.

## Acceptance

- Unit: schema upgrades, old backup compatibility, track ownership/cleanup, safe rename and Bible parsing/completion.
- Electron: no YouTube tab/player/API; song editor accepts local MP3; draft cleanup, rename and deletion; latched clear screen across songs; volume, duration and service controls; complete Psalm 96.
- `pnpm check && pnpm format:check && pnpm build && pnpm test:e2e`.
- Personal build retains the downloader UI; general build excludes its implementation.

## Out of scope

Automatic app updates, migrating to a new Iris home, moving unrelated/unassigned existing audio files, Windows/macOS signing and physical HDMI checks.

## Deviations

- Historical SQL migrations remain immutable. Schema 12 clears the obsolete nullable `songs.youtube_id` column and removes the saved-video table and linked plan rows. The old column and plan CHECK remain inert for a conservative upgrade that avoids rebuilding foreign-key song/section tables. No runtime model or IPC exposes links.
- Existing YouTube-only song titles are retained for adding local audio later. Legacy JSON imports keep lyrics and ignore old links; audio-only songs still require the full folder/database backup.
- Existing non-MP3 local tracks remain readable/editable to preserve previously imported data. New selections/imports for songs accept MP3; general multimedia and sound-effect formats remain unchanged.
- Clear screen hides content and retains the chosen background, as the existing clear operation did. The latch lasts for the running console and stays active across song, slide, media and timer changes; audio continues independently.
- Automatic cleanup applies to files detached from songs and new discarded imports. Unassigned downloads and files placed manually in Audio are kept for future selection; unrelated unused files are removed explicitly through Settings.
- Renaming preserves the extension, refuses case-insensitive collisions and uses exclusive filesystem links plus rollback if the database update fails. Unsupported filesystems/permissions produce a Spanish error with the original intact.
- Installer/HDMI/audio routing and real download/conversion checks remain explicitly listed in `docs/manual-tests.md`; no hardware result is inferred from Electron automation.

## Verification

`pnpm check` passed (148 unit tests), `pnpm format:check`, `pnpm build` and the full general Electron suite passed (23/23). The personal build also passed 23/23 Electron tests; its downloader passed independently. Temporary homes/profiles were used throughout. Inspected the live-control/volume and compact-workspace captures. Physical Windows installer/HDMI/audio and real MP4/MP3 conversion remain unverified as listed in the manual checklist.
