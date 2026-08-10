import { apiCall } from "@/lib/api";

/** Thin HTTP transport used by repositories (not by UI). */
export const httpRepo = {
  get<T>(path: string, token?: string | null) {
    return apiCall<T>(path, { method: "GET", token });
  },
  post<T>(path: string, body?: unknown, token?: string | null) {
    return apiCall<T>(path, { method: "POST", token, body });
  },
  put<T>(path: string, body?: unknown, token?: string | null) {
    return apiCall<T>(path, { method: "PUT", token, body });
  },
  patch<T>(path: string, body?: unknown, token?: string | null) {
    return apiCall<T>(path, { method: "PATCH", token, body });
  },
  delete(path: string, token?: string | null) {
    return apiCall<void>(path, { method: "DELETE", token });
  },
};
