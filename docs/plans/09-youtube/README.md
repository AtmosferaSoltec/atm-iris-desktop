# 09 · YouTube

## Goal

Saved YouTube videos that can be projected, and YouTube links as a song's track (audio from a visible player in the
console, lyrics on the projection), with the embedded player working **inside Electron**. YouTube is the only part of
the app that needs internet, and it must fail politely.

## Depends on

04, 05, 06.

## Reference (web project, read-only)

- `src/features/projection/youtube-api.ts` (IFrame API loader, `isEmbedBlocked`), the `YouTubeVideo` component in
  `projection-canvas.tsx`, `src/lib/youtube.ts` (+ test), `src/server/youtube.ts` (oEmbed check).
- `src/features/console/library/youtube-dialog.tsx`, `src/features/songs/components/track-field.tsx`,
  `youtube-badge.tsx`, `use-track-player.ts`, `use-live-console.ts` (`followVideo`, the YouTube branch of the playback
  timeline), `src/features/console/components/workspace.tsx` (media stage for YouTube, captions toggle).
- `docs/api-contract.md` §10 (YouTube track) and §16 (saved videos) in the web repo.

## Steps

1. **Spike first (a few hours; do it before anything else in this phase).** In Electron the embedded player often fails
   with **"Error 153"** (video player configuration error) when the page has no valid `Referer`/origin (the renderer
   loads from disk). Prove, with a real video, which of these works, and write the result in this README:
   - A. Add a `Referer` header (an `https` origin of our choice) to requests to `youtube.com` / `youtube-nocookie.com`
     from the session (`webRequest.onBeforeSendHeaders`).
   - B. Serve the player page from a tiny local `http://127.0.0.1:<port>` server (random port, only the player route).
   - C. Another approach found while spiking.
     Choose the **simplest that works on Windows**, document it in `platform.md`'s decisions via the _Deviations_ section
     (the user is told), and add it to `docs/manual-tests.md` (it needs a real Windows machine and internet).
2. **Migration `0008-youtube.sql`**: `youtube_videos` (`video_id` unique, `title`, `author`). Repository, service and
   channels: `youtube-videos:list`, `:get`, `:create` (dedupe by `video_id`, oEmbed gives title/author), `:delete`
   (removes its plan items). `youtube:check` (oEmbed: the video exists and can be embedded; 401/403 = cannot).
3. **Library.** The "Agregar video de YouTube" dialog (paste a link, preview title/author, save) and the YouTube rows
   and tiles, as in the web.
4. **Projecting a saved video.** Port the `youtube` content kind: the projection window plays it through the IFrame
   API, following the console timeline (`playing`, `position`, `at`); captions toggle; the console learns the duration
   and the end through `projection:video-time`. Sound comes from the projection window (the same decision as local
   videos, phase 06) unless muted.
5. **Song track from YouTube.** A visible mini player in the console plays the song's track (audio from the PC speakers)
   while the projection keeps the lyrics. Port `use-track-player.ts`; the console's player is the sound clock, as in the
   web (`followVideo` with `isSound`).
6. **Failure handling** (all in Spanish, never a crash): no internet ("Sin conexión. Los videos de YouTube necesitan
   internet."), embedding not allowed (`isEmbedBlocked` → "Este video no se puede reproducir fuera de YouTube."), video
   removed, player error. A song with a YouTube track still projects its lyrics when YouTube fails.
7. **Ads.** Some videos show YouTube ads; there is nothing to do about it. Do not try to block or skip them.

## Acceptance

- The spike result is written down with the chosen approach.
- Unit tests: link parsing (all URL forms), oEmbed handling (ok, 401/403, timeout, offline), the YouTube playback
  timeline reducer.
- E2E with the network stubbed: add a link (oEmbed mocked), see it in the Library, add it to the service; offline
  messages appear when the check fails.
- Manual on Windows with internet (in `docs/manual-tests.md`): a real video plays on the projection monitor with sound;
  a song with a YouTube track plays in the console while the lyrics show; an embed-blocked video shows the message.
- `pnpm check && pnpm format:check && pnpm build && pnpm test:e2e` pass.

## Out of scope

Downloading YouTube content (see `99-optional-downloader`), playlists, search inside YouTube.

## Deviations

### Spike result (macOS, Electron 44.9.3)

Approach A succeeded with the real YouTube API example video `M7lc1UVf-VE`: `onReady=true`, player state `1` (playing), duration `1343.661` seconds and current time `16.586849` after an 18-second observation; no failed loads were reported. Requests to the two exact YouTube host families carried `Referer: https://com.atmosfera.iris/`. The temporary profile was separate from Iris data.

Approach B was started, but closing the first window ended that standalone spike process before a usable B observation. It is not claimed as tested. A needs no local HTTP server and is selected provisionally from the macOS result. **Windows playback is not verified** and remains in `docs/manual-tests.md`; this environment cannot prove that acceptance item.

The [official IFrame API reference](https://developers.google.com/youtube/iframe_api_reference) describes error 153 as missing Referer/client identification. The [client identity guidance](https://developers.google.com/youtube/terms/required-minimum-functionality#api-client-identity-and-credentials) specifies an HTTPS app identifier for desktop clients. This supports the header choice; it does not establish Windows playback.

### Implementation deviations

- The console/display renderer retains `script-src 'self'`. The ported YouTube API runs only in a separate bundled player page inside a sandboxed iframe on the separate `iris-player://app` origin, without access to the console origin or preload IPC. The read-only scheme serves only bundled player HTML/JS/CSS in production; development forwards to the Vite server. Its own origin is retained for YouTube API postMessage replies. That page alone permits the official YouTube API script. Validated postMessage frames carry player commands/time/errors. This confines the remote-script exception required by the IFrame API and preserves the platform security boundary.
- Session headers apply only to YouTube / YouTube-nocookie requests and identify the installed app; no YouTube proxy, downloads, ads filtering or runtime updater is introduced.

Final integration spike: the same real video played through Iris's bundled `iris-player://app` page. The last five time reports advanced from `15.0569` to `17.0574` seconds with duration `1344`, and no console errors. The initial opaque sandbox did not receive YouTube readiness; retaining the separate player origin fixed API messaging. This proves macOS video/timeline operation, not audible output, HDMI or Windows behavior.

Automated coverage includes URL forms, oEmbed success/forbidden/offline/timeout, persistence/deduplication/plan cleanup, buffering clock correction/end/repeat, adding a link and offline messages, simulated player duration and the inaccessible parent/IPC boundary.
