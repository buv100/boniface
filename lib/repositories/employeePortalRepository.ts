import { httpRepo } from "./http";

export interface EmployeeTipRow {
  date: string;
  tips: number;
  hours: number;
}

export interface StockLiteItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
}

export interface StopListItemDto {
  id: string;
  name: string;
  reason?: string;
  addedAt: string;
}

export const employeePortalRepository = {
  fetchMyTips(token: string) {
    return httpRepo.get<{ rows: EmployeeTipRow[]; total: number }>("/employee/me/tips", token);
  },
  fetchStockLite(token: string) {
    return httpRepo.get<StockLiteItem[]>("/employee/stock-lite", token);
  },
  fetchStopList(token: string) {
    return httpRepo.get<StopListItemDto[]>("/employee/stop-list", token);
  },
  reportStockOut(token: string, name: string, reason?: string) {
    return httpRepo.post<StopListItemDto>("/employee/stop-list", { name, reason }, token);
  },
  fetchShiftSlots(token: string, from: string, to: string) {
    return httpRepo.get<unknown[]>(`/shift-slots?from=${from}&to=${to}`, token);
  },
  claimSlot(token: string, slotId: string) {
    return httpRepo.post(`/shift-slots/${slotId}/claim`, {}, token);
  },
  cancelClaim(token: string, claimId: string) {
    return httpRepo.delete(`/shift-claims/${claimId}`, token);
  },
};
