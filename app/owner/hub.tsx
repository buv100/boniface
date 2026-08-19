import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Modal,
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

export default function OwnerHubScreen() {
  const colors = useColors();
  const { tr, isRTL } = useLang();
  const { venues, venue, switchVenue, createVenue } = useAuth();
  const [modal, setModal] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"bar" | "restaurant">("bar");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");

  const openVenue = async (id: string) => {
    await switchVenue(id);
    Haptics.selectionAsync();
    router.replace("/owner" as any);
  };

  const add = async () => {
    if (!name.trim()) return;
    try {
      const v = await createVenue({ name: name.trim(), kind, address: address.trim() || undefined });
      setModal(false);
      setName("");
      setAddress("");
      await openVenue(v.id);
    } catch {
      setError(tr.owner.errorGeneric);
    }
  };

  return (
    <OwnerShell title={tr.owner.hubTitle}>
      <Text style={[styles.sub, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>
        {tr.owner.hubSub}
      </Text>

      {venues.map((v) => {
        const alerts = v.alerts ?? [];
        return (
          <TouchableOpacity
            key={v.id}
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: v.id === venue?.id ? colors.primary : colors.border,
              },
            ]}
            onPress={() => openVenue(v.id)}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.vName, { color: colors.foreground }]}>{v.name}</Text>
              <Text style={[styles.vMeta, { color: colors.mutedForeground }]}>
                {v.kind === "restaurant" ? tr.owner.kindRestaurant : tr.owner.kindBar}
                {v.address ? ` · ${v.address}` : ""}
              </Text>
              {alerts.length === 0 ? (
                <Text style={[styles.alertNone, { color: colors.mutedForeground }]}>{tr.owner.alertsNone}</Text>
              ) : (
                alerts.map((a) => (
                  <Text key={a.id} style={{ color: colors.destructive, marginTop: 4 }}>
                    {a.message}
                  </Text>
                ))
              )}
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        style={[styles.addBtn, { backgroundColor: colors.primary }]}
        onPress={() => setModal(true)}
      >
        <Feather name="plus" size={16} color={colors.primaryForeground} />
        <Text style={[styles.addTxt, { color: colors.primaryForeground }]}>{tr.owner.addVenue}</Text>
      </TouchableOpacity>

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{tr.owner.addVenue}</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
              placeholder={tr.owner.venueName}
              placeholderTextColor={colors.mutedForeground}
              value={name}
              onChangeText={setName}
            />
            <View style={styles.row}>
              {(["bar", "restaurant"] as const).map((k) => (
                <TouchableOpacity
                  key={k}
                  style={[
                    styles.chip,
                    { borderColor: kind === k ? colors.primary : colors.border },
                  ]}
                  onPress={() => setKind(k)}
                >
                  <Text style={{ color: kind === k ? colors.primary : colors.mutedForeground }}>
                    {k === "bar" ? tr.owner.kindBar : tr.owner.kindRestaurant}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
              placeholder={tr.owner.venueAddress}
              placeholderTextColor={colors.mutedForeground}
              value={address}
              onChangeText={setAddress}
            />
            {!!error && <Text style={{ color: colors.destructive }}>{error}</Text>}
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={add}>
              <Text style={[styles.addTxt, { color: colors.primaryForeground }]}>{tr.owner.save}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModal(false)} style={{ alignItems: "center", marginTop: 8 }}>
              <Text style={{ color: colors.mutedForeground }}>{tr.owner.cancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </OwnerShell>
  );
}

const styles = StyleSheet.create({
  sub: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 14 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  vName: { fontSize: 16, fontFamily: "Inter_700Bold" },
  vMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  alertNone: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 8 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 8,
  },
  addTxt: { fontSize: 15, fontFamily: "Inter_700Bold" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 10 },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15 },
  row: { flexDirection: "row", gap: 8 },
  chip: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 10, alignItems: "center" },
});
