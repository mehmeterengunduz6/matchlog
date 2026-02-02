import { getPool } from "@/lib/pool";

export type MatchRecord = {
  id: number;
  userId: string;
  date: string;
  time: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  createdAt: string;
};

export type WatchedEvent = {
  id: number;
  userId: string;
  eventId: string;
  leagueId: string;
  leagueName: string;
  date: string;
  time: string | null;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  createdAt: string;
};

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfWeek(date: Date) {
  const day = date.getDay();
  const diff = (day + 6) % 7;
  const start = new Date(date);
  start.setDate(date.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

export async function createMatch(
  userId: string,
  input: Omit<MatchRecord, "id" | "createdAt" | "userId">
) {
  const pool = getPool();
  const result = await pool.query(
    `
      INSERT INTO matches
        (user_id, date, time, league, home_team, away_team, home_score, away_score)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING
        id,
        user_id as "userId",
        date,
        time,
        league,
        home_team as "homeTeam",
        away_team as "awayTeam",
        home_score as "homeScore",
        away_score as "awayScore",
        created_at as "createdAt"
    `,
    [
      userId,
      input.date,
      input.time,
      input.league,
      input.homeTeam,
      input.awayTeam,
      input.homeScore,
      input.awayScore,
    ]
  );
  return result.rows[0];
}

export async function listMatches(userId: string) {
  const pool = getPool();
  const result = await pool.query(
    `
      SELECT
        id,
        user_id as "userId",
        date,
        time,
        league,
        home_team as "homeTeam",
        away_team as "awayTeam",
        home_score as "homeScore",
        away_score as "awayScore",
        created_at as "createdAt"
      FROM matches
      WHERE user_id = $1
      ORDER BY date DESC, time DESC, id DESC
    `,
    [userId]
  );
  return result.rows;
}

export async function updateMatch(
  userId: string,
  id: number,
  input: Omit<MatchRecord, "id" | "createdAt" | "userId">
) {
  const pool = getPool();
  const result = await pool.query(
    `
      UPDATE matches
      SET
        date = $1,
        time = $2,
        league = $3,
        home_team = $4,
        away_team = $5,
        home_score = $6,
        away_score = $7
      WHERE id = $8 AND user_id = $9
      RETURNING
        id,
        user_id as "userId",
        date,
        time,
        league,
        home_team as "homeTeam",
        away_team as "awayTeam",
        home_score as "homeScore",
        away_score as "awayScore",
        created_at as "createdAt"
    `,
    [
      input.date,
      input.time,
      input.league,
      input.homeTeam,
      input.awayTeam,
      input.homeScore,
      input.awayScore,
      id,
      userId,
    ]
  );
  return result.rows[0] ?? null;
}

export async function getStats(userId: string) {
  const pool = getPool();
  const now = new Date();
  const weekStart = formatDate(startOfWeek(now));
  const monthStart = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
  const weekResult = await pool.query(
    `SELECT COUNT(*)::text as count FROM matches WHERE user_id = $1 AND date >= $2`,
    [userId, weekStart]
  );
  const monthResult = await pool.query(
    `SELECT COUNT(*)::text as count FROM matches WHERE user_id = $1 AND date >= $2`,
    [userId, monthStart]
  );
  const totalResult = await pool.query(
    `SELECT COUNT(*)::text as count FROM matches WHERE user_id = $1`,
    [userId]
  );

  return {
    weekCount: Number(weekResult.rows[0]?.count ?? 0),
    monthCount: Number(monthResult.rows[0]?.count ?? 0),
    totalCount: Number(totalResult.rows[0]?.count ?? 0),
  };
}

export async function listWatchedEventIds(userId: string, date: string) {
  const pool = getPool();
  const result = await pool.query(
    `
      SELECT event_id as "eventId"
      FROM watched_events
      WHERE user_id = $1 AND date = $2
    `,
    [userId, date]
  );
  return result.rows.map((row: { eventId: string }) => row.eventId);
}

export async function addWatchedEvent(
  userId: string,
  input: Omit<WatchedEvent, "id" | "createdAt" | "userId">
) {
  const pool = getPool();
  const result = await pool.query(
    `
      INSERT INTO watched_events
        (user_id, event_id, league_id, league_name, date, time, home_team, away_team, home_score, away_score)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (user_id, event_id)
      DO UPDATE SET
        league_id = EXCLUDED.league_id,
        league_name = EXCLUDED.league_name,
        date = EXCLUDED.date,
        time = EXCLUDED.time,
        home_team = EXCLUDED.home_team,
        away_team = EXCLUDED.away_team,
        home_score = EXCLUDED.home_score,
        away_score = EXCLUDED.away_score
      RETURNING
        id,
        user_id as "userId",
        event_id as "eventId",
        league_id as "leagueId",
        league_name as "leagueName",
        date,
        time,
        home_team as "homeTeam",
        away_team as "awayTeam",
        home_score as "homeScore",
        away_score as "awayScore",
        created_at as "createdAt"
    `,
    [
      userId,
      input.eventId,
      input.leagueId,
      input.leagueName,
      input.date,
      input.time,
      input.homeTeam,
      input.awayTeam,
      input.homeScore,
      input.awayScore,
    ]
  );
  return result.rows[0] as WatchedEvent;
}

export async function removeWatchedEvent(userId: string, eventId: string) {
  const pool = getPool();
  await pool.query(
    `DELETE FROM watched_events WHERE user_id = $1 AND event_id = $2`,
    [userId, eventId]
  );
}

export async function getWatchedStats(userId: string) {
  const pool = getPool();
  const now = new Date();
  const weekStart = formatDate(startOfWeek(now));
  const monthStart = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
  const weekResult = await pool.query(
    `SELECT COUNT(*)::text as count FROM watched_events WHERE user_id = $1 AND date >= $2`,
    [userId, weekStart]
  );
  const monthResult = await pool.query(
    `SELECT COUNT(*)::text as count FROM watched_events WHERE user_id = $1 AND date >= $2`,
    [userId, monthStart]
  );
  const totalResult = await pool.query(
    `SELECT COUNT(*)::text as count FROM watched_events WHERE user_id = $1`,
    [userId]
  );

  return {
    weekCount: Number(weekResult.rows[0]?.count ?? 0),
    monthCount: Number(monthResult.rows[0]?.count ?? 0),
    totalCount: Number(totalResult.rows[0]?.count ?? 0),
  };
}

export async function listWatchedEvents(userId: string) {
  const pool = getPool();
  const result = await pool.query(
    `
      SELECT
        id,
        user_id as "userId",
        event_id as "eventId",
        league_id as "leagueId",
        league_name as "leagueName",
        date,
        time,
        home_team as "homeTeam",
        away_team as "awayTeam",
        home_score as "homeScore",
        away_score as "awayScore",
        created_at as "createdAt"
      FROM watched_events
      WHERE user_id = $1
      ORDER BY date DESC, time DESC, id DESC
    `,
    [userId]
  );
  return result.rows as WatchedEvent[];
}

export type UserPreferences = {
  collapsedLeagues?: string[];
  hiddenLeagues?: string[];
  leagueOrder?: string[];
  favoriteTeams?: string[];
};

export type UserPreferencesRecord = {
  userId: string;
  preferences: UserPreferences;
  updatedAt: string;
  createdAt: string;
};

export async function getUserPreferences(
  userId: string
): Promise<UserPreferences> {
  const pool = getPool();
  const result = await pool.query(
    `
      SELECT preferences
      FROM user_preferences
      WHERE user_id = $1
    `,
    [userId]
  );
  return (result.rows[0]?.preferences as UserPreferences) ?? {};
}

export async function updateUserPreferences(
  userId: string,
  preferences: Partial<UserPreferences>
): Promise<UserPreferencesRecord> {
  const pool = getPool();
  const result = await pool.query(
    `
      INSERT INTO user_preferences (user_id, preferences)
      VALUES ($1, $2)
      ON CONFLICT (user_id)
      DO UPDATE SET
        preferences = user_preferences.preferences || EXCLUDED.preferences,
        updated_at = now()
      RETURNING
        user_id as "userId",
        preferences,
        updated_at as "updatedAt",
        created_at as "createdAt"
    `,
    [userId, JSON.stringify(preferences)]
  );
  return result.rows[0] as UserPreferencesRecord;
}
