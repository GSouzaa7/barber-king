-- ============================================================
-- MIGRATION: Security Fix — Code Review Sprint 1
-- Rodar no Supabase > SQL Editor
-- ============================================================

-- ============================================================
-- S1.1: FIX — handle_new_user() NUNCA aceita role do frontend
-- ============================================================
-- ANTES: COALESCE(NEW.raw_user_meta_data->>'role', 'barber')
-- O atacante podia enviar role: 'admin' no payload e escalar privilégios.
--
-- DEPOIS: Sempre 'client'. Admin promove manualmente via painel.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, status)
  VALUES (
    NEW.id,
    'client',    -- HARDCODED: Nunca confiar no metadata do frontend
    'pending'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ============================================================
-- S1.2: RPC — decrement_stock (decremento atômico de estoque)
-- ============================================================
-- Elimina race condition: dois barbeiros consumindo o mesmo produto
-- simultaneamente não causam estoque negativo inconsistente.

CREATE OR REPLACE FUNCTION decrement_stock(
  p_product_id UUID,
  p_quantity INT
)
RETURNS TABLE(new_quantity INT, low_stock_threshold INT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_new_qty INT;
  v_threshold INT;
BEGIN
  UPDATE inventory_products
  SET quantity = GREATEST(0, quantity - p_quantity)
  WHERE id = p_product_id
  RETURNING quantity, inventory_products.low_stock_threshold
  INTO v_new_qty, v_threshold;

  RETURN QUERY SELECT v_new_qty, v_threshold;
END;
$$;

-- ============================================================
-- S1.3: RPC — complete_checkout (transação atômica)
-- ============================================================
-- Agrupa as 3 operações de conclusão de atendimento:
--   1. UPDATE appointments.status = 'done'
--   2. INSERT financial_records (receita)
--   3. UPDATE inventory_products (baixa de estoque) + INSERT inventory_movements
--
-- Se qualquer operação falhar, TODAS são revertidas (rollback automático).

CREATE OR REPLACE FUNCTION complete_checkout(
  p_appointment_id UUID,
  p_matriz_id UUID,
  p_amount DECIMAL,
  p_description TEXT,
  p_payment_method TEXT,
  p_client_name TEXT,
  p_products JSONB DEFAULT '[]'::JSONB
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  prod RECORD;
BEGIN
  -- 1. Marcar appointment como 'done'
  -- SEGURANÇA: valida que o appointment pertence à matriz do chamador
  -- Previne que um admin de uma unidade feche atendimento de outra unidade
  UPDATE appointments
  SET status = 'done'
  WHERE id = p_appointment_id
    AND matriz_id = p_matriz_id;

  -- Se nenhuma linha foi afetada, o appointment não pertence a esta matriz
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment % não encontrado ou não pertence à matriz %',
      p_appointment_id, p_matriz_id;
  END IF;

  -- 2. Criar registro financeiro (se valor > 0)
  IF p_amount > 0 THEN
    INSERT INTO financial_records (
      matriz_id, type, amount, description, date,
      appointment_id, payment_method, payment_status, client_name
    )
    VALUES (
      p_matriz_id, 'income', p_amount, p_description, CURRENT_DATE,
      p_appointment_id, p_payment_method, 'paid', p_client_name
    );
  END IF;

  -- 3. Decrementar estoque para cada produto vendido (atomicamente)
  FOR prod IN SELECT * FROM jsonb_to_recordset(p_products)
    AS x(product_id UUID, quantity INT, product_name TEXT)
  LOOP
    -- Decremento direto no SQL — sem ler no frontend antes
    UPDATE inventory_products
    SET quantity = GREATEST(0, quantity - prod.quantity)
    WHERE id = prod.product_id;

    -- Registrar movimento de saída
    INSERT INTO inventory_movements (
      matriz_id, product_id, type, quantity, notes, movement_date
    )
    VALUES (
      p_matriz_id, prod.product_id, 'saida', prod.quantity,
      'Venda balcão — ' || prod.product_name, CURRENT_DATE
    );
  END LOOP;
END;
$$;

-- ============================================================
-- VERIFICAÇÃO
-- ============================================================
SELECT 'migration_security_fix applied' AS status;
