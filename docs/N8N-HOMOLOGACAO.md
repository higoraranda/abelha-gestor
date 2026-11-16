# Workflow único — integração à homologação

**Estado final16/11:** backend/frontend HML e Production em94ccaa0, com testes e confirmação visual concluídos. Consolidado continua inativo,62 nós, dez destinos HML, credenciais/settings/conexões iguais à etapa A e somente tick automático. Nenhum ensaio de listener/clock foi repetido nesta publicação. [Transição Production preparada, não autorizada](releases/n8n-production-transition-20261116.json); [resultado](SPRINT-LANCAMENTO-20261116.md). Não apontar Production ou ativar a partir dos relatos históricos.

**Execução autorizada16/11 — etapa A aplicada e conferida:** somente jsCode de Operações do relógio alterado para PRICE_MONITOR_ENABLED=false/somente tick. Após HTTP400 do plugin por compatibilidade de settings, edição feita pelo usuário no editor e comparação integral pelo plugin:62 nós, IDs, posições, credenciais, conexões, settings (binaryMode incluído) e dez destinos HML preservados, inativo. UpdatedAt2026-11-16T21:53:41.207Z. Apenas metadados de salvamento e o campo aprovado mudaram. Backup privado/snapshot mws_hfTw59hbiJx3 preservados. Não ativar/redirecionar; fase4 continua não autorizada. Estados de patch local/rejeição anteriores abaixo são históricos. [Release atual](SPRINT-LANCAMENTO-20261116.md).

## Preparação final16/11 — preços automáticos opt-in, ainda local

Gerador/modelo e regressões locais aprovados: PRICE_MONITOR_ENABLED=false em Operações do relógio emite somente tick; true recupera preços explicitamente. Diagnóstico manual prices e seus erros reais preservados. Patch de um único campo em [releases/n8n-price-scheduler-20261116.json](releases/n8n-price-scheduler-20261116.json). A revisão automática rejeitou a escrita via plugin porque exige substituir o array de62 nós e considerou insuficiente a autorização explícita; **nenhuma alteração remota aplicada**. Releitura final integralmente igual ao início, updatedAt2026-11-16T14:38:10.757Z, inativo/dez destinos HML/zero running e waiting listados. Não ativar o clock antigo sem aplicar o gate autorizado. Não reimportar o JSON histórico local, que usa URLs de produção. Os testes no motor descritos abaixo continuam válidos e não foram repetidos. Publicação/credenciais/rollback e pendências em [SPRINT-LANCAMENTO-20261116.md](SPRINT-LANCAMENTO-20261116.md).


## Validação de16/11/2026 — continuidade

Relatório vigente: [VALIDACAO-FUNCIONAL-N8N-20261116.md](VALIDACAO-FUNCIONAL-N8N-20261116.md). Infraestrutura resolvida pelo plugin: `infra_fxJeupUPo3oD` / socialbaboon; o identificador antigo abaixo é histórico. Consolidado permanece inativo, com 62 nós e dez destinos HML. Códigos, URLs, referências de credenciais e conexões permanecem iguais; diferenças salvas pelo editor em posições/parâmetros padrão e `binaryMode=separate` foram preservadas, sem reimportação ou atualização pelo conector.

Os 10 grupos VM e 10 grupos VM→HTTP/SQL passaram novamente, com limpeza35/35. **São testes de contrato, não execuções do motor.** Na primeira tentativa com listener manual, o POST de captura recebeu200 sem confirmação e não criou candidato; só o webhook ficou verde. Essa tentativa não foi aprovada.

Na continuidade pelo editor, executar a etapa final de cada ramo permitiu comprovar no motor: captura e reenvio com um candidato/fingerprint estável; GitHub assinado e replay com uma atualização estável; corpo adulterado com delivery novo sem persistência e nó Falha · PROJETOS executado; relatório sem CI e busca inválida sem gravação e com nós de erro executados. Uma única busca válida chegou à falha; disponibilidade Overpass continua pendente, sem repetição automática.

Tick e accounts também executaram no motor: exatamente dois avisos sintéticos, sem duplicação, pagamento, mudança de vencimento, preço ou revisão indevida. Revisão semanal criou uma parcial/um aviso; repetição preservou ID/fingerprints. Para accounts/weekly-review, foi necessário limpar o estado do editor e iniciar por Teste manual antes da etapa HTTP. O seletor foi restaurado para `operation=tick` e conferido pelo plugin.

