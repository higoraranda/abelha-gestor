# Execução controlada — Abelha Personal — 16/11/2026

**Migration aplicada em produção e COMMIT confirmado.** Personal, Leads e Templates tiveram abertura autenticada confirmada pelo usuário após Ctrl+F5. Não repetir o roteiro de aplicação: o schema já está atualizado.

## Backup preservado

- Snapshot: **snap-silent-fog-acdvwgeu**.
- Nome: `abelha-personal-pre-migration-20261116-122850z`.
- Projeto: `curly-river-94350351`; origem: `br-square-sunset-acpb91u2`.
- Criado em16/11/2026 às12:29:04UTC /09:29:04Brasília, antes da migration.
- Manual, incluído na cota Free, materializado com33.226.752bytes. Criação/arquivamento finalizaram sem falhas; create/list/fetch conferiram ID e origem. A API não fornece um campo textual READY; a prontidão foi confirmada pela materialização e operações finalizadas.
- Sem expiração configurada: mantido até exclusão manual, conforme a política de snapshots manuais. O PITR do projeto continua com6h, separado da retenção deste snapshot. [Referência Neon](https://neon.com/docs/guides/backup-restore).
- Snapshot preservado após a migration. Não houve restauração nem ensaio de restore sobre produção.

## Alvo e execução

Database `neondb`, role `neondb_owner`, endpoint direto `ep-wandering-pond-acitqqn8`, sem pooler. Projeto Free confirmado, nenhuma contratação ou upgrade. Main local/Frontend Production23c06eb e Render Production2dcc9d0 preservados.

Original aplicado: `backend/src/db/migrations/20261111_personal_platform.sql`.

SHA-256: `9812b2bd74acc1fb983318bab62590da6cf8e92a1536e85032fb8b604f84dcdb`.

O hash do roteiro revisado também foi reconferido; seus24 comandos CREATE originais eram idênticos ao manifesto preparado. As únicas instruções adicionais foram os marcadores autorizados e as verificações transacionais previstas, mais a leitura do ID da transação/baseline para comprovação posterior. Não foram executados schema.sql, bootstrap, reset ou seed.

Preflight e conferência imediatamente anterior: catálogo idêntico ao revisado,17 tabelas,53 índices,87 constraints sem NOT NULL; zero locks de outras gravações, transações ociosas/preparadas e event triggers. O snapshot estava pronto antes do envio da migration.

Uma única transação, com `lock_timeout=5s`, `statement_timeout=60s`, `transaction_timeout=120s`, `idle_in_transaction_session_timeout=30s`, advisory lock e `SHARE ROW EXCLUSIVE` nas17 tabelas originais. Baseline capturado sob os locks; postflight executado antes de COMMIT.

- Transação: **71684**.
- Início:16/11/2026 às12:31:18UTC /09:31:18Brasília. Esse horário é o início da transação, não uma medição do instante exato do COMMIT.
- Resposta da operação: sucesso,18 tabelas novas e17 tabelas CRM verificadas.
- Prova independente posterior: **pg_xact_status('71684'::xid8) = committed**.
- Não houve erro de aplicação, dúvida de COMMIT, repetição, rollback ou restauração.

## Resultado estrutural e dados

| Verificação | Resultado |
|---|---|
| Tabelas | **35**, incluindo as18 novas |
| Índices | **92**, zero inválidos |
| Constraints sem contar NOT NULL | **166**, zero constraints inválidas inclusive nas verificações gerais |
| FKs | **49** |
| Permissões das18 tabelas novas | owner neondb_owner com SELECT/INSERT/UPDATE/DELETE |
| Advisory lock da migration | liberado |
| Dados das17 tabelas originais | contagens e SHA-256 iguais antes/depois |

A comparação cobre todos os campos das17 tabelas, incluindo clientes, contratos, despesas e recebíveis: IDs, valores, datas, estados e demais dados. Passou dentro da transação e em nova consulta pós-COMMIT. A comparação externa normaliza a representação de contagens bigint/JSONB; nenhum conteúdo divergiu. O baseline anterior ao snapshot também coincide com o baseline sob locks.

Agregados e recibo bruto ficam em `.abelha-homologacao/`, ignorado pelo Git. Nenhuma linha comercial foi exportada para relatório, memória ou Git, nem usada para criar transações de teste. A tabela temporária do baseline foi removida no COMMIT.

## Validação da aplicação em produção

- **40 verificações HTTP somente GET passaram**, nas origens Render e Vercel:4 respostas200 para health/sessão anônima e36 rejeições401 esperadas para rotas protegidas. Isso comprova disponibilidade pública e preservação da autenticação; não equivale a teste autenticado positivo dos handlers.
- **Validação autenticada manual:** o usuário confirmou “Todas abrem sem erro” para as áreas Personal, Leads e Templates, após atualizar a produção. Isso cobre a leitura dos módulos anteriormente bloqueados pelo schema e confirma o caminho frontend→API→banco atualizado em uso real. Não foram feitos cadastros, lançamentos, aprovações, pagamentos ou importações de teste em produção.
- A navegação autenticada automatizada não foi executada: Computer Use falhou ao inicializar, inclusive após reset. Não foram copiados cookies, fabricadas sessões ou contornadas proteções para substituir a sessão autorizada.
- Deploys Render/Vercel permanecem os mesmos, sem restart ou deploy. Não foi necessário publicar código para reconhecer as tabelas.
- Amostra Render após a execução: nenhum erro de tabela ausente/permissão ou exceção não tratada;66 ocorrências do aviso Auth.js de basePath já conhecido. Nenhuma alteração de auth foi feita. Vercel não retornou logs error/fatal na janela consultada de15min.
- Nenhuma falha nova apareceu nas verificações e na confirmação do usuário. Fluxos de escrita e todos os percursos internos do CRM não foram exercitados em produção; a preservação dos registros foi verificada por conteúdo.

## Pendências e continuidade

A estrutura necessária ao Personal e às novas áreas de Leads/Templates está liberada. Não repetir a migration. Os guards do roteiro preparado também rejeitam o catálogo já migrado.

Integrações opcionais permanecem fora desta execução: fonte real de preços, disponibilidade do Overpass, WhatsApp, push físico, instalação offline no Preview protegido e ensaio/ativação do motor n8n. Nenhuma delas foi ativada ou alterada aqui. Essas pendências não significam falha das tabelas recém-criadas.

Manter o snapshot. Qualquer recuperação após COMMIT exige autorização separada e análise das gravações posteriores: uma restauração integral pode sobrescrever mudanças de todos os bancos da branch. Não apagar tabelas novas como rollback automático.

Nenhum commit, push, merge, deploy, alteração de credencial/workflow ou recurso pago. O processo HTTP temporário terminou; nenhum servidor local novo foi mantido. Serviços persistentes e backup foram preservados conforme solicitado.

Preparação histórica: [MIGRATION-PRODUCAO-PERSONAL.md](MIGRATION-PRODUCAO-PERSONAL.md). Evidência estruturada da execução: [audits/personal-migration-execution-20261116.json](audits/personal-migration-execution-20261116.json).
