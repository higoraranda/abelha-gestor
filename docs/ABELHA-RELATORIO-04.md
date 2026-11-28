# Abelha · Encerramento operacional 04

**27/11/2026 · PARTIAL.** O candidato local `rc04-8d0aef0bfe00` passou pelas suítes, pela verificação no Chromium e pelo ensaio descartável de recuperação. O incidente produtivo, o CI remoto, a homologação desse candidato, a entrega automática e o remetente externo seguem bloqueados.

## Git e ambientes

| Ambiente | Evidência atual | Revisão |
| --- | --- | --- |
| Checkout `main` e `origin/main` local | `844f9484fdcc1aac292bfa7c40bc93026f5a4323` | Alterações do 04 no diretório de trabalho, fora do stage |
| GitHub `main` | `844f9484fdcc1aac292bfa7c40bc93026f5a4323` confirmado por API | Publicação manual |
| Backend produção | Render `srv-daldd0142hec73c3ltt0`, `dep-dc45o8mtlv9c73fq2b9g`, `live` | `000660b0f01d6dbe16101e1d4d815ee6013786e4`, auto-deploy por commit ativo |
| Frontend produção | Vercel `dpl_AqcNrP6m6n9PkDXpRKZvQqAyW9EX`, `READY`, alias produtivo confirmado | `844f9484fdcc1aac292bfa7c40bc93026f5a4323`, delta documental frente ao backend |
| Backend HML | Render `srv-dbr3if3tqb8s73cr2jn0`, `dep-dc470ut9el5s73adq0t0`, `live` | `000660b0f01d6dbe16101e1d4d815ee6013786e4`, auto-deploy desativado |
| Frontend HML | Vercel `dpl_DFU9eP7P2e9LaJuRvX4W8tNJVVg9`, `READY`, Preview | `000660b0f01d6dbe16101e1d4d815ee6013786e4` |

O conector Vercel confirmou o alias e o SHA de produção. A configuração atual de disparo automático no painel continua por confirmar. O manifesto privado `.abelha-homologacao/rc-prompt04-manifest.json` registra o SHA base, 283 arquivos de origem e 33 artefatos frontend. Sua identidade de conteúdo é `8d0aef0bfe004cb76274b45b21d86a2a9bca656f8e64dab10b30233ca68f5499`. A publicação manual ainda precisa gerar o SHA Git do candidato. Os comprovantes HML do 03.6 continuam vinculados à revisão anterior.

## Produção e recuperação

**BLOCKED.** O Neon produtivo retornou 36 tabelas, com `account_invites` presente e `quote_models`, `quote_proposals`, `quote_proposal_prompts` e `auth_rate_buckets` ausentes. As 25 colunas e os sete índices da mudança também estão ausentes. As três chaves únicas de referência estavam válidas, com zero índices inválidos, constraints pendentes ou convites resgatados no momento da leitura. O HML confirmou as 40 tabelas e os quatro objetos. PostgreSQL remoto 18.7.

A consulta produtiva de modelos da calculadora depende de uma relação ausente, assim como as rotas de propostas e histórico dependem dos seus objetos. A leitura atual confirma a causa do 42P01 observado no 03.6. O filtro de logs do Render retornou zero ocorrências na janela consultada. O alcance em sessões reais e o número de usuários afetados permanecem indeterminados. O catálogo e a saúde HTTP sustentam verificações diferentes.

A opção B continua indicada de forma condicional. O [runbook do incidente](ABELHA-INCIDENTE-PRODUCAO-036.md) inclui contenção, proteção recuperável, janela sem escritores, preflight, locks, transação, controle de reaplicação, validação e abortagem. O snapshot encontrado é de 16/11. A retenção histórica informada é de seis horas, tornando necessária proteção fresca com recuperação verificada. O pacote mantém o hash publicado no 03.6. O [preflight de leitura](sql/ABELHA-PRODUCAO-036-PREFLIGHT.sql) foi ampliado. A execução produtiva e a contenção aguardam autorização específica.

## Tema, PWA e testes locais

