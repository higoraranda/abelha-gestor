# Abelha — incidente produtivo 03.6

## Revalidação e procedimento revisado em 27/11/2026

**BLOCKED.** Produção continua com 36 tabelas e os quatro objetos ausentes citados abaixo. O catálogo também confirmou as três chaves únicas de origem válidas, nenhuma das 25 colunas ou dos sete índices novos e zero convites resgatados no momento da leitura. O Neon usa PostgreSQL 18.7 e informou 21.600 segundos de retenção histórica. O snapshot de 16/11 foi listado, mas antecede o incidente e as gravações posteriores. A leitura atual do WAL é apenas uma referência de catálogo.

O [preflight](sql/ABELHA-PRODUCAO-036-PREFLIGHT.sql) agora inclui versão, privilégios efetivos da role, chaves de referência, índices novos, atividade e contagens do vínculo de convites. O [SQL de aplicação](sql/ABELHA-PRODUCAO-036-APLICAR-AUSENTES.sql) manteve o SHA256 indicado abaixo. Seus dez corpos coincidem com as migrations de origem. Em PGlite 18.6 com dados sintéticos, o pacote preservou os fingerprints legados, vinculou o convite determinístico, passou de 36 para 40 tabelas, recusou estrutura parcial e reaplicação e reverteu a transação quando uma mutação sintética foi detectada no pós-check. Concorrência produtiva e recuperação do Neon requerem validação própria.

