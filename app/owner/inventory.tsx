import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { OwnerShell } from "@/components/owner/OwnerShell";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";
import { apiCall } from "@/lib/api";
import type { InventoryDepartment, InventoryItem, Supplier } from "@/lib/ownerTypes";

export default function OwnerInventoryScreen() {
  const colors = useColors();
  const { tr } = useLang();
  const { token } = useAuth();
  const [dept, setDept] = useState<InventoryDepartment>("bar");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [unit, setUnit] = useState("pcs");
  const [minQuantity, setMinQuantity] = useState("0");
  const [supplierId, setSupplierId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const [inv, sup] = await Promise.all([
      apiCall<InventoryItem[]>("/owner/inventory", { token }),
      apiCall<Supplier[]>("/owner/suppliers", { token }).catch(() => [] as Supplier[]),
    ]);
    setItems(inv);
    setSuppliers(sup);
  }, [token]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const visible = items.filter((i) => i.department === dept);

  const reset = () => {
    setEditId(null);
    setName("");
    setCategory("");
    setQuantity("0");
    setUnit("pcs");
    setMinQuantity("0");
    setSupplierId(null);
  };

  const save = async () => {
    if (!token || !name.trim()) return;
    const body = {
      name: name.trim(),
      department: dept,
      category: category.trim() || "other",
      quantity: parseFloat(quantity) || 0,
      unit: unit.trim() || "pcs",
      minQuantity: parseFloat(minQuantity) || 0,
      supplierId,
    };
    if (editId) await apiCall(`/owner/inventory/${editId}`, { method: "PATCH", token, body });
    else await apiCall("/owner/inventory", { method: "POST", token, body });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setOpen(false);
    reset();
    await load();
  };

  const del = async (id: string) => {
    if (!token) return;
    await apiCall(`/owner/inventory/${id}`, { method: "DELETE", token });
    await load();
  };

  return (
    <OwnerShell title={tr.owner.stockTitle} onBack={() => router.back()}>
      <View style={styles.tabs}>
        {(["bar", "kitchen"] as const).map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.tab, { borderColor: dept === d ? colors.primary : colors.border }]}
            onPress={() => setDept(d)}
          >
            <Text style={{ color: dept === d ? colors.primary : colors.mutedForeground, fontFamily: "Inter_600SemiBold" }}>
              {d === "bar" ? tr.owner.stockBar : tr.owner.stockKitchen}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.primary, { backgroundColor: colors.primary }]}
        onPress={() => {
          reset();
          setOpen(true);
        }}
      >
        <Feather name="plus" size={16} color={colors.primaryForeground} />
        <Text style={{ color: colors.primaryForeground, fontFamily: "Inter_700Bold" }}>{tr.owner.addItem}</Text>
      </TouchableOpacity>

      {visible.length === 0 ? (
        <Text style={{ color: colors.mutedForeground }}>{tr.owner.emptyStock}</Text>
      ) : (
        visible.map((item) => (
          <View
            key={item.id}
            style={[styles.card, { backgroundColor: colors.card, borderColor: item.belowMin ? colors.destructive : colors.border }]}
          >
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => {
                setEditId(item.id);
                setName(item.name);
                setCategory(item.category);
                setQuantity(String(item.quantity));
                setUnit(item.unit);
                setMinQuantity(String(item.minQuantity));
                setSupplierId(item.supplierId);
                setOpen(true);
              }}
            >
              <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 16 }}>{item.name}</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 2 }}>
                {item.quantity} {item.unit} · min {item.minQuantity}
                {item.belowMin ? ` · ${tr.owner.belowMin}` : ""}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => del(item.id)}>
              <Feather name="trash-2" size={16} color={colors.destructive} />
            </TouchableOpacity>
          </View>
        ))
      )}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
              placeholder={tr.owner.name}
              placeholderTextColor={colors.mutedForeground}
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
              placeholder={tr.owner.category}
              placeholderTextColor={colors.mutedForeground}
              value={category}
              onChangeText={setCategory}
            />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1, color: colors.foreground, borderColor: colors.border }]}
                placeholder={tr.owner.quantity}
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                value={quantity}
                onChangeText={setQuantity}
              />
              <TextInput
                style={[styles.input, { flex: 1, color: colors.foreground, borderColor: colors.border }]}
                placeholder={tr.owner.unit}
                placeholderTextColor={colors.mutedForeground}
                value={unit}
                onChangeText={setUnit}
              />
              <TextInput
                style={[styles.input, { flex: 1, color: colors.foreground, borderColor: colors.border }]}
                placeholder={tr.owner.minQty}
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                value={minQuantity}
                onChangeText={setMinQuantity}
              />
            </View>
            {suppliers.length > 0 && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                {suppliers.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.tab, { borderColor: supplierId === s.id ? colors.primary : colors.border }]}
                    onPress={() => setSupplierId(supplierId === s.id ? null : s.id)}
                  >
                    <Text style={{ color: supplierId === s.id ? colors.primary : colors.mutedForeground }}>{s.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <TouchableOpacity style={[styles.primary, { backgroundColor: colors.primary }]} onPress={save}>
              <Text style={{ color: colors.primaryForeground, fontFamily: "Inter_700Bold" }}>{tr.owner.save}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setOpen(false)} style={{ alignItems: "center" }}>
              <Text style={{ color: colors.mutedForeground }}>{tr.owner.cancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </OwnerShell>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", gap: 8, marginBottom: 12 },
  tab: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  primary: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 14,
  },
  card: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 8 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
});
