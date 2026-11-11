import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Lowercase + strip diacritics (č→c, š→s, ž→z, ...) for accent-insensitive search. */
export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

/** True when every word in `query` appears somewhere in `haystack` (order-independent). */
export function matchesQuery(haystack: string, query: string): boolean {
  const q = normalizeText(query).trim();
  if (!q) return true;
  const target = normalizeText(haystack);
  return q.split(/\s+/).every(word => target.includes(word));
}
