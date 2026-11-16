# Checklist de ativação — Abelha CRM + Personal

**Concluído16/11 — release94ccaa0 em HML/Production, usuário confirmou ambos.** HML CRUD/exclusão/login/navegação aprovados e cleanup35/35; Production24 GETs e leitura autenticada aprovados. Render On Commit/Vercel Automatic restaurados e sem duplicar deploy. Migration/snapshot preservados, sem novo SQL de evolução. **Fase4 continua pendente de autorização:** n8n inativo/HML, credenciais Production não aplicadas e preços automáticos desligados. [Plano revisável](releases/n8n-production-transition-20261116.json), [resultado e limites](SPRINT-LANCAMENTO-20261116.md). Instalação/push físico e fontes opcionais ainda não certificados.

Execução autorizada16/11: **A verificada**, relógio remoto somente tick/preços desligados;62 nós/inativo/dez HML e demais campos preservados. **B com gatilhos pausados:** Render Off confirmado, Vercel exit0 aplicado após registrar original Automatic. Aguardar commit/push manual e SHA, HML/delta/cleanup e promoção somente se passar. Restaurar Render On Commit/Vercel Automatic ao concluir B. Fase4 sem autorização. [Roteiro vigente](SPRINT-LANCAMENTO-20261116.md).

Atualização final16/11 — [pacote único de lançamento](SPRINT-LANCAMENTO-20261116.md):55 testes backend/40 frontend, DELETE compilado local→Neon HML em15 requisições e cleanup35/35; correção PWA e preços opt-in locais. **Remoto n8n inalterado/inativo; gate de preços aguarda autorização antes de ativar.** Preparadas propostas de credenciais exclusivas fora do Git, ainda não aplicadas. Pausar auto-deploy de produção antes do push manual na main; validar o delta HML e publicar na sequência coordenada. Nenhuma migration nova. Push físico e inspeção visual da UI nova continuam pendentes.


Atualização16/11 — **testes reais n8n/HML aprovados**: oito callbacks completos200/503, captura/GitHub com replay, rejeições sem persistência, tick/accounts e revisão parcial/replay com SQL/fingerprints.62 nós, inativo, `operation=tick`; cleanups restauraram35 tabelas e removeram estado/processos temporários. Pendem Overpass positivo, CI real, preços, push/PWA e observabilidade/lotes. [Relatório vigente](VALIDACAO-FUNCIONAL-N8N-20261116.md). Não ativar automaticamente.

Atualização16/11 — **migration de produção aplicada e COMMIT confirmado**:35 tabelas,92 índices,17 tabelas CRM preservadas. Snapshot Free snap-silent-fog-acdvwgeu mantido sem expiração. Usuário confirmou leitura de Personal, Leads e Templates sem erro. Não repetir a migration. [Execução e evidências](EXECUCAO-MIGRATION-PERSONAL.md). Integrações opcionais e n8n não foram ativados.

Atualização13/11 — **workflow único conectado à HML e desativado**: dez destinos atualizados, duas credenciais HML configuradas; faltam ensaio no motor com listener, disponibilidade Overpass, evidência CI real para relatório positivo, fonte autorizada de preços e testes físicos/stdout. [Procedimento atual](N8N-HOMOLOGACAO.md). Nenhum deploy, migration ou alteração de produção nesta etapa.

Atualização13/11: **Preview READY com Dark Mode**, usando o commit existente da main, BACKEND_URL exclusiva de Preview e FRONTEND_URL HML atualizada. Nenhum commit, push, migration ou alteração de produção. Uso online e integrações sintéticas validados; instalação offline remota bloqueada pela proteção Vercel. Instruções atuais: [VERCEL-PREVIEW-HOMOLOGACAO.md](VERCEL-PREVIEW-HOMOLOGACAO.md). Os registros de12/11 abaixo são históricos; o workflow continua desativado.

