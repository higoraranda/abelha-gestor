# Abelha · Recuperação, publicação e encerramento operacional

28/11/2026

**Homologado tecnicamente, aguardando aceite.** O incidente produtivo 42P01 foi resolvido. O candidato `7b1e4953ce3277c68f0ebf6aad7db56c7dd90d61` está na `main`, aprovado no CI e disponível em homologação. A produção segue nas versões anteriores até a aprovação visual e operacional do proprietário.

## Recuperação produtiva

1. O auto-deploy do Render de produção passou para `Off`. O Vercel recebeu uma regra de build que permite Preview e cancela build produtivo. Após o push, o deploy produtivo do candidato `dpl_Hi1CdRMsBvnXW1rHRSsrvSAzDwLq` ficou `CANCELED`. O alias público permaneceu no Vercel `dpl_AqcNrP6m6n9PkDXpRKZvQqAyW9EX` / `844f948`, e o Render manteve `dep-dc45o8mtlv9c73fq2b9g` / `000660b` em `live`.
2. O Neon confirmou o projeto `curly-river-94350351`, a branch produtiva `br-square-sunset-acpb91u2` e o banco `neondb`. A cota gratuita de snapshots recusou um novo snapshot. A proteção foi feita por branch isolada `br-frosty-waterfall-acgqar0h`, no LSN `0/C71F718`. As assinaturas do catálogo e dos dados das 36 tabelas coincidiram com a origem. A branch ficou retida, com compute suspenso.
3. O pacote aditivo do [runbook 03.6](ABELHA-INCIDENTE-PRODUCAO-036.md) foi aplicado uma vez. SHA-256 `ce58172059f3d83a4cf6bfa85b1625ce59e63b84fb76d48d4515e996dd9c4428`. O preflight confirmou os objetos ausentes e as chaves legadas. A transação controlou escritores com locks e liberou as gravações no commit.
4. A verificação independente pós-commit encontrou 40 tabelas, as 25 colunas, os sete índices e as quatro chaves estrangeiras esperadas. Os fingerprints das 36 tabelas legadas e o digest dos dados coincidiram. A inspeção encontrou zero índices ou constraints inválidos. Na sessão produtiva autenticada, a lista de modelos abriu, a consulta de propostas respondeu em JSON e a tela de projetos carregou.

## Frontend e testes

O CSS do extrato imprime somente o documento, com fundo branco e texto escuro nos dois temas. No Chromium, a interface voltou ao tema selecionado ao sair da impressão. Os PDFs de demonstração tiveram uma página A4 cada. A correção está em `frontend/src/workspace.css`. A sidebar histórica e o comportamento da PWA foram preservados. A matriz visual de 17 seções e a instalação offline em perfil isolado vêm das verificações anteriores, descritas no [relatório 05](ABELHA-RELATORIO-05.md).

As capturas com dados de demonstração estão em `.abelha-homologacao/`.

- `experience-05/04-final-crm-entregas-escuro.png` mostra a sidebar do CRM no desktop.
- `experience-05/06-final-personal-claro.png` mostra o Personal em tema claro.
- `experience-05/09-final-menu-mobile-escuro.png` mostra a navegação móvel.
- `experience-06/extrato-tema-dark.pdf` e `experience-06/extrato-tema-light.pdf` mostram a impressão A4 gerada a partir dos dois temas.

A rodada consolidada local passou com 56 testes de frontend, lint, TypeScript, build Vite e 94 testes de backend. A cobertura documentada de 126 rotas e 655 asserções vem da matriz já validada. O diff acumulado foi revisado antes do commit, incluindo a busca por credenciais e artefatos privados.

## CI e homologação

O commit `feat(abelha): restaura navegação lateral e corrige impressão do extrato` foi confirmado na `main` remota. O run por push `46145766760` concluiu com `success` no SHA exato. Os jobs `Validate frontend` e `Validate backend` passaram. [GitHub Actions](https://github.com/higoraranda/abelha-gestor/actions/runs/46145766760).

| Destino | Estado no SHA `7b1e4953ce3277c68f0ebf6aad7db56c7dd90d61` |
| --- | --- |
| Render HML | `dep-dc5conm1egvs73bfbkh0` em `live`. Auto-deploy `off`. Health HTTP 200. [Serviço](https://dashboard.render.com/web/srv-dbr3if3tqb8s73cr2jn0) |
| Vercel Preview | `dpl_CTqMczq7AwJ6o7TrvBm8fJ4b9zvx` em `READY`, alvo Preview. `BACKEND_URL` restrita ao Preview aponta para o Render HML. O acesso anônimo foi redirecionado para autenticação. A sessão Vercel autorizada recebeu `status: ok` pelo proxy e carregou a tela de entrada. [Preview protegido](https://abelha-gestor-pbkpx1qlc-higoraranda-gmailcoms-projects.vercel.app/) |

## Automação de entregas

As três variáveis dedicadas foram configuradas no Render HML, preservando as existentes. A consulta autorizada retornou HTTP 200 e apenas o projeto `a3e9e1cd-bcf7-47ee-9567-f7cecd7ec0a3` vinculado ao repositório canônico. A consulta sem credencial retornou HTTP 401.

O hook local aprovado e o handler existente foram conferidos. O envelope privado `.abelha-homologacao/completion-ready.json` usa o SHA e o run reais e foi armado para o `Stop` desta conversa. O status esperado pelo protocolo é `pending_review`. O UUID, as notas do Obsidian e o registro no histórico ainda precisam ser observados após o encerramento. Nenhum marco foi aprovado ou atualizado nesta rodada.

Para reconciliar, conferir o evento `Stop`, horário, `turn_id`, UUID e `pending_review` em `.abelha-homologacao/completion-hook-result.json`. Conferir as notas e o histórico do projeto HML. Um segundo `Stop` com o mesmo envelope deve devolver o mesmo UUID, com uma entrada no histórico e sem duplicar notas. Depois da conferência, desarmar o envelope. Caso o app solicite confiança, o proprietário deve revisar o hook local em **Configurações → Hooks**. A confirmação deve vir do evento real.

## Escopo, custos e aceite

A autorização do Prompt 06 foi usada para conter deploys produtivos, criar proteção gratuita, corrigir o banco e verificar o serviço, configurar o HML, publicar na `main` e homologar o SHA. O relatório e a atualização do roadmap foram registrados localmente depois da publicação do candidato, para manter o SHA homologado. O compute temporário da recuperação foi suspenso e a porta de teste local foi liberada.

O Resend permanece gratuito com `resend.dev` e verificação de e-mail ativa. A evidência do [03.6](ABELHA-RELATORIO-036.md) cobre OTP e recuperação na caixa autorizada. Domínio próprio e envio para destinatários externos ficam para o lançamento público. Busca Lead mantém a dependência do provedor externo e WhatsApp permanece sem ativação. O roadmap comercial segue para etapas futuras.

**Aguardar promoção.** O proprietário deve revisar o Preview, incluindo navegação, temas e impressão do extrato, e registrar o aceite operacional. Manter a contenção produtiva até essa decisão e reconciliar o recibo do `Stop` antes do encerramento da automação.
