import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useBoniface } from "@/context/BonifaceContext";
import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function ManageShiftStaffModal({ visible, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tr } = useLang();
  const { employees } = useApp();
  const { shiftState, addEmployeesToShift, removeEmployeeFromShift } = useBoniface();
  const [pendingAdd, setPendingAdd] = useState<string[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setPendingAdd([]);
      setBusyId(null);
    }
  }, [visible]);

  const onShift = useMemo(
    () => employees.filter((e) => shiftState.employeeIds.includes(e.id)),
    [employees, shiftState.employeeIds]
  );
  const available = useMemo(
    () => employees.filter((e) => !shiftState.employeeIds.includes(e.id)),
    [employees, shiftState.employeeIds]
  );

  const joinedAtFor = (id: string) => {
    const open = [...(shiftState.attendance ?? [])]
      .reverse()
      .find((a) => a.employeeId === id && (a.leftAt == null || a.leftAt === ""));
    return open?.joinedAt ?? shiftState.startTime ?? "—";
  };

  const togglePending = (id: string) => {
    void Haptics.selectionAsync();
    setPendingAdd((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleAdd = async () => {
    if (!pendingAdd.length) return;
    await addEmployeesToShift(pendingAdd);
    setPendingAdd([]);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleRemove = async (id: string) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await removeEmployeeFromShift(id);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.dismiss} onPress={onClose} accessibilityLabel="close" />
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={styles.header}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={[styles.title, { color: colors.foreground }]}>{tr.manageShift.title}</Text>
              <Text style={[styles.sub, { color: colors.mutedForeground }]}>{tr.manageShift.sub}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 420 }}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            <Text style={[styles.section, { color: colors.mutedForeground }]}>
              {tr.manageShift.onShift(onShift.length)}
            </Text>
            {onShift.length === 0 ? (
              <Text style={[styles.empty, { color: colors.mutedForeground }]}>{tr.manageShift.nobody}</Text>
            ) : (
              onShift.map((emp) => (
                <View
                  key={emp.id}
                  style={[styles.row, { borderColor: colors.border, backgroundColor: colors.secondary }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: colors.foreground }]}>{emp.name}</Text>
                    <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                      {tr.manageShift.since(joinedAtFor(emp.id))}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      void handleRemove(emp.id);
                    }}
                    disabled={busyId === emp.id}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={tr.manageShift.remove}
                    style={({ pressed }) => [
                      styles.removeBtn,
                      {
                        backgroundColor: pressed ? "rgba(248,113,113,0.2)" : "rgba(248,113,113,0.12)",
                        opacity: busyId === emp.id ? 0.5 : 1,
                      },
                    ]}
                  >
                    <Feather name="minus-circle" size={22} color="#F87171" />
                    <Text style={styles.removeLabel}>{tr.manageShift.remove}</Text>
                  </Pressable>
                </View>
              ))
            )}

            <Text style={[styles.section, { color: colors.mutedForeground, marginTop: 18 }]}>
              {tr.manageShift.available}
            </Text>
            {available.length === 0 ? (
              <Text style={[styles.empty, { color: colors.mutedForeground }]}>{tr.manageShift.noneLeft}</Text>
            ) : (
              available.map((emp) => {
                const selected = pendingAdd.includes(emp.id);
                return (
                  <Pressable
                    key={emp.id}
                    style={({ pressed }) => [
                      styles.row,
                      {
                        borderColor: selected ? colors.primary : colors.border,
                        backgroundColor: selected
                          ? "rgba(245,158,11,0.12)"
                          : pressed
                            ? colors.secondary
                            : colors.secondary,
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}
                    onPress={() => togglePending(emp.id)}
                  >
                    <Text style={[styles.name, { color: colors.foreground, flex: 1 }]}>{emp.name}</Text>
                    <Feather
                      name={selected ? "check-circle" : "circle"}
                      size={20}
                      color={selected ? colors.primary : colors.mutedForeground}
                    />
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          {pendingAdd.length > 0 && (
            <Pressable
              style={({ pressed }) => [
                styles.addBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={() => {
                void handleAdd();
              }}
            >
              <Feather name="user-plus" size={16} color={colors.primaryForeground} />
              <Text style={[styles.addBtnText, { color: colors.primaryForeground }]}>
                {tr.manageShift.addSelected(pendingAdd.length)}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.55)" },
  dismiss: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  sheet: {
    position: "relative",
    zIndex: 1,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 8,
    ...Platform.select({
      web: { boxShadow: "0 -8px 32px rgba(0,0,0,0.35)" } as object,
      default: { elevation: 12 },
    }),
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 10 },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  closeBtn: { padding: 4 },
  section: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  empty: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    gap: 10,
  },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  meta: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  removeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    minHeight: 40,
  },
  removeLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#F87171" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 12,
  },
  addBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