Atualização12/11: **backend de homologação live no Render Free**, Neon habilitado em0,25CU e12 verificações remotas sintéticas aprovadas. Produção preservada e workflow n8n desativado. Configuração real, variáveis e limites em [RENDER-HOMOLOGACAO.md](RENDER-HOMOLOGACAO.md). Próximo passo é BACKEND_URL somente no Vercel Preview; nada foi alterado no frontend publicado nesta etapa.

Estado em12/11: **ensaios locais/Neon aprovados, integrações externas ainda não ativadas**. Render/Vercel já publicaram a base2485697; migration Personal de produção continua pendente. Resultado, matriz de credenciais e passos manuais exatos em [HOMOLOGACAO-INTEGRACAO.md](HOMOLOGACAO-INTEGRACAO.md). Este checklist não autoriza executar mudanças automaticamente.

Ação A posteriormente autorizada/concluída: banco vazio separado abelha_homologacao,35 tabelas/18 Personal, role restrita sem acesso ao neondb e identidade sintética. Na etapa seguinte, a disponibilidade do compute e o serviço Render Free foram autorizados e configurados. Alterações locais continuam sem commit/push nesta etapa. Próximo passo: [conectar Vercel Preview](RENDER-HOMOLOGACAO.md).

Atualização de 12/11: os sete workflows já foram criados **desativados** na Cloudfy/socialbaboon. Não importar de novo. [CLOUDFY-N8N.md](CLOUDFY-N8N.md) contém IDs, nós, credenciais, URLs e passos de teste.

Consolidação posterior concluída: administrar somente **🐝 ABELHA — AUTOMAÇÕES / n20DNyb13Aaw3nq5**, também desativado. Os sete anteriores são backups. Procedimento atual: [WORKFLOW-UNICO-N8N.md](WORKFLOW-UNICO-N8N.md).

## 1. Escolher e autorizar o ambiente

- [ ] Revisar `AUDITORIA-ATIVACAO.md`, os relatórios de dependências e o diff local. Conservar os lockfiles revisados.
- [ ] Confirmar Node 22.12+ e URLs distintas de teste/produção. O proxy da prévia deve apontar para o backend de teste; nunca deixar `BACKEND_URL` cair no endereço de produção durante testes de gravação.
- [x] Neon e Render de homologação autorizados: banco isolado provisionado, compute existente habilitado em0,25CU Free e backend live. Recursos mantidos para a homologação solicitada; nenhum upgrade autorizado.
- [x] Confirmar backup/ponto de restauração do ambiente que receberá a migration e procedimento de recuperação. Snapshot Free snap-silent-fog-acdvwgeu preservado; schema e contagens/fingerprints privados conservados. Restauração completa não executada.
- [ ] Confirmar qual `organization_id` e qual `users.id` existente pertencem à mesma conta. A integração recebe esses IDs no servidor; nunca do payload externo.

## 2. Migration — ensaio antes de produção

Arquivo único: `backend/src/db/migrations/20261111_personal_platform.sql`. Ensaio sintético Neon aprovado e migration **aplicada em produção em16/11/2026**, transação71684/committed. Não executar novamente, nem executar schema.sql, reset ou seed. Os passos de ensaio abaixo documentam o procedimento de referência.

