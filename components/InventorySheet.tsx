import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  StockItem,
  getLocalizedStockItem,
  useBoniface,
} from "@/context/BonifaceContext";
import { todayString } from "@/context/AppContext";
import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";
import { exportInventoryCsv, shareText } from "@/utils/exportCsv";

interface Props {
  visible: boolean;
  onClose: () => void;
}

interface DraftRow {
  id: string;
  fullBottles: number;
  fillPercent: number;
}

function qtyFromDraft(d: DraftRow): number {
  return Math.round((d.fullBottles + d.fillPercent / 100) * 100) / 100;
}

function draftFromQty(quantity: number): Omit<DraftRow, "id"> {
  const fullBottles = Math.max(0, Math.floor(quantity));
  const fillPercent = Math.round(Math.min(100, Math.max(0, (quantity - fullBottles) * 100)));
  return { fullBottles, fillPercent };
}

const BOTTLE_H = 128;
const BOTTLE_W = 44;

function BottleSilhouetteSlider({
  percent,
  onChange,
  liquidColor,
  borderColor,
}: {
  percent: number;
  onChange: (p: number) => void;
  liquidColor: string;
  borderColor: string;
}) {
  const heightRef = useRef(BOTTLE_H);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const setFromY = useCallback((locationY: number) => {
    const h = heightRef.current || BOTTLE_H;
    const clamped = Math.min(h, Math.max(0, locationY));
    const pct = Math.round(((h - clamped) / h) * 100);
    onChangeRef.current(Math.min(100, Math.max(0, pct)));
  }, []);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => setFromY(e.nativeEvent.locationY),
        onPanResponderMove: (e) => setFromY(e.nativeEvent.locationY),
      }),
    [setFromY]
  );

  const onLayout = (e: LayoutChangeEvent) => {
    heightRef.current = e.nativeEvent.layout.height;
  };

  const liquidH = (percent / 100) * BOTTLE_H;

  return (
    <View style={bottleStyles.wrap} {...pan.panHandlers}>
      <View
        onLayout={onLayout}
        style={[
          bottleStyles.bottle,
          { borderColor, height: BOTTLE_H, width: BOTTLE_W },
        ]}
      >
        <View style={[bottleStyles.neck, { borderColor, backgroundColor: borderColor + "22" }]} />
        <View style={bottleStyles.body}>
          <View
            style={[
              bottleStyles.liquid,
              {
                height: liquidH,
                backgroundColor: liquidColor,
              },
            ]}
          />
        </View>
      </View>
      <Text style={[bottleStyles.pct, { color: liquidColor }]}>{percent}%</Text>
    </View>
  );
}

const bottleStyles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 6 },
  bottle: {
    borderWidth: 2,
    borderRadius: 18,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  neck: {
    position: "absolute",
    top: 0,
    alignSelf: "center",
    width: 16,
    height: 18,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    zIndex: 2,
    left: (BOTTLE_W - 16) / 2 - 2,
  },
  body: { flex: 1, justifyContent: "flex-end", overflow: "hidden" },
  liquid: { width: "100%", borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  pct: { fontSize: 12, fontFamily: "Inter_700Bold" },
});

