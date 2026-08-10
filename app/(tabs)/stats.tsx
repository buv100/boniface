import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { calcDayResults, useApp } from "@/context/AppContext";
import { pickEmployeeOfMonth } from "@/context/BonifaceContext";
import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";
import { exportToCsv } from "@/utils/exportCsv";

type Period = "7d" | "30d" | "month" | "all";

interface EmployeeStat {
  employeeId: string;
  employeeName: string;
  shiftsCount: number;
  totalHours: number;
  totalCash: number;
  totalCard: number;
  totalTips: number;
  avgPerHour: number;
  sharePercent: number;
}

function currentMonthStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function addMonths(monthStr: string, delta: number): string {
  const [y, m] = monthStr.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function StatsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { dayEntries } = useApp();
  const { tr, isRTL } = useLang();
  const [period, setPeriod] = useState<Period>("month");
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr());
  const [exporting, setExporting] = useState(false);

  const PERIODS: { key: Period; label: string }[] = [
    { key: "7d", label: tr.stats.d7 },
    { key: "30d", label: tr.stats.d30 },
    { key: "month", label: tr.stats.month },
    { key: "all", label: tr.stats.all },
  ];

  const cutoffDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const filtered = dayEntries.filter((e) => {
    if (period === "7d") return e.date >= cutoffDate(7);
    if (period === "30d") return e.date >= cutoffDate(30);
    if (period === "month") return e.date.startsWith(selectedMonth);
    return true;
  });

  const statsMap: Record<string, EmployeeStat> = {};
  for (const entry of filtered) {
    const results = calcDayResults(entry);
    for (const r of results) {
      const sid = r.shift.employeeId;
      if (!statsMap[sid]) {
        statsMap[sid] = { employeeId: sid, employeeName: r.shift.employeeName, shiftsCount: 0, totalHours: 0, totalCash: 0, totalCard: 0, totalTips: 0, avgPerHour: 0, sharePercent: 0 };
      }
      statsMap[sid].shiftsCount += 1;
      statsMap[sid].totalHours += r.hoursWorked;
      statsMap[sid].totalCash += r.cashTips;
      statsMap[sid].totalCard += r.cardTips;
      statsMap[sid].totalTips += r.totalTips;
    }
  }

  const grandTotal = Object.values(statsMap).reduce((s, e) => s + e.totalTips, 0);
  for (const id in statsMap) {
    const s = statsMap[id];
    s.avgPerHour = s.totalHours > 0 ? s.totalTips / s.totalHours : 0;
    s.sharePercent = grandTotal > 0 ? (s.totalTips / grandTotal) * 100 : 0;
  }

  const statsList = Object.values(statsMap).sort((a, b) => b.totalTips - a.totalTips);
  const grandCash = statsList.reduce((s, e) => s + e.totalCash, 0);
  const grandCard = statsList.reduce((s, e) => s + e.totalCard, 0);

  const employeeOfMonth = useMemo(() => {
    const cutoff = cutoffDate(7);
    const map: Record<
      string,
      { employeeId: string; employeeName: string; tipsLast7: number; shiftsLast7: number }
    > = {};
    for (const entry of dayEntries) {
      if (entry.date < cutoff) continue;
      const results = calcDayResults(entry);
      for (const r of results) {
        const id = r.shift.employeeId;
        if (!map[id]) {
          map[id] = {
            employeeId: id,
            employeeName: r.shift.employeeName,
            tipsLast7: 0,
            shiftsLast7: 0,
          };
        }
        map[id].tipsLast7 += r.totalTips;
        map[id].shiftsLast7 += 1;
      }
    }
    return pickEmployeeOfMonth(Object.values(map));
  }, [dayEntries]);

  const formatMonthLabel = (monthStr: string) => {
    const [year, month] = monthStr.split("-").map(Number);
    return `${tr.months[month - 1]} ${year}`;
  };

  const handleExport = async () => {
    if (filtered.length === 0) {
      Alert.alert(tr.stats.noDataAlert, tr.stats.noData);
      return;
    }
    try {
      setExporting(true);
      const name = period === "month" ? `tips_${selectedMonth}` : period === "7d" ? "tips_7d" : period === "30d" ? "tips_30d" : "tips_all";
      await exportToCsv(filtered, name);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert(tr.stats.error, tr.stats.exportError);
    } finally {
      setExporting(false);
    }
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 + 84 : 84 + insets.bottom;

  const renderStat = ({ item, index }: { item: EmployeeStat; index: number }) => {
    const isTop = index === 0 && item.totalTips > 0;
    return (
      <View style={[styles.statCard, { backgroundColor: isTop ? colors.primary + "18" : colors.card, borderColor: isTop ? colors.primary + "55" : colors.border }]}>
        <View style={[styles.statHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={[styles.rankRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={[styles.rank, { backgroundColor: isTop ? colors.primary : colors.secondary }]}>
              <Text style={[styles.rankText, { color: isTop ? colors.primaryForeground : colors.mutedForeground }]}>{index + 1}</Text>
            </View>
            <View>
              <Text style={[styles.empName, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>{item.employeeName}</Text>
              <Text style={[styles.shiftCount, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>
                {item.shiftsCount} {tr.stats.shifts} · {item.totalHours.toFixed(1)} {tr.stats.hours}
              </Text>
            </View>
          </View>
          <View style={[styles.perHourBadge, { alignItems: isRTL ? "flex-start" : "flex-end" }]}>
            <Text style={[styles.perHourLabel, { color: colors.mutedForeground }]}>{tr.stats.perHour}</Text>
            <Text style={[styles.perHourValue, { color: isTop ? colors.primary : colors.accent }]}>{item.avgPerHour.toFixed(0)} ₪</Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={[styles.statRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{tr.stats.cash}</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{item.totalCash.toFixed(0)} ₪</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{tr.stats.card}</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{item.totalCard.toFixed(0)} ₪</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{tr.stats.total}</Text>
            <Text style={[styles.statValue, { color: colors.primary }]}>{item.totalTips.toFixed(0)} ₪</Text>
          </View>
        </View>

        {grandTotal > 0 && (
          <View style={styles.shareRow}>
            <View style={[styles.shareBar, { backgroundColor: colors.border }]}>
              <View style={[styles.shareFill, { width: `${item.sharePercent}%` as unknown as number, backgroundColor: isTop ? colors.primary : colors.accent }]} />
            </View>
            <Text style={[styles.shareText, { color: colors.mutedForeground }]}>{item.sharePercent.toFixed(0)}%</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={statsList}
        keyExtractor={(item) => item.employeeId}
        contentContainerStyle={[styles.listContent, { paddingTop: topPadding + 8, paddingBottom: bottomPadding }]}
        ListHeaderComponent={
          <>
            {/* Back button + title row */}
            <View style={styles.topRow}>
              <TouchableOpacity
                style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => { Haptics.selectionAsync(); router.back(); }}
              >
                <Feather name="arrow-left" size={18} color={colors.foreground} />
              </TouchableOpacity>
              <View style={styles.titleBlock}>
                <Text style={[styles.pageTitle, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>{tr.stats.title}</Text>
                <Text style={[styles.pageSub, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>{tr.stats.sub}</Text>
              </View>
              <TouchableOpacity style={[styles.exportBtn, { backgroundColor: colors.primary + "22", borderColor: colors.primary + "55" }]} onPress={handleExport} disabled={exporting}>
                <Feather name="share" size={15} color={colors.primary} />
                <Text style={[styles.exportBtnText, { color: colors.primary }]}>{exporting ? "..." : tr.stats.csv}</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.periodSelector, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? "row-reverse" : "row" }]}>
              {PERIODS.map((p) => (
                <TouchableOpacity key={p.key} style={[styles.periodBtn, period === p.key && { backgroundColor: colors.primary }]} onPress={() => { setPeriod(p.key); Haptics.selectionAsync(); }}>
                  <Text style={[styles.periodText, { color: period === p.key ? colors.primaryForeground : colors.mutedForeground }]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {period === "month" && (
              <View style={[styles.monthNav, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <TouchableOpacity style={styles.monthBtn} onPress={() => { setSelectedMonth(addMonths(selectedMonth, isRTL ? 1 : -1)); Haptics.selectionAsync(); }}>
                  <Feather name="chevron-left" size={20} color={colors.foreground} />
                </TouchableOpacity>
                <Text style={[styles.monthText, { color: colors.foreground }]}>{formatMonthLabel(selectedMonth)}</Text>
                <TouchableOpacity style={styles.monthBtn} onPress={() => { const next = addMonths(selectedMonth, isRTL ? -1 : 1); if (next <= currentMonthStr()) { setSelectedMonth(next); Haptics.selectionAsync(); } }}>
                  <Feather name="chevron-right" size={20} color={addMonths(selectedMonth, 1) <= currentMonthStr() ? colors.foreground : colors.border} />
                </TouchableOpacity>
              </View>
            )}

            <View style={[styles.eomCard, { backgroundColor: colors.primary + "14", borderColor: colors.primary + "44" }]}>
              <View style={[styles.eomIcon, { backgroundColor: colors.primary + "22" }]}>
                <Feather name="award" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.eomTitle, { color: colors.primary }]}>{tr.eom.title}</Text>
                <Text style={[styles.eomSub, { color: colors.mutedForeground }]}>{tr.eom.sub}</Text>
                {employeeOfMonth ? (
                  <>
                    <Text style={[styles.eomName, { color: colors.foreground }]}>
                      {employeeOfMonth.employeeName}
                    </Text>
                    <Text style={[styles.eomMeta, { color: colors.mutedForeground }]}>
                      {tr.eom.tips(employeeOfMonth.tipsLast7.toFixed(0))} ·{" "}
                      {tr.eom.shifts(employeeOfMonth.shiftsLast7)}
                    </Text>
                  </>
                ) : (
                  <Text style={[styles.eomMeta, { color: colors.mutedForeground }]}>{tr.eom.empty}</Text>
                )}
              </View>
            </View>

            {statsList.length > 0 && (
              <>
                <View style={[styles.summaryBox, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{tr.stats.cash}</Text>
                    <Text style={[styles.summaryValue, { color: colors.foreground }]}>{grandCash.toFixed(0)} ₪</Text>
                  </View>
                  <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{tr.stats.card}</Text>
                    <Text style={[styles.summaryValue, { color: colors.foreground }]}>{grandCard.toFixed(0)} ₪</Text>
                  </View>
                  <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryLabel, { color: colors.primary }]}>{tr.stats.total}</Text>
                    <Text style={[styles.summaryValue, { color: colors.primary }]}>{grandTotal.toFixed(0)} ₪</Text>
                  </View>
                </View>
                <Text style={[styles.sectionTitle, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>{tr.stats.byEmployees}</Text>
              </>
            )}
          </>
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={renderStat}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
              <Feather name="bar-chart-2" size={32} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground, textAlign: "center" }]}>
              {period === "month" ? tr.stats.emptyTitle(formatMonthLabel(selectedMonth)) : tr.stats.emptyTitleGeneric}
            </Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>{tr.stats.emptySub}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: 16 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  titleBlock: { flex: 1 },
  pageTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  pageSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  exportBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, flexShrink: 0 },
  exportBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  periodSelector: { borderRadius: 12, borderWidth: 1, padding: 4, marginBottom: 10, gap: 4 },
  periodBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  periodText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  monthNav: { alignItems: "center", justifyContent: "space-between", borderRadius: 12, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 10, marginBottom: 10 },
  monthBtn: { padding: 6 },
  monthText: { fontSize: 16, fontFamily: "Inter_600SemiBold", flex: 1, textAlign: "center" },
  eomCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  eomIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  eomTitle: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.4 },
  eomSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  eomName: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 4 },
  eomMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  summaryBox: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 16 },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 4 },
  summaryValue: { fontSize: 15, fontFamily: "Inter_700Bold" },
  summaryDivider: { width: 1, marginVertical: 4 },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 },
  statCard: { borderRadius: 12, borderWidth: 1, padding: 14 },
  statHeader: { alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  rankRow: { alignItems: "center", gap: 10 },
  rank: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  rankText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  empName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  shiftCount: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  perHourBadge: {},
  perHourLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 2 },
  perHourValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  divider: { height: 1, marginBottom: 12 },
  statRow: { justifyContent: "space-between", marginBottom: 10 },
  statItem: { alignItems: "center" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 3 },
  statValue: { fontSize: 14, fontFamily: "Inter_700Bold" },
  shareRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  shareBar: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  shareFill: { height: "100%", borderRadius: 2 },
  shareText: { fontSize: 11, fontFamily: "Inter_500Medium", minWidth: 32, textAlign: "right" },
  empty: { alignItems: "center", paddingTop: 40, gap: 12 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 40 },
});
