
-- Drop permissive public policies and replace with authenticated-only policies
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['articles','email_templates','orders','storage_types','suppliers'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public read %s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Public insert %s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Public update %s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Public delete %s" ON public.%I', t, t);
  END LOOP;
END $$;

-- Revoke anon access; grant only to authenticated
REVOKE ALL ON public.articles, public.email_templates, public.orders, public.storage_types, public.suppliers FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.articles, public.email_templates, public.orders, public.storage_types, public.suppliers TO authenticated;

-- Authenticated-only policies
CREATE POLICY "Authenticated read articles" ON public.articles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert articles" ON public.articles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update articles" ON public.articles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete articles" ON public.articles FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated read email_templates" ON public.email_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert email_templates" ON public.email_templates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update email_templates" ON public.email_templates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete email_templates" ON public.email_templates FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated read orders" ON public.orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update orders" ON public.orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete orders" ON public.orders FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated read storage_types" ON public.storage_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert storage_types" ON public.storage_types FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update storage_types" ON public.storage_types FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete storage_types" ON public.storage_types FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated read suppliers" ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert suppliers" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update suppliers" ON public.suppliers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete suppliers" ON public.suppliers FOR DELETE TO authenticated USING (true);
