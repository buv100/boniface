import type { DayEntry, Employee } from "@/context/AppContext";
import {
  dayEntriesRepository,
  employeesRepository,
} from "@/lib/repositories/teamTipsRepository";

export const teamTipsService = {
  async hydrateFromCache() {
    const [employees, dayEntries] = await Promise.all([
      employeesRepository.loadLocal(),
      dayEntriesRepository.loadLocal(),
    ]);
    return { employees, dayEntries };
  },

  async pullFromCloud(token: string) {
    const [employees, dayEntries] = await Promise.all([
      employeesRepository.fetchRemote(token).catch(() => null),
      dayEntriesRepository.fetchRemote(token).catch(() => null),
    ]);
    if (employees) await employeesRepository.saveLocal(employees);
    if (dayEntries) await dayEntriesRepository.saveLocal(dayEntries);
    return { employees, dayEntries };
  },

  async saveEmployeesLocal(items: Employee[]) {
    await employeesRepository.saveLocal(items);
  },

  async saveDayEntriesLocal(items: DayEntry[]) {
    await dayEntriesRepository.saveLocal(items);
  },

  async createEmployee(token: string | null, emp: Employee) {
    if (token) {
      try {
        return await employeesRepository.createRemote(token, {
          name: emp.name,
          roles: emp.roles,
          phone: emp.phone,
        });
      } catch {
        /* fall through local */
      }
    }
    return emp;
  },

  async updateEmployee(token: string | null, id: string, patch: Partial<Employee>) {
    if (token) {
      try {
        return await employeesRepository.updateRemote(token, id, {
          name: patch.name,
          roles: patch.roles,
          phone: patch.phone ?? null,
        });
      } catch {
        /* offline */
      }
    }
    return null;
  },

  async deleteEmployee(token: string | null, id: string) {
    if (token) {
      try {
        await employeesRepository.deleteRemote(token, id);
      } catch {
        /* offline */
      }
    }
  },

  async upsertDayEntry(token: string | null, entry: DayEntry) {
    if (token) {
      try {
        return await dayEntriesRepository.upsertRemote(token, entry);
      } catch {
        /* offline */
      }
    }
    return entry;
  },

  async deleteDayEntry(token: string | null, id: string) {
    if (token) {
      try {
        await dayEntriesRepository.deleteRemote(token, id);
      } catch {
        /* offline */
      }
    }
  },
};
