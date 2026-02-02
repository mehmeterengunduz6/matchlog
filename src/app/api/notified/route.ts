import { getUserIdFromRequest } from "@/lib/mobile-auth";
import {
  addNotifiedEvent,
  removeNotifiedEvent,
  getNotifiedEvent,
} from "@/lib/db";

export async function GET(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const eventId = url.searchParams.get("eventId");

  if (!eventId) {
    return Response.json({ error: "Missing eventId." }, { status: 400 });
  }

  const event = await getNotifiedEvent(userId, eventId);
  return Response.json(event);
}

export async function POST(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json();
  const {
    eventId,
    leagueId,
    leagueName,
    date,
    time,
    homeTeam,
    awayTeam,
    notificationId,
  } = body;

  if (
    !eventId ||
    !leagueId ||
    !leagueName ||
    !date ||
    !time ||
    !homeTeam ||
    !awayTeam
  ) {
    return Response.json(
      { error: "Missing required fields." },
      { status: 400 }
    );
  }

  const record = await addNotifiedEvent(userId, {
    eventId,
    leagueId,
    leagueName,
    date,
    time,
    homeTeam,
    awayTeam,
    notificationId: notificationId ?? null,
  });

  return Response.json(record);
}

export async function DELETE(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json();
  const { eventId } = body;

  if (!eventId) {
    return Response.json({ error: "Missing eventId." }, { status: 400 });
  }

  await removeNotifiedEvent(userId, eventId);
  return Response.json({ ok: true });
}
