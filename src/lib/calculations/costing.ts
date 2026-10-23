/**
 * Weighted Average Costing utility for Inventory Control.
 *
 * Formula:
 * New Average Cost = ((Current Stock * Current Cost) + (Incoming Stock * Unit Cost)) / (Current Stock + Incoming Stock)
 *
 * If Current Stock <= 0, the new incoming unit cost becomes the base cost price.
 */
export function calculateWeightedAverageCost(
  currentStock: number,
  currentCost: number,
  incomingQuantity: number,
  incomingUnitCost: number
): {
  newStock: number;
  newAverageCost: number;
} {
  const stock = Math.max(0, currentStock);
  const qty = Math.max(0, incomingQuantity);
  const cost = Math.max(0, currentCost);
  const unitCost = Math.max(0, incomingUnitCost);

  const newStock = stock + qty;

  if (newStock === 0) {
    return {
      newStock: 0,
      newAverageCost: unitCost > 0 ? unitCost : cost,
    };
  }

  if (stock <= 0) {
    return {
      newStock: qty,
      newAverageCost: Number(unitCost.toFixed(2)),
    };
  }

  const currentValue = stock * cost;
  const incomingValue = qty * unitCost;
  const totalValue = currentValue + incomingValue;
  const newAverageCost = Number((totalValue / newStock).toFixed(2));

  return {
    newStock,
    newAverageCost,
  };
}
