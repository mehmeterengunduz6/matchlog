import { fetchEventsByDate, FEATURED_LEAGUES } from "@/lib/sportsdb";
import {
  getWatchedStats,
  listWatchedEventIds,
  listNotifiedEventIds,
} from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function groupByLeague(
  events: Awaited<ReturnType<typeof fetchEventsByDate>>,
  leagueOrder?: string[]
) {
  const grouped = new Map<string, typeof events>();
  for (const event of events) {
    if (!grouped.has(event.leagueId)) {
      grouped.set(event.leagueId, []);
    }
    grouped.get(event.leagueId)?.push(event);
  }

  // Use custom order if provided, otherwise use default FEATURED_LEAGUES order
  const orderedLeagues = leagueOrder
    ? leagueOrder
        .map((id) => FEATURED_LEAGUES.find((l) => l.id === id))
        .filter(Boolean)
    : FEATURED_LEAGUES;

  return orderedLeagues.map((league) => ({
    id: league!.id,
    name: league!.name,
    badge: league!.badge,
    events: (grouped.get(league!.id) ?? []).sort((a, b) =>
      a.time.localeCompare(b.time)
    ),
  }));
}

export async function GET(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date || !isValidDate(date)) {
    return Response.json({ error: "Invalid date." }, { status: 400 });
  }

  // Optional: get league order from query params (comma-separated IDs)
  const orderParam = searchParams.get("leagueOrder");
  const leagueOrder = orderParam ? orderParam.split(",") : undefined;

  const events = await fetchEventsByDate(date);
  const leagues = groupByLeague(events, leagueOrder);
  const [watchedIds, notifiedIds, stats] = await Promise.all([
    listWatchedEventIds(userId, date),
    listNotifiedEventIds(userId, date),
    getWatchedStats(userId),
  ]);

  return Response.json({ date, leagues, watchedIds, notifiedIds, stats });
}
