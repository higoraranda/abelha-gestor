# Auditoria da edição manual n8n — 17/11/2026

## Resultado final — LANÇADO COM PENDÊNCIAS

Configuração final aprovada e workflow único **Active**, confirmado novamente após a primeira janela; sete backups inativos. Frontend/backend continuam em c421abbdc8bde703bd10e179f8715c56371c369c, código equivalente ao94ccaa0 aprovado. Sem novo deploy, migration/restore, commit/push ou recurso pago.

**Primeira janela automática:** o motor passou de zero eventos Production para um `production_success`/rootCount1, concluído em17/11 às00:45:42.967 (03:45:42.967Z). Nenhum evento manual ou externo de teste foi enviado. A atribuição ao relógio usa a primeira janela agendada após a ativação e o estado do workflow. Evidência consultada somente leitura em `workflow_statistics`, filtrada ao ID deste workflow. Nenhum `production_error` registrado nessa janela.

**Limite da evidência:** saveDataSuccessExecution/saveDataErrorExecution=none descartam o histórico detalhado; não foi recuperado ID de execução, lista dos nós executados ou status HTTP individual. Sucesso no motor não equivale a um trace HTTP completo, especialmente porque há tratamento de falhas. Não declarar HTTP200 do tick ou cada ramo testado nesta janela. Bearer/HMAC foram validados diretamente antes; testes detalhados HML anteriores permanecem evidências separadas. A retenção de payloads foi preservada e nenhum upgrade foi solicitado. [Documentação do Render](https://render.com/docs/logging) informa que request logs exigem workspace compatível; a consulta disponível aqui não forneceu trace HTTP.

**Banco após a janela:**35/35 contagens e fingerprints idênticos à pré-ativação. Zero notificações/revisões/inscrições push e nenhum dado comercial alterado. Não havia horários pessoais nem assinaturas configurados, portanto a ausência de avisos é esperada. Isso não certifica deduplicação com novos avisos reais nesta janela; a deduplicação já foi exercitada separadamente em HML. Logs de erro Render consultados após ativar não retornaram registros; não é garantia sobre todos os logs ou integrações opcionais.

### Ajustes manuais de uso

1. Em produção, abrir **Personal → Configurações → Seu ritmo**. Preencher os horários de **Lembrar da fatura todos os dias** e **Revisão semanal aos domingos**, conforme preferência pessoal, e clicar **Salvar horários**. Horários de Brasília; campos em branco desativam esses avisos. Não é necessário executar ticks manualmente.
2. Para push físico, instalar/abrir pelo ícone e acessar **Notificações discretas**. Se o app indicar servidor configurado, escolher **Ativar neste dispositivo** e permitir no navegador. Se indicar pendência do servidor, confirmar/configurar VAPID Production separadamente, sem reutilizar HML ou rotacionar valores ativos por tentativa. Nenhuma chave VAPID foi alterada nesta execução. Entrega física ainda não comprovada; aguardar aviso legítimo, sem criar aviso falso.
3. Preços continuam desligados até API real autorizada. Overpass, produtores GitHub/CI/captura externa e ausência de duplicidade de hooks administrativos externos continuam validações opcionais próprias. Não ativar WhatsApp/e-mail comercial, pagamentos, cobranças ou marcos automáticos.

Recibo corrente: [n8n-activation-20261117.json](releases/n8n-activation-20261117.json). Backups/fingerprints/metadados detalhados ficam privados/ignorados. Memória e progresso atualizados. Nenhum servidor, probe ou monitor local precisa permanecer ativo; o workflow agendado permanece ativo por autorização expressa.

## Configuração aprovada e workflow ativado —00:36:36 de17/11

Nova leitura da versão `2026-11-17T03:32:29.189Z` aprovou todos os campos: dez URLs exatas, nove saídas Backend Produção, três entradas Entrada Produção, nenhum host/vínculo HML executável. Credencial de preços removida. A orientação Authentication=None fez o editor remover `authentication` e `genericAuthType` desse placeholder, usando o padrão None; essa é a exceção necessária e revisada em relação ao backup. Preços permanecem desligados até provedor autorizado. Todos os outros campos coincidem com o backup mais a transição autorizada, exceto metadados normais de salvamento.

Snapshot privado aprovado e fingerprints das35 tabelas registrados antes da ativação. Saúde direta e proxy200; Render live/c421abbd, Vercel com alias no deploymentc421abbd e snapshot Neon snap-silent-fog-acdvwgeu preservado. Nenhum dado comercial alterado na preparação.

**Workflow n20DNyb13Aaw3nq5 ativado via plugin Cloudfy socialbaboon e Active confirmado por nova leitura às00:36:36.** Snapshot operacional n8n `mws_8bPYfMc15pnM`. Os sete backups continuam inativos. Nenhum tick manual executado. Primeira execução automática ainda em observação; não confundir ativação confirmada com resultado do tick.

Retenção existente preservada: saveDataSuccessExecution=none e saveDataErrorExecution=none. O histórico completo pode não permanecer disponível. A observação usa consultas somente leitura ao motor e comparação do banco, sem habilitar persistência de payloads. Os relatos de bloqueios abaixo são históricos.

**Histórico da rechecagem00:23:29: BLOQUEADO por dois vínculos de credenciais.** Naquela versão,18 das20 correções estavam salvas e nenhuma automação havia sido ativada. Situação atual na seção de ativação acima.

## Rechecagem — versão salva às00:23:29 de17/11

Leitura remota confirmou updatedAt `2026-11-17T03:23:29.457Z`,62 nós/Inactive. Os dez destinos backend estão **exatamente corretos**, inclusive as duas expressões; sem host HML. Os três webhooks usam Entrada Produção correta e oito das nove saídas usam Backend Produção correta. URL do provedor restaurada. Fora das duas associações abaixo e dos metadados normais de salvamento, todos os campos coincidem com o backup mais as alterações Production autorizadas. Sete backups inativos; nenhuma execução retornada. Não houve tentativa adicional de escrita remota após a rejeição anterior.

**Faça somente estas duas correções:**

1. Abra **PROJETOS · Registrar relatório pendente**. Em **Credential for Header Auth**, troque **Abelha — Entrada Produção** por **Abelha — Backend Produção** (`Abd3Qw4AX18sLF7N`). Não altere URL, expressão, método ou body.
2. Abra **PREÇOS · Consultar API autorizada**. Remova **somente a associação** de **Abelha — Backend Produção** desse nó; o backup não tinha credencial vinculada. Preserve a URL `{{ $json.provider_url }}`. **Não exclua a credencial global.** Se não houver controle para limpar a seleção, informe “Não aparece opção para limpar a credencial do nó de preços”; não mude outros campos por tentativa.

Salve mantendo **Inactive** e informe quando concluir. Será feita nova leitura integral; não ativar nem executar o relógio enquanto existir essa divergência. O relato e o guia da primeira auditoria abaixo ficam como histórico, sem necessidade de repetir as18 correções já salvas.

## Resultado da comparação integral inicial

Workflow `n20DNyb13Aaw3nq5`, Cloudfy `socialbaboon` / `infra_fxJeupUPo3oD`. Definição completa relida, versão salva em `2026-11-17T03:05:44.848Z`, estado **Inactive**. Comparação recursiva de todos os campos com `.abelha-homologacao/go-live-n8n-before-20261116.json` e com a versão esperada após apenas as trocas autorizadas.

- Preservados: 62 nós, IDs, nomes, tipos/versões, ordem, posições, Sticky Notes, conexões, ramificações, todos os Code nodes, métodos, bodies, headers, timeouts/retries, response modes, paths dos webhooks, tratamento de erros e settings completos, inclusive `binaryMode=separate`.
- Relógio preservado: 15 minutos; somente `tick`; `PRICE_MONITOR_ENABLED=false`. Sete backups continuam inativos. Consulta de execuções retornou zero registros.
- **20 correções práticas em14 nós:11 campos URL e9 associações de credencial.** São28 diferenças em campos JSON ao contar ID/nome separadamente. Fora desses campos, só mudaram updatedAt, versionId e versionCounter, metadados normais de salvamento.
- Quinze correções correspondem a alterações incorretas introduzidas na edição manual: nove URLs backend, a URL do provedor e cinco associações de credencial. Cinco correspondem a trocas previstas que ficaram pendentes: URL/credencial da revisão e as três credenciais de entrada.
- Os dez destinos backend estão incorretos: sete ficaram somente com a raiz do domínio, duas expressões perderam o path e uma delas ganhou `https://` duplicado, e a revisão ainda aponta para HML.
- Quatro saídas receberam **Entrada Produção**, que usa outro header; a revisão ainda usa Backend Homologação. Os três webhooks ainda usam Entrada Homologação.
- O nó adicional `PREÇOS · Consultar API autorizada` foi alterado indevidamente: recebeu `=https://abelha-gestor-api.onrender.com` e a credencial Backend Produção. Ele deve conservar a expressão do provedor e ficar sem a credencial do backend. Preços automáticos continuam desligados; nenhuma consulta foi executada.
- GitHub: raw body, código de conservação de bytes, headers de assinatura/evento/delivery e body do relay preservados; relay sem Header Auth. A URL do relay foi reduzida à raiz e precisa da correção abaixo. Há um caminho GitHub de entrada/relay neste workflow. Entregas externas permanentes não foram criadas nesta rodada; o conector GitHub disponível não permite auditar webhooks administrativos externos, portanto duplicidade fora do workflow não foi certificada.

Detalhamento campo a campo, valores encontrados/esperados e origem: [n8n-manual-audit-20261117.json](releases/n8n-manual-audit-20261117.json). Snapshots completos, diff e proposta corrigida ficam privados/ignorados em `.abelha-homologacao/manual-audit-n8n-*-20261117.json`. Não importar esses arquivos como novos workflows.

## Tentativa de correção e segurança

Foi preparada a correção a partir do backup, limitada às URLs/referências necessárias, restaurando também o nó do provedor. Antes da escrita, nova leitura comprovou ausência de edição concorrente. A revisão automática rejeitou a substituição do array de62 nós, alegando risco de URLs malformadas e credenciais trocadas. **Nenhuma escrita foi aplicada.** Releitura integral confirmou definição remota idêntica àquela auditada e ainda Inactive. Não houve tentativa por outro canal após a rejeição. Essa tentativa não chegou a obter uma resposta HTTP da API n8n; o HTTP400 de settings pertence às tentativas anteriores.

Render Production continua live, deploy `dep-dbtp8lpsrm7s73dkttag`, SHA `c421abbdc8bde703bd10e179f8715c56371c369c`. Nenhum novo deploy iniciado. Às00:11:29 de17/11 (America/Sao_Paulo;03:11:29Z), saúde200, ausência de token401, Bearer aceito até a condição opcional de provedor ausente503 e ping GitHub/HMAC200/received:true. O fluxo valida destinatário antes dessas respostas. Nenhum tick, evento comercial ou gravação de teste.

Neon somente leitura:35 tabelas/92 índices/zero índices ou constraints inválidos, uma organização/um usuário, zero notificações/revisões/inscrições push nesta leitura. Snapshot `snap-silent-fog-acdvwgeu` confirmado/preservado na branch Production. Logs Render de erro consultados não retornaram registros; isso não comprova ausência de qualquer evento em todos os logs. Nenhuma migration, restauração, alteração de credencial, commit/push, contratação ou outro projeto Cloudfy modificado.

## Correção manual exata

Abra [o workflow existente](https://socialbaboon-n8n.cloudfy.live/workflow/n20DNyb13Aaw3nq5). Mantenha **Inactive** durante todas as etapas. Não clique em Execute Workflow, Execute step, relógio ou Activate. As credenciais já existem e não precisam de tokens copiados.

### 1. Oito URLs fixas — substituir o campo inteiro

Em cada nó abaixo, abra **Parameters → URL**, use **Fixed**, apague o conteúdo atual completo e cole a URL correspondente. Não cole somente o domínio.

**CAPTURA · Enviar captura para revisão**
```text
https://abelha-gestor-api.onrender.com/api/v1/integrations/leads/capture
```

**BUSCA · Consultar Overpass pelo backend**
```text
https://abelha-gestor-api.onrender.com/api/v1/integrations/leads/search
```

**BUSCA · Guardar candidato público**
```text
https://abelha-gestor-api.onrender.com/api/v1/integrations/leads/stage
```

**FINANCEIRO · Executar tick completo**
```text
https://abelha-gestor-api.onrender.com/api/v1/integrations/tick
```

**CONTAS · Conferir pendências pelo tick**
```text
https://abelha-gestor-api.onrender.com/api/v1/integrations/tick
```

**PREÇOS · Listar monitores devidos**
```text
https://abelha-gestor-api.onrender.com/api/v1/integrations/prices/due
```

**PROJETOS · Encaminhar GitHub assinado**
```text
https://abelha-gestor-api.onrender.com/api/v1/integrations/github
```

**REVISÃO · Gerar revisão parcial**
```text
https://abelha-gestor-api.onrender.com/api/v1/integrations/weekly-review
```

### 2. Duas URLs dinâmicas — preservar expressão completa

Use **Expression** no campo URL e cole a expressão inteira com `{{ ... }}`. O n8n representa esse valor no JSON salvo com o prefixo `=`. Não duplique esse prefixo no editor. A sintaxe de expressão é descrita na [documentação oficial n8n](https://docs.n8n.io/build/work-with-data/expressions-versus-data-nodes).

**PREÇOS · Registrar observação**
```js
{{ "https://abelha-gestor-api.onrender.com/api/v1/integrations/prices/" + encodeURIComponent($json.watch_id) + "/observations" }}
```

**PROJETOS · Registrar relatório pendente**
```js
{{ "https://abelha-gestor-api.onrender.com/api/v1/integrations/projects/" + encodeURIComponent($json.project_id) + "/reports" }}
```

Sem dados de entrada, a prévia da expressão pode não calcular um ID. Não execute o nó para preencher isso. A expressão será conferida pelo JSON remoto salvo.

### 3. Cinco credenciais de saída — selecionar Backend Produção

Nestes cinco nós, selecione **Abelha — Backend Produção**, ID `Abd3Qw4AX18sLF7N`, no campo da credencial **Header Auth**. Preserve Authentication = Generic Credential Type e Generic Auth Type = Header Auth.

| Nó | Encontrado | Selecionar |
|---|---|---|
| CAPTURA · Enviar captura para revisão | Entrada Produção | Backend Produção |
| BUSCA · Consultar Overpass pelo backend | Entrada Produção | Backend Produção |
| BUSCA · Guardar candidato público | Entrada Produção | Backend Produção |
| PROJETOS · Registrar relatório pendente | Entrada Produção | Backend Produção |
| REVISÃO · Gerar revisão parcial | Backend Homologação | Backend Produção |

As quatro saídas Financeiro, Contas, Listar monitores e Registrar observação já usam a credencial correta; preserve-as. O relay GitHub deve continuar sem Header Auth.

### 4. Três credenciais de entrada — selecionar Entrada Produção

Nestes três nós Webhook, preserve **Authentication = Header Auth** e selecione **Abelha — Entrada Produção**, ID `nm0JbSU2k2mKgMoA`:

- CAPTURA · Receber captura.
- BUSCA · Receber busca.
- PROJETOS · Receber relatório Codex.

Não altere os paths, responseMode ou o webhook GitHub.

### 5. Restaurar o nó do provedor de preços

Abra **PREÇOS · Consultar API autorizada**. Em URL, use **Expression** e cole:
```js
{{ $json.provider_url }}
```

Remova **somente a associação de Backend Produção neste nó** pelo seletor de credencial. Não exclua a credencial global, não escolha credencial de outro projeto e não adicione provedor fictício. O backup não tinha credencial vinculada; mantenha os demais parâmetros. Se a interface não oferecer como limpar essa seleção, pare essa etapa e informe isso; não altere Authentication/headers por tentativa. Preços permanecem sem provedor e desligados no relógio.

### 6. Salvar e conferir

Salve mantendo **Inactive**. Não modifique Code nodes, conexões, settings ou outros parâmetros. Informe “Correções salvas; continua Inactive” e eventuais campos que não conseguiu limpar. Será feita nova comparação integral antes de qualquer ativação. A autorização de ativação continua condicionada à aprovação dos gates; o estado atual não passa.

## Pendências opcionais e continuidade

Preços dependem de API autorizada; Overpass não foi consultado novamente. Produtores permanentes GitHub/CI/captura, VAPID runtime e instalação/atualização/push físico continuam separados da correção do workflow. Nenhum pagamento, cobrança, envio comercial, conclusão de marco ou preço automático foi habilitado. Não houve primeira execução automática e não existe entrega push comprovada.

Plugins usados: Cloudfy/n8n, Render, Neon e Segundo Cérebro. Skills usadas: diagnóstico sistemático e verificação antes de conclusão. Evidência do código publicado anterior foi reaproveitada; nenhuma suíte integral inalterada foi repetida. Processos de probe concluídos; nenhum servidor temporário iniciado.
