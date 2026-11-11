import { useState } from 'react';
import { useSuppliers, useArticles, useOrders, useEmailTemplates, useStorageTypes } from '@/hooks/useNabavni';
import { flushAllPending } from '@/hooks/useDebouncedUpdate';
import { useMemo } from 'react';
import { useRecipes, RecipeDemandContext } from '@/hooks/useRecipes';
import { computeRecipeDemand, finalOrderQty, fmtQty } from '@/lib/recipes';

import { useCategories } from '@/hooks/useCategories';
import { OrderList } from '@/components/OrderList';
import { SettingsView } from '@/components/SettingsView';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, ShoppingCart, Plus, X, Check } from 'lucide-react';
import { Category } from '@/types/nabavni';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

function CategoryOrderList({ category }: { category: Category }) {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier, reorderSuppliers } = useSuppliers(category);
  const { articles, addArticle, updateArticle, deleteArticle, reorderArticles, reorderArticlesByStorage } = useArticles(category);
  const { storageTypes, addStorageType, deleteStorageType, reorderStorageTypes } = useStorageTypes(category);
  const { orders, getOrder, hasOrderEntry, getOrderLatest, hasOrderEntryLatest, updateOrder, clearOrders, flushOrderWrites } = useOrders();
  const { getTemplate } = useEmailTemplates();
  const [sentSuppliers, setSentSuppliers] = useState<Set<string>>(new Set());
  const { recipes, exclusions, articles: allArticles, toggleExclusion, clearExclusions } = useRecipes();
  const demand = useMemo(() => {
    const q = new Map(orders.map(o => [o.articleId, o.manualOrderQty ?? 0]));
    return computeRecipeDemand(recipes, id => q.get(id) ?? 0);
  }, [orders, recipes]);
  const ctx = useMemo(() => ({
    demand, exclusions, toggleExclusion,
    articleName: (id: string) => allArticles.find(a => a.id === id)?.name ?? '',
  }), [demand, exclusions, toggleExclusion, allArticles]);

  const handleSend = async (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) return;

    // Save anything still being typed, then wait for the database
    flushAllPending();
    await flushOrderWrites();

    const supplierArticles = articles.filter(a => a.supplierId === supplierId);
    const orderLines: string[] = [];

    supplierArticles.forEach(article => {
      const d = demand.get(article.id)?.total ?? 0;
      if (!hasOrderEntryLatest(article.id) && d <= 0) return;
      const order = getOrderLatest(article.id);
      const qty = finalOrderQty(order.manualOrderQty, d, exclusions.has(article.id));

      if (qty > 0) {
        const name = article.supplierArticleName || article.name;
        orderLines.push(`- ${name}: ${fmtQty(qty)} ${article.unit}`);
      }
    });

    if (orderLines.length === 0) return;


    const template = getTemplate(supplierId);
    const datum = new Date().toLocaleDateString('sl-SI');
    const artikliText = orderLines.join('\n');

    if (supplier.contactMethod === 'sms' && supplier.phone) {
      const body = template.bodyTemplate.replace('{datum}', datum).replace('{artikli}', artikliText);
      window.location.href = `sms:${supplier.phone}?body=${encodeURIComponent(body)}`;
    } else if (supplier.email) {
      const subject = encodeURIComponent(template.subjectTemplate.replace('{datum}', datum));
      const body = encodeURIComponent(template.bodyTemplate.replace('{datum}', datum).replace('{artikli}', artikliText));
      window.location.href = `mailto:${supplier.email}?subject=${subject}&body=${body}`;
    }
  };

  const handleClearOrders = () => {
    clearOrders();
    clearExclusions();
    setSentSuppliers(new Set());
  };

  return (
    <RecipeDemandContext.Provider value={ctx}>
    <OrderList
      articles={articles}
      suppliers={suppliers}
      storageTypes={storageTypes}
      addStorageType={addStorageType}
      deleteStorageType={deleteStorageType}
      reorderStorageTypes={reorderStorageTypes}
      getOrder={getOrder}
      hasOrderEntry={hasOrderEntry}
      updateOrder={updateOrder}
      updateArticle={updateArticle}
      addArticle={(a) => addArticle({ ...a, category })}
      deleteArticle={deleteArticle}
      reorderArticles={reorderArticles}
      reorderArticlesByStorage={reorderArticlesByStorage}
      category={category}
      addSupplier={(s) => addSupplier({ ...s, category })}
      updateSupplier={updateSupplier}
      deleteSupplier={deleteSupplier}
      reorderSuppliers={reorderSuppliers}
      onSendEmail={handleSend}
      onClearOrders={handleClearOrders}
      sentSuppliers={sentSuppliers}
      onMarkSent={(id) => setSentSuppliers(prev => new Set(prev).add(id))}
    />
    </RecipeDemandContext.Provider>
  );
}

