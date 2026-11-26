# Abelha — homologação integrada, Prompt 03.1

25/11/2026. **PASS para os contratos e fluxos testados no candidato local→PostgreSQL HML. BLOCKED para aceite da instalação remota e operação real dos provedores.** Não houve publicação ou ativação.

## 1. Ambiente efetivamente utilizado

Frontend Vite compilado e backend Express/Auth.js reais, na mesma origem de loopback, login obrigatório, `NODE_ENV=test`, listeners efêmeros em `127.0.0.1`. Contas e registros exclusivamente sintéticos; e-mail simulado em memória, sem entrega real.

Neon `curly-river-94350351`, branch `br-hidden-night-ace956m0`, compute `ep-crimson-snow-acmuhqgp`; host `ep-crimson-snow-acmuhqgp-pooler.sa-east-1.aws.neon.tech`. Identidade consultada pela conexão efetiva: database `abelha_homologacao`, role `abelha_hml_app`, PostgreSQL 18.7. Postgres.js com `ssl=require`; `pg_stat_ssl` descreve o salto interno pooler→Postgres sem SSL, não o TLS cliente→pooler. Endereço/database/role fixados antes das fixtures. Baseline: 39 tabelas, uma organização e um usuário.

Render HML `srv-dbr3if3tqb8s73cr2jn0` e Vercel `prj_Cd3vrf5gNVRmT3CjBJeX8saUrVVv` não receberam novo artefato. Fallback local autorizado para evitar push/main ou branch. Chat confirmado no projeto existente **Abelha CRM**, ID `4b5ba299-a12d-4242-9dc0-2a2866ac4ff2`, no diretório real do repositório.

## 2. Candidato e divergências

Manifesto original `working-tree-sha256:2bbfdc06251aa323807213fa512481899de12c2bb5a33d9bfdae07547aaf75c1`, em `Documents/ATLAS/Abelha/rc-prompt03-manifest.json`: digest interno confirmado e 123 registros de arquivos/migrations/lockfiles sem divergência no preflight. Base histórica `34918f9`; checkout já limpo em `030976f093517ac1d3438c01560e67a7a775c01e`, branch `feature/phase-01-multi-tenant-foundation`. A mudança de base precede esta rodada; nenhum commit foi feito aqui.

Candidato modificado nesta homologação: conversão de datas PostgreSQL na edição de contratos, regressão correspondente e diagnóstico de frames no teste do voo. Acrescentados runners, evidências e documentação. Migrations intactas e não repetidas. O manifesto derivado completo, `.abelha-homologacao/rc-prompt031-manifest.json`, identifica o conteúdo corrigido; não reutilizar o digest original para publicá-lo. O manifesto fica fora do conjunto versionável que ele próprio identifica.

## 3. Testes e resultados

| Verificação | Gate | Evidência |
|---|---|---|
| Backend | PASS local | `npm test`: 90 testes, zero falhas; TypeScript incluído. |
| Frontend | PASS local | 50 testes, lint e build TypeScript/Vite, zero falhas. |
| Matriz HTTP | PASS HML | 123 rotas, 785 asserções registradas; 123 positivas e 121 negativas. |
| Isolamento complementar | PASS HML | 23 verificações HTTP por recurso, inclusive titulares na mesma organização; SQL confirma ausência de mutações. |
| Contas | PASS HML/browser | Convite, OTP simulado, cadastro, login/logout, recuperação/reset, token único e revogação de sessão anterior em 1440/390 px. |
| Administração | PASS HML | Convites/revogação, administração por emissor, ativação/desativação, concessão/revogação dos cinco módulos e recusa de autoconcessão. |
| Interface integrada | PASS HML/browser | Dashboard e 15 URLs do proprietário em ambas as larguras; onboarding, cinco módulos do membro, preferências e criação de projeto persistida. |
| Kanban | PASS HML/browser | Movimento UI→HTTP→SQL→recarga em desktop/mobile, com marcos e aceite separados. |
| Dark Mode/responsividade | PASS browser | 1440/390 px, sem overflow horizontal; capturas conferidas, sem redesign. |
| Console | PASS browser | Zero erros JavaScript/console nos caminhos saudáveis; falhas de rede deliberadamente injetadas separadas. |
| PWA/contingência | PASS HML/browser | SW ativo, 28 entradas públicas, zero APIs em cache; raiz `/` offline sem área privada e reconexão autenticada sem logout; health recupera automaticamente. |
| Abelha/carregador | PASS local/browser | Nove grupos: voo automático, ausência de botão manual, movimento reduzido, geometria e recuperação. |
| Módulos sob demanda | PASS local/browser | Login 267.601 bytes JS, panorama 396.478, após Projetos 419.518; falha de chunk mantém navegação. |
| Limitador compartilhado | PASS HML | Dois pools PostgreSQL: 12 concessões/16 tentativas de login, quatro/seis de reset; sucesso reabre orçamento por identidade. Configuração exclusiva desta rodada. |