export function InventorySheet({ visible, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tr } = useLang();
  const { stockItems, updateStockItem } = useBoniface();

  const bottleItems = useMemo(
    () =>
      stockItems
        .filter((i) => i.category === "spirits" || i.category === "wine")
        .map((i) => getLocalizedStockItem(i, tr)),
    [stockItems, tr]
  );

  const [drafts, setDrafts] = useState<Record<string, DraftRow>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const next: Record<string, DraftRow> = {};
    for (const item of stockItems.filter(
      (i) => i.category === "spirits" || i.category === "wine"
    )) {
      next[item.id] = { id: item.id, ...draftFromQty(item.quantity) };
    }
    setDrafts(next);
  }, [visible, stockItems]);

  const updateDraft = (id: string, patch: Partial<DraftRow>) => {
    setDrafts((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      return { ...prev, [id]: { ...cur, ...patch } };
    });
  };

  const buildRows = () =>
    bottleItems.map((item) => {
      const d = drafts[item.id] ?? { id: item.id, ...draftFromQty(item.quantity) };
      const qty = qtyFromDraft(d);
      return {
        name: item.name,
        category: tr.categories[item.category],
        quantity: qty.toFixed(2),
        unit: item.unit,
        fillPercent: String(d.fillPercent),
        fullBottles: String(d.fullBottles),
      };
    });

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const item of bottleItems) {
        const d = drafts[item.id];
        if (!d) continue;
        const qty = qtyFromDraft(d);
        if (Math.abs(qty - item.quantity) > 0.001) {
          await updateStockItem(item.id, { quantity: qty });
        }
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleShareText = async () => {
    const date = todayString();
    const lines = [
      `${tr.inventory.shareTitle} · ${date}`,
      "",
      ...buildRows().map(
        (r) =>
          `• ${r.name}: ${r.fullBottles} + ${r.fillPercent}% = ${r.quantity} ${r.unit}`
      ),
    ];
    await shareText(lines.join("\n"), tr.inventory.shareTitle);
    Haptics.selectionAsync();
  };

  const handleShareCsv = async () => {
    await exportInventoryCsv(
      buildRows(),
      `inventory-${todayString()}.csv`,
      [
        tr.inventory.csvName,
        tr.inventory.csvCategory,
        tr.inventory.csvFull,
        tr.inventory.csvFill,
        tr.inventory.csvQty,
        tr.inventory.csvUnit,
      ],
      tr.inventory.shareTitle
    );
    Haptics.selectionAsync();
  };

  const liquidFor = (item: StockItem) =>
    item.category === "wine" ? "#EF4444" : "#F59E0B";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.dismiss} activeOpacity={1} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.foreground }]}>
                {tr.inventory.title}
              </Text>
              <Text style={[styles.sub, { color: colors.mutedForeground }]}>
                {tr.inventory.sub}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={{ paddingBottom: 12 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {bottleItems.length === 0 ? (
              <Text style={[styles.empty, { color: colors.mutedForeground }]}>
                {tr.inventory.empty}
              </Text>
            ) : (
              bottleItems.map((item) => {
                const d = drafts[item.id] ?? {
                  id: item.id,
                  ...draftFromQty(item.quantity),
                };
                const qty = qtyFromDraft(d);
                return (
                  <View
                    key={item.id}
                    style={[
                      styles.row,
                      { backgroundColor: colors.secondary, borderColor: colors.border },
                    ]}
                  >
                    <View style={styles.rowLeft}>
                      <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={2}>
                        {item.name}
                      </Text>
                      <Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>
                        {tr.categories[item.category]} · {qty.toFixed(2)} {item.unit}
                      </Text>
                      <View style={styles.fullRow}>
                        <Text style={[styles.fullLabel, { color: colors.mutedForeground }]}>
                          {tr.inventory.fullBottles}
                        </Text>
                        <TouchableOpacity
                          style={[styles.stepBtn, { backgroundColor: colors.card }]}
                          onPress={() => {
                            updateDraft(item.id, {
                              fullBottles: Math.max(0, d.fullBottles - 1),
                            });
                            Haptics.selectionAsync();
                          }}
                        >
                          <Feather name="minus" size={14} color={colors.foreground} />
                        </TouchableOpacity>
                        <Text style={[styles.fullVal, { color: colors.foreground }]}>
                          {d.fullBottles}
                        </Text>
                        <TouchableOpacity
                          style={[styles.stepBtn, { backgroundColor: colors.card }]}
                          onPress={() => {
                            updateDraft(item.id, { fullBottles: d.fullBottles + 1 });
                            Haptics.selectionAsync();
                          }}
                        >
                          <Feather name="plus" size={14} color={colors.foreground} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <BottleSilhouetteSlider
                      percent={d.fillPercent}
                      onChange={(p) => {
                        updateDraft(item.id, { fillPercent: p });
                      }}
                      liquidColor={liquidFor(item)}
                      borderColor={colors.border}
                    />
                  </View>
                );
              })
            )}
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.shareRow}>
              <TouchableOpacity
                style={[styles.shareBtn, { borderColor: colors.border }]}
                onPress={handleShareText}
              >
                <Feather name="share-2" size={14} color={colors.mutedForeground} />
                <Text style={[styles.shareBtnText, { color: colors.mutedForeground }]}>
                  {tr.inventory.shareText}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.shareBtn, { borderColor: colors.border }]}
                onPress={handleShareCsv}
              >
                <Feather name="download" size={14} color={colors.mutedForeground} />
                <Text style={[styles.shareBtnText, { color: colors.mutedForeground }]}>
                  {tr.inventory.shareCsv}
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[
                styles.saveBtn,
                {
                  backgroundColor:
                    bottleItems.length === 0 || saving ? colors.border : colors.primary,
                },
              ]}
              onPress={handleSave}
              disabled={bottleItems.length === 0 || saving}
            >
              <Feather
                name="check"
                size={18}
                color={
                  bottleItems.length === 0 || saving
                    ? colors.mutedForeground
                    : colors.primaryForeground
                }
              />
              <Text
                style={[
                  styles.saveBtnText,
                  {
                    color:
                      bottleItems.length === 0 || saving
                        ? colors.mutedForeground
                        : colors.primaryForeground,
                  },
                ]}
              >
                {tr.inventory.save}
              </Text>
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
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: "92%" },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 12,
  },
  title: { fontSize: 20, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 4 },
  closeBtn: { padding: 4 },
  body: { paddingHorizontal: 16, maxHeight: 480 },
  empty: {
    textAlign: "center",
    paddingVertical: 40,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  rowLeft: { flex: 1, gap: 6 },
  itemName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  itemMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  fullRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  fullLabel: { fontSize: 11, fontFamily: "Inter_500Medium", flex: 1 },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  fullVal: { fontSize: 16, fontFamily: "Inter_700Bold", minWidth: 24, textAlign: "center" },
  footer: { paddingHorizontal: 20, paddingTop: 8, gap: 10 },
  shareRow: { flexDirection: "row", gap: 8 },
  shareBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  shareBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
  },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_700Bold" },
});
