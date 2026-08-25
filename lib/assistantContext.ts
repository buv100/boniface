import { getLocalizedStockItem, type HappyHour, type StockItem, type StopListItem, type WriteOff, type Checklist, type ShiftState, calcBeverageCost } from "@/context/BonifaceContext";
import { summarizeBeverageCost } from "@/lib/assistantBeverageCost";
import type { DayEntry, Employee } from "@/context/AppContext";
import { calcDayResults } from "@/context/AppContext";
import type { AuthEmployee, AuthManager, AuthVenue } from "@/context/AuthContext";

/** Compact live snapshot the AI uses for user-specific answers. */
export interface AssistantLiveContext {
  asOf: string;
  account: {
    role: "manager" | "employee" | "owner" | "guest";
    managerName?: string;
    employeeName?: string;
    venueName?: string;
    currency?: string;
    isPremium?: boolean;
  };
  shift: {
    active: boolean;
    startDate?: string | null;
    startTime?: string | null;
    tipsGoal?: number;
    employeeNames: string[];
  };
  stock: Array<{
    name: string;
    category: string;
    quantity: number;
    unit: string;
    minQuantity: number;
    isLow: boolean;
    subCategory?: string;
    purchasePrice?: number;
    sellingPrice?: number;
  }>;
  stockByCategory: Record<string, { items: number; totalQuantity: number }>;
  lowStock: Array<{ name: string; quantity: number; unit: string; minQuantity: number }>;
  stopList: Array<{ name: string; reason?: string; addedAt: string }>;
  writeOffsRecent: Array<{
    date: string;
    itemName: string;
    quantity: number;
    unit: string;
    reason: string;
  }>;
  employees: Array<{ name: string; roles: string[] }>;
  tipsRecent: Array<{
    date: string;
    totalCash: number;
    totalCard: number;
    total: number;
    shifts: Array<{ employeeName: string; cashTips: number; cardTips: number; hoursWorked: number }>;
  }>;
  tipsTotals: { last7Days: number; last30Days: number; today: number };
  checklists: Array<{ title: string; type: string; done: number; total: number }>;
  happyHours: Array<{
    startTime: string;
    endTime: string;
    discountPercent: number;
    enabled: boolean;
    activeNow: boolean;
  }>;
  beverageCost: {
    averageCostPercent: number | null;
    averageProfitMarginPercent: number | null;
    itemsWithPricing: number;
    itemsMissingPricing: number;
    items: Array<{
      name: string;
      category: string;
      costPercent: number;
      profitMarginPercent: number;
      costPerPortion: number;
      sellingPrice: number;
    }>;
  };
}

type SeedTr = {
  seedStock?: Record<string, { name: string; unit: string }>;
};

