export interface RecipeLine {
  id: string;
  parentArticleId: string;
  ingredientArticleId: string;
  quantity: number;
}

export interface DemandSource { parentArticleId: string; qty: number }
export interface IngredientDemand { total: number; sources: DemandSource[] }

/** Sum ingredient needs from ordered composite (Pripravljalnica) articles. */
export function computeRecipeDemand(
  recipes: RecipeLine[],
  getParentQty: (parentArticleId: string) => number,
): Map<string, IngredientDemand> {
  const out = new Map<string, IngredientDemand>();
  for (const r of recipes) {
    const pq = getParentQty(r.parentArticleId);
    if (!(pq > 0) || !(r.quantity > 0)) continue;
    const qty = round2(pq * r.quantity);
    const d = out.get(r.ingredientArticleId) ?? { total: 0, sources: [] };
    d.total = round2(d.total + qty);
    d.sources.push({ parentArticleId: r.parentArticleId, qty });
    out.set(r.ingredientArticleId, d);
  }
  return out;
}

/** Final order quantity = manual entry + recipe demand (unless excluded). */
export function finalOrderQty(manual: number | null, demand: number, excluded: boolean): number {
  return round2((manual ?? 0) + (excluded ? 0 : demand));
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function fmtQty(n: number) {
  return String(round2(n)).replace('.', ',');
}
