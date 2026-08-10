import { eq } from "drizzle-orm";

import { db } from "../db";
import { writeOffs } from "../db/schema";
import { mapWriteOff, type WriteOffDto } from "./mappers";

export const writeOffsRepo = {
  listByVenue(venueId: string): WriteOffDto[] {
    return db.select().from(writeOffs).where(eq(writeOffs.venueId, venueId)).all().map(mapWriteOff);
  },

  replaceAll(
    venueId: string,
    items: Array<{
      id: string;
      date: string;
      itemId?: string | null;
      itemName: string;
      quantity: number;
      unit: string;
      reason: string;
      notes?: string | null;
    }>
  ): WriteOffDto[] {
    db.delete(writeOffs).where(eq(writeOffs.venueId, venueId)).run();
    for (const item of items) {
      db.insert(writeOffs)
        .values({
          id: item.id,
          venueId,
          date: item.date,
          itemId: item.itemId ?? null,
          itemName: item.itemName,
          quantity: item.quantity,
          unit: item.unit,
          reason: item.reason,
          notes: item.notes ?? null,
        })
        .run();
    }
    return this.listByVenue(venueId);
  },
};
