# Briefing aprovado — reformulação do CRM pessoal Abelha

Data: 05/11/2026.
Projeto existente: C:/Users/higor aranda/Documents/Programações/SAAS/ABELHA.
Base Git examinada: branch main, HEAD 68647ab.

Este documento consolida a análise e as escolhas do usuário. A reformulação NÃO foi implementada nesta etapa. Uma solicitação posterior deverá autorizar o desenvolvimento. A única exceção autorizada e já implementada foi o acesso sem login na prévia local de desenvolvimento, descrito ao final.

## 1. Objetivo e limites

Tornar o Abelha mais bonito, agradável, organizado e útil para uma única pessoa, preservando os dados e as funcionalidades existentes.

O Rapport é a referência principal de aparência e experiência em TODAS as telas. Recursos inspirados no Tandem e no Fernly devem usar essa mesma linguagem visual. Não construir módulos com três temas diferentes.

O usuário não deseja um SaaS empresarial, gestão de equipe, multiempresa, novos provedores de autenticação, infraestrutura adicional ou serviços pagos sem necessidade concreta e discussão específica.

A arquitetura histórica tem estruturas de organização e autenticação. Sua presença no código não autoriza ampliar o produto para equipes ou SaaS.

## 2. Contexto técnico e persistência verificados

Stack real nos manifests:
- Frontend: React 19, Vite 8, TypeScript, Tailwind CSS 4, CSS próprio, Radix, Lucide e Zustand.
- Backend: Node.js, Express, TypeScript, Auth.js e postgres.js.
- Registros de negócio: PostgreSQL no Neon, com organization_id nas consultas.
- Existe código de integração WhatsApp com Evolution API, webhooks e SSE.

IMPORTANTE: a suposição inicial de armazenamento local não corresponde a este checkout. A conexão configurada usa Neon remoto. O usuário informou que o banco está arquivado e autorizou continuar a análise pelo código.

Preservar essa persistência e os registros existentes. Não migrar para SQLite, arquivos, IndexedDB ou outro banco por preferência técnica; não criar outro banco em nuvem. Não reativar o Neon automaticamente com base neste briefing. A disponibilidade do banco precisa ser tratada quando houver autorização para a etapa de desenvolvimento.

O armazenamento do navegador encontrado está ligado ao estado de autenticação, não à carteira de clientes.

Com o banco indisponível:
- A interface pode abrir e ser inspecionada.
- Não foi possível validar dados existentes, quantidade de organizações, gravação, integração WhatsApp ou fluxos completos com registros.
- Zeros e listas vazias na prévia não comprovam uma base vazia.
- Não substituir falhas de consulta por dados fictícios apresentados como reais.

O arquivo backend/src/db/schema.sql contém comandos de reset destrutivo. Ele foi somente lido. Preservar dados e usar migrações aditivas e verificáveis se novas estruturas forem necessárias na futura implementação. Não executar reset ou seed automaticamente.

## 3. Estado atual do produto a preservar

| Área | Implementação atual verificada |
|---|---|
| Visão geral | Contagem de clientes, novos clientes, pendências, gráfico de aquisição, próximos lembretes, clientes recentes e atalhos. O indicador de receita da home está fixado em R$ 0 no código e deverá passar a usar dados reais. |
| Clientes | Busca, lista com detalhe, contato, observações, contratos, parcelas, mensalidades e situação financeira. Cadastro manual atual conduz a cliente + contrato. |
| Contratos | Assistente de contratação, catálogo ou serviço personalizado, valores, pagamento, datas, mensalidades, parcelas e edição/cancelamento conforme regras existentes. |
| Financeiro | Recebimentos, gastos, saldo, MRR ativo, recebido/projetado mensal, ficha por cliente, cobranças, baixas e reabertura; despesas por categoria e situação. |
| Agenda | Calendário mensal, seleção do dia, compromissos ligados a clientes, criação, conclusão e exclusão. |
| Conversas | Lista e thread de WhatsApp, envio e SSE no código; funcionamento real não validado nesta etapa. |
| Calculadora | Link externo existente para a calculadora de preços; não incorporá-la ao CRM sem uma escolha posterior. |

