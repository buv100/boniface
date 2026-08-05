import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { calcDayResults, useApp } from "@/context/AppContext";
import { useBoniface } from "@/context/BonifaceContext";
import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";

const STAFF_COLORS = ["#F59E0B", "#7C3AED", "#0EA5E9", "#10B981", "#F97316", "#EC4899"];

function getWeekDates(): Date[] {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function toDateString(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ScheduleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tr } = useLang();
  const { employees, dayEntries } = useApp();
  const { shiftState } = useBoniface();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 20;

  const weekDates = useMemo(() => getWeekDates(), []);
  const todayStr = toDateString(new Date());

  const weekRange = `${weekDates[0].getDate()} – ${weekDates[6].getDate()} ${
    ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][weekDates[6].getMonth()]
  } ${weekDates[6].getFullYear()}`;

  const dayLabels = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  const getEmpColor = (id: string) => {
    const idx = employees.findIndex((e) => e.id === id);
    return STAFF_COLORS[Math.max(idx, 0) % STAFF_COLORS.length];
  };

  const shiftsPerDay = useMemo(() => {
    return weekDates.map((date) => {
      const dateStr = toDateString(date);
      const entry = dayEntries.find((e) => e.date === dateStr);
      if (!entry) return [];
      const results = calcDayResults(entry);
      return results.map((r) => ({
        id: r.shift.employeeId,
        name: r.shift.employeeName,
        time: r.shift.startTime ? `${r.shift.startTime}–${r.shift.endTime ?? "?"}` : "—",
        color: getEmpColor(r.shift.employeeId),
        initial: r.shift.employeeName.charAt(0).toUpperCase(),
      }));
    });
  }, [weekDates, dayEntries, employees]);

  const todayIndex = weekDates.findIndex((d) => toDateString(d) === todayStr);
  const todayShifts = todayIndex >= 0 ? shiftsPerDay[todayIndex] : [];

  const handleExport = (type: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 12, paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: "rgba(255,255,255,0.07)", borderColor: "rgba(255,255,255,0.09)" }]}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Расписание</Text>
            <Text style={styles.headerSub}>{weekRange}</Text>
          </View>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: "#F59E0B" }]}
            onPress={() => Haptics.selectionAsync()}
          >
            <Feather name="plus" size={14} color="#111827" />
            <Text style={styles.addBtnText}>Смена</Text>
          </TouchableOpacity>
        </View>

        {/* Export card */}
        <View style={[styles.exportCard, { backgroundColor: "rgba(255,255,255,0.055)", borderColor: "rgba(255,255,255,0.09)" }]}>
          <Text style={styles.exportTitle}>Экспорт расписания</Text>
          <View style={styles.exportGrid}>
            {[
              { label: "Excel", sub: ".xlsx", icon: "file-text" as const, color: "#4ADE80" },
              { label: "PDF", sub: "для печати", icon: "file" as const, color: "#F87171" },
              { label: "WhatsApp", sub: "команде", icon: "message-circle" as const, color: "#4ADE80" },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.label}
                style={[styles.exportOption, { backgroundColor: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.07)" }]}
                onPress={() => handleExport(opt.label)}
                activeOpacity={0.75}
              >
                <View style={[styles.exportIconBox, { backgroundColor: opt.color + "18", borderColor: opt.color + "25" }]}>
                  <Feather name={opt.icon} size={16} color={opt.color} />
                </View>
                <Text style={styles.exportLabel}>{opt.label}</Text>
                <Text style={styles.exportSub}>{opt.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.downloadBtn} onPress={() => handleExport("download")} activeOpacity={0.85}>
            <Text style={styles.downloadBtnText}>Скачать</Text>
          </TouchableOpacity>
        </View>

        {/* Week grid */}
        <View style={styles.weekGrid}>
          {/* Day labels + dates */}
          <View style={styles.weekHeader}>
            {weekDates.map((date, i) => {
              const isToday = toDateString(date) === todayStr;
              return (
                <View key={i} style={styles.dayCol}>
                  <Text style={[styles.dayLabel, { color: "rgba(255,255,255,0.3)" }]}>{dayLabels[i]}</Text>
                  <View style={[styles.dayCircle, isToday && { backgroundColor: "#F59E0B" }]}>
                    <Text style={[styles.dayNum, { color: isToday ? "#111827" : "rgba(255,255,255,0.55)" }]}>
                      {date.getDate()}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Shift blocks */}
          <View style={styles.shiftRow}>
            {weekDates.map((date, di) => {
              const isToday = toDateString(date) === todayStr;
              const shifts = shiftsPerDay[di];
              return (
                <View
                  key={di}
                  style={[
                    styles.shiftCell,
                    isToday
                      ? { backgroundColor: "rgba(245,158,11,0.07)", borderColor: "rgba(245,158,11,0.25)" }
                      : { backgroundColor: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.05)" },
                  ]}
                >
                  {shifts.length > 0 ? (
                    shifts.slice(0, 3).map((s, si) => (
                      <View key={si} style={[styles.shiftBlock, { backgroundColor: s.color + "22", borderColor: s.color + "35" }]}>
                        <Text style={[styles.shiftBlockName, { color: s.color }]} numberOfLines={1}>
                          {s.name.split(" ")[0]}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <View style={styles.emptyCell}>
                      <Feather name="plus" size={10} color="rgba(255,255,255,0.12)" />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Today detail */}
        {todayShifts.length > 0 && (
          <View style={styles.todaySection}>
            <Text style={styles.sectionLabel}>
              Сегодня · {weekDates[todayIndex]?.getDate()} {
                ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][weekDates[todayIndex]?.getMonth() ?? 0]
              }
            </Text>
            <View style={[styles.todayCard, { backgroundColor: "rgba(255,255,255,0.055)", borderColor: "rgba(255,255,255,0.09)" }]}>
              {todayShifts.map((s, i) => (
                <View key={i} style={[styles.todayRow, i < todayShifts.length - 1 && styles.todayRowBorder]}>
                  <View style={[styles.todayAvatar, { backgroundColor: s.color + "22", borderColor: s.color + "35" }]}>
                    <Text style={[styles.todayInitial, { color: s.color }]}>{s.initial}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.todayName}>{s.name}</Text>
                    <Text style={styles.todayTime}>{s.time}</Text>
                  </View>
                  <View style={styles.todayActive}>
                    <View style={styles.activeDot} />
                    <Text style={styles.activeText}>Активен</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Shift exchange banner */}
        <TouchableOpacity
          style={styles.exchangeBanner}
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          activeOpacity={0.8}
        >
          <View style={styles.exchangeIcon}>
            <Feather name="repeat" size={16} color="#A78BFA" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.exchangeTitle}>Биржа смен</Text>
            <Text style={styles.exchangeSub}>Сотрудники могут взять открытые смены</Text>
          </View>
          <Feather name="arrow-right" size={13} color="#A78BFA" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16 },

  header: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 11, borderWidth: 1, alignItems: "center", justifyContent: "center", marginTop: 4 },
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.35)", marginTop: 2 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginTop: 4 },
  addBtnText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#111827" },

  exportCard: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 16 },
  exportTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#FFFFFF", marginBottom: 12 },
  exportGrid: { flexDirection: "row", gap: 8, marginBottom: 12 },
  exportOption: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 10, alignItems: "center", gap: 6 },
  exportIconBox: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  exportLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  exportSub: { fontSize: 9, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.35)" },
  downloadBtn: { backgroundColor: "#F59E0B", borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  downloadBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#111827" },

  weekGrid: { marginBottom: 16 },
  weekHeader: { flexDirection: "row", gap: 4, marginBottom: 6 },
  dayCol: { flex: 1, alignItems: "center", gap: 4 },
  dayLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold" },
  dayCircle: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  dayNum: { fontSize: 11, fontFamily: "Inter_700Bold" },
  shiftRow: { flexDirection: "row", gap: 4 },
  shiftCell: { flex: 1, minHeight: 90, borderRadius: 14, borderWidth: 1, padding: 4, gap: 3 },
  shiftBlock: { borderRadius: 8, borderWidth: 1, padding: 4 },
  shiftBlockName: { fontSize: 7, fontFamily: "Inter_700Bold" },
  emptyCell: { flex: 1, alignItems: "center", justifyContent: "center" },

  todaySection: { marginBottom: 14 },
  sectionLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.35)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 },
  todayCard: { borderRadius: 18, borderWidth: 1, paddingHorizontal: 16, overflow: "hidden" },
  todayRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  todayRowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)" },
  todayAvatar: { width: 32, height: 32, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  todayInitial: { fontSize: 12, fontFamily: "Inter_700Bold" },
  todayName: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  todayTime: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.35)" },
  todayActive: { flexDirection: "row", alignItems: "center", gap: 4 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#4ADE80" },
  activeText: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#4ADE80" },

  exchangeBanner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "rgba(124,58,237,0.08)", borderWidth: 1,
    borderColor: "rgba(124,58,237,0.2)", borderRadius: 16, padding: 14,
  },
  exchangeIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(124,58,237,0.15)", alignItems: "center", justifyContent: "center" },
  exchangeTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#A78BFA" },
  exchangeSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.35)", marginTop: 2 },
});
