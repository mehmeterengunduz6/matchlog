type SportsDbEvent = {
  idEvent: string;
  idLeague: string;
  strLeague: string;
  strEvent: string | null;
  strHomeTeam: string | null;
  strAwayTeam: string | null;
  intHomeScore: string | null;
  intAwayScore: string | null;
  dateEvent: string | null;
  strTime: string | null;
};

type SportsDbResponse = {
  events: SportsDbEvent[] | null;
};

export type LeagueConfig = {
  id: string;
  name: string;
  query: string;
  badge: string;
};

export type NormalizedEvent = {
  eventId: string;
  leagueId: string;
  leagueName: string;
  leagueBadge: string;
  date: string;
  time: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
};

const API_KEY = process.env.THESPORTSDB_API_KEY ?? "123";
const BASE_URL = `https://www.thesportsdb.com/api/v1/json/${API_KEY}`;

export const FEATURED_LEAGUES: LeagueConfig[] = [
  { id: "4328", name: "English Premier League", query: "English Premier League", badge: "https://r2.thesportsdb.com/images/media/league/badge/gasy9d1737743125.png" },
  { id: "4335", name: "Spanish La Liga", query: "Spanish La Liga", badge: "https://r2.thesportsdb.com/images/media/league/badge/ja4it51687628717.png" },
  { id: "4332", name: "Italian Serie A", query: "Italian Serie A", badge: "https://r2.thesportsdb.com/images/media/league/badge/67q3q21679951383.png" },
  { id: "4331", name: "German Bundesliga", query: "German Bundesliga", badge: "https://r2.thesportsdb.com/images/media/league/badge/teqh1b1679952008.png" },
  { id: "4334", name: "French Ligue 1", query: "French Ligue 1", badge: "https://r2.thesportsdb.com/images/media/league/badge/9f7z9d1742983155.png" },
  { id: "4339", name: "Turkish Super Lig", query: "Turkish Super Lig", badge: "https://r2.thesportsdb.com/images/media/league/badge/h7xx231601671132.png" },
  { id: "4480", name: "UEFA Champions League", query: "UEFA Champions League", badge: "https://r2.thesportsdb.com/images/media/league/badge/facv1u1742998896.png" },
];

const cache = new Map<string, { expiresAt: number; data: NormalizedEvent[] }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function normalizeEvent(
  event: SportsDbEvent,
  league: LeagueConfig
): NormalizedEvent | null {
  if (!event.idEvent || !event.dateEvent) {
    return null;
  }
  return {
    eventId: event.idEvent,
    leagueId: event.idLeague || league.id,
    leagueName: event.strLeague ?? league.name,
    leagueBadge: league.badge,
    date: event.dateEvent,
    time: event.strTime ?? "",
    homeTeam: event.strHomeTeam ?? "TBD",
    awayTeam: event.strAwayTeam ?? "TBD",
    homeScore:
      event.intHomeScore === null ? null : Number(event.intHomeScore),
    awayScore:
      event.intAwayScore === null ? null : Number(event.intAwayScore),
  };
}

async function fetchLeagueEvents(date: string, league: LeagueConfig) {
  const url = `${BASE_URL}/eventsday.php?d=${date}&l=${encodeURIComponent(
    league.query
  )}&s=Soccer`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) {
    throw new Error(`TheSportsDB error: ${res.status}`);
  }
  const data = (await res.json()) as SportsDbResponse;
  return (data.events ?? [])
    .map((event) => normalizeEvent(event, league))
    .filter((event): event is NormalizedEvent => Boolean(event));
}

export async function fetchEventsByDate(date: string) {
  const cached = cache.get(date);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const eventsByLeague = await Promise.all(
    FEATURED_LEAGUES.map((league) => fetchLeagueEvents(date, league))
  );
  const events = eventsByLeague.flat();

  cache.set(date, { expiresAt: Date.now() + CACHE_TTL_MS, data: events });
  return events;
}
