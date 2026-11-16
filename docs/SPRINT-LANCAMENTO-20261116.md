# Estabilização e lançamento — 16/11/2026

## Gate de HML f7efda6 reprovado — correção local do health autenticado

Backend e Preview HML publicados em f7efda682180b4c89d1bc721e3f7f0aa97fbf090, respectivamente dep-dbtnudmk1f9s7397tcb0/live e dpl_EDn8YNwof7hxcF9xoHSdLyao8Gqf/READY. URL https://abelha-gestor-6xxwd85w6-higoraranda-gmailcoms-projects.vercel.app. FRONTEND_URL HML ajustado por merge de um nome; o plugin iniciou automaticamente esse deploy, portanto não houve segundo trigger. BACKEND_URL foi conferida apenas em Preview e aponta ao Render HML. Push Production automático cancelado pelo bloqueio exit0.

26 checks de API HML e cleanup35/35 passaram, incluindo autenticação real/cookies/CORS/leituras essenciais/exclusão e logout. Quatro GETs do Preview pelo conector (shell, SW, manifesto e sessão anônima) e cinco grupos do artefato SW/VM passaram. **Usuário reprovou a abertura real:** Chrome desktop fica na animação antes do formulário. Consequentemente, Production não foi promovida.

Causa comprovada por GET sem cookies: health direto do Render200 JSON; health do Preview302 para vercel.com. O health inicial usava credentials:'omit', então a proteção Vercel não recebia seu cookie e waitForBackend repetia indefinidamente. O acesso autenticado do conector recebia200 e mascarava essa diferença de contexto. A correção local usa somente credentials:'same-origin' em frontend/src/lib/backendReady.ts. Não encaminha cookies da origem frontend a backend externo; redirect:error e no-store continuam. Não modificar a proteção Vercel nem o credentials:omit do precache SW para resolver isso.

Regressão em backendReady.test.mjs ficou vermelha com a política antiga e verde após a alteração.8 testes direcionados/42 frontend, lint e TypeScript/build aprovados. O novo comportamento ainda **não foi publicado/testado visualmente**; exige commit/push manual e novo SHA antes de retomar HML. A autorização B continua válida no mesmo escopo; não promover f7efda6 enquanto esse gate estiver reprovado. Os dados sintéticos foram removidos e35 contagens/fingerprints reconferidos em leitura.

Render Production permanece2dcc9d0/live; alias Vercel Production permanece dpl_8fuqVWWywbfP8DYU8qh6jdqvNsjC/23c06eb. Render Off/Vercel exit0 ficam mantidos durante a correção/push para impedir publicação acidental; ao concluir o release, restaurar On Commit/Automatic e conferir. Snapshot,35 tabelas de produção e n8n HML/inativo preservados. Não há migrations/restaurações ou fase4 autorizadas. Os estados de prontidão anteriores abaixo são históricos e não aprovam o gate visual atual.

## Execução autorizada — controles pausados e SHA aguardado

A+B foram explicitamente autorizados, inclusive a substituição técnica do array de62 nós com somente o jsCode alterado. Não pedir essa autorização novamente. Fase4 permanece excluída. Publicação Git segue exclusivamente manual, sem branch nova.

Render Production: usuário desabilitou On Commit; plugin confirmou autoDeploy=no/trigger=off. Vercel: usuário confirmou original **Automatic**; plugin aplicou somente commandForIgnoringBuildStep=exit0 com sucesso. O GET resumido não mostra esse campo, mas confirmou domínios, SSO/proteção e deployment atual preservados. Originais guardados privadamente para restaurar On Commit/Automatic ao final do release; manter bloqueios durante commit/push, HML e promoção. Nada foi publicado ainda.

**Etapa A concluída e verificada:** leitura fresca, backup privado e comparação integral passaram. A chamada pelo plugin recebeu HTTP400 (`request/body/settings must NOT have additional properties`), sem alteração; não foram removidos settings para forçar PUT. O usuário aplicou o jsCode aprovado pelo editor. Releitura confirmou os62 nós exatamente iguais à proposta: única mudança funcional em Operações do relógio.parameters.jsCode, com somente tick automático. IDs, posições, todos os outros parâmetros, credenciais, conexões/settings/staticData/meta e dez destinos HML preservados, workflow inativo. Somente updatedAt/versionId/versionCounter mudaram adicionalmente, conforme salvamento. Novo updatedAt2026-11-16T21:53:41.207Z/versionId1e85344d-4cf5-4619-bd41-8e2bcd145f3d. Snapshot mws_hfTw59hbiJx3 e backups privados antes/depois preservados. Não ativar ou redirecionar o workflow; o editor resolveu a incompatibilidade técnica, sem contornar recusa de autorização.

