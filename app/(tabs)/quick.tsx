import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EndShiftSummaryModal } from "@/components/EndShiftSummaryModal";
import { StartShiftModal } from "@/components/StartShiftModal";
import { TipsEntryModal } from "@/components/TipsEntryModal";
import { HintBanner } from "@/components/ui/EasyUI";
import { todayString, useApp, generateId, DayEntry } from "@/context/AppContext";
import { useBoniface } from "@/context/BonifaceContext";
import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";
import { buildShiftEntriesFromAttendance } from "@/lib/shiftAttendance";
import { nowTimeSnapped } from "@/lib/shiftTime";
const ACTION_META = [
  { id: "writeoff" as const, icon: "clipboard" as const, color: "#FB923C", bg: "rgba(124,45,18,0.38)" },
  { id: "stoplist" as const, icon: "slash" as const, color: "#F87171", bg: "rgba(127,29,29,0.38)" },
  { id: "checklist" as const, icon: "check-square" as const, color: "#4ADE80", bg: "rgba(20,83,45,0.38)" },
  { id: "briefing" as const, icon: "calendar" as const, color: "#60A5FA", bg: "rgba(30,58,95,0.38)" },
  { id: "tips" as const, icon: "trending-up" as const, color: "#F59E0B", bg: "rgba(120,53,15,0.38)" },
  { id: "schedule" as const, icon: "grid" as const, color: "#A78BFA", bg: "rgba(76,29,149,0.38)" },
];

