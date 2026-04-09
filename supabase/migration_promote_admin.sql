-- ============================================================
-- MIGRATION: Promote Admin — Setup Seguro
-- Rodar no Supabase > SQL Editor
-- ============================================================
--
-- Propósito: permite que AdminSetup promova um usuário recém-criado
-- para 'admin' sem depender de user_metadata (que é controlável pelo
-- frontend e portanto inseguro).
--
-- A função é SECURITY DEFINER e valida o setup_code em runtime,
-- garantindo que apenas quem possui o código pode promover.
-- O código é armazenado como hash (MD5) para não ficar em plaintext.
--
-- IMPORTANTE: Após o primeiro uso, remova VITE_ADMIN_SETUP_CODE
-- do .env e reinicie o servidor para desativar AdminSetup.
-- ============================================================

CREATE OR REPLACE FUNCTION promote_to_admin(
  p_user_id   UUID,
  p_setup_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_stored_hash TEXT;
  v_admin_count INT;
BEGIN
  -- 1. Recupera o hash do código de setup salvo em app_settings
  SELECT value INTO v_stored_hash
  FROM app_settings
  WHERE key = 'admin_setup_code_hash'
  LIMIT 1;

  -- 2. Se não há hash configurado, setup está desativado
  IF v_stored_hash IS NULL THEN
    RETURN jsonb_build_object('error', 'Setup desativado. Contate o suporte.');
  END IF;

  -- 3. Valida o código (compara MD5 do input com hash armazenado)
  IF md5(p_setup_code) != v_stored_hash THEN
    RETURN jsonb_build_object('error', 'Código de configuração inválido.');
  END IF;

  -- 4. Verifica se já existe um admin (previne criação de múltiplos admins via setup)
  SELECT COUNT(*) INTO v_admin_count
  FROM public.profiles
  WHERE role = 'admin';

  IF v_admin_count > 0 THEN
    RETURN jsonb_build_object('error', 'Já existe um administrador configurado. Desative o setup.');
  END IF;

  -- 5. Promove o usuário para admin com status aprovado
  UPDATE public.profiles
  SET role = 'admin', status = 'approved', updated_at = NOW()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Usuário não encontrado no banco de dados.');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- TABELA: app_settings (chave-valor para configurações internas)
-- ============================================================
CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: apenas admin pode ler/escrever app_settings
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_settings_admin_only" ON app_settings;
CREATE POLICY "app_settings_admin_only"
  ON app_settings FOR ALL TO authenticated
  USING (auth_role() = 'admin')
  WITH CHECK (auth_role() = 'admin');

-- ============================================================
-- INSTRUÇÕES DE USO:
-- Antes de usar AdminSetup, insira o hash do seu VITE_ADMIN_SETUP_CODE:
--
--   INSERT INTO app_settings (key, value)
--   VALUES ('admin_setup_code_hash', md5('SEU_CODIGO_AQUI'))
--   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
--
-- Para desativar o setup permanentemente:
--   DELETE FROM app_settings WHERE key = 'admin_setup_code_hash';
-- ============================================================

SELECT 'migration_promote_admin applied' AS status;
