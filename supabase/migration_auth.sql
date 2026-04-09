-- ============================================================
-- MIGRATION: Auth Fix — rodar no Supabase SQL Editor
-- Seguro para banco com dados existentes
-- ============================================================

-- ============================================================
-- 1. TABELA PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'barber'
              CHECK (role IN ('admin', 'barber', 'sec', 'client')),
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. TRIGGER — auto-create profile em novos cadastros
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'barber'),
    'pending'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 3. MIGRAR USUÁRIOS EXISTENTES
-- ============================================================
INSERT INTO profiles (id, role, status)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'role', 'barber') AS role,
  CASE
    WHEN raw_user_meta_data->>'role' = 'admin' THEN 'approved'
    WHEN raw_user_meta_data->>'status' = 'approved' THEN 'approved'
    ELSE 'pending'
  END AS status
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. HABILITAR RLS
-- ============================================================
ALTER TABLE profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE matrizes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_matrizes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_blocks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients                ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_matrizes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE services               ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_records      ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. REMOVER POLÍTICAS ANTIGAS (IF EXISTS = sem erro se não existir)
-- ============================================================
DROP POLICY IF EXISTS "auth_all" ON matrizes;
DROP POLICY IF EXISTS "auth_all" ON professionals;
DROP POLICY IF EXISTS "auth_all" ON professional_matrizes;
DROP POLICY IF EXISTS "auth_all" ON professional_schedules;
DROP POLICY IF EXISTS "auth_all" ON professional_blocks;
DROP POLICY IF EXISTS "auth_all" ON clients;
DROP POLICY IF EXISTS "auth_all" ON client_matrizes;
DROP POLICY IF EXISTS "auth_all" ON services;
DROP POLICY IF EXISTS "auth_all" ON appointments;
DROP POLICY IF EXISTS "auth_all" ON financial_records;

-- ============================================================
-- 6. HELPER FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION auth_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION auth_status()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT status FROM public.profiles WHERE id = auth.uid()
$$;

-- ============================================================
-- 7. POLICIES — PROFILES
-- ============================================================
DROP POLICY IF EXISTS "profiles_select_own"   ON profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;

CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_select_admin"
  ON profiles FOR SELECT TO authenticated
  USING (auth_role() = 'admin');

CREATE POLICY "profiles_update_admin"
  ON profiles FOR UPDATE TO authenticated
  USING (auth_role() = 'admin');

-- ============================================================
-- 8. POLICIES — MATRIZES
-- ============================================================
DROP POLICY IF EXISTS "matrizes_read_staff"  ON matrizes;
DROP POLICY IF EXISTS "matrizes_write_admin" ON matrizes;

CREATE POLICY "matrizes_read_staff"
  ON matrizes FOR SELECT TO authenticated
  USING (auth_role() IN ('admin', 'sec', 'barber') AND auth_status() = 'approved');

CREATE POLICY "matrizes_write_admin"
  ON matrizes FOR ALL TO authenticated
  USING (auth_role() = 'admin')
  WITH CHECK (auth_role() = 'admin');

-- ============================================================
-- 9. POLICIES — PROFESSIONALS
-- ============================================================
DROP POLICY IF EXISTS "professionals_read_staff"  ON professionals;
DROP POLICY IF EXISTS "professionals_write_admin" ON professionals;
DROP POLICY IF EXISTS "prof_matrizes_read_staff"  ON professional_matrizes;
DROP POLICY IF EXISTS "prof_matrizes_write_admin" ON professional_matrizes;
DROP POLICY IF EXISTS "prof_schedules_read_staff"  ON professional_schedules;
DROP POLICY IF EXISTS "prof_schedules_write_admin" ON professional_schedules;
DROP POLICY IF EXISTS "prof_blocks_read_staff"      ON professional_blocks;
DROP POLICY IF EXISTS "prof_blocks_write_sec_admin" ON professional_blocks;

CREATE POLICY "professionals_read_staff"
  ON professionals FOR SELECT TO authenticated
  USING (auth_role() IN ('admin', 'sec', 'barber') AND auth_status() = 'approved');

CREATE POLICY "professionals_write_admin"
  ON professionals FOR ALL TO authenticated
  USING (auth_role() = 'admin')
  WITH CHECK (auth_role() = 'admin');

CREATE POLICY "prof_matrizes_read_staff"
  ON professional_matrizes FOR SELECT TO authenticated
  USING (auth_role() IN ('admin', 'sec', 'barber') AND auth_status() = 'approved');

