import { getUserIdFromRequest } from '@/lib/mobile-auth';
import { fetchTeamMatches } from '@/lib/sportsdb';
import {
  listWatchedEventIdsByEventIds,
  listNotifiedEventIdsByEventIds
} from '@/lib/db';

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get("teamId");
  const teamName = searchParams.get("teamName");

  if (!teamId) {
    return Response.json({ error: "Missing teamId parameter." }, { status: 400 });
  }

  try {
    const { pastMatches, upcomingMatches } = await fetchTeamMatches(teamId);

    const allEventIds = [...pastMatches, ...upcomingMatches].map(e => e.eventId);

    const [watchedIds, notifiedIds] = await Promise.all([
      listWatchedEventIdsByEventIds(userId, allEventIds),
      listNotifiedEventIdsByEventIds(userId, allEventIds)
    ]);

    return Response.json({
      teamId,
      teamName: teamName || 'Unknown Team',
      pastMatches,
      upcomingMatches,
      watchedIds,
      notifiedIds
    });
  } catch (error) {
    console.error('Team matches error:', error);
    return Response.json(
      { error: 'Failed to fetch team matches.' },
      { status: 500 }
    );
  }
}
