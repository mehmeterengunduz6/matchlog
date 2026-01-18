import fs from "fs";
import path from "path";
import { Pool } from "pg";

function loadEnvFile() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    return;
  }
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const [key, ...rest] = trimmed.split("=");
    if (!key || rest.length === 0) {
      continue;
    }
    const value = rest.join("=").trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

const databaseUrl = process.env.DATABASE_URL;
const userId = process.env.USER_ID;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

if (!userId) {
  throw new Error("USER_ID is required.");
}

const dataPath = path.join(process.cwd(), "data", "matchlog.json");
if (!fs.existsSync(dataPath)) {
  throw new Error(`No data file found at ${dataPath}`);
}

const raw = fs.readFileSync(dataPath, "utf-8");
const parsed = JSON.parse(raw);
const matches = Array.isArray(parsed.matches) ? parsed.matches : [];

if (matches.length === 0) {
  console.log("No matches found to import.");
  process.exit(0);
}

const pool = new Pool({ connectionString: databaseUrl });

const insertSql = `
  INSERT INTO matches
    (user_id, date, time, league, home_team, away_team, home_score, away_score)
  VALUES
    ($1, $2, $3, $4, $5, $6, $7, $8)
`;

let imported = 0;

try {
  for (const match of matches) {
    const date = match.date;
    const time = match.time;
    const league = match.league ?? "";
    const homeTeam = match.homeTeam;
    const awayTeam = match.awayTeam;
    const homeScore = Number(match.homeScore);
    const awayScore = Number(match.awayScore);

    if (
      !date ||
      !time ||
      !homeTeam ||
      !awayTeam ||
      !Number.isFinite(homeScore) ||
      !Number.isFinite(awayScore)
    ) {
      continue;
    }

    await pool.query(insertSql, [
      userId,
      date,
      time,
      league,
      homeTeam,
      awayTeam,
      homeScore,
      awayScore,
    ]);
    imported += 1;
  }
} finally {
  await pool.end();
}

console.log(`Imported ${imported} matches.`);
