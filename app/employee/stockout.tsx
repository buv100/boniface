import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBoniface } from "@/context/BonifaceContext";
import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";

export default function EmployeeStockOutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tr } = useLang();
  const { addToStopList } = useBoniface();
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const submit = async () => {
    if (!name.trim()) {
      Alert.alert(tr.employee.stockOutTitle, tr.account.fillAll);
      return;
    }
    setSaving(true);
    try {
      await addToStopList(name.trim(), reason.trim() || tr.stopList.reasonOutOfStock);
      setName("");
      setReason("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(tr.employee.stockOutTitle, tr.employee.stockOutDone);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad + 12 }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>{tr.employee.stockOutTitle}</Text>
      <Text style={[styles.sub, { color: colors.mutedForeground }]}>{tr.employee.stockOutSub}</Text>

      <Text style={[styles.label, { color: colors.mutedForeground }]}>{tr.employee.stockOutName}</Text>
      <TextInput
        style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
        value={name}
        onChangeText={setName}
        placeholder={tr.stopList.namePlaceholder}
        placeholderTextColor={colors.mutedForeground}
      />
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{tr.employee.stockOutReason}</Text>
      <TextInput
        style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
        value={reason}
        onChangeText={setReason}
        placeholder={tr.stopList.reasonPlaceholder}
        placeholderTextColor={colors.mutedForeground}
      />
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
        onPress={submit}
        disabled={saving}
      >
        <Feather name="plus" size={16} color="#111827" />
        <Text style={styles.btnText}>{tr.employee.stockOutSubmit}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 4, marginBottom: 20 },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginBottom: 6, marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  btn: { marginTop: 20, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 14 },
  btnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#111827" },
});
