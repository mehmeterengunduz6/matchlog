# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Matchlog is a football match tracking application consisting of:
- **Backend (Next.js)**: `/matchlog` - REST API and web authentication
- **Mobile App (React Native/Expo)**: `/matchlog-mobile` - iOS/Android app for tracking watched matches

Users sign in via Google OAuth, browse fixtures from TheSportsDB API, mark matches as watched, and sync data across devices.

---

## Repository Structure

```
matchlog/
├── matchlog/                 # Next.js backend (deployed to Vercel)
│   ├── src/
│   │   ├── app/api/         # API route handlers
│   │   │   ├── auth/        # NextAuth.js OAuth handlers
│   │   │   ├── events/      # Fetch fixtures by date
│   │   │   ├── matches/     # CRUD for user matches
│   │   │   ├── watched/     # CRUD for watched events
│   │   │   ├── preferences/ # User preferences (collapsible/hidden leagues)
│   │   │   └── mobile/      # Mobile-specific endpoints (login)
│   │   └── lib/
│   │       ├── db.ts        # PostgreSQL query functions
│   │       ├── pool.ts      # PostgreSQL connection pool
│   │       ├── auth.ts      # NextAuth.js configuration
│   │       ├── mobile-auth.ts # Bearer token validation
│   │       └── sportsdb.ts  # TheSportsDB API client
│   ├── db/migrations/       # SQL migration files
│   └── scripts/
│       └── run-migration.js # Migration runner script
│
└── matchlog-mobile/          # React Native/Expo mobile app
    ├── app/
    │   ├── (tabs)/          # Tab-based screens (file-based routing)
    │   │   ├── index.tsx    # Fixtures screen (browse & mark watched)
    │   │   └── watched.tsx  # Watched matches history
    │   └── _layout.tsx      # Root layout with navigation
    ├── lib/
    │   ├── api.ts           # API client with Bearer auth
    │   ├── matchlog.ts      # Business logic for events/stats
    │   ├── preferences.ts   # User preferences sync (collapsed/hidden leagues)
    │   └── storage.ts       # AsyncStorage constants
    └── components/          # Reusable UI components
```

---

## Development Commands

### Backend (`/matchlog`)

```bash
# Install dependencies
npm install

# Run development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Run database migration
node scripts/run-migration.js
```

