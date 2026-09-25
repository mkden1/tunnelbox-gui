use serde::{Deserialize, Serialize};
use tauri::State;

use crate::ipc::{self, SharedIpcClient};

// ── Shared error type ─────────────────────────────────────────────────────────

/// All Tauri commands return Result<T, String> so errors surface cleanly
/// in the frontend as rejected promises with a message string.
type CmdResult<T> = Result<T, String>;

fn err(e: impl std::fmt::Display) -> String {
    e.to_string()
}

// ── Response payload types ────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Profile {
    pub id: String,
    pub name: String,
    pub apps: Vec<AppEntry>,
    #[serde(default)]
    pub auto_connect: bool,
    #[serde(default = "default_true")]
    pub kill_switch: bool,
    #[serde(default)]
    pub connected: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppEntry {
    pub exe: String,
    #[serde(default = "default_true")]
    pub enabled: bool,
}

fn default_true() -> bool { true }
#[derive(Debug, Serialize, Deserialize)]
pub struct TunnelStatus {
    pub tunnels: std::collections::HashMap<String, bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DaemonStatus {
    pub version: String,
    pub wintun_loaded: bool,
}

// ── Daemon lifecycle ──────────────────────────────────────────────────────────

/// Called by the frontend on startup. Ensures the daemon is running
/// and the IPC connection is established.
#[tauri::command]
pub async fn daemon_connect(
    client: State<'_, SharedIpcClient>,
) -> CmdResult<DaemonStatus> {
    crate::daemon::ensure_running().map_err(err)?;

    // ipc::send will connect if not already connected
    let resp = ipc::send(&client, "daemon_status", serde_json::json!({}))
        .map_err(err)?;

    if !resp.ok {
        return Err(resp.error.unwrap_or_else(|| "daemon_status failed".into()));
    }

    serde_json::from_value(resp.payload.unwrap_or_default()).map_err(err)
}

// ── Profile commands ──────────────────────────────────────────────────────────

#[tauri::command]
pub async fn profile_list(
    client: State<'_, SharedIpcClient>,
) -> CmdResult<Vec<Profile>> {
    let resp = ipc::send(&client, "profile_list", serde_json::json!({}))
        .map_err(err)?;
    if !resp.ok {
        return Err(resp.error.unwrap_or_default());
    }
    serde_json::from_value(resp.payload.unwrap_or_default()).map_err(err)
}

#[tauri::command]
pub async fn profile_create(
    name: String,
    client: State<'_, SharedIpcClient>,
) -> CmdResult<Profile> {
    let resp = ipc::send(&client, "profile_create", serde_json::json!({ "name": name }))
        .map_err(err)?;
    if !resp.ok {
        return Err(resp.error.unwrap_or_default());
    }
    serde_json::from_value(resp.payload.unwrap_or_default()).map_err(err)
}

#[tauri::command]
pub async fn profile_delete(
    profile_id: String,
    client: State<'_, SharedIpcClient>,
) -> CmdResult<()> {
    let resp = ipc::send(
        &client,
        "profile_delete",
        serde_json::json!({ "profile_id": profile_id }),
    )
    .map_err(err)?;
    if !resp.ok {
        return Err(resp.error.unwrap_or_default());
    }
    Ok(())
}

#[tauri::command]
pub async fn wireguard_import(
    profile_id: String,
    contents: String,
    client: State<'_, SharedIpcClient>,
) -> CmdResult<()> {
    let resp = ipc::send(
        &client,
        "wireguard_import",
        serde_json::json!({ "profile_id": profile_id, "contents": contents }),
    )
    .map_err(err)?;
    if !resp.ok {
        return Err(resp.error.unwrap_or_default());
    }
    Ok(())
}

// ── Tunnel commands ───────────────────────────────────────────────────────────

#[tauri::command]
pub async fn tunnel_connect(
    profile_id: String,
    client: State<'_, SharedIpcClient>,
) -> CmdResult<()> {
    let resp = ipc::send(
        &client,
        "tunnel_connect",
        serde_json::json!({ "profile_id": profile_id }),
    )
    .map_err(err)?;
    if !resp.ok {
        return Err(resp.error.unwrap_or_default());
    }
    Ok(())
}

#[tauri::command]
pub async fn tunnel_disconnect(
    profile_id: String,
    client: State<'_, SharedIpcClient>,
) -> CmdResult<()> {
    let resp = ipc::send(
        &client,
        "tunnel_disconnect",
        serde_json::json!({ "profile_id": profile_id }),
    )
    .map_err(err)?;
    if !resp.ok {
        return Err(resp.error.unwrap_or_default());
    }
    Ok(())
}

#[tauri::command]
pub async fn tunnel_status(
    client: State<'_, SharedIpcClient>,
) -> CmdResult<TunnelStatus> {
    let resp = ipc::send(&client, "tunnel_status", serde_json::json!({}))
        .map_err(err)?;
    if !resp.ok {
        return Err(resp.error.unwrap_or_default());
    }
    serde_json::from_value(resp.payload.unwrap_or_default()).map_err(err)
}

// ── App binding commands ──────────────────────────────────────────────────────

#[tauri::command]
pub async fn app_bind(
    profile_id: String,
    exe_path: String,
    client: State<'_, SharedIpcClient>,
) -> CmdResult<()> {
    let resp = ipc::send(
        &client,
        "app_bind",
        serde_json::json!({ "profile_id": profile_id, "exe_path": exe_path }),
    )
    .map_err(err)?;
    if !resp.ok {
        return Err(resp.error.unwrap_or_default());
    }
    Ok(())
}

#[tauri::command]
pub async fn app_unbind(
    profile_id: String,
    exe_path: String,
    client: State<'_, SharedIpcClient>,
) -> CmdResult<()> {
    let resp = ipc::send(
        &client,
        "app_unbind",
        serde_json::json!({ "profile_id": profile_id, "exe_path": exe_path }),
    )
    .map_err(err)?;
    if !resp.ok {
        return Err(resp.error.unwrap_or_default());
    }
    Ok(())
}

#[tauri::command]
pub async fn app_launch(
    profile_id: String,
    exe_path: String,
    args: Vec<String>,
    client: State<'_, SharedIpcClient>,
) -> CmdResult<u32> {
    let resp = ipc::send(
        &client,
        "app_launch",
        serde_json::json!({
            "profile_id": profile_id,
            "exe_path": exe_path,
            "args": args,
        }),
    )
    .map_err(err)?;
    if !resp.ok {
        return Err(resp.error.unwrap_or_default());
    }
    let pid = resp
        .payload
        .and_then(|p| p["pid"].as_u64())
        .ok_or_else(|| "No pid in response".to_string())?;
    Ok(pid as u32)
}