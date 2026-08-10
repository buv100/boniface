import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { usePathname } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";
import { useAssistantLiveContext } from "@/hooks/useAssistantLiveContext";
import { apiCall, getStoredToken } from "@/lib/api";
import { isAllowedAssistantRoute, normalizeAssistantRoute } from "@/lib/assistantNav";
import { navigateAssistantRoute } from "@/lib/navigateAssistant";

type ChatRole = "user" | "assistant";

interface ChatBubble {
  id: string;
  role: ChatRole;
  content: string;
}

const SUGGESTION_KEYS = ["tip1", "tip2", "tip3", "tip4"] as const;

export function AssistantFab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tr, isRTL } = useLang();
  const liveContext = useAssistantLiveContext();
  const pathname = usePathname();
  const { height: winH } = useWindowDimensions();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatBubble[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const onFullAssistant = pathname === "/assistant" || pathname?.endsWith("/assistant");
  const tabClearance = Platform.OS === "web" ? 96 : 72 + insets.bottom;
  const panelHeight = Math.min(Math.max(winH * 0.58, 360), 520);

  useEffect(() => {
    if (!open) return;
    setMessages((prev) =>
      prev.length
        ? prev
        : [
            {
              id: "welcome",
              role: "assistant",
              content: tr.assistant.welcome,
            },
          ]
    );
  }, [open, tr.assistant.welcome]);

  const close = () => setOpen(false);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || sending) return;

    const userMsg: ChatBubble = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    };
    const forApi = [...messages, userMsg]
      .filter((m) => m.id !== "welcome")
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);
    Haptics.selectionAsync();

    try {
      const token = await getStoredToken();
      const res = await apiCall<{ reply: string; navigate?: string | null }>(
        "/assistant/chat",
        {
          method: "POST",
          token,
          body: {
            messages: forApi.length ? forApi : [{ role: "user", content: text }],
            context: liveContext,
          },
        }
      );

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: res.reply || tr.assistant.emptyReply,
        },
      ]);

      if (res.navigate && isAllowedAssistantRoute(normalizeAssistantRoute(res.navigate))) {
        setTimeout(() => {
          close();
          navigateAssistantRoute(res.navigate!);
        }, 450);
      }
    } catch (e) {
      const msg =
        e instanceof Error && e.message.includes("GROQ")
          ? tr.assistant.errorGroq
          : tr.assistant.errorNetwork;
      setMessages((prev) => [
        ...prev,
        { id: `e-${Date.now()}`, role: "assistant", content: msg },
      ]);
    } finally {
      setSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  };

  if (onFullAssistant) return null;

  const sideStyle = isRTL
    ? { left: 16 }
    : { right: 16 };

  return (
    <>
      {!open && (
        <TouchableOpacity
          style={[
            styles.fab,
            sideStyle,
            {
              bottom: tabClearance,
              backgroundColor: colors.primary,
              shadowColor: colors.primary,
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={tr.assistant.fabLabel}
          activeOpacity={0.9}
        >
          <Feather name="message-circle" size={24} color={colors.primaryForeground} />
        </TouchableOpacity>
      )}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={close}
        statusBarTranslucent
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={close} accessibilityLabel={tr.assistant.close} />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={[styles.panelWrap, { paddingBottom: Math.max(insets.bottom, 12) }]}
            pointerEvents="box-none"
          >
            <View
              style={[
                styles.panel,
                {
                  height: panelHeight,
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.panelHeader,
                  {
                    borderBottomColor: colors.border,
                    flexDirection: isRTL ? "row-reverse" : "row",
                  },
                ]}
              >
                <View style={[styles.aiBadge, { backgroundColor: "rgba(245,158,11,0.15)" }]}>
                  <Feather name="cpu" size={16} color={colors.primary} />
                </View>
                <View style={{ flex: 1, alignItems: isRTL ? "flex-end" : "flex-start" }}>
                  <Text style={[styles.title, { color: colors.foreground }]}>{tr.assistant.title}</Text>
                  <Text style={[styles.sub, { color: colors.mutedForeground }]}>{tr.assistant.sub}</Text>
                </View>
                <TouchableOpacity
                  onPress={close}
                  style={[styles.closeBtn, { borderColor: colors.border }]}
                  accessibilityRole="button"
                  accessibilityLabel={tr.assistant.close}
                >
                  <Feather name="x" size={18} color={colors.foreground} />
                </TouchableOpacity>
              </View>

              <FlatList
                ref={listRef}
                data={messages}
                keyExtractor={(item) => item.id}
                style={{ flex: 1 }}
                contentContainerStyle={styles.list}
                onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
                renderItem={({ item }) => {
                  const mine = item.role === "user";
                  return (
                    <View
                      style={[
                        styles.bubbleRow,
                        {
                          justifyContent: mine
                            ? isRTL
                              ? "flex-start"
                              : "flex-end"
                            : isRTL
                              ? "flex-end"
                              : "flex-start",
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.bubble,
                          mine
                            ? { backgroundColor: colors.primary }
                            : {
                                backgroundColor: colors.card,
                                borderColor: colors.border,
                                borderWidth: 1,
                              },
                        ]}
                      >
                        <Text
                          style={[
                            styles.bubbleText,
                            {
                              color: mine ? colors.primaryForeground : colors.foreground,
                              textAlign: isRTL ? "right" : "left",
                            },
                          ]}
                        >
                          {item.content}
                        </Text>
                      </View>
                    </View>
                  );
                }}
                ListFooterComponent={
                  messages.length <= 1 ? (
                    <View style={styles.suggestions}>
                      <Text
                        style={[
                          styles.suggestLabel,
                          { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" },
                        ]}
                      >
                        {tr.assistant.tryAsking}
                      </Text>
                      <View style={styles.suggestRow}>
                        {SUGGESTION_KEYS.map((key) => (
                          <TouchableOpacity
                            key={key}
                            style={[
                              styles.chip,
                              { borderColor: colors.border, backgroundColor: "rgba(255,255,255,0.04)" },
                            ]}
                            onPress={() => send(tr.assistant.suggestions[key])}
                          >
                            <Text style={[styles.chipText, { color: colors.primary }]}>
                              {tr.assistant.suggestions[key]}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ) : null
                }
              />

              <View
                style={[
                  styles.composer,
                  {
                    borderTopColor: colors.border,
                    flexDirection: isRTL ? "row-reverse" : "row",
                  },
                ]}
              >
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      color: colors.foreground,
                      textAlign: isRTL ? "right" : "left",
                    },
                  ]}
                  placeholder={tr.assistant.placeholder}
                  placeholderTextColor={colors.mutedForeground}
                  value={input}
                  onChangeText={setInput}
                  multiline
                  editable={!sending}
                  onSubmitEditing={() => send(input)}
                />
                <TouchableOpacity
                  style={[
                    styles.sendBtn,
                    { backgroundColor: input.trim() && !sending ? colors.primary : colors.border },
                  ]}
                  onPress={() => send(input)}
                  disabled={!input.trim() || sending}
                  accessibilityRole="button"
                  accessibilityLabel={tr.assistant.send}
                >
                  {sending ? (
                    <ActivityIndicator color={colors.primaryForeground} />
                  ) : (
                    <Feather name="send" size={16} color={colors.primaryForeground} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    zIndex: 9999,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  panelWrap: {
    paddingHorizontal: 12,
  },
  panel: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  panelHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    alignItems: "center",
    gap: 10,
  },
  aiBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 16, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { padding: 12, paddingBottom: 16 },
  bubbleRow: { flexDirection: "row", marginBottom: 8 },
  bubble: {
    maxWidth: "88%",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bubbleText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  suggestions: { marginTop: 4, gap: 8 },
  suggestLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  suggestRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  composer: {
    borderTopWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: "flex-end",
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 96,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
