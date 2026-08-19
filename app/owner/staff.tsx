import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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

import { OwnerShell } from "@/components/owner/OwnerShell";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";
import { apiCall } from "@/lib/api";
import { STAFF_PERMISSIONS, type StaffDocument, type StaffMember } from "@/lib/ownerTypes";

const emptyForm = {
  name: "",
  phone: "",
  jobRole: "bartender" as "bartender" | "waiter" | "cook" | "custom",
  customRole: "",
  permissions: [] as string[],
  payType: "hourly" as "hourly" | "monthly" | "topup",
  payAmount: "",
  nationalId: "",
};

export default function OwnerStaffScreen() {
  const colors = useColors();
  const { tr } = useLang();
  const { token } = useAuth();
  const [list, setList] = useState<StaffMember[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [docs, setDocs] = useState<StaffDocument[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    const data = await apiCall<StaffMember[]>("/owner/staff", { token });
    setList(data);
  }, [token]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const permLabel = (p: string) => {
    const map: Record<string, string> = {
      view_stock: tr.owner.perm_view_stock,
      edit_stock: tr.owner.perm_edit_stock,
      manage_staff: tr.owner.perm_manage_staff,
      manage_recipes: tr.owner.perm_manage_recipes,
      manage_suppliers: tr.owner.perm_manage_suppliers,
      run_shift: tr.owner.perm_run_shift,
      view_reports: tr.owner.perm_view_reports,
    };
    return map[p] ?? p;
  };

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm);
    setDocs([]);
    setError("");
    setOpen(true);
  };

  const openEdit = async (s: StaffMember) => {
    setEditId(s.id);
    setForm({
      name: s.name,
      phone: s.phone ?? "",
      jobRole: (s.jobRole as typeof form.jobRole) || "bartender",
      customRole: s.customRole ?? "",
      permissions: s.permissions ?? [],
      payType: (s.payType as typeof form.payType) || "hourly",
      payAmount: String(s.payAmount ?? 0),
      nationalId: s.nationalId ?? "",
    });
    setError("");
    setOpen(true);
    if (token) {
      const d = await apiCall<StaffDocument[]>(`/owner/staff/${s.id}/documents`, { token }).catch(
        () => []
      );
      setDocs(d);
    }
  };

  const save = async () => {
    if (!token || !form.name.trim()) return;
    const body = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      jobRole: form.jobRole,
      customRole: form.customRole.trim() || null,
      permissions: form.permissions,
      payType: form.payType,
      payAmount: parseFloat(form.payAmount) || 0,
      nationalId: form.nationalId.trim() || null,
    };
    try {
      if (editId) {
        await apiCall(`/owner/staff/${editId}`, { method: "PATCH", token, body });
      } else {
        await apiCall("/owner/staff", { method: "POST", token, body });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setOpen(false);
      await load();
    } catch {
      setError(tr.owner.errorGeneric);
    }
  };

  const remove = (id: string) => {
    Alert.alert(tr.owner.delete, tr.owner.delete, [
      { text: tr.owner.cancel, style: "cancel" },
      {
        text: tr.owner.delete,
        style: "destructive",
        onPress: async () => {
          if (!token) return;
          await apiCall(`/owner/staff/${id}`, { method: "DELETE", token });
          await load();
        },
      },
    ]);
  };

  const uploadDoc = async (kind: "id" | "form101" | "other") => {
    if (!token || !editId) return;
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      base64: true,
    });
    if (picked.canceled || !picked.assets[0]?.base64) return;
    const asset = picked.assets[0];
    await apiCall(`/owner/staff/${editId}/documents`, {
      method: "POST",
      token,
      body: {
        kind,
        fileName: asset.fileName ?? `${kind}.jpg`,
        mimeType: asset.mimeType ?? "image/jpeg",
        contentBase64: asset.base64,
      },
    });
    const d = await apiCall<StaffDocument[]>(`/owner/staff/${editId}/documents`, { token });
    setDocs(d);
  };

  return (
    <OwnerShell title={tr.owner.staffTitle} onBack={() => router.back()}>
      <TouchableOpacity style={[styles.primary, { backgroundColor: colors.primary }]} onPress={openNew}>
        <Feather name="user-plus" size={16} color={colors.primaryForeground} />
        <Text style={[styles.primaryTxt, { color: colors.primaryForeground }]}>{tr.owner.addStaff}</Text>
      </TouchableOpacity>

      {list.length === 0 ? (
        <Text style={{ color: colors.mutedForeground, marginTop: 16 }}>{tr.owner.emptyStaff}</Text>
      ) : (
        list.map((s) => (
          <TouchableOpacity
            key={s.id}
            style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => openEdit(s)}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 16 }}>
                {s.name}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 2 }}>
                {s.jobRole} · {s.payType} {s.payAmount}₪
              </Text>
            </View>
            <TouchableOpacity onPress={() => remove(s.id)} hitSlop={8}>
              <Feather name="trash-2" size={18} color={colors.destructive} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))
      )}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
                {editId ? tr.owner.staffTitle : tr.owner.addStaff}
              </Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                placeholder={tr.owner.name}
                placeholderTextColor={colors.mutedForeground}
                value={form.name}
                onChangeText={(name) => setForm((f) => ({ ...f, name }))}
              />
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                placeholder={tr.owner.phone}
                placeholderTextColor={colors.mutedForeground}
                value={form.phone}
                onChangeText={(phone) => setForm((f) => ({ ...f, phone }))}
              />
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                placeholder={tr.owner.nationalId}
                placeholderTextColor={colors.mutedForeground}
                value={form.nationalId}
                onChangeText={(nationalId) => setForm((f) => ({ ...f, nationalId }))}
              />

              <Text style={[styles.label, { color: colors.mutedForeground }]}>{tr.owner.jobRole}</Text>
              <View style={styles.chips}>
                {(["bartender", "waiter", "cook", "custom"] as const).map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.chip, { borderColor: form.jobRole === r ? colors.primary : colors.border }]}
                    onPress={() => setForm((f) => ({ ...f, jobRole: r }))}
                  >
                    <Text style={{ color: form.jobRole === r ? colors.primary : colors.mutedForeground }}>
                      {r === "bartender"
                        ? tr.owner.roleBartender
                        : r === "waiter"
                          ? tr.owner.roleWaiter
                          : r === "cook"
                            ? tr.owner.roleCook
                            : tr.owner.roleCustom}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {form.jobRole === "custom" && (
                <TextInput
                  style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                  placeholder={tr.owner.customRole}
                  placeholderTextColor={colors.mutedForeground}
                  value={form.customRole}
                  onChangeText={(customRole) => setForm((f) => ({ ...f, customRole }))}
                />
              )}

              <Text style={[styles.label, { color: colors.mutedForeground }]}>{tr.owner.payType}</Text>
              <View style={styles.chips}>
                {(["hourly", "monthly", "topup"] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.chip, { borderColor: form.payType === p ? colors.primary : colors.border }]}
                    onPress={() => setForm((f) => ({ ...f, payType: p }))}
                  >
                    <Text style={{ color: form.payType === p ? colors.primary : colors.mutedForeground }}>
                      {p === "hourly"
                        ? tr.owner.payHourly
                        : p === "monthly"
                          ? tr.owner.payMonthly
                          : tr.owner.payTopup}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                placeholder={tr.owner.payAmount}
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                value={form.payAmount}
                onChangeText={(payAmount) => setForm((f) => ({ ...f, payAmount }))}
              />

              <Text style={[styles.label, { color: colors.mutedForeground }]}>{tr.owner.permissions}</Text>
              {STAFF_PERMISSIONS.map((p) => {
                const on = form.permissions.includes(p);
                return (
                  <TouchableOpacity
                    key={p}
                    style={styles.permRow}
                    onPress={() =>
                      setForm((f) => ({
                        ...f,
                        permissions: on ? f.permissions.filter((x) => x !== p) : [...f.permissions, p],
                      }))
                    }
                  >
                    <Feather
                      name={on ? "check-square" : "square"}
                      size={18}
                      color={on ? colors.primary : colors.mutedForeground}
                    />
                    <Text style={{ color: colors.foreground }}>{permLabel(p)}</Text>
                  </TouchableOpacity>
                );
              })}

              {editId && (
                <>
                  <Text style={[styles.label, { color: colors.mutedForeground }]}>{tr.owner.documents}</Text>
                  {docs.map((d) => (
                    <Text key={d.id} style={{ color: colors.foreground, marginBottom: 4 }}>
                      {d.kind} · {d.fileName}
                    </Text>
                  ))}
                  <View style={styles.chips}>
                    {(["id", "form101", "other"] as const).map((k) => (
                      <TouchableOpacity
                        key={k}
                        style={[styles.chip, { borderColor: colors.border }]}
                        onPress={() => uploadDoc(k)}
                      >
                        <Text style={{ color: colors.primary }}>
                          {k === "id" ? tr.owner.docId : k === "form101" ? tr.owner.doc101 : tr.owner.docOther}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {!!error && <Text style={{ color: colors.destructive, marginTop: 8 }}>{error}</Text>}
              <TouchableOpacity style={[styles.primary, { backgroundColor: colors.primary, marginTop: 12 }]} onPress={save}>
                <Text style={[styles.primaryTxt, { color: colors.primaryForeground }]}>{tr.owner.save}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setOpen(false)} style={{ alignItems: "center", marginTop: 10 }}>
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
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 14,
  },
  primaryTxt: { fontSize: 15, fontFamily: "Inter_700Bold" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { maxHeight: "92%", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18 },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 8,
    fontSize: 15,
  },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.6, marginTop: 8, marginBottom: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  chip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  permRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },
});
