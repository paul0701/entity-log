import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const qc = useQueryClient();

  useEffect(() => {
    api.get("/auth/me")
      .then((r) => setUser(r.data))
      .catch(() => api.post("/auth/refresh").then((r) => setUser(r.data)).catch(() => setUser(false)));
  }, []);

  const logout = useCallback(async () => {
    await api.post("/auth/logout").catch(() => {});
    qc.clear();
    setUser(false);
  }, [qc]);

  return <AuthContext.Provider value={{ user, setUser, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
