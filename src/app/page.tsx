"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

type MatchRecord = {
  id: number;
  userId: string;
  date: string;
  time: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  createdAt: string;
};

type Stats = {
  weekCount: number;
  monthCount: number;
  totalCount: number;
};

type FormState = {
  date: string;
  time: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: string;
  awayScore: string;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatDisplayDate(value: string | Date) {
  const date =
    value instanceof Date
      ? value
      : value.includes("T")
      ? new Date(value)
      : new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return dateFormatter.format(date);
}

function formatDisplayTime(value: string) {
  if (!value) {
    return value;
  }
  if (value.includes("T")) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }
  }
  if (value.length >= 5) {
    return value.slice(0, 5);
  }
  return value;
}

function todayValue() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = `${now.getMonth() + 1}`.padStart(2, "0");
  const dd = `${now.getDate()}`.padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function timeValue() {
  const now = new Date();
  const hh = `${now.getHours()}`.padStart(2, "0");
  const mm = `${now.getMinutes()}`.padStart(2, "0");
  return `${hh}:${mm}`;
}

function groupMatches(matches: MatchRecord[]) {
  const grouped = new Map<string, MatchRecord[]>();
  matches.forEach((match) => {
    if (!grouped.has(match.date)) {
      grouped.set(match.date, []);
    }
    grouped.get(match.date)?.push(match);
  });
  return Array.from(grouped.entries());
}

