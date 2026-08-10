import { eq } from "drizzle-orm";

import { db } from "../db";
import { stopList } from "../db/schema";
import { mapStop, type StopDto } from "./mappers";

export const stopListRepo = {
  listByVenue(venueId: string): StopDto[] {
    return db.select().from(stopList).where(eq(stopList.venueId, venueId)).all().map(mapStop);
  },

  replaceAll(
    venueId: string,
    items: Array<{ id: string; name: string; reason?: string | null; addedAt: string }>
  ): StopDto[] {
    db.delete(stopList).where(eq(stopList.venueId, venueId)).run();
    for (const item of items) {
      db.insert(stopList)
        .values({
          id: item.id,
          venueId,
          name: item.name,
          reason: item.reason ?? null,
          addedAt: item.addedAt,
        })
        .run();
    }
    return this.listByVenue(venueId);
  },

  add(
    venueId: string,
    item: { id: string; name: string; reason?: string | null; addedAt: string }
  ): StopDto {
    db.insert(stopList)
      .values({
        id: item.id,
        venueId,
        name: item.name,
        reason: item.reason ?? null,
        addedAt: item.addedAt,
      })
      .run();
    const row = db.select().from(stopList).where(eq(stopList.id, item.id)).get()!;
    return mapStop(row);
  },
};
