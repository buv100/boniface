import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmployeeDetailModal } from "@/components/EmployeeDetailModal";
import { Employee, calcDayResults, useApp } from "@/context/AppContext";
import { useBoniface } from "@/context/BonifaceContext";
import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";

const AVATAR_COLORS = [
  "#F59E0B", "#3B82F6", "#10B981", "#EF4444",
  "#8B5CF6", "#EC4899", "#06B6D4", "#F97316",
];

interface EmpStats {
  totalTips: number;
  totalShifts: number;
  avgPerShift: number;
  shiftsLast7: number;
}

export default function TeamScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tr } = useLang();
  const { employees, addEmployee, updateEmployee, deleteEmployee, dayEntries } = useApp();
  const { shiftState } = useBoniface();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "onShift">("all");
  const [roleFilter, setRoleFilter] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [nameError, setNameError] = useState("");
  const [detailEmployee, setDetailEmployee] = useState<Employee | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : 84 + insets.bottom;

  const getColor = (id: string) => {
    const idx = employees.findIndex((e) => e.id === id);
    return AVATAR_COLORS[Math.max(idx, 0) % AVATAR_COLORS.length];
  };

  const cutoff7 = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  }, []);

  const empStats = useMemo<Record<string, EmpStats>>(() => {
    const map: Record<string, EmpStats> = {};
    for (const emp of employees) {
      map[emp.id] = { totalTips: 0, totalShifts: 0, avgPerShift: 0, shiftsLast7: 0 };
    }
    for (const entry of dayEntries) {
      const results = calcDayResults(entry);
      const entryDate = new Date(entry.date);
      for (const r of results) {
        const id = r.shift.employeeId;
        if (!map[id]) continue;
        map[id].totalTips += r.totalTips;
        map[id].totalShifts += 1;
        if (entryDate >= cutoff7) map[id].shiftsLast7 += 1;
      }
    }
    for (const id of Object.keys(map)) {
      const s = map[id];
      s.avgPerShift = s.totalShifts > 0 ? s.totalTips / s.totalShifts : 0;
    }
    return map;
  }, [employees, dayEntries, cutoff7]);

  const onShiftIds = new Set(shiftState.employeeIds ?? []);
  const onShiftNow = employees.filter((e) => onShiftIds.has(e.id));
  const offShift = employees.filter((e) => !onShiftIds.has(e.id));

  const allRoles = useMemo(() => {
    const s = new Set<string>();
    employees.forEach((e) => (e.roles ?? []).forEach((r) => s.add(r)));
    return Array.from(s).sort();
  }, [employees]);

  const baseList = filterMode === "onShift" ? onShiftNow : [...onShiftNow, ...offShift];
  const roleFiltered = roleFilter ? baseList.filter((e) => (e.roles ?? []).includes(roleFilter)) : baseList;
  const filteredList = searchQuery.trim()
    ? roleFiltered.filter((e) => e.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : roleFiltered;

  const openAdd = () => {
    setEditEmployee(null); setNameInput(""); setPhoneInput(""); setSelectedRoles([]); setNameError("");
    setModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const openEdit = (emp: Employee) => {
    setEditEmployee(emp); setNameInput(emp.name); setPhoneInput(emp.phone ?? "");
    setSelectedRoles(emp.roles ?? []); setNameError("");
    setModalVisible(true);
    Haptics.selectionAsync();
  };

  const openDetail = (emp: Employee) => {
    setDetailEmployee(emp); setDetailVisible(true);
    Haptics.selectionAsync();
  };

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
    Haptics.selectionAsync();
  };

  const handleSave = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) { setNameError(tr.team.nameError); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); return; }
    if (employees.some((e) => e.name.toLowerCase() === trimmed.toLowerCase() && e.id !== editEmployee?.id)) {
      setNameError(tr.team.nameDuplicate); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); return;
    }
    if (editEmployee) {
      await updateEmployee(editEmployee.id, trimmed, selectedRoles, phoneInput.trim() || undefined);
    } else {
      await addEmployee(trimmed, selectedRoles, phoneInput.trim() || undefined);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setModalVisible(false);
  };

  const handleDelete = (emp: Employee) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(tr.team.deleteTitle, tr.team.deleteMsg(emp.name), [
      { text: tr.team.cancel, style: "cancel" },
      { text: tr.team.delete, style: "destructive", onPress: async () => { await deleteEmployee(emp.id); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } },
    ]);
  };

  const now = new Date();
  const monthName = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][now.getMonth()];

  const renderEmployee = ({ item }: { item: Employee }) => {
    const empColor = getColor(item.id);
    const stats = empStats[item.id] ?? { totalTips: 0, totalShifts: 0, avgPerShift: 0, shiftsLast7: 0 };
    const isActive = onShiftIds.has(item.id);
    const roles = item.roles ?? [];
    const initial = item.name.charAt(0).toUpperCase();

    return (
      <TouchableOpacity
        style={[
          styles.empCard,
          isActive
            ? { backgroundColor: "rgba(255,255,255,0.055)", borderColor: "rgba(255,255,255,0.08)" }
            : { backgroundColor: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.05)" },
        ]}
        onPress={() => openDetail(item)}
        activeOpacity={0.75}
      >
        <View style={[styles.empAvatar, { backgroundColor: isActive ? empColor + "25" : "#374151", borderColor: isActive ? empColor + "45" : "transparent" }]}>
          {isActive ? (
            <Text style={[styles.empInitial, { color: empColor }]}>{initial}</Text>
          ) : (
            <Feather name="user" size={16} color="rgba(255,255,255,0.3)" />
          )}
        </View>

        <View style={styles.empInfo}>
          <Text style={[styles.empName, { color: isActive ? "#FFFFFF" : "#9CA3AF" }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.empSub, { color: isActive ? "rgba(255,255,255,0.4)" : "#4B5563" }]}>
            {roles.length > 0 ? roles[0] : tr.team.noShifts} · {stats.totalShifts}{" "}
            {monthName}
          </Text>
        </View>

        {isActive ? (
          <View style={styles.empActiveRight}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>
              {stats.totalShifts > 0 ? `≈${Math.round(stats.avgPerShift)} ₪` : "active"}
            </Text>
          </View>
        ) : (
          <Text style={styles.offShiftLabel}>Off</Text>
        )}
      </TouchableOpacity>
    );
  };

  const modalInsets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={filteredList}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingTop: topPad + 16, paddingBottom: bottomPad }]}
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View style={styles.pageHeader}>
              <Text style={[styles.pageTitle, { color: colors.foreground }]}>{tr.team.title}</Text>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: colors.primary }]}
                onPress={openAdd}
              >
                <Feather name="plus" size={18} color="#111827" />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={[styles.searchBar, { backgroundColor: "rgba(255,255,255,0.055)", borderColor: "rgba(255,255,255,0.07)" }]}>
              <Feather name="search" size={14} color="rgba(255,255,255,0.3)" />
              <TextInput
                style={[styles.searchInput, { color: colors.foreground }]}
                placeholder={tr.team.namePlaceholder}
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Feather name="x" size={14} color="rgba(255,255,255,0.3)" />
                </TouchableOpacity>
              )}
            </View>

            {/* Filter Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {[
                { key: "all", label: `${tr.team.allTeam} ${employees.length}` },
                { key: "onShift", label: `On shift ${onShiftNow.length}` },
              ].map(({ key, label }) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.filterPill,
                    filterMode === key && !roleFilter
                      ? { backgroundColor: "#F59E0B" }
                      : { backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
                  ]}
                  onPress={() => { setFilterMode(key as "all" | "onShift"); setRoleFilter(null); Haptics.selectionAsync(); }}
                >
                  <Text style={[styles.filterPillText, { color: filterMode === key && !roleFilter ? "#111827" : "rgba(255,255,255,0.45)" }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
              {allRoles.map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.filterPill,
                    roleFilter === role
                      ? { backgroundColor: "#A78BFA" }
                      : { backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
                  ]}
                  onPress={() => { setRoleFilter(roleFilter === role ? null : role); Haptics.selectionAsync(); }}
                >
                  <Text style={[styles.filterPillText, { color: roleFilter === role ? "#fff" : "rgba(255,255,255,0.45)" }]}>
                    {role}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Section label */}
            {onShiftNow.length > 0 && filterMode === "all" && (
              <Text style={styles.sectionLabel}>На смене сейчас</Text>
            )}
          </View>
        }
        renderItem={renderEmployee}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
              <Feather name="users" size={32} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{tr.team.emptyTitle}</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>{tr.team.emptySub}</Text>
          </View>
        }
      />

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.overlayDismiss} activeOpacity={1} onPress={() => setModalVisible(false)} />
          <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: Math.max(modalInsets.bottom, 20) }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
                {editEmployee ? tr.team.editTitle : tr.team.addTitle}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <KeyboardAwareScrollView style={styles.sheetBody} keyboardShouldPersistTaps="handled" bounces={false}>
              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>{tr.team.nameLabel}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.secondary, borderColor: nameError ? colors.destructive : colors.border, color: colors.foreground }]}
                placeholder={tr.team.namePlaceholder}
                placeholderTextColor={colors.mutedForeground}
                value={nameInput}
                onChangeText={(t) => { setNameInput(t); setNameError(""); }}
                autoFocus
                returnKeyType="next"
              />
              {!!nameError && <Text style={[styles.errorText, { color: colors.destructive }]}>{nameError}</Text>}

              <Text style={[styles.inputLabel, { color: colors.mutedForeground, marginTop: 14 }]}>{tr.team.phoneLabel}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
                placeholder="+972 5X XXX XXXX"
                placeholderTextColor={colors.mutedForeground}
                value={phoneInput}
                onChangeText={setPhoneInput}
                keyboardType="phone-pad"
                returnKeyType="done"
              />

              <Text style={[styles.inputLabel, { color: colors.mutedForeground, marginTop: 14 }]}>{tr.team.rolesLabel}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rolesScroll}>
                {tr.roleList.map((role) => {
                  const active = selectedRoles.includes(role);
                  return (
                    <TouchableOpacity
                      key={role}
                      style={[styles.roleBtn, { backgroundColor: active ? colors.primary + "22" : colors.secondary, borderColor: active ? colors.primary : colors.border }]}
                      onPress={() => toggleRole(role)}
                    >
                      {active && <Feather name="check" size={12} color={colors.primary} />}
                      <Text style={[styles.roleBtnText, { color: active ? colors.primary : colors.mutedForeground }]}>{role}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              {selectedRoles.length === 0 && (
                <Text style={[styles.rolesHint, { color: colors.mutedForeground }]}>{tr.team.rolesHint}</Text>
              )}
              <View style={{ height: 16 }} />
            </KeyboardAwareScrollView>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary, marginHorizontal: 20 }]}
              onPress={handleSave}
            >
              <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>
                {editEmployee ? tr.team.save : tr.team.addBtn}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <EmployeeDetailModal
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        onEdit={() => detailEmployee && openEdit(detailEmployee)}
        onDelete={() => detailEmployee && handleDelete(detailEmployee)}
        employee={detailEmployee}
        dayEntries={dayEntries}
        avatarColor={detailEmployee ? getColor(detailEmployee.id) : "#F59E0B"}
        isOnShift={detailEmployee ? onShiftIds.has(detailEmployee.id) : false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: 16 },

  pageHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  pageTitle: { fontSize: 26, fontFamily: "Inter_700Bold" },
  addBtn: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },

  searchBar: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 11, borderWidth: 1, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },

  filterRow: { gap: 8, paddingBottom: 4, marginBottom: 14 },
  filterPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 14 },
  filterPillText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  sectionLabel: { fontSize: 10, color: "#6B7280", fontFamily: "Inter_600SemiBold", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 10 },

  empCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 18, borderWidth: 1 },
  empAvatar: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  empInitial: { fontSize: 15, fontFamily: "Inter_700Bold" },
  empInfo: { flex: 1 },
  empName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  empSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  empActiveRight: { flexDirection: "row", alignItems: "center", gap: 5 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#4ADE80" },
  liveText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#4ADE80" },
  offShiftLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#4B5563" },

  emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 40 },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  overlayDismiss: { flex: 1 },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 12, marginBottom: 8 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  sheetBody: { paddingHorizontal: 20 },
  inputLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.6 },
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, fontFamily: "Inter_500Medium", borderWidth: 1 },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 6 },
  rolesScroll: { gap: 8, paddingRight: 4, paddingBottom: 4 },
  roleBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  roleBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  rolesHint: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 6 },
  saveBtn: { marginTop: 8, marginBottom: 4, borderRadius: 12, paddingVertical: 16, alignItems: "center" },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_700Bold" },
});
