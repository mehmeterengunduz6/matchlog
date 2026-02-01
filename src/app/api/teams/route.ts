import { fetchAllTeams } from "@/lib/sportsdb";
import { getUserIdFromRequest } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Fetch all teams from TheSportsDB for featured leagues
  const teamsByLeague = await fetchAllTeams();

  return Response.json({ teamsByLeague });
}
