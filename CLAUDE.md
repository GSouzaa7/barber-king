# CLAUDE.md — ANTIGRAVITY (Barber King)

---

> ## ⚠️ PRIMEIRA AÇÃO OBRIGATÓRIA — TODA SESSÃO
>
> **Antes de qualquer resposta ou ação, execute SEMPRE:**
>
> 1. Leia este arquivo (`CLAUDE.md`) do início ao fim
> 2. Leia `tasks/lessons.md` para revisar erros anteriores
> 3. Confirme internamente: *"Li o CLAUDE.md e o lessons.md desta sessão"*
>
> **Nunca pule esta etapa.** Ignorar as lições registradas causa regressão de bugs já corrigidos.

---

## Projeto

**Nome:** Barber King — Sistema de Gestão para Barbearia
**Stack:** React + TypeScript + Vite + Supabase + Tailwind CSS
**GitHub:** GSouzaa7/barber-king
**Branch ativa:** main | **Branch principal:** main

## Squad de Agentes

Squad completo disponível em `aios-fullstack-squad/`.
Agentes ativados com `@nome`:

| Agente | Nome | Papel |
|--------|------|-------|
| @aiox-master | Orion | Orquestrador principal |
| @pm | Kai | Product management |
| @architect | Aria | Arquitetura |
| @dev | Dex | Desenvolvimento |
| @qa | Quinn | Quality assurance |
| @cypher | Vex | Cybersegurança |
| @data-engineer | Dara | Dados / Supabase |
| @ux-design-expert | Uma | UX/UI |
| @analyst | Zara | Pesquisa e análise |
| @sm | River | Scrum master / Stories |
| @sentinel | Sage | Evolução contínua |

Definições completas: `aios-fullstack-squad/.aios-core/development/agents/`

## Pipeline ADE (ordem padrão)

```
1. @pm         *gather-requirements
2. @architect  *assess-complexity
3. @analyst    *research-deps
4. @pm         *write-spec
5. @cypher     *threat-model
6. @qa         *critique-spec
7. @architect  *create-plan
8. @sm         *create-stories
9. @dev        *execute-subtask
10. @cypher    *scan-code
11. @qa        *review-build
12. @sentinel  *session-report
```

## Prioridades Atuais

| # | Feature | Agentes | Status |
|---|---------|---------|--------|
| 1 | ~~Fix auth (localStorage → Supabase Auth)~~ | @cypher + @dev | ✅ Concluído (2026-04-06) |
| 2 | Integração Supabase (mocks → API real) | @data-engineer + @dev | 🔓 Desbloqueado |
| 3 | Booking flow real | @dev | Pendente |
| 4 | Portal da Secretaria | @dev + @ux-design-expert | Aguardando cliente |
| 5 | ClientProfile.tsx — integração real | @dev | Pendente (dados mock ainda ativos) |
| 6 | Notificações in-app | @dev | Backlog |
| 7 | Programa de Fidelidade | @dev | Backlog |
| 8 | Financeiro real | @dev + @data-engineer | Backlog |

## Task Management

1. **Plan First** — Escreva o plano em `tasks/todo.md` com itens verificáveis
2. **Verify Plan** — Confirme antes de começar a implementação
3. **Track Progress** — Marque itens como concluídos conforme avança
4. **Explain Changes** — Resumo de alto nível a cada etapa
5. **Document Results** — Adicione seção de revisão no `tasks/todo.md`
6. **Capture Lessons** — Atualize `tasks/lessons.md` após correções

## Workflow Orchestration

### 1. Plan Mode Default

- Entre em modo de planejamento para QUALQUER tarefa não trivial (3+ passos ou decisões arquiteturais)
- Se algo der errado: PARE e replaneie imediatamente — não continue empurrando
- Use o modo de planejamento também para etapas de verificação, não só para construção
- Escreva especificações detalhadas antes de começar, para reduzir ambiguidade

### 2. Subagent Strategy

- Use subagentes liberalmente para manter o contexto principal limpo
- Delegue pesquisa, exploração e análise paralela para subagentes
- Para problemas complexos: use mais capacidade computacional via subagentes
- Um subagente por tarefa — foco total

### 3. Self-Improvement Loop

- Após QUALQUER correção do usuário: registre o padrão em `tasks/lessons.md`
- Escreva regras para si mesmo que previnam o mesmo erro
- Itere nessas lições até a taxa de erros cair
- Revise as lições no início de cada sessão

### 4. Verification Before Done

- Nunca marque uma tarefa como concluída sem provar que funciona
- Compare o comportamento antes e depois das suas mudanças
- Pergunte a si mesmo: "Um engenheiro sênior aprovaria isso?"
- Execute testes, verifique logs, demonstre que está correto

### 5. Demand Elegance (Balanced)

