# Abelha — relatório operacional 03.6

26/11/2026. Estado: encerramento parcial verificável; lançamento ainda não liberado. Escopo funcional congelado. Sem stage, commit, push, merge, branch nova, reaplicação de migration ou alteração produtiva.

## Candidato e gates encerrados

Frontend Preview e backend HML confirmados no SHA `000660b0f01d6dbe16101e1d4d815ee6013786e4`. Render `srv-dbr3if3tqb8s73cr2jn0`, deploy manual `dep-dc470ut9el5s73adq0t0`, live; auto-deploy off. Vercel `dpl_DFU9eP7P2e9LaJuRvX4W8tNJVVg9`, READY/Preview. Checkout local `844f9484fdcc1aac292bfa7c40bc93026f5a4323`, delta somente documental.

Reconexão após rotação comprovada em Neon HML: `br-hidden-night-ace956m0`, `ep-crimson-snow-acmuhqgp`, banco `abelha_homologacao`, role `abelha_hml_app`, TLS. Smoke HTTPS dirigido passou: saúde, login/sessão com cookie Secure, leitura autenticada de modelos com escopo e logout. Fixtures removidas e fingerprints das 40 tabelas preservados. As dez migrations HML não foram reaplicadas. Baseline 93/50 reaproveitado; nenhuma suíte completa repetida.

Cold start real: último acesso do runner às 17:52:17 UTC, primeira requisição seguinte às 21:28:27 UTC; HTTP200/applicationReady em 12.468 ms. Logs Render registraram início do runtime durante a requisição, às 21:28:34 e 21:28:35 UTC. Nenhum restart/suspend/deploy foi usado para simular repouso. Evidência privada: `cold-036-result.json` e lifecycle correspondente.

## Experiência

Artefato compilado existente conferido por 25 hashes, sem reconstrução. Perfil isolado com dados sintéticos: voo automático animado da abelha, ausência de botão manual e ausência de overflow em 390 px no login, visão geral, calculadora e conversas. Evidência privada: `experience-036/result.json` e capturas; o status global da primeira execução falhou por ativação do worker no perfil temporário, sem invalidar as asserções UI já registradas.

PWA repetida exclusivamente em perfil temporário adequado: instalação real no perfil do navegador, worker ativo/controlador, 28 entradas estáticas, API fora do cache, shell público offline com conteúdo privado oculto e reconexão aprovados. Instalação temporária desfeita, navegador/servidor/perfil removidos. Evidência: `experience-036/pwa-result.json`. O ensaio usou origem loopback isolada e o artefato do candidato; não certifica instalação física em telefone ou offline do Preview protegido. Proteção Vercel preservada.

Dark Mode: permanece escuro após recarga e mudanças do tema do sistema. Não existe controle de alternância no código atual. A alternância pedida está pendente por comportamento da aplicação, não por limitação da proteção Vercel. Nenhuma funcionalidade nova foi acrescentada durante o congelamento.

## E-mail real

PASS exclusivamente na caixa autorizada: OTP e link de recuperação efetivamente recebidos e informados pelo proprietário; cadastro com email_verified_at; códigos expirados rejeitados; cadastro/reset válidos; reutilização rejeitada; duas sessões anteriores recusadas com401 após troca da senha; novo login aprovado. A expiração foi validada alterando somente timestamps dos registros sintéticos próprios, sem aguardar expiração natural. Evidência privada: `mail-036-result.json`, status PASS e limpeza/fingerprints40tabelas iguais. Nenhum código, token ou destinatário integra este documento. O arquivo de entrada foi consumido/removido. A primeira tentativa, interrompida pelo canal de entrada, também foi limpa antes da repetição.

Remetente observado pelo proprietário: domínio `resend.dev`; link recebido usava rastreamento Resend. O token foi extraído sem seguir o redirecionamento e invalidado pelo uso único. A entrega real e a configuração funcional HML estão comprovadas; não se certificou domínio próprio. O domínio padrão é restrito a teste na caixa da conta, conforme [documentação oficial](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain). Antes de liberar cadastros para outras pessoas: Resend → Domains → Add Domain, adicionar domínio controlado pelo proprietário, publicar os registros DNS indicados e aguardar Verified; atualizar privadamente `ABELHA_OTP_FROM` para um endereço desse domínio, conferir a permissão de envio da chave existente e manter `ABELHA_OTP_SECRET` privado. Aplicar primeiro no HML, preservar SHA/auto-deploy off e fazer um envio autorizado dirigido. Produção requer autorização própria; não mudar suas variáveis nesta missão.

## Automação obrigatória

Componentes existentes revisados e reutilizados: abelha-project-mcp, complete-project-delivery, obsidian-task-receipt, verify-delivery e propostas035. Autorização específica recebida para hook por projeto e vínculo HML. Instalado `.codex/hooks.json` local/ignorado, apontando ao handler aprovado SHA256 `02672b38c00e56dafefc816bd302416040bf4544f553b0d33d9bffff32de3aa4`. Nenhuma configuração global foi alterada. Confiança do cliente e execução do hook ainda não foram observadas.

