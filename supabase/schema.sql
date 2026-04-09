-- ============================================================
-- BARBER KING — Schema completo
-- Rodar no Supabase > SQL Editor
-- ============================================================

-- Extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- MATRIZES
-- ============================================================
CREATE TABLE matrizes (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name        TEXT NOT NULL,
  address     TEXT,
  phone       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROFESSIONALS
-- ============================================================
CREATE TABLE professionals (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT UNIQUE,
  phone       TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Vínculo Profissional ↔ Matriz (N:N)
CREATE TABLE professional_matrizes (
  professional_id  UUID REFERENCES professionals(id) ON DELETE CASCADE,
  matriz_id        UUID REFERENCES matrizes(id) ON DELETE CASCADE,
  status           TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  PRIMARY KEY (professional_id, matriz_id)
);

-- Horários regulares por profissional por unidade
CREATE TABLE professional_schedules (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  professional_id  UUID REFERENCES professionals(id) ON DELETE CASCADE,
  matriz_id        UUID REFERENCES matrizes(id) ON DELETE CASCADE,
  day_of_week      SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Dom, 6=Sáb
  start_time       TIME NOT NULL,
  end_time         TIME NOT NULL
);

-- Bloqueios lançados pela secretaria (cross-unit ou folga)
CREATE TABLE professional_blocks (
  id                    UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  professional_id       UUID REFERENCES professionals(id) ON DELETE CASCADE,
  blocked_at_matriz_id  UUID REFERENCES matrizes(id) ON DELETE CASCADE,  -- onde ele NÃO estará
  working_at_matriz_id  UUID REFERENCES matrizes(id) ON DELETE SET NULL,  -- onde ele ESTARÁ (nullable = folga)
  start_datetime        TIMESTAMPTZ NOT NULL,
  end_datetime          TIMESTAMPTZ NOT NULL,
  reason                TEXT,
  created_by            UUID REFERENCES auth.users(id),
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CLIENTS
-- ============================================================
CREATE TABLE clients (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT UNIQUE,
  phone       TEXT,
  birth_date  DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Vínculo Cliente ↔ Matriz (N:N) + pontos de fidelidade por unidade
CREATE TABLE client_matrizes (
  client_id       UUID REFERENCES clients(id) ON DELETE CASCADE,
  matriz_id       UUID REFERENCES matrizes(id) ON DELETE CASCADE,
  loyalty_points  INT DEFAULT 0,
  PRIMARY KEY (client_id, matriz_id)
);

-- ============================================================
-- SERVICES (catálogo independente por unidade)
-- ============================================================
CREATE TABLE services (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  matriz_id         UUID REFERENCES matrizes(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  price             DECIMAL(10,2) NOT NULL,
  duration_minutes  INT NOT NULL DEFAULT 30,
  active            BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- APPOINTMENTS
-- ============================================================
CREATE TABLE appointments (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  matriz_id        UUID REFERENCES matrizes(id) ON DELETE CASCADE,
  client_id        UUID REFERENCES clients(id),
  professional_id  UUID REFERENCES professionals(id),
  service_id       UUID REFERENCES services(id),
  scheduled_at     TIMESTAMPTZ NOT NULL,
  status           TEXT DEFAULT 'pending'
                   CHECK (status IN ('pending','confirmed','in_progress','done','cancelled')),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FINANCIAL RECORDS
-- ============================================================
CREATE TABLE financial_records (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  matriz_id       UUID REFERENCES matrizes(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('income','expense')),
  amount          DECIMAL(10,2) NOT NULL,
  description     TEXT,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  appointment_id  UUID REFERENCES appointments(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROFILES (fonte de verdade para role e status — controlado pelo sistema)
-- ============================================================
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'barber'
              CHECK (role IN ('admin', 'barber', 'sec', 'client')),
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: cria profile automaticamente ao criar usuário no Auth
-- SEGURANÇA: whitelist de roles — aceita apenas 'barber' e 'sec' do metadata.
-- 'admin' e qualquer outro valor não autorizado são bloqueados e caem para 'client'.
-- Clientes são aprovados automaticamente; barbers e secs ficam 'pending' até aprovação.
-- Promoção para admin: via RPC promote_to_admin (migration_promote_admin.sql).
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role   TEXT;
  v_status TEXT;
BEGIN
  v_role := CASE
    WHEN NEW.raw_user_meta_data->>'role' IN ('barber', 'sec') THEN NEW.raw_user_meta_data->>'role'
    ELSE 'client'
  END;

  v_status := CASE
    WHEN v_role = 'client' THEN 'approved'
    ELSE 'pending'
  END;

  INSERT INTO public.profiles (id, role, status, full_name, email)
  VALUES (
    NEW.id,
    v_role,
    v_status,
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

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Migrar usuários existentes para profiles (idempotente)
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
-- ROW LEVEL SECURITY
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
-- HELPER FUNCTIONS (leem role/status do DB, não do JWT)
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
-- PROFILES — policies
-- ============================================================
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
-- MATRIZES — admin gerencia, staff aprovado lê
-- ============================================================
CREATE POLICY "matrizes_read_staff"
  ON matrizes FOR SELECT TO authenticated
  USING (auth_role() IN ('admin', 'sec', 'barber') AND auth_status() = 'approved');

CREATE POLICY "matrizes_write_admin"
  ON matrizes FOR ALL TO authenticated
  USING (auth_role() = 'admin')
  WITH CHECK (auth_role() = 'admin');

-- ============================================================
-- PROFESSIONALS — admin escreve, staff aprovado lê
-- ============================================================
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
-- CLIENTS (PII) — admin e sec gerenciam, barber lê
-- ============================================================
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
-- SERVICES — admin escreve, staff lê
-- ============================================================
CREATE POLICY "services_read_staff"
  ON services FOR SELECT TO authenticated
  USING (auth_role() IN ('admin', 'sec', 'barber') AND auth_status() = 'approved');

CREATE POLICY "services_write_admin"
  ON services FOR ALL TO authenticated
  USING (auth_role() = 'admin') WITH CHECK (auth_role() = 'admin');

-- ============================================================
-- APPOINTMENTS — staff aprovado opera
-- ============================================================
CREATE POLICY "appointments_read_staff"
  ON appointments FOR SELECT TO authenticated
  USING (auth_role() IN ('admin', 'sec', 'barber') AND auth_status() = 'approved');

CREATE POLICY "appointments_write_staff"
  ON appointments FOR ALL TO authenticated
  USING (auth_role() IN ('admin', 'sec', 'barber') AND auth_status() = 'approved')
  WITH CHECK (auth_role() IN ('admin', 'sec', 'barber') AND auth_status() = 'approved');

-- ============================================================
-- FINANCIAL — apenas admin
-- ============================================================
CREATE POLICY "financial_admin_only"
  ON financial_records FOR ALL TO authenticated
  USING (auth_role() = 'admin')
  WITH CHECK (auth_role() = 'admin');

-- ============================================================
-- ÍNDICES (performance)
-- ============================================================
CREATE INDEX idx_appointments_matriz     ON appointments(matriz_id);
CREATE INDEX idx_appointments_scheduled  ON appointments(scheduled_at);
CREATE INDEX idx_appointments_status     ON appointments(status);
CREATE INDEX idx_financial_matriz        ON financial_records(matriz_id);
CREATE INDEX idx_financial_date          ON financial_records(date);
CREATE INDEX idx_services_matriz         ON services(matriz_id);
CREATE INDEX idx_prof_blocks_professional ON professional_blocks(professional_id);
CREATE INDEX idx_prof_blocks_blocked_at  ON professional_blocks(blocked_at_matriz_id);
