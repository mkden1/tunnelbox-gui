use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader, Write};
use std::sync::{Arc, Mutex};
use std::time::Duration;

const PIPE_NAME: &str = r"\\.\pipe\tunnelbox-daemon";
const CONNECT_TIMEOUT_MS: u64 = 10000;

// ── Wire types (must match tunnelbox-daemon's protocol.rs) ───────────────────

#[derive(Debug, Serialize)]
struct Command {
    id: String,
    cmd: String,
    payload: serde_json::Value,
}

#[derive(Debug, Deserialize)]
pub struct Response {
    pub id: String,
    pub ok: bool,
    pub payload: Option<serde_json::Value>,
    pub error: Option<String>,
}

// ── Client ───────────────────────────────────────────────────────────────────

/// A persistent connection to the daemon's named pipe.
/// Wrapped in Arc<Mutex<>> so it can be shared across Tauri commands.
pub struct IpcClient {
    writer: Box<dyn Write + Send>,
    reader: BufReader<Box<dyn std::io::Read + Send>>,
    next_id: u64,
}

impl IpcClient {
    /// Opens a connection to the daemon pipe, retrying for up to
    /// `CONNECT_TIMEOUT_MS` milliseconds. Call this after confirming
    /// the daemon is running.
    pub fn connect() -> Result<Self> {
        use std::fs::OpenOptions;

        let deadline = std::time::Instant::now() + Duration::from_millis(CONNECT_TIMEOUT_MS);

        loop {
            match OpenOptions::new()
                .read(true)
                .write(true)
                .open(PIPE_NAME)
            {
                Ok(file) => {
                    let reader = BufReader::new(Box::new(file.try_clone()?)
                        as Box<dyn std::io::Read + Send>);
                    let writer = Box::new(file) as Box<dyn Write + Send>;
                    return Ok(Self { writer, reader, next_id: 1 });
                }
                Err(e) => {
                    if std::time::Instant::now() >= deadline {
                        return Err(anyhow!("Failed to connect to daemon pipe: {e}"));
                    }
                    std::thread::sleep(Duration::from_millis(200));
                }
            }
        }
    }

    /// Returns true if the daemon pipe exists and is connectable.
    pub fn is_pipe_available() -> bool {
        // Check pipe existence without opening a connection
        // Named pipes appear as files under \\.\pipe\
        std::path::Path::new(r"\\.\pipe\tunnelbox-daemon").exists()
    }

    /// Sends a command and waits for the response.
    pub fn send(&mut self, cmd: &str, payload: serde_json::Value) -> Result<Response> {
        let id = format!("gui-{}", self.next_id);
        self.next_id += 1;

        let command = Command {
            id: id.clone(),
            cmd: cmd.to_string(),
            payload,
        };

        let mut line = serde_json::to_string(&command)?;
        line.push('\n');
        self.writer.write_all(line.as_bytes())?;
        self.writer.flush()?;

        // Read the response line
        let mut response_line = String::new();
        self.reader.read_line(&mut response_line)?;

        let response: Response = serde_json::from_str(response_line.trim())
            .map_err(|e| anyhow!("Failed to parse daemon response: {e}\nRaw: {response_line}"))?;

        if response.id != id {
            return Err(anyhow!(
                "Response ID mismatch: expected {id}, got {}",
                response.id
            ));
        }

        Ok(response)
    }
}

// ── State type used in Tauri ─────────────────────────────────────────────────

pub type SharedIpcClient = Arc<Mutex<Option<IpcClient>>>;

/// Creates the shared IPC client state (initially disconnected).
pub fn make_shared() -> SharedIpcClient {
    Arc::new(Mutex::new(None))
}

/// Sends a command via the shared client, reconnecting once on pipe error.
pub fn send(
    client: &SharedIpcClient,
    cmd: &str,
    payload: serde_json::Value,
) -> Result<Response> {
    // Single lock acquisition for the entire connect + send + receive cycle
    let mut guard = client.lock().unwrap();

    // Connect if needed
    if guard.is_none() {
        *guard = Some(IpcClient::connect()?);
    }

    // Try send, reconnect once on failure
    match guard.as_mut().unwrap().send(cmd, payload.clone()) {
        Ok(r) => return Ok(r),
        Err(_) => {
            // Pipe broken — reconnect and retry
            *guard = None;
            *guard = Some(IpcClient::connect()?);
            guard.as_mut().unwrap().send(cmd, payload)
        }
    }
}