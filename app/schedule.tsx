import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StartShiftModal } from "@/components/StartShiftModal";
import { calcDayResults, useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";
import { apiCall } from "@/lib/api";
import { exportScheduleCsv, shareText } from "@/utils/exportCsv";

const STAFF_COLORS = ["#F59E0B", "#7C3AED", "#0EA5E9", "#10B981", "#F97316", "#EC4899"];

interface ShiftClaim {
  id: string;
  employeeId: string;
  status: string;
  claimedAt: string;
}

interface ShiftSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  role?: string;
  mode: string;
  maxClaims: number;
  notes?: string;
  claims: ShiftClaim[];
}

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
  const { token, isManager, canManageCritical, isLoggedIn } = useAuth();

  const [startShiftVisible, setStartShiftVisible] = useState(false);
  const [slots, setSlots] = useState<ShiftSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [slotDate, setSlotDate] = useState(toDateString(new Date()));
  const [slotStart, setSlotStart] = useState("18:00");
  const [slotEnd, setSlotEnd] = useState("02:00");
  const [slotMode, setSlotMode] = useState<"can" | "want">("can");
  const [slotRole, setSlotRole] = useState("");
  const [creating, setCreating] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 20;

  const weekDates = useMemo(() => getWeekDates(), []);
  const todayStr = toDateString(new Date());
  const from = toDateString(weekDates[0]);
  const to = toDateString(weekDates[6]);

  const weekRange = `${weekDates[0].getDate()} – ${weekDates[6].getDate()} ${
    tr.monthsShort[weekDates[6].getMonth()]
  } ${weekDates[6].getFullYear()}`;

  const dayLabels = tr.datePicker.weekDays;

  const getEmpColor = (id: string) => {
    const idx = employees.findIndex((e) => e.id === id);
    return STAFF_COLORS[Math.max(idx, 0) % STAFF_COLORS.length];
  };

  const empName = (id: string) => employees.find((e) => e.id === id)?.name ?? id.slice(0, 6);

  const loadSlots = useCallback(async () => {
    if (!token) {
      setSlots([]);
      return;
    }
    setSlotsLoading(true);
    try {
      const data = await apiCall<ShiftSlot[]>(`/shift-slots?from=${from}&to=${to}`, { token });
      setSlots(data);
    } catch {
      // offline-first: keep local schedule view
    } finally {
      setSlotsLoading(false);
    }
  }, [token, from, to]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

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

  const handleExportCsv = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const rows: { date: string; employee: string; start: string; end: string; role?: string; mode?: string; status?: string }[] = [];

    for (const date of weekDates) {
      const dateStr = toDateString(date);
      const entry = dayEntries.find((e) => e.date === dateStr);
      if (entry) {
        for (const r of calcDayResults(entry)) {
          rows.push({
            date: dateStr,
            employee: r.shift.employeeName,
            start: r.shift.startTime,
            end: r.shift.endTime,
            status: "logged",
          });
        }
      }
    }
    for (const slot of slots) {
      if (slot.claims.length === 0) {
        rows.push({
          date: slot.date,
          employee: "",
          start: slot.startTime,
          end: slot.endTime,
          role: slot.role,
          mode: slot.mode,
          status: "open",
        });
      } else {
        for (const c of slot.claims) {
          rows.push({
            date: slot.date,
            employee: empName(c.employeeId),
            start: slot.startTime,
            end: slot.endTime,
            role: slot.role,
            mode: slot.mode,
            status: c.status,
          });
        }
      }
    }

    try {
      await exportScheduleCsv(
        rows,
        tr.csv.scheduleFilename,
        tr.csv.scheduleHeaders,
        tr.csv.exportTitle
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert(tr.schedule.exportTitle, e?.message ?? "Export failed");
    }
  };

  const handleShareText = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const lines = [`${tr.schedule.title} · ${weekRange}`, ""];
    weekDates.forEach((date, i) => {
      const dateStr = toDateString(date);
      const dayShifts = shiftsPerDay[i];
      const daySlots = slots.filter((s) => s.date === dateStr);
      lines.push(`${tr.weekDays[date.getDay()]} ${date.getDate()}:`);
      if (dayShifts.length === 0 && daySlots.length === 0) {
        lines.push("  —");
      }
      dayShifts.forEach((s) => lines.push(`  • ${s.name} ${s.time}`));
      daySlots.forEach((s) => {
        const names = s.claims.map((c) => empName(c.employeeId)).join(", ") || "open";
        lines.push(`  ○ ${s.startTime}–${s.endTime} [${s.mode}] ${names}`);
      });
    });
    try {
      await shareText(lines.join("\n"), tr.schedule.title);
    } catch (e: any) {
      Alert.alert(tr.schedule.exportTitle, e?.message ?? "Share failed");
    }
  };

  const handleExport = (type: string) => {
    if (type === tr.schedule.excel || type === "download") handleExportCsv();
    else handleShareText();
  };

  const openCreateSlot = () => {
    if (!isLoggedIn || !isManager) {
      Alert.alert(tr.schedule.title, tr.schedule.needLogin);
      return;
    }
    if (!canManageCritical) {
      Alert.alert(tr.schedule.title, tr.schedule.subBlocked);
      return;
    }
    setSlotDate(todayStr);
    setCreateVisible(true);
    Haptics.selectionAsync();
  };

  const handleCreateSlot = async () => {
    if (!token) return;
    setCreating(true);
    try {
      await apiCall("/shift-slots", {
        method: "POST",
        token,
        body: {
          date: slotDate.trim(),
          startTime: slotStart.trim(),
          endTime: slotEnd.trim(),
          mode: slotMode,
          role: slotRole.trim() || null,
          maxClaims: slotMode === "want" ? 1 : 4,
        },
      });
      setCreateVisible(false);
      await loadSlots();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert(tr.schedule.createSlot, e?.message ?? "Error");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteSlot = (slot: ShiftSlot) => {
    if (!canManageCritical || !token) return;
    Alert.alert(tr.schedule.deleteSlot, `${slot.date} ${slot.startTime}–${slot.endTime}`, [
      { text: tr.team.cancel, style: "cancel" },
      {
        text: tr.schedule.deleteSlot,
        style: "destructive",
        onPress: async () => {
          try {
            await apiCall(`/shift-slots/${slot.id}`, { method: "DELETE", token });
            await loadSlots();
          } catch (e: any) {
            Alert.alert(tr.schedule.title, e?.message ?? "Error");
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 12, paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: "rgba(255,255,255,0.07)", borderColor: "rgba(255,255,255,0.09)" }]}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{tr.schedule.title}</Text>
            <Text style={styles.headerSub}>{weekRange}</Text>
          </View>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: "#F59E0B" }]}
            onPress={() => {
              Haptics.selectionAsync();
              setStartShiftVisible(true);
            }}
          >
            <Feather name="plus" size={14} color="#111827" />
            <Text style={styles.addBtnText}>{tr.schedule.addShift}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.exportCard, { backgroundColor: "rgba(255,255,255,0.055)", borderColor: "rgba(255,255,255,0.09)" }]}>
          <Text style={styles.exportTitle}>{tr.schedule.exportTitle}</Text>
          <View style={styles.exportGrid}>
            {[
              { label: tr.schedule.excel, sub: tr.schedule.excelSub, icon: "file-text" as const, color: "#4ADE80" },
              { label: tr.schedule.pdf, sub: tr.schedule.pdfSub, icon: "file" as const, color: "#F87171" },
              { label: tr.schedule.whatsapp, sub: tr.schedule.whatsappSub, icon: "message-circle" as const, color: "#4ADE80" },
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
            <Text style={styles.downloadBtnText}>{tr.schedule.download}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.weekGrid}>
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

        {todayShifts.length > 0 && (
          <View style={styles.todaySection}>
            <Text style={styles.sectionLabel}>
              {tr.schedule.todaySection(
                weekDates[todayIndex]?.getDate() ?? 0,
                tr.monthsShort[weekDates[todayIndex]?.getMonth() ?? 0]
              )}
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
                    <Text style={styles.activeText}>{tr.schedule.active}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.exchangeBanner}>
          <View style={styles.exchangeIcon}>
            <Feather name="repeat" size={16} color="#A78BFA" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.exchangeTitle}>{tr.schedule.exchangeTitle}</Text>
            <Text style={styles.exchangeSub}>{tr.schedule.exchangeSub}</Text>
          </View>
          {isManager && (
            <TouchableOpacity onPress={openCreateSlot} style={styles.slotAddChip}>
              <Feather name="plus" size={14} color="#A78BFA" />
              <Text style={styles.slotAddText}>{tr.schedule.createSlot}</Text>
            </TouchableOpacity>
          )}
        </View>

        {slotsLoading ? (
          <ActivityIndicator color="#F59E0B" style={{ marginVertical: 16 }} />
        ) : slots.length > 0 ? (
          <View style={{ gap: 8, marginTop: 12, marginBottom: 8 }}>
            {slots.map((slot) => (
              <View
                key={slot.id}
                style={[styles.slotCard, { backgroundColor: "rgba(255,255,255,0.055)", borderColor: "rgba(255,255,255,0.09)" }]}
              >
                <View style={styles.slotTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.slotTitle}>
                      {slot.date} · {slot.startTime}–{slot.endTime}
                    </Text>
                    <Text style={styles.slotMeta}>
                      {slot.mode === "want" ? tr.employee.modeWant : tr.employee.modeCan}
                      {slot.role ? ` · ${slot.role}` : ""}
                      {` · ${slot.claims.length}/${slot.mode === "want" ? 1 : slot.maxClaims}`}
                    </Text>
                  </View>
                  {isManager && (
                    <TouchableOpacity onPress={() => handleDeleteSlot(slot)} hitSlop={8}>
                      <Feather name="trash-2" size={16} color="#F87171" />
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.claimsLabel}>{tr.schedule.claims}</Text>
                {slot.claims.length === 0 ? (
                  <Text style={styles.noClaims}>{tr.schedule.noClaims}</Text>
                ) : (
                  slot.claims.map((c) => (
                    <Text key={c.id} style={styles.claimName}>
                      • {empName(c.employeeId)}
                    </Text>
                  ))
                )}
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <StartShiftModal
        visible={startShiftVisible}
        onClose={() => setStartShiftVisible(false)}
        onStarted={() => {
          setStartShiftVisible(false);
          router.replace("/");
        }}
      />

      <Modal visible={createVisible} transparent animationType="slide" onRequestClose={() => setCreateVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{tr.schedule.createSlot}</Text>
            <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>{tr.schedule.slotDate}</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
              value={slotDate}
              onChangeText={setSlotDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.mutedForeground}
            />
            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>{tr.schedule.slotStart}</Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                  value={slotStart}
                  onChangeText={setSlotStart}
                  placeholder="18:00"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>{tr.schedule.slotEnd}</Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                  value={slotEnd}
                  onChangeText={setSlotEnd}
                  placeholder="02:00"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
            </View>
            <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>{tr.schedule.slotMode}</Text>
            <View style={styles.modeRow}>
              {(["can", "want"] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.modeChip, slotMode === m && { backgroundColor: colors.primary }]}
                  onPress={() => setSlotMode(m)}
                >
                  <Text style={{ color: slotMode === m ? "#111827" : colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                    {m === "can" ? tr.employee.modeCan : tr.employee.modeWant}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>{tr.schedule.slotRole}</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
              value={slotRole}
              onChangeText={setSlotRole}
              placeholderTextColor={colors.mutedForeground}
            />
            <TouchableOpacity
              style={[styles.saveSlotBtn, { backgroundColor: colors.primary }]}
              onPress={handleCreateSlot}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator color="#111827" />
              ) : (
                <Text style={styles.saveSlotText}>{tr.schedule.slotSave}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setCreateVisible(false)} style={{ alignItems: "center", padding: 12 }}>
              <Text style={{ color: colors.mutedForeground }}>{tr.team.cancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  slotAddChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  slotAddText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#A78BFA" },

  slotCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
  slotTop: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  slotTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  slotMeta: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.4)", marginTop: 2 },
  claimsLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.35)", marginTop: 10, marginBottom: 4 },
  noClaims: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.3)" },
  claimName: { fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.8)", marginTop: 2 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 12 },
  inputLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginBottom: 6, marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, fontFamily: "Inter_400Regular" },
  row2: { flexDirection: "row", gap: 10 },
  modeRow: { flexDirection: "row", gap: 8 },
  modeChip: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)" },
  saveSlotBtn: { marginTop: 16, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  saveSlotText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#111827" },
});
