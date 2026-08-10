import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "@boniface_auth_token";

function resolveApiBase(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/+$/, "");
  }
  // Local Express API — works for web and simulators when the API runs on the host.
  // Override with EXPO_PUBLIC_API_URL for physical devices (e.g. http://192.168.x.x:3001/api).
  if (Platform.OS === "web" || __DEV__) {
    return "http://localhost:3001/api";
  }
  return "http://localhost:3001/api";
}

export const API_BASE = resolveApiBase();

export async function getStoredToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function storeToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
}

export async function apiCall<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, token } = opts;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    const code = typeof err.code === "string" ? err.code : "";
    const msg = err.error ?? `HTTP ${res.status}`;
    throw new Error(code ? `${code}: ${msg}` : msg);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}
