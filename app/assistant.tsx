import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";
import { useAssistantLiveContext } from "@/hooks/useAssistantLiveContext";
import { apiCall, getStoredToken } from "@/lib/api";
import { handleAssistantEnterKey, userAskedToNavigate, getAssistantTextInputKeyProps } from "@/lib/assistantInput";
import { isAllowedAssistantRoute, normalizeAssistantRoute } from "@/lib/assistantNav";
import { navigateAssistantRoute } from "@/lib/navigateAssistant";

type ChatRole = "user" | "assistant";

interface ChatBubble {
  id: string;
  role: ChatRole;
  content: string;
  navigate?: string;
}

const SUGGESTION_KEYS = ["tip1", "tip2", "tip3", "tip4"] as const;

export default function AssistantScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tr, isRTL } = useLang();
  const liveContext = useAssistantLiveContext();
  const [messages, setMessages] = useState<ChatBubble[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: tr.assistant.welcome,
      },
    ]);
  }, [tr.assistant.welcome]);

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

      const navRoute =
        res.navigate && isAllowedAssistantRoute(normalizeAssistantRoute(res.navigate))
          ? normalizeAssistantRoute(res.navigate)
          : undefined;

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: res.reply || tr.assistant.emptyReply,
          navigate: navRoute,
        },
      ]);

      if (navRoute && navRoute !== "/assistant" && userAskedToNavigate(text)) {
        setTimeout(() => navigateAssistantRoute(navRoute), 500);
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
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 8,
            borderBottomColor: colors.border,
            flexDirection: isRTL ? "row-reverse" : "row",
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { borderColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel={tr.cards.back}
        >
          <Feather name={isRTL ? "chevron-right" : "chevron-left"} size={20} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: isRTL ? "flex-end" : "flex-start" }}>
          <Text style={[styles.title, { color: colors.foreground }]}>{tr.assistant.title}</Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>{tr.assistant.sub}</Text>
        </View>
        <View style={[styles.aiBadge, { backgroundColor: "rgba(245,158,11,0.15)" }]}>
          <Feather name="cpu" size={16} color={colors.primary} />
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
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
                      : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
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
                  {!mine && item.navigate ? (
                    <TouchableOpacity
                      style={[
                        styles.navBtn,
                        {
                          borderColor: colors.primary,
                          alignSelf: isRTL ? "flex-end" : "flex-start",
                        },
                      ]}
                      onPress={() => navigateAssistantRoute(item.navigate!)}
                      accessibilityRole="button"
                      accessibilityLabel={tr.assistant.openScreen}
                    >
                      <Feather name="external-link" size={12} color={colors.primary} />
                      <Text style={[styles.navBtnText, { color: colors.primary }]}>
                        {tr.assistant.openScreen}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
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
              paddingBottom: Math.max(insets.bottom, 12),
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
            blurOnSubmit={false}
            returnKeyType="send"
            onSubmitEditing={() => {
              if (Platform.OS !== "web") send(input);
            }}
            onKeyPress={(e) => handleAssistantEnterKey(e, input, send, sending)}
            {...getAssistantTextInputKeyProps(input, send, sending)}
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
              <Feather name="send" size={18} color={colors.primaryForeground} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  aiBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { padding: 16, paddingBottom: 24, gap: 10 },
  bubbleRow: { flexDirection: "row", marginBottom: 10 },
  bubble: {
    maxWidth: "88%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bubbleText: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  navBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  suggestions: { marginTop: 8, gap: 10 },
  suggestLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  suggestRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  composer: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
    alignItems: "flex-end",
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
