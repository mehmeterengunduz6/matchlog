import { getAllTeams } from "@/lib/sportsdb";
import { getUserIdFromRequest } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Get curated list of teams for featured leagues
  // Note: TheSportsDB free tier doesn't support lookup_all_teams endpoint
  const teamsByLeague = getAllTeams();

  return Response.json({ teamsByLeague });
}
