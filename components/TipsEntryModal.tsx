import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useRef, useState } from "react";
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

import {
  DayEntry,
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
  /** When set, edit that day's tips. Defaults to today. */
  date?: string;
  /** After end-shift: cannot dismiss until tips are saved. */
  required?: boolean;
  onSaved?: () => void;
}

export function TipsEntryModal({
  visible,
  onClose,
  date,
  required = false,
  onSaved,
}: TipsEntryModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tr } = useLang();
  const { dayEntries, saveDayEntry } = useApp();
  const targetDate = date ?? todayString();

  const [cash, setCash] = useState("");
  const [card, setCard] = useState("");
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
    if (!visible) {
      hasInitRef.current = false;
      return;
    }
    if (hasInitRef.current) return;
    hasInitRef.current = true;

    const existing = dayEntries.find((e) => e.date === targetDate);
    const entry: DayEntry =
      existing ??
      { id: generateId(), date: targetDate, totalCash: 0, totalCard: 0, shifts: [] };

    setDraft(entry);
    setCash(required ? "" : entry.totalCash > 0 ? entry.totalCash.toString() : "");
    setCard(required ? "" : entry.totalCard > 0 ? entry.totalCard.toString() : "");
  }, [visible, targetDate, dayEntries, required]);

  const cashVal = parseFloat(cash.replace(",", ".")) || 0;
  const cardVal = parseFloat(card.replace(",", ".")) || 0;
  const previewEntry = useMemo(
    () => ({ ...draft, totalCash: cashVal, totalCard: cardVal }),
    [draft, cashVal, cardVal]
  );
  const results = calcDayResults(previewEntry);
  const totalTips = cashVal + cardVal;
  const canSave = cash.trim() !== "" && card.trim() !== "";

  const handleSave = async () => {
    if (!canSave) return;
    const updated = { ...draft, totalCash: cashVal, totalCard: cardVal };
    setDraft(updated);
    await saveDayEntry(updated);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSaved?.();
    onClose();
  };

  const handleRequestClose = () => {
    if (required) return;
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleRequestClose}>
      <View style={styles.overlay}>
        {!required && <TouchableOpacity style={styles.dismiss} activeOpacity={1} onPress={onClose} />}
        {required && <View style={styles.dismiss} />}
        <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={styles.titleRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={[styles.title, { color: colors.foreground }]}>
                {required ? tr.tipsEntry.titleRequired : tr.tipsEntry.title}
              </Text>
              {required ? (
                <Text style={[styles.sub, { color: colors.mutedForeground }]}>{tr.tipsEntry.requiredSub}</Text>
              ) : totalTips > 0 ? (
                <Text style={[styles.totalPreview, { color: colors.primary }]}>
                  {tr.tipsEntry.total(totalTips.toLocaleString())}
                </Text>
              ) : null}
            </View>
            {!required && (
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
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
                  autoFocus={required}
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

            {draft.shifts.length === 0 ? (
              <View style={[styles.emptyBox, { borderColor: colors.border }]}>
                <Feather name="info" size={18} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  {tr.tipsEntry.noStaff}
                </Text>
              </View>
            ) : (
              <>
                <Text style={[styles.shiftLabel, { color: colors.mutedForeground }]}>
                  {tr.tipsEntry.distribution}
                </Text>
                <Text style={[styles.autoHint, { color: colors.mutedForeground }]}>
                  {tr.tipsEntry.autoSplitHint}
                </Text>
                {results.map((r) => (
                  <View
                    key={r.shift.id}
                    style={[styles.shiftRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                  >
                    <View style={[styles.shiftAvatar, { backgroundColor: colors.primary + "22" }]}>
                      <Text style={[styles.shiftAvatarText, { color: colors.primary }]}>
                        {r.shift.employeeName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.shiftName, { color: colors.foreground }]}>{r.shift.employeeName}</Text>
                      <Text style={[styles.shiftMeta, { color: colors.mutedForeground }]}>
                        {tr.endShift.hoursShare(r.hoursWorked.toFixed(1), r.sharePercent.toFixed(0))}
                      </Text>
                      {totalTips > 0 && (
                        <Text style={[styles.shiftMeta, { color: colors.mutedForeground }]}>
                          {tr.tipsEntry.cashCardSplit(Math.round(r.cashTips), Math.round(r.cardTips))}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.shiftTips, { color: colors.primary }]}>
                      {Math.round(r.totalTips)} ₪
                    </Text>
                  </View>
                ))}
              </>
            )}

            <View style={{ height: 12 }} />
          </ScrollComponent>

          <TouchableOpacity
            style={[
              styles.saveBtn,
              {
                backgroundColor: canSave ? colors.primary : colors.border,
                marginHorizontal: 20,
                opacity: canSave ? 1 : 0.55,
              },
            ]}
            onPress={handleSave}
            disabled={!canSave}
          >
            <Feather name="check" size={18} color={canSave ? colors.primaryForeground : colors.mutedForeground} />
            <Text
              style={[
                styles.saveBtnText,
                { color: canSave ? colors.primaryForeground : colors.mutedForeground },
              ]}
            >
              {required ? tr.tipsEntry.saveRequired : tr.team.save}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  dismiss: { flex: 1 },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 12, marginBottom: 8 },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  title: { fontSize: 20, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 4, lineHeight: 18 },
  totalPreview: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  closeBtn: { padding: 4 },
  body: { paddingHorizontal: 20 },
  inputRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  inputBlock: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 14 },
  inputLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginBottom: 6 },
  amountInput: { fontSize: 28, fontFamily: "Inter_700Bold" },
  shiftLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  autoHint: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 10 },
  shiftRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  shiftAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  shiftAvatarText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  shiftName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  shiftMeta: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  shiftTips: { fontSize: 15, fontFamily: "Inter_700Bold" },
  emptyBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 14,
    paddingVertical: 16,
  },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_700Bold" },
});
