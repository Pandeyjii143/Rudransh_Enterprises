function Toast({ toasts }) {
  return (
    <div className="toast-viewport">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          <div className="toast-icon">
            {toast.type === "success" && "✅"}
            {toast.type === "error" && "❌"}
            {toast.type === "warning" && "⚠️"}
            {toast.type === "info" && "💡"}
          </div>
          <div className="toast-message">{toast.message}</div>
        </div>
      ))}
    </div>
  );
}

export default Toast;
