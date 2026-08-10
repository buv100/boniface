/** Whitelisted in-app routes the AI assistant may open. */
export const ASSISTANT_ROUTES = [
  "/",
  "/quick",
  "/team",
  "/bar",
  "/more",
  "/account",
  "/cards",
  "/briefing",
  "/schedule",
  "/search",
  "/history",
  "/stats",
  "/privacy",
  "/terms",
  "/employee",
  "/employee/stockout",
  "/employee/tips",
  "/employee/profile",
  "/assistant",
] as const;

export type AssistantRoute = (typeof ASSISTANT_ROUTES)[number];

export function isAllowedAssistantRoute(route: string | null | undefined): route is AssistantRoute {
  if (!route) return false;
  const normalized = route.trim().replace(/\/+$/, "") || "/";
  return (ASSISTANT_ROUTES as readonly string[]).includes(normalized === "" ? "/" : normalized);
}

export function normalizeAssistantRoute(route: string): string {
  const t = route.trim();
  if (!t || t === "/") return "/";
  return t.replace(/\/+$/, "");
}
