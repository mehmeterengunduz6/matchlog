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
  const result = await pool.query<MatchRecord>(
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
  const result = await pool.query<MatchRecord>(
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
  const result = await pool.query<MatchRecord>(
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
  const weekResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text as count FROM matches WHERE user_id = $1 AND date >= $2`,
    [userId, weekStart]
  );
  const monthResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text as count FROM matches WHERE user_id = $1 AND date >= $2`,
    [userId, monthStart]
  );
  const totalResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text as count FROM matches WHERE user_id = $1`,
    [userId]
  );

  return {
    weekCount: Number(weekResult.rows[0]?.count ?? 0),
    monthCount: Number(monthResult.rows[0]?.count ?? 0),
    totalCount: Number(totalResult.rows[0]?.count ?? 0),
  };
}