CREATE POLICY "prof_matrizes_write_admin"
  ON professional_matrizes FOR ALL TO authenticated
  USING (auth_role() = 'admin') WITH CHECK (auth_role() = 'admin');

CREATE POLICY "prof_schedules_read_staff"
  ON professional_schedules FOR SELECT TO authenticated
  USING (auth_role() IN ('admin', 'sec', 'barber') AND auth_status() = 'approved');

CREATE POLICY "prof_schedules_write_admin"
  ON professional_schedules FOR ALL TO authenticated
  USING (auth_role() = 'admin') WITH CHECK (auth_role() = 'admin');

CREATE POLICY "prof_blocks_read_staff"
  ON professional_blocks FOR SELECT TO authenticated
  USING (auth_role() IN ('admin', 'sec', 'barber') AND auth_status() = 'approved');

CREATE POLICY "prof_blocks_write_sec_admin"
  ON professional_blocks FOR ALL TO authenticated
  USING (auth_role() IN ('admin', 'sec') AND auth_status() = 'approved')
  WITH CHECK (auth_role() IN ('admin', 'sec') AND auth_status() = 'approved');

-- ============================================================
-- 10. POLICIES — CLIENTS
-- ============================================================
DROP POLICY IF EXISTS "clients_read_staff"         ON clients;
DROP POLICY IF EXISTS "clients_write_sec_admin"    ON clients;
DROP POLICY IF EXISTS "client_matrizes_read_staff"      ON client_matrizes;
DROP POLICY IF EXISTS "client_matrizes_write_sec_admin" ON client_matrizes;

CREATE POLICY "clients_read_staff"
  ON clients FOR SELECT TO authenticated
  USING (auth_role() IN ('admin', 'sec', 'barber') AND auth_status() = 'approved');

CREATE POLICY "clients_write_sec_admin"
  ON clients FOR ALL TO authenticated
  USING (auth_role() IN ('admin', 'sec') AND auth_status() = 'approved')
  WITH CHECK (auth_role() IN ('admin', 'sec') AND auth_status() = 'approved');

CREATE POLICY "client_matrizes_read_staff"
  ON client_matrizes FOR SELECT TO authenticated
  USING (auth_role() IN ('admin', 'sec', 'barber') AND auth_status() = 'approved');

CREATE POLICY "client_matrizes_write_sec_admin"
  ON client_matrizes FOR ALL TO authenticated
  USING (auth_role() IN ('admin', 'sec') AND auth_status() = 'approved')
  WITH CHECK (auth_role() IN ('admin', 'sec') AND auth_status() = 'approved');

-- ============================================================
-- 11. POLICIES — SERVICES
-- ============================================================
DROP POLICY IF EXISTS "services_read_staff"  ON services;
DROP POLICY IF EXISTS "services_write_admin" ON services;

CREATE POLICY "services_read_staff"
  ON services FOR SELECT TO authenticated
  USING (auth_role() IN ('admin', 'sec', 'barber') AND auth_status() = 'approved');

CREATE POLICY "services_write_admin"
  ON services FOR ALL TO authenticated
  USING (auth_role() = 'admin') WITH CHECK (auth_role() = 'admin');

-- ============================================================
-- 12. POLICIES — APPOINTMENTS
-- ============================================================
DROP POLICY IF EXISTS "appointments_read_staff"  ON appointments;
DROP POLICY IF EXISTS "appointments_write_staff" ON appointments;

CREATE POLICY "appointments_read_staff"
  ON appointments FOR SELECT TO authenticated
  USING (auth_role() IN ('admin', 'sec', 'barber') AND auth_status() = 'approved');

CREATE POLICY "appointments_write_staff"
  ON appointments FOR ALL TO authenticated
  USING (auth_role() IN ('admin', 'sec', 'barber') AND auth_status() = 'approved')
  WITH CHECK (auth_role() IN ('admin', 'sec', 'barber') AND auth_status() = 'approved');

-- ============================================================
-- 13. POLICIES — FINANCIAL
-- ============================================================
DROP POLICY IF EXISTS "financial_admin_only" ON financial_records;

CREATE POLICY "financial_admin_only"
  ON financial_records FOR ALL TO authenticated
  USING (auth_role() = 'admin')
  WITH CHECK (auth_role() = 'admin');

-- ============================================================
-- VERIFICAÇÃO FINAL
-- ============================================================
SELECT 'profiles criado' AS status, count(*) AS usuarios FROM profiles;
