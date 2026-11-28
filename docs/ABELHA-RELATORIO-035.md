# Abelha — relatório consolidado do Prompt 03.5

Data: 26/11/2026. **Resultado parcial: fluxos remotos dirigidos aprovados; publicação não liberada.** Este relatório substitui o ponto de retomada anterior, que ainda deixava a reconexão HML sem confirmação. Sem funcionalidades novas, stage, commit, push, merge, branch nova, migration remota ou alteração produtiva nesta missão.

## 1. Git, ambientes e reconexão HML

| Item | Estado verificado |
| --- | --- |
| SHA candidato | `000660b0f01d6dbe16101e1d4d815ee6013786e4` |
| Checkout | `main`, HEAD `844f9484fdcc1aac292bfa7c40bc93026f5a4323`; diferença para o candidato somente nos documentos do 03.4 |
| Render HML atual | Serviço `srv-dbr3if3tqb8s73cr2jn0`; deploy `dep-dc46mil6e07s73eb4eo0`, **live em 844f948**; auto-deploy **off** |
| Render HML anterior | `dep-dc46fjnlk1mc739p3lb0`, em `000660b`, homologado antes da rotação, agora desativado |
| Vercel Preview | `dpl_DFU9eP7P2e9LaJuRvX4W8tNJVVg9`, READY, target null/Preview, SHA `000660b` |
| URL Preview | <https://abelha-gestor-a77xaxn9i-higoraranda-gmailcoms-projects.vercel.app> |
| Banco efetivo | Neon `curly-river-94350351` / `br-hidden-night-ace956m0` / `ep-crimson-snow-acmuhqgp` / `abelha_homologacao`, role `abelha_hml_app`, TLS obrigatório |

O proprietário autorizou a rotação da credencial HML exposta durante a inspeção anterior. A senha da role foi rotacionada, e Render HML e arquivo privado local foram atualizados sem divulgar a nova credencial. **A reconexão foi posteriormente confirmada** pelo runner HTTPS com identidades semeadas exclusivamente no HML, consultas SQL e limpeza integral.

A atualização de variáveis pelo conector Render disparou deploy da HEAD `844f948`, mesmo com auto-deploy desligado. A tentativa de substituí-lo pelo SHA exato foi interrompida pelo controle do navegador. Os fontes funcionais são iguais, mas **o critério formal de mesmo SHA entre frontend/backend continua pendente**. Não usar a branch divergente de homologação e não fazer novo commit/push para resolver isso.

Ação manual necessária: no serviço **abelha-gestor-api-hml**, selecionar **Manual Deploy → Deploy a specific commit → 000660b0f01d6dbe16101e1d4d815ee6013786e4 → Deploy commit**, preservando as variáveis HML atuais e auto-deploy off. Depois confirmar o novo deploy live e executar somente smoke de reconexão/versão; não repetir auditorias gerais.

## 2. Resultados da homologação remota

| Gate | Resultado e limite |
| --- | --- |
| HTTPS, autenticação e sessão | PASS: Auth.js real com quatro identidades sintéticas; duas contas proprietárias da mesma organização, membro e proprietário de outra organização |
| Cookies de sessão | PASS: Secure, HttpOnly e SameSite=Lax. Não extrapolar para todos os cookies auxiliares; estes vieram sem Secure no smoke produtivo anterior |
| Permissões e isolamento | PASS dirigido: anônimo401, membro sem CRM403, recursos alheios404, isolamento entre titulares da mesma organização e entre organizações |
| CORS | PASS: origem exata do novo Preview e credentials=true; origem atacante não autorizada |
| Kanban | PASS: persistência, leitura posterior, isolamento e atualização desatualizada409 |
| Calculadora e propostas | PASS: cálculo em centavos/desconto, orçamento persistido, snapshot preservado, histórico comercial e duas decisões HTTP concorrentes com resultados200/409 |
| Prompts | PASS em000660b: geração, edição, histórico, reload e cópia real pela interface; rodada posterior à rotação também confirmou que proposta recusada não gera prompt |
| Templates | Ausente da navegação remota observada; dados/endpoints históricos preservados |
| Dark Mode | Tema escuro observado no Preview; não foi executada nova matriz completa de alternância/persistência |
| Móvel | Observação em preset440×956; sem nova asserção de overflow/390px nesta rodada |
| PWA | Manifesto e sw.js retornaram200 com acesso autorizado; instalação offline bloqueada por redirecionamentos à autenticação Vercel. Proteção mantida |
| Cold start e animação automática | Sem nova comprovação conclusiva de cold start após ociosidade ou matriz de animação; saúde quente pós-rotação respondeu em320ms |
| Cadastro/OTP e recuperação | Entrega real não validada por ausência de configuração Resend HML; não substituída por repetição de simulações |

