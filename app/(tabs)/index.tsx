import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AddShiftModal } from "@/components/AddShiftModal";
import { DatePickerModal } from "@/components/DatePickerModal";
import { EndShiftSummaryModal } from "@/components/EndShiftSummaryModal";
import { ShiftCard } from "@/components/ShiftCard";
import { StartShiftModal } from "@/components/StartShiftModal";
import { TipsEntryModal } from "@/components/TipsEntryModal";
import { VenuePickerModal } from "@/components/VenuePickerModal";
import { HeaderIconButton } from "@/components/HeaderIconButton";
import { HintBanner, PrimaryButton } from "@/components/ui/EasyUI";
import {
  DayEntry,
  ShiftEntry,
  addDays,
  calcDayResults,
  formatDateRu,
  generateId,
  todayString,
  useApp,
} from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useBoniface } from "@/context/BonifaceContext";
import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";

const STAFF_COLORS = ["#F59E0B", "#A78BFA", "#38BDF8", "#4ADE80", "#FB923C", "#F472B6"];

function makeFreshEntry(date: string): DayEntry {
  return { id: generateId(), date, totalCash: 0, totalCard: 0, shifts: [] };
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tr, isRTL } = useLang();
  const { dayEntries, saveDayEntry, employees } = useApp();
  const { shiftState, startShift, endShift, lowStockCount, stopList, checklists } = useBoniface();
  const { venue, manager, subscriptionExpired } = useAuth();

  const today = todayString();
  const [selectedDate, setSelectedDate] = useState(today);
  const [draft, setDraft] = useState<DayEntry>(() => {
    const ex = dayEntries.find((e) => e.date === today);
    return ex ?? makeFreshEntry(today);
  });
  const [shiftModal, setShiftModal] = useState(false);
  const [editShift, setEditShift] = useState<ShiftEntry | undefined>();
  const [datePicker, setDatePicker] = useState(false);
  const [tick, setTick] = useState(0);
  const [startShiftModal, setStartShiftModal] = useState(false);
  const [endShiftModal, setEndShiftModal] = useState(false);
  const [tipsModal, setTipsModal] = useState(false);
  const [titleWidth, setTitleWidth] = useState<number | undefined>();

  const draftRef = useRef(draft);
  draftRef.current = draft;

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const ex = dayEntries.find((e) => e.date === selectedDate);
    if (ex) setDraft(ex);
  }, [dayEntries, selectedDate]);

  const loadDate = (date: string) => {
    const ex = dayEntries.find((e) => e.date === date);
    setDraft(ex ?? makeFreshEntry(date));
  };

  const handleDateNav = (dir: -1 | 1) => {
    if (dir === 1 && selectedDate >= today) return;
    const d = addDays(selectedDate, dir);
    setSelectedDate(d);
    loadDate(d);
    Haptics.selectionAsync();
  };

  const commitDraft = (updated: DayEntry) => {
    setDraft(updated);
    saveDayEntry(updated);
  };

  const handleAddShift = (shift: ShiftEntry) => {
    const exists = draftRef.current.shifts.find((s) => s.id === shift.id);
    const updated = exists
      ? { ...draftRef.current, shifts: draftRef.current.shifts.map((s) => (s.id === shift.id ? shift : s)) }
      : { ...draftRef.current, shifts: [...draftRef.current.shifts, shift] };
    commitDraft(updated);
  };

  const handleDeleteShift = (id: string) => {
    commitDraft({ ...draftRef.current, shifts: draftRef.current.shifts.filter((s) => s.id !== id) });
  };

  const results = calcDayResults(draft);
  const isToday = selectedDate === today;
  const totalTips = draft.totalCash + draft.totalCard;

  const now = new Date();
  void tick;
  const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : 84 + insets.bottom;
  const dateLabel = `${tr.weekDays[now.getDay()]}, ${now.getDate()} ${tr.monthsShort[now.getMonth()]}`;

  const venueName = venue?.name ?? "Boniface";
  const managerInitial = manager?.name?.charAt(0).toUpperCase() ?? "B";

  const shiftEmployees = employees.filter((e) => shiftState.employeeIds.includes(e.id));
  const openTasksCount = checklists.reduce((acc, cl) => acc + cl.items.filter((i) => !i.done).length, 0);
  const totalChecklistItems = checklists.reduce((acc, cl) => acc + cl.items.length, 0);
  const checklistDoneCount = checklists.reduce((acc, cl) => acc + cl.items.filter((i) => i.done).length, 0);
  const firstUncompleted = checklists.flatMap((cl) => cl.items).find((i) => !i.done)?.text ?? null;

  const getShiftDuration = (startTime: string) => {
    const [sh, sm] = startTime.split(":").map(Number);
    const nowD = new Date();
    const totalMins = (nowD.getHours() - sh) * 60 + (nowD.getMinutes() - sm);
    const mins = totalMins < 0 ? totalMins + 24 * 60 : totalMins;
    return tr.home.duration(Math.floor(mins / 60), mins % 60);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 12, paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.brandBlock}>
              <TouchableOpacity
                style={styles.venueNameRow}
                onPress={() => setVenuePicker(true)}
                activeOpacity={0.7}
                onLayout={(e) => setTitleWidth(e.nativeEvent.layout.width)}
              >
                <Text style={styles.venueName} numberOfLines={1}>{venueName}</Text>
                <Feather name="chevron-down" size={14} color="#F59E0B" />
              </TouchableOpacity>
              <View
                style={[
                  styles.dateRow,
                  {
                    flexDirection: isRTL ? "row-reverse" : "row",
                    width: titleWidth,
                  },
                ]}
              >
                <Text style={styles.dateTimeText}>{dateLabel}</Text>
                <Text style={styles.dateTimeText}>{timeStr}</Text>
              </View>
            </View>
          </View>

          <View style={styles.headerRight}>
            <HeaderIconButton
              hint={tr.home.hintSearch}
              onPress={() => router.navigate("/search" as any)}
              style={[styles.alertBtn, { backgroundColor: "rgba(255,255,255,0.07)", borderColor: "rgba(255,255,255,0.12)" }]}
            >
              <Feather name="search" size={14} color="rgba(255,255,255,0.7)" />
            </HeaderIconButton>
            {lowStockCount > 0 && (
              <HeaderIconButton
                hint={tr.home.hintLowStock}
                onPress={() => router.navigate("/bar")}
                style={[styles.alertBtn, { backgroundColor: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.25)" }]}
              >
                <Feather name="alert-triangle" size={14} color="#EF4444" />
                <Text style={styles.alertBtnText}>{lowStockCount}</Text>
              </HeaderIconButton>
            )}
            <HeaderIconButton
              hint={tr.home.hintAccount}
              onPress={() => router.navigate("/account")}
              style={[styles.avatar, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.avatarText}>{managerInitial}</Text>
            </HeaderIconButton>
          </View>
        </View>

        {subscriptionExpired && (
          <View style={{ backgroundColor: "#EF444418", borderColor: "#EF444433", borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 }}>
            <Text style={{ color: "#F87171", fontFamily: "Inter_500Medium", fontSize: 13 }}>
              {tr.subscription.expiredWarning}
            </Text>
          </View>
        )}

        {/* ── Smart Hero Panel (3 phases) ── */}
        {!shiftState.active ? (
          /* PHASE 1: No shift — checklist readiness */
          <View style={[styles.heroCardDark, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.heroRow}>
              <Text style={[styles.heroEyebrowDark, { color: colors.primary }]}>{tr.home.phaseBefore}</Text>
            </View>

            {totalChecklistItems > 0 && (
              <View style={styles.clProgress}>
                <View style={styles.clProgressRow}>
                  <Feather
                    name="check-square"
                    size={13}
                    color={checklistDoneCount === totalChecklistItems ? "#4ADE80" : "#F59E0B"}
                  />
                  <Text style={[styles.clProgressLabel, { color: colors.foreground }]}>
                    {checklistDoneCount === totalChecklistItems
                      ? tr.home.readyOpen
                      : tr.home.openTasksProgress(checklistDoneCount, totalChecklistItems)}
                  </Text>
                </View>
                <View style={[styles.clTrack, { backgroundColor: "rgba(255,255,255,0.08)" }]}>
                  <View
                    style={[
                      styles.clFill,
                      {
                        width: `${Math.round((checklistDoneCount / totalChecklistItems) * 100)}%` as any,
                        backgroundColor: checklistDoneCount === totalChecklistItems ? "#4ADE80" : "#F59E0B",
                      },
                    ]}
                  />
                </View>
                {firstUncompleted && (
                  <Text style={[styles.clNextTask, { color: colors.mutedForeground }]} numberOfLines={1}>
                    → {firstUncompleted}
                  </Text>
                )}
              </View>
            )}

            <HintBanner text={tr.home.hintBefore} icon="play-circle" />

            <PrimaryButton
              label={tr.home.startShift}
              icon="play-circle"
              onPress={() => setStartShiftModal(true)}
              style={{ marginTop: 14 }}
            />
          </View>
        ) : totalTips === 0 ? (
          /* PHASE 2: Shift active, no tips — team & ops */
          <LinearGradient
            colors={["#F59E0B", "#D97706", "#B45309"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroShine} />
            <Text style={styles.heroEyebrow}>{tr.home.phaseActive}</Text>
            <Text style={styles.heroTimerLarge}>
              {shiftState.startTime ? getShiftDuration(shiftState.startTime) : timeStr}
            </Text>

            {shiftEmployees.length > 0 && (
              <View style={styles.heroStaffRow}>
                {shiftEmployees.slice(0, 6).map((emp, i) => (
                  <View key={emp.id} style={styles.heroStaffChip}>
                    <View style={[styles.heroStaffDot, { backgroundColor: STAFF_COLORS[i % STAFF_COLORS.length] }]} />
                    <Text style={styles.heroStaffName} numberOfLines={1}>{emp.name.split(" ")[0]}</Text>
                  </View>
                ))}
                {shiftEmployees.length > 6 && (
                  <View style={styles.heroStaffChip}>
                    <Text style={styles.heroStaffName}>+{shiftEmployees.length - 6}</Text>
                  </View>
                )}
              </View>
            )}

            {(lowStockCount > 0 || openTasksCount > 0) && (
              <View style={styles.heroOpsRow}>
                {lowStockCount > 0 && (
                  <View style={styles.heroOpsBadge}>
                    <Feather name="alert-triangle" size={11} color="rgba(0,0,0,0.65)" />
                    <Text style={styles.heroOpsBadgeText}>{lowStockCount} {tr.home.stockLowWord}</Text>
                  </View>
                )}
                {openTasksCount > 0 && (
                  <View style={styles.heroOpsBadge}>
                    <Feather name="check-square" size={11} color="rgba(0,0,0,0.65)" />
                    <Text style={styles.heroOpsBadgeText}>{openTasksCount} {tr.home.tasksLabel}</Text>
                  </View>
                )}
              </View>
            )}

            <Text style={styles.heroHintOnGold}>{tr.home.hintActive}</Text>

            <TouchableOpacity
              style={styles.heroSecondaryOnGold}
              onPress={() => setTipsModal(true)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={tr.home.enterTips}
            >
              <Feather name="dollar-sign" size={16} color="#111827" />
              <Text style={styles.heroSecondaryOnGoldText}>{tr.home.enterTips}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.heroEndBtn} onPress={() => setEndShiftModal(true)} activeOpacity={0.8}>
              <Feather name="stop-circle" size={14} color="#F59E0B" />
              <Text style={styles.heroEndBtnText}>{tr.home.endShift}</Text>
            </TouchableOpacity>
          </LinearGradient>
        ) : (
          /* PHASE 3: Shift active + tips entered — financial summary */
          <LinearGradient
            colors={["#F59E0B", "#D97706", "#B45309"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroShine} />
            <Text style={styles.heroEyebrow}>{tr.home.phaseTips}</Text>
            <Text style={styles.heroAmount}>{`₪${totalTips.toLocaleString()}`}</Text>
            <Text style={styles.heroShiftMeta}>
              {tr.home.shiftActive} · {shiftState.startTime ? getShiftDuration(shiftState.startTime) : timeStr}
            </Text>

            <View style={styles.heroBreakdown}>
              {[
                [tr.home.cashLabel.toUpperCase(), draft.totalCash],
                [tr.home.cardLabel.toUpperCase(), draft.totalCard],
              ].map(([label, val], i) => (
                <View key={i} style={styles.heroBreakdownItem}>
                  <Text style={styles.heroBreakdownLabel}>{label as string}</Text>
                  <Text style={styles.heroBreakdownVal}>₪{(val as number).toLocaleString()}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.heroHintOnGold}>{tr.home.hintAfterTips}</Text>

            <TouchableOpacity style={styles.heroEndBtn} onPress={() => setEndShiftModal(true)} activeOpacity={0.8}>
              <Feather name="stop-circle" size={14} color="#F59E0B" />
              <Text style={styles.heroEndBtnText}>{tr.home.endShift}</Text>
            </TouchableOpacity>
          </LinearGradient>
        )}

        {/* ── Tips Goal Progress ── */}
        {shiftState.active && (shiftState.tipsGoal ?? 0) > 0 && (() => {
          const goal = shiftState.tipsGoal!;
          const pct = Math.min((totalTips / goal) * 100, 100);
          const reached = totalTips >= goal;
          return (
            <View style={[styles.goalCard, { backgroundColor: reached ? "#10B98114" : "rgba(255,255,255,0.04)", borderColor: reached ? "#10B98133" : "rgba(255,255,255,0.09)" }]}>
              <View style={styles.goalHeader}>
                <Feather name="target" size={14} color={reached ? "#10B981" : "#F59E0B"} />
                <Text style={[styles.goalTitle, { color: reached ? "#10B981" : colors.foreground }]}>
                  {reached ? tr.home.goalReached : tr.home.goalTitle}
                </Text>
                <Text style={[styles.goalAmount, { color: reached ? "#10B981" : "#F59E0B" }]}>
                  {totalTips.toLocaleString()} / {goal.toLocaleString()} ₪
                </Text>
              </View>
              <View style={[styles.goalTrack, { backgroundColor: "rgba(255,255,255,0.08)" }]}>
                <View style={[styles.goalFill, { width: `${pct}%` as any, backgroundColor: reached ? "#10B981" : "#F59E0B" }]} />
              </View>
              <Text style={[styles.goalPct, { color: reached ? "#10B981" : colors.mutedForeground }]}>{Math.round(pct)}%</Text>
            </View>
          );
        })()}

        {/* ── Stats Row ── */}
        <View style={styles.statsRow}>
          {/* Staff */}
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.09)" }]}
            onPress={() => router.navigate("/team")}
            activeOpacity={0.75}
          >
            <Feather name="users" size={16} color="rgba(255,255,255,0.45)" />
            <Text style={styles.statValue}>{shiftState.active ? shiftEmployees.length : employees.length}</Text>
            <Text style={styles.statLabel}>{tr.home.employees}</Text>
            <Text style={[styles.statSub, { color: shiftState.active ? "#4ADE80" : "rgba(255,255,255,0.3)" }]}>
              {shiftState.active ? tr.home.shiftActive.toLowerCase() : "—"}
            </Text>
          </TouchableOpacity>

          {/* Stock */}
          <TouchableOpacity
            style={[
              styles.statCard,
              lowStockCount > 0
                ? { backgroundColor: "rgba(251,146,60,0.1)", borderColor: "rgba(251,146,60,0.22)" }
                : { backgroundColor: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.09)" },
            ]}
            onPress={() => router.navigate("/bar")}
            activeOpacity={0.75}
          >
            <Feather name="package" size={16} color={lowStockCount > 0 ? "#FB923C" : "rgba(255,255,255,0.45)"} />
            <Text style={[styles.statValue, lowStockCount > 0 && { color: "#FB923C" }]}>{lowStockCount}</Text>
            <Text style={styles.statLabel}>{tr.home.stock}</Text>
            <Text style={[styles.statSub, { color: lowStockCount > 0 ? "#FB923C" : "rgba(255,255,255,0.3)" }]}>
              {lowStockCount > 0 ? tr.home.stockLowWord : tr.home.stockOk}
            </Text>
          </TouchableOpacity>

          {/* Tasks */}
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.09)" }]}
            onPress={() => router.navigate("/more")}
            activeOpacity={0.75}
          >
            <Feather name="check-square" size={16} color="rgba(255,255,255,0.45)" />
            <Text style={styles.statValue}>{openTasksCount}</Text>
            <Text style={styles.statLabel}>{tr.home.tasksLabel}</Text>
            <Text style={[styles.statSub, { color: "rgba(255,255,255,0.3)" }]}>
              {openTasksCount > 0 ? tr.home.tasksOpen : tr.home.tasksDone}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Active Shift Staff List ── */}
        {shiftState.active && shiftEmployees.length > 0 && (
          <View style={[styles.shiftNowCard, { backgroundColor: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.09)" }]}>
            <View style={styles.shiftNowHeader}>
              <Text style={[styles.shiftNowTitle, { color: colors.foreground }]}>{tr.home.shiftSection(shiftEmployees.length)}</Text>
              <View style={styles.shiftNowLive}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>{shiftState.startTime ?? timeStr}</Text>
              </View>
            </View>

            {shiftEmployees.map((emp, i) => {
              const color = STAFF_COLORS[i % STAFF_COLORS.length];
              const initial = emp.name.charAt(0).toUpperCase();
              return (
                <View key={emp.id} style={styles.staffRow}>
                  <View style={[styles.staffAvatar, { backgroundColor: color + "25", borderColor: color + "45" }]}>
                    <Text style={[styles.staffInitial, { color }]}>{initial}</Text>
                  </View>
                  <Text style={[styles.staffName, { color: colors.foreground }]} numberOfLines={1}>{emp.name}</Text>
                </View>
              );
            })}

            <TouchableOpacity
              style={[styles.endShiftRow, { backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.08)" }]}
              onPress={() => setEndShiftModal(true)}
              activeOpacity={0.75}
            >
              <Text style={[styles.endShiftRowText, { color: "rgba(255,255,255,0.38)" }]}>{tr.home.endShift}</Text>
              <Feather name="arrow-right" size={13} color="rgba(255,255,255,0.38)" />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Stop List Banner ── */}
        {stopList.length > 0 && (
          <TouchableOpacity
            style={styles.stopListBanner}
            onPress={() => router.navigate("/bar")}
            activeOpacity={0.8}
          >
            <View style={styles.stopListIcon}>
              <Feather name="x-circle" size={15} color="#F87171" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stopListTitle}>
                {tr.home.stopListTitle(stopList.length)}
              </Text>
              <Text style={styles.stopListSub} numberOfLines={1}>
                {stopList.map((s) => s.name).join(", ")}
              </Text>
            </View>
            <Feather name="arrow-right" size={14} color="#F59E0B" />
          </TouchableOpacity>
        )}

        {/* ── Tips Section ── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{tr.home.tipsSection}</Text>
          <View style={[styles.dateNav, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity style={styles.navBtn} onPress={() => handleDateNav(-1)}>
              <Feather name="chevron-left" size={18} color={colors.foreground} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setDatePicker(true)} style={styles.dateBtn}>
              <Text style={[styles.dateText, { color: colors.foreground }]}>{formatDateRu(selectedDate)}</Text>
              {isToday && <View style={[styles.todayDot, { backgroundColor: colors.primary }]} />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.navBtn} onPress={() => handleDateNav(1)} disabled={isToday}>
              <Feather name="chevron-right" size={18} color={isToday ? colors.border : colors.foreground} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tipsRow}>
          <View style={[styles.tipsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.tipsLabel, { color: colors.mutedForeground }]}>{tr.home.cashLabel}</Text>
            <Text style={[styles.tipsAmount, { color: colors.foreground }]}>
              {draft.totalCash > 0 ? `${draft.totalCash.toLocaleString()} ₪` : "—"}
            </Text>
          </View>
          <View style={[styles.tipsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.tipsLabel, { color: colors.mutedForeground }]}>{tr.home.cardLabel}</Text>
            <Text style={[styles.tipsAmount, { color: colors.foreground }]}>
              {draft.totalCard > 0 ? `${draft.totalCard.toLocaleString()} ₪` : "—"}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.tipsEnterBtn, { backgroundColor: colors.primary }]}
            onPress={() => { setTipsModal(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          >
            <Feather name="edit-3" size={18} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>

        {/* ── Shift Entry List ── */}
        <View style={styles.shiftHeader}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            {tr.home.shiftSection(draft.shifts.length)}
          </Text>
          <TouchableOpacity
            style={[styles.addShiftBtn, { backgroundColor: colors.primary }]}
            onPress={() => { setEditShift(undefined); setShiftModal(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          >
            <Feather name="plus" size={15} color={colors.primaryForeground} />
            <Text style={[styles.addShiftBtnText, { color: colors.primaryForeground }]}>{tr.home.addBtn}</Text>
          </TouchableOpacity>
        </View>

        {draft.shifts.length === 0 ? (
          <View style={[styles.emptyShifts, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="users" size={22} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{tr.home.noStaff}</Text>
          </View>
        ) : (
          results.map((r) => (
            <ShiftCard
              key={r.shift.id}
              result={r}
              onEdit={() => { setEditShift(r.shift); setShiftModal(true); }}
              onDelete={() => handleDeleteShift(r.shift.id)}
            />
          ))
        )}
      </ScrollView>

      <AddShiftModal
        visible={shiftModal}
        onClose={() => { setShiftModal(false); setEditShift(undefined); }}
        onSave={handleAddShift}
        editShift={editShift}
        totalCash={draft.totalCash}
        totalCard={draft.totalCard}
      />
      <DatePickerModal
        visible={datePicker}
        currentDate={selectedDate}
        onSelect={(d) => { setSelectedDate(d); loadDate(d); }}
        onClose={() => setDatePicker(false)}
      />
      <StartShiftModal
        visible={startShiftModal}
        onClose={() => setStartShiftModal(false)}
        onStarted={() => setStartShiftModal(false)}
      />
      <EndShiftSummaryModal
        visible={endShiftModal}
        onClose={() => setEndShiftModal(false)}
        onConfirm={() => { endShift(); }}
        shiftState={shiftState}
        dayEntry={draft}
      />
      <TipsEntryModal
        visible={tipsModal}
        onClose={() => setTipsModal(false)}
        date={selectedDate}
      />
      <VenuePickerModal visible={venuePicker} onClose={() => setVenuePicker(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, zIndex: 1 },

  // Header
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20, zIndex: 30, overflow: "visible" },
  headerLeft: { flex: 1, paddingRight: 12 },
  brandBlock: { alignSelf: "flex-start" },
  venueNameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  venueName: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#F59E0B" },
  dateRow: { marginTop: 4, justifyContent: "space-between", alignItems: "center", gap: 8 },
  dateTimeText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#F59E0B", fontVariant: ["tabular-nums"] },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8, zIndex: 31, overflow: "visible" },
  alertBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  alertBtnText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#EF4444" },
  avatar: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#111827" },

  // Phase 1: checklist progress
  clProgress: { marginBottom: 14, gap: 6 },
  clProgressRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  clProgressLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  clTrack: { height: 5, borderRadius: 3, overflow: "hidden" },
  clFill: { height: "100%", borderRadius: 3 },
  clNextTask: { fontSize: 11, fontFamily: "Inter_400Regular" },

  // Phase 2: team chips + ops badges
  heroTimerLarge: { fontSize: 36, fontFamily: "Inter_700Bold", color: "#111827", lineHeight: 44, marginTop: 2, marginBottom: 10 },
  heroStaffRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  heroStaffChip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(0,0,0,0.18)", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20 },
  heroStaffDot: { width: 6, height: 6, borderRadius: 3 },
  heroStaffName: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#111827" },
  heroOpsRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  heroOpsBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(0,0,0,0.15)", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10 },
  heroOpsBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "rgba(0,0,0,0.65)" },

  // Hero card — active (gold)
  heroCard: { borderRadius: 24, padding: 20, marginBottom: 14, overflow: "hidden" },
  heroShine: {
    position: "absolute", inset: 0 as any,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 24,
  },
  heroEyebrow: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.2, color: "rgba(0,0,0,0.5)", textTransform: "uppercase" },
  heroAmount: { fontSize: 40, fontFamily: "Inter_700Bold", color: "#111827", lineHeight: 48, marginTop: 2 },
  heroShiftMeta: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(0,0,0,0.45)", marginTop: 2, marginBottom: 14 },
  heroBreakdown: { flexDirection: "row", gap: 20, marginBottom: 16 },
  heroBreakdownItem: { gap: 1 },
  heroBreakdownLabel: { fontSize: 9, fontFamily: "Inter_700Bold", color: "rgba(0,0,0,0.45)", letterSpacing: 0.8 },
  heroBreakdownVal: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#111827" },
  heroEndBtn: {
    flexDirection: "row", alignItems: "center", gap: 7, alignSelf: "flex-start",
    backgroundColor: "rgba(0,0,0,0.18)", paddingHorizontal: 14, paddingVertical: 9, borderRadius: 11,
  },
  heroEndBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#F59E0B" },
  heroHintOnGold: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "rgba(17,24,39,0.72)",
    marginBottom: 12,
    lineHeight: 18,
  },
  heroSecondaryOnGold: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(17,24,39,0.12)",
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  heroSecondaryOnGoldText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#111827",
  },

  // Hero card — inactive (dark)
  heroCardDark: { borderRadius: 24, padding: 20, marginBottom: 14, borderWidth: 1 },
  heroRow: { marginBottom: 12 },
  heroEyebrowDark: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, textTransform: "uppercase" },
  heroTitleDark: { fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 4, marginBottom: 4 },
  heroSubDark: { fontSize: 13, fontFamily: "Inter_400Regular" },
  heroStartBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14 },
  heroStartBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },

  // Tips Goal Progress
  goalCard: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 14 },
  goalHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  goalTitle: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  goalAmount: { fontSize: 13, fontFamily: "Inter_700Bold" },
  goalTrack: { height: 5, borderRadius: 3, overflow: "hidden", marginBottom: 4 },
  goalFill: { height: "100%", borderRadius: 3 },
  goalPct: { fontSize: 11, fontFamily: "Inter_600SemiBold", textAlign: "right" },

  // Stats Row
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  statCard: { flex: 1, borderRadius: 18, borderWidth: 1, padding: 12, gap: 2 },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#FFFFFF", marginTop: 6 },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.38)" },
  statSub: { fontSize: 9, fontFamily: "Inter_600SemiBold", marginTop: 2 },

  // Active shift mini card
  shiftNowCard: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 14, gap: 10 },
  shiftNowHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  shiftNowTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  shiftNowLive: { flexDirection: "row", alignItems: "center", gap: 5 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#4ADE80" },
  liveText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#4ADE80" },
  staffRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  staffAvatar: { width: 32, height: 32, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  staffInitial: { fontSize: 12, fontFamily: "Inter_700Bold" },
  staffName: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  endShiftRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 9, borderRadius: 11, borderWidth: 1, marginTop: 4,
  },
  endShiftRowText: { fontSize: 12, fontFamily: "Inter_500Medium" },

  // Stop list banner
  stopListBanner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "rgba(239,68,68,0.08)", borderWidth: 1,
    borderColor: "rgba(239,68,68,0.18)", borderRadius: 16,
    padding: 12, marginBottom: 14,
  },
  stopListIcon: {
    width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(239,68,68,0.15)",
  },
  stopListTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  stopListSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.35)", marginTop: 1 },

  // Tips section
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },
  dateNav: { flexDirection: "row", alignItems: "center", borderRadius: 10, borderWidth: 1, overflow: "hidden" },
  navBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  dateBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8, paddingVertical: 6 },
  dateText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  todayDot: { width: 5, height: 5, borderRadius: 2.5 },
  tipsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  tipsCard: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 12, gap: 4 },
  tipsLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  tipsAmount: { fontSize: 16, fontFamily: "Inter_700Bold" },
  tipsEnterBtn: { width: 50, borderRadius: 12, alignItems: "center", justifyContent: "center" },

  // Shift entries
  shiftHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  addShiftBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  addShiftBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  emptyShifts: { borderRadius: 12, borderWidth: 1, borderStyle: "dashed", padding: 20, alignItems: "center", gap: 8, flexDirection: "row", justifyContent: "center" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
