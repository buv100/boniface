import type { Checklist, StockItem, StopListItem, WriteOff } from "@/context/BonifaceContext";
import { httpRepo } from "./http";
import { localRepo } from "./localRepo";

const STOCK_KEY = "@boniface_stock_v1";
const STOPLIST_KEY = "@boniface_stoplist_v1";
const WRITEOFFS_KEY = "@boniface_writeoffs_v1";
const CHECKLISTS_KEY = "@boniface_checklists_v1";

export const stockRepository = {
  async loadLocal(): Promise<StockItem[] | null> {
    return localRepo.getJson<StockItem[]>(STOCK_KEY);
  },
  async saveLocal(items: StockItem[]) {
    await localRepo.setJson(STOCK_KEY, items);
  },
  async fetchRemote(token: string) {
    return httpRepo.get<StockItem[]>("/stock", token);
  },
  async pushRemote(token: string, items: StockItem[]) {
    return httpRepo.put<StockItem[]>("/stock", items, token);
  },
};

export const stopListRepository = {
  async loadLocal(): Promise<StopListItem[] | null> {
    return localRepo.getJson<StopListItem[]>(STOPLIST_KEY);
  },
  async saveLocal(items: StopListItem[]) {
    await localRepo.setJson(STOPLIST_KEY, items);
  },
  async fetchRemote(token: string) {
    return httpRepo.get<StopListItem[]>("/stop-list", token);
  },
  async pushRemote(token: string, items: StopListItem[]) {
    return httpRepo.put<StopListItem[]>("/stop-list", items, token);
  },
};

export const writeOffsRepository = {
  async loadLocal(): Promise<WriteOff[] | null> {
    return localRepo.getJson<WriteOff[]>(WRITEOFFS_KEY);
  },
  async saveLocal(items: WriteOff[]) {
    await localRepo.setJson(WRITEOFFS_KEY, items);
  },
  async fetchRemote(token: string) {
    return httpRepo.get<WriteOff[]>("/write-offs", token);
  },
  async pushRemote(token: string, items: WriteOff[]) {
    return httpRepo.put<WriteOff[]>("/write-offs", items, token);
  },
};

export const checklistsRepository = {
  async loadLocal(): Promise<Checklist[] | null> {
    return localRepo.getJson<Checklist[]>(CHECKLISTS_KEY);
  },
  async saveLocal(items: Checklist[]) {
    await localRepo.setJson(CHECKLISTS_KEY, items);
  },
  async fetchRemote(token: string) {
    return httpRepo.get<Checklist[]>("/checklists", token);
  },
  async pushRemote(token: string, items: Checklist[]) {
    return httpRepo.put<Checklist[]>("/checklists", items, token);
  },
};
