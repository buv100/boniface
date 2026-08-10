import {
  employeePortalRepository,
  type EmployeeTipRow,
  type StockLiteItem,
  type StopListItemDto,
} from "@/lib/repositories/employeePortalRepository";

export const employeePortalService = {
  getMyTips(token: string) {
    return employeePortalRepository.fetchMyTips(token);
  },
  getStockLite(token: string) {
    return employeePortalRepository.fetchStockLite(token);
  },
  getStopList(token: string) {
    return employeePortalRepository.fetchStopList(token);
  },
  reportStockOut(token: string, name: string, reason?: string) {
    return employeePortalRepository.reportStockOut(token, name, reason);
  },
  getShiftSlots(token: string, from: string, to: string) {
    return employeePortalRepository.fetchShiftSlots(token, from, to);
  },
  claimSlot(token: string, slotId: string) {
    return employeePortalRepository.claimSlot(token, slotId);
  },
  cancelClaim(token: string, claimId: string) {
    return employeePortalRepository.cancelClaim(token, claimId);
  },
};

export type { EmployeeTipRow, StockLiteItem, StopListItemDto };
