import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DayEntry, ShiftResult, calcDayResults } from "@/context/AppContext";
import { ShiftState } from "@/context/BonifaceContext";
import { useColors } from "@/hooks/useColors";

const SCREEN_HEIGHT = Dimensions.get("window").height;

interface EndShiftSummaryModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  shiftState: ShiftState;
  dayEntry: DayEntry;
}

function getShiftDuration(startTime: string): string {
  const [sh, sm] = startTime.split(":").map(Number);
  const now = new Date();
  let totalMins = (now.getHours() - sh) * 60 + (now.getMinutes() - sm);
  if (totalMins < 0) totalMins += 24 * 60;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${h}ч ${m}м`;
}

export function EndShiftSummaryModal({ visible, onClose, onConfirm, shiftState, dayEntry }: EndShiftSummaryModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const results: ShiftResult[] = calcDayResults(dayEntry);
  const totalTips = dayEntry.totalCash + dayEntry.totalCard;
  const duration = shiftState.startTime ? getShiftDuration(shiftState.startTime) : "—";

  const handleConfirm = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm();
    onClose();
  };

  const c = colors;
  const maxH = SCREEN_HEIGHT * 0.88;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.dismiss} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: c.card, maxHeight: maxH, paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={[styles.handle, { backgroundColor: c.border }]} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.title, { color: c.foreground }]}>Итоги смены</Text>
              <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
                Начало: {shiftState.startTime ?? "—"} · Длительность: {duration}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={c.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Total tips summary */}
            <View style={[styles.totalCard, { backgroundColor: "#F59E0B18", borderColor: "#F59E0B33" }]}>
              <View style={styles.totalRow}>
                <View style={styles.totalItem}>
                  <Text style={[styles.totalLabel, { color: c.mutedForeground }]}>Наличные</Text>
                  <Text style={[styles.totalValue, { color: "#F59E0B" }]}>{dayEntry.totalCash.toLocaleString()} ₪</Text>
                </View>
                <View style={[styles.divider, { backgroundColor: c.border }]} />
                <View style={styles.totalItem}>
                  <Text style={[styles.totalLabel, { color: c.mutedForeground }]}>Карта</Text>
                  <Text style={[styles.totalValue, { color: "#F59E0B" }]}>{dayEntry.totalCard.toLocaleString()} ₪</Text>
                </View>
                <View style={[styles.divider, { backgroundColor: c.border }]} />
                <View style={styles.totalItem}>
                  <Text style={[styles.totalLabel, { color: c.mutedForeground }]}>Итого</Text>
                  <Text style={[styles.totalValueBig, { color: "#F59E0B" }]}>{totalTips.toLocaleString()} ₪</Text>
                </View>
              </View>
            </View>

            {/* Per-employee breakdown */}
            {results.length > 0 ? (
              <>
                <Text style={[styles.sectionLabel, { color: c.mutedForeground }]}>РАСПРЕДЕЛЕНИЕ ЧАЕВЫХ</Text>
                {results.map((r) => (
                  <View key={r.shift.id} style={[styles.empCard, { backgroundColor: c.secondary, borderColor: c.border }]}>
                    <View style={styles.empCardLeft}>
                      <View style={[styles.avatar, { backgroundColor: c.primary + "22" }]}>
                        <Text style={[styles.avatarText, { color: c.primary }]}>
                          {r.shift.employeeName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={[styles.empName, { color: c.foreground }]}>{r.shift.employeeName}</Text>
                        <Text style={[styles.empDetail, { color: c.mutedForeground }]}>
                          {r.shift.tipMode === "hours"
                            ? `${r.hoursWorked.toFixed(1)} ч · ${r.sharePercent.toFixed(0)}%`
                            : `Фикс. ${r.sharePercent.toFixed(0)}%`}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.empCardRight}>
                      <Text style={[styles.empTips, { color: c.primary }]}>
                        {Math.round(r.totalTips).toLocaleString()} ₪
                      </Text>
                      {r.cashTips > 0 && r.cardTips > 0 && (
                        <Text style={[styles.empTipsDetail, { color: c.mutedForeground }]}>
                          {Math.round(r.cashTips)}₪ + {Math.round(r.cardTips)}₪
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </>
            ) : (
              <View style={[styles.emptyBox, { borderColor: c.border }]}>
                <Feather name="info" size={20} color={c.mutedForeground} />
                <Text style={[styles.emptyText, { color: c.mutedForeground }]}>
                  Чаевые не добавлены. Можно завершить смену и добавить позже.
                </Text>
              </View>
            )}

            {/* Shift summary stats */}
            <View style={[styles.statsRow, { backgroundColor: c.secondary, borderColor: c.border }]}>
              <View style={styles.statItem}>
                <Feather name="users" size={16} color={c.mutedForeground} />
                <Text style={[styles.statValue, { color: c.foreground }]}>{dayEntry.shifts.length}</Text>
                <Text style={[styles.statLabel, { color: c.mutedForeground }]}>сотрудников</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: c.border }]} />
              <View style={styles.statItem}>
                <Feather name="clock" size={16} color={c.mutedForeground} />
                <Text style={[styles.statValue, { color: c.foreground }]}>{duration}</Text>
                <Text style={[styles.statLabel, { color: c.mutedForeground }]}>длительность</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: c.border }]} />
              <View style={styles.statItem}>
                <Feather name="trending-up" size={16} color={c.mutedForeground} />
                <Text style={[styles.statValue, { color: c.foreground }]}>
                  {results.length > 0 && results[0].tipsPerHour > 0
                    ? Math.round(results.reduce((s, r) => s + r.tipsPerHour, 0) / results.length) + " ₪/ч"
                    : "—"}
                </Text>
                <Text style={[styles.statLabel, { color: c.mutedForeground }]}>ср. в час</Text>
              </View>
            </View>

            <View style={{ height: 8 }} />
          </ScrollView>

          {/* Action buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.btnSecondary, { borderColor: c.border, flex: 1 }]}
              onPress={onClose}
            >
              <Text style={[styles.btnSecondaryText, { color: c.foreground }]}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: "#EF4444", flex: 2 }]}
              onPress={handleConfirm}
            >
              <Feather name="stop-circle" size={18} color="#fff" />
              <Text style={[styles.btnText, { color: "#fff" }]}>Завершить смену</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "flex-end" },
  dismiss: { flex: 1 },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 12, marginBottom: 4 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  closeBtn: { padding: 4 },
  scroll: { paddingHorizontal: 20 },
  totalCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 20 },
  totalRow: { flexDirection: "row", alignItems: "center" },
  totalItem: { flex: 1, alignItems: "center", gap: 4 },
  totalLabel: { fontSize: 11, fontFamily: "Inter_400Regular", textTransform: "uppercase", letterSpacing: 0.5 },
  totalValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  totalValueBig: { fontSize: 22, fontFamily: "Inter_700Bold" },
  divider: { width: 1, height: 40, marginHorizontal: 8 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10 },
  empCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8 },
  empCardLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  empCardRight: { alignItems: "flex-end" },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  empName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  empDetail: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  empTips: { fontSize: 17, fontFamily: "Inter_700Bold" },
  empTipsDetail: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  statsRow: { flexDirection: "row", borderRadius: 14, borderWidth: 1, padding: 16, marginTop: 12, alignItems: "center" },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  statDivider: { width: 1, height: 36, marginHorizontal: 8 },
  emptyBox: { borderRadius: 14, borderWidth: 1, borderStyle: "dashed", padding: 20, alignItems: "center", gap: 10, flexDirection: "row", marginBottom: 12 },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 20 },
  btnRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20, marginTop: 12, marginBottom: 4 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 16 },
  btnText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  btnSecondary: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 14, paddingVertical: 16, borderWidth: 1 },
  btnSecondaryText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
