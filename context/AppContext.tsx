import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { apiCall } from "@/lib/api";
import { useAuth } from "./AuthContext";

export const EMPLOYEE_ROLES = [
  "Бармен",
  "Официант",
  "Хостес",
  "Барбек",
  "Менеджер смены",
  "Повар",
  "Охрана",
];

export interface Employee {
  id: string;
  name: string;
  roles: string[];
  phone?: string;
}

export type TipMode = "hours" | "percent";

export interface ShiftEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  tipMode: TipMode;
  startTime: string;
  endTime: string;
  cashPercent: number;
  cardPercent: number;
}

export interface DayEntry {
  id: string;
  date: string;
  totalCash: number;
  totalCard: number;
  shifts: ShiftEntry[];
}

export interface ShiftResult {
  shift: ShiftEntry;
  hoursWorked: number;
  cashTips: number;
  cardTips: number;
  totalTips: number;
  tipsPerHour: number;
  sharePercent: number;
}

interface AppContextType {
  employees: Employee[];
  dayEntries: DayEntry[];
  isLoading: boolean;
  isSyncing: boolean;
  addEmployee: (name: string, roles?: string[], phone?: string) => Promise<void>;
  updateEmployee: (id: string, name: string, roles?: string[], phone?: string) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  saveDayEntry: (entry: DayEntry) => Promise<void>;
  deleteDayEntry: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

const EMPLOYEES_KEY = "@bar_tips_employees_v2";
const ENTRIES_KEY = "@bar_tips_day_entries_v2";

export const generateId = () =>
  Date.now().toString() + Math.random().toString(36).substr(2, 9);

interface RemoteEmployee {
  id: string;
  name: string;
  roles: string[];
  phone: string | null;
}

interface RemoteShift {
  id: string;
  employeeId: string;
  employeeName: string;
  tipMode: string;
  startTime: string;
  endTime: string;
  cashPercent: number;
  cardPercent: number;
}

interface RemoteDayEntry {
  id: string;
  date: string;
  totalCash: number;
  totalCard: number;
  shifts: RemoteShift[];
}

function mapRemoteEmployee(r: RemoteEmployee): Employee {
  return { id: r.id, name: r.name, roles: r.roles ?? [], phone: r.phone ?? undefined };
}

function mapRemoteDayEntry(r: RemoteDayEntry): DayEntry {
  return {
    id: r.id,
    date: r.date,
    totalCash: r.totalCash ?? 0,
    totalCard: r.totalCard ?? 0,
    shifts: (r.shifts ?? []).map((s) => ({
      id: s.id,
      employeeId: s.employeeId,
      employeeName: s.employeeName,
      tipMode: s.tipMode as TipMode,
      startTime: s.startTime ?? "09:00",
      endTime: s.endTime ?? "18:00",
      cashPercent: s.cashPercent ?? 0,
      cardPercent: s.cardPercent ?? 0,
    })),
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { token, isLoading: authLoading } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [dayEntries, setDayEntries] = useState<DayEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const prevTokenRef = useRef<string | null | undefined>(undefined);

  // Load from AsyncStorage (offline / before auth)
  useEffect(() => {
    if (authLoading) return;
    const load = async () => {
      try {
        const [empData, entryData] = await Promise.all([
          AsyncStorage.getItem(EMPLOYEES_KEY),
          AsyncStorage.getItem(ENTRIES_KEY),
        ]);
        if (empData) setEmployees(JSON.parse(empData));
        if (entryData) setDayEntries(JSON.parse(entryData));
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [authLoading]);

  // Sync from API when token changes (login / app resume with existing session)
  useEffect(() => {
    if (authLoading) return;
    if (prevTokenRef.current === token) return;
    prevTokenRef.current = token;

    if (!token) return;

    const sync = async () => {
      setIsSyncing(true);
      try {
        const [remoteEmps, remoteEntries] = await Promise.all([
          apiCall<RemoteEmployee[]>("/employees", { token }),
          apiCall<RemoteDayEntry[]>("/day-entries", { token }),
        ]);
        const emps = remoteEmps.map(mapRemoteEmployee);
        const entries = remoteEntries.map(mapRemoteDayEntry);
        setEmployees(emps);
        setDayEntries(entries);
        await Promise.all([
          AsyncStorage.setItem(EMPLOYEES_KEY, JSON.stringify(emps)),
          AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(entries)),
        ]);
      } catch {
        // keep local state on network failure
      } finally {
        setIsSyncing(false);
      }
    };
    sync();
  }, [token, authLoading]);

  const saveEmployeesLocal = useCallback(async (data: Employee[]) => {
    await AsyncStorage.setItem(EMPLOYEES_KEY, JSON.stringify(data));
  }, []);

  const saveEntriesLocal = useCallback(async (data: DayEntry[]) => {
    await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(data));
  }, []);

  const addEmployee = useCallback(
    async (name: string, roles: string[] = [], phone?: string) => {
      if (token) {
        const remote = await apiCall<RemoteEmployee>("/employees", {
          method: "POST",
          token,
          body: { name: name.trim(), roles, phone: phone ?? null },
        });
        const emp = mapRemoteEmployee(remote);
        const updated = [...employees, emp];
        setEmployees(updated);
        await saveEmployeesLocal(updated);
      } else {
        const emp: Employee = { id: generateId(), name: name.trim(), roles, phone };
        const updated = [...employees, emp];
        setEmployees(updated);
        await saveEmployeesLocal(updated);
      }
    },
    [token, employees, saveEmployeesLocal]
  );

  const updateEmployee = useCallback(
    async (id: string, name: string, roles?: string[], phone?: string) => {
      if (token) {
        await apiCall<RemoteEmployee>(`/employees/${id}`, {
          method: "PATCH",
          token,
          body: { name: name.trim(), ...(roles !== undefined ? { roles } : {}), ...(phone !== undefined ? { phone } : {}) },
        });
      }
      const updated = employees.map((e) =>
        e.id === id ? { ...e, name: name.trim(), roles: roles ?? e.roles ?? [], phone: phone ?? e.phone } : e
      );
      setEmployees(updated);
      const updatedEntries = dayEntries.map((entry) => ({
        ...entry,
        shifts: entry.shifts.map((s) =>
          s.employeeId === id ? { ...s, employeeName: name.trim() } : s
        ),
      }));
      setDayEntries(updatedEntries);
      await Promise.all([saveEmployeesLocal(updated), saveEntriesLocal(updatedEntries)]);
    },
    [token, employees, dayEntries, saveEmployeesLocal, saveEntriesLocal]
  );

  const deleteEmployee = useCallback(
    async (id: string) => {
      if (token) {
        await apiCall(`/employees/${id}`, { method: "DELETE", token });
      }
      const updated = employees.filter((e) => e.id !== id);
      setEmployees(updated);
      await saveEmployeesLocal(updated);
    },
    [token, employees, saveEmployeesLocal]
  );

  const saveDayEntry = useCallback(
    async (entry: DayEntry) => {
      if (token) {
        await apiCall<RemoteDayEntry>(`/day-entries/${entry.id}`, {
          method: "PUT",
          token,
          body: {
            date: entry.date,
            totalCash: entry.totalCash,
            totalCard: entry.totalCard,
            shifts: entry.shifts.map((s) => ({
              id: s.id,
              employeeId: s.employeeId,
              employeeName: s.employeeName,
              tipMode: s.tipMode,
              startTime: s.startTime,
              endTime: s.endTime,
              cashPercent: s.cashPercent,
              cardPercent: s.cardPercent,
            })),
          },
        });
      }
      setDayEntries((prev) => {
        const idx = prev.findIndex((e) => e.id === entry.id);
        const updated =
          idx >= 0
            ? prev.map((e) => (e.id === entry.id ? entry : e))
            : [...prev, entry];
        saveEntriesLocal(updated);
        return updated;
      });
    },
    [token, saveEntriesLocal]
  );

  const deleteDayEntry = useCallback(
    async (id: string) => {
      if (token) {
        await apiCall(`/day-entries/${id}`, { method: "DELETE", token });
      }
      setDayEntries((prev) => {
        const updated = prev.filter((e) => e.id !== id);
        saveEntriesLocal(updated);
        return updated;
      });
    },
    [token, saveEntriesLocal]
  );

  return (
    <AppContext.Provider
      value={{
        employees,
        dayEntries,
        isLoading,
        isSyncing,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        saveDayEntry,
        deleteDayEntry,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export function calcHoursWorked(startTime: string, endTime: string): number {
  const toMins = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  let s = toMins(startTime);
  let e = toMins(endTime);
  if (e <= s) e += 24 * 60;
  return (e - s) / 60;
}

export function calcDayResults(entry: DayEntry): ShiftResult[] {
  const grandTotal = entry.totalCash + entry.totalCard;

  const percentShifts = entry.shifts.filter((s) => s.tipMode === "percent");
  const hourShifts = entry.shifts.filter((s) => s.tipMode !== "percent");

  const reservedCash = percentShifts.reduce(
    (sum, s) => sum + (s.cashPercent / 100) * entry.totalCash,
    0
  );
  const reservedCard = percentShifts.reduce(
    (sum, s) => sum + (s.cardPercent / 100) * entry.totalCard,
    0
  );

  const remainingCash = Math.max(0, entry.totalCash - reservedCash);
  const remainingCard = Math.max(0, entry.totalCard - reservedCard);
  const totalHours = hourShifts.reduce(
    (sum, s) => sum + calcHoursWorked(s.startTime, s.endTime),
    0
  );

  const results: ShiftResult[] = [];

  for (const s of percentShifts) {
    const cashTips = (s.cashPercent / 100) * entry.totalCash;
    const cardTips = (s.cardPercent / 100) * entry.totalCard;
    const totalTips = cashTips + cardTips;
    results.push({
      shift: s,
      hoursWorked: 0,
      cashTips,
      cardTips,
      totalTips,
      tipsPerHour: 0,
      sharePercent: grandTotal > 0 ? (totalTips / grandTotal) * 100 : 0,
    });
  }

  for (const s of hourShifts) {
    const hours = calcHoursWorked(s.startTime, s.endTime);
    const share = totalHours > 0 ? hours / totalHours : 0;
    const cashTips = remainingCash * share;
    const cardTips = remainingCard * share;
    const totalTips = cashTips + cardTips;
    results.push({
      shift: s,
      hoursWorked: hours,
      cashTips,
      cardTips,
      totalTips,
      tipsPerHour: hours > 0 ? totalTips / hours : 0,
      sharePercent: grandTotal > 0 ? (totalTips / grandTotal) * 100 : 0,
    });
  }

  return results;
}

export function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatDateRu(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}.${month}.${year}`;
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
