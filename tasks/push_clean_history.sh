#!/usr/bin/env bash
# =============================================================================
# push_clean_history.sh
# Faz force-push da história limpa para o GitHub.
#
# EXECUTE ESTE SCRIPT NO TERMINAL DO SEU COMPUTADOR (não no Cursor):
#   1. Abra um terminal (PowerShell, Git Bash, etc.)
#   2. cd <pasta_do_projeto>
#   3. bash tasks/push_clean_history.sh
# =============================================================================
set -e
echo "=== Force-push do histórico limpo para o GitHub ==="
echo ""

# Confirma remote
echo "Remote atual:"
git remote get-url origin 2>/dev/null || echo "(remote não configurado)"
echo ""

# Verifica que as branches locais têm os novos hashes (sem .env)
MAIN_HASH=$(git rev-parse main 2>/dev/null || echo "N/A")
VERSOES_HASH=$(git rev-parse versoes 2>/dev/null || echo "N/A")
echo "main:   $MAIN_HASH"
echo "versoes: $VERSOES_HASH"
echo ""

# Confirmação
read -p "Confirma force-push de main e versoes para o GitHub? (s/N): " confirm
if [[ ! "$confirm" =~ ^[sS]$ ]]; then
  echo "Cancelado."
  exit 0
fi

git push origin main --force
git push origin versoes --force
echo ""
echo "✅ Force-push concluído!"
echo ""
echo "IMPORTANTE: Vá ao GitHub → Settings → Branches e verifique se"
echo "a branch main e versoes estão com os novos commits (sem .env)."
