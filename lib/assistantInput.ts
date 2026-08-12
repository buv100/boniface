import { Platform } from "react-native";
import type { NativeSyntheticEvent, TextInputKeyPressEventData } from "react-native";

const NAV_INTENT = [
  "פתח",
  "עבור",
  "שלח",
  "לך ל",
  "תעביר",
  "הראה",
  "open ",
  "go to",
  "navigate",
  "show me",
  "take me",
  "открой",
  "перейди",
];

export function userAskedToNavigate(text: string): boolean {
  const lower = text.toLowerCase();
  return NAV_INTENT.some((cue) => lower.includes(cue));
}

/** Web needs onKeyDown — onKeyPress alone misses Enter in multiline fields. */
export function getAssistantTextInputKeyProps(
  text: string,
  send: (raw: string) => void,
  sending: boolean
): Record<string, unknown> {
  if (Platform.OS !== "web") return {};

  return {
    onKeyDown: (e: { key?: string; shiftKey?: boolean; preventDefault?: () => void }) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault?.();
        if (!sending && text.trim()) send(text);
      }
    },
  };
}

/** Enter sends; Shift+Enter adds newline (web). */
export function handleAssistantEnterKey(
  e: NativeSyntheticEvent<TextInputKeyPressEventData>,
  text: string,
  send: (raw: string) => void,
  sending: boolean
): void {
  const key = e.nativeEvent.key;
  if (key !== "Enter") return;

  const shift = (e.nativeEvent as TextInputKeyPressEventData & { shiftKey?: boolean }).shiftKey;
  if (Platform.OS === "web" && shift) return;

  if (Platform.OS === "web") {
    e.preventDefault?.();
  }

  if (!sending && text.trim()) {
    send(text);
  }
}
