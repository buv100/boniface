import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";
import {
  employeePortalService,
  type EmployeeTipRow,
} from "@/lib/services/employeePortalService";

export default function EmployeeTipsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tr } = useLang();
  const { token } = useAuth();
  const [rows, setRows] = useState<EmployeeTipRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : 84 + insets.bottom;

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await employeePortalService.getMyTips(token);
      setRows(data.rows);
      setTotal(data.total);
    } catch {
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingTop: topPad + 12, paddingBottom: bottomPad, paddingHorizontal: 16 }}>
        <Text style={[styles.title, { color: colors.foreground }]}>{tr.employee.tipsTitle}</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>{tr.employee.tipsSub}</Text>

        <View style={[styles.totalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{tr.employee.tipsTotal}</Text>
          <Text style={{ color: colors.primary, fontSize: 28, fontFamily: "Inter_700Bold" }}>
            {Math.round(total)} ₪
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : rows.length === 0 ? (
          <Text style={{ color: colors.mutedForeground, marginTop: 16 }}>{tr.employee.tipsEmpty}</Text>
        ) : (
          rows.map((r) => (
            <View key={r.date} style={[styles.row, { borderBottomColor: colors.border }]}>
              <Text style={{ color: colors.foreground, fontFamily: "Inter_500Medium" }}>{r.date}</Text>
              <Text style={{ color: colors.mutedForeground }}>{r.hours.toFixed(1)}h</Text>
              <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>
                {Math.round(r.tips)} ₪
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 4, marginBottom: 16 },
  totalCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 12 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
});
