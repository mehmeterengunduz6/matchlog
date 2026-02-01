import { listWatchedEvents } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

type TeamsByLeague = {
  leagueId: string;
  leagueName: string;
  teams: string[];
};

export async function GET(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Get all watched events for the user
  const watchedEvents = await listWatchedEvents(userId);

  // Extract unique teams grouped by league
  const leagueTeamsMap = new Map<string, Set<string>>();
  const leagueNamesMap = new Map<string, string>();

  for (const event of watchedEvents) {
    if (!leagueTeamsMap.has(event.leagueId)) {
      leagueTeamsMap.set(event.leagueId, new Set());
      leagueNamesMap.set(event.leagueId, event.leagueName);
    }
    const teams = leagueTeamsMap.get(event.leagueId)!;
    teams.add(event.homeTeam);
    teams.add(event.awayTeam);
  }

  // Convert to array format
  const teamsByLeague: TeamsByLeague[] = Array.from(leagueTeamsMap.entries()).map(
    ([leagueId, teams]) => ({
      leagueId,
      leagueName: leagueNamesMap.get(leagueId) || "",
      teams: Array.from(teams).sort(),
    })
  );

  return Response.json({ teamsByLeague });
}
