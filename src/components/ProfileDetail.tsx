import { useState, useRef } from "react";
import { Profile } from "../api";
import { AppList } from "./AppList";
import "./ProfileDetail.css";

interface Props {
  profile: Profile;
  isConnected: boolean;
  onConnect: () => Promise<void>;
  onDisconnect: () => Promise<void>;
  onDelete: () => Promise<void>;
  onImportWireGuard: (contents: string) => Promise<void>;
  onBindApp: (exe: string) => Promise<void>;
  onUnbindApp: (exe: string) => Promise<void>;
  onLaunchApp: (exe: string) => Promise<void>;
}

export function ProfileDetail({
  profile,
  isConnected,
  onConnect,
  onDisconnect,
  onDelete,
  onImportWireGuard,
  onBindApp,
  onUnbindApp,
  onLaunchApp,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const wrap = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e: unknown) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleToggle = () =>
    wrap(isConnected ? onDisconnect : onConnect);

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const contents = await file.text();
    await wrap(() => onImportWireGuard(contents));
    // Reset so the same file can be re-imported
    e.target.value = "";
  };

  const hasWireGuardConf = profile.apps !== undefined; // placeholder — always true after import

  return (
    <div className="profile-detail">
      {/* Header */}
      <div className="pd-header">
        <div className="pd-header-left">
          <h1 className="pd-name">{profile.name}</h1>
          <StatusPill connected={isConnected} />
        </div>
        <div className="pd-header-right">
          <button
            className="btn-icon"
            title="Import WireGuard config"
            onClick={handleImportClick}
          >
            <ImportIcon />
            <span>Import .conf</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".conf"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          {!confirmDelete ? (
            <button
              className="btn-icon btn-icon-danger"
              title="Delete profile"
              onClick={() => setConfirmDelete(true)}
            >
              <TrashIcon />
            </button>
          ) : (
            <div className="confirm-delete">
              <span>Delete?</span>
              <button className="btn-danger-sm" onClick={() => wrap(onDelete)}>
                Yes
              </button>
              <button className="btn-ghost-sm" onClick={() => setConfirmDelete(false)}>
                No
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="pd-error">
          <span>{error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Connect button */}
      <div className="pd-connect-section">
        <button
          className={`connect-btn ${isConnected ? "connected" : "disconnected"}`}
          onClick={handleToggle}
          disabled={busy}
        >
          {busy ? (
            <span className="btn-spinner" />
          ) : isConnected ? (
            "Disconnect"
          ) : (
            "Connect"
          )}
        </button>
        <p className="pd-connect-hint">
          {isConnected
            ? "Traffic from bound apps is routed through the tunnel."
            : "Connect to start routing traffic through this profile."}
        </p>
      </div>

      <div className="pd-divider" />

      {/* Apps section */}
      <div className="pd-section">
        <div className="pd-section-header">
          <h2 className="pd-section-title">Bound apps</h2>
          <p className="pd-section-hint">
            Apps listed here are launched through the tunnel.
          </p>
        </div>
        <AppList
          profileId={profile.id}
          apps={profile.apps}
          isConnected={isConnected}
          onBind={onBindApp}
          onUnbind={onUnbindApp}
          onLaunch={onLaunchApp}
        />
      </div>
    </div>
  );
}

function StatusPill({ connected }: { connected: boolean }) {
  return (
    <span className={`status-pill ${connected ? "connected" : "disconnected"}`}>
      <span className="status-pill-dot" />
      {connected ? "Connected" : "Disconnected"}
    </span>
  );
}

function ImportIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M8 1v9M4 7l4 4 4-4M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M2 4h12M6 4V2h4v2M5 4l1 9h4l1-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
