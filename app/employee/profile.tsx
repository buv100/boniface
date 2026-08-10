import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";

export default function EmployeeProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tr } = useLang();
  const { employee, venue, logout, subscriptionExpired } = useAuth();
  const [loading, setLoading] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleLogout = async () => {
    setLoading(true);
    await logout();
    setLoading(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    router.replace("/account" as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad + 12, paddingHorizontal: 16 }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>{tr.employee.profileTitle}</Text>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary + "22" }]}>
          <Text style={{ color: colors.primary, fontSize: 24, fontFamily: "Inter_700Bold" }}>
            {(employee?.name ?? "?").charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.name, { color: colors.foreground }]}>{employee?.name}</Text>
        <Text style={{ color: colors.mutedForeground, marginTop: 4 }}>{tr.account.roleEmployee}</Text>
        <Text style={{ color: colors.mutedForeground, marginTop: 12 }}>
          {tr.employee.venue}: {venue?.name}
        </Text>
        {subscriptionExpired && (
          <Text style={{ color: "#F59E0B", marginTop: 10, fontSize: 12 }}>{tr.subscription.employeeGrace}</Text>
        )}
      </View>

      <TouchableOpacity style={styles.link} onPress={() => router.push("/privacy" as any)}>
        <Text style={{ color: colors.primary }}>{tr.account.privacyLink}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.link} onPress={() => router.push("/terms" as any)}>
        <Text style={{ color: colors.primary }}>{tr.account.termsLink}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.logout, { borderColor: "#EF444433", backgroundColor: "#EF444414" }]}
        onPress={handleLogout}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#EF4444" />
        ) : (
          <>
            <Feather name="log-out" size={18} color="#EF4444" />
            <Text style={{ color: "#EF4444", fontFamily: "Inter_600SemiBold" }}>{tr.employee.logout}</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", marginBottom: 16 },
  card: { borderRadius: 18, borderWidth: 1, padding: 20, alignItems: "center" },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 20, fontFamily: "Inter_700Bold", marginTop: 12 },
  link: { paddingVertical: 12, alignItems: "center" },
  logout: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
});
