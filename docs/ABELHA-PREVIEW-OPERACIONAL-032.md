# Abelha — Prompt 03.2: validação operacional e preparação

25/11/2026. **Prontidão para publicação: BLOCKED. Prompt 04 ainda não pode ser exclusivamente publicação final.** Nenhuma publicação remota, migration, commit, push ou configuração externa foi executada nesta rodada.

## Candidato e Git — PASS

Repositório `higoraranda/abelha-gestor`, branch local existente `feature/phase-01-multi-tenant-foundation`, HEAD confirmado `030976f093517ac1d3438c01560e67a7a775c01e`. Alterações anteriores preservadas, sem stage. Manifesto 03.1 `working-tree-sha256:b6faef8c2aea0d3106818b86a73ae200240a45d60898c5f51aa135be011092ba` conferido antes desta rodada: nenhuma divergência de arquivo. Baseline 90/50, matriz 123/121, 785+23 e 39 tabelas reaproveitado; nenhuma suíte completa ou migration repetida.

Esta rodada acrescenta somente documentação/evidência técnica, sem modificar código da aplicação. Manifesto final: `.abelha-homologacao/rc-prompt032-manifest.json`; o 03.1 original foi preservado. O digest do novo manifesto cobre a documentação acrescentada; não implica novo build publicado.

## Preview integrado remoto — BLOCKED

Consultas reais aos conectores:

| Destino | Estado observado |
|---|---|
| Render HML `srv-dbr3if3tqb8s73cr2jn0` | Node, Free, repo existente, branch main, auto-deploy off; build `cd backend && npm ci --include=dev && npm run build`; deploy live `dep-dbtobdd6e07s73an88cg`, SHA `94ccaa03b24f402f1519b3654219f54070c77bec`. |
| Vercel `prj_Cd3vrf5gNVRmT3CjBJeX8saUrVVv` | Vite/Node24; proteção SSO para endereços fora dos domínios próprios; `BACKEND_URL` cadastrado exclusivamente Preview, sem descriptografar seu valor. Existência da chave não comprova destino/runtime. |
| Git remoto | `refs/heads/main = 34918f9cf66d50f9d8df70627d57335092919874`; ref remota da branch local atual ausente. Nenhum push. |

