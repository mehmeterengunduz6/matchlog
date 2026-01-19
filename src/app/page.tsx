"use client";

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

type WatchedEvent = EventItem & {
  id: number;
  createdAt: string;
  time: string | null;
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

function formatDisplayTime(value: string) {
  if (!value) {
    return "TBD";
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
  const [watchedEvents, setWatchedEvents] = useState<WatchedEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const isAuthenticated = status === "authenticated";

  const totalEvents = useMemo(
    () => leagues.reduce((sum, league) => sum + league.events.length, 0),
    [leagues]
  );
  const groupedWatched = useMemo(() => {
    const grouped = new Map<string, WatchedEvent[]>();
    watchedEvents.forEach((event) => {
      if (!grouped.has(event.date)) {
        grouped.set(event.date, []);
      }
      grouped.get(event.date)?.push(event);
    });
    return Array.from(grouped.entries());
  }, [watchedEvents]);

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

  async function loadWatchedEvents() {
    try {
      const res = await fetch("/api/watched/list");
      if (res.status === 401) {
        setWatchedEvents([]);
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to load watched matches.");
      }
      const data = (await res.json()) as { events: WatchedEvent[] };
      setWatchedEvents(data.events);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      void loadEvents(selectedDate);
      void loadWatchedEvents();
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
    const optimistic = new Set(watchedIds);
    if (isWatched) {
      optimistic.delete(event.eventId);
    } else {
      optimistic.add(event.eventId);
    }
    setWatchedIds(optimistic);
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
      await loadEvents(selectedDate);
      await loadWatchedEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setWatchedIds(new Set(watchedIds));
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
                                {formatDisplayTime(event.time)}
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

        <section className="panel">
          <div className="panel-header">
            <h2>Your watched matches</h2>
            <p>All matches you have marked as watched.</p>
          </div>
          {watchedEvents.length === 0 ? (
            <p className="empty-state">
              No watched matches yet. Pick a day and mark a match above.
            </p>
          ) : (
            <div className="log">
              {groupedWatched.map(([date, items]) => (
                <div className="log-day" key={date}>
                  <div className="log-date">
                    <span>{formatDisplayDate(date)}</span>
                    <small>
                      {items.length} match{items.length === 1 ? "" : "es"}
                    </small>
                  </div>
                  <ul>
                    {items.map((match) => (
                      <li key={match.id} className="log-item">
                        <span className="log-time">
                          {formatDisplayTime(match.time ?? "")}
                        </span>
                        <span className="log-teams">
                          {match.homeTeam} vs {match.awayTeam}
                        </span>
                        <span className="log-league">{match.leagueName}</span>
                        <span className="log-score">
                          {match.homeScore !== null &&
                          match.awayScore !== null
                            ? `${match.homeScore} - ${match.awayScore}`
                            : "Score TBD"}
                        </span>
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
