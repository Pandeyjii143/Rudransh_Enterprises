import { useEffect, useContext } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { handleGoogleCallback } = useContext(AuthContext);

  useEffect(() => {
    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");
    const userData = searchParams.get("user");

    console.log("AuthCallback params:", { accessToken: !!accessToken, refreshToken: !!refreshToken, userData: !!userData });

    if (accessToken && refreshToken && userData) {
      try {
        const user = JSON.parse(decodeURIComponent(userData));
        console.log("Parsed user:", user);
        handleGoogleCallback(accessToken, refreshToken, user);
        console.log("Navigating to home");
        navigate("/");
      } catch (error) {
        console.error("Error parsing user data:", error);
        navigate("/login");
      }
    } else {
      console.log("Missing params, navigating to login");
      navigate("/login");
    }
  }, [searchParams, handleGoogleCallback, navigate]);

  return (
    <div className="auth-callback">
      <div className="loading">
        <h2>Signing you in...</h2>
        <div className="spinner"></div>
      </div>
    </div>
  );
}

export default AuthCallback;
