-- ============================================================
-- MIGRATION: Public Access Policies for Landing Page
-- Rodar no Supabase > SQL Editor
-- ============================================================

-- 1. Matrizes: Leitura pública para a Landing Page
DROP POLICY IF EXISTS "matrizes_read_public" ON public.matrizes;
CREATE POLICY "matrizes_read_public"
  ON public.matrizes FOR SELECT
  USING (true);

-- 2. Salon Settings: Leitura pública para a Landing Page
DROP POLICY IF EXISTS "salon_settings_read_public" ON public.salon_settings;
CREATE POLICY "salon_settings_read_public"
  ON public.salon_settings FOR SELECT
  USING (true);

-- 3. Salon Schedules: Leitura pública para a Landing Page
DROP POLICY IF EXISTS "salon_schedules_read_public" ON public.salon_schedules;
CREATE POLICY "salon_schedules_read_public"
  ON public.salon_schedules FOR SELECT
  USING (true);

-- 4. Importante: Habilitar SELECT para usuários anônimos (anon)
ALTER TABLE public.matrizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_schedules ENABLE ROW LEVEL SECURITY;

-- Nota: Como o Supabase por padrão permite 'anon' se a política USING(true) existir,
-- as políticas acima já são suficientes para que a landing page pública funcione.