O manifesto atualizado lista o conjunto para seu commit/push manual. Controles de deploy permanecem pausados; aguardar SHA completo publicado antes de deploy. Depois executar apenas o delta HML; qualquer falha crítica interrompe a promoção. Os registros de patch/autorização pendentes abaixo descrevem o preflight anterior e foram superados por esta seção de execução. Somente o relógio foi verificado nesta mudança; os callbacks funcionais inalterados não foram repetidos.

## Release final coordenado — próximo limite de autorização

O pacote foi relido sem alterações de código após a sprint. Última verificação direcionada: **10 testes backend e17 frontend aprovados**, build/TypeScript de ambos e lint frontend aprovados. As96 requisições HML e os callbacks n8n inalterados não foram repetidos. Avisos não bloqueantes do build frontend: chunk maior que500kB e depreciação Node module.register(); não houve novo ciclo de refatoração.

Inventário completo para revisão/commit manual: [releases/release-final-20261116.json](releases/release-final-20261116.json), com hashes dos arquivos preparados. Sem dumps, contas de ensaio, logs, valores de credenciais ou registros runtime no pacote; os testes de regressão mantêm somente suas fixtures declaradas em código. `.abelha-homologacao/`, ambientes privados, node_modules e dist continuam excluídos. Os roteiros SQL versionáveis são documentação operacional histórica, não são executados pelo build/start e não autorizam repetir a migration.

O workflow foi relido duas vezes antes da solicitação:62 nós, inativo, dez destinos HML, updatedAt2026-11-16T14:38:10.757Z e versionIdb7996e88-5a32-47ff-b0a5-019c6cc9d54d, sem diferença entre leituras. Snapshot completo privado e proposta de array preservados em `.abelha-homologacao/`; somente um campo jsCode muda. Será obrigatório reler/comparar novamente imediatamente antes da escrita autorizada. **Nenhum patch remoto ou deploy foi executado.**

A solicitação atual reúne **somente A+B**: (A) patch do clock ainda em HML/inativo, pelo plugin com substituição do array completo de62 nós; (B) controles temporários dos gatilhos, commit/push manual pelo usuário, confirmação do SHA, deploy/validação do delta em HML e, somente se passar, deploy Production backend+frontend no mesmo SHA, verificações de leitura e restauração dos controles. Falha crítica interrompe a promoção. Sem nova branch, migration, restore, recurso pago ou escrita de teste em produção.

**A fase4 permanece separada e não autorizada:** redirecionar o workflow, aplicar credenciais de produção e ativar automações só depois da publicação validada e de autorização explícita própria. As propostas privadas existentes não são credenciais ativas.

Antes do push, será necessária uma ação no painel Render, porque o plugin não edita Auto-Deploy: serviço abelha-gestor-api → Settings → Build & Deploy → Auto-Deploy → Off; será conferido pelo plugin. Na Vercel, registrar o valor atual de Ignored Build Step antes do override temporário exit0. O conector de leitura atual não mostra esse campo: se continuar indisponível, o usuário deve informar seu conteúdo/configuração no painel, sem segredo, antes de qualquer substituição; nunca presumir que era vazio. Restaurar os valores registrados ao final. Não fazer commit/push de publicação antes de confirmar os dois controles.

Depois dos controles, revisar a lista do manifesto no editor, selecionar somente esses arquivos e fazer commit/push na **main** manualmente. Informar o SHA completo publicado; não será executado stage, commit, push, merge ou PR em nome do usuário. O pacote fica parado neste limite até autorização A+B; a autorização não é inferida do tempo ou da ausência de resposta.

Estado: **correções e pacote local preparados; publicação e ativação ainda não executadas**. Checkout `main/23c06ebd5a9ab9d2954fb16a9ae145bc91fe1fd6`, com todas as alterações anteriores preservadas. O usuário publica manualmente pela main; não criar branches. Este roteiro não concede autorização.