**Environment Variables** (`.env.local`):
- `DATABASE_URL`: PostgreSQL connection string (Supabase pooler)
- `GOOGLE_CLIENT_ID`: Google OAuth Web client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `GOOGLE_CLIENT_ID_MOBILE`: Google OAuth client ID for Expo mobile
- `NEXTAUTH_SECRET`: NextAuth.js session encryption key
- `NEXTAUTH_URL`: App URL (production: https://matchlog-eta.vercel.app)
- `THESPORTSDB_API_KEY`: TheSportsDB API key (defaults to "123" free tier)

### Mobile App (`/matchlog-mobile`)

```bash
# Install dependencies
npm install

# Start Expo dev server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on web
npm run web

# Lint code
npm run lint
```

**Environment Variables** (`.env`):
- `EXPO_PUBLIC_API_BASE_URL`: Override backend URL (for local dev on physical device, use LAN IP like `http://192.168.1.10:3000/api`)
- `EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID`: Google OAuth Web client ID for Expo Auth Proxy

**Mobile Development Notes**:
- Uses Expo Go with Auth Proxy for Google sign-in (`https://auth.expo.io/@mehmeterengunduz6/matchlog-app`)
- Mobile app connects to backend API (defaults to production, override with `EXPO_PUBLIC_API_BASE_URL`)
- File-based routing via Expo Router (tabs in `/app/(tabs)/`)

---

## Architecture Deep Dive

### Authentication Flow

**Web (NextAuth.js)**:
1. User clicks "Sign in with Google"
2. NextAuth.js handles OAuth flow → creates session in PostgreSQL
3. Session cookie tracks authenticated user

**Mobile (Bearer Tokens)**:
1. User authenticates via Expo Auth Proxy → receives Google ID token
2. Mobile app sends ID token to `/api/mobile/login`
3. Backend validates with `google-auth-library`, creates session, returns `sessionToken`
4. Mobile stores token in AsyncStorage, sends as `Authorization: Bearer <token>` header
5. Backend validates via `getUserIdFromRequest()` in `mobile-auth.ts` (checks `sessions` table)

### Database Architecture

**Provider**: Supabase PostgreSQL (connection pooler via `pg` library)

**Tables** (managed by NextAuth.js `@auth/pg-adapter`):
- `users`: User accounts (id, name, email, image)
- `sessions`: Active sessions (sessionToken, userId, expires)
- `accounts`: OAuth provider data (Google)
- `verification_tokens`: Email verification (unused)

**Custom Tables**:
- `matches`: User-created match records (manual entry)
- `watched_events`: Watched fixtures from TheSportsDB
- `user_preferences`: JSONB preferences (collapsedLeagues, hiddenLeagues, leagueOrder)

**Database Layer** (`src/lib/db.ts`):
- Functions use raw SQL with `pg` Pool
- All queries use parameterized statements (`$1`, `$2`, etc.)
- Returns camelCase objects (aliased in SELECT)
- Examples: `createMatch()`, `listWatchedEvents()`, `getUserPreferences()`

### API Architecture

**Convention**: Route handlers in `/src/app/api/<endpoint>/route.ts` export `GET`, `POST`, `PUT`, `DELETE` functions.

**Authentication**:
- Web endpoints: Use `getServerSession(authOptions)` from NextAuth.js
- Mobile endpoints: Use `getUserIdFromRequest(request)` from `mobile-auth.ts`
- Returns `401 Unauthorized` if not authenticated

**Key Endpoints**:
- `GET /api/events?date=YYYY-MM-DD`: Fetch fixtures for date (from TheSportsDB + user's watched IDs)
- `POST /api/watched`: Mark event as watched
- `DELETE /api/watched?eventId=<id>`: Unmark event
- `GET/PUT /api/preferences`: Fetch/update user preferences (JSONB partial updates)
- `POST /api/mobile/login`: Exchange Google ID token for session token

### TheSportsDB Integration

**File**: `src/lib/sportsdb.ts`

**Featured Leagues** (hardcoded in `FEATURED_LEAGUES`):
- Premier League (4328)
- La Liga (4335)
- Serie A (4332)
- Bundesliga (4331)
- Ligue 1 (4334)
- Super Lig (4339)
- Champions League (4480)

**Caching**:
- In-memory cache with 5-minute TTL
- Fetches all leagues in parallel for a given date
- Next.js uses `fetch()` with `revalidate: 300` (5 min cache)

**API**: `https://www.thesportsdb.com/api/v1/json/<key>/eventsday.php?d=<date>&l=<league>&s=Soccer`

### Mobile State Management

**No global state library** - uses React hooks:
- `useState` for local component state
- `useCallback` for memoized functions
- `useFocusEffect` from React Navigation to reload on tab focus

**Caching Strategy**:
- **API responses**: In-memory Map cache in components (e.g., fixtures by date)
- **User preferences**: AsyncStorage cache + backend sync
  - Load from AsyncStorage immediately (instant UI)
  - Fetch from backend and update cache
  - Optimistic updates: UI changes first, rollback on API error

**Key Components**:
- `app/(tabs)/index.tsx`: Fixtures screen with collapsible leagues, date picker, watched toggle
- `app/(tabs)/watched.tsx`: Watched matches history with stats/insights
- `lib/preferences.ts`: Preferences sync layer (cache-first with backend persistence)

### User Preferences System

**Storage**: PostgreSQL `user_preferences.preferences` (JSONB column)

**Preference Types**:
```typescript
{
  collapsedLeagues: string[];  // League IDs collapsed in UI
  hiddenLeagues: string[];     // League IDs hidden from view
  leagueOrder: string[];       // Custom league display order
}
```

**Sync Flow**:
1. Mobile app loads cached preferences from AsyncStorage (instant)
2. Fetches fresh preferences from backend
3. User changes preference → optimistic UI update
4. API call updates backend (JSONB merge via `||` operator)
5. Backend response updates AsyncStorage cache
6. On error: rollback UI to previous state

**API**:
- `GET /api/preferences`: Returns full preferences object
- `PUT /api/preferences`: Partial update (merges with existing)

---

## Database Migrations

**Location**: `/matchlog/db/migrations/`

**Running Migrations**:
```bash
cd matchlog
node scripts/run-migration.js
```

**Migration Script** (`scripts/run-migration.js`):
- Reads `DATABASE_URL` from `.env.local`
- Executes SQL files in `/db/migrations/`
- Currently runs single migration (001_add_user_preferences.sql)

**Production Migrations**:
1. Option A: Run script with production env vars
2. Option B: Execute SQL directly in Supabase SQL Editor

**Migration Naming**: `<number>_<description>.sql` (e.g., `001_add_user_preferences.sql`)

---

## Deployment

**Backend**: Auto-deploys to Vercel on `git push` to `master`
- Vercel reads env vars from dashboard (set in project settings)
- After code changes that add migrations, manually run migration on production DB
- Production URL: https://matchlog-eta.vercel.app

**Mobile**: Not auto-deployed
- Developers run locally via Expo Go
- For production: Build with `eas build` (Expo Application Services)

### Important Deployment Workflow

**CRITICAL**: When making backend changes (features, fixes, API changes):
1. Make your changes in `/matchlog` directory
2. Test locally with `npm run dev`
3. Commit changes from `/matchlog` directory:
   ```bash
   cd /Users/erengunduz/Desktop/matchlog/matchlog
   git add .
   git commit -m "Description of changes

   Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
   git push origin master
   ```
4. Vercel will auto-deploy within 1-2 minutes
5. If migration was added, run it on production DB (see Database Migrations section)
6. Test the deployed changes at https://matchlog-eta.vercel.app

**Why this matters**: The user tests the mobile app against the production backend. Backend changes won't be available for testing until pushed to git and deployed by Vercel. Always push backend changes before moving to the next task.

---

## Key Design Patterns

### API Error Handling
All API route handlers return JSON errors:
```typescript
if (!userId) {
  return Response.json({ error: "Unauthorized." }, { status: 401 });
}
```

Mobile client wraps in try/catch:
```typescript
try {
  await fetchJson('/endpoint');
} catch (err) {
  if (err instanceof AuthError) {
    await handleAuthError(); // Clear session, redirect to login
  }
}
```

### Database Query Pattern
```typescript
export async function listMatches(userId: string) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT id, user_id as "userId", date, home_team as "homeTeam"
     FROM matches WHERE user_id = $1`,
    [userId]
  );
  return result.rows;
}
```
- Use `getPool()` for singleton connection
- Parameterized queries prevent SQL injection
- Alias `snake_case` to `camelCase` in SELECT

### Mobile API Client Pattern
```typescript
// lib/api.ts provides authenticated fetch wrapper
export async function fetchJson(path: string, options?: RequestInit) {
  const token = await getSessionToken();
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (res.status === 401) throw new AuthError();
  return res.json();
}
```

---

## Common Workflows

### Adding a New API Endpoint

1. Create route handler: `/matchlog/src/app/api/<endpoint>/route.ts`
```typescript
import { getUserIdFromRequest } from '@/lib/mobile-auth';

