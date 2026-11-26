# Abelha | Roadmap multiusuário: entrega e gates

## Atualização Prompt03.3 — encerramento local26/11/2026

O proprietário revogou expressamente a autorização excepcional de commit/push: todas as alterações permanecem sem stage para revisão e commit manual. Sem publicação, mudança de fonte Render ou migration remota. [Verificação completa dos requisitos](ABELHA-REQUISITOS-033.md).

Implementado localmente: workflow comercial de propostas, histórico editável/versionado de prompts aprovados e gerador ampliado; snapshot e regras de preço preservados. Nova migration20261129 validada em PGlite e pendente de HML próprio, sem repetir as nove anteriores. Conversas ganhou busca nas conversas carregadas; página Templates sem uso removida, histórico/endpoints preservados. Integração de entrega persiste comprovante UUID idempotente em nota separada. Busca Lead ganhou fallback406ealias plural veterinárias; controles públicos reais ainda expiram, logo operação externa não foi certificada. Sem número WhatsApp, e-mail real ou trigger automático ativados.

Evidência:93testesbackend e50frontend, lint/build; dois testes dirigidos na retomada (sessão+migration legado), Chrome Calculadora/clipboard/histórico e Conversas390/1440passaram. JS principal267,60kB. [Matriz local atual](ABELHA-MATRIZ-ACESSO-033.md):126rotas,124negativas,66positivas,655asserções; HML03.1 é histórico e não certifica novas rotas/schema. Próximo passo: revisão/commit/push MANUAIS do proprietário, depois homologação remota do candidato e schema novo. Opcionais desligados não bloqueiam artificialmente lançamento; Prompt04 ainda inclui gates essenciais de HML/e-mail antes de publicação.

## Atualização Prompt 03.2 — 25/11/2026

[Relatório operacional](ABELHA-PREVIEW-OPERACIONAL-032.md): manifesto03.1 íntegro e HEAD030976f preservado. Render HML Node/main/auto-deploy off continua94ccaa0; ref remota da branch candidata ausente. Upload Vercel Preview é possível, mas entrega integrada do backend requer transporte autorizado; nenhum deploy realizado. Produção confirmada em leitura: Vercel34918f9/Renderb0442f9, divergência permanece. Catálogo confirma nove migrations novas ainda pendentes exclusivamente em produção, sem aplicação.

Quatro testes direcionados dos scripts de entrega/escopo/recibo/evidência passaram; não equivalem a automação real. Duas consultas externas Overpass de baixo volume terminaram504, sem importação; tratamento existente preservado. Remetente remoto/caixa autorizada, dois projetos sintéticos com gatilho real e transporte Render do candidato continuam BLOCKED. WhatsApp permanece sem teste real autorizado. Sem commit/push/branch nova/configuração/deploy/migration ou escrita em dados. **Prompt04 ainda não pode ser exclusivamente publicação.** Solicitação restante agrupada no relatório.

## Atualização Prompt 03.1 — 25/11/2026

Homologação funcional do candidato local conectado ao Neon HML: **PASS nos contratos/fluxos executados**, com limites explícitos em [relatório integrado](ABELHA-HOMOLOGACAO-INTEGRADA-031.md). Manifesto original íntegro no preflight; checkout já em `030976f`, branch existente preservada. Nenhuma migration repetida. Correção de edição parcial de contrato para datas `Date` do PostgreSQL, com regressão RED/GREEN e verificação HML.

Matriz: 123/123 rotas com positiva, 121 com negativa, 785 asserções e 23 verificações complementares por recurso; quatro positivas usam Overpass/Evolution simulados. Isolamento inclui titulares na mesma organização e filtros por usuário, sem equiparar 403 de papel a isolamento. Chrome integrado em 1440/390 px: cadastro/OTP simulado/login/logout/reset, módulos/preferências, 15 URLs do proprietário, Kanban UI→SQL→reload, troca de conta e cache. PWA na raiz offline/reconexão e limitador SQL de dois pools aprovados; `/login` offline fora do caminho suportado foi corrigido no teste e repetido separadamente.

Regressão: 90 backend, 50 frontend, lint/build; nove grupos do carregador aprovados em execução isolada e divisão de rotas aprovada. JS principal preservado em 267,60 kB. Todas as 39 tabelas iguais ao baseline após limpeza das rodadas; processos/portas temporários encerrados. Sem commit, push, branch nova, deploy ou alteração em produção. Alterações sem stage para revisão manual.

**BLOCKED:** aceite do artefato remoto HTTPS/cold start, e-mail efetivamente entregue, operação real de provedores/integrações e instalação física PWA. Pendência histórica de SHAs produtivos Vercel `34918f9`/Render `b0442f9` preservada, sem assumir que ainda descrevem o remoto atual. Próximo passo: revisar candidato corrigido/manifesto e definir a próxima homologação remota autorizada; não avançar automaticamente para publicação ou ativação. As seções abaixo preservam os gates históricos do Prompt 03.

Base de trabalho: `higoraranda/abelha-gestor`, branch local `feature/phase-01-multi-tenant-foundation`, origem `34918f9`. Nenhum commit, push, deploy, migration remota, credencial, webhook externo ou vínculo de número nesta entrega. A migração pontual de login de 25/11 foi uma operação anterior, com autorização separada.

## Estado por fase

