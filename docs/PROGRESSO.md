# Progresso — Abelha CRM + Personal

## Estabilização prioritária — 14/11/2026

**Produção ainda incompatível com o Personal: faltam 18 tabelas.** Diagnóstico, matriz de 17 telas e alternativas seguras: [DIAGNOSTICO-ESTABILIZACAO.md](DIAGNOSTICO-ESTABILIZACAO.md). Testes n8n e novas funcionalidades suspensos.

- Neon produção:17 tabelas CRM; HML:35, com SELECT permitido à role própria. As sete áreas Personal, candidatos de leads e rascunhos de templates mostram a mensagem de atualização de banco pendente. As outras oito áreas CRM abriram sem alertas, apenas em leitura.
- Vercel produção/Preview40c179c; Render produção4f78117/HML40c179c. O diff backend entre esses commits é vazio; republicar somente a API não resolve a ausência de schema. Nenhum aviso Auth.js foi tratado como causa principal sem evidência.
- Corrigido localmente getSession(): sessão anônima200/null passa a retornar null, evitando TypeError e a tela incorreta de reconexão. Quatro regressões novas, com reprodução vermelho/verde; correção ainda não publicada.
-53 testes backend e20 frontend, TypeScript, lint e builds aprovados.40 requisições HML aprovadas, incluindo25 rotas de leitura200, login/CSRF/cookies, CORS, rejeições401/403, preços sem configuração503 e logout.35 contagens/fingerprints e estado privado de listener preservados.
- Build local contra HML confirmou sessão anônima→login no navegador. Usuário decidiu fazer a entrada sintética depois; navegação autenticada corrigida permanece pendente. Preview atual conserva o código anterior e precisa de publicação autorizada para validar a correção.
- Overpass: um diagnóstico /api/status respondeu406; não comprova a causa do503 anterior. Sem buscas repetidas/importação real. Fonte de preços, WhatsApp, push físico e offline no Preview protegido continuam pendências próprias.
- Main40c179c e todas as alterações anteriores, README e imagens preservados. Sem commit, push, deploy, migration, mudanças de produção, credenciais ou n8n. Publicação/migration coordenada ou rollback previamente ensaiado exigem autorização específica. Servidor e aba locais encerrados; PIDs13704/1956 ausentes e porta43651 livre. Recursos persistentes HML mantidos.

## Tentativa de ensaio no motor n8n — 13/11/2026

**Prepare e cleanup aprovados; nenhum teste do motor executado.** O helper existente confirmou banco/role HML e baseline sintética, criou o projeto de apoio e o removeu ao terminar. Cleanup confirmou as35 contagens/fingerprints restauradas e removeu o estado privado.

- Chrome estava aberto no n8n, mas Computer Use interrompeu a sessão ao não conseguir determinar a URL atual no Windows com confiança suficiente para aplicar a política de segurança. Nenhum listener foi armado, nó executado ou operação manual disparada. Não houve tentativa de contornar esse bloqueio.
- Workflow relido antes do ensaio:62 nós, desativado, dez destinos HML e settings de retenção preservados. Credenciais/configurações não foram alteradas. Git e todas as mudanças anteriores foram mantidos; sem deploy, commit, push ou migration.
- Captura/deduplicação, busca, GitHub/HMAC, relatórios e tick/accounts/weekly-review continuam pendentes **no motor n8n**. Os resultados VM/HTTP/SQL anteriores não equivalem a esta validação.
- O503 anterior do Overpass não recebeu nova consulta/diagnóstico nesta tentativa. Relatório Codex positivo continua dependendo de uma evidência Actions real; não foi fabricada execução ou URL de CI.
- Ações manuais exatas e comandos existentes: [N8N-HOMOLOGACAO.md](N8N-HOMOLOGACAO.md), seção de ensaio manual. Executar prepare novamente, armar cada Test URL, executar os helpers e ramos manuais separadamente e encerrar com cleanup. Não ativar o workflow.

## Estado atual — workflow único conectado à HML — 13/11/2026

**n20DNyb13Aaw3nq5 configurado e testável em homologação, ainda desativado.** Procedimento e limites: [N8N-HOMOLOGACAO.md](N8N-HOMOLOGACAO.md); [relatório](audits/n8n-homologacao-20261113.json).

