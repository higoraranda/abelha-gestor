# Integrações e continuidade dos projetos

## Estado e limites

**Após unificação:** usar somente [🐝 ABELHA — AUTOMAÇÕES / n20DNyb13Aaw3nq5](https://socialbaboon-n8n.cloudfy.live/workflow/n20DNyb13Aaw3nq5), desativado, com todos os blocos internos e um único relógio. Os sete fluxos anteriores permanecem backups inativos. Configuração/testes/limitações atuais em [WORKFLOW-UNICO-N8N.md](WORKFLOW-UNICO-N8N.md). Não ativar os modelos antigos; os nomes de nós a seguir recebem prefixos do bloco no consolidado.

Em 12/11/2026, **sete workflows foram criados diretamente na Cloudfy/socialbaboon**, todos desativados, sem credenciais ou dados fixados. Não importar duplicados: IDs, funções e configuração exata por nó estão em [CLOUDFY-N8N.md](CLOUDFY-N8N.md) e [inventário](integrations/cloudfy-workflows.json). A captura já extrai campos e classifica por regras, sem IA. O monitor tem pipeline de consulta/validação/ingestão preparado para a API autorizada escolhida pelo usuário; a fonte e suas credenciais ainda não estão configuradas.

## Configuração

1. Após autorização de ativação do banco, aplique apenas a migration incremental descrita em GUIA-CONFIGURACAO.md, no ambiente explicitamente autorizado.
2. No backend, defina token aleatório exclusivo com pelo menos 32 caracteres, `ABELHA_INTEGRATION_ORGANIZATION_ID` e `ABELHA_INTEGRATION_USER_ID` da conta já existente. O payload não escolhe a conta. Não compartilhe DATABASE_URL com n8n.
3. No n8n, crie **Header Auth**: nome `Authorization`, valor `Bearer <token>`. Selecione essa credencial no nó HTTP; nunca grave o token em JSON exportado, frontend ou variável pública.
4. Os nós apontam à URL canônica **direta do backend**, `https://abelha-gestor-api.onrender.com`. A base2485697 já está publicada; GET de preços responde503 por integração não configurada, superando o404 histórico. Em homologação, alterar os dez nós backend preservando paths/expressões **somente quando existir um backend HTTPS isolado autorizado**. Lista exata e configurações em [HOMOLOGACAO-INTEGRACAO.md](HOMOLOGACAO-INTEGRACAO.md) e [manifesto](integrations/homologacao-config.json). Os modelos não requerem `$vars`/plano pago. Não encaminhar GitHub pelo proxy frontend; o relay n8n preparado conserva o binário original.
5. Abrir somente o consolidado. Um Schedule Trigger de15min roteia tick e preços; contas/revisão final pertencem ao tick, sem cron redundante. Auxiliares manuais usam Escolher operação. O backend conserva horário/domingo em São Paulo, deduplicação e tolerância de30min na virada. Frequência de cada produto permanece no GET due.
6. Confira as execuções em ambiente sintético. Os modelos desabilitam armazenamento de dados de execução de sucesso/erro e execuções manuais (`saveManualExecutions=false`); configure também retenção e logs da instância sem conteúdo financeiro/credenciais.

Token e conta são validados em todas as rotas; tokens de integração não podem concluir marcos, pagar contas, contratar serviços nem consultar SQL arbitrário. Rotas retornam 503 quando não configuradas. Em produção, também configure limite de requisições do proxy/host conforme a instalação; o limite público Overpass está implementado por processo, não é um limitador distribuído.

## Endpoints

Base `/api/v1/integrations`, `Authorization: Bearer ...` obrigatório exceto GitHub (HMAC).

| Método/caminho | Entrada / resultado |
|---|---|
| POST `/leads/capture` | `event_id,source(email/form),name,summary,evidence_reference`; opcionais `phone,email,classification`. Grava candidato para revisão, não um cliente automaticamente. |
| POST `/leads/search` | `niche,city,limit`; dados Overpass e atribuição. Sem importação automática. |
| POST `/leads/stage` | Resultado normalizado OpenStreetMap, com `source_key,name,niche,queried_at` e contatos opcionais. Deduplica por organização/origem e deixa candidato pendente; não cria cliente. |
| POST `/projects/:id/reports` | Relatório v1; devolve registro pendente, reenvio do mesmo evento reutiliza ID; mudança de conteúdo retorna 409. |
| GET `/prices/due` | Monitores ativos com frequência vencida; exige `PRICE_ALLOWED_HOSTS`. Não consulta uma loja. |
| POST `/prices/:id/observations` | `event_id,store,product_url,price,observed_at`; host explicitamente autorizado, preço real positivo, data recente e ordenada. Reenvio reutiliza observação. |
| POST `/tick` | Corpo `{}`. Processa horários, contas, revisão de domingo e fila push. Reexecuções não duplicam os avisos. |
| POST `/weekly-review` | Gera fotografia parcial desta semana; reenvio mantém a parcial. O tick de domingo atualiza e finaliza a semana mesmo se uma parcial já existir. |
| POST `/github` | Webhook assinado `X-Hub-Signature-256`; aceita push/PR/workflow_run, deduplica delivery. Só registra evento, sem concluir marcos. |

Não use preços de produtos/variações diferentes sob o mesmo link para calcular descontos. A comparação é por monitor + loja + URL. Em caso de queda ou cruzamento do alvo, uma notificação guarda a comparação e o histórico contém o link direto. O backend não afirma ter feito a consulta: a evidência é a observação da fonte autenticada. Configure o provedor e seus limites/custos antes de ativar.

A revisão inclui compromissos da agenda comercial autorizada à organização, marcos realmente revisados, faturas, metas, contas e alertas de preço. Projetos sem atualização por sete dias são sinalizados como contexto a revisar, nunca como abandonados ou concluídos por inferência de IA. O relatório parcial é promovido uma única vez no domingo, com aviso final distinto e cortes de tempo explícitos em São Paulo.

## Relatório reutilizável do Codex

Contrato em `docs/integrations/development-report.schema.json`. No projeto acompanhado:

1. Execute testes e critérios reais. Não declare aprovação sem observar o resultado.
2. Use o SHA completo de um commit existente no repositório cadastrado. Sem autorização de commit/push, mantenha o relatório local e não invente SHA ou URL de execução.
3. Use `event_id` estável por execução (ex.: ID e tentativa do GitHub Actions).
4. Liste comandos e URLs reais de execuções aprovadas do mesmo repositório; PR é opcional. O servidor valida formato e vínculo ao repositório, **não consulta a API do GitHub para comprovar resultados**.
5. Envie pelo endpoint autenticado ou cole na tela. O usuário abre os links e confirma todos os critérios antes de concluir um marco. Nenhuma afirmação da IA ou evento GitHub altera o progresso por si.

GitHub: gere secret separado (32+ caracteres), eventos push, pull_request e workflow_run, tipo JSON. Escolha o relay n8n preparado em CLOUDFY-N8N.md ou a URL direta `/api/v1/integrations/github`; não configurar ambos para o mesmo evento. O relay não reserializa JSON: conserva bytes binários e encaminha HMAC/event/delivery; a validação criptográfica continua no backend, sem Header Auth nesse caminho. Apenas esse endpoint backend aceita até 2 MiB; outras APIs conservam 100 KiB. O repositório é comparado sem distinção de caixa e replay não altera a atividade. Confira `matched_projects` e `recorded_updates`. Evento não conclui marco.

## Prontidão real dos sete modelos

| Modelo | Pronto no código | Ainda necessário |
|---|---|---|
| finance-reminder / subscriptions-alerts / weekly-review | Tick agendado único; auxiliares manuais; horário, deduplicação e fila push | Backend publicado/migration, Header Auth, conta/horários; VAPID e teste físico |
| leads-search | Webhook protegido → busca/normalização → staging para revisão | Credenciais, fonte de pedidos e disponibilidade pública; ensaio remoto |
| leads-capture | Webhook protegido, extração/classificação por regras, recepção idempotente e revisão humana | Credenciais e conector email/formulário autorizado; IA é opcional, não conectada |
| project-sync | Webhooks Codex/GitHub, validação UUID e relay binário HMAC | Credencial de entrada/saída, produtor Codex, secret/configuração GitHub e ensaio |
| price-monitor | Due → API HTTPS configurável → validação de objeto BRL → POST de observações | Selecionar API/feed autorizado, URL/hosts/credencial e mapear formato nativo se diferente; teste real |

Criação e releitura das definições remotas foram verificadas, inclusive igualdade de nós/settings e estados desativados. Os contratos dos Code nodes foram executados em VM e ligados a HTTP/SQL sintéticos; execução real no runtime n8n permanece pendente. Nenhuma credencial de outros projetos foi reutilizada, segredo lido ou dado comercial alterado. Veja [CLOUDFY-N8N.md](CLOUDFY-N8N.md) e [CHECKLIST-ATIVACAO.md](CHECKLIST-ATIVACAO.md).

## Fontes técnicas

[Importação/exportação n8n](https://docs.n8n.io/workflows/export-import/), [Overpass](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html), [Web Push](https://github.com/web-push-libs/web-push), [assinaturas de webhook GitHub](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries).
