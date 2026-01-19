CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name text,
  email text UNIQUE,
  "emailVerified" timestamptz,
  image text
);

CREATE TABLE IF NOT EXISTS accounts (
  id serial PRIMARY KEY,
  "userId" text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  provider text NOT NULL,
  "providerAccountId" text NOT NULL,
  refresh_token text,
  access_token text,
  expires_at integer,
  token_type text,
  scope text,
  id_token text,
  session_state text
);

CREATE UNIQUE INDEX IF NOT EXISTS accounts_provider_unique
  ON accounts (provider, "providerAccountId");

CREATE TABLE IF NOT EXISTS sessions (
  id serial PRIMARY KEY,
  "sessionToken" text NOT NULL UNIQUE,
  "userId" text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier text NOT NULL,
  token text NOT NULL,
  expires timestamptz NOT NULL,
  PRIMARY KEY (identifier, token)
);

CREATE TABLE IF NOT EXISTS matches (
  id bigserial PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  time time NOT NULL,
  league text NOT NULL,
  home_team text NOT NULL,
  away_team text NOT NULL,
  home_score integer NOT NULL,
  away_score integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS matches_user_date_idx
  ON matches (user_id, date DESC);

CREATE TABLE IF NOT EXISTS watched_events (
  id bigserial PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id text NOT NULL,
  league_id text NOT NULL,
  league_name text NOT NULL,
  date date NOT NULL,
  time text,
  home_team text NOT NULL,
  away_team text NOT NULL,
  home_score integer,
  away_score integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)
);

CREATE INDEX IF NOT EXISTS watched_events_user_date_idx
  ON watched_events (user_id, date DESC);