- [ ] Conferir `SELECT current_database(), current_schema(), version();` e o endpoint/branch escolhido, usando conexão direta, sem `-pooler`.
- [ ] Conferir tipos `uuid` de organizations.id, users.id/organization_id e clients.id/organization_id; PKs/FKs existentes e definições dos índices `users_org_identity` / `clients_org_identity`.
- [ ] Não interpretar `IF NOT EXISTS` como prova de equivalência: se uma tabela ou índice novo já existir, comparar sua definição integral com o arquivo revisado antes de prosseguir.
- [ ] Conferir SHA-256 do arquivo contra o registrado no relatório de ativação. Não aplicar uma versão diferente usando uma aprovação antiga.
- [ ] Executar primeiro no ambiente isolado autorizado, **em uma transação**, com parada em erro, `lock_timeout=5s` e `statement_timeout=60s`. Exemplo para psql no diretório backend, depois de configurar uma conexão direta via PGSERVICE/variáveis locais: `psql --single-transaction --set=ON_ERROR_STOP=on --command="SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='60s';" --file=src/db/migrations/20261111_personal_platform.sql`. Não colocar senhas no comando ou no histórico.
- [ ] Confirmar 18 tabelas novas, constraints, índices e ausência de mudança nos registros comerciais. Reexecutar no ambiente isolado deve preservar os mesmos dados.
- [ ] Validar usuários de organizações distintas **e usuários distintos da mesma organização**: projetos, marcos, faturas, preços, notificações e entregas push não podem ser vinculados ao proprietário errado.
- [ ] Validar exclusão de cliente: captura conserva origem/organização com client_id nulo; rascunhos associados são removidos; não há bloqueio novo ao fluxo antigo de exclusão.
- [ ] Só após os resultados do ensaio, solicitar autorização específica para esta migration em produção. Não existe migration automática no startup. Se ocorrer falha, usar rollback da transação; não apagar tabelas ou dados para tentar novamente.

## 3. Variáveis do backend

Configurar no ambiente do servidor, sem `VITE_` e sem versionar `.env`. A presença local foi conferida sem expor valores; isso não comprova configuração do servidor publicado.

| Variável | Ação manual |
|---|---|
| `DATABASE_URL` | Manter conexão da aplicação com SSL obrigatório e organização existente. Separar rigorosamente teste/produção. |
| `DATABASE_URL_UNPOOLED` ou conexão direta no console | Somente para operação de migration autorizada; não é uma nova exigência do runtime. |
| `AUTH_SECRET` | **Preservar o segredo já usado em produção.** Tem de ser forte (32+ caracteres). Trocá-lo invalida sessões, apesar da compatibilidade da biblioteca corrigida. |
| `AUTH_URL` | Preservar a URL canônica de autenticação e conferir o proxy no ambiente autorizado; não mudar domínio/path como parte da atualização de segurança. |
| `FRONTEND_URL` | Origem HTTPS exata do frontend autorizado, sem paths. Não usar `*` com cookies. |
| `NODE_ENV` | `production` no servidor publicado. O acesso sem login fica restrito ao loopback de desenvolvimento. |
| `PORT` | Valor fornecido pelo host; backend de produção escuta no host apropriado. |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Gerar um par uma vez com `node scripts/generate-vapid.cjs`, no diretório backend. Guardar a chave privada em segredo do servidor; só a pública vai à API autenticada. Não gerar novamente a cada build. |
| `VAPID_SUBJECT` | `mailto:` de contato real ou URL HTTPS válida; não deixar o exemplo. |
| `ABELHA_INTEGRATION_TOKEN` | Token exclusivo e aleatório, 32+ caracteres. Não reutilizar AUTH_SECRET ou chave de WhatsApp. |
| `ABELHA_INTEGRATION_ORGANIZATION_ID` | UUID da organização existente autorizada. |
| `ABELHA_INTEGRATION_USER_ID` | UUID do usuário existente da mesma organização. |
| `GITHUB_WEBHOOK_SECRET` | Secret independente, aleatório e 32+ caracteres, idêntico no backend e webhook GitHub. |
| `PRICE_ALLOWED_HOSTS` | Hosts exatos de lojas/fontes autorizadas, separados por vírgulas; sem esquema/path. A allowlist não implementa nem ativa uma consulta. |
| `EVOLUTION_*` existentes | Preservar credenciais e comportamento. Não enviar mensagens reais para testar esta ativação. |

No `.env` local inspecionado, DATABASE_URL, AUTH_SECRET, AUTH_URL e FRONTEND_URL existem; AUTH_SECRET atende ao tamanho mínimo. VAPID, token/conta de integração, secret GitHub e allowlist de preços ainda não estão preenchidos. Nenhum valor foi alterado.

## 4. Frontend, proxy e PWA

