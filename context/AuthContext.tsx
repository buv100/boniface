import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { apiCall, clearToken, getStoredToken, storeToken } from "@/lib/api";

export type AuthRole = "manager" | "employee";

export interface AuthManager {
  id: string;
  venueId: string;
  name: string;
  phone: string;
  createdAt: string;
}

export interface AuthEmployee {
  id: string;
  venueId: string;
  name: string;
  roles: string[];
  phone?: string | null;
  onboardedAt?: string | null;
  createdAt?: string;
}

export interface AuthVenue {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  createdAt: string;
  updatedAt?: string;
}

/** List shape for multi-venue UI (stub works with one venue today). */
export type AuthVenueList = AuthVenue[];

export interface ForgotCheckResult {
  hasSecurityQuestion: boolean;
  questionHint?: string;
}

export interface SubscriptionInfo {
  id?: string;
  status: string;
  plan: string | null;
  expiresAt: string | null;
  isActive: boolean;
}

interface AuthState {
  token: string | null;
  role: AuthRole | null;
  manager: AuthManager | null;
  employee: AuthEmployee | null;
  venue: AuthVenue | null;
  /** All venues accessible; currently always [venue] or []. */
  venues: AuthVenueList;
  subscription: SubscriptionInfo | null;
}

function venuesFrom(venue: AuthVenue | null | undefined): AuthVenueList {
  return venue ? [venue] : [];
}

interface RegisterOptions {
  securityQuestion?: string;
  securityAnswer?: string;
}

