import { useRef, useState } from 'react';
import { Article, OrderEntry } from '@/types/nabavni';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { normalizeText } from '@/lib/utils';
import { parseSalesFile, computeImport, ImportResult, SalesRow } from '@/lib/salesImport';
import { FileUp, Loader2, AlertTriangle } from 'lucide-react';

const SHEET_ID_KEY = 'nabavni-recipes-sheet-id';

export function getRecipesSheetId(): string {
  return localStorage.getItem(SHEET_ID_KEY) ?? '';
}
export function setRecipesSheetId(v: string) {
  localStorage.setItem(SHEET_ID_KEY, extractSheetId(v));
}
export function extractSheetId(input: string): string {
  const m = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : input.trim();
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  articles: Article[];
  updateOrder: (articleId: string, updates: Partial<OrderEntry>) => void;
}

export function ImportSalesDialog({ open, onOpenChange, articles, updateOrder }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [sheetIdInput, setSheetIdInput] = useState(getRecipesSheetId());
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [sales, setSales] = useState<SalesRow[] | null>(null);
  const [unmatchedArticles, setUnmatchedArticles] = useState<string[]>([]);

  const sheetKey = (s: string) => normalizeText(s).replace(/\s+/g, ' ').trim();

  const matchedLines = () => {
    if (!result) return [];
    return result.lines.map(l => ({
      ...l,
      article: articles.find(a => sheetKey(a.name) === sheetKey(l.articleName)) ?? null,
    }));
  };

  const handleFile = async (file: File) => {
    const sheetId = extractSheetId(sheetIdInput);
    if (!sheetId) {
      toast({ title: 'Manjka preglednica', description: 'Najprej prilepi povezavo do Google preglednice z recepturami.', variant: 'destructive' });
      return;
    }
    setRecipesSheetId(sheetId);
    setLoading(true);
    setResult(null);
    try {
      const parsed = await parseSalesFile(file);
      setSales(parsed);

      const { data, error } = await supabase.functions.invoke('read-recipes', { body: { spreadsheetId: sheetId } });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const res = computeImport(parsed, data.recipes ?? [], data.packagings ?? []);
      setResult(res);

      const missing = res.lines
        .filter(l => !articles.some(a => sheetKey(a.name) === sheetKey(l.articleName)))
        .map(l => l.articleName);
      setUnmatchedArticles(missing);
    } catch (e) {
      console.error(e);
      toast({ title: 'Uvoz ni uspel', description: String((e as Error).message ?? e), variant: 'destructive' });
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const apply = async () => {
    const lines = matchedLines().filter(l => l.article);
    for (const l of lines) {
      await updateOrder(l.article!.id, { manualOrderQty: l.packages });
    }
    toast({ title: 'Nabava izpolnjena', description: `Izpolnjenih ${lines.length} artiklov iz prodaje.` });
    onOpenChange(false);
    setResult(null);
    setSales(null);
  };

  const lines = matchedLines();
  const matchedCount = lines.filter(l => l.article).length;

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setResult(null); setSales(null); } }}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Uvozi prodajo</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Google preglednica z recepturami (povezava ali ID)</label>
            <Input
              value={sheetIdInput}
              onChange={e => { setSheetIdInput(e.target.value); setRecipesSheetId(e.target.value); }}
              placeholder="https://docs.google.com/spreadsheets/d/…"
              className="mt-1 text-sm"
            />
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".xls,.xlsx"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          <Button onClick={() => fileRef.current?.click()} disabled={loading} className="w-full gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
            {loading ? 'Berem…' : 'Izberi tedenski izvoz (.xls)'}
          </Button>

          {result && (
            <div className="space-y-3 pt-1">
              <p className="text-xs text-muted-foreground">Prebranih {sales?.length ?? 0} prodajnih postavk.</p>

              {lines.length > 0 && (
                <div className="rounded-lg border border-border divide-y divide-border">
                  {lines.map(l => (
                    <div key={l.articleName} className="px-3 py-2 flex items-center justify-between gap-2 text-sm">
                      <span className={`truncate ${l.article ? '' : 'text-destructive'}`}>
                        {l.articleName}{!l.article && ' (ni v aplikaciji)'}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {l.consumption} {l.consumptionUnit} → <b className="text-foreground">{l.packages} {l.packageUnit}</b>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {unmatchedArticles.length > 0 && (
                <p className="text-xs text-destructive flex gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  Ti artikli iz preglednice ne obstajajo v aplikaciji: {unmatchedArticles.join(', ')}. Dodaj jih ali popravi ime v preglednici.
                </p>
              )}

              {result.unknown.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Neznani prodajni nazivi (dodaj jih v zavihek Recepture):
                  </p>
                  <div className="rounded-lg border border-dashed border-border max-h-32 overflow-y-auto">
                    {result.unknown.map(u => (
                      <div key={u.name} className="px-3 py-1 text-xs flex justify-between gap-2">
                        <span className="truncate">{u.name}</span>
                        <span className="text-muted-foreground shrink-0">{u.qty}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={apply} disabled={matchedCount === 0} className="w-full bg-green-600 hover:bg-green-700 text-white">
                Izpolni nabavo ({matchedCount} artiklov)
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
