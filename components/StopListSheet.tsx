import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StopListItem, getLocalizedStockItem, useBoniface } from "@/context/BonifaceContext";
import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function StopListSheet({ visible, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tr } = useLang();
  const { stopList, stockItems, addToStopList, removeFromStopList, clearStopList } = useBoniface();

  const [addMode, setAddMode] = useState(false);
  const [customName, setCustomName] = useState("");
  const [reason, setReason] = useState("");
  const [showStockPicker, setShowStockPicker] = useState(false);

  const handleAddCustom = async () => {
    if (!customName.trim()) return;
    await addToStopList(customName.trim(), reason.trim() || undefined);
    setCustomName("");
    setReason("");
    setAddMode(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleAddFromStock = async (stockId: string) => {
    const raw = stockItems.find((s) => s.id === stockId);
    if (!raw) return;
    const loc = getLocalizedStockItem(raw, tr);
    await addToStopList(loc.name, tr.stopList.reasonOutOfStock);
    setShowStockPicker(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const displayStopName = (name: string) => {
    const raw = stockItems.find((s) => s.name === name);
    if (raw) return getLocalizedStockItem(raw, tr).name;
    const seedHit = Object.entries(tr.seedStock ?? {}).find(
      ([, v]) => v.name === name
    );
    if (seedHit) {
      const byId = stockItems.find((s) => s.id === seedHit[0]);
      if (byId) return getLocalizedStockItem(byId, tr).name;
      return (tr.seedStock as Record<string, { name: string; unit: string }> | undefined)?.[seedHit[0]]?.name ?? name;
    }
    // Match stored Russian/English seed names to current language
    for (const [id, seed] of Object.entries(tr.seedStock ?? {})) {
      void seed;
      const rawById = stockItems.find((s) => s.id === id);
      if (rawById && (rawById.name === name || getLocalizedStockItem(rawById, tr).name === name)) {
        return getLocalizedStockItem(rawById, tr).name;
      }
    }
    return name;
  };

  const handleRemove = (item: StopListItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    removeFromStopList(item.id);
  };

  const handleClearAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(tr.stopList.clearTitle, tr.stopList.clearMsg, [
      { text: tr.team.cancel, style: "cancel" },
      { text: tr.stopList.clear, style: "destructive", onPress: () => { clearStopList(); } },
    ]);
  };

  const alreadyStopped = new Set(stopList.map((i) => i.name));
  const availableStock = stockItems
    .map((s) => getLocalizedStockItem(s, tr))
    .filter((s) => !alreadyStopped.has(s.name) && !alreadyStopped.has(stockItems.find((r) => r.id === s.id)?.name ?? ""));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.dismiss} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIcon, { backgroundColor: "#EF444422" }]}>
                <Feather name="slash" size={18} color="#EF4444" />
              </View>
              <View>
                <Text style={[styles.title, { color: colors.foreground }]}>{tr.stopList.title}</Text>
                <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                  {stopList.length > 0 ? tr.stopList.countUnavailable(stopList.length) : tr.stopList.emptyList}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {stopList.length === 0 && !addMode && (
              <View style={styles.emptyState}>
                <Feather name="check-circle" size={36} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{tr.stopList.allAvailable}</Text>
                <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>{tr.stopList.emptySub}</Text>
              </View>
            )}

            {stopList.map((item) => (
              <View key={item.id} style={[styles.stopItem, { backgroundColor: "#EF444410", borderColor: "#EF444433" }]}>
                <View style={styles.stopLeft}>
                  <View style={[styles.stopDot, { backgroundColor: "#EF4444" }]} />
                  <View>
                    <Text style={[styles.stopName, { color: colors.foreground }]}>{displayStopName(item.name)}</Text>
                    {item.reason ? (
                      <Text style={[styles.stopReason, { color: colors.mutedForeground }]}>{item.reason}</Text>
                    ) : null}
                  </View>
                </View>
                <TouchableOpacity onPress={() => handleRemove(item)} style={styles.removeBtn}>
                  <Feather name="x" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            ))}

            {addMode && (
              <View style={[styles.addForm, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>{tr.stopList.itemLabel}</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                  placeholder={tr.stopList.namePlaceholder}
                  placeholderTextColor={colors.mutedForeground}
                  value={customName}
                  onChangeText={setCustomName}
                  autoFocus
                />
                <Text style={[styles.formLabel, { color: colors.mutedForeground, marginTop: 10 }]}>{tr.stopList.reasonLabel}</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                  placeholder={tr.stopList.reasonPlaceholder}
                  placeholderTextColor={colors.mutedForeground}
                  value={reason}
                  onChangeText={setReason}
                />
                <View style={styles.formBtns}>
                  <TouchableOpacity style={[styles.formBtn, { borderColor: colors.border }]} onPress={() => { setAddMode(false); setCustomName(""); setReason(""); }}>
                    <Text style={[styles.formBtnText, { color: colors.mutedForeground }]}>{tr.team.cancel}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.formBtn, styles.formBtnPrimary, { backgroundColor: customName.trim() ? "#EF4444" : colors.border }]}
                    onPress={handleAddCustom}
                    disabled={!customName.trim()}
                  >
                    <Text style={[styles.formBtnText, { color: "#fff" }]}>{tr.team.addBtn}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {showStockPicker && (
              <View style={[styles.stockPicker, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>{tr.stopList.selectFromStock}</Text>
                {availableStock.length === 0 ? (
                  <Text style={[styles.emptySub, { color: colors.mutedForeground, textAlign: "left" }]}>{tr.stopList.allInStopList}</Text>
                ) : (
                  availableStock.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.stockRow, { borderColor: colors.border }]}
                      onPress={() => handleAddFromStock(s.id)}
                    >
                      <Text style={[styles.stockName, { color: colors.foreground }]}>{s.name}</Text>
                      <Feather name="plus" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  ))
                )}
                <TouchableOpacity style={styles.closePickerBtn} onPress={() => setShowStockPicker(false)}>
                  <Text style={[styles.closePickerText, { color: colors.mutedForeground }]}>{tr.stopList.close}</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={{ height: 8 }} />
          </ScrollView>

          <View style={styles.footer}>
            {stopList.length > 0 && (
              <TouchableOpacity
                style={[styles.footerBtn, { borderColor: "#EF444444", backgroundColor: "#EF444411" }]}
                onPress={handleClearAll}
              >
                <Feather name="trash-2" size={15} color="#EF4444" />
                <Text style={[styles.footerBtnText, { color: "#EF4444" }]}>{tr.stopList.clearAll}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.footerBtn, { borderColor: colors.border, backgroundColor: colors.secondary }]}
              onPress={() => { setShowStockPicker(!showStockPicker); setAddMode(false); }}
            >
              <Feather name="layers" size={15} color={colors.mutedForeground} />
              <Text style={[styles.footerBtnText, { color: colors.mutedForeground }]}>{tr.stopList.fromStock}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerBtn, styles.footerBtnAdd, { backgroundColor: "#EF4444" }]}
              onPress={() => { setAddMode(!addMode); setShowStockPicker(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <Feather name="plus" size={15} color="#fff" />
              <Text style={[styles.footerBtnText, { color: "#fff" }]}>{tr.team.addBtn}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  dismiss: { flex: 1 },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "85%" },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 12, marginBottom: 4 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  body: { paddingHorizontal: 20, maxHeight: 380 },
  emptyState: { alignItems: "center", paddingVertical: 32, gap: 8 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  stopItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  stopLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  stopDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  stopName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  stopReason: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  removeBtn: { padding: 4 },
  addForm: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 12 },
  formLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.6, marginBottom: 6 },
  formInput: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_400Regular", borderWidth: 1 },
  formBtns: { flexDirection: "row", gap: 8, marginTop: 12 },
  formBtn: { flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: "center", borderWidth: 1 },
  formBtnPrimary: { borderWidth: 0 },
  formBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  stockPicker: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 12 },
  stockRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  stockName: { fontSize: 14, fontFamily: "Inter_400Regular" },
  closePickerBtn: { paddingTop: 10, alignItems: "center" },
  closePickerText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  footer: { flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingTop: 12 },
  footerBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  footerBtnAdd: { borderWidth: 0 },
  footerBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
