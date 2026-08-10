import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
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
import {
  employeePortalService,
  type StockLiteItem,
  type StopListItemDto,
} from "@/lib/services/employeePortalService";

export default function EmployeeStockOutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tr } = useLang();
  const { token } = useAuth();
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [stock, setStock] = useState<StockLiteItem[]>([]);
  const [stops, setStops] = useState<StopListItemDto[]>([]);
  const [loading, setLoading] = useState(true);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [s, st] = await Promise.all([
        employeePortalService.getStockLite(token),
        employeePortalService.getStopList(token),
      ]);
      setStock(s);
      setStops(st);
    } catch {
      setStock([]);
      setStops([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!name.trim() || !token) {
      Alert.alert(tr.employee.stockOutTitle, tr.account.fillAll);
      return;
    }
    setSaving(true);
    try {
      await employeePortalService.reportStockOut(
        token,
        name.trim(),
        reason.trim() || tr.stopList.reasonOutOfStock
      );
      setName("");
      setReason("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(tr.employee.stockOutTitle, tr.employee.stockOutDone);
      await load();
    } catch (e: any) {
      Alert.alert(tr.employee.stockOutTitle, e?.message ?? "Error");
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

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <>
          <Text style={[styles.section, { color: colors.mutedForeground }]}>
            {tr.more.stockItem}
          </Text>
          <FlatList
            data={stock.slice(0, 40)}
            keyExtractor={(i) => i.id}
            style={{ maxHeight: 160 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => setName(item.name)}
                style={[styles.pickRow, { borderColor: colors.border }]}
              >
                <Text style={{ color: colors.foreground, flex: 1 }}>{item.name}</Text>
                <Text style={{ color: colors.mutedForeground }}>
                  {item.quantity} {item.unit}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={{ color: colors.mutedForeground }}>{tr.employee.noSlots}</Text>
            }
          />
          <Text style={[styles.section, { color: colors.mutedForeground }]}>
            {tr.stopList.title}
          </Text>
          {stops.slice(0, 20).map((s) => (
            <Text key={s.id} style={{ color: colors.foreground, marginBottom: 6 }}>
              • {s.name}
            </Text>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 4, marginBottom: 16 },
  label: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 6, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: "Inter_400Regular",
  },
  btn: {
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnText: { fontFamily: "Inter_700Bold", color: "#111827" },
  section: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginTop: 20, marginBottom: 8 },
  pickRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
    gap: 8,
  },
});
