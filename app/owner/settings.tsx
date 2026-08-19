import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { OwnerShell } from "@/components/owner/OwnerShell";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";
import { apiCall } from "@/lib/api";

export default function OwnerSettingsScreen() {
  const colors = useColors();
  const { tr } = useLang();
  const { token, organization, venue, updateVenueLocally } = useAuth();
  const [orgName, setOrgName] = useState(organization?.name ?? "");
  const [companyId, setCompanyId] = useState(organization?.companyId ?? "");
  const [orgAddress, setOrgAddress] = useState(organization?.address ?? "");
  const [venueName, setVenueName] = useState(venue?.name ?? "");
  const [kind, setKind] = useState<"bar" | "restaurant">(
    venue?.kind === "restaurant" ? "restaurant" : "bar"
  );
  const [venueAddress, setVenueAddress] = useState(venue?.address ?? "");

  useEffect(() => {
    setOrgName(organization?.name ?? "");
    setCompanyId(organization?.companyId ?? "");
    setOrgAddress(organization?.address ?? "");
  }, [organization]);

  useEffect(() => {
    setVenueName(venue?.name ?? "");
    setKind(venue?.kind === "restaurant" ? "restaurant" : "bar");
    setVenueAddress(venue?.address ?? "");
  }, [venue]);

  const save = async () => {
    if (!token || !venue) return;
    await apiCall("/owner/organization", {
      method: "PATCH",
      token,
      body: { name: orgName.trim(), companyId: companyId.trim() || null, address: orgAddress.trim() || null },
    });
    const updated = await apiCall<typeof venue>(`/owner/venues/${venue.id}`, {
      method: "PATCH",
      token,
      body: { name: venueName.trim(), kind, address: venueAddress.trim() || null },
    });
    updateVenueLocally(updated);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <OwnerShell title={tr.owner.settingsTitle} onBack={() => router.back()}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{tr.owner.orgName}</Text>
      <TextInput style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} value={orgName} onChangeText={setOrgName} />
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{tr.owner.companyId}</Text>
      <TextInput style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} value={companyId} onChangeText={setCompanyId} />
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{tr.owner.address}</Text>
      <TextInput style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} value={orgAddress} onChangeText={setOrgAddress} />

      <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 16 }]}>{tr.owner.venueName}</Text>
      <TextInput style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} value={venueName} onChangeText={setVenueName} />
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
        {(["bar", "restaurant"] as const).map((k) => (
          <TouchableOpacity
            key={k}
            style={[styles.chip, { borderColor: kind === k ? colors.primary : colors.border }]}
            onPress={() => setKind(k)}
          >
            <Text style={{ color: kind === k ? colors.primary : colors.mutedForeground }}>
              {k === "bar" ? tr.owner.kindBar : tr.owner.kindRestaurant}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{tr.owner.venueAddress}</Text>
      <TextInput style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} value={venueAddress} onChangeText={setVenueAddress} />

      <TouchableOpacity style={[styles.save, { backgroundColor: colors.primary }]} onPress={save}>
        <Text style={{ color: colors.primaryForeground, fontFamily: "Inter_700Bold", fontSize: 16 }}>{tr.owner.save}</Text>
      </TouchableOpacity>
    </OwnerShell>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10, fontSize: 15 },
  chip: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  save: { borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 8 },
});