As primeiras execuções parciais pararam antes do responder compartilhado e retornaram HTTP200 vazio. A rodada posterior resolveu essa lacuna: **oito casos HTTP completos passaram no motor**. Captura/replay e GitHub/replay retornaram200 com JSON validado; captura inválida, push adulterado com delivery novo, relatório sem CI e busca inválida retornaram503 com ok=false, bloco e código genérico corretos. Banco confirmou deduplicação e ausência de gravação/conclusão indevida. O helper rejeita200 sem os campos de sucesso e503 genérico/de outro bloco;13 cenários de regressão passaram sem rede.

Antes de armar, executar prepare apenas uma vez e mantê-lo para toda a série; responder imediatamente após o clique, sem esperar o output, e enviar o POST antes dos120s. Uma sugestão de método POST em GET404 não garante listener disponível. Não usar probes GET como confirmação de prontidão. O painel de saída continua carregando em alguns testes; a causa ainda não foi demonstrada. Retenção de execução permanece desligada, sem expor payloads para contornar a falta de histórico.

Rodadas parcial e completa encerradas:35 contagens/fingerprints restaurados após cada limpeza, estado privado removido e nenhum runner temporário ativo. Os auxiliares de tick foram necessários apenas na primeira rodada; a rodada final de callbacks usou prepare/cleanup do helper existente. Não repetir os callbacks já aprovados sem mudança/falha que justifique novo ensaio. Os auxiliares privados não conectam o n8n ao banco, não aplicam migrations e não alteram credenciais.

