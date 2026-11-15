# Diagnóstico e estabilização — 14/11/2026

## Resultado e escopo

A causa compartilhada dos erros do Personal em **produção** é a ausência das 18 tabelas da migration `20261111_personal_platform.sql`. A mesma migration também cria `crm_lead_candidates` e `crm_service_drafts`, necessárias a leads e templates. A produção conserva 17 tabelas CRM; a homologação tem 35 tabelas, com acesso SELECT confirmado para `abelha_hml_app`.

Também foi reproduzido e corrigido **localmente** um erro independente: `/api/auth/session` devolve `200` com JSON `null` quando não há sessão, mas `getSession()` acessava `session.user` sem proteger o objeto nulo. Isso abria “Vamos reconectar” em vez do login. A correção aceita `null` e mantém erros de rede/servidor como falhas, sem convertê-los em logout.

Nenhuma migration, publicação, commit, push, mudança de credencial ou alteração n8n foi executada. Todas as alterações locais anteriores, README, imagens e documentação foram preservadas. A correção ainda não existe nos deployments publicados.

## Ambientes conferidos

| Camada | Produção | Homologação |
|---|---|---|
| Frontend Vercel | `abelha-gestor.vercel.app`, `40c179c` | Preview `abelha-gestor-bzjtcg3ka-higoraranda-gmailcoms-projects.vercel.app`, READY, `40c179c` |
| API Render | `abelha-gestor-api.onrender.com`, live, `4f78117` | `abelha-gestor-api-hml.onrender.com`, live, `40c179c` |
| Neon | `br-square-sunset-acpb91u2` / `neondb`, 17 tabelas | `br-hidden-night-ace956m0` / `abelha_homologacao`, 35 tabelas |

`git diff 4f78117 40c179c -- backend` não apresenta diferenças. A diferença de SHA do Render **não corresponde a uma diferença de código backend**. Republicar somente a API não cria as tabelas ausentes.

O proxy do build usa `/api` na própria origem. `VITE_API_URL` não escolhe o backend publicado. Preview exige `BACKEND_URL` HTTPS explícita e bloqueia o host conhecido de produção antes de encaminhar a requisição; os testes desta proteção passaram. As configurações remotas foram preservadas.

## Matriz de navegação em produção

Sessão fornecida manualmente pelo usuário. Apenas abertura/leitura das páginas; sem criar, editar, aprovar, pagar, enviar mensagem ou exportar registros comerciais. A mensagem observada é: **“O Abelha Personal aguarda a atualização autorizada do banco. Os dados do CRM foram preservados.”**

O `503` abaixo é o status definido pelo handler publicado para `42P01`/`42703`, correlacionado com o catálogo e a mensagem na UI. Não foi obtido um HAR autenticado nem medido esse status diretamente pelo navegador; não confundir essa correlação com captura Network. Os status de HML foram medidos por HTTP real.

| Tela/ação de leitura | Requisição principal | Resultado produção / causa | HML HTTP |
|---|---|---|---|
| Personal início | GET `/api/v1/personal/projects`, `/notifications` | Mensagem acima em dois painéis; tabelas ausentes, handler 503 | 200 em ambos |
| Projetos | GET `/api/v1/personal/projects` | Mesma mensagem; tabelas ausentes, handler 503 | 200 |
| Faturas e metas | GET `/api/v1/personal/finance` | Mesma mensagem; tabelas ausentes, handler 503 | 200 |
| Contas e assinaturas | GET `/api/v1/personal/subscriptions` | Mesma mensagem; tabelas ausentes, handler 503 | 200 |
| Preços | GET `/api/v1/personal/prices` | Mesma mensagem; tabelas ausentes, handler 503 | 200; provedor não configurado |
| Revisão semanal | GET `/api/v1/personal/reviews` | Mesma mensagem; tabelas ausentes, handler 503 | 200 |
| Ajustes e notificações | GET `/api/v1/personal/preferences`, `/notifications` | Mesma mensagem; tabelas ausentes, handler 503 | 200 em ambos |
| Leads: candidatos | GET `/api/v1/prospecting/leads/candidates` | Mesma mensagem; `crm_lead_candidates` ausente, handler 503 | 200 |
| Templates: rascunhos | GET `/api/v1/prospecting/drafts` | Mesma mensagem; `crm_service_drafts` ausente, handler 503 | 200 |
| Dashboard CRM | GET `/api/v1/crm/overview` | Abriu sem alertas | 200 |
| Clientes | GET `/api/v1/clients` | Abriu sem alertas | 200 |
| Entregas | GET `/api/v1/crm/tasks`, `/contracts` | Abriu sem alertas | 200 em ambos |
| Pipeline | GET `/api/v1/crm/opportunities` | Abriu sem alertas | 200 |
| Financeiro CRM | GET `/api/v1/finance/summary`, `/clients`, `/expenses`, `/receivables` | Abriu sem alertas | 200 nos quatro |
| Agenda | GET `/api/v1/reminders` | Abriu sem alertas | 200 |
| Conversas | GET `/api/v1/conversations` | Lista abriu sem alertas; nenhuma conversa aberta/marcada como lida | 200 |
| Relatórios | GET `/api/v1/crm/reports` | Abriu sem alertas | 200 |

Abrir uma tela sem alertas não equivale a aprovar todas as suas operações de escrita. Estas não foram executadas na produção. A suíte isolada existente cobre mutações e isolamento; nesta rodada, as chamadas remotas HML preservaram integralmente os dados de negócio.

## Evidências e testes desta rodada

