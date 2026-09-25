import { useState } from "react";
import { AppEntry } from "../api";
import "./AppList.css";

interface Props {
  profileId: string;
  apps: AppEntry[];
  isConnected: boolean;
  onBind: (exe: string) => Promise<void>;
  onUnbind: (exe: string) => Promise<void>;
  onLaunch: (exe: string) => Promise<void>;
}

export function AppList({ apps, isConnected, onBind, onUnbind, onLaunch }: Props) {
  const [addingPath, setAddingPath] = useState("");
  const [busy, setBusy] = useState<string | null>(null); // tracks which exe is busy

  const wrap = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try { await fn(); } finally { setBusy(null); }
  };

  const handleAdd = async () => {
    const path = addingPath.trim();
    if (!path) return;
    await wrap("__add__", () => onBind(path));
    setAddingPath("");
  };

  return (
    <div className="app-list">
      {apps.length === 0 ? (
        <div className="app-list-empty">
          No apps bound. Add an exe path below to route it through this tunnel.
        </div>
      ) : (
        <ul className="app-list-items">
          {apps.map((app) => (
            <li key={app.exe} className="app-item">
              <div className="app-item-left">
                <AppIcon />
                <div className="app-item-info">
                  <span className="app-item-name">{exeName(app.exe)}</span>
                  <span className="app-item-path">{app.exe}</span>
                </div>
              </div>
              <div className="app-item-actions">
                {isConnected && (
                  <button
                    className="app-btn app-btn-launch"
                    disabled={busy === app.exe + "-launch"}
                    onClick={() => wrap(app.exe + "-launch", () => onLaunch(app.exe))}
                    title="Launch app through tunnel"
                  >
                    {busy === app.exe + "-launch" ? <MiniSpinner /> : <LaunchIcon />}
                    Launch
                  </button>
                )}
                <button
                  className="app-btn app-btn-remove"
                  disabled={busy === app.exe + "-remove"}
                  onClick={() => wrap(app.exe + "-remove", () => onUnbind(app.exe))}
                  title="Remove from profile"
                >
                  {busy === app.exe + "-remove" ? <MiniSpinner /> : "✕"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Add app row */}
      <div className="app-add-row">
        <input
          className="app-add-input"
          placeholder="C:\path\to\app.exe"
          value={addingPath}
          onChange={(e) => setAddingPath(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
        />
        <button
          className="app-add-btn"
          disabled={!addingPath.trim() || busy === "__add__"}
          onClick={handleAdd}
        >
          {busy === "__add__" ? <MiniSpinner /> : "Add"}
        </button>
      </div>
    </div>
  );
}

function exeName(path: string): string {
  return path.split(/[/\\]/).pop() ?? path;
}

function AppIcon() {
  return (
    <svg className="app-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="5" height="5" rx="1.5" fill="currentColor" opacity="0.6"/>
      <rect x="9" y="2" width="5" height="5" rx="1.5" fill="currentColor" opacity="0.6"/>
      <rect x="2" y="9" width="5" height="5" rx="1.5" fill="currentColor" opacity="0.6"/>
      <rect x="9" y="9" width="5" height="5" rx="1.5" fill="currentColor" opacity="0.6"/>
    </svg>
  );
}

function LaunchIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
      <path d="M4 8h8M9 5l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function MiniSpinner() {
  return <span className="mini-spinner" />;
}
