# Workflow único — integração à homologação

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

## Testes realmente executados

| Camada | Resultado e limite |
|---|---|
| Backend local |53 testes passaram; TypeScript/build passou. Inclui roteamento, isolamento, retries, datas, relatórios e frequência por produto com fixtures. |
| Definição remota / Code nodes em VM |10 grupos passaram sobre o JSON remoto relido: equivalência, hosts/credenciais, HMAC/binário, caminhos independentes, seletor, validações, erros redigidos, lotes/retries e bloqueio de preços. Não é o motor n8n. |
| Code nodes remotos em VM → HTTP Render HML → PostgreSQL HML real |10 grupos passaram: captura201/replay/conflito409/token401; staging sintético/replay; aviso diário e conta devidos; tick sem duplicação; accounts sem pagamento; GitHub HMAC/replay/tamper401; rejeição de relatório sem evidência; revisão parcial/replay; preços503 e limpeza. |
| Busca pública |Uma consulta de cidade sintética, sem dados comerciais, retornou503. Validação/erro e staging com fixture sintética passaram; disponibilidade real do Overpass não foi aprovada. Sem repetição automática dessa consulta. |
| Relatório Codex positivo remoto |Pendente: consulta ao GitHub retornou0 execuções Actions neste repositório. Foi usada a SHA real40c179c no teste negativo, sem fabricar URL de evidência. O backend rejeitou o relatório sem testes/evidência e não gravou conclusão. Contrato positivo continua coberto localmente com fixtures. |
| Motor n8n remoto |Não executado. O plugin oferece configuração/credenciais e consulta de execuções, mas não registra listener manual nem inicia esse ensaio. A lista consultada não contém execuções do workflow. Procedimento abaixo. |

O ensaio remoto comprovou `current_database=abelha_homologacao` e `current_user=abelha_hml_app`, somente a identidade sintética, ausência de inscrição push e restauração das **35 contagens/fingerprints**. Nenhum cliente comercial, pagamento, preço ou marco concluído foi criado; nenhum push físico foi enviado. Conexões encerradas; não foi iniciado servidor/worker/listener local ou remoto.

## Ensaio manual exato no motor n8n

O helper local `.abelha-homologacao/test-n8n-listener.cjs` está preparado, validado sintaticamente e ignorado pelo Git. Lê segredos privados em memória e só envia a URLs **`/webhook-test/abelha/v1/...`**; não imprime headers ou payload. Seus POSTs no motor ainda não foram executados.

1. Abrir o consolidado, confirmar **Inactive**,62 nós e os dez destinos HML. Não alterar os sete backups, publicar ou ativar. Trabalhar somente com a identidade sintética.
2. Na raiz do repositório, executar `node .abelha-homologacao/test-n8n-listener.cjs prepare`. O helper confere banco/role e35 tabelas vazias além da organização/usuário; recusa iniciar se já houver registros. Cria somente um projeto sintético de apoio e salva o estado privado para limpeza.
3. Abrir o webhook desejado, selecionar **Test URL** e clicar **Listen for test event**. O listener é temporário. Rearmá-lo **antes de cada POST**, inclusive reenvio. Esse é o procedimento previsto na [documentação oficial de Webhook](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/).
4. Executar somente a linha correspondente; conferir os nós percorridos e a resposta no editor. Não usar `/webhook/`, não enviar tokens pelo frontend e não fixar dados da execução.

| Webhook aberto | Comando após armar o listener | Resultado esperado |
|---|---|---|
| CAPTURA · Receber captura | `node .abelha-homologacao/test-n8n-listener.cjs capture` |200, received/review_required; primeiro reused=false |
| Mesmo webhook, rearmado | Mesmo comando capture |200, mesmo evento; reused=true, um candidato |
| CAPTURA · Receber captura | `node .abelha-homologacao/test-n8n-listener.cjs capture-invalid` |503 genérico; nenhum candidato novo |
| BUSCA · Receber busca | `node .abelha-homologacao/test-n8n-listener.cjs search-invalid` |503 genérico; sem consulta pública |
| BUSCA · Receber busca | `node .abelha-homologacao/test-n8n-listener.cjs search` |Esperado200 vazio. Se retornar503, a busca continua pendente e o helper encerra com exit1. Aguardar pelo menos1min entre consultas públicas. |
| PROJETOS · Receber GitHub assinado | `node .abelha-homologacao/test-n8n-listener.cjs github-ping` |200; bytes/HMAC reconhecidos, sem evento comercial |
| Mesmo webhook, rearmado | `node .abelha-homologacao/test-n8n-listener.cjs github-invalid` |503 no n8n a partir da assinatura inválida401 no backend |
| PROJETOS · Receber relatório Codex | `node .abelha-homologacao/test-n8n-listener.cjs report-negative` |503 no n8n a partir do relatório sem evidências400 no backend |

