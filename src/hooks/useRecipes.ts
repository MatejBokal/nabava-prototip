import { createContext, useContext, useEffect, useSyncExternalStore } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RecipeLine, IngredientDemand } from '@/lib/recipes';

export interface ArticleLite { id: string; name: string; unit: string; supplierId: string }

interface State { recipes: RecipeLine[]; exclusions: Set<string>; articles: ArticleLite[] }
let state: State = { recipes: [], exclusions: new Set(), articles: [] };
const listeners = new Set<() => void>();
const set = (p: Partial<State>) => { state = { ...state, ...p }; listeners.forEach(l => l()); };
let started = false;
let users = 0;

async function fetchAll() {
  const [r, e, a] = await Promise.all([
    supabase.from('article_recipes').select('*').order('created_at'),
    supabase.from('recipe_exclusions').select('article_id'),
    supabase.from('articles').select('id,name,unit,supplier_id').order('name'),
  ]);
  set({
    recipes: (r.data ?? []).map(x => ({ id: x.id, parentArticleId: x.parent_article_id, ingredientArticleId: x.ingredient_article_id, quantity: Number(x.quantity) })),
    exclusions: new Set((e.data ?? []).map(x => x.article_id)),
    articles: (a.data ?? []).map(x => ({ id: x.id, name: x.name, unit: x.unit, supplierId: x.supplier_id || '' })),
  });
}

function start() {
  if (started) return;
  started = true;
  fetchAll();
  supabase
    .channel(`recipes-${Date.now()}-${Math.random()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'article_recipes' }, fetchAll)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'recipe_exclusions' }, fetchAll)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'articles' }, fetchAll)
    .subscribe();
}

export function useRecipes() {
  useEffect(() => { users++; start(); return () => { users--; }; }, []);
  const s = useSyncExternalStore(cb => { listeners.add(cb); return () => listeners.delete(cb); }, () => state);

  const addRecipe = async (parentArticleId: string, ingredientArticleId: string, quantity: number) => {
    await supabase.from('article_recipes').insert({ parent_article_id: parentArticleId, ingredient_article_id: ingredientArticleId, quantity });
    fetchAll();
  };
  const updateRecipe = async (id: string, quantity: number) => {
    set({ recipes: state.recipes.map(r => r.id === id ? { ...r, quantity } : r) });
    await supabase.from('article_recipes').update({ quantity }).eq('id', id);
  };
  const deleteRecipe = async (id: string) => {
    set({ recipes: state.recipes.filter(r => r.id !== id) });
    await supabase.from('article_recipes').delete().eq('id', id);
  };
  const toggleExclusion = async (articleId: string) => {
    const next = new Set(state.exclusions);
    if (next.has(articleId)) {
      next.delete(articleId); set({ exclusions: next });
      await supabase.from('recipe_exclusions').delete().eq('article_id', articleId);
    } else {
      next.add(articleId); set({ exclusions: next });
      await supabase.from('recipe_exclusions').upsert({ article_id: articleId });
    }
  };
  const clearExclusions = async () => {
    set({ exclusions: new Set() });
    await supabase.from('recipe_exclusions').delete().neq('article_id', '00000000-0000-0000-0000-000000000000');
  };

  return { ...s, addRecipe, updateRecipe, deleteRecipe, toggleExclusion, clearExclusions };
}

export interface RecipeDemandCtx {
  demand: Map<string, IngredientDemand>;
  exclusions: Set<string>;
  articleName: (id: string) => string;
  toggleExclusion: (articleId: string) => void;
}
export const RecipeDemandContext = createContext<RecipeDemandCtx>({
  demand: new Map(), exclusions: new Set(), articleName: () => '', toggleExclusion: () => {},
});
export const useRecipeDemand = () => useContext(RecipeDemandContext);
