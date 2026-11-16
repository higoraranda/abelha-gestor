# Exclusão confirmada de projetos — plano local

Escopo escolhido: preparar exclusão local com confirmação e testes; sem deploy, commit ou migration. A versão HML publicada responde404 a DELETE de projetos. As demais validações HML/n8n continuam separadas deste trabalho.

## Contrato

- DELETE `/api/v1/personal/projects/:id`, com sessão, header `X-Abelha-Client: web` e JSON `confirmation_name` exatamente igual ao nome atual do projeto.
- Buscar e bloquear o projeto por organização, usuário e ID. Owner diferente retorna404; confirmação ausente/divergente retorna400; ausência do header retorna403.
- Transação única: remover avisos desse owner com o destino exato do projeto ou a chave de um relatório pertencente ao projeto e remover o projeto. As FKs existentes removem marcos e atualizações (decisões/relatórios). Revisões semanais são snapshots históricos e permanecem. Não alterar o schema.
- Responder204 após sucesso. Nova tentativa retorna404. A UI volta à lista; erros permanecem no diálogo, sem simular sucesso.
- Usar Modal, tipografia e tokens atuais. Ação secundária destrutiva no detalhe, nome digitado, aviso claro das informações removidas, cancelar seguro, estado ocupado e recuperação de erro. Nenhum redesign.

## Implementação e evidências

- [x] `backend/src/services/project-deletion.test.ts`:404 reproduzido antes da implementação; confirmação, isolamento entre owners/organizações, cascatas, rollback após falha e preservação de outros projetos/avisos/finanças verificados.
- [x] `backend/src/routes/personal.ts`: contrato implementado com transação e bloqueio do projeto; teste verde.
- [x] `frontend/src/lib/projectDeletion.ts` e teste: confirmação antes de enviar, DELETE do cliente HTTP,204 e falhas sem evento de sucesso cobertos por três testes.
- [x] `frontend/src/pages/personal/PersonalProjects.tsx`: diálogo no detalhe e retorno à lista após204, com classes e Modal existentes; TypeScript/lint/build aprovados.
- [x] Suites locais:54 testes backend e32 frontend; TypeScript, lint e builds aprovados.
- [ ] Validação visual/interativa: Computer Use não inicializou. Pendente, sem declarar a navegação aprovada.
- [ ] Publicação e repetição do DELETE em HML: depende de autorização específica; alterações permanecem locais, sem commit/push/deploy.

O ensaio de regressão usa PostgreSQL em memória e dados sintéticos. Não repetir testes de escrita na produção nem tratar a ausência do DELETE no HML publicado como corrigida antes de um deploy autorizado.
