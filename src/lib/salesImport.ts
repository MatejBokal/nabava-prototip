import * as XLSX from 'xlsx';
import { normalizeText } from '@/lib/utils';

export interface SalesRow {
  name: string;
  qty: number;
}

export interface Recipe {
  salesName: string;
  article: string;
  factor: number;
  unit: string;
}

export interface Packaging {
  article: string;
  packageSize: number;
  unit: string;
}

/** Parses "304,00" / "1.234,5" / 12 into a number; NaN when not a number. */
export function parseSiNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  if (v == null) return NaN;
  const s = String(v).trim().replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  return s === '' ? NaN : Number(s);
}

/**
 * Reads the weekly sales export (.xls): product name in column B, quantity in column L.
 * Skips headers, section titles and empty rows.
 */
export async function parseSalesFile(file: File): Promise<SalesRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null });

  const out: SalesRow[] = [];
  for (const row of rows) {
    const name = row[1];
    const qty = parseSiNumber(row[11]);
    if (typeof name === 'string' && name.trim() && !isNaN(qty) && qty !== 0) {
      const n = name.trim();
      if (n === 'Naziv') continue;
      out.push({ name: n, qty });
    }
  }
  return out;
}

const key = (s: string) => normalizeText(s).replace(/\s+/g, ' ').trim();

export interface ImportResult {
  /** articleName (from sheet, matched to app article name) → totals */
  lines: {
    articleName: string;
    consumption: number;
    consumptionUnit: string;
    packages: number;
    packageUnit: string;
  }[];
  /** sales names present in the file but missing from the Recepture sheet */
  unknown: { name: string; qty: number }[];
}

export function computeImport(sales: SalesRow[], recipes: Recipe[], packagings: Packaging[]): ImportResult {
  const recipeByName = new Map<string, Recipe[]>();
  for (const r of recipes) {
    const k = key(r.salesName);
    recipeByName.set(k, [...(recipeByName.get(k) ?? []), r]);
  }
  const pkgByArticle = new Map(packagings.map(p => [key(p.article), p]));

  const consumption = new Map<string, { qty: number; unit: string }>();
  const unknown: { name: string; qty: number }[] = [];

  for (const row of sales) {
    const matched = recipeByName.get(key(row.name));
    if (!matched) {
      unknown.push(row);
      continue;
    }
    for (const r of matched) {
      const k = key(r.article);
      const prev = consumption.get(k) ?? { qty: 0, unit: r.unit };
      prev.qty += row.qty * r.factor;
      if (r.unit) prev.unit = r.unit;
      consumption.set(k, prev);
    }
  }

  const lines = Array.from(consumption.entries()).map(([articleKey, c]) => {
    const pkg = pkgByArticle.get(articleKey);
    const pkgSize = pkg && pkg.packageSize > 0 ? pkg.packageSize : 1;
    const packages = Math.ceil((c.qty - 1e-9) / pkgSize);
    // display name: use the sheet spelling of the article
    const articleName =
      recipes.find(r => key(r.article) === articleKey)?.article ??
      packagings.find(p => key(p.article) === articleKey)?.article ??
      articleKey;
    return {
      articleName,
      consumption: Math.round(c.qty * 1000) / 1000,
      consumptionUnit: c.unit,
      packages,
      packageUnit: pkg?.unit || c.unit,
    };
  }).filter(l => l.packages > 0);

  return { lines, unknown };
}
