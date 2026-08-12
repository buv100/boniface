import { useEffect, useRef } from "react";
import { Platform } from "react-native";

const STORAGE_KEY = "@boniface_web_build_id";
/** Check for a new web deploy at least every 6 hours while the app is open. */
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

interface VersionPayload {
  buildId?: string;
  commit?: string;
  version?: string;
  label?: string;
}

async function fetchLiveBuildId(): Promise<string | null> {
  const url = `/boniface-version.json?cb=${Date.now()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const data = (await res.json()) as VersionPayload;
  return data.buildId?.trim() || null;
}

function readStoredBuildId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeBuildId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* private mode / blocked */
  }
}

async function checkForWebUpdate(): Promise<void> {
  if (Platform.OS !== "web") return;

  const liveId = await fetchLiveBuildId();
  if (!liveId) return;

  const stored = readStoredBuildId();
  if (!stored) {
    storeBuildId(liveId);
    return;
  }

  if (stored !== liveId) {
    storeBuildId(liveId);
    window.location.reload();
  }
}

/**
 * Friends opening boniface.expo.app auto-reload when a new deploy is published.
 * Checks on open and every 6 hours while the tab stays open.
 */
export function useWebAutoUpdate(): void {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    checkForWebUpdate().catch(() => {});

    timerRef.current = setInterval(() => {
      checkForWebUpdate().catch(() => {});
    }, CHECK_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);
}
