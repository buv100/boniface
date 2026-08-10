import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BevCostSheet } from "@/components/BevCostSheet";
import { HappyHourSheet } from "@/components/HappyHourSheet";
import { InventorySheet } from "@/components/InventorySheet";
import { StopListSheet } from "@/components/StopListSheet";
import { WriteOffSheet } from "@/components/WriteOffSheet";
import {
  StockCategory,
  StockItem,
  StockSubCategory,
  getLocalizedStockItem,
  useBoniface,
} from "@/context/BonifaceContext";
import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";

const ALL_CATEGORIES: StockCategory[] = ["spirits", "wine", "beer", "mixers", "garnish", "supplies"];
const ALL_SUBCATEGORIES: StockSubCategory[] = ["display", "speedbar", "storage", "custom"];

const CATEGORY_COLORS: Record<StockCategory, string> = {
  spirits: "#F59E0B",
  wine: "#EF4444",
  beer: "#F97316",
  mixers: "#3B82F6",
  garnish: "#10B981",
  supplies: "#8B5CF6",
};

function StockLevelBar({ item, colors, lowLabel }: { item: StockItem; colors: ReturnType<typeof useColors>; lowLabel: string }) {
  const ratio = item.minQuantity > 0 ? Math.min(item.quantity / item.minQuantity, 2) : 1;
  const isLow = item.quantity < item.minQuantity;
  const isOk = item.quantity >= item.minQuantity && item.quantity < item.minQuantity * 1.5;
  const barColor = isLow ? colors.destructive : isOk ? colors.warning : colors.success;
  const fillWidth = Math.min(ratio / 2, 1) * 100;

  return (
    <View style={barStyles.container}>
      <View style={[barStyles.track, { backgroundColor: colors.border }]}>
        <View style={[barStyles.fill, { width: `${fillWidth}%` as any, backgroundColor: barColor }]} />
      </View>
      {isLow && (
        <View style={[barStyles.badge, { backgroundColor: colors.destructive + "22" }]}>
          <Text style={[barStyles.badgeText, { color: colors.destructive }]}>{lowLabel}</Text>
        </View>
      )}
    </View>
  );
}

const barStyles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  track: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 2 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
});