const Index = () => {
  const [view, setView] = useState<'order' | 'settings'>('order');
  const { categories, addCategory, removeCategory } = useCategories();
  const [activeCategory, setActiveCategory] = useState<Category>(categories[0]?.value ?? 'hrana');
  const { suppliers: allSuppliers } = useSuppliers(activeCategory);
  const { getTemplate, upsertTemplate, deleteTemplate } = useEmailTemplates();
  const [editingCategories, setEditingCategories] = useState(false);
  const [newCategoryLabel, setNewCategoryLabel] = useState('');
  const [pendingRemove, setPendingRemove] = useState<Category | null>(null);

  // Ensure active category always valid
  if (!categories.some(c => c.value === activeCategory) && categories.length > 0) {
    setActiveCategory(categories[0].value);
  }

  if (view === 'settings') {
    return (
      <div className="max-w-lg mx-auto min-h-screen bg-background">
        <SettingsView
          suppliers={allSuppliers}
          getTemplate={getTemplate}
          upsertTemplate={upsertTemplate}
          deleteTemplate={deleteTemplate}
          onBack={() => setView('order')}
        />
      </div>
    );
  }

  const handleAddCategory = () => {
    const val = addCategory(newCategoryLabel);
    if (val) {
      setActiveCategory(val);
      setNewCategoryLabel('');
    }
  };

  const pendingRemoveLabel = categories.find(c => c.value === pendingRemove)?.label ?? '';

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-background">
      {/* Non-sticky title — scrolls away */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-2">
        <ShoppingCart className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-bold">Nabavni list</h1>
      </div>

      <CategoryOrderList key={activeCategory} category={activeCategory} />

      {/* Floating bottom bar: categories + add/remove + templates icon */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-30 bg-background/95 backdrop-blur-sm border-t border-border">
        <div className="px-3 py-2 flex items-center gap-2">
          <div className="flex-1 overflow-x-auto">
            <div className="flex gap-1 min-w-max items-center">
              {categories.map(cat => (
                <div key={cat.value} className="relative">
                  <button
                    onClick={() => setActiveCategory(cat.value)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      activeCategory === cat.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    } ${editingCategories ? 'pr-6' : ''}`}
                  >
                    {cat.label}
                  </button>
                  {editingCategories && categories.length > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setPendingRemove(cat.value); }}
                      className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center hover:scale-110 transition-transform"
                      title="Odstrani področje"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              ))}
              {editingCategories && (
                <div className="flex items-center gap-1 ml-1">
                  <Input
                    autoFocus
                    value={newCategoryLabel}
                    onChange={(e) => setNewCategoryLabel(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); }}
                    placeholder="Novo področje"
                    className="h-8 w-32 text-sm"
                  />
                  <Button size="icon" className="h-8 w-8 shrink-0" onClick={handleAddCategory} disabled={!newCategoryLabel.trim()}>
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
          <Button
            variant={editingCategories ? 'default' : 'ghost'}
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => { setEditingCategories(v => !v); setNewCategoryLabel(''); }}
            title={editingCategories ? 'Končaj urejanje' : 'Uredi področja'}
          >
            {editingCategories ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setView('settings')} title="Nastavitve">
            <FileText className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <AlertDialog open={pendingRemove !== null} onOpenChange={(o) => { if (!o) setPendingRemove(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Odstrani področje "{pendingRemoveLabel}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Področje bo skrito iz seznama. Podatki (dobavitelji in artikli) v bazi ostanejo nedotaknjeni.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Prekliči</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingRemove) {
                  removeCategory(pendingRemove);
                  if (activeCategory === pendingRemove) {
                    const next = categories.find(c => c.value !== pendingRemove);
                    if (next) setActiveCategory(next.value);
                  }
                  setPendingRemove(null);
                }
              }}
            >
              Odstrani
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
