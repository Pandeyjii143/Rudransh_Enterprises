import { createContext, useContext, useMemo, useState } from "react";
import Toast from "../components/Toast";

export const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const notify = (message, type = "info", duration = 4200) => {
    const id = Date.now() + Math.random().toString(36).slice(2);
    setToasts((current) => [...current, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, duration);
  };

  const value = useMemo(() => ({ notify }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast toasts={toasts} />
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