Tentativas iniciais do runner foram interrompidas no PWA: `/login` não tem shell offline e uma flag do harness mantinha o health artificialmente em 503 durante a espera por reconexão. Esses registros foram preservados em histórico privado. PWA foi isolado no runner complementar, separando falha injetada de erro esperado; os fluxos autenticado e anônimo passaram. **A rodada integrada final e os três runners complementares terminaram com código zero.** Não há falha pendente nos cenários executados.

O teste temporal do voo falhou inicialmente sob execução Chrome concorrente. A repetição isolada passou nos nove grupos, sem alterar limiares ou animação. Frames foram acrescentados ao diagnóstico; permanece uma limitação de estabilidade temporal desse teste sob concorrência.

## 4. Cobertura das rotas

Anterior: 61 positivas, 121 negativas, 60 rotas somente negativas. Atual: **123 positivas, 121 negativas; nenhuma rota somente negativa no contrato HTTP testado**. Os dois healths são públicos. Há 785 asserções da matriz e 23 complementares por recurso; Auth.js e testes visuais não aumentaram artificialmente o total de rotas.

**119 positivas** usam autenticação/API/HML reais sem provedor de saída simulado. **Quatro positivas** usam o mesmo backend/banco e Overpass/Evolution simulados: duas entradas de busca, pareamento já conectado sem QR e envio com persistência real da mensagem sintética. Não certificam fonte pública ao vivo, pareamento, entrega de WhatsApp, DNS/TLS do provedor ou motor externo de automações.

Casos/status por endpoint: [matriz](ABELHA-MATRIZ-DE-ACESSO.md) e [recibo estruturado](ABELHA-EVIDENCIA-HML-031.json). A evidência local PGlite anterior foi preservada em seção separada.

## 5. Evidências de isolamento

- A/B igualmente autorizados: projetos/modelos/ciclos/assinaturas/preços alheios ausentes nas listas; IDs alheios em mutações retornam 404. Proprietário não herda recursos dos membros.
- Casos repetidos **na mesma organização**, separando filtro por usuário de filtro por organização. SQL confirma revisão/valor/estado originais, nenhum lançamento indevido e projeto preservado.
- Proprietários de organizações distintas: clientes, contratos, tarefas, oportunidades, agenda, conversas, projetos e propostas protegidos por recurso.
- Proprietários distintos na mesma organização: propostas/prompts/decisões, avisos e conclusão de marcos alheios retornam 404; SQL confirma marco aberto, aviso não lido, proposta sem decisão e nenhum update alheio.
- Administração exige emissor do convite: outro proprietário da mesma organização não lista, concede módulos ou desativa o membro.
- Tokens de integração válidos não alcançam projeto de outro titular na mesma organização.
- Revogação de módulo recusa API com 403. Recusa por papel **não foi tratada como isolamento horizontal**. URLs diretas não restauram módulos, contas desativadas ou sessões revogadas.
- Troca A→B no mesmo navegador remove conteúdo privado da UI; nenhuma API em Cache Storage. RLS não foi afirmada: a comprovação é das regras da API.

## 6. Falhas corrigidas

Aplicação: edição parcial de contrato retornava 400 quando datas existentes chegavam como objetos `Date` pelo Postgres.js. `resolveContractInput` converte somente esses objetos em datas civis; texto HTTP mantém validação estrita. Teste novo falhou antes e passou depois; edição real HML também passou. Sem migration.

Harness: configuração de credenciais/projeto sintéticos, status 204, seletor Kanban, espera de checkbox assíncrono e limpeza de convites antes dos usuários emissores. Uma rejeição Playwright não tratada interrompeu uma tentativa; fixtures recuperadas pelo identificador exato da rodada, com as 39 tabelas restauradas. Ajustes de harness não foram apresentados como falhas do produto.

