import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchEventsByDate, FEATURED_LEAGUES } from "@/lib/sportsdb";
import { getWatchedStats, listWatchedEventIds } from "@/lib/db";

export const dynamic = "force-dynamic";

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function groupByLeague(events: Awaited<ReturnType<typeof fetchEventsByDate>>) {
  const grouped = new Map<string, typeof events>();
  for (const event of events) {
    if (!grouped.has(event.leagueId)) {
      grouped.set(event.leagueId, []);
    }
    grouped.get(event.leagueId)?.push(event);
  }
  return FEATURED_LEAGUES.map((league) => ({
    id: league.id,
    name: league.name,
    events: grouped.get(league.id) ?? [],
  }));
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date || !isValidDate(date)) {
    return Response.json({ error: "Invalid date." }, { status: 400 });
  }

  const events = await fetchEventsByDate(date);
  const leagues = groupByLeague(events);
  const watchedIds = await listWatchedEventIds(userId, date);
  const stats = await getWatchedStats(userId);

  return Response.json({ date, leagues, watchedIds, stats });
}
