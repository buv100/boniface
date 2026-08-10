import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { generateId } from "@/context/AppContext";
import { HappyHour, useBoniface } from "@/context/BonifaceContext";
import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function HappyHourSheet({ visible, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tr } = useLang();
  const { happyHours, upsertHappyHour, removeHappyHour, isHappyHourActive, activeHappyHour } =
    useBoniface();

  const existing = happyHours[0];
  const [startTime, setStartTime] = useState(existing?.startTime ?? "17:00");
  const [endTime, setEndTime] = useState(existing?.endTime ?? "19:00");
  const [discount, setDiscount] = useState(
    existing ? String(existing.discountPercent) : "20"
  );
  const [enabled, setEnabled] = useState(existing?.enabled ?? true);

  useEffect(() => {
    if (!visible) return;
    const h = happyHours[0];
    setStartTime(h?.startTime ?? "17:00");
    setEndTime(h?.endTime ?? "19:00");
    setDiscount(h ? String(h.discountPercent) : "20");
    setEnabled(h?.enabled ?? true);
  }, [visible, happyHours]);

  const handleSave = async () => {
    const pct = Math.min(100, Math.max(0, parseFloat(discount) || 0));
    const hour: HappyHour = {
      id: existing?.id ?? generateId(),
      startTime: startTime.trim() || "17:00",
      endTime: endTime.trim() || "19:00",
      discountPercent: pct,
      enabled,
    };
    await upsertHappyHour(hour);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  const handleClear = async () => {
    if (existing) await removeHappyHour(existing.id);
    Haptics.selectionAsync();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 16,
            },
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {tr.happyHour.title}
            </Text>
            {isHappyHourActive && activeHappyHour && (
              <View style={[styles.activeBadge, { backgroundColor: "#10B98122" }]}>
                <Text style={styles.activeBadgeText}>
                  {tr.happyHour.activeBadge(activeHappyHour.discountPercent)}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            {tr.happyHour.sub}
          </Text>

          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                {tr.happyHour.start}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { color: colors.foreground, backgroundColor: colors.secondary, borderColor: colors.border },
                ]}
                value={startTime}
                onChangeText={setStartTime}
                placeholder="17:00"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                {tr.happyHour.end}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { color: colors.foreground, backgroundColor: colors.secondary, borderColor: colors.border },
                ]}
                value={endTime}
                onChangeText={setEndTime}
                placeholder="19:00"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              {tr.happyHour.discount}
            </Text>
            <TextInput
              style={[
                styles.input,
                { color: colors.foreground, backgroundColor: colors.secondary, borderColor: colors.border },
              ]}
              value={discount}
              onChangeText={setDiscount}
              keyboardType="numeric"
              placeholder="20"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { color: colors.foreground }]}>
              {tr.happyHour.enabled}
            </Text>
            <Switch
              value={enabled}
              onValueChange={setEnabled}
              trackColor={{ false: colors.border, true: colors.primary + "88" }}
              thumbColor={enabled ? colors.primary : colors.mutedForeground}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            onPress={handleSave}
            activeOpacity={0.85}
          >
            <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>
              {tr.happyHour.save}
            </Text>
          </TouchableOpacity>

          {existing && (
            <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
              <Feather name="trash-2" size={14} color={colors.destructive} />
              <Text style={[styles.clearText, { color: colors.destructive }]}>
                {tr.happyHour.clear}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginBottom: 14,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", flex: 1 },
  activeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  activeBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#10B981" },
  sub: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 16 },
  row: { flexDirection: "row", gap: 12 },
  field: { flex: 1, marginBottom: 12 },
  label: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
    marginTop: 4,
  },
  switchLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
  },
  clearText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