Preservar as regras financeiras existentes: contratos, desconto à vista, divisão de parcelas, mensalidades, datas, baixas e valores já cadastrados. O redesenho visual não autoriza recalcular históricos ou mudar essas regras.

Observações do projeto:
- A navegação interna atual usa estado React; as áreas não possuem rotas individuais.
- O botão Configurações atual não tem uma tela funcional.
- O pipeline comercial foi removido anteriormente; sua reconstrução foi escolhida explicitamente nesta entrevista.
- O DESIGN.md descreve uma referência antiga baseada no Linear escuro; o CSS real atual é claro com amarelo e lateral escura. Não tratar essa documentação antiga como veto às decisões visuais aprovadas aqui.
- Não foram encontrados PRD, relatórios anteriores ou cópias locais das três referências no projeto.
- Nenhum executável de extração de páginas foi executado.

## 4. Referências e alcance da inspeção

### Rapport — referência visual principal

https://demo.codeandchill.store/rapport/#/overview

Foram examinados: Overview; Customers em cards e tabela; ficha de cliente; Pipeline em quadro e lista; detalhe e formulário de negociação; Schedule mensal e semanal; Finance, filtros e prévia de cobrança; Growth; Projects com detalhe/checklist; Settings com Profile, Team, Notifications, Appearance e Data; busca global; criação rápida; atividade; notificações; composição de email.

A tela Data declara que os dados da demonstração ficam no navegador e oferece CSV e cópia JSON. Essa declaração da demonstração não descreve a persistência do Abelha.

### Tandem — referências funcionais de relacionamento

https://demo.codeandchill.store/tandem/#

Foram examinados: filas Accelerator, Hot leads, Due today, Pinned e etapas comerciais; busca; ordenação por pontuação/recência; ficha de contato/empresa; Summary; Activity com filtros; formulário de novo lead; sequência Up next; score com justificativas; Who knows whom; ajuda de atalhos; estados sem resultados e fila Won vazia.

### Fernly — referência funcional de execução

https://demo.codeandchill.store/fernly/#dashboard

Foram examinados: Dashboard; formulário de projeto; quadro Tasks; filtro de prioridade; busca; menu de movimentação; formulário de tarefa; Calendar e dia vazio; Analytics em períodos diferentes; Team; Settings; Help/FAQ; notificações; botão de mensagens.

Limites observados:
- Mensagens exibiu “Inbox is coming soon”.
- Clicar no título de uma tarefa não abriu um detalhe.
- Não foi confirmado o vínculo entre projetos e tarefas no Fernly.
- A ajuda descreve importação CSV, mas nenhum arquivo foi importado.
- O cronômetro foi observado, sem ser iniciado.

Em todas as referências:
- Não foram criados, alterados, excluídos, importados ou movidos registros.
- Não foram enviadas mensagens, pedidos de apresentação, convites ou cobranças.
- Não foram salvas preferências nem ativadas integrações.
- Filtros, buscas, abas, menus e alternâncias de visualização foram operados.
- Formulários foram abertos sem envio.
- Persistência de alterações, backend e integrações reais não foram comprovados.
- Não inferir funcionalidade operacional apenas por ser possível reproduzir a interface.

## 5. Direção visual aprovada

Adotar a linguagem do Rapport preservando a abelha e o amarelo como identidade principal.

Características escolhidas:
- Fundo claro e quente com profundidade suave.
- Superfícies claras, bordas discretas e sombras suaves.
- Cards arredondados e botões/filtros em cápsulas.
- Hierarquia clara entre título, indicadores, metadados e ações.
- Tipografia, espaçamentos, densidade e ícones consistentes entre telas.
- Menus, formulários, badges, seleção, foco, carregamento, vazio e erro com padrões comuns.
- Adaptação para diferentes larguras sem criar outro tema.

