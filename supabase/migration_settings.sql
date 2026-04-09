-- ============================================================
-- MIGRATION: Settings Tables — Barber King
-- Rodar no Supabase > SQL Editor
-- Seguro para banco com dados existentes (usa IF NOT EXISTS)
-- ============================================================

-- ============================================================
-- 1. EXTENDER TABELA PROFILES (full_name + email)
--    Necessário para exibir usuários na aba Acessos & Permissões
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email     TEXT;

-- Atualizar trigger para capturar full_name e email no cadastro
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, status, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'barber'),
    'pending',
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.email, '')
  )
  ON CONFLICT (id) DO UPDATE
    SET
      full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
      email     = COALESCE(EXCLUDED.email, public.profiles.email);
  RETURN NEW;
END;
$$;

-- Backfill usuários existentes (sem dados de nome/email ainda)
UPDATE profiles p
SET
  full_name = COALESCE(
    (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = p.id),
    (SELECT raw_user_meta_data->>'name'      FROM auth.users WHERE id = p.id),
    ''
  ),
  email = COALESCE(
    (SELECT email FROM auth.users WHERE id = p.id),
    ''
  )
WHERE p.full_name IS NULL OR p.email IS NULL;

-- ============================================================
-- 2. SALON SETTINGS (dados do salão por matriz)
-- ============================================================
CREATE TABLE IF NOT EXISTS salon_settings (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  matriz_id   UUID REFERENCES matrizes(id) ON DELETE CASCADE UNIQUE,
  name        TEXT NOT NULL DEFAULT '',
  phone       TEXT DEFAULT '',
  address     TEXT DEFAULT '',
  instagram   TEXT DEFAULT '',
  whatsapp    TEXT DEFAULT '',
  logo_url    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE salon_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "salon_settings_read_staff"  ON salon_settings;
DROP POLICY IF EXISTS "salon_settings_write_admin" ON salon_settings;

CREATE POLICY "salon_settings_read_staff"
  ON salon_settings FOR SELECT TO authenticated
  USING (auth_role() IN ('admin', 'sec', 'barber') AND auth_status() = 'approved');

CREATE POLICY "salon_settings_write_admin"
  ON salon_settings FOR ALL TO authenticated
  USING (auth_role() = 'admin')
  WITH CHECK (auth_role() = 'admin');

-- ============================================================
-- 3. SALON SCHEDULES (horários de funcionamento por matriz)
--    day_of_week: 0=Domingo, 1=Segunda ... 6=Sábado
-- ============================================================
CREATE TABLE IF NOT EXISTS salon_schedules (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  matriz_id    UUID REFERENCES matrizes(id) ON DELETE CASCADE,
  day_of_week  SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  is_active    BOOLEAN DEFAULT TRUE,
  open_time    TIME NOT NULL DEFAULT '09:00',
  close_time   TIME NOT NULL DEFAULT '18:00',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (matriz_id, day_of_week)
);

ALTER TABLE salon_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "salon_schedules_read_staff"  ON salon_schedules;
DROP POLICY IF EXISTS "salon_schedules_write_admin" ON salon_schedules;

CREATE POLICY "salon_schedules_read_staff"
  ON salon_schedules FOR SELECT TO authenticated
  USING (auth_role() IN ('admin', 'sec', 'barber') AND auth_status() = 'approved');

CREATE POLICY "salon_schedules_write_admin"
  ON salon_schedules FOR ALL TO authenticated
  USING (auth_role() = 'admin')
  WITH CHECK (auth_role() = 'admin');

-- ============================================================
-- 4. PAYMENT FEES (taxas de maquininha por matriz)
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_fees (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  matriz_id   UUID REFERENCES matrizes(id) ON DELETE CASCADE,
  fee_type    TEXT NOT NULL CHECK (fee_type IN ('pix', 'debit', 'credit_immediate', 'credit_installments')),
  percentage  DECIMAL(5,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (matriz_id, fee_type)
);

ALTER TABLE payment_fees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_fees_read_admin"  ON payment_fees;
DROP POLICY IF EXISTS "payment_fees_write_admin" ON payment_fees;

CREATE POLICY "payment_fees_read_admin"
  ON payment_fees FOR SELECT TO authenticated
  USING (auth_role() = 'admin' AND auth_status() = 'approved');

CREATE POLICY "payment_fees_write_admin"
  ON payment_fees FOR ALL TO authenticated
  USING (auth_role() = 'admin')
  WITH CHECK (auth_role() = 'admin');

-- ============================================================
-- 5. COMMISSION SETTINGS (regras globais de comissão por matriz)
-- ============================================================
CREATE TABLE IF NOT EXISTS commission_settings (
  id                              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  matriz_id                       UUID REFERENCES matrizes(id) ON DELETE CASCADE UNIQUE,
  service_commission              DECIMAL(5,2) NOT NULL DEFAULT 50,
  product_commission              DECIMAL(5,2) NOT NULL DEFAULT 10,
  global_tax                      DECIMAL(5,2) NOT NULL DEFAULT 6,
  discount_fee_before_commission  BOOLEAN DEFAULT FALSE,
  created_at                      TIMESTAMPTZ DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE commission_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "commission_settings_read_admin"  ON commission_settings;
DROP POLICY IF EXISTS "commission_settings_write_admin" ON commission_settings;

CREATE POLICY "commission_settings_read_admin"
  ON commission_settings FOR SELECT TO authenticated
  USING (auth_role() = 'admin' AND auth_status() = 'approved');

CREATE POLICY "commission_settings_write_admin"
  ON commission_settings FOR ALL TO authenticated
  USING (auth_role() = 'admin')
  WITH CHECK (auth_role() = 'admin');

-- ============================================================
-- 6. PROFESSIONAL COMMISSIONS (comissões customizadas por profissional)
-- ============================================================
CREATE TABLE IF NOT EXISTS professional_commissions (
  id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  matriz_id           UUID REFERENCES matrizes(id) ON DELETE CASCADE,
  professional_id     UUID REFERENCES professionals(id) ON DELETE CASCADE,
  service_commission  DECIMAL(5,2) NOT NULL DEFAULT 50,
  product_commission  DECIMAL(5,2) NOT NULL DEFAULT 10,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (matriz_id, professional_id)
);

ALTER TABLE professional_commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prof_commissions_read_admin"  ON professional_commissions;
DROP POLICY IF EXISTS "prof_commissions_write_admin" ON professional_commissions;

CREATE POLICY "prof_commissions_read_admin"
  ON professional_commissions FOR SELECT TO authenticated
  USING (auth_role() = 'admin' AND auth_status() = 'approved');

CREATE POLICY "prof_commissions_write_admin"
  ON professional_commissions FOR ALL TO authenticated
  USING (auth_role() = 'admin')
  WITH CHECK (auth_role() = 'admin');

-- ============================================================
-- VERIFICAÇÃO FINAL
-- ============================================================
SELECT 'migration_settings OK' AS status;
SELECT column_name FROM information_schema.columns
  WHERE table_name = 'profiles' AND column_name IN ('full_name', 'email');
