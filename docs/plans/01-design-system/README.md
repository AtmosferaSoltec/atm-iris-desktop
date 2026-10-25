# 01 · Design system and shell

## Goal

Bring the Iris look to the desktop app exactly as the web has it: tokens, fonts, the `ui` components, brand pieces, the
router and the app layout. After this phase a feature can be built by composing existing components.

## Depends on

0.

## Reference (web project, read-only)

- `src/app/globals.css` (tokens: colors, fonts, radii, sizes, motion, shadows; dark only by design).
- `src/components/ui/*` (27 components), `src/components/brand/*`, `src/components/service/*`,
  `src/components/projection/slide-preview.tsx`, `src/lib/cn.ts`.
- `src/app/layout.tsx` (fonts and providers), `src/app/(app)/layout.tsx` (secondary pages layout).
- `src/features/projection/fonts.ts`, `src/domain/projection-fonts.ts` (projection typefaces).
- `IRIS_SPEC.md` §3–5 (visual direction, tokens, base components) and §12 (desktop adaptation).

## Steps

1. **Tokens.** Copy `globals.css` verbatim into `src/renderer/src/styles/globals.css` (same names, same values); only
   change what depends on Next (`next/font` variables become plain CSS variables set by the font imports below).
2. **Fonts, offline.** The app has no internet, so no Google Fonts at runtime. Install the typefaces as packages and
   import them once in `main.tsx`: Inter and Newsreader (the UI) and the projection typefaces listed in
   `projection-fonts.ts` (Montserrat, Poppins, Oswald, Bebas Neue, Playfair Display, Lora, Merriweather) through the
   `@fontsource` packages. Keep the same font keys and CSS stacks as `features/projection/model.ts` (`fontStack`).
3. **Components.** Port `components/ui/*`, `components/brand/*`, `components/service/*` and
   `components/projection/slide-preview.tsx` to `src/renderer/src/components/...` keeping names and public props. Adapt
   only what is Next-specific: `next/link` → router `Link`, `Route` types → plain strings, `"use client"` removed.
   `dialog.tsx` keeps its API (`open`, `onClose`, `title`, `description`, `footer`, `size`, `actionsRef`).
4. **Providers** (`app.tsx`): `QueryClientProvider` (the client from phase 02 can be a stub now), `TooltipProvider`,
   `Toaster`, the router.
5. **Router** (`router.tsx`) with `createHashRouter`. Routes: `/` (console, placeholder), `/times`, `/settings`
   (placeholders), `/display` (projection, **no shell**), `*` (not found, Spanish). The window title is "Iris".
6. **Layouts.** `AppLayout` for the secondary pages (`/times`, `/settings`): header with "Volver al servicio" and the
   Iris wordmark, as in the web `(app)/layout.tsx`. The console and the projection use no shell.
7. **Messages.** Create the pattern for Spanish texts: `features/<feature>/messages.ts` for enum labels. Nothing is
   translated inline when it is a label of a known value.
8. **Dev-only gallery.** A route `/_design` (only when `import.meta.env.DEV`) that renders every `ui` component in its
   states, so the look can be checked by eye. Excluded from production builds.
9. **Utilities.** `src/renderer/src/lib/cn.ts`, and `lib/search-params.ts` with the parsers the web has
   (`page`, `search`, `kind`…) rebuilt on router search params (a `useSearchParamState(key, parser)` hook).

## Acceptance

- The gallery shows all components with the web's look; colors and sizes come only from tokens (grep for loose hex
  values in `components/` finds none).
- Projection typefaces render offline (disconnect the network and check each key in the gallery).
- `#/display` renders without the app shell; `#/settings` shows the layout with a working "Volver al servicio".
- Unit tests: `cn`, `fontStack`/font keys, the search-params parsers.
- `pnpm check && pnpm format:check && pnpm build` pass.

## Out of scope

Feature screens, data, windows.

## Deviations

- Ported `format.ts` and `zoned-time.ts` alongside `text.ts` because the web's text tests depend on them; their existing format tests were ported together.
- Renderer TSX permits inferred return types and the web UI's shared style/toast exports in ESLint, preserving public APIs while keeping process boundaries and React Compiler checks enabled.

Verification: `pnpm check`, `pnpm format:check`, `pnpm build`, `pnpm test:e2e` pass (19 unit tests, 3 Electron tests). The bundled fonts load with HTTP requests blocked; settings and times return to the console; display has no secondary-page shell; the design gallery route is absent from production.
