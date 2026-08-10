import type { checklists, dayEntries, employees, stockItems, stopList, writeOffs } from "../db/schema";

export type StockRow = typeof stockItems.$inferSelect;
export type StopRow = typeof stopList.$inferSelect;
export type WriteOffRow = typeof writeOffs.$inferSelect;
export type ChecklistRow = typeof checklists.$inferSelect;
export type EmployeeRow = typeof employees.$inferSelect;
export type DayEntryRow = typeof dayEntries.$inferSelect;

export function mapStock(row: StockRow) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    quantity: row.quantity,
    unit: row.unit,
    minQuantity: row.minQuantity,
    purchasePrice: row.purchasePrice ?? undefined,
    portionsPerUnit: row.portionsPerUnit ?? undefined,
    sellingPrice: row.sellingPrice ?? undefined,
    expiryDate: row.expiryDate ?? undefined,
    subCategory: row.subCategory ?? undefined,
  };
}

export function mapStockLite(row: StockRow) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    quantity: row.quantity,
    unit: row.unit,
  };
}

export function mapStop(row: StopRow) {
  return {
    id: row.id,
    name: row.name,
    reason: row.reason ?? undefined,
    addedAt: row.addedAt,
  };
}

export function mapWriteOff(row: WriteOffRow) {
  return {
    id: row.id,
    date: row.date,
    itemId: row.itemId ?? undefined,
    itemName: row.itemName,
    quantity: row.quantity,
    unit: row.unit,
    reason: row.reason,
    notes: row.notes ?? undefined,
  };
}

export function mapChecklist(row: ChecklistRow) {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    items: JSON.parse(row.items || "[]") as Array<{ id: string; text: string; done: boolean }>,
    createdAt: row.createdAt,
  };
}

export function mapEmployee(row: EmployeeRow) {
  return {
    id: row.id,
    name: row.name,
    roles: JSON.parse(row.roles || "[]") as string[],
    phone: row.phone,
  };
}

export function mapDayEntry(row: DayEntryRow) {
  return {
    id: row.id,
    date: row.date,
    totalCash: row.totalCash,
    totalCard: row.totalCard,
    shifts: JSON.parse(row.shifts || "[]") as Array<{
      id: string;
      employeeId: string;
      employeeName: string;
      tipMode: "hours" | "percent";
      startTime: string;
      endTime: string;
      cashPercent: number;
      cardPercent: number;
    }>,
  };
}

export type StockDto = ReturnType<typeof mapStock>;
export type StockLiteDto = ReturnType<typeof mapStockLite>;
export type StopDto = ReturnType<typeof mapStop>;
export type WriteOffDto = ReturnType<typeof mapWriteOff>;
export type ChecklistDto = ReturnType<typeof mapChecklist>;
export type EmployeeDto = ReturnType<typeof mapEmployee>;
export type DayEntryDto = ReturnType<typeof mapDayEntry>;
