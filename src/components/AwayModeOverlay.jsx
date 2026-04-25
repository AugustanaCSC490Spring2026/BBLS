import React, { useState, useEffect, useRef } from "react";

function AwayModeOverlay({ isActive, onDismiss, onSwipe }) {
  const [studentId, setStudentId] = useState("");
  const [flashState, setFlashState] = useState(null); // null | "success" | "denied"
  const [message, setMessage] = useState({ heading: "", sub: "" });
  const inputRef = useRef(null);

  // Focus the hidden input whenever overlay is active
  useEffect(() => {
    if (isActive) {
      inputRef.current?.focus();
    }
  }, [isActive]);

  // Keep focus on the hidden input while overlay is open
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      inputRef.current?.focus();
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    const trimmed = studentId.trim();
    if (!trimmed) return;
    setStudentId("");

    // Call the parent's swipe handler; expect it to return { success, name, reason }
    const result = await onSwipe(trimmed);

    if (result.success) {
      setFlashState("success");
      setMessage({ heading: "ID Accepted", sub: `Welcome, ${result.name}!` });
    } else {
      setFlashState("denied");
      setMessage({ heading: "ID Denied", sub: result.reason });
    }

    setTimeout(() => {
      setFlashState(null);
      setMessage({ heading: "", sub: "" });
    }, 1500);
  };

  if (!isActive) return null;

  const bgColor =
    flashState === "success"
      ? "#14AB00"
      : flashState === "denied"
        ? "#E80000"
        : "#000";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: bgColor,
        transition: "background-color 0.2s ease",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        userSelect: "none",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onDismiss();
        else inputRef.current?.focus();
      }}
    >
             
      <input
        ref={inputRef}
        type="password"
        value={studentId}
        onChange={(e) => setStudentId(e.target.value)}
        onKeyDown={handleKeyDown}
        style={{
          position: "absolute",
          opacity: 0,
          pointerEvents: "none",
          width: 0,
          height: 0,
        }}
        autoComplete="off"
      />

      <h1
        style={{
          color: "#fff",
          fontSize: "3rem",
          letterSpacing: "0.1em",
          margin: 0,
          transition: "opacity 0.2s",
        }}
      >
        {flashState ? message.heading : "PLEASE SWIPE IN"}
      </h1>

      <p
        style={{
          color: "rgba(255,255,255,0.85)",
          fontSize: "1.4rem",
          marginTop: "1rem",
          letterSpacing: "0.05em",
          minHeight: "2rem",
        }}
      >
        {flashState ? message.sub : ""}
      </p>
      {!flashState && (
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
      )}
    </div>
  );
}

export default AwayModeOverlay;