| Fase | Entrega verificável | Gate restante |
| --- | --- | --- |
| 1. Identidade e isolamento | Auth.js com credenciais e cookies HttpOnly; papéis avaliados no backend; filtros por organização e usuário nos recursos aplicáveis. Reforço no vínculo Conversa → Cliente e nas gravações WhatsApp; testes locais com contas distintas. | Homologar a versão integrada, fechar a matriz completa de recursos legados e preservar a base existente. Nenhuma autorização de produção presumida. |
| 2. Convites e administração | Em Personal → Preferências: gerar link individual, consultar convites recentes, revogar link pendente sem apagar a conta ou histórico. Cadastro continua fechado e usa a verificação de e-mail existente. | As colunas OTP e o remetente ainda precisam ser ativados/validados para convites reais. |
| 3. Permissões e onboarding | A conta proprietária controla os módulos Projetos e Calculadora dos membros vinculados a seus convites. Aplicação valida no servidor e a entrada do membro só apresenta módulos disponíveis. | Aplicar e validar a migration de permissões em HML antes de usar com amigos. Nenhum acesso do proprietário ao conteúdo privado concedido. |
| 4. Projetos no Personal | Kanban local com estados existentes (planejado, ativo, pausado e concluído), arraste ou seletor, contexto preservado; revisão dos marcos continua exigida. | Validar com dados protegidos em HML. Novos estados de negócio não foram inventados nem mapeados silenciosamente. |
| 5. MCP e Codex | Servidor stdio local `backend/scripts/abelha-project-mcp.cjs`; único comando de escrita, com token distinto e escopo de um projeto no servidor. Relatório entra como pendente de revisão. | Vincular ao projeto correto no Codex e configurar credencial dedicada em HML com autorização. Nenhuma configuração global ou conta externa alterada. |
| 6. Segundo Cérebro | Obsidian segue como fonte humana de contexto, com registro de progresso atualizado; `verify-delivery.cjs --obsidian` gera nota de evidência para o cofre sem vazar tokens. | Automatizar importação/escrita ou operar hooks em outro ambiente somente após validação da configuração. Exportação não é sincronização automática nem lê o cofre inteiro. |
| 7. GitHub, Vercel, Render | Reuso do receptor GitHub existente com assinatura; verificador somente leitura cruza repositório, referência de produção e SHA nas três fontes. Divergências não promovem o card. GitHub/Vercel confirmaram a base publicada; Render e ambiente de e-mail permanecem por validar. | Testar com permissões de leitura e alvos reais aprovados, registrar referência canônica e decidir a periodicidade. Nenhum webhook ou deploy configurado. |
| 8. Homologação e lançamento | Suíte local de testes, builds e cenários de navegação. Roteiro de ativação por etapas abaixo. | Homologação remota, segurança do ambiente de destino e lançamento multiusuário seguem bloqueados até aprovação e evidência. |

## Auditoria Fase 1: limites e classificação das entidades

- **Plataforma e identidade:** `organizations` é a fronteira da carteira; `users` é a identidade e seu papel. `account_invites` pertence ao emissor e só retorna metadados mínimos na listagem. Estado OTP, chave de recuperação e permissões não são enviados à interface como credenciais. Não houve cadastro aberto.
- **CRM por organização:** `companies`, `company_contacts`, `clients`, `conversations`, `messages`, `reminders`, `catalog_items`, `client_contracts`, `receivables`, `expenses`, `client_notes`, `delivery_tasks`, `opportunities`, `notification_states`, `crm_lead_candidates`, `crm_service_drafts`. Compartilhamento colaborativo não está habilitado. A navegação antiga de Templates sai do menu; os dados legados de rascunho não são excluídos.
- **Privadas por usuário e organização:** `personal_preferences`, `push_subscriptions`, `personal_notifications`, `personal_push_deliveries`, `personal_projects`, `personal_milestones`, `personal_project_updates`, `personal_invoice_cycles`, `personal_invoice_entries`, `personal_monthly_plans`, `personal_subscriptions`, `personal_subscription_payments`, `personal_subscription_changes`, `personal_price_watches`, `personal_price_observations`, `personal_weekly_reviews`. `quote_models` é privado de cada conta; propostas comerciais são restritas à carteira proprietária e guardam um snapshot do orçamento. `evolution_instances` é configuração privada de integração por organização, nunca retornada ao navegador.
- **Produção por leitura agregada (25/11):** 36 tabelas públicas, nenhuma com RLS; zero índices inválidos, constraints não validadas ou divergências de organização nos vínculos Conversa/Cliente e Mensagem/Conversa verificados. Ausentes `quote_models`, `users.email_verified_at` e `users.password_reset_version`. RLS não foi ativado nesta entrega. O isolamento atual é aplicado na API e testado com escopos distintos; não usar acesso direto ao banco como substituto e não presumir que constraints válidas provem autorização.
- **Sessões e cache:** a sessão assinada não confia em organização informada pelo cliente. Após reset efetivamente concluído, as sessões anteriores do titular são rejeitadas. O service worker não cacheia API ou payload privado. Identidade de exibição persistida localmente não autoriza chamadas. Auditoria limitada dos endpoints e vínculos legados: não equivale a pentest nem permite marcar a fase inteira PASS em produção.
- **Matriz e evidências locais:** Owner, dois membros e anônimo em HTTP com Auth.js e PGlite; acesso a funcionalidades exclusivas negado a membros, criação/listagem privada separadas, filtros de projeto na API, CRUD do proprietário, autorização de alterações e convites, recuperação e revogação de sessão em dados fictícios, preservação do proprietário no teste de migration. A revogação do link de convite não revoga conta já criada. SQL de produção foi somente leitura.

## Busca Lead, propostas e WhatsApp

