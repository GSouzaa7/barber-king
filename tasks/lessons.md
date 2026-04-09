# tasks/lessons.md — Barber King

> Registro de lições aprendidas para prevenção de erros futuros.
> Atualizado pelo @sentinel (Sage) após cada correção.

---

## Sessão 2026-03-29

### L-01 — Não confiar em `user_metadata` para autorização
**Erro:** `role` e `status` lidos de `user_metadata` que é controlado pelo próprio usuário via SDK.
**Regra:** `role` e `status` SEMPRE vêm de tabela server-side (`profiles`) protegida por RLS. Nunca de `user_metadata`.
**Aplica em:** qualquer guard de rota, qualquer verificação de permissão.

### L-02 — `loading` deve esperar o fetch do DB
**Erro:** `setLoading(false)` chamado antes do fetch de `profiles` completar, criando janela de bypass.
**Regra:** em qualquer contexto de auth, `loading = false` só após todas as queries de perfil retornarem.
**Aplica em:** `AuthContext`, qualquer provider de autenticação.

### L-03 — RLS `USING (true)` é porta aberta
**Erro:** todas as tabelas tinham `USING (true)` — qualquer autenticado lia/escrevia tudo.
**Regra:** nunca subir schema para produção com `USING (true)` em tabelas de negócio. Mínimo: filtrar por `auth.uid()` ou por role via função helper.
**Aplica em:** qualquer migration SQL antes de ir para produção.

### L-04 — Schema deve estar sincronizado com código
**Erro:** `AuthContext` fazia query em `profiles` que não existia no schema, fazendo o código falhar silenciosamente.
**Regra:** antes de qualquer deploy, confirmar que todas as tabelas referenciadas no código existem no `schema.sql` e no banco.
**Aplica em:** revisão de PR, checklist pré-deploy.

---

## Sessão 2026-04-01

### L-05 — Dados fictícios em estado inicial criam falsa sensação de funcionamento
**Erro:** `Settings.tsx` inicializava estados com dados hardcoded (nomes, telefones, comissões mock) e persistia em `localStorage`, dando impressão de sistema funcionando enquanto nenhum dado real era lido.
**Regra:** estados de UI devem começar vazios (`''`, `[]`, `null`) e serem populados exclusivamente via Supabase. `localStorage` só para preferências não-críticas (ex: matriz selecionada).
**Aplica em:** qualquer componente que exiba dados de negócio.

### L-06 — Contextos existentes devem ser reutilizados
**Erro:** ao integrar um novo componente, tendência de criar novo fetch de `matrizId` ao invés de usar `useMatriz()` já disponível.
**Regra:** antes de criar novo fetch/estado, verificar se `AuthContext` ou `MatrizContext` já expõem o dado necessário.
**Aplica em:** qualquer página admin que precise de `matrizId` ou `user`.

### L-07 — Migração deve ser idempotente
**Regra:** toda migration SQL deve usar `IF NOT EXISTS`, `DROP POLICY IF EXISTS`, `ON CONFLICT DO UPDATE` para poder ser re-executada sem erros.
**Aplica em:** todos os arquivos `supabase/migration_*.sql`.

---

## Sessão 2026-04-06 — Code Review + Security Sprint

### L-08 — Hardcodar 'client' no trigger quebra cadastro de barbeiros
**Erro:** ao tentar bloquear privilege escalation via `'admin'`, hardcodamos `'client'` no trigger — isso impediu que barbeiros e secretarias fossem criados com o role correto.
**Regra:** usar **whitelist**: aceitar `'barber'` e `'sec'` do metadata (ficam `pending` e precisam de aprovação); bloquear `'admin'` e qualquer outro valor, caindo para `'client'`.
**Aplica em:** `handle_new_user`, qualquer lógica de signup.

### L-09 — `RequireApproval` deve bloquear 'rejected', não só 'pending'
**Erro:** `RequireApproval` verificava apenas `status === 'pending'`. Um funcionário com acesso revogado (`rejected`) continuava acessando o dashboard normalmente.
**Regra:** `RequireApproval` deve bloquear `pending` **e** `rejected`. Fail-safe: qualquer status não reconhecido → sem acesso.
**Aplica em:** `App.tsx`, qualquer guard de rota baseado em status.

### L-10 — `PendingAccess.tsx` checava 'denied' mas o valor real é 'rejected'
**Erro:** a tela de acesso pendente verificava `status === 'denied'`, que nunca existe no banco — o valor real é `'rejected'`. A mensagem de "Acesso Negado" nunca aparecia para usuários revogados.
**Regra:** sempre alinhar os valores de status no frontend com os valores reais do banco (`CHECK` constraint do schema). Verificar o schema antes de comparar strings de status.
**Aplica em:** qualquer componente que renderize condicionalmente baseado em `status`.