404 indica que o listener não foi registrado/expirou; rearmar e repetir. Não ativar para contornar404. O helper mantém o mesmo event_id entre os dois ensaios de captura. O editor deve mostrar apenas os nós desse webhook e o responder/erro correspondente, sem preços/tick/revisão.

5. Para os ramos agendados, abrir **Escolher operação**, ajustar somente `operation` e executar pela entrada **Teste manual**, uma vez por `tick`, `accounts` e `weekly-review`. Não executar o Schedule Trigger nem `prices`. Tick/accounts devem responder200 e não pagar contas; sem horários/contas configurados podem não emitir aviso. Weekly deve retornar a revisão parcial e manter o ID no reenvio. Os efeitos de horário/deduplicação já passaram no ensaio HTTP/SQL; aqui se valida o motor e a credencial.
6. Manter o workflow desativado. Restaurar `operation=tick`, encerrar qualquer **Listen for test event** pendente e não habilitar retenção de payloads. Para verificar o coletor, confirmar no host **CODE_ENABLE_STDOUT=true** e observar somente código/bloco genérico nos logs. O plugin não configurou essa variável; validar com o administrador da instância.
7. Ao terminar, executar **`node .abelha-homologacao/test-n8n-listener.cjs cleanup`**. Remove somente a captura/projeto/relatórios/revisão vinculados ao estado privado e seus avisos; exige as35 contagens/fingerprints iguais ao início antes de apagar o estado local. Não usar DELETE manual amplo.

## Relatório positivo e integrações ainda pendentes

Após existir uma execução GitHub Actions **real e aprovada**, preparar um JSON local pelo contrato `docs/integrations/development-report.schema.json`, com SHA real, `event_id` estável, testes/resultados e URL `https://github.com/higoraranda/abelha-gestor/actions/runs/<ID_REAL>`. Não usar placeholders em uma chamada. Confirmar o vínculo ao mesmo repositório e a evidência no GitHub; o backend valida formato/vínculo, não certifica o resultado por API.

Com o helper preparado e o listener **PROJETOS · Receber relatório Codex** armado: `node .abelha-homologacao/test-n8n-listener.cjs report-positive CAMINHO_DO_RELATORIO.json`. Rearmar e repetir o mesmo arquivo para conferir idempotência. A resposta deve exigir revisão humana e nunca concluir marco. Encerrar com cleanup. Criar CI ou publicar alterações para isso não foi autorizado nesta etapa; push na main pode acionar produção.

Para integração GitHub permanente futura, escolher somente um destino: relay n8n `/webhook/abelha/v1/projects/github` **após ativação autorizada**, ou backend direto, nunca ambos para o mesmo evento. Content type JSON, secret GitHub exclusivo HML, eventos push/pull_request/workflow_run. Até lá, usar só o listener de teste.

Preços continuam bloqueados: faltam API/fonte real autorizada, `PRICE_ALLOWED_HOSTS` no backend, `PROVIDER_URL`/`PRODUCT_HOSTS` e credencial própria do provedor no bloco de preços. Não inserir cotações fictícias. Também pendem entrega física de push, ensaio do coletor stdout e execução no motor. As credenciais de entrada/saída Abelha **já estão configuradas**.

**Prontidão:** configuração HML concluída e testável; ativação completa ainda não liberada. O relógio executaria também o ramo preços, que segue sem fonte. Concluir os ensaios manuais, resolver pendências e obter autorização específica antes de ativar este único workflow. Nenhum upgrade ou serviço pago foi solicitado.
