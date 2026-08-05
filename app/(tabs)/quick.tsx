import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
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
import { todayString, useApp } from "@/context/AppContext";
import { useBoniface } from "@/context/BonifaceContext";
import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";

const ACTIONS = [
  { id: "writeoff",  icon: "clipboard",    label: "Списать",    color: "#FB923C", bg: "rgba(124,45,18,0.38)" },
  { id: "stoplist",  icon: "slash",         label: "Стоп-лист",  color: "#F87171", bg: "rgba(127,29,29,0.38)" },
  { id: "checklist", icon: "check-square",  label: "Задача",     color: "#4ADE80", bg: "rgba(20,83,45,0.38)" },
  { id: "briefing",  icon: "calendar",      label: "Бриф",       color: "#60A5FA", bg: "rgba(30,58,95,0.38)" },
  { id: "tips",      icon: "trending-up",   label: "Чаевые",     color: "#F59E0B", bg: "rgba(120,53,15,0.38)" },
  { id: "schedule",  icon: "grid",          label: "Расписание", color: "#A78BFA", bg: "rgba(76,29,149,0.38)" },
] as const;

export default function QuickActionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tr } = useLang();
  const { shiftState, endShift, lowStockCount, writeOffs, stopList } = useBoniface();
  const { dayEntries } = useApp();
  const [tipsModal, setTipsModal] = useState(false);
  const [startShiftModal, setStartShiftModal] = useState(false);
  const [endShiftModal, setEndShiftModal] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : 84 + insets.bottom;

  const today = todayString();
  const todayEntry = dayEntries.find((e) => e.date === today);

  const handleAction = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    switch (id) {
      case "writeoff":  router.navigate("/bar"); break;
      case "stoplist":  router.navigate("/bar"); break;
      case "checklist": router.navigate("/more"); break;
      case "briefing":  router.navigate("/briefing"); break;
      case "tips":      setTipsModal(true); break;
      case "schedule":  router.navigate("/schedule"); break;
    }
  };

  const recentItems: { icon: string; text: string; color: string }[] = [
    ...stopList.slice(0, 2).map((s) => ({
      icon: "slash",
      text: `Stop: ${s.name}`,
      color: "#F87171",
    })),
    ...writeOffs.slice(0, 2).map((w) => ({
      icon: "clipboard",
      text: `Списано: ${w.quantity} ${w.unit ?? ""} ${w.itemName}`.trim(),
      color: "#FB923C",
    })),
  ].slice(0, 3);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Shift toggle banner */}
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
        >
          <View style={[styles.shiftBannerIcon, { backgroundColor: shiftState.active ? "rgba(239,68,68,0.18)" : "rgba(245,158,11,0.18)" }]}>
            <Feather name={shiftState.active ? "stop-circle" : "play-circle"} size={20} color={shiftState.active ? "#F87171" : "#F59E0B"} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.shiftBannerTitle, { color: shiftState.active ? "#F87171" : "#F59E0B" }]}>
              {shiftState.active ? tr.quick.endShift : tr.quick.startShift}
            </Text>
            <Text style={styles.shiftBannerSub}>
              {shiftState.active ? tr.quick.startedAt(shiftState.startTime ?? "") : tr.quick.recordStart}
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color={shiftState.active ? "#F87171" : "#F59E0B"} />
        </TouchableOpacity>

        {/* Panel card */}
        <View style={styles.panel}>
          {/* Panel header */}
          <View style={styles.panelHeader}>
            <View>
              <Text style={styles.panelTitle}>{tr.quick.title}</Text>
              <Text style={styles.panelSub}>{tr.quick.sub}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Action grid */}
          <View style={styles.actionGrid}>
            {ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={[styles.actionTile, { backgroundColor: action.bg, borderColor: action.color + "25" }]}
                onPress={() => handleAction(action.id)}
                activeOpacity={0.75}
              >
                <View style={[styles.actionIconBox, { backgroundColor: action.color + "18" }]}>
                  <Feather name={action.icon as any} size={18} color={action.color} />
                </View>
                <Text style={[styles.actionLabel, { color: action.color }]}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {recentItems.length > 0 && (
            <>
              <View style={styles.divider} />
              <View style={styles.recentSection}>
                <Text style={styles.recentTitle}>Последние</Text>
                {recentItems.map((r, i) => (
                  <View key={i} style={styles.recentRow}>
                    <View style={[styles.recentIcon, { backgroundColor: r.color + "18" }]}>
                      <Feather name={r.icon as any} size={13} color={r.color} />
                    </View>
                    <Text style={styles.recentText} numberOfLines={1}>{r.text}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        {/* Quick nav row */}
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

      <TipsEntryModal visible={tipsModal} onClose={() => setTipsModal(false)} />
      <StartShiftModal
        visible={startShiftModal}
        onClose={() => setStartShiftModal(false)}
        onStarted={() => setStartShiftModal(false)}
      />
      <EndShiftSummaryModal
        visible={endShiftModal}
        onClose={() => setEndShiftModal(false)}
        onConfirm={() => { endShift(); }}
        shiftState={shiftState}
        dayEntry={todayEntry ?? { id: "", date: today, totalCash: 0, totalCard: 0, shifts: [] }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16 },

  shiftBanner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 18, borderWidth: 1, padding: 14, marginBottom: 14,
  },
  shiftBannerIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  shiftBannerTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  shiftBannerSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.35)", marginTop: 2 },

  panel: {
    backgroundColor: "#161E2E",
    borderRadius: 24, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    marginBottom: 14, overflow: "hidden",
  },
  panelHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  panelTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  panelSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.4)", marginTop: 2 },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.07)", marginHorizontal: 16 },

  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, padding: 16 },
  actionTile: {
    width: "30%", flexGrow: 1,
    borderRadius: 16, borderWidth: 1,
    padding: 14, alignItems: "center", gap: 8,
  },
  actionIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  actionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textAlign: "center" },

  recentSection: { padding: 16, gap: 10 },
  recentTitle: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.3)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 },
  recentRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  recentIcon: { width: 28, height: 28, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  recentText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)", flex: 1 },

  navRow: { flexDirection: "row", gap: 10 },
  navCard: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 14, alignItems: "center", gap: 6, position: "relative" },
  navLabel: { fontSize: 10, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.38)", textAlign: "center" },
  navBadge: { position: "absolute", top: 8, right: 8, backgroundColor: "#EF4444", borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  navBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
});
