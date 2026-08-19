import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { defaultPaidUntil, paidUntilInput, statusLabel, type AdminCustomerDetail } from "@/lib/adminTypes";

export default function AdminCustomerDetailScreen() {
  const { orgId } = useLocalSearchParams<{ orgId: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tr, isRTL } = useLang();
  const { token } = useAuth();
  const [row, setRow] = useState<AdminCustomerDetail | null>(null);
  const [expiresAt, setExpiresAt] = useState(defaultPaidUntil());
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    if (!token || !orgId) return;
    const data = await apiCall<AdminCustomerDetail>(`/admin/customers/${orgId}`, { token });
    setRow(data);
    setExpiresAt(paidUntilInput(data.subscription.expiresAt) || defaultPaidUntil());
    setNotes(data.subscription.notes ?? "");
  }, [token, orgId]);

  useEffect(() => {
    load().catch(() => setError(tr.owner.errorGeneric));
  }, [load, tr.owner.errorGeneric]);

  const patch = async (body: { status?: string; expiresAt?: string; notes?: string | null }) => {
    if (!token || !orgId) return;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const data = await apiCall<AdminCustomerDetail>(`/admin/customers/${orgId}/subscription`, {
        method: "PATCH",
        token,
        body,
      });
      setRow(data);
      setExpiresAt(paidUntilInput(data.subscription.expiresAt) || expiresAt);
      setNotes(data.subscription.notes ?? "");
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : tr.owner.errorGeneric);
    } finally {
      setBusy(false);
    }
  };

  if (!row) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top + 24 }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 16, paddingBottom: 40 }}
    >
      <TouchableOpacity onPress={() => router.replace("/admin" as any)}>
        <Text style={{ color: colors.primary, marginBottom: 12 }}>{tr.owner.back}</Text>
      </TouchableOpacity>
      <Text style={[styles.title, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>{row.organization.name}</Text>
      <Text style={{ color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }}>
        {tr.admin.owner}: {row.owner.name} · {row.owner.phone} · {row.owner.email}
      </Text>
      <Text style={{ color: colors.mutedForeground, marginTop: 6, textAlign: isRTL ? "right" : "left" }}>
        {tr.admin.venues}: {row.venues.map((v) => v.name).join(", ") || "—"}
      </Text>
      <Text
        style={{
          color: row.subscription.isActive ? colors.primary : colors.destructive,
          marginTop: 12,
          fontFamily: "Inter_600SemiBold",
        }}
      >
        {tr.admin.status}: {statusLabel(tr, row.subscription.status)}
        {row.subscription.expiresAt ? ` · ${row.subscription.expiresAt.slice(0, 10)}` : ""}
      </Text>

      <TextInput
        style={[
          styles.input,
          { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary, textAlign: isRTL ? "right" : "left" },
        ]}
        placeholder={tr.admin.paidUntil}
        placeholderTextColor={colors.mutedForeground}
        value={expiresAt}
        onChangeText={setExpiresAt}
      />
      <TextInput
        style={[
          styles.input,
          { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary, textAlign: isRTL ? "right" : "left" },
        ]}
        placeholder={tr.admin.notes}
        placeholderTextColor={colors.mutedForeground}
        value={notes}
        onChangeText={setNotes}
      />

      {!!error && <Text style={{ color: colors.destructive, marginBottom: 8 }}>{error}</Text>}
      {saved && <Text style={{ color: colors.primary, marginBottom: 8 }}>{tr.admin.saveOk}</Text>}

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: colors.primary }]}
        disabled={busy}
        onPress={() => patch({ status: "active", expiresAt, notes })}
      >
        <Text style={styles.btnTxt}>{tr.admin.extend}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.btn, { borderWidth: 1, borderColor: colors.destructive, marginTop: 10 }]}
        disabled={busy}
        onPress={() => patch({ status: "suspended", notes })}
      >
        <Text style={{ fontFamily: "Inter_700Bold", color: colors.destructive }}>{tr.admin.suspend}</Text>
      </TouchableOpacity>
      {row.subscription.status !== "active" || !row.subscription.isActive ? (
        <TouchableOpacity
          style={[styles.btn, { borderWidth: 1, borderColor: colors.primary, marginTop: 10 }]}
          disabled={busy}
          onPress={() => patch({ status: "active", expiresAt, notes })}
        >
          <Text style={{ fontFamily: "Inter_700Bold", color: colors.primary }}>{tr.admin.reactivate}</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, marginTop: 12 },
  btn: { borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 16 },
  btnTxt: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#111827" },
});
