import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CATEGORY_LABELS, StockItem, calcBeverageCost, useBoniface } from "@/context/BonifaceContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  onClose: () => void;
}

type CostTier = "great" | "good" | "high" | "critical";

function getCostTier(pct: number): CostTier {
  if (pct <= 15) return "great";
  if (pct <= 22) return "good";
  if (pct <= 28) return "high";
  return "critical";
}

const TIER_COLORS: Record<CostTier, string> = {
  great: "#10B981",
  good: "#F59E0B",
  high: "#F97316",
  critical: "#EF4444",
};

const TIER_LABELS: Record<CostTier, string> = {
  great: "Отлично",
  good: "Норма",
  high: "Высокий",
  critical: "Критично",
};

interface EditState {
  purchasePrice: string;
  portionsPerUnit: string;
  sellingPrice: string;
}

export function BevCostSheet({ visible, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { stockItems, updateStockItem } = useBoniface();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ purchasePrice: "", portionsPerUnit: "", sellingPrice: "" });
  const [filterSet, setFilterSet] = useState<"all" | "set" | "unset">("all");

  const filtered = stockItems.filter((s) => {
    const hasCost = s.purchasePrice != null && s.portionsPerUnit != null && s.sellingPrice != null;
    if (filterSet === "set") return hasCost;
    if (filterSet === "unset") return !hasCost;
    return true;
  });

  const setItems = stockItems.filter((s) => s.purchasePrice != null && s.portionsPerUnit != null && s.sellingPrice != null);
  const avgCost = setItems.length > 0
    ? setItems.reduce((sum, s) => sum + calcBeverageCost(s.purchasePrice!, s.portionsPerUnit!, s.sellingPrice!), 0) / setItems.length
    : null;

  const openEdit = (item: StockItem) => {
    setEditingId(item.id);
    setEditState({
      purchasePrice: item.purchasePrice?.toString() ?? "",
      portionsPerUnit: item.portionsPerUnit?.toString() ?? "",
      sellingPrice: item.sellingPrice?.toString() ?? "",
    });
    Haptics.selectionAsync();
  };

  const handleSave = async () => {
    if (!editingId) return;
    const pp = parseFloat(editState.purchasePrice);
    const pu = parseFloat(editState.portionsPerUnit);
    const sp = parseFloat(editState.sellingPrice);
    await updateStockItem(editingId, {
      purchasePrice: isNaN(pp) ? undefined : pp,
      portionsPerUnit: isNaN(pu) ? undefined : pu,
      sellingPrice: isNaN(sp) ? undefined : sp,
    });
    setEditingId(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.dismiss} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIcon, { backgroundColor: "#F59E0B22" }]}>
                <Feather name="percent" size={18} color="#F59E0B" />
              </View>
              <View>
                <Text style={[styles.title, { color: colors.foreground }]}>Бевередж кост</Text>
                <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                  {avgCost != null ? `Средний кост: ${avgCost.toFixed(1)}%` : `Настройте цены для расчёта`}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {avgCost != null && (
            <View style={styles.avgBar}>
              <View style={[styles.avgItem, { backgroundColor: "#10B98118", borderColor: "#10B98133" }]}>
                <Text style={[styles.avgLabel, { color: "#10B981" }]}>≤15%</Text>
                <Text style={[styles.avgSub, { color: "#10B981" }]}>Отлично</Text>
              </View>
              <View style={[styles.avgItem, { backgroundColor: "#F59E0B18", borderColor: "#F59E0B33" }]}>
                <Text style={[styles.avgLabel, { color: "#F59E0B" }]}>15–22%</Text>
                <Text style={[styles.avgSub, { color: "#F59E0B" }]}>Норма</Text>
              </View>
              <View style={[styles.avgItem, { backgroundColor: "#F9731618", borderColor: "#F9731633" }]}>
                <Text style={[styles.avgLabel, { color: "#F97316" }]}>22–28%</Text>
                <Text style={[styles.avgSub, { color: "#F97316" }]}>Высокий</Text>
              </View>
              <View style={[styles.avgItem, { backgroundColor: "#EF444418", borderColor: "#EF444433" }]}>
                <Text style={[styles.avgLabel, { color: "#EF4444" }]}>{">"}28%</Text>
                <Text style={[styles.avgSub, { color: "#EF4444" }]}>Критично</Text>
              </View>
            </View>
          )}

          <View style={styles.filterRow}>
            {(["all", "set", "unset"] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterBtn, { backgroundColor: filterSet === f ? colors.primary + "22" : colors.secondary, borderColor: filterSet === f ? colors.primary : colors.border }]}
                onPress={() => setFilterSet(f)}
              >
                <Text style={[styles.filterBtnText, { color: filterSet === f ? colors.primary : colors.mutedForeground }]}>
                  {f === "all" ? "Все" : f === "set" ? "Настроено" : "Без цен"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {filtered.map((item) => {
              const hasCost = item.purchasePrice != null && item.portionsPerUnit != null && item.sellingPrice != null;
              const costPct = hasCost ? calcBeverageCost(item.purchasePrice!, item.portionsPerUnit!, item.sellingPrice!) : null;
              const tier = costPct != null ? getCostTier(costPct) : null;
              const tierColor = tier ? TIER_COLORS[tier] : colors.mutedForeground;
              const isEditing = editingId === item.id;

              return (
                <View key={item.id} style={[styles.card, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                  <View style={styles.cardTop}>
                    <View style={styles.cardLeft}>
                      <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
                      <Text style={[styles.cardCat, { color: colors.mutedForeground }]}>{CATEGORY_LABELS[item.category]}</Text>
                    </View>
                    <View style={styles.cardRight}>
                      {costPct != null ? (
                        <View style={[styles.costBadge, { backgroundColor: tierColor + "22" }]}>
                          <Text style={[styles.costPct, { color: tierColor }]}>{costPct.toFixed(1)}%</Text>
                          <Text style={[styles.costTier, { color: tierColor }]}>{TIER_LABELS[tier!]}</Text>
                        </View>
                      ) : (
                        <Text style={[styles.noCost, { color: colors.mutedForeground }]}>Нет данных</Text>
                      )}
                      <TouchableOpacity onPress={() => isEditing ? setEditingId(null) : openEdit(item)} style={styles.editBtn}>
                        <Feather name={isEditing ? "chevron-up" : "edit-2"} size={14} color={colors.mutedForeground} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {hasCost && !isEditing && (
                    <View style={styles.costDetails}>
                      <Text style={[styles.costDetail, { color: colors.mutedForeground }]}>
                        Закупка: {item.purchasePrice} ₪ · {item.portionsPerUnit} порц. · {(item.purchasePrice! / item.portionsPerUnit!).toFixed(2)} ₪/порц.
                      </Text>
                      <Text style={[styles.costDetail, { color: colors.mutedForeground }]}>
                        Цена продажи: {item.sellingPrice} ₪
                      </Text>
                    </View>
                  )}

                  {isEditing && (
                    <View style={[styles.editForm, { borderTopColor: colors.border }]}>
                      <View style={styles.editRow}>
                        <View style={styles.editField}>
                          <Text style={[styles.editLabel, { color: colors.mutedForeground }]}>ЗАКУПКА (₪/бут.)</Text>
                          <TextInput
                            style={[styles.editInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                            value={editState.purchasePrice}
                            onChangeText={(v) => setEditState((s) => ({ ...s, purchasePrice: v }))}
                            keyboardType="numeric"
                            placeholder="50"
                            placeholderTextColor={colors.mutedForeground}
                          />
                        </View>
                        <View style={styles.editField}>
                          <Text style={[styles.editLabel, { color: colors.mutedForeground }]}>ПОРЦИЙ</Text>
                          <TextInput
                            style={[styles.editInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                            value={editState.portionsPerUnit}
                            onChangeText={(v) => setEditState((s) => ({ ...s, portionsPerUnit: v }))}
                            keyboardType="numeric"
                            placeholder="20"
                            placeholderTextColor={colors.mutedForeground}
                          />
                        </View>
                        <View style={styles.editField}>
                          <Text style={[styles.editLabel, { color: colors.mutedForeground }]}>ЦЕНА (₪)</Text>
                          <TextInput
                            style={[styles.editInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                            value={editState.sellingPrice}
                            onChangeText={(v) => setEditState((s) => ({ ...s, sellingPrice: v }))}
                            keyboardType="numeric"
                            placeholder="25"
                            placeholderTextColor={colors.mutedForeground}
                          />
                        </View>
                      </View>
                      {editState.purchasePrice && editState.portionsPerUnit && editState.sellingPrice && (
                        <View style={[styles.previewBox, { backgroundColor: colors.card }]}>
                          <Text style={[styles.previewText, { color: colors.mutedForeground }]}>
                            Предварительно:{" "}
                            <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold" }}>
                              {calcBeverageCost(
                                parseFloat(editState.purchasePrice) || 0,
                                parseFloat(editState.portionsPerUnit) || 1,
                                parseFloat(editState.sellingPrice) || 1
                              ).toFixed(1)}%
                            </Text>
                          </Text>
                        </View>
                      )}
                      <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave}>
                        <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Сохранить</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
            <View style={{ height: 8 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  dismiss: { flex: 1 },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "92%" },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 12, marginBottom: 4 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  avgBar: { flexDirection: "row", gap: 6, paddingHorizontal: 20, marginBottom: 10 },
  avgItem: { flex: 1, borderRadius: 8, borderWidth: 1, paddingVertical: 6, alignItems: "center" },
  avgLabel: { fontSize: 11, fontFamily: "Inter_700Bold" },
  avgSub: { fontSize: 9, fontFamily: "Inter_500Medium", marginTop: 1 },
  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, marginBottom: 12 },
  filterBtn: { flex: 1, paddingVertical: 7, borderRadius: 10, alignItems: "center", borderWidth: 1 },
  filterBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  body: { paddingHorizontal: 20, maxHeight: 440 },
  card: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardLeft: { flex: 1, marginRight: 8 },
  cardName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  cardCat: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  cardRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  costBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignItems: "center" },
  costPct: { fontSize: 13, fontFamily: "Inter_700Bold" },
  costTier: { fontSize: 9, fontFamily: "Inter_600SemiBold", marginTop: 1 },
  noCost: { fontSize: 12, fontFamily: "Inter_400Regular" },
  editBtn: { padding: 4 },
  costDetails: { marginTop: 6, gap: 2 },
  costDetail: { fontSize: 11, fontFamily: "Inter_400Regular" },
  editForm: { marginTop: 10, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10 },
  editRow: { flexDirection: "row", gap: 8 },
  editField: { flex: 1 },
  editLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 0.4, marginBottom: 4 },
  editInput: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 8, fontSize: 13, fontFamily: "Inter_500Medium", borderWidth: 1, textAlign: "center" },
  previewBox: { borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, marginTop: 8, marginBottom: 6 },
  previewText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  saveBtn: { borderRadius: 10, paddingVertical: 10, alignItems: "center", marginTop: 4 },
  saveBtnText: { fontSize: 14, fontFamily: "Inter_700Bold" },
});
