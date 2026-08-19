import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";

export default function AdminLoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tr, isRTL } = useLang();
  const { isPlatformAdmin, adminLogin } = useAuth();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isPlatformAdmin) router.replace("/admin" as any);
  }, [isPlatformAdmin]);

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      await adminLogin(phone, pin);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setError(e instanceof Error ? e.message : tr.owner.errorGeneric);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.background }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 36, paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>{tr.admin.loginTitle}</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>{tr.admin.loginSub}</Text>
        <TextInput
          style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary, textAlign: isRTL ? "right" : "left" }]}
          placeholder={tr.owner.phone}
          placeholderTextColor={colors.mutedForeground}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <TextInput
          style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary, textAlign: isRTL ? "right" : "left" }]}
          placeholder={tr.owner.pin}
          placeholderTextColor={colors.mutedForeground}
          value={pin}
          onChangeText={setPin}
          secureTextEntry
        />
        {!!error && <Text style={{ color: colors.destructive, marginBottom: 8 }}>{error}</Text>}
        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={submit} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={styles.btnTxt}>{tr.owner.login}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 14, marginTop: 8, marginBottom: 28, fontFamily: "Inter_400Regular" },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, marginBottom: 10 },
  btn: { borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 6 },
  btnTxt: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#111827" },
});
