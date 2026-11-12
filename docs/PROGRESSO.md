# Progresso — Abelha CRM + Personal

## Estado atual — Cloudfy/n8n — 12/11/2026

**Sete workflows criados diretamente na instância existente socialbaboon**, com autorização explícita, todos desativados e sem credenciais associadas. IDs/links/funções e passos manuais em [CLOUDFY-N8N.md](CLOUDFY-N8N.md); inventário persistente em [cloudfy-workflows.json](integrations/cloudfy-workflows.json). Não importar novamente.

- Os três workflows anteriores foram conferidos por ID e funcionalidade, inclusive metadados agregados de parâmetros; nenhum referencia Abelha. Seus estados e updatedAt foram preservados. Não houve leitura de execuções/pacientes ou valores secretos; nenhuma credencial de outro projeto foi reutilizada.
- Sete modelos completados: captura por webhook protegido com extração/classificação por regras; busca validada → Overpass no backend → candidato pendente; tick único agendado para finanças/contas/domingo/push; auxiliares contas/revisão manuais; monitor com HTTP de API autorizada configurável, validação e ingestão; relatórios Codex e relay GitHub com corpo binário/HMAC.
- Novo endpoint autenticado `/api/v1/integrations/leads/stage`, reutilizando validação da importação manual. Idempotência por origem/organização; sem criação automática de cliente/contrato/cobrança. Sem mudança adicional de migration. Desejos sem URL não bloqueiam monitores configurados; fonte sem configuração não consulta nem fabrica preços.
- Criação/releitura das definições no n8n comprovada: nós/conexões/settings conferidos, timezone America/Sao_Paulo, retenção privada desligada. Tipos compatíveis com os já usados na instância; versão exata não exposta pelo plugin. Execução no runtime real ainda precisa de credenciais e ensaio manual.
- Consulta pública **somente leitura** ao backend: auth/session200, rota nova prices/due404. A versão publicada ainda não contém essas integrações; exige publicação autorizada. Nenhum POST ao backend real, migration Neon ou dado comercial alterado.
- Verificações: **39 testes backend**, incluindo Code nodes exportados → HTTP real → postgres.js/PGlite; **13 testes frontend**, TypeScript/builds, ESLint sem warnings; **11 cenários Chrome** desktop/mobile/PWA; npm audit atualizado com **zero alertas** nos dois lockfiles. Regressões vistas falhar antes e passar após os fixes; revisão independente encontrou resposta `[]` da API de preços sendo omitida pelo HTTP node, corrigida com fullResponse e validação de body.
- Migration revisada e repetida apenas no banco efêmero; SHA256 inalterado `9812B2BD74ACC1FB983318BAB62590DA6CF8E92A1536E85032FB8B604F84DCDB`. Login/CSRF/cookie/sessão legada, isolamento e push seguem cobertos. VAPID e entrega em aparelhos físicos continuam pendentes.
- Prévia sintética PID21312 encerrada com confirmação; portas43170/59133 verificadas livres, browser fechado e testes fechando sockets em finally. Nenhum serviço temporário ativo; os workflows criados são entregáveis persistentes **desativados**, não processos em execução.
- Restante: configurar ambiente e credenciais manualmente conforme guia; escolher fonte de preços/conector email, confirmar versão n8n, ensaiar runtime/push; autorizar ambiente isolado, migration de produção, publicação e ativação. Sem deploy, commit, push ou PR.

Skills nesta continuação: Superpowers (planejamento, TDD, execução, verificação/revisão independente), Neon/Postgres para revisão da estratégia existente; plugin Cloudfy para inventário, criação e releitura. npm audit, Playwright/Chrome e documentação primária n8n complementaram a validação. Não foi provisionado serviço ou custo novo.

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

Referências para retomada: [roadmap](ROADMAP-ABELHA.md), [arquitetura](ARQUITETURA-PERSONAL.md), [configuração](GUIA-CONFIGURACAO.md), [PWA](GUIA-PWA.md), [integrações n8n](INTEGRACOES-N8N.md), [plano](superpowers/plans/2026-11-11-crm-personal.md), ../DESIGN.md e ../UX-CONTRACT.md.

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

Capturas sintéticas e browser-verification.json em `C:/Users/higor aranda/.codex/visualizations/2026/11/11/01a1cb6e-9819-7b11-be4e-df33f81e9dce/`. Não contêm dados reais da carteira.

### Próxima etapa concreta

