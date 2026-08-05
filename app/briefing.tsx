import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useBoniface } from "@/context/BonifaceContext";
import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";

const STAFF_COLORS = ["#F59E0B", "#A78BFA", "#38BDF8", "#4ADE80", "#FB923C", "#F472B6"];

export default function BriefingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tr } = useLang();
  const { employees } = useApp();
  const { shiftState, checklists, stopList } = useBoniface();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 20;

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const dateLabel = `${tr.weekDays[now.getDay()]}, ${now.getDate()} ${tr.monthsShort[now.getMonth()]}`;

  const shiftEmployees = employees.filter((e) => shiftState.employeeIds.includes(e.id));

  const openTasks = checklists.flatMap((cl) =>
    cl.items.filter((i) => !i.done).map((i) => ({ text: i.text, checklist: cl.title }))
  );
  const doneTasks = checklists.flatMap((cl) =>
    cl.items.filter((i) => i.done).map((i) => ({ text: i.text, checklist: cl.title }))
  );

  const handleSend = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 12, paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: "rgba(255,255,255,0.07)", borderColor: "rgba(255,255,255,0.09)" }]}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerSub}>{dateLabel} · {timeStr}</Text>
            <Text style={styles.headerTitle}>Бриф перед сменой</Text>
          </View>
          <TouchableOpacity
            style={[styles.templateBtn, { backgroundColor: "rgba(255,255,255,0.07)", borderColor: "rgba(255,255,255,0.09)" }]}
          >
            <Text style={styles.templateBtnText}>Шаблон</Text>
          </TouchableOpacity>
        </View>

        {/* Shift info */}
        <View style={[styles.card, { backgroundColor: "rgba(255,255,255,0.055)", borderColor: "rgba(255,255,255,0.09)" }]}>
          <View style={[styles.cardIconBox, { backgroundColor: "rgba(245,158,11,0.15)", borderColor: "rgba(245,158,11,0.2)" }]}>
            <Feather name="calendar" size={18} color="#F59E0B" />
          </View>
          <View>
            <Text style={styles.cardTitle}>Смена сегодня</Text>
            <Text style={styles.cardSub}>
              {shiftState.active
                ? `Открыта с ${shiftState.startTime ?? timeStr} · ${shiftEmployees.length} чел.`
                : "Смена ещё не открыта"}
            </Text>
          </View>
        </View>

        {/* Team */}
        {shiftEmployees.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Команда сегодня</Text>
            <View style={styles.teamGrid}>
              {shiftEmployees.map((emp, i) => {
                const color = STAFF_COLORS[i % STAFF_COLORS.length];
                return (
                  <View key={emp.id} style={[styles.teamCard, { backgroundColor: "rgba(255,255,255,0.055)", borderColor: "rgba(255,255,255,0.08)" }]}>
                    <View style={[styles.teamAvatar, { backgroundColor: color + "25", borderColor: color + "35" }]}>
                      <Text style={[styles.teamInitial, { color }]}>
                        {emp.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.teamName} numberOfLines={1}>{emp.name.split(" ")[0]}</Text>
                    <Text style={styles.teamRole} numberOfLines={1}>
                      {(emp.roles ?? []).length > 0 ? emp.roles![0] : "—"}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Important */}
        <View style={[styles.sectionCard, { backgroundColor: "rgba(255,255,255,0.045)", borderColor: "rgba(255,255,255,0.07)" }]}>
          <View style={styles.sectionCardHeader}>
            <Feather name="zap" size={14} color="#F59E0B" />
            <Text style={[styles.sectionCardTitle, { color: "#F59E0B" }]}>Важное на сегодня</Text>
          </View>
          {shiftState.active ? (
            <View style={styles.bulletRow}>
              <View style={[styles.bullet, { backgroundColor: "#F59E0B" }]} />
              <Text style={styles.bulletText}>Смена открыта. Проверьте стоп-лист и склад.</Text>
            </View>
          ) : (
            <Text style={styles.emptyNote}>Откройте смену, чтобы начать работу.</Text>
          )}
        </View>

        {/* Tasks */}
        <View style={[styles.sectionCard, { backgroundColor: "rgba(255,255,255,0.045)", borderColor: "rgba(255,255,255,0.07)" }]}>
          <View style={styles.sectionCardHeader}>
            <Feather name="check-square" size={14} color="#4ADE80" />
            <Text style={[styles.sectionCardTitle, { color: "#4ADE80" }]}>Задачи на смену</Text>
          </View>
          {[...openTasks.slice(0, 5), ...doneTasks.slice(0, 3)].length === 0 ? (
            <Text style={styles.emptyNote}>Нет активных задач</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {openTasks.slice(0, 4).map((t, i) => (
                <View key={i} style={styles.taskRow}>
                  <View style={[styles.taskBox, { borderColor: "rgba(255,255,255,0.15)" }]} />
                  <Text style={styles.bulletText}>{t.text}</Text>
                </View>
              ))}
              {doneTasks.slice(0, 2).map((t, i) => (
                <View key={i} style={styles.taskRow}>
                  <View style={[styles.taskBoxDone, { backgroundColor: "#4ADE80" }]}>
                    <Feather name="check" size={10} color="#111827" />
                  </View>
                  <Text style={styles.taskTextDone}>{t.text}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Stop list */}
        {stopList.length > 0 && (
          <View style={[styles.sectionCard, { backgroundColor: "rgba(255,255,255,0.045)", borderColor: "rgba(255,255,255,0.07)" }]}>
            <View style={styles.sectionCardHeader}>
              <Feather name="x-circle" size={14} color="#F87171" />
              <Text style={[styles.sectionCardTitle, { color: "#F87171" }]}>Стоп-лист</Text>
            </View>
            <View style={styles.tagRow}>
              {stopList.map((s) => (
                <View key={s.id} style={styles.stopTag}>
                  <Text style={styles.stopTagText}>{s.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Send button */}
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend} activeOpacity={0.85}>
          <Feather name="send" size={16} color="#111827" />
          <Text style={styles.sendBtnText}>Отправить команде</Text>
        </TouchableOpacity>
        <Text style={styles.sendHint}>WhatsApp + уведомление в приложении</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16 },

  header: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 11, borderWidth: 1, alignItems: "center", justifyContent: "center", marginTop: 4 },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.35)" },
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#FFFFFF", marginTop: 2 },
  templateBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, marginTop: 4 },
  templateBtnText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.5)" },

  card: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 14 },
  cardIconBox: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  cardSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#6B7280", marginTop: 2 },

  section: { marginBottom: 14 },
  sectionLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#6B7280", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 },

  teamGrid: { flexDirection: "row", gap: 8 },
  teamCard: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 10, alignItems: "center", gap: 4 },
  teamAvatar: { width: 32, height: 32, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  teamInitial: { fontSize: 13, fontFamily: "Inter_700Bold" },
  teamName: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  teamRole: { fontSize: 9, fontFamily: "Inter_400Regular", color: "#6B7280" },

  sectionCard: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 10 },
  sectionCardHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  sectionCardTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 5 },
  bulletText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)", flex: 1 },
  emptyNote: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.3)" },

  taskRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  taskBox: { width: 16, height: 16, borderRadius: 4, borderWidth: 1.5, flexShrink: 0 },
  taskBoxDone: { width: 16, height: 16, borderRadius: 4, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  taskTextDone: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.3)", textDecorationLine: "line-through", flex: 1 },

  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  stopTag: { backgroundColor: "rgba(239,68,68,0.12)", borderWidth: 1, borderColor: "rgba(239,68,68,0.2)", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  stopTagText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#FCA5A5" },

  sendBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#F59E0B", borderRadius: 18, paddingVertical: 16, marginTop: 6,
  },
  sendBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#111827" },
  sendHint: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.25)", textAlign: "center", marginTop: 8 },
});
