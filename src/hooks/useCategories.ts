import { useEffect, useState, useCallback } from 'react';
import { Category } from '@/types/nabavni';

export interface CategoryDef {
  value: Category;
  label: string;
}

const STORAGE_KEY = 'nabavni:categories';

const DEFAULTS: CategoryDef[] = [
  { value: 'hrana', label: 'Hrana' },
  { value: 'pijaca', label: 'Pijača' },
  { value: 'embalaza', label: 'Embalaža' },
];

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[čć]/g, 'c')
    .replace(/š/g, 's')
    .replace(/ž/g, 'z')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `kat-${Date.now()}`;
}

function loadCategories(): CategoryDef[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULTS;
    return parsed.filter((c) => c && typeof c.value === 'string' && typeof c.label === 'string');
  } catch {
    return DEFAULTS;
  }
}

export function useCategories() {
  const [categories, setCategories] = useState<CategoryDef[]>(() => loadCategories());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
  }, [categories]);

  const addCategory = useCallback((label: string) => {
    const clean = label.trim();
    if (!clean) return null;
    const value = slugify(clean);
    let finalValue = value;
    setCategories((prev) => {
      if (prev.some((c) => c.value === value)) {
        finalValue = `${value}-${Date.now().toString(36)}`;
      }
      if (prev.some((c) => c.label.toLowerCase() === clean.toLowerCase())) return prev;
      return [...prev, { value: finalValue, label: clean }];
    });
    return finalValue;
  }, []);

  const removeCategory = useCallback((value: Category) => {
    setCategories((prev) => (prev.length <= 1 ? prev : prev.filter((c) => c.value !== value)));
  }, []);

  return { categories, addCategory, removeCategory };
}
