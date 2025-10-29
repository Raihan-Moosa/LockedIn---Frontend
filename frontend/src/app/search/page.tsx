// search page.tsx
"use client";

import { FaSearch, FaInbox, FaBell } from "react-icons/fa";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaGraduationCap, FaBook, FaLightbulb, FaPlus, FaMinus } from "react-icons/fa";
import Sidebar from "@/components/Sidebar";

type Profile = {
  id: string;
  full_name: string;
  degree?: string | null;
  modules?: string[] | null;
  study_interest?: string | null;
};

type Invitation = {
  id: string;
  sender_name?: string | null;
  recipient_name?: string | null;
  status: "pending" | "accepted" | "declined";
};

type SearchKey = "modules" | "degree" | "interest" | "full_name";

export default function SearchPage() {
  const [searchType, setSearchType] = useState<SearchKey>("modules");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [sentInvites, setSentInvites] = useState<Invitation[]>([]);
  const [receivedInvites, setReceivedInvites] = useState<Invitation[]>([]);
  const [showInbox, setShowInbox] = useState(false);
  const [showBell, setShowBell] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

  // Live search with debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setIsLoading(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        const resp = await fetch(`${API_URL}/api/search`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            searchTerm: query.trim(),
            searchType, // server maps "interest"->"study_interest" and supports "full_name"
          }),
        });
        const json = await resp.json();
        setResults(Array.isArray(json?.profiles) ? json.profiles : []);
      } catch (e) {
        console.error("Search error", e);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query, searchType, API_URL]);

  // Fetch invites (sent + received)
  const fetchInvitations = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) return;
    try {
      const [sentResp, recvResp] = await Promise.all([
        fetch(`${API_URL}/api/invitations/sent`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/invitations/received`, {
          headers: { Authorization: `Bearer ${token}`},
        }),
      ]);
      const sent = await sentResp.json();
      const recv = await recvResp.json();
      setSentInvites(sent?.invitations || []);
      setReceivedInvites(recv?.invitations || []);
    } catch (e) {
      console.error("Error fetching invitations:", e);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const handleInvite = async (recipientId: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) return alert("Please log in first.");

    try {
      const resp = await fetch(`${API_URL}/api/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ recipient_id: recipientId }),
      });
      const j = await resp.json();
      if (resp.ok) {
        alert("Invitation sent!");
        fetchInvitations();
      } else {
        alert(j?.error || "Failed to send invite");
      }
    } catch (e) {
      console.error("Invite error", e);
    }
  };

  const handleRespond = async (invitationId: string, status: "accepted" | "declined") => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) return;

    try {
      const resp = await fetch(`${API_URL}/api/invitations/${invitationId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      const j = await resp.json();
      if (resp.ok) {
        alert(`Invitation ${status}`);
        fetchInvitations();
      } else {
        alert(j?.error || "Failed to respond");
      }
    } catch (e) {
      console.error("Response error", e);
    }
  };

  const BUTTONS: { key: SearchKey; label: string }[] = [
    { key: "modules", label: "MODULES" },
    { key: "degree", label: "DEGREE" },
    { key: "interest", label: "INTEREST" },
    { key: "full_name", label: "NAME" }, // new
  ];

  return (
    <div className="dashboardLayout">
                <Sidebar />
        <main className="dashboardContent ">
        <div className="dashboard-wrapper">
      <header className="dashboard-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>🤝 Study Partner Search</h1>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button onClick={() => { setShowInbox(!showInbox); setShowBell(false); }}>
            <FaInbox size={22} />
          </button>
          <button onClick={() => { setShowBell(!showBell); setShowInbox(false); }}>
            <FaBell size={22} />
          </button>
        </div>
      </header>

      {/* Search type */}
      <div style={{ marginTop: "1.5rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        {BUTTONS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSearchType(key)}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: searchType === key ? "var(--primary)" : "var(--muted)",
              color: "white",
              borderRadius: "0.5rem",
              border: "none",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div style={{ marginTop: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <FaSearch />
        <input
          type="text"
          placeholder={`Search by ${searchType.replace("_", " ")}...`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: 1, padding: "0.5rem", borderRadius: "0.25rem", border: "1px solid #ccc" }}
        />
      </div>

      {/* Results */}
      <section className="dashboard-section" style={{ marginTop: "2rem" }}>
        <h2>Results</h2>
        {isLoading ? <p>Loading...</p> : results.length === 0 ? <p>No results</p> : (
          <ul className="list">
            {results.map((p) => (
              <li key={p.id} className="list-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong>{p.full_name}</strong><br />
                  <p></p>
                  <small>
                    {searchType === "degree" && (p.degree || "—")}
                    {searchType === "interest" && (p.study_interest || "—")}
                    {searchType === "modules" && (p.modules?.join(", ") || "—")}
                    {searchType === "full_name" && (p.degree || p.study_interest || "—")}
                  </small>
                </div>
                <button onClick={() => handleInvite(p.id)}>Invite</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Sent */}
      {showInbox && (
        <section className="dashboard-section">
          <h2>📩 Sent Invitations</h2>
          {sentInvites.length ? (
            <ul className="list">
              {sentInvites.map((inv) => (
                <li key={inv.id} className="list-item">
                  To: {inv.recipient_name || "Unknown"} — Status: {inv.status}
                </li>
              ))}
            </ul>
          ) : <p>No invitations sent yet.</p>}
        </section>
      )}

      {/* Received */}
      {showBell && (
        <section className="dashboard-section">
          <h2>🔔 Received Invitations</h2>
          {receivedInvites.length ? (
            <ul className="list">
              {receivedInvites.map((inv) => (
                <li key={inv.id} className="list-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>From: {inv.sender_name || "Unknown"} — Status: {inv.status}</div>
                  {inv.status === "pending" && (
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button onClick={() => handleRespond(inv.id, "accepted")}>Accept</button>
                      <button onClick={() => handleRespond(inv.id, "declined")}>Decline</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : <p>No invitations received yet.</p>}
        </section>
      )}
      </div>
    </main>
    </div>
  );
}