- Para mudanças não triviais: pause e pergunte "existe uma forma mais elegante?"
- Se uma solução parecer improvisada: "Sabendo tudo que sei agora, implemente a solução elegante"
- Pule isso para correções simples e óbvias — não complique
- Questione seu próprio trabalho antes de apresentar

### 6. Autonomous Bug Fixing

- Quando receber um relatório de bug: apenas corrija. Sem pedir ajuda a cada passo
- Aponte para logs, erros, testes falhando — então resolva
- Zero troca de contexto necessária do usuário
- Corrija testes CI falhando sem precisar ser instruído

## Core Principles

- **Simplicity First** — Faça cada mudança o mais simples possível. Impacte o mínimo de código.
- **No Laziness** — Encontre causas raiz. Sem correções temporárias. Padrão de engenheiro sênior.
- **Minimal Impact** — Mudanças devem tocar apenas o necessário. Evite introduzir novos bugs.

---

## Regras de Segurança (aprendidas em produção)

> Estas regras são resultado de code review e correções reais. **Nunca viole.**

### Auth & Roles
- **NUNCA** ler `user_metadata` para verificar `role` ou `status` em guards de rota — usar sempre `profiles` (tabela server-side protegida por RLS)
- **NUNCA** enviar `role: 'admin'` no `signUp` do frontend — usar RPC `promote_to_admin` protegida por hash
- Trigger `handle_new_user`: whitelist de roles — aceita só `'barber'` e `'sec'` do metadata; qualquer outro valor (incluindo `'admin'`) → `'client'`
- `RequireApproval` deve bloquear **`pending` E `rejected`** — não apenas `pending`
- `PendingAccess.tsx`: checar `status === 'rejected'` (não `'denied'`)

### Operações de Staff (Aprovação / Revogação)
- **NUNCA deletar** perfil de funcionário — usar soft-deactivation (`status = 'rejected'`)
- Toda aprovação/revogação passa pela RPC `update_staff_status` (valida caller=admin, alvo≠admin)
- Admin nunca pode ser revogado via fluxo normal de staff

### RPCs e Banco
- `complete_checkout`: sempre validar `AND matriz_id = p_matriz_id` no UPDATE para evitar acesso cross-unit
- `setLoading(false)` sempre em bloco `finally` — nunca após `await` sem try/catch
- Erros de fetch Supabase nunca devem ser silenciados — sempre tratar `error` e expor estado na UI
- Operações financeiras: bloquear se `finalAmount === undefined` — nunca registrar R$0,00 por omissão

### Schema SQL
- `schema.sql` é a fonte de verdade — deve estar sempre sincronizado com as migrations aplicadas
- Toda migration deve ser idempotente: `IF NOT EXISTS`, `DROP POLICY IF EXISTS`, `ON CONFLICT`
- RLS deve estar ativo em **todas** as tabelas de negócio — verificar antes de deploy

### localStorage
- **NUNCA** armazenar PII (`name`, `email`, `phone`) em `localStorage`
- Preferências não-críticas aceitáveis: matriz selecionada (`bk_selected_matriz_id`), tema, dismiss de prompts
- Dados lidos do `localStorage` com `JSON.parse` devem ser validados antes de usar no estado

### GitHub — Regra Permanente (Nexus, guardian desta regra)
- **NUNCA** commitar arquivos `.env` ou qualquer variante (`.env.local`, `.env.production`, etc.)
- **NUNCA** escrever credenciais, tokens, chaves de API ou senhas diretamente em código-fonte
- **NUNCA** commitar scripts de debug/diagnóstico que leem credenciais do ambiente
- **Antes de qualquer push:** verificar `git diff --cached | grep -iE "key|secret|token|password|eyJ"` para detectar vazamentos
- **Ao criar novo projeto:** `.env` no `.gitignore` ANTES do primeiro commit — nunca retroativo
- **Se detectar vazamento:** rotacionar credenciais no painel PRIMEIRO, limpar histórico DEPOIS
- **Credenciais em documentação:** sempre redactar com `[REDACTED]` — nunca expor valores reais, nem "antigos"
- Histórico git contaminado deve ser tratado via branch órfã limpa (sem `--force` em histórico público sem revisão)

---

## Arquitetura de Segurança Atual (Supabase)

| Camada | Implementação |
|--------|--------------|
| Trigger signup | Whitelist: `barber`, `sec` → `pending`; resto → `client` / `approved` |
| Guard de rota | `RequireAuth` (role) + `RequireApproval` (pending/rejected) |
| Aprovação de staff | RPC `update_staff_status` — server-side, nunca deleta |
| Setup de admin | RPC `promote_to_admin` — valida hash MD5 do setup_code, impede múltiplos admins |
| Checkout | RPC `complete_checkout` — atômico, valida matriz_id, rollback automático |
| Tabela de config | `app_settings` — hash do setup_code, protegida por RLS (admin only) |