Medidas observadas no Rapport, como referência e não obrigação de cópia literal:
- Fundo-base #EBE8E1; texto principal #17191A.
- Família Urbanist.
- Títulos aproximadamente 28–37 px nas larguras examinadas.
- Cards com aproximadamente 26 px de raio e 18 px de padding.
- Algumas superfícies usam branco translúcido com borda clara e sombra suave.
- Contrastes de verde profundo, amarelo, laranja avermelhado e quase preto.

A identidade do Abelha deve orientar a adaptação da paleta; não substituir o amarelo pela identidade completa do Rapport.

Aplicar essa linguagem a visão geral, clientes, oportunidades, contratos, quadro/checklist, financeiro, agenda, conversas, busca, notificações e formulários relacionados.

A navegação seguirá a ESTRUTURA do Rapport:
- Navegação principal superior.
- Barra separada de ações rápidas.
- Em largura estreita, adaptar a navegação e os atalhos; no Rapport foram observados menu horizontal rolável, conteúdo empilhado e barra inferior.

Os menus devem refletir as funções do Abelha aprovadas neste documento, não copiar todos os módulos empresariais do Rapport. A lista final de rótulos, agrupamentos e atalhos ainda pode ser resolvida na etapa de design.

## 6. Funcionalidades aprovadas

### 6.1 Visão geral simplificada — Rapport adaptado

Mostrar números reais, compromissos próximos e pendências úteis ao uso individual. Aproveitar o financeiro e os lembretes existentes.

Corrigir a origem do indicador de receita da home na futura implementação. Distinguir carregamento, erro de consulta, ausência de lançamentos e valor efetivamente igual a zero.

Não incluir metas de vendedores, ranking de equipe, produtividade por funcionário ou indicadores empresariais decorativos.

### 6.2 Próxima ação por cliente — Tandem simplificado

Uma próxima ação por cliente, com prazo e informação clara do retorno necessário.

Reaproveitar o domínio de lembretes quando apropriado. Não incluir nesta etapa sequências completas de nutrição, campanhas ou acompanhamento automático multietapas.

### 6.3 Notas datadas — Tandem/Rapport simplificados

Adicionar notas datadas na ficha do cliente para registrar contexto e combinados.

Foi escolhido somente o histórico de notas datadas. Uma linha do tempo automática de todas as ações do sistema não foi incluída.

### 6.4 Favoritos — Tandem/Rapport

Permitir marcar clientes importantes como favoritos e encontrá-los rapidamente.

### 6.5 Filtros da carteira — Rapport adaptado

Adicionar filtros usando dados existentes, especialmente serviço contratado e situação financeira.

Não criar categorias/segmentos personalizados adicionais nesta etapa. Manter a busca atual útil em conjunto com os filtros.

### 6.6 Pipeline comercial completo — Rapport/Tandem

O pipeline comercial acompanha negociações ANTES da contratação. Ele é distinto do quadro de tarefas da entrega.

Etapas aprovadas:
1. Qualificação.
2. Proposta.
3. Negociação.
4. Fechamento.

Resultados finais:
- Ganho.
- Perdido.

Requisitos:
- Permitir várias oportunidades por cliente.
- Cada oportunidade tem andamento e valor próprios.
- Permitir prospect/contato sem contrato, pois o cadastro manual atual acoplado ao contrato não atende ao fluxo aprovado.
- Incluir valor, data prevista de fechamento, probabilidade e previsão ponderada.
- Não confundir previsão comercial com receita contratada ou dinheiro recebido.
- Adaptar quadro/listagem e detalhe à linguagem visual do Rapport, sem recursos de equipe.

Probabilidade:
- Preenchimento automático conforme a etapa.
- Qualificação: 20%.
- Proposta: 40%.
- Negociação: 70%.
- Fechamento: 90%.
- Ganho: 100%.
- Perdido: 0%.

