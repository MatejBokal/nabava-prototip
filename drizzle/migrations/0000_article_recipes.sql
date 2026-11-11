CREATE TABLE public.article_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  ingredient_article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  quantity numeric NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.article_recipes TO authenticated;
GRANT ALL ON public.article_recipes TO service_role;
ALTER TABLE public.article_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth all article_recipes" ON public.article_recipes FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE public.recipe_exclusions (
  article_id uuid PRIMARY KEY REFERENCES public.articles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipe_exclusions TO authenticated;
GRANT ALL ON public.recipe_exclusions TO service_role;
ALTER TABLE public.recipe_exclusions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth all recipe_exclusions" ON public.recipe_exclusions FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

ALTER PUBLICATION supabase_realtime ADD TABLE public.article_recipes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.recipe_exclusions;