Antes da rotação, o runner dirigido terminou PASS no SHA000660b; depois dela, terminou PASS no runtime844f948. A corrida produziu aprovação na primeira rodada e recusa na última, ambas com um conflito concorrente. Fixtures de API e UI foram removidas; **contagens e fingerprints das40 tabelas iguais aos respectivos baselines**. Clientes SQL/processos dos runners encerrados; nenhum servidor, worker ou container temporário foi iniciado para esses testes remotos.

Evidências privadas ignoradas pelo Git: `remote-035-before-rotation-result.json`, `remote-035-result.json`, `audit-035-result.json` e `ui-cleanup-035.json`, em `.abelha-homologacao/`. Baseline93backend/50frontend/126rotas/267,60kB preservado, sem repetir suítes gerais. As dez migrations HML não foram reaplicadas.

## 3. Produção: disponibilidade, incompatibilidade e recuperação

Na consulta03.5, frontend, health backend/proxy e sessão anônima responderam200. Render produtivo estava live em000660b (`dep-dc45o8mtlv9c73fq2b9g`); Vercel produtivo estava READY em844f948 (`dpl_AqcNrP6m6n9PkDXpRKZvQqAyW9EX`). A diferença de código era documental. Esses sinais não comprovam o funcionamento dos fluxos privados.

O catálogo produtivo tinha36tabelas e não continha os marcadores das dez migrations novas. **Incompatibilidade confirmada:** `EXPLAIN` da consulta de modelos retornou `42P01`, tabela `quote_models` inexistente, sem consultar registros de clientes. Não foram encontrados novos logs contendo `does not exist` no intervalo consultado desde16:20UTC; ausência de log não elimina a incompatibilidade.

| Retorno possível | Evidência e risco |
| --- | --- |
| Render `dep-dc3eakoae00c738pct80`, SHAb0442f9 | Deploy anterior registrado, desativado. Autenticação passou em schema legado sintético; ainda depende de quote_models ausente, portanto não resolve integralmente o problema |
| Render `dep-dbv1ri3m8hqs73ahkhf0`, SHAc4e983e | Revisão legada sem os módulos recentes; autenticação passou em schema sintético36tabelas. Retenção do artefato não certificada; aplicação inteira não re-homologada |
| Vercel `dpl_3XWfzqMU3EjYPMDsbr8s71mFvusR`, SHAc4e983e | READY no histórico, mas isRollbackCandidate=false; não presumir retorno imediato por artefato |

Recomendação: **não executar rollback cego**. Mediante autorização produtiva específica, primeiro suspender novos deploys automáticos; qualificar o retorno legadoc4e983e no ambiente isolado e verificar retenção/rebuild antes de promovê-lo. Se o proprietário optar pelo avanço do candidato, aplicar somente migrations realmente ausentes, em janela autorizada e com recuperação preparada. Nenhuma dessas operações produtivas foi executada.

