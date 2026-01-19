"use client";

import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

type WatchedEvent = {
  id: number;
  eventId: string;
  leagueId: string;
  leagueName: string;
  date: string;
  time: string | null;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  createdAt: string;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

const busiestDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
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

function formatEventTime(date: string, time: string | null) {
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
  const iso = date ? `${date}T${time}Z` : "";
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

export default function WatchedPage() {
  const { data: session, status } = useSession();
  const [events, setEvents] = useState<WatchedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const groupedEvents = useMemo(() => {
    const grouped = new Map<string, WatchedEvent[]>();
    events.forEach((event) => {
      if (!grouped.has(event.date)) {
        grouped.set(event.date, []);
      }
      grouped.get(event.date)?.push(event);
    });
    return Array.from(grouped.entries());
  }, [events]);

  const insights = useMemo(() => {
    if (events.length === 0) {
      return {
        topTeam: "—",
        topLeague: "—",
        topWeekday: "—",
        weekCount: 0,
        monthCount: 0,
        totalCount: 0,
      };
    }

    const teamCounts = new Map<string, number>();
    const leagueCounts = new Map<string, number>();
    const dayCounts = new Map<string, number>();
    const now = new Date();
    const weekStart = formatDate(startOfWeek(now));
    const monthStart = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
    let weekCount = 0;
    let monthCount = 0;

    events.forEach((event) => {
      const teams = [event.homeTeam, event.awayTeam].filter(Boolean);
      teams.forEach((team) => {
        teamCounts.set(team, (teamCounts.get(team) ?? 0) + 1);
      });
      leagueCounts.set(
        event.leagueName,
        (leagueCounts.get(event.leagueName) ?? 0) + 1
      );
      const dateValue = event.date || event.createdAt;
      const dayKey = dateValue ? dateValue.slice(0, 10) : null;
      if (dayKey) {
        dayCounts.set(dayKey, (dayCounts.get(dayKey) ?? 0) + 1);
      }

      if (event.date >= weekStart) {
        weekCount += 1;
      }
      if (event.date >= monthStart) {
        monthCount += 1;
      }
    });

    function pickTop(map: Map<string, number>) {
      let topName = "—";
      let topValue = 0;
      map.forEach((value, key) => {
        if (value > topValue) {
          topName = key;
          topValue = value;
        }
      });
      return topName;
    }

    const busiestDayKey = pickTop(dayCounts);
    const busiestDay =
      busiestDayKey === "—"
        ? "—"
        : busiestDateFormatter.format(new Date(`${busiestDayKey}T00:00:00`));

    return {
      topTeam: pickTop(teamCounts),
      topLeague: pickTop(leagueCounts),
      topWeekday: busiestDay,
      weekCount,
      monthCount,
      totalCount: events.length,
    };
  }, [events]);

  async function loadWatchedEvents() {
    setLoading(true);
    try {
      const res = await fetch("/api/watched/list");
      if (res.status === 401) {
        setEvents([]);
        setError("Sign in to see your watched matches.");
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to load watched matches.");
      }
      const data = (await res.json()) as { events: WatchedEvent[] };
      setEvents(data.events);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      void loadWatchedEvents();
      return;
    }
    if (status === "unauthenticated") {
      setEvents([]);
      setLoading(false);
      setError(null);
    }
  }, [status]);

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

  async function unwatchEvent(eventId: string) {
    const prevEvents = events;
    setEvents(events.filter((event) => event.eventId !== eventId));
    setPending(eventId, true);
    try {
      const res = await fetch("/api/watched", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      if (!res.ok) {
        throw new Error("Failed to unwatch match.");
      }
    } catch (err) {
      setEvents(prevEvents);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(eventId, false);
    }
  }

  if (status !== "authenticated") {
    return (
      <div className="page auth-page">
        <header className="hero auth-hero">
          <div>
            <p className="eyebrow">Matchlog</p>
            <h1>Your watched matches live here.</h1>
            <p className="hero-copy">
              Sign in to see everything you have logged from the fixtures.
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
            <Link href="/" className="ghost-button">
              Back to fixtures
            </Link>
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
              <Link href="/" className="ghost-button">
                Back to fixtures
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
          <h1>Your watched matches</h1>
          <p className="hero-copy">
            Review everything you have marked as watched, and remove mistakes if
            needed.
          </p>
        </div>
        <div className="stats">
          <div className="stat">
            <span>Most watched team</span>
            <strong>{insights.topTeam}</strong>
          </div>
          <div className="stat">
            <span>Top league</span>
            <strong>{insights.topLeague}</strong>
          </div>
          <div className="stat">
            <span>Busiest day</span>
            <strong>{insights.topWeekday}</strong>
          </div>
          <div className="stat">
            <span>This week</span>
            <strong>{insights.weekCount}</strong>
          </div>
          <div className="stat">
            <span>This month</span>
            <strong>{insights.monthCount}</strong>
          </div>
          <div className="stat">
            <span>Total watched</span>
            <strong>{insights.totalCount}</strong>
          </div>
        </div>
      </header>

      <main className="content">
        <section className="panel">
          <div className="panel-header">
            <h2>All watched matches</h2>
            <p>{events.length} total</p>
          </div>
          {loading ? (
            <p className="empty-state">Loading watched matches...</p>
          ) : error ? (
            <p className="form-error">{error}</p>
          ) : events.length === 0 ? (
            <p className="empty-state">
              No watched matches yet. Head back and mark some fixtures.
            </p>
          ) : (
            <div className="log">
              {groupedEvents.map(([date, items]) => (
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
                          {formatEventTime(match.date, match.time)}
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
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => unwatchEvent(match.eventId)}
                          disabled={pendingIds.has(match.eventId)}
                        >
                          {pendingIds.has(match.eventId)
                            ? "Removing..."
                            : "Unwatch"}
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
