# Homologação — banco e publicação — 12/11/2026

Atualização: backend de homologação agora **live no Render Free**, conectado a este database e validado com conta sintética. Compute habilitado em0,25CU para atender ao serviço solicitado. Implantada a branch codex/homologacao-abelha, sem trocar o checkout local ou publicar alterações locais. Estado atual e próximo passo: [RENDER-HOMOLOGACAO.md](RENDER-HOMOLOGACAO.md). Os detalhes de provisionamento abaixo registram a etapa anterior.

**Banco Neon isolado pronto. Alterações locais na main, sem novo commit ou push, para revisão e publicação manual pelo usuário.** Produção e n8n preservados; somente o novo serviço Render de homologação foi criado após autorização.

## Preparação local

- Base da main:248569753b3c7a8fd78676524426c2ef1f0e2eac. Todo o trabalho anterior foi preservado como alterações locais, sem incorporar commits de outra branch ao histórico da main.
- Fazer o commit pelo aplicativo após revisar os arquivos. Os arquivos privados em .abelha-homologacao/ permanecem ignorados e não devem ser incluídos.
- Commit e push são decisões manuais. **O push da main pode acionar os deploys de produção já configurados no Render/Vercel.** Confirmar a etapa de ativação antes de publicar.
- Histórico e referências remotas existentes foram preservados. Nenhuma exclusão ou reescrita remota ocorreu nesta preparação.

## Banco Neon provisionado

| Item | Alvo exato |
|---|---|
| Projeto existente / plano | MELAO CRM / curly-river-94350351 / free_v3 |
| Branch de teste existente | br-hidden-night-ace956m0 |
| Compute existente | ep-crimson-snow-acmuhqgp / ep-crimson-snow-acmuhqgp.sa-east-1.aws.neon.tech |
| Estado atual / limite | habilitado, suspensão automática por ociosidade, mínimo=máximo0,25CU |
| Database criado | abelha_homologacao / ID3074787 / owner neondb_owner |
| Role de aplicação | abelha_hml_app / read_write somente no database novo/public |
| Banco preservado | neondb da branch antiga |
| Produção fora do escopo | br-square-sunset-acpb91u2 / ep-wandering-pond-acitqqn8 |

O database novo foi criado vazio após autorização, sem copiar clientes, finanças, conversas, usuários ou credenciais existentes. O neondb clonado foi preservado. Não foram criados projeto, branch Neon, compute ou plano pago novos. O endpoint de teste foi habilitado apenas para o provisionamento e voltou a disabled=true/idle; uma nova reativação depende de autorização.

## Schema e validação

Arquivo: [bootstrap-empty.sql](../backend/src/db/homologation/bootstrap-empty.sql). Bloco DO atômico, executado em transação com lock_timeout=5s, statement_timeout=60s e search_path=public.

- Reaproveita apenas o DDL CREATE-only das13 tabelas da base e as migrations20261105_personal_crm.sql e20261111_personal_platform.sql. Não executa schema.sql, RESET, DROP ou seed comercial.
- Recusa database diferente de abelha_homologacao, schema diferente de public e banco com relações de usuário, inclusive fora de public. Reexecução em banco inicializado é recusada.
-35 tabelas confirmadas, incluindo18 do Personal, todas inicialmente vazias. Persistidas depois somente1 organização e1 usuário sintéticos; nenhum registro pessoal real usado.
- Conexão real da aplicação, senha bcrypt e INSERT/SELECT/UPDATE/DELETE de projeto sintético com rollback passaram. Todas as tabelas de negócio continuam vazias.
- Role com CRUD nas35 tabelas novas, sem CREATE de objetos/database, superuser, BYPASSRLS, CREATEDB, CREATEROLE ou membership neon_superuser.
- No neondb: zero das13 tabelas acessíveis por SELECT/INSERT/UPDATE/DELETE e sem CREATE. PUBLIC e roles existentes não foram alterados.
- Quatro regressões locais: criação completa vazia, recusa de database errado, preservação de banco utilizado e recusa de dados no schema pgapp. SHA-256 do bootstrap e das fontes no [manifesto](integrations/ativacao-branch-banco.json).

## Credenciais

- .abelha-homologacao/backend.env: DATABASE_URL exclusiva e restrita, AUTH_SECRET, ABELHA_INTEGRATION_TOKEN, GITHUB_WEBHOOK_SECRET e par VAPID novos; UUIDs sintéticos.
- .abelha-homologacao/credenciais-hml.json: login homologacao@abelha.example.invalid, senha aleatória/bcrypt e segredo de entrada n8n separado. Não versionar nem compartilhar em relatórios.
- AUTH_URL, FRONTEND_URL e VAPID_SUBJECT continuam vazios até definir URLs e contato de homologação. Evolution/preços não estão configurados.
- backend/.env foi preservado. As credenciais de produção não foram reutilizadas.

## Backend ativo e próximo passo

O serviço abelha-gestor-api-hml está live no Render Free, implantando a branch codex/homologacao-abelha/37f9898 com Auto-Deploy desligado. AUTH_URL, FRONTEND_URL e VAPID foram configurados apenas com os destinos/segredos de homologação. A adaptação de build/start com cd backend e health check TCP foi autorizada; GET /health200 e12 verificações remotas passaram.

Estado e instruções: [RENDER-HOMOLOGACAO.md](RENDER-HOMOLOGACAO.md). Próximo passo: BACKEND_URL somente no Vercel Preview, seguido de novo deployment apenas desse Preview quando autorizado. Produção/n8n permanecem sem alterações; nenhuma migration foi repetida. Alterações locais preservadas, sem commit ou push.
