import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type AssistantChatContextValue = {
  open: boolean;
  openChat: () => void;
  closeChat: () => void;
};

const AssistantChatContext = createContext<AssistantChatContextValue | null>(null);

export function AssistantChatProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  const openChat = useCallback(() => setOpen(true), []);
  const closeChat = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({ open, openChat, closeChat }),
    [open, openChat, closeChat]
  );

  return <AssistantChatContext.Provider value={value}>{children}</AssistantChatContext.Provider>;
}

export function useAssistantChat() {
  const ctx = useContext(AssistantChatContext);
  if (!ctx) {
    throw new Error("useAssistantChat must be used within AssistantChatProvider");
  }
  return ctx;
}
