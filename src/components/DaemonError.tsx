import "./DaemonError.css";

interface Props {
  message: string;
  onRetry: () => void;
}

export function DaemonError({ message, onRetry }: Props) {
  return (
    <div className="daemon-error">
      <div className="daemon-error-card">
        <div className="daemon-error-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className="daemon-error-title">Couldn't connect to daemon</h2>
        <p className="daemon-error-message">{message}</p>
        <p className="daemon-error-hint">
          Make sure <code>tunnelbox-daemon.exe</code> is in the same folder as
          this app, or install it as a service with{" "}
          <code>tunnelbox-daemon.exe install</code>.
        </p>
        <button className="daemon-error-retry" onClick={onRetry}>
          Try again
        </button>
      </div>
    </div>
  );
}
