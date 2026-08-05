import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
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
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import {
  ShiftEntry,
  TipMode,
  calcHoursWorked,
  generateId,
  useApp,
} from "@/context/AppContext";
import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";

const SCREEN_HEIGHT = Dimensions.get("window").height;

interface AddShiftModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (shift: ShiftEntry) => void;
  editShift?: ShiftEntry;
  totalCash?: number;
  totalCard?: number;
}

function isValidTime(t: string): boolean {
  if (!/^\d{1,2}:\d{2}$/.test(t)) return false;
  const [h, m] = t.split(":").map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

function formatTimeInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return digits.slice(0, 2) + ":" + digits.slice(2);
}

export function AddShiftModal({ visible, onClose, onSave, editShift, totalCash = 0, totalCard = 0 }: AddShiftModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { employees } = useApp();
  const { tr, isRTL } = useLang();

  const [tipMode, setTipMode] = useState<TipMode>("hours");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [cashPercent, setCashPercent] = useState("");
  const [cardPercent, setCardPercent] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible) {
      if (editShift) {
        setTipMode(editShift.tipMode);
        setSelectedEmployeeId(editShift.employeeId);
        setStartTime(editShift.startTime ?? "");
        setEndTime(editShift.endTime ?? "");
        setCashPercent(editShift.cashPercent > 0 ? editShift.cashPercent.toString() : "");
        setCardPercent(editShift.cardPercent > 0 ? editShift.cardPercent.toString() : "");
      } else {
        setTipMode("hours");
        setSelectedEmployeeId(employees.length === 1 ? employees[0].id : "");
        setStartTime("");
        setEndTime("");
        setCashPercent("");
        setCardPercent("");
      }
      setErrors({});
    }
  }, [visible, editShift, employees]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!selectedEmployeeId) errs.employee = tr.shift.errEmployee;
    if (tipMode === "hours") {
      if (!isValidTime(startTime)) errs.startTime = tr.shift.errTime;
      if (!isValidTime(endTime)) errs.endTime = tr.shift.errTime;
    } else {
      const cp = parseFloat(cashPercent);
      const kp = parseFloat(cardPercent);
      if (isNaN(cp) || cp < 0 || cp > 100) errs.cashPercent = tr.shift.errPercent;
      if (isNaN(kp) || kp < 0 || kp > 100) errs.cardPercent = tr.shift.errPercent;
      if (!errs.cashPercent && !errs.cardPercent && cp === 0 && kp === 0) {
        errs.cashPercent = tr.shift.errPercentMin;
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); return; }
    const emp = employees.find((e) => e.id === selectedEmployeeId)!;
    const shift: ShiftEntry = {
      id: editShift?.id ?? generateId(),
      employeeId: selectedEmployeeId,
      employeeName: emp.name,
      tipMode,
      startTime: tipMode === "hours" ? startTime : "",
      endTime: tipMode === "hours" ? endTime : "",
      cashPercent: tipMode === "percent" ? parseFloat(cashPercent) || 0 : 0,
      cardPercent: tipMode === "percent" ? parseFloat(cardPercent) || 0 : 0,
    };
    onSave(shift);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  const previewHours = tipMode === "hours" && isValidTime(startTime) && isValidTime(endTime)
    ? calcHoursWorked(startTime, endTime) : null;
  const cashPct = parseFloat(cashPercent) || 0;
  const cardPct = parseFloat(cardPercent) || 0;
  const previewCash = tipMode === "percent" && totalCash > 0 ? (cashPct / 100) * totalCash : null;
  const previewCard = tipMode === "percent" && totalCard > 0 ? (cardPct / 100) * totalCard : null;

  const c = colors;
  const maxSheetHeight = SCREEN_HEIGHT * 0.88;

  const ScrollComponent = Platform.OS === "web" ? ScrollView : KeyboardAwareScrollView;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Tap outside to dismiss */}
        <TouchableOpacity style={styles.overlayDismiss} activeOpacity={1} onPress={onClose} />

        <View style={[styles.sheet, { backgroundColor: c.card, maxHeight: maxSheetHeight, paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={[styles.handle, { backgroundColor: c.border }]} />

          {/* Title row — always visible */}
          <View style={[styles.titleRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Text style={[styles.title, { color: c.foreground }]}>
              {editShift ? tr.shift.editTitle : tr.shift.addTitle}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={22} color={c.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Scrollable content — keyboard-aware */}
          <ScrollComponent
            style={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Mode toggle */}
            <Text style={[styles.sectionLabel, { color: c.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>{tr.shift.modeLabel}</Text>
            <View style={[styles.modeRow, { backgroundColor: c.secondary, borderColor: c.border, flexDirection: isRTL ? "row-reverse" : "row" }]}>
              {(["hours", "percent"] as TipMode[]).map((mode) => {
                const active = tipMode === mode;
                return (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.modeBtn, active && { backgroundColor: c.primary }]}
                    onPress={() => { setTipMode(mode); setErrors({}); Haptics.selectionAsync(); }}
                  >
                    <Feather name={mode === "hours" ? "clock" : "percent"} size={14} color={active ? c.primaryForeground : c.mutedForeground} />
                    <Text style={[styles.modeBtnText, { color: active ? c.primaryForeground : c.mutedForeground }]}>
                      {mode === "hours" ? tr.shift.modeHours : tr.shift.modePercent}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {tipMode === "percent" && (
              <View style={[styles.modeHint, { backgroundColor: c.primary + "12", borderColor: c.primary + "33" }]}>
                <Feather name="info" size={13} color={c.primary} />
                <Text style={[styles.modeHintText, { color: c.primary, textAlign: isRTL ? "right" : "left" }]}>{tr.shift.modeHint}</Text>
              </View>
            )}

            {/* Employee list — scrollable when many */}
            <Text style={[styles.sectionLabel, { color: c.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>{tr.shift.empLabel}</Text>
            {employees.length === 0 ? (
              <Text style={[styles.emptyEmpText, { color: c.mutedForeground }]}>{tr.shift.noEmployees}</Text>
            ) : (
              <View style={[
                styles.empList,
                employees.length > 4 && { maxHeight: 200, borderRadius: 10, borderWidth: 1, borderColor: c.border },
              ]}>
                <ScrollView
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={employees.length > 4}
                  scrollEnabled={employees.length > 4}
                  style={employees.length > 4 ? { padding: 6 } : undefined}
                >
                  {employees.map((emp) => {
                    const sel = emp.id === selectedEmployeeId;
                    return (
                      <TouchableOpacity
                        key={emp.id}
                        style={[styles.empChip, { borderColor: sel ? c.primary : c.border }, sel && { backgroundColor: c.primary + "18" }, { flexDirection: isRTL ? "row-reverse" : "row" }]}
                        onPress={() => { setSelectedEmployeeId(emp.id); setErrors((e) => ({ ...e, employee: "" })); Haptics.selectionAsync(); }}
                      >
                        <View style={[styles.chipAvatar, { backgroundColor: sel ? c.primary + "33" : c.secondary }]}>
                          <Text style={[styles.chipAvatarText, { color: sel ? c.primary : c.mutedForeground }]}>{emp.name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <Text style={[styles.chipText, { color: c.foreground }]}>{emp.name}</Text>
                        {sel && <Feather name="check" size={16} color={c.primary} style={{ marginLeft: isRTL ? 0 : "auto", marginRight: isRTL ? "auto" : 0 }} />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
            {!!errors.employee && <Text style={[styles.errorText, { color: c.destructive }]}>{errors.employee}</Text>}

            {/* Hours inputs */}
            {tipMode === "hours" && (
              <>
                <Text style={[styles.sectionLabel, { color: c.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>{tr.shift.timeLabel}</Text>
                <View style={[styles.row, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <View style={styles.inputWrapper}>
                    <Text style={[styles.inputLabel, { color: c.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>{tr.shift.arrival}</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: c.secondary, borderColor: errors.startTime ? c.destructive : c.border, color: c.foreground, textAlign: "center" }]}
                      placeholder={tr.shift.timePlaceholder} placeholderTextColor={c.mutedForeground}
                      value={startTime} onChangeText={(t) => { setStartTime(formatTimeInput(t)); setErrors((e) => ({ ...e, startTime: "" })); }}
                      keyboardType="numeric" maxLength={5}
                    />
                    {!!errors.startTime && <Text style={[styles.errorText, { color: c.destructive }]}>{errors.startTime}</Text>}
                  </View>
                  <View style={styles.inputWrapper}>
                    <Text style={[styles.inputLabel, { color: c.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>{tr.shift.departure}</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: c.secondary, borderColor: errors.endTime ? c.destructive : c.border, color: c.foreground, textAlign: "center" }]}
                      placeholder={tr.shift.timePlaceholder} placeholderTextColor={c.mutedForeground}
                      value={endTime} onChangeText={(t) => { setEndTime(formatTimeInput(t)); setErrors((e) => ({ ...e, endTime: "" })); }}
                      keyboardType="numeric" maxLength={5}
                    />
                    {!!errors.endTime && <Text style={[styles.errorText, { color: c.destructive }]}>{errors.endTime}</Text>}
                  </View>
                </View>
                {previewHours !== null && (
                  <View style={[styles.previewBox, { backgroundColor: c.secondary }]}>
                    <Feather name="clock" size={16} color={c.primary} />
                    <Text style={[styles.previewValue, { color: c.primary }]}>{previewHours.toFixed(1)}</Text>
                    <Text style={[styles.previewLabel, { color: c.mutedForeground }]}>{tr.shift.previewHours("")}</Text>
                  </View>
                )}
              </>
            )}

            {/* Percent inputs */}
            {tipMode === "percent" && (
              <>
                <Text style={[styles.sectionLabel, { color: c.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>{tr.shift.percentLabel}</Text>
                <View style={[styles.row, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <View style={styles.inputWrapper}>
                    <Text style={[styles.inputLabel, { color: c.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>{tr.shift.cashPercent}</Text>
                    <View style={[styles.percentInputWrap, { backgroundColor: c.secondary, borderColor: errors.cashPercent ? c.destructive : c.border }]}>
                      <TextInput style={[styles.percentInput, { color: c.foreground }]} placeholder="0" placeholderTextColor={c.mutedForeground}
                        value={cashPercent} onChangeText={(t) => { setCashPercent(t.replace(",", ".")); setErrors((e) => ({ ...e, cashPercent: "" })); }} keyboardType="numeric" maxLength={5} />
                      <Text style={[styles.percentSign, { color: c.primary }]}>%</Text>
                    </View>
                    {!!errors.cashPercent && <Text style={[styles.errorText, { color: c.destructive }]}>{errors.cashPercent}</Text>}
                  </View>
                  <View style={styles.inputWrapper}>
                    <Text style={[styles.inputLabel, { color: c.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>{tr.shift.cardPercent}</Text>
                    <View style={[styles.percentInputWrap, { backgroundColor: c.secondary, borderColor: errors.cardPercent ? c.destructive : c.border }]}>
                      <TextInput style={[styles.percentInput, { color: c.foreground }]} placeholder="0" placeholderTextColor={c.mutedForeground}
                        value={cardPercent} onChangeText={(t) => { setCardPercent(t.replace(",", ".")); setErrors((e) => ({ ...e, cardPercent: "" })); }} keyboardType="numeric" maxLength={5} />
                      <Text style={[styles.percentSign, { color: c.primary }]}>%</Text>
                    </View>
                    {!!errors.cardPercent && <Text style={[styles.errorText, { color: c.destructive }]}>{errors.cardPercent}</Text>}
                  </View>
                </View>
                {(previewCash !== null || previewCard !== null) && (
                  <View style={[styles.previewBox, { backgroundColor: c.secondary }]}>
                    <Feather name="percent" size={14} color={c.primary} />
                    <Text style={[styles.previewValue, { color: c.primary }]}>
                      {((previewCash ?? 0) + (previewCard ?? 0)).toFixed(0)} ₪
                    </Text>
                    <Text style={[styles.previewLabel, { color: c.mutedForeground }]}>
                      {tr.shift.previewTips("", (previewCash ?? 0).toFixed(0), (previewCard ?? 0).toFixed(0))}
                    </Text>
                  </View>
                )}
              </>
            )}
            <View style={{ height: 16 }} />
          </ScrollComponent>

          {/* Save button — always visible at bottom */}
          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: c.primary, marginHorizontal: 20 }]} onPress={handleSave}>
            <Text style={[styles.saveBtnText, { color: c.primaryForeground }]}>
              {editShift ? tr.shift.save : tr.shift.add}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  overlayDismiss: { flex: 1 },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 12, marginBottom: 8 },
  titleRow: { alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  scroll: { paddingHorizontal: 20 },
  sectionLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 8, marginTop: 16, textTransform: "uppercase", letterSpacing: 0.6 },
  modeRow: { borderRadius: 12, borderWidth: 1, padding: 4, gap: 4 },
  modeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10, borderRadius: 8, gap: 6 },
  modeBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  modeHint: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 8 },
  modeHintText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },
  empList: { overflow: "hidden" },
  empChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, marginBottom: 8, alignItems: "center", gap: 10 },
  chipAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  chipAvatarText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  chipText: { fontSize: 15, fontFamily: "Inter_500Medium", flex: 1 },
  emptyEmpText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", padding: 16 },
  row: { gap: 12 },
  inputWrapper: { flex: 1 },
  inputLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 6 },
  input: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, fontFamily: "Inter_500Medium", borderWidth: 1 },
  percentInputWrap: { flexDirection: "row", alignItems: "center", borderRadius: 10, borderWidth: 1, paddingHorizontal: 14 },
  percentInput: { flex: 1, paddingVertical: 12, fontSize: 20, fontFamily: "Inter_700Bold" },
  percentSign: { fontSize: 22, fontFamily: "Inter_700Bold" },
  errorText: { fontSize: 11, marginTop: 4, fontFamily: "Inter_400Regular" },
  previewBox: { marginTop: 12, padding: 14, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  previewValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  previewLabel: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  saveBtn: { marginTop: 12, marginBottom: 4, borderRadius: 12, paddingVertical: 16, alignItems: "center" },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_700Bold" },
});