## Resultado e evidências

| Área | Resultado comprovado | Limite |
|---|---|---|
| CRM e Personal | Reaproveitados 11 grupos/96 requisições HML autenticadas, incluindo isolamento, faturas, metas, assinaturas, revisão, leads, templates e CRM | Evidência da rodada funcional anterior; não repetida sem mudança relacionada |
| Exclusão de projetos | Confirmação exata, guard de mutação, organização/usuário, transação/lock, cascatas e rollback cobertos por regressão; mais 15 requisições reais com backend compilado local conectado exclusivamente ao Neon HML | Render publicado ainda não tem DELETE; navegação visual do modal continua pendente |
| PWA | Corrigida exposição prematura do registro Service Worker; observa instalação/atualização já iniciada, falha tardia e ativação; limpa listeners; mantém worker anterior após update malsucedido | Testes automatizados do hook/SW; sem novo ensaio em navegador ou aparelho físico |
| Agendador n8n | Modelo e gerador locais agora emitem somente tick; preços exigem PRICE_MONITOR_ENABLED=true explícito | Remoto continua emitindo tick e prices; patch pendente de autorização, workflow inativo |
| Qualidade | Backend 55/55, frontend 40/40, TypeScript/builds e lint frontend aprovados; oito regressões novas de PWA/SW | Não existe script lint no backend; testes VM não equivalem a navegador/motor n8n |
| Limpeza | Ensaio DELETE restaurou 35 contagens/fingerprints HML; logout, pool e servidor fechados; porta 51337 liberada | Serviços persistentes HML mantidos conforme autorização anterior |

Detalhes da rodada funcional/n8n já aprovada: [VALIDACAO-FUNCIONAL-N8N-20261116.md](VALIDACAO-FUNCIONAL-N8N-20261116.md). Auditoria desta rodada: [sprint-release-20261116.json](audits/sprint-release-20261116.json).

O ensaio DELETE usou Express/Auth.js reais, CSRF, credenciais e sessão JWT, NODE_ENV=production, 401 anônimo, 400 para nome incorreto, 403 sem guard, 204 com exclusão/cascatas e 404 no reenvio. Banco/role/endpoint foram conferidos antes da escrita sintética. A cookie jar do runner envia cookie Secure no loopback HTTP: isso **não comprova transporte de cookies no navegador**. Runners e resultados privados permanecem em `.abelha-homologacao/`; não versionar.

O comando de inspeção global de linhas de processos por CIM recebeu acesso negado; não interpretar a lista vazia como prova global. As execuções dos runners retornaram/fecharam seus recursos, os PIDs temporários conhecidos foram conferidos e a porta51337 está livre. Nenhum processo do usuário foi finalizado.

A revisão de formulários, Dark Mode e acessibilidade por código não encontrou outro bug reproduzível que justificasse refatoração. Computer Use não inicializou (erro de assets/caminho); não houve nova navegação autenticada, comparação visual ou contorno por outra automação. As verificações visuais históricas não comprovam a UI nova da exclusão.

## Estado remoto relido e preservado

| Ambiente | Identificação observada | Estado |
|---|---|---|
| Vercel Production | dpl_8fuqVWWywbfP8DYU8qh6jdqvNsjC / 23c06eb | READY, https://abelha-gestor.vercel.app |
| Render Production | srv-daldd0142hec73c3ltt0 / dep-dbt7f5mq1p3s73fjbq7g / 2dcc9d0 | live, Free, autoDeploy=yes/on commit |
| Vercel Preview HML | dpl_2Mv23jgB9JZdrMGAdNxxLEHEPPpu / 40c179c | Preview existente preservado e protegido |
| Render HML | srv-dbr3if3tqb8s73cr2jn0 / dep-dbrfscdbedkc73dg79gg / 40c179c | Free, autoDeploy=no, configuração preservada |
| Neon Production | curly-river-94350351 / br-square-sunset-acpb91u2 / neondb | Consulta somente leitura: 35 tabelas, 92 índices, zero inválidos |
| n8n | infra_fxJeupUPo3oD / n20DNyb13Aaw3nq5 | 62 nós, inativo, dez destinos HML, nenhuma execução running/waiting listada |

