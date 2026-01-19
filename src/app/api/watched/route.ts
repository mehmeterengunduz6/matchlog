import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { addWatchedEvent, removeWatchedEvent } from "@/lib/db";

export const dynamic = "force-dynamic";

type WatchedPayload = {
  eventId: string;
  leagueId: string;
  leagueName: string;
  date: string;
  time: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
};

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as Partial<WatchedPayload>;
  if (
    !body.eventId ||
    !body.leagueId ||
    !body.leagueName ||
    !body.date ||
    !body.homeTeam ||
    !body.awayTeam
  ) {
    return Response.json({ error: "Missing required fields." }, { status: 400 });
  }
  if (!isValidDate(body.date)) {
    return Response.json({ error: "Invalid date." }, { status: 400 });
  }

  const record = await addWatchedEvent(userId, {
    eventId: body.eventId,
    leagueId: body.leagueId,
    leagueName: body.leagueName,
    date: body.date,
    time: body.time ?? "",
    homeTeam: body.homeTeam,
    awayTeam: body.awayTeam,
    homeScore: body.homeScore ?? null,
    awayScore: body.awayScore ?? null,
  });

  return Response.json({ record });
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as Partial<{ eventId: string }>;
  if (!body.eventId) {
    return Response.json({ error: "Missing eventId." }, { status: 400 });
  }

  await removeWatchedEvent(userId, body.eventId);
  return Response.json({ ok: true });
}