- Cloudfy/socialbaboon: dez destinos backend alterados para https://abelha-gestor-api-hml.onrender.com, com paths/expressões preservados. Credenciais Abelha — Backend Homologação (nove saídas) e Abelha — Entrada Homologação (três entradas) criadas com segredos HML privados. GitHub conserva binário/HMAC, sem Header Auth.
- Releitura integral:62 nós, posições/Sticky Notes, Code nodes, conexões, gatilhos e settings preservados; nenhum host de produção nos nós. Sete backups inativos com IDs/updatedAt inalterados. Snapshot anterior registrado, sem reimportação ou novo workflow.
-53 testes backend/build aprovados;10 grupos sobre a definição/Code nodes remotos em VM e10 grupos VM→HTTP Render HML→PostgreSQL HML passaram. Captura/staging/reenvios, avisos financeiros/contas, GitHub HMAC/replay, revisão e falhas verificados.35 contagens/fingerprints restaurados; conexões fechadas, sem servidores/listeners temporários iniciados.
- Motor n8n ainda não executado: plugin não registra listener manual/inicia o ensaio. Helper local e passos exatos preparados. Overpass respondeu503 na única busca de cidade sintética; relatório Codex positivo remoto depende de evidência Actions real (consulta retornou0 execuções). Relatório sem evidências foi rejeitado400. Não foram inventadas URLs de CI ou cotações.
- Accounts continua alias do tick completo, com horários/deduplicação originais; não paga contas. Fonte de preços/allowlist/credencial, stdout e push físico continuam pendentes. Não ativar o relógio completo enquanto o ramo preços não estiver resolvido.
- Alterações prévias do Preview/Dark Mode e checkout main/40c179c preservados. Sem commit, push, merge, deploy, migration, upgrade, mudança de produção ou da proteção Vercel nesta etapa.

## Estado atual — Vercel Preview — 13/11/2026

**Preview READY com Dark Mode**, usando o commit já publicado da main/40c179c. URL, configuração, testes e limites: [VERCEL-PREVIEW-HOMOLOGACAO.md](VERCEL-PREVIEW-HOMOLOGACAO.md). Os estados de12/11 abaixo são históricos.

- Commits manuais somente na main, conforme preferência confirmada. Nenhuma branch criada/sincronizada, commit, push, merge ou PR nesta etapa; arquivos existentes preservados.
- BACKEND_URL exclusivamente em Preview. Somente FRONTEND_URL do Render HML foi atualizada, com redeploy manual Free. Frontend/backend usam40c179c; Neon mantém banco/role HML e limites0,25CU. Sem migration ou alteração de produção.
- Verificação local:53 backend,16 frontend, builds/TypeScript, lint,77 capturas e11 cenários funcionais aprovados.12 testes diretos HML passaram; CORS permite o novo Preview e recusa a origem de produção. Resultado remoto e limpeza: [evidência](audits/vercel-preview-20261113.json).
- Uso online do Preview validado. Instalação offline remota bloqueada pela autenticação Vercel: precache sem credenciais não recebe o shell público. Proteção mantida; offline/atualização passaram localmente. Instalação e push físico continuam pendentes.
- Cloudfy relido: workflow n20DNyb13Aaw3nq5,62 nós, inativo, sem credenciais referenciadas e dez destinos backend ainda na produção. Próximo passo é configurar HML; não ativar. Preços reais dependem de fonte autorizada.
- Preview fixado em SHA; futuros pushes da main continuam sujeitos aos gatilhos de produção existentes. Não há necessidade de novo commit para usar o Preview atual.

## Estado atual — homologação e integração — 12/11/2026

**Ensaios aprovados; produção ainda não liberada para Personal/automações.** Relatório e instruções exatas: [HOMOLOGACAO-INTEGRACAO.md](HOMOLOGACAO-INTEGRACAO.md); [evidência estruturada](audits/homologation-20261112.json).

- Base2485697 confirmada local/GitHub e já publicada pelo usuário em Render/Vercel. Diff anterior preservado. Rota nova preços agora503 sem integração;404 histórico superado. GET sem sessão Personal401; manifesto/sw/bundle corretos. Nenhum POST em produção, commit, push ou deploy nesta tarefa.
- Após autorização explícita, compute Neon de teste existente habilitado apenas temporariamente em0,25CU Free. Dois suites HTTP/SQL passaram no PostgreSQL18.6 com role exclusiva e dois schemas vazios sintéticos:18 tabelas, reexecução, isolamento por organização/usuário, contratos de automações e preservação. Migration também ensaiada duas vezes no catálogo do public da **branch isolada**, com rollback obrigatório; contagens/fingerprints inalterados. Produção consultada só em catálogo:18 tabelas ainda ausentes.
- Cleanup confirmado: zero schemas/roles temporários, arquivo privado removido, compute de teste **disabled=true/idle**, public com13 tabelas originais. A branch contém clone antigo, sem atualização CRM05/11; não usar seu public em testes de negócio ou tratá-lo como homologação pronta.
- Corrigido localmente o proxy Preview que caía em produção: exige backend HTTPS explícito e recusa host de produção, inclusive ponto DNS final. Runner Neon impede carregar .env/segredos herdados e valida endpoint/role/schema. Regressões vermelho/verde e revisão independente sem bloqueadores restantes.
- Verificação atual: **49 backend,16 frontend,2 suites Neon,11 cenários Chrome**; TypeScript/builds, ESLint sem warnings e npm audit0 nos dois projetos. Prévia PID12848 parada; portas43170/64354 livres e browser fechado.
- Consolidado Cloudfy relido com62 nós, URLs/conexões/settings inalterados e desativado; sete backups confirmados inativos. Nenhuma credencial Abelha existe. Dez nós backend ainda usam produção e não foram apontados para host fictício. Preparado [manifesto de homologação](integrations/homologacao-config.json) com URLs/nós e [modelo sem segredos](integrations/homologacao.env.example). Não criar outro workflow nem reimportar backups.
- Vercel: acesso à equipe aprovado; só VITE_API_URL em Production/Preview; BACKEND_URL ausente, sem preview publicado. Render: só serviço de produção, conector não lê nomes/valores de env; status não verificável foi distinguido de ausente. Faltam ambiente HTTPS persistente autorizado, conta sintética, token/headers, VAPID/GitHub, runtime n8n/stdout, fonte real de preços e push físico.

