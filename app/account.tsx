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
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";

export default function AccountScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tr, isRTL } = useLang();
  const { isLoggedIn, isOwner, ownerAccessActive, ownerLogin, logout } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");

  useEffect(() => {
    if (!isLoggedIn || !isOwner) return;
    router.replace((ownerAccessActive ? "/owner/hub" : "/owner/blocked") as any);
  }, [isLoggedIn, isOwner, ownerAccessActive]);

  const field = (value: string, set: (t: string) => void, placeholder: string, extra?: object) => (
    <TextInput
      style={[
        styles.input,
        {
          color: colors.foreground,
          borderColor: colors.border,
          backgroundColor: colors.secondary,
          textAlign: isRTL ? "right" : "left",
        },
      ]}
      placeholder={placeholder}
      placeholderTextColor={colors.mutedForeground}
      value={value}
      onChangeText={set}
      {...extra}
    />
  );

  const submitLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await ownerLogin(phone, pin);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setError(e instanceof Error ? e.message : tr.owner.errorGeneric);
    } finally {
      setLoading(false);
    }
  };

  if (isLoggedIn && !isOwner) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top + 24, padding: 20 }]}>
        <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 20 }}>{tr.owner.accountTitle}</Text>
        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary, marginTop: 20 }]} onPress={() => logout()}>
          <Text style={{ color: colors.primaryForeground, fontFamily: "Inter_700Bold" }}>{tr.owner.logout}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.background }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 28, paddingHorizontal: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>{tr.owner.accountTitle}</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>{tr.owner.accountSub}</Text>
        <Text style={[styles.hint, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>{tr.owner.noPublicSignup}</Text>

        {field(phone, setPhone, tr.owner.phone, { keyboardType: "phone-pad" })}
        {field(pin, setPin, tr.owner.pin, { secureTextEntry: true })}
        {!!error && <Text style={{ color: colors.destructive, marginBottom: 8 }}>{error}</Text>}
        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={submitLogin} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={styles.btnTxt}>{tr.owner.login}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 6 },
  hint: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 8, marginBottom: 24 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, marginBottom: 10 },
  btn: { borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 6 },
  btnTxt: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#111827" },
});