- Busca Lead: [documentação local](ABELHA-BUSCA-LEADS.md). A entrada do nicho aceita texto livre; fonte pública pode não ter dados de todos os nichos. Provedor externo expirou na tentativa limitada feita durante a tarefa; checkout validado com fixtures, não declarar a busca publicada corrigida de ponta a ponta.
- Calculadora: [fluxo de propostas](ABELHA-CALCULADORA-DE-VALORES.md). Salva orçamento e briefing, permite aprovação explícita e gera prompt copiável só depois. Não envia mensagens ou executa o Codex.
- Conversas: complementa a Evolution existente com leitura do estado e QR manual para a instância HTTPS cadastrada na própria carteira. Não permite escolher URL ou instância pelo navegador, não expõe chave, não reconecta automaticamente e não importa grupos ou históricos. Mensagem nova aparece por consulta periódica com a aba visível, pois o proxy publicado espera a resposta inteira e não oferece SSE confiável. A ingestão foi ajustada para funcionar com o índice de telefone não único encontrado no banco e manter deduplicação por organização. Produção tinha zero instâncias cadastradas na inspeção.
- Para uso recorrente em negócio, avaliar primeiro a [API oficial do WhatsApp Business da Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/overview). O QR reaproveita a modalidade de dispositivo vinculado da Evolution, não um iframe do WhatsApp Web ou a garantia oficial da Meta. Provar em HML com número de teste e consentimento; não usar o número de cliente nem reaproveitar instâncias de outros projetos.

## Operação de integrações sem publicação

1. **MCP em HML, opt-in:** registrar localmente `node backend/scripts/abelha-project-mcp.cjs` apenas no projeto existente confirmado, sem incluir segredo no Git. O processo recebe `ABELHA_CODEX_ORIGIN` (HTTPS) e `ABELHA_CODEX_REPORT_TOKEN`. O backend recebe o mesmo token, `ABELHA_CODEX_PROJECT_ID` e a identidade de integração existente. Esse token não deve ser o token n8n; rotacione ou remova para revogar. `ABELHA_CODEX_ALLOW_LOOPBACK=true` é exclusiva para a fixture local.
2. **Entrega:** enviar o relatório de acordo com [development-report.schema.json](integrations/development-report.schema.json). A aplicação guarda o relatório idempotentemente, retorna recibo e mantém marcos pendentes. Trechos de clientes, credenciais e informações pessoais não devem compor evidência de projeto. O clique/revisão do proprietário permanece separado de conclusão.
3. **Conferência:** com credenciais de leitura previstas para esse escopo, `node backend/scripts/verify-delivery.cjs dono/repo SHA prj_ID site.vercel.app srv-ID dep-ID --obsidian`. O programa usa somente GET nos provedores. Opcionalmente `VERCEL_TEAM_ID`; segredos esperados em `GITHUB_READ_TOKEN`, `VERCEL_READ_TOKEN` e `RENDER_READ_TOKEN`. O Markdown pode ser revisado e incorporado na nota existente. Não substitui a evidência de testes de negócio.
4. **Promoção futura:** primeiro homologar com base descartável e snapshot/PITR verificado. Inventariar o que já está aplicado; não repetir `20261125_account_invites.sql` em banco onde já existe. Em ordem de dependência, validar `quote_models`, `signup_email`, `password_reset`, `member_modules` e `quote_proposals` antes de liberar suas respectivas telas. Configurar remetente verificado, confirmar o e-mail de recuperação do proprietário, usar duas contas sintéticas para escopo e número de teste aprovado para Conversas.
5. **Rollback:** manter artefato e configuração anteriores; parar a promoção se schema e builds divergirem. Não executar `DROP`, seed, reset de base ou restauração automática. Mudanças aditivas com contas, propostas ou convites usados não devem ser revertidas por remoção de dados. Uma eventual restauração em produção exige decisão explícita e reconciliação das escritas feitas depois do ponto.



## Evidências desta entrega local

- Backend: 80 testes aprovados com `npm test` (compilação TypeScript, PGlite e HTTP, incluindo Auth.js, escopo do relatório Codex e servidor MCP stdio em loopback).
- Frontend: 49 testes aprovados, `npm run lint`, `tsc -b` e build Vite com `--configLoader runner`. Cenários sintéticos no Chrome em 390 e 1440 px para Busca Lead, orçamento, permissões/onboarding, Kanban e WhatsApp.
- `npm audit --audit-level=high` retornou zero avisos de vulnerabilidade no relatório dos dois projetos; não substitui validação do código ou da infraestrutura. Nenhum teste com credencial, conta, telefone ou cliente real.
- Vercel: alias de produção em 34918f9 durante a inspeção. Neon: só metadados e contagens, sem alteração. Render e entrega do remetente ainda não validados para esta entrega.
- Ferramentas: Git, PowerShell, node:test, Auth.js, PGlite, Playwright/Chrome, Obsidian e conectores de leitura Vercel/Neon. As validações independentes de Busca Lead, propostas/acesso e Kanban foram executadas em paralelo seletivo. Nenhuma alteração de configuração global.


---

# Prompt 02 | Consolidação, gates e promoção

A branch local permanece em feature/phase-01-multi-tenant-foundation, com HEAD 34918f9. As 61 alterações de partida foram preservadas em checkpoint ZIP local, com patch binário e manifesto dos arquivos rastreados e novos, conteúdo reaberto e comparado por SHA-256. Não usar restauração em cima do checkout sem comparar com alterações posteriores. Não houve stage nem commit: a preferência permanente de revisão/publicação manual foi preservada. A triagem de segredos conhecidos não encontrou material suspeito no conjunto preservado; arquivos ignorados, .env e credenciais não fizeram parte do ZIP.

## Gates A–L