export async function GET(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  // ... implementation
  return Response.json({ data });
}
```

2. Add database function in `/matchlog/src/lib/db.ts` (if needed)
3. Add mobile client function in `/matchlog-mobile/lib/<module>.ts`
4. Deploy backend (git push), test from mobile app

### Adding a Database Migration

1. Create SQL file: `/matchlog/db/migrations/<number>_<description>.sql`
2. Run locally: `node scripts/run-migration.js`
3. Commit migration file
4. After deploy, run on production DB (via script or Supabase SQL Editor)

### Adding a New Mobile Screen

1. Create file in `/matchlog-mobile/app/(tabs)/<name>.tsx`
2. Export default React component
3. Expo Router auto-registers route
4. Add tab config in `app/_layout.tsx` if needed

---

## Testing the Application

### Backend Testing
```bash
# Test GET preferences (replace <token> with session token)
curl -X GET https://matchlog-eta.vercel.app/api/preferences \
  -H "Authorization: Bearer <token>"

# Test PUT preferences
curl -X PUT https://matchlog-eta.vercel.app/api/preferences \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"collapsedLeagues":["4328"]}'
```

### Mobile Testing
1. Start backend: `cd matchlog && npm run dev`
2. Start mobile: `cd matchlog-mobile && npm start`
3. Scan QR code with Expo Go app
4. Sign in with Google to test full flow

**Testing on Physical Device** (same LAN):
- Set `EXPO_PUBLIC_API_BASE_URL=http://<YOUR_IP>:3000/api` in mobile `.env`
- Ensure backend runs on all interfaces (Next.js does by default)

---

## Important Notes

### Google OAuth Setup
- **Web client**: Used for NextAuth.js web login + Expo mobile (ID token validation)
- **Redirect URIs**:
  - Web: `https://matchlog-eta.vercel.app/api/auth/callback/google`
  - Mobile: `https://auth.expo.io/@mehmeterengunduz6/matchlog-app`
- Mobile uses Expo Auth Proxy to work with Expo Go (no native OAuth)

### Database Connection
- Uses **Supabase connection pooler** (port 6543, not 5432)
- Connection string format: `postgresql://postgres.<ref>:<password>@aws-1-eu-central-1.pooler.supabase.com:6543/postgres`
- Pool singleton prevents connection exhaustion in serverless (Next.js)

### TheSportsDB API
- Free tier: API key "123" with limited features
- Paid tier: Get key from https://www.thesportsdb.com/api.php
- Rate limits unknown (caching mitigates)

### Mobile Caching Strategy
- **Fixtures**: Cached in component state (Map), force refresh via pull-to-refresh
- **Preferences**: AsyncStorage cache (instant load), backend sync on app start
- **Sessions**: AsyncStorage stores Bearer token, validated on each API call

---

## File Naming Conventions

- **Backend**: `kebab-case.ts` for files, `camelCase` for functions/variables
- **Mobile**: `kebab-case.tsx` for components, `camelCase` for functions/variables
- **API routes**: Next.js convention `route.ts` (folder name = endpoint)
- **Database**: `snake_case` for columns, aliased to `camelCase` in queries

---

## Changelog Reference

See `/DEVELOPMENT_LOG.md` for detailed development log including:
- 2026-02-01: Collapsible & hidden leagues with persistent preferences
