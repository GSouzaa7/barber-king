-- =============================================================================
-- rotate_admin_code.sql — Barber King Security
-- Rotaciona o hash do código de setup de admin no banco de dados.
--
-- INSTRUÇÃO:
--   1. Gere um código forte (ex: openssl rand -base64 32)
--   2. Substitua 'SEU_NOVO_CODIGO_AQUI' abaixo pelo novo código
--   3. Execute no painel Supabase → SQL Editor
--   4. Atualize VITE_ADMIN_SETUP_CODE no seu .env local com o mesmo valor
-- =============================================================================

-- Verificar o hash atual (para auditoria)
SELECT key, value, updated_at
FROM app_settings
WHERE key = 'admin_setup_code_hash';

-- Rotacionar o hash
-- TROQUE 'SEU_NOVO_CODIGO_AQUI' pelo novo código gerado
UPDATE app_settings
SET
  value      = md5('SEU_NOVO_CODIGO_AQUI'),
  updated_at = now()
WHERE key = 'admin_setup_code_hash';

-- Se não existir ainda, inserir:
-- INSERT INTO app_settings (key, value)
-- VALUES ('admin_setup_code_hash', md5('SEU_NOVO_CODIGO_AQUI'))
-- ON CONFLICT (key) DO UPDATE
--   SET value = EXCLUDED.value, updated_at = now();

-- Confirmar a atualização
SELECT key, value, updated_at
FROM app_settings
WHERE key = 'admin_setup_code_hash';
