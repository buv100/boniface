import { Feather } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";

const TERMS_HE = `תנאי שימוש — Boniface

האפליקציה לניהול תפעולי של ברים — לא ייעוץ משפטי/חשבונאי.

אתם אחראים ל-PIN ולהזמנות עובדים. נתונים אופליין במכשיר; ניהול ענן מלא דורש מנוי פעיל.

כשהמנוי פג, פעולות מנהל בענן עשויות להיות מוגבלות; עובדים עשויים להמשיך בפעולות בסיסיות.

השירות «כמות שהוא» ללא אחריות לנזקים עקיפים.

עודכן: אוגוסט 2026`;

const TERMS_EN = `Terms of Use — Boniface

For bar operations — not legal/accounting advice.

You are responsible for your PIN and staff invites. Offline data stays on device; full cloud management needs an active subscription.

When expired, manager cloud actions may be limited; employees may keep basic access.

Service “as is”; no liability for indirect damages.

Updated: August 2026`;

export default function TermsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tr, lang } = useLang();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const url =
    (Constants.expoConfig?.extra as { termsUrl?: string } | undefined)?.termsUrl ??
    "https://raw.githubusercontent.com/buv100/boniface/main/docs/terms.html";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.top, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>{tr.legal.termsTitle}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}>
        <Text style={{ color: colors.mutedForeground, marginBottom: 12 }}>{tr.legal.lastUpdated}</Text>
        <Text style={{ color: colors.foreground, lineHeight: 22, fontFamily: "Inter_400Regular", fontSize: 15 }}>
          {lang === "en" ? TERMS_EN : TERMS_HE}
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
