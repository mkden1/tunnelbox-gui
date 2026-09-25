import { invoke } from "@tauri-apps/api/core";

export interface AppEntry {
  exe: string;
  enabled: boolean;
}

export interface Profile {
  id: string;
  name: string;
  apps: AppEntry[];
  auto_connect: boolean;
  kill_switch: boolean;
  connected: boolean;
}

export interface TunnelStatus {
  tunnels: Record<string, boolean>;
}

export interface DaemonStatus {
  version: string;
  wintun_loaded: boolean;
}

export const api = {
  daemonConnect: (): Promise<DaemonStatus> =>
    invoke("daemon_connect"),

  profileList: (): Promise<Profile[]> =>
    invoke("profile_list"),

  profileCreate: (name: string): Promise<Profile> =>
    invoke("profile_create", { name }),

  profileDelete: (profileId: string): Promise<void> =>
    invoke("profile_delete", { profileId }),

  wireguardImport: (profileId: string, contents: string): Promise<void> =>
    invoke("wireguard_import", { profileId, contents }),

  tunnelConnect: (profileId: string): Promise<void> =>
    invoke("tunnel_connect", { profileId }),

  tunnelDisconnect: (profileId: string): Promise<void> =>
    invoke("tunnel_disconnect", { profileId }),

  tunnelStatus: (): Promise<TunnelStatus> =>
    invoke("tunnel_status"),

  appBind: (profileId: string, exePath: string): Promise<void> =>
    invoke("app_bind", { profileId, exePath }),

  appUnbind: (profileId: string, exePath: string): Promise<void> =>
    invoke("app_unbind", { profileId, exePath }),

  appLaunch: (profileId: string, exePath: string, args: string[]): Promise<number> =>
    invoke("app_launch", { profileId, exePath, args }),
};
