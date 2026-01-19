import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listWatchedEvents } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const events = await listWatchedEvents(userId);
  return Response.json({ events });
}
