export function calcBeverageCostPercent(
  purchasePrice: number,
  portionsPerUnit: number,
  sellingPrice: number
): number {
  if (portionsPerUnit <= 0 || sellingPrice <= 0) return 0;
  return (purchasePrice / portionsPerUnit / sellingPrice) * 100;
}

export interface BeverageCostItem {
  name: string;
  category?: string;
  purchasePrice: number;
  portionsPerUnit: number;
  sellingPrice: number;
  costPerPortion: number;
  costPercent: number;
  profitMarginPercent: number;
}

export interface BeverageCostSummary {
  averageCostPercent: number | null;
  averageProfitMarginPercent: number | null;
  itemsWithPricing: number;
  itemsMissingPricing: number;
  items: BeverageCostItem[];
}

export function summarizeBeverageCost(
  stock: Array<{
    name: string;
    category?: string;
    purchasePrice?: number | null;
    portionsPerUnit?: number | null;
    sellingPrice?: number | null;
  }>
): BeverageCostSummary {
  const items: BeverageCostItem[] = [];

  for (const s of stock) {
    if (
      s.purchasePrice == null ||
      s.portionsPerUnit == null ||
      s.sellingPrice == null ||
      s.portionsPerUnit <= 0 ||
      s.sellingPrice <= 0
    ) {
      continue;
    }
    const costPerPortion = s.purchasePrice / s.portionsPerUnit;
    const costPercent = calcBeverageCostPercent(
      s.purchasePrice,
      s.portionsPerUnit,
      s.sellingPrice
    );
    items.push({
      name: s.name,
      category: s.category,
      purchasePrice: s.purchasePrice,
      portionsPerUnit: s.portionsPerUnit,
      sellingPrice: s.sellingPrice,
      costPerPortion: Math.round(costPerPortion * 100) / 100,
      costPercent: Math.round(costPercent * 10) / 10,
      profitMarginPercent: Math.round((100 - costPercent) * 10) / 10,
    });
  }

  const averageCostPercent =
    items.length > 0
      ? Math.round((items.reduce((sum, i) => sum + i.costPercent, 0) / items.length) * 10) / 10
      : null;
  const averageProfitMarginPercent =
    averageCostPercent != null ? Math.round((100 - averageCostPercent) * 10) / 10 : null;

  const priced = items.length;
  return {
    averageCostPercent,
    averageProfitMarginPercent,
    itemsWithPricing: priced,
    itemsMissingPricing: stock.length - priced,
    items,
  };
}

/** Revenue needed to reach a profit target given average profit margin % on sales. */
export function revenueForProfitTarget(profitTarget: number, profitMarginPercent: number): number | null {
  if (profitMarginPercent <= 0) return null;
  return Math.round((profitTarget / (profitMarginPercent / 100)) * 100) / 100;
}