| Gate | Status | Evidência e limite |
| --- | --- | --- |
| A. Segurança e isolamento | BLOCKED | Inventário estático em ABELHA-MATRIZ-DE-ACESSO.md e testes defensivos em HTTP/SQL. Guard comum também para mutações de CRM, clientes, catálogo, financeiro comercial, contratos e agenda; junção financeira agora verifica tenant nas duas pontas. Nem toda rota legada tem teste individual e não houve validação remota de isolamento. |
| B. Administração e contas | BLOCKED | Validade configurável, vínculo persistido ao resgate, estado da conta, datas disponíveis, desativação e reativação sem apagar dados; sessão antiga não revive. Convites/reset validados com código/e-mail sintético. Remetente e entrega real continuam por testar. |
| C. Módulos | BLOCKED | Projetos, Calculadora, Financeiro pessoal, Assinaturas e monitoramento de preços podem ser concedidos no servidor. Membro escolhe o que ocultar entre os autorizados. CRM comercial, Conversas, Busca Lead, Propostas, Revisão agregada, integrações e administração não foram expostos aos membros: exigem isolamento por módulo e autorização operacional própria. Nenhuma concessão visual libera rotas. |
| D. Projetos e Kanban | PASS local | Oito etapas explícitas, referência legada sem conversão arbitrária, pausa/bloqueio sem perder etapa, controle de versão e revisão para conclusão. Evidências e roteiro no detalhe. |
| E. MCP e Codex | PASS local para o contrato; BLOCKED para automação | Token dedicado independente e mapa de projetos autorizados; busca mínima, vinculação por ID/repositório, escopo de organização e titular, validação dentro da transação, recibo e replay idempotente. Nenhum hook ou MCP foi instalado no Codex nesta missão. |
| F. Segundo Cérebro | PASS local, opt-in | Recibo Markdown avaliado em diretório descartável; criação exclusiva e reuso do mesmo recibo, sem sobrescrever nota existente. Status do projeto atualizado seletivamente. Sincronização em segundo plano não está ativa. |
| G. Busca Lead | BLOCKED | AbortController cancela a interface e aborta a consulta do backend em desconexão observada (o proxy publicado pode intermediar a conexão). Fixtures distinguem cancelamento, vazio, erro e failover. Status/consulta pública não provaram a execução real com o provedor configurado; referência: [endpoint primário](https://overpass-api.de/api/status). |
| H. Propostas | PASS local | Condições comerciais fazem parte do snapshot; aceite e recusa são decisões mutuamente exclusivas e sem sobrescrita. Prompt só para aprovação; cálculos e texto salvos não mudam com a tabela de preços. A remoção da aba Templates não apagou dados. |
| I. WhatsApp | BLOCKED | Origem HTTPS cadastrada e explicitamente autorizada, sem redirect; rejeita IP e respostas excessivas, segredos não são retornados, persistência isolada e deduplicação testadas. Fixture valida QR, conexão e envio. Zero instâncias até a leitura; falta número/instância de teste com autorização. |
| J. GitHub, Vercel, Render | BLOCKED | Verificador só faz GET e confere também a branch quando informada. Vercel em produção reportou main/34918f9cf66d50f9d8df70627d57335092919874, READY; isso não aprova o candidato local. Sem corroborar Render e funcionalidade remotamente nesta missão. |
| K. Migrations | PASS local; BLOCKED remoto | Cadeia aplicada do zero em PGlite abelha_homologacao, com proprietário, cliente e projeto legados preservados, constraints e índices válidos. Neon HML e produção, somente leitura, têm 36 tabelas e account_invites; ainda não têm as estruturas de cotação e OTP/reset verificadas. |
| L. Homologação integrada | BLOCKED lançamento | Suites e cenários locais com fixtures, sem HML remota, entrega real de e-mail ou aceite de lançamento. |

**RLS:** não habilitado por esta entrega. Auth.js usa aplicação/pool com credencial única, não papéis Postgres por convidado. RLS futuro precisa de role de runtime sem privilégios de dono/BYPASSRLS e contexto de escopo transacional (SET LOCAL, nunca variável de sessão que sobrevive ao pool), com teste real de conexões reutilizadas e automações. Para o candidato, manter guardas de API e proibir acesso direto privilegiado como atalho; o inventário separa classificação estática de evidência individual. O rate limit de login é local ao processo, não um limite distribuído; valide pressão operacional e estratégia para múltiplas réplicas no ambiente de destino.

## Integrações: comandos e critérios

- **MCP:** no backend de teste, preserve a identidade da integração, configure ABELHA_CODEX_REPORT_TOKEN distinto do n8n e ABELHA_CODEX_PROJECTS_JSON como lista de pares {"id":"UUID do projeto","repository":"https://github.com/dono/repo"}. Não guarde token no Git. O servidor lê o vínculo real no banco; mudanças de repositório, falta de vínculo ou ambiguidade não autorizam gravação. O fallback antigo ABELHA_CODEX_PROJECT_ID permanece apenas para compatibilidade. Rotacionar/remover o token dedicado revoga a credencial. Valide com dois projetos sintéticos, referência correta e capacidade de rejeitar destino incompatível. Nenhum relatório confirma deploy nem conclui marco sozinho.
- **Codex:** depois de autorizar a habilitação e confirmar o projeto, configure o servidor stdio abelha_projects com comando node, argumento backend/scripts/abelha-project-mcp.cjs (caminho absoluto), repassando ABELHA_CODEX_ORIGIN e ABELHA_CODEX_REPORT_TOKEN via env_vars, sem escrever valores no TOML. Use configuração local ao projeto confiável e teste primeiro abelha_listar_projetos_autorizados. O evento Stop documentado é fim de turno, não confirmação de etapa. Não vincule um envio a Stop antes de existir recibo estruturado e verificável. A abertura do projeto e o hook ativo não foram comprovados neste ambiente. [Hooks oficiais](https://learn.chatgpt.com/docs/hooks).
- **Obsidian:** node backend/scripts/obsidian-task-receipt.cjs recibo.json faz prévia; com um segundo argumento, uma pasta existente explicitamente escolhida, grava uma nota nova ou reusa cópia idêntica. Use task_id, project, stage, date (AAAA-MM-DD), result, commit opcional, tests, blockers, next_step e reference técnica HTTPS. Não inclua informações privadas ou credenciais. Antes de ligar a um hook, ensaie em um cofre descartável; a saída --obsidian do verificador de deploy é outro recibo, não sincronização.
- **Deploys:** defina ABELHA_EXPECTED_BRANCH para tornar o confronto da branch obrigatório em verify-delivery.cjs (além do mesmo SHA e repositório). Use credenciais só de leitura e os IDs de HML/produção corretos. Compare o recibo com o teste funcional; READY/live só confirma estado de infraestrutura.
- **WhatsApp:** permitir somente a origem exata do provedor controlado (EVOLUTION_ALLOWED_ORIGINS, HTTPS padrão, sem curingas), confirmar DNS/TLS e isolamento de rede no ambiente; uma origem confiável não substitui política de saída para IPs privados. Configurar instância/segredo do próprio Abelha somente em HML previamente autorizada. Testar QR, conexão, recebimento, envio e desconexão com número de teste. A modalidade QR da Evolution não é WhatsApp Web oficial e pode sofrer quebras de sessão ou protocolo. Para operação comercial, compare com a [API oficial da Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/overview).

## Autorizações pendentes e critérios de prontidão

| Ação | Risco e pré-requisito | Procedimento e confirmação |
| --- | --- | --- |
| Homologação integrada remota | Conexão equivocada afetaria produção; confirmar projeto, branch HML, banco, role e recuperação. | Aprovar o destino HML já conhecido e a lista exata de migrations ausentes. Guardar ponto de restauração e comparar integridade antes/depois. Não repetir account_invites. Confirmar 20261125 quote_models/signup_email/password_reset, 20261126 member_modules/quote_proposals e 20261127 managed_accounts/project_pipeline/quote_proposal_decisions na ordem de dependência. Validar testes protegidos no candidato. |
| Convites e redefinição | Entrega e domínio; nenhum destinatário real autorizado. | Validar existência do remetente no painel e enviar somente para uma caixa de teste aprovada. Validar recebimento, repetição, invalidação e login. Não copiar segredos. |
| Integrações e WhatsApp | Credenciais, destino de escrita e vinculação a canal. | Aprovar token restrito HML, projetos e cofre de teste; confirmar Render com leitura; autorizar instância e número de teste separadamente. Verificar recibo, ausência de efeitos em outros projetos e zero promoção automática. |
| Publicação | Possível incompatibilidade de schema e dados reais. | Somente após encerramento dos gates de segurança/HML, com validação de rollback, aprovação explícita e publicação manual do proprietário. Nunca reset nem DROP quando há dados reais. |

Funcionalidade: candidata local para os escopos testados. Segurança: evidência de grupos, não revisão completa por endpoint. Migrations: cadeia local comprovada, remota pendente. Infraestrutura: Vercel base publicado, falta Render/canal/entrega validados. Usuários reais: não liberar.


## Oito fases: ambiente e evidência atual

| Fase | Local | HML remota | Produção |
| --- | --- | --- | --- |
| 1. Isolamento | Guardas reforçados; testes de grupos, matriz estática de 121 rotas; aceite de segurança integral pendente. | Apenas inventário; sem executar o candidato. | Login previamente confirmado pelo proprietário; só inventário nesta missão. |
| 2. Convites e contas | Fluxos exercitados em HTTP com Auth.js/PGlite e e-mail simulado. | Remetente e cadeia de migrations pendentes. | Só migration mínima de login anterior; não liberar convites reais. |
| 3. Permissões | Cinco módulos isolados com preferências separadas do acesso. Recursos comerciais continuam privados do proprietário. | Não homologada. | Candidato não publicado. |
| 4. Kanban | Oito etapas, dados legados intactos; navegação e persistência em Chrome e HTTP. | Migration e aceitação pendentes. | Candidato não publicado. |
| 5. MCP | stdio em loopback, token dedicado, 2 projetos, rejeição de destino e replay; aceite manual preservado. | Instalação/credencial não autorizada. | Sem ligação com runtime real. |
| 6. Obsidian | Registro atualizado, recibo idempotente isolado e pronto para uso manual. | Hook real não executado. | Nenhuma sincronização ativada. |
| 7. Deploy e evidências | Confronto de repo, branch e SHA com fixtures; alias Vercel verificado por leitura. | Sem evidência integrada do Render. | Alias em 34918f9, não é este candidato. |
| 8. Homologação | Candidato integrado em ambiente descartável, não aprovado para lançamento. | Gate de operação pendente. | Nenhuma mudança nesta missão. |

## Evidência final do Prompt 02

- Backend: `npm test`, 85 aprovados, 0 reprovados (baseline 80); compilação TypeScript incluída. Fluxos de conta e proposta com sessões Auth.js, PGlite e HTTP, integração MCP real em loopback, cadeia das migrations, cancelamento Overpass simulado, autorização de origem, fronteiras de carteira e recibo local do Obsidian.
- Frontend: `npm test`, 50 aprovados, 0 reprovados (baseline 49); `npm run lint`, `tsc -b`, `vite build --configLoader runner` aprovados. Aviso não bloqueante do Vite: chunk principal de aproximadamente 500 kB minificado. Não foi executado benchmark em produção.
- Chrome local: 11 grupos Personal/Proposta/PWA contra backend sintético PGlite; 9 grupos de carregamento; 7 verificações gerais de Dark Mode (79 capturas), com reflow, teclado, movimento reduzido e PWA; Kanban e WhatsApp em 390/1440 px. Falhas iniciais de tipagem JSON do driver e de expectativas obsoletas das fixtures foram corrigidas antes da rodada verde. Nenhum envio ou número real foi usado.
- `npm audit --audit-level=high`: ambos os pacotes retornaram 0 vulnerabilidades no relatório desta rodada. `git -c core.safecrlf=false diff --check` verde; stage vazio. Nenhuma operação de release.
- Recuperação: checkpoint local `Documents/ATLAS/Abelha/checkpoint-pre-prompt-02-34918f9.zip`, SHA-256 `3581a07414317aa2b00cc69c94e342d09c68c635d9a72e26766b443eb5530a13`. A restauração deve ser comparada antes de aplicar; não sobrescrever o checkout.
- Ferramentas: Git, PowerShell, Node.js, TypeScript, PGlite e Playwright; leitura seletiva do Segundo Cérebro e leitura de metadados Vercel/Neon. Documentação oficial consultada sobre hooks e integrações. Não houve alteração global nem provisionamento de serviços.
- Sugestão de commit manual: `feat(abelha): consolidar multiusuário e homologar fluxos localmente`.


---

# Prompt 03 | Candidato e pré-homologação real

## O que mudou

O checkout segue na branch existente feature/phase-01-multi-tenant-foundation, HEAD 34918f9cf66d50f9d8df70627d57335092919874. HEAD não identifica estas alterações: o candidato não commitado é identificado pelo digest do manifesto entregue em separado. Nenhum commit, stage, push, merge, nova branch, deploy, migration remota, credencial, envio real ou alteração em produção. O checkpoint anterior foi relido com o SHA informado; novo checkpoint guarda as 90 alterações de partida, além do diff e manifesto, em Documents/ATLAS/Abelha/checkpoint-pre-prompt-03-34918f9.zip (SHA-256 8b638ab34267da3fbf47d0d2fad7687abc265b9c9f65922d6d2ca395b2f56404). Não restaurar sobre alterações posteriores.

- O novo limitador compartilhado de login/reset usa PostgreSQL, HMAC de identidade e orçamento fixo por janela. Pode ser ativado apenas depois de 20261128_auth_rate_buckets.sql, com ABELHA_AUTH_SHARED_BUDGET=true e ABELHA_AUTH_RATE_SECRET privativo (mesmo valor em todas as réplicas desse ambiente). O limitador de processo permanece como proteção complementar. Ausência do modo compartilhado não é certificação para múltiplas réplicas. Com modo habilitado, erro de schema/segredo falha fechado; recuperação acima do limite retorna resposta neutra. Não houve instalação real.
- complete-project-delivery.cjs é o passo opt-in pós-aceite técnico: confere origin Git e SHA local, seleciona exatamente um ID/repositório autorizado, grava recibo sem sobrescrever nota e pede processamento ao Abelha. Só repete falhas transitórias com a mesma carga, até três tentativas. O retorno é pending_review; não move estágio, não declara deploy e não executa texto do relatório. Nunca conectar diretamente ao evento Stop, que encerra turno e não atesta conclusão de etapa. [Hooks oficiais](https://learn.chatgpt.com/docs/hooks).
- Evolution exige origem HTTPS aprovada e endereço IPv4 público. A resolução é verificada e fixada à própria conexão, mantendo a validação TLS para o nome original. Mistura de respostas públicas e privadas, endereço não permitido, redirecionamento, resposta excessiva e tempo esgotado são recusados. IPv6 exclusivo não é aceito nesta versão; egress, DNS/TLS e dispositivo ainda precisam de validação na instalação real.
- Desempenho: JS principal de 500,27 para 267,60 kB minificado, redução de 46,5%; módulos opcionais carregam quando acessados. O carregador oferece recuperação ao ficar indisponível e não volta a ter botão de ativação manual. Ver medições em ABELHA-DESEMPENHO-RC.md.

## Infraestrutura observada somente por leitura

| Alvo | Identidade e revisão | Limite |
| --- | --- | --- |
| Neon HML | projeto curly-river-94350351, branch br-hidden-night-ace956m0, compute ep-crimson-snow-acmuhqgp, banco abelha_homologacao, PostgreSQL 18.7; 36 tabelas, 1 usuário, 0 instâncias Evolution | account_invites presente; demais migrations novas não aplicadas. abelha_hml_app não é superusuário, não é dona de users e não tem BYPASSRLS; não existe na branch de produção. Na própria branch HML a ACL concede CONNECT ao banco homônimo neondb, portanto confira o banco real em runtime e mantenha o endereço fixado. Não se conectou ao banco homônimo da HML. |
| Render HML | workspace tea-d0sgutadbo4c73f2qgvg; srv-dbr3if3tqb8s73cr2jn0; https://abelha-gestor-api-hml.onrender.com; main, plano Free, auto-deploy desligado; live dep-dbtobdd6e07s73an88cg / 94ccaa0 | É a revisão de novembro anterior, não o candidato. As variáveis e a vinculação atual de runtime ao Neon não foram confirmadas nesta rodada. |
| Vercel Preview | prj_Cd3vrf5gNVRmT3CjBJeX8saUrVVv; dpl_EW8CdwrcS4EGPH2ptvBEouXxawxc; https://abelha-gestor-alg3cyiwj-higoraranda-gmailcoms-projects.vercel.app; READY / 94ccaa0 | O mesmo SHA do HML Render anterior não prova conexão, permissões ou aceite do candidato. |
| Produção | Vercel dpl_4RwKWeshfetJXNmAhunEsZKMLKW2 READY em 34918f9; Render srv-daldd0142hec73c3ltt0 live dep-dc3eakoae00c738pct80 em b0442f9, auto-deploy por commit na main; Neon branch br-square-sunset-acpb91u2 | Frontend e backend não estão no mesmo SHA; constatado, não corrigido por publicação. Produção preservada. |
| n8n | Somente leitura do workflow unificado n20DNyb13Aaw3nq5 da infraestrutura já conhecida: ativo no momento da consulta | Nenhum workflow, rotina externa ou credencial alterado. Ativo não implica sucesso dos jobs. |

RLS continua não habilitada. A separação vem dos guardas da API e de chaves/filtros por organização e titular. A role do HML não bypassa RLS, mas o pool compartilhado hoje não seta escopo transacional por requisição. Qualquer adoção futura requer role não proprietária, SET LOCAL por transação, teste de reutilização de conexões e revisão específica de atalhos de serviço, webhooks e rotinas. O navegador consome HTTP; não conceder role Postgres de uso direto. A validação de privilégios e rede da instalação candidata é um gate remoto.

## Resultado por gate

| Gate | Resultado | Limite ou evidência |
| --- | --- | --- |
| 01 Auditoria | BLOCKED para aceite integral | Matriz de rotas, evidência parametrizada de entrada, preferências corrigidas no inventário; não equiparar uma recusa por papel à comprovação de cada recurso entre tenants. A evidência numérica fica ao fim. |
| 02 Módulos | PASS local; BLOCKED HML | Cinco módulos isolados; CRM, gestão, integrações privilegiadas e revisão agregada permanecem exclusivos do proprietário. Preferências não concedem módulos. |
| 03 Preparação HML | BLOCKED | Destinos e revisões identificados. Precisa autorizar HML, confirmar a conexão real e escolher entrega de artefato que não acione a main. |
| 04 PostgreSQL/migrations | PASS local; BLOCKED real | PostgreSQL HML real: leitura de inventário apenas; PGlite: cadeia local e preservação de dados. Sem aplicação remota ou teste de lock real. |
| 05 Contas/e-mail | PASS local; BLOCKED real | Auth.js, convites e recuperação sintéticos; limitador SQL compartilhado em fixture. Sem validar remetente ou caixa de teste real. |
| 06 Kanban | PASS local; BLOCKED HML | Oito etapas, legado preservado, concorrência/aceite e Chrome desktop/mobile em loopback. |
| 07 MCP | PASS local; BLOCKED instalação | Escopos e dois projetos validados com backend sintético. Não registrar credencial ou servidor em projeto Codex ainda. |
| 08 Atualização automática | PASS local opt-in; BLOCKED hook | Comando de conclusão com recibo, contingência, idempotência e rejeição de ambiguidade. Nenhum hook real foi configurado. |
| 09 Segundo Cérebro | PASS local; BLOCKED ligado ao Codex | Escreve recibo em pasta técnica selecionada e preserva conteúdo existente. Estado do projeto registrado localmente. |
| 10 Busca Lead | BLOCKED para confiabilidade/HML | Quatro consultas públicas de baixo volume, sem importar ou contatar. Sucesso parcial; números abaixo. |
| 11 Calculadora/propostas | PASS local; BLOCKED HML | Snapshot aprovado preserva preços/condições, recusa não libera prompt, confirmação explícita, Chrome local. |
| 12 WhatsApp | BLOCKED real | DNS/TLS, destino e deduplicação testados em cenário controlado; nenhuma instância de HML ou número autorizado. Manter desabilitado. |
| 13 Deploys e n8n | BLOCKED candidato | Verificado o estado anterior e aprimorado o verificador Preview/Produção. Nenhum build candidato nos serviços remotos. |
| 14 Desempenho/PWA | PASS local; BLOCKED carga real | 46,5% menor no JS principal, loader/PWA/Dark Mode testados. Não extrapolar para cold start Render, memória ou banco sob carga. |
| 15 Integrado | PASS local; BLOCKED HML/lançamento | Evidências locais detalhadas abaixo; sem liberação de amigos/produção. |

### Busca pública real: matriz de disponibilidade

| Consulta | Resultado observado por transporte real |
| --- | --- |
| Clínicas odontológicas em Salto, SP | 1 resultado único, OpenStreetMap, 23,9 s. Primário expirou; alternativa respondeu. |
| Barbearias em Indaiatuba, SP | 504, 19,8 s. Primário 502; alternativa expirou. |
| Restaurantes em Itu, SP | 3 resultados únicos, OpenStreetMap, 13,8 s. Primário 502; alternativa respondeu. |
| Academias em Campinas, SP | 504, 19,5 s. Primário 502; alternativa expirou. |

O aplicativo discriminou sucesso e indisponibilidade. A amostra de 2/4 demonstra funcionamento parcial e a utilidade do failover, não cobertura de estabelecimentos ou SLA. Não foi executada dentro do Render. O Nominatim público [proíbe coleta sistemática de POIs](https://operations.osmfoundation.org/policies/nominatim/), então não é substituto para prospecção. Uma alternativa de médio prazo é indexação de [extratos OSM](https://download.geofabrik.de/south-america/brazil.html) por região, sob ODbL e com orçamento para armazenamento, atualização e operação. Nenhuma fonte paga contratada.

## Uma aprovação agrupada para a próxima etapa

| Ação | Destino e limites | Evidência e recuperação |
| --- | --- | --- |
| Migrations e testes sintéticos | Apenas Neon HML: curly-river-94350351 / br-hidden-night-ace956m0 / ep-crimson-snow-acmuhqgp / abelha_homologacao. Confirmar em runtime abelha_hml_app, registrar contagens e ponto de restauração imediatamente anterior. Aplicar somente as ausentes em transações e com timeout de lock: quote_models, signup_email, password_reset, member_modules, quote_proposals, managed_accounts, project_pipeline, quote_proposal_decisions, auth_rate_buckets. Não repetir account_invites. | Comparar integridade de conta/cliente/projeto, índices, constraints e vínculos; testar dois membros sintéticos distintos, concorrência, sessão revogada e módulos. Não executar DROP, TRUNCATE ou restaurar sem nova decisão. O alvo atual continua sem escrita. |
| Artefato no HML | Render srv-dbr3if3tqb8s73cr2jn0 e Vercel prj_Cd3vrf5gNVRmT3CjBJeX8saUrVVv apenas Preview. HML usa main com auto-deploy desligado, mas a main também aciona produção. Não enviar candidato a main para contornar a homologação. Até definir transporte isolado aprovado, primeira opção é ensaio do candidato local com Neon HML após aprovação, sem publicação. | Confirmar mesmo SHA/build quando existir um artefato remoto, origem exclusiva do Preview para backend HML e conexão observada ao banco de teste. Manter deploys anteriores anotados para retorno manual e critério de parada se os alvos divergirem. |
| Caixa de teste e integração | Provedor/remetente existentes só após confirmação HML; informar uma caixa de teste expressamente autorizada e dois projetos sintéticos para MCP. Nenhum convite a amigos, alteração global ou secret em relatório. WhatsApp opcional: instância exclusiva e número de teste específico, sem reaproveitar clientes. | Testar receber, expirar e consumir código/link uma vez. Usar token MCP exclusivo, lista explícita de projetos e pasta técnica descartável; revogar removendo credencial. Evolução real só com origem, DNS/TLS, segredo e número aprovados. |

Comando opt-in futuro, já testado com dados fictícios: no checkout Git correto, node backend/scripts/complete-project-delivery.cjs entrega.json "pasta-tecnica-do-projeto". O JSON contém report v1, receipt pendente com mesmo event_id/task_id e SHA, e project_id quando necessário. Passe ABELHA_CODEX_ORIGIN e ABELHA_CODEX_REPORT_TOKEN por ambiente privado, não por Git. O verificador de release usa ABELHA_EXPECTED_TARGET=preview ou production, ABELHA_EXPECTED_BRANCH e as credenciais de leitura documentadas. Não instale ganchos globais antes do ensaio autorizado.

## Sequência para o Prompt 04

1. Fechar a separação HML e confirmar recuperação; homologar primeiro banco e depois candidato com usuários sintéticos. Compare a versão, migrações, variáveis por ambiente e comportamentos protegidos.
2. Fixar os arquivos pelo manifesto (digest distinto de HEAD), confirmar Git e o auto-deploy. Quando a promoção for explicitamente aprovada, e apenas se main local tiver a mesma base e não houver divergência remota, a transição proposta é git switch main, verificar novamente manifestos e diferença, selecionar somente arquivos revisados, git diff --cached --name-status, git commit -m "feat(abelha): consolidar homologação e preparar lançamento", registrar git rev-parse HEAD e só então git push origin main. Se houver divergência, parar e preservar o checkout; não fazer merge automático, rebase, história forçada ou nova branch. Estes comandos não foram executados.
3. Em produção, só com autorização própria: ponto de recuperação fresco, migrations aditivas antes de uma revisão que dependa delas, backup/restore documentados, HTTPS/credenciais por ambiente, smoke de login existente e dados preservados antes de liberar qualquer convite. Se falhar, impedir avanço e voltar à revisão compatível; restauração destrutiva não é automática.
4. Essenciais: acesso e privacidade, contas/convites e e-mail, compatibilidade de migrations, smoke do proprietário e concessão apenas dos módulos aprovados. Opcionais desabilitáveis: Evolution, sincronização de execução Codex/Obsidian, prospecção Overpass se não confiável. Bloqueiam liberação: ausência de homologação real, evidência insuficiente de isolamento por recurso, migrações de destino e ausência de confirmação do e-mail. **Prompt 04 ainda não deve ser exclusivamente publicação.**


### Validação final do candidato do Prompt 03

- Backend: 89 testes aprovados, 0 reprovados, com npm test; frontend: 50 aprovados, 0 reprovados, mais lint, TypeScript e build Vite (configLoader runner). Baseline anterior 85/50. Audit high nos dois pacotes retornou zero avisos; isso não equivale a prova de segurança de código. Uma falha inicial do inventário tratava o parser de corpo do webhook GitHub como roteador; correção feita, teste unitário e rodada integral verdes.
- Matriz atual: 123/123 entradas testadas (121 rotas dos módulos e 2 aliases públicos de saúde), 635 asserções HTTP e 16 observações de Auth.js. 121 rotas com negativa executada e 61 com positiva. As 60 com evidência só negativa continuam parciais, e o aceite integral de isolamento por operação e em HML permanece pendente. Em PATCH /api/v1/member-modules/me/preferences, membro titular 200, proprietário 403, anônimo e sessões desativadas/revogadas 401, tentativa de autoconcessão 400.
- Chrome em loopback: 9 grupos do carregador, 11 blocos integrados Personal/PWA, 7 de Dark Mode (79 capturas), Kanban e Conversas sintéticas a 390/1440 px. JS principal 267,60 kB minificado. Nenhum serviço temporário iniciado para esses testes ficou aberto. Não mediu cold start do Render candidato ou carga real no PostgreSQL.
- Artigos e evidências: ABELHA-MATRIZ-DE-ACESSO.md, ABELHA-EVIDENCIA-ACESSO.json, ABELHA-DESEMPENHO-RC.md e manifesto do candidato entregue em separado. Reproduza o manifesto, da raiz, com node backend/scripts/create-rc-manifest.cjs. Os hashes cobrem arquivos alterados, patch, migrations, lockfiles e artefatos principais; HEAD é base, não identificador de release. Não use git add indiscriminado: o arquivo rc-prompt03-pathspec.txt lista explicitamente o candidato para revisão futura.
- Ferramentas: Git, PowerShell, Node/TypeScript, PGlite/Postgres.js, Auth.js, Playwright, leitura seletiva das notas do Abelha e conectores em modo leitura para Neon, Render, Vercel e n8n. Verificação de segurança e navegação em frentes independentes; sem alteração global do Codex.
