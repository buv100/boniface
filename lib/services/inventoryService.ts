import type { Checklist, StockItem, StopListItem, WriteOff } from "@/context/BonifaceContext";
import {
  checklistsRepository,
  stockRepository,
  stopListRepository,
  writeOffsRepository,
} from "@/lib/repositories/inventoryRepository";

/** Manager inventory domain — syncs via repositories (not raw apiCall in UI). */
export const inventoryService = {
  async hydrateFromCache() {
    const [stock, stop, writeOffs, checklists] = await Promise.all([
      stockRepository.loadLocal(),
      stopListRepository.loadLocal(),
      writeOffsRepository.loadLocal(),
      checklistsRepository.loadLocal(),
    ]);
    return { stock, stop, writeOffs, checklists };
  },

  async pullFromCloud(token: string) {
    const [stock, stop, writeOffs, checklists] = await Promise.all([
      stockRepository.fetchRemote(token).catch(() => null),
      stopListRepository.fetchRemote(token).catch(() => null),
      writeOffsRepository.fetchRemote(token).catch(() => null),
      checklistsRepository.fetchRemote(token).catch(() => null),
    ]);
    if (stock) await stockRepository.saveLocal(stock);
    if (stop) await stopListRepository.saveLocal(stop);
    if (writeOffs) await writeOffsRepository.saveLocal(writeOffs);
    if (checklists) await checklistsRepository.saveLocal(checklists);
    return { stock, stop, writeOffs, checklists };
  },

  async saveStock(token: string | null, items: StockItem[], push: boolean) {
    await stockRepository.saveLocal(items);
    if (token && push) {
      try {
        await stockRepository.pushRemote(token, items);
      } catch {
        /* offline */
      }
    }
  },

  async saveStopList(token: string | null, items: StopListItem[], push: boolean) {
    await stopListRepository.saveLocal(items);
    if (token && push) {
      try {
        await stopListRepository.pushRemote(token, items);
      } catch {
        /* offline */
      }
    }
  },

  async saveWriteOffs(token: string | null, items: WriteOff[], push: boolean) {
    await writeOffsRepository.saveLocal(items);
    if (token && push) {
      try {
        await writeOffsRepository.pushRemote(token, items);
      } catch {
        /* offline */
      }
    }
  },

  async saveChecklists(token: string | null, items: Checklist[], push: boolean) {
    await checklistsRepository.saveLocal(items);
    if (token && push) {
      try {
        await checklistsRepository.pushRemote(token, items);
      } catch {
        /* offline */
      }
    }
  },
};
