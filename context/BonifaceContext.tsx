import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { inventoryService } from "@/lib/services/inventoryService";
import { nowTimeSnapped, snapTimeToQuarter, timeToMinutes } from "@/lib/shiftTime";
import { generateId, todayString } from "./AppContext";
import { useAuth } from "./AuthContext";

export type StockCategory =
  | "spirits"
  | "wine"
  | "beer"
  | "mixers"
  | "garnish"
  | "supplies";

/** Optional placement / zone for bar stock filtering. */
export type StockSubCategory = "display" | "speedbar" | "storage" | "custom";

export interface StockItem {
  id: string;
  name: string;
  category: StockCategory;
  quantity: number;
  unit: string;
  minQuantity: number;
  purchasePrice?: number;
  portionsPerUnit?: number;
  sellingPrice?: number;
  expiryDate?: string;
  /** Optional zone: display | speedbar | storage | custom */
  subCategory?: StockSubCategory;
}

export interface StopListItem {
  id: string;
  name: string;
  reason?: string;
  addedAt: string;
}

export interface WriteOff {
  id: string;
  date: string;
  itemId?: string;
  itemName: string;
  quantity: number;
  unit: string;
  reason: string;
  notes?: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Checklist {
  id: string;
  title: string;
  type: "opening" | "closing" | "preshift" | "custom";
  items: ChecklistItem[];
  createdAt: string;
}

export interface HappyHour {
  id: string;
  startTime: string;
  endTime: string;
  discountPercent: number;
  enabled: boolean;
}

const STOCK_KEY = "@boniface_stock_v1";
const SHIFT_KEY = "@boniface_shift_v2";
const CHECKLISTS_KEY = "@boniface_checklists_v1";
const PREMIUM_KEY = "@boniface_premium_v1";
const STOPLIST_KEY = "@boniface_stoplist_v1";
const WRITEOFFS_KEY = "@boniface_writeoffs_v1";
const HAPPY_HOURS_KEY = "@boniface_happy_hours_v1";

const SYNC_DEBOUNCE_MS = 800;

const DEFAULT_STOCK: StockItem[] = [
  { id: "s1", name: "Виски Jack Daniel's", category: "spirits", quantity: 5, unit: "бут.", minQuantity: 2, subCategory: "speedbar" },
  { id: "s2", name: "Водка Absolut", category: "spirits", quantity: 8, unit: "бут.", minQuantity: 3, subCategory: "speedbar" },
  { id: "s3", name: "Джин Tanqueray", category: "spirits", quantity: 4, unit: "бут.", minQuantity: 2, subCategory: "display" },
  { id: "s4", name: "Ром Bacardi White", category: "spirits", quantity: 3, unit: "бут.", minQuantity: 2, subCategory: "storage" },
  { id: "s5", name: "Вино Pinot Grigio", category: "wine", quantity: 6, unit: "бут.", minQuantity: 3, subCategory: "display" },
  { id: "s6", name: "Вино Merlot", category: "wine", quantity: 4, unit: "бут.", minQuantity: 2, subCategory: "storage" },
  { id: "s7", name: "Пиво Goldstar 0.5", category: "beer", quantity: 48, unit: "шт.", minQuantity: 24 },
  { id: "s8", name: "Пиво Carlsberg", category: "beer", quantity: 24, unit: "шт.", minQuantity: 12 },
  { id: "s9", name: "Tonic Fever-Tree", category: "mixers", quantity: 18, unit: "шт.", minQuantity: 12, subCategory: "speedbar" },
  { id: "s10", name: "Coca-Cola 0.33", category: "mixers", quantity: 24, unit: "шт.", minQuantity: 18, subCategory: "speedbar" },
  { id: "s11", name: "Содовая", category: "mixers", quantity: 12, unit: "шт.", minQuantity: 6 },
  { id: "s12", name: "Лайм", category: "garnish", quantity: 1, unit: "кг", minQuantity: 2 },
  { id: "s13", name: "Мята свежая", category: "garnish", quantity: 2, unit: "пуч.", minQuantity: 2 },
  { id: "s14", name: "Лимон", category: "garnish", quantity: 8, unit: "шт.", minQuantity: 10 },
  { id: "s15", name: "Лёд", category: "supplies", quantity: 8, unit: "кг", minQuantity: 10 },
  { id: "s16", name: "Салфетки", category: "supplies", quantity: 150, unit: "шт.", minQuantity: 50 },
];

const DEFAULT_CHECKLISTS: Checklist[] = [
  {
    id: "cl1",
    title: "Bar Opening",
    type: "opening",
    createdAt: todayString(),
    items: [
      { id: "i1", text: "Check alcohol stock levels", done: false },
      { id: "i2", text: "Fill ice bins", done: false },
      { id: "i3", text: "Check cash register", done: false },
      { id: "i4", text: "Wipe down bar counter", done: false },
      { id: "i5", text: "Charge tablet / POS terminal", done: false },
      { id: "i6", text: "Review menu and specials", done: false },
    ],
  },
  {
    id: "cl2",
    title: "Bar Closing",
    type: "closing",
    createdAt: todayString(),
    items: [
      { id: "i7", text: "Count cash register", done: false },
      { id: "i8", text: "Write off ice and perishables", done: false },
      { id: "i9", text: "Wash bar equipment", done: false },
      { id: "i10", text: "Put alcohol back in storage", done: false },
      { id: "i11", text: "Record daily revenue", done: false },
    ],
  },
  {
    id: "cl3",
    title: "Pre-Shift Brief",
    type: "preshift",
    createdAt: todayString(),
    items: [
      { id: "i12", text: "Introduce shift lineup", done: false },
      { id: "i13", text: "Review specials and 86 list", done: false },
      { id: "i14", text: "Set the goal for tonight", done: false },
      { id: "i15", text: "Check staff uniforms", done: false },
    ],
  },
];

export interface ShiftAttendance {
  employeeId: string;
  joinedAt: string;
  leftAt?: string | null;
}

export interface ShiftState {
  active: boolean;
  startTime: string | null;
  startDate: string | null;
  employeeIds: string[];
  /** Join/leave segments — tip hours come from this (15-min snaps). */
  attendance: ShiftAttendance[];
  tipsGoal?: number;
}

interface BonifaceContextType {
  stockItems: StockItem[];
  checklists: Checklist[];
  shiftState: ShiftState;
  stopList: StopListItem[];
  writeOffs: WriteOff[];
  happyHours: HappyHour[];
  isLoading: boolean;
  isSyncing: boolean;
  lowStockCount: number;
  isPremium: boolean;
  isHappyHourActive: boolean;
  activeHappyHour: HappyHour | null;
  setPremium: (val: boolean) => Promise<void>;
  startShift: (employeeIds: string[], tipsGoal?: number) => Promise<void>;
  endShift: () => Promise<void>;
  addEmployeesToShift: (employeeIds: string[]) => Promise<void>;
  removeEmployeeFromShift: (employeeId: string) => Promise<void>;
  addChecklist: (title: string) => Promise<void>;
  deleteChecklist: (id: string) => Promise<void>;
  addChecklistItem: (checklistId: string, text: string) => Promise<void>;
  deleteChecklistItem: (checklistId: string, itemId: string) => Promise<void>;
  updateStockQuantity: (id: string, delta: number) => Promise<void>;
  addStockItem: (item: Omit<StockItem, "id">) => Promise<void>;
  updateStockItem: (id: string, updates: Partial<Omit<StockItem, "id">>) => Promise<void>;
  deleteStockItem: (id: string) => Promise<void>;
  toggleChecklistItem: (checklistId: string, itemId: string) => Promise<void>;
  resetChecklist: (checklistId: string) => Promise<void>;
  addToStopList: (name: string, reason?: string) => Promise<void>;
  removeFromStopList: (id: string) => Promise<void>;
  clearStopList: () => Promise<void>;
  addWriteOff: (writeOff: Omit<WriteOff, "id">) => Promise<void>;
  deleteWriteOff: (id: string) => Promise<void>;
  setHappyHours: (hours: HappyHour[]) => Promise<void>;
  upsertHappyHour: (hour: HappyHour) => Promise<void>;
  removeHappyHour: (id: string) => Promise<void>;
}

const BonifaceContext = createContext<BonifaceContextType | null>(null);

function normalizeShiftState(raw: Partial<ShiftState> | null | undefined): ShiftState {
  const empty: ShiftState = {
    active: false,
    startTime: null,
    startDate: null,
    employeeIds: [],
    attendance: [],
  };
  if (!raw) return empty;
  const employeeIds = Array.isArray(raw.employeeIds) ? raw.employeeIds : [];
  let attendance: ShiftAttendance[] = Array.isArray(raw.attendance) ? raw.attendance : [];
  // Migrate older saves that only had employeeIds
  if (raw.active && attendance.length === 0 && employeeIds.length > 0) {
    const joined = snapTimeToQuarter(raw.startTime || nowTimeSnapped());
    attendance = employeeIds.map((employeeId) => ({
      employeeId,
      joinedAt: joined,
      leftAt: null,
    }));
  }
  return {
    active: !!raw.active,
    startTime: raw.startTime ?? null,
    startDate: raw.startDate ?? null,
    employeeIds,
    attendance,
    tipsGoal: raw.tipsGoal,
  };
}

/** True if now is within start–end (supports overnight ranges). */
export function isHappyHourNow(hour: HappyHour, now = new Date()): boolean {
  if (!hour.enabled) return false;
  const cur = now.getHours() * 60 + now.getMinutes();
  const start = timeToMinutes(hour.startTime);
  const end = timeToMinutes(hour.endTime);
  if (end <= start) return cur >= start || cur < end;
  return cur >= start && cur < end;
}

function mapRemoteStock(r: StockItem): StockItem {
  return {
    id: r.id,
    name: r.name,
    category: r.category as StockCategory,
    quantity: r.quantity,
    unit: r.unit,
    minQuantity: r.minQuantity,
    purchasePrice: r.purchasePrice ?? undefined,
    portionsPerUnit: r.portionsPerUnit ?? undefined,
    sellingPrice: r.sellingPrice ?? undefined,
    expiryDate: r.expiryDate ?? undefined,
    subCategory: r.subCategory ?? undefined,
  };
}

function mapRemoteStop(r: StopListItem): StopListItem {
  return {
    id: r.id,
    name: r.name,
    reason: r.reason ?? undefined,
    addedAt: r.addedAt,
  };
}

function mapRemoteWriteOff(r: WriteOff): WriteOff {
  return {
    id: r.id,
    date: r.date,
    itemId: r.itemId ?? undefined,
    itemName: r.itemName,
    quantity: r.quantity,
    unit: r.unit,
    reason: r.reason,
    notes: r.notes ?? undefined,
  };
}

function mapRemoteChecklist(r: Checklist): Checklist {
  return {
    id: r.id,
    title: r.title,
    type: r.type as Checklist["type"],
    items: r.items ?? [],
    createdAt: r.createdAt,
  };
}

export function BonifaceProvider({ children }: { children: React.ReactNode }) {
  const { token, isLoading: authLoading, isManager } = useAuth();
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [shiftState, setShiftState] = useState<ShiftState>({
    active: false,
    startTime: null,
    startDate: null,
    employeeIds: [],
    attendance: [],
  });
  const [stopList, setStopList] = useState<StopListItem[]>([]);
  const [writeOffs, setWriteOffs] = useState<WriteOff[]>([]);
  const [happyHours, setHappyHoursState] = useState<HappyHour[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [tick, setTick] = useState(0);

  const prevTokenRef = useRef<string | null | undefined>(undefined);
  const hydrateSkipRef = useRef(false);
  const syncTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = token;

  // Refresh happy-hour active state every minute
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    const load = async () => {
      try {
        const [
          stockData,
          shiftData,
          checklistData,
          premiumData,
          stopData,
          writeOffData,
          happyData,
        ] = await Promise.all([
          AsyncStorage.getItem(STOCK_KEY),
          AsyncStorage.getItem(SHIFT_KEY),
          AsyncStorage.getItem(CHECKLISTS_KEY),
          AsyncStorage.getItem(PREMIUM_KEY),
          AsyncStorage.getItem(STOPLIST_KEY),
          AsyncStorage.getItem(WRITEOFFS_KEY),
          AsyncStorage.getItem(HAPPY_HOURS_KEY),
        ]);
        setStockItems(stockData ? JSON.parse(stockData) : DEFAULT_STOCK);
        setShiftState(normalizeShiftState(shiftData ? JSON.parse(shiftData) : null));
        setChecklists(checklistData ? JSON.parse(checklistData) : DEFAULT_CHECKLISTS);
        setIsPremium(premiumData === "true");
        setStopList(stopData ? JSON.parse(stopData) : []);
        setWriteOffs(writeOffData ? JSON.parse(writeOffData) : []);
        setHappyHoursState(happyData ? JSON.parse(happyData) : []);
      } catch {
        setStockItems(DEFAULT_STOCK);
        setChecklists(DEFAULT_CHECKLISTS);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [authLoading]);

  // Hydrate from API on login / session restore (managers only)
  useEffect(() => {
    if (authLoading || isLoading) return;
    if (prevTokenRef.current === token) return;
    prevTokenRef.current = token;
    if (!token || !isManager) return;

    const hydrate = async () => {
      setIsSyncing(true);
      hydrateSkipRef.current = true;
      try {
        const remote = await inventoryService.pullFromCloud(token);
        const stock = (remote.stock ?? []).map(mapRemoteStock);
        const stop = (remote.stop ?? []).map(mapRemoteStop);
        const offs = (remote.writeOffs ?? []).map(mapRemoteWriteOff);
        const cls = (remote.checklists ?? []).map(mapRemoteChecklist);

        if (stock.length > 0) {
          setStockItems(stock);
        } else {
          const localStockRaw = await AsyncStorage.getItem(STOCK_KEY);
          const localStock: StockItem[] = localStockRaw
            ? JSON.parse(localStockRaw)
            : DEFAULT_STOCK;
          if (localStock.length > 0) {
            await inventoryService.saveStock(token, localStock, true);
          }
        }

        setStopList(stop);
        setWriteOffs(offs);

        if (cls.length > 0) {
          setChecklists(cls);
        } else {
          const localClRaw = await AsyncStorage.getItem(CHECKLISTS_KEY);
          const localCl: Checklist[] = localClRaw
            ? JSON.parse(localClRaw)
            : DEFAULT_CHECKLISTS;
          if (localCl.length > 0) {
            await inventoryService.saveChecklists(token, localCl, true);
          }
        }
      } catch {
        // Offline / API down — keep AsyncStorage cache
      } finally {
        setIsSyncing(false);
        setTimeout(() => {
          hydrateSkipRef.current = false;
        }, 50);
      }
    };
    hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on token/manager change
  }, [token, authLoading, isLoading, isManager]);

  const scheduleCloudPut = useCallback(
    (key: "stock" | "stop-list" | "write-offs" | "checklists", body: unknown) => {
      if (!tokenRef.current || hydrateSkipRef.current || !isManager) return;
      const existing = syncTimers.current[key];
      if (existing) clearTimeout(existing);
      syncTimers.current[key] = setTimeout(() => {
        const t = tokenRef.current;
        if (!t) return;
        if (key === "stock") inventoryService.saveStock(t, body as StockItem[], true);
        else if (key === "stop-list") inventoryService.saveStopList(t, body as StopListItem[], true);
        else if (key === "write-offs") inventoryService.saveWriteOffs(t, body as WriteOff[], true);
        else inventoryService.saveChecklists(t, body as Checklist[], true);
      }, SYNC_DEBOUNCE_MS);
    },
    [isManager]
  );

  useEffect(() => {
    return () => {
      Object.values(syncTimers.current).forEach(clearTimeout);
    };
  }, []);

  const saveStock = useCallback(
    async (data: StockItem[]) => {
      await AsyncStorage.setItem(STOCK_KEY, JSON.stringify(data));
      scheduleCloudPut("stock", data);
    },
    [scheduleCloudPut]
  );

  const saveChecklists = useCallback(
    async (data: Checklist[]) => {
      await AsyncStorage.setItem(CHECKLISTS_KEY, JSON.stringify(data));
      scheduleCloudPut("checklists", data);
    },
    [scheduleCloudPut]
  );

  const saveStopList = useCallback(
    async (data: StopListItem[]) => {
      await AsyncStorage.setItem(STOPLIST_KEY, JSON.stringify(data));
      scheduleCloudPut("stop-list", data);
    },
    [scheduleCloudPut]
  );

  const saveWriteOffs = useCallback(
    async (data: WriteOff[]) => {
      await AsyncStorage.setItem(WRITEOFFS_KEY, JSON.stringify(data));
      scheduleCloudPut("write-offs", data);
    },
    [scheduleCloudPut]
  );

  const saveHappyHoursLocal = useCallback(async (data: HappyHour[]) => {
    await AsyncStorage.setItem(HAPPY_HOURS_KEY, JSON.stringify(data));
  }, []);

  const setPremium = useCallback(async (val: boolean) => {
    setIsPremium(val);
    await AsyncStorage.setItem(PREMIUM_KEY, val ? "true" : "false");
  }, []);

  const persistShift = useCallback(async (state: ShiftState) => {
    setShiftState(state);
    await AsyncStorage.setItem(SHIFT_KEY, JSON.stringify(state));
  }, []);

  const startShift = useCallback(async (employeeIds: string[], tipsGoal?: number) => {
    const startTime = nowTimeSnapped();
    const state: ShiftState = {
      active: true,
      startTime,
      startDate: todayString(),
      employeeIds: [...employeeIds],
      attendance: employeeIds.map((employeeId) => ({
        employeeId,
        joinedAt: startTime,
        leftAt: null,
      })),
      tipsGoal,
    };
    await persistShift(state);
  }, [persistShift]);

  const addEmployeesToShift = useCallback(async (ids: string[]) => {
    setShiftState((prev) => {
      if (!prev.active) return prev;
      const joinedAt = nowTimeSnapped();
      const nextIds = [...prev.employeeIds];
      const nextAttendance = [...(prev.attendance ?? [])];
      for (const id of ids) {
        if (nextIds.includes(id)) continue;
        nextIds.push(id);
        nextAttendance.push({ employeeId: id, joinedAt, leftAt: null });
      }
      const state: ShiftState = { ...prev, employeeIds: nextIds, attendance: nextAttendance };
      void AsyncStorage.setItem(SHIFT_KEY, JSON.stringify(state));
      return state;
    });
  }, []);

  const removeEmployeeFromShift = useCallback(async (employeeId: string) => {
    setShiftState((prev) => {
      if (!prev.active) return prev;
      const leftAt = nowTimeSnapped();
      const state: ShiftState = {
        ...prev,
        employeeIds: prev.employeeIds.filter((id) => id !== employeeId),
        attendance: (prev.attendance ?? []).map((a) =>
          a.employeeId === employeeId && (a.leftAt == null || a.leftAt === "")
            ? { ...a, leftAt }
            : a
        ),
      };
      void AsyncStorage.setItem(SHIFT_KEY, JSON.stringify(state));
      return state;
    });
  }, []);

  const addChecklist = useCallback(
    async (title: string) => {
      const newCl: Checklist = {
        id: generateId(),
        title: title.trim(),
        type: "custom",
        items: [],
        createdAt: todayString(),
      };
      setChecklists((prev) => {
        const updated = [...prev, newCl];
        saveChecklists(updated);
        return updated;
      });
    },
    [saveChecklists]
  );

  const deleteChecklist = useCallback(
    async (id: string) => {
      setChecklists((prev) => {
        const updated = prev.filter((cl) => cl.id !== id);
        saveChecklists(updated);
        return updated;
      });
    },
    [saveChecklists]
  );

  const addChecklistItem = useCallback(
    async (checklistId: string, text: string) => {
      setChecklists((prev) => {
        const updated = prev.map((cl) =>
          cl.id === checklistId
            ? { ...cl, items: [...cl.items, { id: generateId(), text: text.trim(), done: false }] }
            : cl
        );
        saveChecklists(updated);
        return updated;
      });
    },
    [saveChecklists]
  );

  const deleteChecklistItem = useCallback(
    async (checklistId: string, itemId: string) => {
      setChecklists((prev) => {
        const updated = prev.map((cl) =>
          cl.id === checklistId ? { ...cl, items: cl.items.filter((i) => i.id !== itemId) } : cl
        );
        saveChecklists(updated);
        return updated;
      });
    },
    [saveChecklists]
  );

  const endShift = useCallback(async () => {
    const state: ShiftState = {
      active: false,
      startTime: null,
      startDate: null,
      employeeIds: [],
      attendance: [],
    };
    setShiftState(state);
    setStopList([]);
    await Promise.all([
      AsyncStorage.setItem(SHIFT_KEY, JSON.stringify(state)),
      AsyncStorage.setItem(STOPLIST_KEY, JSON.stringify([])),
    ]);
    scheduleCloudPut("stop-list", []);
  }, [scheduleCloudPut]);

  const updateStockQuantity = useCallback(
    async (id: string, delta: number) => {
      setStockItems((prev) => {
        const updated = prev.map((item) =>
          item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
        );
        saveStock(updated);
        return updated;
      });
    },
    [saveStock]
  );

  const addStockItem = useCallback(
    async (item: Omit<StockItem, "id">) => {
      const newItem: StockItem = { ...item, id: generateId() };
      setStockItems((prev) => {
        const updated = [...prev, newItem];
        saveStock(updated);
        return updated;
      });
    },
    [saveStock]
  );

  const updateStockItem = useCallback(
    async (id: string, updates: Partial<Omit<StockItem, "id">>) => {
      setStockItems((prev) => {
        const updated = prev.map((item) => (item.id === id ? { ...item, ...updates } : item));
        saveStock(updated);
        return updated;
      });
    },
    [saveStock]
  );

  const deleteStockItem = useCallback(
    async (id: string) => {
      setStockItems((prev) => {
        const updated = prev.filter((i) => i.id !== id);
        saveStock(updated);
        return updated;
      });
    },
    [saveStock]
  );

  const toggleChecklistItem = useCallback(
    async (checklistId: string, itemId: string) => {
      setChecklists((prev) => {
        const updated = prev.map((cl) =>
          cl.id === checklistId
            ? {
                ...cl,
                items: cl.items.map((it) =>
                  it.id === itemId ? { ...it, done: !it.done } : it
                ),
              }
            : cl
        );
        saveChecklists(updated);
        return updated;
      });
    },
    [saveChecklists]
  );

  const resetChecklist = useCallback(
    async (checklistId: string) => {
      setChecklists((prev) => {
        const updated = prev.map((cl) =>
          cl.id === checklistId
            ? { ...cl, items: cl.items.map((it) => ({ ...it, done: false })) }
            : cl
        );
        saveChecklists(updated);
        return updated;
      });
    },
    [saveChecklists]
  );

  const addToStopList = useCallback(
    async (name: string, reason?: string) => {
      const item: StopListItem = {
        id: generateId(),
        name: name.trim(),
        reason,
        addedAt: todayString(),
      };
      setStopList((prev) => {
        const updated = [...prev, item];
        saveStopList(updated);
        return updated;
      });
    },
    [saveStopList]
  );

  const removeFromStopList = useCallback(
    async (id: string) => {
      setStopList((prev) => {
        const updated = prev.filter((i) => i.id !== id);
        saveStopList(updated);
        return updated;
      });
    },
    [saveStopList]
  );

  const clearStopList = useCallback(async () => {
    setStopList([]);
    await AsyncStorage.setItem(STOPLIST_KEY, "[]");
    scheduleCloudPut("stop-list", []);
  }, [scheduleCloudPut]);

  const addWriteOff = useCallback(
    async (writeOff: Omit<WriteOff, "id">) => {
      const newWO: WriteOff = { ...writeOff, id: generateId() };
      setWriteOffs((prev) => {
        const updated = [newWO, ...prev];
        saveWriteOffs(updated);
        return updated;
      });
      if (writeOff.itemId) {
        setStockItems((prev) => {
          const updated = prev.map((item) =>
            item.id === writeOff.itemId
              ? { ...item, quantity: Math.max(0, item.quantity - writeOff.quantity) }
              : item
          );
          saveStock(updated);
          return updated;
        });
      }
    },
    [saveWriteOffs, saveStock]
  );

  const deleteWriteOff = useCallback(
    async (id: string) => {
      setWriteOffs((prev) => {
        const updated = prev.filter((w) => w.id !== id);
        saveWriteOffs(updated);
        return updated;
      });
    },
    [saveWriteOffs]
  );

  const setHappyHours = useCallback(
    async (hours: HappyHour[]) => {
      setHappyHoursState(hours);
      await saveHappyHoursLocal(hours);
    },
    [saveHappyHoursLocal]
  );

  const upsertHappyHour = useCallback(
    async (hour: HappyHour) => {
      setHappyHoursState((prev) => {
        const idx = prev.findIndex((h) => h.id === hour.id);
        const updated =
          idx >= 0 ? prev.map((h) => (h.id === hour.id ? hour : h)) : [...prev, hour];
        saveHappyHoursLocal(updated);
        return updated;
      });
    },
    [saveHappyHoursLocal]
  );

  const removeHappyHour = useCallback(
    async (id: string) => {
      setHappyHoursState((prev) => {
        const updated = prev.filter((h) => h.id !== id);
        saveHappyHoursLocal(updated);
        return updated;
      });
    },
    [saveHappyHoursLocal]
  );

  const lowStockCount = stockItems.filter((i) => i.quantity < i.minQuantity).length;
  void tick;
  const activeHappyHour = happyHours.find((h) => isHappyHourNow(h)) ?? null;
  const isHappyHourActive = !!activeHappyHour;

  return (
    <BonifaceContext.Provider
      value={{
        stockItems,
        checklists,
        shiftState,
        stopList,
        writeOffs,
        happyHours,
        isLoading,
        isSyncing,
        lowStockCount,
        isPremium,
        isHappyHourActive,
        activeHappyHour,
        setPremium,
        startShift,
        endShift,
        addEmployeesToShift,
        removeEmployeeFromShift,
        updateStockQuantity,
        addStockItem,
        updateStockItem,
        deleteStockItem,
        toggleChecklistItem,
        resetChecklist,
        addChecklist,
        deleteChecklist,
        addChecklistItem,
        deleteChecklistItem,
        addToStopList,
        removeFromStopList,
        clearStopList,
        addWriteOff,
        deleteWriteOff,
        setHappyHours,
        upsertHappyHour,
        removeHappyHour,
      }}
    >
      {children}
    </BonifaceContext.Provider>
  );
}

export function useBoniface() {
  const ctx = useContext(BonifaceContext);
  if (!ctx) throw new Error("useBoniface must be used within BonifaceProvider");
  return ctx;
}

/** @deprecated Prefer `tr.categories` from useLang() for localized labels. */
export const CATEGORY_LABELS: Record<StockCategory, string> = {
  spirits: "Крепкие",
  wine: "Вина",
  beer: "Пиво",
  mixers: "Миксеры",
  garnish: "Гарниры",
  supplies: "Расходники",
};

type ChecklistDefaultsTr = {
  checklistDefaults: {
    opening: { title: string; items: string[] };
    closing: { title: string; items: string[] };
    preshift: { title: string; items: string[] };
  };
};

/** Localize built-in checklist title/items; custom checklists pass through. */
export function getLocalizedChecklist(cl: Checklist, tr: ChecklistDefaultsTr): Checklist {
  if (cl.type === "custom") return cl;
  const def = tr.checklistDefaults[cl.type];
  if (!def) return cl;
  return {
    ...cl,
    title: def.title,
    items: cl.items.map((item, i) => ({
      ...item,
      text: def.items[i] ?? item.text,
    })),
  };
}

type SeedStockTr = {
  seedStock?: Record<string, { name: string; unit: string }>;
};

/** Localize default seed stock names/units by id (s1–s16). User-added items pass through. */
export function getLocalizedStockItem<T extends { id: string; name: string; unit: string }>(
  item: T,
  tr: SeedStockTr
): T {
  const seed = tr.seedStock?.[item.id];
  if (!seed) return item;
  return { ...item, name: seed.name, unit: seed.unit };
}

export const CATEGORY_ICONS: Record<StockCategory, string> = {
  spirits: "droplet",
  wine: "award",
  beer: "coffee",
  mixers: "zap",
  garnish: "feather",
  supplies: "package",
};

export const WRITE_OFF_REASONS = [
  "Разбили",
  "Испортилось",
  "Пролили",
  "Плохое качество",
  "Для персонала",
  "Дегустация / тест",
  "Другое",
];

export function calcBeverageCost(
  purchasePrice: number,
  portionsPerUnit: number,
  sellingPrice: number
): number {
  if (portionsPerUnit <= 0 || sellingPrice <= 0) return 0;
  return (purchasePrice / portionsPerUnit / sellingPrice) * 100;
}

/** Employee-of-the-month: tips (7d) + shifts; lateFlag discounts if present. */
export function pickEmployeeOfMonth(
  scores: {
    employeeId: string;
    employeeName: string;
    tipsLast7: number;
    shiftsLast7: number;
    lateFlag?: boolean;
  }[]
): { employeeId: string; employeeName: string; tipsLast7: number; shiftsLast7: number } | null {
  if (scores.length === 0) return null;
  const ranked = [...scores]
    .map((s) => ({
      ...s,
      score: s.tipsLast7 + s.shiftsLast7 * 40 - (s.lateFlag ? 200 : 0),
    }))
    .sort((a, b) => b.score - a.score || b.tipsLast7 - a.tipsLast7 || b.shiftsLast7 - a.shiftsLast7);
  const top = ranked[0];
  if (top.tipsLast7 <= 0 && top.shiftsLast7 <= 0) return null;
  return {
    employeeId: top.employeeId,
    employeeName: top.employeeName,
    tipsLast7: top.tipsLast7,
    shiftsLast7: top.shiftsLast7,
  };
}