O controle de tema funciona no cabeçalho da autenticação, CRM, Personal e área de convidados. A escolha é persistida localmente por origem, com tema escuro por padrão. O HTML restaura a escolha antes da execução do React. As cores de formulários, notificações e diálogos usam a paleta compartilhada, e o manifesto PWA mantém a cor de abertura padrão. A animação da abelha inicia automaticamente.

| Verificação | Resultado |
| --- | --- |
| `npm test` no frontend | 54/54, incluindo leitura inicial do tema, preferência inválida e armazenamento bloqueado |
| `npm test` no backend | 94/94 com build, incluindo isolamento entre organizações, autenticação, projetos, CRM, propostas, conversas e entrega sintética |
| Matriz HTTP em fixtures Auth.js | 126 rotas e 655 asserções |
| Lint, TypeScript e build Vite | Aprovados. Os 33 artefatos coincidiram entre o build local e o modo `--configLoader runner` do CI |
| Chromium | Alternância por teclado, nove pares de contraste em ambos os temas, persistência antes do React, CRM, calculadora, conversas e Personal em 320/390/1440 px, modal, convidado, voo automático e PWA offline com reconexão |
| Recuperação em PGlite 18.6 | 36→40 tabelas, preservação dos 36 fingerprints legados, vínculo determinístico, rejeição de estrutura parcial e reaplicação, rollback de falha tardia |

O navegador usou dados sintéticos e servidor de loopback. A evidência de PWA do 04 cobre o shell offline e a reconexão no Chromium. Instalação física no celular e comportamento do novo build no HML aguardam homologação. As capturas estão em `.abelha-homologacao/experience-04/`. A auditoria estática da skill de UI ficou pendente por falta de Python no PATH local.

O build atual substituiu a pasta gerada `frontend/dist`. Uma reconstrução isolada do 03.6 recuperou 23 dos 25 arquivos com hashes idênticos em `.abelha-homologacao/retained-artifacts-036/`. Os hashes históricos de `index.html` e `sw.js` ainda não foram reproduzidos. Manifesto, capturas e deployments históricos permanecem disponíveis.

## GitHub Actions

O [workflow](../.github/workflows/ci.yml) usa `npm ci` e lockfiles v3, matriz frontend/backend, Node 24, permissões `contents: read`, actions fixadas por SHA e checkout sem persistência de credenciais. Backend executa testes e build TypeScript. Frontend executa testes, lint, TypeScript e build Vite. O workflow contém apenas verificações. A validação local usou Node 26.13.1 e conferiu as versões instaladas das dependências diretas contra os lockfiles.

