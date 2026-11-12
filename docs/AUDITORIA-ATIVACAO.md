# Auditoria para ativação — 11/11/2026

**Continuação em 12/11:** workflows criados desativados na Cloudfy, contratos completados e testes ampliados para 39 backend/13 frontend/11 navegador. npm audit novamente sem alertas; migration permanece pendente e com o mesmo SHA. Backend publicado ainda respondeu 404 na rota nova de preços. Evidências e limites atuais em [CLOUDFY-N8N.md](CLOUDFY-N8N.md) e PROGRESSO.md. O restante deste relatório conserva a auditoria anterior.

Preparação local concluída; ativação externa pendente. Checkout `main`, HEAD `96a5441`, com todas as alterações anteriores preservadas. Não houve migration em produção, deploy, commit ou push. `.env` e dados comerciais não foram alterados. Sequência manual: [CHECKLIST-ATIVACAO.md](CHECKLIST-ATIVACAO.md).

## Dependências

`npm audit` completo (incluindo desenvolvimento): **backend 9 → 0; frontend 21 → 0** entradas de pacotes vulneráveis. Não são necessariamente CVEs distintos: a ferramenta também conta propagação para dependentes. Os relatórios são uma fotografia da base npm consultada, não uma garantia de ausência de falhas desconhecidas.

| Entrada original do backend | Gravidade | Tratamento no lockfile |
|---|---|---|
| @auth/core | Crítica | 0.35.0 → 0.41.3; correções de normalização de email, Bearer malformado, vínculo OAuth e cookie |
| @auth/express | Crítica por Core | 0.6.1 → 0.12.3, com teste real de compatibilidade da autenticação |
| proxy-addr | Crítica | 2.0.7 → 2.0.8; Express permanece na série 4 (4.22.3) |
| body-parser | Alta | 1.20.5 → 1.20.9 |
| brace-expansion | Alta | Caminho nodemon/minimatch foi resolvido para 1.1.22, fora dos intervalos vulneráveis registrados |
| minimatch | Moderada | Caminho nodemon resolvido para 3.1.5, fora do intervalo 7–11.0.0 desse aviso |
| nodemon | Moderada por minimatch | npm selecionou 3.1.11 dentro de ^3.1.3; comando de desenvolvimento preservado |
| qs | Moderada | Cópias vulneráveis substituídas por 6.16.2 |
| cookie | Baixa | Caminho antigo de Auth.js substituído na atualização do Core |

O problema crítico de email afeta magic links, que este app não usa; o vínculo OAuth também não é utilizado pelo provider Credentials atual. Ainda assim, a biblioteca foi corrigida integralmente. A falha de Bearer foi reproduzida como `URIError` antes da atualização e agora é rejeitada com segurança. O cenário de proxy-addr exige configuração vulnerável de trust subnet; o app mantém `trust proxy` desabilitado e a exceção local usa endereço de socket. Isso limita a exposição anterior, mas não substitui a atualização. Body-parser recebe conteúdo público e foi corrigido.

No frontend, atualizações compatíveis corrigiram Vite **8.0.10 → 8.3.8**, React Router **7.14.2 → 7.18.5**, Babel e outras dependências de build. Restaram dez entradas moderadas propagadas a partir de uma única falha de minimatch no lint. Em vez dos downgrades principais sugeridos automaticamente, foi aplicado o override preciso `minimatch@>=7.0.0 <11.0.1: 11.0.7`. As APIs utilizadas (`Minimatch` e `minimatch`, CommonJS/ESM) foram conferidas; lint completo, TypeScript e build passaram. ESLint fica em **10.14.0**, typescript-eslint em **8.72.2**. Esse override é de ferramentas de desenvolvimento e deve ser removido quando os dependentes adotarem a versão corrigida nativamente.

Não foi usado `npm audit fix --force`. Manter ambos os lockfiles; usar `npm ci` para reprodução. Relatórios finais: [backend](dependency-audit.json), [frontend](dependency-audit.frontend.json). Fotografias anteriores em `audits/dependency-before-activation.json`, `audits/dependency-baseline-current.json` e `audits/dependency-frontend-before-activation.json`.

