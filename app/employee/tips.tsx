import React, { useMemo } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { calcDayResults, useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";

export default function EmployeeTipsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tr } = useLang();
  const { dayEntries } = useApp();
  const { employee } = useAuth();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : 84 + insets.bottom;

  const rows = useMemo(() => {
    if (!employee) return [];
    const out: { date: string; tips: number; hours: number }[] = [];
    for (const entry of dayEntries) {
      const results = calcDayResults(entry);
      const mine = results.find((r) => r.shift.employeeId === employee.id);
      if (mine) {
        out.push({ date: entry.date, tips: mine.totalTips, hours: mine.hoursWorked });
      }
    }
    return out.sort((a, b) => b.date.localeCompare(a.date));
  }, [dayEntries, employee]);

  const total = rows.reduce((s, r) => s + r.tips, 0);

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

        {rows.length === 0 ? (
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
  totalCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
