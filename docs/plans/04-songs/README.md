# 04 · Songs

## Goal

Songs with lyrics (sections), a track (a local audio file **or** a YouTube link, never both), an optional per-song
background, archive, and search. Same behaviour as the web, on the local database.

## Depends on

02, 03.

## Reference (web project, read-only)

- `src/features/songs/*`: `schemas.ts`, `components/song-editor.tsx`, `components/track-field.tsx`,
  `components/youtube-badge.tsx`, `components/lyrics-search-dialog.tsx`, `use-track-player.ts`, `actions.ts` (rewrite).
- `src/lib/lyrics.ts`, `lyrics-import.ts`, `youtube.ts`, `text.ts` (+ tests), `src/server/lyrics.ts` (online lookup),
  `src/server/youtube.ts`.
- `src/features/console/library/song-dialog.tsx`, `archived-songs.tsx`, `src/features/console/backgrounds/song-background-field.tsx`.
- `src/server/repositories/mock/data.ts` (the `songs` repository: rules) and `docs/api-contract.md` §10 in the web repo.
- `IRIS_SPEC.md` §6.4.

## Rules to keep (from the contract)

- A song is **lyrics, a track, or both**; never neither. No sections, no audio and no YouTube link → error on
  `sections`: "Agrega la letra o una pista.".
- The track is **an audio file or a YouTube video, not both** → error on `youtubeId`: "La pista es un audio o un video
  de YouTube, no los dos.". A malformed id → "Ese no es un video de YouTube.".
- Titles are **not unique**. Title 1–120, author 0–120, label ≤ 40, section text 1–2000, up to 80 sections.
- `youtubeId` is the 11-character id; the link is parsed with `src/lib/youtube.ts` (`youtube.com/watch?v=`, `youtu.be/`,
  `music.youtube.com/watch?v=`, `shorts/`). There is **no** "YouTube Music" flag (the web dropped it).
- Search is accent- and case-insensitive over title, author and section text, ordered by relevance when searching and
  by title otherwise. `limit` ≤ 100.

## Steps

1. **Migration `0003-songs.sql`**: `songs` and `song_sections` as in `platform.md` §6.3, with `search_text` (normalized
   title + author + section texts, recomputed on every write with `nameKey` from `text.ts`), `last_used_at`,
   `archived_at`, and a CHECK that `audio_id` and `youtube_id` are not both set.
2. **Repository and service** (`songs`): list (search, sort `title` | `-updatedAt`, `archived` filter, pagination),
   get, create, update (full replace of sections), delete, archive, unarchive, `markUsed`. Return `Song` and
   `SongSummary` (with `sectionCount`, `firstLine`, `audio`, `youtubeId`) as the web models.
3. **Search.** A normalized `LIKE` over `search_text` is enough for hundreds of songs. If ranking needs more, use an
   FTS5 table (available, trigram tokenizer for substring match); decide with the data and record it.
4. **Archive** (a deliberate change from the cloud version). Archiving **only sets `archived_at`**: the song leaves the
   library and keeps its track file and its lyrics. **Never delete user files because of archiving, and no automatic
   archiving.** The "Archivadas" view and "Restaurar" work as in the web.
5. **Track from a local file.** A song's `audio_id` points to a `media_assets` row with role `track`. The editor imports
   the file through the phase 03 import (role `track`, folder `Audio/`). Deleting a song does **not** delete the audio
   file unless the user chooses to (ask in the confirmation; default: keep it, orphan tracks are listed in Settings
   → Storage in phase 10).
6. **Track from YouTube.** Phase 04 parses and stores `youtube_id` and runs the oEmbed check in main
   (`src/main/services/youtube-oembed.ts`, 5 s timeout, offline → saves anyway with a warning). Playback is phase 09.
7. **Per-song background** (`background_id`): the song editor's background field (`song-background-field.tsx`),
   choosing among background assets. Applying it live is phase 06.
8. **Online lyrics lookup (optional).** Port `lyrics-search-dialog.tsx` and `src/server/lyrics.ts` (LRCLIB) as a main
   service. It only runs on demand, has a timeout, and when there is no internet shows a clear Spanish message and
   changes nothing. The rest of the editor works fully offline.
9. **UI.** Port the song editor (create/edit dialog from the Library), the track field, the YouTube badge, the
   lyrics-import helpers and the archived list. Spanish copy exactly as the web.
10. **IPC channels:** `songs:list`, `songs:get`, `songs:create`, `songs:update`, `songs:delete`, `songs:archive`,
    `songs:unarchive`, `songs:lookup-lyrics`, `youtube:check` (oEmbed). Schemas in `src/shared/schemas/songs.ts`,
    shared with the editor form.

## Acceptance

- Unit tests: song rules (lyrics-or-track, audio xor YouTube, limits), search (accents, case, relevance), archive and
  unarchive keeping files, `search_text` recomputed on update, YouTube link parsing, lyrics import helpers, oEmbed
  failure handling (timeout, offline).
- E2E: create a song with lyrics, find it by an unaccented search, edit it, archive and restore it, delete it. Create a
  song with a local track and a song with a YouTube link; the "lyrics or track" error shows.
- `pnpm check && pnpm format:check && pnpm build && pnpm test:e2e` pass.

## Out of scope

The console Library panel and drag to service (05), playback of tracks (05 for audio, 09 for YouTube), applying
backgrounds live (06).

## Deviations

- Used normalized SQLite `LIKE` to narrow candidates, then the web's title → author → lyrics ranking; FTS5 is unnecessary for this local library size.
- Ported the pure projection model and a local background thumbnail field as editor prerequisites; phase 06 supplies the complete shared canvas. YouTube track cards use a local icon until phase 09 adds the approved thumbnail/player integration.
- The archive copy explains that lyrics and tracks are retained, matching this phase's deliberate desktop behavior. Removed cloud cleanup semantics: replaced and orphaned tracks remain user-owned files.

Verification: `pnpm check`, `pnpm format:check`, `pnpm build`, `pnpm test:e2e` pass (66 unit tests, 10 Electron tests). The song lifecycle, accent-insensitive search, YouTube metadata with mocked network, local WAV import, and default track retention on deletion are covered. No real YouTube playback has been verified.
