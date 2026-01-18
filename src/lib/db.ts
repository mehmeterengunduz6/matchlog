import fs from "fs";
import path from "path";

export type MatchRecord = {
  id: number;
  date: string;
  time: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  createdAt: string;
};

type MatchStore = {
  lastId: number;
  matches: MatchRecord[];
};

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dataPath = path.join(dataDir, "matchlog.json");

function loadStore(): MatchStore {
  if (!fs.existsSync(dataPath)) {
    const initial: MatchStore = { lastId: 0, matches: [] };
    fs.writeFileSync(dataPath, JSON.stringify(initial, null, 2));
    return initial;
  }
  const raw = fs.readFileSync(dataPath, "utf-8");
  const parsed = JSON.parse(raw) as MatchStore;
  if (!parsed.matches) {
    return { lastId: 0, matches: [] };
  }
  const normalized = parsed.matches.map((match) => ({
    ...match,
    league: match.league ?? "",
  }));
  const computedLastId =
    typeof parsed.lastId === "number"
      ? parsed.lastId
      : normalized.reduce((max, match) => Math.max(max, match.id ?? 0), 0);
  return { lastId: computedLastId, matches: normalized };
}

function saveStore(store: MatchStore) {
  fs.writeFileSync(dataPath, JSON.stringify(store, null, 2));
}

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

export function createMatch(input: Omit<MatchRecord, "id" | "createdAt">) {
  const store = loadStore();
  const nextId = store.lastId + 1;
  const createdAt = new Date().toISOString();
  const record: MatchRecord = { id: nextId, createdAt, ...input };
  store.lastId = nextId;
  store.matches.push(record);
  saveStore(store);
  return record;
}

export function listMatches() {
  const store = loadStore();
  return store.matches
    .slice()
    .sort((a, b) =>
      a.date === b.date
        ? a.time === b.time
          ? b.id - a.id
          : b.time.localeCompare(a.time)
        : b.date.localeCompare(a.date)
    );
}

export function updateMatch(
  id: number,
  input: Omit<MatchRecord, "id" | "createdAt">
) {
  const store = loadStore();
  const index = store.matches.findIndex((match) => match.id === id);
  if (index === -1) {
    return null;
  }
  const existing = store.matches[index];
  const updated: MatchRecord = {
    ...existing,
    ...input,
  };
  store.matches[index] = updated;
  saveStore(store);
  return updated;
}

export function getStats() {
  const now = new Date();
  const weekStart = formatDate(startOfWeek(now));
  const monthStart = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
  const matches = listMatches();
  const weekCount = matches.filter((match) => match.date >= weekStart).length;
  const monthCount = matches.filter((match) => match.date >= monthStart).length;
  const totalCount = matches.length;

  return {
    weekCount,
    monthCount,
    totalCount,
  };
}
