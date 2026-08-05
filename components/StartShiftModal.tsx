import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useBoniface } from "@/context/BonifaceContext";
import { useColors } from "@/hooks/useColors";

const SCREEN_HEIGHT = Dimensions.get("window").height;

interface StartShiftModalProps {
  visible: boolean;
  onClose: () => void;
  onStarted: () => void;
}

export function StartShiftModal({ visible, onClose, onStarted }: StartShiftModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { employees } = useApp();
  const { checklists, toggleChecklistItem, resetChecklist, startShift } = useBoniface();

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tipsGoalInput, setTipsGoalInput] = useState("");

  const preshift = checklists.find((cl) => cl.type === "preshift");

  useEffect(() => {
    if (visible) {
      setStep(1);
      setSelectedIds([]);
      setTipsGoalInput("");
      if (preshift) resetChecklist(preshift.id);
    }
  }, [visible]);

  const toggleEmployee = (id: string) => {
    Haptics.selectionAsync();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleStart = async () => {
    const goal = parseFloat(tipsGoalInput);
    await startShift(selectedIds, !isNaN(goal) && goal > 0 ? goal : undefined);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onStarted();
    onClose();
  };

  const c = colors;
  const maxH = SCREEN_HEIGHT * 0.88;
  const doneCount = preshift ? preshift.items.filter((i) => i.done).length : 0;
  const totalCount = preshift ? preshift.items.length : 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.dismiss} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: c.card, maxHeight: maxH, paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={[styles.handle, { backgroundColor: c.border }]} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.title, { color: c.foreground }]}>
                {step === 1 ? "Состав смены" : "Бриф перед сменой"}
              </Text>
              <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
                {step === 1 ? "Кто работает сегодня?" : `${doneCount} / ${totalCount} пунктов`}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={c.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Step indicators */}
          <View style={styles.stepRow}>
            {[1, 2].map((s) => (
              <View
                key={s}
                style={[
                  styles.stepDot,
                  { backgroundColor: s <= step ? c.primary : c.border },
                ]}
              />
            ))}
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {step === 1 ? (
              <>
                {employees.length === 0 ? (
                  <View style={[styles.emptyBox, { borderColor: c.border }]}>
                    <Feather name="users" size={28} color={c.mutedForeground} />
                    <Text style={[styles.emptyText, { color: c.mutedForeground }]}>
                      Нет сотрудников. Добавь команду во вкладке «Команда».
                    </Text>
                  </View>
                ) : (
                  employees.map((emp) => {
                    const sel = selectedIds.includes(emp.id);
                    return (
                      <TouchableOpacity
                        key={emp.id}
                        style={[
                          styles.empRow,
                          {
                            backgroundColor: sel ? c.primary + "15" : c.secondary,
                            borderColor: sel ? c.primary : c.border,
                          },
                        ]}
                        onPress={() => toggleEmployee(emp.id)}
                      >
                        <View style={[styles.avatar, { backgroundColor: sel ? c.primary + "30" : c.border }]}>
                          <Text style={[styles.avatarText, { color: sel ? c.primary : c.mutedForeground }]}>
                            {emp.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <Text style={[styles.empName, { color: c.foreground }]}>{emp.name}</Text>
                        <View style={[styles.checkbox, { borderColor: sel ? c.primary : c.border, backgroundColor: sel ? c.primary : "transparent" }]}>
                          {sel && <Feather name="check" size={13} color={c.primaryForeground} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </>
            ) : (
              <>
                {preshift ? (
                  preshift.items.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.checkRow, { borderColor: c.border }]}
                      onPress={() => { toggleChecklistItem(preshift.id, item.id); Haptics.selectionAsync(); }}
                    >
                      <View style={[styles.checkBox, { borderColor: item.done ? c.primary : c.border, backgroundColor: item.done ? c.primary : "transparent" }]}>
                        {item.done && <Feather name="check" size={13} color={c.primaryForeground} />}
                      </View>
                      <Text style={[styles.checkText, { color: item.done ? c.mutedForeground : c.foreground, textDecorationLine: item.done ? "line-through" : "none" }]}>
                        {item.text}
                      </Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={[styles.emptyText, { color: c.mutedForeground }]}>Чеклист недоступен</Text>
                )}
                <View style={[styles.skipHint, { backgroundColor: c.secondary }]}>
                  <Feather name="info" size={13} color={c.mutedForeground} />
                  <Text style={[styles.skipHintText, { color: c.mutedForeground }]}>
                    Можно начать смену, не отмечая все пункты
                  </Text>
                </View>

                <View style={[styles.goalBox, { backgroundColor: c.secondary, borderColor: c.border }]}>
                  <Feather name="target" size={14} color="#F59E0B" />
                  <Text style={[styles.goalLabel, { color: c.foreground }]}>Цель по чаевым</Text>
                  <TextInput
                    style={[styles.goalInput, { color: c.foreground }]}
                    placeholder="0 ₪"
                    placeholderTextColor={c.mutedForeground}
                    value={tipsGoalInput}
                    onChangeText={setTipsGoalInput}
                    keyboardType="numeric"
                    returnKeyType="done"
                  />
                </View>
              </>
            )}
            <View style={{ height: 8 }} />
          </ScrollView>

          {/* Action button */}
          {step === 1 ? (
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: c.primary, marginHorizontal: 20 }]}
              onPress={() => { setStep(2); Haptics.selectionAsync(); }}
            >
              <Text style={[styles.btnText, { color: c.primaryForeground }]}>
                Далее — Бриф
              </Text>
              <Feather name="chevron-right" size={18} color={c.primaryForeground} />
            </TouchableOpacity>
          ) : (
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.btnSecondary, { borderColor: c.border, flex: 1 }]}
                onPress={() => setStep(1)}
              >
                <Feather name="chevron-left" size={18} color={c.foreground} />
                <Text style={[styles.btnSecondaryText, { color: c.foreground }]}>Назад</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: c.primary, flex: 2 }]}
                onPress={handleStart}
              >
                <Feather name="play-circle" size={18} color={c.primaryForeground} />
                <Text style={[styles.btnText, { color: c.primaryForeground }]}>Начать смену</Text>
              </TouchableOpacity>
            </View>
          )}
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
  stepRow: { flexDirection: "row", gap: 6, paddingHorizontal: 20, paddingBottom: 16 },
  stepDot: { height: 3, flex: 1, borderRadius: 2 },
  scroll: { paddingHorizontal: 20, paddingTop: 4 },
  emptyBox: { borderRadius: 14, borderWidth: 1, borderStyle: "dashed", padding: 24, alignItems: "center", gap: 12, marginVertical: 8 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  empRow: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8, gap: 12 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  empName: { fontSize: 16, fontFamily: "Inter_500Medium", flex: 1 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  checkRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, gap: 14 },
  checkBox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  checkText: { fontSize: 15, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 22 },
  skipHint: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, marginTop: 16 },
  skipHintText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  goalBox: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, marginTop: 10 },
  goalLabel: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
  goalInput: { fontSize: 16, fontFamily: "Inter_700Bold", minWidth: 80, textAlign: "right" },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 16, marginHorizontal: 20, marginTop: 12, marginBottom: 4 },
  btnText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  btnRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20, marginTop: 12, marginBottom: 4 },
  btnSecondary: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 14, paddingVertical: 16, borderWidth: 1 },
  btnSecondaryText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
