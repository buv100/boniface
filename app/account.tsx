import { Feather } from "@expo/vector-icons";
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
import { apiCall } from "@/lib/api";

type Mode = "welcome" | "login" | "register";

const CURRENCY_SYMBOLS: Record<string, string> = { ILS: "₪", USD: "$", EUR: "€" };

export default function AccountScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tr } = useLang();
  const { register, login, isLoggedIn, manager, venue, logout, updateVenueLocally, token } = useAuth();

  const [mode, setMode] = useState<Mode>("welcome");
  const [isEditing, setIsEditing] = useState(false);

  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [venueName, setVenueName] = useState("");
  const [managerName, setManagerName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const [editName, setEditName] = useState("");
  const [editCurrency, setEditCurrency] = useState("ILS");
  const [editError, setEditError] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editSaved, setEditSaved] = useState(false);

  useEffect(() => {
    if (venue) {
      setEditName(venue.name);
      setEditCurrency(venue.currency);
    }
  }, [venue]);

  const clearError = () => setError("");

  const handleLogin = async () => {
    if (!phone.trim() || !pin.trim()) { setError(tr.account.fillAll); return; }
    setLoading(true);
    setError("");
    try {
      await login(phone.trim(), pin);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      setError(e.message ?? tr.account.loginError);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!venueName.trim() || !managerName.trim() || !phone.trim() || !pin.trim()) {
      setError(tr.account.fillAll);
      return;
    }
    if (pin.length < 4) { setError(tr.account.pinMin); return; }
    if (pin !== confirmPin) { setError(tr.account.pinMismatch); return; }
    setLoading(true);
    setError("");
    try {
      await register(venueName.trim(), managerName.trim(), phone.trim(), pin);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      setError(e.message ?? tr.account.registerError);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    await logout();
    setLoading(false);
    setMode("welcome");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const handleSaveVenue = async () => {
    if (!editName.trim()) { setEditError(tr.account.fillAll); return; }
    setEditLoading(true);
    setEditError("");
    try {
      const updated = await apiCall<{ id: string; name: string; currency: string; timezone: string; createdAt: string; updatedAt: string }>(
        "/venue",
        { method: "PATCH", body: { name: editName.trim(), currency: editCurrency }, token }
      );
      updateVenueLocally({ name: updated.name, currency: updated.currency });
      setIsEditing(false);
      setEditSaved(true);
      setTimeout(() => setEditSaved(false), 2500);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setEditError(e.message ?? tr.account.saveError);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setEditLoading(false);
    }
  };

  const handleCancelEdit = () => {
    if (venue) { setEditName(venue.name); setEditCurrency(venue.currency); }
    setEditError("");
    setIsEditing(false);
    Haptics.selectionAsync();
  };

  const currencies = (["ILS", "USD", "EUR"] as const).map((code) => ({
    code,
    symbol: CURRENCY_SYMBOLS[code],
    label: tr.account.currencies[code],
  }));

  if (isLoggedIn && manager && venue) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity
            onPress={isEditing ? handleCancelEdit : () => router.back()}
            style={styles.backBtn}
          >
            <Feather name={isEditing ? "x" : "arrow-left"} size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.topTitle, { color: colors.foreground }]}>
            {isEditing ? tr.account.editing : tr.account.title}
          </Text>
          {isEditing ? (
            <TouchableOpacity
              onPress={handleSaveVenue}
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              disabled={editLoading}
            >
              {editLoading
                ? <ActivityIndicator size="small" color={colors.primaryForeground} />
                : <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>{tr.account.save}</Text>
              }
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => { setIsEditing(true); Haptics.selectionAsync(); }}
              style={styles.editBtn}
            >
              <Feather name="edit-2" size={18} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.avatarBig, { backgroundColor: colors.primary + "22" }]}>
              <Text style={[styles.avatarBigText, { color: colors.primary }]}>
                {manager.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.profileName, { color: colors.foreground }]}>{manager.name}</Text>
            <Text style={[styles.profilePhone, { color: colors.mutedForeground }]}>{manager.phone}</Text>
            <View style={[styles.venueBadge, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "33" }]}>
              <Feather name="map-pin" size={12} color={colors.primary} />
              <Text style={[styles.venueBadgeText, { color: colors.primary }]}>{venue.name}</Text>
            </View>
          </View>

          {editSaved && (
            <View style={[styles.savedBanner, { backgroundColor: "#10B98118", borderColor: "#10B98133" }]}>
              <Feather name="check-circle" size={15} color="#10B981" />
              <Text style={[styles.savedText, { color: "#10B981" }]}>{tr.account.savedBanner}</Text>
            </View>
          )}

          {isEditing ? (
            <View style={styles.editSection}>
              <Text style={[styles.sectionHeading, { color: colors.mutedForeground }]}>{tr.account.venueSectionLabel}</Text>

              <View style={[styles.inputGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.inputRow}>
                  <Feather name="map-pin" size={16} color={colors.mutedForeground} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.foreground }]}
                    placeholder={tr.account.venuePlaceholder}
                    placeholderTextColor={colors.mutedForeground}
                    value={editName}
                    onChangeText={(t) => { setEditName(t); setEditError(""); }}
                    autoFocus
                  />
                </View>
              </View>

              <Text style={[styles.sectionHeading, { color: colors.mutedForeground, marginTop: 20 }]}>{tr.account.currencyLabel}</Text>
              <View style={styles.currencyRow}>
                {currencies.map((c) => {
                  const active = editCurrency === c.code;
                  return (
                    <TouchableOpacity
                      key={c.code}
                      style={[
                        styles.currencyChip,
                        {
                          backgroundColor: active ? colors.primary : colors.card,
                          borderColor: active ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => { setEditCurrency(c.code); Haptics.selectionAsync(); }}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.currencySymbol, { color: active ? colors.primaryForeground : colors.mutedForeground }]}>
                        {c.symbol}
                      </Text>
                      <Text style={[styles.currencyCode, { color: active ? colors.primaryForeground : colors.foreground }]}>
                        {c.code}
                      </Text>
                      <Text style={[styles.currencyLabel, { color: active ? colors.primaryForeground + "CC" : colors.mutedForeground }]}>
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {!!editError && (
                <View style={[styles.errorBox, { backgroundColor: "#EF444414", borderColor: "#EF444433", marginTop: 8 }]}>
                  <Feather name="alert-circle" size={14} color="#EF4444" />
                  <Text style={[styles.errorText, { color: "#EF4444" }]}>{editError}</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{tr.account.venueSectionLabel}</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>{venue.name}</Text>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{tr.account.currencyLabel}</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {currencies.find((c) => c.code === venue.currency)
                  ? `${currencies.find((c) => c.code === venue.currency)!.symbol} ${currencies.find((c) => c.code === venue.currency)!.label} (${venue.currency})`
                  : venue.currency}
              </Text>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{tr.account.managerLabel}</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>{manager.name}</Text>
            </View>
          )}

          {!isEditing && (
            <TouchableOpacity
              style={[styles.logoutBtn, { backgroundColor: "#EF444414", borderColor: "#EF444433" }]}
              onPress={handleLogout}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <>
                  <Feather name="log-out" size={18} color="#EF4444" />
                  <Text style={[styles.logoutText, { color: "#EF4444" }]}>{tr.account.logout}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: colors.foreground }]}>
          {mode === "login" ? tr.account.loginMode : mode === "register" ? tr.account.registerMode : tr.account.title}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {mode === "welcome" && (
          <View style={styles.welcomeContent}>
            <View style={[styles.welcomeIcon, { backgroundColor: colors.primary + "18" }]}>
              <Text style={styles.welcomeEmoji}>🍸</Text>
            </View>
            <Text style={[styles.welcomeTitle, { color: colors.foreground }]}>Boniface</Text>
            <Text style={[styles.welcomeSub, { color: colors.mutedForeground }]}>
              {tr.account.welcomeSub}
            </Text>

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={() => { setMode("login"); clearError(); }}
            >
              <Feather name="log-in" size={18} color={colors.primaryForeground} />
              <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>{tr.account.loginBtn}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={() => { setMode("register"); clearError(); }}
            >
              <Feather name="plus-circle" size={18} color={colors.foreground} />
              <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>{tr.account.registerBtn}</Text>
            </TouchableOpacity>

            <Text style={[styles.offlineNote, { color: colors.mutedForeground }]}>
              {tr.account.offlineNote}
            </Text>
          </View>
        )}

        {mode === "login" && (
          <View style={styles.form}>
            <Text style={[styles.formTitle, { color: colors.foreground }]}>{tr.account.loginTitle}</Text>
            <Text style={[styles.formSub, { color: colors.mutedForeground }]}>{tr.account.loginSub}</Text>

            <View style={[styles.inputGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.inputRow}>
                <Feather name="phone" size={16} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder={tr.account.phonePlaceholder}
                  placeholderTextColor={colors.mutedForeground}
                  value={phone}
                  onChangeText={(t) => { setPhone(t); clearError(); }}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                />
              </View>
              <View style={[styles.inputDivider, { backgroundColor: colors.border }]} />
              <View style={styles.inputRow}>
                <Feather name="lock" size={16} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.foreground, flex: 1 }]}
                  placeholder={tr.account.pinPlaceholder}
                  placeholderTextColor={colors.mutedForeground}
                  value={pin}
                  onChangeText={(t) => { setPin(t); clearError(); }}
                  keyboardType="numeric"
                  secureTextEntry={!showPin}
                  maxLength={6}
                />
                <TouchableOpacity onPress={() => setShowPin((v) => !v)} style={styles.eyeBtn}>
                  <Feather name={showPin ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            </View>

            {!!error && (
              <View style={[styles.errorBox, { backgroundColor: "#EF444414", borderColor: "#EF444433" }]}>
                <Feather name="alert-circle" size={14} color="#EF4444" />
                <Text style={[styles.errorText, { color: "#EF4444" }]}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 8 }]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? <ActivityIndicator size="small" color={colors.primaryForeground} /> : (
                <>
                  <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
                  <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>{tr.account.doLogin}</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setMode("welcome"); clearError(); }} style={styles.linkBtn}>
              <Text style={[styles.linkText, { color: colors.mutedForeground }]}>{tr.account.back}</Text>
            </TouchableOpacity>
          </View>
        )}

        {mode === "register" && (
          <View style={styles.form}>
            <Text style={[styles.formTitle, { color: colors.foreground }]}>{tr.account.registerTitle}</Text>
            <Text style={[styles.formSub, { color: colors.mutedForeground }]}>{tr.account.registerSub}</Text>

            <View style={[styles.inputGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.inputRow}>
                <Feather name="map-pin" size={16} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder={tr.account.venuePlaceholder}
                  placeholderTextColor={colors.mutedForeground}
                  value={venueName}
                  onChangeText={(t) => { setVenueName(t); clearError(); }}
                />
              </View>
              <View style={[styles.inputDivider, { backgroundColor: colors.border }]} />
              <View style={styles.inputRow}>
                <Feather name="user" size={16} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder={tr.account.managerPlaceholder}
                  placeholderTextColor={colors.mutedForeground}
                  value={managerName}
                  onChangeText={(t) => { setManagerName(t); clearError(); }}
                />
              </View>
              <View style={[styles.inputDivider, { backgroundColor: colors.border }]} />
              <View style={styles.inputRow}>
                <Feather name="phone" size={16} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder={tr.account.phoneLongPlaceholder}
                  placeholderTextColor={colors.mutedForeground}
                  value={phone}
                  onChangeText={(t) => { setPhone(t); clearError(); }}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={[styles.inputDivider, { backgroundColor: colors.border }]} />
              <View style={styles.inputRow}>
                <Feather name="lock" size={16} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.foreground, flex: 1 }]}
                  placeholder={tr.account.pinLongPlaceholder}
                  placeholderTextColor={colors.mutedForeground}
                  value={pin}
                  onChangeText={(t) => { setPin(t); clearError(); }}
                  keyboardType="numeric"
                  secureTextEntry={!showPin}
                  maxLength={6}
                />
                <TouchableOpacity onPress={() => setShowPin((v) => !v)} style={styles.eyeBtn}>
                  <Feather name={showPin ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
              <View style={[styles.inputDivider, { backgroundColor: colors.border }]} />
              <View style={styles.inputRow}>
                <Feather name="lock" size={16} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder={tr.account.confirmPinPlaceholder}
                  placeholderTextColor={colors.mutedForeground}
                  value={confirmPin}
                  onChangeText={(t) => { setConfirmPin(t); clearError(); }}
                  keyboardType="numeric"
                  secureTextEntry={!showPin}
                  maxLength={6}
                />
              </View>
            </View>

            {!!error && (
              <View style={[styles.errorBox, { backgroundColor: "#EF444414", borderColor: "#EF444433" }]}>
                <Feather name="alert-circle" size={14} color="#EF4444" />
                <Text style={[styles.errorText, { color: "#EF4444" }]}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 8 }]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? <ActivityIndicator size="small" color={colors.primaryForeground} /> : (
                <>
                  <Feather name="check" size={18} color={colors.primaryForeground} />
                  <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>{tr.account.doRegister}</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setMode("welcome"); clearError(); }} style={styles.linkBtn}>
              <Text style={[styles.linkText, { color: colors.mutedForeground }]}>{tr.account.back}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  topTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 10 },
  saveBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  editBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  profileCard: { borderRadius: 20, borderWidth: 1, padding: 24, alignItems: "center", gap: 8, marginBottom: 16 },
  avatarBig: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  avatarBigText: { fontSize: 28, fontFamily: "Inter_700Bold" },
  profileName: { fontSize: 20, fontFamily: "Inter_700Bold" },
  profilePhone: { fontSize: 14, fontFamily: "Inter_400Regular" },
  venueBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  venueBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  savedBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  savedText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  editSection: { gap: 4 },
  sectionHeading: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.6, marginBottom: 6, marginTop: 4 },
  inputGroup: { borderRadius: 14, borderWidth: 1, overflow: "hidden", marginBottom: 4 },
  inputRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 4, minHeight: 52 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  inputDivider: { height: StyleSheet.hairlineWidth, marginLeft: 14 },
  eyeBtn: { padding: 8 },
  currencyRow: { flexDirection: "row", gap: 8 },
  currencyChip: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 10, alignItems: "center", gap: 2 },
  currencySymbol: { fontSize: 18, fontFamily: "Inter_700Bold" },
  currencyCode: { fontSize: 12, fontFamily: "Inter_700Bold" },
  currencyLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  infoCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 4, marginBottom: 16 },
  infoLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, marginBottom: 2, marginTop: 4 },
  infoValue: { fontSize: 15, fontFamily: "Inter_500Medium" },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 8 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 4 },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 16, borderRadius: 16, borderWidth: 1, marginTop: 8 },
  logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  welcomeContent: { alignItems: "center", paddingTop: 32, gap: 16 },
  welcomeIcon: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  welcomeEmoji: { fontSize: 36 },
  welcomeTitle: { fontSize: 32, fontFamily: "Inter_700Bold" },
  welcomeSub: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 24 },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", paddingVertical: 16, borderRadius: 16 },
  primaryBtnText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  secondaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", paddingVertical: 16, borderRadius: 16, borderWidth: 1 },
  secondaryBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  offlineNote: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, opacity: 0.7 },
  form: { paddingTop: 8, gap: 12 },
  formTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  formSub: { fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 4 },
  linkBtn: { alignItems: "center", paddingVertical: 12 },
  linkText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
