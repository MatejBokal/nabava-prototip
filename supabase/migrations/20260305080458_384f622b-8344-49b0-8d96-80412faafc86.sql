
-- Add contact_method and phone to suppliers
ALTER TABLE public.suppliers ADD COLUMN contact_method TEXT NOT NULL DEFAULT 'email';
ALTER TABLE public.suppliers ADD COLUMN phone TEXT NOT NULL DEFAULT '';

-- Create email_templates table for global + per-supplier templates
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE,
  subject_template TEXT NOT NULL DEFAULT 'Naročilo - {datum}',
  body_template TEXT NOT NULL DEFAULT 'Pozdravljeni,

Prosim za naročilo naslednjega blaga:

{artikli}

Hvala in lep pozdrav!',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(supplier_id)
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read email_templates" ON public.email_templates FOR SELECT USING (true);
CREATE POLICY "Public insert email_templates" ON public.email_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update email_templates" ON public.email_templates FOR UPDATE USING (true);
CREATE POLICY "Public delete email_templates" ON public.email_templates FOR DELETE USING (true);

-- Insert default global template (supplier_id = null)
INSERT INTO public.email_templates (supplier_id, subject_template, body_template)
VALUES (null, 'Naročilo - {datum}', 'Pozdravljeni,

Prosim za naročilo naslednjega blaga:

{artikli}

Hvala in lep pozdrav!');

ALTER PUBLICATION supabase_realtime ADD TABLE public.email_templates;
