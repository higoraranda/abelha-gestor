# Checklist de ativação — Abelha CRM + Personal

Atualização12/11: **backend de homologação live no Render Free**, Neon habilitado em0,25CU e12 verificações remotas sintéticas aprovadas. Produção preservada e workflow n8n desativado. Configuração real, variáveis e limites em [RENDER-HOMOLOGACAO.md](RENDER-HOMOLOGACAO.md). Próximo passo é BACKEND_URL somente no Vercel Preview; nada foi alterado no frontend publicado nesta etapa.

Estado em12/11: **ensaios locais/Neon aprovados, integrações externas ainda não ativadas**. Render/Vercel já publicaram a base2485697; migration Personal de produção continua pendente. Resultado, matriz de credenciais e passos manuais exatos em [HOMOLOGACAO-INTEGRACAO.md](HOMOLOGACAO-INTEGRACAO.md). Este checklist não autoriza executar mudanças automaticamente.

Ação A posteriormente autorizada/concluída: banco vazio separado abelha_homologacao,35 tabelas/18 Personal, role restrita sem acesso ao neondb e identidade sintética. Na etapa seguinte, a disponibilidade do compute e o serviço Render Free foram autorizados e configurados. Alterações locais continuam sem commit/push nesta etapa. Próximo passo: [conectar Vercel Preview](RENDER-HOMOLOGACAO.md).

Atualização de 12/11: os sete workflows já foram criados **desativados** na Cloudfy/socialbaboon. Não importar de novo. [CLOUDFY-N8N.md](CLOUDFY-N8N.md) contém IDs, nós, credenciais, URLs e passos de teste.

Consolidação posterior concluída: administrar somente **🐝 ABELHA — AUTOMAÇÕES / n20DNyb13Aaw3nq5**, também desativado. Os sete anteriores são backups. Procedimento atual: [WORKFLOW-UNICO-N8N.md](WORKFLOW-UNICO-N8N.md).

## 1. Escolher e autorizar o ambiente

- [ ] Revisar `AUDITORIA-ATIVACAO.md`, os relatórios de dependências e o diff local. Conservar os lockfiles revisados.
- [ ] Confirmar Node 22.12+ e URLs distintas de teste/produção. O proxy da prévia deve apontar para o backend de teste; nunca deixar `BACKEND_URL` cair no endereço de produção durante testes de gravação.
- [x] Neon e Render de homologação autorizados: banco isolado provisionado, compute existente habilitado em0,25CU Free e backend live. Recursos mantidos para a homologação solicitada; nenhum upgrade autorizado.
- [ ] Confirmar backup/ponto de restauração do ambiente que receberá a migration e procedimento de recuperação. Conservar o schema e as contagens/fingerprints dos registros comerciais antes da alteração.
- [ ] Confirmar qual `organization_id` e qual `users.id` existente pertencem à mesma conta. A integração recebe esses IDs no servidor; nunca do payload externo.

## 2. Migration — ensaio antes de produção

