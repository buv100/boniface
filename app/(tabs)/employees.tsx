import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Employee, useApp } from "@/context/AppContext";
import { useLang } from "@/context/LangContext";
import { Lang } from "@/lib/translations";
import { useColors } from "@/hooks/useColors";

const LANG_OPTIONS: { key: Lang; label: string; flag: string }[] = [
  { key: "ru", label: "Русский", flag: "🇷🇺" },
  { key: "en", label: "English", flag: "🇺🇸" },
  { key: "he", label: "עברית", flag: "🇮🇱" },
];

export default function EmployeesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { employees, addEmployee, updateEmployee, deleteEmployee } = useApp();
  const { tr, lang, setLang, isRTL } = useLang();

  const [modalVisible, setModalVisible] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [nameError, setNameError] = useState("");

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 + 84 : 84 + insets.bottom;

  const openAdd = () => {
    setEditEmployee(null);
    setNameInput("");
    setNameError("");
    setModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const openEdit = (emp: Employee) => {
    setEditEmployee(emp);
    setNameInput(emp.name);
    setNameError("");
    setModalVisible(true);
    Haptics.selectionAsync();
  };

  const handleSave = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setNameError(tr.employees.errorEmpty);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (employees.some((e) => e.name.toLowerCase() === trimmed.toLowerCase() && e.id !== editEmployee?.id)) {
      setNameError(tr.employees.errorDuplicate);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (editEmployee) {
      await updateEmployee(editEmployee.id, trimmed);
    } else {
      await addEmployee(trimmed);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setModalVisible(false);
  };

  const handleDelete = (emp: Employee) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      tr.employees.deleteTitle,
      tr.employees.deleteMsg(emp.name),
      [
        { text: tr.employees.cancel, style: "cancel" },
        {
          text: tr.employees.delete,
          style: "destructive",
          onPress: async () => {
            await deleteEmployee(emp.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const COLORS_LIST = ["#F59E0B","#3B82F6","#10B981","#EF4444","#8B5CF6","#EC4899","#06B6D4","#F97316"];
  const getColor = (i: number) => COLORS_LIST[i % COLORS_LIST.length];

  const renderEmployee = ({ item, index }: { item: Employee; index: number }) => {
    const empColor = getColor(index);
    return (
      <View style={[styles.empCard, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <View style={[styles.empLeft, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={[styles.avatar, { backgroundColor: empColor + "22" }]}>
            <Text style={[styles.avatarText, { color: empColor }]}>{item.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={[styles.empName, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>{item.name}</Text>
        </View>
        <View style={styles.empActions}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.secondary }]} onPress={() => openEdit(item)}>
            <Feather name="edit-2" size={15} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.destructive + "18" }]} onPress={() => handleDelete(item)}>
            <Feather name="trash-2" size={15} color={colors.destructive} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const LanguageSelector = () => (
    <View style={[styles.settingsSection, { borderTopColor: colors.border }]}>
      <Text style={[styles.settingsTitle, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>
        {tr.employees.settingsTitle}
      </Text>
      <View style={[styles.langRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <Text style={[styles.langLabel, { color: colors.foreground }]}>{tr.employees.langLabel}</Text>
        <View style={[styles.langBtns, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          {LANG_OPTIONS.map((opt) => {
            const selected = lang === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.langBtn,
                  { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary + "18" : colors.card },
                ]}
                onPress={() => { setLang(opt.key); Haptics.selectionAsync(); }}
              >
                <Text style={styles.langFlag}>{opt.flag}</Text>
                <Text style={[styles.langBtnText, { color: selected ? colors.primary : colors.mutedForeground }]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );

  const modalInsets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={employees}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingTop: topPadding + 16, paddingBottom: bottomPadding }]}
        ListHeaderComponent={
          <View style={styles.pageHeader}>
            <Text style={[styles.pageTitle, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>{tr.employees.title}</Text>
            <Text style={[styles.pageSubtitle, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>{tr.employees.count(employees.length)}</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={renderEmployee}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
              <Feather name="users" size={32} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{tr.employees.emptyTitle}</Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>{tr.employees.emptySub}</Text>
          </View>
        }
        ListFooterComponent={<LanguageSelector />}
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: bottomPadding - 50 }]}
        onPress={openAdd}
      >
        <Feather name="user-plus" size={22} color={colors.primaryForeground} />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: Math.max(modalInsets.bottom, 16) }]}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
              <View style={[styles.sheetHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
                  {editEmployee ? tr.employees.editTitle : tr.employees.addTitle}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Feather name="x" size={22} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>

              <View style={styles.sheetBody}>
                <Text style={[styles.inputLabel, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>{tr.employees.nameLabel}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.secondary, borderColor: nameError ? colors.destructive : colors.border, color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
                  placeholder={tr.employees.namePlaceholder}
                  placeholderTextColor={colors.mutedForeground}
                  value={nameInput}
                  onChangeText={(t) => { setNameInput(t); setNameError(""); }}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleSave}
                />
                {!!nameError && <Text style={[styles.errorText, { color: colors.destructive }]}>{nameError}</Text>}
              </View>

              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave}>
                <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>
                  {editEmployee ? tr.employees.save : tr.employees.add}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: 16 },
  pageHeader: { marginBottom: 20 },
  pageTitle: { fontSize: 26, fontFamily: "Inter_700Bold" },
  pageSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 4 },
  empCard: { alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 12, borderWidth: 1 },
  empLeft: { alignItems: "center", gap: 12, flex: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 17, fontFamily: "Inter_700Bold" },
  empName: { fontSize: 16, fontFamily: "Inter_500Medium" },
  empActions: { flexDirection: "row", gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  fab: { position: "absolute", right: 20, width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", shadowColor: "#F59E0B", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 40 },
  settingsSection: { marginTop: 32, paddingTop: 24, borderTopWidth: 1 },
  settingsTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 16 },
  langRow: { alignItems: "center", justifyContent: "space-between", gap: 12 },
  langLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  langBtns: { gap: 8, flex: 1, justifyContent: "flex-end" },
  langBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  langFlag: { fontSize: 16 },
  langBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 12, marginBottom: 8 },
  sheetHeader: { alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  sheetBody: { paddingHorizontal: 20, paddingBottom: 8 },
  inputLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.6 },
  input: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, fontFamily: "Inter_500Medium", borderWidth: 1 },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 6 },
  saveBtn: { margin: 20, marginTop: 12, borderRadius: 12, paddingVertical: 16, alignItems: "center" },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_700Bold" },
});