Nenhum novo recurso pago, workflow, deploy, migration de produção, commit ou push. Permissão temporária do ensaio não autoriza manter compute ligado ou ativar produção.

## Histórico — workflow único — 12/11/2026

**Criado diretamente na Cloudfy/socialbaboon:** [🐝 ABELHA — AUTOMAÇÕES](https://socialbaboon-n8n.cloudfy.live/workflow/n20DNyb13Aaw3nq5), ID **n20DNyb13Aaw3nq5**, desativado, com62 nós. Todos os sete blocos e tratamento de erros estão dentro do workflow; não há Execute Workflow/subworkflows. Guia atual: [WORKFLOW-UNICO-N8N.md](WORKFLOW-UNICO-N8N.md).

- Retomada sobre `main/2485697`, checkout limpo ao iniciar. Código e histórico existentes preservados; nenhum deploy, migration, commit, push ou PR.
- Sete fontes remotas conferidas por nós/conexões/settings e preservadas como backups **desativados**. Já estavam inativas; nenhuma exclusão ou interrupção de outro projeto. Releitura confirmou equivalência da definição consolidada e estado inativo.
- Um relógio compartilhado de15min em São Paulo roteia somente tick/preços. Contas e domingo continuam no tick original, sem chamadas redundantes; auxiliares manuais são escolhidos por operation. Quatro webhooks conservam paths, autenticação e binário/HMAC, sem passar pelo agendador ou acionar domínios alheios.
- Áreas visuais com Sticky Notes coloridas/prefixos: captura, busca, finanças, contas, preços, projetos, revisão e erros. Nomes/IDs únicos; endpoints, validações e referências de credenciais originais preservados.
- Regressões corrigidas antes de criar: busca parcial não responde200; log usa console.log e exige stdout do host; escritas em lotes finitos por item conservam retries, sem ciclos entre automações. Limites50 candidatos/20 observações, reset=false. Erros são redigidos e não cancelam o outro ramo do relógio. Status global pode ser concluído quando erro foi tratado: conferir ok:false/logs, conforme guia.
- Testes atuais: **47 backend**, incluindo8 contratos do consolidado e Code nodes unificados → HTTP/postgres.js/PGlite; **13 frontend**, TypeScript/builds e ESLint sem warnings. SQL comprovou frequência por produto (59/61min para intervalo60min). Revisão independente verificou correções. Runtime n8n remoto e entrega física não foram executados, por falta de credenciais/fontes; não declarar integração ativa.
- Pendências mantidas: credenciais de entrada/backend/provedor, URL/allowlists da API autorizada, configuração GitHub/VAPID, stdout/versão n8n, ambiente e publicação/migration autorizados, ensaios reais. O consolidado não foi ativado.
- Relatório estruturado: [n8n-unification-20261112.json](audits/n8n-unification-20261112.json). Gerador/JSON local não fazem operações remotas automaticamente. Testes fecharam seus servidores/sockets em finally; nenhum serviço temporário foi mantido ativo.

Sem nova infraestrutura ou serviço pago.

## Histórico — sete workflows Cloudfy/n8n — 12/11/2026

**Sete workflows criados diretamente na instância existente socialbaboon**, com autorização explícita, todos desativados e sem credenciais associadas. IDs/links/funções e passos manuais em [CLOUDFY-N8N.md](CLOUDFY-N8N.md); inventário persistente em [cloudfy-workflows.json](integrations/cloudfy-workflows.json). Não importar novamente.

- Os três workflows anteriores foram conferidos por ID e funcionalidade, inclusive metadados agregados de parâmetros; nenhum referencia Abelha. Seus estados e updatedAt foram preservados. Não houve leitura de execuções/pacientes ou valores secretos; nenhuma credencial de outro projeto foi reutilizada.
- Sete modelos completados: captura por webhook protegido com extração/classificação por regras; busca validada → Overpass no backend → candidato pendente; tick único agendado para finanças/contas/domingo/push; auxiliares contas/revisão manuais; monitor com HTTP de API autorizada configurável, validação e ingestão; relatórios Codex e relay GitHub com corpo binário/HMAC.
- Novo endpoint autenticado `/api/v1/integrations/leads/stage`, reutilizando validação da importação manual. Idempotência por origem/organização; sem criação automática de cliente/contrato/cobrança. Sem mudança adicional de migration. Desejos sem URL não bloqueiam monitores configurados; fonte sem configuração não consulta nem fabrica preços.
- Criação/releitura das definições no n8n comprovada: nós/conexões/settings conferidos, timezone America/Sao_Paulo, retenção privada desligada. Tipos compatíveis com os já usados na instância; versão exata não exposta pela API. Execução no runtime real ainda precisa de credenciais e ensaio manual.
- Consulta pública **somente leitura** ao backend: auth/session200, rota nova prices/due404. A versão publicada ainda não contém essas integrações; exige publicação autorizada. Nenhum POST ao backend real, migration Neon ou dado comercial alterado.
- Verificações: **39 testes backend**, incluindo Code nodes exportados → HTTP real → postgres.js/PGlite; **13 testes frontend**, TypeScript/builds, ESLint sem warnings; **11 cenários Chrome** desktop/mobile/PWA; npm audit atualizado com **zero alertas** nos dois lockfiles. Regressões vistas falhar antes e passar após os fixes; revisão independente encontrou resposta `[]` da API de preços sendo omitida pelo HTTP node, corrigida com fullResponse e validação de body.
- Migration revisada e repetida apenas no banco efêmero; SHA256 inalterado `9812B2BD74ACC1FB983318BAB62590DA6CF8E92A1536E85032FB8B604F84DCDB`. Login/CSRF/cookie/sessão legada, isolamento e push seguem cobertos. VAPID e entrega em aparelhos físicos continuam pendentes.
- Prévia sintética PID21312 encerrada com confirmação; portas43170/59133 verificadas livres, browser fechado e testes fechando sockets em finally. Nenhum serviço temporário ativo; os workflows criados são entregáveis persistentes **desativados**, não processos em execução.
- Restante: configurar ambiente e credenciais manualmente conforme guia; escolher fonte de preços/conector email, confirmar versão n8n, ensaiar runtime/push; autorizar ambiente isolado, migration de produção, publicação e ativação. Sem deploy, commit, push ou PR.

Não foi provisionado serviço ou custo novo.

## Histórico — preparação da ativação — 11/11/2026

Continuação feita sobre o checkout já alterado, preservando todo o trabalho anterior. Sem migration em produção, deploy, commit ou push. Relatório: [AUDITORIA-ATIVACAO.md](AUDITORIA-ATIVACAO.md). Próxima sequência manual: [CHECKLIST-ATIVACAO.md](CHECKLIST-ATIVACAO.md).

- Dependências: backend **9 → 0** (incluindo 3 críticas/2 altas); frontend adicional **21 → 0** entradas no npm audit. Auth.js Express 0.12.3/Core 0.41.3, Express 4.22.3, Vite 8.3.8 e Router 7.18.5; override minimatch restrito ao intervalo vulnerável das ferramentas, validado pelo lint. Sem `--force`.
- Corrigidos timeout frontend/Overpass (35s/25s), instalação de bundle com MIME errado na PWA, rotação VAPID, fila push por aparelho, contagem de endpoints expirados, horários próximos à virada e atualização de atividade via GitHub com repositório em caixa diferente. Webhook GitHub aceita até 2 MiB sem ampliar o limite das outras APIs.
- Migration revisada, sem necessidade de mudança estrutural; compatibilidade de catálogo PostgreSQL 18.6 conferida em leitura. Testes ampliados de preservação comercial e isolamento entre usuários da mesma organização. **18 tabelas novas continuam ausentes no Neon.** SHA e pré-condições no relatório.
- n8n: sete modelos desativados, sem dependência de variáveis pagas; URL editável, credencial Header Auth pendente, retenção manual desativada e UUID validado no project-sync. Na infraestrutura Cloudfy já selecionada, consulta somente leitura não encontrou workflow com `abelha` no nome. Fontes/classificador/adaptador de preços não são tratados como integração pronta.
- Verificação final: backend **33/33**, frontend **13/13**, TypeScript/build dos dois, ESLint sem warnings, **11/11 fluxos de navegador** desktop/mobile/offline e `git diff --check`. Login, CSRF, cookie seguro, logout e sessão sintética antiga passaram com Auth.js atualizado. Push físico e disponibilidade real Overpass não foram comprovados.
- Recursos temporários desta continuação: prévia PID20188 encerrada de forma controlada; portas **43170 e 57024 livres**, browser fechado. Nenhum serviço temporário mantido ativo; nenhum processo do usuário encerrado.
- Autorizações restantes: ambiente isolado Neon/compute, migration em produção, credenciais/webhooks/workflows remotos, provedores/custos e publicação. `.env` preservado; nenhum valor secreto exposto.

## Implementação inicial — 11/11/2026 (histórico anterior à revisão de ativação)

**Evolução implementada localmente, com ativação externa pendente.** Base limpa ao iniciar: `main`, HEAD `96a5441`. Sem commit, push, PR, deploy ou migration em produção. Não houve gravações de teste na carteira Neon. Arquivo destrutivo schema.sql e seed não foram executados. Alterações e histórico da reformulação anterior foram preservados.

Referências para retomada: [roadmap](ROADMAP-ABELHA.md), [arquitetura](ARQUITETURA-PERSONAL.md), [configuração](GUIA-CONFIGURACAO.md), [PWA](GUIA-PWA.md), [integrações n8n](INTEGRACOES-N8N.md), [plano](planos/2026-11-11-crm-personal.md), ../DESIGN.md e ../UX-CONTRACT.md.

### Resultado por fase

| Fase | Implementação e verificação local | Ativação / limites |
|---|---|---|
| 0 — Auditoria | Git, docs, migrations, React 19/Vite/TS, Express/Auth.js/postgres.js, navegação, fluxos comerciais e Neon em leitura conferidos. | Neon production tem CRM existente; tabelas Personal ausentes. Branch antiga de teste não foi reativada. |
| 1 — Base | Seletor CRM/Personal, URLs compatíveis, ações/avisos separados, manifesto, ícones, SW versionado, offline, atualização voluntária, inscrições push por usuário/dispositivo. | Instalação e entrega push em Android/iOS físicos não comprovadas. VAPID e ativação do banco pendentes. |
| 2 — Projetos | Cadastro, contexto, bloqueios, marcos/critérios, progresso derivado, decisões, histórico, relatórios v1 idempotentes e revisão humana. Webhook GitHub assinado registra eventos sem concluir etapas. | Links/SHA são validados por formato/repositório; comprovação é revisão humana. Nenhuma consulta da API GitHub ou projeto real importado. Secret/webhook real pendentes. |
| 3 — Leads/templates | Overpass por nicho/cidade, limites/atribuição, filtros, importação por origem e contato, captura pendente de revisão, oito templates, proposta e checklist editáveis/idempotentes. Sem contrato/cobrança/envio automático. | Consulta real Overpass limitada a um resultado expirou, sem persistência. Resultado real não comprovado; captura por email/IA precisa de fontes/credenciais. Templates acompanham a estrutura; contratação continua no fluxo existente. |
| 4 — Financeiro pessoal | Ciclos e leituras diárias (zero/negativas/iguais), evolução e comparação mensal, médias/projeção, renda/orçamento/metas/valor guardado, contas mensais/anuais, pagamento manual e histórico de preços informados. | Dados exclusivamente org/usuário, separados do financeiro comercial. Sem leitura bancária automática. |
| 5 — Preços | Cadastro/pausa, frequência, alvo, ingestão autenticada de observações reais, histórico por loja/link e avisos de queda/alvo idempotentes. | Sem API/provedor consultando lojas. Allowlist não é tratada como prova de conexão. Não há preços simulados nem scraping. |
| 6 — Automação | Tick por horário/fuso, contas/lembretes, revisão parcial/final de domingo, compromissos, alertas, entregas push por dispositivo e sete workflows n8n desativados. | JSONs conferidos; não importados/executados em n8n real. Classificador/IA e resumos gerados por IA não configurados. Agendamento e push externo não ativos. |

### Evidências executadas

- Backend: TypeScript estrito e **28 testes aprovados**. Inclui HTTP → rotas reais → **postgres.js real** → protocolo PostgreSQL/PGlite efêmero, além dos testes financeiros/CRM/acesso pessoal existentes. Nenhuma conexão à carteira nos testes; runner força DATABASE_URL fictícia.
- Frontend: TypeScript, ESLint sem warnings, build Vite e **9 testes aprovados** (datas, navegação e políticas do SW). Sem linter backend existente; o backend é conferido por TypeScript e testes.
- Browser Chrome headless, build real e banco sintético pelo driver real: **11 cenários aprovados**, desktop 1440px e celular 390×844, reduced motion e sem erros de JavaScript. Projetos/marcos/relatórios/revisão, webhook HMAC, faturas e metas, cancelar/confirmar pagamento, preço sem fonte, revisão semanal, rascunhos, erro de consulta, Escape, offline/reconexão, cache sem APIs e atualização voluntária preservando rascunho.
- Script reproduzível: `backend/scripts/preview-personal.cjs` (somente teste/loopback) e `frontend/scripts/verify-personal.cjs` com Playwright instalado. A prévia nunca importa app.ts, não usa a sessão/Neon reais e não deve ser implantada. Possui sessão sintética explícita.
- Migration `20261111_personal_platform.sql` repetida com sucesso no banco efêmero, preservando cliente sintético e rejeitando FK com proprietário de outra organização. Apenas esta migration nova está **pendente no Neon**.
- Revisão independente somente leitura encontrou problemas corrigidos: JSONB com dupla serialização, eventos GitHub interpretados como relatórios, cache com versões misturadas/instalação incompleta, parcial impedindo revisão final, push parcial entre aparelhos, nomes homônimos, perda de email, fila de capturas, exclusão de cliente com rascunho, vencimento 31 após fevereiro, timestamps de preço, critérios apresentados e gráfico mensal.
- Auditoria Premium executada: **0 proprietários não resolvidos** e 40 divergências estáticas (`noValidate`/textarea sem `resize:none`) documentadas no UX-CONTRACT. Mantida a validação nativa e redimensionamento vertical existentes; a auditoria estrita **não passou**, e não equivale aos testes de execução. Relatório: premium-audit.json.
- Auditoria de dependências: **9 avisos herdados, incluindo 3 críticos e 2 altos**, em dependency-audit.json. Não aplicado audit fix/upgrade principal Auth.js; avaliar antes de publicação. Não afirmar que a aplicação está liberada para produção.

### Decisões e limites de revisão

- Falha de rede ao verificar sessão mostra reconexão, sem liberar dados ou interpretar indisponibilidade como logout. Credenciais, cookies, middleware e regras de autenticação permanecem os mesmos. Saída revoga push no dispositivo quando disponível e preserva o fluxo de logout se a revogação falhar.
- Relatório é declaração pendente. Só uma ação autenticada do usuário, após conferência dos links/testes/critérios, conclui um marco. Não foi feito commit fictício para enviar um relatório desta execução.
- Push tem confirmação por aparelho e tags/tópicos estáveis. Falha de commit depois de um envio externo pode gerar reentrega; não prometer exactly-once. Entrega em aparelhos físicos permanece pendente.
- Revisão manual inicial é parcial. O tick de domingo atualiza/finaliza a semana uma vez, inclusive quando uma parcial já existe. Sem IA conectada, usa organização determinística de registros reais.
- Nomes iguais não bastam para mesclar prospects. Origem idempotente e telefone/email são usados para associação; informação pública ausente não equivale a inexistência.
- Menores adiados pela revisão: chamada Overpass admite 25s no backend, enquanto o cliente tem timeout de 20s; indisponibilidade real foi registrada. Totais de recorrências são dos até 200 registros retornados, limite que deve ser ampliado/paginado se a carteira crescer. Nenhuma integração externa foi marcada funcional sem teste real.

### Recursos temporários

Prévias sintéticas iniciadas nesta execução: PID1360/43170; PID8292/43170 + socket60183; PID3668/43170 + socket61009. A primeira foi encerrada por PID próprio identificado; as outras responderam `SYNTHETIC_PREVIEW_STOPPED`, fechando HTTP, driver e socket/PGlite. Browsers headless fecharam contextos e processos em `finally`. Testes fecham os servidores de porta aleatória e conexões. Conferência final de portas/PIDs registrada no encerramento abaixo.

Conferência final: PIDs1360/8292/3668 ausentes. Bind/close em loopback confirmou **43170, 60183 e 61009 livres**. A inspeção global via Get-NetTCPConnection não tem permissão nesta sandbox; a verificação usou abertura/fechamento controlados das próprias portas. Processos Node/Chrome do usuário não foram encerrados. Nenhum serviço temporário desta implementação foi mantido ativo.

Capturas sintéticas e browser-verification.json em `diretório local de capturas (fora do repositório)`. Não contêm dados reais da carteira.

### Próxima etapa concreta

Revisar a migration e os avisos de dependências; obter autorização específica para testar/ativar no ambiente Neon escolhido. Configurar VAPID, conta/token da integração, webhook GitHub e n8n. Escolher uma fonte autorizada de preços/classificação e testar os fluxos externos. Não fazer deploy/commit/push/PR sem autorização. Tudo que independe desses acessos foi implementado e verificado localmente; ativação externa não está concluída.

## Histórico — 05/11/2026

**Reformulação implementada, validada e ativada no banco production após autorização explícita.** Nenhum registro pessoal foi usado em testes de gravação.

Base: main / 68647ab. Sem commit, push, PR ou publicação. Alterações anteriores de acesso pessoal preservadas. `.env` e conexão atual não foram alterados.

Referências: briefing-aprovado.md, escopo-implementacao.md, ../DESIGN.md, BANCO-REFORMULACAO.md e planos/2026-11-05-reformulacao-abelha.md.

## Implementado

- Visual claro inspirado no Rapport, Urbanist, amarelo/abelha, cards arredondados, navegação superior e ações rápidas separadas; desktop/celular.
- Visão geral com indicadores reais, recebimentos e próximos passos, separados de previsão comercial.
- Entregas em quadro e checklist sobre o mesmo registro, com retorno à coluna anterior.
- Pipeline com várias oportunidades por cliente, detalhes, probabilidades automáticas, previsão ponderada, quadro/lista e contrato assistido transacional/idempotente.
- Prospect sem contrato, favoritos, notas datadas, próxima ação única e filtros por dados existentes.
- Financeiro preservado, filtros de cobranças, extrato imprimível, busca, relatórios, notificações internas e exportações CSV/JSON v1.
- Migrations incrementais revisáveis. Sem reset, seed de negócio, tarefas retroativas ou recálculo de histórico.

## Banco e autorizações

- Neon disponível; PostgreSQL 18.6. Projeto do Abelha identificado pelo endpoint existente: MELAO CRM, curly-river-94350351.
- Inicialmente existia só production. O usuário escolheu branch de teste existente e, após a inspeção, autorizou criar uma isolada.
- Criada ambiente de testes isolado, br-hidden-night-ace956m0, filha de production br-square-sunset-acpb91u2. Compute ep-crimson-snow-acmuhqgp limitado a 0,25 CU.
- Testes de gravação ocorreram somente em schemas sintéticos da branch isolada, todos removidos. Após autorização específica, a migration incremental foi aplicada em transação no public de production. O public da branch de teste permaneceu intacto.
- O item 3 do escopo foi atendido: autorizações separadas para branch de teste e migration em production, ambas recebidas antes das respectivas gravações.

## Verificações

- Backend: TypeScript e 15 testes puros aprovados (5 financeiros, 6 CRM e 4 acesso pessoal).
- Frontend: TypeScript, ESLint, build Vite e 3 testes de datas aprovados.
- Integração: 3 testes aprovados na branch isolada: API/migration/rollback e isolamento; conversões concorrentes/persistência; classificação de vencimento com sessão em outro fuso.
- Concorrência: 12 requisições simultâneas, 1 contrato, 2 cobranças totalizando R$ 1.000,00; nenhuma duplicação. Onze respostas reutilizaram o contrato.
- Navegador com aplicação/backend reais e dados sintéticos: arrastar card até concluir e verificar checkbox marcado; desmarcar e retornar à coluna anterior; concluir pelo checklist e consultar quadro; cadastro de tarefa e oportunidade; automático 90% de R$ 1.000,00 = R$ 900,00; contato sem contrato; notas/favoritos/próxima ação; busca e abertura da oportunidade ganha; avisos lidos/descartados persistentes após recarregar; downloads CSV/JSON e conferência dos arquivos; baixa/reabertura e relatórios; agenda preservando dia/mês após agendar fora do mês atual.
- Cancelar conversão: consulta confirmou etapa proposal e contagens de contrato/cobranças inalteradas. Confirmar depois: oportunidade ganha e contrato à vista de R$ 3.800,00 a partir de R$ 4.000,00, com vínculo correto.
- Relatório após baixa: R$ 3.800,00 recebidos, sem somar o valor comercial de R$ 4.000,00. Reabertura removeu o recebimento dos indicadores.
- JSON v1 baixado: 3 contatos sintéticos, 2 contratos, 3 cobranças e vínculos; prospect sem contrato; ausência dos campos de credenciais. CSV baixado com 3 contatos.
- Desktop e celular 390×844. Página não transborda horizontalmente; quadros/tabelas têm rolagem interna. Melhorada legibilidade e arredondamento dos componentes financeiros legados.
- Nenhuma conversa real aberta e nenhuma mensagem real enviada. Integração externa WhatsApp preservada no código, sem teste de envio externo.
- Revisão independente somente leitura, sem bloqueadores nas alterações revisadas. git diff --check aprovado. Impressão oferecida via navegador; sem geração/validação de PDF ou impressora física.

## Correções encontradas na validação

- O banco estava em dia UTC diferente do brasileiro: substituído CURRENT_DATE nas consultas financeiras/de clientes pelo dia de São Paulo. Teste de regressão falhou antes e passou após a correção. Nenhuma data/valor existente foi alterado.
- Datas de criação da carteira agora são exibidas no fuso brasileiro, preservando datas civis de contrato/cobrança.
- Salvar nota deixava o rascunho da próxima ação vazio. Formulários agora limpam somente seus próprios campos e permanecem montados durante refresh.
- Agenda mantém dia/mês ao atualizar. Busca abre negócios ganhos na lista. Retry de conversas limpa seleção inválida. Respostas abortadas não substituem resultados atuais.

## Recursos temporários encerrados

- Prévia anterior: PIDs19716/13948 e filhos4772/9916 encerrados na etapa anterior.
- Prévia isolada: sessão37459; backend16452 e filho9844; Vite23276 e filho21000; auxiliar20972. Encerrados pelo comando stop; estado e schema da prévia removidos.
- Testes de integração fecharam seus servidores de porta aleatória e conexões; schemas sintéticos ausentes na consulta final.
- Portas3000/4173 sem listener; PIDs citados ausentes. Downloads sintéticos abelha-registros.json e abelha-clients.csv removidos após verificar conteúdo. Aba de inspeção fechada e viewport restaurado.
- Compute da branch de teste desativado e idle. Branch preservada como referência da validação. Sem serviços temporários ativos.

Capturas em diretório local de capturas (fora do repositório) abelha-test-pipeline.png, abelha-test-checklist.png, abelha-test-entregas.png, abelha-test-mobile-entregas.png, abelha-test-overview.png e abelha-test-pipeline-ganho.png. Arquivos com prefixo abelha-test mostram somente dados sintéticos de teste; capturas anteriores abelha-reform-* mostram a prévia antes da migration.

## Encerramento do escopo

Migration autorizada e aplicada; schema e consultas reais conferidos em leitura. Não há pendência de ativação do banco. Não foi solicitado nem realizado commit/push/PR/deploy. A próxima utilização local deve iniciar os serviços normalmente; nenhuma prévia foi deixada ativa.

## Ativação autorizada — 2026-11-05T22:33:12.4544902-03:00
Usuário autorizou aplicar a migration em production. Transação concluída no Neon no projeto curly-river-94350351, branch br-square-sunset-acpb91u2, compute ep-wandering-pond-acitqqn8. SHA256 23465af517e20dc578f8fddfb05d5afb6ccc50c3a90ee68609131cc8f00d8e05. Verificação transacional de fingerprints preservou clientes/lembretes/contratos/cobranças/despesas; novos registros de negócio não foram criados. Pós-verificação: 4 tabelas, 2 colunas, 6 índices e zero schemas temporários. Smoke da aplicação real em conexão read-only: 14 consultas aprovadas. Prévia de leitura iniciada: backend21544/3000, Vite5800/4173, sessão50225; encerrar ao finalizar.

## Ativação final concluída

Migration 20261105_personal_crm aplicada em production com SHA-256 23465af517e20dc578f8fddfb05d5afb6ccc50c3a90ee68609131cc8f00d8e05. Fingerprints e contagens de clientes/lembretes/contratos/cobranças/despesas preservados na mesma transação. Pós-commit confirmou 4 tabelas, 2 colunas, 6 índices e zero schemas sintéticos. Novas tabelas de negócio ficaram sem registros fictícios.

Smoke real em conexão PostgreSQL restrita a leitura: 14 consultas HTTP aprovadas, incluindo exportações inspecionadas apenas em memória. Navegador: visão geral, clientes e novos módulos consultados sem erro; console limpo. Captura final abelha-ativado-desktop.png.

Prévia final encerrada: sessão50225; backend21544 e filho22428; Vite5800 e filho16540; auxiliar8256. Portas3000/4173 livres e aba fechada. Restrição read-only existiu apenas nas conexões temporárias, sem alterar banco global ou .env. Branch de teste segue com compute desativado/idle. Nenhum recurso temporário ativo desta execução.


## Homologação preparada — 12/11/2026

- Database abelha_homologacao, ID3074787, criado na branch de teste br-hidden-night-ace956m0 com35 tabelas,18 Personal e identidade sintética. Nenhum registro pessoal foi usado; neondb e produção preservados.
- Role abelha_hml_app com CRUD somente no database novo/public, sem CREATE/admin/BYPASSRLS/membership privilegiada; zero acesso CRUD às13 tabelas do neondb. Conexão, bcrypt e CRUD sintético com rollback validados.
- Conexão e segredos novos apenas em .abelha-homologacao/backend.env e credenciais-hml.json, ignorados pelo Git. backend/.env preservado. Sem registros de negócio no banco de teste.
- Compute de teste ep-crimson-snow-acmuhqgp em0,25CU Free, restaurado disabled=true/idle. Banco/role conservados para homologação, sem processos temporários ativos.
-53 testes backend,16 frontend, TypeScript/builds e lint aprovados. Relatório: [ATIVACAO-BRANCH-BANCO.md](ATIVACAO-BRANCH-BANCO.md).
- Alterações preparadas na main local para revisão e commit manual pelo usuário. Nenhum novo commit, push ou reescrita de histórico nesta etapa.
- Próximo: definir URLs e autorizar serviço Render Free separado/disponibilidade do compute. Publicação da main pode acionar os deploys de produção existentes e deve ser decidida manualmente.


## Backend de homologação ativo — Render Free — 12/11/2026

**Deploy live e12 verificações remotas aprovadas.** URL: https://abelha-gestor-api-hml.onrender.com. Relatório: [RENDER-HOMOLOGACAO.md](RENDER-HOMOLOGACAO.md); [evidência estruturada](audits/render-homologation-20261112.json).

- Serviço novo srv-dbr3if3tqb8s73cr2jn0, Free/Node/Oregon, Auto-Deploy desligado, branch codex/homologacao-abelha/37f9898. Deploy final dep-dbr3in49v7es73ekeq6g. Adaptação autorizada: build/start entram em backend com cd; saúde TCP do Render e GET /health200 verificado separadamente.
- Neon Free: compute existente ep-crimson-snow-acmuhqgp habilitado em0,25–0,25CU para manter o backend solicitado disponível. Apenas database abelha_homologacao/role abelha_hml_app. Schema existente reutilizado; nenhuma migration, nova branch/compute ou recurso pago.
-12 verificações: banco/role, health, rejeição anônima, login CSRF/sessão/cookie seguro,7 GETs Personal, CORS, guard de mutação, projeto HTTP→banco isolado, token inválido/correto/tick, captura idempotente, ping HMAC e logout, mais limpeza comparando35 contagens/fingerprints. Nenhum push real ou preço consultado; somente identidade sintética persistida.
- Configuradas12 variáveis de homologação, incluindo AUTH_URL real, FRONTEND_URL do Preview e VAPID próprio; segredos somente em ambiente do serviço/arquivos privados ignorados. PRICE_ALLOWED_HOSTS e EVOLUTION_* opcionais continuam pendentes.
- Produção srv-daldd0142hec73c3ltt0 manteve configuração e histórico de deploys, com4f78117 live observado antes/depois. Nenhuma mudança na Vercel ou ativação n8n; workflow único continua inativo/62 nós. Alterações locais de tema preservadas; nenhum commit/push/merge/PR.
- Logs sem erros inesperados; aviso informativo env-url-basepath-redundant da biblioteca Auth.js documentado, sem ocultação. Login/sessão aprovados. Próximo: definir BACKEND_URL somente em Vercel Preview e reimplantar apenas esse Preview quando autorizado; depois validar proxy/cookies/PWA.
- Testes encerraram conexões e descartaram cookies/fixtures. Nenhum servidor local temporário iniciado. Mantidos apenas o serviço e a disponibilidade do compute necessários à homologação solicitada.
