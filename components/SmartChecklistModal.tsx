import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Checklist, getLocalizedChecklist, useBoniface } from "@/context/BonifaceContext";
import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  checklist: Checklist | null;
  onClose: () => void;
}

export function SmartChecklistModal({ visible, checklist, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tr } = useLang();
  const { toggleChecklistItem, resetChecklist } = useBoniface();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(1));
  const [scaleAnim] = useState(new Animated.Value(1));

  const localized = checklist ? getLocalizedChecklist(checklist, tr) : null;
  const items = localized?.items ?? [];
  const total = items.length;
  const done = items.filter((i) => i.done).length;
  const allDone = done === total && total > 0;

  const currentItem = items[currentIndex];

  useEffect(() => {
    if (visible && checklist) {
      const firstUndone = items.findIndex((i) => !i.done);
      setCurrentIndex(firstUndone >= 0 ? firstUndone : 0);
    }
  }, [visible, checklist?.id]);

  const animateTransition = (callback: () => void) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 120, useNativeDriver: true }),
    ]).start(() => {
      callback();
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    });
  };

  const handleToggle = async () => {
    if (!checklist || !currentItem) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await toggleChecklistItem(checklist.id, currentItem.id);
    if (!currentItem.done && currentIndex < total - 1) {
      animateTransition(() => setCurrentIndex((i) => i + 1));
    }
  };

  const handleNext = () => {
    if (currentIndex < total - 1) {
      animateTransition(() => setCurrentIndex((i) => i + 1));
      Haptics.selectionAsync();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      animateTransition(() => setCurrentIndex((i) => i - 1));
      Haptics.selectionAsync();
    }
  };

  const handleReset = async () => {
    if (!checklist) return;
    await resetChecklist(checklist.id);
    setCurrentIndex(0);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  if (!checklist) return null;

  const progress = total > 0 ? done / total : 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Feather name="x" size={22} color={colors.mutedForeground} />
          </TouchableOpacity>
          <Text style={[styles.topTitle, { color: colors.mutedForeground }]} numberOfLines={1}>
            {localized?.title ?? checklist.title}
          </Text>
          <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
            <Feather name="refresh-cw" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <Animated.View
            style={[styles.progressFill, {
              width: `${progress * 100}%` as any,
              backgroundColor: allDone ? "#10B981" : colors.primary,
            }]}
          />
        </View>

        <View style={styles.counter}>
          <Text style={[styles.counterText, { color: colors.mutedForeground }]}>
            {done} / {total}
          </Text>
        </View>

        {allDone ? (
          <View style={styles.doneState}>
            <View style={[styles.doneIcon, { backgroundColor: "#10B98122" }]}>
              <Feather name="check-circle" size={56} color="#10B981" />
            </View>
            <Text style={[styles.doneTitle, { color: "#10B981" }]}>{tr.smartChecklist.allDone}</Text>
            <Text style={[styles.doneSub, { color: colors.mutedForeground }]}>
              {tr.smartChecklist.allDoneSub(localized?.title ?? checklist.title)}
            </Text>
            <TouchableOpacity
              style={[styles.doneBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={[styles.doneBtnText, { color: colors.foreground }]}>{tr.smartChecklist.close}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Animated.View style={[styles.cardArea, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.itemNav}>
              {items.map((item, idx) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.navDot,
                    {
                      backgroundColor: item.done ? "#10B981" : idx === currentIndex ? colors.primary : colors.border,
                      width: idx === currentIndex ? 20 : 8,
                    }
                  ]}
                  onPress={() => { animateTransition(() => setCurrentIndex(idx)); Haptics.selectionAsync(); }}
                />
              ))}
            </View>

            <View style={[styles.itemCard, { backgroundColor: colors.card, borderColor: currentItem?.done ? "#10B98133" : colors.border }]}>
              {currentItem?.done && (
                <View style={[styles.doneOverlay, { backgroundColor: "#10B98108" }]}>
                  <Feather name="check" size={20} color="#10B981" />
                </View>
              )}
              <Text style={[styles.stepNum, { color: colors.mutedForeground }]}>
                {tr.smartChecklist.step(currentIndex + 1)}
              </Text>
              <Text style={[styles.itemText, {
                color: currentItem?.done ? colors.mutedForeground : colors.foreground,
                textDecorationLine: currentItem?.done ? "line-through" : "none",
              }]}>
                {currentItem?.text}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.checkBtn, {
                backgroundColor: currentItem?.done ? "#10B98122" : colors.primary,
                borderColor: currentItem?.done ? "#10B98155" : "transparent",
              }]}
              onPress={handleToggle}
              activeOpacity={0.8}
            >
              <Feather
                name={currentItem?.done ? "x" : "check"}
                size={28}
                color={currentItem?.done ? "#10B981" : colors.primaryForeground}
              />
              <Text style={[styles.checkBtnText, {
                color: currentItem?.done ? "#10B981" : colors.primaryForeground,
              }]}>
                {currentItem?.done ? tr.smartChecklist.uncheck : tr.smartChecklist.markDone}
              </Text>
            </TouchableOpacity>

            <View style={styles.navBtns}>
              <TouchableOpacity
                style={[styles.navBtn, { backgroundColor: currentIndex > 0 ? colors.card : "transparent", borderColor: currentIndex > 0 ? colors.border : "transparent" }]}
                onPress={handlePrev}
                disabled={currentIndex === 0}
              >
                <Feather name="chevron-left" size={22} color={currentIndex > 0 ? colors.foreground : "transparent"} />
              </TouchableOpacity>
              <Text style={[styles.navHint, { color: colors.mutedForeground }]}>
                {currentIndex < total - 1 ? tr.smartChecklist.next : tr.smartChecklist.lastItem}
              </Text>
              <TouchableOpacity
                style={[styles.navBtn, { backgroundColor: currentIndex < total - 1 ? colors.card : "transparent", borderColor: currentIndex < total - 1 ? colors.border : "transparent" }]}
                onPress={handleNext}
                disabled={currentIndex === total - 1}
              >
                <Feather name="chevron-right" size={22} color={currentIndex < total - 1 ? colors.foreground : "transparent"} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        <View style={{ height: insets.bottom + 16 }} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12 },
  closeBtn: { padding: 4 },
  resetBtn: { padding: 4 },
  topTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1, textAlign: "center", marginHorizontal: 12 },
  progressBar: { height: 3, marginHorizontal: 20, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  counter: { alignItems: "center", marginTop: 10 },
  counterText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  cardArea: { flex: 1, paddingHorizontal: 24, justifyContent: "center", gap: 24 },
  itemNav: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 5, height: 8 },
  navDot: { height: 8, borderRadius: 4 },
  itemCard: { borderRadius: 20, borderWidth: 1, padding: 32, minHeight: 180, justifyContent: "center", gap: 12, overflow: "hidden" },
  doneOverlay: { position: "absolute", top: 16, right: 16, width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  stepNum: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.6, textTransform: "uppercase" },
  itemText: { fontSize: 22, fontFamily: "Inter_600SemiBold", lineHeight: 32 },
  checkBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 18, borderRadius: 18, borderWidth: 1.5 },
  checkBtnText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  navBtns: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  navBtn: { width: 48, height: 48, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  navHint: { fontSize: 13, fontFamily: "Inter_400Regular" },
  doneState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 32 },
  doneIcon: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  doneTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
  doneSub: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center" },
  doneBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 16, borderWidth: 1, marginTop: 8 },
  doneBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
