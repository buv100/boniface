import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { ShiftResult } from "@/context/AppContext";
import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";

interface ShiftCardProps {
  result: ShiftResult;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ShiftCard({ result, onEdit, onDelete }: ShiftCardProps) {
  const colors = useColors();
  const { tr, isRTL } = useLang();
  const { shift, hoursWorked, cashTips, cardTips, totalTips, tipsPerHour, sharePercent } = result;
  const isPercent = shift.tipMode === "percent";

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      tr.card.removeTitle,
      tr.card.removeMsg(shift.employeeName),
      [
        { text: tr.card.cancel, style: "cancel" },
        {
          text: tr.card.remove,
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onDelete?.();
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.header, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <View style={[styles.nameRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary + "22" }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {shift.employeeName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={[styles.nameLine, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <Text style={[styles.name, { color: colors.foreground }]}>{shift.employeeName}</Text>
              <View style={[styles.modeBadge, { backgroundColor: isPercent ? colors.accent + "22" : colors.secondary }]}>
                <Feather name={isPercent ? "percent" : "clock"} size={10} color={isPercent ? colors.accent : colors.mutedForeground} />
                <Text style={[styles.modeBadgeText, { color: isPercent ? colors.accent : colors.mutedForeground }]}>
                  {isPercent ? tr.card.modePercent : tr.card.modeHours}
                </Text>
              </View>
            </View>

            {isPercent ? (
              <Text style={[styles.subText, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>
                {tr.card.cash}: {shift.cashPercent}% · {tr.card.card}: {shift.cardPercent}%
              </Text>
            ) : (
              <View style={[styles.timeRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <Feather name="clock" size={12} color={colors.mutedForeground} />
                <Text style={[styles.subText, { color: colors.mutedForeground }]}>
                  {shift.startTime} — {shift.endTime} · {hoursWorked.toFixed(1)} {tr.card.hoursAbbrev}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.actions}>
          {onEdit && (
            <TouchableOpacity onPress={() => { Haptics.selectionAsync(); onEdit(); }} style={styles.actionBtn}>
              <Feather name="edit-2" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity onPress={handleDelete} style={styles.actionBtn}>
              <Feather name="trash-2" size={16} color={colors.destructive} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={[styles.tipsRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <View style={styles.tipItem}>
          <Text style={[styles.tipLabel, { color: colors.mutedForeground }]}>{tr.card.cash}</Text>
          <Text style={[styles.tipValue, { color: colors.foreground }]}>{cashTips.toFixed(0)} ₪</Text>
        </View>
        <View style={[styles.tipSep, { backgroundColor: colors.border }]} />
        <View style={styles.tipItem}>
          <Text style={[styles.tipLabel, { color: colors.mutedForeground }]}>{tr.card.card}</Text>
          <Text style={[styles.tipValue, { color: colors.foreground }]}>{cardTips.toFixed(0)} ₪</Text>
        </View>
        <View style={[styles.tipSep, { backgroundColor: colors.border }]} />
        <View style={styles.tipItem}>
          <Text style={[styles.tipLabel, { color: colors.mutedForeground }]}>{tr.card.total}</Text>
          <Text style={[styles.tipValue, { color: colors.primary }]}>{totalTips.toFixed(0)} ₪</Text>
        </View>
        {!isPercent && (
          <>
            <View style={[styles.tipSep, { backgroundColor: colors.border }]} />
            <View style={styles.tipItem}>
              <Text style={[styles.tipLabel, { color: colors.mutedForeground }]}>{tr.card.perHour}</Text>
              <Text style={[styles.tipValue, { color: colors.accent }]}>{tipsPerHour.toFixed(0)} ₪</Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.shareRow}>
        <View style={[styles.shareBar, { backgroundColor: colors.border }]}>
          <View style={[styles.shareFill, { width: `${Math.min(sharePercent, 100)}%` as unknown as number, backgroundColor: isPercent ? colors.accent : colors.primary }]} />
        </View>
        <Text style={[styles.shareText, { color: colors.mutedForeground }]}>{sharePercent.toFixed(0)}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10 },
  header: { alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 },
  nameRow: { alignItems: "flex-start", gap: 10, flex: 1 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", marginTop: 2 },
  avatarText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  nameLine: { alignItems: "center", gap: 8, marginBottom: 4 },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  modeBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  modeBadgeText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  timeRow: { alignItems: "center", gap: 4 },
  subText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  actions: { flexDirection: "row", gap: 4 },
  actionBtn: { padding: 8 },
  divider: { height: 1, marginBottom: 12 },
  tipsRow: { alignItems: "center", marginBottom: 10 },
  tipItem: { flex: 1, alignItems: "center" },
  tipSep: { width: 1, height: 28 },
  tipLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 3 },
  tipValue: { fontSize: 14, fontFamily: "Inter_700Bold" },
  shareRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  shareBar: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  shareFill: { height: "100%", borderRadius: 2 },
  shareText: { fontSize: 11, fontFamily: "Inter_500Medium", minWidth: 32, textAlign: "right" },
});
