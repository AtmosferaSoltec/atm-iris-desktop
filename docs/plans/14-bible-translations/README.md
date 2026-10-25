# 14 · Multiple local Bible translations

## Goal

At the user's request, move Bible import to Settings, rename the canonical order to «Tradicional», and keep multiple imported translations available in the projection picker.

## Depends on

10, 12.

## Reference

The existing Bible picker ports the web console. Keep its book/chapter/verse navigation, quick references, typography and projection behavior.

## Steps

1. Migration 0011 preserves the already imported RVR1960 text/attribution and introduces translation metadata plus verses keyed by translation/book/chapter/verse.
2. Accept named translations in the existing complete, 66-book XML format. Retain attribution, size limits, DTD/entity refusal and atomic replacement. Reimport updates only the matching translation.
3. Add validated translation selection IPC and persist the chosen code. Chapter requests and query cache keys include the translation.
4. Add Settings → Biblias with the generic «Importar Biblia» action and the imported translation list. Remove import actions from the projection picker; an empty picker points to Settings.
5. Show «Tradicional» / «A–Z». Show the translation selector beside those controls only when multiple translations exist; otherwise show the sole translation name.
6. Project text and reference labels from the chosen translation without changing the live passage just by switching the picker.

## Acceptance

- Unit tests cover migration preservation, three independent translations, selection persistence, isolated reimport, malformed XML rejection and version names/attribution.
- Electron tests cover Settings import, no import action in the picker, single-version selector hidden, traditional/testament and alphabetical ordering, switching and projecting three translations, and selection retained after app restart.
- Run `pnpm check && pnpm format:check && pnpm build && pnpm test:e2e` with temporary homes.

## Out of scope

Bundled/downloaded Bible text, proprietary `.bib` parsing, other XML schemas, non-66-book canons and remote Bible services.

## Deviations

- This explicit user request supersedes phase 12's RVR1960-only scope. The existing XML schema is generalized by its translation attribute; other file layouts still require a separate importer.
- Known RVR1960, RVR1909 and NVI names use stable codes. Other translation names retain their original display name and use a deterministic identifier. Known aliases share their canonical code; otherwise the normalized translation name determines identity. Reimport replaces only the matching translation.
- Existing projection remains unchanged until the operator projects the newly selected passage. Verse caches include the translation to prevent mixing editions.

Verification: `pnpm check` (127 unit tests), `pnpm format:check`, `pnpm build` and `pnpm test:e2e` (21 passed, 0 failed) pass. Tests use temporary Iris homes and synthetic translations. Windows/HDMI and real files for additional translations remain unverified; see `docs/manual-tests.md`.
