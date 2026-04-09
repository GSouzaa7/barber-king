#!/usr/bin/env bash
# =============================================================================
# fresh_repo.sh — Barber King
# Cria um repositório git totalmente limpo a partir do código atual.
# Nenhum histórico antigo, nenhuma credencial.
#
# PRÉ-REQUISITOS:
#   1. Crie o novo repositório VAZIO no GitHub antes de rodar este script
#      (ex: github.com/GSouzaa7/barber-king — sem README, sem .gitignore)
#   2. Feche o Cursor (ou qualquer IDE com o projeto aberto)
#   3. Abra um terminal na pasta do projeto
#   4. bash tasks/fresh_repo.sh
# =============================================================================
set -e

NOVO_REPO="${1:-}"

echo "======================================================="
echo "  Barber King — Criação de Repositório Limpo"
echo "======================================================="
echo ""

# Pedir URL do novo repo se não for passada como argumento
if [ -z "$NOVO_REPO" ]; then
  read -p "URL do NOVO repositório GitHub (ex: https://github.com/GSouzaa7/barber-king.git): " NOVO_REPO
fi

if [ -z "$NOVO_REPO" ]; then
  echo "ERRO: URL do repositório é obrigatória."
  exit 1
fi

echo ""
echo "Novo repositório: $NOVO_REPO"
echo ""

# --- Confirmação ---
read -p "Confirma? Isso vai APAGAR o .git atual e criar um histórico novo. (s/N): " confirm
if [[ ! "$confirm" =~ ^[sS]$ ]]; then
  echo "Cancelado."
  exit 0
fi

echo ""
echo "[1/5] Removendo histórico git antigo..."
rm -rf .git
echo "      ✅ .git removido"

echo ""
echo "[2/5] Inicializando novo repositório limpo..."
git init -b main
git config user.email "info.souza7@gmail.com"
git config user.name "Gabriel"
echo "      ✅ git init concluído"

echo ""
echo "[3/5] Verificando .gitignore..."
# Garantir que .env está bloqueado
if ! grep -q "^\.env$" .gitignore 2>/dev/null; then
  echo ".env" >> .gitignore
  echo "      ⚠️  .env adicionado ao .gitignore"
else
  echo "      ✅ .env já está no .gitignore"
fi

# Confirmar que .env NÃO será commitado
if [ -f ".env" ]; then
  echo "      ℹ️  .env existe localmente mas está protegido pelo .gitignore"
fi

echo ""
echo "[4/5] Staging dos arquivos de código fonte..."
git add .

# Verificar que .env não foi adicionado por engano
if git diff --cached --name-only | grep -q "^\.env$"; then
  echo "      ⚠️  ATENÇÃO: .env foi adicionado por engano — removendo do stage..."
  git rm --cached .env 2>/dev/null || true
fi

echo "      Arquivos a commitar:"
git diff --cached --name-only | grep -v node_modules | head -20
TOTAL=$(git diff --cached --name-only | wc -l)
echo "      ... total: $TOTAL arquivos"
echo "      ✅ Stage concluído"

echo ""
echo "[5/5] Primeiro commit limpo..."
git commit -m "$(cat <<'EOF'
feat: initial commit — Barber King v1.0

Sistema de gestão para barbearia
Stack: React + TypeScript + Vite + Supabase + Tailwind CSS

Repositório recriado sem histórico de credenciais expostas.
EOF
)"

echo ""
echo "Configurando remote origin..."
git remote add origin "$NOVO_REPO"

echo ""
echo "Push para o GitHub..."
git push -u origin main

echo ""
echo "======================================================="
echo "  ✅ REPOSITÓRIO LIMPO CRIADO COM SUCESSO!"
echo ""
echo "  Próximos passos:"
echo "  1. No GitHub: Settings > Branches > definir main como padrão"
echo "  2. Atualizar o CLAUDE.md com o novo repo URL"
echo "  3. Certifique-se que o .env local tem as credenciais atualizadas:"
echo "     - VITE_ADMIN_SETUP_CODE: SEU_ADMIN_SETUP_CODE_ATUAL"
echo "     - VITE_SUPABASE_ANON_KEY: regenerar no painel Supabase"
echo "     - VITE_MERCADOPAGO_PUBLIC_KEY: regenerar no painel MercadoPago"
echo "======================================================="
