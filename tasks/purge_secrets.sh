#!/usr/bin/env bash
# =============================================================================
# purge_secrets.sh — Barber King Security Remediation
# Limpa TODAS as chaves expostas do histórico git e faz force-push.
#
# PRÉ-REQUISITOS (instalar antes de rodar):
#   pip install git-filter-repo
#   ou: brew install git-filter-repo
#
# USO:
#   1. Feche o Cursor / VS Code (libera o lock do .git/index)
#   2. cd <pasta-do-projeto>
#   3. bash tasks/purge_secrets.sh
# =============================================================================
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"

echo "======================================================="
echo "  Barber King — Limpeza de Segredos no Histórico Git"
echo "======================================================="
echo ""
echo "REPO: $REPO"
echo ""

# --- Verificações iniciais ---
if ! command -v git-filter-repo &>/dev/null; then
  echo "ERRO: git-filter-repo não encontrado."
  echo "Instale com: pip install git-filter-repo"
  echo "         ou: brew install git-filter-repo"
  exit 1
fi

if git diff --quiet 2>/dev/null; then
  : # ok
fi

echo "[1/6] Verificando remote origin..."
git remote get-url origin

echo ""
echo "[2/6] Iniciando limpeza com git-filter-repo..."
echo "      Isso reescreve TODA a história — pode demorar alguns minutos."
echo ""

# Remove o .env de todos os commits de todas as branches
git filter-repo --force \
  --path .env --invert-paths \
  --path check_anon_access.cjs \
  --path check_appts.cjs \
  --path check_db.js \
  --path check_db2.cjs \
  --path check_db_correct.cjs \
  --path check_db_v3.cjs \
  --path check_financial.cjs \
  --path check_ids.mjs \
  --path cleanup_mock_data.mjs \
  --path cleanup_mock_data_execution.cjs \
  --path count_all_tables.cjs \
  --path create_test.cjs \
  --path debug_data.mjs \
  --path deep_diagnostic.cjs \
  --path delete_55.cjs \
  --path delete_financial_55.cjs \
  --path find_and_delete_55.cjs \
  --path find_test_data.mjs \
  --path diagnostic.cjs \
  --path inativar.cjs \
  --path inspect_appts.cjs \
  --path inspect_schema.mjs \
  --path get_profs.cjs \
  --path test_db.mjs \
  --path test_history.cjs \
  --path updateProfile.js \
  --path mutator.js \
  --path mutator2.js \
  --path run_filter.sh \
  --path scrub_history.sh \
  --invert-paths 2>&1 || {
    echo ""
    echo "ATENÇÃO: Se o erro for 'local is dirty', rode:"
    echo "  git stash && bash tasks/purge_secrets.sh"
    exit 1
  }

echo ""
echo "[3/6] Substituindo qualquer ocorrência residual de tokens nos arquivos..."
# Substitui URLs e tokens que possam ter escapado em outros arquivos
OLD_URL="SUPABASE_URL_EXPOSTA"   # substitua pelo valor que vazou
NEW_URL="https://YOUR_PROJECT_REF.supabase.co"
OLD_JWT="SUPABASE_ANON_KEY_EXPOSTA"   # substitua pelo valor que vazou
OLD_ADMIN_CODE="ADMIN_CODE_EXPOSTO"   # substitua pelo valor que vazou

# Verifica se algum arquivo rastreado ainda tem as credenciais
FOUND=$(git grep -l "$OLD_URL\|$OLD_JWT\|$OLD_ADMIN_CODE" 2>/dev/null || true)
if [ -n "$FOUND" ]; then
  echo "Arquivos com credenciais residuais encontrados:"
  echo "$FOUND"
  echo "Substituindo..."
  for f in $FOUND; do
    sed -i "s|$OLD_JWT|REMOVED_SEE_ENV|g" "$f"
    sed -i "s|$OLD_URL|$NEW_URL|g" "$f"
    sed -i "s|$OLD_ADMIN_CODE|YOUR_ADMIN_SETUP_CODE|g" "$f"
  done
  git add $FOUND
  git commit -m "security: remove residual credentials from tracked files"
fi

echo ""
echo "[4/6] Reconfigurando remote origin..."
REMOTE_URL=$(cat "$REPO/.git/config" 2>/dev/null | grep -A1 '\[remote "origin"\]' | grep url | awk '{print $3}' || true)
if [ -z "$REMOTE_URL" ]; then
  echo "Remote origin não encontrado. Configure manualmente com:"
  echo "  git remote add origin <URL_DO_SEU_REPO>"
else
  # filter-repo remove o remote — precisamos readicionar
  git remote add origin "$REMOTE_URL" 2>/dev/null || git remote set-url origin "$REMOTE_URL"
  echo "Remote reconfigurado: $REMOTE_URL"
fi

echo ""
echo "[5/6] Force-push para todas as branches no GitHub..."
echo "      ATENÇÃO: Isso reescreve a história pública!"
echo ""
read -p "Confirma force-push? (s/N): " confirm
if [[ "$confirm" =~ ^[sS]$ ]]; then
  git push origin --all --force
  git push origin --tags --force
  echo "✅ Force-push concluído!"
else
  echo "Force-push cancelado. Faça manualmente quando estiver pronto:"
  echo "  git push origin --all --force"
  echo "  git push origin --tags --force"
fi

echo ""
echo "[6/6] Verificação final..."
STILL_EXPOSED=$(git grep -r "OLD_PROJECT_REF\|$OLD_JWT" 2>/dev/null | grep -v ".git/" || true)
if [ -n "$STILL_EXPOSED" ]; then
  echo "⚠️  Ainda existem referências residuais:"
  echo "$STILL_EXPOSED"
else
  echo "✅ Nenhuma credencial exposta encontrada nos arquivos rastreados."
fi

echo ""
echo "======================================================="
echo "  PRÓXIMOS PASSOS OBRIGATÓRIOS:"
echo ""
echo "  1. Rotacione a SUPABASE_ANON_KEY:"
echo "     → Painel Supabase > Settings > API > Regenerate anon key"
echo ""
echo "  2. Gere novo ADMIN_SETUP_CODE e atualize o banco:"
echo "     → Execute o SQL em tasks/rotate_admin_code.sql"
echo "     → Atualize VITE_ADMIN_SETUP_CODE no seu .env local"
echo ""
echo "  3. Rotacione a MERCADOPAGO_PUBLIC_KEY:"
echo "     → Painel MercadoPago > Credenciais > Criar nova chave"
echo "     → Atualize VITE_MERCADOPAGO_PUBLIC_KEY no seu .env local"
echo ""
echo "  4. Notifique colaboradores do force-push"
echo "     → Eles precisarão clonar o repo do zero ou fazer:"
echo "       git fetch --all && git reset --hard origin/<branch>"
echo "======================================================="
