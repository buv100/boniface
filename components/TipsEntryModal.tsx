import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AddShiftModal } from "@/components/AddShiftModal";
import {
  DayEntry,
  ShiftEntry,
  calcDayResults,
  generateId,
  todayString,
  useApp,
} from "@/context/AppContext";
import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";

interface TipsEntryModalProps {
  visible: boolean;
  onClose: () => void;
  /** When set, edit that day's tips (fix wrong-date entries). Defaults to today. */
  date?: string;
}

export function TipsEntryModal({ visible, onClose, date }: TipsEntryModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tr } = useLang();
  const { dayEntries, saveDayEntry } = useApp();
  const targetDate = date ?? todayString();

  const [cash, setCash] = useState("");
  const [card, setCard] = useState("");
  const [shiftModal, setShiftModal] = useState(false);
  const [editShift, setEditShift] = useState<ShiftEntry | undefined>();
  const [draft, setDraft] = useState<DayEntry>(() => ({
    id: generateId(),
    date: targetDate,
    totalCash: 0,
    totalCard: 0,
    shifts: [],
  }));

  const hasInitRef = useRef(false);
  const ScrollComponent = Platform.OS === "web" ? ScrollView : KeyboardAwareScrollView;

  useEffect(() => {
    if (visible) {
      const existing = dayEntries.find((e) => e.date === targetDate);
      const entry =
        existing ??
        { id: generateId(), date: targetDate, totalCash: 0, totalCard: 0, shifts: [] };
      setDraft(entry);
      setCash(entry.totalCash > 0 ? entry.totalCash.toString() : "");
      setCard(entry.totalCard > 0 ? entry.totalCard.toString() : "");
      hasInitRef.current = true;
    }
  }, [visible, targetDate, dayEntries]);

  const commit = (updated: DayEntry) => {
    setDraft(updated);
    saveDayEntry(updated);
  };

  const handleSave = () => {
    const cashVal = parseFloat(cash.replace(",", ".")) || 0;
    const cardVal = parseFloat(card.replace(",", ".")) || 0;
    commit({ ...draft, totalCash: cashVal, totalCard: cardVal });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  const handleAddShift = (shift: ShiftEntry) => {
    const exists = draft.shifts.find((s) => s.id === shift.id);
    const updated = exists
      ? { ...draft, shifts: draft.shifts.map((s) => (s.id === shift.id ? shift : s)) }
      : { ...draft, shifts: [...draft.shifts, shift] };
    commit(updated);
  };

  const results = calcDayResults(draft);
  const totalTips = (parseFloat(cash) || 0) + (parseFloat(card) || 0);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.dismiss} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={styles.titleRow}>
            <View>
              <Text style={[styles.title, { color: colors.foreground }]}>{tr.tipsEntry.title}</Text>
              {totalTips > 0 && (
                <Text style={[styles.totalPreview, { color: colors.primary }]}>
                  {tr.tipsEntry.total(totalTips.toLocaleString())}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <ScrollComponent style={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.inputRow}>
              <View style={[styles.inputBlock, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>{tr.tipsEntry.cashLabel}</Text>
                <TextInput
                  style={[styles.amountInput, { color: colors.foreground }]}
                  value={cash}
                  onChangeText={setCash}
                  placeholder="0"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="numeric"
                  autoFocus={false}
                />
              </View>
              <View style={[styles.inputBlock, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>{tr.tipsEntry.cardLabel}</Text>
                <TextInput
                  style={[styles.amountInput, { color: colors.foreground }]}
                  value={card}
                  onChangeText={setCard}
                  placeholder="0"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {results.length > 0 && (
              <>
                <View style={styles.shiftHeader}>
                  <Text style={[styles.shiftLabel, { color: colors.mutedForeground }]}>{tr.tipsEntry.distribution}</Text>
                  <TouchableOpacity
                    style={[styles.addBtn, { backgroundColor: colors.primary }]}
                    onPress={() => { setEditShift(undefined); setShiftModal(true); }}
                  >
                    <Feather name="plus" size={14} color={colors.primaryForeground} />
                    <Text style={[styles.addBtnText, { color: colors.primaryForeground }]}>{tr.tipsEntry.employee}</Text>
                  </TouchableOpacity>
                </View>
                {results.map((r) => (
                  <View key={r.shift.id} style={[styles.shiftRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                    <View style={[styles.shiftAvatar, { backgroundColor: colors.primary + "22" }]}>
                      <Text style={[styles.shiftAvatarText, { color: colors.primary }]}>
                        {r.shift.employeeName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[styles.shiftName, { color: colors.foreground }]}>{r.shift.employeeName}</Text>
                    <Text style={[styles.shiftTips, { color: colors.primary }]}>{Math.round(r.totalTips)} ₪</Text>
                  </View>
                ))}
              </>
            )}

            {results.length === 0 && (
              <TouchableOpacity
                style={[styles.addShiftEmpty, { borderColor: colors.border }]}
                onPress={() => { setEditShift(undefined); setShiftModal(true); }}
              >
                <Feather name="user-plus" size={16} color={colors.mutedForeground} />
                <Text style={[styles.addShiftEmptyText, { color: colors.mutedForeground }]}>{tr.tipsEntry.addEmployee}</Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 12 }} />
          </ScrollComponent>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary, marginHorizontal: 20 }]}
            onPress={handleSave}
          >
            <Feather name="check" size={18} color={colors.primaryForeground} />
            <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>{tr.team.save}</Text>
          </TouchableOpacity>
        </View>
      </View>
      <AddShiftModal
        visible={shiftModal}
        onClose={() => setShiftModal(false)}
        onSave={handleAddShift}
        editShift={editShift}
        totalCash={parseFloat(cash) || 0}
        totalCard={parseFloat(card) || 0}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  dismiss: { flex: 1 },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 12, marginBottom: 8 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold" },
  totalPreview: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  closeBtn: { padding: 4 },
  body: { paddingHorizontal: 20 },
  inputRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  inputBlock: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 14 },
  inputLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginBottom: 6 },
  amountInput: { fontSize: 28, fontFamily: "Inter_700Bold" },
  shiftHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  shiftLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  shiftRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  shiftAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  shiftAvatarText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  shiftName: { fontSize: 15, fontFamily: "Inter_500Medium", flex: 1 },
  shiftTips: { fontSize: 15, fontFamily: "Inter_700Bold" },
  addShiftEmpty: { borderRadius: 12, borderWidth: 1, borderStyle: "dashed", padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 },
  addShiftEmptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8, marginBottom: 4, borderRadius: 14, paddingVertical: 16 },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_700Bold" },
});
