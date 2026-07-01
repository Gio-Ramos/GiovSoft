import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api } from "./api";
import {
  clearAdminSession,
  getAdminToken,
  readAdminUser,
  setAdminSession,
  type AdminUser,
} from "./adminSession";

interface LoginResult {
  ok: boolean;
  message?: string;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  user: AdminUser | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  changePassword: (newPassword: string, currentPassword?: string) => Promise<LoginResult>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(() => getAdminToken());
  const [user, setUser] = useState<AdminUser | null>(() => readAdminUser());

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: Boolean(token),
      user,
      async login(email, password) {
        try {
          const response = await api.post<{ token: string; user: AdminUser }>("/api/admin/login", { email, password });

          setAdminSession(response.data.token, response.data.user);
          setToken(response.data.token);
          setUser(response.data.user);

          return { ok: true };
        } catch (error) {
          if (error && typeof error === "object" && "response" in error) {
            const response = (error as { response?: { data?: { message?: string } } }).response;
            return { ok: false, message: response?.data?.message || "No se pudo iniciar sesión." };
          }

          return { ok: false, message: "No se pudo conectar con el servidor." };
        }
      },
      async changePassword(newPassword, currentPassword = "") {
        try {
          const response = await api.post<{ token: string; user: AdminUser }>("/api/admin/change-password", {
            currentPassword,
            newPassword,
          });

          setAdminSession(response.data.token, response.data.user);
          setToken(response.data.token);
          setUser(response.data.user);

          return { ok: true };
        } catch (error) {
          if (error && typeof error === "object" && "response" in error) {
            const response = (error as { response?: { data?: { message?: string } } }).response;
            return { ok: false, message: response?.data?.message || "No se pudo actualizar la contraseña." };
          }

          return { ok: false, message: "No se pudo conectar con el servidor." };
        }
      },
      logout() {
        clearAdminSession();
        setToken(null);
        setUser(null);
      },
    }),
    [token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const auth = useContext(AuthContext);

  if (!auth) {
    throw new Error("useAuth debe usarse dentro de AuthProvider.");
  }

  return auth;
}