Fontes primárias: [Auth.js/email](https://github.com/nextauthjs/next-auth/security/advisories/GHSA-7rqj-j65f-68wh), [Auth.js/Bearer](https://github.com/nextauthjs/next-auth/security/advisories/GHSA-xmf8-cvqr-rfgj), [proxy-addr](https://github.com/advisories/GHSA-jqcg-44mw-7w3h), [body-parser](https://github.com/expressjs/body-parser/security/advisories/GHSA-27r3-jxmh-p828), [minimatch](https://github.com/advisories/GHSA-g3hv-75wg-m249), [API e engines minimatch](https://github.com/isaacs/minimatch/blob/main/package.json). Os JSONs anteriores conservam todos os demais avisos e links.

## Migration e isolamento

Arquivo revisado: `backend/src/db/migrations/20261111_personal_platform.sql`.

SHA-256: `9812B2BD74ACC1FB983318BAB62590DA6CF8E92A1536E85032FB8B604F84DCDB`.

- 18 tabelas aditivas; FKs compostas mantêm organização/usuário nos filhos. Índices de identidade em users/clients preservam IDs e registros existentes. Nenhuma reescrita da migration foi necessária após a revisão.
- Inspeção **somente de catálogo**, via plugin Neon, confirmou PostgreSQL 18.6, tipos UUID e índice `clients_org_identity` compatível no ambiente existente. As 18 tabelas novas continuam ausentes; nenhuma migration foi executada no Neon.
- A sintaxe `ON DELETE SET NULL (client_id)` é compatível com o PostgreSQL existente. Capturas conservam origem ao excluir cliente; rascunhos vinculados usam cascade. Dados Personal acompanham a exclusão do seu proprietário.
- Teste efêmero repetiu a migration, preservou cliente, recebível e despesa sintéticos, rejeitou vínculos entre organizações e entre usuários da mesma organização, e conferiu cascades. A suíte HTTP/SQL usa postgres.js real via socket PostgreSQL/PGlite.
- O isolamento de leitura é aplicado pelas rotas e filtros de escopo; FKs impedem vínculos indevidos. Isto não implementa RLS para acesso SQL externo. A credencial do banco permanece exclusivamente no backend; n8n usa endpoints autenticados.
- `IF NOT EXISTS` permite reexecução, mas não comprova equivalência de objetos preexistentes. O checklist exige comparar definições e ensaiar em branch isolada antes de qualquer autorização de produção. Índices podem adquirir locks: aplicação manual transacional com limites de tempo e backup conferido.

## Autenticação, PWA e notificações

Auth.js corrigido preserva Credentials/bcrypt, claims de organização/usuário, cookie `__Secure-authjs.session-token`, HttpOnly/Secure/SameSite=Lax e logout. Testes HTTP/SQL incluem CSRF ausente, senha incorreta, sessão válida e sessão **sintética** emitida pela versão antiga com o mesmo secret/salt. O factory de configuração permite injeção do banco de teste sem alterar a configuração de produção. AUTH_SECRET e cookie/domínio/path reais devem ser preservados na ativação.

O worker agora rejeita MIME incorreto, redirects e respostas privadas na instalação; fallback HTML 200 não substitui bundle JS. APIs/auth/SSE/gravações continuam fora do cache. Permissão de notificação continua exclusiva do botão. Rotação VAPID substitui a inscrição antiga na ação explícita; falha ao persistir inscrição nova a revoga no navegador.

O tick passou a reconhecer a ocorrência de domingo/dia anterior durante 30 minutos após a virada, mantendo a data correta e deduplicação. A fila push seleciona pendências por aparelho; um aparelho com falha não bloqueia o 11º aviso dos demais. 404/410 remove inscrição e não conta como envio. Testes cobrem repetição, falha parcial e expiração. O contador confirma aceitação pelo provedor, não exibição física. Falha de commit após aceitação externa ainda pode causar reentrega; topic/tag estáveis reduzem duplicação visual.

## Overpass e GitHub

Overpass conserva query de 20s e transporte de 25s; apenas a busca de leads recebe **35s no frontend**, demais chamadas mantêm 20s. Timeout retorna 504 explicativo; rede/fonte indisponível retorna 503, sem resultados fictícios. A consulta pública real não foi repetida nesta revisão; disponibilidade externa continua não comprovada.

GitHub: HMAC mantém bytes originais; assinatura malformada e token Unicode são rejeitados sem exceção. Apenas o webhook aceita até 2 MiB (demais APIs 100 KiB). Busca de repositório ignora caixa e eventos novos atualizam atividade do projeto; replay não a modifica. Eventos continuam sem concluir marcos. Testes exercitam payload assinado de 150 KiB, replay e rejeições.

## n8n e configuração externa

Sete modelos mantidos desativados e sem credenciais. Removida dependência de `$vars`/plano pago; URL placeholder explícita deve ser substituída no nó HTTP. Execuções manuais também deixam de salvar dados. project-sync valida UUID antes de montar o path. O teste executa o Code node exportado e recusa tentativa de injeção de caminho.

Prontidão detalhada em [INTEGRACOES-N8N.md](INTEGRACOES-N8N.md): três aliases de tick dependem principalmente de configuração (ativar só um); busca precisa de entrada; captura precisa de fonte/classificador/normalização; project-sync precisa do produtor de relatórios; preços ainda precisam de adaptador de API/feed e POST de observações. Não tratar falta de implementação como simples falta de credencial.

Cloudfy foi consultado **somente em leitura** na infraestrutura já selecionada `socialbaboon`: n8n conectado; busca de workflows por `abelha` retornou zero resultados, sem paginação pendente. Metadados de oito credenciais foram listados, sem segredos; nenhuma está identificada pelo nome como Abelha. A existência de uma credencial genérica de outro projeto não comprova acesso ao Abelha. Não houve importação, execução, ativação, alteração de infraestrutura ou leitura de valores secretos. A infraestrutura parada não foi reativada. Esta busca por nome não exclui um workflow renomeado; confirmar a instância escolhida no checklist.

No `.env` local, DATABASE_URL, AUTH_SECRET, AUTH_URL e FRONTEND_URL existem; AUTH_SECRET tem tamanho mínimo. VAPID, token/IDs de integração, secret GitHub e PRICE_ALLOWED_HOSTS faltam. Nenhum valor foi exposto ou alterado; configuração do host remoto não foi presumida.

## Verificação e limites

- Backend: TypeScript/build e **33/33 testes**; banco sintético efêmero, sem conexão à carteira.
- Frontend: **13/13 testes**, ESLint com zero warnings, TypeScript e build Vite 8.3.8. Ajustado alias para `import.meta.dirname`, removendo o aviso de compatibilidade do loader de configuração.
- Chrome headless/build real: **11/11 cenários**, desktop e mobile 390px, sem erros JavaScript. Inclui fluxos Personal/CRM, webhook assinado, offline/reconexão, cache sem APIs e atualização voluntária. Evidências em `browser-verification.json` e capturas no diretório de visualizações da tarefa.
- `git diff --check` aprovado. Auditoria Premium anterior mantém suas 40 divergências estáticas documentadas; não foi declarada aprovada nem reexecutada como auditoria de segurança.
- Prévia sintética PID20188, HTTP43170 e socket57024 encerrados com `SYNTHETIC_PREVIEW_STOPPED`. PID ausente e ambas as portas verificadas livres por bind/close. Browser e testes fecham recursos em finally. Nenhum processo do usuário foi encerrado.

Continuam pendentes: ensaio autorizado no Neon isolado, migration em produção, configuração remota, webhook/cron real, consulta de preços/captura externa, entrega push física e deploy. A revisão local não autoriza essas operações.

Skills aplicadas nesta continuação: Superpowers (planejamento, depuração, testes, verificação e revisão independente) e Neon/Postgres. Plugins: Neon (catálogo somente leitura), Cloudfy (metadados n8n somente leitura). Playwright/Chrome, npm audit e documentação primária complementaram a validação. Nenhum serviço pago foi criado.
