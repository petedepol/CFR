import { useRouteError } from "react-router-dom";

export default function RouteErrorBoundary() {
  const error = useRouteError();

  const isChunkError =
    error?.name === "ChunkLoadError" ||
    /loading chunk|dynamically imported module/i.test(error?.message || "");

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#121f1e",
        color: "#F4F6F5",
        padding: "2rem",
        textAlign: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>
        {isChunkError ? "Update available" : "Something went wrong"}
      </h1>
      <p style={{ color: "#8A9A94", fontSize: "0.875rem", marginBottom: "1.5rem", maxWidth: "20rem" }}>
        {isChunkError
          ? "A new version of the app is available. Tap reload to update."
          : "An unexpected error occurred. Reload to try again."}
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          background: "linear-gradient(to bottom, #f0714a, #e94e1b)",
          color: "#fff",
          border: "none",
          borderRadius: "12px",
          padding: "0.75rem 2rem",
          fontSize: "1rem",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Reload
      </button>
    </div>
  );
}
