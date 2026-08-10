import { employeesRepo } from "../dal/employeesRepo";
import { newId, nowIso } from "../middleware/auth";

export const employeesService = {
  list(venueId: string) {
    return employeesRepo.listByVenue(venueId);
  },
  create(
    venueId: string,
    data: { name: string; roles?: string[]; phone?: string | null }
  ) {
    const now = nowIso();
    return employeesRepo.create({
      id: newId(),
      venueId,
      name: data.name.trim(),
      roles: data.roles ?? [],
      phone: data.phone ?? null,
      createdAt: now,
      updatedAt: now,
    });
  },
  update(
    venueId: string,
    id: string,
    data: { name?: string; roles?: string[]; phone?: string | null }
  ) {
    return employeesRepo.update(venueId, id, {
      ...data,
      name: data.name?.trim(),
      updatedAt: nowIso(),
    });
  },
  remove(venueId: string, id: string) {
    return employeesRepo.delete(venueId, id);
  },
};
