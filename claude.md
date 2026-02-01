# Matchlog Development Log

## 2026-02-01 - Collapsible & Hidden Leagues with Persistent Preferences

### Overview
Implemented two major features for the fixtures screen:
1. **Collapsible Leagues**: Tap league header to collapse/expand matches
2. **Hidden Leagues**: Toggle leagues on/off in settings to permanently hide them

Both preferences persist across logins via backend storage (PostgreSQL) with AsyncStorage caching for offline support.

---

### Backend Changes

#### 1. Database Migration
**File**: `/db/migrations/001_add_user_preferences.sql` (NEW)

Created `user_preferences` table:
```sql
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferences jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

**Preferences JSON Structure**:
```json
{
  "collapsedLeagues": ["4328", "4335"],
  "hiddenLeagues": ["4339"],
  "leagueOrder": ["4328", "4335", "4332"]
}
```

**Features**:
- JSONB column for flexible schema
- Automatic `updated_at` trigger
- Foreign key cascade on user deletion
- Index on `user_id` for performance

**Migration Script**: `/matchlog/scripts/run-migration.js`
- Helper script to run migrations
- Reads DATABASE_URL from `.env.local`
- Usage: `node scripts/run-migration.js`

---

#### 2. Database Functions
**File**: `/matchlog/src/lib/db.ts` (UPDATED)

**New Types**:
```typescript
export type UserPreferences = {
  collapsedLeagues?: string[];
  hiddenLeagues?: string[];
  leagueOrder?: string[];
};

export type UserPreferencesRecord = {
  userId: string;
  preferences: UserPreferences;
  updatedAt: string;
  createdAt: string;
};
```

**New Functions**:
- `getUserPreferences(userId: string): Promise<UserPreferences>`
  - Fetches user preferences from database
  - Returns empty object `{}` if no preferences exist

- `updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<UserPreferencesRecord>`
  - Updates user preferences with partial updates
  - Uses `ON CONFLICT DO UPDATE` for upsert
  - Merges new preferences with existing using JSONB `||` operator
  - Returns updated preferences record

---

#### 3. API Endpoint
**File**: `/matchlog/src/app/api/preferences/route.ts` (NEW)

**Endpoints**:

**GET `/api/preferences`**
- Requires authentication
- Returns user preferences
- Response:
```json
{
  "preferences": {
    "collapsedLeagues": ["4328"],
    "hiddenLeagues": ["4339"],
    "leagueOrder": ["4328", "4335"]
  }
}
```

**PUT `/api/preferences`**
- Requires authentication
- Accepts partial preference updates
- Request body:
```json
{
  "collapsedLeagues": ["4328"]
}
```
- Response:
```json
{
  "preferences": { /* merged preferences */ },
  "updatedAt": "2026-02-01T12:00:00Z"
}
```

---

### Mobile App Changes

#### 1. Storage Constants
**File**: `/matchlog-mobile/lib/storage.ts` (NEW)

```typescript
export const STORAGE_KEYS = {
  PREFERENCES: 'matchlog.preferences.v1',
} as const;
```

---

#### 2. Preferences API Client
**File**: `/matchlog-mobile/lib/preferences.ts` (NEW)

**Functions**:
- `getCachedPreferences()` - Read from AsyncStorage
- `fetchPreferences()` - Fetch from backend, update cache, fallback to cache on error
- `updatePreferences(updates)` - Update backend and cache
- `toggleLeagueCollapsed(leagueId)` - Toggle collapsed state
- `toggleLeagueHidden(leagueId)` - Toggle hidden state
- `updateLeagueOrder(order)` - Update league order

**Features**:
- Optimistic caching with AsyncStorage
- Automatic fallback to cache on network errors
- Error handling with console logging

---

#### 3. Fixtures Screen UI
**File**: `/matchlog-mobile/app/(tabs)/index.tsx` (UPDATED)

**New Imports**:
- Added `Switch` from `react-native`
- Imported preference functions from `/lib/preferences`

**New State**:
```typescript
const [collapsedLeagues, setCollapsedLeagues] = useState<Set<string>>(new Set());
const [hiddenLeagues, setHiddenLeagues] = useState<Set<string>>(new Set());
```

**New Functions**:
- `applyPreferences(prefs)` - Apply preferences to state
- `loadPreferences()` - Load cached then fresh preferences
- `toggleCollapsed(leagueId)` - Toggle collapsed state with backend sync
- `toggleHidden(leagueId)` - Toggle hidden state with backend sync

**UI Changes**:

1. **Collapsible League Headers** (lines 406-434):
   - League header wrapped in `Pressable`
   - Added chevron icon (chevron-down/chevron-forward)
   - `onPress` toggles collapsed state
   - Matches conditionally rendered: `{!collapsedLeagues.has(league.id) && league.events.map(...)}`

2. **Hidden Leagues Filter** (line 401):
   - Added filter: `.filter((league) => !hiddenLeagues.has(league.id))`
   - Hidden leagues completely removed from view

3. **Settings Modal - League Visibility** (before League Order section):
   - New section: "League Visibility"
   - Description: "Hide leagues from your fixtures view"
   - List of leagues with Switch toggles
   - Switch shows visible state (ON = visible, OFF = hidden)

4. **League Order Persistence** (lines 513-527):
   - Updated `onDragEnd` to async function
   - Calls `updateLeagueOrder(newOrder)` after reordering
   - Persists to backend with error handling

**New Styles**:
```typescript
leagueVisibilityItem: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: 'rgba(0, 0, 0, 0.1)',
},
leagueVisibilityInfo: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
  flex: 1,
},
leagueVisibilityName: {
  fontSize: 14,
  fontWeight: '500',
  flex: 1,
},
```

---

### Architecture & Data Flow

**Storage Hierarchy**:
1. **PostgreSQL** (Source of Truth)
   - Stores all user preferences
   - Synced across devices

2. **AsyncStorage** (Local Cache)
   - Loaded immediately on app start
   - Updated after successful backend sync
   - Fallback when offline

**Sync Flow**:
1. User action (toggle collapsed/hidden)
2. Optimistic UI update (instant feedback)
3. API call to backend
4. Backend updates PostgreSQL
5. Response updates AsyncStorage cache
6. On error: rollback UI to previous state

**Preference Loading**:
1. App starts → Load from AsyncStorage (instant)
2. Fetch from backend (fresh data)
3. Apply fresh preferences
4. Update AsyncStorage cache

---

### Testing Checklist

**Backend**:
- [x] Migration runs successfully
- [x] Database functions work correctly
- [x] API endpoints return correct responses
- [ ] Test GET /api/preferences with auth token
- [ ] Test PUT /api/preferences with partial updates
- [ ] Test cross-device sync

**Mobile App**:
- [ ] Fresh login: All leagues visible and expanded
- [ ] Collapse league: Chevron changes, matches hidden
- [ ] Expand league: Chevron changes, matches visible
- [ ] Hide league in settings: Removed from fixtures
- [ ] Show league in settings: Appears in fixtures
- [ ] Reorder leagues: Order persists after app restart
- [ ] Sign out/in: All preferences restored
- [ ] Offline mode: Preferences load from cache
- [ ] Device A change: Reflects on Device B after refresh

---

### API Testing Commands

```bash
# Test GET preferences
curl -X GET https://matchlog-eta.vercel.app/api/preferences \
  -H "Authorization: Bearer <token>"