A Vercel permite envio de arquivos para Preview. O serviço Node Render existente usa fonte Git: a API oferece commit do repositório, build existente ou imagem para serviço image-backed, sem campo de upload de checkout local para esse serviço. O MCP disponível só dispara redeploy da fonte configurada. Acioná-lo agora entregaria outro conteúdo, sem as alterações não commitadas. Não há build Render existente identificado para o digest corrigido. Documentação: [API de deploy Render](https://api-docs.render.com/reference/create-deploy), [deploy por commit](https://render.com/docs/deploys).

Não se criou Preview frontend isolado apontando ao backend antigo como se fosse candidato integrado. HTTPS/Secure/CORS/sessão/login/isolamento/Kanban/PWA/cold start **do candidato remoto** não foram aprovados; continuam BLOCKED. As evidências locais→Neon HML do Prompt03.1 permanecem válidas dentro de seu escopo.

Opção concreta que requer exceção explícita: commit manual do conteúdo revisado e push somente da branch local atual para uma ref remota de HML; essa ref não existe e sua criação conflita com a proibição atual de novas branches. Depois, configurar exclusivamente o Render HML para essa ref, manter auto-deploy off e publicar commit exato; Vercel exclusivamente Preview por arquivos/SHA correspondente. Main e configuração de produção permanecem intactas. Não executar essa opção sem autorização nova para a exceção, commit/push e mudança da fonte HML. Não foi comprovado outro transporte disponível que entregue o checkout corrigido ao serviço Node existente sem essa alteração.

## E-mail — BLOCKED

Nenhuma caixa de teste autorizada foi informada. O arquivo privado local HML não contém as chaves de envio OTP; isso não prova ausência no Render. O conector Render disponível não oferece leitura de envs: não se usou uma escrita de configuração para investigar. Remetente/provedor remoto não certificados. Nenhum e-mail enviado.

Procedimento: confirmar remetente/domínio verificado no provedor, configurar privadamente no HML `ABELHA_OTP_RESEND_API_KEY`, `ABELHA_OTP_FROM` e `ABELHA_OTP_SECRET`; fixar origem HTTPS de frontend/auth somente HML. Informar uma caixa expressamente autorizada. Só então testar recebimento de OTP/reset, validade, consumo único e revogação de sessões, sem destinatários reais adicionais. Não colocar chaves/códigos em relatório/cofre.

## Codex → Obsidian → Abelha — PARTIAL, automação BLOCKED

Revisados `abelha-project-mcp.cjs`, `complete-project-delivery.cjs`, `obsidian-task-receipt.cjs`, `verify-delivery.cjs`. Contratos existentes: lista de projetos permitidos por token dedicado; ID explícito quando repositório é ambíguo; SHA do checkout; nota técnica idempotente sem sobrescrita; envio sem redirects; retries transitórios com mesmo evento; comprovante `pending_review`. Relatório não concede aceite nem move marco automaticamente.

Executado somente o recorte direcionado das quatro suítes compiladas de conclusão, recibo, escopo e evidência: **4 testes PASS**, zero falhas. Comando: `node --require ./scripts/isolated-test-env.cjs --test dist/services/complete-project-delivery.test.js dist/services/obsidian-receipt.test.js dist/services/codex-report-scope.test.js dist/services/delivery-evidence.test.js`, em backend. O preload impede carregar `.env` produtivo. Artefato privado `prompt032-tools.log`.

Esses testes exercitam contratos locais e isolamento da nota; não comprovam dois projetos remotos nem execução automática. A evidência HML anterior de tokens/projetos segue no03.1. Não se fabricou URL de Actions, não se confundiu HEAD com versão do working tree, nem se criaram projetos Codex duplicados ou notas sintéticas permanentes no cofre.

Para fechar: disponibilizar candidato remoto, dois IDs sintéticos do Abelha ligados aos repositórios corretos e token HML restrito; pasta técnica autorizada e evento real de conclusão por projeto. Executar entrega/replay, projeto ambíguo/incompatível, revogação do token e falha de backend preservando nota; verificar comprovante e registro SQL, sem aceite automático. A seguir comprovar o disparo pelo evento real, sem lançar o script manualmente e chamá-lo de automação. Qualquer configuração global continua proibida; configuração por projeto e seu gatilho devem ser definidos explicitamente. Nenhum gancho foi instalado.

## Busca Lead — FAIL externo; tratamento existente preservado

Duas consultas reais de baixo volume, limite1, sem importar contatos: Salto/SP terminou504 em30.009ms; Itu/SP terminou504 em16.671ms. Principal apresentou timeout/502 e alternativa timeout. Recibo privado `prompt032-leads.json` registra somente contagem/status/duração, sem dados de contatos. Sem tentativas repetidas para forçar sucesso.

O código já limita a janela total, usa alternativa, impede consulta repetida por carteira por um minuto, distingue timeout/indisponibilidade/cidade inválida e não transforma falha em resultado vazio. Não há regressão identificada que justifique alteração especulativa ou contratação de API. Gate de disponibilidade real segue FAIL. Próxima ação: aguardar provedor saudável ou escolher fonte autorizada; repetir uma consulta limitada antes de liberar o recurso.

## WhatsApp — BLOCKED/desabilitado com segurança

Sem instância/número de teste autorizado. Nenhum pareamento ou envio real, nenhuma credencial/instância alterada. Positivas com provedor simulado do03.1 continuam identificadas como simulação; não certificam canal operacional.

## Produção e plano de publicação

Leitura atual confirmou a divergência: Vercel Production READY `dpl_4RwKWeshfetJXNmAhunEsZKMLKW2` em `34918f9cf66d50f9d8df70627d57335092919874`; Render Production live `dep-dc3eakoae00c738pct80` em `b0442f97d3683e437c70e98e3677ef00629ca10b`. Não corrigida por deploy.

Consulta exclusivamente de catálogo no Neon produção, branch `br-square-sunset-acpb91u2`, banco efetivo `neondb`, confirmou account_role/account_invites existentes e ausência das tabelas quote_models/quote_proposals/auth_rate_buckets, colunas OTP/reset/gestão de contas e pipeline. Sem consultar registros de clientes/usuários. As seguintes migrations permanecem pendentes em produção, já homologadas no HML; **não foram aplicadas**:

1. `20261125_quote_models.sql`
2. `20261125_signup_email.sql`
3. `20261125_password_reset.sql`
4. `20261126_member_modules.sql`
5. `20261126_quote_proposals.sql`
6. `20261127_managed_accounts.sql`
7. `20261127_project_pipeline.sql`
8. `20261127_quote_proposal_decisions.sql`
9. `20261128_auth_rate_buckets.sql`

Sequência preparada, condicionada a autorização de produção posterior:

1. Fechar preview remoto e remetente; revisar manifesto/diff e fixar mesmo artefato frontend/backend. Congelar alterações durante publicação. Preservar restrições de integrações.
2. Capturar SHAs/deploys/envs por ambiente sem expor valores, catálogo e fingerprints de dados; confirmar ponto de recuperação recente, retenção/PITR e recuperação ensaiada. Backup antigo não é recuperação garantida. Não executar restore automático.
3. Conferir hashes das nove migrations contra o aprovado e ausência de aplicação parcial; obter autorização exata de banco/arquivos. Aplicar só pendentes com locks/timeouts e verificação transacional/legado; não repetir scripts, seed/reset ou concatenar BEGIN/COMMIT sem revisão. Alguns scripts não são idempotentes.
4. Schema aditivo precede backend que exige novas colunas. Deploy backend exato, validar identidade de runtime e login existente; depois frontend correspondente. Não depender do auto-deploy para uma ordem transacional entre plataformas. Definir os controles antes do push da main.
5. Smokes: health, sessão anônima, proprietário existente com intervenção do titular, conta sintética autorizada, OTP/reset, Secure/HttpOnly/SameSite, CORS, 401/403/404, isolamento, Kanban persistido, PWA/cache. Conferir fingerprints e limpar somente fixtures identificadas.
6. Liberar primeiro proprietário, depois um convidado sintético/caixa autorizada, depois usuários individuais e módulos explicitamente concedidos. Provedores opcionais permanecem desligados até teste próprio.
7. Rollback: restaurar versões anteriores de backend/frontend anotadas, apenas se compatíveis com schema aditivo; manter dados/colunas, sem DOWN automático. Falha de integridade exige parada e decisão humana sobre recuperação do ponto fresco; evitar restauração que perca dados posteriores. Revalidar retenção e disponibilidade de cada artefato no dia da publicação.

## Encerramento e solicitação agrupada

Nenhum DML/DDL nesta rodada, nenhum servidor/worker/container iniciado, nenhuma escrita em produção. Probes e testes locais concluídos; notas temporárias do teste removidas pelo runner. Git sem stage/commit/push; alterações anteriores preservadas. Não se afirma nova comparação das39tabelas nesta rodada, pois nenhum teste usou dados do banco. Baseline de preservação é o aprovado no03.1.

Autorizações/informações necessárias em um único retorno:

- Exceção para disponibilizar o candidato no Git exclusivamente em ref HML: commit/push manual na branch atual e criação da ref remota correspondente, mais apontar somente Render HML a essa ref; ou indicar outro transporte de artefato já aprovado e disponível. Sem main/produção.
- Caixa de e-mail de teste e confirmação de remetente verificado/configuração privada HML.
- Dois IDs/repositórios sintéticos e pasta técnica, mais gatilho real por projeto para comprovar automação; sem configuração global. WhatsApp só se desejado, com instância/número de teste em autorização própria.

Sem essas resoluções, **Prompt04 não deve ser só publicação**: ainda faltam preview integrado HTTPS, entrega de e-mail e comprovação operacional de automação; Busca Lead permanece indisponível e WhatsApp desabilitado.

Skills aplicadas: using-superpowers, render-deploy, deployments-cicd e verification-before-completion (evidência antes de aceite). Segundo Cérebro atualizado seletivamente, sem credenciais ou dados privados.