Arquivo único: `backend/src/db/migrations/20261111_personal_platform.sql`. Não executar schema.sql, reset ou seed. Ensaio sintético Neon aprovado; migration nova continua pendente **na produção**. Revalidar pré-condições no ambiente que receberá a ativação.

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
- [ ] Abrir **somente n20DNyb13Aaw3nq5** e confirmar versão n8n em Help/About. Não trocar `N8N_ENCRYPTION_KEY`. Conferir os dez nós backend pelo manifesto de homologação; host publicado já contém a rota nova, respondendo503 sem integração. Não testar gravações nele. Backend HTTPS de homologação disponível e autenticado; configurar os dez destinos do workflow antes de qualquer execução de teste.
- [ ] Criar **Abelha — Backend** (Header Auth: `Authorization`, valor `Bearer <ABELHA_INTEGRATION_TOKEN>`) e selecioná-la somente nos nós backend listados no guia. Criar **Abelha — Entrada Webhook** com `X-Abelha-Webhook-Token` e segredo distinto nos três webhooks protegidos. Não colocar segredo em formulário público, JSON exportado, URL ou logs.
- [ ] Manter o único relógio do consolidado a cada15min, America/Sao_Paulo; ele roteia tick/preços e o backend verifica o que está devido. Configurar horários no Personal. Não ativar nenhum backup. Testes manuais escolhem uma operation por vez.
- [ ] Conferir saída ok:false e configurar/verificar CODE_ENABLE_STDOUT=true no host n8n para logs genéricos, sem payloads/secrets. Falhas tratadas não devem ser interpretadas como aprovação de todos os blocos pelo status global concluído.
- [ ] O tick implementa lembretes, contas, revisão e envio push. Horários no fim do dia têm tolerância de 30 minutos para o tick após a virada. Interrupções prolongadas ainda exigem revisar avisos/revisões manualmente; não há promessa de recuperação irrestrita de agendamentos perdidos.
- [ ] Para busca, conectar entrada real `niche,city,limit` ao webhook protegido; a fonte pública pode estar indisponível. Respeitar um minuto entre consultas e atribuição OpenStreetMap. O staging novo mantém revisão antes de cadastro.
- [ ] Para captura, conectar email/formulário autorizado ao webhook com `event_id/message_id` estável. Extração e classificação por regras já estão implementadas; nenhum LLM foi conectado ou cobrado.
- [ ] Para projetos, conectar produtor real de `project_id` UUID e `report` v1; configurar o webhook GitHub e seu secret. Usar relay binário n8n **ou** backend direto, sem duplicar o caminho. Não reserializar o corpo assinado.
- [ ] Para preços, escolher API/feed autorizado; preencher `PROVIDER_URL`/`PRODUCT_HOSTS`, credencial própria e allowlist backend. Mapear formato nativo se diferente do contrato, respeitando frequência, 429 e custos. Pipeline HTTP/validação/POST já preparado; sem fonte não há cotações.
- [ ] Manter retenção de sucesso/erro desativada e `saveManualExecutions=false` nos modelos. Conferir também retenção da instância e uso de logs antes de inserir dados pessoais. Falhas devem ser acompanhadas por metadados sem expor payloads/segredos.
- [ ] Executar primeiro em homologação com dados sintéticos, usando Test URL/Listen for test event; comparar reenvios e isolamento antes da conta real. As definições foram criadas remotamente; nenhuma execução/ativação remota foi feita.

## 7. Push em dispositivos reais

- [ ] Com VAPID e tick configurados, clicar **Ativar neste dispositivo** em cada aparelho; não solicitar permissão automaticamente.
- [ ] Fechar o app e testar entrega, clique na tela de fatura, leitura/descarte e logout. Avisos na tela bloqueada devem continuar genéricos.
- [ ] Testar dois aparelhos: falha/expiração de um não pode bloquear o outro. O contador `sent` representa aceitação pelo provedor por dispositivo, não prova de exibição ao usuário.
- [ ] Ao rotacionar VAPID, planejar a transição: aparelhos antigos precisam reabrir e ativar novamente. A ação explícita compara a chave e substitui a inscrição antiga; não prometer entrega silenciosa com o par anterior removido.
- [ ] Conferir limitação conhecida: aceitação pelo provedor seguida de falha de commit pode ocasionar reentrega. Tags/tópicos estáveis reduzem duplicação visual, mas não garantem exactly-once distribuído.

## 8. Autorizações ainda necessárias

- [ ] Ambiente/compute isolado Neon, se precisar ser reativado/criado.
- [ ] Aplicação da migration revisada em produção, depois do ensaio autorizado.
- [ ] Configuração de variáveis/credenciais remotas, cadastro GitHub e ativação seletiva após testes. A criação dos workflows desativados já foi autorizada e concluída.
- [ ] Fonte de preços/classificador e qualquer custo associado.
- [ ] Publicação/deploy. Commit/push continuam fora desta autorização.

Após cada ensaio, encerrar prévias, sockets, browsers e workers temporários iniciados para a operação, preservando serviços do usuário. Nenhum serviço deve ser mantido ativo sem pedido explícito.