export default function Home() {
  const { data: session, status } = useSession();
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [stats, setStats] = useState<Stats>({
    weekCount: 0,
    monthCount: 0,
    totalCount: 0,
  });
  const [form, setForm] = useState<FormState>({
    date: todayValue(),
    time: timeValue(),
    league: "",
    homeTeam: "",
    awayTeam: "",
    homeScore: "",
    awayScore: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const groupedMatches = useMemo(() => groupMatches(matches), [matches]);
  const isAuthenticated = status === "authenticated";

  async function loadMatches() {
    setLoading(true);
    try {
      const res = await fetch("/api/matches");
      if (res.status === 401) {
        setMatches([]);
        setStats({ weekCount: 0, monthCount: 0, totalCount: 0 });
        setError("Sign in to see your matches.");
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to load matches.");
      }
      const data = (await res.json()) as { matches: MatchRecord[]; stats: Stats };
      setMatches(data.matches);
      setStats(data.stats);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      void loadMatches();
      return;
    }
    if (status === "unauthenticated") {
      setMatches([]);
      setStats({ weekCount: 0, monthCount: 0, totalCount: 0 });
      setError(null);
      setLoading(false);
    }
  }, [status]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        date: form.date,
        time: form.time,
        league: form.league,
        homeTeam: form.homeTeam,
        awayTeam: form.awayTeam,
        homeScore: Number(form.homeScore),
        awayScore: Number(form.awayScore),
      };
      const res = await fetch("/api/matches", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to save match.");
      }
      await loadMatches();
      setForm({
        date: form.date,
        time: timeValue(),
        league: "",
        homeTeam: "",
        awayTeam: "",
        homeScore: "",
        awayScore: "",
      });
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function startEdit(match: MatchRecord) {
    setEditingId(match.id);
    setForm({
      date: match.date,
      time: match.time,
      league: match.league ?? "",
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      homeScore: String(match.homeScore),
      awayScore: String(match.awayScore),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({
      date: todayValue(),
      time: timeValue(),
      league: "",
      homeTeam: "",
      awayTeam: "",
      homeScore: "",
      awayScore: "",
    });
  }

  if (!isAuthenticated) {
    return (
      <div className="page auth-page">
        <header className="hero auth-hero">
          <div>
            <p className="eyebrow">Matchlog</p>
            <h1>Sign in to keep your match diary.</h1>
            <p className="hero-copy">
              Log every match you watch, track weekly and monthly totals, and
              keep it all private to your account.
            </p>
          </div>
          <div className="auth-cta">
            <button
              type="button"
              className="primary-button"
              onClick={() => signIn("google")}
            >
              Continue with Google
            </button>
            <p className="form-note">
              Your match log stays tied to your Google account.
            </p>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="hero">
        <div className="auth-bar">
          <div className="auth-info">
            <span>{session?.user?.name ?? session?.user?.email}</span>
            <button
              type="button"
              className="ghost-button"
              onClick={() => signOut()}
            >
              Sign out
            </button>
          </div>
        </div>
        <div>
          <p className="eyebrow">Matchlog</p>
          <h1>Track every match you watch.</h1>
          <p className="hero-copy">
            Log the date, time, teams, and score. See weekly and monthly totals
            at a glance.
          </p>
        </div>
        <div className="stats">
          <div className="stat">
            <span>This week</span>
            <strong>{stats.weekCount}</strong>
          </div>
          <div className="stat">
            <span>This month</span>
            <strong>{stats.monthCount}</strong>
          </div>
          <div className="stat">
            <span>Total logged</span>
            <strong>{stats.totalCount}</strong>
          </div>
        </div>
      </header>

      <main className="content">
        <section className="panel">
          <h2>{editingId ? "Edit match" : "Log a match"}</h2>
          <form className="match-form" onSubmit={handleSubmit}>
            <label>
              Date
              <input
                type="date"
                value={form.date}
                onChange={(event) => updateForm("date", event.target.value)}
                disabled={!isAuthenticated}
                required
              />
            </label>
            <label>
              Time
              <input
                type="time"
                value={form.time}
                onChange={(event) => updateForm("time", event.target.value)}
                disabled={!isAuthenticated}
                required
              />
            </label>
            <label>
              League
              <input
                type="text"
                value={form.league}
                onChange={(event) => updateForm("league", event.target.value)}
                placeholder="Premier League"
                disabled={!isAuthenticated}
                required
              />
            </label>
            <label>
              Home team
              <input
                type="text"
                value={form.homeTeam}
                onChange={(event) => updateForm("homeTeam", event.target.value)}
                placeholder="Arsenal"
                disabled={!isAuthenticated}
                required
              />
            </label>
            <label>
              Away team
              <input
                type="text"
                value={form.awayTeam}
                onChange={(event) => updateForm("awayTeam", event.target.value)}
                placeholder="Liverpool"
                disabled={!isAuthenticated}
                required
              />
            </label>
            <label>
              Home score
              <input
                type="number"
                min="0"
                value={form.homeScore}
                onChange={(event) => updateForm("homeScore", event.target.value)}
                disabled={!isAuthenticated}
                required
              />
            </label>
            <label>
              Away score
              <input
                type="number"
                min="0"
                value={form.awayScore}
                onChange={(event) => updateForm("awayScore", event.target.value)}
                disabled={!isAuthenticated}
                required
              />
            </label>
            <button type="submit" disabled={!isAuthenticated || submitting}>
              {submitting
                ? "Saving..."
                : editingId
                ? "Save changes"
                : "Save match"}
            </button>
            {editingId ? (
              <button
                type="button"
                className="ghost-button"
                onClick={cancelEdit}
              >
                Cancel edit
              </button>
            ) : null}
            {!isAuthenticated ? (
              <p className="form-note">Sign in to log and edit your matches.</p>
            ) : null}
            {error ? <p className="form-error">{error}</p> : null}
          </form>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Daily log</h2>
            <p>Matches grouped by date.</p>
          </div>
          {loading ? (
            <p className="empty-state">Loading matches...</p>
          ) : !isAuthenticated ? (
            <p className="empty-state">
              Sign in to see the matches you have logged.
            </p>
          ) : groupedMatches.length === 0 ? (
            <p className="empty-state">
              No matches yet. Log your first match to get started.
            </p>
          ) : (
            <div className="log">
              {groupedMatches.map(([date, items]) => (
                <div className="log-day" key={date}>
                  <div className="log-date">
                    <span>{formatDisplayDate(date)}</span>
                    <small>{items.length} match{items.length === 1 ? "" : "es"}</small>
                  </div>
                  <ul>
                    {items.map((match) => (
                      <li key={match.id} className="log-item">
                        <span className="log-time">
                          {formatDisplayTime(match.time)}
                        </span>
                        <span className="log-teams">
                          {match.homeTeam} vs {match.awayTeam}
                        </span>
                        <span className="log-league">
                          {match.league || "League TBD"}
                        </span>
                        <span className="log-score">
                          {match.homeScore} - {match.awayScore}
                        </span>
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => startEdit(match)}
                        >
                          Edit
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