Revisão final também corrigiu a limpeza do limitador: chaves e pruning confinados ao namespace da rodada, sem tocar `login:global`/`reset:global` compartilhados. Organizações preexistentes são recusadas na limpeza; falhas de fechamento do navegador/contexto ainda executam o encerramento do HML. Os quatro recibos finais registram hashes das fontes, builds e scripts capturados no início; o exportador exige igualdade do binding completo, inclusive harness, e publica os hashes efetivamente executados. A preparação do inventário ocorre antes de criar recursos.

## 7. Integridade dos dados e recursos

Contagens e fingerprints ordenados das **39 tabelas iguais antes/depois de todas as rodadas finais**, incluindo usuário e organização preexistentes. As duas recuperações de tentativas interrompidas também confirmaram 39/39. Limpeza somente das fixtures identificadas e respectivas dependências/chaves de limitador; nenhuma fixture remanescente.

Listeners/pools SQL/contextos Chrome/Vite e auxiliares iniciados encerrados; PIDs e portas registrados e conferidos no encerramento. Serviços persistentes preexistentes preservados.

## 8. Funcionalidades e desempenho

Homologadas nos limites acima: contas, módulos, onboarding, preferências, dashboard/navegação, finanças pessoais, assinaturas, preços, calculadora, projetos/Kanban, propostas/aprovação/prompt, revisão de relatório/marco e CRUD legado do proprietário. E-mail e produtores externos mantêm a distinção entre simulação e operação real.

JS principal permanece **267,60 kB minificado**, contra baseline documentado de 500,27 kB. Backend local→Neon HML, 210 respostas 2xx instrumentadas: mediana 48 ms, p95 253 ms, máximo 370 ms. Inclui aquecimento/fixtures deste computador; não é SLA, carga, cold start Render ou latência de usuários finais. PWA ainda faz precache de todos os módulos públicos.

## 9. Gates restantes e próximo passo

| Gate | Estado | Próximo passo |
|---|---|---|
| Contratos/fluxos locais→HML | PASS | Revisar diff, relatório e manifesto derivado. |
| Banco/migrations previamente aprovados | PASS preservado | Não repetir sem divergência concreta. |
| Preview remoto HTTPS/cold start | BLOCKED | Transporte autorizado sem push/main; conferir runtime, cookies Secure/CORS e mesma versão frontend/backend. |
| Entrega real de e-mail | BLOCKED | Remetente e caixa de teste expressamente autorizados; esta rodada aprovou simulação. |
| Provedores reais/WhatsApp/automações/MCP instalado | BLOCKED | Autorizações e testes específicos; contrato simulado não equivale a ativação. |
| PWA em aparelho físico | BLOCKED | Instalação/entrega exigem aparelho e etapa próprios; raiz offline no Chrome já passou. `/login` offline não é suportado pelo SW vigente. |
| Publicação | BLOCKED | Nova autorização, revisão do RC corrigido e plano de publicação/migrations de destino. |

Pendência histórica: Vercel Production observado em `34918f9` e Render Production em `b0442f9` na auditoria anterior. Divergência não corrigida nesta rodada; esses SHAs não foram revalidados como estado remoto atual. Não assumir alinhamento na publicação final.

## 10. Produção e encerramento

Nenhuma operação desta execução alterou produção. Sem stage, commit, push, merge, branch nova, deploy, migration, credencial/configuração global alterada, envio real de e-mail/WhatsApp, vínculo de número, ativação de automação ou contratação. Alterações locais disponíveis para revisão manual. Execução encerrada antes de integrações/publicação.

Reprodução: compilar backend/frontend, manter o arquivo privado HML existente e executar os runners na raiz com `ABELHA_RUN_REAL_HML=031`: `backend/scripts/verify-integrated-hml.cjs`, `verify-hml-supplement.cjs`, `verify-hml-provider-contracts.cjs`, `verify-hml-cross-resource.cjs`. Todos fazem suas fixtures/limpeza e recusam outro database/role/endpoint. Playwright/Chrome podem ser indicados por `ABELHA_PLAYWRIGHT_MODULE`/`ABELHA_BROWSER_EXECUTABLE`. O exportador consolida os recibos revisados e preserva a interrupção histórica desta rodada.

Skills aplicadas: using-superpowers, writing-plans/executing-plans, systematic-debugging, test-driven-development, verification-before-completion, requesting-code-review, Neon/neon-postgres, frontend-design/frontend-design-premium na revisão visual e vercel:verification no fluxo navegador→API→SQL→UI.
