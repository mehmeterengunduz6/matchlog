# Repository Guidelines

## Project Structure & Module Organization
- `src/app/` holds the Next.js App Router pages, layout, and styles. The main UI lives in `src/app/page.tsx` and is a client component.
- `src/app/api/` contains route handlers; `src/app/api/matches/route.ts` manages match creation and listing plus weekly/monthly stats.
- `src/lib/` is server-side utilities; `src/lib/db.ts` handles JSON file storage and query helpers.
- `public/` is for static assets.
- `data/` is created locally for storage (`data/matchlog.json`) and should stay uncommitted.
If you add new features, prefer colocating UI and route handlers under `src/app/` while keeping reusable logic in `src/lib/`.

## Build, Test, and Development Commands
- `npm run dev` — start the local Next.js dev server.
- `npm run build` — create a production build.
- `npm run start` — run the production server after a build.
- `npm run lint` — run ESLint across the project.

## Coding Style & Naming Conventions
- TypeScript throughout; keep indentation at 2 spaces and avoid implicit `any`.
- Files use `kebab-case` or `lowercase` for routes, `PascalCase` for React components when separate files are introduced.
- Prefer small, focused modules in `src/lib/` for shared logic, and keep API route handlers thin.
- CSS lives in `src/app/globals.css` and uses descriptive class names (e.g., `log-item`, `panel-header`).
- Linting uses ESLint (`npm run lint`). No formatter is configured yet; keep formatting consistent with existing files.

## Testing Guidelines
This project does not have automated tests yet. If you add tests, place them near the feature or in a top-level `tests/` directory, and document the framework and naming convention (e.g., `*.test.tsx`). Update this section with the test command(s). When you introduce tests for data access, consider isolating SQLite by using a temporary database file per run.

## Commit & Pull Request Guidelines
- No established commit message convention yet. Prefer a conventional format like `feat: add match logging` or `fix: validate scores`.
- PRs should include a short description, testing notes, and screenshots for UI changes. Link issues if applicable.

## Data & Configuration Tips
- Data lives in `data/matchlog.json`; avoid committing storage files. The file auto-creates on startup via `src/lib/db.ts`.
- No environment variables are required right now. If you introduce secrets, add a `.env.example` and document required keys.
