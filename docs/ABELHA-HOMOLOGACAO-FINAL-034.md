# Abelha — homologação final 03.4

Data: 26/11/2026. Resultado: **migration nova homologada no banco HML; candidato ainda sem homologação HTTP remota. Publicação não liberada.** Desenvolvimento congelado, sem alteração funcional nesta rodada.

## Candidato e infraestrutura

- SHA confirmado na `main` local e remota: `000660b0f01d6dbe16101e1d4d815ee6013786e4`. Commit/push foram realizados pelo proprietário antes desta verificação. Nenhum stage, commit, push, merge ou criação de branch nesta missão.
- A referência remota `codex/homologacao-abelha` não foi encontrada. A branch local de mesmo nome está em `37f989809041aff6150b3ec3405bdda65622adf8`, com trabalho divergente; não contém o candidato atual completo. Não basta enviar essa branch antiga.
- Procedimento manual: revisar a divergência e conciliar o candidato pretendido com a referência HML existente, preservando o trabalho divergente; publicar manualmente essa referência e informar o SHA autorizado. Não usar reset, force-push ou envio adicional à `main` como atalho. Depois conferir novamente o SHA remoto e configurar somente Render HML e Vercel Preview para ele.
- Render HML: `srv-dbr3if3tqb8s73cr2jn0`, <https://abelha-gestor-api-hml.onrender.com>, branch configurada `main`, auto-deploy **desativado**. Nenhuma configuração ou implantação alterada. A evidência anterior em `94ccaa0` não homologa o candidato.
- Vercel Preview: nenhum deploy novo. O Preview anterior `dpl_EW8CdwrcS4EGPH2ptvBEouXxawxc`, também de `94ccaa0`, continua evidência histórica. Não foi publicado frontend isolado para inferir funcionamento integrado.
- O manifesto 03.3 original foi preservado. Após normalizar CRLF para LF, os arquivos do candidato conferidos correspondem ao 03.3, exceto o roadmap; hashes brutos diferem por checkout com conversão de finais de linha. O manifesto derivado 03.4 registra a revisão e evidências atuais, sem declarar os builds locais como artefatos remotos desse SHA.

## Alerta de produção — somente leitura

O push manual à `main` acionou as publicações automáticas existentes. Render está `live` no deploy `dep-dc45o8mtlv9c73fq2b9g`; Vercel está `READY` no deploy `dpl_92GZGAUQP9E82poAyPpgVKe1wE2P`. Ambos informam o SHA `000660b0f01d6dbe16101e1d4d815ee6013786e4`.

O catálogo de `neondb`, branch `br-square-sunset-acpb91u2`, compute `ep-wandering-pond-acitqqn8`, não contém os marcadores das dez migrations abaixo. Existe risco concreto de incompatibilidade do código publicado com o schema, inclusive nos fluxos de autenticação e propostas. `READY/live` não certifica funcionamento. Nenhuma alteração, migration, rollback ou teste com dados reais foi executado em produção nesta missão. Recuperação da aplicação ou atualização desse banco exige autorização específica separada; a autorização de HML não se estende a produção.

## Migration 20261129 — PASS PostgreSQL HML

Aplicada exclusivamente `backend/src/db/migrations/20261129_quote_proposal_workflow.sql`, após confirmação do destino e autorização do Prompt 03.4:

- Neon `curly-river-94350351` / branch `br-hidden-night-ace956m0` / compute `ep-crimson-snow-acmuhqgp` / banco `abelha_homologacao`.
- Ponto anterior à aplicação: `2026-11-26T16:30:59.005Z`, WAL `0/4319660`; retenção configurada de 21.600 segundos. Não foi executada restauração; esse ponto é histórico e sua disponibilidade deve ser reconfirmada antes de recuperar.
- DDL em transação com `lock_timeout=5s` e `statement_timeout=60s`; nove migrations anteriores não reaplicadas. A primeira tentativa de preparar múltiplos comandos foi rejeitada e revertida; a transação corrigida foi concluída uma vez.
- Fingerprints das linhas das **39 tabelas preexistentes** iguais antes/depois, ignorando apenas as duas colunas adicionadas a propostas. Schema final: **40 tabelas**. Não havia propostas preexistentes; a conversão de propostas legadas não vazias permanece comprovada pelo teste local 03.3, sem inventar legado real no HML.
- Role de aplicação `abelha_hml_app` confirmada por conexão TLS ao endpoint pooled HML e com acesso à nova tabela. Nenhum GRANT ou credencial alterado.

