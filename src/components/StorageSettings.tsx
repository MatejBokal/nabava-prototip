import { useState } from 'react';
import { useStorageTypes } from '@/hooks/useNabavni';
import { useCategories } from '@/hooks/useCategories';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, ChevronUp, ChevronDown, Trash2, Plus, Pencil } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { StorageTypeEntry } from '@/types/nabavni';

function CategoryStorages({ category, label }: { category: string; label: string }) {
  const { storageTypes, addStorageType, deleteStorageType, renameStorageType, reorderStorageTypes } = useStorageTypes(category);
  const key = `nabavni-hidden-st-${category}`;
  const [hidden, setHidden] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); } catch { return new Set(); }
  });
  const [name, setName] = useState('');
  const [toDelete, setToDelete] = useState<StorageTypeEntry | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const sorted = [...storageTypes].sort((a, b) => a.sortOrder - b.sortOrder);

  const toggle = (id: string) => setHidden(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    try { localStorage.setItem(key, JSON.stringify([...next])); } catch { /* ignore */ }
    return next;
  });
  const move = (i: number, dir: number) => {
    const ids = sorted.map(t => t.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    reorderStorageTypes(ids);
  };
  const add = async () => {
    if (!name.trim()) return;
    await addStorageType(name.trim(), Math.floor(Math.random() * 360));
    setName('');
  };
  const startEdit = (st: StorageTypeEntry) => { setEditingId(st.id); setEditName(st.name); };
  const commitEdit = async () => {
    const current = sorted.find(t => t.id === editingId);
    const clean = editName.trim();
    setEditingId(null);
    if (!current || !clean || clean === current.name) return;
    await renameStorageType(current.id, clean);
  };

  return (
    <div className="bg-card rounded-lg p-3 space-y-2">
      <div className="font-medium text-sm">{label}</div>
      {sorted.map((st, i) => {
        const isHidden = hidden.has(st.id);
        return (
          <div key={st.id} className={`flex items-center gap-2 rounded-md border px-2 py-1 ${isHidden ? 'opacity-60 border-dashed' : ''}`}>
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: `hsl(${st.colorHue}, 70%, 60%)` }} />
            {editingId === st.id ? (
              <Input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingId(null); }}
                className="h-7 flex-1 min-w-0 text-sm" />
            ) : (
              <button type="button" onClick={() => startEdit(st)} title="Preimenuj"
                className="flex-1 min-w-0 text-left text-sm truncate underline-offset-2 hover:underline">
                {st.name}
              </button>
            )}
            <Button size="icon" variant="ghost" className="h-7 w-7" title="Preimenuj" onClick={() => startEdit(st)}><Pencil className="w-3.5 h-3.5" /></Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" disabled={i === 0} onClick={() => move(i, -1)}><ChevronUp className="w-4 h-4" /></Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" disabled={i === sorted.length - 1} onClick={() => move(i, 1)}><ChevronDown className="w-4 h-4" /></Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" title={isHidden ? 'Pokaži' : 'Skrij'} onClick={() => toggle(st.id)}>
              {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setToDelete(st)}><Trash2 className="w-4 h-4" /></Button>
          </div>
        );
      })}
      <div className="flex gap-2">
        <Input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add(); }}
          placeholder="Novo skladišče" className="h-8 text-sm" />
        <Button size="sm" className="h-8" onClick={add} disabled={!name.trim()}><Plus className="w-4 h-4" /></Button>
      </div>
      <AlertDialog open={!!toDelete} onOpenChange={o => { if (!o) setToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Izbriši skladišče?</AlertDialogTitle>
            <AlertDialogDescription>Ali res želite izbrisati skladišče "{toDelete?.name}"?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Prekliči</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { if (toDelete) await deleteStorageType(toDelete.id); setToDelete(null); }}>Izbriši</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function StorageSettings() {
  const { categories } = useCategories();
  return (
    <div>
      <h3 className="text-sm font-semibold mb-1">Skladišča</h3>
      <p className="text-xs text-muted-foreground mb-3">Tapni ime ali ikono svinčnika za preimenovanje. Vrstni red velja za vse. Skrita skladišča (oko) se skrijejo na tej napravi.</p>
      <div className="space-y-3">
        {categories.map(c => <CategoryStorages key={c.value} category={c.value} label={c.label} />)}
      </div>
    </div>
  );
}
