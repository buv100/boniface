import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
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

import { ShiftCard } from "@/components/ShiftCard";
import {
  DayEntry,
  calcDayResults,
  formatDateRu,
  todayString,
  useApp,
} from "@/context/AppContext";
import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { dayEntries, deleteDayEntry } = useApp();
  const { tr, isRTL } = useLang();
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const today = todayString();
  const past = dayEntries
    .filter((e) => e.date !== today && e.shifts.length > 0)
    .sort((a, b) => b.date.localeCompare(a.date));

  const toggle = (id: string) => {
    Haptics.selectionAsync();
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDelete = (entry: DayEntry) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      tr.history.deleteTitle,
      tr.history.deleteMsg(formatDateRu(entry.date)),
      [
        { text: tr.history.cancel, style: "cancel" },
        {
          text: tr.history.delete,
          style: "destructive",
          onPress: () => {
            deleteDayEntry(entry.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 + 84 : 84 + insets.bottom;

  const renderEntry = ({ item }: { item: DayEntry }) => {
    const expanded = !!expandedIds[item.id];
    const totalTips = item.totalCash + item.totalCard;
    const results = expanded ? calcDayResults(item) : [];

    return (
      <View style={styles.block}>
        <TouchableOpacity
          style={[styles.dayHeader, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? "row-reverse" : "row" }]}
          onPress={() => toggle(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.dayLeft}>
            <Text style={[styles.dayDate, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
              {formatDateRu(item.date)}
            </Text>
            <Text style={[styles.daySub, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>
              {item.shifts.length} {tr.history.empl}
            </Text>
          </View>

          <View style={[styles.dayRight, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={[styles.miniTips, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <View style={styles.miniItem}>
                <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>{tr.history.cash}</Text>
                <Text style={[styles.miniVal, { color: colors.foreground }]}>{item.totalCash.toLocaleString()}</Text>
              </View>
              <View style={styles.miniItem}>
                <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>{tr.history.card}</Text>
                <Text style={[styles.miniVal, { color: colors.foreground }]}>{item.totalCard.toLocaleString()}</Text>
              </View>
              <View style={styles.miniItem}>
                <Text style={[styles.miniLabel, { color: colors.primary }]}>{tr.history.total}</Text>
                <Text style={[styles.miniVal, { color: colors.primary }]}>{totalTips.toLocaleString()} ₪</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="trash-2" size={15} color={colors.destructive} />
            </TouchableOpacity>
            <Feather name={expanded ? "chevron-up" : "chevron-down"} size={18} color={colors.mutedForeground} />
          </View>
        </TouchableOpacity>

        {expanded && (
          <View style={styles.dayRecords}>
            {results.map((r) => (
              <ShiftCard key={r.shift.id} result={r} />
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={past}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingTop: topPadding + 8, paddingBottom: bottomPadding }]}
        ListHeaderComponent={
          <View style={styles.pageHeader}>
            {/* Back button */}
            <TouchableOpacity
              style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => { Haptics.selectionAsync(); router.back(); }}
            >
              <Feather name="arrow-left" size={18} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.pageTitle, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>{tr.history.title}</Text>
            <Text style={[styles.pageSub, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>
              {past.length > 0 ? `${past.length} ${tr.history.records}` : tr.history.noRecords}
            </Text>
          </View>
        }
        renderItem={renderEntry}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
              <Feather name="calendar" size={32} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{tr.history.emptyTitle}</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>{tr.history.emptySub}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: 16 },
  pageHeader: { marginBottom: 20 },
  backBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 12, borderWidth: 1, marginBottom: 14 },
  pageTitle: { fontSize: 26, fontFamily: "Inter_700Bold" },
  pageSub: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 4 },
  block: {},
  dayHeader: { alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 12, borderWidth: 1 },
  dayLeft: { gap: 2 },
  dayDate: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  daySub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  dayRight: { alignItems: "center", gap: 10 },
  miniTips: { gap: 12 },
  miniItem: { alignItems: "flex-end" },
  miniLabel: { fontSize: 10, fontFamily: "Inter_400Regular", marginBottom: 1 },
  miniVal: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  deleteBtn: { padding: 4 },
  dayRecords: { marginTop: 8 },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 40 },
});
