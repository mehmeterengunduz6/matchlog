import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPool } from "@/lib/pool";

export async function getUserIdFromRequest(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
      return null;
    }
    const pool = getPool();
    const result = await pool.query(
      `
        SELECT "userId"
        FROM sessions
        WHERE "sessionToken" = $1 AND expires > now()
        LIMIT 1
      `,
      [token]
    );
    return (result.rows[0]?.userId as string | undefined) ?? null;
  }

  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}
