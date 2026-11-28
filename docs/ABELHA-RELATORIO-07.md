# Abelha | Prompt 07 — Experiência e fluxo comercial

**Status em 28/11/2026 — implementação e validação local, homologação remota pendente.** O checkout está na `main`. O candidato remoto anterior continua em `7b1e4953ce3277c68f0ebf6aad7db56c7dd90d61`. O aceite visual e operacional continua com o proprietário.

## Referências

- A calculadora externa foi inspecionada na pasta indicada pelo proprietário. O Abelha reaproveita a seleção de serviços, o resumo de implantação e recorrência e a revisão antes de gerar a proposta. A lógica continua na calculadora interna em centavos. [Calculadora externa](https://project-k3a8s.vercel.app/)
- A proposta de referência foi aberta no navegador. A navegação por etapas, a leitura de prazos e entregáveis e a hierarquia do investimento orientaram a apresentação. [Proposta Rupture](https://proposta-rupture.vercel.app/)

## Quadros e carregamento

Os quadros de projetos e tarefas permanecem em uma linha em desktop e celular. O conteúdo rola dentro do quadro, com detalhes por cartão, movimentação persistida e alternativa por teclado. O carregamento preserva o voo automático durante a recuperação de uma inicialização lenta. A interrupção anterior ocorria ao entrar no estado de recuperação enquanto o backend ainda respondia às tentativas. O comportamento respeita o movimento reduzido e a condição offline.

[Projetos no celular](../.abelha-homologacao/prompt07/boards/projetos-390.png) · [Projetos no desktop](../.abelha-homologacao/prompt07/boards/projetos-1440.png) · [Tarefas no celular](../.abelha-homologacao/prompt07/boards/tarefas-390.png) · [Tarefas no desktop](../.abelha-homologacao/prompt07/boards/tarefas-1440.png)

[Voo 1](../.abelha-homologacao/prompt07/loader/voo-cold-start-01.png) · [Voo 2](../.abelha-homologacao/prompt07/loader/voo-cold-start-02.png) · [Voo 3](../.abelha-homologacao/prompt07/loader/voo-cold-start-03.png) · [Verificações de movimento e PWA](../.abelha-homologacao/prompt07/loader/results.json)

## Calculadora e proposta

O orçamento usa cliente do CRM, modelo de preços ou itens próprios, escopo, prazos, condições, recorrência, descontos e opcionais. Do rascunho, o proprietário pode revisar a apresentação, editar textos e marca, publicar, registrar envio, copiar ou revogar o link e consultar versões. O painel mostra a abertura do link como evento. O PDF usa a impressão A4 da mesma apresentação. O produto abre o diálogo **Salvar em PDF** do navegador.

[Calculadora no desktop](../.abelha-homologacao/prompt07/calculator/calculadora-1440.png) · [Calculadora no celular](../.abelha-homologacao/prompt07/calculator/calculadora-390.png) · [Revisão do cálculo](../.abelha-homologacao/prompt07/calculator/revisao-1440.png)

[Demonstração navegável com dados sintéticos](../.abelha-homologacao/prompt07/commercial/proposta-casa-lume.html) · [Proposta em PDF](../.abelha-homologacao/prompt07/commercial/proposta-casa-lume.pdf) · [Investimento](../.abelha-homologacao/prompt07/commercial/investimento.png) · [Tema claro no celular](../.abelha-homologacao/prompt07/commercial/proposta-clara-390.png)

## Aceite, recusa e contrato

O teste de navegador abriu a proposta sem sessão. Exercitou aceite, recusa com motivo, revisão do contrato, ciência da versão e formalização com PDF de evidência sintético. O aceite preservou a versão escolhida e criou o rascunho de contrato. A recusa foi registrada sem gerar projeto. O fluxo de assinatura usa evidência externa revisada pelo proprietário. O PDF do exemplo é um documento de teste.

[Aceite registrado](../.abelha-homologacao/prompt07/commercial/aceite.png) · [Recusa registrada](../.abelha-homologacao/prompt07/commercial/recusa.png) · [Contrato e ciência](../.abelha-homologacao/prompt07/commercial/contrato-e-ciencia.png) · [Contrato em PDF](../.abelha-homologacao/prompt07/commercial/contrato-casa-lume.pdf)

## Projeto, tarefas e prompt

A formalização criou um único projeto vinculado à proposta e ao contrato. Os modelos de site, CRM, automação e serviço personalizado geram etapas pertinentes. O cenário de teste combina site e automação. A próxima ação foi **Solicitar materiais e informações pendentes**, com a aprovação da identidade visual e a entrega das fotos do catálogo como dependências. O CRM permite editar o planejamento e gerar prompts do projeto inteiro e da próxima tarefa, com revisão, cópia e versões.

[Planejamento gerado](../.abelha-homologacao/prompt07/commercial/planejamento.png) · [Prompt da próxima tarefa](../.abelha-homologacao/prompt07/commercial/prompt-proxima-tarefa.txt)

## Migration e autorização

A migration `20261130_commercial_flow.sql` amplia tabelas de orçamento, tarefas e prompts. Adiciona versões publicadas, contratos e eventos com referências por organização e usuário. Foi executada em PGlite descartável. A organização é habilitada por `ABELHA_COMMERCIAL_ORGANIZATION_IDS` e o backend precisa de `ABELHA_COMMERCIAL_LINK_SECRET` independente. O acesso administrativo requer proprietário ativo e titularidade. O link tem expiração, revogação e limitação compartilhada de tentativas. O documento assinado fica privado e exige autorização para download. O contrato usa o link da proposta e sua validade.

[Migration](../backend/src/db/migrations/20261130_commercial_flow.sql) · [Matriz de acesso](ABELHA-MATRIZ-DE-ACESSO.md)

## Testes locais

| Verificação | Resultado |
| --- | --- |
| Backend | 95 testes. Cenários de concorrência, idempotência, versão, preço, recusa, dependências e isolamento. |
| Autorização | 146 rotas e 743 asserções HTTP com sessões Auth.js sintéticas. |
| Frontend | 60 testes, ESLint, TypeScript e build Vite aprovados. |
| Navegador | Calculadora, quadros e proposta em 320, 390, 768, 1024, 1440 e 1920 px. |
| Comercial integrado | Rotas reais e PGlite descartável em loopback, com sessão administrativa de teste. |
| Carregamento | 11 grupos aprovados. Desktop, celular, recarga, inicialização lenta, falhas, movimento reduzido e PWA no ensaio local. |
| Diff e segredos | `git diff --check` aprovado. A busca por padrões de credenciais em 45 arquivos de código e configuração retornou zero correspondências. |

O fluxo foi verificado em ambiente local. A assinatura externa foi representada por um PDF sintético no ensaio. A proteção do Preview continua habilitada, e a avaliação anônima foi feita no ambiente local isolado. O navegador e os serviços de teste foram encerrados ao concluir.

## CI, produção e HML

- **Git e CI do Prompt 07:** alterações locais na `main`, sem SHA e sem execução de Actions deste candidato.
- **Produção:** Render confirmado com auto-deploy desligado e versão `000660b` ativa. O alias do Vercel continua em `844f948`. O projeto mantém SSO do Preview. O conector não mostra o Ignored Build Step atual e a tela de configuração exigiu login. A confirmação atual dessa regra é o gate de push. [Configuração de build no Vercel](https://vercel.com/docs/project-configuration/project-settings#ignored-build-step)
- **HML:** Render e Preview seguem no SHA `7b1e495` do Prompt 06. A migration nova, as permissões da role sobre os objetos comerciais, a habilitação do proprietário e a paridade do candidato seguem pendentes. [Preview anterior protegido](https://abelha-gestor-pbkpx1qlc-higoraranda-gmailcoms-projects.vercel.app/) · [CI anterior](https://github.com/higoraranda/abelha-gestor/actions/runs/46145766760)
- **Recibo anterior:** o arquivo local do hook registra o evento `Stop` com recibo `pending_review`. A rodada confirmou o registro local e preservou a revisão pendente. A entrega remota do Prompt 07 depende do candidato com CI.
- **Custos:** R$ 0 gerados. A rodada local usou as dependências e o navegador existentes.

## Acesso e reprodução

Abra a demonstração navegável para avaliar a apresentação sem servidor. Os PDFs reproduzem o conteúdo do cenário local. Para repetir o fluxo completo no checkout, compile o backend e o frontend e execute `backend/scripts/verify-commercial-browser.cjs` com Playwright e Chromium disponíveis. O script cria dados sintéticos, valida as interações e encerra o banco descartável e a porta. O HML protegido permanece no candidato anterior até os gates de publicação.

## Skills e conectores

Os fluxos de brainstorming, planejamento, TDD, depuração e verificação orientaram a execução. Frontend Design, Frontend Design Premium e React Best Practices orientaram a interface. Sales Enablement orientou a estrutura da apresentação. A skill de PDF orientou a impressão e conferência das páginas. A skill de CI/CD do Vercel orientou a conferência de contenção. GitHub, Render, Vercel e Segundo Cérebro foram consultados via MCP. O navegador foi usado para inspecionar a referência Rupture e o acesso ao painel do Vercel.
