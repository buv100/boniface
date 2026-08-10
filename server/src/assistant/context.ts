import { dayEntriesRepo } from "../dal/dayEntriesRepo";
import { employeesRepo } from "../dal/employeesRepo";
import { stockRepo } from "../dal/stockRepo";
import { stopListRepo } from "../dal/stopListRepo";
import { writeOffsRepo } from "../dal/writeOffsRepo";
import { checklistsRepo } from "../dal/checklistsRepo";
import { dayEntriesService } from "../services/dayEntriesService";
import { db } from "../db";
import { managers, subscriptions, venues } from "../db/schema";
import { eq } from "drizzle-orm";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/** Full manager venue snapshot for the AI assistant. */
export function loadVenueAssistantContext(venueId: string, role: string) {
  const venue = db.select().from(venues).where(eq(venues.id, venueId)).get();
  const mgr = db.select().from(managers).where(eq(managers.venueId, venueId)).get();
  const sub = db.select().from(subscriptions).where(eq(subscriptions.venueId, venueId)).get();
  const stock = stockRepo.listByVenue(venueId);
  const stops = stopListRepo.listByVenue(venueId);
  const emps = employeesRepo.listByVenue(venueId);
  const since = daysAgo(30);
  const entries = dayEntriesRepo.listByVenueSince(venueId, since);
  const offs = writeOffsRepo.listByVenue(venueId).filter((w) => w.date >= since);
  const cls = checklistsRepo.listByVenue(venueId);

  const stockByCategory: Record<string, { items: number; totalQuantity: number }> = {};
  for (const s of stock) {
    const bucket = stockByCategory[s.category] ?? { items: 0, totalQuantity: 0 };
    bucket.items += 1;
    bucket.totalQuantity += Number(s.quantity) || 0;
    stockByCategory[s.category] = bucket;
  }

  const today = new Date().toISOString().slice(0, 10);
  const d7 = daysAgo(7);
  let todayTips = 0;
  let last7 = 0;
  let last30 = 0;
  const tipsRecent = entries.map((e) => {
    const total = (e.totalCash || 0) + (e.totalCard || 0);
    if (e.date === today) todayTips += total;
    if (e.date >= d7) last7 += total;
    if (e.date >= since) last30 += total;
    return {
      date: e.date,
      totalCash: e.totalCash,
      totalCard: e.totalCard,
      total,
      shifts: (e.shifts ?? []).map((s) => ({ employeeName: s.employeeName ?? "?" })),
    };
  });

  return {
    asOf: new Date().toISOString(),
    source: "server",
    account: {
      role,
      managerName: mgr?.name,
      venueName: venue?.name,
      currency: venue?.currency ?? "ILS",
      subscriptionStatus: sub?.status,
      subscriptionExpiresAt: sub?.expiresAt,
    },
    stock,
    stockByCategory,
    lowStock: stock
      .filter((s) => s.quantity < s.minQuantity)
      .map((s) => ({
        name: s.name,
        quantity: s.quantity,
        unit: s.unit,
        minQuantity: s.minQuantity,
      })),
    stopList: stops,
    writeOffsRecent: offs.slice(0, 40),
    employees: emps.map((e) => ({ name: e.name, roles: e.roles })),
    tipsRecent,
    tipsTotals: {
      today: Math.round(todayTips * 100) / 100,
      last7Days: Math.round(last7 * 100) / 100,
      last30Days: Math.round(last30 * 100) / 100,
    },
    checklists: cls.map((c) => ({
      title: c.title,
      type: c.type,
      done: c.items.filter((i) => i.done).length,
      total: c.items.length,
    })),
  };
}

/** Employee-scoped snapshot — no full team tips / write-offs / checklist management. */
export function loadEmployeeAssistantContext(venueId: string, employeeId: string) {
  const venue = db.select().from(venues).where(eq(venues.id, venueId)).get();
  const emp = employeesRepo.getById(venueId, employeeId);
  const stockLite = stockRepo.listLiteByVenue(venueId);
  const stops = stopListRepo.listByVenue(venueId);
  const myTips = dayEntriesService.tipsForEmployee(venueId, employeeId);

  return {
    asOf: new Date().toISOString(),
    source: "server-employee",
    account: {
      role: "employee",
      employeeName: emp?.name,
      venueName: venue?.name,
      currency: venue?.currency ?? "ILS",
    },
    stock: stockLite,
    stopList: stops,
    myTips: myTips.rows.slice(0, 30),
    tipsTotals: { mineTotal: myTips.total },
  };
}

export function mergeAssistantContexts(clientCtx: unknown, serverCtx: unknown | null): unknown {
  if (clientCtx && typeof clientCtx === "object") {
    if (!serverCtx || typeof serverCtx !== "object") return clientCtx;
    const c = clientCtx as Record<string, unknown>;
    const s = serverCtx as Record<string, unknown>;
    return {
      ...s,
      ...c,
      account: { ...(s.account as object), ...(c.account as object) },
      stock: Array.isArray(c.stock) && c.stock.length ? c.stock : s.stock,
      stockByCategory: c.stockByCategory ?? s.stockByCategory,
      lowStock: Array.isArray(c.lowStock) && c.lowStock.length ? c.lowStock : s.lowStock,
      employees: Array.isArray(c.employees) && c.employees.length ? c.employees : s.employees,
      tipsRecent: Array.isArray(c.tipsRecent) && c.tipsRecent.length ? c.tipsRecent : s.tipsRecent,
      tipsTotals: c.tipsTotals ?? s.tipsTotals,
      stopList: Array.isArray(c.stopList) ? c.stopList : s.stopList,
      writeOffsRecent: Array.isArray(c.writeOffsRecent) ? c.writeOffsRecent : s.writeOffsRecent,
      checklists: Array.isArray(c.checklists) ? c.checklists : s.checklists,
      myTips: c.myTips ?? s.myTips,
      shift: c.shift ?? s.shift,
      happyHours: c.happyHours ?? s.happyHours,
      mergedFrom: ["client", "server"],
    };
  }
  return serverCtx;
}

export function truncateContextJson(ctx: unknown, maxChars = 28000): string {
  const raw = JSON.stringify(ctx ?? {}, null, 0);
  if (raw.length <= maxChars) return raw;
  return `${raw.slice(0, maxChars)}…[truncated]`;
}
