import * as Haptics from "expo-haptics";
import { router } from "expo-router";

import { isAllowedAssistantRoute, normalizeAssistantRoute } from "@/lib/assistantNav";

/** Navigate to a whitelist route returned by the AI assistant. */
export function navigateAssistantRoute(route: string): boolean {
  const path = normalizeAssistantRoute(route);
  if (!isAllowedAssistantRoute(path)) return false;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  if (path === "/") {
    router.replace("/(tabs)" as any);
  } else if (path === "/quick" || path === "/team" || path === "/bar" || path === "/more") {
    router.push(`/(tabs)/${path.slice(1)}` as any);
  } else {
    router.push(path as any);
  }
  return true;
}
