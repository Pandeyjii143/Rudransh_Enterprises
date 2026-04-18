import { useContext } from "react";
import { Navigate } from "react-router-dom";

import { AuthContext } from "../context/AuthContext";

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, isAdmin } = useContext(AuthContext);

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (adminOnly && !isAdmin()) {
    return <Navigate to="/" />;
  }

  return children;
}

export default ProtectedRoute;