export function buildAssistantLiveContext(opts: {
  role: "manager" | "employee" | "owner" | "guest";
  manager?: AuthManager | null;
  employee?: AuthEmployee | null;
  venue?: AuthVenue | null;
  isPremium?: boolean;
  stockItems: StockItem[];
  stopList: StopListItem[];
  writeOffs: WriteOff[];
  checklists: Checklist[];
  happyHours: HappyHour[];
  shiftState: ShiftState;
  employees: Employee[];
  dayEntries: DayEntry[];
  activeHappyHourId?: string | null;
  tr?: SeedTr;
}): AssistantLiveContext {
  const stock = opts.stockItems.map((raw) => {
    const item = opts.tr ? getLocalizedStockItem(raw, opts.tr as any) : raw;
    return {
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      minQuantity: item.minQuantity,
      isLow: item.quantity < item.minQuantity,
      subCategory: item.subCategory,
      purchasePrice: item.purchasePrice,
      portionsPerUnit: raw.portionsPerUnit,
      sellingPrice: item.sellingPrice,
    };
  });

  const beverageSummary = summarizeBeverageCost(opts.stockItems);
  const beverageItems = opts.stockItems
    .filter(
      (s) =>
        s.purchasePrice != null &&
        s.portionsPerUnit != null &&
        s.sellingPrice != null &&
        s.portionsPerUnit > 0 &&
        s.sellingPrice > 0
    )
    .map((s) => {
      const item = opts.tr ? getLocalizedStockItem(s, opts.tr as any) : s;
      const costPercent = calcBeverageCost(s.purchasePrice!, s.portionsPerUnit!, s.sellingPrice!);
      return {
        name: item.name,
        category: item.category,
        costPercent: Math.round(costPercent * 10) / 10,
        profitMarginPercent: Math.round((100 - costPercent) * 10) / 10,
        costPerPortion: Math.round((s.purchasePrice! / s.portionsPerUnit!) * 100) / 100,
        sellingPrice: s.sellingPrice!,
      };
    });

  const stockByCategory: Record<string, { items: number; totalQuantity: number }> = {};
  for (const s of stock) {
    const bucket = stockByCategory[s.category] ?? { items: 0, totalQuantity: 0 };
    bucket.items += 1;
    bucket.totalQuantity += Number(s.quantity) || 0;
    stockByCategory[s.category] = bucket;
  }

  const empById = new Map(opts.employees.map((e) => [e.id, e.name]));
  const shiftEmployeeNames = (opts.shiftState.employeeIds ?? [])
    .map((id) => empById.get(id) ?? id)
    .filter(Boolean);

  const sortedEntries = [...opts.dayEntries].sort((a, b) => b.date.localeCompare(a.date));
  const recent = sortedEntries.slice(0, 30);
  const today = new Date().toISOString().slice(0, 10);
  const d7 = daysAgoIso(7);
  const d30 = daysAgoIso(30);

  let todayTips = 0;
  let last7 = 0;
  let last30 = 0;
  const tipsRecent = recent.map((entry) => {
    const total = (entry.totalCash || 0) + (entry.totalCard || 0);
    if (entry.date === today) todayTips += total;
    if (entry.date >= d7) last7 += total;
    if (entry.date >= d30) last30 += total;
    const results = calcDayResults(entry);
    return {
      date: entry.date,
      totalCash: entry.totalCash,
      totalCard: entry.totalCard,
      total,
      shifts: results.map((r) => ({
        employeeName: r.shift.employeeName,
        cashTips: Math.round(r.cashTips * 100) / 100,
        cardTips: Math.round(r.cardTips * 100) / 100,
        hoursWorked: Math.round(r.hoursWorked * 100) / 100,
      })),
    };
  });

  const writeOffsRecent = [...opts.writeOffs]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 40)
    .map((w) => ({
      date: w.date,
      itemName: w.itemName,
      quantity: w.quantity,
      unit: w.unit,
      reason: w.reason,
    }));

  return {
    asOf: new Date().toISOString(),
    account: {
      role: opts.role,
      managerName: opts.manager?.name,
      employeeName: opts.employee?.name,
      venueName: opts.venue?.name,
      currency: opts.venue?.currency ?? "ILS",
      isPremium: opts.isPremium,
    },
    shift: {
      active: !!opts.shiftState.active,
      startDate: opts.shiftState.startDate,
      startTime: opts.shiftState.startTime,
      tipsGoal: opts.shiftState.tipsGoal,
      employeeNames: shiftEmployeeNames,
    },
    stock,
    stockByCategory,
    lowStock: stock
      .filter((s) => s.isLow)
      .map((s) => ({
        name: s.name,
        quantity: s.quantity,
        unit: s.unit,
        minQuantity: s.minQuantity,
      })),
    stopList: opts.stopList.map((s) => ({
      name: s.name,
      reason: s.reason,
      addedAt: s.addedAt,
    })),
    writeOffsRecent,
    employees: opts.employees.map((e) => ({ name: e.name, roles: e.roles })),
    tipsRecent,
    tipsTotals: {
      today: Math.round(todayTips * 100) / 100,
      last7Days: Math.round(last7 * 100) / 100,
      last30Days: Math.round(last30 * 100) / 100,
    },
    checklists: opts.checklists.map((c) => ({
      title: c.title,
      type: c.type,
      done: c.items.filter((i) => i.done).length,
      total: c.items.length,
    })),
    happyHours: opts.happyHours.map((h) => ({
      startTime: h.startTime,
      endTime: h.endTime,
      discountPercent: h.discountPercent,
      enabled: h.enabled,
      activeNow: opts.activeHappyHourId === h.id,
    })),
    beverageCost: {
      averageCostPercent: beverageSummary.averageCostPercent,
      averageProfitMarginPercent: beverageSummary.averageProfitMarginPercent,
      itemsWithPricing: beverageSummary.itemsWithPricing,
      itemsMissingPricing: beverageSummary.itemsMissingPricing,
      items: beverageItems,
    },
  };
}

function daysAgoIso(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