export default function BarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tr } = useLang();
  const { stockItems, updateStockQuantity, updateStockItem, addStockItem, deleteStockItem, lowStockCount, stopList, writeOffs, isHappyHourActive, activeHappyHour } = useBoniface();

  const [selectedCat, setSelectedCat] = useState<StockCategory | "all">("all");
  const [selectedSub, setSelectedSub] = useState<StockSubCategory | "all">("all");
  const [sortByLow, setSortByLow] = useState(false);

  const [stopListVisible, setStopListVisible] = useState(false);
  const [writeOffVisible, setWriteOffVisible] = useState(false);
  const [bevCostVisible, setBevCostVisible] = useState(false);
  const [happyHourVisible, setHappyHourVisible] = useState(false);
  const [inventoryVisible, setInventoryVisible] = useState(false);

  const [addModal, setAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCat, setNewCat] = useState<StockCategory>("spirits");
  const [newSub, setNewSub] = useState<StockSubCategory | undefined>(undefined);
  const [newQty, setNewQty] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newMin, setNewMin] = useState("");

  const [editModal, setEditModal] = useState(false);
  const [editItem, setEditItem] = useState<StockItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editCat, setEditCat] = useState<StockCategory>("spirits");
  const [editSub, setEditSub] = useState<StockSubCategory | undefined>(undefined);
  const [editUnit, setEditUnit] = useState("");
  const [editMin, setEditMin] = useState("");
  const [editExpiry, setEditExpiry] = useState("");

  const [qtyModal, setQtyModal] = useState(false);
  const [qtyItem, setQtyItem] = useState<StockItem | null>(null);
  const [qtyInput, setQtyInput] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : 84 + insets.bottom;
  const modalInsets = useSafeAreaInsets();

  const filtered = stockItems
    .filter((i) => selectedCat === "all" || i.category === selectedCat)
    .filter((i) => selectedSub === "all" || i.subCategory === selectedSub)
    .sort((a, b) => {
      if (sortByLow) {
        const aLow = a.quantity < a.minQuantity ? 0 : 1;
        const bLow = b.quantity < b.minQuantity ? 0 : 1;
        return aLow - bLow;
      }
      return 0;
    })
    .map((i) => getLocalizedStockItem(i, tr));

  const lowItems = stockItems.filter((i) => i.quantity < i.minQuantity);

  const openEdit = (item: StockItem) => {
    const loc = getLocalizedStockItem(item, tr);
    setEditItem(item);
    setEditName(loc.name);
    setEditCat(item.category);
    setEditSub(item.subCategory);
    setEditUnit(loc.unit);
    setEditMin(item.minQuantity.toString());
    setEditExpiry(item.expiryDate ?? "");
    setEditModal(true);
    Haptics.selectionAsync();
  };

  const openQtyModal = (item: StockItem) => {
    setQtyItem(item);
    setQtyInput(item.quantity.toString());
    setQtyModal(true);
    Haptics.selectionAsync();
  };

  const handleDelete = (item: StockItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(tr.bar.deleteTitle, item.name, [
      { text: tr.bar.cancel, style: "cancel" },
      { text: tr.bar.saveBtn, style: "destructive", onPress: () => deleteStockItem(item.id) },
    ]);
  };

  const handleAddItem = async () => {
    if (!newName.trim() || !newQty || !newMin) return;
    await addStockItem({
      name: newName.trim(),
      category: newCat,
      quantity: parseFloat(newQty) || 0,
      unit: newUnit || tr.bar.unitPlaceholder,
      minQuantity: parseFloat(newMin) || 1,
      subCategory: newSub,
    });
    setNewName(""); setNewQty(""); setNewUnit(""); setNewMin("");
    setNewSub(undefined);
    setAddModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleSaveEdit = async () => {
    if (!editItem || !editName.trim()) return;
    await updateStockItem(editItem.id, {
      name: editName.trim(),
      category: editCat,
      unit: editUnit || tr.bar.unitPlaceholder,
      minQuantity: parseFloat(editMin) || 1,
      expiryDate: editExpiry.trim() || undefined,
      subCategory: editSub,
    });
    setEditModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const getExpiryStatus = (expiryDate: string | undefined): "expired" | "soon" | "ok" | null => {
    if (!expiryDate) return null;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return "expired";
    if (diffDays <= 7) return "soon";
    return "ok";
  };

  const handleSetQty = async () => {
    if (!qtyItem) return;
    const val = parseFloat(qtyInput);
    if (!isNaN(val) && val >= 0) {
      const delta = val - qtyItem.quantity;
      await updateStockQuantity(qtyItem.id, delta);
    }
    setQtyModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const renderItem = ({ item }: { item: StockItem }) => {
    const catColor = CATEGORY_COLORS[item.category];
    const isLow = item.quantity < item.minQuantity;
    const expiryStatus = getExpiryStatus(item.expiryDate);
    const expiryColor = expiryStatus === "expired" ? colors.destructive : "#F97316";
    const hasExpiryWarning = expiryStatus === "expired" || expiryStatus === "soon";
    return (
      <View style={[styles.itemCard, {
        backgroundColor: colors.card,
        borderColor: hasExpiryWarning ? expiryColor + "55" : isLow ? colors.destructive + "44" : colors.border
      }]}>
        <View style={styles.itemTop}>
          <View style={styles.itemLeft}>
            <View style={[styles.catDot, { backgroundColor: catColor }]} />
            <View style={styles.itemInfo}>
              <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
              <View style={styles.itemSubRow}>
                <Text style={[styles.itemCat, { color: colors.mutedForeground }]}>
                  {tr.categories[item.category]}
                  {item.subCategory ? ` · ${tr.subCategories[item.subCategory]}` : ""}
                </Text>
                {hasExpiryWarning && (
                  <View style={[styles.expiryBadge, { backgroundColor: expiryColor + "22" }]}>
                    <Feather name="clock" size={9} color={expiryColor} />
                    <Text style={[styles.expiryText, { color: expiryColor }]}>
                      {expiryStatus === "expired" ? tr.bar.expired : tr.bar.expiringSoon}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
          <View style={styles.itemRight}>
            <View style={styles.qtyRow}>
              <TouchableOpacity
                style={[styles.qtyBtn, { backgroundColor: colors.secondary }]}
                onPress={() => { updateStockQuantity(item.id, -1); Haptics.selectionAsync(); }}
              >
                <Feather name="minus" size={14} color={colors.foreground} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.qtyVal} onPress={() => openQtyModal(item)}>
                <Text style={[styles.qtyNum, { color: isLow ? colors.destructive : colors.foreground }]}>
                  {item.quantity}
                </Text>
                <Text style={[styles.qtyUnit, { color: colors.mutedForeground }]}>{item.unit}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.qtyBtn, { backgroundColor: colors.secondary }]}
                onPress={() => { updateStockQuantity(item.id, 1); Haptics.selectionAsync(); }}
              >
                <Feather name="plus" size={14} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => openEdit(item)} style={styles.iconBtn}>
              <Feather name="edit-2" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item)} style={styles.iconBtn}>
              <Feather name="trash-2" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>
        <StockLevelBar item={item} colors={colors} lowLabel={tr.bar.lowBadge} />
      </View>
    );
  };

  const FormField = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <View style={styles.formField}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      {children}
    </View>
  );

  const CatPicker = ({ value, onChange }: { value: StockCategory; onChange: (c: StockCategory) => void }) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }} contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
      {ALL_CATEGORIES.map((cat) => (
        <TouchableOpacity
          key={cat}
          style={[styles.catChip, { backgroundColor: value === cat ? colors.primary + "22" : colors.secondary, borderColor: value === cat ? colors.primary : colors.border }]}
          onPress={() => onChange(cat)}
        >
          <Text style={[styles.catChipText, { color: value === cat ? colors.primary : colors.mutedForeground }]}>
            {tr.categories[cat]}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const SubCatPicker = ({
    value,
    onChange,
  }: {
    value: StockSubCategory | undefined;
    onChange: (c: StockSubCategory | undefined) => void;
  }) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }} contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
      <TouchableOpacity
        style={[
          styles.catChip,
          {
            backgroundColor: value === undefined ? colors.primary + "22" : colors.secondary,
            borderColor: value === undefined ? colors.primary : colors.border,
          },
        ]}
        onPress={() => onChange(undefined)}
      >
        <Text
          style={[
            styles.catChipText,
            { color: value === undefined ? colors.primary : colors.mutedForeground },
          ]}
        >
          {tr.bar.subCategoryNone}
        </Text>
      </TouchableOpacity>
      {ALL_SUBCATEGORIES.map((sub) => (
        <TouchableOpacity
          key={sub}
          style={[
            styles.catChip,
            {
              backgroundColor: value === sub ? colors.primary + "22" : colors.secondary,
              borderColor: value === sub ? colors.primary : colors.border,
            },
          ]}
          onPress={() => onChange(sub)}
        >
          <Text
            style={[
              styles.catChipText,
              { color: value === sub ? colors.primary : colors.mutedForeground },
            ]}
          >
            {tr.subCategories[sub]}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { paddingTop: topPad + 8, paddingBottom: bottomPad }]}
        ListHeaderComponent={
          <>
            <View style={styles.pageHeader}>
              <View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={[styles.pageTitle, { color: colors.foreground }]}>{tr.bar.title}</Text>
                  {isHappyHourActive && activeHappyHour && (
                    <View style={[styles.hhBadge, { backgroundColor: "#10B98122", borderColor: "#10B98155" }]}>
                      <Feather name="clock" size={11} color="#10B981" />
                      <Text style={styles.hhBadgeText}>
                        {tr.bar.happyHourActive(activeHappyHour.discountPercent)}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.pageSubtitle, { color: colors.mutedForeground }]}>
                  {tr.bar.positions(stockItems.length)}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.sortBtn,
                  { backgroundColor: sortByLow ? colors.destructive + "18" : colors.card, borderColor: sortByLow ? colors.destructive + "44" : colors.border }
                ]}
                onPress={() => setSortByLow((v) => !v)}
              >
                <Feather name="alert-triangle" size={14} color={sortByLow ? colors.destructive : colors.mutedForeground} />
                <Text style={[styles.sortBtnText, { color: sortByLow ? colors.destructive : colors.mutedForeground }]}>
                  {sortByLow ? tr.bar.byShortage : tr.bar.sortLabel}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: "#EF444414", borderColor: "#EF444433" }]}
                onPress={() => { setStopListVisible(true); Haptics.selectionAsync(); }}
              >
                <Feather name="slash" size={14} color="#EF4444" />
                <Text style={[styles.actionBtnText, { color: "#EF4444" }]}>
                  {tr.bar.stopList}{stopList.length > 0 ? ` (${stopList.length})` : ""}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: "#F59E0B14", borderColor: "#F59E0B33" }]}
                onPress={() => { setBevCostVisible(true); Haptics.selectionAsync(); }}
              >
                <Feather name="percent" size={14} color="#F59E0B" />
                <Text style={[styles.actionBtnText, { color: "#F59E0B" }]}>{tr.bar.bevCost}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: "#8B5CF614", borderColor: "#8B5CF633" }]}
                onPress={() => { setWriteOffVisible(true); Haptics.selectionAsync(); }}
              >
                <Feather name="minus-circle" size={14} color="#8B5CF6" />
                <Text style={[styles.actionBtnText, { color: "#8B5CF6" }]}>
                  {tr.bar.writeOffs}{writeOffs.length > 0 ? ` (${writeOffs.length})` : ""}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: isHappyHourActive ? "#10B98114" : "#38BDF814",
                    borderColor: isHappyHourActive ? "#10B98133" : "#38BDF833",
                  },
                ]}
                onPress={() => { setHappyHourVisible(true); Haptics.selectionAsync(); }}
              >
                <Feather name="clock" size={14} color={isHappyHourActive ? "#10B981" : "#38BDF8"} />
                <Text style={[styles.actionBtnText, { color: isHappyHourActive ? "#10B981" : "#38BDF8" }]}>
                  {tr.bar.happyHour}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: "#14B8A614", borderColor: "#14B8A633" }]}
                onPress={() => { setInventoryVisible(true); Haptics.selectionAsync(); }}
              >
                <Feather name="clipboard" size={14} color="#14B8A6" />
                <Text style={[styles.actionBtnText, { color: "#14B8A6" }]}>{tr.bar.inventory}</Text>
              </TouchableOpacity>
            </View>

            {lowItems.length > 0 && (
              <TouchableOpacity
                style={[styles.alertCard, { backgroundColor: colors.destructive + "12", borderColor: colors.destructive + "33" }]}
                onPress={() => { setSortByLow(true); setSelectedCat("all"); }}
                activeOpacity={0.8}
              >
                <View style={[styles.alertIconBox, { backgroundColor: colors.destructive + "22" }]}>
                  <Feather name="alert-triangle" size={18} color={colors.destructive} />
                </View>
                <View style={styles.alertContent}>
                  <Text style={[styles.alertTitle, { color: colors.destructive }]}>
                    {tr.bar.lowAlert(lowItems.length)}
                  </Text>
                  <Text style={[styles.alertSub, { color: colors.destructive + "bb" }]} numberOfLines={1}>
                    {lowItems.map((i) => i.name).join(", ")}
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.destructive} />
              </TouchableOpacity>
            )}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={styles.catContent}>
              <TouchableOpacity
                style={[styles.catChip, { backgroundColor: selectedCat === "all" ? colors.primary : colors.card, borderColor: selectedCat === "all" ? colors.primary : colors.border }]}
                onPress={() => setSelectedCat("all")}
              >
                <Text style={[styles.catChipText, { color: selectedCat === "all" ? colors.primaryForeground : colors.mutedForeground }]}>
                  {tr.bar.allFilter}
                </Text>
              </TouchableOpacity>
              {ALL_CATEGORIES.map((cat) => {
                const active = selectedCat === cat;
                const catColor = CATEGORY_COLORS[cat];
                const catLow = stockItems.filter((i) => i.category === cat && i.quantity < i.minQuantity).length;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catChip, { backgroundColor: active ? catColor + "22" : colors.card, borderColor: active ? catColor : colors.border }]}
                    onPress={() => setSelectedCat(cat)}
                  >
                    <Text style={[styles.catChipText, { color: active ? catColor : colors.mutedForeground }]}>
                      {tr.categories[cat]}
                    </Text>
                    {catLow > 0 && (
                      <View style={[styles.catBadge, { backgroundColor: colors.destructive }]}>
                        <Text style={styles.catBadgeText}>{catLow}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subScroll} contentContainerStyle={styles.catContent}>
              <TouchableOpacity
                style={[
                  styles.catChip,
                  {
                    backgroundColor: selectedSub === "all" ? colors.primary + "22" : colors.card,
                    borderColor: selectedSub === "all" ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setSelectedSub("all")}
              >
                <Text
                  style={[
                    styles.catChipText,
                    { color: selectedSub === "all" ? colors.primary : colors.mutedForeground },
                  ]}
                >
                  {tr.bar.allFilter}
                </Text>
              </TouchableOpacity>
              {ALL_SUBCATEGORIES.map((sub) => {
                const active = selectedSub === sub;
                return (
                  <TouchableOpacity
                    key={sub}
                    style={[
                      styles.catChip,
                      {
                        backgroundColor: active ? "#14B8A622" : colors.card,
                        borderColor: active ? "#14B8A6" : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedSub(sub)}
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        { color: active ? "#14B8A6" : colors.mutedForeground },
                      ]}
                    >
                      {tr.subCategories[sub]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: bottomPad - 44 }]}
        onPress={() => { setAddModal(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
      >
        <Feather name="plus" size={24} color={colors.primaryForeground} />
      </TouchableOpacity>

      {/* Add item modal */}
      <Modal visible={addModal} transparent animationType="slide" onRequestClose={() => setAddModal(false)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.overlayDismiss} activeOpacity={1} onPress={() => setAddModal(false)} />
          <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: Math.max(modalInsets.bottom, 20) }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{tr.bar.addTitle}</Text>
              <TouchableOpacity onPress={() => setAddModal(false)}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sheetBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <FormField label={tr.bar.nameLabel}>
                <TextInput
                  style={[styles.fieldInput, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
                  placeholder={tr.bar.namePlaceholder}
                  placeholderTextColor={colors.mutedForeground}
                  value={newName}
                  onChangeText={setNewName}
                  autoFocus
                />
              </FormField>
              <FormField label={tr.bar.categoryLabel}>
                <CatPicker value={newCat} onChange={setNewCat} />
              </FormField>
              <FormField label={tr.bar.subCategoryLabel}>
                <SubCatPicker value={newSub} onChange={setNewSub} />
              </FormField>
              <View style={styles.fieldRow}>
                <View style={styles.fieldHalf}>
                  <FormField label={tr.bar.qtyLabel}>
                    <TextInput
                      style={[styles.fieldInput, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
                      placeholder="0"
                      placeholderTextColor={colors.mutedForeground}
                      value={newQty}
                      onChangeText={setNewQty}
                      keyboardType="numeric"
                    />
                  </FormField>
                </View>
                <View style={styles.fieldHalf}>
                  <FormField label={tr.bar.unitLabel}>
                    <TextInput
                      style={[styles.fieldInput, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
                      placeholder={tr.bar.unitPlaceholder}
                      placeholderTextColor={colors.mutedForeground}
                      value={newUnit}
                      onChangeText={setNewUnit}
                    />
                  </FormField>
                </View>
              </View>
              <FormField label={tr.bar.minThresholdLabel}>
                <TextInput
                  style={[styles.fieldInput, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
                  placeholder={tr.bar.minPlaceholder}
                  placeholderTextColor={colors.mutedForeground}
                  value={newMin}
                  onChangeText={setNewMin}
                  keyboardType="numeric"
                />
              </FormField>
              <View style={{ height: 12 }} />
            </ScrollView>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: newName.trim() ? colors.primary : colors.border, marginHorizontal: 20 }]}
              onPress={handleAddItem}
              disabled={!newName.trim()}
            >
              <Text style={[styles.saveBtnText, { color: newName.trim() ? colors.primaryForeground : colors.mutedForeground }]}>
                {tr.bar.addBtn}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit item modal */}
      <Modal visible={editModal} transparent animationType="slide" onRequestClose={() => setEditModal(false)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.overlayDismiss} activeOpacity={1} onPress={() => setEditModal(false)} />
          <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: Math.max(modalInsets.bottom, 20) }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{tr.bar.editTitle}</Text>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sheetBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <FormField label={tr.bar.nameLabel}>
                <TextInput
                  style={[styles.fieldInput, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
                  placeholder={tr.bar.namePlaceholderEdit}
                  placeholderTextColor={colors.mutedForeground}
                  value={editName}
                  onChangeText={setEditName}
                  autoFocus
                />
              </FormField>
              <FormField label={tr.bar.categoryLabel}>
                <CatPicker value={editCat} onChange={setEditCat} />
              </FormField>
              <FormField label={tr.bar.subCategoryLabel}>
                <SubCatPicker value={editSub} onChange={setEditSub} />
              </FormField>
              <View style={styles.fieldRow}>
                <View style={styles.fieldHalf}>
                  <FormField label={tr.bar.unitLabel}>
                    <TextInput
                      style={[styles.fieldInput, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
                      placeholder={tr.bar.unitPlaceholder}
                      placeholderTextColor={colors.mutedForeground}
                      value={editUnit}
                      onChangeText={setEditUnit}
                    />
                  </FormField>
                </View>
                <View style={styles.fieldHalf}>
                  <FormField label={tr.bar.minLabel}>
                    <TextInput
                      style={[styles.fieldInput, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
                      placeholder={tr.bar.thresholdPlaceholder}
                      placeholderTextColor={colors.mutedForeground}
                      value={editMin}
                      onChangeText={setEditMin}
                      keyboardType="numeric"
                    />
                  </FormField>
                </View>
              </View>
              {editCat === "beer" && (
                <FormField label={tr.bar.expiryLabel}>
                  <TextInput
                    style={[styles.fieldInput, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
                    placeholder="2025-12-31"
                    placeholderTextColor={colors.mutedForeground}
                    value={editExpiry}
                    onChangeText={setEditExpiry}
                  />
                </FormField>
              )}
              <View style={{ height: 12 }} />
            </ScrollView>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: editName.trim() ? colors.primary : colors.border, marginHorizontal: 20 }]}
              onPress={handleSaveEdit}
              disabled={!editName.trim()}
            >
              <Text style={[styles.saveBtnText, { color: editName.trim() ? colors.primaryForeground : colors.mutedForeground }]}>
                {tr.bar.saveBtn}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <StopListSheet visible={stopListVisible} onClose={() => setStopListVisible(false)} />
      <WriteOffSheet visible={writeOffVisible} onClose={() => setWriteOffVisible(false)} />
      <BevCostSheet visible={bevCostVisible} onClose={() => setBevCostVisible(false)} />
      <HappyHourSheet visible={happyHourVisible} onClose={() => setHappyHourVisible(false)} />
      <InventorySheet visible={inventoryVisible} onClose={() => setInventoryVisible(false)} />

      {/* Set quantity modal */}
      <Modal visible={qtyModal} transparent animationType="fade" onRequestClose={() => setQtyModal(false)}>
        <View style={styles.qtyOverlay}>
          <TouchableOpacity style={styles.overlayDismiss} activeOpacity={1} onPress={() => setQtyModal(false)} />
          <View style={[styles.qtySheet, { backgroundColor: colors.card }]}>
            <Text style={[styles.qtySheetTitle, { color: colors.foreground }]}>
              {qtyItem?.name}
            </Text>
            <Text style={[styles.qtySheetSub, { color: colors.mutedForeground }]}>
              {tr.bar.setQtyTitle(qtyItem?.unit ?? "")}
            </Text>
            <TextInput
              style={[styles.qtyBigInput, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
              value={qtyInput}
              onChangeText={setQtyInput}
              keyboardType="numeric"
              autoFocus
              selectTextOnFocus
              returnKeyType="done"
              onSubmitEditing={handleSetQty}
            />
            <View style={styles.qtyBtnRow}>
              <TouchableOpacity
                style={[styles.qtyCancel, { borderColor: colors.border }]}
                onPress={() => setQtyModal(false)}
              >
                <Text style={[styles.qtyCancelText, { color: colors.mutedForeground }]}>{tr.bar.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.qtyConfirm, { backgroundColor: colors.primary }]}
                onPress={handleSetQty}
              >
                <Text style={[styles.qtyConfirmText, { color: colors.primaryForeground }]}>{tr.bar.set}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: 16 },
  pageHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12, paddingTop: 8 },
  pageTitle: { fontSize: 26, fontFamily: "Inter_700Bold" },
  pageSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  hhBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  hhBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#10B981" },
  sortBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  sortBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  alertCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 14 },
  alertIconBox: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  alertContent: { flex: 1, gap: 2 },
  alertTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  alertSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  catScroll: { marginBottom: 8 },
  subScroll: { marginBottom: 16 },
  catContent: { gap: 8, paddingRight: 4 },
  catChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  catChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  catBadge: { width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  catBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#fff" },
  itemCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
  itemTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  itemLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  itemInfo: { flex: 1 },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  actionBtn: { flexGrow: 1, flexBasis: "45%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
  actionBtnText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  itemSubRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  itemName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  itemCat: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  expiryBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  expiryText: { fontSize: 9, fontFamily: "Inter_600SemiBold" },
  itemRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  qtyBtn: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  qtyVal: { paddingHorizontal: 6, alignItems: "center", minWidth: 40 },
  qtyNum: { fontSize: 15, fontFamily: "Inter_700Bold", textAlign: "center" },
  qtyUnit: { fontSize: 9, fontFamily: "Inter_400Regular", textAlign: "center" },
  iconBtn: { padding: 6 },
  fab: { position: "absolute", right: 20, width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", shadowColor: "#F59E0B", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  overlayDismiss: { flex: 1 },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "85%" },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 12, marginBottom: 8 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  sheetBody: { paddingHorizontal: 20 },
  formField: { marginBottom: 14 },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  fieldInput: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, fontFamily: "Inter_500Medium", borderWidth: 1 },
  fieldRow: { flexDirection: "row", gap: 10 },
  fieldHalf: { flex: 1 },
  saveBtn: { marginTop: 8, marginBottom: 4, borderRadius: 12, paddingVertical: 16, alignItems: "center" },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  qtyOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: 24 },
  qtySheet: { width: "100%", borderRadius: 20, padding: 24, alignItems: "center", gap: 12 },
  qtySheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  qtySheetSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  qtyBigInput: { width: "100%", borderRadius: 14, paddingHorizontal: 20, paddingVertical: 16, fontSize: 28, fontFamily: "Inter_700Bold", textAlign: "center", borderWidth: 1 },
  qtyBtnRow: { flexDirection: "row", gap: 10, width: "100%" },
  qtyCancel: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: "center", borderWidth: 1 },
  qtyCancelText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  qtyConfirm: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  qtyConfirmText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
});
