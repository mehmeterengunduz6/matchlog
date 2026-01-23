import { fetchEventsByDate } from "@/lib/sportsdb";
import { getWatchedStats, listWatchedEventIds } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function sortByTime(events: Awaited<ReturnType<typeof fetchEventsByDate>>) {
  return [...events].sort((a, b) => a.time.localeCompare(b.time));
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

  const events = await fetchEventsByDate(date);
  const sortedEvents = sortByTime(events);
  const watchedIds = await listWatchedEventIds(userId, date);
  const stats = await getWatchedStats(userId);

  return Response.json({ date, events: sortedEvents, watchedIds, stats });
}
