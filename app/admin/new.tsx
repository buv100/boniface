import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";
import { apiCall } from "@/lib/api";
import { defaultPaidUntil } from "@/lib/adminTypes";

export default function AdminNewCustomerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tr, isRTL } = useLang();
  const { token } = useAuth();

  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [venueName, setVenueName] = useState("");
  const [venueKind, setVenueKind] = useState<"bar" | "restaurant">("bar");
  const [venueAddress, setVenueAddress] = useState("");
  const [paidUntil, setPaidUntil] = useState(defaultPaidUntil());
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const field = (value: string, set: (t: string) => void, placeholder: string, extra?: object) => (
    <TextInput
      style={[
        styles.input,
        { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary, textAlign: isRTL ? "right" : "left" },
      ]}
      placeholder={placeholder}
      placeholderTextColor={colors.mutedForeground}
      value={value}
      onChangeText={set}
      {...extra}
    />
  );

  const submit = async () => {
    if (!token) return;
    setError("");
    setLoading(true);
    try {
      const created = await apiCall<{ organization: { id: string } }>("/admin/customers", {
        method: "POST",
        token,
        body: {
          ownerName,
          phone,
          email,
          pin,
          organizationName,
          companyId: companyId || undefined,
          businessAddress: businessAddress || undefined,
          venueName,
          venueKind,
          venueAddress: venueAddress || undefined,
          paidUntil,
          notes: notes || undefined,
        },
      });
      router.replace(`/admin/${created.organization.id}` as any);
    } catch (e) {
      setError(e instanceof Error ? e.message : tr.owner.errorGeneric);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.background }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: colors.primary, marginBottom: 12 }}>{tr.owner.back}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>{tr.admin.createCustomer}</Text>

        {field(ownerName, setOwnerName, tr.owner.name)}
        {field(phone, setPhone, tr.owner.phone, { keyboardType: "phone-pad" })}
        {field(email, setEmail, tr.owner.email, { keyboardType: "email-address", autoCapitalize: "none" })}
        {field(pin, setPin, tr.admin.tempPin, { secureTextEntry: true })}
        {field(organizationName, setOrganizationName, tr.owner.orgName)}
        {field(companyId, setCompanyId, tr.owner.companyId)}
        {field(businessAddress, setBusinessAddress, tr.owner.address)}
        {field(venueName, setVenueName, tr.owner.venueName)}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
          {(["bar", "restaurant"] as const).map((k) => (
            <TouchableOpacity
              key={k}
              style={[styles.chip, { borderColor: venueKind === k ? colors.primary : colors.border }]}
              onPress={() => setVenueKind(k)}
            >
              <Text style={{ color: venueKind === k ? colors.primary : colors.mutedForeground }}>
                {k === "bar" ? tr.owner.kindBar : tr.owner.kindRestaurant}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {field(venueAddress, setVenueAddress, tr.owner.venueAddress)}
        {field(paidUntil, setPaidUntil, tr.admin.paidUntil)}
        {field(notes, setNotes, tr.admin.notes)}
        {!!error && <Text style={{ color: colors.destructive, marginBottom: 8 }}>{error}</Text>}
        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={submit} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={styles.btnTxt}>{tr.owner.save}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, marginBottom: 10 },
  btn: { borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 6 },
  btnTxt: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#111827" },
  chip: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
});
