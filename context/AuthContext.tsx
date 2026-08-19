import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { apiCall, clearToken, getStoredToken, storeToken } from "@/lib/api";
import type { AuthOrganization, AuthOwner, OwnerVenue } from "@/lib/ownerTypes";

export type AuthRole = "manager" | "employee" | "owner" | "platform_admin";

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
  organizationId?: string | null;
  kind?: string;
  address?: string | null;
  currency: string;
  timezone: string;
  createdAt: string;
  updatedAt?: string;
  alerts?: OwnerVenue["alerts"];
}

export type AuthVenueList = AuthVenue[];

export interface ForgotCheckResult {
  hasSecurityQuestion: boolean;
  questionHint?: string;
}

export interface SubscriptionInfo {
  id?: string | null;
  status: string;
  plan: string | null;
  expiresAt: string | null;
  notes?: string | null;
  isActive: boolean;
}

export interface AuthPlatformAdmin {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
}

interface AuthState {
  token: string | null;
  role: AuthRole | null;
  manager: AuthManager | null;
  employee: AuthEmployee | null;
  owner: AuthOwner | null;
  organization: AuthOrganization | null;
  platformAdmin: AuthPlatformAdmin | null;
  venue: AuthVenue | null;
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

interface OwnerSessionPayload {
  token: string;
  role: "owner";
  owner: AuthOwner;
  organization: AuthOrganization;
  venue: AuthVenue;
  venues: AuthVenue[];
  subscription?: SubscriptionInfo | null;
}

interface AdminSessionPayload {
  token: string;
  role: "platform_admin";
  admin: AuthPlatformAdmin;
}

interface AuthContextType {
  token: string | null;
  role: AuthRole | null;
  manager: AuthManager | null;
  employee: AuthEmployee | null;
  owner: AuthOwner | null;
  organization: AuthOrganization | null;
  platformAdmin: AuthPlatformAdmin | null;
  venue: AuthVenue | null;
  venues: AuthVenueList;
  subscription: SubscriptionInfo | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  isManager: boolean;
  isEmployee: boolean;
  isOwner: boolean;
  isPlatformAdmin: boolean;
  ownerAccessActive: boolean;
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
  ownerLogin: (phone: string, pin: string) => Promise<void>;
  adminLogin: (phone: string, pin: string) => Promise<void>;
  employeeLogin: (phone: string, pin: string) => Promise<void>;
  employeeJoin: (code: string, name: string, pin: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotCheck: (phone: string) => Promise<ForgotCheckResult>;
  recover: (phone: string, securityAnswer: string, newPin: string) => Promise<void>;
  updateVenueLocally: (venue: Partial<AuthVenue>) => void;
  switchVenue: (venueId: string) => Promise<void>;
  createVenue: (body: {
    name: string;
    kind: "bar" | "restaurant";
    address?: string;
  }) => Promise<AuthVenue>;
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

const emptyState: AuthState = {
  token: null,
  role: null,
  manager: null,
  employee: null,
  owner: null,
  organization: null,
  platformAdmin: null,
  venue: null,
  venues: [],
  subscription: null,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(emptyState);
  const [isLoading, setIsLoading] = useState(true);

  const applyOwnerSession = useCallback(async (payload: OwnerSessionPayload) => {
    await storeToken(payload.token);
    setState({
      token: payload.token,
      role: "owner",
      manager: null,
      employee: null,
      owner: payload.owner,
      organization: payload.organization,
      platformAdmin: null,
      venue: payload.venue,
      venues: payload.venues?.length ? payload.venues : venuesFrom(payload.venue),
      subscription: payload.subscription ?? null,
    });
  }, []);

  const applyAdminSession = useCallback(async (payload: AdminSessionPayload) => {
    await storeToken(payload.token);
    setState({
      token: payload.token,
      role: "platform_admin",
      manager: null,
      employee: null,
      owner: null,
      organization: null,
      platformAdmin: payload.admin,
      venue: null,
      venues: [],
      subscription: null,
    });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const token = await getStoredToken();
        if (token) {
          const data = await apiCall<{
            role: AuthRole;
            manager?: AuthManager;
            employee?: AuthEmployee;
            owner?: AuthOwner;
            organization?: AuthOrganization;
            admin?: AuthPlatformAdmin;
            venue?: AuthVenue;
            venues?: AuthVenue[];
            subscription?: SubscriptionInfo | null;
          }>("/auth/me", { token });
          if (data.role === "platform_admin" && data.admin) {
            setState({
              token,
              role: "platform_admin",
              manager: null,
              employee: null,
              owner: null,
              organization: null,
              platformAdmin: data.admin,
              venue: null,
              venues: [],
              subscription: null,
            });
          } else if (data.role === "owner" && data.owner && data.organization && data.venue) {
            setState({
              token,
              role: "owner",
              manager: null,
              employee: null,
              owner: data.owner,
              organization: data.organization,
              platformAdmin: null,
              venue: data.venue,
              venues: data.venues?.length ? data.venues : venuesFrom(data.venue),
              subscription: data.subscription ?? null,
            });
          } else {
            const subscription = await fetchSubscription(token);
            const venues =
              data.venues && data.venues.length > 0 ? data.venues : venuesFrom(data.venue);
            setState({
              token,
              role: data.role,
              manager: data.manager ?? null,
              employee: data.employee ?? null,
              owner: null,
              organization: null,
              platformAdmin: null,
              venue: data.venue ?? null,
              venues,
              subscription,
            });
          }
        }
      } catch {
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
      const subscription = payload.role === "owner" ? null : await fetchSubscription(payload.token);
      const venues =
        payload.venues && payload.venues.length > 0
          ? payload.venues
          : venuesFrom(payload.venue);
      setState((s) => ({
        token: payload.token,
        role: payload.role,
        manager: payload.manager ?? null,
        employee: payload.employee ?? null,
        owner: s.owner,
        organization: s.organization,
        platformAdmin: s.platformAdmin,
        venue: payload.venue,
        venues,
        subscription,
      }));
    },
    []
  );

  const adminLogin = useCallback(
    async (phone: string, pin: string) => {
      const data = await apiCall<AdminSessionPayload>("/auth/admin/login", {
        method: "POST",
        body: { phone, pin },
      });
      await applyAdminSession(data);
    },
    [applyAdminSession]
  );

  const ownerLogin = useCallback(
    async (phone: string, pin: string) => {
      const data = await apiCall<OwnerSessionPayload>("/auth/owner/login", {
        method: "POST",
        body: { phone, pin },
      });
      await applyOwnerSession(data);
    },
    [applyOwnerSession]
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
    setState(emptyState);
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

  const switchVenue = useCallback(
    async (venueId: string) => {
      if (!state.token || state.role !== "owner") {
        setState((s) => {
          const next = s.venues.find((v) => v.id === venueId);
          if (!next || next.id === s.venue?.id) return s;
          return { ...s, venue: next };
        });
        return;
      }
      const data = await apiCall<OwnerSessionPayload>("/auth/select-venue", {
        method: "POST",
        token: state.token,
        body: { venueId },
      });
      await applyOwnerSession(data);
    },
    [applyOwnerSession, state.role, state.token]
  );

  const createVenue = useCallback(
    async (body: { name: string; kind: "bar" | "restaurant"; address?: string }) => {
      if (!state.token) throw new Error("Not logged in");
      const venue = await apiCall<AuthVenue>("/owner/venues", {
        method: "POST",
        token: state.token,
        body,
      });
      setState((s) => ({ ...s, venues: [...s.venues, venue] }));
      return venue;
    },
    [state.token]
  );

  const refreshSubscription = useCallback(async () => {
    if (!state.token) return null;
    if (state.role === "owner") {
      const data = await apiCall<{ subscription?: SubscriptionInfo | null }>("/auth/me", {
        token: state.token,
      });
      const subscription = data.subscription ?? null;
      setState((s) => ({ ...s, subscription }));
      return subscription;
    }
    if (state.role === "platform_admin") return null;
    const subscription = await fetchSubscription(state.token);
    setState((s) => ({ ...s, subscription }));
    return subscription;
  }, [state.token, state.role]);

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

  const isManager = state.role === "manager";
  const isEmployee = state.role === "employee";
  const isOwner = state.role === "owner";
  const isPlatformAdmin = state.role === "platform_admin";
  const ownerAccessActive = isOwner && !!state.subscription?.isActive;
  const subscriptionExpired = isOwner
    ? !state.subscription?.isActive
    : !!state.subscription &&
      (state.subscription.status === "expired" || state.subscription.isActive === false);
  const canManageCritical = (isManager || isOwner) && !subscriptionExpired;

  return (
    <AuthContext.Provider
      value={{
        token: state.token,
        role: state.role,
        manager: state.manager,
        employee: state.employee,
        owner: state.owner,
        organization: state.organization,
        platformAdmin: state.platformAdmin,
        venue: state.venue,
        venues: state.venues,
        subscription: state.subscription,
        isLoading,
        isLoggedIn: !!state.token,
        isManager,
        isEmployee,
        isOwner,
        isPlatformAdmin,
        ownerAccessActive,
        subscriptionExpired,
        canManageCritical,
        register,
        login,
        ownerLogin,
        adminLogin,
        employeeLogin,
        employeeJoin,
        logout,
        forgotCheck,
        recover,
        updateVenueLocally,
        switchVenue,
        createVenue,
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