Esses percentuais foram propostos para o Abelha durante a entrevista e aceitos como preenchimento automático. Não são uma regra de backend verificada do Rapport. Um ajuste manual por oportunidade não foi confirmado de forma específica; não presumir esse requisito.

Previsão ponderada:
- Valor da oportunidade multiplicado pela probabilidade.
- Exemplo: R$ 10.000 × 40% = R$ 4.000.
- As métricas de pipeline aberto devem distinguir negócios em negociação dos já ganhos/perdidos; não somar oportunidade ganha e contrato resultante como se fossem duas receitas.

Conversão para contrato:
- Ao ganhar uma negociação, abrir o assistente de contrato existente com os dados aproveitados da oportunidade.
- O usuário revisa e confirma os dados.
- Somente após confirmação são criados o contrato e suas cobranças.
- Não gerar registros financeiros apenas por arrastar um card.
- Evitar duplicação de contrato/cobranças se o fluxo for repetido.
- A semântica exata de cancelar o assistente após iniciar a conversão permanece pendente; o cancelamento nunca deve criar contrato ou cobranças.

### 6.7 Checklist e quadro de entregas sincronizados — Rapport/Fernly

Vincular a execução das entregas aos contratos.

Unidade aprovada:
- Cada card representa uma tarefa/etapa da entrega.
- Cada card corresponde a um item do checklist.
- Não tratar cada card como um projeto inteiro.

Colunas aprovadas:
1. A fazer.
2. Em andamento.
3. Concluído.

Sincronização bidirecional:
- Mover o card para Concluído marca o item do checklist.
- Marcar o item do checklist move o card para Concluído.
- Reabrir o card desmarca o item.
- Desmarcar pelo checklist devolve o card à coluna em que estava antes de concluir.

Checklist e quadro são duas visualizações do MESMO item, não dois registros independentes que podem divergir.

Se não houver coluna anterior conhecida, o comportamento de retorno deve ser definido na implementação; A fazer é uma proposta de fallback, não uma escolha explicitamente feita pelo usuário.

Não adicionar Em revisão: o usuário escolheu somente as três colunas acima.

### 6.8 Financeiro — melhorias simplificadas do Rapport

Preservar o financeiro existente e acrescentar filtros simples:
- A vencer.
- Atrasadas.
- Pagas.

Não incluir faixas detalhadas por idade de atraso nesta etapa.

Manter contratos, parcelas, mensalidades, MRR, despesas, saldo, baixas e reabertura existentes, com a nova linguagem visual.

### 6.9 Extrato por cliente — Rapport simplificado

Gerar um extrato simples contendo valores, vencimentos e situação das cobranças do cliente, com impressão ou salvamento em PDF.

Não foi escolhido um sistema completo de documentos individuais de cobrança com rascunhos, envio ou emissão fiscal. Não apresentar o extrato como nota fiscal.

### 6.10 CSV e JSON — Rapport

Incluir:
- CSV para consulta em planilhas.
- JSON como cópia completa dos registros de negócio do CRM, preservando identificadores e relações necessários à compreensão dos dados.

Preservar o banco existente. Não exportar credenciais, hashes de senha, cookies, chaves da Evolution ou segredos de configuração.

Importação/restauração a partir desses arquivos não foi escolhida. Não anunciar restauração operacional sem implementá-la e validá-la em uma etapa autorizada.

### 6.11 Busca global simplificada — Rapport

Pesquisar:
- Clientes.
- Oportunidades.
- Tarefas.

Não ampliar automaticamente para pesquisa completa em contratos, cobranças e todo o conteúdo do sistema.

Sem busca semântica, IA ou serviço externo novo por padrão.

### 6.12 Relatórios individuais simplificados — Rapport adaptado

Uma área de receitas e pipeline por período, adequada a uma pessoa.

A visão geral permanece simples. Os relatórios não devem reproduzir metas, rankings, desempenho de equipe ou o conjunto empresarial do Rapport.

