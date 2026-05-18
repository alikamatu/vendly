// Repo-root ESLint config.
//
// Per-package configs in `apps/api/eslint.config.mjs` and the Next.js app's
// own config take precedence when files inside those packages are linted
// directly. This root config exists primarily so lint-staged (which runs
// `eslint --fix` from the repo root) has a valid config to load.

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/.husky/**",
      "**/*.d.ts",
      "**/prisma/migrations/**",
      "pnpm-lock.yaml",
    ],
  },
  {
    // Catch-all so every linted file has a matching config (and therefore
    // doesn't surface as a "File ignored because no matching configuration"
    // warning when --max-warnings 0 is enforced by lint-staged).
    files: ["**/*.{js,mjs,cjs,jsx,ts,tsx}"],
    rules: {},
  },
];
