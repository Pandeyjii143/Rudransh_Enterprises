import { createContext, useEffect, useState } from "react";
import { authAPI } from "../services/api";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const storedAccessToken = localStorage.getItem("accessToken");
    const storedRefreshToken = localStorage.getItem("refreshToken");
    const storedUser = localStorage.getItem("user");

    if (storedAccessToken && storedRefreshToken && storedUser) {
      setAccessToken(storedAccessToken);
      setRefreshToken(storedRefreshToken);
      setUser(JSON.parse(storedUser));
    }

    setAuthLoading(false);
  }, []);

  const setSession = (accessTokenValue, refreshTokenValue, userValue) => {
    setAccessToken(accessTokenValue);
    setRefreshToken(refreshTokenValue);
    setUser(userValue);
    localStorage.setItem("accessToken", accessTokenValue);
    localStorage.setItem("refreshToken", refreshTokenValue);
    localStorage.setItem("user", JSON.stringify(userValue));
  };

  const refreshAccessToken = async () => {
    if (!refreshToken) throw new Error("No refresh token available");

    const response = await authAPI.refreshToken(refreshToken);
    const data = response.data;
    setSession(data.accessToken, refreshToken, data.user);
    return data.accessToken;
  };

  const login = async ({ email, password }) => {
    console.log("AuthContext login called with email:", email);
    const response = await authAPI.login(email, password);
    console.log("Auth API login response:", response.data);
    const data = response.data;
    setSession(data.accessToken, data.refreshToken, data.user);
    console.log("Session set, user:", data.user);
    return data;
  };

  const register = async (payload) => {
    const response = await authAPI.register(payload);
    return response.data;
  };

  const googleLogin = () => {
    window.location.href = `${API_BASE.replace("/api", "")}/api/auth/google`;
  };

  const handleGoogleCallback = async (
    accessTokenValue,
    refreshTokenValue,
    userData,
  ) => {
    setSession(accessTokenValue, refreshTokenValue, userData);
    return { accessToken: accessTokenValue, user: userData };
  };

  const logout = async () => {
    try {
      if (refreshToken) {
        await authAPI.logout(refreshToken).catch(() => {});
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setAccessToken(null);
      setRefreshToken(null);
      setUser(null);
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
    }
  };

  const isAdmin = () => user?.role === "admin";
  const isClient = () => user?.role === "client";
  const isAuthenticated = () => !!accessToken;

  const value = {
    user,
    token: accessToken,
    accessToken,
    refreshToken,
    authLoading,
    login,
    register,
    googleLogin,
    handleGoogleCallback,
    logout,
    refreshAccessToken,
    setSession,
    isAdmin,
    isClient,
    isAuthenticated,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
