# tasks/todo.md — Barber King

> Orquestrado por @aiox-master (Orion) | 2026-03-29
> Pipeline ADE executado para: **Fix Auth — Prioridade #1**

---

## Feature: Fix Auth (localStorage → Supabase Auth)

**Status geral:** ✅ CONCLUÍDO — 2026-03-29
**BLOCKERs identificados:** 4 (@cypher) | **Plano criado:** @architect (Aria)

---

### PASSO 1 — Criar tabela `profiles` no Supabase SQL Editor
- [ ] Adicionar CREATE TABLE profiles em `supabase/schema.sql`
- [ ] Adicionar função `handle_new_user()` + trigger `on_auth_user_created`
- [ ] Rodar o SQL no Supabase Studio
- [ ] Verificar: `SELECT * FROM profiles` retorna sem erro
- **Risco:** Baixo | **Blocker corrigido:** #2 (tabela inexistente)

### PASSO 1.5 — Migrar usuários existentes para `profiles`
- [ ] Rodar script de migração (INSERT INTO profiles FROM auth.users)
- [ ] Confirmar que admin tem `role = 'admin'` e `status = 'approved'`
- **Risco:** Baixo | **Por quê:** sem isso, admins perdem acesso no Passo 3

### PASSO 2 — Substituir RLS permissivo por políticas granulares
- [ ] Dropar todas as policies `auth_all` nas 10 tabelas
- [ ] Criar funções helper `auth_role()` e `auth_status()`
- [ ] Criar policies granulares por tabela (ver plano do @architect)
- [ ] Testar: barber aprovado acessa `appointments` ✓ | cliente não acessa `financial_records` ✓
- **Risco:** Médio | **Blocker corrigido:** #3 (dados expostos)

### PASSO 3 — Reescrever `contexts/AuthContext.tsx`
- [ ] Remover leitura de `role` de `user_metadata`
- [ ] `role` e `status` somente via fetch da tabela `profiles`
- [ ] `loading` só vira `false` APÓS o fetch do profile completar
- [ ] Testar: login admin → role = 'admin' no contexto
- [ ] Testar: barber pending → redirect para /pending-access
- **Risco:** Médio | **Blocker corrigido:** #1 (user_metadata controlado pelo cliente)

### PASSO 4 — Corrigir race condition em `App.tsx`
- [ ] `RequireApproval`: tratar `status === null` como pending (fail-safe)
- [ ] Testar: Slow 3G → spinner durante fetch, sem conteúdo exposto
- [ ] Testar: `/client/dashboard` sem sessão → redirect para login
- **Risco:** Baixo | **Blocker corrigido:** #4 (race condition)

---

## Features concluídas

| # | Feature | Status |
|---|---------|--------|
| 1 | Fix Auth (localStorage → Supabase Auth) | ✅ 2026-03-29 |
| 2 | Integração Supabase (mocks → API real) | ✅ 2026-03-30 |
| 3 | Booking flow real (Agenda + colunas DB) | ✅ 2026-03-30 |

## Próximas features (backlog)

| # | Feature | Aguardando |
|---|---------|-----------|
| 4 | Portal da Secretaria | Cliente definir funcionalidades |
| 5 | Notificações in-app | — |
| 6 | Programa de Fidelidade | — |
| 7 | Financeiro avançado (comissões por atendimento) | — |
