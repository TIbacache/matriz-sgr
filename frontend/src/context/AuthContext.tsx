import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, setOnUnauthorized, setToken } from "../lib/api";
import type { Terminologia, Usuario } from "../lib/types";

interface LoginResponse {
  token: string;
  usuario: Usuario;
}

interface AuthMe extends Usuario {
  userId: string;
  organizacion: {
    id: string;
    nombre: string;
    tipo: string;
    configuracionTerminologia: Terminologia;
  } | null;
}

interface AuthState {
  token: string;
  usuario: Usuario;
}

interface AuthContextValue {
  usuario: Usuario | null;
  token: string | null;
  organizacionNombre: string | null;
  terminologia: Terminologia;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const STORAGE_KEY = "matriz.auth";
const AuthContext = createContext<AuthContextValue | null>(null);

function leerSesion(): AuthState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthState) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<AuthState | null>(() => {
    const inicial = leerSesion();
    // El módulo api necesita el token antes del primer render de páginas.
    setToken(inicial?.token ?? null);
    return inicial;
  });
  const [organizacionNombre, setOrganizacionNombre] = useState<string | null>(null);
  const [terminologia, setTerminologia] = useState<Terminologia>({});

  const logout = () => {
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
    setSesion(null);
    setOrganizacionNombre(null);
    setTerminologia({});
  };

  useEffect(() => {
    setOnUnauthorized(logout);
  }, []);

  // Cargar organización y terminología del tenant (HU-1.3).
  useEffect(() => {
    if (!sesion) return;
    api
      .get<AuthMe>("/auth/me")
      .then((me) => {
        setOrganizacionNombre(me.organizacion?.nombre ?? null);
        setTerminologia(me.organizacion?.configuracionTerminologia ?? {});
      })
      .catch(() => {
        /* un 401 ya dispara logout vía setOnUnauthorized */
      });
  }, [sesion]);

  const login = async (email: string, password: string) => {
    const data = await api.post<LoginResponse>("/auth/login", { email, password });
    setToken(data.token);
    const nueva = { token: data.token, usuario: data.usuario };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nueva));
    setSesion(nueva);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      usuario: sesion?.usuario ?? null,
      token: sesion?.token ?? null,
      organizacionNombre,
      terminologia,
      login,
      logout,
    }),
    [sesion, organizacionNombre, terminologia]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
