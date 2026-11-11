import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Supplier, Article, OrderEntry, EmailTemplate, Category, StorageTypeEntry } from '@/types/nabavni';


export function useSuppliers(category: Category) {
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);

  const fetchSuppliers = useCallback(async () => {
    const { data } = await supabase.from('suppliers').select('*').order('sort_order' as any).order('created_at');
    if (data) setAllSuppliers(data.map(s => ({
      id: s.id, name: s.name, email: s.email,
      phone: s.phone, contactMethod: s.contact_method as 'email' | 'sms',
      sortOrder: (s as any).sort_order ?? 0,
      category: ((s as any).category as Category) || 'hrana',
    })));
  }, []);

  useEffect(() => {
    fetchSuppliers();
    const channelName = `suppliers-changes-${Date.now()}-${Math.random()}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suppliers' }, () => fetchSuppliers())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchSuppliers]);

  const suppliers = useMemo(() => allSuppliers.filter(s => s.category === category), [allSuppliers, category]);

  const addSupplier = async (supplier: Omit<Supplier, 'id'>) => {
    await supabase.from('suppliers').insert({
      name: supplier.name, email: supplier.email,
      phone: supplier.phone, contact_method: supplier.contactMethod,
      sort_order: supplier.sortOrder, category: supplier.category,
    } as any);
  };

  const updateSupplier = async (id: string, updates: Partial<Supplier>) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.contactMethod !== undefined) dbUpdates.contact_method = updates.contactMethod;
    if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
    await supabase.from('suppliers').update(dbUpdates as any).eq('id', id);
  };

  const deleteSupplier = async (id: string) => {
    await supabase.from('suppliers').delete().eq('id', id);
  };

  const reorderSuppliers = async (orderedIds: string[]) => {
    setAllSuppliers(prev => {
      const map = new Map(prev.map(s => [s.id, s]));
      const updated = orderedIds.map((id, i) => {
        const sup = map.get(id);
        return sup ? { ...sup, sortOrder: i } : null;
      }).filter(Boolean) as Supplier[];
      // Merge back non-category suppliers
      const otherSuppliers = prev.filter(s => !orderedIds.includes(s.id));
      return [...updated, ...otherSuppliers];
    });
    const updates = orderedIds.map((id, i) =>
      supabase.from('suppliers').update({ sort_order: i } as any).eq('id', id)
    );
    await Promise.all(updates);
  };

  return { suppliers, addSupplier, updateSupplier, deleteSupplier, reorderSuppliers };
}

export function useArticles(category: Category) {
  const [allArticles, setAllArticles] = useState<Article[]>([]);

  const fetchArticles = useCallback(async () => {
    const { data } = await supabase.from('articles').select('*').order('sort_order' as any).order('created_at');
    if (data) setAllArticles(data.map(a => ({
      id: a.id, name: a.name, unit: a.unit,
      targetStock: a.target_stock,
      supplierId: a.supplier_id || '',
      supplierArticleName: a.supplier_article_name,
      note: (a as any).note ?? '',
      storageType: ((a as any).storage_type as Article['storageType']) || 'suho',
      sortOrder: (a as any).sort_order ?? 0,
      storageSortOrder: (a as any).storage_sort_order ?? 0,
      category: ((a as any).category as Category) || 'hrana',
    })));
  }, []);

  useEffect(() => {
    fetchArticles();
    const channelName = `articles-changes-${Date.now()}-${Math.random()}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'articles' }, () => fetchArticles())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchArticles]);

  const articles = useMemo(() => allArticles.filter(a => a.category === category), [allArticles, category]);

  const addArticle = async (article: Omit<Article, 'id'>) => {
    await supabase.from('articles').insert({
      name: article.name, unit: article.unit,
      target_stock: article.targetStock,
      supplier_id: article.supplierId || null,
      supplier_article_name: article.supplierArticleName,
      note: article.note,
      storage_type: article.storageType,
      sort_order: article.sortOrder,
      category: article.category,
    } as any);
  };

  const updateArticle = async (id: string, updates: Partial<Article>) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.unit !== undefined) dbUpdates.unit = updates.unit;
    if (updates.targetStock !== undefined) dbUpdates.target_stock = updates.targetStock;
    if (updates.supplierId !== undefined) dbUpdates.supplier_id = updates.supplierId || null;
    if (updates.supplierArticleName !== undefined) dbUpdates.supplier_article_name = updates.supplierArticleName;
    if (updates.note !== undefined) dbUpdates.note = updates.note;
    if (updates.storageType !== undefined) dbUpdates.storage_type = updates.storageType;
    if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
    if (updates.storageSortOrder !== undefined) dbUpdates.storage_sort_order = updates.storageSortOrder;
    await supabase.from('articles').update(dbUpdates as any).eq('id', id);
  };

  const reorderArticles = async (orderedIds: string[]) => {
    setAllArticles(prev => {
      const map = new Map(prev.map(a => [a.id, a]));
      const updated = orderedIds.map((id, i) => {
        const art = map.get(id);
        return art ? { ...art, sortOrder: i } : null;
      }).filter(Boolean) as Article[];
      const otherArticles = prev.filter(a => !orderedIds.includes(a.id));
      return [...updated, ...otherArticles];
    });
    const updates = orderedIds.map((id, i) =>
      supabase.from('articles').update({ sort_order: i } as any).eq('id', id)
    );
    await Promise.all(updates);
  };

  const reorderArticlesByStorage = async (orderedIds: string[]) => {
    setAllArticles(prev => prev.map(a => {
      const idx = orderedIds.indexOf(a.id);
      return idx === -1 ? a : { ...a, storageSortOrder: idx };
    }));
    const updates = orderedIds.map((id, i) =>
      supabase.from('articles').update({ storage_sort_order: i } as any).eq('id', id)
    );
    await Promise.all(updates);
  };

  const deleteArticle = async (id: string) => {
    await supabase.from('articles').delete().eq('id', id);
  };

  return { articles, addArticle, updateArticle, deleteArticle, reorderArticles, reorderArticlesByStorage };
}

