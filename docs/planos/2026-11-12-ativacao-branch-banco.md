# Branch e banco de homologação — plano de preparação


**Goal:** Preservar as alterações na main local para commit manual e manter o banco isolado pronto para homologação.

**Architecture:** Reutilizar a branch Neon de teste existente, mantendo seu neondb intacto. Criar um database separado e vazio somente após autorização, com baseline CREATE-only e as duas migrations já existentes; aplicação usa nova role restrita. Nada de clone de registros, reset, seed comercial ou alteração de produção.

**Tech Stack:** Git/GitHub, Neon PostgreSQL18, PGlite, Node/TypeScript.

**Spec:** Pedido do usuário nesta etapa; docs/HOMOLOGACAO-INTEGRACAO.md passos1–2.

## Global Constraints

- Preservar os31 arquivos inicialmente alterados/não rastreados; não substituir conteúdo anterior.
- Sem commit/push, criação/reativação remota ou custos antes de autorização específica.
- Sem recurso pago, migration de produção, dados pessoais ou ativação n8n.
- Banco alvo proposto: abelha_homologacao em br-hidden-night-ace956m0; nunca neondb/branch production.
- Encerrar processos próprios e suspender/desativar compute temporário ao terminar eventual provisionamento autorizado.

## Review Focus

- Preservar todo o conteúdo funcional ao preparar as alterações na main.
- Bootstrap deve recusar nome de banco errado e banco já utilizado antes de qualquer DDL.
- Banco vazio deve receber o schema CRM completo e18 tabelas Personal, sem clientes/valores/credenciais de produção.
- Credencial da aplicação deve ser read_write apenas no database novo, sem neon_superuser.
- Publicação da main pode disparar deploys de produção; manter commit/push manuais.

## Tarefas

- [x] Ler documentação/relatórios/Git, consultar metadados GitHub/Neon apenas por metadados, confirmar main2485697 e compute teste disabled/idle Free.
- [x] Preparar o trabalho na main local, preservando as alterações e sem novo commit/push.
- [x] Adicionar SQL de bootstrap explícito para database vazio; reaproveitar DDL e migrations existentes, sem executar schema.sql.35 tabelas/18 Personal/zero registros, quatro regressões aprovadas; wildcard de schema corrigido após revisão.
- [x] Registrar configuração/ações remotas exatas,36 arquivos revisáveis e credenciais novas apenas em arquivos privados ignorados.53 testes backend/16 frontend, TypeScript/builds, lint e diff check aprovados. Ações A/B em docs/ATIVACAO-BRANCH-BANCO.md e manifesto; nenhum segredo versionável.
- [x] Apresentar separadamente autorização Neon e commit/push; ambas recebidas explicitamente. Provisionado database3074787/abelha_homologacao,35 tabelas/18 Personal, role restrita sem acesso ao neondb, identidade sintética e CRUD com rollback. Compute restaurado disabled/idle. Revisão e publicação da main serão feitas manualmente pelo usuário.
