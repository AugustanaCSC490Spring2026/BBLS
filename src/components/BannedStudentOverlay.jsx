import "./BannedStudentOverlay.css";

function BannedStudentOverlay({ isVisible, message, onDismiss }) {
  if (!isVisible) return null;

  return (
    <div
      className="banned-overlay"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#E80000",
        zIndex: 10000,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        userSelect: "none",
      }}
      onClick={onDismiss}
    >
      <h1
        style={{
          color: "#fff",
          fontSize: "3rem",
          letterSpacing: "0.1em",
          margin: 0,
        }}
      >
        STUDENT BANNED
      </h1>

      <p
        style={{
          color: "rgba(255,255,255,0.85)",
          fontSize: "1.4rem",
          marginTop: "1rem",
          letterSpacing: "0.05em",
          textAlign: "center",
          maxWidth: "640px",
          padding: "0 2rem",
          minHeight: "2rem",
        }}
      >
        {message}
      </p>

      <p
        style={{
          position: "absolute",
          bottom: "1.5rem",
          color: "rgba(255,255,255,0.3)",
          fontSize: "0.8rem",
          letterSpacing: "0.08em",
        }}
      >
        Click anywhere to dismiss
      </p>
    </div>
  );
}

export default BannedStudentOverlay;
