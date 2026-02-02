CREATE TABLE notified_events (
  id serial PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id text NOT NULL,
  league_id text NOT NULL,
  league_name text NOT NULL,
  date text NOT NULL,
  time text NOT NULL,
  home_team text NOT NULL,
  away_team text NOT NULL,
  notification_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_event UNIQUE (user_id, event_id)
);

CREATE INDEX idx_notified_events_user_id ON notified_events(user_id);
CREATE INDEX idx_notified_events_date ON notified_events(date);
