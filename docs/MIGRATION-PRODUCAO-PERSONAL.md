# Preparação da migration de produção — 16/11/2026

**Atualização posterior: migration executada em16/11/2026, COMMIT confirmado.** Snapshot Free snap-silent-fog-acdvwgeu preservado;35 tabelas e92 índices. Personal, Leads e Templates tiveram leitura confirmada pelo usuário. [Resultado da execução](EXECUCAO-MIGRATION-PERSONAL.md). **Não executar o roteiro novamente.** As seções abaixo registram a preparação histórica e suas condições anteriores à autorização.

## Estado conferido antes da execução

| Componente | Estado confirmado |
|---|---|
| Git | main/`23c06ebd5a9ab9d2954fb16a9ae145bc91fe1fd6`, limpo no início |
| Vercel Production e alias público | READY, `23c06eb`, deployment `dpl_8fuqVWWywbfP8DYU8qh6jdqvNsjC` |
| Render Production | live, `2dcc9d0`, deployment `dep-dbt7f5mq1p3s73fjbq7g` |
| Render HML | live, Free, Auto-Deploy desligado, `40c179c` |
| Neon Production | projeto `curly-river-94350351`, branch `br-square-sunset-acpb91u2` / production, database `neondb` |
| Conexão de aplicação da migration | endpoint `ep-wandering-pond-acitqqn8`, host **direto** `ep-wandering-pond-acitqqn8.sa-east-1.aws.neon.tech`, role `neondb_owner` |
| PostgreSQL | produção e HML: `18.7 (a21afb5)` |
| Catálogo atual produção | 17 tabelas, 163 colunas, 53 índices, 87 constraints sem contar NOT NULL |
| Dados | contagens e SHA-256 canônicos das 17 tabelas iguais no início/fim da auditoria; nenhum registro comercial exportado ou alterado |

A correção de sessão nula já está na main e no frontend publicado; não foi reimplementada. Entre Render Production e main não há diferença backend. Entre HML e Production, a mudança backend é somente o alias de health/no-store; rotas, serviços e migration Personal são os mesmos.

Os agregados de preservação ficam em `.abelha-homologacao/`, ignorado pelo Git. O relatório público contém apenas resultados de igualdade, metadados e inventário. Nenhuma senha, token, conteúdo de cliente ou valor comercial foi incluído.

## Backup e ponto de restauração

