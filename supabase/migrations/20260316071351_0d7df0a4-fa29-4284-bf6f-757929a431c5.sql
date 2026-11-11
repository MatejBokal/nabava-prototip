
CREATE TABLE public.storage_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'hrana',
  name text NOT NULL,
  color_hue integer NOT NULL DEFAULT 200,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.storage_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read storage_types" ON public.storage_types FOR SELECT TO public USING (true);
CREATE POLICY "Public insert storage_types" ON public.storage_types FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public update storage_types" ON public.storage_types FOR UPDATE TO public USING (true);
CREATE POLICY "Public delete storage_types" ON public.storage_types FOR DELETE TO public USING (true);

-- Seed default storage types for hrana
INSERT INTO public.storage_types (category, name, color_hue, sort_order) VALUES
  ('hrana', 'Suho', 40, 0),
  ('hrana', 'Hlajeno', 200, 1),
  ('hrana', 'Zamrznjeno', 250, 2);
