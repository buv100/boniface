import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";
import { apiCall } from "@/lib/api";

interface ShiftClaim {
  id: string;
  employeeId: string;
  status: string;
}

interface ShiftSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  role?: string;
  mode: string;
  maxClaims: number;
  claims: ShiftClaim[];
}

export default function EmployeeHomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tr } = useLang();
  const { token, employee } = useAuth();
  const [slots, setSlots] = useState<ShiftSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : 84 + insets.bottom;

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const from = new Date();
      from.setDate(from.getDate() - 1);
      const to = new Date();
      to.setDate(to.getDate() + 21);
      const fmt = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const data = await apiCall<ShiftSlot[]>(`/shift-slots?from=${fmt(from)}&to=${fmt(to)}`, { token });
      setSlots(data);
    } catch {
      // offline grace
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const myId = employee?.id;

  const claim = async (slot: ShiftSlot) => {
    if (!token || !myId) return;
    setBusyId(slot.id);
    try {
      await apiCall(`/shift-slots/${slot.id}/claim`, {
        method: "POST",
        token,
        body: { employeeId: myId },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await load();
    } catch (e: any) {
      Alert.alert(tr.employee.homeTitle, e?.message ?? "Error");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setBusyId(null);
    }
  };

  const cancelClaim = async (claimId: string) => {
    if (!token) return;
    setBusyId(claimId);
    try {
      await apiCall(`/shift-claims/${claimId}`, { method: "DELETE", token });
      await load();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert(tr.employee.homeTitle, e?.message ?? "Error");
    } finally {
      setBusyId(null);
    }
  };

  const myClaims = slots.filter((s) => s.claims.some((c) => c.employeeId === myId));
  const openSlots = slots.filter((s) => !s.claims.some((c) => c.employeeId === myId));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad + 12, paddingBottom: bottomPad, paddingHorizontal: 16 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <Text style={[styles.title, { color: colors.foreground, flex: 1 }]}>{tr.employee.homeTitle}</Text>
          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync();
              router.navigate("/assistant" as any);
            }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(245,158,11,0.15)",
              borderWidth: 1,
              borderColor: "rgba(245,158,11,0.35)",
            }}
            accessibilityRole="button"
            accessibilityLabel={tr.more.assistantItem}
          >
            <Feather name="cpu" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>{tr.employee.homeSub}</Text>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>{tr.employee.laborHint}</Text>

        <Text style={[styles.section, { color: colors.mutedForeground }]}>{tr.employee.myClaims}</Text>
        {myClaims.length === 0 ? (
          <Text style={{ color: colors.mutedForeground, marginBottom: 16 }}>{tr.employee.noSlots}</Text>
        ) : (
          myClaims.map((slot) => {
            const mine = slot.claims.find((c) => c.employeeId === myId)!;
            return (
              <View key={slot.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                  {slot.date} · {slot.startTime}–{slot.endTime}
                </Text>
                <Text style={{ color: colors.primary, marginTop: 4 }}>{tr.employee.claimed}</Text>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => cancelClaim(mine.id)}
                  disabled={busyId === mine.id}
                >
                  {busyId === mine.id ? (
                    <ActivityIndicator size="small" color="#EF4444" />
                  ) : (
                    <Text style={{ color: "#EF4444", fontFamily: "Inter_600SemiBold" }}>{tr.employee.cancelClaim}</Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })
        )}

        <Text style={[styles.section, { color: colors.mutedForeground }]}>{tr.employee.openSlots}</Text>
        {loading && openSlots.length === 0 ? (
          <ActivityIndicator color={colors.primary} />
        ) : openSlots.length === 0 ? (
          <Text style={{ color: colors.mutedForeground }}>{tr.employee.noSlots}</Text>
        ) : (
          openSlots.map((slot) => {
            const full =
              slot.mode === "want"
                ? slot.claims.length >= 1
                : slot.claims.length >= slot.maxClaims;
            return (
              <View key={slot.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                  {slot.date} · {slot.startTime}–{slot.endTime}
                </Text>
                <Text style={{ color: colors.mutedForeground, marginTop: 4, fontSize: 12 }}>
                  {slot.mode === "want" ? tr.employee.modeWant : tr.employee.modeCan}
                  {slot.role ? ` · ${slot.role}` : ""}
                  {` · ${slot.claims.length}/${slot.mode === "want" ? 1 : slot.maxClaims}`}
                </Text>
                <TouchableOpacity
                  style={[styles.claimBtn, { backgroundColor: full ? colors.secondary : colors.primary }]}
                  onPress={() => claim(slot)}
                  disabled={full || busyId === slot.id}
                >
                  {busyId === slot.id ? (
                    <ActivityIndicator color="#111827" />
                  ) : (
                    <Text style={{ color: full ? colors.mutedForeground : "#111827", fontFamily: "Inter_700Bold" }}>
                      {full ? tr.employee.full : tr.employee.claim}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 4 },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 8, marginBottom: 16 },
  section: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.6, marginBottom: 10, marginTop: 8 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  claimBtn: { marginTop: 12, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  cancelBtn: { marginTop: 10, alignItems: "flex-start" },
});
