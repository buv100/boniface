import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { OwnerShell } from "@/components/owner/OwnerShell";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";
import { apiCall } from "@/lib/api";
import type { StaffMember, WorkShift } from "@/lib/ownerTypes";

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function hhmm(iso: string) {
  const t = iso.slice(11, 16);
  return t || iso;
}

export default function OwnerScheduleScreen() {
  const colors = useColors();
  const { tr, isRTL } = useLang();
  const { token } = useAuth();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [open, setOpen] = useState(false);
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState(ymd(new Date()));
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const from = `${ymd(weekStart)}T00:00`;
  const to = `${ymd(addDays(weekStart, 7))}T00:00`;

  const load = useCallback(async () => {
    if (!token) return;
    const [s, st] = await Promise.all([
      apiCall<WorkShift[]>(`/owner/schedule?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { token }),
      apiCall<StaffMember[]>("/owner/staff", { token }),
    ]);
    setShifts(s);
    setStaffList(st);
  }, [token, from, to]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  useEffect(() => {
    if (!staffId && staffList[0]) setStaffId(staffList[0].id);
  }, [staffId, staffList]);

  const save = async () => {
    if (!token || !staffId) {
      setError(tr.owner.emptyStaff);
      return;
    }
    setError("");
    try {
      await apiCall("/owner/schedule", {
        method: "POST",
        token,
        body: {
          staffId,
          startsAt: `${date}T${start}`,
          endsAt: `${date}T${end}`,
          note: note.trim() || null,
        },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setOpen(false);
      setNote("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : tr.owner.errorGeneric);
    }
  };

  return (
    <OwnerShell title={tr.owner.scheduleTitle} onBack={() => router.back()}>
      <View style={[styles.weekNav, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <TouchableOpacity onPress={() => setWeekStart((w) => addDays(w, -7))}>
          <Feather name={isRTL ? "chevron-right" : "chevron-left"} size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>
          {ymd(weekStart)} – {ymd(addDays(weekStart, 6))}
        </Text>
        <TouchableOpacity onPress={() => setWeekStart((w) => addDays(w, 7))}>
          <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.primary, { backgroundColor: colors.primary }]}
        onPress={() => {
          setError("");
          setOpen(true);
        }}
      >
        <Feather name="plus" size={16} color={colors.primaryForeground} />
        <Text style={{ color: colors.primaryForeground, fontFamily: "Inter_700Bold" }}>{tr.owner.addShift}</Text>
      </TouchableOpacity>

      {days.map((day, i) => {
        const key = ymd(day);
        const dayShifts = shifts.filter((s) => s.startsAt.slice(0, 10) === key);
        return (
          <View key={key} style={[styles.day, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={{ color: colors.primary, fontFamily: "Inter_700Bold" }}>
              {tr.weekDays[i]} {day.getDate()}
            </Text>
            {dayShifts.length === 0 ? (
              <Text style={{ color: colors.mutedForeground, marginTop: 6 }}>{tr.owner.noShifts}</Text>
            ) : (
              dayShifts.map((s) => (
                <View key={s.id} style={styles.shiftRow}>
                  <Text style={{ color: colors.foreground, flex: 1 }}>
                    {s.staffName} · {hhmm(s.startsAt)}–{hhmm(s.endsAt)}
                    {s.note ? ` · ${s.note}` : ""}
                  </Text>
                  <TouchableOpacity
                    onPress={async () => {
                      if (!token) return;
                      await apiCall(`/owner/schedule/${s.id}`, { method: "DELETE", token });
                      await load();
                    }}
                  >
                    <Feather name="trash-2" size={14} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        );
      })}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 18, marginBottom: 10 }}>
              {tr.owner.addShift}
            </Text>
            <View style={styles.wrap}>
              {staffList.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.chip, { borderColor: staffId === s.id ? colors.primary : colors.border }]}
                  onPress={() => setStaffId(s.id)}
                >
                  <Text style={{ color: staffId === s.id ? colors.primary : colors.foreground }}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
              placeholder={tr.owner.date}
              placeholderTextColor={colors.mutedForeground}
              value={date}
              onChangeText={setDate}
            />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1, color: colors.foreground, borderColor: colors.border }]}
                placeholder={tr.owner.startTime}
                placeholderTextColor={colors.mutedForeground}
                value={start}
                onChangeText={setStart}
              />
              <TextInput
                style={[styles.input, { flex: 1, color: colors.foreground, borderColor: colors.border }]}
                placeholder={tr.owner.endTime}
                placeholderTextColor={colors.mutedForeground}
                value={end}
                onChangeText={setEnd}
              />
            </View>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
              placeholder={tr.owner.notes}
              placeholderTextColor={colors.mutedForeground}
              value={note}
              onChangeText={setNote}
            />
            {!!error && <Text style={{ color: colors.destructive, marginBottom: 8 }}>{error}</Text>}
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
  weekNav: { alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  primary: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 14,
  },
  day: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 8 },
  shiftRow: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 8 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  chip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
});