interface AuthContextType {
  token: string | null;
  role: AuthRole | null;
  manager: AuthManager | null;
  employee: AuthEmployee | null;
  venue: AuthVenue | null;
  venues: AuthVenueList;
  subscription: SubscriptionInfo | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  isManager: boolean;
  isEmployee: boolean;
  /** Managers blocked when subscription expired; employees keep grace access */
  subscriptionExpired: boolean;
  canManageCritical: boolean;
  register: (
    venueName: string,
    managerName: string,
    phone: string,
    pin: string,
    opts?: RegisterOptions
  ) => Promise<void>;
  login: (phone: string, pin: string) => Promise<void>;
  employeeLogin: (phone: string, pin: string) => Promise<void>;
  employeeJoin: (code: string, name: string, pin: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotCheck: (phone: string) => Promise<ForgotCheckResult>;
  recover: (phone: string, securityAnswer: string, newPin: string) => Promise<void>;
  updateVenueLocally: (venue: Partial<AuthVenue>) => void;
  /** Switch active venue (no-op when only one; prepared for multi-venue). */
  switchVenue: (venueId: string) => void;
  refreshSubscription: () => Promise<SubscriptionInfo | null>;
  createInvite: (employeeName?: string) => Promise<{ code: string; expiresAt: string | null }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function fetchSubscription(token: string): Promise<SubscriptionInfo | null> {
  try {
    return await apiCall<SubscriptionInfo>("/subscription", { token });
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    role: null,
    manager: null,
    employee: null,
    venue: null,
    venues: [],
    subscription: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await getStoredToken();
        if (token) {
          const data = await apiCall<{
            role: AuthRole;
            manager?: AuthManager;
            employee?: AuthEmployee;
            venue: AuthVenue;
            venues?: AuthVenue[];
          }>("/auth/me", { token });
          const subscription = await fetchSubscription(token);
          const venues =
            data.venues && data.venues.length > 0 ? data.venues : venuesFrom(data.venue);
          setState({
            token,
            role: data.role,
            manager: data.manager ?? null,
            employee: data.employee ?? null,
            venue: data.venue,
            venues,
            subscription,
          });
        }
      } catch {
        // Offline / API down: keep working without cloud session
        await clearToken();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const applySession = useCallback(
    async (payload: {
      token: string;
      role: AuthRole;
      manager?: AuthManager | null;
      employee?: AuthEmployee | null;
      venue: AuthVenue;
      venues?: AuthVenue[];
    }) => {
      await storeToken(payload.token);
      const subscription = await fetchSubscription(payload.token);
      const venues =
        payload.venues && payload.venues.length > 0
          ? payload.venues
          : venuesFrom(payload.venue);
      setState({
        token: payload.token,
        role: payload.role,
        manager: payload.manager ?? null,
        employee: payload.employee ?? null,
        venue: payload.venue,
        venues,
        subscription,
      });
    },
    []
  );

  const register = useCallback(
    async (
      venueName: string,
      managerName: string,
      phone: string,
      pin: string,
      opts?: RegisterOptions
    ) => {
      const data = await apiCall<{ token: string; manager: AuthManager; venue: AuthVenue }>(
        "/auth/register",
        {
          method: "POST",
          body: {
            venueName,
            managerName,
            phone,
            pin,
            securityQuestion: opts?.securityQuestion,
            securityAnswer: opts?.securityAnswer,
          },
        }
      );
      await applySession({
        token: data.token,
        role: "manager",
        manager: data.manager,
        venue: data.venue,
      });
    },
    [applySession]
  );

  const login = useCallback(
    async (phone: string, pin: string) => {
      const data = await apiCall<{ token: string; manager: AuthManager; venue: AuthVenue }>(
        "/auth/login",
        {
          method: "POST",
          body: { phone, pin },
        }
      );
      await applySession({
        token: data.token,
        role: "manager",
        manager: data.manager,
        venue: data.venue,
      });
    },
    [applySession]
  );

  const employeeLogin = useCallback(
    async (phone: string, pin: string) => {
      const data = await apiCall<{
        token: string;
        role: "employee";
        employee: AuthEmployee;
        venue: AuthVenue;
      }>("/auth/employee-login", {
        method: "POST",
        body: { phone, pin },
      });
      await applySession({
        token: data.token,
        role: "employee",
        employee: data.employee,
        venue: data.venue,
      });
    },
    [applySession]
  );

  const employeeJoin = useCallback(
    async (code: string, name: string, pin: string, phone?: string) => {
      const data = await apiCall<{
        token: string;
        role: "employee";
        employee: AuthEmployee;
        venue: AuthVenue;
      }>("/auth/employee-join", {
        method: "POST",
        body: { code, name, pin, phone },
      });
      await applySession({
        token: data.token,
        role: "employee",
        employee: data.employee,
        venue: data.venue,
      });
    },
    [applySession]
  );

  const logout = useCallback(async () => {
    if (state.token) {
      await apiCall("/auth/logout", { method: "POST", token: state.token }).catch(() => {});
    }
    await clearToken();
    setState({
      token: null,
      role: null,
      manager: null,
      employee: null,
      venue: null,
      venues: [],
      subscription: null,
    });
  }, [state.token]);

  const forgotCheck = useCallback(async (phone: string) => {
    return apiCall<ForgotCheckResult>("/auth/forgot-check", {
      method: "POST",
      body: { phone },
    });
  }, []);

  const recover = useCallback(
    async (phone: string, securityAnswer: string, newPin: string) => {
      const data = await apiCall<{ token: string; manager: AuthManager; venue: AuthVenue }>(
        "/auth/recover",
        {
          method: "POST",
          body: { phone, securityAnswer, newPin },
        }
      );
      await applySession({
        token: data.token,
        role: "manager",
        manager: data.manager,
        venue: data.venue,
      });
    },
    [applySession]
  );

  const updateVenueLocally = useCallback((patch: Partial<AuthVenue>) => {
    setState((s) => {
      if (!s.venue) return s;
      const venue = { ...s.venue, ...patch };
      const venues = s.venues.map((v) => (v.id === venue.id ? venue : v));
      return { ...s, venue, venues: venues.length ? venues : [venue] };
    });
  }, []);

  const switchVenue = useCallback((venueId: string) => {
    setState((s) => {
      const next = s.venues.find((v) => v.id === venueId);
      if (!next || next.id === s.venue?.id) return s;
      return { ...s, venue: next };
    });
  }, []);

  const refreshSubscription = useCallback(async () => {
    if (!state.token) return null;
    const subscription = await fetchSubscription(state.token);
    setState((s) => ({ ...s, subscription }));
    return subscription;
  }, [state.token]);

  const createInvite = useCallback(
    async (employeeName?: string) => {
      if (!state.token) throw new Error("Not logged in");
      return apiCall<{ code: string; expiresAt: string | null }>("/invites", {
        method: "POST",
        token: state.token,
        body: { employeeName, expiresInDays: 7 },
      });
    },
    [state.token]
  );

  const subscriptionExpired =
    !!state.subscription &&
    (state.subscription.status === "expired" || state.subscription.isActive === false);

  const isManager = state.role === "manager";
  const isEmployee = state.role === "employee";
  // Employees get grace; managers cannot run critical cloud actions when expired
  const canManageCritical = isManager && !subscriptionExpired;

  return (
    <AuthContext.Provider
      value={{
        token: state.token,
        role: state.role,
        manager: state.manager,
        employee: state.employee,
        venue: state.venue,
        venues: state.venues,
        subscription: state.subscription,
        isLoading,
        isLoggedIn: !!state.token,
        isManager,
        isEmployee,
        subscriptionExpired,
        canManageCritical,
        register,
        login,
        employeeLogin,
        employeeJoin,
        logout,
        forgotCheck,
        recover,
        updateVenueLocally,
        switchVenue,
        refreshSubscription,
        createInvite,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