Regressão SQL dirigida, com organização e dois proprietários sintéticos da mesma organização, identificados por prefixo `hml034-`:

| Verificação | Resultado e limite |
| --- | --- |
| Transições e histórico comercial | `draft → sent → awaiting_approval → decisão`; três eventos persistidos |
| Concorrência PostgreSQL real | Duas transações com `SELECT ... FOR UPDATE`: uma decisão aceita e outra recusada pela lógica de conflito; retornos sintéticos 200/409, **não HTTP** |
| Histórico de prompts | Versões `generated` e `edited` persistidas |
| Isolamento | FK composta recusa prompt atribuído a outro usuário da mesma organização (`23503`); consulta com escopo do segundo usuário retorna zero. Não constitui nova validação dos guardas HTTP nem RLS |
| Decisão e snapshot | Estado contraditório recusado (`23514`); modelo, quantidades, valores, briefing e texto iguais após decisão |
| Catálogo | Zero constraints não validadas e zero índices inválidos |
| Limpeza | Organização sintética e dependências removidas; contagens e fingerprints das 40 tabelas iguais ao início do teste |

Recibo privado: `.abelha-homologacao/migration-034-result.json`. Nenhum dado de cliente ou segredo foi incluído no relatório. O cliente SQL foi encerrado, e o processo específico do runner não permaneceu ativo; nenhum servidor ou worker foi iniciado nesta rodada.

## Testes remotos e integrações

| Gate | Estado atual |
| --- | --- |
| HTTPS, cookies Secure, CORS, autenticação e cold start | BLOCKED para o candidato: falta referência HML remota conciliada e autorizada |
| Cadastro/permissões, isolamento por API, Kanban, calculadora/pipeline, orçamento, prompts e remoção de Templates | BLOCKED para o candidato remoto; não reutilizar evidência 03.1 para as operações alteradas no 03.3 |
| PWA, Dark Mode e carregador automático | Baseline local preservado; nova validação do Preview pendente |
| Suítes locais | Baseline 03.3: 93 backend, 50 frontend, 126 rotas e bundle principal 267,60 kB. Não foram repetidas nesta rodada |
| E-mail | Nenhuma caixa autorizada; Resend/remetente do runtime HML não certificados. Não houve envio |
| Codex → Segundo Cérebro → Abelha | **Requisito original obrigatório, BLOCKED operacionalmente**: não houve evento real de encerramento, vínculo operacional comprovado, envio real ou atualização verificável do histórico/progresso. Teste manual não certifica automação |
| Busca Lead | Implementação preservada; sem novas investigações. Manter falha segura e alternativa documentada em `ABELHA-BUSCA-LEAD-033.md`, sem contratar provedor |
| WhatsApp | Desabilitado até instância exclusiva e destinatário/número de teste autorizados |

Para e-mail: no Render HML, conferir privadamente a presença de `ABELHA_OTP_RESEND_API_KEY`, `ABELHA_OTP_FROM` e `ABELHA_OTP_SECRET`; no Resend, confirmar domínio/remetente verificado e permissão da chave. A capacidade de leitura de variáveis Render não está disponível no conector desta sessão; não usar uma atualização como tentativa de leitura. Conferir `FRONTEND_URL`, `AUTH_URL`, CORS e origem do Preview HML sem copiar valores secretos. O proprietário deve indicar uma caixa específica autorizada. Depois executar OTP e recuperação, comprovar recebimento, expiração, consumo único e revogação de sessões. Configurar provedor não comprova entrega.

Para integração automática: reutilizar os scripts e contrato de `ABELHA-INTEGRACAO-033.md`; confirmar projeto/repositório, token dedicado restrito ao HML, pasta técnica do projeto no cofre e evidência real de Actions aceita pelo contrato. O checkout não contém `.codex/hooks.json`. Um evento `Stop` isolado encerra turno, não comprova conclusão técnica. É necessário ensaiar um evento real do cliente com declaração estruturada de conclusão, notas/comprovante, UUID no histórico e progresso derivado de marcos revisados. Relatório deve continuar `pending_review`, sem aceite ou publicação automáticos. Nenhuma configuração global foi feita. Se o cliente exigir registro global de MCP/hooks, solicitar antes autorização para a definição exata e escopo; a necessidade global ainda não foi comprovada. A ausência da automação impede afirmar esta missão integralmente concluída, sem transformar a integração em opcional permanente.