Não foram incluídos indicadores adicionais de origem dos contatos e desempenho das entregas.

### 6.13 Central interna de notificações — Rapport/Fernly

Foi escolhida uma central INTERNA de avisos, apesar da recomendação inicial de adiá-la.

Ela complementa a visão geral e deve seguir a linguagem visual comum.

Não inclui envio de emails, mensagens externas ou push fora do aplicativo por padrão.

Tipos de aviso, regras de geração, antecedência, leitura/não leitura e descarte não foram detalhados pelo usuário. Podem ser propostos na implementação com base em compromissos, tarefas e cobranças já existentes, sem ampliar o escopo para automação externa.

## 7. Prioridades aprovadas

1. Visual consistente em todas as telas.
2. Quadro e checklist de entregas.
3. Pipeline comercial.
4. Complementos financeiros, buscas e exportações.

Notas, favoritos, filtros, próxima ação, relatórios individuais e central interna devem ser acomodados nessas frentes sem impedir a ordem principal. A distribuição exata em entregas menores ainda não foi decidida.

## 8. Itens adiados ou fora do escopo aprovado

Adiado explicitamente:
- Cronômetro/controle de horas inspirado no Fernly.

Não incluídos nas versões escolhidas:
- Sequências completas de acompanhamento de leads.
- Histórico automático de todas as operações.
- Categorias/segmentos personalizados adicionais para a carteira.
- Faixas detalhadas de atraso.
- Documentos individuais de cobrança com rascunho/envio.
- Busca global em todos os módulos.
- Relatórios adicionais de origem dos contatos e desempenho das entregas.
- Coluna Em revisão no quadro de entregas.

Fora do objetivo individual declarado:
- Gestão de equipe, convites, presença, metas por vendedor, rankings e carga de funcionários.
- Ampliação para SaaS multiempresa.
- Infraestrutura e serviços pagos novos sem necessidade concreta discutida.

Sem decisão para inclusão; não adicionar por existirem nas referências:
- Lead score e saúde de contas calculados.
- Pedidos automáticos de apresentação e rede de relacionamentos.
- Campanhas, disparos e envio automático de email.
- Integrações com redes sociais.
- Aplicativos móveis próprios.
- Importação de projetos ou restauração de backup.
- Funcionalidades novas em Configurações além das que venham a ser escolhidas.

Esses itens não foram necessariamente descartados para sempre; não pertencem ao escopo aprovado desta reformulação.

## 9. Exceção já implementada: acesso pessoal sem login na prévia local

O usuário autorizou expressamente essa alteração durante a análise, como exceção ao pedido inicial de não implementar.

Estado atual:
- Frontend em desenvolvimento e hostname de loopback abre AppPage diretamente.
- /login redireciona para a aplicação nesse ambiente.
- A ação de sair não aparece no acesso pessoal local.
- Backend fora de produção escuta em 127.0.0.1.
- Acesso sem sessão exige conexão direta de loopback, Host local, Origin local quando presente e ausência de cabeçalhos de proxy.
- A API usa a única organização já existente; não escolhe arbitrariamente entre organizações.
- Não cria usuários, organizações ou dados.
- Produção, conexões remotas e proxies mantêm a autenticação anterior.
- Não houve publicação.

Não repetir esse trabalho ou presumir que a autenticação foi removida de todos os modos de execução. A implementação atual é específica da prévia de desenvolvimento local; build de produção e acesso remoto continuam protegidos.

Arquivos alterados nessa exceção, ainda sem commit:
- README.md.
- backend/src/app.ts.
- backend/src/middleware/auth.ts.
- backend/src/middleware/tenant.ts.
- backend/src/services/personal-access.ts (novo).
- backend/src/services/personal-access.test.ts (novo).
- frontend/src/App.tsx.
- frontend/src/lib/personalAccess.ts (novo).
- frontend/src/pages/AppPage.tsx.
- frontend/src/components/layout/AppSidebar.tsx.

