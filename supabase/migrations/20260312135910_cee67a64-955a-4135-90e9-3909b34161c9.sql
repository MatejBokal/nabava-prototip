ALTER TABLE public.articles DROP COLUMN IF EXISTS day_targets;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;