Vercel conserva SSO `all_except_custom_domains`, domínios e deployment atual. Render conserva IDs/configuração do serviço e deploy live; nenhum restart/deploy foi solicitado. Nenhuma migration/restauração, credencial de produção ou dado comercial foi alterado. A migration original conserva SHA-256 `9812b2bd74acc1fb983318bab62590da6cf8e92a1536e85032fb8b604f84dcdb`. O snapshot já criado `snap-silent-fog-acdvwgeu` não foi alterado; sua evidência está em [EXECUCAO-MIGRATION-PERSONAL.md](EXECUCAO-MIGRATION-PERSONAL.md).

## n8n: correção preparada e limites

O patch revisável é [n8n-price-scheduler-20261116.json](releases/n8n-price-scheduler-20261116.json). Altera **somente** `parameters.jsCode` de **Operações do relógio**, ID `f3a2ae7f-194b-d809-9f66-fb4650e4bdaa`:

```js
const PRICE_MONITOR_ENABLED=false;
const operations=[{json:{operation:"tick"}}];
if(PRICE_MONITOR_ENABLED)operations.push({json:{operation:"prices"}});
return operations;
```

Intervalo de 15 minutos, caminhos, nove saídas Header Auth, três entradas protegidas, relay GitHub/HMAC sem Header Auth, conexões e layout devem permanecer iguais. Preços manuais continuam como diagnóstico explícito, com erro real quando não configurados; não há cotação simulada nem 503 mascarado. Não habilitar preços antes de validar provedor/hosts/credencial e frequência por produto.

O plugin só permite substituir o array completo de nós. A tentativa foi rejeitada pela revisão automática por falta de autorização explícita considerada suficiente para essa escrita persistente ampla. **Nenhuma alteração remota foi aplicada**. Releitura final confirmou igualdade integral com o início, updatedAt `2026-11-16T14:38:10.757Z`, inativo, 62 nós. Não contornar a rejeição por outro canal. Depois de autorizado, reler novamente, produzir snapshot privado e aplicar o patch a uma cópia fresca; comparar todos os campos, abortando se houver outra alteração. O modelo JSON local contém URLs históricas de produção: **não importá-lo sobre o remoto HML**.

Não repetidos os oito callbacks completos reais já aprovados no motor (captura/replay, GitHub assinado/replay e quatro rejeições 503), tick/accounts e revisão/replay. As dez verificações VM e dez VM→HTTP/SQL permanecem evidências separadas. A contagem exata de retries e um lote misto de sucessos/falhas continuam sem ensaio no motor; se a busca for habilitada, esse delta precisa de Test URL e dados sintéticos. O clock novo foi exercitado em VM; cron remoto automático não foi executado.

Overpass permanece opcional: saturação externa já observada, sem nova consulta nesta rodada. Sua falha não deve alcançar tick/captura/revisão. Busca positiva depende de disponibilidade; não repetir consultas para contornar saturação. Relatório positivo estruturado continua dependendo de uma execução CI real; não há `.github/workflows` local e a consulta anterior retornou zero runs. Não fabricar SHA/URL nem marcar critérios como aprovados por um evento GitHub. Logs genéricos stdout e contagens de retries/lotes ainda precisam de observação na instância, sem ligar retenção de payloads.

## Segredos preparados, ainda não aplicados

Arquivos privados/ignorados: `.abelha-homologacao/propostas-producao/backend.env.proposal` e `n8n.credentials.proposal.json`. Três segredos aleatórios distintos de 64 caracteres foram preparados em standby, comparados com HML sem imprimir valores. Não são credenciais ativas. A conta candidata foi identificada por consulta somente leitura: uma organização e um usuário vinculados; IDs ficam somente na proposta privada e devem ser reconfirmados antes da aplicação.

| Destino | Campos exatos propostos | Aplicação futura |
|---|---|---|
| Render Production | ABELHA_INTEGRATION_TOKEN, ABELHA_INTEGRATION_ORGANIZATION_ID, ABELHA_INTEGRATION_USER_ID, GITHUB_WEBHOOK_SECRET | Merge somente desses quatro nomes, nunca replace de todas as variáveis; depende de autorização |
| Abelha — Backend Produção | Header Auth: Name=Authorization, Value=Bearer seguido do token exclusivo | Nove nós HTTP backend, preservando a credencial HML |
| Abelha — Entrada Produção | Header Auth: Name=X-Abelha-Webhook-Token, Value=segredo exclusivo de entrada | Três webhooks de captura/busca/relatório; chamadores somente servidor/conector |
| GitHub | Secret=segredo exclusivo GITHUB_WEBHOOK_SECRET; assinatura X-Hub-Signature-256 | Entrada/relay GitHub sem Header Auth; escolher uma única entrega, direta ou relay |

