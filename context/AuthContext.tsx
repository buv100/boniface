import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { apiCall, clearToken, getStoredToken, storeToken } from "@/lib/api";

export interface AuthManager {
  id: string;
  venueId: string;
  name: string;
  phone: string;
  createdAt: string;
}

export interface AuthVenue {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  createdAt: string;
}

interface AuthState {
  token: string | null;
  manager: AuthManager | null;
  venue: AuthVenue | null;
}

interface AuthContextType {
  token: string | null;
  manager: AuthManager | null;
  venue: AuthVenue | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  register: (venueName: string, managerName: string, phone: string, pin: string) => Promise<void>;
  login: (phone: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
  updateVenueLocally: (venue: Partial<AuthVenue>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ token: null, manager: null, venue: null });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await getStoredToken();
        if (token) {
          const data = await apiCall<{ manager: AuthManager; venue: AuthVenue }>("/auth/me", { token });
          setState({ token, manager: data.manager, venue: data.venue });
        }
      } catch {
        await clearToken();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const register = useCallback(async (venueName: string, managerName: string, phone: string, pin: string) => {
    const data = await apiCall<{ token: string; manager: AuthManager; venue: AuthVenue }>("/auth/register", {
      method: "POST",
      body: { venueName, managerName, phone, pin },
    });
    await storeToken(data.token);
    setState({ token: data.token, manager: data.manager, venue: data.venue });
  }, []);

  const login = useCallback(async (phone: string, pin: string) => {
    const data = await apiCall<{ token: string; manager: AuthManager; venue: AuthVenue }>("/auth/login", {
      method: "POST",
      body: { phone, pin },
    });
    await storeToken(data.token);
    setState({ token: data.token, manager: data.manager, venue: data.venue });
  }, []);

  const logout = useCallback(async () => {
    if (state.token) {
      await apiCall("/auth/logout", { method: "POST", token: state.token }).catch(() => {});
    }
    await clearToken();
    setState({ token: null, manager: null, venue: null });
  }, [state.token]);

  const updateVenueLocally = useCallback((patch: Partial<AuthVenue>) => {
    setState((s) => s.venue ? { ...s, venue: { ...s.venue, ...patch } } : s);
  }, []);

  return (
    <AuthContext.Provider value={{
      token: state.token,
      manager: state.manager,
      venue: state.venue,
      isLoading,
      isLoggedIn: !!state.token,
      register,
      login,
      logout,
      updateVenueLocally,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