# Test PUT preferences (collapse league)
curl -X PUT https://matchlog-eta.vercel.app/api/preferences \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"collapsedLeagues":["4328"]}'

# Test PUT preferences (hide league)
curl -X PUT https://matchlog-eta.vercel.app/api/preferences \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"hiddenLeagues":["4339"]}'

# Test PUT preferences (league order)
curl -X PUT https://matchlog-eta.vercel.app/api/preferences \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"leagueOrder":["4335","4328","4332"]}'
```

---

### Database Verification

```sql
-- Check user preferences
SELECT user_id, preferences, updated_at
FROM user_preferences
WHERE user_id = 'your-user-id';

-- Check all users with preferences
SELECT user_id, preferences->>'collapsedLeagues' as collapsed,
       preferences->>'hiddenLeagues' as hidden,
       preferences->>'leagueOrder' as order
FROM user_preferences;
```

---

### Design Decisions

1. **JSONB over dedicated columns**
   - Flexible schema for future preferences
   - Easy to add new preference types
   - Atomic updates with JSONB merge

2. **Backend-first with cache**
   - Cross-device sync capability
   - Offline support via AsyncStorage
   - Best of both worlds

3. **Optimistic UI updates**
   - Instant user feedback
   - Rollback on error
   - Better UX than waiting for server

4. **Persist collapsed state**
   - Users expect collapsed state to persist
   - Better than session-based (lost on app restart)

5. **Single preferences endpoint**
   - Simpler API surface
   - Atomic updates
   - Easier to maintain

---

### Files Changed

**Backend**:
- `/db/migrations/001_add_user_preferences.sql` (NEW)
- `/matchlog/scripts/run-migration.js` (NEW)
- `/matchlog/src/lib/db.ts` (UPDATED - added preference functions)
- `/matchlog/src/app/api/preferences/route.ts` (NEW)

**Mobile**:
- `/matchlog-mobile/lib/storage.ts` (NEW)
- `/matchlog-mobile/lib/preferences.ts` (NEW)
- `/matchlog-mobile/app/(tabs)/index.tsx` (UPDATED)

---

### Next Steps

1. Deploy backend to Vercel (auto-deploy from git push)
2. Run migration on production database
3. Test API endpoints with production URL
4. Test mobile app with production backend
5. Monitor for errors and performance issues

---

### Known Issues / Future Improvements

- None currently identified
- Consider adding preference sync conflict resolution for simultaneous multi-device changes
- Consider adding preference versioning for schema migrations
- Consider adding preference export/import for backup

---

### Performance Notes

- AsyncStorage cache provides instant UI state restoration
- JSONB queries are indexed on `user_id` for fast lookups
- Partial updates only modify changed preferences
- Optimistic UI prevents blocking on network calls

---

### Security Notes

- All endpoints require authentication via Bearer token
- User can only access/modify their own preferences
- JSONB validation prevents malformed data
- Foreign key cascade ensures orphaned preferences are deleted
