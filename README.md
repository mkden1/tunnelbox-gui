# Tunnelbox GUI

The desktop client for [tunnelbox-daemon](https://github.com/mkden1/tunnelbox): a per-app WireGuard VPN for Windows. Create a profile, import a WireGuard config, bind one or more executables to it, and connect — traffic from just those apps goes through the tunnel while everything else on the machine keeps using your normal connection.

## Features

- Create, view and delete profiles from the sidebar.
- Import a WireGuard `.conf` file into a profile.
- Bind or unbind an executable's path to a profile, and launch it directly from the app, already contained under that profile.
- Connect/disconnect a profile's tunnel, with live status.
- Automatically starts the daemon (as a Windows Service if installed, otherwise by spawning it directly) if it isn't already running when the GUI opens, with a retry screen if that fails.

## Tech stack

- **Frontend:** React 19, TypeScript, Vite, no CSS framework
- **Backend:** [Tauri 2](https://tauri.app/), Rust
- **Daemon communication:** JSON over a named pipe (`\\.\pipe\tunnelbox-daemon`), matching `tunnelbox-daemon`'s IPC protocol exactly — see that repo's README for the full command list.

## Building

Needs a Windows toolchain (MSVC) and Node.js.

```bash
npm install
npm run tauri dev    # run in development
npm run tauri build  # produce a release build
```

For the GUI to actually do anything useful, `tunnelbox-daemon.exe` needs to be reachable: either installed as a Windows Service, or present next to the GUI's own executable (the GUI falls back to spawning it directly from there if the service isn't found — this is how development works, without installing the service).

## Notes and limitations

This project is not under active development. See tunnelbox-daemon's README for the fuller account of where the underlying per-app-VPN approach hits a ceiling (it works well for apps like browsers; extending it to other traffic patterns, like a game client, turned out to need a kernel-mode driver that wasn't worth building for a personal project).

- No automated tests.
- Apps are bound by typing/pasting an executable's full path — there's no file-picker dialog.

## License

[MIT](LICENSE)
