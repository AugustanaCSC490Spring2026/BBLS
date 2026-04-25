import React, { useEffect } from "react";
import "../components/Toast.css";

function Toast({ id, type, title, message, removeToast }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      removeToast(id);
    }, 5000);

    return () => clearTimeout(timer);
  }, [id]);

  return (
    <div className={`toast toast-${type}`}>
      <div className="toast-content">
        <h4>{title}</h4>
        <p>{message}</p>
      </div>
    </div>
  );
}

export default Toast;