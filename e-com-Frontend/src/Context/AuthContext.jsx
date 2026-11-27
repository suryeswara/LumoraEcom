import axios from "axios";
import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "../ui/toast";
import { attachAuth } from "../auth/attachAuth";
import { clearAuth, decodeJwt, isTokenExpired, loadAuth, saveAuth } from "../auth/jwt";

// Default axios instance (used by most components). The custom instance in src/axios.jsx attaches itself.
attachAuth(axios);

const AuthContext = createContext({
  user: null,
  token: null,
  isAuthenticated: false,
  isAdmin: false,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

const MAX_TIMEOUT_MS = 2 ** 31 - 1;

export const AuthProvider = ({ children }) => {
  const baseUrl = import.meta.env.VITE_BASE_URL;

  // Restore the session after a page reload, but only if the stored token is still valid.
  const [auth, setAuth] = useState(() => {
    const saved = loadAuth();
    if (saved?.token && !isTokenExpired(saved.token)) return saved;
    clearAuth();
    return null;
  });

  const startSession = (data) => {
    saveAuth(data);
    setAuth(data);
    return data;
  };

  const login = async (email, password) => {
    const { data } = await axios.post(`${baseUrl}/api/auth/login`, { email, password });
    return startSession(data);
  };

  const register = async (fullName, email, password) => {
    const { data } = await axios.post(`${baseUrl}/api/auth/register`, { fullName, email, password });
    return startSession(data);
  };

  const logout = useCallback(() => {
    clearAuth();
    setAuth(null);
  }, []);

  // 1) the server rejected our token (expired/revoked/tampered)
  useEffect(() => {
    const onExpired = () => {
      if (loadAuth()) toast.info("Your session has expired. Please log in again.");
      logout();
    };
    window.addEventListener("auth:expired", onExpired);
    return () => window.removeEventListener("auth:expired", onExpired);
  }, [logout]);

  // 2) log out automatically when the token's own expiry time is reached
  useEffect(() => {
    if (!auth?.token) return undefined;
    const exp = decodeJwt(auth.token)?.exp;
    if (!exp) return undefined;
    const ms = Math.min(Math.max(exp * 1000 - Date.now(), 0), MAX_TIMEOUT_MS);
    const timer = setTimeout(() => window.dispatchEvent(new Event("auth:expired")), ms);
    return () => clearTimeout(timer);
  }, [auth]);

  const value = useMemo(
    () => ({
      user: auth ? { email: auth.email, fullName: auth.fullName, role: auth.role } : null,
      token: auth?.token ?? null,
      isAuthenticated: Boolean(auth),
      isAdmin: auth?.role === "ADMIN",
      login,
      register,
      logout,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [auth, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
