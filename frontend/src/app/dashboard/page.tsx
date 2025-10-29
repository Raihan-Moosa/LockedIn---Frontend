//frontend\src\app\dashboard\page.tsx

"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabaseClient";

type Group = { id: string; name?: string | null };
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
type Test = { id: string; name: string; scope?: string; test_date: string };
type Friend = { id: string; full_name: string; email: string; degree?: string|null; };

export default function DashboardPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL!;

  const [studyTime, setStudyTime] = useState<Record<string, unknown> | null>(null);
  const [upcomingTests, setUpcomingTests] = useState<Test[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [showTestModal, setShowTestModal] = useState(false);
  const [newTestName, setNewTestName] = useState("");
  const [newTestDate, setNewTestDate] = useState("");
  const [newTestScope, setNewTestScope] = useState("");

  const authHeaders = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : undefined;
  };

  // --- Loaders ---
  const loadStudyTime = async () => {
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_URL}/api/study-time`, { headers });
      if (res.ok) {
        const data = await res.json();
        setStudyTime(data);
      }
    } catch (err) {
      console.error("Study time error:", err);
      setStudyTime({});
    }
  };

  const loadTests = async () => {
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_URL}/api/upcoming`, { headers });
      if (res.ok) {
        const data = await res.json();
        setUpcomingTests(data.tests || []);
      }
    } catch (err) {
      console.error("Load tests error:", err);
    }
  };

  const loadGroups = async () => {
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_URL}/api/groups`, { headers });
      const data = await res.json();
      const list: Group[] = data.groups || [];
      setGroups(list);
      if (!selectedGroupId && list[0]) setSelectedGroupId(list[0].id);
    } catch (err) {
      console.error("Load groups error:", err);
    }
  };

  const loadSessions = async (groupId: string) => {
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_URL}/api/groups/${groupId}/sessions`, { headers });
      const data = await res.json();
      const list: Session[] = data.sessions || [];
      list.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
      setSessions(list.slice(0, 1));
    } catch (err) {
      console.error("Load sessions error:", err);
    }
  };

  const loadFriends = async () => {
    const headers = await authHeaders();
    const r = await fetch(`${API_URL}/api/friends`, { headers });
    const j = await r.json();
    setFriends(j.friends || []);
  };
  // --- Add Test ---
  const handleAddTest = async () => {
    if (!newTestName || !newTestDate) return;
    try {
      const headers = { "Content-Type": "application/json", ...(await authHeaders()) };
      const res = await fetch(`${API_URL}/api/assessments`, {
        method: "POST",
        headers,
        body: JSON.stringify({ name: newTestName, test_date: newTestDate, scope: newTestScope }),
      });
      if (res.ok) {
        setShowTestModal(false);
        setNewTestName("");
        setNewTestDate("");
        setNewTestScope("");
        await loadTests();
      } else {
        const err = await res.json();
        console.error("Add test failed:", err);
      }
    } catch (err) {
      console.error("Add test error:", err);
    }
  };

  useEffect(() => {
    loadStudyTime();
    loadTests();
    loadGroups();
    loadFriends();
  }, []);

  useEffect(() => {
    if (selectedGroupId) loadSessions(selectedGroupId);
  }, [selectedGroupId]);

  return (
    <div className="dashboardLayout">
      <Sidebar />
      <main className="dashboard-wrapper">
        <h1>📊 Student Dashboard</h1>

        {/* Study Time */}
        <section className="dashboard-section">
          <h2>Study Time</h2>
          {studyTime && Object.keys(studyTime).length ? (
            <div className="study-time-grid">
              {Object.entries(studyTime).map(([label, value]) => (
                <div key={label} className="card">
                  <span className="label">{label.toUpperCase()}</span>
                  <span className="value">{String(value)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p>Loading…</p>
          )}
        </section>

        {/* Upcoming Tests */}
        <section className="dashboard-section">
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px" }}>
  <h2 style={{ margin: 0 }}>Upcoming Tests</h2>
  <button
    onClick={() => setShowTestModal(true)}
    style={{
      padding: "7px 5px",
      fontSize: "0.9rem",
      borderRadius: "8px",
      background: "linear-gradient(90deg, #2b8efc, #60a5fa)",
      color: "#fff",
      border: "none",
      cursor: "pointer",
    }}
  >
    ➕ Add Test
  </button>
</div>

          {upcomingTests.length ? (
            <ul className="list">
              {upcomingTests.map((t) => (
                <li key={t.id} className="list-item">
                  <span>{t.name}</span>
                  <span className="date">{new Date(t.test_date).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>No upcoming tests 🎉</p>
          )}
        </section>

        {/* Add Test Modal */}
        {showTestModal && (
          <div className="modal-overlay">
            <div className="modal-card">
              <h3>Add Test</h3>
              <input
                type="text"
                placeholder="Test Name"
                value={newTestName}
                onChange={(e) => setNewTestName(e.target.value)}
              />
              <input
                type="date"
                placeholder="Test Date"
                value={newTestDate}
                onChange={(e) => setNewTestDate(e.target.value)}
              />
              <input
                type="text"
                placeholder="Scope"
                value={newTestScope}
                onChange={(e) => setNewTestScope(e.target.value)}
              />
              <div style={{ marginTop: 12 }}>
                <button onClick={handleAddTest}>Add</button>
                <button onClick={() => setShowTestModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Study Sessions */}
        <section className="dashboard-section">
          <h2>Upcoming Study Session</h2>
          {!sessions.length ? (
            <p>No sessions yet.</p>
          ) : (
            <ul className="list">
              {sessions.map((s) => (
                <li key={s.id} className="list-item">
                  <strong>{s.topic || "Study session"}</strong>
                  <div>{new Date(s.start_at).toLocaleString()}</div>
                  <div>Venue: {s.venue || "—"}</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Friends */}
        <section className="dashboard-section">
          <h2>Friends</h2>
          {friends.length ? (
             <ul className="friends-list" >
              {friends.map((f) => (
                <li
                  key={f.id}
                  className="friend-item"
                  style={{
                    // display: "flex",
                    alignItems: "center",
                    background: "#007acc",
                    color: "#fff",
                    // padding: "4px 8px",
                    // borderRadius: "6px",
                  }}
                >
                  {f.full_name || "Unknown"}
                </li>
              ))}

            </ul>

          ) : (
            <p>No friends yet 😢</p>
          )}
        </section>
      </main>

    </div>
  );
}
