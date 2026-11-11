import { useEffect, useMemo, useRef, useState } from 'react';
import { Article, OrderEntry, StorageTypeEntry } from '@/types/nabavni';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, ArrowRight, ArrowLeft, Check } from 'lucide-react';

interface QuickEntryProps {
  /** Articles in the exact order they should be walked through */
  items: { article: Article; storageLabel: string; supplierLabel: string }[];
  storageTypes: StorageTypeEntry[];
  getOrder: (articleId: string) => OrderEntry;
  updateOrder: (articleId: string, updates: Partial<OrderEntry>) => void;
  onClose: () => void;
}

function hueOf(storageType: string, storageTypes: StorageTypeEntry[]) {
  const st = storageTypes.find(t => t.name.toLowerCase() === (storageType || '').toLowerCase());
  return st?.colorHue ?? 200;
}

export function QuickEntry({ items, storageTypes, getOrder, updateOrder, onClose }: QuickEntryProps) {
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const current = items[index];
  const done = index >= items.length;

  useEffect(() => {
    if (!current) return;
    const q = getOrder(current.article.id).manualOrderQty;
    setDraft(q !== null && q !== undefined ? String(q) : '');
    // focus after render
    const t = setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 30);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, current?.article.id]);

  const filledCount = useMemo(
    () => items.filter(i => getOrder(i.article.id).manualOrderQty !== null).length,
    [items, getOrder],
  );

  const commit = () => {
    if (!current) return;
    const trimmed = draft.trim();
    if (trimmed === '') {
      updateOrder(current.article.id, { manualOrderQty: null });
    } else {
      const n = Number(trimmed);
      if (!Number.isNaN(n)) updateOrder(current.article.id, { manualOrderQty: n });
    }
  };

  const next = () => { commit(); setIndex(i => i + 1); };
  const prev = () => { commit(); setIndex(i => Math.max(0, i - 1)); };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Hitri vnos</p>
          <p className="text-sm font-semibold truncate">
            {done ? 'Končano' : current?.storageLabel}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-muted-foreground tabular-nums">
            {Math.min(index + 1, items.length)} / {items.length}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { commit(); onClose(); }} aria-label="Zapri">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="h-1 bg-muted">
        <div className="h-full bg-primary transition-all"
          style={{ width: items.length ? `${(Math.min(index, items.length) / items.length) * 100}%` : '0%' }} />
      </div>

      {done || !current ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <Check className="w-10 h-10 text-green-600" />
          <p className="text-base font-semibold">Popis končan</p>
          <p className="text-sm text-muted-foreground">Vnesenih artiklov: {filledCount}</p>
          <div className="flex gap-2">
            {items.length > 0 && (
              <Button variant="outline" onClick={() => setIndex(items.length - 1)}>Nazaj na zadnjega</Button>
            )}
            <Button onClick={onClose}>Nazaj na seznam</Button>
          </div>
        </div>
      ) : (
        <div
          className="flex-1 flex flex-col items-center justify-center gap-5 px-6"
          style={{ backgroundColor: `hsl(${hueOf(current.article.storageType, storageTypes)}, 80%, 97%)` }}
        >
          <div className="text-center max-w-full">
            <h2 className="text-2xl font-bold leading-tight break-words">{current.article.name}</h2>
            <p className="text-xs text-muted-foreground mt-1">{current.supplierLabel}</p>
            {current.article.note && (
              <p className="text-sm italic text-muted-foreground mt-2">{current.article.note}</p>
            )}
          </div>

          <div className="flex items-end gap-2">
            <Input
              ref={inputRef}
              type="number"
              inputMode="numeric"
              min={0}
              value={draft}
              placeholder="—"
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); next(); } }}
              className="w-32 h-14 text-center text-2xl font-bold bg-background"
            />
            <span className="text-sm text-muted-foreground pb-4">{current.article.unit}</span>
            {current.article.targetStock > 0 && (
              <span className="text-sm text-primary font-bold pb-4">/ {current.article.targetStock}</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full max-w-xs">
            <Button variant="outline" className="flex-1 gap-1" onClick={prev} disabled={index === 0}>
              <ArrowLeft className="w-4 h-4" /> Nazaj
            </Button>
            <Button className="flex-1 gap-1" onClick={next}>
              Naprej <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
          <button className="text-xs text-muted-foreground underline" onClick={() => { setDraft(''); setIndex(i => i + 1); updateOrder(current.article.id, { manualOrderQty: null }); }}>
            Preskoči (ne naroči)
          </button>
        </div>
      )}
    </div>
  );
}