- Projeto Free, `history_retention_seconds=21600`: janela configurada de **6 horas**. A branch é raiz/default/primary, ready, mas `protected=false`; essa configuração foi apenas consultada.
- Schema Diff histórico da própria branch em **16/11/2026 11:50 UTC / 08:50 Brasília** retornou sucesso e diff vazio contra o schema atual. Isso comprova acesso ao catálogo histórico nesse ponto; **não equivale a um ensaio de restauração dos dados**.
- Snapshots cadastrados: **zero**. Agendamento de snapshots: **vazio**. Não há ID de snapshot pronto para usar nesta execução.
- O ponto histórico expira conforme a retenção e o limite de mudanças; não é um backup permanente. Deve ser revalidado imediatamente antes de executar, sem reutilizar esta data como garantia futura.
- A documentação atual do [plano Neon](https://neon.com/docs/introduction/plans#snapshots) inclui **um snapshot manual no Free**, com histórico de até6h/1GB de mudanças. A ação proposta é criar esse snapshot antes da migration, sem upgrade; se a API exigir pagamento ou não houver quota, parar.

**Condição para execução:** criar `abelha-pre-personal-20261116` na branch de produção, no estado atual, esperar ficar pronto e validar origem/ID/estado via Neon. Manter esse backup após a operação. Nenhum snapshot foi criado nesta preparação. A restauração completa permanece não ensaiada e exige autorização separada se vier a ser necessária.

## Integridade e objetos esperados

Arquivo original: `backend/src/db/migrations/20261111_personal_platform.sql`.

SHA-256: `9812b2bd74acc1fb983318bab62590da6cf8e92a1536e85032fb8b604f84dcdb`.

Blob Git: `24bfbc07e10f11988d0bd93830fffc34be3adff8`, idêntico em `2485697` e na main atual. O hash também coincide com o relatório de12/11 e com o texto executado no ensaio PostgreSQL18.7. O arquivo original não foi alterado.

São **24 comandos aditivos**:18 CREATE TABLE IF NOT EXISTS e6 CREATE INDEX IF NOT EXISTS. Não há INSERT, UPDATE, DELETE, DROP, TRUNCATE, ALTER de coluna, seed ou reset no original. ON DELETE das FKs define comportamento de exclusões futuras; não executa exclusão ao criar o schema.

Tabelas novas:

| Área | Tabelas |
|---|---|
| Preferências e push | `personal_preferences`, `push_subscriptions`, `personal_notifications`, `personal_push_deliveries` |
| Projetos | `personal_projects`, `personal_milestones`, `personal_project_updates` |
| Faturas e metas | `personal_invoice_cycles`, `personal_invoice_entries`, `personal_monthly_plans` |
| Contas/assinaturas | `personal_subscriptions`, `personal_subscription_payments`, `personal_subscription_changes` |
| Preços | `personal_price_watches`, `personal_price_observations` |
| Revisões | `personal_weekly_reviews` |
| CRM | `crm_lead_candidates`, `crm_service_drafts` |

Índices explícitos: `users_org_identity`, `clients_org_identity`, `push_owner`, `personal_notifications_owner`, `personal_project_timeline`, `personal_prices_history`. **clients_org_identity já existe**, único/válido e com definição correta; será reutilizado.

Resultado ensaiado: **35 tabelas / 92 índices / 166 constraints sem contar NOT NULL**. Delta:18 tabelas,39 índices (34 de PK/UNIQUE e5 explícitos novos) e79 constraints, incluindo21 FKs novas. Todas as constraints e índices ficaram válidos. O total de FKs passa de28 para49.

## Dependências, permissões e riscos

- `organizations`, `users` e `clients` existem, com PKs e vínculos válidos; `organization_id` é NOT NULL em users/clients. A unicidade de organização/id foi conferida. `gen_random_uuid()` existe no PostgreSQL, sem instalar extensão.
- Zero triggers DML de usuário e zero event triggers habilitados foram encontrados em produção. As tabelas atuais pertencem a `neondb_owner`; esse papel tem CREATE/TEMP/USAGE necessários. Não há default grants de tabelas para PUBLIC nesse owner. O roteiro rejeita grants PUBLIC inesperados nas tabelas novas.
- As conexões de banco observadas em produção usam `neondb_owner`. O plugin Render não permite ler variáveis existentes; não foi extraído DATABASE_URL remoto. A validação final com o login da aplicação após COMMIT continua obrigatória. Não foi incluído GRANT genérico para compensar credencial desconhecida.
- FKs compostas impedem vínculos entre owners, mas **não são RLS**. O isolamento de leitura depende dos filtros/autenticação do backend, já cobertos pelos testes. Nenhuma conexão SQL deve ser fornecida ao frontend ou n8n.
- CREATE INDEX comum e criação de FKs podem bloquear gravações. O roteiro trava as17 tabelas CRM em `SHARE ROW EXCLUSIVE` para obter uma comparação exata antes/depois; SELECT comum continua permitido. Reservar uma janela de manutenção de até2min, evitar gravações nesse período e prever que chamadas de escrita concorrentes podem esperar ou expirar. A amostra inicial não encontrou locks; isso não garante ausência de disputa na execução. [Referência PostgreSQL de locks](https://www.postgresql.org/docs/18/explicit-locking.html).
- `lock_timeout=5s`, `statement_timeout=60s`, `transaction_timeout=120s` e `idle_in_transaction_session_timeout=30s`, todos locais à transação. O limite de transação encerra a sessão longa e provoca rollback. Não alterar configurações globais. [Referência dos timeouts](https://www.postgresql.org/docs/18/runtime-config-client.html).
- IF NOT EXISTS não compara definições existentes. O roteiro exige o hash do catálogo auditado e aborta se já houver aplicação parcial, schema diferente, alvo errado ou falta de autorização/backup.

## Ensaio equivalente e validações

No **Neon HML existente**, database `abelha_homologacao`, foi usado um schema descartável com as17 tabelas reconstruídas **somente a partir do catálogo de produção**, incluindo163 colunas, NOT NULL/defaults,53 índices e87 constraints. Nenhuma linha real foi copiada. Organizações, usuários, cliente, contrato, recebível e despesa eram sintéticos.

Passaram: aplicação do texto original, reexecução,35 tabelas esperadas, preservação das17 tabelas CRM sintéticas, rejeições de FKs entre organizações e usuários, validação dos índices/constraints/permissões, verificações finais do roteiro e detecção de alteração intencional de valor sintético. O rollback obrigatório removeu schema e fixtures. As35 contagens/hashes do public HML permaneceram iguais antes/depois de todos os ensaios; nenhum papel, branch ou compute novo foi criado.

Os bloqueios do roteiro foram conferidos em HML: sem aprovação, alvo incorreto e catálogo divergente foram rejeitados como esperado. O ensaio também detectou uma ambiguidade de variável no novo verificador SQL; ela foi corrigida e o verificador final passou no motor PostgreSQL, incluindo o caso de corrupção sintética. A migration original permaneceu intacta.

Validações atuais:

-53 testes backend;29 frontend; TypeScript, lint sem warnings e builds aprovados.
-40 verificações HTTP HML aprovadas, incluindo25 leituras autenticadas200, CSRF/cookies/login/logout, CORS e rejeições401/403. A primeira tentativa teve timeout em health; uma consulta posterior confirmou200 e a única repetição da suíte passou. Não foi comprovada a causa do timeout; é uma intercorrência de disponibilidade, não falha SQL.
- Personal/projetos, faturas/metas, assinaturas/contas, revisões, candidatos e templates/rascunhos: contratos HTTP e testes sintéticos compatíveis. Health produção, HML e proxy Vercel:200.
- Preços sem fonte continuam503 explícito na integração; nenhuma busca Overpass, cotação, envio WhatsApp, entrega push real ou ativação n8n nesta etapa. A instalação offline no Preview protegido permanece pendência própria.
- Não foi repetida navegação autenticada completa pela UI. O ensaio não comprova que as telas de produção já funcionam: elas continuam sem as18 tabelas até a execução autorizada.

Evidência estruturada: [audits/personal-migration-preflight-20261116.json](audits/personal-migration-preflight-20261116.json).

## Execução proposta — somente após autorização

1. Conferir novamente Git/hash original, deployments, branch/database/endpoint, catálogo, roles, triggers, quota Free e disponibilidade de recuperação. Suspender novas gravações pelo usuário durante a janela; não modificar Render/n8n para isso sem nova autorização.
2. Criar e validar o snapshot manual Free acima. Registrar ID, branch, instante/LSN e estado pronto. Se falhar ou houver custo, **não iniciar a migration**.
3. Pela conexão direta/Neon, iniciar **uma única transação**, com os limites acima. Informar os marcadores `abelha.production_migration_approval=personal-platform-20261116` e `abelha.backup_snapshot_id=<ID validado>`, somente após aprovação. Eles são travas contra execução acidental, não substituem autorização ou validação do snapshot na API.
4. Confirmar database/role/timeline/tenant; obter advisory lock e locks de tabelas. Revalidar o hash do catálogo. Registrar baseline de contagens/SHA-256 de todas as17 tabelas; isso inclui todos os campos de clientes, contratos, despesas e recebíveis, valores, IDs e estados.
5. Aplicar **somente o original**. Comparar baseline antes de COMMIT, exigir35 tabelas/92 índices/166 constraints, objetos válidos, novas tabelas vazias e permissões corretas. Qualquer diferença aborta tudo.
6. Confirmar COMMIT e registrar o resultado. Fazer consultas de catálogo e navegação com a sessão autorizada: Personal, Projetos, Faturas/Metas, Contas/Assinaturas, Revisões, Leads e Templates. Não criar lançamentos comerciais de teste nem ativar integrações opcionais.

Roteiros revisáveis: [preflight somente leitura](sql/personal-platform-preflight.sql) e [transação proposta](sql/personal-platform-apply.psql). O segundo recusa execução sem os marcadores e contém o corpo original idêntico. SHA-256 do roteiro: `1a235f8657a2ac3d07fa65bcec186093bf0336d5c5c4f72402ce5b79b14e1f44`.

O cliente psql não está disponível nesta máquina e o arquivo psql **não foi executado como cliente**. Suas verificações SQL foram ensaiadas no motor Neon. A alternativa pelo plugin usa35 statements em uma transação, separando os24 comandos originais para não enviar múltiplos comandos a um prepared statement. O manifesto privado preparado contém os alvos e condições; não o executar automaticamente nem incluir segredos ao versionar.

## Recuperação

- **Antes de COMMIT:** erro, timeout, lock ou verificação divergente implica ROLLBACK da transação inteira. A conexão deve encerrar/confirmar rollback, liberar locks e conferir o catálogo original de17 tabelas. Não continuar comandos em uma transação abortada e não executar schema.sql/bootstrap/reset/seed.
- **Resposta de COMMIT perdida:** parar e consultar o catálogo/estado da execução; não repetir nem desfazer automaticamente. Distinguir falha antes/depois do COMMIT antes de tomar outra ação.
- **Depois de COMMIT:** não apagar tabelas novas ou fazer DOWN automático. Preservar dados, diagnosticar a falha e manter o snapshot. Se recuperação for necessária, pedir autorização separada para restaurar o snapshot em branch isolada e validar antes de qualquer substituição da produção.
- Uma restauração integral da branch reverte **todos os bancos da branch** e exclui mudanças posteriores ao ponto escolhido; interrompe conexões. Não é merge. A escolha do ponto e eventual cutover exigem autorização específica e plano para preservar gravações posteriores. [Referência Neon](https://neon.com/docs/introduction/branch-restore).

## Ação proposta na preparação — executada posteriormente

**Criar um snapshot manual incluído no Free** chamado `abelha-pre-personal-20261116`, no projeto `curly-river-94350351`, branch `br-square-sunset-acpb91u2`, sem upgrade; validar seu estado e origem. **Somente se ficar pronto e os checks continuarem válidos**, aplicar `20261111_personal_platform.sql` de hash `9812b2bd…84dcdb` no database `neondb`, como `neondb_owner`, pelo endpoint direto `ep-wandering-pond-acitqqn8`, em uma transação com locks/verificações/limites descritos. Confirmar preservação e verificar a aplicação em leitura.

Essa ação incluiu uma breve indisponibilidade de gravações. **Não incluiu** deploy, commit, push, mudança de credenciais, ativação n8n, APIs opcionais, recurso pago ou restauração/substituição de produção. A autorização específica foi recebida e a execução está registrada no relatório acima. Este registro não autoriza uma nova aplicação nem restauração.