## Produção — sequência preparada, NÃO executada

Consulta somente ao catálogo em 26/11/2026 encontrou **todos os dez marcadores ausentes**. Isso verifica estruturas faltantes, não um histórico de execução de migrations. `20261125_account_invites.sql` já foi aplicada anteriormente e fica fora da sequência. Antes de executar, conferir cada arquivo integralmente contra colunas, defaults, constraints e índices; se houver estrutura parcial ou divergente, parar e conciliar sem reaplicar às cegas.

| Ordem | Migration potencialmente pendente | Marcador ausente observado |
| --- | --- | --- |
| 1 | `20261125_quote_models.sql` | tabela `quote_models` |
| 2 | `20261125_signup_email.sql` | `users.email_verified_at` |
| 3 | `20261125_password_reset.sql` | `users.password_reset_version` |
| 4 | `20261126_member_modules.sql` | `users.member_projects_enabled` |
| 5 | `20261126_quote_proposals.sql` | tabela `quote_proposals` |
| 6 | `20261127_managed_accounts.sql` | `users.account_disabled_at` |
| 7 | `20261127_project_pipeline.sql` | `personal_projects.pipeline_stage` |
| 8 | `20261127_quote_proposal_decisions.sql` | `quote_proposals.refused_at` |
| 9 | `20261128_auth_rate_buckets.sql` | tabela `auth_rate_buckets` |
| 10 | `20261129_quote_proposal_workflow.sql` | tabela `quote_proposal_prompts` |

1. Resolver separadamente o risco da produção já publicada, mediante decisão autorizada do proprietário. Identificar a revisão compatível e confirmar disponibilidade do retorno; não presumir que o deploy anterior basta.
2. Concluir o Preview/Render HML do mesmo SHA, regressões dirigidas, e-mail autorizado e integração obrigatória. Congelar novamente o SHA aceito e os hashes dos dez arquivos. Publicação depende de aprovação explícita posterior.
3. Antes de qualquer DDL produtivo, confirmar projeto/branch/compute/banco e role; comparar schema integral com os dez scripts e selecionar **somente os realmente ausentes**. Registrar ponto de recuperação fresco, retenção e procedimento de restauração verificado; preservar fingerprints de dados preexistentes e decisões/snapshots.
4. Em janela aprovada e antes de liberar código dependente, aplicar a lista aprovada na ordem acima, com transações, timeout de lock e checagens de integridade; não repetir migrations presentes, seed, reset ou DROP. Se a ferramenta envolver cada lote em transação, remover somente BEGIN/COMMIT externos e enviar comandos preparados individualmente. Parar em qualquer divergência, sem continuar parcialmente às cegas.
5. Confirmar compatibilidade e integridade do schema, dados legados, constraints, índices e permissões. Só então publicar/promover manualmente backend e frontend no mesmo SHA autorizado, com destinos e credenciais exclusivos de produção. O fato de o SHA já ter sido publicado automaticamente não substitui este gate.
6. Fazer smoke autorizado de saúde, login, cookie, escopo, contas e propostas, sem usar dados de cliente como fixture. Se falhar, suspender avanço e executar apenas o plano de retorno aprovado. Não remover tabelas/colunas para retornar aplicação; restauração destrutiva requer decisão própria.
7. Liberar usuários gradualmente após aceite humano e encerrar recursos temporários. Busca Lead indisponível e WhatsApp desabilitado não impedem áreas independentes já homologadas; a homologação remota e a integração automática continuam pendências indispensáveis desta missão.

## Pendências e autorizações restantes

1. Ação manual do proprietário: conciliar/publicar a referência HML existente e confirmar SHA. Depois prosseguir somente com Render HML (auto-deploy off) e Vercel Preview apontados exclusivamente ao Neon HML.
2. Informar e autorizar caixa de teste; conferir remetente e configuração privada HML do Resend.
3. Confirmar vínculo do projeto/pasta técnica, evidência Actions real e confiança da definição de hook no cliente. Caso registro global seja indispensável, apresentar definição exata para autorização antes de alterar qualquer configuração global.
4. Autorização separada para tratar a incompatibilidade de produção e, futuramente, para publicação/migrations produtivas. Nenhuma autorização produtiva foi inferida do Prompt 03.4.

Prontidão: **não liberado para publicação; banco HML atualizado e preservado, gates remotos e operacionais explicitamente abertos**. Não avançar para outra tarefa.
