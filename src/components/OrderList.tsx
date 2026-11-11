import { useState, useRef, useLayoutEffect, useEffect, useMemo } from 'react';
import { Article, Supplier, OrderEntry, StorageType, StorageTypeEntry } from '@/types/nabavni';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, MessageSquare, Package, GripVertical, Plus, RotateCcw, Trash2, Pencil, X, Zap, FileUp, ChevronDown, ChevronUp, Check, Eye, EyeOff, ChevronLeft, ChevronRight, ArrowLeftRight } from 'lucide-react';
import { DebouncedInput } from '@/components/DebouncedInput';
import { StockCalcInput } from '@/components/StockCalcInput';
import { QuickEntry } from '@/components/QuickEntry';
import { ImportSalesDialog } from '@/components/ImportSalesDialog';
import { matchesQuery } from '@/lib/utils';
import { useRecipes, useRecipeDemand } from '@/hooks/useRecipes';
import { fmtQty } from '@/lib/recipes';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

function getStorageStyle(storageType: string, storageTypes: StorageTypeEntry[]): string {
  const st = storageTypes.find(t => t.name.toLowerCase() === storageType.toLowerCase());
  const hue = st?.colorHue ?? 200;
  return `border-l-4 border-l-[hsl(${hue}_70%_70%)] bg-[hsl(${hue}_80%_94%)]`;
}

function getStorageStyleInline(storageType: string, storageTypes: StorageTypeEntry[]) {
  const st = storageTypes.find(t => t.name.toLowerCase() === storageType.toLowerCase());
  const hue = st?.colorHue ?? 200;
  return {
    borderLeft: `4px solid hsl(${hue}, 70%, 70%)`,
    backgroundColor: `hsl(${hue}, 80%, 94%)`,
  };
}

