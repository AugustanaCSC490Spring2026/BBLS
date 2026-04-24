import React from "react";

function AwayModeOverlay({ isActive, onDismiss }) {
  if (!isActive) return null;

  return (
    <div
      onClick={onDismiss}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#000",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
    >
      <h1 style={{ color: "#fff", fontSize: "3rem", letterSpacing: "0.1em" }}>
        PLEASE SWIPE IN
      </h1>
    </div>
  );
}

export default AwayModeOverlay;