- **53 testes backend**, compilação TypeScript e build aprovados. Incluem autenticação/CSRF/cookies seguros/sessão legada, contratos CRM, HTTP/SQL Personal com isolamento, migration aditiva com preservação e reexecução, validação de mutações e tratamento de integrações.
- **20 testes frontend**, TypeScript, ESLint sem warnings e build aprovados. Quatro regressões novas exercitam o módulo real `auth.ts`: `200/null`, sessão ausente/expirada, sessão válida com tenant e indisponibilidade 503. O caso nulo falhou antes da correção e passou depois.
- **40 requisições HTTP HML** aprovadas com identidade sintética: health; sessão anônima; login CSRF; cookie Secure/HttpOnly/SameSite=Lax; sessão e organização corretas; 25 rotas autenticadas de leitura com 200; preflights CORS; rejeição de mutação sem header com 403; token inválido 401; preço sem fonte 503; logout e 401 após saída.
- Contagens/fingerprints das **35 tabelas HML iguais antes e depois**. O estado privado de listener preparado anteriormente pelo usuário foi preservado; não foi executado prepare, tick, cleanup ou qualquer ramo n8n.
- Navegação real do **build local corrigido**, encaminhando para Render HML, confirmou redirecionamento de sessão anônima para `/login`. A primeira execução teve bloqueio de rede EACCES do ambiente local de diagnóstico; após permitir a conexão HML, o proxy respondeu `200/null` real e o login foi exibido. Essa falha inicial não é atribuída à aplicação publicada.
- Navegação autenticada do build corrigido: **pendente por decisão do usuário, que fará a entrada depois**. Para testar a correção no Preview ainda é necessária publicação autorizada; o deployment atual mantém o código anterior. O navegador protege os valores privados contra leitura automática. Não foram injetados cookies/sessões artificiais para declarar aprovação.
- Produção: 17 páginas percorridas em leitura. Amostra de console não apresentou exceções. Logs Render amostrados repetem `env-url-basepath-redundant`, sem exceção não tratada na amostra; Vercel nos últimos 30 minutos não registrou erro de runtime. Ausência de log não comprova ausência de erro HTTP tratado.

Comandos equivalentes: backend `npm test`; frontend `npm test`, `npm run lint -- --max-warnings 0`, `npm run build`. Nesta máquina foram usados os executáveis Node/TypeScript/ESLint/Vite locais diretamente. Evidências HTTP sem segredos: [audits/stabilization-20261114.json](audits/stabilization-20261114.json).

## Integrações e pendências distintas

- **Overpass:** o 503 de busca foi registrado na rodada anterior. Uma única consulta de diagnóstico a `/api/status` nesta rodada retornou 406, sem informação utilizável de capacidade. Isso não demonstra a causa do 503 anterior nem disponibilidade atual do interpreter. Nenhuma nova busca/importação de empresas foi realizada. A API mantém 25 segundos de timeout e o frontend 35 segundos para busca; os testes desse contrato passaram. Não repetir consultas em sequência nem devolver lista vazia fictícia em caso de falha.
- **Preços:** leitura do módulo HML funciona com 200; `/api/v1/integrations/prices/due` responde 503 explícito sem fonte autorizada, como esperado. Configurar provedor real/allowlist após autorização. Nenhuma cotação fictícia.
- **WhatsApp:** canal/provedor opcional; envio real não testado e nenhuma mensagem enviada.
- **Push/PWA:** testes de cache excluem API, autenticação e respostas privadas. VAPID HML existente preservada. Instalação offline no Preview protegido e entrega em aparelho físico continuam pendentes; não reduzir a proteção Vercel para contornar o precache sem credenciais.
- **Auth.js:** o aviso de basePath redundante também ocorre com login HML funcional. Não há evidência de que ele cause o erro das tabelas. AUTH_SECRET e cookies não foram alterados.
- **n8n:** trabalhos e testes de motor suspensos durante a estabilização; nenhuma configuração tocada.

## Alternativas seguras para produção — não executadas

1. **Atualização coordenada:** revisar o catálogo/backup e ponto de restauração da produção; autorizar especificamente a migration aditiva `20261111_personal_platform.sql` no `neondb` da branch de produção, em transação, com limites de lock/statement; conferir as 35 tabelas, FKs/permissões e preservação CRM. Publicar a correção de sessão após validá-la no Preview. Manter integrações opcionais desligadas e fazer leitura de verificação com o usuário. A migration não deve ser substituída por `schema.sql` nem pelo bootstrap destrutivo. Não copiar credenciais HML para produção.
2. **Rollback temporário do frontend:** escolher e ensaiar uma versão anterior ao Personal, com contrato compatível com o backend e banco existentes. `96a5441` é candidato a investigar: seu frontend é CRM e não possui a rota backend Personal. Ainda não é rollback aprovado/testado. Voltar para `4f78117` não elimina a dependência das tabelas Personal, pois seu backend é idêntico ao de `40c179c`.

Qualquer opção exige autorização específica antes de deploy/migration ou alteração remota. Commit e push continuam manuais na main; o push pode acionar os deploys de produção existentes. **O sistema completo ainda não está pronto para produção.**

## Continuidade

Concluir entrada manual HML e percorrer as 17 telas no build corrigido; testar logout/retorno ao login. Autorizar publicação apenas em Preview para validar a correção publicada. Depois escolher a estratégia de produção acima. Não retomar as automações antes de estabilizar o conjunto frontend/API/schema.

Servidor local de diagnóstico encerrado; PIDs13704 e1956 finalizados, porta43651 novamente livre. Aba local fechada; aba de produção preservada no dashboard. Não foi necessário iniciar outro serviço remoto; os serviços persistentes HML existentes foram mantidos.
