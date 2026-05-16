import React from "react";
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
        userSelect: "none",
      }}
    >
      <button
        onClick={onDismiss}
        style={{
          position: "absolute",
          top: "1.5rem",
          right: "1.5rem",
          background: "none",
          border: "2px solid rgba(255,255,255,0.6)",
          borderRadius: "50%",
          color: "white",
          fontSize: "1.4rem",
          width: "2.8rem",
          height: "2.8rem",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 1,
          opacity: 0.9,
        }}
        aria-label="Dismiss banned student alert"
      >
        ✕
      </button>

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
          color: "rgba(255,255,255,0.35)",
          fontSize: "0.8rem",
          letterSpacing: "0.08em",
        }}
      >
        Press ✕ to dismiss
      </p>
    </div>
  );
}

export default BannedStudentOverlay;
