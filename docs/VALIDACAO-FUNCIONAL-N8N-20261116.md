# Validação funcional e n8n — 16/11/2026

## Escopo e estado preservado

Validação de escrita exclusivamente em `https://abelha-gestor-api-hml.onrender.com`, database `abelha_homologacao`, role `abelha_hml_app`, com identidades sintéticas. Checkout `main/23c06eb`, alterações anteriores e credenciais preservados. A migration de produção já concluída não foi repetida. Nenhum commit, push, merge, deploy, alteração de produção ou ativação do n8n nesta rodada. Evidência estruturada: [functional-n8n-20261116.json](audits/functional-n8n-20261116.json).

## Funcionalidades verificadas na API HML

O runner privado `.abelha-homologacao/test-functional-20261116.cjs` passou em11 grupos, com96 requisições HTTP. Autenticação real por Credentials/CSRF/sessão, usando a conta sintética existente e três identidades temporárias em duas organizações temporárias. Não foram forjadas sessões nem usadas contas comerciais. Ao terminar, logout e limpeza restauraram as35 contagens/fingerprints.

| Área | Resultado comprovado | Limite |
|---|---|---|
| Projetos | Criação, consulta, edição e isolamento por organização/usuário | DELETE publicado retorna404; implementação local descrita abaixo |
| Marcos e relatórios | Cadastro/consulta de marco; rejeição de relatório sem evidência e de conclusão sem revisão | Relatório positivo/conclusão de marco em HML dependem de evidência CI real |
| Faturas | Registros100→120→90, variação−30 e reenvio diário sem duplicação | Valores exclusivamente sintéticos |
| Metas | Renda, orçamento, meta e valor guardado persistidos e isolados | Sem movimentação bancária |
| Contas e assinaturas | Registro sintético de pagamento/reenvio, vencimento31→28, edição de preço e inativação | Nenhuma cobrança ou pagamento externo |
| Revisão semanal | Geração parcial, leitura, reenvio com mesmo ID e isolamento | Não simula finalização automática de domingo |
| Leads | Captura por formulário, deduplicação, aprovação e reaprovação com mesmo cliente | Não comprova disponibilidade do Overpass |
| Templates/rascunhos | Criação, edição, JSONB, idempotência e isolamento | Não cria contrato automaticamente |
| CRM | Clientes e tarefas CRUD; pipeline e agenda; estados de despesa/recebível; leitura de painel, relatórios, contratos, finanças e conversas | Contrato/recebível de apoio eram fixtures SQL; criação de contrato pela UI não foi testada |
| Integrações opcionais | Preços indisponíveis retornam503 enquanto Personal responde200; VAPID configurada; inscrição push inválida rejeitada400 | Sem cotação fictícia ou envio físico |

Uma primeira execução do runner omitiu `evidence_reference`: o backend corretamente rejeitou400. A fixture foi ajustada ao contrato; isso não foi tratado como defeito da aplicação. O DELETE de cliente responde204, conforme o contrato existente.

## Correções locais e regressões

**Exclusão de projetos:** autorizada separadamente para implementação local. Nova rota DELETE com confirmação exata do nome, sessão/organização/usuário, proteção do cliente e lock/transação. Remove apenas o projeto e dados vinculados, incluindo seus avisos; preserva outros owners, projetos, finanças e snapshots históricos de revisão. Falha antes de terminar reverte a transação. Diálogo usa o Modal e os tokens existentes, com confirmação digitada, cancelamento e erro visível.

Regressão reproduziu404 antes da implementação e passou depois. Cobertura inclui400/403/404, cascatas, rollback após erro forçado,204 e repetição404. Três testes do cliente frontend verificam confirmação antes da rede, headers/body/cookies e ausência de evento de sucesso após erro. Plano: [exclusao-projetos](planos/2026-11-16-exclusao-projetos.md).

**Helper de listeners:** um HTTP200 sem o corpo esperado era aceito como captura aprovada. O teste reproduziu o falso positivo; agora `capture` exige `received`, ID, `reused` e `review_required`. `github-ping`/`github-push` exigem os campos do confirmador remoto, incluindo zero marcos concluídos. Os erros esperados503 exigem `ok:false`, bloco correto e código genérico correspondente;503 vazio ou de outro bloco também é rejeitado. Treze cenários de resposta passaram sem rede, incluindo regressões vermelho/verde para confirmações e erros genéricos indevidos. Modos sem verificação semântica explícita indicam null. O helper continua privado/ignorado e restrito a Test URLs/HML; backups preservados. O push sintético não realiza push no GitHub.

**Verificação local:**54 testes backend,32 frontend, TypeScript, lint e builds passaram. A navegação visual da nova exclusão não foi executada: Computer Use não inicializou (`failed to write kernel assets`). Nenhum fallback de automação de navegador contornou esse bloqueio. O DELETE permanece ausente no HML publicado até um deploy especificamente autorizado.

