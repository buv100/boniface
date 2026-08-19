import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";

export function OwnerShell({
  title,
  children,
  onBack,
}: {
  title?: string;
  children: React.ReactNode;
  onBack?: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tr, isRTL } = useLang();
  const { owner, venue, logout } = useAuth();
  const topPad = Platform.OS === "web" ? 24 : insets.top + 8;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const now = new Date();
  void tick;
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const date = `${tr.weekDays[now.getDay()]}, ${now.getDate()} ${tr.monthsShort[now.getMonth()]}`;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: topPad,
          paddingHorizontal: 16,
          paddingBottom: 40 + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.topRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          {onBack ? (
            <TouchableOpacity onPress={onBack} style={styles.iconBtn} hitSlop={10}>
              <Feather name={isRTL ? "chevron-right" : "chevron-left"} size={22} color={colors.foreground} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 36 }} />
          )}
          <TouchableOpacity onPress={() => router.push("/owner/hub" as any)} style={styles.venueChip}>
            <Text style={[styles.venueName, { color: colors.primary }]} numberOfLines={1}>
              {venue?.name ?? tr.owner.noVenue}
            </Text>
            <Feather name="chevron-down" size={14} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => logout()} style={styles.iconBtn} hitSlop={10}>
            <Feather name="log-out" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.hello, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
          {tr.owner.hello(owner?.name ?? "")}
        </Text>
        <Text style={[styles.meta, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>
          {date} · {time}
        </Text>
        {title ? (
          <Text style={[styles.pageTitle, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
            {title}
          </Text>
        ) : null}
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topRow: { alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  venueChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 8,
  },
  venueName: { fontSize: 15, fontFamily: "Inter_600SemiBold", maxWidth: "80%" },
  hello: { fontSize: 26, fontFamily: "Inter_700Bold", marginBottom: 4 },
  meta: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 18 },
  pageTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 14 },
});
