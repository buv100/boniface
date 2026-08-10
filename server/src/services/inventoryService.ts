import { stockRepo } from "../dal/stockRepo";
import { stopListRepo } from "../dal/stopListRepo";
import { writeOffsRepo } from "../dal/writeOffsRepo";
import { checklistsRepo } from "../dal/checklistsRepo";
import { newId, nowIso } from "../middleware/auth";

export const stockService = {
  list(venueId: string) {
    return stockRepo.listByVenue(venueId);
  },
  listLite(venueId: string) {
    return stockRepo.listLiteByVenue(venueId);
  },
  replaceAll(venueId: string, items: Parameters<typeof stockRepo.replaceAll>[1]) {
    return stockRepo.replaceAll(venueId, items, nowIso());
  },
};

export const stopListService = {
  list(venueId: string) {
    return stopListRepo.listByVenue(venueId);
  },
  replaceAll(venueId: string, items: Parameters<typeof stopListRepo.replaceAll>[1]) {
    return stopListRepo.replaceAll(venueId, items);
  },
  reportOutOfStock(venueId: string, name: string, reason?: string) {
    return stopListRepo.add(venueId, {
      id: newId(),
      name: name.trim(),
      reason: reason?.trim() || "Out of stock",
      addedAt: nowIso(),
    });
  },
};

export const writeOffsService = {
  list(venueId: string) {
    return writeOffsRepo.listByVenue(venueId);
  },
  replaceAll(venueId: string, items: Parameters<typeof writeOffsRepo.replaceAll>[1]) {
    return writeOffsRepo.replaceAll(venueId, items);
  },
};

export const checklistsService = {
  list(venueId: string) {
    return checklistsRepo.listByVenue(venueId);
  },
  replaceAll(venueId: string, items: Parameters<typeof checklistsRepo.replaceAll>[1]) {
    return checklistsRepo.replaceAll(venueId, items);
  },
};
