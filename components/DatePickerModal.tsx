import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";

interface DatePickerModalProps {
  visible: boolean;
  currentDate: string; // yyyy-mm-dd
  maxDate?: string;    // yyyy-mm-dd, defaults to today
  onSelect: (date: string) => void;
  onClose: () => void;
}

function parseDate(str: string): { y: number; m: number; d: number } {
  const [y, m, d] = str.split("-").map(Number);
  return { y, m, d };
}

function formatDate(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}

function firstDayOfMonth(y: number, m: number): number {
  // 0=Sun, returns Mon-based (0=Mon)
  const d = new Date(y, m - 1, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

export function DatePickerModal({ visible, currentDate, maxDate, onSelect, onClose }: DatePickerModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tr } = useLang();

  const todayStr = (() => {
    const d = new Date();
    return formatDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
  })();

  const limitStr = maxDate ?? todayStr;
  const limit = parseDate(limitStr);

  const [viewYear, setViewYear] = useState(2024);
  const [viewMonth, setViewMonth] = useState(1);

  useEffect(() => {
    if (visible) {
      const { y, m } = parseDate(currentDate);
      setViewYear(y);
      setViewMonth(m);
    }
  }, [visible, currentDate]);

  const canGoNext = () => {
    if (viewYear < limit.y) return true;
    if (viewYear === limit.y && viewMonth < limit.m) return true;
    return false;
  };

  const handlePrevMonth = () => {
    Haptics.selectionAsync();
    if (viewMonth === 1) { setViewMonth(12); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };

  const handleNextMonth = () => {
    if (!canGoNext()) return;
    Haptics.selectionAsync();
    if (viewMonth === 12) { setViewMonth(1); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const totalDays = daysInMonth(viewYear, viewMonth);
  const startOffset = firstDayOfMonth(viewYear, viewMonth);

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const today = parseDate(todayStr);
  const cur = parseDate(currentDate);

  const isDisabled = (d: number) => {
    if (viewYear > limit.y) return true;
    if (viewYear === limit.y && viewMonth > limit.m) return true;
    if (viewYear === limit.y && viewMonth === limit.m && d > limit.d) return true;
    return false;
  };
  const isSelected = (d: number) =>
    viewYear === cur.y && viewMonth === cur.m && d === cur.d;
  const isToday = (d: number) =>
    viewYear === today.y && viewMonth === today.m && d === today.d;

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  const CELL = (Dimensions.get("window").width - 32 - 24) / 7;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom + 8, 20) }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            <View style={[styles.monthRow]}>
              <TouchableOpacity style={styles.monthBtn} onPress={handlePrevMonth}>
                <Feather name="chevron-left" size={22} color={colors.foreground} />
              </TouchableOpacity>
              <Text style={[styles.monthTitle, { color: colors.foreground }]}>
                {tr.months[viewMonth - 1]} {viewYear}
              </Text>
              <TouchableOpacity style={styles.monthBtn} onPress={handleNextMonth} disabled={!canGoNext()}>
                <Feather name="chevron-right" size={22} color={canGoNext() ? colors.foreground : colors.border} />
              </TouchableOpacity>
            </View>

            <View style={styles.weekRow}>
              {tr.datePicker.weekDays.map((d, i) => (
                <View key={i} style={[styles.cell, { width: CELL }]}>
                  <Text style={[styles.weekLabel, { color: i >= 5 ? colors.primary : colors.mutedForeground }]}>{d}</Text>
                </View>
              ))}
            </View>

            {rows.map((row, ri) => (
              <View key={ri} style={styles.weekRow}>
                {row.map((day, ci) => {
                  if (!day) return <View key={ci} style={[styles.cell, { width: CELL }]} />;
                  const disabled = isDisabled(day);
                  const selected = isSelected(day);
                  const tod = isToday(day);
                  return (
                    <TouchableOpacity
                      key={ci}
                      style={[styles.cell, { width: CELL }]}
                      onPress={() => {
                        if (disabled) return;
                        Haptics.selectionAsync();
                        onSelect(formatDate(viewYear, viewMonth, day));
                        onClose();
                      }}
                      disabled={disabled}
                    >
                      <View style={[
                        styles.dayCircle,
                        selected && { backgroundColor: colors.primary },
                        !selected && tod && { borderWidth: 1.5, borderColor: colors.primary },
                      ]}>
                        <Text style={[
                          styles.dayText,
                          { color: disabled ? colors.border : selected ? colors.primaryForeground : tod ? colors.primary : colors.foreground },
                          selected && { fontFamily: "Inter_700Bold" },
                        ]}>
                          {day}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            <TouchableOpacity
              style={[styles.todayBtn, { borderColor: colors.border }]}
              onPress={() => {
                Haptics.selectionAsync();
                onSelect(todayStr);
                onClose();
              }}
            >
              <Feather name="calendar" size={14} color={colors.primary} />
              <Text style={[styles.todayBtnText, { color: colors.primary }]}>{tr.datePicker.goToday}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 12 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 12, marginBottom: 12 },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  monthBtn: { padding: 8 },
  monthTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  weekRow: { flexDirection: "row" },
  cell: { alignItems: "center", justifyContent: "center", paddingVertical: 4 },
  weekLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  dayCircle: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  dayText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  todayBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12, paddingVertical: 12, borderTopWidth: 1 },
  todayBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
