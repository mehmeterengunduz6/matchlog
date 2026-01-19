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

function formatDisplayTime(value: string | null) {
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
                          {formatDisplayTime(match.time)}
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
