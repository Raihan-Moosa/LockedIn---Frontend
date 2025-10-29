"use client";

import { useEffect, useRef, useState,use } from "react";
import { supabase } from "@/lib/supabaseClient";
import Sidebar from "@/components/Sidebar";

type Session = {
  id: string;
  group_id: string;
  creator_id: string;
  start_at: string;
  venue: string | null;
  topic: string | null;
  time_goal_minutes: number | null;
  content_goal: string | null;
};

type ChatMessage = {
  id: number;
  group_id: string;
  session_id: string | null;
  sender_id: string;
  sender_name?: string | null;
  content: string | null;
  attachment_url: string | null;
  created_at: string;
};



type PageProps = {
  params: Promise<{ groupId: string }>;
};

export default function GroupSessionsPage({ params }: PageProps) {
    const API_URL = process.env.NEXT_PUBLIC_API_URL!;
    const resolvedParams = use(params);
    const { groupId } = resolvedParams;

  const [sessions, setSessions] = useState<Session[]>([]);
  const [startAt, setStartAt] = useState<string>("");
  const [venue, setVenue] = useState("");
  const [topic, setTopic] = useState("");
  const [timeGoal, setTimeGoal] = useState<number | "">("");
  const [contentGoal, setContentGoal] = useState("");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const [me, setMe] = useState<string | null>(null);

  // conflict + availability state
  const [myAccepted, setMyAccepted] = useState<Session[]>([]);
  const [conflictBanner, setConflictBanner] = useState<string | null>(null);
  const [unavailablePeople, setUnavailablePeople] = useState<string[]>([]);

  // --- helpers ---
  const authHeaders = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : undefined;
  };

  const minutesOrDefault = (min: number | null | undefined, def = 60) =>
    typeof min === "number" && min > 0 ? min : def;

  const sessionStart = (s: Session) => new Date(s.start_at);
  const sessionEnd = (s: Session) => {
    const end = new Date(s.start_at);
    end.setMinutes(end.getMinutes() + minutesOrDefault(s.time_goal_minutes));
    return end;
  };

  const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) =>
    aStart < bEnd && bStart < aEnd;

  // --- loaders ---
  const loadSessions = async () => {
    const headers = await authHeaders();
    const r = await fetch(`${API_URL}/api/groups/${groupId}/sessions`, { headers });
    const j = await r.json();
    const list: Session[] = j.sessions || [];
    setSessions(list);
    refreshConflictSignals(list);
  };

  const loadMessages = async () => {
    const headers = await authHeaders();
    const r = await fetch(`${API_URL}/api/groups/${groupId}/messages?limit=200`, { headers });
    const j = await r.json();
    setMessages(j.messages || []);
    // auto-scroll to bottom (SAFE CALL)
    setTimeout(() => listRef.current?.scrollTo?.({ top: listRef.current!.scrollHeight }), 0);
  };

  const loadMyAccepted = async () => {
    try {
      const headers = await authHeaders();
      const r = await fetch(`${API_URL}/api/my/sessions?status=accepted`, { headers });
      if (!r.ok) return; // endpoint optional; fail quietly
      const j = await r.json();
      setMyAccepted(Array.isArray(j.sessions) ? j.sessions : []);
    } catch {
      // ignore
    }
  };

  // --- conflict/availability evaluation ---
  const refreshConflictSignals = async (list: Session[]) => {
    setConflictBanner(null);
    setUnavailablePeople([]);

    // self-conflict banner
    for (const s of list) {
      const hasMine = myAccepted.some((m) =>
        overlaps(sessionStart(s), sessionEnd(s), sessionStart(m), sessionEnd(m))
      );
      if (hasMine) {
        setConflictBanner(
          "Heads up: You have another accepted session that overlaps one or more of these times."
        );
        break;
      }
    }

    // optional: group availability (show for next upcoming)
    try {
      if (list.length) {
        const soonest = [...list].sort((a, b) => +sessionStart(a) - +sessionStart(b))[0];
        const q = new URLSearchParams({
          start: sessionStart(soonest).toISOString(),
          end: sessionEnd(soonest).toISOString(),
        }).toString();
        const headers = await authHeaders();
        const r = await fetch(`${API_URL}/api/groups/${groupId}/availability?${q}`, { headers });
        if (r.ok) {
          const j = await r.json();
          if (Array.isArray(j.unavailable_usernames) && j.unavailable_usernames.length) {
            setUnavailablePeople(j.unavailable_usernames);
          }
        }
      }
    } catch {
      // ignore if not implemented
    }
  };

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled) setMe(data?.session?.user?.id ?? null);
    };
    init();

    loadSessions();
    loadMessages();
    loadMyAccepted();

    const poll = setInterval(loadMessages, 2000);

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) setMe(session?.user?.id ?? null);
    });

    return () => {
      cancelled = true;
      clearInterval(poll);
      try {
        // support both real SDK and jest mocks

        sub?.subscription?.unsubscribe?.();
        // @ts-expect-error - for jest mock compatibility
        sub?.unsubscribe?.();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  // --- actions ---
  const createSession = async () => {
    if (!startAt) return alert("Please pick a date and time");

    // warn if creator has conflict with their already accepted sessions
    const start = new Date(startAt);
    const end = new Date(startAt);
    end.setMinutes(end.getMinutes() + (typeof timeGoal === "number" ? timeGoal : 60));
    const iHaveConflict = myAccepted.some((m) =>
      overlaps(start, end, sessionStart(m), sessionEnd(m))
    );
    if (iHaveConflict && !confirm("This overlaps one of your accepted sessions. Create anyway?")) {
      return;
    }

    const headers = { "Content-Type": "application/json", ...(await authHeaders()) };
    const r = await fetch(`${API_URL}/api/groups/${groupId}/sessions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        start_at: new Date(startAt).toISOString(),
        venue: venue || null,
        topic: topic || null,
        time_goal_minutes: timeGoal === "" ? null : Number(timeGoal),
        content_goal: contentGoal || null,
      }),
    });
    const j = await r.json();
    if (!r.ok) return alert(j?.error || "Failed");
    setStartAt("");
    setVenue("");
    setTopic("");
    setTimeGoal("");
    setContentGoal("");
    await loadSessions();
  };

  const handleDeleteSession = async (sessionId: string) => {
    const headers = await authHeaders();
    const resp = await fetch(`${API_URL}/api/groups/${groupId}/sessions/${sessionId}`, {
      method: "DELETE",
      headers,
    });
    if (resp.ok) {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } else {
      const j = await resp.json();
      alert(j.error || "Failed to delete session");
    }
  };



  const sendMessage = async () => {
    if (!message && !file) return;
    setSending(true);
    try {
      let attachment_url: string | null = null;

      if (file) {
        const { data: userData } = await supabase.auth.getSession();
        const uid = userData?.session?.user?.id;
        if (!uid) throw new Error("User not authenticated");

        const path = `${groupId}/${Date.now()}-${file.name}`;
        const { data, error } = await supabase.storage
          .from("group-uploads")
          .upload(path, file, { upsert: false });
        if (error) throw error;

        const { data: urlData } = supabase.storage.from("group-uploads").getPublicUrl(path);
        attachment_url = urlData.publicUrl;
      }

      const headers = { "Content-Type": "application/json", ...(await authHeaders()) };
      const r = await fetch(`${API_URL}/api/groups/${groupId}/messages`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          session_id: null,
          content: message || null,
          attachment_url,
        }),
      });
      const j = await r.json();
      if (!r.ok) return alert(j?.error || "Send failed");
      setMessage("");
      setFile(null);
      await loadMessages();
      // SAFE CALL
      listRef.current?.scrollTo?.({ top: listRef.current!.scrollHeight, behavior: "smooth" });
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Upload/send failed";
      alert(errorMessage);
    } finally {
      setSending(false);
    }
  };

  return (
  <div className="dashboardLayout">
              <Sidebar />
      <main className="dashboardContent ">
      <div className="dashboard-wrapper">
      <header className="dashboard-header" style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <h1>📅 Group Sessions</h1>
      </header>

      {/* Planner */}
      <section className="dashboard-section" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <div className="card">
          <h2>Plan a Study Session</h2>
          <label>Date & time</label>
          <input type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} />
          <label>Venue</label>
          <input value={venue} onChange={e => setVenue(e.target.value)} placeholder="e.g., Library Room 3" />
          <label>What will we study?</label>
          <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g., Linear Algebra Ch. 4" />
          <label>Study time goal (minutes)</label>
          <input type="number" min="0" value={timeGoal} onChange={e => setTimeGoal(e.target.value === "" ? "" : Number(e.target.value))} />
          <label>Content goal</label>
          <input value={contentGoal} onChange={e => setContentGoal(e.target.value)} placeholder="e.g., Finish problem set Q1–Q5" />
          <button onClick={createSession}>Create session</button>
        </div>

        <div className="card">
          <h2>Upcoming Sessions</h2>
          {!sessions.length ? <p>No sessions yet.</p> : (
            <ul className="list" style={{ maxHeight: 260, overflow: "auto" }}>
              {sessions.map(s => (
                <li key={s.id} className="list-item">
                  <strong>{new Date(s.start_at).toLocaleString()}</strong>
                  <div><small>Venue: {s.venue || "—"}</small></div>
                  <div><small>Topic: {s.topic || "—"}</small></div>
                  <div><small>Time goal: {s.time_goal_minutes ? `${s.time_goal_minutes} min` : "—"}</small></div>
                  <div><small>Content goal: {s.content_goal || "—"}</small></div>

                  {/* Delete button (only for creator) */}
                  {me === s.creator_id && (
                    <button
                      onClick={() => handleDeleteSession(s.id)}
                      style={{ marginTop: "6px", color: "white" }}
                    >
                      Delete
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Chat */}
      <section className="dashboard-section" style={{ marginTop:16, display:"grid", gridTemplateColumns:"1fr", gap:16 }}>
        <div className="card">
          <h2>Group Chat</h2>
          <div ref={listRef}
              style={{ height: 320,  border: "1px solid #eee",
                        borderRadius: 8, padding: 12, background:"#f8fafc" }}>
            {messages.map(m => {
              const mine = m.sender_id === me;
              return (
                <div key={m.id} style={{
                  display:"flex",
                  justifyContent: mine ? "flex-end" : "flex-start",
                  marginBottom: 10
                }}>
                  <div style={{
                    maxWidth: "75%",
                    background: mine ? "#DCF8C6" : "#ffffff", // WA vibe
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: "8px 10px",
                    boxShadow: "0 1px 2px rgba(0,0,0,.06)"
                  }}>
                    {!mine && (
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color:"#475569" }}>
                        {m.sender_name || "Unknown"}
                      </div>
                    )}
                    {m.content && <div style={{ whiteSpace:"pre-wrap" }}>{m.content}</div>}
                    {m.attachment_url && (
                      <div style={{ marginTop: 6 }}>
                        <a href={m.attachment_url} target="_blank" rel="noreferrer">📎 Attachment</a>
                      </div>
                    )}
                    <div style={{ fontSize: 11, textAlign:"right", color:"#64748b", marginTop: 4 }}>
                      {new Date(m.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{  gap:8, marginTop:8, alignItems:"flex-end" }}>
            <textarea
              style={{ flex:1, minHeight: 90, resize: "vertical", padding: 10, borderRadius:8, border:"1px solid #e5e7eb" }}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Write a message… (Shift+Enter for newline)"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
            <button onClick={sendMessage} disabled={sending}>
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      </section>
      </div>
    </main>
    </div>
  );
}