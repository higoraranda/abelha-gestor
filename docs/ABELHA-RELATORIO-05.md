# Abelha · Restauração do layout e conclusão operacional 05

**27/11/2026 · PARTIAL.** A sidebar está implementada no candidato local. O aceite visual é do proprietário. O incidente 42P01 e os gates remotos ainda dependem da autorização consolidada e da publicação manual. O remetente padrão do Resend atende ao escopo de desenvolvimento.

O candidato `rc05-0e5fffd8f413` é identificado pelo manifesto privado `.abelha-homologacao/rc-prompt05-manifest.json`, com 284 arquivos de origem, 33 artefatos frontend e hash de conteúdo `0e5fffd8f4137ae952f9705da50027ef06431b2f6eca0131f4914bac2ba39d5a`. A identidade local precede o SHA Git a ser gerado pelo commit manual.

## Referência visual e alterações

`68647ab4d92fccfb288080ad59debc57bb639873` é o último commit com sidebar esquerda, grupos CRM e Gestão, ícones ao lado dos nomes, destaque ativo e menu móvel. O quadro de Entregas surgiu com o cabeçalho horizontal em `96a544132155a3ae118b413fe84ffb7f847d7552`. O Personal chegou em `248569753b3c7a8fd78676524426c2ef1f0e2eac`, já com o cabeçalho. A restauração usa a estrutura histórica e os módulos atuais de CRM e Personal. [Commit de referência](https://github.com/higoraranda/abelha-gestor/commit/68647ab4d92fccfb288080ad59debc57bb639873).

`AppSidebar.tsx` reúne marca, ambientes, botões por seção, estado ativo e rodapé de ações. Entregas fica na navegação lateral e continua com quadro e checklist no conteúdo principal. Abaixo de 1024 px, Radix controla a gaveta esquerda, Escape e retorno do foco. A busca global, criação de contato, exportação, notificações e calculadora externa continuam acessíveis. `workspace.css` e `personal.css` compõem a área principal e mantêm a rolagem dos quadros dentro da própria seção.

As paletas atuais, Urbanist, padrão escuro, preferência local, autenticação, navegação por URL, permissões e animação automática foram preservados. Os 137 arquivos do backend e os lockfiles conferem com o manifesto 04. Os 33 artefatos frontend do 04 foram copiados e conferidos por SHA256 antes de compilar o 05.

## Capturas e verificação local

As capturas do navegador estão em `.abelha-homologacao/experience-05/`. A primeira usa o código histórico compilado em isolamento e substitui os rótulos pessoais fixos por dados sintéticos. As comparações CRM e Personal usam a mesma fixture nos dois builds. As requisições externas do navegador foram bloqueadas, então o ambiente usou a fonte de fallback prevista pelo CSS.

| Tela | Referência ou antes | Candidato 05 |
| --- | --- | --- |
| CRM, visão geral | `01-historico-crm-68647ab.png` | `10-final-crm-visao-geral-escuro.png` |
| CRM, Entregas | `02-antes-crm-entregas.png` | `04-final-crm-entregas-escuro.png` |
| Personal, Meu dia | `03-antes-personal.png` | `05-final-personal-escuro.png` e `06-final-personal-claro.png` |
| Celular, menu lateral | — | `08-final-menu-mobile-claro.png` e `09-final-menu-mobile-escuro.png` |
| Calculadora e proposta | — | `07-final-calculadora-proposta-claro.png` |

O frontend passou em 56 testes, lint, TypeScript e build no modo Vite usado pelo workflow. O Chromium percorreu as 17 seções em 320, 390, 768, 1024, 1440 e 1920 px, incluindo estado ativo, menu por teclado, troca de ambiente, formulários de tarefa e projeto, quadro/checklist, conversas, prévia calculada e abertura de proposta sintética. Verificou tema claro e escuro após recarga, PWA offline e reconexão, voo automático e área separada de convidados. A homologação física no celular continua fora da evidência emulada.

Os 94 testes backend, 126 rotas, 655 asserções de autorização, o ensaio PGlite 36→40 e o teste real de OTP e recuperação foram reaproveitados das evidências anteriores, conforme o escopo e os arquivos verificados.

O verificador complementar de modo escuro chegou a 79 capturas e parou na asserção de papel branco do extrato. Um teste dirigido com Chromium e a mesma fixture reproduziu a impressão em tema escuro tanto no artefato preservado do 04 quanto no 05. Essa divergência preexistente continua aberta. A restauração da navegação foi verificada separadamente com o candidato atual.

## Git, deployments e incidente

| Recurso | Estado observado |
| --- | --- |
| `main` local e remota | `844f9484fdcc1aac292bfa7c40bc93026f5a4323`. Mudanças locais fora do stage |
| Render produção `srv-daldd0142hec73c3ltt0` | `dep-dc45o8mtlv9c73fq2b9g` live, `000660b0f01d6dbe16101e1d4d815ee6013786e4`. Auto-deploy por commit ativo |
| Vercel produção | `dpl_AqcNrP6m6n9PkDXpRKZvQqAyW9EX` READY, `844f9484fdcc1aac292bfa7c40bc93026f5a4323`. Alias produtivo confirmado. Configuração de disparo não exposta pelo conector |
| Render HML `srv-dbr3if3tqb8s73cr2jn0` | `dep-dc470ut9el5s73adq0t0` live, `000660b0f01d6dbe16101e1d4d815ee6013786e4`. Auto-deploy desativado |
| Vercel Preview HML | `dpl_DFU9eP7P2e9LaJuRvX4W8tNJVVg9` READY, `000660b0f01d6dbe16101e1d4d815ee6013786e4` |
| GitHub Actions | Workflow 04 preservado e fora da main remota. Sem run nem URL do candidato 05. O check Vercel da revisão publicada é independente |

Produção segue com 36 tabelas e ausência de `quote_models`, `quote_proposals`, `quote_proposal_prompts` e `auth_rate_buckets`. O HML tem 40 tabelas e os quatro objetos. O único snapshot listado é de 16/11. A aplicação do pacote aditivo exige o preflight já preparado, proteção recente recuperável, controle de writers e smoke pós-migration. A janela pode afetar gravações por locks de DDL. [Runbook do incidente](ABELHA-INCIDENTE-PRODUCAO-036.md).

## Entrega automática e Resend

O hook local e o handler proposto conferem com as evidências anteriores. O token privado e o projeto canônico HML `a3e9e1cd-bcf7-47ee-9567-f7cecd7ec0a3` foram preservados. A última prova autenticada da rota de integração continua sendo o HTTP 503 observado no 04, no mesmo deploy HML. A configuração remota, o evento real Stop, o UUID, o histórico, o recibo `pending_review` e a idempotência remota aguardam os gates. Aprovação humana continua obrigatória.

O envelope do 05 fica separado e inerte em `.abelha-homologacao/completion-draft-05.json`. O hook continua apontando para o arquivo do 04 em rascunho. Com autorização, CI e HML comprovados, usar o envelope do 05 com o SHA publicado e a URL do run antes de ativar a entrega.

Pela decisão do proprietário, o desenvolvimento mantém plano gratuito e remetente `resend.dev`. A conta consultada retornou zero domínios. OTP e recuperação continuam com os mecanismos existentes e evidência anterior para a caixa autorizada. Esta rodada não repetiu o envio. Domínio próprio verificado e comprovação para destinatários externos ficam para o lançamento público.

## Intervenções restantes

1. Revise as capturas histórica, anterior e restaurada e registre o aceite visual para eventual promoção.
2. Responda à autorização consolidada já solicitada. Com autorização, conter a publicação automática no Render e no Vercel. Verificar a proteção recuperável recente do Neon em destino isolado dentro dos limites gratuitos. Confirmar a janela sem gravações, aplicar o pacote autorizado e validar integridade e smoke de leitura antes de liberar a janela.
3. Após contenção comprovada, faça o commit e push manuais da `main` conforme a estratégia vigente. Use o run de Actions `completed/success` do SHA exato para homologar frontend e backend HML. Após autorização, configurar somente `ABELHA_CODEX_REPORT_TOKEN`, `ABELHA_CODEX_PROJECT_ID` e `ABELHA_CODEX_PROJECTS_JSON` no Render HML. Conferir o SHA após a mudança, que pode disparar deploy.
4. No Codex, abra **Review hooks** no compositor ou **Settings → Hooks**. Revise e confie na entrada `Stop` que aponta para `proposals-035/stop-delivery.cjs`. Com CI e paridade HML, preparar o envelope com o SHA real e aguardar um Stop real. Conferir UUID único, status `pending_review`, histórico e notas Obsidian. Repetir o mesmo evento idempotente em outro Stop e manter revisão humana. [Hooks do Codex](https://learn.chatgpt.com/docs/hooks).

Skills usadas `using-superpowers`, `brainstorming`, `test-driven-development`, `frontend-design`, `frontend-design-premium` e `verification-before-completion`. MCPs de GitHub, Render, Vercel, Neon, Resend e Segundo Cérebro. A rodada usou trabalho local, navegador isolado e consultas externas de leitura. Não houve commit, push, deploy, migration remota ou contratação. O checkout temporário, os navegadores e os listeners de loopback foram encerrados. Capturas e manifestos permanecem como evidência local.
