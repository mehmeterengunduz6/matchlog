import { getUserPreferences, updateUserPreferences } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const preferences = await getUserPreferences(userId);
  return Response.json({ preferences });
}

export async function PUT(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json();

  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const result = await updateUserPreferences(userId, body);

  return Response.json({
    preferences: result.preferences,
    updatedAt: result.updatedAt,
  });
}