Para evitar novas publicações antes do schema: proposta Render produção **Auto-Deploy Off** e Vercel **Ignored Build Step → Only build preview**. Ambas exigem autorização própria; não foram alteradas. Referências oficiais: [Render deploys](https://render.com/docs/deploys), [retenção e rollback](https://render.com/docs/rollbacks), [Vercel Ignored Build Step](https://vercel.com/docs/project-configuration/project-settings).

## 4. Sequência produtiva preparada — não executada

Referência de recuperação obtida somente por leitura: **2026-11-26T17:04:24.867Z, WAL0/AFF8C68**. É histórica; reconfirmar ponto fresco e retenção imediatamente antes de qualquer operação. Restauração não ensaiada nesta missão. O destino produtivo é `neondb`, branch `br-square-sunset-acpb91u2`, compute `ep-wandering-pond-acitqqn8`, distinto do HML.

1. Obter autorização para conter auto-deploys e escolher recuperação ou avanço. Não publicar pelo simples push da documentação.
2. Confirmar o SHA aceito no HML e resolver os gates indispensáveis; registrar hashes dos scripts.
3. Reconsultar o catálogo completo: colunas, defaults, constraints e índices de cada arquivo. Os dez marcadores estavam ausentes; isso não é um histórico de execução. Se houver estrutura parcial/divergência, parar e conciliar; não reaplicar às cegas. `20261125_account_invites.sql` já está aplicada e fica fora da lista.
4. Com autorização específica de produção, backup/recuperação recentes e fingerprints de dados legados, aplicar somente as ausentes, nesta ordem de dependência:

   - `20261125_quote_models.sql`
   - `20261125_signup_email.sql`
   - `20261125_password_reset.sql`
   - `20261126_member_modules.sql`
   - `20261126_quote_proposals.sql`
   - `20261127_managed_accounts.sql`
   - `20261127_project_pipeline.sql`
   - `20261127_quote_proposal_decisions.sql`
   - `20261128_auth_rate_buckets.sql`
   - `20261129_quote_proposal_workflow.sql`

5. Usar transações e timeouts de lock; não executar seed, reset, DROP ou restore automático. Conferir dados preexistentes, decisões/snapshots, vínculos, constraints, índices e permissões após a aplicação.
6. Publicar/promover manualmente frontend e backend no mesmo SHA aprovado, depois do schema compatível. Fazer smoke autorizado de saúde, login, cookies, permissões e propostas sem usar clientes como fixture. Em falha, interromper avanço e executar somente o plano de retorno previamente aprovado; não desfazer migrations removendo dados.

## 5. E-mail e automação obrigatória

**E-mail:** uma caixa de teste foi autorizada; o endereço não entra neste relatório/cofre. O proprietário pediu instruções de configuração. No Render HML, configurar privadamente:

- `ABELHA_OTP_RESEND_API_KEY`: chave Resend com permissão de envio e acesso ao domínio escolhido.
- `ABELHA_OTP_FROM`: remetente de domínio verificado no Resend; conferir registros DNS e status de verificação no provedor.
- `ABELHA_OTP_SECRET`: segredo independente, com pelo menos32bytes aleatórios; não colocar em VITE_*, Git, chat ou cofre.

Manter FRONTEND_URL no Preview HML atual e AUTH_URL HTTPS no backend HML. Alterar variáveis pelo conector pode iniciar deploy da HEAD: após configurar, fixar novamente o SHA candidato. Só então testar OTP e recuperação exclusivamente na caixa autorizada, recebimento, expiração, consumo único e revogação de sessão. Nenhum envio real foi feito nesta missão.

**Codex→Segundo Cérebro→Abelha:** requisito original obrigatório, ainda não operacional. A API GitHub retornou zero runs de Actions; o contrato existente exige evidência real de Actions. O HML retornou zero projetos vinculados ao repositório canônico e não tinha token dedicado certificado. Não inventar runURL, cadastrar projeto duplicado no Codex ou usar produção como atalho.

Foi preparada proposta local não ativa em `.abelha-homologacao/proposals-035/hooks.json` e `stop-delivery.cjs`. Ela reutiliza `complete-project-delivery.cjs`, exige evento Stop do cliente e envelope explicitamente ready, SHA do checkout, token dedicado HML e pasta técnica confirmada. Stop isolado não significa conclusão; execução manual não comprova automação. A proposta teve apenas sintaxe conferida, sem instalação/confiança ou envio real. Não é necessário presumir configuração global: priorizar hook por projeto confiável. Se registro global se tornar indispensável, apresentar a definição exata e solicitar autorização antes de alterar. [Hooks oficiais](https://learn.chatgpt.com/docs/hooks).

Para concluir: estabelecer vínculo único no Abelha HML e credencial dedicada restrita, produzir evidência Actions real, revisar/confiar no hook e observar evento real com nota, envio, comprovante UUID, histórico e próximos passos. Progresso concluído continua condicionado à revisão humana dos marcos; recebimento permanece pending_review. Nenhum hook global/notify foi alterado.

## 6. Pendências, autorizações e prontidão

- Proprietário: fixar Render HML em000660b conforme item1; não há necessidade de novo commit/push ou conciliação de branch.
- Configurar Resend HML conforme item5; a caixa já foi autorizada. Ainda falta entrega real.
- Concluir vínculo/token/CI/confiança e comprovação automática por evento real. Não tratar a integração como opcional permanente.
- Revalidar PWA offline em ambiente de teste apropriado sem desligar proteção por conveniência; completar os limites de cold start, loader e matriz responsiva/tema antes de declarar aceite integral.
- Qualquer contenção, rollback, migration ou publicação em produção requer autorização específica. Não executar na retomada apenas porque existe um plano.
- Busca Lead preservada, sem nova investigação extensa; WhatsApp desabilitado e sem instância autorizada. Não bloqueiam áreas independentes seguras.
- Link Preview temporário foi expressamente autorizado por até23horas e não divulgado. Expiração/revogação não foi reconfirmada. A janela de Bloco de Notas aberta durante a tarefa restaurou rascunho preexistente e foi preservada, sem inspeção/edição; não fechar conteúdo não salvo do usuário como limpeza.

**Prontidão: não liberado para publicação.** Banco HML e reconexão pós-rotação confirmados; fluxos dirigidos remotos aprovados dentro dos limites acima. Não afirmar missão integralmente concluída e não avançar para novas funcionalidades.
