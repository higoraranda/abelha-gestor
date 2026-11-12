# Homologação e integração — 12/11/2026

Atualização após autorização A/B: o database separado **abelha_homologacao** já foi criado na branch de teste com35 tabelas,18 Personal, role restrita e identidade sintética; compute novamente disabled/idle. Alterações preparadas na main local para commit manual. Estado e próximo passo Render em [ATIVACAO-BRANCH-BANCO.md](ATIVACAO-BRANCH-BANCO.md). As evidências abaixo registram o ensaio anterior; produção segue sem migration Personal e n8n inativo.

Estado: **ensaios locais e Neon aprovados; ativação externa pendente**. Base local e GitHub: `main/248569753b3c7a8fd78676524426c2ef1f0e2eac`. Alterações locais anteriores preservadas. Nenhum commit, push, deploy ou migration de produção nesta tarefa.

## Ambientes conferidos

| Componente | Evidência atual | Limite |
|---|---|---|
| GitHub | `higoraranda/abelha-gestor`, main em2485697 | Mudanças de consolidação/homologação continuam locais |
| Render | `srv-daldd0142hec73c3ltt0`, deploy live `dep-dbqjaj8473hc7382ffi0`, commit2485697 | Único serviço Abelha; nenhum backend de homologação encontrado |
| Vercel | Projeto `abelha-gestor`, `prj_Cd3vrf5gNVRmT3CjBJeX8saUrVVv`; produção READY `dpl_ErNXtdtywYQ92s5gNqEAKUbnUqgp`, commit2485697 | Nenhum deployment Preview retornado; acesso à equipe aprovado pelo usuário |
| Neon produção | `br-square-sunset-acpb91u2` | Consulta somente de catálogo confirmou **zero das18 tabelas Personal**; nenhuma escrita |
| Neon teste | `br-hidden-night-ace956m0`, `ambiente de testes isolado`, PostgreSQL18.6, projeto Free | Clone antigo com13 tabelas no public, anterior à migration CRM de05/11; não é espelho atualizado nem banco vazio |
| Cloudfy | `socialbaboon`, único consolidado `n20DNyb13Aaw3nq5`,62 nós, `active:false` | Definição relida e inalterada; dez URLs backend ainda apontam à produção; sem credenciais Abelha |

Os deploys Render/Vercel já existiam ao iniciar a conferência; esta tarefa não os disparou. A afirmação histórica de rota nova404 foi superada: GET público `/api/v1/integrations/prices/due` responde **503**, integração não configurada. `/health`200, auth/session200 com sessão nula, Personal/projects401 sem login, também pelo proxy Vercel. Não houve POST na produção.

## Ensaio Neon autorizado e encerrado

O usuário autorizou habilitar temporariamente **o compute existente** `ep-crimson-snow-acmuhqgp`, mínimo/máximo0,25CU no projeto Free, sem upgrade ou nova infraestrutura. Foram criados dois schemas privados vazios e uma role exclusiva restrita a eles; não foi reutilizada DATABASE_URL nem senha de produção. A credencial não tinha INSERT em public.clients; endpoint, role e search_path foram verificados antes das gravações.

Passaram dois testes integrados no PostgreSQL real, usando postgres.js e o backend HTTP em loopback:

- Migration `20261111_personal_platform.sql` aplicada e repetida: **18 tabelas**, constraints/FKs entre organizações e usuários distintos da mesma organização, cascatas e preservação das fixtures de clientes/cobranças/despesas.
- API: projetos, relatórios Codex pendentes de revisão humana, GitHub assinado/replay, faturas diárias e variações, metas, assinaturas, captura e staging de leads, revisões, horários/deduplicação e falhas parciais de push com transporte simulado. Sem autenticar usuário real, envio push real ou consulta externa de loja.
- Ensaio adicional sobre o catálogo real do public da **branch de teste**: migration executada duas vezes dentro de subtransação com rollback obrigatório, `lock_timeout=5s`, `statement_timeout=60s`. Após o rollback: zero tabelas Personal no public,13 tabelas originais e fingerprints/contagens de clients/client_contracts/receivables/expenses iguais aos anteriores. Nenhum registro copiado foi usado para simular transações.

SHA-256 inalterado: `9812B2BD74ACC1FB983318BAB62590DA6CF8E92A1536E85032FB8B604F84DCDB`. A migration não precisou de alteração. FKs garantem vínculos; filtros do backend garantem acesso por usuário. **Não existe RLS para consumidores SQL externos**: não compartilhar a conexão da aplicação com n8n.

Encerramento confirmado: dois schemas removidos, role excluída, arquivo privado de conexão apagado, compute novamente **disabled=true / idle /0,25CU**. Public preservado. A branch foi conservada; ela ainda não está preparada para uso persistente por um serviço remoto.

## Correções e verificações

