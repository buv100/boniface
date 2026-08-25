import { useMemo } from "react";

import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useBoniface } from "@/context/BonifaceContext";
import { useLang } from "@/context/LangContext";
import { buildAssistantLiveContext, type AssistantLiveContext } from "@/lib/assistantContext";

/** Live venue snapshot for the AI assistant (recomputes when app data changes). */
export function useAssistantLiveContext(): AssistantLiveContext {
  const auth = useAuth();
  const { employees, dayEntries } = useApp();
  const {
    stockItems,
    stopList,
    writeOffs,
    checklists,
    happyHours,
    shiftState,
    isPremium,
    activeHappyHour,
  } = useBoniface();
  const { tr } = useLang();

  const role = !auth.isLoggedIn
    ? "guest"
    : auth.isOwner
      ? "owner"
      : auth.isEmployee
        ? "employee"
        : "manager";

  return useMemo(() => {
    const full = buildAssistantLiveContext({
      role,
      manager: auth.manager,
      employee: auth.employee,
      venue: auth.venue,
      isPremium,
      stockItems,
      stopList,
      writeOffs,
      checklists,
      happyHours,
      shiftState,
      employees,
      dayEntries,
      activeHappyHourId: activeHappyHour?.id ?? null,
      tr,
    });

    // Employees must not send manager-only dumps from local cache
    if (role === "employee") {
      const myId = auth.employee?.id;
      const myTips = dayEntries
        .flatMap((e) => {
          const mine = e.shifts.find((s) => s.employeeId === myId);
          if (!mine) return [];
          return [
            {
              date: e.date,
              totalCash: 0,
              totalCard: 0,
              total: 0,
              shifts: [{ employeeName: mine.employeeName, cashTips: 0, cardTips: 0, hoursWorked: 0 }],
            },
          ];
        })
        .slice(0, 5);

      return {
        ...full,
        employees: auth.employee
          ? [{ name: auth.employee.name, roles: auth.employee.roles ?? [] }]
          : [],
        writeOffsRecent: [],
        checklists: [],
        tipsRecent: myTips,
        tipsTotals: { today: 0, last7Days: 0, last30Days: 0 },
        stock: full.stock.map((s) => ({
          name: s.name,
          category: s.category,
          quantity: s.quantity,
          unit: s.unit,
          minQuantity: 0,
          isLow: false,
        })),
        stockByCategory: {},
        lowStock: [],
        happyHours: [],
        shift: { active: false, employeeNames: [] },
      };
    }

    return full;
  }, [
    role,
    auth.manager,
    auth.employee,
    auth.venue,
    isPremium,
    stockItems,
    stopList,
    writeOffs,
    checklists,
    happyHours,
    shiftState,
    employees,
    dayEntries,
    activeHappyHour?.id,
    tr,
  ]);
}
