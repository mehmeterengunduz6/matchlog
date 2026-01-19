# Repository Guidelines

## Project Structure & Module Organization
- `src/app/` holds the Next.js App Router pages, layout, and styles. The main UI lives in `src/app/page.tsx` and is a client component.
- `src/app/api/` contains route handlers; `src/app/api/matches/route.ts` manages match creation and listing plus weekly/monthly stats, and `src/app/api/auth/[...nextauth]/route.ts` handles auth.
- `src/lib/` is server-side utilities; `src/lib/db.ts` contains Postgres queries, `src/lib/auth.ts` defines NextAuth, and `src/lib/pool.ts` holds the shared PG pool.
- `public/` is for static assets.
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
This project does not have automated tests yet. If you add tests, place them near the feature or in a top-level `tests/` directory, and document the framework and naming convention (e.g., `*.test.tsx`). Update this section with the test command(s). When you introduce tests for data access, consider using a temporary Postgres database or a test schema.

## Commit & Pull Request Guidelines
- No established commit message convention yet. Prefer a conventional format like `feat: add match logging` or `fix: validate scores`.
- PRs should include a short description, testing notes, and screenshots for UI changes. Link issues if applicable.

## Data & Configuration Tips
- Postgres is required; configure `DATABASE_URL` for both local and Vercel environments.
- Google auth requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
- Set `NEXTAUTH_SECRET` (required in production) and `NEXTAUTH_URL` for deployed environments.
- TheSportsDB fixtures use `THESPORTSDB_API_KEY` (free key `123` works for v1 endpoints).
- Database tables are defined in `db/schema.sql`; apply them before running the app locally or on a new database.
