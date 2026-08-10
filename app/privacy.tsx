import { Feather } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";

const PRIVACY_HE = `Boniface מכבד את פרטיותכם (PDPA-friendly).

מה נאסף: שם, טלפון, PIN מוצפן, ושאלת אבטחה אופציונלית; נתוני משמרות/צוות/מלאי/טיפים בעיקר במכשיר.

למה: הפעלת האפליקציה, סנכרון בעת התחברות, ושחזור גישה. איננו מוכרים נתונים לפרסום.

אבטחה: PIN כ-hash. מחיקת נתונים מקומיים — בהסרת האפליקציה.

עודכן: אוגוסט 2026`;

const PRIVACY_EN = `Boniface respects your privacy (PDPA-friendly).

Collected: name, phone, hashed PIN, optional security question; operational shift/team/stock/tips data primarily on-device.

Purpose: run the app, sync when signed in, recover access. We do not sell data for ads.

Security: PIN hashed. Local data removed by uninstalling.

Updated: August 2026`;

export default function PrivacyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tr, lang } = useLang();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const url =
    (Constants.expoConfig?.extra as { privacyUrl?: string } | undefined)?.privacyUrl ??
    "https://raw.githubusercontent.com/buv100/boniface/main/docs/privacy.html";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.top, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>{tr.legal.privacyTitle}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}>
        <Text style={{ color: colors.mutedForeground, marginBottom: 12 }}>{tr.legal.lastUpdated}</Text>
        <Text style={{ color: colors.foreground, lineHeight: 22, fontFamily: "Inter_400Regular", fontSize: 15 }}>
          {lang === "en" ? PRIVACY_EN : PRIVACY_HE}
        </Text>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.primary }]}
          onPress={() => WebBrowser.openBrowserAsync(url)}
        >
          <Text style={styles.btnText}>{tr.legal.openBrowser}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  top: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingBottom: 8 },
  back: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  btn: { marginTop: 24, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  btnText: { fontFamily: "Inter_700Bold", color: "#111827" },
});
