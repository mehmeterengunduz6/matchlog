"use client";

import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

type Stats = {
  weekCount: number;
  monthCount: number;
  totalCount: number;
};

type EventItem = {
  eventId: string;
  leagueId: string;
  leagueName: string;
  date: string;
  time: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
};

type LeagueGroup = {
  id: string;
  name: string;
  events: EventItem[];
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

function formatEventTime(date: string, time: string) {
  if (!time) {
    return "TBD";
  }
  if (time.includes("T")) {
    const parsed = new Date(time);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }
  }
  const hasSeconds = time.length >= 8;
  const iso = date ? `${date}T${time}${hasSeconds ? "Z" : "Z"}` : "";
  if (iso) {
    const parsed = new Date(iso);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }
  }
  return time.length >= 5 ? time.slice(0, 5) : time;
}

function todayValue() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = `${now.getMonth() + 1}`.padStart(2, "0");
  const dd = `${now.getDate()}`.padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDate(date: Date) {
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, "0");
  const dd = `${date.getDate()}`.padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function startOfWeek(date: Date) {
  const day = date.getDay();
  const diff = (day + 6) % 7;
  const start = new Date(date);
  start.setDate(date.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

export default function Home() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<Stats>({
    weekCount: 0,
    monthCount: 0,
    totalCount: 0,
  });
  const [selectedDate, setSelectedDate] = useState(todayValue());
  const [leagues, setLeagues] = useState<LeagueGroup[]>([]);
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const isAuthenticated = status === "authenticated";

  const totalEvents = useMemo(
    () => leagues.reduce((sum, league) => sum + league.events.length, 0),
    [leagues]
  );

  async function loadEvents(date: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/events?date=${date}`);
      if (res.status === 401) {
        setError("Sign in to see available matches.");
        setLeagues([]);
        setWatchedIds(new Set());
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to load matches for the day.");
      }
      const data = (await res.json()) as {
        leagues: LeagueGroup[];
        watchedIds: string[];
        stats: Stats;
      };
      setLeagues(data.leagues);
      setWatchedIds(new Set(data.watchedIds));
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
      void loadEvents(selectedDate);
    }
  }, [status, selectedDate]);

  function setPending(eventId: string, value: boolean) {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (value) {
        next.add(eventId);
      } else {
        next.delete(eventId);
      }
      return next;
    });
  }

  async function toggleWatched(event: EventItem) {
    const isWatched = watchedIds.has(event.eventId);
    const prevWatchedIds = watchedIds;
    const prevStats = stats;

    const nextWatchedIds = new Set(prevWatchedIds);
    if (isWatched) {
      nextWatchedIds.delete(event.eventId);
    } else {
      nextWatchedIds.add(event.eventId);
    }
    setWatchedIds(nextWatchedIds);

    const delta = isWatched ? -1 : 1;
    const today = new Date();
    const weekStart = formatDate(startOfWeek(today));
    const monthStart = formatDate(new Date(today.getFullYear(), today.getMonth(), 1));
    const isWeek = event.date >= weekStart;
    const isMonth = event.date >= monthStart;
    setStats((prev) => ({
      weekCount: prev.weekCount + (isWeek ? delta : 0),
      monthCount: prev.monthCount + (isMonth ? delta : 0),
      totalCount: prev.totalCount + delta,
    }));
    setPending(event.eventId, true);

    try {
      const res = await fetch("/api/watched", {
        method: isWatched ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isWatched
            ? { eventId: event.eventId }
            : {
                eventId: event.eventId,
                leagueId: event.leagueId,
                leagueName: event.leagueName,
                date: event.date,
                time: event.time,
                homeTeam: event.homeTeam,
                awayTeam: event.awayTeam,
                homeScore: event.homeScore,
                awayScore: event.awayScore,
              }
        ),
      });
      if (!res.ok) {
        throw new Error("Failed to update watched matches.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setWatchedIds(prevWatchedIds);
      setStats(prevStats);
    } finally {
      setPending(event.eventId, false);
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="page auth-page">
        <header className="hero auth-hero">
          <div>
            <p className="eyebrow">Matchlog</p>
            <h1>Sign in to keep your match diary.</h1>
            <p className="hero-copy">
              Track the matches you watch from the top leagues and keep it all
              private to your account.
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
            <div className="auth-actions">
              <Link href="/watched" className="ghost-button">
                Your watched matches
              </Link>
              <button
                type="button"
                className="ghost-button"
                onClick={() => signOut()}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
        <div>
          <p className="eyebrow">Matchlog</p>
          <h1>Choose the matches you watched.</h1>
          <p className="hero-copy">
            We pull the daily fixtures from TheSportsDB. Select what you watched
            and your weekly/monthly totals update automatically.
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
            <span>Total watched</span>
            <strong>{stats.totalCount}</strong>
          </div>
        </div>
      </header>

      <main className="content">
        <section className="panel">
          <div className="panel-header">
            <h2>Pick a day</h2>
            <p>{formatDisplayDate(selectedDate)}</p>
          </div>
          <div className="schedule-controls">
            <label>
              Date
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                max={todayValue()}
              />
            </label>
            <button
              type="button"
              className="ghost-button"
              onClick={() => loadEvents(selectedDate)}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh fixtures"}
            </button>
          </div>
          <div className="summary-row">
            <span>{totalEvents} matches found</span>
            <span>{watchedIds.size} marked watched</span>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Today&apos;s fixtures</h2>
            <p>Top 5 leagues + Super Lig + Champions League.</p>
          </div>
          {loading ? (
            <p className="empty-state">Loading fixtures...</p>
          ) : leagues.length === 0 ? (
            <p className="empty-state">No fixtures found for this day.</p>
          ) : (
            <div className="league-list">
              {leagues.map((league) => (
                <div key={league.id} className="league-group">
                  <div className="league-header">
                    <h3>{league.name}</h3>
                    <span>{league.events.length} matches</span>
                  </div>
                  {league.events.length === 0 ? (
                    <p className="empty-state">No fixtures listed.</p>
                  ) : (
                    <ul className="event-list">
                      {league.events.map((event) => {
                        const isWatched = watchedIds.has(event.eventId);
                        const isPending = pendingIds.has(event.eventId);
                        return (
                          <li key={event.eventId} className="event-card">
                            <div>
                              <p className="event-time">
                                {formatEventTime(event.date, event.time)}
                              </p>
                              <p className="event-teams">
                                {event.homeTeam} vs {event.awayTeam}
                              </p>
                              <p className="event-score">
                                {event.homeScore !== null &&
                                event.awayScore !== null
                                  ? `${event.homeScore} - ${event.awayScore}`
                                  : "Score TBD"}
                              </p>
                            </div>
                            <button
                              type="button"
                              className={isWatched ? "tag-button" : "ghost-button"}
                              onClick={() => toggleWatched(event)}
                              disabled={isPending}
                            >
                              {isWatched ? "Watched" : "Mark watched"}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