1. Após autorização, registrar as configurações atuais e conter deploys da `main` nos dois provedores. No Render, alterar o serviço produtivo para `Auto-Deploy Off`. No Vercel, usar **Settings → Build and Deployment → Ignored Build Step → Only build preview** ou outro controle de produção comprovado para este projeto. Conferir também filas e os aliases atuais antes de liberar qualquer publicação manual. [Configuração de projeto Vercel](https://vercel.com/docs/project-configuration/project-settings).
2. Confirmar conexão direta com TLS, branch, compute, banco, role e origem de dados. Preparar e verificar um ponto de recuperação recente imediatamente antes da mudança. Registrar UTC, WAL, prazo de retenção e validação em destino separado autorizado. Usar os IDs do ambiente produtivo já registrados neste documento e validar o destino isolado antes de qualquer ensaio. O snapshot histórico permanece como proteção complementar.
3. Reservar uma janela sem escritores e verificar serviços, rotinas agendadas, webhooks, sessões longas e esperas de lock. O pacote compara fingerprints de 36 tabelas e começa com locks `SHARE` em quatro. DDL eleva locks para `ACCESS EXCLUSIVE`. Estimar volume e tempo de varredura em cópia isolada. Interromper se houver escritor ativo, conflito de lock, falta de privilégios, snapshot sem validação ou tempo incompatível com a janela.
4. Rodar o preflight pela mesma conexão que fará a aplicação. Conferir 36 tabelas, nenhum objeto parcial, índices únicos compostos válidos em `users(organization_id,id)` e `clients(organization_id,id)`, índice canônico de e-mail e zero vínculos que desapareceriam da gestão após o backfill. Convite resgatado sem vínculo determinístico exige revisão da diferença antes de qualquer escrita. Validar o acesso da role do runtime aos novos objetos antes de reabrir os escritores.
5. Executar o pacote aprovado em uma sessão `psql -X -v ON_ERROR_STOP=1`, com `-c 'SET search_path = public, pg_temp'` e em seguida `-f` para o SQL de aplicação. Usar um serviço de conexão privado com `sslmode=verify-full`. O pacote abre e encerra a própria transação. Conferir o SHA do SQL, preservar os timeouts de 5 e 60 segundos e guardar apenas evidências agregadas. Qualquer falha antes do commit encerra a sessão e reverte a transação.
6. Depois do commit, conferir 40 tabelas, colunas e definições dos sete índices previstos, constraints validadas, resultado dos fingerprints e vínculo pós-backfill. Com uma sessão explicitamente autorizada, fazer smoke de leitura da sessão, `/api/v1/quote-models`, listas de propostas/histórico e projetos privados. Conferir negações de acesso usando identidades sintéticas autorizadas. Se houver ensaio de gravação autorizado, usar somente fixture própria com limpeza verificável. Saúde HTTP isolada é insuficiente.
7. Se a validação falhar depois do commit, conter as gravações, registrar estado e novas transações e avaliar reparo aditivo ou recuperação em destino separado. A decisão de restaurar produção exige autorização própria e plano para preservar as gravações posteriores. Manter a publicação do novo frontend bloqueada até CI real, homologação do mesmo SHA e aceite humano.

As seções seguintes registram o diagnóstico e as condições de 26/11.

Estado: aberto; nenhuma alteração produtiva executada nesta missão. A aplicação publicada consulta `quote_models`, ausente no banco produtivo; o erro PostgreSQL 42P01 já foi confirmado. A recuperação não depende de Busca Lead ou WhatsApp.

Leitura de 26/11/2026 às 21:35:49.666 UTC: projeto Neon `curly-river-94350351`, branch `br-square-sunset-acpb91u2`, compute `ep-wandering-pond-acitqqn8`, banco `neondb`, 36 tabelas; ausentes `quote_models`, `quote_proposals`, `quote_proposal_prompts` e `auth_rate_buckets`. Referência WAL `0/B1FE6D0`. Esta referência temporal não é backup nem restauração ensaiada: confirmar retenção e gerar proteção recuperável imediatamente antes de qualquer intervenção autorizada.

## Decisão recomendada

Preferir B: avanço controlado e aditivo do schema, com as dez migrations já homologadas no HML. O candidato de aplicação é conhecido; a divergência está no schema produtivo. O pacote preserva os registros legados, verifica fingerprints e aborta em caso de estrutura parcial.

A alternativa A exige artefato legado comprovadamente disponível e compatível com todos os fluxos necessários. `b0442f9` ainda depende de `quote_models` e não resolve integralmente o incidente. A disponibilidade e a qualificação integral de um artefato anterior não foram comprovadas; metadados antigos de deploy não garantem possibilidade de rollback. Não executar rollback por tentativa.

## Sequência para autorização e execução posterior

1. Autorizar especificamente contenção e recuperação produtiva. Identificar operador, janela e responsáveis pelo aceite. Preservar a aplicação e os serviços existentes.
2. Desativar auto-deploy do Render produtivo `srv-daldd0142hec73c3ltt0` e impedir publicação automática produtiva do Vercel antes de qualquer push manual. Atualmente Render produção permanece com auto-deploy ligado; HML está desligado. Não confundir esses controles. Nenhum deles foi alterado aqui.
3. Reconfirmar os SHAs e os destinos por leitura. Backend observado: `000660b0f01d6dbe16101e1d4d815ee6013786e4`; frontend produtivo observado: `844f9484fdcc1aac292bfa7c40bc93026f5a4323`, cujo delta é documental. Não promover o Preview durante a recuperação do schema.
4. Confirmar janela de restauração Neon vigente, ponto anterior à intervenção e backup recuperável. Validar a recuperação em destino separado autorizado; não restaurar o banco produtivo por ensaio. O ponto temporal acima expira com a retenção e deve ser atualizado.
5. Executar somente o [preflight de leitura](sql/ABELHA-PRODUCAO-036-PREFLIGHT.sql), por conexão privada previamente conferida. Comparar todas as colunas e índices, além das quatro tabelas. A migration de `account_invites` já aplicada não integra o pacote.
6. Se e somente se as dez migrations estiverem integralmente ausentes e o baseline corresponder, revisar e executar uma única vez [o pacote transacional](sql/ABELHA-PRODUCAO-036-APLICAR-AUSENTES.sql), usando `psql` com `ON_ERROR_STOP=1` e a conexão produtiva privada. Não colocar a URL no histórico do terminal ou relatório. SHA256 do pacote preparado: `ce58172059f3d83a4cf6bfa85b1625ce59e63b84fb76d48d4515e996dd9c4428`.
7. Conferir COMMIT, 40 tabelas, constraints/índices válidos e fingerprints legados preservados. Fazer smoke autenticado mínimo com fixture própria identificável e limpeza verificável: sessão, modelo, proposta/histórico e isolamento. Não reutilizar contas de clientes como fixture.
8. Somente após recuperação e gates de lançamento aprovados, publicar manualmente o candidato escolhido, alinhar frontend/backend e verificar HTTPS, sessão e banco. Manter auto-deploy desligado até decisão explícita. Publicação e aceite são decisões separadas.

Ordem das dez migrations: quote_models → signup_email → password_reset → member_modules → quote_proposals → managed_accounts → project_pipeline → quote_proposal_decisions → auth_rate_buckets → quote_proposal_workflow. Nenhuma deve ser reaplicada no HML.

## Critérios de interrupção

Interromper antes da escrita se destino, autorização, retenção, proteção recuperável, hash ou baseline divergirem. Estrutura parcial exige recompor o plano com somente as migrations ausentes; não executar o pacote fechado. Durante a transação, lock timeout de 5 s, statement timeout de 60 s, fingerprint divergente, constraint inválida ou erro SQL exigem rollback e investigação. Não usar reset, seed ou DOWN destrutivo.

Após COMMIT, falha de smoke exige conter novas gravações e avaliar correção aditiva ou recuperação coordenada para destino separado. Restaurar ponto anterior pode perder gravações posteriores; exige inventário dessas gravações e autorização própria. Não alternar automaticamente entre rollback de código e restauração de dados.

O pacote foi preparado e inspecionado estaticamente; sua execução conjunta em PostgreSQL produtivo não foi realizada. A homologação anterior refere-se às migrations de origem no HML, não constitui execução deste pacote em produção.
