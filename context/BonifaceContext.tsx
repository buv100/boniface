import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { generateId, todayString } from "./AppContext";

export type StockCategory =
  | "spirits"
  | "wine"
  | "beer"
  | "mixers"
  | "garnish"
  | "supplies";

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

const STOCK_KEY = "@boniface_stock_v1";
const SHIFT_KEY = "@boniface_shift_v2";
const CHECKLISTS_KEY = "@boniface_checklists_v1";
const PREMIUM_KEY = "@boniface_premium_v1";
const STOPLIST_KEY = "@boniface_stoplist_v1";
const WRITEOFFS_KEY = "@boniface_writeoffs_v1";

const DEFAULT_STOCK: StockItem[] = [
  { id: "s1", name: "Виски Jack Daniel's", category: "spirits", quantity: 5, unit: "бут.", minQuantity: 2 },
  { id: "s2", name: "Водка Absolut", category: "spirits", quantity: 8, unit: "бут.", minQuantity: 3 },
  { id: "s3", name: "Джин Tanqueray", category: "spirits", quantity: 4, unit: "бут.", minQuantity: 2 },
  { id: "s4", name: "Ром Bacardi White", category: "spirits", quantity: 3, unit: "бут.", minQuantity: 2 },
  { id: "s5", name: "Вино Pinot Grigio", category: "wine", quantity: 6, unit: "бут.", minQuantity: 3 },
  { id: "s6", name: "Вино Merlot", category: "wine", quantity: 4, unit: "бут.", minQuantity: 2 },
  { id: "s7", name: "Пиво Goldstar 0.5", category: "beer", quantity: 48, unit: "шт.", minQuantity: 24 },
  { id: "s8", name: "Пиво Carlsberg", category: "beer", quantity: 24, unit: "шт.", minQuantity: 12 },
  { id: "s9", name: "Tonic Fever-Tree", category: "mixers", quantity: 18, unit: "шт.", minQuantity: 12 },
  { id: "s10", name: "Coca-Cola 0.33", category: "mixers", quantity: 24, unit: "шт.", minQuantity: 18 },
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

export interface ShiftState {
  active: boolean;
  startTime: string | null;
  startDate: string | null;
  employeeIds: string[];
  tipsGoal?: number;
}

interface BonifaceContextType {
  stockItems: StockItem[];
  checklists: Checklist[];
  shiftState: ShiftState;
  stopList: StopListItem[];
  writeOffs: WriteOff[];
  isLoading: boolean;
  lowStockCount: number;
  isPremium: boolean;
  setPremium: (val: boolean) => Promise<void>;
  startShift: (employeeIds: string[], tipsGoal?: number) => Promise<void>;
  endShift: () => Promise<void>;
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
}

const BonifaceContext = createContext<BonifaceContextType | null>(null);

export function BonifaceProvider({ children }: { children: React.ReactNode }) {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [shiftState, setShiftState] = useState<ShiftState>({ active: false, startTime: null, startDate: null, employeeIds: [] });
  const [stopList, setStopList] = useState<StopListItem[]>([]);
  const [writeOffs, setWriteOffs] = useState<WriteOff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [stockData, shiftData, checklistData, premiumData, stopData, writeOffData] = await Promise.all([
          AsyncStorage.getItem(STOCK_KEY),
          AsyncStorage.getItem(SHIFT_KEY),
          AsyncStorage.getItem(CHECKLISTS_KEY),
          AsyncStorage.getItem(PREMIUM_KEY),
          AsyncStorage.getItem(STOPLIST_KEY),
          AsyncStorage.getItem(WRITEOFFS_KEY),
        ]);
        setStockItems(stockData ? JSON.parse(stockData) : DEFAULT_STOCK);
        setShiftState(shiftData ? JSON.parse(shiftData) : { active: false, startTime: null, startDate: null, employeeIds: [] });
        setChecklists(checklistData ? JSON.parse(checklistData) : DEFAULT_CHECKLISTS);
        setIsPremium(premiumData === "true");
        setStopList(stopData ? JSON.parse(stopData) : []);
        setWriteOffs(writeOffData ? JSON.parse(writeOffData) : []);
      } catch {
        setStockItems(DEFAULT_STOCK);
        setChecklists(DEFAULT_CHECKLISTS);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const saveStock = useCallback(async (data: StockItem[]) => {
    await AsyncStorage.setItem(STOCK_KEY, JSON.stringify(data));
  }, []);

  const saveChecklists = useCallback(async (data: Checklist[]) => {
    await AsyncStorage.setItem(CHECKLISTS_KEY, JSON.stringify(data));
  }, []);

  const saveStopList = useCallback(async (data: StopListItem[]) => {
    await AsyncStorage.setItem(STOPLIST_KEY, JSON.stringify(data));
  }, []);

  const saveWriteOffs = useCallback(async (data: WriteOff[]) => {
    await AsyncStorage.setItem(WRITEOFFS_KEY, JSON.stringify(data));
  }, []);

  const setPremium = useCallback(async (val: boolean) => {
    setIsPremium(val);
    await AsyncStorage.setItem(PREMIUM_KEY, val ? "true" : "false");
  }, []);

  const startShift = useCallback(async (employeeIds: string[], tipsGoal?: number) => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    const state: ShiftState = { active: true, startTime: `${h}:${m}`, startDate: todayString(), employeeIds, tipsGoal };
    setShiftState(state);
    await AsyncStorage.setItem(SHIFT_KEY, JSON.stringify(state));
  }, []);

  const addChecklist = useCallback(async (title: string) => {
    const newCl: Checklist = { id: generateId(), title: title.trim(), type: "custom", items: [], createdAt: todayString() };
    setChecklists((prev) => { const updated = [...prev, newCl]; saveChecklists(updated); return updated; });
  }, [saveChecklists]);

  const deleteChecklist = useCallback(async (id: string) => {
    setChecklists((prev) => { const updated = prev.filter((cl) => cl.id !== id); saveChecklists(updated); return updated; });
  }, [saveChecklists]);

  const addChecklistItem = useCallback(async (checklistId: string, text: string) => {
    setChecklists((prev) => {
      const updated = prev.map((cl) =>
        cl.id === checklistId
          ? { ...cl, items: [...cl.items, { id: generateId(), text: text.trim(), done: false }] }
          : cl
      );
      saveChecklists(updated);
      return updated;
    });
  }, [saveChecklists]);

  const deleteChecklistItem = useCallback(async (checklistId: string, itemId: string) => {
    setChecklists((prev) => {
      const updated = prev.map((cl) =>
        cl.id === checklistId ? { ...cl, items: cl.items.filter((i) => i.id !== itemId) } : cl
      );
      saveChecklists(updated);
      return updated;
    });
  }, [saveChecklists]);

  const endShift = useCallback(async () => {
    const state: ShiftState = { active: false, startTime: null, startDate: null, employeeIds: [] };
    setShiftState(state);
    setStopList([]);
    await Promise.all([
      AsyncStorage.setItem(SHIFT_KEY, JSON.stringify(state)),
      AsyncStorage.setItem(STOPLIST_KEY, JSON.stringify([])),
    ]);
  }, []);

  const updateStockQuantity = useCallback(async (id: string, delta: number) => {
    setStockItems((prev) => {
      const updated = prev.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
      );
      saveStock(updated);
      return updated;
    });
  }, [saveStock]);

  const addStockItem = useCallback(async (item: Omit<StockItem, "id">) => {
    const newItem: StockItem = { ...item, id: generateId() };
    setStockItems((prev) => {
      const updated = [...prev, newItem];
      saveStock(updated);
      return updated;
    });
  }, [saveStock]);

  const updateStockItem = useCallback(async (id: string, updates: Partial<Omit<StockItem, "id">>) => {
    setStockItems((prev) => {
      const updated = prev.map((item) => item.id === id ? { ...item, ...updates } : item);
      saveStock(updated);
      return updated;
    });
  }, [saveStock]);

  const deleteStockItem = useCallback(async (id: string) => {
    setStockItems((prev) => {
      const updated = prev.filter((i) => i.id !== id);
      saveStock(updated);
      return updated;
    });
  }, [saveStock]);

  const toggleChecklistItem = useCallback(async (checklistId: string, itemId: string) => {
    setChecklists((prev) => {
      const updated = prev.map((cl) =>
        cl.id === checklistId
          ? { ...cl, items: cl.items.map((it) => it.id === itemId ? { ...it, done: !it.done } : it) }
          : cl
      );
      saveChecklists(updated);
      return updated;
    });
  }, [saveChecklists]);

  const resetChecklist = useCallback(async (checklistId: string) => {
    setChecklists((prev) => {
      const updated = prev.map((cl) =>
        cl.id === checklistId
          ? { ...cl, items: cl.items.map((it) => ({ ...it, done: false })) }
          : cl
      );
      saveChecklists(updated);
      return updated;
    });
  }, [saveChecklists]);

  const addToStopList = useCallback(async (name: string, reason?: string) => {
    const item: StopListItem = { id: generateId(), name: name.trim(), reason, addedAt: todayString() };
    setStopList((prev) => {
      const updated = [...prev, item];
      saveStopList(updated);
      return updated;
    });
  }, [saveStopList]);

  const removeFromStopList = useCallback(async (id: string) => {
    setStopList((prev) => {
      const updated = prev.filter((i) => i.id !== id);
      saveStopList(updated);
      return updated;
    });
  }, [saveStopList]);

  const clearStopList = useCallback(async () => {
    setStopList([]);
    await AsyncStorage.setItem(STOPLIST_KEY, "[]");
  }, []);

  const addWriteOff = useCallback(async (writeOff: Omit<WriteOff, "id">) => {
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
  }, [saveWriteOffs, saveStock]);

  const deleteWriteOff = useCallback(async (id: string) => {
    setWriteOffs((prev) => {
      const updated = prev.filter((w) => w.id !== id);
      saveWriteOffs(updated);
      return updated;
    });
  }, [saveWriteOffs]);

  const lowStockCount = stockItems.filter((i) => i.quantity < i.minQuantity).length;

  return (
    <BonifaceContext.Provider value={{
      stockItems, checklists, shiftState, stopList, writeOffs, isLoading, lowStockCount,
      isPremium, setPremium,
      startShift, endShift, updateStockQuantity, addStockItem, updateStockItem, deleteStockItem,
      toggleChecklistItem, resetChecklist, addChecklist, deleteChecklist, addChecklistItem, deleteChecklistItem,
      addToStopList, removeFromStopList, clearStopList,
      addWriteOff, deleteWriteOff,
    }}>
      {children}
    </BonifaceContext.Provider>
  );
}

export function useBoniface() {
  const ctx = useContext(BonifaceContext);
  if (!ctx) throw new Error("useBoniface must be used within BonifaceProvider");
  return ctx;
}

export const CATEGORY_LABELS: Record<StockCategory, string> = {
  spirits: "Крепкие",
  wine: "Вина",
  beer: "Пиво",
  mixers: "Миксеры",
  garnish: "Гарниры",
  supplies: "Расходники",
};

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

export function calcBeverageCost(purchasePrice: number, portionsPerUnit: number, sellingPrice: number): number {
  if (portionsPerUnit <= 0 || sellingPrice <= 0) return 0;
  return (purchasePrice / portionsPerUnit / sellingPrice) * 100;
}