Vínculo canônico criado após verificar ausência de duplicata: projeto HML `a3e9e1cd-bcf7-47ee-9567-f7cecd7ec0a3`, repository `https://github.com/higoraranda/abelha-gestor`, pasta `04 - Projetos/Abelha/Entregas`. Token dedicado preparado privadamente; configuração no runtime Render HML ainda pendente. Não há comprovante UUID de entrega nem atualização automática de histórico/progresso nesta rodada.

O contrato exige teste aprovado com URL de run GitHub Actions do repositório. Não havia workflow/run adequado. Preparado [workflow CI sem deploy](../.github/workflows/ci.yml) para revisão e publicação manual; YAML verificado, nenhuma execução inventada. O contrato valida a forma da URL e repositório, não consulta conclusão/SHA no GitHub: conferir o run real durante revisão humana. Não criar envelope ready sem evidência técnica real. Um Stop isolado ou execução manual do script não encerra este gate.

Sequência pendente: conter deploy automático produtivo mediante autorização própria; proprietário publicar manualmente o workflow; obter run aprovado para o SHA efetivamente reportado; configurar privadamente token/escopo HML preservando o candidato e auto-deploy off; confirmar confiança do hook no cliente; preparar envelope ready com conclusão técnica e evidências reais; observar evento de conclusão, registro Obsidian, recibo UUID e relatório pending_review no Abelha; conferir histórico, bloqueios, próximos passos, progresso por marcos aceitos e duplicidade. Aprovação humana permanece obrigatória. A autorização do hook já foi concedida e não precisa ser pedida novamente.

Configuração HML restante: no serviço Render HML acima, definir `ABELHA_CODEX_REPORT_TOKEN` com o valor privado já preparado em `.abelha-homologacao/codex-hml.env`, sem colá-lo em chat; definir `ABELHA_CODEX_PROJECT_ID` para o UUID de vínculo acima e conferir que `ABELHA_CODEX_PROJECTS_JSON` não concede outro projeto. Preservar os IDs de organização/usuário HML existentes, a conexão Neon e todas as outras variáveis. O conector de variáveis Render dispara deploy da HEAD mesmo com auto-deploy off; após configuração, fixar explicitamente o SHA autorizado e reconferir a paridade antes do ensaio. Não recriar token/projeto a cada retomada. A instalação local do hook não equivale à confirmação de confiança pelo cliente.

## Produção e publicação

Incidente 42P01 continua aberto. Leitura produtiva confirmou 36 tabelas e ausência dos objetos novos; não usar HTTP200 do health como prova de compatibilidade. Backend observado em000660b e frontend em844f948 têm fontes funcionais iguais, mas schema incompatível. Auto-deploy produtivo permanece ativo; não orientar push na main antes da contenção.

Recomendação B e sequência detalhada em [incidente produtivo](ABELHA-INCIDENTE-PRODUCAO-036.md): contenção autorizada, recuperação verificável, preflight das dez migrations ausentes, aplicação transacional uma única vez e smoke mínimo. Dois SQLs preparados, nunca executados em produção. Rollback b0442f9 é insuficiente; artefato legado integralmente compatível não foi comprovado. Recuperação do incidente é independente dos provedores opcionais.

Busca Lead preservada, sem novas rodadas de pesquisa; alternativa documentada anteriormente permanece aplicável. WhatsApp desabilitado até autorização de instância exclusiva. Nenhum serviço contratado.

## Pendências e ações do proprietário

- Configurar remetente próprio verificado para destinatários além da caixa de teste; o ensaio real nessa caixa já foi concluído.
- Revisar/publicar manualmente o workflow após conter auto-deploy produtivo; confirmar confiança do hook local no cliente. Token HML e evento real continuam pendentes.
- Decidir tratamento da alternância de tema ausente dentro do congelamento.
- Autorizar especificamente contenção e recuperação produtiva proposta; não houve autorização para executá-las nesta missão.

Prontidão: HML alinhado e verificações direcionadas acima aprovadas; automação real e recuperação produtiva não concluídas. Não publicar como lançamento homologado integralmente. Mensagem de commit sugerida para revisão manual: `chore: prepara encerramento operacional e recuperação do Abelha`. Nenhuma operação Git de escrita foi realizada.

Roadmap e STATUS do Segundo Cérebro atualizados seletivamente via MCP. Manifesto privado: `.abelha-homologacao/rc-prompt036-manifest.json`; o digest identifica a árvore de documentação/configuração preparada, não um novo deploy. Verificação final: `git diff --check` aprovado, workflow YAML válido, sintaxe dos handlers/runners aprovada; nenhum teste completo repetido. Runners e perfis próprios encerrados; zero processos temporários correspondentes e zero listeners nas portas56230/62144, arquivo de entrada de códigos ausente. Serviços persistentes existentes preservados. O vínculo HML criado é configuração duradoura autorizada, não fixture a remover.
