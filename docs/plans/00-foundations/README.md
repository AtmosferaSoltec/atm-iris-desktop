# 00 · Foundations

## Goal

Turn the electron-vite scaffold into the project skeleton: structure, tooling, security baseline and quality gates.
No product features yet. When this phase ends, every later phase can add code in the right place and be checked the
same way.

## Depends on

Nothing. The scaffold already exists (`pnpm create @quick-start/electron`, React + TypeScript).

## Reference

- [`platform.md`](platform.md) §3–5, §8, §11.
- `../../../AGENTS.md`.
- Web project: `package.json` (scripts and dependency versions), `.prettierrc`, `eslint.config.mjs`.

## Steps

1. **Git.** The repo has no git yet. Ask the user to run `git init` (you never commit). Skip if it exists.
2. **`package.json`.** Name `atm-iris-desktop`, version `0.1.0`, a real description, author `Atmosfera`; remove the
   scaffold `homepage`. Add `"packageManager"` for pnpm 11 and `"engines": { "node": ">=24" }`. Scripts per
   [`platform.md` §11](platform.md): no script may call `npm run`. `postinstall` keeps only what Electron needs
   (`install-electron`); drop `electron-builder install-app-deps` (there are no native modules).
3. **`pnpm-workspace.yaml`.** Declare which dependencies may run build scripts (electron, esbuild: allowed;
   `electron-winstaller`: not needed). `pnpm install` must finish without `ERR_PNPM_IGNORED_BUILDS`.
4. **Folders and aliases.** Create `src/main`, `src/preload`, `src/shared`, `src/renderer/src` as in `platform.md` §5
   (move the scaffold files, delete the demo: `Versions.tsx`, `electron.svg`, `wavy-lines.svg`, scaffold css).
   Aliases `@shared`, `@renderer`, `@main` in `electron.vite.config.ts` and in `tsconfig.node.json` /
   `tsconfig.web.json` (node project: main, preload, shared; web project: renderer, shared).
5. **Dependencies.**
   - Runtime: `zod`, `react-router`, `@tanstack/react-query`, `zustand`, `react-hook-form`, `@hookform/resolvers`,
     `radix-ui`, `lucide-react`, `sonner`, `clsx`, `tailwind-merge`, `@dnd-kit/core`, `@dnd-kit/sortable`,
     `@dnd-kit/utilities`, `uuid`.
   - Dev: `tailwindcss`, `@tailwindcss/vite`, `prettier-plugin-tailwindcss`, `vitest`, `@playwright/test`,
     `babel-plugin-react-compiler` (or whatever the current `@vitejs/plugin-react` docs require).
   - Use the versions the web project uses where it has them. Install fonts and the rest in phase 01.
6. **React Compiler** on in the renderer build (parity with the web, and `eslint-plugin-react-hooks` v7 already checks
   its rules). Follow the current docs of the installed `@vitejs/plugin-react`.
7. **Tailwind 4** through `@tailwindcss/vite`, with a placeholder `styles/globals.css` (`@import "tailwindcss"`).
   Tokens come in phase 01.
8. **Prettier** exactly like the web project (`printWidth: 100`, double quotes, semicolons, `prettier-plugin-tailwindcss`
   with `tailwindStylesheet` and `tailwindFunctions: ["cn"]`) and run `pnpm format` over the scaffold.
9. **ESLint.** Keep the electron-toolkit config. Add: `_`-prefixed names ignored by `no-unused-vars`; the **boundary
   rules** of `platform.md` §5 with `no-restricted-imports` per folder. Prove they work: temporarily import `electron`
   in a renderer file and check lint fails (then revert).
10. **Vitest.** `vitest.config.ts` (environment `node`, include `src/**/*.test.ts`, `@shared` / `@main` aliases). One
    real test, e.g. for `src/shared/id.ts` (UUID v7 is valid and increasing).
11. **Playwright for Electron.** `playwright.config.ts` and `e2e/helpers.ts` with a `launchApp()` that runs the built
    app (`out/main/index.js`) with `IRIS_HOME` set to a fresh temp folder and `IRIS_E2E=1`, and a smoke test: the
    console window opens and has the title "Iris". `test:e2e` builds first.
12. **Main baseline** (`src/main`):
    - `env.ts`: the only reader of `process.env` (`IRIS_HOME`, `IRIS_E2E`).
    - Single-instance lock (a second launch focuses the first). `app.setName("Iris")`;
      `app.setAppUserModelId("com.atmosfera.iris")`.
    - A console window with the secure `webPreferences` of `platform.md` §8, the CSP in `index.html`, blocked navigation
      and blocked new windows.
    - Logging to `userData/logs` (small rotating file; `electron-log` is fine), plus `uncaughtException` and
      `unhandledRejection` handlers that log and, if fatal, show a Spanish error dialog and exit cleanly.
13. **`electron-builder.yml`:** `appId: com.atmosfera.iris`, `productName: Iris`, Windows only (remove the mac, dmg and
    linux blocks and the camera/microphone permission texts). Packaging itself is phase 11.
14. **README.md** of the repo: what it is, requirements (Node 24, pnpm 11), commands, architecture in ten lines, where
    the plans are.

## Acceptance

- `pnpm dev` opens the console window; no demo content is left.
- `pnpm check`, `pnpm format:check`, `pnpm build` and `pnpm test:e2e` (the smoke test) pass.
- A renderer file importing `electron` or `node:fs`, or main importing the renderer, fails lint.
- `pnpm install` is clean (no ignored-build errors).
- The window cannot navigate away or open new windows.

## Out of scope

Any product feature, tokens and components (phase 01), the database (phase 02), packaging (phase 11).

## Deviations

None.

Verification: `pnpm check`, `pnpm format:check`, `pnpm build` and `pnpm test:e2e` pass (1 unit test, 1 Electron smoke test). ESLint probes reject `electron` and `node:fs` in renderer and renderer imports in main. Dependency installation completes without ignored-build errors. Git was initialized by the user.