export default function QuickActionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tr, isRTL } = useLang();
  const { shiftState, endShift, lowStockCount, writeOffs, stopList } = useBoniface();
  const { dayEntries, saveDayEntry, employees } = useApp();
  const [tipsModal, setTipsModal] = useState(false);
  const [tipsRequired, setTipsRequired] = useState(false);
  const [startShiftModal, setStartShiftModal] = useState(false);
  const [endShiftModal, setEndShiftModal] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : 84 + insets.bottom;

  const today = todayString();
  const todayEntry: DayEntry =
    dayEntries.find((e) => e.date === today) ??
    { id: generateId(), date: today, totalCash: 0, totalCard: 0, shifts: [] };

  const handleConfirmEndShift = async () => {
    const attendance = shiftState.attendance ?? [];
    if (attendance.length) {
      const built = buildShiftEntriesFromAttendance(attendance, employees, nowTimeSnapped());
      if (built.length) {
        await saveDayEntry({ ...todayEntry, shifts: built });
      }
    }
    await endShift();
    setTipsRequired(true);
    setTipsModal(true);
  };

  const handleAction = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    switch (id) {
      case "writeoff":  router.navigate("/bar"); break;
      case "stoplist":  router.navigate("/bar"); break;
      case "checklist": router.navigate("/more"); break;
      case "briefing":  router.navigate("/briefing"); break;
      case "tips":
        if (shiftState.active) {
          Alert.alert(tr.home.enterTips, tr.home.tipsAfterEnd);
          break;
        }
        setTipsRequired(false);
        setTipsModal(true);
        break;
      case "schedule":  router.navigate("/schedule"); break;
    }
  };

  const recentItems: { icon: string; text: string; color: string }[] = [
    ...stopList.slice(0, 2).map((s) => ({
      icon: "slash",
      text: `${tr.quick.actions.stoplist.label}: ${s.name}`,
      color: "#F87171",
    })),
    ...writeOffs.slice(0, 2).map((w) => ({
      icon: "clipboard",
      text: `${tr.quick.actions.writeoff.label}: ${w.quantity} ${w.unit ?? ""} ${w.itemName}`.trim(),
      color: "#FB923C",
    })),
  ].slice(0, 3);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.screenTitle, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
          {tr.tabs.quick}
        </Text>
        <Text style={[styles.screenSub, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>
          {tr.quick.sub}
        </Text>

        {/* Shift toggle banner — primary decision */}
        <TouchableOpacity
          style={[
            styles.shiftBanner,
            shiftState.active
              ? { backgroundColor: "rgba(239,68,68,0.1)", borderColor: "rgba(239,68,68,0.22)" }
              : { backgroundColor: "rgba(245,158,11,0.1)", borderColor: "rgba(245,158,11,0.22)" },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            shiftState.active ? setEndShiftModal(true) : setStartShiftModal(true);
          }}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={shiftState.active ? tr.quick.endShift : tr.quick.startShift}
        >
          <View style={[styles.shiftBannerIcon, { backgroundColor: shiftState.active ? "rgba(239,68,68,0.18)" : "rgba(245,158,11,0.18)" }]}>
            <Feather name={shiftState.active ? "stop-circle" : "play-circle"} size={22} color={shiftState.active ? "#F87171" : "#F59E0B"} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.shiftBannerTitle, { color: shiftState.active ? "#F87171" : "#F59E0B" }]}>
              {shiftState.active ? tr.quick.endShift : tr.quick.startShift}
            </Text>
            <Text style={styles.shiftBannerSub}>
              {shiftState.active ? tr.quick.startedAt(shiftState.startTime ?? "") : tr.quick.recordStart}
            </Text>
          </View>
          <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={18} color={shiftState.active ? "#F87171" : "#F59E0B"} />
        </TouchableOpacity>

        <HintBanner
          text={shiftState.active ? tr.home.hintActive : tr.home.hintBefore}
          icon="zap"
        />

        {/* Panel card */}
        <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.panelHeader}>
            <Text style={[styles.panelTitle, { color: colors.foreground }]}>{tr.quick.title}</Text>
            <Text style={[styles.panelSub, { color: colors.mutedForeground }]}>{tr.quick.sub}</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.actionGrid}>
            {ACTION_META.map((action) => {
              const copy = tr.quick.actions[action.id];
              return (
                <TouchableOpacity
                  key={action.id}
                  style={[styles.actionTile, { backgroundColor: action.bg, borderColor: action.color + "25" }]}
                  onPress={() => handleAction(action.id)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={`${copy.label}. ${copy.hint}`}
                >
                  <View style={[styles.actionIconBox, { backgroundColor: action.color + "18" }]}>
                    <Feather name={action.icon} size={20} color={action.color} />
                  </View>
                  <Text style={[styles.actionLabel, { color: action.color }]}>{copy.label}</Text>
                  <Text style={styles.actionHint} numberOfLines={2}>{copy.hint}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {recentItems.length > 0 && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.recentSection}>
                <Text style={[styles.recentTitle, { color: colors.mutedForeground }]}>{tr.quick.recent}</Text>
                {recentItems.map((r, i) => (
                  <View key={i} style={styles.recentRow}>
                    <View style={[styles.recentIcon, { backgroundColor: r.color + "18" }]}>
                      <Feather name={r.icon as any} size={13} color={r.color} />
                    </View>
                    <Text style={[styles.recentText, { color: colors.foreground }]} numberOfLines={1}>{r.text}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        <View style={styles.navRow}>
          {[
            { icon: "clock", label: tr.quick.historyLabel, route: "/history" },
            { icon: "users", label: tr.quick.teamLabel, route: "/team" },
            { icon: "layers", label: tr.quick.stockLabel, route: "/bar", badge: lowStockCount > 0 ? lowStockCount : undefined },
          ].map((item) => (
            <TouchableOpacity
              key={item.route}
              style={[styles.navCard, { backgroundColor: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.07)" }]}
              onPress={() => { Haptics.selectionAsync(); router.navigate(item.route as any); }}
              activeOpacity={0.75}
            >
              <Feather name={item.icon as any} size={18} color="rgba(255,255,255,0.45)" />
              <Text style={styles.navLabel}>{item.label}</Text>
              {item.badge !== undefined && (
                <View style={styles.navBadge}>
                  <Text style={styles.navBadgeText}>{item.badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <TipsEntryModal
        visible={tipsModal}
        onClose={() => {
          setTipsModal(false);
          setTipsRequired(false);
        }}
        date={today}
        required={tipsRequired}
        onSaved={() => setTipsRequired(false)}
      />
      <StartShiftModal
        visible={startShiftModal}
        onClose={() => setStartShiftModal(false)}
        onStarted={() => setStartShiftModal(false)}
      />
      <EndShiftSummaryModal
        visible={endShiftModal}
        onClose={() => setEndShiftModal(false)}
        onConfirm={() => { void handleConfirmEndShift(); }}
        shiftState={shiftState}
        staffCount={
          (shiftState.attendance ?? []).filter((a) => a.joinedAt).length ||
          shiftState.employeeIds.length
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16 },
  screenTitle: { fontSize: 26, fontFamily: "Inter_700Bold", marginBottom: 4 },
  screenSub: { fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 16 },
  shiftBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    minHeight: 72,
  },
  shiftBannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  shiftBannerTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  shiftBannerSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.45)", marginTop: 2 },
  panel: {
    marginTop: 14,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  panelHeader: { marginBottom: 4 },
  panelTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  panelSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  divider: { height: 1, marginVertical: 14 },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  actionTile: {
    width: "47%" as any,
    flexGrow: 1,
    minWidth: "42%" as any,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    minHeight: 108,
    gap: 6,
  },
  actionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  actionLabel: { fontSize: 15, fontFamily: "Inter_700Bold" },
  actionHint: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.45)", lineHeight: 16 },
  recentSection: { gap: 10 },
  recentTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.4, textTransform: "uppercase" },
  recentRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  recentIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  recentText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  navRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  navCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
    gap: 6,
    minHeight: 72,
  },
  navLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.55)" },
  navBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#EF4444",
    borderRadius: 8,
    paddingHorizontal: 5,
    minWidth: 18,
    alignItems: "center",
  },
  navBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#fff" },
});
