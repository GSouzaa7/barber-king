# Barber King — Plano de Remediação de Segurança

> **Data da varredura:** 2026-04-07
> **Gravidade máxima:** 🔴 CRÍTICA

---

## Resumo do Diagnóstico

| # | Severidade | Problema | Status |
|---|-----------|---------|--------|
| 1 | 🔴 CRÍTICO | `.env` com credenciais reais commitado no histórico git (origin/main + origin/versoes) | ⏳ Requer ação |
| 2 | 🔴 CRÍTICO | `VITE_ADMIN_SETUP_CODE` exposto — qualquer pessoa pode criar conta admin | ⏳ Requer ação |
| 3 | 🟠 ALTO | Supabase Anon Key e URL expostos (acesso ao banco de dados) | ⏳ Requer ação |
| 4 | 🟡 MÉDIO | Mercado Pago TEST key exposta | ⏳ Requer ação |
| 5 | 🟡 MÉDIO | ~30 scripts de debug/diagnóstico rastreados no git (alguns leem o .env) | ✅ .gitignore atualizado |
| 6 | 🟢 BAIXO | Scripts de patch/fix soltos rastreados no git | ✅ .gitignore atualizado |

**O que está OK:**
- ✅ Nenhuma credencial hardcoded nos arquivos `.ts`/`.tsx` de source
- ✅ `lib/supabase.ts` usa corretamente `import.meta.env.*`
- ✅ `AdminSetup.tsx` usa `import.meta.env.VITE_ADMIN_SETUP_CODE` (não hardcodado)
- ✅ RLS ativo, RPCs validadas server-side
- ✅ `.gitignore` corretamente configurado para novos commits

---

## Credenciais Expostas

As seguintes credenciais estão no histórico público do GitHub:

| Variável | Valor exposto | Commits afetados |
|---------|--------------|-----------------|
| `VITE_SUPABASE_URL` | `[REDACTED — rotacionado 2026-04-07]` | ~15+ commits |
| `VITE_SUPABASE_ANON_KEY` | `[REDACTED — rotacionado 2026-04-07]` | ~15+ commits |
| `VITE_ADMIN_SETUP_CODE` | `[REDACTED — rotacionado 2026-04-07]` | ~10+ commits |
| `VITE_MERCADOPAGO_PUBLIC_KEY` | `[REDACTED — rotacionado 2026-04-07]` | ~10+ commits |

> **Risco do ADMIN_SETUP_CODE exposto:** Qualquer pessoa pode ir na URL `/admin/setup`,
> inserir o código `[REDACTED]` e se tornar administrador do sistema.

---

## Plano de Ação (Executar em Ordem)

### PASSO 1 — URGENTE: Rotacionar o ADMIN_SETUP_CODE ⚠️ FAZER AGORA

```sql
-- Execute no Supabase → SQL Editor
-- Substitua 'NOVO_CODIGO' por uma string aleatória segura
-- (ex: rode no terminal: openssl rand -base64 24)

UPDATE app_settings
SET value = md5('NOVO_CODIGO'), updated_at = now()
WHERE key = 'admin_setup_code_hash';
```

Depois atualize o `.env` local:
```
VITE_ADMIN_SETUP_CODE="NOVO_CODIGO"
```

O arquivo completo está em: `tasks/rotate_admin_code.sql`

---

### PASSO 2 — URGENTE: Rotacionar a Supabase Anon Key

1. Acesse: https://supabase.com/dashboard → seu projeto
2. Vá em **Settings → API**
3. Clique em **Regenerate anon key**
4. Copie a nova chave
5. Atualize o `.env` local:
   ```
   VITE_SUPABASE_ANON_KEY="nova_chave_aqui"
   ```

> Nota: A anon key é publicamente exposta no frontend de qualquer forma (Supabase by design).
> O RLS protege os dados, mas a chave antiga pode ser usada para fazer requests abusivos.

---

### PASSO 3 — Rotacionar a Mercado Pago Key

1. Acesse: https://www.mercadopago.com.br/developers/credentials
2. Crie novas credenciais TEST
3. Atualize o `.env` local:
   ```
   VITE_MERCADOPAGO_PUBLIC_KEY="TEST-nova_chave_aqui"
   ```

---

### PASSO 4 — Limpar o Histórico Git (DEPOIS de rotacionar as credenciais)

**Instalar git-filter-repo:**
```bash
pip install git-filter-repo
# ou no Mac:
brew install git-filter-repo
```

**Rodar o script de limpeza:**
```bash
# 1. Feche o Cursor/VS Code antes de rodar
# 2. Na pasta do projeto:
bash tasks/purge_secrets.sh
```

O script irá:
- Remover o `.env` de TODOS os commits de TODAS as branches
- Remover scripts de diagnóstico que liam o `.env`
- Force-push para o GitHub (reescreve a história pública)

**Alternativa manual (se o script falhar):**
```bash
git filter-repo --force --path .env --invert-paths
git remote add origin https://github.com/GSouzaa7/mvp_barbearia.git
git push origin --all --force
git push origin --tags --force
```

---

### PASSO 5 — Notificar Colaboradores

Após o force-push, qualquer clone local antigo vai estar desatualizado.
Instrua os colaboradores a rodarem:
```bash
git fetch --all
git reset --hard origin/<branch>
# ou clonar novamente do zero
```

---

### PASSO 6 — Verificação Final

Após todos os passos, confirme que o GitHub não tem mais as credenciais:
```bash
# Na pasta do projeto, após o force-push:
git log --all --oneline | while read hash msg; do
  if git show $hash:.env 2>/dev/null | grep -q "qbphakogylgjlprbuhal"; then
    echo "AINDA EXPOSTO em $hash"
  fi
done
echo "Verificação concluída"
```

---

## Arquivos Modificados por Esta Varredura

| Arquivo | Mudança |
|---------|---------|
| `.gitignore` | Adicionado: scripts debug, arquivos .txt temporários, dev-dist |
| `tasks/purge_secrets.sh` | NOVO: script de limpeza do histórico |
| `tasks/rotate_admin_code.sql` | NOVO: SQL para rotacionar o admin setup code |
| `tasks/SECURITY_FIX.md` | NOVO: este documento |
| `tasks/lessons.md` | ATUALIZADO: lição L-15 adicionada |

---

## Prevenção Futura

1. **Nunca commitar `.env`** — o `.gitignore` já está configurado, mas atenção ao criar novos projetos
2. **Scripts de debug** nunca devem ser commitados — agora bloqueados pelo `.gitignore`
3. **Antes de cada push:** rode `git diff --cached | grep -i "key\|secret\|token\|password"` para checar
4. **Considere usar:** [git-secrets](https://github.com/awslabs/git-secrets) ou [gitleaks](https://github.com/gitleaks/gitleaks) como hook de pre-commit
