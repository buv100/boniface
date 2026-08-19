import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { OwnerShell } from "@/components/owner/OwnerShell";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";
import { apiCall } from "@/lib/api";
import type { InventoryDepartment, InventoryItem, Recipe, RecipeLine } from "@/lib/ownerTypes";

export function OwnerMenuScreen({ department }: { department: InventoryDepartment }) {
  const colors = useColors();
  const { tr } = useLang();
  const { token } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [stock, setStock] = useState<InventoryItem[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<RecipeLine[]>([]);

  const load = useCallback(async () => {
    if (!token) return;
    const [r, inv] = await Promise.all([
      apiCall<Recipe[]>(`/owner/recipes?department=${department}`, { token }),
      apiCall<InventoryItem[]>(`/owner/inventory?department=${department}`, { token }),
    ]);
    setRecipes(r);
    setStock(inv);
  }, [token, department]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const title = department === "bar" ? tr.owner.menuTitleBar : tr.owner.menuTitleKitchen;

  const save = async () => {
    if (!token || !name.trim()) return;
    const body = {
      name: name.trim(),
      department,
      kind: kind.trim() || "item",
      notes: notes.trim() || null,
      lines: lines.filter((l) => l.inventoryItemId || l.subRecipeId),
    };
    if (editId) await apiCall(`/owner/recipes/${editId}`, { method: "PATCH", token, body });
    else await apiCall("/owner/recipes", { method: "POST", token, body });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setOpen(false);
    await load();
  };

  const lineLabel = (l: RecipeLine) => {
    const item = stock.find((s) => s.id === l.inventoryItemId);
    const rec = recipes.find((r) => r.id === l.subRecipeId);
    return `${item?.name ?? rec?.name ?? "—"} · ${l.quantity} ${l.unit}`;
  };

  return (
    <OwnerShell title={title} onBack={() => router.back()}>
      <TouchableOpacity
        style={[styles.primary, { backgroundColor: colors.primary }]}
        onPress={() => {
          setEditId(null);
          setName("");
          setKind("");
          setNotes("");
          setLines([]);
          setOpen(true);
        }}
      >
        <Feather name="plus" size={16} color={colors.primaryForeground} />
        <Text style={{ color: colors.primaryForeground, fontFamily: "Inter_700Bold" }}>{tr.owner.addRecipe}</Text>
      </TouchableOpacity>

      {recipes.length === 0 ? (
        <Text style={{ color: colors.mutedForeground }}>{tr.owner.emptyMenu}</Text>
      ) : (
        recipes.map((r) => (
          <TouchableOpacity
            key={r.id}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => {
              setEditId(r.id);
              setName(r.name);
              setKind(r.kind);
              setNotes(r.notes ?? "");
              setLines(r.lines);
              setOpen(true);
            }}
            onLongPress={async () => {
              if (!token) return;
              await apiCall(`/owner/recipes/${r.id}`, { method: "DELETE", token });
              await load();
            }}
          >
            <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 16 }}>{r.name}</Text>
            <Text style={{ color: colors.mutedForeground, marginTop: 4 }}>
              {r.kind} · {r.lines.length} {tr.owner.lines}
            </Text>
          </TouchableOpacity>
        ))
      )}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <ScrollView>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                placeholder={tr.owner.name}
                placeholderTextColor={colors.mutedForeground}
                value={name}
                onChangeText={setName}
              />
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                placeholder={tr.owner.recipeKind}
                placeholderTextColor={colors.mutedForeground}
                value={kind}
                onChangeText={setKind}
              />
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                placeholder={tr.owner.notes}
                placeholderTextColor={colors.mutedForeground}
                value={notes}
                onChangeText={setNotes}
              />
              <Text style={{ color: colors.mutedForeground, marginBottom: 8 }}>{tr.owner.lines}</Text>
              {lines.map((l, idx) => (
                <View key={`${l.inventoryItemId}-${l.subRecipeId}-${idx}`} style={styles.lineRow}>
                  <Text style={{ color: colors.foreground, flex: 1 }}>{lineLabel(l)}</Text>
                  <TouchableOpacity onPress={() => setLines((prev) => prev.filter((_, i) => i !== idx))}>
                    <Feather name="x" size={16} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              ))}

              <Text style={{ color: colors.mutedForeground, marginVertical: 8 }}>{tr.owner.fromStock}</Text>
              <View style={styles.wrap}>
                {stock.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.chip, { borderColor: colors.border }]}
                    onPress={() =>
                      setLines((prev) => [
                        ...prev,
                        { inventoryItemId: s.id, subRecipeId: null, quantity: 1, unit: s.unit },
                      ])
                    }
                  >
                    <Text style={{ color: colors.foreground }}>{s.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={{ color: colors.mutedForeground, marginVertical: 8 }}>{tr.owner.fromRecipe}</Text>
              <View style={styles.wrap}>
                {recipes
                  .filter((r) => r.id !== editId)
                  .map((r) => (
                    <TouchableOpacity
                      key={r.id}
                      style={[styles.chip, { borderColor: colors.border }]}
                      onPress={() =>
                        setLines((prev) => [
                          ...prev,
                          { inventoryItemId: null, subRecipeId: r.id, quantity: 1, unit: "pcs" },
                        ])
                      }
                    >
                      <Text style={{ color: colors.foreground }}>{r.name}</Text>
                    </TouchableOpacity>
                  ))}
              </View>

              <TouchableOpacity style={[styles.primary, { backgroundColor: colors.primary, marginTop: 12 }]} onPress={save}>
                <Text style={{ color: colors.primaryForeground, fontFamily: "Inter_700Bold" }}>{tr.owner.save}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setOpen(false)} style={{ alignItems: "center", marginTop: 8 }}>
                <Text style={{ color: colors.mutedForeground }}>{tr.owner.cancel}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </OwnerShell>
  );
}

const styles = StyleSheet.create({
  primary: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 14,
  },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 8 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: { maxHeight: "90%", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  lineRow: { flexDirection: "row", alignItems: "center", marginBottom: 6, gap: 8 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
});
