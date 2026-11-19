"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          display: "grid",
          minHeight: "100vh",
          placeItems: "center",
          margin: 0,
          fontFamily: "Arial, Helvetica, sans-serif",
          textAlign: "center",
          padding: "24px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "32px", margin: 0 }}>Something went wrong</h1>
          <p style={{ color: "#6b7280", marginTop: "12px" }}>
            The application could not be loaded. Please try again.
            {error.digest ? ` (${error.digest})` : ""}
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "24px",
              border: 0,
              borderRadius: "999px",
              background: "#111",
              color: "#fff",
              padding: "12px 28px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
            type="button"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
