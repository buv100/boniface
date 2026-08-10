import { eq } from "drizzle-orm";

import { db } from "../db";
import { checklists } from "../db/schema";
import { mapChecklist, type ChecklistDto } from "./mappers";

export const checklistsRepo = {
  listByVenue(venueId: string): ChecklistDto[] {
    return db.select().from(checklists).where(eq(checklists.venueId, venueId)).all().map(mapChecklist);
  },

  replaceAll(
    venueId: string,
    items: Array<{
      id: string;
      title: string;
      type: string;
      items: Array<{ id: string; text: string; done: boolean }>;
      createdAt: string;
    }>
  ): ChecklistDto[] {
    db.delete(checklists).where(eq(checklists.venueId, venueId)).run();
    for (const item of items) {
      db.insert(checklists)
        .values({
          id: item.id,
          venueId,
          title: item.title,
          type: item.type,
          items: JSON.stringify(item.items),
          createdAt: item.createdAt,
        })
        .run();
    }
    return this.listByVenue(venueId);
  },
};