- [ ] Definir `BACKEND_URL` no ambiente **servidor** da função proxy Vercel para o backend correto. Nunca colocar chaves privadas nessa variável ou em código frontend.
- [ ] Em desenvolvimento, `VITE_API_URL` pode apontar para o backend local. Produção usa o proxy no mesmo domínio; não publicar tokens em `VITE_*`.
- [ ] Depois de autorização de publicação, conferir HTTPS, manifesto, ícones, headers de sw.js, MIME de JS/CSS/imagens/fontes e respostas reais de assets; não aceitar HTML de fallback como bundle.
- [ ] Verificar instalação em Android/Chrome e iPhone/Safari pela Tela de Início. O navegador controla a oferta de instalação.
- [ ] Verificar modo offline, reconexão, atualização voluntária e ausência de APIs/auth/dados financeiros no Cache Storage. A PWA não enfileira gravações offline.
- [ ] Fazer login e logout no ambiente autorizado; conferir `HttpOnly`, `Secure`, `SameSite=Lax`, o nome do cookie e rejeição de pedidos sem sessão/CSRF. A sessão sintética emitida pelo Core 0.35.0 já passou na biblioteca corrigida, com mesmo secret/salt.

## 5. GitHub

- [ ] Cadastrar o repositório real no projeto sem inventar etapa ou progresso. Consultar documentação/estado real antes de importar status.
- [ ] Criar webhook em Settings → Webhooks, `application/json`, eventos `push`, `pull_request`, `workflow_run`, secret separado.
- [ ] Escolher a URL do relay binário n8n em CLOUDFY-N8N.md **ou** `https://SEU-BACKEND/api/v1/integrations/github` direto, sem cadastrar ambos. Não usar o proxy frontend, que pode reserializar o corpo e invalidar HMAC.
- [ ] Conferir `ping`, entrega assinada, repetição e assinatura inválida. Confirmar `matched_projects >= 1`; `recorded_updates=0` é normal num replay. Repositórios são comparados sem distinção de caixa.
- [ ] O endpoint aceita até 2 MiB de JSON; outras APIs conservam 100 KiB. Se o repositório produzir payloads maiores, rever limite/eventos antes de ativar, sem ampliar tudo indiscriminadamente.
- [ ] Configurar o produtor de relatórios Codex/GitHub Actions, quando desejado, com IDs de execução estáveis, SHA completo, URLs reais de testes e critérios. Não é necessário PAT para receber o webhook HMAC; consulta automática da API GitHub não foi implementada.
- [ ] Um evento ou relatório não conclui marcos. O usuário ainda precisa revisar as evidências.

## 6. n8n — ativar somente o que está pronto

