# Abelha no n8n Cloudfy — configuração e ativação

Estado em **12/11/2026**: sete workflows criados diretamente pelo plugin Cloudfy na infraestrutura existente **socialbaboon** (`a1d393bd-e0ee-42f0-9408-37b9f5a49cff`). Todos permanecem **desativados**, sem credenciais associadas e sem execução remota. Não foi criada instância, servidor ou banco.

Os três workflows preexistentes foram conferidos por ID, tipo de nós e referências funcionais; nenhum referencia Abelha nos parâmetros. Permaneceram com os mesmos IDs, estados e datas de alteração. O maior JSON veio truncado pelo plugin; a conferência complementar usou apenas agregados de metadados em SQL READ ONLY, sem ler execuções/pacientes ou segredos.

## Inventário real

| Nome no n8n | ID / editor | Função | Estado |
|---|---|---|---|
| Abelha — Captura de Leads | [Sb4LGFXnX2q8QQVO](https://socialbaboon-n8n.cloudfy.live/workflow/Sb4LGFXnX2q8QQVO) | Webhook autenticado, extração/classificação por regras, candidato pendente | Desativado |
| Abelha — Busca de Leads | [3glUHHeETfeQzJbr](https://socialbaboon-n8n.cloudfy.live/workflow/3glUHHeETfeQzJbr) | Entrada validada → Overpass pelo backend → candidatos OpenStreetMap | Desativado |
| Abelha — Lembretes Financeiros | [RIUNsrZPnldxps8j](https://socialbaboon-n8n.cloudfy.live/workflow/RIUNsrZPnldxps8j) | Único tick agendado de fatura, contas, domingo e push, a cada 15 min | Desativado |
| Abelha — Contas e Assinaturas | [U9xr0ZokbZeXDaAb](https://socialbaboon-n8n.cloudfy.live/workflow/U9xr0ZokbZeXDaAb) | Auxiliar manual do tick; não paga contas | Desativado, sem cron |
| Abelha — Monitor de Preços | [KQ29tKdXsT4seDHN](https://socialbaboon-n8n.cloudfy.live/workflow/KQ29tKdXsT4seDHN) | Monitores devidos → API autorizada a configurar → observação validada | Desativado, fonte não configurada |
| Abelha — Sincronização de Projetos | [vHpvCObsiu5fRXWe](https://socialbaboon-n8n.cloudfy.live/workflow/vHpvCObsiu5fRXWe) | Relatório Codex e relay binário GitHub/HMAC, com revisão humana | Desativado |
| Abelha — Revisão Semanal | [RnE5lBhUY3k0hoAV](https://socialbaboon-n8n.cloudfy.live/workflow/RnE5lBhUY3k0hoAV) | Auxiliar manual da revisão parcial; final de domingo é do tick | Desativado, sem cron |

IDs e configurações conferidas em [integrations/cloudfy-workflows.json](integrations/cloudfy-workflows.json). **Não importar novamente**: abrir os IDs existentes. Para futuras mudanças, ler o workflow atual e editar somente os campos necessários; preservar credenciais inseridas manualmente. Os JSONs locais não incluem credenciais.

## O que foi efetivamente verificado

- Criação aceita pela API n8n e releitura dos sete workflows: igualdade de nós, conexões e settings; `active:false`, fuso `America/Sao_Paulo`, timeout 900s e retenção de payloads desligada.
- Tipos já presentes na instância: HTTP Request 4.2, Webhook 2, Schedule Trigger 1.2 e Code 2. IF 2 foi conferido contra a implementação oficial. A versão exata do servidor não é exposta pelo plugin; `/types/nodes.json` exige sessão administrativa. Não foi solicitada/extraída chave de acesso. Confirmar a versão em **Help/About** e executar os testes manuais abaixo antes de ativar; importação aceita não comprova runtime completo.
- Backend local: **39 testes**, incluindo execução dos Code nodes exportados → HTTP real → postgres.js → PGlite efêmero. Foram comprovados captura, staging público, relatório, bytes HMAC, observação de preço e reenvios, com dados sintéticos. Os Code nodes também recusam identificadores/cidades inválidos, fonte sem configuração, moeda errada, outro produto, preço zero e resposta `[]`/nula.
- Frontend: **13 testes**, TypeScript, lint sem warnings e build; navegador Chrome: **11 cenários** desktop/mobile/offline, sem erros JavaScript. npm audit backend/frontend em 12/11: **zero alertas** nos lockfiles atuais.
- Consulta HTTP pública somente leitura: backend canônico `/api/auth/session` respondeu 200; `/api/v1/integrations/prices/due` respondeu **404**. Portanto o backend publicado **ainda não disponibiliza esta versão das integrações**. Inserir tokens não resolve esse 404: é necessário ensaio e publicação autorizados do código/migration.

Não foram executados workflows remotamente nem chamadas de gravação ao backend publicado. Consulta real Overpass, API de loja, email e push físico não foram comprovados nesta execução.

## 1. Preparar o backend autorizado

1. Seguir [CHECKLIST-ATIVACAO.md](CHECKLIST-ATIVACAO.md) para escolher/autorizar homologação, ensaiar a migration e só depois autorizar produção. Não executar schema.sql, reset ou seed. A migration conserva SHA-256 `9812B2BD74ACC1FB983318BAB62590DA6CF8E92A1536E85032FB8B604F84DCDB` e não foi aplicada ao Neon.
2. No painel do host do backend que atende `https://abelha-gestor-api.onrender.com`, abrir **Environment/variáveis do serviço**. Preservar `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `FRONTEND_URL`, `NODE_ENV=production` e as variáveis Evolution existentes. Não copiar segredos para o n8n ou para `VITE_*`.
3. Inserir `ABELHA_INTEGRATION_TOKEN` aleatório de 32+ caracteres, `ABELHA_INTEGRATION_ORGANIZATION_ID` e `ABELHA_INTEGRATION_USER_ID` reais da mesma conta. O backend resolve esse escopo; um payload externo não o escolhe.
4. Para GitHub, inserir `GITHUB_WEBHOOK_SECRET` independente (32+ caracteres). Para preços, `PRICE_ALLOWED_HOSTS` contém hosts exatos autorizados separados por vírgula. Para push, gerar uma vez `node scripts/generate-vapid.cjs` no backend e guardar `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` no host. Não rotacionar AUTH_SECRET ou VAPID a cada build.
5. Publicar somente após autorização. Nos testes, apontar **todos os nós HTTP de backend** ao backend de homologação, preservando `/api/v1/integrations/...`. Os arquivos estão preparados com a URL canônica real; não executar uma prévia gravando na produção.

O novo endpoint `POST /api/v1/integrations/leads/stage` é parte desta versão local. Recebe um resultado OpenStreetMap normalizado e registra somente candidato para revisão. Não cria clientes, contratos ou cobranças. A importação manual existente reutiliza a mesma validação. Nenhuma alteração de schema adicional foi necessária.

## 2. Credencial n8n → backend

Na instância [socialbaboon](https://socialbaboon-n8n.cloudfy.live/), abrir **Credentials → Add credential → Header Auth**:

- Nome da credencial: **Abelha — Backend**.
- Campo **Name**: `Authorization`.
- Campo **Value**: `Bearer ` seguido do valor de `ABELHA_INTEGRATION_TOKEN` do ambiente escolhido.
- Se a versão oferecer restrição de domínio, limitar ao host do backend desse ambiente.

Em cada nó abaixo, **Authentication = Generic Credential Type**, **Generic Auth Type = Header Auth**; selecionar essa credencial:

| Workflow | Nós de backend |
|---|---|
| Captura | Enviar captura para revisão |
| Busca | Consultar Overpass pelo backend; Guardar candidato público |
| Lembretes | Executar tick completo |
| Contas | Conferir pendências pelo tick |
| Preços | Listar monitores devidos; Registrar observação |
| Projetos | Registrar relatório pendente |
| Revisão | Gerar revisão parcial |

**Não selecionar essa credencial** em “Consultar API autorizada” ou “Encaminhar GitHub assinado”. Nenhuma credencial de clínica/WhatsApp/IA já existente foi reutilizada. Não alterar `N8N_ENCRYPTION_KEY` da instância existente.

## 3. Proteger e conectar as entradas

Criar outra credencial **Header Auth**, nome **Abelha — Entrada Webhook**, campo Name `X-Abelha-Webhook-Token`, Value com um **segredo distinto** de 32+ caracteres. Selecionar nos nós **Receber captura**, **Receber busca** e **Receber relatório Codex** (Authentication = Header Auth). A fonte que chama esses endpoints envia esse header. Guardar o segredo no servidor/conector da fonte; nunca em HTML/JavaScript público.

| Entrada | URL de produção preparada, ainda inativa |
|---|---|
| Captura | `https://socialbaboon-n8n.cloudfy.live/webhook/abelha/v1/leads/capture` |
| Busca | `https://socialbaboon-n8n.cloudfy.live/webhook/abelha/v1/leads/search` |
| Relatório Codex | `https://socialbaboon-n8n.cloudfy.live/webhook/abelha/v1/projects/report` |
| GitHub/HMAC | `https://socialbaboon-n8n.cloudfy.live/webhook/abelha/v1/projects/github` |

Enquanto desativado, usar **Test URL / Listen for test event** do próprio nó, com prefixo `/webhook-test/`, depois de configurar o ambiente sintético. As URLs de produção só são registradas ao ativar/publicar o workflow.

**Captura:** enviar JSON com `event_id` estável (ou `message_id` real), `source` = `email` ou `form`, `name`, `summary`/`message`/`text`; opcionais `email`, `phone`, `evidence_reference`. O texto permite extrair email e telefone com rótulo WhatsApp/telefone; classificação é explicitamente **“Regra local: …”**, sem IA. A mesma entrada reusa o evento; conteúdo diferente no mesmo ID retorna 409. Email precisa de um conector/forwarder configurado pelo usuário que encaminhe esses campos, sem anexos ou caixas de terceiros. A entrada webhook já está implementada; uma conta IMAP não foi conectada.

**Busca:** enviar `niche` (`dentists`, `clinics`, `restaurants`, `beauty`, `gyms` ou `shops`), `city`, `limit` inteiro de 1–50. O backend consulta e normaliza Overpass, e o workflow envia candidatos identificados por `node/way/relation`. Resultado zero é resposta legítima; indisponibilidade é erro. Respeitar um minuto entre consultas. Revisar em **CRM → Buscar leads → Capturas para revisar**; somente “Aprovar e abrir contato” cria/associa cliente.

**Codex:** enviar `project_id` UUID real e `report` conforme [development-report.schema.json](integrations/development-report.schema.json). Usar SHA, testes e links reais do repositório cadastrado; não inventar evidências. O backend confere formato/vínculo, não consulta a API GitHub. O usuário abre os links e confirma critérios antes de concluir um marco. Nenhum token permite concluir marcos automaticamente.

**GitHub:** em **Repository → Settings → Webhooks → Add webhook**, inserir a URL preparada acima, Content type `application/json`, secret igual a `GITHUB_WEBHOOK_SECRET`, eventos `push`, `pull_request` e `workflow_run`. O nó GitHub fica **sem Header Auth**: a autenticidade é HMAC-SHA256 validada pelo backend. Não alterar `Raw Body`, o binário `data`, os três headers nem o nó de envio para JSON; isso quebraria a assinatura. Limite backend 2 MiB; configure limites/controle de tráfego do host antes de ativar. Alternativamente usar o webhook direto no backend, **escolhendo só um caminho**, para não duplicar a configuração. Testar assinatura inválida, delivery repetido e `matched_projects >= 1`.

## 4. Configurar a API de preços escolhida

1. Escolher uma API/feed autorizado e seus custos/limites. Nenhum provedor foi contratado ou inventado. Abrir **Monitor de Preços → Preparar consultas autorizadas** e editar `PROVIDER_URL` para a URL HTTPS da API real; editar `PRODUCT_HOSTS` com os mesmos hosts exatos de produtos de `PRICE_ALLOWED_HOSTS`. Credenciais/portas/redirects em URL são recusados. Desejos sem link ficam aguardando configuração e não bloqueiam os demais; nenhum preço é gerado para eles.
2. Abrir **Consultar API autorizada**: método preparado `POST`, corpo `{monitor_id,product_url}`, credencial **Abelha — API de Preços**, separada da credencial backend. Criar essa credencial com o header exigido pelo provedor (ex.: `X-API-Key` ou `Authorization`), com valor real fornecido pelo serviço e domínio limitado à API. Se a API usar OAuth ou outro contrato, selecionar o tipo correto e ajustar somente esse nó/mapeamento conforme documentação da fonte.
3. A resposta de cada consulta deve ser **um objeto** com `event_id` estável da fonte, `store`, `product_url` exatamente igual ao produto/variação solicitado, `price` numérico positivo com até duas casas, `currency:"BRL"` e `observed_at` ISO real. Se o formato nativo diferir, mapear os campos após escolher a fonte; não preencher preço/ID/data artificialmente para passar na validação.
4. Conservar **Include Response Headers and Status = true** e **Response Format = JSON** nesse nó: a validação lê `body` e `statusCode`, recusando 200 com `[]`, null ou objeto inválido. Conservar redirects desativados e validação TLS. Lotes de uma consulta com intervalo de 1s estão preparados; ajustar limites maiores conforme contrato da fonte. Sem repetição automática de consultas pagas.
5. “Registrar observação” envia somente campos validados ao backend. Reenvios idênticos reusam o registro; moeda errada, preço inválido, evento conflitante e observações antigas são rejeitados. Histórico/notificação de queda ficam no backend; entrega push ocorre no tick.

## 5. Horários, notificações e erros

Abrir **Personal → Preferências**, salvar horário diário e revisão de domingo. Em cada aparelho, clicar **Ativar neste dispositivo** depois de VAPID/banco configurados. Não há pedido automático de permissão. Avisos de tela bloqueada são genéricos; o cache da PWA continua sem APIs/dados financeiros.

Ativar futuramente somente **Lembretes Financeiros** como agendador de tick a cada 15 minutos. Ele já faz contas, domingo e push. **Contas e Assinaturas** e **Revisão Semanal** são auxiliares manuais; não precisam ser ativados. O monitor de preços tem seu próprio relógio, separado, e só deve ser ativado após validar a fonte. Backend mantém deduplicação por dia/vencimento/semana, relatório/evento e entrega por aparelho. Janela de virada é 30 min; uma interrupção longa exige conferência manual.

HTTPs interrompem em erro, sem “Continue on Fail”. Mutações idempotentes têm até três tentativas com intervalo de 2s. Overpass e consulta do provedor não são repetidos automaticamente; 429, 401/503 e erro de contrato exigem correção da configuração/origem. O n8n conserva apenas metadados de execução; dados de sucesso/erro/manual/progresso não são persistidos nestes modelos. Acompanhar status em **Executions**; durante diagnóstico usar somente payload sintético e conferir também logs/retenção da instância, sem registrar tokens/payloads pessoais.

Aceitação de push pelo provedor não comprova exibição. Falha de commit depois do envio externo pode ocasionar reentrega; não há garantia distribuída exactly-once. Validar dois aparelhos, expiração, logout e rotação VAPID antes de produção.

## 6. Testes finais e próxima autorização

1. Autorizar/preparar homologação com esta versão do backend e migration; confirmar URLs/conta de teste em todos os nós.
2. Configurar credenciais de backend e entrada. No Test URL, enviar captura sintética duas vezes: um candidato, nenhum cliente até revisão. Alterar conteúdo com mesmo event_id deve falhar; header inválido deve ser rejeitado.
3. Fazer uma busca pública autorizada; conferir origem/atribuição, revisão e repetição sem duplicar contato. Não considerar zero resultados ou timeout prova de integração aprovada.
4. Relatório com projeto real de teste deve ficar pendente; GitHub assinado deve registrar atividade uma vez; assinatura inválida não grava. Confirmar corpo original no relay.
5. Com a API de preços selecionada, conferir cotação real, moeda, loja/link/variação, repetição, 429/5xx, `[]` e queda/alvo. Sem fonte, manter o workflow parado.
6. Executar tick com preferências e conta sintética, duas vezes; conferir deduplicação. Testar revisão parcial/final de domingo e push físico.
7. Confirmar versão n8n, ausência de erros nos nós e testes concluídos. Só então autorizar publicação/migration de produção e ativação seletiva dos workflows. A criação desativada já foi autorizada e realizada; não precisa importar novamente.

Nenhuma migration de produção, deploy, commit, push ou PR foi feito. A prévia local PID21312 foi encerrada; portas43170/59133 livres; browser e sockets de teste fechados. Serviços existentes do usuário permanecem intactos.

Referências primárias: [Webhook e modos de teste](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/), [Code node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.code/), [HTTP Request](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/), [implementação HTTP/binário](https://github.com/n8n-io/n8n/blob/n8n%401.100.1/packages/nodes-base/nodes/HttpRequest/V3/HttpRequestV3.node.ts).
