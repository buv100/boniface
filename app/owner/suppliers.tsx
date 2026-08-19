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
import type { Supplier } from "@/lib/ownerTypes";

export default function OwnerSuppliersScreen() {
  const colors = useColors();
  const { tr } = useLang();
  const { token } = useAuth();
  const [list, setList] = useState<Supplier[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [what, setWhat] = useState("");
  const [when, setWhen] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setList(await apiCall<Supplier[]>("/owner/suppliers", { token }));
  }, [token]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const save = async () => {
    if (!token || !name.trim()) return;
    const body = {
      name: name.trim(),
      phone: phone.trim() || null,
      whatSupplies: what.trim() || null,
      scheduleNote: when.trim() || null,
      notes: notes.trim() || null,
    };
    if (editId) await apiCall(`/owner/suppliers/${editId}`, { method: "PATCH", token, body });
    else await apiCall("/owner/suppliers", { method: "POST", token, body });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setOpen(false);
    await load();
  };

  return (
    <OwnerShell title={tr.owner.suppliersTitle} onBack={() => router.back()}>
      <TouchableOpacity
        style={[styles.primary, { backgroundColor: colors.primary }]}
        onPress={() => {
          setEditId(null);
          setName("");
          setPhone("");
          setWhat("");
          setWhen("");
          setNotes("");
          setOpen(true);
        }}
      >
        <Feather name="plus" size={16} color={colors.primaryForeground} />
        <Text style={{ color: colors.primaryForeground, fontFamily: "Inter_700Bold" }}>{tr.owner.addSupplier}</Text>
      </TouchableOpacity>

      {list.length === 0 ? (
        <Text style={{ color: colors.mutedForeground }}>{tr.owner.emptySuppliers}</Text>
      ) : (
        list.map((s) => (
          <TouchableOpacity
            key={s.id}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => {
              setEditId(s.id);
              setName(s.name);
              setPhone(s.phone ?? "");
              setWhat(s.whatSupplies ?? "");
              setWhen(s.scheduleNote ?? "");
              setNotes(s.notes ?? "");
              setOpen(true);
            }}
            onLongPress={async () => {
              if (!token) return;
              await apiCall(`/owner/suppliers/${s.id}`, { method: "DELETE", token });
              await load();
            }}
          >
            <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 16 }}>{s.name}</Text>
            {!!s.phone && <Text style={{ color: colors.mutedForeground, marginTop: 2 }}>{s.phone}</Text>}
            {!!s.whatSupplies && <Text style={{ color: colors.mutedForeground }}>{s.whatSupplies}</Text>}
            {!!s.scheduleNote && <Text style={{ color: colors.mutedForeground }}>{s.scheduleNote}</Text>}
            {(s.lowStockItems?.length ?? 0) > 0 && (
              <Text style={{ color: colors.destructive, marginTop: 8 }}>
                {tr.owner.lowAtSupplier}: {s.lowStockItems!.map((i) => i.name).join(", ")}
              </Text>
            )}
          </TouchableOpacity>
        ))
      )}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <TextInput style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} placeholder={tr.owner.name} placeholderTextColor={colors.mutedForeground} value={name} onChangeText={setName} />
            <TextInput style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} placeholder={tr.owner.phone} placeholderTextColor={colors.mutedForeground} value={phone} onChangeText={setPhone} />
            <TextInput style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} placeholder={tr.owner.whatSupplies} placeholderTextColor={colors.mutedForeground} value={what} onChangeText={setWhat} />
            <TextInput style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} placeholder={tr.owner.when} placeholderTextColor={colors.mutedForeground} value={when} onChangeText={setWhen} />
            <TextInput style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} placeholder={tr.owner.notes} placeholderTextColor={colors.mutedForeground} value={notes} onChangeText={setNotes} />
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
  primary: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, borderRadius: 14, paddingVertical: 14, marginBottom: 14 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 8 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
});
