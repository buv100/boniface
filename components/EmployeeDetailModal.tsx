import { Feather } from "@expo/vector-icons";
import React, { useMemo } from "react";
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

import {
  DayEntry,
  Employee,
  ShiftResult,
  calcDayResults,
} from "@/context/AppContext";
import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";

const SCREEN_HEIGHT = Dimensions.get("window").height;

interface EmployeeShiftRow {
  date: string;
  result: ShiftResult;
}

interface EmployeeDetailModalProps {
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  employee: Employee | null;
  dayEntries: DayEntry[];
  avatarColor: string;
  isOnShift: boolean;
}

export function EmployeeDetailModal({
  visible, onClose, onEdit, onDelete,
  employee, dayEntries, avatarColor, isOnShift,
}: EmployeeDetailModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tr } = useLang();

  const fmtDate = (dateStr: string): string => {
    const [, m, d] = dateStr.split("-");
    return `${parseInt(d)} ${tr.monthsShort[parseInt(m) - 1]}`;
  };

  const shifts = useMemo<EmployeeShiftRow[]>(() => {
    if (!employee) return [];
    const rows: EmployeeShiftRow[] = [];
    for (const entry of [...dayEntries].sort((a, b) => b.date.localeCompare(a.date))) {
      const results = calcDayResults(entry);
      const r = results.find((res) => res.shift.employeeId === employee.id);
      if (r) rows.push({ date: entry.date, result: r });
    }
    return rows;
  }, [employee, dayEntries]);

  const totalTips = useMemo(() => shifts.reduce((s, r) => s + r.result.totalTips, 0), [shifts]);
  const totalHours = useMemo(() => shifts.reduce((s, r) => s + r.result.hoursWorked, 0), [shifts]);
  const avgPerShift = shifts.length > 0 ? totalTips / shifts.length : 0;

  if (!employee) return null;

  const c = colors;
  const initials = employee.name.charAt(0).toUpperCase();
  const maxH = SCREEN_HEIGHT * 0.9;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.dismiss} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: c.card, maxHeight: maxH, paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={[styles.handle, { backgroundColor: c.border }]} />

          <View style={styles.header}>
            <View style={[styles.bigAvatar, { backgroundColor: avatarColor + "22" }]}>
              <Text style={[styles.bigAvatarText, { color: avatarColor }]}>{initials}</Text>
              {isOnShift && (
                <View style={[styles.onShiftDot, { backgroundColor: "#10B981" }]} />
              )}
            </View>
            <View style={styles.headerInfo}>
              <Text style={[styles.empName, { color: c.foreground }]}>{employee.name}</Text>
              {isOnShift ? (
                <View style={[styles.onShiftBadge, { backgroundColor: "#10B98122" }]}>
                  <View style={[styles.pulse, { backgroundColor: "#10B981" }]} />
                  <Text style={[styles.onShiftText, { color: "#10B981" }]}>{tr.team.onShiftNow}</Text>
                </View>
              ) : (
                <Text style={[styles.shiftCount, { color: c.mutedForeground }]}>
                  {shifts.length > 0 ? tr.empDetail.shiftsTotal(shifts.length) : tr.team.noShifts}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={c.mutedForeground} />
            </TouchableOpacity>
          </View>

          <View style={[styles.statsRow, { backgroundColor: c.secondary, borderColor: c.border }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: c.primary }]}>{Math.round(totalTips).toLocaleString()} ₪</Text>
              <Text style={[styles.statLabel, { color: c.mutedForeground }]}>{tr.empDetail.earned}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: c.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: c.foreground }]}>{shifts.length}</Text>
              <Text style={[styles.statLabel, { color: c.mutedForeground }]}>{tr.empDetail.shifts}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: c.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: c.foreground }]}>
                {avgPerShift > 0 ? `${Math.round(avgPerShift)} ₪` : "—"}
              </Text>
              <Text style={[styles.statLabel, { color: c.mutedForeground }]}>{tr.empDetail.avgPerShift}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: c.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: c.foreground }]}>
                {totalHours > 0 ? `${Math.round(totalHours)} ${tr.card.hoursAbbrev}` : "—"}
              </Text>
              <Text style={[styles.statLabel, { color: c.mutedForeground }]}>{tr.empDetail.hours}</Text>
            </View>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {shifts.length > 0 ? (
              <>
                <Text style={[styles.sectionLabel, { color: c.mutedForeground }]}>{tr.empDetail.historyLabel}</Text>
                {shifts.map(({ date, result }) => (
                  <View key={date + result.shift.id} style={[styles.shiftRow, { borderColor: c.border }]}>
                    <View style={styles.shiftLeft}>
                      <Text style={[styles.shiftDate, { color: c.foreground }]}>{fmtDate(date)}</Text>
                      <Text style={[styles.shiftDetail, { color: c.mutedForeground }]}>
                        {result.shift.startTime} – {result.shift.endTime}
                        {result.hoursWorked > 0 ? tr.empDetail.hoursSuffix(result.hoursWorked.toFixed(1)) : ""}
                      </Text>
                    </View>
                    <View style={styles.shiftRight}>
                      <Text style={[styles.shiftTips, { color: c.primary }]}>
                        {Math.round(result.totalTips).toLocaleString()} ₪
                      </Text>
                      {result.cashTips > 0 && result.cardTips > 0 && (
                        <Text style={[styles.shiftTipsDetail, { color: c.mutedForeground }]}>
                          {Math.round(result.cashTips)}+{Math.round(result.cardTips)}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </>
            ) : (
              <View style={[styles.emptyBox, { borderColor: c.border }]}>
                <Feather name="clock" size={24} color={c.mutedForeground} />
                <Text style={[styles.emptyText, { color: c.mutedForeground }]}>
                  {tr.empDetail.emptyHistory}
                </Text>
              </View>
            )}
            <View style={{ height: 8 }} />
          </ScrollView>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: c.border, flex: 1 }]}
              onPress={() => { onClose(); setTimeout(onEdit, 300); }}
            >
              <Feather name="edit-2" size={16} color={c.foreground} />
              <Text style={[styles.actionBtnText, { color: c.foreground }]}>{tr.team.editTitle}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: "#EF444433", backgroundColor: "#EF444411", flex: 1 }]}
              onPress={() => { onClose(); setTimeout(onDelete, 300); }}
            >
              <Feather name="trash-2" size={16} color="#EF4444" />
              <Text style={[styles.actionBtnText, { color: "#EF4444" }]}>{tr.team.delete}</Text>
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
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 12, marginBottom: 8 },
  header: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingBottom: 16 },
  bigAvatar: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  bigAvatarText: { fontSize: 22, fontFamily: "Inter_700Bold" },
  onShiftDot: { position: "absolute", bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: "#1F2937" },
  headerInfo: { flex: 1, gap: 4 },
  empName: { fontSize: 20, fontFamily: "Inter_700Bold" },
  shiftCount: { fontSize: 13, fontFamily: "Inter_400Regular" },
  onShiftBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, alignSelf: "flex-start" },
  pulse: { width: 6, height: 6, borderRadius: 3 },
  onShiftText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  closeBtn: { padding: 4 },
  statsRow: { flexDirection: "row", marginHorizontal: 20, borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 20, alignItems: "center" },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  statDivider: { width: 1, height: 32, marginHorizontal: 4 },
  scroll: { paddingHorizontal: 20 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10 },
  shiftRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1 },
  shiftLeft: { gap: 2 },
  shiftDate: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  shiftDetail: { fontSize: 12, fontFamily: "Inter_400Regular" },
  shiftRight: { alignItems: "flex-end", gap: 2 },
  shiftTips: { fontSize: 16, fontFamily: "Inter_700Bold" },
  shiftTipsDetail: { fontSize: 11, fontFamily: "Inter_400Regular" },
  emptyBox: { borderRadius: 14, borderWidth: 1, borderStyle: "dashed", padding: 24, alignItems: "center", gap: 12, marginVertical: 8 },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  actionRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20, marginTop: 4 },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 14, borderWidth: 1 },
  actionBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