A branch estava limpa antes dessa exceção. Preservar essas alterações e quaisquer mudanças posteriores do usuário.

Verificações realizadas na etapa:
- 9 testes atuais do backend passaram, incluindo acesso local, bloqueio em produção/origens externas/proxies, recusa de organizações ambíguas e preservação do filtro de organização.
- Compilação do backend passou.
- Typecheck e build do frontend passaram.
- ESLint dos arquivos frontend alterados passou.
- /login local abriu a aplicação sem autenticação.
- Visão geral, clientes, financeiro, gastos, agenda, conversas e formulários foram inspecionados sem salvar registros.
- API retornou 503 por banco indisponível/carteira não identificada, em vez de exigir login no acesso local.
- Revisão independente não encontrou problemas importantes no diff.
- Dados reais, gravações e número de organizações não foram validados com o Neon arquivado.

Os comandos equivalentes a build/test foram executados pelos CLIs já instalados via node, porque npm não estava disponível no PATH da sessão. Nenhuma dependência foi instalada.

## 10. Pendências e cuidados para preparar a implementação

Pendências materiais:
1. Disponibilidade do Neon e identificação da única organização existente.
2. Semântica de cancelar a conversão de oportunidade ganha em contrato.
3. Tipos e regras da central interna de notificações.
4. Menu final e ações rápidas da estrutura inspirada no Rapport.
5. Distribuição dos complementos nas entregas de desenvolvimento.

Detalhes que podem ser propostos pelo implementador, identificando-os como proposta:
- Fallback de coluna quando um item concluído não tiver estado anterior conhecido.
- Apresentação de tarefas sem prazo, ordenação e filtros do quadro.
- Tratamento de etapas de execução de contratos já existentes, sem criar tarefas fictícias como se tivessem sido cadastradas.
- Formato e seleção de colunas nos CSVs.
- Estrutura/versionamento do JSON e apresentação de dados indisponíveis.
- Adequação de notas, filtros e indicadores a clientes sem contratos.

Não converter essas pendências em autorização para criar novas funcionalidades de equipe, integrações externas ou migração de banco.

Preservar os dados existentes, distinguir falha de consulta de base vazia, manter o vínculo entre checklist e quadro e evitar duplicação de cobranças na conversão comercial.

Antes de testar gravações futuras, usar dados e ambiente adequados e autorizados. Abrir uma conversa real do Abelha pode marcar mensagens como lidas; considerar esse efeito nas verificações.

## 11. Capturas de referência

As imagens são evidências da inspeção, não telas implementadas da reformulação.

- Abelha atual sem login local: ./abelha-visao-geral.jpg
- Rapport, visão geral ampla: ./rapport-overview-amplo.jpg
- Rapport, ficha do cliente: ./rapport-cliente.jpg
- Rapport, ficha em 390 px: ./rapport-cliente-mobile.jpg
- Rapport, financeiro: ./rapport-financeiro.jpg
- Rapport, conteúdo inferior da visão geral: ./rapport-overview-inferior.jpg
- Tandem, ficha e fila de trabalho: ./tandem-ficha.jpg
- Fernly, dashboard: ./fernly-dashboard.jpg
- Fernly, quadro de tarefas: ./fernly-tarefas.jpg

Estas capturas ficam ao lado deste briefing. Ao apresentá-las no aplicativo, usar seus caminhos absolutos.

## 12. Encerramento desta etapa

A análise e a entrevista foram concluídas. Não houve implementação da reformulação, commits, PR ou publicação.

Os processos temporários iniciados para API e frontend foram encerrados, suas sessões terminaram e não há serviços escutando nas portas temporárias 3000 e 4173. As abas temporárias criadas para a inspeção foram fechadas. Os processos e programas do usuário foram preservados.

Preferência permanente do usuário: em trabalhos futuros, registrar e encerrar todos os serviços/processos temporários criados pelo agente ao final, mantendo apenas recursos que o usuário pedir expressamente para deixar ativos.

