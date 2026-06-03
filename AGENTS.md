# Repository Guidelines

## Project Structure & Module Organization

This is a TanStack Start + React + TypeScript app built with Vite. Application code lives in `src/`: routes are in `src/routes`, shared app components in `src/components/app`, reusable UI primitives in `src/components/ui`, hooks in `src/hooks`, utilities in `src/lib`, database setup in `src/db`, and server functions in `src/server-fns`. Global styling is in `src/styles.css`. The active database workflow uses Drizzle with Neon through `DATABASE_URL`. Build output in `dist/` should not be edited directly.

## Build, Test, and Development Commands

- `npm run dev`: start the local Vite development server.
- `npm run build`: create a production build.
- `npm run build:dev`: build using development mode.
- `npm run preview`: serve the built app locally for inspection.
- `npm run lint`: run ESLint across the repository.
- `npm run format`: format files with Prettier.

The repository includes both `package-lock.json` and `bun.lock`; avoid regenerating lockfiles unnecessarily.

## Coding Style & Naming Conventions

Use TypeScript and React function components. Keep route files aligned with TanStack Router conventions in `src/routes`, such as `_authenticated.dashboard.tsx` or nested files under `src/routes/_authenticated/`. Use the `@/*` alias for imports from `src` when it improves readability. Prettier is authoritative: 100 character print width, semicolons, double quotes, and trailing commas. ESLint enforces TypeScript, React Hooks, React Refresh, and Prettier rules. Do not import `server-only`; use `*.server.ts` or TanStack Start server-only patterns instead.

## Testing Guidelines

No test runner or test script is currently configured. For now, verify changes with `npm run lint` and `npm run build`. When adding tests, colocate them near covered code with names like `Component.test.tsx` or `utils.test.ts`, and add a matching `npm test` script.

## Commit & Pull Request Guidelines

Recent history uses short summaries such as `Built SprintStack MVP Phase 1`, though several commits are generic `Changes`. Prefer specific commit messages that describe the user-visible or technical change, for example `Add task drawer filtering`. Pull requests should include a concise description, linked issue or task when available, verification commands run, and screenshots or screen recordings for UI changes.

## Security & Configuration Tips

Keep secrets in `.env` and out of commits. Review `drizzle.config.ts` before changing Neon schema behavior, and review `wrangler.jsonc` before changing deployment behavior. Do not edit generated files such as `src/routeTree.gen.ts` by hand unless the router generation workflow requires it.
