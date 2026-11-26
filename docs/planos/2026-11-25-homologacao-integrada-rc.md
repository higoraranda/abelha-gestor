# Homologação integrada do candidato — plano de execução

Objetivo: executar o Prompt 03.1 no checkout existente, com frontend/backend reais e Neon HML, sem publicar ou repetir migrations.

Arquitetura: processos limitados a loopback, banco abelha_homologacao e role abelha_hml_app; contas sintéticas identificadas por rodada; adaptador de e-mail simulado e bloqueio de saídas externas. Fixtures e limpeza por IDs da rodada, com fingerprints antes/depois.

Escopo: manifesto original working-tree-sha256:2bbfdc06251aa323807213fa512481899de12c2bb5a33d9bfdae07547aaf75c1. Nenhum commit, push, branch nova, produção, migration ou integração externa.

- [x] Conferir Git, vínculo do chat, manifesto original e conexão efetiva; registrar baseline do banco.
- [x] Reexecutar autorização HTTP sobre PostgreSQL real, completar positivos aplicáveis e isolamento por recurso sem equiparar 403 de papel a isolamento.
- [x] Exercitar navegador desktop/mobile: contas/convites/e-mail simulado, recuperação, módulos, navegação, preferências, CRUD e cache; registrar limites observados.
- [x] Validar limitador SQL compartilhado em configuração HML, PWA, modo escuro, carregamento e Kanban; executar regressão local.
- [x] Limpar somente fixtures da rodada, comparar todas as tabelas e encerrar processos/portas.
- [x] Atualizar matriz, roadmap, relatório, manifesto derivado e memória duradoura; parar antes de publicação/integrações.

Critérios: PASS exige evidência executada; FAIL descreve comportamento reproduzido; BLOCKED identifica dependência que não foi comprovada. Testes locais descartáveis não substituem HML real. Produção não participa como fixture.

Decisão: execução contínua na branch existente, conforme autorização expressa. Plano não solicita nova autorização para testes e limpeza já autorizados.