**CI real BLOCKED.** O workflow e a mudança de tema estão locais. A consulta de runs de PR para o HEAD atual retornou lista vazia. O candidato tem identidade de conteúdo e ainda aguarda commit manual. URL de run do candidato indisponível. Após contenção e publicação manual, conferir repositório, `head_sha`, `completed/success`, URL e conclusões dos dois jobs. [Checkout v7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1) · [Setup Node v7.1.0](https://github.com/actions/setup-node/releases/tag/v7.1.0).

## Entrega Codex, Obsidian e Abelha

**BLOCKED.** O hook local em `.codex/hooks.json` corresponde à proposta instalada. O handler passou em `node --check` e tem SHA256 `02672b38c00e56dafefc816bd302416040bf4544f553b0d33d9bffff32de3aa4`. O projeto `a3e9e1cd-bcf7-47ee-9567-f7cecd7ec0a3` existe no banco HML. A leitura autenticada da rota de projetos retornou HTTP 503 com integração Codex não configurada. A saúde do mesmo serviço retornou HTTP 200. O token dedicado privado e o vínculo existente podem ser reaproveitados.

Com autorização de configuração HML, aplicar somente `ABELHA_CODEX_REPORT_TOKEN`, `ABELHA_CODEX_PROJECT_ID` e `ABELHA_CODEX_PROJECTS_JSON`. A lista deve conter apenas o UUID acima e `https://github.com/higoraranda/abelha-gestor`. Usar a credencial de `.abelha-homologacao/codex-hml.env` sem exibi-la. Conferir o SHA efetivo após o ajuste, pois a alteração de variáveis pode publicar a HEAD mesmo com auto-deploy desativado. Preservar a role Neon, o restante da configuração e os IDs existentes.

No aplicativo Codex, abra o chat do projeto e selecione **Review hooks** no compositor. Também aparece em **Settings → Hooks**. Revise a entrada local `Stop` que aponta para `proposals-035/stop-delivery.cjs` e confirme a confiança nessa definição. No CLI iniciado neste checkout, a mesma revisão aparece em `/hooks`. A confiança efetiva do cliente para o handler continua por comprovar. [Documentação de hooks](https://learn.chatgpt.com/docs/hooks).

O envelope privado está em `draft`. Com CI verde e paridade HML, preencher o SHA real em `report.commit` e `receipt.commit`, anexar o run de Actions que verificou esse SHA e promover o envelope a `ready`. Após o evento real `Stop`, conferir um `completion-hook-result.json` novo para o turno e sessão, as duas notas no Obsidian, o mesmo UUID no Abelha em `pending_review` e o histórico do projeto. Repetir o mesmo identificador e conteúdo em um segundo evento real para comprovar idempotência, conferir os marcos e voltar o envelope a um estado inerte. O aceite humano autoriza a atualização de progresso. UUID de entrega indisponível.

## Remetente Resend

**BLOCKED para destinatários externos.** O teste real de OTP e recuperação do 03.6 permanece válido para a caixa autorizada. A consulta atual do Resend retornou zero domínios na conta conectada. Para avançar, abrir **Domains → Add Domain**, selecionar o domínio próprio ou subdomínio transacional escolhido pelo proprietário e cadastrar no DNS exatamente os nomes, tipos, valores e prioridades exibidos pelo painel. O painel gera DKIM e os registros SPF/MX de envio conforme o domínio e a região escolhidos. Aguardar `Verified`. Como ainda não há domínio cadastrado, faltam os valores reais de DNS. [Configuração de domínios no Resend](https://resend.com/docs/dashboard/domains/introduction).

Após verificação e autorização, configurar privadamente no HML `ABELHA_OTP_FROM=Abelha <acesso@DOMINIO_VERIFICADO>`, confirmar a permissão de envio da chave e testar uma única caixa externa autorizada. Cadastro externo permanece pendente dessa prova.

## Arquivos, autorizações e continuidade

- Implementação em `frontend/index.html`, `frontend/src/theme.css`, `frontend/src/lib/theme.ts`, `frontend/src/components/ui/ThemeToggle.tsx`, cabeçalhos de autenticação/CRM/Personal/convidados, adaptador Sonner e testes do tema.
- Contrato de UI em [DESIGN.md](../DESIGN.md), [UX-CONTRACT.md](../UX-CONTRACT.md) e [DARK-MODE.md](DARK-MODE.md). Operação em [roadmap](ABELHA-ROADMAP-MULTIUSUARIO.md), [runbook](ABELHA-INCIDENTE-PRODUCAO-036.md) e [preflight](sql/ABELHA-PRODUCAO-036-PREFLIGHT.sql).
- Foram usadas as autorizações de trabalho local, inspeção remota de leitura e consulta autenticada no HML dedicado. Contenção, migração produtiva, configuração remota de entrega, publicação manual e promoção aguardam as respectivas decisões do proprietário. Stage vazio. Credenciais ficaram em armazenamento privado.
- HML anterior, buscas públicas e WhatsApp seguem com os limites documentados no 03.6. O trabalho do próximo roadmap comercial permaneceu fora desta rodada.
- Chromium, o servidor de loopback e os bancos PGlite temporários foram encerrados. A porta 49825 recusou nova conexão, e os diretórios temporários de reconstrução foram removidos. Os testes, capturas e manifestos privados registram a evidência local.
- Skills aplicadas `using-superpowers`, `systematic-debugging`, `brainstorming`, `test-driven-development`, `dispatching-parallel-agents`, `frontend-design`, `frontend-design-premium` e `verification-before-completion`. MCPs GitHub, Render, Vercel, Neon, Resend e Segundo Cérebro. Runners existentes de entrega e recibo foram conferidos e exercitados por testes sintéticos.

## Próximo passo

Aprovar a contenção de deploy e a janela de recuperação produtiva. Publicar manualmente o candidato após confirmar o controle de deploy automático e conferir o run do mesmo SHA antes de homologar a entrega.
