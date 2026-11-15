# 🐝 ABELHA — AUTOMAÇÕES

**Atualização13/11 — homologação conectada:** os dez destinos agora usam o backend HML; credenciais **Abelha — Backend Homologação** e **Abelha — Entrada Homologação** criadas/vinculadas.62 nós e estado desativado preservados. Configuração vigente, resultados e ensaio manual em [N8N-HOMOLOGACAO.md](N8N-HOMOLOGACAO.md). As instruções de configuração inicial abaixo registram12/11; não recriar credenciais nem reimportar os JSONs originais sobre o remoto configurado.

**Workflow único criado na Cloudfy/socialbaboon:** [n20DNyb13Aaw3nq5](https://socialbaboon-n8n.cloudfy.live/workflow/n20DNyb13Aaw3nq5). Estado conferido: **desativado**. São **62 nós**, com todas as ações dentro do mesmo workflow, sem Execute Workflow, subworkflows externos ou Error Workflow separado.

Base da continuação: `main/2485697`, checkout limpo ao iniciar. Não foi feito commit/push, deploy, migration ou teste de gravação no backend real. Instância, banco e serviços existentes foram preservados.

## Áreas e entradas

| Área visual | Entrada e função |
|---|---|
| 🟡 CAPTURA DE LEADS | Webhook protegido → extração/classificação por regras → candidato pendente. Não cria cliente automaticamente. |
| 🟡 BUSCA DE LEADS | Webhook protegido → Overpass no backend → staging com origem OpenStreetMap → revisão. |
| 🔵 LEMBRETES FINANCEIROS | Tick compartilhado de 15 minutos verifica horários e entrega push no backend. |
| 🔵 CONTAS E ASSINATURAS | Vencimentos já pertencem ao tick; auxiliar manual `accounts` preserva a chamada original. Não paga contas. |
| 🟢 MONITORAMENTO DE PREÇOS | Mesmo relógio → monitores devidos → API autorizada → validação/ingestão de observações reais. |
| 🟣 SINCRONIZAÇÃO DE PROJETOS | Webhooks separados Codex e GitHub, com relatório pendente e binário/HMAC preservados. |
| 🟣 REVISÃO SEMANAL | Final de domingo pertence ao tick; auxiliar manual `weekly-review` gera parcial. Nenhuma conclusão automática de marco. |
| 🔴 TRATAMENTO DE ERROS | Saídas internas de erro redigidas por bloco; resposta webhook503 ou resultado operacional `ok:false`, sem expor payload/segredo. |

Há **um Schedule Trigger**, um Manual Trigger e quatro Webhook Triggers. Sticky Notes delimitam as áreas, com amarelo, azul, verde, roxo e vermelho; os nós têm prefixos CAPTURA/BUSCA/FINANCEIRO/CONTAS/PREÇOS/PROJETOS/REVISÃO.

O relógio emite somente `tick` e `prices`, roteados por Switch. Contas e revisão final não fazem chamadas extras porque já pertencem ao tick existente. Uma entrada de captura/busca/projeto não passa por esse roteador e não aciona preços ou revisão.

Para um teste manual, abrir **Escolher operação** e alterar somente `operation` para `tick`, `accounts`, `prices` ou `weekly-review`; depois iniciar **Teste manual**. O valor é validado e apenas a saída correspondente é executada. `accounts` continua sendo alias do tick completo por compatibilidade com a arquitetura anterior, não uma rotina de pagamento.

## Configuração manual no consolidado

1. Abrir somente o [workflow consolidado](https://socialbaboon-n8n.cloudfy.live/workflow/n20DNyb13Aaw3nq5). Não importar novamente e não ativar backups. Confirmar a versão n8n em Help/About; importação/releitura são comprovadas, execução no runtime depende do ensaio com credenciais.
2. Preparar homologação conforme [HOMOLOGACAO-INTEGRACAO.md](HOMOLOGACAO-INTEGRACAO.md) e [CHECKLIST-ATIVACAO.md](CHECKLIST-ATIVACAO.md). Em12/11, base2485697 já publicada em Render/Vercel e rota de preços503 por integração não configurada;404 anterior superado. O ensaio Neon isolado passou e foi limpo, com compute novamente disabled/idle; nenhuma migration de produção. Backend HTTPS persistente de homologação ainda pendente. Não mudar URLs para host inventado.
3. No host do backend, configurar `ABELHA_INTEGRATION_TOKEN`, IDs da organização/usuário, VAPID, secret GitHub e allowlist de preços conforme [GUIA-CONFIGURACAO.md](GUIA-CONFIGURACAO.md). Preservar AUTH_SECRET, cookies, banco e credenciais existentes. Em homologação, trocar as URLs de **todos os nós HTTP de backend** para o host de teste.
4. Criar/selecionar **Abelha — Backend** (Header Auth, Name `Authorization`, Value `Bearer <ABELHA_INTEGRATION_TOKEN>`) nos nós: CAPTURA · Enviar captura para revisão; BUSCA · Consultar Overpass pelo backend / Guardar candidato público; FINANCEIRO · Executar tick completo; CONTAS · Conferir pendências pelo tick; PREÇOS · Listar monitores devidos / Registrar observação; PROJETOS · Registrar relatório pendente; REVISÃO · Gerar revisão parcial.
5. Criar/selecionar **Abelha — Entrada Webhook** (Header Auth, Name `X-Abelha-Webhook-Token`, segredo distinto de32+ caracteres) nos nós CAPTURA · Receber captura, BUSCA · Receber busca e PROJETOS · Receber relatório Codex. O chamador envia esse header a partir de servidor/conector; não colocar o segredo em formulário público.
6. Não selecionar a credencial backend em **PREÇOS · Consultar API autorizada** nem **PROJETOS · Encaminhar GitHub assinado**. As fontes remotas antigas estavam sem credenciais; nenhuma credencial de terceiro foi reutilizada ou valor secreto extraído. O gerador conserva referências quando houver uma credencial autorizada na fonte.
7. Em **PREÇOS · Preparar consultas autorizadas**, configurar `PROVIDER_URL`/`PRODUCT_HOSTS`; em **Consultar API autorizada**, escolher a credencial própria da fonte e mapear seu contrato real. Resposta esperada: objeto com event_id estável, store, product_url da mesma variação, price numérico BRL, currency BRL e observed_at real da consulta. Preservar fullResponse=true, redirects desligados e TLS. Fonte inválida, arrays/null e preços fictícios não são aceitos.
8. Salvar horários em Personal → Preferências, configurar VAPID uma vez e ativar cada aparelho explicitamente. Push físico e rotação/logout continuam exigindo ensaio real.
9. Para logs operacionais, confirmar no host n8n **CODE_ENABLE_STDOUT=true** e testar que o código/bloco genérico chega ao destino de logs. Essa variável permanece sem alteração. `console.log` é utilizado; não depender de console.warn, descartado pelo sandbox. Não habilitar logs de payloads financeiros/credenciais.

O schema de Header Auth foi conferido pela API: campos name/value. Todos os nós foram copiados com seus parâmetros e referências de credenciais originais; na instância atual elas ainda não estavam configuradas.

## URLs e contratos preservados

| Entrada POST | Caminho no n8n |
|---|---|
| Captura | `/webhook/abelha/v1/leads/capture` |
| Busca | `/webhook/abelha/v1/leads/search` |
| Codex | `/webhook/abelha/v1/projects/report` |
| GitHub | `/webhook/abelha/v1/projects/github` |

Base: `https://socialbaboon-n8n.cloudfy.live`. Os paths são os mesmos; os antigos ficam inativos para evitar colisão. URLs de produção não estão registradas enquanto o consolidado estiver desativado. Para homologação, usar o Test URL do nó (`/webhook-test/...`) e Listen for test event.

Captura exige event_id/message_id estável, source email/form, name e summary/message/text; classificação é por regras explícitas, sem LLM contratado. Busca exige niche/city/limit1–50. Codex recebe project_id UUID/report v1 com evidências reais. Detalhes dos contratos em [INTEGRACOES-N8N.md](INTEGRACOES-N8N.md).

GitHub conserva Raw Body em binary.data, Content-Type application/json e os três headers de assinatura/event/delivery. HMAC é validado no backend sobre os bytes originais; esse webhook não usa Header Auth porque GitHub não o envia. Secret fica no GitHub/backend. Escolher relay n8n **ou** webhook direto, sem duplicar a configuração. Assinatura inválida não persiste evento nem conclui marco.

## Frequências, deduplicação e falhas

O relógio roda a cada15min em America/Sao_Paulo. O backend conserva horários individuais, janela de virada de30min, deduplicação diária/vencimento/semana e confirmação push por aparelho. Monitores respeitam `interval_minutes`: teste real de SQL confirmou que intervalo60min não retorna devido aos59min, e retorna aos61min. Não consultar cada produto indiscriminadamente a cada tick.

As únicas repetições de grafo são **percursos finitos de lote**, com batchSize1/reset=false: até50 candidatos e20 observações. Não há ciclos entre gatilhos ou automações, autorreferência de workflow ou reativação de cron. Isso preserva as três tentativas de cada escrita mesmo quando o primeiro item do lote já teve sucesso; os endpoints deduplicam reenvios. Consulta de API paga/Overpass não recebe repetição automática.

Ao terminar um lote de busca, é obrigatório conferir a quantidade esperada e ausência de falhas: resultado parcialmente salvo responde503, nunca sucesso200. Itens já persistidos são reutilizados no reenvio. Observações válidas de preços continuam a ser processadas se outra falhar; o resumo informa processed/failed/ok e o collector emite somente código genérico.

Uma falha tratada no ramo agendado não aborta a outra operação do relógio. Por isso o status global n8n pode aparecer como concluído mesmo com `ok:false` no bloco: conferir a saída no teste sintético e os logs genéricos no host. Retenção de dados de execução de sucesso/erro/manual/progresso continua desligada. Sem stdout/configuração de logs, não prometer alerta operacional persistente. Nenhum Error Workflow externo foi criado.

## Equivalência e testes executados

- Sete fontes remotas comparadas integralmente aos modelos: nós, conexões e settings iguais, sem referências de credenciais na instalação atual. Consolidado gerado com mesmos endpoints/validações, body binário e política de segurança; referências internas renomeadas sem quebrar o pairing de preços.
- **47 testes backend aprovados**, incluindo8 testes de consolidação: configuração, equivalência, isolamento, roteamento, erros sem segredos, referências de credenciais, resposta parcial e retry por item. Code nodes do **consolidado** foram executados em VM e ligados a HTTP real/postgres.js/PGlite sintético para captura, staging, relatório, GitHub e preços. Tick, contas, revisão e fila push continuam cobertos no backend.
- **13 testes frontend**, TypeScript/build dos dois e ESLint sem warnings. `git diff --check` conferido. Nenhuma alteração de frontend foi necessária.
- Revisão independente encontrou logger inadequado e perda de retry em lote parcial; ambos corrigidos com regressão vermelho/verde. Native SplitInBatches3 done0/loop1 e RespondToWebhook1.1/Switch3.2 foram conferidos na implementação oficial.
- Criação remota e releitura do consolidado comprovaram igualdade de62 nós, conexões/settings e `active:false`. Os sete backups permaneceram existentes/inativos; os três workflows de outros projetos não mudaram.

**Limites:** nenhum workflow foi executado/ativado no runtime remoto; credenciais/fontes ainda faltam e o plugin não oferece execução de teste. Não houve POST de teste em produção, consulta de loja, entrega de email/push físico ou nova consulta pública Overpass. Esses testes precisam de homologação e configuração autorizadas. Não interpretar testes de contrato como operação real ativa.

Relatório estruturado: [n8n-unification-20261112.json](audits/n8n-unification-20261112.json). Gerador local: `backend/scripts/build-n8n-unified.cjs`; artifact único: `docs/integrations/n8n/abelha-automations.json`. Gerar o JSON não publica nem atualiza n8n. Em futuras alterações, ler o consolidado remoto e preservar URLs/credenciais/configuração manual; não sobrescrever cegamente a partir dos backups.

## Backups preservados, sem exclusão

| Workflow antigo | ID | Estado confirmado |
|---|---|---|
| Lembretes Financeiros | RIUNsrZPnldxps8j | Desativado |
| Captura de Leads | Sb4LGFXnX2q8QQVO | Desativado |
| Busca de Leads | 3glUHHeETfeQzJbr | Desativado |
| Monitor de Preços | KQ29tKdXsT4seDHN | Desativado |
| Sincronização de Projetos | vHpvCObsiu5fRXWe | Desativado |
| Contas e Assinaturas | U9xr0ZokbZeXDaAb | Desativado |
| Revisão Semanal | RnE5lBhUY3k0hoAV | Desativado |

Todos já estavam inativos antes desta tarefa; a conferência após equivalência confirmou o estado, sem necessidade de interromper um fluxo ativo. Não ativar junto com o consolidado. Os backups não são chamados pelo workflow novo.

Próximo ensaio: configurar credenciais em homologação, testar cada webhook e cada valor de operation separadamente, forçar falha de um bloco verificando o outro relógio, conferir stdout e frequência individual, testar assinatura/reenvio e push físico. Somente depois solicitar autorização para ativar **este único workflow**. Sem deploy, migration, commit ou push nesta tarefa; testes fecharam HTTP/SQL/sockets e não ficou serviço temporário ativo.

Fontes primárias: [Switch](https://github.com/n8n-io/n8n/blob/master/packages/nodes-base/nodes/Switch/V3/SwitchV3.node.ts), [lotes finitos](https://github.com/n8n-io/n8n/blob/n8n%401.100.1/packages/nodes-base/nodes/SplitInBatches/v3/SplitInBatchesV3.node.ts), [retry do motor](https://github.com/n8n-io/n8n/blob/n8n%401.100.1/packages/core/src/execution-engine/workflow-execute.ts), [stdout do Code node](https://github.com/n8n-io/n8n/blob/n8n%401.100.1/packages/nodes-base/nodes/Code/Code.node.ts).
