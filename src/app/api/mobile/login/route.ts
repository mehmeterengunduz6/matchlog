import crypto from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { getPool } from "@/lib/pool";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function getEnv(name: string, fallback?: string) {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`${name} is not set.`);
  }
  return value;
}

function getAudienceList() {
  const audiences = [
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_ID_MOBILE,
    process.env.GOOGLE_CLIENT_ID_IOS,
    process.env.GOOGLE_CLIENT_ID_ANDROID,
    process.env.GOOGLE_CLIENT_ID_WEB,
  ].filter(Boolean) as string[];
  if (audiences.length === 0) {
    return [getEnv("GOOGLE_CLIENT_ID")];
  }
  return audiences;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { idToken?: string } | null;
  const idToken = body?.idToken;
  if (!idToken) {
    return Response.json({ error: "Missing idToken." }, { status: 400 });
  }

  const client = new OAuth2Client();
  const ticket = await client.verifyIdToken({
    idToken,
    audience: getAudienceList(),
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    return Response.json({ error: "Invalid token." }, { status: 401 });
  }

  const pool = getPool();
  const email = payload.email;
  const name = payload.name ?? null;
  const image = payload.picture ?? null;
  const providerAccountId = payload.sub;

  const existingUser = await pool.query(
    `SELECT id FROM users WHERE email = $1 LIMIT 1`,
    [email]
  );
  let userId = existingUser.rows[0]?.id as string | undefined;

  if (!userId) {
    const created = await pool.query(
      `
        INSERT INTO users (name, email, image)
        VALUES ($1, $2, $3)
        RETURNING id
      `,
      [name, email, image]
    );
    userId = created.rows[0]?.id as string | undefined;
  } else {
    await pool.query(
      `
        UPDATE users
        SET name = $1, image = $2
        WHERE id = $3
      `,
      [name, image, userId]
    );
  }

  await pool.query(
    `
      INSERT INTO accounts
        ("userId", type, provider, "providerAccountId", id_token)
      VALUES
        ($1, 'oauth', 'google', $2, $3)
      ON CONFLICT (provider, "providerAccountId")
      DO UPDATE SET
        "userId" = EXCLUDED."userId",
        id_token = EXCLUDED.id_token
    `,
    [userId, providerAccountId, idToken]
  );

  const sessionToken = crypto.randomUUID();
  const expires = new Date(Date.now() + SESSION_TTL_MS);
  await pool.query(
    `
      INSERT INTO sessions ("sessionToken", "userId", expires)
      VALUES ($1, $2, $3)
    `,
    [sessionToken, userId, expires]
  );

  return Response.json({
    token: sessionToken,
    user: {
      id: userId,
      name,
      email,
      image,
    },
    expires: expires.toISOString(),
  });
}