Revisar a migration e os avisos de dependências; obter autorização específica para testar/ativar no ambiente Neon escolhido. Configurar VAPID, conta/token da integração, webhook GitHub e n8n. Escolher uma fonte autorizada de preços/classificação e testar os fluxos externos. Não fazer deploy/commit/push/PR sem autorização. Tudo que independe desses acessos foi implementado e verificado localmente; ativação externa não está concluída.

### Skills e ferramentas

Superpowers para leitura de contexto/planejamento, testes, depuração, verificação e revisão independente; Frontend Design + Premium para preservar identidade e contratos; Neon plugin/skills para inspeção estritamente de leitura; React Best Practices para hooks/tipagem/acessibilidade; Playwright/Chrome para fluxos reais sintéticos e mobile/offline; documentação primária MDN/Apple/Overpass/n8n/GitHub/Web Push para contratos externos. Sem novos serviços pagos.

---

## Histórico — 05/11/2026

**Reformulação implementada, validada e ativada no banco production após autorização explícita.** Nenhum registro pessoal foi usado em testes de gravação.

Base: main / 68647ab. Sem commit, push, PR ou publicação. Alterações anteriores de acesso pessoal preservadas. `.env` e conexão atual não foram alterados.

Referências: briefing-aprovado.md, escopo-implementacao.md, ../DESIGN.md, BANCO-REFORMULACAO.md e superpowers/plans/2026-11-05-reformulacao-abelha.md.

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
- Criada codex-abelha-reform-test-20261105, br-hidden-night-ace956m0, filha de production br-square-sunset-acpb91u2. Compute ep-crimson-snow-acmuhqgp limitado a 0,25 CU.
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

Capturas em C:/Users/higor aranda/.codex/visualizations/2026/11/05/01a1acaa-9bdc-7983-9a1a-5dc50dd63793/: abelha-test-pipeline.png, abelha-test-checklist.png, abelha-test-entregas.png, abelha-test-mobile-entregas.png, abelha-test-overview.png e abelha-test-pipeline-ganho.png. Arquivos com prefixo abelha-test mostram somente dados sintéticos de teste; capturas anteriores abelha-reform-* mostram a prévia antes da migration.

## Skills utilizadas

Superpowers (planejamento, execução, depuração, testes/verificação e revisão independente); Frontend Design + Premium (direção visual, acessibilidade e responsividade); Neon (branch e banco isolado); React Best Practices (estado/hooks/tipagem); Computer Use (navegador); Ponytail (solução individual sem infraestrutura extra desnecessária).

## Encerramento do escopo

Migration autorizada e aplicada; schema e consultas reais conferidos em leitura. Não há pendência de ativação do banco. Não foi solicitado nem realizado commit/push/PR/deploy. A próxima utilização local deve iniciar os serviços normalmente; nenhuma prévia foi deixada ativa.

## Ativação autorizada — 2026-11-05T22:33:12.4544902-03:00
Usuário autorizou aplicar a migration em production. Transação concluída pelo plugin Neon no projeto curly-river-94350351, branch br-square-sunset-acpb91u2, compute ep-wandering-pond-acitqqn8. SHA256 23465af517e20dc578f8fddfb05d5afb6ccc50c3a90ee68609131cc8f00d8e05. Verificação transacional de fingerprints preservou clientes/lembretes/contratos/cobranças/despesas; novos registros de negócio não foram criados. Pós-verificação: 4 tabelas, 2 colunas, 6 índices e zero schemas temporários. Smoke da aplicação real em conexão read-only: 14 consultas aprovadas. Prévia de leitura iniciada: backend21544/3000, Vite5800/4173, sessão50225; encerrar ao finalizar.

## Ativação final concluída

Migration 20261105_personal_crm aplicada em production com SHA-256 23465af517e20dc578f8fddfb05d5afb6ccc50c3a90ee68609131cc8f00d8e05. Fingerprints e contagens de clientes/lembretes/contratos/cobranças/despesas preservados na mesma transação. Pós-commit confirmou 4 tabelas, 2 colunas, 6 índices e zero schemas sintéticos. Novas tabelas de negócio ficaram sem registros fictícios.

Smoke real em conexão PostgreSQL restrita a leitura: 14 consultas HTTP aprovadas, incluindo exportações inspecionadas apenas em memória. Navegador: visão geral, clientes e novos módulos consultados sem erro; console limpo. Captura final abelha-ativado-desktop.png.

Prévia final encerrada: sessão50225; backend21544 e filho22428; Vite5800 e filho16540; auxiliar8256. Portas3000/4173 livres e aba fechada. Restrição read-only existiu apenas nas conexões temporárias, sem alterar banco global ou .env. Branch de teste segue com compute desativado/idle. Nenhum recurso temporário ativo desta execução.