- Proxy Vercel em Preview agora exige BACKEND_URL explícita HTTPS e bloqueia o host conhecido de produção, inclusive com ponto DNS final. Retorna503 antes do fetch; produção conserva seu comportamento atual. Correção **local**, ainda não publicada.
- Runner Neon usa endpoint/role/schema estritos, arquivo de sessão ignorado pelo Git, ambiente filho com allowlist do sistema e preload que impede carregar backend/.env. O runner local ignora a variável de sessão remota. Regressões para isolamento de variáveis e proxy.
- **49 testes backend**, **16 frontend**, TypeScript/build de ambos, ESLint sem warnings, npm audit atualizado: **zero vulnerabilidades** nos dois lockfiles.
- **11 cenários Chrome** sintéticos: projetos/revisão, GitHub, faturas/metas, assinaturas, ausência de preço inventado, revisão semanal, templates, validação de busca, mobile, offline sem API privada em cache e atualização voluntária preservando rascunho.
- Publicação PWA: manifesto e sw.js200, MIME correto, sw com `no-cache, no-store, must-revalidate` e `Service-Worker-Allowed: /`; bundle JS200 com MIME JavaScript, sem fallback HTML. Instalação física e push Android/iOS ainda pendentes.
- Prévia PID12848 encerrada com `SYNTHETIC_PREVIEW_STOPPED`; HTTP43170 e socket64354 livres. Browser fechado em finally. Nenhum serviço temporário desta tarefa mantido ativo.

A busca foi validada por contratos/validações, normalização e staging HTTP/SQL sintético. **Disponibilidade real do Overpass e execução remota n8n não foram comprovadas.** Não houve consulta de API de preços: só fixtures de contrato do suite, que não validam um monitor real.

## Matriz de credenciais

| Configuração | Local .env | Ambiente remoto / intervenção |
|---|---|---|
| DATABASE_URL, AUTH_SECRET, AUTH_URL, FRONTEND_URL | Presentes; AUTH_SECRET32+ | Render MCP não expõe leitura das variáveis; conferir nomes no Dashboard sem copiar valores para relatórios |
| ABELHA_INTEGRATION_TOKEN | Ausente | GET público503 confirma integração de produção sem token configurado; gerar token **de homologação** separado |
| ABELHA_INTEGRATION_ORGANIZATION_ID / USER_ID | Ausentes | Render: presença não verificável pelo conector; selecionar conta sintética da mesma organização na base isolada |
| VAPID_PUBLIC_KEY / PRIVATE_KEY / SUBJECT | Ausentes | Render: presença não verificável; gerar par exclusivo de homologação e contato válido; ensaiar aparelho |
| GITHUB_WEBHOOK_SECRET | Ausente | Render/GitHub: existência não verificável pelos conectores disponíveis; conferir antes de criar para não duplicar |
| PRICE_ALLOWED_HOSTS | Ausente | Manter vazio até escolher fonte real autorizada |
| Vercel VITE_API_URL | Presente nos escopos Production e Preview | Inspeção sem descriptografar; é usada apenas em DEV neste frontend |
| Vercel BACKEND_URL | **Ausente** | Criar apenas no escopo Preview com backend isolado; nenhuma variável Production foi alterada |
| n8n Header Auth backend | **Não existe Abelha** | Criar Abelha — Backend Homologação; Authorization / Bearer do token de homologação |
| n8n Header Auth entrada | **Não existe Abelha** | Criar Abelha — Entrada Homologação; X-Abelha-Webhook-Token / segredo distinto |
| Provedor preços | Não configurado | PROVIDER_URL inválido/PRODUCT_HOSTS vazio no nó; sem fonte autorizada, permanece pendente |

As oito credenciais listadas no n8n pertencem a outros usos; nenhuma foi reutilizada. Não foram lidos valores secretos. O plugin Cloudfy permite ler/editar definições e consultar execuções, mas **não oferece comando para iniciar execução de teste ou abrir listener Test URL**. Não há backend HTTPS de homologação disponível para receber chamadas do n8n existente.

## Passos manuais exatos para a próxima etapa

