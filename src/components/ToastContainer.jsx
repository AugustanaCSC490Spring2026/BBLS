import React from "react";
import Toast from "./Toast";
import "../components/Toast.css";

function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          type={toast.type}
          title={toast.title}
          message={toast.message}
          removeToast={removeToast}
        />
      ))}
    </div>
  );
}

export default ToastContainer;