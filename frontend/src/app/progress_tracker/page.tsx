// src/app/progress_tracker/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import styles from "./page.module.css";
import { supabase } from "@/lib/supabaseClient";
import Sidebar from "@/components/Sidebar";

type Entry = { date: string; hours: number; productivity: number; notes?: string };

// F1 races
type Race = {
  id: number;
  season_id: number;
  circuit_id: number;
  round: number;
  name: string;
  date: string;          // "YYYY-MM-DD"
  time?: string | null;  // "HH:mm:ss" (assumed UTC if present)
};
type ParsedRace = Race & { startAt: Date };

export default function ProgressTracker() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL!;
  const todayStr = new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState(todayStr);
  const [hours, setHours] = useState<number | "">("");
  const [productivity, setProductivity] = useState(3);
  const [notes, setNotes] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState<string | null>(null);

  // F1 state
  const [races, setRaces] = useState<ParsedRace[]>([]);
  const [racesLoading, setRacesLoading] = useState(false);
  const [racesError, setRacesError] = useState<string | null>(null);

  // Calendar state
  const now = new Date();
  const [calMonth, setCalMonth] = useState<Date>(new Date(now.getFullYear(), now.getMonth(), 1));
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const isTest = process.env.NODE_ENV === "test";
  const ENABLE_F1_IN_TESTS = process.env.NEXT_PUBLIC_PT_TEST_F1 === "1";

  const authHeaders = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : undefined;
  };

  // Load progress entries
  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      const headers = await authHeaders();
      if (!headers) return;

      try {
        const resp = await fetch(`${API_URL}/api/progress`, { headers });
        if (!resp.ok) return;
        const j = await resp.json().catch(() => ({}));
        if (!cancelled) setEntries(Array.isArray(j.entries) ? j.entries : []);
      } catch {
        /* ignore */
      }
    };

    fetchData();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) fetchData();
    });

    return () => {
      cancelled = true;
      // support both real SDK and jest mocks
      sub?.subscription?.unsubscribe?.();
      // @ts-expect-error - for jest mock compatibility
      sub?.unsubscribe?.();
    };
  }, [API_URL]);

  // Load F1 races (skip in Jest by default to keep tests fast/stable)
  useEffect(() => {
    if (isTest && !ENABLE_F1_IN_TESTS) return;

    const fetchRaces = async () => {
      const parse = (data: Race[]) => {
        const parsed: ParsedRace[] = (Array.isArray(data) ? data : []).map((r) => {
          const t = r.time && r.time.trim().length ? r.time : "00:00:00";
          const dt = new Date(`${r.date}T${t}Z`);
          return { ...r, startAt: dt };
        });
        parsed.sort((a, b) => +a.startAt - +b.startAt);
        return parsed;
      };

      try {
        setRacesLoading(true);
        setRacesError(null);

        // 1) proxy (avoids CORS)
        let resp = await fetch("/api/f1", { cache: "no-store" });
        if (resp.ok) {
          setRaces(parse(await resp.json()));
          return;
        }

        // 2) direct fallback
        resp = await fetch("/api/f1");
        if (resp.ok) {
          setRaces(parse(await resp.json()));
          return;
        }

        throw new Error("Both proxy and direct calls failed");
      } catch {
        setRacesError("Could not load F1 schedule. Please try again later.");
      } finally {
        setRacesLoading(false);
      }
    };

    fetchRaces();
  }, [ENABLE_F1_IN_TESTS, isTest]);

  // ---- Hours validation helpers ----
  const validateHours = (val: number | ""): string | null => {
    if (val === "") return "Enter hours (number > 0).";
    if (typeof val !== "number" || Number.isNaN(val)) return "Please enter a valid number.";
    if (val <= 0) return "Hours must be greater than 0.";
    if (val > 23) return "Maximum 23 hours per day allowed."; 
    return null;
  };

  // Run validation whenever hours changes
  useEffect(() => {
    setError(validateHours(hours));
  }, [hours]);

  const handleHoursChange = (raw: string) => {
    if (raw === "") {
      setHours("");
      return;
    }
    const val = Number(raw);
    if (Number.isNaN(val)) {
      // represent invalid user input -> triggers proper error message
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setHours(NaN as any);
      return;
    }
    setHours(val);
  };

  const handleLogHours = async () => {
    const validation = validateHours(hours);
    if (validation) {
      setError(validation);
      return;
    }

    const numericHours = Number(hours);

    try {
      const headers = { "Content-Type": "application/json", ...(await authHeaders()) };
      const resp = await fetch(`${API_URL}/api/progress`, {
        method: "POST",
        headers,
        body: JSON.stringify({ date, hours: numericHours, productivity, notes }),
      });

      interface SaveResponse {
  error?: string;
  entry?: Entry;
}

let j: SaveResponse | null = null;
      try {
        j = await resp.json();
      } catch {
        j = null;
      }

      if (!resp.ok) {
        alert(j?.error || "Save failed");
        return;
      }

      const existingIndex = entries.findIndex((e) => e.date === date);
      const newEntry = (j && j.entry) as Entry;
      let updated = [...entries];
      if (existingIndex >= 0) updated[existingIndex] = newEntry;
      else updated = [newEntry, ...entries].slice(0, 7);
      setEntries(updated);

      setHours("");
      setNotes("");
      setProductivity(3);
      setError(null);
    } catch {
      alert("Save failed");
    }
  };

  // Summary numbers
  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
  const avgHours = entries.length ? (totalHours / entries.length).toFixed(1) : 0;

  // Motivational message
  const todayEntry = entries.find((e) => e.date === date);
  let motivationMessage = "Start logging your study hours today!";
  if (todayEntry) {
    if (todayEntry.hours >= 4) motivationMessage = "Amazing work! Super productive today! 🎉";
    else if (todayEntry.hours >= 2) motivationMessage = "Great job! Keep the momentum going! 💪";
    else if (todayEntry.hours > 0) motivationMessage = "Good start! Every hour counts! 👍";
  }

  // --- Calendar helpers ---
  const toKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const raceMap = useMemo(() => {
    const m = new Map<string, ParsedRace[]>();
    for (const r of races) {
      const key = toKey(r.startAt);
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(r);
    }
    return m;
  }, [races]);

  const startOfMonth = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1);
  const endOfMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0);
  const startWeekday = startOfMonth.getDay(); // 0 Sun .. 6 Sat
  const daysInMonth = endOfMonth.getDate();

  // produce 6x7 = 42 cells (stable grid height)
  const gridDates: Date[] = useMemo(() => {
    const arr: Date[] = [];
    for (let i = 0; i < startWeekday; i++) {
      const d = new Date(startOfMonth);
      d.setDate(d.getDate() - (startWeekday - i));
      arr.push(d);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      arr.push(new Date(calMonth.getFullYear(), calMonth.getMonth(), d));
    }
    while (arr.length % 7 !== 0) {
      const last = arr[arr.length - 1];
      const d = new Date(last);
      d.setDate(d.getDate() + 1);
      arr.push(d);
    }
    while (arr.length < 42) {
      const last = arr[arr.length - 1];
      const d = new Date(last);
      d.setDate(d.getDate() + 1);
      arr.push(d);
    }
    return arr;
  }, [calMonth, startWeekday, daysInMonth, startOfMonth]);

  const isSameMonth = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

  const nextMonth = () =>
    setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1));
  const prevMonth = () =>
    setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1));

  const upcomingRaces = useMemo(
    () => races.filter((r) => r.startAt >= new Date(now.getTime() - 24 * 60 * 60 * 1000)),
    [races, now]
  );
  const nextRace = upcomingRaces[0] || null;
  const daysUntil = (d: Date) =>
    Math.max(0, Math.ceil((+d - +now) / (1000 * 60 * 60 * 24)));

  return (
    <div className="dashboardLayout">
      <Sidebar />
      <main className="dashboardContent ">
        <div className="dashboard-wrapper">
          <header className={styles.header}>
            <h1>Progress Tracker</h1>
            <p>Log your study hours and track your progress over time.</p>
          </header>

          <section className={styles.grid}>
            {/* Left Column: Log + Motivation */}
            <div className={styles.leftColumn}>
              <div className={styles.card}>
                <h2>Log Study Hours</h2>

                <label htmlFor="pt-date">Date</label>
                <input id="pt-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />

                <label htmlFor="pt-hours">Hours</label>
                <input
                  id="pt-hours"
                  type="number"
                  min="0.1"
                  step="0.1"
                  inputMode="decimal"
                  placeholder="Hours studied"
                  value={hours}
                  onKeyDown={(e) => {
                    if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
                  }}
                  onChange={(e) => handleHoursChange(e.target.value)}
                  aria-invalid={!!error}
                  aria-describedby={error ? "pt-hours-err" : undefined}
                />
                {error && (
                  <p id="pt-hours-err" style={{ color: "#b91c1c", marginTop: 6, fontSize: 13 }}>
                    {error}
                  </p>
                )}

                <label htmlFor="pt-prod">Productivity: {productivity}/5</label>
                <input
                  id="pt-prod"
                  type="range"
                  min="0"
                  max="5"
                  value={productivity}
                  onChange={(e) => setProductivity(Number(e.target.value))}
                />

                <label htmlFor="pt-notes">Notes</label>
                <input
                  id="pt-notes"
                  type="text"
                  placeholder="Optional notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />

                <button onClick={handleLogHours} disabled={!!error}>
                  Log Hours
                </button>
              </div>

              {entries.length > 0 && (
                <div className={styles.card}>
                  <h2>Motivation</h2>
                  <p className={styles.motivation}>{motivationMessage}</p>
                </div>
              )}
            </div>

            {/* Right Column: Summary + Chart + F1 Motivation */}
            <div className={styles.rightColumn}>
              <div className={styles.card}>
                <h2>Weekly Summary</h2>
                {entries.length === 0 ? (
                  <p className={styles.placeholder}>
                    No study hours logged yet. Start by adding today’s hours!
                  </p>
                ) : (
                  <>
                    <ul className={styles.summaryList}>
                      {entries.map((entry) => (
                        <li key={entry.date}>
                          <strong>{entry.date}</strong> → {entry.hours}h (Productivity: {entry.productivity}/5)
                          {entry.notes ? ` (${entry.notes})` : ""}
                        </li>
                      ))}
                    </ul>

                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={[...entries].reverse()} margin={{ top: 10, bottom: 10 }}>
                        <defs>
                          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#007acc" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#00d4ff" stopOpacity={0.6} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="hours" fill="url(#grad)" radius={[6, 6, 0, 0]} barSize={30} />
                      </BarChart>
                    </ResponsiveContainer>

                    <p className={styles.total}>
                      This week: {totalHours} hours total, avg {avgHours}h/day
                    </p>
                  </>
                )}
              </div>

              <div className={styles.card} style={{ marginTop: 16 }}>
                <h2>F1 Motivation Calendar</h2>

                {racesLoading && <p>Loading F1 schedule…</p>}
                {racesError && <p style={{ color: "#b91c1c" }}>{racesError}</p>}

                {!racesLoading && !racesError && (
                  <>
                    {nextRace && (
                      <div
                        style={{
                          padding: "8px 10px",
                          borderRadius: 8,
                          background: "#ecfeff",
                          border: "1px solid #a5f3fc",
                          color: "#155e75",
                          marginBottom: 10,
                        }}
                      >
                        <strong>Next race:</strong> {nextRace.name} •{" "}
                        <span suppressHydrationWarning>
                          {nextRace.startAt.toLocaleString([], {
                            weekday: "short",
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span
                          style={{
                            marginLeft: 8,
                            fontSize: 12,
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: "#cffafe",
                            border: "1px solid #a5f3fc",
                          }}
                        >
                          in {daysUntil(nextRace.startAt)} days
                        </span>
                      </div>
                    )}

                    {/* Calendar header */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <button onClick={prevMonth} style={{ padding: "2px 8px" }}>←</button>
                      <div style={{ fontWeight: 600 }}>
                        <span suppressHydrationWarning>
                          {calMonth.toLocaleString(undefined, { month: "long", year: "numeric" })}
                        </span>
                      </div>
                      <button onClick={nextMonth} style={{ padding: "2px 8px" }}>→</button>
                    </div>

                    {/* Weekday row */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(7, 1fr)",
                        gap: 6,
                        fontSize: 12,
                        marginBottom: 6,
                        color: "#64748b",
                      }}
                    >
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                        <div key={d} style={{ textAlign: "center" }}>{d}</div>
                      ))}
                    </div>

                    {/* Calendar grid */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(7, 1fr)",
                        gap: 6,
                      }}
                    >
                      {gridDates.map((d, idx) => {
                        const key = toKey(d);
                        const inMonth = isSameMonth(d, calMonth);
                        const hasRaces = raceMap.has(key);
                        const selected = selectedDateKey === key;

                        return (
                          <button
                            key={idx}
                            onClick={() => setSelectedDateKey(key)}
                            title={hasRaces ? raceMap.get(key)!.map((r) => r.name).join(", ") : key}
                            style={{
                              textAlign: "left",
                              padding: 8,
                              borderRadius: 10,
                              border: selected ? "2px solid #0ea5e9" : "1px solid #e5e7eb",
                              background: inMonth ? "#ffffff" : "#f8fafc",
                              opacity: inMonth ? 1 : 0.65,
                              minHeight: 64,
                              position: "relative",
                            }}
                          >
                            <div style={{ fontSize: 12, color: "#334155", marginBottom: 6 }}>
                              {d.getDate()}
                            </div>
                            {hasRaces && (
                              <div
                                style={{
                                  position: "absolute",
                                  top: 8,
                                  right: 8,
                                  width: 8,
                                  height: 8,
                                  borderRadius: "50%",
                                  background: "#ef4444",
                                }}
                              />
                            )}
                            {hasRaces && (
                              <div style={{ fontSize: 11, color: "#0f172a", lineHeight: 1.2 }}>
                                {(raceMap.get(key)![0]?.name || "").slice(0, 22)}
                                {raceMap.get(key)!.length > 1 ? " +" : ""}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Day details */}
                    {selectedDateKey && raceMap.has(selectedDateKey) && (
                      <div style={{ marginTop: 10 }}>
                        <h3 style={{ fontSize: 14, color: "#334155", marginBottom: 6 }}>
                          <span suppressHydrationWarning>
                            {new Date(selectedDateKey + "T00:00:00").toLocaleDateString(undefined, {
                              weekday: "long",
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            })}
                          </span>
                        </h3>
                        <ul className={styles.summaryList}>
                          {raceMap.get(selectedDateKey)!.map((r) => (
                            <li key={r.id}>
                              <strong>{r.name}</strong> —{" "}
                              <span suppressHydrationWarning>
                                {r.startAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>{" "}
                              <span style={{ fontSize: 12, color: "#64748b" }}>(Round {r.round})</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
