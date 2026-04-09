-- ============================================================
-- MIGRATION: Inventory & Suppliers — rodar no Supabase SQL Editor
-- ============================================================

-- Função update_updated_at (reutilizável — cria se não existir)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- INVENTORY PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_products (
  id                   UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  matriz_id            UUID NOT NULL REFERENCES matrizes(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  ref                  TEXT,
  category             TEXT,
  quantity             INT NOT NULL DEFAULT 0,
  price                NUMERIC(10, 2),
  low_stock_threshold  INT DEFAULT 10,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_matriz    ON inventory_products(matriz_id);
CREATE INDEX IF NOT EXISTS idx_inventory_category  ON inventory_products(category);
CREATE INDEX IF NOT EXISTS idx_inventory_quantity  ON inventory_products(quantity);

ALTER TABLE inventory_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_all_inventory" ON inventory_products;
CREATE POLICY "inventory_read_staff"
  ON inventory_products FOR SELECT TO authenticated
  USING (auth_role() IN ('admin', 'sec', 'barber') AND auth_status() = 'approved');
CREATE POLICY "inventory_write_admin"
  ON inventory_products FOR ALL TO authenticated
  USING (auth_role() = 'admin') WITH CHECK (auth_role() = 'admin');

DROP TRIGGER IF EXISTS trg_inventory_updated_at ON inventory_products;
CREATE TRIGGER trg_inventory_updated_at
  BEFORE UPDATE ON inventory_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SUPPLIERS
-- ============================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  matriz_id     UUID NOT NULL REFERENCES matrizes(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  category      TEXT,
  phone         TEXT,
  email         TEXT,
  person_type   TEXT DEFAULT 'Jurídica' CHECK (person_type IN ('Física', 'Jurídica')),
  document      TEXT,
  country       TEXT DEFAULT 'brasil',
  state         TEXT,
  city          TEXT,
  opening_date  DATE,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supplier_orders (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  supplier_id       UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  matriz_id         UUID NOT NULL REFERENCES matrizes(id) ON DELETE CASCADE,
  amount            NUMERIC(10, 2),
  status            TEXT DEFAULT 'Aguardando'
                    CHECK (status IN ('Aguardando', 'Separando', 'Em Rota', 'Concluído', 'Cancelado')),
  order_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery DATE,
  delivered_at      TIMESTAMPTZ,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_matriz       ON suppliers(matriz_id);
CREATE INDEX IF NOT EXISTS idx_supplier_orders_sup    ON supplier_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_orders_status ON supplier_orders(status);
CREATE INDEX IF NOT EXISTS idx_supplier_orders_matriz ON supplier_orders(matriz_id);

ALTER TABLE suppliers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_all_suppliers"       ON suppliers;
DROP POLICY IF EXISTS "auth_all_supplier_orders" ON supplier_orders;

CREATE POLICY "suppliers_read_staff"
  ON suppliers FOR SELECT TO authenticated
  USING (auth_role() IN ('admin', 'sec') AND auth_status() = 'approved');
CREATE POLICY "suppliers_write_admin"
  ON suppliers FOR ALL TO authenticated
  USING (auth_role() = 'admin') WITH CHECK (auth_role() = 'admin');

CREATE POLICY "supplier_orders_read_staff"
  ON supplier_orders FOR SELECT TO authenticated
  USING (auth_role() IN ('admin', 'sec') AND auth_status() = 'approved');
CREATE POLICY "supplier_orders_write_admin"
  ON supplier_orders FOR ALL TO authenticated
  USING (auth_role() = 'admin') WITH CHECK (auth_role() = 'admin');

DROP TRIGGER IF EXISTS trg_suppliers_updated_at ON suppliers;
CREATE TRIGGER trg_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RPC: Frequência de clientes (para Frequency.tsx)
-- ============================================================
CREATE OR REPLACE FUNCTION get_client_frequency(p_matriz_id UUID)
RETURNS TABLE (
  client_id         UUID,
  client_name       TEXT,
  client_phone      TEXT,
  last_visit        DATE,
  days_since_last   INT,
  total_visits      BIGINT,
  avg_interval_days NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH ordered AS (
    SELECT
      c.id,
      c.name,
      c.phone,
      a.scheduled_at::date AS visit_date,
      LAG(a.scheduled_at::date) OVER (PARTITION BY c.id ORDER BY a.scheduled_at) AS prev_visit
    FROM appointments a
    JOIN clients c ON c.id = a.client_id
    WHERE a.matriz_id = p_matriz_id
      AND a.status = 'done'
  ),
  intervals AS (
    SELECT id, visit_date, (visit_date - prev_visit) AS interval_days
    FROM ordered
    WHERE prev_visit IS NOT NULL
  )
  SELECT
    o.id,
    o.name,
    o.phone,
    MAX(o.visit_date)                            AS last_visit,
    (CURRENT_DATE - MAX(o.visit_date))::INT      AS days_since_last,
    COUNT(DISTINCT o.visit_date)                 AS total_visits,
    COALESCE(AVG(i.interval_days), 0)::NUMERIC   AS avg_interval_days
  FROM ordered o
  LEFT JOIN intervals i ON i.id = o.id
  GROUP BY o.id, o.name, o.phone;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'migration_inventory_suppliers concluída' AS status;
