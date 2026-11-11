
-- Add category column to suppliers
ALTER TABLE public.suppliers ADD COLUMN category text NOT NULL DEFAULT 'hrana';

-- Add category column to articles
ALTER TABLE public.articles ADD COLUMN category text NOT NULL DEFAULT 'hrana';
