import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ShiftState } from "@/context/BonifaceContext";
import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";

const SCREEN_HEIGHT = Dimensions.get("window").height;

interface EndShiftSummaryModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  shiftState: ShiftState;
  staffCount: number;
}

function getShiftDurationParts(startTime: string): { h: number; m: number } {
  const [sh, sm] = startTime.split(":").map(Number);
  const now = new Date();
  let totalMins = (now.getHours() - sh) * 60 + (now.getMinutes() - sm);
  if (totalMins < 0) totalMins += 24 * 60;
  return { h: Math.floor(totalMins / 60), m: totalMins % 60 };
}

export function EndShiftSummaryModal({
  visible,
  onClose,
  onConfirm,
  shiftState,
  staffCount,
}: EndShiftSummaryModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tr } = useLang();

  const duration = shiftState.startTime
    ? (() => {
        const { h, m } = getShiftDurationParts(shiftState.startTime);
        return tr.home.duration(h, m);
      })()
    : "—";

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
        <View
          style={[
            styles.sheet,
            { backgroundColor: c.card, maxHeight: maxH, paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: c.border }]} />

          <View style={styles.headerRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={[styles.title, { color: c.foreground }]}>{tr.endShift.title}</Text>
              <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
                {tr.endShift.subtitle(shiftState.startTime ?? "—", duration)}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={c.mutedForeground} />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <View style={[styles.infoCard, { backgroundColor: c.secondary, borderColor: c.border }]}>
              <View style={styles.statItem}>
                <Feather name="users" size={16} color={c.mutedForeground} />
                <Text style={[styles.statValue, { color: c.foreground }]}>{staffCount}</Text>
                <Text style={[styles.statLabel, { color: c.mutedForeground }]}>{tr.home.employees}</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: c.border }]} />
              <View style={styles.statItem}>
                <Feather name="clock" size={16} color={c.mutedForeground} />
                <Text style={[styles.statValue, { color: c.foreground }]}>{duration}</Text>
                <Text style={[styles.statLabel, { color: c.mutedForeground }]}>{tr.endShift.durationLabel}</Text>
              </View>
            </View>

            <View style={[styles.noteBox, { borderColor: "#F59E0B55", backgroundColor: "#F59E0B14" }]}>
              <Feather name="dollar-sign" size={18} color="#F59E0B" />
              <Text style={[styles.noteText, { color: c.foreground }]}>{tr.endShift.tipsNext}</Text>
            </View>
          </View>

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.btnSecondary, { borderColor: c.border, flex: 1 }]}
              onPress={onClose}
            >
              <Text style={[styles.btnSecondaryText, { color: c.foreground }]}>{tr.team.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: "#EF4444", flex: 2 }]}
              onPress={handleConfirm}
            >
              <Feather name="stop-circle" size={18} color="#fff" />
              <Text style={[styles.btnText, { color: "#fff" }]}>{tr.endShift.confirmAndTips}</Text>
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
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: { fontSize: 20, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  closeBtn: { padding: 4 },
  body: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  infoCard: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
    marginBottom: 14,
  },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  statDivider: { width: 1, height: 36, marginHorizontal: 8 },
  noteBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  noteText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 20 },
  btnRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20, marginTop: 16, marginBottom: 4 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
  },
  btnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  btnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1,
  },
  btnSecondaryText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
