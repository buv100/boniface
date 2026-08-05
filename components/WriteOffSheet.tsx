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

import { StockItem, useBoniface } from "@/context/BonifaceContext";
import { formatDateRu, todayString } from "@/context/AppContext";
import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function WriteOffSheet({ visible, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tr } = useLang();
  const { stockItems, writeOffs, addWriteOff, deleteWriteOff, updateStockQuantity } = useBoniface();

  const [view, setView] = useState<"list" | "add">("list");
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [customName, setCustomName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [showItemPicker, setShowItemPicker] = useState(false);

  const resetForm = () => {
    setSelectedItem(null);
    setCustomName("");
    setQuantity("1");
    setUnit("");
    setReason("");
    setNotes("");
    setShowItemPicker(false);
  };

  const handleSelectItem = (item: StockItem) => {
    setSelectedItem(item);
    setUnit(item.unit);
    setShowItemPicker(false);
  };

  const handleSubmit = async () => {
    const name = selectedItem ? selectedItem.name : customName.trim();
    if (!name || !reason) return;
    const qty = parseFloat(quantity) || 1;
    await addWriteOff({
      date: todayString(),
      itemId: selectedItem?.id,
      itemName: name,
      quantity: qty,
      unit,
      reason,
      notes: notes.trim() || undefined,
    });
    if (selectedItem) {
      await updateStockQuantity(selectedItem.id, -qty);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    resetForm();
    setView("list");
  };

  const handleDelete = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(tr.writeOff.deleteTitle, undefined, [
      { text: tr.writeOff.deleteCancel, style: "cancel" },
      { text: tr.writeOff.delete, style: "destructive", onPress: () => deleteWriteOff(id) },
    ]);
  };

  const isValid = (selectedItem ? true : customName.trim().length > 0) && reason.length > 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.dismiss} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIcon, { backgroundColor: "#8B5CF622" }]}>
                <Feather name="minus-circle" size={18} color="#8B5CF6" />
              </View>
              <View>
                <Text style={[styles.title, { color: colors.foreground }]}>{tr.writeOff.title}</Text>
                <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                  {writeOffs.length > 0 ? tr.writeOff.records(writeOffs.length) : tr.writeOff.noRecords}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {view === "add" && (
                <TouchableOpacity onPress={() => { setView("list"); resetForm(); }} style={styles.headerBtn}>
                  <Text style={[styles.headerBtnText, { color: colors.mutedForeground }]}>{tr.writeOff.cancel}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>

          {view === "list" ? (
            <>
              <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
                {writeOffs.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Feather name="inbox" size={36} color={colors.mutedForeground} />
                    <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{tr.writeOff.emptyTitle}</Text>
                    <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                      {tr.writeOff.emptySub}
                    </Text>
                  </View>
                ) : (
                  writeOffs.map((wo) => (
                    <View key={wo.id} style={[styles.woCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                      <View style={styles.woTop}>
                        <View style={styles.woLeft}>
                          <Text style={[styles.woName, { color: colors.foreground }]}>{wo.itemName}</Text>
                          <Text style={[styles.woMeta, { color: colors.mutedForeground }]}>
                            {wo.quantity} {wo.unit} · {wo.reason} · {formatDateRu(wo.date)}
                          </Text>
                          {wo.notes ? (
                            <Text style={[styles.woNotes, { color: colors.mutedForeground }]}>{wo.notes}</Text>
                          ) : null}
                        </View>
                        <TouchableOpacity onPress={() => handleDelete(wo.id)} style={styles.woDelete}>
                          <Feather name="trash-2" size={14} color={colors.mutedForeground} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
                <View style={{ height: 8 }} />
              </ScrollView>
              <View style={styles.footer}>
                <TouchableOpacity
                  style={[styles.addBtn, { backgroundColor: "#8B5CF6" }]}
                  onPress={() => { setView("add"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <Feather name="plus" size={18} color="#fff" />
                  <Text style={[styles.addBtnText, { color: "#fff" }]}>{tr.writeOff.newWriteoff}</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <ScrollView style={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{tr.writeOff.itemLabel}</Text>
              <TouchableOpacity
                style={[styles.itemSelector, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                onPress={() => setShowItemPicker(!showItemPicker)}
              >
                <Feather name="layers" size={16} color={colors.mutedForeground} />
                <Text style={[styles.itemSelectorText, { color: selectedItem ? colors.foreground : colors.mutedForeground }]}>
                  {selectedItem ? selectedItem.name : tr.writeOff.selectFromStock}
                </Text>
                <Feather name={showItemPicker ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
              </TouchableOpacity>

              {showItemPicker && (
                <ScrollView style={[styles.picker, { backgroundColor: colors.secondary, borderColor: colors.border }]} nestedScrollEnabled>
                  {stockItems.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.pickerRow, { borderColor: colors.border, backgroundColor: selectedItem?.id === s.id ? colors.primary + "18" : "transparent" }]}
                      onPress={() => handleSelectItem(s)}
                    >
                      <Text style={[styles.pickerName, { color: colors.foreground }]}>{s.name}</Text>
                      <Text style={[styles.pickerQty, { color: colors.mutedForeground }]}>
                        {s.quantity} {s.unit}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {!selectedItem && (
                <>
                  <Text style={[styles.orDivider, { color: colors.mutedForeground }]}>{tr.writeOff.orManual}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
                    placeholder={tr.writeOff.itemLabel}
                    placeholderTextColor={colors.mutedForeground}
                    value={customName}
                    onChangeText={setCustomName}
                  />
                </>
              )}

              {selectedItem && (
                <TouchableOpacity onPress={() => { setSelectedItem(null); setUnit(""); }} style={styles.clearItem}>
                  <Feather name="x" size={13} color={colors.mutedForeground} />
                  <Text style={[styles.clearItemText, { color: colors.mutedForeground }]}>{tr.writeOff.clearSelection}</Text>
                </TouchableOpacity>
              )}

              <View style={styles.row}>
                <View style={styles.half}>
                  <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{tr.writeOff.quantityLabel}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="numeric"
                    selectTextOnFocus
                  />
                </View>
                <View style={styles.half}>
                  <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{tr.writeOff.unitLabel}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
                    value={unit}
                    onChangeText={setUnit}
                    placeholder={tr.writeOff.unitPlaceholder}
                    placeholderTextColor={colors.mutedForeground}
                  />
                </View>
              </View>

              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{tr.writeOff.reasonLabel}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reasonScroll} contentContainerStyle={styles.reasonContent}>
                {tr.writeOffReasons.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.reasonChip, { backgroundColor: reason === r ? "#8B5CF622" : colors.secondary, borderColor: reason === r ? "#8B5CF6" : colors.border }]}
                    onPress={() => setReason(r)}
                  >
                    <Text style={[styles.reasonChipText, { color: reason === r ? "#8B5CF6" : colors.mutedForeground }]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 12 }]}>{tr.writeOff.commentLabel}</Text>
              <TextInput
                style={[styles.input, styles.notesInput, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
                placeholder={tr.writeOff.commentPlaceholder}
                placeholderTextColor={colors.mutedForeground}
                value={notes}
                onChangeText={setNotes}
                multiline
              />

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: isValid ? "#8B5CF6" : colors.border, marginTop: 16 }]}
                onPress={handleSubmit}
                disabled={!isValid}
              >
                <Text style={[styles.submitBtnText, { color: isValid ? "#fff" : colors.mutedForeground }]}>
                  {tr.writeOff.submit}
                </Text>
              </TouchableOpacity>
              <View style={{ height: 16 }} />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  dismiss: { flex: 1 },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "90%" },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 12, marginBottom: 4 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  headerBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  headerBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  body: { paddingHorizontal: 20, maxHeight: 420 },
  emptyState: { alignItems: "center", paddingVertical: 32, gap: 8 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  woCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8 },
  woTop: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  woLeft: { flex: 1 },
  woName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  woMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  woNotes: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2, fontStyle: "italic" },
  woDelete: { padding: 4 },
  footer: { paddingHorizontal: 20, paddingTop: 12 },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14 },
  addBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.6, marginBottom: 6, marginTop: 4 },
  itemSelector: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  itemSelectorText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  picker: { maxHeight: 160, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  pickerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  pickerName: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  pickerQty: { fontSize: 12, fontFamily: "Inter_400Regular" },
  orDivider: { textAlign: "center", fontSize: 12, fontFamily: "Inter_400Regular", marginVertical: 8 },
  clearItem: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 },
  clearItemText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  input: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_400Regular", borderWidth: 1, marginBottom: 8 },
  notesInput: { height: 72, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 10 },
  half: { flex: 1 },
  reasonScroll: { marginBottom: 4 },
  reasonContent: { gap: 8, paddingRight: 4 },
  reasonChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  reasonChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  submitBtn: { borderRadius: 14, paddingVertical: 15, alignItems: "center" },
  submitBtnText: { fontSize: 16, fontFamily: "Inter_700Bold" },
});
