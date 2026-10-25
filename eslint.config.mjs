import { defineConfig } from "eslint/config";
import tseslint from "@electron-toolkit/eslint-config-ts";
import eslintConfigPrettier from "@electron-toolkit/eslint-config-prettier";
import eslintPluginReact from "eslint-plugin-react";
import eslintPluginReactHooks from "eslint-plugin-react-hooks";
import eslintPluginReactRefresh from "eslint-plugin-react-refresh";

const nodeImports = [
  "electron",
  "node:*",
  "fs",
  "fs/*",
  "path",
  "os",
  "child_process",
  "crypto",
  "sqlite",
  "process",
  "util",
  "buffer",
  "stream",
  "net",
  "http",
  "https",
  "module",
  "url",
  "worker_threads",
];
const restrictedImports = (patterns) => ["error", { patterns }];

export default defineConfig(
  { ignores: ["**/node_modules", "**/dist", "**/out", "test-results/**", "playwright-report/**"] },
  tseslint.configs.recommended,
  eslintPluginReact.configs.flat.recommended,
  eslintPluginReact.configs.flat["jsx-runtime"],
  { settings: { react: { version: "detect" } } },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": eslintPluginReactHooks, "react-refresh": eslintPluginReactRefresh },
    rules: {
      ...eslintPluginReactHooks.configs.recommended.rules,
      ...eslintPluginReactRefresh.configs.vite.rules,
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
    },
  },
  {
    files: ["src/renderer/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restrictedImports([
        ...nodeImports,
        "@main",
        "@main/**",
        "@preload/**",
        "**/main/**",
        "**/preload/**",
      ]),
    },
  },
  {
    files: ["src/main/**/*.{ts,tsx}", "src/preload/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restrictedImports(["@renderer", "@renderer/**", "**/renderer/**"]),
    },
  },
  {
    files: ["src/shared/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restrictedImports([
        ...nodeImports,
        "@main",
        "@main/**",
        "@renderer",
        "@renderer/**",
        "**/main/**",
        "**/renderer/**",
        "**/preload/**",
      ]),
    },
  },
  {
    files: ["src/renderer/**/*.tsx"],
    rules: {
      // Keep inferred component signatures and shared style exports from the web port.
      "@typescript-eslint/explicit-function-return-type": "off",
      "react-refresh/only-export-components": [
        "error",
        {
          allowConstantExport: true,
          allowExportNames: [
            "TOOLS",
            "dragListener",
            "buttonStyles",
            "controlStyles",
            "describedBy",
            "floatingPanel",
            "toast",
          ],
        },
      ],
    },
  },
  eslintConfigPrettier,
);
