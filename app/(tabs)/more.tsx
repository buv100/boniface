import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SmartChecklistModal } from "@/components/SmartChecklistModal";
import { useAuth } from "@/context/AuthContext";
import { Checklist, getLocalizedChecklist, useBoniface } from "@/context/BonifaceContext";
import { useLang } from "@/context/LangContext";
import { Lang } from "@/lib/translations";
import { useColors } from "@/hooks/useColors";

const LANG_OPTIONS: { key: Lang; label: string; flag: string }[] = [
  { key: "ru", label: "Русский", flag: "🇷🇺" },
  { key: "en", label: "English", flag: "🇺🇸" },
  { key: "he", label: "עברית", flag: "🇮🇱" },
];

export default function MoreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tr } = useLang();
  const { checklists, lowStockCount, toggleChecklistItem, resetChecklist, addChecklist, deleteChecklist, addChecklistItem, deleteChecklistItem } = useBoniface();
  const { lang, setLang } = useLang();
  const { isLoggedIn, manager, venue, employee, subscriptionExpired } = useAuth();
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [openChecklist, setOpenChecklist] = useState<string | null>(null);
  const [smartChecklist, setSmartChecklist] = useState<Checklist | null>(null);
  const [smartVisible, setSmartVisible] = useState(false);
  const [newClTitle, setNewClTitle] = useState("");
  const [addingCl, setAddingCl] = useState(false);
  const [newItemText, setNewItemText] = useState<Record<string, string>>({});

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : 84 + insets.bottom;

  const openSmartMode = (cl: Checklist) => {
    setSmartChecklist(cl);
    setSmartVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const menuItems = [
    {
      id: "search",
      label: tr.more.searchItem,
      sub: tr.more.searchDesc,
      icon: "search",
      iconColor: "#38BDF8",
      soon: false,
      onPress: () => { Haptics.selectionAsync(); router.navigate("/search" as any); },
    },
    {
      id: "history",
      label: tr.more.historyItem,
      sub: tr.more.historyDesc,
      icon: "clock",
      iconColor: "#F97316",
      soon: false,
      onPress: () => { Haptics.selectionAsync(); router.navigate("/history"); },
    },
    {
      id: "stats",
      label: tr.more.statsItem,
      sub: tr.more.statsDesc,
      icon: "bar-chart-2",
      iconColor: "#EC4899",
      soon: false,
      onPress: () => { Haptics.selectionAsync(); router.navigate("/stats"); },
    },
    {
      id: "checklists",
      label: tr.more.checklistsItem,
      sub: tr.more.checklistsDesc(checklists.length),
      icon: "check-square",
      iconColor: "#10B981",
      soon: false,
      onPress: () => {
        Haptics.selectionAsync();
        setOpenSection(openSection === "checklists" ? null : "checklists");
        if (openSection === "checklists") setOpenChecklist(null);
      },
    },
    {
      id: "stock",
      label: tr.more.stockItem,
      sub: lowStockCount > 0 ? tr.more.stockLow(lowStockCount) : tr.more.stockOk,
      icon: "layers",
      iconColor: "#3B82F6",
      badge: lowStockCount > 0 ? String(lowStockCount) : undefined,
      soon: false,
      onPress: () => { Haptics.selectionAsync(); router.navigate("/bar"); },
    },
    {
      id: "cards",
      label: tr.more.cardsItem,
      sub: tr.more.cardsDesc,
      icon: "star",
      iconColor: "#F59E0B",
      soon: false,
      onPress: () => { Haptics.selectionAsync(); router.navigate("/cards"); },
    },
  ];

  const renderMenuItem = (item: typeof menuItems[0]) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={item.onPress}
      activeOpacity={item.soon ? 1 : 0.75}
    >
      <View style={[styles.menuIcon, { backgroundColor: item.iconColor + "22" }]}>
        <Feather name={item.icon as any} size={20} color={item.iconColor} />
      </View>
      <View style={styles.menuInfo}>
        <Text style={[styles.menuLabel, { color: item.soon ? colors.mutedForeground : colors.foreground }]}>
          {item.label}
        </Text>
        {item.sub && (
          <Text style={[styles.menuSub, { color: colors.mutedForeground }]}>{item.sub}</Text>
        )}
      </View>
      <View style={styles.menuRight}>
        {"badge" in item && item.badge && (
          <View style={[styles.badge, { backgroundColor: colors.destructive }]}>
            <Text style={styles.badgeText}>{item.badge}</Text>
          </View>
        )}
        {item.soon ? (
          <View style={[styles.soonBadge, { backgroundColor: colors.primary + "22" }]}>
            <Text style={[styles.soonText, { color: colors.primary }]}>{tr.more.soon}</Text>
          </View>
        ) : (
          <Feather
            name={item.id === "checklists" && openSection === "checklists" ? "chevron-up" : "chevron-right"}
            size={16}
            color={colors.mutedForeground}
          />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 8, paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>{tr.more.title}</Text>
        <Text style={[styles.pageSub, { color: colors.mutedForeground }]}>{tr.more.sub}</Text>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{tr.more.featuresSection}</Text>
        <View style={styles.menuList}>
          {menuItems.map(renderMenuItem)}
        </View>

        {/* Checklists expansion */}
        {openSection === "checklists" && (
          <View style={[styles.checklistExpand, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {checklists.map((cl, clIdx) => {
              const loc = getLocalizedChecklist(cl, tr);
              const done = cl.items.filter((i) => i.done).length;
              const total = cl.items.length;
              const pct = total > 0 ? (done / total) * 100 : 0;
              const isOpen = openChecklist === cl.id;
              const isCustom = cl.type === "custom";

              return (
                <View key={cl.id}>
                  <TouchableOpacity
                    style={[
                      styles.clRow,
                      { borderBottomColor: colors.border },
                      isOpen && { borderBottomWidth: 0 },
                      clIdx === checklists.length - 1 && !isOpen && { borderBottomWidth: 0 },
                    ]}
                    onPress={() => { Haptics.selectionAsync(); setOpenChecklist(isOpen ? null : cl.id); }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.clLeft}>
                      <View style={styles.clTitleRow}>
                        <Text style={[styles.clTitle, { color: colors.foreground }]}>{loc.title}</Text>
                        <View style={styles.clMeta}>
                          {pct === 100 && (
                            <View style={[styles.clDoneBadge, { backgroundColor: "#10B98122" }]}>
                              <Feather name="check-circle" size={11} color="#10B981" />
                              <Text style={[styles.clDoneText, { color: "#10B981" }]}>{tr.more.done}</Text>
                            </View>
                          )}
                          <Text style={[styles.clCount, { color: colors.mutedForeground }]}>{done}/{total}</Text>
                        </View>
                      </View>
                      <View style={styles.clProgress}>
                        <View style={[styles.clTrack, { backgroundColor: colors.border }]}>
                          <View style={[styles.clFill, { width: `${pct}%` as any, backgroundColor: pct === 100 ? "#10B981" : colors.primary }]} />
                        </View>
                      </View>
                    </View>
                    {isCustom && (
                      <TouchableOpacity
                        style={styles.clDeleteBtn}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          Alert.alert(tr.more.deleteChecklistTitle, tr.more.deleteChecklistMsg(loc.title), [
                            { text: tr.more.cancel, style: "cancel" },
                            { text: tr.more.delete, style: "destructive", onPress: () => deleteChecklist(cl.id) },
                          ]);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Feather name="trash-2" size={14} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                    <Feather name={isOpen ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} style={{ marginLeft: isCustom ? 6 : 8 }} />
                  </TouchableOpacity>

                  {isOpen && (
                    <View style={[styles.clItems, { borderBottomColor: colors.border, borderBottomWidth: clIdx < checklists.length - 1 ? 1 : 0 }]}>
                      {!isCustom && (
                        <TouchableOpacity
                          style={[styles.smartBtn, { backgroundColor: "#10B98114", borderColor: "#10B98133" }]}
                          onPress={() => openSmartMode(cl)}
                        >
                          <Feather name="zap" size={14} color="#10B981" />
                          <Text style={[styles.smartBtnText, { color: "#10B981" }]}>{tr.more.smartMode}</Text>
                          <Feather name="arrow-right" size={13} color="#10B981" />
                        </TouchableOpacity>
                      )}

                      {loc.items.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={[styles.clItem, { borderBottomColor: colors.border }]}
                          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleChecklistItem(cl.id, item.id); }}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.checkbox, { borderColor: item.done ? "#10B981" : colors.border, backgroundColor: item.done ? "#10B98122" : "transparent" }]}>
                            {item.done && <Feather name="check" size={11} color="#10B981" />}
                          </View>
                          <Text style={[styles.clItemText, { color: item.done ? colors.mutedForeground : colors.foreground }, item.done && styles.clItemDone]}>
                            {item.text}
                          </Text>
                          {isCustom && (
                            <TouchableOpacity onPress={() => deleteChecklistItem(cl.id, item.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                              <Feather name="x" size={13} color={colors.mutedForeground} />
                            </TouchableOpacity>
                          )}
                        </TouchableOpacity>
                      ))}

                      {isCustom && (
                        <View style={[styles.addItemRow, { borderTopColor: colors.border }]}>
                          <TextInput
                            style={[styles.addItemInput, { color: colors.foreground }]}
                            placeholder={tr.more.addItemPlaceholder}
                            placeholderTextColor={colors.mutedForeground}
                            value={newItemText[cl.id] ?? ""}
                            onChangeText={(t) => setNewItemText((prev) => ({ ...prev, [cl.id]: t }))}
                            onSubmitEditing={() => {
                              const text = (newItemText[cl.id] ?? "").trim();
                              if (text) { addChecklistItem(cl.id, text); setNewItemText((prev) => ({ ...prev, [cl.id]: "" })); }
                            }}
                            returnKeyType="done"
                          />
                          <TouchableOpacity
                            onPress={() => {
                              const text = (newItemText[cl.id] ?? "").trim();
                              if (text) { addChecklistItem(cl.id, text); setNewItemText((prev) => ({ ...prev, [cl.id]: "" })); Haptics.selectionAsync(); }
                            }}
                          >
                            <Feather name="plus-circle" size={18} color={colors.primary} />
                          </TouchableOpacity>
                        </View>
                      )}

                      {done > 0 && (
                        <TouchableOpacity
                          style={[styles.resetBtn, { borderTopColor: colors.border }]}
                          onPress={() => { Haptics.selectionAsync(); resetChecklist(cl.id); }}
                        >
                          <Feather name="refresh-cw" size={13} color={colors.mutedForeground} />
                          <Text style={[styles.resetText, { color: colors.mutedForeground }]}>{tr.more.resetChecklist}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              );
            })}

            {/* New Checklist */}
            {addingCl ? (
              <View style={[styles.newClForm, { borderTopColor: colors.border }]}>
                <TextInput
                  style={[styles.newClInput, { color: colors.foreground, borderColor: colors.border }]}
                  placeholder={tr.more.newChecklistPlaceholder}
                  placeholderTextColor={colors.mutedForeground}
                  value={newClTitle}
                  onChangeText={setNewClTitle}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    const t = newClTitle.trim();
                    if (t) { addChecklist(t); setNewClTitle(""); setAddingCl(false); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }
                  }}
                />
                <View style={styles.newClBtns}>
                  <TouchableOpacity style={[styles.newClCancel, { borderColor: colors.border }]} onPress={() => { setAddingCl(false); setNewClTitle(""); }}>
                    <Text style={[styles.newClCancelText, { color: colors.mutedForeground }]}>{tr.more.cancel}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.newClSave, { backgroundColor: newClTitle.trim() ? colors.primary : colors.secondary }]}
                    onPress={() => {
                      const t = newClTitle.trim();
                      if (t) { addChecklist(t); setNewClTitle(""); setAddingCl(false); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }
                    }}
                  >
                    <Feather name="check" size={14} color={newClTitle.trim() ? "#111827" : colors.mutedForeground} />
                    <Text style={[styles.newClSaveText, { color: newClTitle.trim() ? "#111827" : colors.mutedForeground }]}>{tr.more.create}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.newClBtn, { borderTopColor: colors.border }]}
                onPress={() => { setAddingCl(true); Haptics.selectionAsync(); }}
              >
                <Feather name="plus" size={15} color={colors.primary} />
                <Text style={[styles.newClBtnText, { color: colors.primary }]}>{tr.more.newChecklist}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Language */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 24 }]}>{tr.more.langSection}</Text>
        <View style={[styles.langBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {LANG_OPTIONS.map((opt) => {
            const selected = lang === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.langBtn, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary + "18" : "transparent" }]}
                onPress={() => { setLang(opt.key); Haptics.selectionAsync(); }}
              >
                <Text style={styles.flag}>{opt.flag}</Text>
                <Text style={[styles.langText, { color: selected ? colors.primary : colors.mutedForeground }]}>{opt.label}</Text>
                {selected && <Feather name="check" size={14} color={colors.primary} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Account */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 24 }]}>{tr.more.accountSection}</Text>
        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: colors.card, borderColor: isLoggedIn ? colors.primary + "33" : colors.border, marginBottom: 8 }]}
          onPress={() => { Haptics.selectionAsync(); router.navigate("/account"); }}
          activeOpacity={0.75}
        >
          <View style={[styles.menuIcon, { backgroundColor: isLoggedIn ? colors.primary + "22" : colors.secondary }]}>
            <Feather name="user" size={20} color={isLoggedIn ? colors.primary : colors.mutedForeground} />
          </View>
          <View style={styles.menuInfo}>
            <Text style={[styles.menuLabel, { color: colors.foreground }]}>
              {isLoggedIn && (manager ?? employee) ? (manager ?? employee)!.name : tr.more.loginBtn}
            </Text>
            <Text style={[styles.menuSub, { color: colors.mutedForeground }]}>
              {isLoggedIn && venue
                ? `${venue.name}${subscriptionExpired ? ` · ${tr.subscription.expiredWarning}` : ""}`
                : tr.more.localOnly}
            </Text>
          </View>
          {isLoggedIn && (
            <View style={[styles.soonBadge, { backgroundColor: "#10B98122" }]}>
              <Text style={[styles.soonText, { color: "#10B981" }]}>{tr.more.online}</Text>
            </View>
          )}
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>

        {/* About */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 16 }]}>{tr.more.aboutSection}</Text>
        <View style={[styles.aboutBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.brandName, { color: colors.primary }]}>BONIFACE</Text>
          <Text style={[styles.version, { color: colors.mutedForeground }]}>{tr.more.aboutVersion}</Text>
          <Text style={[styles.aboutText, { color: colors.mutedForeground }]}>{tr.more.aboutDesc}</Text>
          <View style={[styles.subscriptionBadge, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "33" }]}>
            <Feather name="star" size={13} color={colors.primary} />
            <Text style={[styles.subscriptionText, { color: colors.primary }]}>{tr.more.subscriptionText}</Text>
          </View>
          <TouchableOpacity style={{ marginTop: 12 }} onPress={() => router.push("/privacy" as any)}>
            <Text style={{ color: colors.primary, fontFamily: "Inter_500Medium", textAlign: "center" }}>{tr.more.privacyLink}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ marginTop: 8 }} onPress={() => router.push("/terms" as any)}>
            <Text style={{ color: colors.primary, fontFamily: "Inter_500Medium", textAlign: "center" }}>{tr.more.termsLink}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <SmartChecklistModal
        visible={smartVisible}
        checklist={smartChecklist}
        onClose={() => setSmartVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16 },
  pageTitle: { fontSize: 26, fontFamily: "Inter_700Bold", marginBottom: 4 },
  pageSub: { fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginBottom: 10 },
  menuList: { gap: 8, marginBottom: 8 },
  menuItem: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, gap: 12 },
  menuIcon: { width: 40, height: 40, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  menuInfo: { flex: 1 },
  menuLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  menuSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  menuRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  badgeText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#fff" },
  soonBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  soonText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  checklistExpand: { borderRadius: 14, borderWidth: 1, marginBottom: 8, overflow: "hidden" },
  clRow: { flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: 1 },
  clLeft: { flex: 1 },
  clTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  clTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  clMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  clDoneBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  clDoneText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  clCount: { fontSize: 12, fontFamily: "Inter_500Medium" },
  clProgress: { flexDirection: "row", alignItems: "center" },
  clTrack: { flex: 1, height: 3, borderRadius: 2, overflow: "hidden" },
  clFill: { height: "100%", borderRadius: 2 },
  clItems: { paddingBottom: 4 },
  smartBtn: { flexDirection: "row", alignItems: "center", gap: 8, margin: 10, padding: 11, borderRadius: 10, borderWidth: 1 },
  smartBtnText: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  clItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  clItemText: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
  clItemDone: { textDecorationLine: "line-through" },
  resetBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 4 },
  resetText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  clDeleteBtn: { padding: 4, marginLeft: 4 },
  addItemRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  addItemInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  newClBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth },
  newClBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  newClForm: { borderTopWidth: StyleSheet.hairlineWidth, padding: 14, gap: 10 },
  newClInput: { fontSize: 15, fontFamily: "Inter_500Medium", borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  newClBtns: { flexDirection: "row", gap: 8 },
  newClCancel: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  newClCancelText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  newClSave: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 10, paddingVertical: 10 },
  newClSaveText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  langBox: { borderRadius: 14, borderWidth: 1, padding: 8, gap: 6 },
  langBtn: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 10, borderWidth: 1 },
  flag: { fontSize: 20 },
  langText: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  aboutBox: { borderRadius: 14, borderWidth: 1, padding: 20, alignItems: "center", gap: 6 },
  brandName: { fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: 4 },
  version: { fontSize: 13, fontFamily: "Inter_400Regular" },
  aboutText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, marginTop: 4 },
  subscriptionBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginTop: 8 },
  subscriptionText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
