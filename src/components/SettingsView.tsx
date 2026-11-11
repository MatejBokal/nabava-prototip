import { useState } from 'react';
import { Supplier, EmailTemplate } from '@/types/nabavni';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, LogOut } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { StorageSettings } from './StorageSettings';
import { supabase } from '@/integrations/supabase/client';

interface SettingsViewProps {
  suppliers: Supplier[];
  getTemplate: (supplierId: string | null) => EmailTemplate;
  upsertTemplate: (supplierId: string | null, subject: string, body: string) => void;
  deleteTemplate: (supplierId: string) => void;
  onBack: () => void;
}

export function SettingsView({
  suppliers, getTemplate, upsertTemplate, deleteTemplate, onBack,
}: SettingsViewProps) {
  const globalTemplate = getTemplate(null);

  return (
    <div className="pb-8">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm px-4 pt-4 pb-3 border-b border-border">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 -ml-2 mb-2">
          <ChevronLeft className="w-4 h-4" /> Nazaj
        </Button>
        <h1 className="text-xl font-bold">Nastavitve</h1>
      </div>

      <div className="px-4 mt-6 space-y-8">
        <StorageSettings />
        <Separator />
        <h2 className="text-base font-semibold -mb-4">Email / SMS predloge</h2>
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Badge className="bg-primary text-primary-foreground text-xs">Glavna predloga</Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Uporabi <code className="bg-muted px-1 rounded">{'{datum}'}</code> za datum in <code className="bg-muted px-1 rounded">{'{artikli}'}</code> za seznam artiklov.
          </p>
          <TemplateEditor
            subjectTemplate={globalTemplate.subjectTemplate}
            bodyTemplate={globalTemplate.bodyTemplate}
            onSave={(subject, body) => upsertTemplate(null, subject, body)}
          />
        </div>

        <Separator />

        <div>
          <h3 className="text-sm font-semibold mb-3">Predloge po dobaviteljih</h3>
          <p className="text-xs text-muted-foreground mb-4">Če dobavitelj nima lastne predloge, se uporabi glavna.</p>
          <div className="space-y-4">
            {suppliers.map(s => {
              const template = getTemplate(s.id);
              const hasCustom = template.supplierId === s.id;
              return (
                <div key={s.id} className="bg-card rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{s.name}</span>
                    {hasCustom && (
                      <Button variant="ghost" size="sm" className="text-xs text-destructive h-7" onClick={() => deleteTemplate(s.id)}>
                        Izbriši predlogo
                      </Button>
                    )}
                  </div>
                  <TemplateEditor
                    subjectTemplate={template.subjectTemplate}
                    bodyTemplate={template.bodyTemplate}
                    onSave={(subject, body) => upsertTemplate(s.id, subject, body)}
                    compact
                  />
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()} className="gap-2">
          <LogOut className="w-4 h-4" /> Odjava
        </Button>
      </div>
    </div>
  );
}

function TemplateEditor({
  subjectTemplate, bodyTemplate, onSave, compact = false,
}: {
  subjectTemplate: string;
  bodyTemplate: string;
  onSave: (subject: string, body: string) => void;
  compact?: boolean;
}) {
  const [subject, setSubject] = useState(subjectTemplate);
  const [body, setBody] = useState(bodyTemplate);
  const changed = subject !== subjectTemplate || body !== bodyTemplate;

  return (
    <div className="space-y-2">
      <Input value={subject} onChange={e => setSubject(e.target.value)}
        className={`text-sm bg-background ${compact ? 'h-8' : 'h-9'}`} placeholder="Zadeva" />
      <Textarea value={body} onChange={e => setBody(e.target.value)}
        className={`text-sm bg-background resize-none ${compact ? 'min-h-[80px]' : 'min-h-[120px]'}`} placeholder="Telo sporočila..." />
      {changed && (
        <Button size="sm" onClick={() => onSave(subject, body)} className="w-full text-xs">Shrani predlogo</Button>
      )}
    </div>
  );
}