- [x] Instância `socialbaboon` confirmada; fontes conferidas e consolidado criado/relido, com62 nós, sem subworkflows. Sete backups mantidos existentes/desativados. Inventário em `integrations/cloudfy-workflows.json`.
- [x] Dez destinos backend do consolidado usam exclusivamente HML, com conta/banco sintéticos. Código, URLs, credenciais e conexões conferidos; testes de gravação restritos à HML. Não importar modelos históricos sobre o remoto atual.
- [ ] Confirmar versão n8n em Help/About e auditar retenção/logs globais da instância. Não trocar `N8N_ENCRYPTION_KEY`.
- [x] **Abelha — Backend Homologação** e **Abelha — Entrada Homologação** configuradas e usadas nos testes reais. Nove saídas Header Auth e três entradas; GitHub conserva somente HMAC/binário. Não recriar essas credenciais nem expor valores. Produção exigirá credenciais exclusivas e autorização própria.
- [ ] Manter o único relógio do consolidado a cada15min, America/Sao_Paulo; ele roteia tick/preços e o backend verifica o que está devido. Configurar horários no Personal. Não ativar nenhum backup. Testes manuais escolhem uma operation por vez.
- [ ] Conferir saída ok:false e configurar/verificar CODE_ENABLE_STDOUT=true no host n8n para logs genéricos, sem payloads/secrets. Falhas tratadas não devem ser interpretadas como aprovação de todos os blocos pelo status global concluído.
- [ ] O tick implementa lembretes, contas, revisão e envio push. Horários no fim do dia têm tolerância de 30 minutos para o tick após a virada. Interrupções prolongadas ainda exigem revisar avisos/revisões manualmente; não há promessa de recuperação irrestrita de agendamentos perdidos.
- [ ] Para busca, conectar entrada real `niche,city,limit` ao webhook protegido; a fonte pública pode estar indisponível. Respeitar um minuto entre consultas e atribuição OpenStreetMap. O staging novo mantém revisão antes de cadastro.
- [ ] Para captura, conectar email/formulário autorizado ao webhook com `event_id/message_id` estável. Extração e classificação por regras já estão implementadas; nenhum LLM foi conectado ou cobrado.
- [ ] Para projetos, conectar produtor real de `project_id` UUID e `report` v1; configurar o webhook GitHub e seu secret. Usar relay binário n8n **ou** backend direto, sem duplicar o caminho. Não reserializar o corpo assinado.
- [ ] Para preços, escolher API/feed autorizado; preencher `PROVIDER_URL`/`PRODUCT_HOSTS`, credencial própria e allowlist backend. Mapear formato nativo se diferente do contrato, respeitando frequência, 429 e custos. Pipeline HTTP/validação/POST já preparado; sem fonte não há cotações.
- [ ] Manter retenção de sucesso/erro desativada e `saveManualExecutions=false` nos modelos. Conferir também retenção da instância e uso de logs antes de inserir dados pessoais. Falhas devem ser acompanhadas por metadados sem expor payloads/segredos.
- [x] Executar em HML com dados sintéticos e Test URLs: oito callbacks completos via responders, deduplicação, GitHub/HMAC, erros, tick/accounts e revisão parcial/replay aprovados. Limpeza35/35 e seletor tick restaurado. Nenhuma ativação.
- [ ] Concluir busca positiva/Overpass, CI real para relatório positivo, fonte de preços, push/PWA e contagem de retries/falhas parciais de lotes no motor. Fonte/cron/conta de produção só após plano e autorização específicos.

## 7. Push em dispositivos reais

- [ ] Com VAPID e tick configurados, clicar **Ativar neste dispositivo** em cada aparelho; não solicitar permissão automaticamente.
- [ ] Fechar o app e testar entrega, clique na tela de fatura, leitura/descarte e logout. Avisos na tela bloqueada devem continuar genéricos.
- [ ] Testar dois aparelhos: falha/expiração de um não pode bloquear o outro. O contador `sent` representa aceitação pelo provedor por dispositivo, não prova de exibição ao usuário.
- [ ] Ao rotacionar VAPID, planejar a transição: aparelhos antigos precisam reabrir e ativar novamente. A ação explícita compara a chave e substitui a inscrição antiga; não prometer entrega silenciosa com o par anterior removido.
- [ ] Conferir limitação conhecida: aceitação pelo provedor seguida de falha de commit pode ocasionar reentrega. Tags/tópicos estáveis reduzem duplicação visual, mas não garantem exactly-once distribuído.

## 8. Autorizações ainda necessárias

- [ ] Ambiente/compute isolado Neon, se precisar ser reativado/criado.
- [x] Aplicação da migration revisada em produção, depois do ensaio autorizado:16/11/2026, transação71684/committed,35 tabelas e92 índices.
- [ ] Configuração de variáveis/credenciais remotas, cadastro GitHub e ativação seletiva após testes. A criação dos workflows desativados já foi autorizada e concluída.
- [ ] Fonte de preços/classificador e qualquer custo associado.
- [ ] Publicação/deploy. Commit/push continuam fora desta autorização.

Após cada ensaio, encerrar prévias, sockets, browsers e workers temporários iniciados para a operação, preservando serviços do usuário. Nenhum serviço deve ser mantido ativo sem pedido explícito.
