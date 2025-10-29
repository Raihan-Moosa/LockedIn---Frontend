// app/groups/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";


type Friend = { id: string; full_name: string; email: string; degree?: string|null; };
type Group = { id: string; name: string; module: string|null; owner_id: string; };
type GroupInvite = {
  id: number;
  group_id: string;
  status: "pending"|"accepted"|"declined";
  group_name?: string|null;
  group_module?: string|null;
  group_owner_id?: string|null;
};

export default function GroupsPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL!;
  const [groups, setGroups] = useState<Group[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [invites, setInvites] = useState<GroupInvite[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [step, setStep] = useState<1|2>(1);
  const [gName, setGName] = useState("");
  const [gModule, setGModule] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [showInbox, setShowInbox] = useState(false);
  const [creating, setCreating] = useState(false);

  const authHeaders = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : undefined;
  };


  const loadGroups = async () => {
    const headers = await authHeaders();
    const r = await fetch(`${API_URL}/api/groups`, { headers });
    const j = await r.json();
    setGroups(j.groups || []);
  };
  const loadFriends = async () => {
    const headers = await authHeaders();
    const r = await fetch(`${API_URL}/api/friends`, { headers });
    const j = await r.json();
    setFriends(j.friends || []);
  };
  const loadInvites = async () => {
    const headers = await authHeaders();
    const r = await fetch(`${API_URL}/api/group-invitations/received`, { headers });
    const j = await r.json();
    setInvites(j.invitations || []);
  };

  useEffect(() => {
  let mounted = true;

  async function prime() {
    const { data } = await supabase.auth.getSession();
    if (!mounted) return;
    if (data?.session?.access_token) {
      await Promise.all([loadGroups(), loadFriends(), loadInvites()]);
    }
  }

  // on mount + when auth changes
  prime();
  const { data: sub } = supabase.auth.onAuthStateChange((_e, _s) => { prime(); });

  // refetch when tab gains focus
  const onVis = () => { if (document.visibilityState === "visible") prime(); };
  document.addEventListener("visibilitychange", onVis);

  return () => {
    mounted = false;
    sub.subscription.unsubscribe();
    document.removeEventListener("visibilitychange", onVis);
  };
}, []);


  const startCreate = () => { setGName(""); setGModule(""); setSelected([]); setStep(1); setShowCreate(true); };

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const submitCreate = async () => {
    if (!gName.trim()) { alert("Group name required"); return; }
    setCreating(true);
    try {
      const headers = { "Content-Type": "application/json", ...(await authHeaders()) };
      const r1 = await fetch(`${API_URL}/api/groups`, {
        method: "POST", headers, body: JSON.stringify({ name: gName.trim(), module: gModule.trim() || null })
      });
      const j1 = await r1.json();
      if (!r1.ok) throw new Error(j1?.error || "Failed to create group");

      if (selected.length) {
        const r2 = await fetch(`${API_URL}/api/group-invitations`, {
          method: "POST", headers, body: JSON.stringify({ group_id: j1.group.id, recipient_ids: selected })
        });
        const j2 = await r2.json();
        if (!r2.ok) throw new Error(j2?.error || "Failed to send invites");
      }

      setShowCreate(false);
      await Promise.all([loadGroups(), loadInvites()]);
      alert("Group created!");
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Upload/send failed";
      alert(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const respondInvite = async (id: number, status: "accepted"|"declined") => {
    const headers = { "Content-Type": "application/json", ...(await authHeaders()) };
    const r = await fetch(`${API_URL}/api/group-invitations/${id}`, {
      method: "PUT", headers, body: JSON.stringify({ status })
    });
    const j = await r.json();
    if (!r.ok) return alert(j?.error || "Failed");
    await Promise.all([loadInvites(), loadGroups()]);
    if (status === "accepted") alert("Joined group!");
  };

  const cards = useMemo(() => groups.map(g => (
  <Link key={g.id} href={`/sessions/${g.id}`} className="card" style={{ width: 280, display: "block", textDecoration: "none", color: "inherit" }}>
    <div className="card-body">
      <h3>{g.name}</h3>
      <p><small>Module: {g.module || "—"}</small></p>
    </div>
  </Link>
  )), [groups]);

  return (
    <div className="dashboardLayout">
            <Sidebar />
    <main className="dashboardContent ">
    <div className="dashboard-wrapper">
      <header className="dashboard-header" style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <h1>👥 Study Groups</h1>
        <div style={{ display:"flex", gap:12 }}>
          <button onClick={startCreate}>Create Group</button>
          <button onClick={() => setShowInbox(v => !v)}>🔔</button>
        </div>
      </header>

      <section className="dashboard-section" style={{ display:"flex", flexWrap:"wrap", gap:16, marginTop:16 }}>
        {cards.length ? cards : <p>No groups yet.</p>}
      </section>

      {/* Right sidebar: invites */}
      {showInbox && (
        <aside className="sidebar" style={{ position:"fixed", top:0, right:0, width:360, height:"100vh", background:"#fff", boxShadow:"-4px 0 12px rgba(0,0,0,0.1)", padding:16, overflow:"auto" }}>
          <h2>Group Invitations</h2>
          {!invites.length ? <p>No invitations.</p> : (
            <ul className="list">
              {invites.map(iv => (
                <li key={iv.id} className="list-item" style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <strong>{iv.group_name}</strong><br/>
                    <p></p>
                    <small>Module: {iv.group_module || "—"}</small>
                  </div>
                  {iv.status === "pending" ? (
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={() => respondInvite(iv.id, "accepted")}>Accept</button>
                      <button onClick={() => respondInvite(iv.id, "declined")}>Decline</button>
                    </div>
                  ) : <small>{iv.status}</small>}
                </li>
              ))}
            </ul>
          )}
        </aside>
      )}

      {/* Create group modal (two-step, same style as login popup) */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width:520, maxHeight:"80vh", overflow:"auto" }}>
            {step === 1 ? (
              <>
                <h2>Create Group</h2>
                <div style={{ marginBottom:12 }}>
                  <label>Group name</label>
                  <input className="text-input" value={gName} onChange={e => setGName(e.target.value)} />
                </div>
                <div style={{ marginBottom:12 }}>
                  <label>Study module</label>
                  <input className="text-input" value={gModule} onChange={e => setGModule(e.target.value)} />
                </div>
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <button onClick={() => setShowCreate(false)}>Cancel</button>
                  <button onClick={() => setStep(2)}>Next</button>
                </div>
              </>
            ) : (
              <>
                <h2>Invite Friends</h2>
                {!friends.length ? <p>You have no friends to invite.</p> : (
                  <ul className="list" style={{ maxHeight: "50vh", overflow: "auto" }}>
                    {friends.map(f => (
                      <li key={f.id} className="list-item" style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <div>
                          <strong>{f.full_name}</strong><br/>
                          <small>{f.email}</small>
                        </div>
                        <button onClick={() => toggleSelect(f.id)}>
                          {selected.includes(f.id) ? "✓ Added" : "+ Add"}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:12 }}>
                  <button onClick={() => setStep(1)}>Back</button>
                  <button onClick={submitCreate} disabled={creating}>{creating ? "Creating..." : "Create group"}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      </div>
    </main>
    </div>
  );
}