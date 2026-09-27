use anyhow::{anyhow, Result};
use std::time::{Duration, Instant};

use crate::ipc::IpcClient;

const DAEMON_EXE_NAME: &str = "tunnelbox-daemon.exe";
const SERVICE_NAME: &str = "tunnelbox-daemon";
const STARTUP_TIMEOUT_MS: u64 = 8000;
const PIPE_POLL_INTERVAL_MS: u64 = 200;

/// Ensures the daemon is running and the pipe is connectable.
/// Strategy:
///   1. If the pipe is already available → nothing to do.
///   2. Try starting the Windows Service (works in production).
///   3. If that fails, try spawning the exe directly from next to the GUI
///      binary (works during development).
///   4. Wait up to STARTUP_TIMEOUT_MS for the pipe to appear.
pub fn ensure_running() -> Result<()> {
    if IpcClient::is_pipe_available() {
        return Ok(());
    }

    tracing::info!("Daemon pipe not found, attempting to start daemon");

    if try_start_service().is_ok() {
        tracing::info!("Daemon service start requested");
    } else {
        tracing::info!("Service start failed, trying direct launch");
        try_spawn_exe()?;
    }

    // Give the daemon a moment to initialize before we start polling
    std::thread::sleep(std::time::Duration::from_millis(500));

    wait_for_pipe(STARTUP_TIMEOUT_MS)
}

/// Attempts to start the daemon Windows Service via `sc start`.
fn try_start_service() -> Result<()> {
    let status = std::process::Command::new("sc")
        .args(["start", SERVICE_NAME])
        .creation_flags(CREATE_NO_WINDOW)
        .status()
        .map_err(|e| anyhow!("Failed to run sc.exe: {e}"))?;

    if status.success() {
        Ok(())
    } else {
        Err(anyhow!("sc start returned non-zero"))
    }
}

/// Spawns tunnelbox-daemon.exe from the same directory as this GUI binary.
fn try_spawn_exe() -> Result<()> {
    let daemon_path = std::env::current_exe()
        .map_err(|e| anyhow!("Cannot resolve current exe: {e}"))?
        .with_file_name(DAEMON_EXE_NAME);

    if !daemon_path.exists() {
        return Err(anyhow!(
            "Daemon exe not found at {}",
            daemon_path.display()
        ));
    }

    std::process::Command::new(&daemon_path)
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map_err(|e| anyhow!("Failed to spawn daemon: {e}"))?;

    tracing::info!("Daemon spawned from {}", daemon_path.display());
    Ok(())
}

/// Polls the pipe until it becomes available or the timeout expires.
fn wait_for_pipe(timeout_ms: u64) -> Result<()> {
    let deadline = Instant::now() + Duration::from_millis(timeout_ms);

    while Instant::now() < deadline {
        if IpcClient::is_pipe_available() {
            tracing::info!("Daemon pipe available");
            return Ok(());
        }
        std::thread::sleep(Duration::from_millis(PIPE_POLL_INTERVAL_MS));
    }

    Err(anyhow!(
        "Timed out waiting for daemon pipe after {}ms",
        timeout_ms
    ))
}

// CREATE_NO_WINDOW flag — prevents a console window flashing up
// when we spawn processes from a GUI application
const CREATE_NO_WINDOW: u32 = 0x08000000;

// Windows-specific extension trait to add creation_flags to Command
trait CommandExt {
    fn creation_flags(&mut self, flags: u32) -> &mut Self;
}

impl CommandExt for std::process::Command {
    fn creation_flags(&mut self, flags: u32) -> &mut Self {
        std::os::windows::process::CommandExt::creation_flags(self, flags)
    }
}