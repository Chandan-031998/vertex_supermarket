import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiClient, TOKEN_KEY, SESSION_TOKEN_KEY, getStoredToken } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  function clearTokenStorage() {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
  }

  function setTokenStorage(token, remember = true) {
    if (!token) {
      clearTokenStorage();
      return;
    }
    if (remember) {
      localStorage.setItem(TOKEN_KEY, token);
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
      return;
    }
    sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    localStorage.removeItem(TOKEN_KEY);
  }

  async function loadUser() {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await apiClient.get("/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setUser(res.data.data);
    } catch (error) {
      clearTokenStorage();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUser();
  }, []);

  async function login(email, password, options = {}) {
    const remember = options.remember ?? true;
    try {
      const res = await apiClient.post("/auth/login", { email, password });
      const data = res?.data?.data || {};
      const accessToken = data.accessToken;
      const authenticatedUser = data.user;

      if (!accessToken || !authenticatedUser) {
        throw new Error("Invalid login response from server");
      }

      setTokenStorage(accessToken, remember);
      setUser(authenticatedUser);
      return authenticatedUser;
    } catch (error) {
      const status = error?.response?.status;
      const backendMessage = error?.response?.data?.message;

      if (status === 401) {
        throw new Error(backendMessage || "Invalid email or password");
      }

      if (!error?.response) {
        throw new Error("Unable to reach server. Check internet/CORS and try again.");
      }

      throw new Error(backendMessage || "Login failed. Please try again.");
    }
  }

  async function refreshUser() {
    await loadUser();
  }

  function logout() {
    clearTokenStorage();
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
