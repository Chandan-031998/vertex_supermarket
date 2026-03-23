import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/client";

const AuthContext = createContext(null);
const TOKEN_KEY = "vertex_token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadUser() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await api.get("/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setUser(res.data.data);
    } catch (error) {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUser();
  }, []);

  async function login(email, password) {
    const res = await api.post("/auth/login", { email, password });
    const { accessToken, user: authenticatedUser } = res.data.data;
    localStorage.setItem(TOKEN_KEY, accessToken);
    setUser(authenticatedUser);
    return authenticatedUser;
  }

  async function refreshUser() {
    await loadUser();
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }

  function hasPermission(permissionKey) {
    if (!user) {
      return false;
    }

    if (String(user.role ?? "").trim().toLowerCase() === "super admin") {
      return true;
    }

    return (user.permissions || []).includes(permissionKey);
  }

  function canAny(permissionKeys = []) {
    return permissionKeys.some((permissionKey) => hasPermission(permissionKey));
  }

  const value = useMemo(() => ({ user, loading, login, logout, refreshUser, hasPermission, canAny }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