## Workflow: contratos versus motor real

Cloudfy/socialbaboon, infraestrutura atualmente identificada como `infra_fxJeupUPo3oD`. Consolidado `n20DNyb13Aaw3nq5`:62 nós, inativo. UpdatedAt inicial `2026-11-13T12:38:22.344Z`; final observado `2026-11-16T14:38:10.757Z`, após uso do editor. Dez destinos backend HML; nove vínculos Header Auth de saída e três de entrada. Relay GitHub conserva HMAC/bytes e não recebe Header Auth. Códigos, URLs, referências de credenciais e conexões permanecem iguais. O editor salvou diferenças em posições/parâmetros padrão, metadados de condições IF e `binaryMode=separate`; foram preservadas, sem reimportação, atualização pelo conector ou alteração dos backups. O seletor manual foi usado temporariamente em accounts/weekly-review e restaurado para tick.

| Camada | Resultado |
|---|---|
| Definição remota/Code nodes em VM |10 grupos aprovados: equivalência, destinos, roteamento independente, validações, HMAC, lotes, retries, falhas e preços sem fonte |
| Code nodes em VM → HTTP Render HML → PostgreSQL HML |10 grupos aprovados: captura/reenvio/conflito/token inválido, staging sintético, avisos e deduplicação do tick, accounts sem pagamento, GitHub/HMAC/replay/tamper, rejeição de relatório, revisão parcial, preços503 e limpeza35/35 |
| Motor n8n — tentativa de captura |Test URL respondeu200, sem confirmação semântica e sem candidato persistido. Usuário observou somente o webhook verde, com painel de saída carregando indefinidamente. Recepção do evento observada; captura completa **não aprovada** |
| Motor n8n — captura parcial posterior | Com Execute step em CAPTURA · Confirmar captura, POST real criou um candidato HML; três nós verdes confirmados pelo usuário. Reexecução manteve um candidato e fingerprint. Essa primeira fase parou antes do responder e não validou o HTTP final; a rodada completa abaixo resolveu essa lacuna |
| Motor n8n — captura completa e replay | Nova preparação, etapa Responder webhook e Test URL:200 JSON com received/review_required=true, reused=false na primeira chamada e true no reenvio. Um candidato e fingerprint estável; outras33 tabelas intactas além do projeto de apoio |
| Motor n8n — GitHub/HMAC e replay | Evento explicitamente sintético chegou ao backend pela preservação dos bytes/HMAC, gravando uma atualização no projeto de apoio. Responder webhook retornou200 com received, matched_projects, recorded_updates e completed_milestones, validados pelo helper. Reenvio manteve uma atualização e fingerprints de projeto/atualização; zero marcos concluídos |
| Motor n8n — erros completos de captura/GitHub | Responder falha webhook retornou503 JSON, ok=false e código/bloco exatos: CAPTURA para entrada incompleta; PROJETOS para corpo GitHub adulterado com delivery novo. Sem persistência ou alteração de fingerprints |
| Motor n8n — relatório sem CI | Resposta completa503/PROJETOS validada; nenhum relatório ou marco criado. Positivo remoto continua dependendo de CI real |
| Motor n8n — busca | Entrada inválida retornou503/BUSCA validado, sem consulta Overpass. Uma tentativa válida chegou ao ramo de falha, sem importação; o404 inicial antes de limpar o editor não comprovou consulta. Retry desligado e sem repetição após a falha. Disponibilidade Overpass não aprovada; status exato do backend nessa chamada não foi visível no editor |
| Motor n8n — tick e accounts | Nó FINANCEIRO verde e dois avisos SQL verificados. Após iniciar por Teste manual, CONTAS verde e avisos/fingerprints iguais; sem pagamento, avanço de vencimento, preço, revisão indevida ou push físico |
| Motor n8n — revisão semanal | Teste manual e REVISÃO verdes; uma revisão parcial com projeto/assinatura sintéticos, um aviso próprio, finalized=false. Repetição preservou ID, conteúdo e avisos. Seletor restaurado para tick e confirmado via plugin |
| Contagem exata de retries/falhas parciais em lotes | Contratos/local/VM aprovados; contagem de tentativas e lotes com resultados mistos ainda não comprovada no motor |

A API de execuções retornou zero registros. Isso não prova que nenhum nó manual executou: o workflow mantém `saveManualExecutions:false`, sucesso/erro/progresso sem retenção. É necessário conferir a execução no editor e seus efeitos em HML. Não habilitar logs de payloads nem alterar retenção para contornar a falta de evidência.

Para o editor travado: interromper a execução/listener se disponível, fechar o painel e atualizar com Ctrl+F5. Manter Inactive. Confirmar o gatilho selecionado antes de qualquer execução completa; não executar o relógio ou todos os gatilhos. Se houver execução parcial do nó, ela não equivale ao percurso completo. A causa do carregamento infinito ainda não foi demonstrada. Procedimento e comandos: [N8N-HOMOLOGACAO.md](N8N-HOMOLOGACAO.md).

