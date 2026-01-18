import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createMatch, getStats, listMatches, updateMatch } from "@/lib/db";

export const dynamic = "force-dynamic";

type MatchPayload = {
  date: string;
  time: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
};

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidTime(value: string) {
  return /^\d{2}:\d{2}$/.test(value);
}

async function requireUserId() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  return userId ?? null;
}

export async function GET() {
  const userId = await requireUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  const matches = await listMatches(userId);
  const stats = await getStats(userId);
  return Response.json({ matches, stats });
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json()) as Partial<MatchPayload>;

  if (
    !body.date ||
    !body.time ||
    !body.league ||
    !body.homeTeam ||
    !body.awayTeam ||
    body.homeScore === undefined ||
    body.awayScore === undefined
  ) {
    return Response.json({ error: "Missing required fields." }, { status: 400 });
  }

  if (!isValidDate(body.date) || !isValidTime(body.time)) {
    return Response.json({ error: "Invalid date or time format." }, { status: 400 });
  }

  const homeScore = Number(body.homeScore);
  const awayScore = Number(body.awayScore);

  if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore)) {
    return Response.json({ error: "Scores must be integers." }, { status: 400 });
  }

  const league = body.league.trim();
  const homeTeam = body.homeTeam.trim();
  const awayTeam = body.awayTeam.trim();

  if (!league || !homeTeam || !awayTeam) {
    return Response.json(
      { error: "League and team names cannot be empty." },
      { status: 400 }
    );
  }

  const match = await createMatch(userId, {
    date: body.date,
    time: body.time,
    league,
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
  });

  return Response.json({ match });
}

export async function PUT(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json()) as Partial<MatchPayload> & {
    id?: number;
  };

  if (
    !body.id ||
    !body.date ||
    !body.time ||
    !body.league ||
    !body.homeTeam ||
    !body.awayTeam ||
    body.homeScore === undefined ||
    body.awayScore === undefined
  ) {
    return Response.json({ error: "Missing required fields." }, { status: 400 });
  }

  if (!isValidDate(body.date) || !isValidTime(body.time)) {
    return Response.json({ error: "Invalid date or time format." }, { status: 400 });
  }

  const homeScore = Number(body.homeScore);
  const awayScore = Number(body.awayScore);

  if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore)) {
    return Response.json({ error: "Scores must be integers." }, { status: 400 });
  }

  const league = body.league.trim();
  const homeTeam = body.homeTeam.trim();
  const awayTeam = body.awayTeam.trim();

  if (!league || !homeTeam || !awayTeam) {
    return Response.json(
      { error: "League and team names cannot be empty." },
      { status: 400 }
    );
  }

  const match = await updateMatch(userId, body.id, {
    date: body.date,
    time: body.time,
    league,
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
  });

  if (!match) {
    return Response.json({ error: "Match not found." }, { status: 404 });
  }

  return Response.json({ match });
}
