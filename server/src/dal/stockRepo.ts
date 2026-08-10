import { eq } from "drizzle-orm";

import { db } from "../db";
import { stockItems } from "../db/schema";
import { mapStock, mapStockLite, type StockDto } from "./mappers";

export const stockRepo = {
  listByVenue(venueId: string): StockDto[] {
    return db
      .select()
      .from(stockItems)
      .where(eq(stockItems.venueId, venueId))
      .all()
      .map(mapStock);
  },

  listLiteByVenue(venueId: string) {
    return db
      .select()
      .from(stockItems)
      .where(eq(stockItems.venueId, venueId))
      .all()
      .map(mapStockLite);
  },

  replaceAll(
    venueId: string,
    items: Array<{
      id: string;
      name: string;
      category: string;
      quantity: number;
      unit: string;
      minQuantity: number;
      purchasePrice?: number | null;
      portionsPerUnit?: number | null;
      sellingPrice?: number | null;
      expiryDate?: string | null;
      subCategory?: string | null;
    }>,
    updatedAt: string
  ): StockDto[] {
    db.delete(stockItems).where(eq(stockItems.venueId, venueId)).run();
    for (const item of items) {
      db.insert(stockItems)
        .values({
          id: item.id,
          venueId,
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          unit: item.unit,
          minQuantity: item.minQuantity,
          purchasePrice: item.purchasePrice ?? null,
          portionsPerUnit: item.portionsPerUnit ?? null,
          sellingPrice: item.sellingPrice ?? null,
          expiryDate: item.expiryDate ?? null,
          subCategory: item.subCategory ?? null,
          updatedAt,
        })
        .run();
    }
    return this.listByVenue(venueId);
  },
};
