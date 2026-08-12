import { useEffect, useRef } from "react";
import { Platform } from "react-native";

import { WEB_BUILD_ID } from "@/lib/generated/webBuildId";

const RELOAD_GUARD_KEY = "@boniface_web_reload_for";
/** Recheck while the tab stays open (also checks on every refresh / tab focus). */
const CHECK_INTERVAL_MS = 15 * 60 * 1000;

interface VersionPayload {
  buildId?: string;
}

async function fetchLiveBuildId(): Promise<string | null> {
  const url = `/boniface-version.json?cb=${Date.now()}`;
  const res = await fetch(url, { cache: "no-store", headers: { "Cache-Control": "no-cache" } });
  if (!res.ok) return null;
  const data = (await res.json()) as VersionPayload;
  return data.buildId?.trim() || null;
}

function alreadyReloadedFor(id: string): boolean {
  try {
    return sessionStorage.getItem(RELOAD_GUARD_KEY) === id;
  } catch {
    return false;
  }
}

function markReloadedFor(id: string): void {
  try {
    sessionStorage.setItem(RELOAD_GUARD_KEY, id);
  } catch {
    /* ignore */
  }
}

function hardReload(liveId: string): void {
  if (typeof window === "undefined") return;
  if (alreadyReloadedFor(liveId)) return;
  markReloadedFor(liveId);

  const url = new URL(window.location.href);
  url.searchParams.set("_b", liveId);
  window.location.replace(url.toString());
}

async function checkForWebUpdate(): Promise<void> {
  if (Platform.OS !== "web") return;

  const liveId = await fetchLiveBuildId();
  if (!liveId) return;

  // Compare the JS that is actually running — not a leftover localStorage id.
  if (WEB_BUILD_ID && WEB_BUILD_ID !== liveId) {
    hardReload(liveId);
  }
}

/**
 * On every open/refresh, compare this page's build id to the live deploy.
 * If a newer deploy exists, force a cache-busting reload so friends get updates.
 */
export function useWebAutoUpdate(): void {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    checkForWebUpdate().catch(() => {});

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        checkForWebUpdate().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    timerRef.current = setInterval(() => {
      checkForWebUpdate().catch(() => {});
    }, CHECK_INTERVAL_MS);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);
}
