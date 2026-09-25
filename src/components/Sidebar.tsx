import { useState } from "react";
import { Profile } from "../api";
import "./Sidebar.css";

interface Props {
  profiles: Profile[];
  connectedIds: Set<string>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreateProfile: (name: string) => Promise<void>;
}

export function Sidebar({ profiles, connectedIds, selectedId, onSelect, onCreateProfile }: Props) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    try {
      await onCreateProfile(name);
      setNewName("");
      setCreating(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">Tunnelbox</span>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Profiles</div>
        {profiles.length === 0 && (
          <div className="sidebar-empty">No profiles yet</div>
        )}
        {profiles.map((p) => (
          <button
            key={p.id}
            className={`sidebar-item ${selectedId === p.id ? "selected" : ""}`}
            onClick={() => onSelect(p.id)}
          >
            <StatusDot connected={connectedIds.has(p.id)} />
            <span className="sidebar-item-name">{p.name}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        {creating ? (
          <div className="sidebar-create-form">
            <input
              autoFocus
              className="sidebar-input"
              placeholder="Profile name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") { setCreating(false); setNewName(""); }
              }}
            />
            <div className="sidebar-create-actions">
              <button
                className="btn-ghost"
                onClick={() => { setCreating(false); setNewName(""); }}
              >Cancel</button>
              <button
                className="btn-primary"
                onClick={handleCreate}
                disabled={busy || !newName.trim()}
              >
                {busy ? "…" : "Create"}
              </button>
            </div>
          </div>
        ) : (
          <button className="sidebar-add-btn" onClick={() => setCreating(true)}>
            <span className="sidebar-add-icon">+</span>
            New profile
          </button>
        )}
      </div>
    </aside>
  );
}

function StatusDot({ connected }: { connected: boolean }) {
  return (
    <span
      className={`status-dot ${connected ? "connected" : "disconnected"}`}
    />
  );
}
