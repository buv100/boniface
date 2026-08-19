import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";
import { apiCall } from "@/lib/api";
import { statusLabel, type AdminCustomerRow } from "@/lib/adminTypes";

export default function AdminCustomersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tr, isRTL } = useLang();
  const { token, logout, platformAdmin } = useAuth();
  const [rows, setRows] = useState<AdminCustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    const data = await apiCall<{ customers: AdminCustomerRow[] }>("/admin/customers", { token });
    setRows(data.customers);
  }, [token]);

  useEffect(() => {
    load()
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [load]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load().catch(() => {});
              setRefreshing(false);
            }}
          />
        }
      >
        <View style={[styles.top, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>{tr.admin.customers}</Text>
            <Text style={{ color: colors.mutedForeground, marginTop: 4 }}>{platformAdmin?.name}</Text>
          </View>
          <TouchableOpacity onPress={() => logout()} hitSlop={10}>
            <Feather name="log-out" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.create, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/admin/new" as any)}
        >
          <Text style={styles.createTxt}>{tr.admin.createCustomer}</Text>
        </TouchableOpacity>

        {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} /> : null}
        {!loading && rows.length === 0 ? (
          <Text style={{ color: colors.mutedForeground, marginTop: 20, textAlign: isRTL ? "right" : "left" }}>{tr.admin.empty}</Text>
        ) : null}
        {rows.map((row) => (
          <TouchableOpacity
            key={row.organization.id}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(`/admin/${row.organization.id}` as any)}
          >
            <Text style={[styles.org, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>{row.organization.name}</Text>
            <Text style={{ color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }}>
              {row.owner.name} · {row.owner.phone}
            </Text>
            <Text style={{ color: row.subscription.isActive ? colors.primary : colors.destructive, marginTop: 8 }}>
              {statusLabel(tr, row.subscription.status)}
              {row.subscription.expiresAt ? ` · ${row.subscription.expiresAt.slice(0, 10)}` : ""}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: { justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  create: { borderRadius: 14, paddingVertical: 14, alignItems: "center", marginBottom: 16 },
  createTxt: { fontFamily: "Inter_700Bold", color: "#111827" },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 10 },
  org: { fontSize: 17, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
});