DATABASE_URL, AUTH_SECRET, AUTH_URL, FRONTEND_URL e VAPID de produção **não foram copiados, rotacionados ou substituídos**. Antes de aplicar a proposta, verificar privadamente se já existem tokens/consumidores de produção para evitar uma rotação involuntária. Se existir uso anterior não identificado, interromper essa configuração e preservar o valor atual. VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY e VAPID_SUBJECT de produção precisam ter sua prontidão conferida sem revelar valores; não gerar novas chaves sobre assinaturas existentes.

Configuração HML permanece nos arquivos originais; nenhuma credencial de outro projeto foi utilizada. O preflight local das propostas passou: ignoradas pelo Git, segredos distintos de HML e entre si, IDs válidos, sem DATABASE_URL/AUTH_SECRET/VAPID no arquivo de proposta. Não enviar esses arquivos por mensagem, commit, relatório ou cofre.

## Sequência única proposta para publicação

Executar **somente após autorização do pacote ao final**. Parar no primeiro gate reprovado. Não há migration nesta sequência.

1. **Controlar gatilhos antes do push manual.** Render Production: Settings → Build & Deploy → Auto-Deploy → Off; conferir pelo plugin `autoDeploy=no`. O plugin atual não edita essa opção: essa ação requer o painel manual. Vercel: registrar o Ignored Build Step atual e definir temporariamente `exit 0`, sem tocar SSO/proteção/domínios. Pode ser feito pelo plugin com `commandForIgnoringBuildStep`. Não fazer push até os dois controles estarem confirmados. A [documentação Render](https://render.com/docs/deploys) e a [documentação Vercel](https://vercel.com/docs/project-configuration/git-settings#ignored-build-step) descrevem esses controles; saída 0 cancela build automático, saída 1 permite.
2. **Revisão e publicação manual do Git na main.** Conferir `git status --short`, `git diff`, arquivos novos e `git check-ignore` das propostas; manter todas as alterações anteriores. O usuário escolhe o conjunto e faz commit/push manual sem force, sem branch nova. Registrar `git rev-parse HEAD` como RELEASE_SHA e conferir `origin/main` no mesmo SHA. Nenhum SHA futuro foi inventado. Congelar novos pushes durante o ensaio/publicação.
3. **Publicar o delta em HML.** Conferir plano Free existente; disparar deploy somente de srv-dbr3if3tqb8s73cr2jn0. O plugin Render usa o HEAD remoto e não recebe SHA: verificar antes/depois que coincide com RELEASE_SHA; se divergir, parar. Criar Vercel **Preview**, nunca target=production, com gitSource fixado em RELEASE_SHA e override `commandForIgnoringBuildStep="exit 1"` somente no deployment manual. BACKEND_URL somente Preview=https://abelha-gestor-api-hml.onrender.com; ajustar somente FRONTEND_URL no Render HML para a URL Preview real, preservando seu AUTH_URL/banco/segredos. Verificar efeito de redeploy e /health depois.
4. **Validar somente o delta publicado.** Conta sintética: login/CSRF/sessão, modal de exclusão (cancelar/nome incorreto/sucesso/reenvio) e confirmação no banco HML; logout/reconexão, PWA instalação/erro e disponibilidade de push. Não repetir as 96 chamadas e os oito callbacks inalterados. Limpar fixtures próprias e confirmar 35 baselines; nenhum write em produção. Se o browser continuar indisponível, o usuário faz somente essa inspeção visual, registrando a limitação. Aplicar o patch do clock autorizado, ainda inativo e em HML; VM compara saída somente tick e releitura confirma os 62 nós preservados.
5. **Publicar aplicação de produção compatível.** Reconfirmar 35 tabelas, proxy e backups/artefatos atuais sem alterar dados. Deploy Render Production primeiro, usando a main congelada em RELEASE_SHA; /health e rotas autenticadas em leitura. Depois criar deployment Vercel target=production no mesmo SHA, build manual liberado só para esse deployment, BACKEND_URL/alias/configuração Production existentes preservados. **Não promover o Preview HML para Production**, porque ele foi construído com ambiente HML. Confirmar login, leituras Personal/Leads/Templates/CRM e ausência de novas falhas SQL/CORS. Não testar DELETE em dados reais.
6. **Preparar automações de produção, ainda inativas.** Somente com autorização correspondente, merge das quatro variáveis e credenciais próprias descritas acima; reler snapshot privado do workflow e alterar exatamente os dez destinos HML para https://abelha-gestor-api.onrender.com, preservando paths/expressões. Vincular nove saídas e três entradas às credenciais de produção, sem alterar/apagar as HML. GitHub/HMAC permanece sem Header Auth. Não importar os sete backups ou o modelo local. Verificar que nenhum host/ID/segredo HML ficou no caminho de produção e que PRICE_MONITOR_ENABLED=false. Configurar apenas os produtores externos realmente autorizados; sem conector, o endpoint fica pronto mas sem entrada automática.
7. **Ativação condicionada, verificação e encerramento.** Ativar exclusivamente n20DNyb13Aaw3nq5 depois dos gates anteriores, com ciência de que o tick passa a gerar avisos legítimos da conta escolhida e a revisão de domingo. Observar a primeira janela de 15 minutos, contagem de execução e códigos genéricos; não criar transações/cotações de teste nem forçar pagamento ou conclusão de marco. Preços ficam desligados; busca/relatório positivo não são gates do uso básico. Em falha, desativar o workflow e seguir rollback. Restaurar os gatilhos de deploy anteriores somente ao final bem-sucedido ou após rollback concluído; não disparar deploy duplicado pelo plugin se o push já iniciou um. Encerrar apenas os processos temporários usados no ensaio.

Se algum serviço exigir plano pago/quota adicional, parar aquela ação. As autorizações da etapa anterior não autorizam um novo commit, push, produção, credencial ou ativação.

## Rollback executável

- **n8n:** desativar primeiro, sem exclusão. Reler e restaurar URLs/referências HML e clock da cópia privada pré-alteração, preservando as credenciais novas como inativas. Não ativar clock antigo enquanto prices automático continuar sem fonte. Confirmar 62 nós, dez HML e nenhum running/waiting. Não restaurar os sete backups por importação.
- **Frontend:** retornar o tráfego ao deployment de produção observado antes deste lançamento: dpl_8fuqVWWywbfP8DYU8qh6jdqvNsjC / 23c06eb. É o estado atual estável, não o Preview HML. Versão de referência anterior adicional: dpl_7T6rHFQLCQbDewnQrjWDqc19MGr5 / 2dcc9d0. Conferir disponibilidade/alias e usar rollback de produção do plugin; impedir que novo push recoloque a versão reprovada.
- **Backend:** Render → serviço srv-daldd0142hec73c3ltt0 → Deploys → dep-dbt7f5mq1p3s73fjbq7g → Rollback → Rollback to this deploy, se o artefato estiver retido. Se não estiver, Manual Deploy → Deploy a specific commit → `2dcc9d0d7e05b2f17e6b4eca58549d69b2ddfd34`; conferir Free antes de executar. O plugin atual não oferece rollback/commit específico: requer painel, sem inventar suporte do conector. [Render documenta retenção e configurações do rollback](https://render.com/docs/rollbacks); rever privadamente as variáveis recuperadas antes de reutilizá-las.
- **Configuração:** guardar os valores anteriores em local privado antes de qualquer merge; recuperar somente campos alterados e checar conta/host. Em HML, voltar FRONTEND_URL anterior se a nova prévia for descartada. Não resetar AUTH_SECRET/VAPID por conveniência.
- **Banco:** permanece com 35 tabelas. Sem DOWN, reset, seed ou restore automático. Falha de aplicação não autoriza restaurar o snapshot ou apagar dados novos. Qualquer recuperação do banco exige decisão/autorização separada.

## Ações físicas mínimas e pendências

O Preview protegido redireciona o shell anônimo; o SW usa credentials:omit e recusa cache privado/redirecionado. **Não remover a proteção nem adicionar cookies ao precache.** PWA/push físico HML dependem de uma origem HTTPS cujos arquivos estáticos sejam públicos sem expor API/dados; essa origem ainda não foi disponibilizada. Não criar novo serviço/domínio com custo. Em produção já autorizada, o usuário pode conferir instalação/leitura e uma notificação legítima da própria conta, sem fixtures comerciais; isso não substitui ensaio sintético HML.

1. Android/Chrome: na origem autorizada, menu → Instalar aplicativo; abrir pelo ícone. iPhone/iPad com iOS/iPadOS16.4+: Safari → Compartilhar → Adicionar à Tela de Início; abrir pelo ícone. [WebKit documenta o requisito de Home Screen e gesto do usuário](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).
2. Entrar na conta permitida → Personal → Preferências → **Ativar neste dispositivo**. Não enviar senha/tokens. Se indicar envio não configurado, conferir os três nomes VAPID no servidor; não rotacionar chaves existentes.
3. Em HML apta, preparar um lembrete sintético com preferência/horário devido e executar somente tick; bloquear o aparelho e verificar aviso genérico sem valores/projeto. Tocar abre Faturas/Metas conforme aviso; replay não deve duplicar. Sem origem HML adequada, deixar este teste pendente, sem produzir registros sintéticos em produção.
4. Com duas instalações, sair de uma e conferir que a outra continua autorizada; remover assinaturas/fixtures criadas no ensaio e restaurar preferências. Modo avião deve carregar somente shell público, sem dados privados em cache; reconectar deve recuperar sessão de forma normal.
5. Atualização exige uma segunda versão autorizada: manter formulário aberto, publicar a próxima versão aprovada e confirmar que ela aguarda **Atualizar e recarregar**. Não fazer um deploy extra apenas para simular este teste agora.

Pendências que não bloqueiam CRM/Personal online: provedor real de preços, disponibilidade Overpass, CI real para relatório positivo, entrada email/formulário/WhatsApp autorizada, stdout e testes físicos. Pendências que impedem aprovar a **nova versão**: publicação HML do delta e inspeção visual do DELETE/PWA; autorização e aplicação do patch remoto antes de ligar cron. Pronto para revisão/publicação controlada; não declarar produção integralmente validada nem automações já ativas.

## Pacote único de autorização pendente

- **A — n8n HML inativo:** aplicar somente o campo do patch revisável, pelo plugin que substitui o array de 62 nós, com leitura fresca/snapshot/comparação total e preservação de todo o resto. Manter dez destinos/credenciais HML e inativo.
- **B — publicação coordenada:** controlar temporariamente os gatilhos remotos de produção; o usuário faz commit/push manual na main; publicar HML, validar o delta, e publicar backend/frontend Production somente no mesmo SHA aprovado. Permitir somente os merges HML necessários de FRONTEND_URL e os deploys previstos; sem nova migration/custo/proteção enfraquecida.
- **C — lançamento de automações:** após B aprovado, aplicar os quatro campos exclusivos e as duas credenciais propostas; alterar os dez destinos do mesmo workflow para produção; configurar uma entrega GitHub/HMAC e produtores autorizados; ativar o único workflow com preços automáticos desligados, observar primeira janela e usar rollback de aplicação/configuração se necessário. A ativação produz avisos legítimos/revisões da conta indicada, sem pagamento/conclusão automática de marcos.

É possível aprovar A/B e manter C pendente. Nenhuma dessas operações foi executada nesta rodada. Testes físicos continuam exigindo interação do titular dos aparelhos.

## Ferramentas e procedimentos utilizados

Plugins Cloudfy/n8n, Neon, Render e Vercel para inspeção dos ambientes; Segundo Cérebro para continuidade. Computer Use foi tentado e não inicializou. Skills pertinentes consultadas: using-superpowers, brainstorming, writing-plans, dispatching-parallel-agents, systematic-debugging, test-driven-development, verification-before-completion, frontend-design e frontend-design-premium, neon/neon-postgres, deployments-cicd, render-monitor e computer-use. Quatro frentes independentes mantiveram propriedade separada dos arquivos e exclusividade de escrita HML durante o ensaio DELETE. Nenhum recurso pago ou serviço novo foi criado.