### L-11 — Operações de status de usuário devem passar por RPC, não update direto
**Erro:** `updateUserStatus` fazia `supabase.from('profiles').update()` diretamente, sem validar server-side que o alvo não é admin e que nenhum perfil seria deletado.
**Regra:** toda operação de aprovação/revogação de staff deve usar RPC `update_staff_status` que valida: caller=admin, alvo≠admin, status∈whitelist, nunca deleta.
**Aplica em:** qualquer operação administrativa sobre perfis de usuário.

### L-12 — Nunca deletar perfis de funcionários (dados financeiros)
**Regra de negócio crítica:** ao desativar um funcionário, SEMPRE usar soft-deactivation (`status = 'rejected'`). Deletar o perfil pode causar FK violations em `financial_records`, `appointments` e `inventory_movements`.
**Aplica em:** qualquer operação de "remover" funcionário da UI.

### L-13 — `complete_checkout` deve validar que o appointment pertence à matriz
**Erro:** a RPC aceitava qualquer `p_appointment_id` sem checar se pertencia à `p_matriz_id` — um admin de unidade A poderia fechar atendimento da unidade B.
**Regra:** sempre adicionar `AND matriz_id = p_matriz_id` em operações cross-resource. Se `NOT FOUND`, lançar exceção para rollback automático.
**Aplica em:** qualquer RPC que opere sobre recursos de uma matriz específica.

### L-14 — Atualizar CLAUDE.md e lessons.md ao final de cada sessão
**Erro:** após uma sessão intensa de code review e correções, o CLAUDE.md não foi atualizado automaticamente — o usuário precisou solicitar explicitamente.
**Regra:** ao final de qualquer sessão com correções ou aprendizados, atualizar `tasks/lessons.md` e `CLAUDE.md` (prioridades, arquitetura, regras de segurança) sem precisar ser solicitado.
**Aplica em:** fim de qualquer sessão de trabalho.

---

## Sessão 2026-04-07 — Security Remediation (Exposed Keys)

### L-15 — Nunca commitar .env — mesmo que o .gitignore exista
**Problema:** O `.gitignore` estava correto (`.env` bloqueado), mas o arquivo `.env` foi commitado em commits anteriores — antes da regra ser adicionada ao `.gitignore`. Todos os commits antigos (`0e373d1` até `5de7916`) contêm a `.env` com chaves reais.
**Impacto:** `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_URL`, `VITE_ADMIN_SETUP_CODE` e `VITE_MERCADOPAGO_PUBLIC_KEY` ficaram públicos no GitHub.
**Pior caso:** Com `VITE_ADMIN_SETUP_CODE` exposto, qualquer pessoa pode se auto-promover a admin via `/admin/setup`.
**Regra:** Ao iniciar qualquer projeto com Supabase: criar `.env` → adicionar ao `.gitignore` → VERIFICAR `git status` → só então commitar. Nunca assumir que o `.gitignore` foi aplicado retroativamente.
**Aplica em:** setup inicial de todo projeto, revisão de PRs, onboarding de devs.

### L-16 — Scripts de debug/diagnóstico nunca devem ser commitados
**Problema:** ~30 scripts `.cjs`/`.mjs` de diagnóstico e manutenção (ex: `check_db.cjs`, `delete_55.cjs`, `cleanup_mock_data.mjs`) foram commitados. Muitos leem credenciais do `.env`. Mesmo que o `.env` em si não esteja no commit, a presença desses scripts revela o esquema de credenciais e metodologia interna.
**Regra:** Scripts de debug são ferramentas de desenvolvimento local, não artefatos do projeto. Devem estar no `.gitignore` desde o início. O `.gitignore` foi atualizado em 2026-04-07 para cobrir todos os padrões de scripts temporários.
**Aplica em:** criação de qualquer script de diagnóstico ou manutenção.

### L-17 — Após exposição de credenciais: rotacionar PRIMEIRO, limpar histórico DEPOIS
**Regra:** Quando credenciais são detectadas como expostas, a ordem correta é:
1. **ROTACIONAR as credenciais no painel** (invalida as chaves expostas imediatamente)
2. **Só então** limpar o histórico git
Se você limpa o histórico primeiro e só depois rotaciona, a janela de vulnerabilidade fica aberta por mais tempo.
**Aplica em:** qualquer incidente de segurança com exposição de credenciais.

### L-18 — .gitignore atualizado deve cobrir scripts temporários
**Mudança:** `.gitignore` expandido em 2026-04-07 para incluir padrões:
- `check_*.cjs`, `debug_*.mjs`, `delete_*.cjs`, `fix_*.cjs`, etc.
- Arquivos `.txt` temporários (erros, logs de output)
- `dev-dist/` (diretório de build de desenvolvimento)
**Regra:** Sempre revisar o `.gitignore` quando criar scripts temporários de debug/manutenção.
