import type { DayEntry, Employee } from "@/context/AppContext";
import { httpRepo } from "./http";
import { localRepo } from "./localRepo";

const EMPLOYEES_KEY = "@bar_tips_employees_v2";
const ENTRIES_KEY = "@bar_tips_day_entries_v2";

export const employeesRepository = {
  async loadLocal(): Promise<Employee[] | null> {
    return localRepo.getJson<Employee[]>(EMPLOYEES_KEY);
  },
  async saveLocal(items: Employee[]) {
    await localRepo.setJson(EMPLOYEES_KEY, items);
  },
  async fetchRemote(token: string) {
    return httpRepo.get<Employee[]>("/employees", token);
  },
  async createRemote(token: string, body: { name: string; roles?: string[]; phone?: string }) {
    return httpRepo.post<Employee>("/employees", body, token);
  },
  async updateRemote(
    token: string,
    id: string,
    body: { name?: string; roles?: string[]; phone?: string | null }
  ) {
    return httpRepo.patch<Employee>(`/employees/${id}`, body, token);
  },
  async deleteRemote(token: string, id: string) {
    return httpRepo.delete(`/employees/${id}`, token);
  },
};

export const dayEntriesRepository = {
  async loadLocal(): Promise<DayEntry[] | null> {
    return localRepo.getJson<DayEntry[]>(ENTRIES_KEY);
  },
  async saveLocal(items: DayEntry[]) {
    await localRepo.setJson(ENTRIES_KEY, items);
  },
  async fetchRemote(token: string) {
    return httpRepo.get<DayEntry[]>("/day-entries", token);
  },
  async upsertRemote(token: string, entry: DayEntry) {
    return httpRepo.put<DayEntry>(`/day-entries/${entry.id}`, {
      date: entry.date,
      totalCash: entry.totalCash,
      totalCard: entry.totalCard,
      shifts: entry.shifts,
    }, token);
  },
  async deleteRemote(token: string, id: string) {
    return httpRepo.delete(`/day-entries/${id}`, token);
  },
};