## Pendências externas separadas

- **Overpass:** uma busca sintética na API HML retornou503. Uma única consulta posterior a `/api/status` retornou502 com mensagem explícita de capacidade esgotada, workers ocupados e fila cheia. Há evidência de saturação do provedor; não atribuir automaticamente o status upstream exato da consulta anterior. Não repetir consultas indiscriminadamente. Indisponibilidade é tratada sem derrubar Personal.
- **Preços:** falta fonte/API real autorizada, allowlist e credencial própria. O503 esperado de configuração e isolamento dos outros módulos passaram. Nenhum preço foi inventado. O relógio também alcança preços; ativação completa continua bloqueada enquanto essa operação não tiver configuração/decisão explícita.
- **Relatório positivo:** GitHub retornou `total_count:0` em Actions. Sem evidência CI real do mesmo repositório, não há teste positivo remoto de relatório/conclusão. Cobertura positiva local usa fixtures declaradas; não certifica um build real do GitHub.
- **Push:** VAPID pública confere com HML e validação de inscrição inválida passou; entrega física, permissões do dispositivo e logout/rotação reais continuam pendentes.
- **PWA:** Preview protegido respondeu302 para Vercel sem autenticação. O SW usa `credentials:omit` e recusa cache de shell protegido. Proteção preservada; instalação/offline no Preview não aprovados nesta rodada. Navegação atual pela UI também não foi executada.
- **Erros operacionais:** falta conferir no host `CODE_ENABLE_STDOUT` e a chegada de somente código/bloco genéricos ao destino de logs. Não imprimir payloads ou segredos.

## Limpeza e continuidade

A rodada parcial foi encerrada com limpeza verificada: auxiliar do tick e helper existente restauraram as35 tabelas. Depois, uma nova preparação permitiu validar **oito casos HTTP completos no motor**: captura/replay, GitHub/replay e quatro rejeições503. Seu cleanup também passou: candidato, projeto e atualização removidos;35 contagens/fingerprints originais e estado privado removido. Não foi necessário repetir as fixtures do tick nessa rodada final. Nenhum pagamento inesperado, exclusão ampla ou escrita em produção. Processos dos runners não encontrados; nenhum serviço local deixado ativo. Serviços persistentes HML preservados.

Retomada do listener no mesmo dia: o usuário confirmou entrada vazia e clicou Execute step em CAPTURA · Confirmar captura, mas relatou somente carregamento. Um GET à Test URL respondeu404 com sugestão de POST; o POST sintético seguinte respondeu404/não registrado. Essa sugestão de método não comprova disponibilidade do listener no momento do envio. Conferência SQL: zero candidatos/revisões da tentativa e somente o projeto de apoio. Plugin sem execuções persistidas. A execução do ramo não foi aprovada; é necessário comparar a Test URL efetivamente exibida no editor antes de outro envio. Prepare/cleanup desta retomada passaram, com35 contagens/fingerprints restaurados e estado privado removido.

Os runners funcional e VM→HTTP/SQL restauraram as35 contagens/fingerprints e fecharam conexões. O `prepare` do ensaio de listener criou depois somente o projeto sintético de apoio; a tentativa de captura não criou candidato. Após a consulta do plugin não listar execuções running/waiting, o `cleanup` passou: `cleanupVerified:true`,35 tabelas com contagens/fingerprints iguais ao início e estado privado removido. Nenhum DELETE amplo ou limpeza em produção. Consulta dos processos não encontrou runners restantes; nenhum servidor local foi deixado ativo. Os serviços persistentes HML existentes foram preservados. Será necessário executar prepare novamente antes de retomar os listeners.

Procedimento comprovado: prepare antes de armar; Ctrl+F5 para limpar dados de execuções anteriores; Execute step no **Responder webhook** para sucesso ou no **Responder falha webhook** para rejeições; enviar imediatamente à Test URL correspondente, sem esperar o painel Output. Exigir o corpo/status correto e conferir os efeitos em HML. Não clicar no relógio, Teste manual ou Execute workflow durante callbacks. O grafo do responder de sucesso só tem webhooks; o de falha possui outros ancestrais, portanto manter o estado limpo e interromper se outro gatilho iniciar. Concluir com cleanup. Novos ensaios de callback básico não são necessários sem mudança/falha que os justifique.

Transição futura: publicação local pelo usuário e deploy HML autorizado para testar DELETE/UI; fonte real de preços, disponibilidade Overpass, CI real para relatório positivo, push/PWA e observabilidade/retries em lotes. Só então planejar credenciais exclusivas de produção, mudança controlada dos destinos e autorização própria de ativação. Não reutilizar token/banco HML em produção e não repetir a migration já aplicada. Os callbacks básicos200/503 e as operações manuais já passaram; permanecem válidos para a definição atual, com os limites registrados.