export function useOrders() {
  const [orders, setOrders] = useState<OrderEntry[]>([]);
  const ordersRef = useRef<OrderEntry[]>([]);
  // One serialized write chain per article so the last typed value wins
  const writeQueue = useRef<Map<string, Promise<unknown>>>(new Map());

  const applyOrders = useCallback((next: OrderEntry[]) => {
    ordersRef.current = next;
    setOrders(next);
  }, []);

  const fetchOrders = useCallback(async () => {
    const { data } = await supabase.from('orders').select('*');
    if (data) applyOrders(data.map(o => ({
      articleId: o.article_id,
      currentStock: o.current_stock,
      manualOrderQty: o.manual_order_qty,
    })));
  }, [applyOrders]);

  useEffect(() => {
    fetchOrders();
    const channelName = `orders-changes-${Date.now()}-${Math.random()}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchOrders]);

  const getOrder = (articleId: string): OrderEntry => {
    return orders.find(o => o.articleId === articleId) || {
      articleId, currentStock: 0, manualOrderQty: null,
    };
  };

  /** Latest value, including writes made in this same tick (used before sending). */
  const getOrderLatest = useCallback((articleId: string): OrderEntry => {
    return ordersRef.current.find(o => o.articleId === articleId) || {
      articleId, currentStock: 0, manualOrderQty: null,
    };
  }, []);

  const hasOrderEntry = (articleId: string): boolean => {
    return orders.some(o => o.articleId === articleId);
  };

  const hasOrderEntryLatest = useCallback((articleId: string): boolean => {
    return ordersRef.current.some(o => o.articleId === articleId);
  }, []);

  const enqueue = useCallback((articleId: string, task: () => Promise<unknown>) => {
    const prev = writeQueue.current.get(articleId) ?? Promise.resolve();
    const next = prev.catch(() => undefined).then(task);
    writeQueue.current.set(articleId, next);
    return next;
  }, []);

  const removeOrder = useCallback(async (articleId: string) => {
    applyOrders(ordersRef.current.filter(o => o.articleId !== articleId));
    await enqueue(articleId, async () => {
      const { error } = await supabase.from('orders').delete().eq('article_id', articleId);
      if (error) toast({ title: 'Napaka pri shranjevanju', description: error.message, variant: 'destructive' });
    });
  }, [applyOrders, enqueue]);

  const updateOrder = useCallback(async (articleId: string, updates: Partial<OrderEntry>) => {
    // Empty quantity means "do not order" -> remove the entry entirely
    if (updates.manualOrderQty === null) {
      await removeOrder(articleId);
      return;
    }

    // Optimistic local update so typing feels instant
    const existing = ordersRef.current.find(o => o.articleId === articleId);
    const merged: OrderEntry = existing
      ? { ...existing, ...updates }
      : {
          articleId,
          currentStock: updates.currentStock ?? 0,
          manualOrderQty: updates.manualOrderQty ?? null,
        };
    applyOrders(
      existing
        ? ordersRef.current.map(o => (o.articleId === articleId ? merged : o))
        : [...ordersRef.current, merged],
    );

    await enqueue(articleId, async () => {
      const { error } = await supabase.from('orders').upsert(
        {
          article_id: articleId,
          current_stock: merged.currentStock,
          manual_order_qty: merged.manualOrderQty,
        },
        { onConflict: 'article_id' },
      );
      if (error) toast({ title: 'Napaka pri shranjevanju', description: error.message, variant: 'destructive' });
    });
  }, [applyOrders, enqueue, removeOrder]);

  const clearOrders = async () => {
    applyOrders([]);
    const { error } = await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) toast({ title: 'Napaka pri brisanju', description: error.message, variant: 'destructive' });
  };

  /** Wait for all queued writes to reach the database. */
  const flushOrderWrites = useCallback(async () => {
    await Promise.allSettled(Array.from(writeQueue.current.values()));
  }, []);

  return { orders, getOrder, getOrderLatest, hasOrderEntry, hasOrderEntryLatest, updateOrder, removeOrder, clearOrders, flushOrderWrites };
}


export function useEmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);

  const fetchTemplates = useCallback(async () => {
    const { data } = await supabase.from('email_templates').select('*');
    if (data) setTemplates(data.map(t => ({
      id: t.id,
      supplierId: t.supplier_id,
      subjectTemplate: t.subject_template,
      bodyTemplate: t.body_template,
    })));
  }, []);

  useEffect(() => {
    fetchTemplates();
    const channelName = `email-templates-changes-${Date.now()}-${Math.random()}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'email_templates' }, () => fetchTemplates())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchTemplates]);

  const getTemplate = (supplierId: string | null): EmailTemplate => {
    const specific = templates.find(t => t.supplierId === supplierId);
    if (specific) return specific;
    const global = templates.find(t => t.supplierId === null);
    return global || {
      id: '', supplierId: null,
      subjectTemplate: 'Naročilo - {datum}',
      bodyTemplate: 'Pozdravljeni,\n\nProsim za naročilo naslednjega blaga:\n\n{artikli}\n\nHvala in lep pozdrav!',
    };
  };

  const upsertTemplate = async (supplierId: string | null, subject: string, body: string) => {
    const existing = templates.find(t => t.supplierId === supplierId);
    if (existing) {
      await supabase.from('email_templates').update({
        subject_template: subject, body_template: body,
      }).eq('id', existing.id);
    } else {
      await supabase.from('email_templates').insert({
        supplier_id: supplierId,
        subject_template: subject, body_template: body,
      });
    }
  };

  const deleteTemplate = async (supplierId: string) => {
    await supabase.from('email_templates').delete().eq('supplier_id', supplierId);
  };

  return { templates, getTemplate, upsertTemplate, deleteTemplate };
}