1. **Revisar/autorização de ambiente persistente:** aprovar a configuração proposta em [homologacao-config.json](integrations/homologacao-config.json). Não usar a conta/banco de produção. A autorização recebida foi somente para o ensaio temporário já encerrado. Não reativar o compute ou contratar plano para manter um backend sem nova aprovação. A branch antiga contém dados clonados e schema CRM desatualizado: preparar baseline CRM + migration05/11 em schema vazio dedicado ou branch schema-only, com identidade sintética e revisão do DDL, antes de liberar a aplicação completa. Não resetar seu public, não usar seed ou schema.sql destrutivo.
2. **Render, após aprovar a homologação:** serviço novo `abelha-gestor-api-hml`, repo higoraranda/abelha-gestor, Root Directory `backend`, Node, build `npm ci --include=dev && npm run build`, start `npm start`, Health Check `/health`, Auto-Deploy desligado. Selecionar Free somente se disponível; interromper se houver cobrança/upgrade. Nenhum desses recursos foi criado. O deploy deve usar a revisão local revisada, quando seu envio/publicação de teste for autorizado.
3. **Environment do serviço de homologação:** preencher os nomes do [modelo sem segredos](integrations/homologacao.env.example). DATABASE_URL exclusivamente isolada, com SSL/search_path correto e role sem gravação na produção/public clonado; NODE_ENV=production; AUTH_SECRET novo e independente; AUTH_URL canônica do backend de teste; FRONTEND_URL origem HTTPS exata do preview autorizado. PORT é fornecido pelo Render. Não copiar grupos de secrets de produção ou Evolution. Criar apenas usuário/organização sintéticos e usar seus UUIDs nos dois ABELHA_INTEGRATION_*_ID.
4. **Gerar segredos no computador/secret manager:** no backend executar `node scripts/generate-vapid.cjs` uma vez, guardar PUBLIC/PRIVATE e definir VAPID_SUBJECT com mailto real; gerar token de integração, segredo de entrada e GITHUB_WEBHOOK_SECRET independentes, por exemplo com `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` para cada um. Não versionar/copiar saídas para chat, URL ou logs. Não rotacionar AUTH_SECRET/VAPID de produção.
5. **Vercel:** abrir equipe higoraranda-gmailcoms-projects → projeto **abelha-gestor** (não abelha-crm) → Settings → Environment Variables. Adicionar BACKEND_URL somente em **Preview**, HTTPS do backend-hml. Não adicionar tokens/VAPID privada em VITE_*. Após autorização para publicar a revisão de teste, criar preview e conferir sessão/CSRF/cookie/login/logout. O guard novo ainda precisa dessa publicação; previews antigos sem ele podem atingir produção.
6. **n8n, único workflow:** abrir [n20DNyb13Aaw3nq5](https://socialbaboon-n8n.cloudfy.live/workflow/n20DNyb13Aaw3nq5), reler versão e manter desativado. Trocar a origem em **dez nós backend** listados no manifest, incluindo as duas expressões dinâmicas e GitHub, preservando paths. Não alterar a URL externa de preços para o backend. Criar Header Auth backend `Authorization: Bearer <token-hml>` e selecioná-la nos **nove nós backend exceto relay GitHub**. Criar Header Auth entrada `X-Abelha-Webhook-Token: <segredo-entrada-hml>` nos três Webhooks captura/busca/relatório. Não anexar Bearer ao provedor de preços ou GitHub. Não importar JSON/backups nem criar outro workflow.
7. **Ensaio n8n:** em cada Webhook usar Listen for test event e Test URL `/webhook-test/abelha/v1/...`; fornecer somente fixtures sintéticas e o header de entrada. Para rotinas manuais escolher uma operation por vez; conferir tick, contas e revisão separadamente. Testar captura/replay/conflito, busca/indisponibilidade/staging parcial, relatório/replay, HMAC inválido/válido, falha parcial e retry por item. Não ativar Schedule Trigger para isso. Validar fuso, relógio15min, deduplicação e saída ok:false. Confirmar versão n8n e CODE_ENABLE_STDOUT=true com o administrador Cloudfy; verificar logs genéricos, sem payloads. O status global success pode conter falha tratada.
8. **GitHub:** Settings → Webhooks de higoraranda/abelha-gestor: conferir se já existe a configuração; escolher **um** endpoint (backend-hml direto `/api/v1/integrations/github` ou relay Test URL enquanto listener estiver aberto), application/json, secret exclusivo igual ao backend-hml, eventos push/pull_request/workflow_run. Não registrar produção/teste como dois destinos do mesmo fluxo. Testar ping/assinatura/reenvio e matched_projects com projeto sintético; entrega signed não conclui marco. Não é necessário PAT. Produtor Codex deve enviar schema_version1/event_id estável, SHA completo, evidências reais e project_id; fixtures não são relatórios de trabalho real.
9. **PWA/push e preços:** ativar inscrição explicitamente em aparelho de teste, validar recebimento, rotação e logout, com VAPID de homologação. Manter preços desconfigurados até autorizar API/feed real, custos/credencial, PROVIDER_URL, PRODUCT_HOSTS e PRICE_ALLOWED_HOSTS; então conferir formato BRL, evidência da variação,429 e intervalo por produto. Não simular compra/transação real.
10. **Antes de produção:** revisar evidências do runtime, backup/restauração, identidade/variáveis e solicitar autorizações separadas para migration `20261111_personal_platform.sql`, publicação das alterações e ativação do único workflow. Os sete backups devem continuar desativados. Desligar/remover recursos temporários de cada ensaio.

## Ferramentas e evidências


Relatório legível por máquina: [homologation-20261112.json](audits/homologation-20261112.json). Capturas sintéticas: `diretório local de capturas (fora do repositório)`.

**Não está pronto para ativação em produção.** As validações de código/banco passaram, mas faltam migration autorizada em produção, credenciais, homologação HTTPS persistente, runtime n8n, fonte de preços e entrega push física.