interface OrderListProps {
  articles: Article[];
  suppliers: Supplier[];
  storageTypes: StorageTypeEntry[];
  addStorageType: (name: string, colorHue: number) => Promise<void>;
  getOrder: (articleId: string) => OrderEntry;
  hasOrderEntry: (articleId: string) => boolean;
  updateOrder: (articleId: string, updates: Partial<OrderEntry>) => void;
  updateArticle: (id: string, updates: Partial<Article>) => void;
  addArticle: (article: Omit<Article, 'id'>) => void;
  deleteArticle: (id: string) => void;
  reorderArticles: (orderedIds: string[]) => void;
  reorderArticlesByStorage: (orderedIds: string[]) => void;
  deleteStorageType: (id: string) => Promise<void>;
  reorderStorageTypes?: (ids: string[]) => Promise<void>;
  addSupplier: (s: Omit<Supplier, 'id'>) => void;
  updateSupplier: (id: string, updates: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  reorderSuppliers: (orderedIds: string[]) => void;
  onSendEmail: (supplierId: string) => void;
  onClearOrders: () => void;
  sentSuppliers: Set<string>;
  onMarkSent: (supplierId: string) => void;
  category: string;
}

/* ─── Recipe (sestavine) editor ─── */
function RecipeEditor({ article }: { article: Article }) {
  const { recipes, articles, addRecipe, updateRecipe, deleteRecipe } = useRecipes();
  const lines = recipes.filter(r => r.parentArticleId === article.id);
  const [query, setQuery] = useState('');
  const [pickId, setPickId] = useState('');
  const [qty, setQty] = useState('1');
  const byId = new Map(articles.map(a => [a.id, a]));
  const matches = query.trim()
    ? articles.filter(a => a.id !== article.id && matchesQuery(a.name, query)).slice(0, 6)
    : [];
  const picked = pickId ? byId.get(pickId) : undefined;
  const add = async () => {
    const n = Number(qty.replace(',', '.'));
    if (!pickId || !(n > 0)) return;
    await addRecipe(article.id, pickId, n);
    setPickId(''); setQuery(''); setQty('1');
  };
  return (
    <div className="space-y-1.5 rounded-md border border-border p-2">
      <label className="text-xs text-muted-foreground">Sestavine (na 1 {article.unit || 'enoto'})</label>
      {lines.map(r => {
        const ing = byId.get(r.ingredientArticleId);
        return (
          <div key={r.id} className="flex items-center gap-1.5">
            <span className="text-xs flex-1 min-w-0 truncate">{ing?.name ?? '?'}</span>
            <DebouncedInput
              type="text" inputMode="decimal"
              value={String(r.quantity).replace('.', ',')}
              onDebouncedChange={v => { const n = Number(v.replace(',', '.')); if (n > 0) updateRecipe(r.id, n); }}
              className="h-7 w-16 text-xs text-right px-1"
            />
            <span className="text-[11px] text-muted-foreground w-8 truncate">{ing?.unit}</span>
            <button type="button" onClick={() => deleteRecipe(r.id)} className="p-0.5 text-destructive/60 hover:text-destructive" aria-label="Odstrani sestavino">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
      {picked ? (
        <div className="flex items-center gap-1.5">
          <span className="text-xs flex-1 min-w-0 truncate font-medium">{picked.name}</span>
          <Input value={qty} onChange={e => setQty(e.target.value)} inputMode="decimal" className="h-7 w-16 text-xs text-right px-1" autoFocus
            onKeyDown={e => { if (e.key === 'Enter') add(); }} />
          <span className="text-[11px] text-muted-foreground w-8 truncate">{picked.unit}</span>
          <Button size="sm" className="h-7 px-2" onClick={add}><Check className="w-3.5 h-3.5" /></Button>
          <button type="button" onClick={() => setPickId('')} className="p-0.5 text-muted-foreground"><X className="w-3.5 h-3.5" /></button>
        </div>
      ) : (
        <div className="relative">
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="+ Dodaj sestavino (išči artikel)" className="h-8 text-xs" />
          {matches.length > 0 && (
            <div className="mt-1 rounded-md border border-border bg-popover">
              {matches.map(m => (
                <button key={m.id} type="button" onClick={() => setPickId(m.id)}
                  className="block w-full text-left px-2 py-1.5 text-xs hover:bg-accent">
                  {m.name} <span className="text-muted-foreground">({m.unit})</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Article edit/add dialog ─── */
function ArticleDialog({
  open,
  onOpenChange,
  article,
  suppliers,
  storageTypes,
  addStorageType,
  deleteStorageType,
  updateArticle,
  deleteArticle,
  addArticle,
  defaultSupplierId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article: Article | null;
  suppliers: Supplier[];
  storageTypes: StorageTypeEntry[];
  addStorageType: (name: string, colorHue: number) => Promise<void>;
  deleteStorageType: (id: string) => Promise<void>;
  updateArticle: (id: string, updates: Partial<Article>) => void;
  deleteArticle: (id: string) => void;
  addArticle: (a: Omit<Article, 'id'>) => void;
  defaultSupplierId: string;
}) {
  const [storageToDelete, setStorageToDelete] = useState<StorageTypeEntry | null>(null);
  const isNew = article === null;
  const [name, setName] = useState(article?.name || '');
  const [unit, setUnit] = useState(article?.unit || 'kos');
  const [targetStock, setTargetStock] = useState(article?.targetStock?.toString() || '');
  const [supplierId, setSupplierId] = useState(article?.supplierId || defaultSupplierId);
  const defaultStorage = storageTypes.length > 0 ? storageTypes[0].name.toLowerCase() : 'suho';
  const [storageType, setStorageType] = useState<StorageType>(article?.storageType || defaultStorage);
  const [newStorageName, setNewStorageName] = useState('');
  const [addingStorage, setAddingStorage] = useState(false);
  const [supplierArticleName, setSupplierArticleName] = useState(article?.supplierArticleName || '');
  const [note, setNote] = useState(article?.note || '');

  const handleSave = () => {
    if (!name.trim()) return;
    if (isNew) {
      addArticle({
        name: name.trim(), unit, targetStock: Number(targetStock) || 0,
        supplierId, supplierArticleName, note, storageType, sortOrder: 9999, storageSortOrder: 9999, category: 'hrana' as any,
      });
    } else {
      const storageChanged = (article.storageType || '').toLowerCase() !== (storageType || '').toLowerCase();
      updateArticle(article.id, {
        name: name.trim(), unit, targetStock: Number(targetStock) || 0,
        supplierId, supplierArticleName, note, storageType,
        // Moved to another storage -> place at the end of that storage block
        ...(storageChanged ? { storageSortOrder: 9999 } : {}),
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Nov artikel' : 'Uredi artikel'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ime artikla" className="h-9 text-sm" autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <Input value={unit} onChange={e => setUnit(e.target.value)} placeholder="Enota (kos, kg...)" className="h-9 text-sm" />
            <Input type="number" value={targetStock} onChange={e => setTargetStock(e.target.value)} placeholder="Ciljna zaloga" className="h-9 text-sm" />
          </div>
          <Select value={supplierId || '_none'} onValueChange={v => setSupplierId(v === '_none' ? '' : v)}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Dobavitelj" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Brez dobavitelja</SelectItem>
              {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Skladišče</label>
            <div className="flex flex-wrap gap-1.5">
              {storageTypes.map(st => (
                <div key={st.id} className="flex items-center gap-0.5 group">
                  <button
                    type="button"
                    onClick={() => setStorageType(st.name.toLowerCase())}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs border transition-colors ${
                      storageType === st.name.toLowerCase()
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: `hsl(${st.colorHue}, 70%, 60%)` }} />
                    {st.name}
                  </button>
                </div>
              ))}
            </div>
          </div>
          <Input value={supplierArticleName} onChange={e => setSupplierArticleName(e.target.value)} placeholder="Ime pri dobavitelju" className="h-9 text-sm" />
          <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Interna opomba" className="h-9 text-sm" />
          {!isNew && <RecipeEditor article={article} />}
          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex-1">{isNew ? 'Dodaj' : 'Shrani'}</Button>
            {!isNew && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="icon">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Izbriši artikel?</AlertDialogTitle>
                    <AlertDialogDescription>Ali res želite izbrisati artikel "{article.name}"? Tega dejanja ni mogoče razveljaviti.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Prekliči</AlertDialogCancel>
                    <AlertDialogAction onClick={() => { deleteArticle(article.id); onOpenChange(false); }}>Izbriši</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
        {/* Storage delete confirmation */}
        <AlertDialog open={!!storageToDelete} onOpenChange={open => { if (!open) setStorageToDelete(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Izbriši skladišče?</AlertDialogTitle>
              <AlertDialogDescription>Ali res želite izbrisati skladišče "{storageToDelete?.name}"? Tega dejanja ni mogoče razveljaviti.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Prekliči</AlertDialogCancel>
              <AlertDialogAction onClick={async () => {
                if (storageToDelete) {
                  await deleteStorageType(storageToDelete.id);
                  if (storageType === storageToDelete.name.toLowerCase()) {
                    const remaining = storageTypes.filter(st => st.id !== storageToDelete.id);
                    setStorageType(remaining.length > 0 ? remaining[0].name.toLowerCase() : 'suho');
                  }
                  setStorageToDelete(null);
                }
              }}>Izbriši</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Supplier edit dialog ─── */
function SupplierDialog({
  open, onOpenChange, supplier, updateSupplier, deleteSupplier,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier;
  updateSupplier: (id: string, updates: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
}) {
  const [name, setName] = useState(supplier.name);
  const [email, setEmail] = useState(supplier.email);
  const [phone, setPhone] = useState(supplier.phone);
  const [contactMethod, setContactMethod] = useState(supplier.contactMethod);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Uredi dobavitelja</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ime dobavitelja" className="h-9 text-sm" autoFocus />
          <div className="flex gap-2">
            <Button variant={contactMethod === 'email' ? 'default' : 'outline'} size="sm" className="flex-1 gap-1 text-xs" onClick={() => setContactMethod('email')}>
              <Mail className="w-3.5 h-3.5" /> Email
            </Button>
            <Button variant={contactMethod === 'sms' ? 'default' : 'outline'} size="sm" className="flex-1 gap-1 text-xs" onClick={() => setContactMethod('sms')}>
              <MessageSquare className="w-3.5 h-3.5" /> SMS
            </Button>
          </div>
          {contactMethod === 'email' ? (
            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" className="h-9 text-sm" />
          ) : (
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Telefonska številka" type="tel" className="h-9 text-sm" />
          )}
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => { updateSupplier(supplier.id, { name, email, phone, contactMethod }); onOpenChange(false); }}>
              Shrani
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Izbriši dobavitelja?</AlertDialogTitle>
                  <AlertDialogDescription>Ali res želite izbrisati dobavitelja "{supplier.name}"? Tega dejanja ni mogoče razveljaviti.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Prekliči</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { deleteSupplier(supplier.id); onOpenChange(false); }}>Izbriši</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Add supplier dialog ─── */
function AddSupplierDialog({
  open, onOpenChange, addSupplier, nextSortOrder,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  addSupplier: (s: Omit<Supplier, 'id'>) => void;
  nextSortOrder: number;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [contactMethod, setContactMethod] = useState<'email' | 'sms'>('email');

  const handleAdd = () => {
    if (!name.trim()) return;
    addSupplier({ name: name.trim(), email, phone, contactMethod, sortOrder: nextSortOrder, category: 'hrana' as any });
    setName(''); setEmail(''); setPhone('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Nov dobavitelj</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ime dobavitelja" className="h-9 text-sm" autoFocus />
          <div className="flex gap-2">
            <Button variant={contactMethod === 'email' ? 'default' : 'outline'} size="sm" className="flex-1 gap-1 text-xs" onClick={() => setContactMethod('email')}>
              <Mail className="w-3.5 h-3.5" /> Email
            </Button>
            <Button variant={contactMethod === 'sms' ? 'default' : 'outline'} size="sm" className="flex-1 gap-1 text-xs" onClick={() => setContactMethod('sms')}>
              <MessageSquare className="w-3.5 h-3.5" /> SMS
            </Button>
          </div>
          {contactMethod === 'email' ? (
            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" className="h-9 text-sm" />
          ) : (
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Telefonska številka" type="tel" className="h-9 text-sm" />
          )}
          <Button onClick={handleAdd} className="w-full">Dodaj dobavitelja</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Sortable article card ─── */
function SortableArticleCard({
  article, order, calcQty, isActive, hasEntry,
  updateOrder, onEdit, storageTypes, collapsed, supplierLabel,
  orderNumber, onOrderNumberChange,
}: {
  article: Article;
  order: OrderEntry;
  calcQty: number;
  isActive: boolean;
  hasEntry: boolean;
  storageTypes: StorageTypeEntry[];
  updateOrder: (articleId: string, updates: Partial<OrderEntry>) => void;
  onEdit: () => void;
  collapsed: boolean;
  supplierLabel?: string;
  orderNumber?: number;
  onOrderNumberChange?: (num: number) => void;
}) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: article.id });
  const rd = useRecipeDemand();
  const recipeDemand = rd.demand.get(article.id);
  const recipeExcluded = rd.exclusions.has(article.id);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const isCollapsed = collapsed || isDragging;

  const [numDraft, setNumDraft] = useState<string>(orderNumber !== undefined ? String(orderNumber) : '');
  useEffect(() => {
    setNumDraft(orderNumber !== undefined ? String(orderNumber) : '');
  }, [orderNumber]);

  const commitNumber = () => {
    if (!onOrderNumberChange) return;
    const n = parseInt(numDraft, 10);
    if (Number.isNaN(n)) {
      setNumDraft(orderNumber !== undefined ? String(orderNumber) : '');
      return;
    }
    onOrderNumberChange(n);
  };

  return (
    <div ref={setNodeRef} style={{ ...style, ...getStorageStyleInline(article.storageType, storageTypes) }}
      className={`rounded-lg px-3 py-2 transition-colors ${isActive && !isCollapsed ? 'ring-2 ring-primary/30' : ''}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-0.5 min-w-0 flex-1">
          {orderNumber !== undefined && !isCollapsed && (
            <input
              type="number"
              inputMode="numeric"
              value={numDraft}
              onChange={e => setNumDraft(e.target.value)}
              onBlur={commitNumber}
              onKeyDown={e => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
              aria-label="Zaporedna številka"
              className="w-8 h-6 mr-1 shrink-0 rounded border border-border bg-background text-center text-[11px] font-semibold text-muted-foreground px-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          )}
          <button {...attributes} {...listeners}
            className="touch-none p-1 -ml-1 text-muted-foreground/50 hover:text-muted-foreground cursor-grab active:cursor-grabbing shrink-0"
            aria-label="Povleci za premik"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <button className="text-left hover:underline decoration-dashed underline-offset-2 cursor-pointer min-w-0 truncate" onClick={onEdit}>
            <span className="font-medium text-sm">{article.name}</span>
          </button>

          {!isCollapsed && (
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-muted-foreground text-xs">({article.unit})</span>
              {article.targetStock > 0 && (
                <span className="text-primary text-xs font-bold">/ {article.targetStock}</span>
              )}
            </div>
          )}
        </div>
        {!isCollapsed && (
          <div className="shrink-0 flex items-center gap-1">
            {article.targetStock > 0 && (
              <div className="w-14">
                <StockCalcInput
                  value={hasEntry && order.currentStock > 0 ? order.currentStock : null}
                  onCommit={v => {
                    if (v === null) updateOrder(article.id, { manualOrderQty: null });
                    else updateOrder(article.id, {
                      currentStock: v,
                      manualOrderQty: Math.max(0, Math.ceil(article.targetStock - v)),
                    });
                  }}
                />
              </div>
            )}
            <div className="w-16">
              <DebouncedInput
                type="number"
                inputMode="numeric"
                min={0}
                value={order.manualOrderQty !== null ? order.manualOrderQty : ''}
                onDebouncedChange={v => updateOrder(article.id, { manualOrderQty: v.trim() === '' ? null : Number(v) })}
                className="h-8 text-xs bg-background text-right px-1"
                placeholder="—"
                aria-label="Naroči"
                showClear
                enterMovesNext
              />
            </div>
          </div>
        )}
      </div>

      {!isCollapsed && recipeDemand && recipeDemand.total > 0 && (
        <div className="flex items-center gap-1.5 mt-1 pl-5">
          <span
            title={recipeDemand.sources.map(x => `${rd.articleName(x.parentArticleId)}: ${fmtQty(x.qty)}`).join(', ')}
            className={`text-[11px] rounded px-1.5 py-0.5 bg-primary/10 text-primary font-medium ${recipeExcluded ? 'line-through opacity-50' : ''}`}
          >
            Pripravljalnica: +{fmtQty(recipeDemand.total)} {article.unit}
          </span>
          <button
            type="button"
            onClick={() => rd.toggleExclusion(article.id)}
            className="text-[11px] text-muted-foreground underline"
          >
            {recipeExcluded ? 'Vključi' : 'Imamo na zalogi'}
          </button>
        </div>
      )}
      {!isCollapsed && supplierLabel && (
        <p className="text-[11px] text-muted-foreground/80 leading-snug pl-5">{supplierLabel}</p>
      )}
      {!isCollapsed && article.note && (
        <p className="text-xs text-muted-foreground italic leading-snug">{article.note}</p>
      )}
    </div>
  );
}

/* ─── Sortable supplier section ─── */
function SortableSupplierSection({
  id, supplier, supplierHasOrders, isSent, onSend, onEdit, children, collapsed,
  minimized, onToggleMinimized, summary,
}: {
  id: string;
  supplier: Supplier | undefined;
  supplierHasOrders: boolean;
  isSent: boolean;
  onSend: () => void;
  onEdit: () => void;
  children: React.ReactNode;
  collapsed: boolean;
  minimized: boolean;
  onToggleMinimized: () => void;
  summary: string;
}) {
  const sortable = useSortable({ id, disabled: !supplier });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.9 : 1,
    zIndex: isDragging ? 20 : undefined,
  };

  const isCollapsed = collapsed || isDragging;
  const stickyOn = !isCollapsed && !minimized;

  return (
    <div ref={setNodeRef} style={{ ...style, scrollMarginTop: 'calc(var(--hdr, 136px) + 8px)' }}>
      <div
        style={stickyOn ? { top: 'var(--hdr, 136px)' } : undefined}
        className={`${stickyOn ? 'sticky z-[5] mb-2' : ''} -mx-3 px-3 py-2 bg-background border-b border-border/60 flex items-center justify-between ${minimized ? 'opacity-70' : ''}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {supplier && (
            <button {...attributes} {...listeners}
              className="touch-none p-1 -ml-1 text-muted-foreground/50 hover:text-muted-foreground cursor-grab active:cursor-grabbing shrink-0"
              aria-label="Povleci dobavitelja"
            >
              <GripVertical className="w-4 h-4" />
            </button>
          )}
          <button onClick={supplier ? onEdit : undefined} className={`min-w-0 truncate ${supplier ? 'hover:underline decoration-dashed underline-offset-2 cursor-pointer' : ''}`}>
            <h2 className={`${minimized ? 'text-base' : 'text-lg'} font-bold text-primary tracking-tight truncate`}>
              {supplier?.name || 'Brez dobavitelja'}
            </h2>
          </button>
          {minimized && summary && <span className="text-xs text-muted-foreground shrink-0">{summary}</span>}
        </div>
        {!isCollapsed && (
          <div className="flex items-center gap-1 shrink-0">
            {!minimized && supplier && supplierHasOrders && (supplier.contactMethod === 'sms' ? supplier.phone : supplier.email) && (
              <Button size="sm" className={`gap-1.5 text-xs h-8 ${isSent ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' : 'bg-green-600 hover:bg-green-700 text-white'}`} onClick={onSend}>
                {supplier.contactMethod === 'sms' ? <MessageSquare className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
                {isSent ? 'Poslano' : 'Pošlji'}
              </Button>
            )}
            {minimized && isSent && <Check className="w-4 h-4 text-destructive" />}
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onToggleMinimized}
              aria-label={minimized ? 'Razširi dobavitelja' : 'Skrči dobavitelja'}>
              {minimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </Button>
          </div>
        )}
      </div>
      {!isCollapsed && !minimized && children}
    </div>
  );
}


/* ─── Main OrderList ─── */
export function OrderList({
  articles, suppliers, storageTypes, addStorageType, deleteStorageType, reorderStorageTypes = async () => {}, getOrder, hasOrderEntry, updateOrder, updateArticle,
  addArticle, deleteArticle, reorderArticles, reorderArticlesByStorage, category,
  addSupplier, updateSupplier, deleteSupplier, reorderSuppliers,
  onSendEmail, onClearOrders, sentSuppliers, onMarkSent,
}: OrderListProps) {
  const [filter, setFilter] = useState(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(`nabavni-search-${category}`) || '';
  });
  const [quickEntryOpen, setQuickEntryOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  useEffect(() => {
    try { localStorage.setItem(`nabavni-search-${category}`, filter); } catch { /* ignore */ }
  }, [filter, category]);
  const supplierRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [headerH, setHeaderH] = useState(136);
  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeaderH(el.getBoundingClientRect().height));
    ro.observe(el);
    setHeaderH(el.getBoundingClientRect().height);
    return () => ro.disconnect();
  }, []);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [addingArticleForSupplier, setAddingArticleForSupplier] = useState<string | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [addingSupplier, setAddingSupplier] = useState(false);
  const [isDraggingSupplier, setIsDraggingSupplier] = useState(false);
  const [draggingArticleGroup, setDraggingArticleGroup] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'supplier' | 'storage'>(() => {
    if (typeof window === 'undefined') return 'supplier';
    return localStorage.getItem(`nabavni-view-${category}`) === 'storage' ? 'storage' : 'supplier';
  });
  const [draggingStorageGroup, setDraggingStorageGroup] = useState<string | null>(null);

  const changeViewMode = (mode: 'supplier' | 'storage') => {
    setViewMode(mode);
    try { localStorage.setItem(`nabavni-view-${category}`, mode); } catch { /* ignore */ }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const getSupplierName = (id: string) => suppliers.find(s => s.id === id)?.name || '—';

  const supplierNameById = useMemo(() => {
    const m: Record<string, string> = {};
    suppliers.forEach(s => { m[s.id] = s.name; });
    return m;
  }, [suppliers]);

  const [hiddenStorages, setHiddenStorages] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(`nabavni-hidden-st-${category}`) || '[]')); } catch { return new Set(); }
  });
  const toggleStorageHidden = (id: string) => {
    setHiddenStorages(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem(`nabavni-hidden-st-${category}`, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  };
  const [storageOrderMode, setStorageOrderMode] = useState(false);
  const sortedStorageTypes = [...storageTypes].sort((a, b) => a.sortOrder - b.sortOrder);
  const moveStorage = (i: number, dir: number) => {
    const ids = sortedStorageTypes.map(t => t.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    reorderStorageTypes(ids);
  };
  const storageIdOf = (a: Article) =>
    storageTypes.find(t => t.name.toLowerCase() === (a.storageType || '').toLowerCase())?.id ?? '_other';

  const filteredArticles = useMemo(() => {
    const visible = articles.filter(a => !hiddenStorages.has(storageIdOf(a)));
    if (!filter.trim()) return visible;
    return visible.filter(a => matchesQuery(
      [a.name, a.supplierArticleName, a.note, supplierNameById[a.supplierId]].filter(Boolean).join(' '),
      filter,
    ));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articles, filter, supplierNameById, hiddenStorages, storageTypes]);

  const grouped = filteredArticles.reduce<Record<string, Article[]>>((acc, art) => {
    const key = art.supplierId || '_none';
    if (!acc[key]) acc[key] = [];
    acc[key].push(art);
    return acc;
  }, {});
  // Keep articles of the same storage together inside each supplier (storage order first, then manual order)
  {
    const rank = (a: Article) => {
      const st = storageTypes.find(t => t.name.toLowerCase() === (a.storageType || '').toLowerCase());
      return st ? st.sortOrder : Number.MAX_SAFE_INTEGER;
    };
    Object.values(grouped).forEach(list => {
      const idx = new Map(list.map((a, i) => [a.id, i]));
      list.sort((a, b) => rank(a) - rank(b) || (a.storageType || '').localeCompare(b.storageType || '') || idx.get(a.id)! - idx.get(b.id)!);
    });
  }

  const [minimizedSuppliers, setMinimizedSuppliers] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(`nabavni-min-${category}`) || '[]')); } catch { return new Set(); }
  });
  const setMinimized = (id: string, value: boolean) => {
    setMinimizedSuppliers(prev => {
      const next = new Set(prev);
      if (value) next.add(id); else next.delete(id);
      try { localStorage.setItem(`nabavni-min-${category}`, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  };
  const handleClearAll = () => {
    setMinimizedSuppliers(new Set());
    try { localStorage.removeItem(`nabavni-min-${category}`); } catch { /* ignore */ }
    onClearOrders();
  };

  // Order supplier keys by supplier sortOrder
  const sortedSuppliers = [...suppliers].sort((a, b) => a.sortOrder - b.sortOrder);
  const supplierKeys: string[] = [];
  for (const s of sortedSuppliers) {
    if (grouped[s.id]) supplierKeys.push(s.id);
  }
  if (grouped['_none']) supplierKeys.push('_none');
  // Add any supplier that has no articles but exists
  for (const s of sortedSuppliers) {
    if (!supplierKeys.includes(s.id)) supplierKeys.push(s.id);
  }

  /* ─── Storage view grouping ─── */
  const storageKeyOf = (a: Article) => {
    const st = storageTypes.find(t => t.name.toLowerCase() === (a.storageType || '').toLowerCase());
    return st ? st.id : '_other';
  };

  const sortByStorageOrder = (a: Article, b: Article) =>
    a.storageSortOrder - b.storageSortOrder || a.name.localeCompare(b.name);

  // Full (unfiltered) storage groups — source of truth for numbering & reordering
  const fullByStorage = articles.reduce<Record<string, Article[]>>((acc, art) => {
    const key = storageKeyOf(art);
    if (!acc[key]) acc[key] = [];
    acc[key].push(art);
    return acc;
  }, {});
  Object.values(fullByStorage).forEach(list => list.sort(sortByStorageOrder));

  const groupedByStorage = filteredArticles.reduce<Record<string, Article[]>>((acc, art) => {
    const key = storageKeyOf(art);
    if (!acc[key]) acc[key] = [];
    acc[key].push(art);
    return acc;
  }, {});
  Object.values(groupedByStorage).forEach(list => list.sort(sortByStorageOrder));

  const storageKeys: string[] = sortedStorageTypes.filter(t => groupedByStorage[t.id]).map(t => t.id);
  if (groupedByStorage['_other']) storageKeys.push('_other');

  const storageLabel = (key: string) =>
    key === '_other' ? 'Ostalo' : (storageTypes.find(t => t.id === key)?.name ?? 'Ostalo');

  const setStorageNumber = (storageKey: string, articleId: string, num: number) => {
    const full = fullByStorage[storageKey];
    if (!full) return;
    const ids = full.map(a => a.id);
    const oldIndex = ids.indexOf(articleId);
    if (oldIndex === -1) return;
    let newIndex = Math.round(num) - 1;
    if (Number.isNaN(newIndex)) return;
    newIndex = Math.max(0, Math.min(ids.length - 1, newIndex));
    if (newIndex === oldIndex) return;
    const newIds = [...ids];
    const [moved] = newIds.splice(oldIndex, 1);
    newIds.splice(newIndex, 0, moved);
    reorderArticlesByStorage(newIds);
  };

  const handleStorageDragEnd = (storageKey: string) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const arts = fullByStorage[storageKey];
    if (!arts) return;
    const ids = arts.map(a => a.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    const newIds = [...ids];
    const [moved] = newIds.splice(oldIndex, 1);
    newIds.splice(newIndex, 0, moved);
    reorderArticlesByStorage(newIds);
  };




  const getCalcOrderQty = (article: Article, order: OrderEntry) => {
    if (order.manualOrderQty !== null) return order.manualOrderQty;
    const diff = article.targetStock - order.currentStock;
    return diff > 0 ? diff : 0;
  };

  const rd = useRecipeDemand();
  const isArticleActive = (article: Article): boolean => hasOrderEntry(article.id);
  const hiddenOrderCount: Record<string, number> = {};
  articles.forEach(a => {
    const sid = storageIdOf(a);
    if (!hiddenStorages.has(sid)) return;
    const has = (!rd.exclusions.has(a.id) && (rd.demand.get(a.id)?.total ?? 0) > 0)
      || (isArticleActive(a) && getCalcOrderQty(a, getOrder(a.id)) > 0);
    if (has) hiddenOrderCount[sid] = (hiddenOrderCount[sid] || 0) + 1;
  });

  const supplierHasOrders = (supplierId: string) => {
    const arts = grouped[supplierId] || [];
    return arts.some(a => {
      if (!rd.exclusions.has(a.id) && (rd.demand.get(a.id)?.total ?? 0) > 0) return true;
      if (!isArticleActive(a)) return false;
      const order = getOrder(a.id);
      return getCalcOrderQty(a, order) > 0;
    });
  };

  const handleMoveWithinGroup = (supplierId: string, fromIndex: number, toIndex: number) => {
    const arts = grouped[supplierId];
    if (!arts || toIndex < 0 || toIndex >= arts.length) return;
    const newArts = [...arts];
    const [moved] = newArts.splice(fromIndex, 1);
    newArts.splice(toIndex, 0, moved);
    const allIds: string[] = [];
    for (const sid of supplierKeys) {
      if (sid === supplierId) {
        allIds.push(...newArts.map(a => a.id));
      } else if (grouped[sid]) {
        allIds.push(...grouped[sid].map(a => a.id));
      }
    }
    reorderArticles(allIds);
  };

  const handleArticleDragEnd = (supplierId: string) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const arts = grouped[supplierId];
    if (!arts) return;
    const oldIndex = arts.findIndex(a => a.id === active.id);
    const newIndex = arts.findIndex(a => a.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    handleMoveWithinGroup(supplierId, oldIndex, newIndex);
  };

  const handleSupplierDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = sortedSuppliers.map(s => s.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = [...ids];
    const [moved] = newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, moved);
    reorderSuppliers(newOrder);
  };

  const scrollToSupplier = (supplierId: string) => {
    supplierRefs.current[supplierId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Items for quick entry — follow the currently visible order
  const quickEntryItems = useMemo(() => {
    const list: { article: Article; storageLabel: string; supplierLabel: string }[] = [];
    const push = (a: Article) => list.push({
      article: a,
      storageLabel: a.storageType || 'Ostalo',
      supplierLabel: supplierNameById[a.supplierId] || 'Brez dobavitelja',
    });
    if (viewMode === 'storage') {
      storageKeys.forEach(key => (groupedByStorage[key] || []).forEach(push));
    } else {
      supplierKeys.forEach(sid => (grouped[sid] || []).forEach(push));
    }
    return list;
  }, [viewMode, storageKeys, groupedByStorage, supplierKeys, grouped, supplierNameById]);

  return (
    <div className="pb-28" style={{ '--hdr': `${headerH}px` } as React.CSSProperties}>
      {quickEntryOpen && (
        <QuickEntry
          items={quickEntryItems}
          storageTypes={storageTypes}
          getOrder={getOrder}
          updateOrder={updateOrder}
          onClose={() => setQuickEntryOpen(false)}
        />
      )}
      {/* Sticky header */}
      <div ref={headerRef} className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="px-3 pt-2 pb-1.5 flex gap-2">
          <div className="relative flex-1">
            <Input placeholder="Iskanje artiklov..." value={filter} onChange={e => setFilter(e.target.value)} className="bg-card pr-8" />
            {filter && (
              <button type="button" onClick={() => setFilter('')} aria-label="Počisti iskanje"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Button size="icon" variant="outline" className="shrink-0" title="Uvozi prodajo"
            onClick={() => setImportOpen(true)}>
            <FileUp className="w-4 h-4" />
          </Button>
          <Button size="icon" className="shrink-0" title="Hitri vnos"
            onClick={() => setQuickEntryOpen(true)} disabled={quickEntryItems.length === 0}>
            <Zap className="w-4 h-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon" className="shrink-0 bg-green-600 hover:bg-green-700 text-white" title="Nova nabava">
                <RotateCcw className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Nova nabava?</AlertDialogTitle>
                <AlertDialogDescription>Vsi vnosi zalog in ročnih naročil bodo pobrisani.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Prekliči</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearAll}>Počisti</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        {Object.keys(hiddenOrderCount).length > 0 && (
          <div className="px-3 pb-1.5 text-xs text-destructive flex items-center gap-1">
            <EyeOff className="w-3 h-3" /> Skrita skladišča imajo naročila: {sortedStorageTypes.filter(t => hiddenOrderCount[t.id]).map(t => `${t.name} (${hiddenOrderCount[t.id]})`).join(', ')}
          </div>
        )}
        {/* View toggle */}
        <div className="px-3 pb-1.5 flex gap-1">
          {(['supplier', 'storage'] as const).map(mode => (
            <button key={mode} onClick={() => changeViewMode(mode)}
              className={`flex-1 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                viewMode === mode ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {mode === 'supplier' ? 'Dobavitelji' : 'Skladišče'}
            </button>
          ))}
        </div>
        {/* Quick nav */}
        <div className="px-4 pb-2 overflow-x-auto">
          <div className="flex gap-1.5 min-w-max">
            {viewMode === 'supplier' ? (
              <>
                {supplierKeys.map(sid => {
                  const supplier = suppliers.find(s => s.id === sid);
                  return (
                    <button key={sid} onClick={() => scrollToSupplier(sid)}
                      className="px-3 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-colors whitespace-nowrap"
                    >
                      {supplier?.name || 'Brez dob.'}
                    </button>
                  );
                })}
                <button onClick={() => setAddingSupplier(true)}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors whitespace-nowrap flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Dobavitelj
                </button>
              </>
            ) : (
              storageKeys.map(key => (
                <button key={key} onClick={() => scrollToSupplier(`storage-${key}`)}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-colors whitespace-nowrap"
                >
                  {storageLabel(key)}
                </button>
              ))
            )}
          </div>
        </div>
      </div>


      {viewMode === 'storage' ? (
        <div className="px-3 space-y-6 mt-2">
          {storageKeys.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Ni artiklov.</p>
          )}
          {storageKeys.map(key => {
            const arts = groupedByStorage[key] || [];
            const collapsed = draggingStorageGroup === key;
            return (
              <div key={key} ref={el => { supplierRefs.current[`storage-${key}`] = el; }} style={{ scrollMarginTop: 'calc(var(--hdr, 136px) + 8px)' }}>
                <div style={{ top: 'var(--hdr, 136px)' }} className="sticky z-[5] -mx-3 px-3 py-2 bg-background border-b border-border/60 mb-2">
                  <h2 className="text-lg font-bold text-primary tracking-tight truncate">{storageLabel(key)}</h2>
                </div>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={() => setDraggingStorageGroup(key)}
                  onDragCancel={() => setDraggingStorageGroup(null)}
                  onDragEnd={(e) => { setDraggingStorageGroup(null); handleStorageDragEnd(key)(e); }}
                >
                  <SortableContext items={arts.map(a => a.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {arts.map(article => {
                        const order = getOrder(article.id);
                        const active = isArticleActive(article);
                        const calcQty = active ? getCalcOrderQty(article, order) : 0;
                        return (
                          <SortableArticleCard
                            key={article.id}
                            article={article}
                            order={order}
                            calcQty={calcQty}
                            isActive={active}
                            hasEntry={hasOrderEntry(article.id)}
                            storageTypes={storageTypes}
                            updateOrder={updateOrder}
                            onEdit={() => setEditingArticle(article)}
                            collapsed={collapsed}
                            supplierLabel={getSupplierName(article.supplierId)}
                            orderNumber={(fullByStorage[key] || []).findIndex(a => a.id === article.id) + 1}
                            onOrderNumberChange={(n) => setStorageNumber(key, article.id, n)}
                          />
                        );
                      })}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            );
          })}
        </div>
      ) : (
      <div className="px-3 space-y-6 mt-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={() => setIsDraggingSupplier(true)}
          onDragCancel={() => setIsDraggingSupplier(false)}
          onDragEnd={(e) => { setIsDraggingSupplier(false); handleSupplierDragEnd(e); }}
        >
          <SortableContext items={sortedSuppliers.map(s => s.id)} strategy={verticalListSortingStrategy}>
            {supplierKeys.map(supplierId => {
              const arts = grouped[supplierId] || [];
              const supplier = suppliers.find(s => s.id === supplierId);
              const articlesCollapsed = draggingArticleGroup === supplierId;

              return (
                <div key={supplierId} ref={el => { supplierRefs.current[supplierId] = el; }}>
                  <SortableSupplierSection
                    id={supplierId}
                    supplier={supplier}
                    supplierHasOrders={supplierHasOrders(supplierId)}
                    isSent={sentSuppliers.has(supplierId)}
                    onSend={() => { onSendEmail(supplierId); onMarkSent(supplierId); setMinimized(supplierId, true); }}
                    onEdit={() => supplier && setEditingSupplier(supplier)}
                    collapsed={isDraggingSupplier}
                    minimized={minimizedSuppliers.has(supplierId) && !filter.trim()}
                    onToggleMinimized={() => setMinimized(supplierId, !minimizedSuppliers.has(supplierId))}
                    summary={(() => {
                      const n = arts.filter(a => (hasOrderEntry(a.id) && (getOrder(a.id).manualOrderQty ?? 0) > 0) || (!rd.exclusions.has(a.id) && (rd.demand.get(a.id)?.total ?? 0) > 0)).length;
                      return n > 0 ? `${n} art.` : '';
                    })()}
                  >
                    {arts.length > 0 && (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={() => setDraggingArticleGroup(supplierId)}
                        onDragCancel={() => setDraggingArticleGroup(null)}
                        onDragEnd={(e) => { setDraggingArticleGroup(null); handleArticleDragEnd(supplierId)(e); }}
                      >
                        <SortableContext items={arts.map(a => a.id)} strategy={verticalListSortingStrategy}>
                          <div className="space-y-2">
                            {arts.map(article => {
                              const order = getOrder(article.id);
                              const active = isArticleActive(article);
                              const calcQty = active ? getCalcOrderQty(article, order) : 0;
                              return (
                                <SortableArticleCard
                                  key={article.id}
                                  article={article}
                                  order={order}
                                  calcQty={calcQty}
                                  isActive={active}
                                  hasEntry={hasOrderEntry(article.id)}
                                  storageTypes={storageTypes}
                                  updateOrder={updateOrder}
                                  onEdit={() => setEditingArticle(article)}
                                  collapsed={articlesCollapsed}
                                />
                              );
                            })}
                          </div>
                        </SortableContext>
                      </DndContext>
                    )}

                    <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground w-full mt-1"
                      onClick={() => setAddingArticleForSupplier(supplierId === '_none' ? '' : supplierId)}>
                      <Plus className="w-3.5 h-3.5" /> Dodaj artikel
                    </Button>
                  </SortableSupplierSection>
                </div>
              );
            })}
          </SortableContext>
        </DndContext>
      </div>
      )}

      {/* Dialogs */}
      {editingArticle && (
        <ArticleDialog
          open={!!editingArticle}
          onOpenChange={open => { if (!open) setEditingArticle(null); }}
          article={editingArticle}
          suppliers={suppliers}
          storageTypes={storageTypes}
          addStorageType={addStorageType}
          deleteStorageType={deleteStorageType}
          updateArticle={updateArticle}
          deleteArticle={deleteArticle}
          addArticle={addArticle}
          defaultSupplierId=""
        />
      )}
      {addingArticleForSupplier !== null && (
        <ArticleDialog
          open={true}
          onOpenChange={open => { if (!open) setAddingArticleForSupplier(null); }}
          article={null}
          suppliers={suppliers}
          storageTypes={storageTypes}
          addStorageType={addStorageType}
          deleteStorageType={deleteStorageType}
          updateArticle={updateArticle}
          deleteArticle={deleteArticle}
          addArticle={addArticle}
          defaultSupplierId={addingArticleForSupplier}
        />
      )}
      {editingSupplier && (
        <SupplierDialog
          open={!!editingSupplier}
          onOpenChange={open => { if (!open) setEditingSupplier(null); }}
          supplier={editingSupplier}
          updateSupplier={updateSupplier}
          deleteSupplier={deleteSupplier}
        />
      )}
      <AddSupplierDialog
        open={addingSupplier}
        onOpenChange={setAddingSupplier}
        addSupplier={addSupplier}
        nextSortOrder={suppliers.length}
      />
      <ImportSalesDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        articles={articles}
        updateOrder={updateOrder}
      />
    </div>
  );
}