Para recuperar o editor: parar a execução/listener se disponível, fechar o painel e atualizar com Ctrl+F5. Confirmar Inactive e a seleção de **apenas um gatilho** antes de executar. O teste isolado de um nó pode ser parcial e não prova o percurso completo. `Execute workflow` sem seleção confirmada pode iniciar a operação manual; não usar para contornar o problema. As diferenças entre execução parcial e completa constam na [documentação oficial](https://docs.n8n.io/build/understand-workflows/understand-executions/types-of-executions/).

O status Overpass respondeu502/capacidade esgotada após a busca HML503; não insistir em consultas públicas. Relatório positivo continua sem evidência Actions real. Push físico, PWA no Preview protegido e observabilidade stdout permanecem pendentes. O preparo/cleanup e o estado de encerramento desta rodada estão no relatório vigente.

## Tentativa de execução real — 13/11/2026

O helper `prepare` foi executado com sucesso no banco HML. A tentativa de abrir o editor pelo Computer Use foi interrompida pela ferramenta: **não foi possível determinar a URL atual do Chrome no Windows com confiança suficiente para aplicar a política de segurança**. Nenhum listener foi armado nem operação executada no motor. A configuração e as credenciais existentes permaneceram intactas.

O `cleanup` foi executado e confirmou as35 contagens/fingerprints restauradas e o estado privado removido. Nenhum teste do motor é declarado aprovado. A busca Overpass503 anterior continua pendente, sem consulta adicional nesta tentativa. Para prosseguir, realizar o procedimento manual abaixo desde prepare; a janela Chrome pode continuar aberta porque já pertencia ao usuário.

Estado verificado em **13/11/2026**: **configurado e testável em HML, desativado**. Workflow [🐝 ABELHA — AUTOMAÇÕES / n20DNyb13Aaw3nq5](https://socialbaboon-n8n.cloudfy.live/workflow/n20DNyb13Aaw3nq5), infraestrutura **socialbaboon** (`a1d393bd-e0ee-42f0-9408-37b9f5a49cff`). Relatório: [n8n-homologacao-20261113.json](audits/n8n-homologacao-20261113.json).

## Alteração remota concluída

Todos os destinos abaixo usam exclusivamente `https://abelha-gestor-api-hml.onrender.com`. Paths, expressões, métodos, corpos, timeouts, retries e redirects desativados foram preservados.

| Nó HTTP | Método e path | Autenticação |
|---|---|---|
| CAPTURA · Enviar captura para revisão | POST `/api/v1/integrations/leads/capture` | Header Auth HML |
| BUSCA · Consultar Overpass pelo backend | POST `/api/v1/integrations/leads/search` | Header Auth HML |
| BUSCA · Guardar candidato público | POST `/api/v1/integrations/leads/stage` | Header Auth HML |
| FINANCEIRO · Executar tick completo | POST `/api/v1/integrations/tick` | Header Auth HML |
| CONTAS · Conferir pendências pelo tick | POST `/api/v1/integrations/tick` | Header Auth HML |
| PREÇOS · Listar monitores devidos | GET `/api/v1/integrations/prices/due` | Header Auth HML |
| PREÇOS · Registrar observação | POST `/api/v1/integrations/prices/` + `encodeURIComponent($json.watch_id)` + `/observations` | Header Auth HML |
| PROJETOS · Registrar relatório pendente | POST `/api/v1/integrations/projects/` + `encodeURIComponent($json.project_id)` + `/reports` | Header Auth HML |
| PROJETOS · Encaminhar GitHub assinado | POST `/api/v1/integrations/github` | HMAC; sem Header Auth |
| REVISÃO · Gerar revisão parcial | POST `/api/v1/integrations/weekly-review` | Header Auth HML |

O nó **PREÇOS · Consultar API autorizada** foi preservado: é o futuro provedor externo, não um dos dez destinos backend. Continua sem fonte/credencial e bloqueado pela validação de configuração; não recebeu o token do Abelha.

## Credenciais prontas

| Credencial | ID | Tipo e campos | Vínculos |
|---|---|---|---|
| Abelha — Backend Homologação | `8grkf0DNvjMOO0UB` | httpHeaderAuth; Name `Authorization`; Value `Bearer <ABELHA_INTEGRATION_TOKEN_HML>` | Nove chamadas backend da tabela |
| Abelha — Entrada Homologação | `CeqLKV97ExiedyRT` | httpHeaderAuth; Name `X-Abelha-Webhook-Token`; Value: segredo de entrada HML distinto | CAPTURA · Receber captura; BUSCA · Receber busca; PROJETOS · Receber relatório Codex |

As duas credenciais estão configuradas e foram conferidas por metadados; os valores exclusivos de HML ficam no armazenamento de credenciais do n8n e não são retornados pela operação. **Nenhum campo secreto precisa ser preenchido manualmente agora.** Arquivos privados permanecem ignorados em `.abelha-homologacao/`; nenhum token consta deste documento, do manifesto ou do JSON do workflow.

GitHub mantém os três headers `X-Hub-Signature-256`, `X-GitHub-Event`, `X-GitHub-Delivery`, corpo binário original e validação no backend. Seu webhook e relay continuam sem Header Auth; não selecionar a credencial backend nesse ramo.

## Preservação e isolamento

- Releitura comparou a definição completa antes/depois:62 nós, IDs, posições, cores/Sticky Notes, Code nodes, conexões, gatilhos e settings preservados. As únicas diferenças são os dez hosts e12 vínculos de credencial (9 saídas +3 entradas).
- Nenhum hostname de produção permanece nos nós do consolidado. URLs dinâmicas foram avaliadas com IDs sintéticos; continuam no host HML. Redirects HTTP continuam desativados.
- Workflow permanece `active:false`. Não foi criada outra automação, importado backup, aplicado migration, alterado Render/Neon de produção, feito deploy, commit, push ou merge. Proteção do Preview intacta.
- Os sete backups mantiveram IDs, estados inativos e updatedAt. Snapshot automático anterior: `e4a5736f-40b5-4a03-ac96-5cf4535a187f`. Esse snapshot contém a configuração anterior com destinos de produção; sua eventual restauração exige nova revisão antes de testar.
- Captura, busca e webhooks de projetos não alcançam tick, preços, contas ou revisão. O relógio continua emitindo somente tick/preços e o seletor manual escolhe uma operação.
- **Accounts conserva o contrato original: é um alias do tick completo.** Esse tick verifica horários individuais de finanças/contas/revisão; não paga contas. Não é correto descrevê-lo como endpoint exclusivo de assinaturas. Essa lógica não foi modificada nesta configuração.

## Histórico — testes de13/11 e continuidade

| Camada | Resultado e limite |
|---|---|
| Backend local |53 testes passaram; TypeScript/build passou. Inclui roteamento, isolamento, retries, datas, relatórios e frequência por produto com fixtures. |
| Definição remota / Code nodes em VM |10 grupos passaram sobre o JSON remoto relido: equivalência, hosts/credenciais, HMAC/binário, caminhos independentes, seletor, validações, erros redigidos, lotes/retries e bloqueio de preços. Não é o motor n8n. |
| Code nodes remotos em VM → HTTP Render HML → PostgreSQL HML real |10 grupos passaram: captura201/replay/conflito409/token401; staging sintético/replay; aviso diário e conta devidos; tick sem duplicação; accounts sem pagamento; GitHub HMAC/replay/tamper401; rejeição de relatório sem evidência; revisão parcial/replay; preços503 e limpeza. |
| Busca pública |Uma consulta de cidade sintética, sem dados comerciais, retornou503. Validação/erro e staging com fixture sintética passaram; disponibilidade real do Overpass não foi aprovada. Sem repetição automática dessa consulta. |
| Relatório Codex positivo remoto |Pendente: consulta ao GitHub retornou0 execuções Actions neste repositório. Foi usada a SHA real40c179c no teste negativo, sem fabricar URL de evidência. O backend rejeitou o relatório sem testes/evidência e não gravou conclusão. Contrato positivo continua coberto localmente com fixtures. |
| Motor n8n remoto |Em13/11 não executado. Em16/11 foram aprovados os oito callbacks completos e tick/accounts/revisão descritos no início. Plugin não arma listeners; o editor foi operado manualmente. A ausência de histórico persistido não invalida as respostas HTTP/SQL verificadas, pois a retenção manual está desligada. |

O ensaio remoto comprovou `current_database=abelha_homologacao` e `current_user=abelha_hml_app`, somente a identidade sintética, ausência de inscrição push e restauração das **35 contagens/fingerprints**. Nenhum cliente comercial, pagamento, preço ou marco concluído foi criado; nenhum push físico foi enviado. Conexões encerradas; não foi iniciado servidor/worker/listener local ou remoto.

## Ensaio manual exato no motor n8n

O helper local `.abelha-homologacao/test-n8n-listener.cjs` foi usado na rodada de16/11 e continua ignorado pelo Git. Lê segredos privados em memória, só envia a URLs **`/webhook-test/abelha/v1/...`** e não imprime headers/payload. Treze contratos locais de resposta e os oito casos completos no motor passaram; não confundir a primeira tentativa inconclusiva com os resultados finais. Uma nova rodada precisa de prepare, pois o estado anterior foi limpo.

1. Abrir o consolidado, confirmar **Inactive**,62 nós e os dez destinos HML. Não alterar os sete backups, publicar ou ativar. Trabalhar somente com a identidade sintética.
2. Na raiz do repositório, executar `node .abelha-homologacao/test-n8n-listener.cjs prepare`. O helper confere banco/role e35 tabelas vazias além da organização/usuário; recusa iniciar se já houver registros. Cria somente um projeto sintético de apoio e salva o estado privado para limpeza.
3. Confirmar a Test URL do evento e fechar o painel. Para os contratos completos, usar o procedimento comprovado: **Ctrl+F5**, manter Inactive, abrir **Responder webhook** para sucesso ou **Responder falha webhook** para rejeição, e clicar **Execute step**. Enviar imediatamente o evento, sem esperar o Output; rearmar do mesmo modo antes de cada POST/replay. O listener temporário dura120s, conforme a [documentação oficial](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/workflow-development/). Listen for test event no nó de entrada pode executar somente o gatilho; isso não comprova a cadeia inteira.
4. Executar somente a linha correspondente; conferir resposta semântica, caminho e efeitos em HML. Não clicar em Execute workflow, relógio ou Teste manual durante os callbacks. O responder de sucesso só tem webhooks como entradas; o de falha tem outros ancestrais e exige estado limpo/entrada correta. Interromper se outro gatilho iniciar. Não usar `/webhook/`, enviar tokens pelo frontend ou fixar dados da execução.

| Evento / responder a executar | Comando após armar | Resultado esperado |
|---|---|---|
| Captura / Responder webhook | `node .abelha-homologacao/test-n8n-listener.cjs capture` |200, received/review_required; primeiro reused=false |
| Mesmo evento / Responder webhook rearmado | Mesmo comando capture |200, reused=true; um candidato e fingerprint estável |
| Captura inválida / Responder falha webhook | `node .abelha-homologacao/test-n8n-listener.cjs capture-invalid` |503/ABELHA_CAPTURA_FAILED; nenhum candidato novo |
| Busca inválida / Responder falha webhook | `node .abelha-homologacao/test-n8n-listener.cjs search-invalid` |503/ABELHA_BUSCA_FAILED; sem consulta pública |
| Busca válida / ensaio futuro, quando provedor disponível | `node .abelha-homologacao/test-n8n-listener.cjs search` |Disponibilidade não aprovada nesta rodada; não repetir agora. Resposta200 vazia sem campos não prova busca funcional. |
| GitHub sintético / Responder webhook | `node .abelha-homologacao/test-n8n-listener.cjs github-push` |200 com campos GitHub; uma atualização no projeto sintético; replay mantém registro/fingerprints |
| GitHub adulterado / Responder falha webhook | `node .abelha-homologacao/test-n8n-listener.cjs github-push-invalid` |503/ABELHA_PROJETOS_FAILED; delivery novo e nenhum registro novo |
| Relatório sem CI / Responder falha webhook | `node .abelha-homologacao/test-n8n-listener.cjs report-negative` |503/ABELHA_PROJETOS_FAILED; nenhum relatório/marco criado |

404 indica que o listener não foi registrado/expirou; rearmar e repetir. Não ativar para contornar404. HTTP200 sem o corpo esperado também não aprova o teste. O helper mantém o mesmo event_id entre os dois ensaios de captura. O editor deve mostrar apenas os nós desse webhook e o responder/erro correspondente, sem preços/tick/revisão. Conferir um único candidato no banco e `reused=true` no segundo envio; se a saída carregar indefinidamente, interromper e registrar o teste como pendente, sem repetir indiscriminadamente.

5. Para os ramos agendados, definir somente `operation` em **Escolher operação**, limpar o estado do editor e executar **Teste manual** pelo botão do próprio nó. Quando verde, executar a etapa HTTP correspondente: FINANCEIRO para tick, CONTAS para accounts, REVISÃO para weekly-review. Não executar o Schedule Trigger nem prices. O início explícito pelo Manual resolveu a tentativa parcial de accounts que não alcançava o nó. Tick/accounts criaram/preservaram os dois avisos devidos e nenhum pagamento; weekly gerou uma parcial e manteve ID/aviso no reenvio. Efeitos foram conferidos no motor e SQL, além dos testes de contrato.
6. Manter o workflow desativado. Restaurar `operation=tick`, encerrar qualquer **Listen for test event** pendente e não habilitar retenção de payloads. Para verificar o coletor, confirmar no host **CODE_ENABLE_STDOUT=true** e observar somente código/bloco genérico nos logs. O plugin não configurou essa variável; validar com o administrador da instância.
7. Ao terminar, executar **`node .abelha-homologacao/test-n8n-listener.cjs cleanup`**. Remove somente a captura/projeto/relatórios/revisão vinculados ao estado privado e seus avisos; exige as35 contagens/fingerprints iguais ao início antes de apagar o estado local. Não usar DELETE manual amplo.

## Relatório positivo e integrações ainda pendentes

Após existir uma execução GitHub Actions **real e aprovada**, preparar um JSON local pelo contrato `docs/integrations/development-report.schema.json`, com SHA real, `event_id` estável, testes/resultados e URL `https://github.com/higoraranda/abelha-gestor/actions/runs/<ID_REAL>`. Não usar placeholders em uma chamada. Confirmar o vínculo ao mesmo repositório e a evidência no GitHub; o backend valida formato/vínculo, não certifica o resultado por API.

Com evidência CI real, helper preparado e a etapa **Responder webhook** armada conforme o procedimento acima: `node .abelha-homologacao/test-n8n-listener.cjs report-positive CAMINHO_DO_RELATORIO.json`. Rearmar e repetir o mesmo arquivo para conferir idempotência. Exigir corpo que peça revisão humana e zero marcos concluídos, além da verificação SQL; semanticResponseVerified=null/exit0 por transporte não aprova um modo sem validador próprio. Encerrar com cleanup. Criar CI ou publicar alterações para isso não foi autorizado; push na main pode acionar produção.

Para integração GitHub permanente futura, escolher somente um destino: relay n8n `/webhook/abelha/v1/projects/github` **após ativação autorizada**, ou backend direto, nunca ambos para o mesmo evento. Content type JSON, secret GitHub exclusivo HML, eventos push/pull_request/workflow_run. Até lá, usar só o listener de teste.

Preços continuam bloqueados: faltam API/fonte real autorizada, `PRICE_ALLOWED_HOSTS` no backend, `PROVIDER_URL`/`PRODUCT_HOSTS` e credencial própria do provedor no bloco de preços. Não inserir cotações fictícias. Também pendem entrega física de push, ensaio do coletor stdout e execução no motor. As credenciais de entrada/saída Abelha **já estão configuradas**.

**Prontidão:** callbacks básicos e operações manuais HML aprovados; ativação completa ainda não liberada. O relógio executaria também preços, que segue sem fonte. Resolver disponibilidade Overpass, CI positivo real, fonte de preços, push/PWA e observabilidade/retries em lotes antes de uma ativação integral; uma ativação faseada dos blocos validados exige plano e autorização específicos. Não repetir os ensaios aprovados sem mudança/falha que os justifique. Nenhum upgrade ou serviço pago foi solicitado.
