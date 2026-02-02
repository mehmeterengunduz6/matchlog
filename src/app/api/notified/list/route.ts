import { getUserIdFromRequest } from "@/lib/mobile-auth";
import { listNotifiedEvents } from "@/lib/db";

export async function GET(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const events = await listNotifiedEvents(userId);
  return Response.json({ events });
}
