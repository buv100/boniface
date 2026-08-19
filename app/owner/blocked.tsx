import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";

export default function OwnerBlockedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tr, isRTL } = useLang();
  const { logout, organization } = useAuth();

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top + 48, paddingHorizontal: 24 }]}>
      <Text style={[styles.title, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
        {tr.owner.blockedTitle}
      </Text>
      {organization?.name ? (
        <Text style={[styles.org, { color: colors.primary, textAlign: isRTL ? "right" : "left" }]}>{organization.name}</Text>
      ) : null}
      <Text style={[styles.body, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>
        {tr.owner.blockedBody}
      </Text>
      <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={() => logout()}>
        <Text style={styles.btnTxt}>{tr.owner.logout}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold" },
  org: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginTop: 8 },
  body: { fontSize: 16, fontFamily: "Inter_400Regular", marginTop: 16, lineHeight: 24 },
  btn: { borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 32 },
  btnTxt: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#111827" },
});
