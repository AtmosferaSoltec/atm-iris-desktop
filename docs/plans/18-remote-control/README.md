# Phase 18 · Remote control from the iPad

**Goal.** An iPad on the same Wi-Fi drives the live console like a TV remote: pick an element, project a slide, play or
pause the track, change the background, run the countdown, play a sound, move to the next block. The iPad stores
nothing and cannot add, remove or edit content.

**Depends on.** 05 Console, 06 Projection, 07 Tools, 08 Service timing.

**Reference.** `atm-iris-ios/docs/CONTEXTO-CONTROL-REMOTO.md` (product decisions) and `src/shared/remote/protocol.ts`
(the contract, versioned by `PROTOCOL_VERSION`).

## Decisions

- **Local network only, off by default.** Ajustes → «Control desde iPad» turns it on (remembered). It is the only place
  that opens a port. This phase is the explicit exception to the "no network" rule (AGENTS.md §11).
- **No sessions on the iPad.** Each launch asks for the six-digit code. The code is single-use, expires after 5 minutes
  and is replaced after 5 wrong tries. A session token lives in memory on both sides and is used only to reconnect
  while the iPad app stays open. Closing Iris or "Desconectar iPads" revokes every token.
- **The renderer stays the source of truth for the live state.** The console window builds a `RemoteState` and
  publishes it (`remote:publish-state`); main only relays it. Commands arrive in main, are validated with zod and are
  forwarded to the console window (`remote:command`), which runs them with the same functions the buttons use
  (`use-remote-bridge.ts`). Nothing moved to main.
- **Wire:** WebSocket on `ws://<host>:47831/remote` (falls back to a free port), JSON, 64 KB max. Discovery: Bonjour
  `_iris._tcp` (TXT `v=<protocol>`). Requests carrying an `Origin` header are refused, so a web page cannot reach it.
- **Nothing exposes a path.** The state carries ids, titles, slide text and background colors only.

## Steps (done)

1. Protocol (`src/shared/remote`), `PairingGate`, `RemoteServer`, Bonjour advertising — with unit tests.
2. IPC (`remote:*`, events `remote:changed` / `remote:command`), boot wiring, Settings panel.
3. Console bridge (`features/remote`): state builder with a "publish only when it matters" filter (a playing track
   moves on its own on the iPad), command executor.
4. E2E (`e2e/remote.spec.ts`): a WebSocket client pairs, receives the service and drives a slide.

## Acceptance

- `pnpm check`, `pnpm build` and `pnpm test:e2e` pass.
- With the switch off nothing listens; with it on, a wrong code never gets state; a command before pairing is ignored.

## Out of scope / pending

- Bible search and projection from the iPad (needs request/response messages for books, chapters and verses).
- Image and video background thumbnails (the iPad shows the gradient colors only).
- Windows firewall: the first run prompts the user; the panel explains it.

## Deviations

- Adds `ws` and `bonjour-service` as runtime dependencies (pure JavaScript, nothing downloaded at runtime).