export function useStorageTypes(category: Category) {
  const [allTypes, setAllTypes] = useState<StorageTypeEntry[]>([]);

  const fetchTypes = useCallback(async () => {
    const { data } = await supabase.from('storage_types').select('*').order('sort_order').order('created_at');
    if (data) setAllTypes(data.map((t: any) => ({
      id: t.id, category: t.category as Category,
      name: t.name, colorHue: t.color_hue, sortOrder: t.sort_order,
    })));
  }, []);

  useEffect(() => {
    fetchTypes();
    const channelName = `storage-types-changes-${Date.now()}-${Math.random()}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'storage_types' }, () => fetchTypes())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchTypes]);

  const storageTypes = useMemo(() => allTypes.filter(t => t.category === category), [allTypes, category]);

  const addStorageType = async (name: string, colorHue: number) => {
    const maxOrder = storageTypes.reduce((max, t) => Math.max(max, t.sortOrder), -1);
    await supabase.from('storage_types').insert({
      category, name, color_hue: colorHue, sort_order: maxOrder + 1,
    } as any);
  };

  const deleteStorageType = async (id: string) => {
    await supabase.from('storage_types').delete().eq('id', id);
  };

  const renameStorageType = async (id: string, name: string) => {
    const clean = name.trim();
    if (!clean) return;
    setAllTypes(prev => prev.map(t => (t.id === id ? { ...t, name: clean } : t)));
    await supabase.from('storage_types').update({ name: clean } as any).eq('id', id);
  };


  const reorderStorageTypes = async (orderedIds: string[]) => {
    setAllTypes(prev => prev.map(t => {
      const i = orderedIds.indexOf(t.id);
      return i === -1 ? t : { ...t, sortOrder: i };
    }));
    await Promise.all(orderedIds.map((id, i) =>
      supabase.from('storage_types').update({ sort_order: i } as any).eq('id', id)));
  };

  return { storageTypes, addStorageType, deleteStorageType, renameStorageType, reorderStorageTypes };
}
