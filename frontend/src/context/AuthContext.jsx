import { createContext, useContext, useEffect, useState } from "react";
import api from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null=loading, false=unauth, obj=auth
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("sim_token");
    if (!token) {
      setUser(false);
      setLoading(false);
      return;
    }
    api.get("/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem("sim_token");
        setUser(false);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("sim_token", data.access_token);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch (e) {}
    localStorage.removeItem("sim_token");
    setUser(false);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
