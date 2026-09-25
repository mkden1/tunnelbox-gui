mod commands;
mod daemon;
mod ipc;

use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let ipc_client = ipc::make_shared();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(ipc_client)
        .invoke_handler(tauri::generate_handler![
            // Lifecycle
            daemon_connect,
            // Profiles
            profile_list,
            profile_create,
            profile_delete,
            wireguard_import,
            // Tunnel
            tunnel_connect,
            tunnel_disconnect,
            tunnel_status,
            // Apps
            app_bind,
            app_unbind,
            app_launch,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}