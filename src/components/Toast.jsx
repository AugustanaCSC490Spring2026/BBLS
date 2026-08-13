import React, { useEffect } from "react";
import "../components/Toast.css";

function Toast({ id, type, title, message, removeToast }) {
  const persistent = type === "banned";

  useEffect(() => {
    if (persistent) return;
    const timer = setTimeout(() => {
      removeToast(id);
    }, 5000);

    return () => clearTimeout(timer);
  }, [id, persistent]);

  return (
    <div className={`toast toast-${type}`}>
      <div className="toast-content">
        <h4>{title}</h4>
        <p>{message}</p>
      </div>
      {persistent && (
        <button
          type="button"
          className="toast-close"
          aria-label="Dismiss"
          onClick={() => removeToast(id)}
        >
          &times;
        </button>
      )}
    </div>
  );
}

export default Toast;