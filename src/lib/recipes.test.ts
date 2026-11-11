import { describe, it, expect } from 'vitest';
import { computeRecipeDemand, finalOrderQty } from './recipes';

describe('recipes', () => {
  const recipes = [
    { id: '1', parentArticleId: 'omaka', ingredientArticleId: 'majoneza', quantity: 1 },
    { id: '2', parentArticleId: 'solata', ingredientArticleId: 'zelje', quantity: 0.3 },
    { id: '3', parentArticleId: 'solata2', ingredientArticleId: 'zelje', quantity: 0.2 },
  ];
  it('multiplies parent qty and sums across recipes', () => {
    const qty: Record<string, number> = { omaka: 5, solata: 2, solata2: 1 };
    const d = computeRecipeDemand(recipes, id => qty[id] ?? 0);
    expect(d.get('majoneza')!.total).toBe(5);
    expect(d.get('zelje')!.total).toBe(0.8);
  });
  it('final qty is manual + demand', () => {
    expect(finalOrderQty(2, 5, false)).toBe(7);
  });
  it('excluded demand counts only manual entry', () => {
    expect(finalOrderQty(2, 5, true)).toBe(2);
    expect(finalOrderQty(null, 5, true)).toBe(0);
  });
});
