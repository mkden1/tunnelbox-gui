import { useEffect, useState, useCallback } from "react";
import { api, Profile } from "./api";
import { Sidebar } from "./components/Sidebar";
import { ProfileDetail } from "./components/ProfileDetail";
import { DaemonError } from "./components/DaemonError";
import "./App.css";

type AppState =
  | { kind: "connecting" }
  | { kind: "error"; message: string }
  | { kind: "ready" };

export default function App() {
  const [appState, setAppState] = useState<AppState>({ kind: "connecting" });
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());

  // Connect to daemon on mount
  useEffect(() => {
    api.daemonConnect()
      .then(() => {
        setAppState({ kind: "ready" });
        return refreshProfiles();
      })
      .catch((e: unknown) => {
        setAppState({ kind: "error", message: String(e) });
      });
  }, []);

  const refreshProfiles = useCallback(async () => {
    try {
      const [profileList, status] = await Promise.all([
        api.profileList(),
        api.tunnelStatus(),
      ]);
      setProfiles(profileList);
      setConnectedIds(
        new Set(
          Object.entries(status.tunnels)
            .filter(([, connected]) => connected)
            .map(([id]) => id)
        )
      );
      // Auto-select first profile if none selected
      setSelectedId((prev) => prev ?? profileList[0]?.id ?? null);
    } catch (e) {
      console.error("Failed to refresh profiles:", e);
    }
  }, []);

  const handleConnect = async (profileId: string) => {
    await api.tunnelConnect(profileId);
    setConnectedIds((prev) => new Set([...prev, profileId]));
  };

  const handleDisconnect = async (profileId: string) => {
    await api.tunnelDisconnect(profileId);
    setConnectedIds((prev) => {
      const next = new Set(prev);
      next.delete(profileId);
      return next;
    });
  };

  const handleCreateProfile = async (name: string) => {
    const profile = await api.profileCreate(name);
    await refreshProfiles();
    setSelectedId(profile.id);
  };

  const handleDeleteProfile = async (profileId: string) => {
    await api.profileDelete(profileId);
    await refreshProfiles();
    setSelectedId((prev) => (prev === profileId ? null : prev));
  };

  const handleImportWireGuard = async (profileId: string, contents: string) => {
    await api.wireguardImport(profileId, contents);
    await refreshProfiles();
  };

  const handleBindApp = async (profileId: string, exePath: string) => {
    await api.appBind(profileId, exePath);
    await refreshProfiles();
  };

  const handleUnbindApp = async (profileId: string, exePath: string) => {
    await api.appUnbind(profileId, exePath);
    await refreshProfiles();
  };

  const handleLaunchApp = async (profileId: string, exePath: string) => {
      try {
          await api.appLaunch(profileId, exePath, []);
      } catch (e) {
          console.error("Launch failed:", e);
          alert("Launch failed: " + String(e));
      }
  };

  const selectedProfile = profiles.find((p) => p.id === selectedId) ?? null;

  if (appState.kind === "connecting") {
    return (
      <div className="app-loading">
        <div className="spinner" />
        <span>Connecting to daemon…</span>
      </div>
    );
  }

  if (appState.kind === "error") {
    return <DaemonError message={appState.message} onRetry={() => {
      setAppState({ kind: "connecting" });
      api.daemonConnect()
        .then(() => { setAppState({ kind: "ready" }); return refreshProfiles(); })
        .catch((e: unknown) => setAppState({ kind: "error", message: String(e) }));
    }} />;
  }

  return (
    <div className="app">
      <Sidebar
        profiles={profiles}
        connectedIds={connectedIds}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onCreateProfile={handleCreateProfile}
      />
      <main className="app-main">
        {selectedProfile ? (
          <ProfileDetail
            profile={selectedProfile}
            isConnected={connectedIds.has(selectedProfile.id)}
            onConnect={() => handleConnect(selectedProfile.id)}
            onDisconnect={() => handleDisconnect(selectedProfile.id)}
            onDelete={() => handleDeleteProfile(selectedProfile.id)}
            onImportWireGuard={(contents) =>
              handleImportWireGuard(selectedProfile.id, contents)
            }
            onBindApp={(exe) => handleBindApp(selectedProfile.id, exe)}
            onUnbindApp={(exe) => handleUnbindApp(selectedProfile.id, exe)}
            onLaunchApp={(exe) => handleLaunchApp(selectedProfile.id, exe)}
          />
        ) : (
          <div className="app-empty">
            <p>No profile selected.</p>
            <p className="app-empty-hint">Create a profile to get started.</p>
          </div>
        )}
      </main>
    </div>
  );
}
